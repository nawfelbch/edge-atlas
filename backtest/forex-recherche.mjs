// EDGE ATLAS — recherche d'une stratégie Forex dont le bénéfice dépasse le
// drawdown maximal, avec les briques du site et les deux primes documentées
// dans ses sources (AQR « Carry » et « Time-Series Momentum ») :
//   - tendance (moyennes), ruptures (plus haut / bas des N bougies), retour à
//     la moyenne (RSI), filtres SMA 200 et tendance journalière, stop ATR fixe
//     ou suiveur, objectif 3R, risque 0,5 % par position ;
//   - momentum 3/6/12 mois et carry (taux à 3 mois), en mensuel, avec une
//     taille de position visant 10 % de volatilité annuelle par paire.
// Le swap (différence de taux, moins une marge courtier) est compté pour
// toutes les stratégies dès que les taux sont disponibles.
//
// Protocole : une configuration est commune à toutes les paires.
//   1) Découpage 60 / 40 : classement sur les 60 % anciens (minimum de
//      transactions), jugement sur les 40 % récents.
//   2) Validation glissante : 5 périodes successives ; pour chaque période, la
//      configuration est choisie sur les périodes passées uniquement, puis
//      jugée sur la période suivante. Les périodes jugées sont enchaînées.
// Lecture de données uniquement : aucun ordre.
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
const PERIODES = 5
// Coûts Forex (profil du site) : 0,5 pb de frais + 0,5 pb de glissement par côté
const COUT = (0.5 + 0.5) / 10000
const RISQUE = 0.005 // 0,5 % du capital risqué par position (jusqu'au stop)
const LEVIER_MAX = 10 // plafond d'exposition (limite réglementaire UE : 30 sur les majeures)
const VOL_CIBLE = 0.10 // stratégies mensuelles : 10 % de volatilité annuelle visée par paire
const MARGE_SWAP = 0.005 // marge courtier prélevée sur le swap, 0,5 %/an, quel que soit le sens
const MIN_TRADES_RECHERCHE = 30 // toutes paires confondues, pour être classé
const MIN_TRADES_VALIDATION = 20 // en dessous : résultat signalé « fragile »
// Taux interbancaires à 3 mois (OCDE, publiés par FRED, mensuels, en %)
const SERIES_TAUX = { USD: 'IR3TIB01USM156N', EUR: 'IR3TIB01EZM156N', GBP: 'IR3TIB01GBM156N', JPY: 'IR3TIB01JPM156N', AUD: 'IR3TIB01AUM156N', CAD: 'IR3TIB01CAM156N', CHF: 'IR3TIB01CHM156N', NZD: 'IR3TIB01NZM156N' }
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- Données ----------
function cache(nom) {
  const f = path.join(ici, 'cache', nom)
  return { lire: () => (!process.argv.includes('--refresh') && fs.existsSync(f) && Date.now() - fs.statSync(f).mtimeMs < 12 * 36e5 ? JSON.parse(fs.readFileSync(f, 'utf8')) : null), ecrire: (x) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(x)) } }
}

async function charger(paire, f) {
  const c = cache(paire.replace('/', '') + '-' + f + '.json'), deja = c.lire()
  if (deja) return deja
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
  c.ecrire(bars)
  return bars
}

async function chargerTaux(devise) {
  if (devise === 'XAU') return [{ t: 0, r: 0 }] // or : pas de taux ; le carry vaut l'opposé du taux de la devise de cotation
  const id = SERIES_TAUX[devise]
  if (!id) throw Error('aucune série de taux pour ' + devise)
  const c = cache('taux-' + devise + '.json'), deja = c.lire()
  if (deja) return deja
  const r = await fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + id, { signal: AbortSignal.timeout(30000) })
  if (!r.ok) throw Error('FRED HTTP ' + r.status)
  const lignes = (await r.text()).trim().split(/\r?\n/).slice(1)
  const serie = lignes.map((l) => { const [d, v] = l.split(','); return { t: Date.parse(d + 'T00:00:00Z'), r: Number(v) / 100 } }).filter((x) => Number.isFinite(x.t) && Number.isFinite(x.r))
  if (serie.length < 24) throw Error('série ' + id + ' trop courte')
  c.ecrire(serie)
  return serie
}

// Taux connu à l'instant t : moyenne mensuelle datée du 1er du mois, utilisée
// seulement une fois le mois terminé (pas de regard vers le futur)
function tauxA(serie, t) {
  let lo = 0, hi = serie.length - 1, k = -1
  while (lo <= hi) { const m = (lo + hi) >> 1; if (serie[m].t + 31 * 864e5 <= t) { k = m; lo = m + 1 } else hi = m - 1 }
  return k >= 0 ? serie[k].r : null
}

// ---------- Indicateurs (identiques au radar : SMA, RSI14 de Wilder, ATR14) ----------
function indicateurs(bars) {
  const n = bars.length, c = bars.map((b) => b.close), somme = [0]
  c.forEach((x) => somme.push(somme.at(-1) + x))
  const sma = (i, p) => (i + 1 >= p ? (somme[i + 1] - somme[i + 1 - p]) / p : null)
  const atr = new Array(n).fill(null), rsi = new Array(n).fill(null), vol = new Array(n).fill(null)
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
    // Volatilité annualisée des rendements journaliers sur 63 bougies (≈ 3 mois)
    if (i >= 63) { let s = 0, s2 = 0; for (let k = i - 62; k <= i; k++) { const x = Math.log(c[k] / c[k - 1]); s += x; s2 += x * x } const m = s / 63; vol[i] = Math.sqrt(Math.max(s2 / 63 - m * m, 0) * 252) }
  }
  // Plus haut / plus bas des N bougies précédentes (la bougie courante exclue)
  const canal = {}
  for (const N of [10, 20, 27, 55]) {
    const hi = new Array(n).fill(null), lo = new Array(n).fill(null)
    for (let i = N; i < n; i++) { let h = -Infinity, b = Infinity; for (let k = i - N; k < i; k++) { if (bars[k].high > h) h = bars[k].high; if (bars[k].low < b) b = bars[k].low } hi[i] = h; lo[i] = b }
    canal[N] = { hi, lo }
  }
  return { sma, atr, rsi, vol, canal }
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

// Swap annuel d'une position de sens s (+1 : achat de la devise de base) :
// différence de taux moins la marge du courtier ; 0 si les taux manquent
function swapAnnuel(ctx, t, s) {
  if (!ctx.taux || !s) return 0
  const rb = tauxA(ctx.taux.base, t), rq = tauxA(ctx.taux.cotation, t)
  return rb == null || rq == null ? 0 : s * (rb - rq) - MARGE_SWAP
}

// ---------- Simulation des stratégies à stop (briques du site) ----------
// Décision à la clôture de la bougie i, exécution au même prix (convention du
// moteur du site). Le stop est vérifié sur la bougie suivante avec son plus
// haut / plus bas ; un écart d'ouverture au-delà du stop est exécuté à
// l'ouverture (perte supérieure au risque prévu, comme en réel).
function simuler(bars, ind, cfg, debut, fin, ctx = {}) {
  if (cfg.mensuel) return simulerMensuel(bars, ind, cfg, debut, fin, ctx)
  let equity = 1, peak = 1, dd = 0, pos = 0, units = 0, stop = 0, cible = 0, extreme = 0, trade = null, sensAvant = 0, rsiAvant = null, swap = 0
  const trades = [], courbe = []
  const ouvrir = (i, sens) => {
    const a = ind.atr[i]; if (!a) return
    const dist = cfg.stop * a, prix = bars[i].close
    units = Math.min(equity * RISQUE / dist, equity * LEVIER_MAX / prix)
    equity -= units * prix * COUT
    pos = sens; extreme = prix
    stop = prix - sens * dist; cible = cfg.tp ? prix + sens * cfg.tp * dist : 0
    trade = { sens, pnl: -units * prix * COUT, risque: units * dist }
  }
  const clore = (prix) => { equity -= units * prix * COUT; trade.pnl -= units * prix * COUT; trades.push(trade); pos = 0; units = 0; trade = null }
  for (let i = Math.max(debut, 1); i <= fin; i++) {
    const b = bars[i], p = bars[i - 1].close
    // 1) Position ouverte : swap couru (jours calendaires), stop puis objectif
    if (pos) {
      const s = units * p * swapAnnuel(ctx, b.t, pos) * (b.t - bars[i - 1].t) / (365 * 864e5)
      equity += s; trade.pnl += s; swap += s
      let sortie = null
      const touche = pos > 0 ? b.low <= stop : b.high >= stop
      const atteint = cible && (pos > 0 ? b.high >= cible : b.low <= cible)
      if (touche) sortie = pos > 0 ? Math.min(stop, b.open) : Math.max(stop, b.open)
      else if (atteint) sortie = pos > 0 ? Math.max(cible, b.open) : Math.min(cible, b.open)
      const prixFin = sortie ?? b.close
      equity += pos * units * (prixFin - p); trade.pnl += pos * units * (prixFin - p)
      if (sortie != null) clore(sortie)
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
      // Entrée quand le RSI franchit le seuil, sortie au retour vers 50
      const r = ind.rsi[i]
      if (r != null && rsiAvant != null) { if (r < cfg.bas && rsiAvant >= cfg.bas) sig = 1; else if (r > 100 - cfg.bas && rsiAvant <= 100 - cfg.bas) sig = -1; else if ((pos > 0 && r > 50) || (pos < 0 && r < 50)) sig = 0 }
      rsiAvant = r
    }
    // Filtres de sens : tendance longue (SMA 200) et tendance journalière
    const autorise = (s) => {
      if (!s) return true
      if (cfg.filtre === 'sma200') { const m = ind.sma(i, 200); if (m == null || Math.sign(c - m) !== s) return false }
      if (cfg.filtre === 'D' && ctx.sensD && ctx.sensD(b.t + DUREE[ctx.f]) !== s) return false
      return true
    }
    if (sig != null && sig !== 0 && !autorise(sig)) sig = pos === sig ? null : 0
    if (i === fin) sig = 0
    if (sig != null && sig !== pos) { if (pos) clore(c); if (sig) ouvrir(i, sig) }
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
  return bilan(equity, dd, trades, courbe, swap)
}

// ---------- Stratégies mensuelles (momentum, carry) à volatilité visée ----------
// Révision à la dernière clôture de chaque mois : sens selon la règle, taille
// = capital × 10 % / volatilité récente (plafonnée au levier maximal). Coûts
// sur la quantité échangée, swap couru chaque jour calendaire.
function simulerMensuel(bars, ind, cfg, debut, fin, ctx) {
  let equity = 1, peak = 1, dd = 0, units = 0, swap = 0, revisions = 0, changements = 0
  const courbe = []
  const mois = (t) => new Date(t).getUTCFullYear() * 12 + new Date(t).getUTCMonth()
  const indexAvant = (t) => { let lo = 0, hi = bars.length - 1, k = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (bars[m].t <= t) { k = m; lo = m + 1 } else hi = m - 1 } return k }
  for (let i = Math.max(debut, 1); i <= fin; i++) {
    const b = bars[i], p = bars[i - 1].close, s = Math.sign(units)
    if (units) {
      const sw = Math.abs(units) * p * swapAnnuel(ctx, b.t, s) * (b.t - bars[i - 1].t) / (365 * 864e5)
      equity += units * (b.close - p) + sw; swap += sw
    }
    const finDeMois = i === fin || mois(bars[i + 1].t) !== mois(b.t)
    if (finDeMois) {
      let sens = 0
      const mom = (L) => { const k = indexAvant(b.t - L * 30.44 * 864e5); return k > 0 ? Math.sign(b.close / bars[k].close - 1) : 0 }
      const carry = () => { if (!ctx.taux) return 0; const rb = tauxA(ctx.taux.base, b.t), rq = tauxA(ctx.taux.cotation, b.t); return rb == null || rq == null || Math.abs(rb - rq) < 0.0025 ? 0 : Math.sign(rb - rq) }
      if (cfg.famille === 'momentum') sens = mom(cfg.mois)
      else if (cfg.famille === 'carry') sens = carry()
      else if (cfg.famille === 'carry+momentum') { const c = carry(); sens = c && c === mom(12) ? c : 0 }
      if (i === fin) sens = 0
      const v = ind.vol[i]
      const cibleUnits = sens && v ? sens * Math.min(equity * VOL_CIBLE / v, equity * LEVIER_MAX) / b.close : 0
      const echange = Math.abs(cibleUnits - units)
      if (echange > 1e-12) {
        equity -= echange * b.close * COUT
        if (Math.sign(cibleUnits) !== Math.sign(units)) changements++
        units = cibleUnits; revisions++
      }
    }
    peak = Math.max(peak, equity); dd = Math.max(dd, (peak - equity) / peak)
    courbe.push({ t: b.t, v: equity })
    if (equity <= 0) break
  }
  const r = bilan(equity, dd, [], courbe, swap)
  r.trades = revisions // révisions mensuelles effectives (le classement exige un minimum)
  r.changements = changements
  return r
}

function bilan(equity, dd, trades, courbe, swap) {
  const gains = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0), pertes = -trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0)
  return { rendement: equity - 1, dd, ratio: dd > 0 ? (equity - 1) / dd : equity > 1 ? Infinity : 0, trades: trades.length, reussite: trades.length ? trades.filter((t) => t.pnl > 0).length / trades.length : null, pf: pertes ? gains / pertes : null, swap, courbe }
}

// Portefeuille à parts égales : moyenne des courbes, dates alignées
function portefeuille(courbes) {
  const ts = [...new Set(courbes.flatMap((c) => c.map((x) => x.t)))].sort((a, b) => a - b)
  const idx = courbes.map(() => 0), last = courbes.map(() => 1), courbe = []
  let peak = 1, dd = 0, v = 1
  for (const t of ts) {
    courbes.forEach((c, k) => { while (idx[k] < c.length && c[idx[k]].t <= t) last[k] = c[idx[k]++].v })
    v = last.reduce((s, x) => s + x, 0) / last.length
    peak = Math.max(peak, v); dd = Math.max(dd, (peak - v) / peak); courbe.push({ t, v })
  }
  return { rendement: v - 1, dd, ratio: dd > 0 ? (v - 1) / dd : v > 1 ? Infinity : 0, courbe }
}

// Enchaîne des courbes de périodes successives (chacune part de 1)
function enchainer(courbes) {
  let base = 1, peak = 1, dd = 0
  const out = []
  for (const c of courbes) { for (const x of c) { const v = base * x.v; peak = Math.max(peak, v); dd = Math.max(dd, (peak - v) / peak); out.push({ t: x.t, v }) } if (c.length) base *= c.at(-1).v }
  return { rendement: base - 1, dd, ratio: dd > 0 ? (base - 1) / dd : base > 1 ? Infinity : 0, courbe: out }
}

// ---------- Configurations ----------
function configurations(f) {
  const signaux = []
  for (const [rapide, lente] of [[10, 50], [20, 50], [20, 100], [50, 200]]) signaux.push({ famille: 'tendance', rapide, lente, nom: 'tendance ' + rapide + '/' + lente })
  for (const [N, sortieN] of [[20, 10], [55, 20], [55, 27]]) signaux.push({ famille: 'rupture', N, sortieN, nom: 'rupture ' + N + '/' + sortieN })
  for (const bas of [30, 25]) signaux.push({ famille: 'retour', bas, nom: 'retour RSI ' + bas + '/' + (100 - bas) })
  const out = []
  for (const s of signaux) for (const filtre of ['aucun', 'sma200', ...(f !== 'D' ? ['D'] : [])]) for (const stop of [2, 3]) for (const suiveur of [false, true]) for (const tp of [0, 3]) {
    if (s.famille === 'retour' && suiveur) continue
    out.push({ ...s, f, filtre, stop, suiveur, tp, id: f + ' · ' + s.nom + ' · filtre ' + filtre + ' · stop ' + stop + ' ATR' + (suiveur ? ' suiveur' : '') + (tp ? ' · objectif ' + tp + 'R' : '') })
  }
  // Primes documentées (sources AQR du site), révisées chaque mois, sur le journalier
  if (f === 'D') {
    for (const m of [3, 6, 12]) out.push({ f, mensuel: true, famille: 'momentum', mois: m, id: 'M · momentum ' + m + ' mois · vol. visée 10 %' })
    out.push({ f, mensuel: true, famille: 'carry', id: 'M · carry (taux 3 mois) · vol. visée 10 %' })
    out.push({ f, mensuel: true, famille: 'carry+momentum', id: 'M · carry si momentum 12 mois d’accord · vol. visée 10 %' })
  }
  return out
}

// Index de la première bougie à partir d'une date
const indexDepuis = (bars, t) => { let lo = 0, hi = bars.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bars[m].t < t) lo = m + 1; else hi = m } return lo }

// ---------- Programme ----------
export { simuler, indicateurs, portefeuille, enchainer, configurations, tauxA, swapAnnuel }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()

async function main() {
  const pct = (x) => (x == null || !Number.isFinite(x) ? '—' : (x * 100).toFixed(1) + ' %')
  const nb = (x, d = 2) => (x == null ? '—' : x === Infinity ? '∞' : x.toFixed(d))
  const jour = (t) => new Date(t).toISOString().slice(0, 10)
  console.log('EDGE ATLAS — recherche Forex : bénéfice supérieur au drawdown maximal')
  console.log('Paires : ' + PAIRES.join(', ') + ' · horizons : ' + HORIZONS.join(', ') + ' + mensuel · coûts 0,5 + 0,5 pb par côté · risque 0,5 % par position · swap compté (marge 0,5 %/an)\n')

  const donnees = {}, erreurs = []
  for (const paire of PAIRES) for (const f of [...new Set(['D', ...HORIZONS])]) {
    try { process.stdout.write('Cours ' + paire + ' ' + f + '… '); (donnees[paire] ||= {})[f] = await charger(paire, f); console.log(donnees[paire][f].length + ' bougies') }
    catch (err) { console.log('échec'); erreurs.push(paire + ' ' + f + ' : ' + err.message) }
  }
  const taux = {}
  for (const d of [...new Set(PAIRES.flatMap((p) => [p.slice(0, 3), p.slice(4, 7)]))]) {
    try { taux[d] = await chargerTaux(d); const der = taux[d].at(-1); console.log('Taux ' + d + ' : ' + (d === 'XAU' ? '0 (or)' : (der.r * 100).toFixed(2) + ' % au ' + jour(der.t) + (Date.now() - der.t > 200 * 864e5 ? ' ⚠ série ancienne : dernier taux prolongé' : ''))) }
    catch (err) { erreurs.push('taux ' + d + ' : ' + err.message + ' (swap et carry ignorés pour les paires concernées)') }
  }
  const tauxPaire = (p) => (taux[p.slice(0, 3)] && taux[p.slice(4, 7)] ? { base: taux[p.slice(0, 3)], cotation: taux[p.slice(4, 7)] } : null)

  const resultats = [], glissant = []
  let essais = 0
  for (const f of HORIZONS) {
    const paires = PAIRES.filter((p) => donnees[p]?.[f]?.length > 400)
    if (paires.length < 2) { erreurs.push(f + ' : moins de 2 paires disponibles'); continue }
    const prep = Object.fromEntries(paires.map((p) => [p, { bars: donnees[p][f], ind: indicateurs(donnees[p][f]), ctx: { f, taux: tauxPaire(p), sensD: f !== 'D' && donnees[p].D ? sensJournalier(donnees[p].D) : null } }]))
    // Périodes glissantes communes (dates) après 201 bougies de préchauffage
    const t0 = Math.max(...paires.map((p) => prep[p].bars[201].t)), t1 = Math.min(...paires.map((p) => prep[p].bars.at(-1).t))
    const bornes = Array.from({ length: PERIODES + 1 }, (_, k) => t0 + (t1 - t0) * k / PERIODES)
    for (const cfg of configurations(f)) {
      essais++
      const r = { cfg, recherche: {}, validation: {}, periodes: [], paires }
      for (const p of paires) {
        const { bars, ind, ctx } = prep[p], coupe = Math.floor(bars.length * SPLIT)
        r.recherche[p] = simuler(bars, ind, cfg, 201, coupe - 1, ctx)
        r.validation[p] = simuler(bars, ind, cfg, coupe, bars.length - 1, ctx)
        r.periode = jour(bars[coupe].t) + ' → ' + jour(bars.at(-1).t)
      }
      for (let k = 0; k < PERIODES; k++) {
        const par = paires.map((p) => { const { bars, ind, ctx } = prep[p]; return simuler(bars, ind, cfg, Math.max(201, indexDepuis(bars, bornes[k])), Math.min(bars.length - 1, indexDepuis(bars, bornes[k + 1]) - 1), ctx) })
        r.periodes.push({ port: portefeuille(par.map((x) => x.courbe)), trades: par.reduce((s, x) => s + x.trades, 0) })
      }
      r.tradesRecherche = paires.reduce((s, p) => s + r.recherche[p].trades, 0)
      r.tradesValidation = paires.reduce((s, p) => s + r.validation[p].trades, 0)
      r.portRecherche = portefeuille(paires.map((p) => r.recherche[p].courbe))
      r.portValidation = portefeuille(paires.map((p) => r.validation[p].courbe))
      resultats.push(r)
    }
    // Validation glissante : à chaque période, choix sur les périodes passées
    const choix = []
    for (let k = 1; k < PERIODES; k++) {
      let meilleur = null
      for (const r of resultats.filter((x) => x.cfg.f === f)) {
        const passe = enchainer(r.periodes.slice(0, k).map((x) => x.port.courbe)), n = r.periodes.slice(0, k).reduce((s, x) => s + x.trades, 0)
        if (n < MIN_TRADES_RECHERCHE) continue
        if (!meilleur || passe.ratio > meilleur.score) meilleur = { r, score: passe.ratio }
      }
      if (meilleur) choix.push({ k, cfg: meilleur.r.cfg.id, score: meilleur.score, juge: meilleur.r.periodes[k], debut: bornes[k], fin: bornes[k + 1] })
    }
    glissant.push({ f, choix, total: enchainer(choix.map((c) => c.juge.port.courbe)) })
  }
  if (!resultats.length) { console.log('\nAucun résultat.\n- ' + erreurs.join('\n- ')); process.exit(1) }

  // 1) Découpage 60 / 40, avec un minimum de transactions pour être classé
  const classes = resultats.filter((r) => r.tradesRecherche >= MIN_TRADES_RECHERCHE)
  const top = [...classes].sort((a, b) => b.portRecherche.ratio - a.portRecherche.ratio).slice(0, 10)
  const ligne = (r) => ({
    configuration: r.cfg.id,
    'recherche bénéf./DD': nb(r.portRecherche.ratio),
    'validation bénéfice': pct(r.portValidation.rendement),
    'validation DD': pct(r.portValidation.dd),
    'validation bénéf./DD': nb(r.portValidation.ratio),
    'paires > 0': r.paires.filter((p) => r.validation[p].rendement > 0).length + '/' + r.paires.length,
    'trades / révisions': r.tradesValidation + (r.tradesValidation < MIN_TRADES_VALIDATION ? ' (fragile)' : ''),
  })
  console.log('\n' + essais + ' configurations essayées (' + classes.length + ' avec au moins ' + MIN_TRADES_RECHERCHE + ' transactions en recherche).')
  console.log('1) LES 10 MEILLEURES SUR LA RECHERCHE (60 % anciens), JUGÉES SUR LA VALIDATION (40 % récents)')
  console.table(top.map(ligne))
  const mensuelles = resultats.filter((r) => r.cfg.mensuel)
  if (mensuelles.length) {
    console.log('2) PRIMES DOCUMENTÉES : MOMENTUM ET CARRY (mensuel, volatilité visée 10 % par paire)')
    console.table(mensuelles.map((r) => ({ ...ligne(r), 'swap validation': pct(r.paires.reduce((s, p) => s + r.validation[p].swap, 0) / r.paires.length) })))
  }
  console.log('3) VALIDATION GLISSANTE (' + PERIODES + ' périodes ; chaque choix n’utilise que les périodes passées)')
  for (const g of glissant) {
    console.table(g.choix.map((c) => ({ horizon: g.f, période: jour(c.debut) + ' → ' + jour(c.fin), 'configuration choisie': c.cfg, bénéfice: pct(c.juge.port.rendement), DD: pct(c.juge.port.dd), trades: c.juge.trades })))
    console.log('   ' + g.f + ' enchaîné : bénéfice ' + pct(g.total.rendement) + ' · drawdown ' + pct(g.total.dd) + ' · bénéfice / DD ' + nb(g.total.ratio))
  }

  const tiennent = top.filter((r) => r.portValidation.ratio > 1 && r.tradesValidation >= MIN_TRADES_VALIDATION)
  const mensOk = mensuelles.filter((r) => r.portValidation.ratio > 1 && r.tradesValidation >= MIN_TRADES_VALIDATION)
  const glissOk = glissant.filter((g) => g.total.ratio > 1)
  console.log('\nVERDICT')
  console.log('- Découpage 60/40 : ' + (tiennent.length ? tiennent.length + ' configuration(s) du top 10 gardent bénéfice > drawdown avec assez de transactions (meilleure : ' + tiennent.sort((a, b) => b.portValidation.ratio - a.portValidation.ratio)[0].cfg.id + ').' : 'aucune configuration du top 10 ne garde bénéfice > drawdown avec assez de transactions.'))
  console.log('- Momentum / carry : ' + (mensOk.length ? mensOk.map((r) => r.cfg.id).join(' ; ') + ' : bénéfice > drawdown sur la validation.' : 'aucune ne dépasse son drawdown sur la validation.'))
  console.log('- Validation glissante : ' + (glissOk.length ? glissOk.map((g) => g.f + ' (' + nb(g.total.ratio) + ')').join(', ') + ' : la méthode de choix elle-même fait bénéfice > drawdown sur des périodes jamais vues.' : 'la méthode de choix ne fait pas bénéfice > drawdown sur les périodes jamais vues.'))
  console.log('- Une stratégie n’est crédible que si les trois vont dans le même sens. ' + essais + ' essais : un bon chiffre isolé peut venir du hasard.')
  console.log('- Coûts Forex du site (0,5 + 0,5 pb), swap selon taux à 3 mois moins 0,5 %/an, pas de conversion de devise. Simulation sans valeur de prévision.')
  if (erreurs.length) console.log('\nNON TESTÉ OU PARTIEL\n- ' + erreurs.join('\n- '))

  const dossier = path.join(ici, 'resultats')
  fs.mkdirSync(dossier, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  const lignes = resultats.flatMap((r) => r.paires.map((p) => [r.cfg.id, p, r.recherche[p].rendement, r.recherche[p].dd, r.recherche[p].trades, r.validation[p].rendement, r.validation[p].dd, r.validation[p].trades, r.validation[p].swap]))
  fs.writeFileSync(path.join(dossier, 'forex-recherche-' + stamp + '.csv'), '﻿' + ['configuration;paire;recherche_benefice;recherche_dd;recherche_trades;validation_benefice;validation_dd;validation_trades;validation_swap', ...lignes.map((l) => l.map((x) => (typeof x === 'number' ? String(+x.toFixed(6)).replace('.', ',') : '"' + String(x ?? '') + '"')).join(';'))].join('\r\n'))
  console.log('\nFichier : backtest/resultats/forex-recherche-' + stamp + '.csv')
}
