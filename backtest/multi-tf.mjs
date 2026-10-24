// EDGE ATLAS — backtest chiffré multi-horizons sur de vrais cours.
// Réutilise le moteur du site (dist/engine.js) sans le modifier. Lecture de
// données uniquement : aucun ordre, aucune connexion à un courtier.
//
// Lancement (Node 18+) :   node backtest/multi-tf.mjs
// Options :                --pairs=BTCUSDT,ETHUSDT  --frames=D,H4,H1
// Forex / or (facultatif) : variable TWELVE_DATA_API_KEY (plan gratuit : lent,
//                           8 requêtes / minute).
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ici = path.dirname(fileURLToPath(import.meta.url))
const E = createRequire(import.meta.url)(path.join(ici, '..', 'dist', 'engine.js'))

// days : durée d'une bougie en jours ; bars : historique visé
const FRAMES = {
  W: { binance: '1w', td: '1week', days: 7, bars: 1000 },
  D: { binance: '1d', td: '1day', days: 1, bars: 2500 },
  H4: { binance: '4h', td: '4h', days: 1 / 6, bars: 4000 },
  H1: { binance: '1h', td: '1h', days: 1 / 24, bars: 6000 },
  M15: { binance: '15m', td: '15min', days: 1 / 96, bars: 6000 },
}
const CRYPTO = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']
const FOREX = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD']
// Réglages par défaut du laboratoire du site
const COUTS = { fee: 5, slip: 3, borrow: 3 }
const DEFAUT = { fast: 15, slow: 60 }
const STRATEGIES = [
  { id: 'tendance L+S', strategy: 'trend', mode: 'both' },
  { id: 'tendance long', strategy: 'trend', mode: 'long' },
  { id: 'retour moy. L+S', strategy: 'revert', mode: 'both' },
  { id: 'retour moy. long', strategy: 'revert', mode: 'long' },
]

const arg = (nom) => process.argv.find((a) => a.startsWith('--' + nom + '='))?.split('=')[1]
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const cleTwelve = process.env.TWELVE_DATA_API_KEY || ''
const paires = (arg('pairs') || [...CRYPTO, ...(cleTwelve ? FOREX : [])].join(',')).split(',').filter(Boolean)
const horizons = (arg('frames') || 'W,D,H4,H1,M15').split(',').filter((f) => FRAMES[f])

// ---------- Téléchargement (bougies clôturées uniquement) ----------
async function binance(symbol, f) {
  const out = new Map()
  let endTime = Date.now()
  while (out.size < FRAMES[f].bars) {
    const u = new URL('https://api.binance.com/api/v3/klines')
    u.search = new URLSearchParams({ symbol, interval: FRAMES[f].binance, limit: '1000', endTime: String(endTime) })
    const r = await fetch(u, { signal: AbortSignal.timeout(25000) })
    if (!r.ok) throw Error('Binance HTTP ' + r.status)
    const rows = await r.json()
    if (!Array.isArray(rows) || !rows.length) break
    for (const k of rows) if (+k[6] < Date.now()) out.set(+k[0], { t: +k[0], close: +k[4] })
    if (rows.length < 1000) break
    endTime = +rows[0][0] - 1
    await pause(250)
  }
  return [...out.values()].sort((a, b) => a.t - b.t).slice(-FRAMES[f].bars)
}

async function twelve(symbol, f) {
  const u = new URL('https://api.twelvedata.com/time_series')
  u.search = new URLSearchParams({ symbol, interval: FRAMES[f].td, outputsize: '5000', timezone: 'UTC', order: 'asc', apikey: cleTwelve })
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) })
  const j = await r.json()
  if (!r.ok || j.status === 'error' || !j.values) throw Error('Twelve Data : ' + (j.message || 'HTTP ' + r.status))
  await pause(8500) // quota du plan gratuit
  // La dernière bougie peut être encore ouverte : exclue par prudence
  return j.values.slice(0, -1).map((v) => ({ t: Date.parse(v.datetime.replace(' ', 'T') + (v.datetime.length <= 10 ? 'T00:00:00Z' : 'Z')), close: +v.close }))
}

const versMoteur = (bars, f) => bars.map((b) => ({ t: b.t, date: new Date(b.t).toISOString().slice(0, FRAMES[f].days >= 1 ? 10 : 19) + (FRAMES[f].days >= 1 ? '' : 'Z'), close: b.close }))

// Le moteur facture l'emprunt d'un short par jour, au minimum 1 jour par
// bougie : en intraday on ramène le taux à la durée réelle de la bougie.
const emprunt = (f) => (FRAMES[f].days < 1 ? COUTS.borrow * FRAMES[f].days : COUTS.borrow)

// ---------- Règle multi-horizon (hors moteur du site) ----------
// Copie fidèle de la boucle du moteur, avec un filtre de sens : le signal de
// l'horizon court n'est pris que s'il va dans le sens de la tendance
// journalière connue à ce moment (dernière bougie D clôturée, sans regarder
// le futur). Contrôlée : sans filtre, elle redonne exactement le moteur.
function backtestFiltre(data, o, filtre) {
  const { fast, slow, fee, slip, borrow, mode, strategy, capital = 10000, start = 0 } = o
  const sum = [0]
  data.forEach((x) => sum.push(sum.at(-1) + x.close))
  const begin = Math.max(slow + 1, start), rate = (fee + slip) / 10000
  let equity = capital, peak = capital, dd = 0, pos = 0, units = 0, trade = null, costs = 0
  const trades = [], returns = []
  for (let i = begin; i < data.length; i++) {
    const before = equity
    const move = pos * units * (data[i].close - data[i - 1].close)
    const carry = pos < 0 ? units * data[i - 1].close * borrow / 100 / 365 * Math.max(1, (Date.parse(data[i].date) - Date.parse(data[i - 1].date)) / 86400000) : 0
    equity += move - carry; costs += carry; if (trade) trade.pnl += move - carry
    const a = (sum[i] - sum[i - fast]) / fast, b = (sum[i] - sum[i - slow]) / slow
    let signal = a > b ? 1 : a < b ? -1 : 0
    if (strategy === 'revert') signal = -signal
    if (mode === 'long' && signal < 0) signal = 0
    if (filtre) signal = filtre(i, signal)
    if (i === data.length - 1 || equity <= 0) signal = 0
    if (signal !== pos) {
      if (pos !== 0) { const c = units * data[i].close * rate; equity -= c; costs += c; trade.pnl -= c; trades.push(trade); trade = null }
      if (signal !== 0 && equity > 0) { units = equity / (data[i].close * (1 + rate)); const c = units * data[i].close * rate; equity -= c; costs += c; trade = { side: signal, pnl: -c } }
      pos = signal
    }
    peak = Math.max(peak, equity); dd = Math.max(dd, (peak - equity) / peak); returns.push(equity / before - 1)
    if (equity <= 0) break
  }
  const wins = trades.filter((t) => t.pnl > 0), profit = wins.reduce((s, t) => s + t.pnl, 0), loss = -trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0)
  const end = begin + returns.length - 1
  const benchmark = capital / (1 + rate) * data[end].close / data[begin].close * (1 - rate)
  return { equity, return: equity / capital - 1, dd, costs, trades, winRate: trades.length ? wins.length / trades.length : 0, pf: loss ? profit / loss : profit ? Infinity : null, benchmark, begin, end, returns }
}

// Tendance journalière connue à l'instant t (moyennes 15/60 sur clôtures D)
function sensJournalier(daily) {
  const sum = [0]; daily.forEach((x) => sum.push(sum.at(-1) + x.close))
  const fin = daily.map((x) => x.t + 864e5) // clôture de la bougie D
  return (t) => {
    let lo = 0, hi = daily.length - 1, k = -1
    while (lo <= hi) { const m = (lo + hi) >> 1; if (fin[m] <= t) { k = m; lo = m + 1 } else hi = m - 1 }
    if (k < 60) return 0
    const a = (sum[k + 1] - sum[k + 1 - 15]) / 15, b = (sum[k + 1] - sum[k + 1 - 60]) / 60
    return a > b ? 1 : a < b ? -1 : 0
  }
}

// ---------- Mesures ----------
function sharpe(r, data) {
  if (r.returns.length < 2) return null
  const m = r.returns.reduce((s, x) => s + x, 0) / r.returns.length
  const sd = Math.sqrt(r.returns.reduce((s, x) => s + (x - m) ** 2, 0) / (r.returns.length - 1))
  const ans = (data[r.end].t - data[r.begin].t) / (365.25 * 864e5)
  return sd && ans > 0 ? m / sd * Math.sqrt(r.returns.length / ans) : null
}

function evaluer(data, f, s, filtre) {
  const split = Math.floor(data.length * 0.7)
  const base = { ...COUTS, borrow: emprunt(f), strategy: s.strategy, mode: s.mode }
  const lancer = (d, o) => (filtre ? backtestFiltre(d, o, filtre) : E.backtest(d, o))
  // 1) réglages par défaut du site, évalués sur les 30 % finaux
  const def = lancer(data, { ...base, ...DEFAUT, start: split })
  // 2) meilleurs réglages trouvés sur les 70 % anciens (grille de la surface 3D du site)
  const train = data.slice(0, split)
  let best = null
  for (let x = 0; x < 17; x++) for (let y = 0; y < 17; y++) {
    const fast = 3 + x * 2, slow = 40 + y * 5
    if (slow >= train.length - 2) continue
    const r = lancer(train, { ...base, fast, slow })
    if (!best || r.return > best.r.return) best = { fast, slow, r }
  }
  const opt = best ? lancer(data, { ...base, fast: best.fast, slow: best.slow, start: split }) : null
  return { split, def, opt, best }
}

const pct = (x) => (x == null || !Number.isFinite(x) ? '—' : (x * 100).toFixed(1) + ' %')
const nb = (x, d = 2) => (x == null || !Number.isFinite(x) ? '—' : x.toFixed(d))

// ---------- Programme ----------
console.log('EDGE ATLAS — backtest multi-horizons (moteur du site, données réelles)')
console.log('Paires : ' + paires.join(', ') + '\nHorizons : ' + horizons.join(', ') + '\n')
const lignes = [], erreurs = []
let controle = false
for (const paire of paires) {
  const forex = paire.includes('/')
  if (forex && !cleTwelve) { erreurs.push(paire + ' : TWELVE_DATA_API_KEY absente'); continue }
  const series = {}
  for (const f of [...new Set(['D', ...horizons])]) {
    try {
      process.stdout.write('Téléchargement ' + paire + ' ' + f + '… ')
      const bars = forex ? await twelve(paire, f) : await binance(paire, f)
      series[f] = versMoteur(bars, f)
      console.log(series[f].length + ' bougies')
    } catch (err) { console.log('échec'); erreurs.push(paire + ' ' + f + ' : ' + err.message) }
  }
  if (!controle && series.D?.length > 200) {
    // Contrôle : la copie de la boucle redonne exactement le moteur du site
    const o = { ...COUTS, ...DEFAUT, strategy: 'trend', mode: 'both', start: Math.floor(series.D.length * 0.7) }
    const a = E.backtest(series.D, o), b = backtestFiltre(series.D, o, null)
    if (Math.abs(a.equity - b.equity) > 1e-6 || a.trades.length !== b.trades.length) throw Error('Contrôle échoué : la règle multi-horizon ne reproduit pas le moteur')
    controle = true
    console.log('Contrôle OK : boucle multi-horizon identique au moteur du site.')
  }
  const sens = series.D?.length > 61 ? sensJournalier(series.D) : null
  for (const f of horizons) {
    const data = series[f]
    if (!data || data.length < 200) { if (data) erreurs.push(paire + ' ' + f + ' : historique trop court (' + data.length + ')'); continue }
    const variantes = STRATEGIES.map((s) => ({ s, filtre: null, nom: s.id }))
    if (sens && FRAMES[f].days < 1) {
      for (const s of STRATEGIES.filter((x) => x.strategy === 'trend')) variantes.push({ s, nom: s.id + ' + filtre D', filtre: (i, sig) => (sig !== 0 && sig === sens(data[i].t + FRAMES[f].days * 864e5) ? sig : 0) })
    }
    for (const v of variantes) {
      try {
        const { split, def, opt, best } = evaluer(data, f, v.s, v.filtre)
        lignes.push({
          paire, horizon: f, strategie: v.nom,
          periode_test: data[split].date.slice(0, 10) + ' → ' + data.at(-1).date.slice(0, 10),
          bougies: data.length,
          rendement_defaut: def.return, achat_conservation: def.benchmark / 10000 - 1,
          drawdown_defaut: def.dd, transactions_defaut: def.trades.length, reussite_defaut: def.winRate, pf_defaut: def.pf, sharpe_defaut: sharpe(def, data),
          reglage_optimise: best ? best.fast + '/' + best.slow : '—',
          rendement_exploration_optimise: best ? best.r.return : null,
          rendement_test_optimise: opt ? opt.return : null, drawdown_test_optimise: opt ? opt.dd : null,
        })
      } catch (err) { erreurs.push(paire + ' ' + f + ' ' + v.nom + ' : ' + err.message) }
    }
  }
}

if (!lignes.length) { console.log('\nAucun résultat.\n' + erreurs.join('\n')); process.exit(1) }

// ---------- Synthèse ----------
console.log('\nRÉSULTATS HORS ÉCHANTILLON (30 % finaux) — réglages du site 15/60, frais 5 pb + glissement 3 pb par côté')
console.table(lignes.map((l) => ({ paire: l.paire, tf: l.horizon, strategie: l.strategie, rendement: pct(l.rendement_defaut), 'achat-cons.': pct(l.achat_conservation), drawdown: pct(l.drawdown_defaut), trades: l.transactions_defaut, PF: nb(l.pf_defaut), Sharpe: nb(l.sharpe_defaut), 'optimisé 70% → test': pct(l.rendement_exploration_optimise) + ' → ' + pct(l.rendement_test_optimise) })))

const bat = lignes.filter((l) => l.rendement_defaut > l.achat_conservation).length
const surOpt = lignes.filter((l) => l.rendement_test_optimise != null && l.rendement_exploration_optimise != null)
const ecarts = surOpt.map((l) => l.rendement_exploration_optimise - l.rendement_test_optimise).sort((a, b) => a - b)
const ecart = ecarts.length ? ecarts[Math.floor(ecarts.length / 2)] : null
const parStrat = {}
for (const l of lignes) (parStrat[l.strategie] ||= []).push(l)
console.log('\nLECTURE')
console.log('- Combinaisons testées : ' + lignes.length + ' ; battent l’achat-conservation hors échantillon : ' + bat + ' (' + pct(bat / lignes.length) + ').')
if (ecart != null) console.log('- Optimisation : écart médian entre exploration (70 %) et test (30 %) = ' + pct(ecart) + ' (plus c’est élevé, plus le réglage « optimal » était du sur-ajustement).')
for (const [k, v] of Object.entries(parStrat)) {
  const med = v.map((l) => l.rendement_defaut).sort((a, b) => a - b)[Math.floor(v.length / 2)]
  console.log('- ' + k.padEnd(24) + ' médiane hors échantillon ' + pct(med) + ' · positif ' + v.filter((l) => l.rendement_defaut > 0).length + '/' + v.length)
}
console.log('- Résultats simulés sur une seule période, sans valeur de prévision. Crypto : Binance spot en USDT ; Forex/or : Twelve Data. Cours non ajustés.')
if (erreurs.length) console.log('\nNON TESTÉ\n- ' + erreurs.join('\n- '))

// ---------- Fichiers ----------
const cols = Object.keys(lignes[0])
const csv = [cols.join(';'), ...lignes.map((l) => cols.map((c) => (typeof l[c] === 'number' ? String(+l[c].toFixed(6)).replace('.', ',') : '"' + String(l[c] ?? '').replace(/"/g, '""') + '"')).join(';'))].join('\r\n')
const dossier = path.join(ici, 'resultats')
fs.mkdirSync(dossier, { recursive: true })
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
fs.writeFileSync(path.join(dossier, 'backtest-' + stamp + '.csv'), '﻿' + csv)
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const cellule = (x, ref) => '<td class="' + (x > (ref ?? 0) ? 'p' : 'n') + '">' + pct(x) + '</td>'
const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EDGE ATLAS — backtest multi-horizons</title><style>body{font:14px system-ui,sans-serif;margin:24px;color:#192723;background:#eeeee6}table{border-collapse:collapse;width:100%;background:#fbfcf5}th,td{border:1px solid #ced2c6;padding:6px 8px;text-align:right;white-space:nowrap}th,td:nth-child(-n+3){text-align:left}.p{color:#2d715d}.n{color:#b44739}.wrap{overflow-x:auto}</style>' +
  '<h1>Backtest multi-horizons</h1><p>Généré le ' + esc(new Date().toLocaleString('fr-FR')) + ' · moteur EDGE ATLAS · hors échantillon = 30 % finaux · frais 5 pb + glissement 3 pb par côté · capital 10 000. Simulation, sans valeur de prévision.</p>' +
  '<div class="wrap"><table><tr><th>Paire</th><th>TF</th><th>Stratégie</th><th>Période test</th><th>Rendement</th><th>Achat-cons.</th><th>Drawdown</th><th>Trades</th><th>Réussite</th><th>PF</th><th>Sharpe</th><th>Réglage optimisé</th><th>Exploration</th><th>Test</th></tr>' +
  lignes.map((l) => '<tr><td>' + esc(l.paire) + '</td><td>' + l.horizon + '</td><td>' + esc(l.strategie) + '</td><td>' + esc(l.periode_test) + '</td>' + cellule(l.rendement_defaut, l.achat_conservation) + cellule(l.achat_conservation) + '<td>' + pct(l.drawdown_defaut) + '</td><td>' + l.transactions_defaut + '</td><td>' + pct(l.reussite_defaut) + '</td><td>' + nb(l.pf_defaut) + '</td><td>' + nb(l.sharpe_defaut) + '</td><td>' + l.reglage_optimise + '</td>' + cellule(l.rendement_exploration_optimise) + cellule(l.rendement_test_optimise) + '</tr>').join('') + '</table></div>' +
  (erreurs.length ? '<h2>Non testé</h2><ul>' + erreurs.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>' : '')
fs.writeFileSync(path.join(dossier, 'backtest-' + stamp + '.html'), html)
console.log('\nFichiers : backtest/resultats/backtest-' + stamp + '.csv et .html')
