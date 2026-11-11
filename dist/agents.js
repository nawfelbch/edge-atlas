// Laboratoire > Agents H1 : lecture du journal tenu chaque heure par la tâche
// Netlify agents-h1 (votes des agents, positions FICTIVES, bilan par niveau
// d'accord). Lecture seule : cette page ne déclenche rien.
(function (root) {
'use strict';
const etat = { cle: '', donnees: null, erreur: '', busy: false }
const NOMS = { tendance: 'Tendance', momentum: 'Momentum', macro: 'Macro', volatilite: 'Volatilité', risque: 'Risque', comite: 'Comité' }
const enLigne = () => location.protocol === 'https:' && !['127.0.0.1', 'localhost'].includes(location.hostname)
const date = (t) => t ? new Date(t).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }) : '—'
const sens = (v) => v > 0 ? '▲ Achat' : v < 0 ? '▼ Vente' : '—'
const nombre = (x, d = 2) => x == null ? '—' : Number(x).toLocaleString('fr-FR', { maximumFractionDigits: d })
const prix = (x) => nombre(x, Number(x) < 10 ? 5 : 2)

async function charger() {
  if (etat.busy) return
  etat.busy = true; etat.erreur = ''; dessiner()
  try {
    const r = await fetch('/.netlify/functions/agents-journal', { headers: { 'X-Edge-Pass': etat.cle }, signal: AbortSignal.timeout(20000) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw Error(j.error || 'HTTP ' + r.status)
    etat.donnees = j
  } catch (e) {
    etat.erreur = e.message
  } finally {
    etat.busy = false; dessiner()
  }
}

function groupe(titre, g) {
  return [titre, g.n ? g.n + (g.n > 1 ? ' positions · ' : ' position · ') + Math.round(g.taux * 100) + ' % gagnantes · ' + (g.totalR >= 0 ? '+' : '') + nombre(g.totalR) + ' R' : 'Aucune position fermée']
}

function dessiner() {
  const out = $('#agentsOut')
  if (!out) return
  if (etat.busy) { out.innerHTML = '<p class="hint">Chargement du journal…</p>'; return }
  if (etat.erreur) { out.innerHTML = '<div class="notice warn">' + esc(etat.erreur) + '</div>'; return }
  const d = etat.donnees
  if (!d) { out.innerHTML = '<p class="hint">Saisissez le mot de passe du site puis chargez le journal.</p>'; return }
  const b = d.bilan, ouvertes = d.trades.filter((t) => t.statut === 'ouverte'), fermees = d.trades.filter((t) => t.statut === 'fermee')
  const dernier = d.runs[0]
  let html = metrics([
    ['Capital fictif', nombre(10000 + b.global.pnl, 0) + ' (départ 10 000)'],
    groupe('Bilan global', b.global),
    groupe('Accord 3 agents', b.accord3),
    groupe('Accord 2 agents', b.accord2),
  ])
  html += '<p class="hint">Un résultat ne devient lisible qu’après plusieurs dizaines de positions fermées. Tant que ce nombre est faible, aucun niveau d’accord n’est « fiable ».</p>'
  if (!dernier) return void (out.innerHTML = html + '<p class="hint">Aucune exécution enregistrée : la tâche tourne à la minute 3 de chaque heure.</p>')

  html += '<h3>Dernière heure : ' + esc(date(dernier.heure)) + '</h3><p>Contexte macro : <b>' + esc(dernier.macro?.regime || 'inconnu') + '</b> · ' + esc((dernier.macro?.raisons || []).join(' · ')) + '</p>'
  if (dernier.erreurs?.length) html += '<div class="notice warn">Sources indisponibles : ' + esc(dernier.erreurs.join(' ; ')) + '</div>'
  const actifs = [...new Set(dernier.agent_votes.map((v) => v.actif))]
  html += '<div class="table-wrap"><table><thead><tr><th>Agent</th>' + actifs.map((a) => '<th>' + esc(a) + '</th>').join('') + '</tr></thead><tbody>' +
    Object.keys(NOMS).map((agent) => '<tr><td><b>' + NOMS[agent] + '</b></td>' + actifs.map((a) => {
      const v = dernier.agent_votes.find((x) => x.actif === a && x.agent === agent)
      if (!v) return '<td>—</td>'
      return '<td><b>' + (v.veto ? '⛔ Veto' : sens(v.vote)) + '</b><br><small>' + esc((v.raisons || []).join(' · ')) + '</small></td>'
    }).join('') + '</tr>').join('') + '</tbody></table></div>'

  const ligne = (t) => '<tr><td>' + esc(t.actif) + '</td><td>' + sens(t.sens) + '</td><td>' + t.accord + '/3</td><td>' + esc(date(t.ouverte_le)) + '</td><td>' + prix(t.entree) + '</td><td>' + prix(t.stop) + ' / ' + prix(t.cible) + '</td><td>' +
    (t.statut === 'fermee' ? esc(t.raison_sortie) + ' · ' + prix(t.sortie) + '<br><small>' + esc(date(t.fermee_le)) + '</small>' : 'En cours') + '</td><td>' + (t.r == null ? '—' : (t.r >= 0 ? '+' : '') + nombre(t.r) + ' R') + '</td></tr>'
  const tableau = (liste) => '<div class="table-wrap"><table><thead><tr><th>Actif</th><th>Sens</th><th>Accord</th><th>Ouverture</th><th>Entrée</th><th>Stop / objectif</th><th>Sortie</th><th>Résultat</th></tr></thead><tbody>' + liste.map(ligne).join('') + '</tbody></table></div>'
  html += '<h3>Positions fictives ouvertes (' + ouvertes.length + ')</h3>' + (ouvertes.length ? tableau(ouvertes) : '<p class="hint">Aucune.</p>')
  html += '<h3>Dernières positions fermées</h3>' + (fermees.length ? tableau(fermees.slice(0, 30)) : '<p class="hint">Aucune pour l’instant.</p>')
  html += '<h3>Historique des heures</h3><div class="table-wrap"><table><thead><tr><th>Heure</th><th>Régime</th><th>Décisions</th></tr></thead><tbody>' +
    d.runs.map((r) => '<tr><td>' + esc(date(r.heure)) + '</td><td>' + esc(r.macro?.regime || '—') + '</td><td>' + esc(r.resume || 'Exécution incomplète') + (r.erreurs?.length ? ' <small>(' + r.erreurs.length + ' source(s) en erreur)</small>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
  out.innerHTML = html
}

function render() {
  try { etat.cle = etat.cle || localStorage.getItem('edgeAtlasPass') || '' } catch { /* stockage indisponible */ }
  $('#main').innerHTML = title('03 / LABORATOIRE', 'Agents H1.', 'Chaque heure, quatre agents lisent la même photo du marché et votent. Un comité n’ouvre une position fictive que s’ils sont d’accord. Un outil de mesure : aucun ordre, aucune garantie.') +
    '<section class="section" style="padding-top:0">' + labNav('agents') +
    '<div class="notice warn"><b>Portefeuille fictif uniquement.</b> Aucun courtier n’est connecté. Le journal sert à mesurer, sur plusieurs mois, si l’accord des agents améliore réellement les résultats. Les seuils sont éditoriaux, non optimisés. Entrée au cours de clôture de l’heure du signal, frais estimés (EUR/USD 1 pb, or 3 pb, bitcoin 10 pb par côté).</div>' +
    '<div class="workspace"><form class="controls" id="agentsForm"><h3>Journal</h3><label>Mot de passe EDGE ATLAS<input id="agentsKey" type="password" autocomplete="off" value="' + esc(etat.cle) + '"></label><button class="btn" type="submit">Charger le journal ↻</button>' +
    '<h3>Les agents</h3><p class="hint"><b>Tendance</b> : prix et EMA20 face à l’EMA50 en H1, confirmés par l’EMA50 journalière. <b>Momentum</b> : rupture des 20 dernières heures, sauf RSI extrême. <b>Macro</b> : VIX et écart de crédit (FRED) → régime refuge, appétit pour le risque ou neutre. <b>Volatilité</b> : veto si l’ATR dépasse 2,5 × sa médiane. <b>Risque</b> : veto si marché fermé, position déjà ouverte, 3 positions, −2 % dans la journée ou Fed il y a moins de 2 h.</p>' +
    '<h3>Comité</h3><p class="hint">Ouverture si Tendance et Momentum sont d’accord, si Macro ne s’y oppose pas et sans veto. Stop 1,5 ATR, objectif 3 ATR (2R), 0,5 % du capital risqué, sortie après 48 h.</p></form><div class="results" id="agentsOut"></div></div></section>'
  bindNav()
  $('#agentsForm').onsubmit = (e) => { e.preventDefault(); charger() }
  $('#agentsKey').oninput = () => { etat.cle = $('#agentsKey').value; try { localStorage.setItem('edgeAtlasPass', etat.cle) } catch { /* stockage indisponible */ } }
  if (!enLigne()) { $('#agentsOut').innerHTML = '<div class="notice">Le journal des agents se lit sur le site en ligne : la tâche horaire et la base tournent sur Netlify.</div>'; return }
  dessiner()
  if (etat.cle && !etat.donnees) charger()
}
root.AgentsPage = { render }
})(typeof globalThis !== 'undefined' ? globalThis : this);
