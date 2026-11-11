// Agents H1 d'EDGE ATLAS : logique pure, testable sous Node sans réseau.
// Chaque heure, quatre agents lisent la même photo du marché et votent ;
// un comité n'ouvre une position FICTIVE que s'ils sont d'accord et
// qu'aucun veto n'est levé. Aucun ordre réel, aucun courtier.
// Les seuils sont éditoriaux, non optimisés : c'est le journal qui dira
// s'ils valent quelque chose.

export const HEURE = 36e5
export const JOUR = 864e5

// frais : frais + glissement estimés PAR CÔTÉ, en points de base
export const ACTIFS = [
  { symbole: 'EUR/USD', frais: 1 },
  { symbole: 'XAU/USD', frais: 3 },
  { symbole: 'BTC/USD', frais: 10 },
]

export const REGLES = {
  capital: 10000, // capital fictif de référence
  risque: 0.005, // 0,5 % du capital risqué par position
  stopAtr: 1.5, // stop à 1,5 ATR H1
  cibleAtr: 3, // objectif à 3 ATR H1 (2R)
  dureeMax: 48, // sortie forcée après 48 bougies H1
  pertesJourMax: 0.02, // plus d'ouverture après −2 % réalisés dans la journée UTC
  positionsMax: 3,
  pauseFedH: 2, // pas d'ouverture dans les 2 h qui suivent une publication de la Fed
  fraicheurH: 2, // dernière bougie close il y a plus de 2 h : marché fermé ou flux en retard
}

// ---------- Lecture des sources ----------

// Twelve Data (order=desc, timezone=UTC) → bougies croissantes et CLÔTURÉES uniquement
export function lireTwelve(json, dureeMs, maintenant) {
  if (!json || !Array.isArray(json.values)) throw Error('Réponse Twelve Data sans bougies' + (json?.message ? ' : ' + json.message : ''))
  return json.values
    .map((v) => {
      const t = Date.parse(v.datetime.length === 10 ? v.datetime + 'T00:00:00Z' : v.datetime.replace(' ', 'T') + 'Z')
      return { t, open: +v.open, high: +v.high, low: +v.low, close: +v.close }
    })
    .filter((b) => Number.isFinite(b.t) && b.t + dureeMs <= maintenant && [b.open, b.high, b.low, b.close].every((p) => Number.isFinite(p) && p > 0))
    .sort((a, b) => a.t - b.t)
}

// fredgraph.csv → [{t, v}] croissant ; les jours sans valeur (« . ») sont ignorés
export function lireFred(csv) {
  return String(csv).trim().split(/\r?\n/).slice(1)
    .map((l) => { const [d, v] = l.split(','); return { t: Date.parse(d + 'T00:00:00Z'), v: Number(v) } })
    .filter((x) => Number.isFinite(x.t) && Number.isFinite(x.v))
}

// Flux RSS de la Fed → dates de publication (ms)
export function lireFed(xml) {
  return [...String(xml).matchAll(/<item>[\s\S]*?<\/item>/g)]
    .map((m) => Date.parse((m[0].match(/<pubDate>([^<]+)<\/pubDate>/) || [])[1]))
    .filter(Number.isFinite)
}

// ---------- Indicateurs ----------

export function ema(valeurs, n) {
  const k = 2 / (n + 1), out = []
  for (let i = 0; i < valeurs.length; i++) out.push(i === 0 ? valeurs[0] : valeurs[i] * k + out[i - 1] * (1 - k))
  return out
}

// ATR et RSI lissés de Wilder sur 14 bougies (null avant la chauffe)
export function atr(bars, n = 14) {
  const out = []
  let a = 0
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i], prec = i ? bars[i - 1].close : b.close
    const tr = Math.max(b.high - b.low, Math.abs(b.high - prec), Math.abs(b.low - prec))
    if (i < n) { a += tr; if (i === n - 1) a /= n } else a = (a * (n - 1) + tr) / n
    out.push(i >= n - 1 ? a : null)
  }
  return out
}

export function rsi(closes, n = 14) {
  const out = [null]
  let g = 0, l = 0
  for (let i = 1; i < closes.length; i++) {
    const gain = Math.max(0, closes[i] - closes[i - 1]), perte = Math.max(0, closes[i - 1] - closes[i])
    if (i <= n) { g += gain; l += perte; if (i === n) { g /= n; l /= n } } else { g = (g * (n - 1) + gain) / n; l = (l * (n - 1) + perte) / n }
    out.push(i >= n ? (l === 0 ? (g === 0 ? 50 : 100) : 100 - 100 / (1 + g / l)) : null)
  }
  return out
}

const mediane = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const arrondi = (x, d = 2) => Number(x.toFixed(d))

// ---------- Les quatre agents ----------
// Chaque agent rend { vote: -1 | 0 | 1, veto: bool, raisons: [texte] }.

// Tendance : H1 (prix et EMA20 face à l'EMA50) confirmé par le journalier (prix face à l'EMA50 D)
export function agentTendance(h1, d) {
  if (h1.length < 60 || d.length < 60) return { vote: 0, veto: false, raisons: ['Historique insuffisant (60 bougies H1 et D requises)'] }
  const c = h1.map((b) => b.close), e20 = ema(c, 20).at(-1), e50 = ema(c, 50).at(-1), prix = c.at(-1)
  const dE50 = ema(d.map((b) => b.close), 50).at(-1), dPrix = d.at(-1).close
  const hausseH1 = prix > e50 && e20 > e50, baisseH1 = prix < e50 && e20 < e50
  const raisons = [
    'H1 : prix ' + (prix > e50 ? 'au-dessus' : 'en dessous') + ' de l’EMA50, EMA20 ' + (e20 > e50 ? 'au-dessus' : 'en dessous'),
    'D : prix ' + (dPrix > dE50 ? 'au-dessus' : 'en dessous') + ' de l’EMA50 journalière',
  ]
  const vote = hausseH1 && dPrix > dE50 ? 1 : baisseH1 && dPrix < dE50 ? -1 : 0
  if (!vote) raisons.push('H1 et D ne sont pas alignés : abstention')
  return { vote, veto: false, raisons }
}

// Momentum : clôture au-delà du plus haut / plus bas des 20 bougies précédentes, filtrée par le RSI
export function agentMomentum(h1) {
  if (h1.length < 60) return { vote: 0, veto: false, raisons: ['Historique insuffisant'] }
  const avant = h1.slice(-21, -1), prix = h1.at(-1).close
  const haut = Math.max(...avant.map((b) => b.high)), bas = Math.min(...avant.map((b) => b.low))
  const r = rsi(h1.map((b) => b.close)).at(-1)
  let vote = prix > haut ? 1 : prix < bas ? -1 : 0
  const raisons = [vote ? 'Rupture du ' + (vote > 0 ? 'plus haut' : 'plus bas') + ' des 20 dernières heures' : 'Pas de rupture des 20 dernières heures', 'RSI14 H1 : ' + arrondi(r, 1)]
  if ((vote > 0 && r > 75) || (vote < 0 && r < 25)) { raisons.push('RSI extrême : mouvement peut-être déjà épuisé, abstention'); vote = 0 }
  return { vote, veto: false, raisons, rsi: arrondi(r, 1) }
}

// Volatilité : ne vote pas de sens ; veto si l'ATR H1 dépasse 2,5 fois sa médiane des 100 dernières heures
export function agentVolatilite(h1) {
  const a = atr(h1), ratios = []
  for (let i = Math.max(13, h1.length - 100); i < h1.length; i++) ratios.push(a[i] / h1[i].close)
  if (ratios.length < 30) return { vote: 0, veto: true, raisons: ['Historique insuffisant pour juger la volatilité'] }
  const ratio = ratios.at(-1) / mediane(ratios)
  const veto = ratio > 2.5
  return { vote: 0, veto, raisons: ['ATR H1 = ' + arrondi(ratio, 2) + ' × sa médiane sur 100 h' + (veto ? ' : marché trop agité, veto' : '')], atr: a.at(-1) }
}

// Contexte macro américain (séries FRED journalières) : régime « refuge » ou « appétit pour le risque »
export function regimeMacro({ vix, hy }) {
  if (!vix?.length || !hy?.length) return { regime: 'inconnu', raisons: ['VIX ou écart de crédit indisponible'] }
  const v = vix.at(-1).v, h = hy.at(-1).v, h5 = hy.at(-6)?.v ?? h
  const raisons = ['VIX ' + arrondi(v, 1), 'Écart de crédit haut rendement ' + arrondi(h, 2) + ' % (' + (h - h5 >= 0 ? '+' : '') + arrondi(h - h5, 2) + ' pt sur 5 séances)']
  if (v >= 25 || h - h5 >= 0.3) return { regime: 'refuge', raisons }
  if (v < 18 && h - h5 <= 0) return { regime: 'risque', raisons }
  return { regime: 'neutre', raisons }
}

// Lecture éditoriale du régime par actif : refuge → dollar et or recherchés, bitcoin délaissé
const LECTURE = {
  'EUR/USD': { refuge: -1, risque: 1 },
  'XAU/USD': { refuge: 1, risque: 0 },
  'BTC/USD': { refuge: -1, risque: 1 },
}
export function agentMacro(symbole, regime) {
  const vote = LECTURE[symbole]?.[regime.regime] ?? 0
  return { vote, veto: false, raisons: ['Régime : ' + regime.regime, ...regime.raisons] }
}

// Risque : veto sur tout ce qui interdit d'ouvrir maintenant
export function agentRisque({ symbole, h1, maintenant, ouvertes, pnlJour, fed }) {
  const raisons = []
  const fin = h1.length ? h1.at(-1).t + HEURE : 0
  if (maintenant - fin > REGLES.fraicheurH * HEURE) raisons.push('Dernière bougie close il y a plus de ' + REGLES.fraicheurH + ' h : marché fermé ou flux en retard')
  if (ouvertes.some((p) => p.actif === symbole)) raisons.push('Position déjà ouverte sur cet actif')
  if (ouvertes.length >= REGLES.positionsMax) raisons.push('Maximum de ' + REGLES.positionsMax + ' positions ouvertes atteint')
  if (pnlJour <= -REGLES.pertesJourMax * REGLES.capital) raisons.push('Perte du jour au-delà de ' + REGLES.pertesJourMax * 100 + ' % : pause jusqu’à minuit UTC')
  if (fed.some((t) => t <= maintenant && maintenant - t < REGLES.pauseFedH * HEURE)) raisons.push('Publication de la Fed il y a moins de ' + REGLES.pauseFedH + ' h : pause')
  return { vote: 0, veto: raisons.length > 0, raisons: raisons.length ? raisons : ['Aucune limite atteinte'] }
}

// ---------- Comité ----------
// Ouverture si Tendance et Momentum votent le même sens, si Macro ne s'y oppose pas
// et si ni Volatilité ni Risque ne lèvent de veto. L'accord (2 ou 3 agents de sens)
// est enregistré pour mesurer plus tard s'il améliore réellement les résultats.
export function comite(votes) {
  const { tendance, momentum, macro, volatilite, risque } = votes
  const vetos = [volatilite, risque].filter((v) => v.veto)
  if (vetos.length) return { sens: 0, accord: 0, raison: 'Veto : ' + vetos.flatMap((v) => v.raisons).join(' ; ') }
  const sens = tendance.vote
  if (!sens || momentum.vote !== sens) return { sens: 0, accord: 0, raison: 'Tendance et Momentum ne sont pas d’accord' }
  if (macro.vote === -sens) return { sens: 0, accord: 0, raison: 'Le contexte macro s’oppose au sens proposé' }
  return { sens, accord: macro.vote === sens ? 3 : 2, raison: (sens > 0 ? 'Achat' : 'Vente') + ' fictif : ' + (macro.vote === sens ? '3 agents sur 3' : '2 agents sur 3, macro neutre') }
}

// ---------- Portefeuille fictif ----------

// Entrée au cours de clôture de la bougie du signal (approximation de l'ouverture suivante)
export function ouvrir({ symbole, frais, sens, accord, h1, atrH1 }) {
  const entree = h1.at(-1).close, distance = REGLES.stopAtr * atrH1
  return {
    actif: symbole, sens, accord, frais_bps: frais,
    ouverte_le: new Date(h1.at(-1).t + HEURE).toISOString(),
    entree, stop: entree - sens * distance, cible: entree + sens * REGLES.cibleAtr * atrH1,
    quantite: (REGLES.capital * REGLES.risque) / distance,
    statut: 'ouverte',
  }
}

// Suit une position sur les bougies H1 clôturées après son ouverture.
// Si stop et objectif sont touchés dans la même bougie, on retient le stop (hypothèse prudente).
// Un écart d'ouverture au-delà du stop est exécuté à l'ouverture, plus défavorable.
export function suivre(position, h1) {
  const debut = Date.parse(position.ouverte_le), apres = h1.filter((b) => b.t >= debut)
  const { sens, stop, cible } = position
  let sortie = null
  for (let i = 0; i < apres.length && !sortie; i++) {
    const b = apres[i]
    const stopTouche = sens > 0 ? b.low <= stop : b.high >= stop
    const cibleTouchee = sens > 0 ? b.high >= cible : b.low <= cible
    if (stopTouche) sortie = { prix: sens > 0 ? Math.min(b.open, stop) : Math.max(b.open, stop), raison: 'stop', t: b.t + HEURE }
    else if (cibleTouchee) sortie = { prix: cible, raison: 'objectif', t: b.t + HEURE }
    else if (i + 1 >= REGLES.dureeMax) sortie = { prix: b.close, raison: 'durée maximale', t: b.t + HEURE }
  }
  if (!sortie) return null
  const brut = sens * (sortie.prix - position.entree) * position.quantite
  const couts = (position.frais_bps / 1e4) * (position.entree + sortie.prix) * position.quantite
  const pnl = brut - couts
  return { statut: 'fermee', fermee_le: new Date(sortie.t).toISOString(), sortie: sortie.prix, raison_sortie: sortie.raison, pnl, r: pnl / (REGLES.capital * REGLES.risque) }
}

// Bilan des positions fermées, par niveau d'accord : c'est la seule « certitude » mesurable
export function bilan(trades) {
  const fermees = trades.filter((t) => t.statut === 'fermee')
  const groupe = (liste) => {
    const n = liste.length, gagnantes = liste.filter((t) => t.pnl > 0).length, totalR = liste.reduce((s, t) => s + Number(t.r), 0)
    return { n, gagnantes, taux: n ? gagnantes / n : null, totalR, moyenneR: n ? totalR / n : null, pnl: liste.reduce((s, t) => s + Number(t.pnl), 0) }
  }
  return { global: groupe(fermees), accord2: groupe(fermees.filter((t) => t.accord === 2)), accord3: groupe(fermees.filter((t) => t.accord === 3)) }
}
