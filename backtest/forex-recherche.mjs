// EDGE ATLAS — recherche d'une stratégie Forex dont le bénéfice dépasse le
// drawdown maximal, avec les briques du site : tendance (moyennes), ruptures
// (plus haut / plus bas des N bougies), retour à la moyenne (RSI), filtre de
// tendance longue et filtre multi-horizon (tendance journalière), stop ATR,
// taille de position par budget de risque, objectif en R, diversification.
//
// Protocole : chaque configuration est la même pour toutes les paires. Elles
// sont classées sur les 60 % anciens (recherche) et jugées sur les 40 %
// récents (validation), jamais utilisés pour choisir. Lecture de données
// uniquement : aucun ordre.
//
// Lancement : $env:TWELVE_DATA_API_KEY="..." ; node backtest/forex-recherche.mjs
// Options    : --pairs=EUR/USD,GBP/USD  --frames=D,H4  --refresh (ignore le cache)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ici = path.dirname(fileURLToPath(import.meta.url))
const arg = (nom) => process.argv.find((a) => a.startsWith('--' + nom + '='))?.split('=')[1]
const cle = process.env.TWELVE_DATA_API_KEY || ''
const PAIRES = (arg('pairs') || 'EUR/USD,GBP/USD,USD/JPY,AUD/USD,USD/CAD,XAU/USD').split(',')
const HORIZONS = (arg('frames') || 'D,H4').split(',')
const TD = { D: '1day', H4: '4h', H1: '1h' }
const DUREE = { D: 864e5, H4: 144e5, H1: 36e5 }
const SPLIT = 0.6
// Coûts Forex (profil du site) : 0,5 pb de frais + 0,5 pb de glissement par
// côté ; pas d'emprunt sur un short (swap non modélisé).
const COUT = (0.5 + 0.5) / 10000
const RISQUE = 0.005 // 0,5 % du capital risqué par position (jusqu'au stop)
const LEVIER_MAX = 10 // plafond d'exposition (la limite réglementaire UE est de 30 sur les majeures)
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- Données ----------
async function charger(paire, f) {
  const dossier = path.join(ici, 'cache'), fichier = path.join(dossier, paire.replace('/', '') + '-' + f + '.json')
  if (!process.argv.includes('--refresh') && fs.existsSync(fichier) && Date.now() - fs.statSync(fichier).mtimeMs < 12 * 36e5) return JSON.parse(fs.readFileSync(fichier, 'utf8'))
  if (!cle) throw Error('TWELVE_DATA_API_KEY absente')
  const u = new URL('https://api.twelvedata.com/time_series')
  u.search = new URLSearchParams({ symbol: paire, interval: TD[f], outputsize: '5000', timezone: 'UTC', order: 'asc', apikey: cle })
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) })
  const j = await r.json()
  if (!r.ok || j.status === 'error' || !j.values) throw Error('Twelve Data : ' + (j.message || 'HTTP ' + r.status))
  await pause(8500) // quota du plan gratuit
  let bars = j.values.slice(0, -1).map((v) => ({ t: Date.parse(v.datetime.replace(' ', 'T') + (v.datetime.length <= 10 ? 'T00:00:00Z' : 'Z')), open: +v.open, high: +v.high, low: +v.low, close: +v.close }))
  // Mêmes règles que le radar : prix valides, dates croissantes, plus haut et
  // plus bas élargis à l'ouverture / clôture, week-ends retirés (marché fermé)
  let vu = -Infinity
  bars = bars.filter((b) => [b.t, b.open, b.high, b.low, b.close].every(Number.isFinite) && Math.min(b.open, b.high, b.low, b.close) > 0 && b.t > vu && (vu = b.t))
    .map((b) => ({ ...b, high: Math.max(b.high, b.open, b.close), low: Math.min(b.low, b.open, b.close) }))
    .filter((b) => { const d = new Date(b.t), j = d.getUTCDay(); return f === 'D' ? j !== 0 && j !== 6 : j !== 6 && !(j === 0 && d.getUTCHours() < 21) })
  fs.mkdirSync(dossier, { recursive: true })
  fs.writeFileSync(fichier, JSON.stringify(bars))
  return bars
}

// ---------- Indicateurs (identiques au radar : SMA, RSI14 de Wilder, ATR14) ----------
function indicateurs(bars) {
  const n = bars.length, c = bars.map((b) => b.close), somme = [0]
  c.forEach((x) => somme.push(somme.at(-1) + x))
  const sma = (i, p) => (i + 1 >= p ? (somme[i + 1] - somme[i + 1 - p]) / p : null)
  const atr = new Array(n).fill(null), rsi = new Array(n).fill(null)
  let a = 0, g = 0, l = 0
  for (let i = 0; i < n; i++) {
    const tr = i ? Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - c[i - 1]), Math.abs(bars[i].low - c[i - 1])) : bars[i].high - bars[i].low
    a = i < 14 ? a + tr / 14 : (a * 13 + tr) / 14
    if (i >= 13) atr[i] = a
    if (i) {
      const d = c[i] - c[i - 1]
      g = i <= 14 ? g + Math.max(d, 0) / 14 : (g * 13 + Math.max(d, 0)) / 14
      l = i <= 14 ? l + Math.max(-d, 0) / 14 : (l * 13 + Math.max(-d, 0)) / 14
      if (i >= 14) rsi[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l)
    }
  }
  // Plus haut / plus bas des N bougies précédentes (la bougie courante exclue)
  const canal = {}
  for (const N of [10, 20, 27, 55]) {
    const hi = new Array(n).fill(null), lo = new Array(n).fill(null)
    for (let i = N; i < n; i++) { let h = -Infinity, b = Infinity; for (let k = i - N; k < i; k++) { if (bars[k].high > h) h = bars[k].high; if (bars[k].low < b) b = bars[k].low } hi[i] = h; lo[i] = b }
    canal[N] = { hi, lo }
  }
  return { sma, atr, rsi, canal }
}

// Tendance journalière connue à la clôture d'une bougie intraday (sans futur)
function sensJournalier(daily) {
  const ind = indicateurs(daily), fin = daily.map((b) => b.t + 864e5)
  return (t) => {
    let lo = 0, hi = daily.length - 1, k = -1
    while (lo <= hi) { const m = (lo + hi) >> 1; if (fin[m] <= t) { k = m; lo = m + 1 } else hi = m - 1 }
    const a = k >= 0 ? ind.sma(k, 15) : null, b = k >= 0 ? ind.sma(k, 60) : null
    return a == null || b == null ? 0 : a > b ? 1 : a < b ? -1 : 0
  }
}

// ---------- Simulation ----------
// Décision à la clôture de la bougie i, exécution au même prix (convention du
// moteur du site). Le stop est vérifié sur la bougie suivante avec son plus
// haut / plus bas ; un écart d'ouverture au-delà du stop est exécuté à
// l'ouverture (perte supérieure au risque prévu, comme en réel).
function simuler(bars, ind, cfg, debut, fin, sensD, f) {
  let equity = 1, peak = 1, dd = 0, pos = 0, units = 0, entree = 0, stop = 0, cible = 0, extreme = 0, trade = null, sensAvant = 0, rsiAvant = null
  const trades = [], courbe = []
  const ouvrir = (i, sens) => {
    const a = ind.atr[i]; if (!a) return
    const dist = cfg.stop * a, prix = bars[i].close
    units = Math.min(equity * RISQUE / dist, equity * LEVIER_MAX / prix)
    equity -= units * prix * COUT
    pos = sens; entree = prix; extreme = prix
    stop = prix - sens * dist; cible = cfg.tp ? prix + sens * cfg.tp * dist : 0
    trade = { entree: bars[i].t, sens, pnl: -units * prix * COUT, risque: units * dist }
  }
  // Sortie à la clôture : la variation de la bougie est déjà comptée
  const fermer = (i, prix) => {
    equity -= units * prix * COUT; trade.pnl -= units * prix * COUT
    trade.sortie = bars[i].t; trade.R = trade.pnl / trade.risque; trades.push(trade)
    pos = 0; units = 0; trade = null
  }
  for (let i = Math.max(debut, 1); i <= fin; i++) {
    const b = bars[i], p = bars[i - 1].close
    // 1) Gestion intrabougie de la position ouverte : stop puis objectif
    if (pos) {
      let sortie = null
      const touche = pos > 0 ? b.low <= stop : b.high >= stop
      const atteint = cible && (pos > 0 ? b.high >= cible : b.low <= cible)
      if (touche) sortie = pos > 0 ? Math.min(stop, b.open) : Math.max(stop, b.open)
      else if (atteint) sortie = pos > 0 ? Math.max(cible, b.open) : Math.min(cible, b.open)
      if (sortie != null) { equity += pos * units * (sortie - p); trade.pnl += pos * units * (sortie - p); equity -= units * sortie * COUT; trade.pnl -= units * sortie * COUT; trade.sortie = b.t; trade.R = trade.pnl / trade.risque; trades.push(trade); pos = 0; units = 0; trade = null }
      else { equity += pos * units * (b.close - p); trade.pnl += pos * units * (b.close - p) }
    }
    // 2) Signal à la clôture
    let sig = null // null = pas de changement, 0 = sortir, ±1 = sens voulu
    const c = b.close
    if (cfg.famille === 'tendance') {
      // Entrée au croisement seulement : après un stop, on attend le suivant
      const a = ind.sma(i, cfg.rapide), l = ind.sma(i, cfg.lente)
      if (a != null && l != null) {
        // Tolérance : des moyennes égales aux arrondis près ne sont pas un croisement
        const e = Math.abs(l) * 1e-9, sens = a > l + e ? 1 : a < l - e ? -1 : 0
        sig = sens !== sensAvant ? sens : pos && sens !== pos ? 0 : null
        sensAvant = sens
      }
    } else if (cfg.famille === 'rupture') {
      const e = ind.canal[cfg.N], s = ind.canal[cfg.sortieN]
      if (e.hi[i] != null && c > e.hi[i]) sig = 1
      else if (e.lo[i] != null && c < e.lo[i]) sig = -1
      else if (pos > 0 && s.lo[i] != null && c < s.lo[i]) sig = 0
      else if (pos < 0 && s.hi[i] != null && c > s.hi[i]) sig = 0
    } else if (cfg.famille === 'retour') {
      const r = ind.rsi[i]
      // Entrée quand le RSI franchit le seuil, sortie au retour vers 50
      if (r != null && rsiAvant != null) { if (r < cfg.bas && rsiAvant >= cfg.bas) sig = 1; else if (r > 100 - cfg.bas && rsiAvant <= 100 - cfg.bas) sig = -1; else if ((pos > 0 && r > 50) || (pos < 0 && r < 50)) sig = 0 }
      rsiAvant = r
    }
    // Filtres de sens : tendance longue (SMA 200) et tendance journalière
    const autorise = (s) => {
      if (!s) return true
      if (cfg.filtre === 'sma200') { const m = ind.sma(i, 200); if (m == null || Math.sign(c - m) !== s) return false }
      if (cfg.filtre === 'D' && sensD && sensD(b.t + DUREE[f]) !== s) return false
      return true
    }
    if (sig != null && sig !== 0 && !autorise(sig)) sig = pos === sig ? null : 0
    if (i === fin) sig = 0
    if (sig != null && sig !== pos) { if (pos) fermer(i, c); if (sig) ouvrir(i, sig) }
    // 3) Stop suiveur (type « chandelier ») après la clôture
    if (pos && cfg.suiveur && ind.atr[i]) {
      extreme = pos > 0 ? Math.max(extreme, b.high) : Math.min(extreme, b.low)
      const s = extreme - pos * cfg.stop * ind.atr[i]
      stop = pos > 0 ? Math.max(stop, s) : Math.min(stop, s)
    }
    peak = Math.max(peak, equity); dd = Math.max(dd, (peak - equity) / peak)
    courbe.push({ t: b.t, v: equity })
    if (equity <= 0) break
  }
  const gains = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0), pertes = -trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0)
  return { rendement: equity - 1, dd, ratio: dd > 0 ? (equity - 1) / dd : equity > 1 ? Infinity : 0, trades: trades.length, reussite: trades.length ? trades.filter((t) => t.pnl > 0).length / trades.length : 0, pf: pertes ? gains / pertes : null, courbe }
}

// Portefeuille à parts égales : moyenne des courbes, dates alignées
function portefeuille(courbes) {
  const ts = [...new Set(courbes.flatMap((c) => c.map((x) => x.t)))].sort((a, b) => a - b)
  const idx = courbes.map(() => 0), last = courbes.map(() => 1)
  let peak = 1, dd = 0, v = 1
  for (const t of ts) {
    courbes.forEach((c, k) => { while (idx[k] < c.length && c[idx[k]].t <= t) last[k] = c[idx[k]++].v })
    v = last.reduce((s, x) => s + x, 0) / last.length
    peak = Math.max(peak, v); dd = Math.max(dd, (peak - v) / peak)
  }
  return { rendement: v - 1, dd, ratio: dd > 0 ? (v - 1) / dd : v > 1 ? Infinity : 0 }
}

// ---------- Configurations (briques du site) ----------
function configurations(f) {
  const signaux = []
  for (const [rapide, lente] of [[10, 50], [20, 50], [20, 100], [50, 200]]) signaux.push({ famille: 'tendance', rapide, lente, nom: 'tendance ' + rapide + '/' + lente })
  for (const [N, sortieN] of [[20, 10], [55, 20], [55, 27]]) signaux.push({ famille: 'rupture', N, sortieN, nom: 'rupture ' + N + '/' + sortieN })
  for (const bas of [30, 25]) signaux.push({ famille: 'retour', bas, nom: 'retour RSI ' + bas + '/' + (100 - bas) })
  const out = []
  for (const s of signaux) for (const filtre of ['aucun', 'sma200', ...(f !== 'D' ? ['D'] : [])]) for (const stop of [2, 3]) for (const suiveur of [false, true]) for (const tp of [0, 3]) {
    if (s.famille === 'retour' && suiveur) continue
    out.push({ ...s, filtre, stop, suiveur, tp, id: f + ' · ' + s.nom + ' · filtre ' + filtre + ' · stop ' + stop + ' ATR' + (suiveur ? ' suiveur' : '') + (tp ? ' · objectif ' + tp + 'R' : '') })
  }
  return out
}

// ---------- Programme ----------
export { simuler, indicateurs, portefeuille, configurations }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()

async function main() {
const pct = (x) => (x == null || !Number.isFinite(x) ? '—' : (x * 100).toFixed(1) + ' %')
const nb = (x, d = 2) => (x == null ? '—' : x === Infinity ? '∞' : x.toFixed(d))
const dateCourte = (t) => new Date(t).toISOString().slice(0, 10)
console.log('EDGE ATLAS — recherche Forex : bénéfice supérieur au drawdown maximal')
console.log('Paires : ' + PAIRES.join(', ') + ' · horizons : ' + HORIZONS.join(', ') + ' · coûts 0,5 + 0,5 pb par côté · risque 0,5 % par position · levier max ' + LEVIER_MAX + '\n')

const donnees = {}, erreurs = []
for (const paire of PAIRES) for (const f of [...new Set(['D', ...HORIZONS])]) {
  try { process.stdout.write('Données ' + paire + ' ' + f + '… '); (donnees[paire] ||= {})[f] = await charger(paire, f); console.log(donnees[paire][f].length + ' bougies') }
  catch (err) { console.log('échec'); erreurs.push(paire + ' ' + f + ' : ' + err.message) }
}

const resultats = []
let essais = 0
for (const f of HORIZONS) {
  const paires = PAIRES.filter((p) => donnees[p]?.[f]?.length > 400)
  if (paires.length < 2) { erreurs.push(f + ' : moins de 2 paires disponibles'); continue }
  const prep = Object.fromEntries(paires.map((p) => [p, { bars: donnees[p][f], ind: indicateurs(donnees[p][f]), sensD: f !== 'D' && donnees[p].D ? sensJournalier(donnees[p].D) : null }]))
  for (const cfg of configurations(f)) {
    essais++
    const r = { cfg, recherche: {}, validation: {} }
    for (const p of paires) {
      const { bars, ind, sensD } = prep[p], coupe = Math.floor(bars.length * SPLIT)
      r.recherche[p] = simuler(bars, ind, cfg, 201, coupe - 1, sensD, f)
      r.validation[p] = simuler(bars, ind, cfg, coupe, bars.length - 1, sensD, f)
      r.periode = dateCourte(bars[coupe].t) + ' → ' + dateCourte(bars.at(-1).t)
    }
    // Classement sur la recherche uniquement : la paire la plus faible compte
    r.scoreRecherche = Math.min(...paires.map((p) => r.recherche[p].ratio))
    r.portRecherche = portefeuille(paires.map((p) => r.recherche[p].courbe))
    r.portValidation = portefeuille(paires.map((p) => r.validation[p].courbe))
    r.paires = paires; r.f = f
    resultats.push(r)
  }
}
if (!resultats.length) { console.log('\nAucun résultat.\n- ' + erreurs.join('\n- ')); process.exit(1) }

// Les 10 meilleures configurations de la recherche, puis leur validation
const top = [...resultats].sort((a, b) => b.portRecherche.ratio - a.portRecherche.ratio).slice(0, 10)
console.log('\n' + essais + ' configurations essayées. Les 10 meilleures sur la RECHERCHE (60 % anciens), jugées sur la VALIDATION (40 % récents) :')
console.table(top.map((r) => ({
  configuration: r.cfg.id,
  'recherche bénéf./DD': nb(r.portRecherche.ratio),
  'validation bénéfice': pct(r.portValidation.rendement),
  'validation DD': pct(r.portValidation.dd),
  'validation bénéf./DD': nb(r.portValidation.ratio),
  'paires > 0': r.paires.filter((p) => r.validation[p].rendement > 0).length + '/' + r.paires.length,
  trades: r.paires.reduce((s, p) => s + r.validation[p].trades, 0),
})))
const meilleure = top[0]
console.log('\nDÉTAIL DE LA 1re CONFIGURATION (' + meilleure.cfg.id + ') — validation ' + meilleure.periode)
console.table(meilleure.paires.map((p) => ({ paire: p, bénéfice: pct(meilleure.validation[p].rendement), drawdown: pct(meilleure.validation[p].dd), 'bénéf./DD': nb(meilleure.validation[p].ratio), trades: meilleure.validation[p].trades, réussite: pct(meilleure.validation[p].reussite), PF: nb(meilleure.validation[p].pf) })))

const reussites = top.filter((r) => r.portValidation.ratio > 1)
console.log('\nVERDICT')
if (reussites.length) console.log('- ' + reussites.length + ' des 10 configurations gardent un bénéfice supérieur au drawdown sur la validation (portefeuille). Meilleure : ' + reussites.sort((a, b) => b.portValidation.ratio - a.portValidation.ratio)[0].cfg.id + '.')
else console.log('- Aucune des 10 meilleures configurations de la recherche ne garde un bénéfice supérieur au drawdown sur la validation.')
console.log('- ' + essais + ' essais : plus on essaie, plus un bon résultat peut venir du hasard. Une configuration n’est crédible que si elle tient sur la validation, sur plusieurs paires, avec assez de transactions.')
console.log('- Coûts Forex du site (0,5 + 0,5 pb), swap non modélisé, pas de conversion de devise. Simulation sans valeur de prévision.')
if (erreurs.length) console.log('\nNON TESTÉ\n- ' + erreurs.join('\n- '))

const dossier = path.join(ici, 'resultats')
fs.mkdirSync(dossier, { recursive: true })
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
const lignes = resultats.flatMap((r) => r.paires.map((p) => [r.cfg.id, p, r.recherche[p].rendement, r.recherche[p].dd, r.validation[p].rendement, r.validation[p].dd, r.validation[p].trades, r.validation[p].pf]))
fs.writeFileSync(path.join(dossier, 'forex-recherche-' + stamp + '.csv'), '﻿' + ['configuration;paire;recherche_benefice;recherche_dd;validation_benefice;validation_dd;validation_trades;validation_pf', ...lignes.map((l) => l.map((x) => (typeof x === 'number' ? String(+x.toFixed(6)).replace('.', ',') : '"' + String(x ?? '') + '"')).join(';'))].join('\r\n'))
console.log('\nFichier : backtest/resultats/forex-recherche-' + stamp + '.csv')
}
