(function (root) {
  'use strict';

  const minute = 60000;
  const marketEvents = /inflation|\bcpi\b|\bpce\b|payroll|unemployment|jobless|fed interest rate|interest rate decision|\bgdp\b|retail sales|\bppi\b|\bpmi\b/i;

  function createJournal(surprise) {
    const events = new Map();

    function ingestCalendar(rows, observedAt) {
      for (const row of rows) {
        if (row.country !== 'United States' || !marketEvents.test(row.event)) continue;
        const id = JSON.stringify(['calendar', row.country, row.event, row.reference, row.date]);
        const previous = events.get(id);
        const published = Boolean(row.actual);
        const canCaptureConsensus = !published && !row.estimated && row.forecast && observedAt < row.date;
        const canUpdateConsensus = canCaptureConsensus && (!previous || observedAt >= previous.observedAt);
        const consensus = canUpdateConsensus ? row.forecast : previous?.consensus ?? '';
        const actual = published ? row.actual : previous?.actual ?? '';
        const effectiveAt = published ? previous?.effectiveAt ?? observedAt : previous?.effectiveAt ?? null;

        events.set(id, {
          id, kind: 'calendar', title: row.event, date: row.date, reference: row.reference,
          source: 'Trading Economics', url: row.url, actual, consensus,
          reportedConsensus: row.forecast,
          delta: surprise(actual, consensus),
          indicativeDelta: surprise(actual, row.forecast),
          estimated: row.estimated, effectiveAt, observedAt, updated: row.updated,
          revised: Boolean(previous?.revised || (published && previous?.actual && row.actual !== previous.actual)),
        });
      }
    }

    function ingestFed(rows, observedAt) {
      for (const row of rows) {
        if (!Number.isFinite(row.date)) continue;
        const id = JSON.stringify(['fed', row.url]);
        events.set(id, {
          id, kind: 'fed', title: row.title, date: row.date, url: row.url,
          source: 'Réserve fédérale', observedAt: events.get(id)?.observedAt ?? observedAt,
        });
      }
    }

    return {
      ingestCalendar,
      ingestFed,
      list: () => [...events.values()].sort((a, b) => b.date - a.date),
    };
  }

  function replay(bars, options) {
    const { effectiveAt, side, minutes, feeBps } = options;
    if (!Number.isFinite(effectiveAt) || ![1, -1].includes(side) ||
        !Number.isInteger(minutes) || minutes < 2 || minutes > 30 ||
        !Number.isFinite(feeBps) || feeBps < 0 || feeBps > 500) {
      throw Error('Paramètres de simulation invalides.');
    }

    const firstOpen = Math.ceil(effectiveAt / minute) * minute;
    const start = bars.findIndex(bar => bar.t === firstOpen);
    const window = start < 0 ? [] : bars.slice(start, start + minutes);
    if (window.length !== minutes || window.some((bar, index) =>
      bar.t !== firstOpen + index * minute ||
      ![bar.open, bar.close].every(price => Number.isFinite(price) && price > 0)
    )) {
      throw Error('Historique M1 incomplet autour du signal. Rechargez les bougies clôturées dans Mon radar.');
    }

    const exit = window.at(-1).close;
    const confirmed = side * (window[0].close - window[0].open) > 0;
    function execute(entry) {
      const gross = side * (exit / entry.open - 1);
      const costs = (feeBps / 10000) * (1 + exit / entry.open);
      return { entry: entry.open, exit, net: gross - costs, time: entry.t };
    }

    return { baseline: execute(window[0]), confirmed: confirmed ? execute(window[1]) : null };
  }

  let sessionJournal;
  let selected = null;

  function mount(host, refresh) {
    const journal = sessionJournal ??= createJournal(MacroDesk.surprise);
    const demoTime = Math.floor(Date.now() / minute) * minute - 60 * minute;
    const demoBars = Array.from({ length: 30 }, (_, index) => ({
      t: demoTime + index * minute,
      open: 100 - index * 0.1,
      close: 100 - (index + 1) * 0.1,
    }));
    const stamp = value => value == null ? '—' : new Date(value).toLocaleString('fr-FR', {
      timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short',
    });
    const q = selector => host.querySelector(selector);

    host.innerHTML = `
      <section class="card">
        <h3>Signaux macro américains</h3>
        <p>Les publications de la Fed et du calendrier sont chargées en parallèle.
          Le journal regroupe les doublons et relève les écarts publiés. Il reste disponible tant que le site reste ouvert dans cet onglet.</p>
        <button class="btn" type="button" id="signalsRefresh">Actualiser les sources</button>
        <p class="hint">Ajoutez votre clé dans le calendrier ci-dessous pour recevoir ses chiffres.
          Un consensus est figé s’il a été capté avant la publication pendant cette session.</p>
        <div id="signalsList"></div>
        <details id="signalsReplay">
          <summary>Comparer deux règles sur les bougies M1</summary>
          <p id="signalsSelection">Choisissez un signal exploitable ou lancez la démo.</p>
          <div class="form-grid">
            <label>Sens testé
              <select id="signalsSide"><option value="-1">Short</option><option value="1">Long</option></select>
            </label>
            <label>Horizon (minutes)
              <input id="signalsMinutes" type="number" min="2" max="30" step="1" value="5">
            </label>
            <label>Frais et glissement par côté (pb)
              <input id="signalsCosts" type="number" min="0" max="500" step="0.1" value="5">
            </label>
          </div>
          <div class="actions">
            <button class="btn ghost" id="signalsDemo" type="button">Démo fictive</button>
            <button class="btn" id="signalsRun" type="button" disabled>Simuler sur les cours du radar</button>
            <a class="text-link" href="#radar">Charger des cours M1 dans Mon radar ↗</a>
          </div>
          <p class="hint">La première règle entre à l’ouverture de la première bougie entière après réception.
            La seconde attend sa clôture et entre à l’ouverture suivante si elle confirme le sens choisi.
            Les deux sortent à la même clôture. Simulation sur bougies, avec coûts paramétrés.</p>
          <div id="signalsResult" role="status"></div>
        </details>
      </section>`;

    q('#signalsRefresh').onclick = async () => {
      q('#signalsRefresh').disabled = true;
      try {
        await refresh();
      } finally {
        q('#signalsRefresh').disabled = false;
      }
    };

    function eligible(event) {
      return event?.delta && event.delta.value !== 0 && !event.estimated && !event.revised &&
        event.effectiveAt >= event.date;
    }

    function render() {
      const events = journal.list();
      const current = events.find(event => event.id === selected);
      q('#signalsRun').disabled = !eligible(current);
      if (current) {
        q('#signalsSelection').textContent = current.title + ' · reçu le ' + stamp(current.effectiveAt);
        q('#signalsReplay').open = true;
      }
      const rows = events.filter(event => event.kind === 'fed' || event.actual);
      const displayed = rows.slice(0, 40);
      q('#signalsList').innerHTML = displayed.length ? `
        <p class="hint">${displayed.length} affichés · ${rows.length} publiés · ${events.length - rows.length} en attente</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Publication</th><th>Chiffre</th><th>Consensus</th><th>Écart</th><th>Source</th></tr></thead>
          <tbody>${displayed.map((event, index) => {
            const delta = event.delta ?? event.indicativeDelta;
            const consensus = event.consensus || event.reportedConsensus;
            return `<tr>
              <td><strong>${esc(event.title)}</strong><br><small>${esc(stamp(event.date))} ${esc(event.reference || '')}</small>
                ${eligible(event) ? `<br><button class="btn ghost" type="button" data-signal="${index}">Tester ce signal</button>` : ''}
                ${event.revised ? '<br><small>Chiffre révisé depuis la réception</small>' : ''}</td>
              <td>${esc(event.actual || '—')}</td>
              <td>${esc(consensus || '—')}${consensus ? (event.consensus ? ' · capté avant publication' : ' · fourni après coup') : ''}</td>
              <td>${delta ? esc(num(delta.value, 4) + ' ' + delta.unit) : '—'}</td>
              <td>${event.url ? `<a class="text-link" href="${esc(event.url)}" target="_blank" rel="noopener noreferrer">${esc(event.source)}</a>` : esc(event.source)}
                <br><small>Reçu à ${esc(stamp(event.effectiveAt ?? event.observedAt))}</small></td>
            </tr>`;
          }).join('')}</tbody></table></div>` : '<p class="hint">Aucune publication reçue. Les annonces à venir s’affichent dans le calendrier.</p>';
      host.querySelectorAll('[data-signal]').forEach(button => {
        button.onclick = () => {
          const event = displayed[Number(button.dataset.signal)];
          selected = event.id;
          q('#signalsSelection').textContent = event.title + ' · reçu le ' + stamp(event.effectiveAt);
          q('#signalsResult').textContent = '';
          q('#signalsRun').disabled = false;
          q('#signalsReplay').open = true;
          q('#signalsReplay').scrollIntoView({ block: 'nearest' });
        };
      });
    }

    function run(demo) {
      try {
        const event = journal.list().find(item => item.id === selected);
        if (!demo && !eligible(event)) throw Error('Choisissez une surprise exploitable.');
        const prices = demo ? { bars: demoBars, symbol: 'Démo fictive' } : root.RadarPanel?.minuteBars();
        if (!prices) throw Error('Chargez des cours fournisseur en M1 dans Mon radar pour l’actif à tester.');
        const results = replay(prices.bars, {
          effectiveAt: demo ? demoTime : event.effectiveAt,
          side: Number(q('#signalsSide').value),
          minutes: q('#signalsMinutes').valueAsNumber,
          feeBps: q('#signalsCosts').valueAsNumber,
        });
        q('#signalsResult').innerHTML = `<p><strong>${esc(prices.symbol)}${prices.source ? ' · ' + esc(prices.source) : ''}</strong></p>` + metrics([
          ['Réaction immédiate, rendement net simulé', pct(results.baseline.net)],
          ['Confirmation M1, rendement net simulé', results.confirmed ? pct(results.confirmed.net) : 'Aucune entrée'],
        ]);
      } catch (error) {
        q('#signalsResult').textContent = error.message;
      }
    }

    q('#signalsDemo').onclick = () => run(true);
    q('#signalsRun').onclick = () => run(false);
    render();
    return {
      calendar(rows, observedAt) { journal.ingestCalendar(rows, observedAt); render(); },
      fed(rows, observedAt) { journal.ingestFed(rows, observedAt); render(); },
    };
  }

  const api = { createJournal, replay, mount };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MacroSignals = api;
})(typeof window !== 'undefined' ? window : globalThis);
