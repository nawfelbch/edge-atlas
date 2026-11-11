// Tests des agents H1 : node --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  HEURE, JOUR, REGLES, agentMacro, agentMomentum, agentRisque, agentTendance, agentVolatilite,
  atr, bilan, comite, lireFed, lireFred, lireTwelve, ouvrir, regimeMacro, rsi, suivre,
} from '../netlify/lib/agents.mjs'

const T0 = Date.UTC(2026, 10, 2, 0)

// Série régulière : pente par bougie, amplitude haut/bas fixe
function serie(n, pente, duree = HEURE, debut = 100, amplitude = 0.2) {
  return Array.from({ length: n }, (_, i) => {
    const open = debut + i * pente, close = open + pente
    return { t: T0 + i * duree, open, close, high: Math.max(open, close) + amplitude, low: Math.min(open, close) - amplitude }
  })
}

test('lireTwelve : ordre croissant, bougie en cours exclue, dates UTC', () => {
  const maintenant = Date.UTC(2026, 10, 11, 18, 30)
  const json = { values: [
    { datetime: '2026-11-11 18:00:00', open: '1', high: '1', low: '1', close: '1' }, // en cours : exclue
    { datetime: '2026-11-11 17:00:00', open: '1.1', high: '1.2', low: '1.0', close: '1.15' },
    { datetime: '2026-11-11 16:00:00', open: '1.0', high: '1.1', low: '0.9', close: '1.05' },
  ] }
  const b = lireTwelve(json, HEURE, maintenant)
  assert.equal(b.length, 2)
  assert.equal(b[0].t, Date.UTC(2026, 10, 11, 16))
  assert.equal(b[1].close, 1.15)
  assert.equal(lireTwelve({ values: [{ datetime: '2026-11-10', open: '1', high: '1', low: '1', close: '1' }] }, JOUR, maintenant).length, 1)
  assert.throws(() => lireTwelve({ status: 'error', message: 'quota' }, HEURE, maintenant), /quota/)
})

test('lireFred et lireFed', () => {
  assert.deepEqual(lireFred('DATE,VIXCLS\n2026-11-09,17.5\n2026-11-10,.\n2026-11-11,19\n').map((x) => x.v), [17.5, 19])
  const xml = '<rss><item><title>A</title><pubDate>Wed, 28 Oct 2026 18:00:00 GMT</pubDate></item><item><pubDate>x</pubDate></item></rss>'
  assert.deepEqual(lireFed(xml), [Date.UTC(2026, 9, 28, 18)])
})

test('indicateurs : ATR et RSI', () => {
  const b = serie(30, 1)
  assert.equal(atr(b)[12], null)
  assert.ok(Math.abs(atr(b).at(-1) - 1.4) < 1e-9) // amplitude constante : corps 1 + 2 × 0,2
  assert.equal(rsi(b.map((x) => x.close)).at(-1), 100)
})

test('agent Tendance : alignement H1 et D', () => {
  assert.equal(agentTendance(serie(100, 0.1), serie(100, 1, JOUR)).vote, 1)
  assert.equal(agentTendance(serie(100, -0.1, HEURE, 200), serie(100, -1, JOUR, 300)).vote, -1)
  assert.equal(agentTendance(serie(100, 0.1), serie(100, -1, JOUR, 300)).vote, 0) // D opposé : abstention
  assert.equal(agentTendance(serie(30, 0.1), serie(100, 1, JOUR)).vote, 0)
})

test('agent Momentum : rupture filtrée par le RSI', () => {
  // Tendance douce puis rupture modérée : RSI non extrême
  const b = serie(80, 0)
  b.forEach((x, i) => { const v = 100 + Math.sin(i) * 0.5; x.open = v; x.close = v + (i % 2 ? 0.1 : -0.1); x.high = Math.max(x.open, x.close) + 0.1; x.low = Math.min(x.open, x.close) - 0.1 })
  const der = b.at(-1); der.close = 101.2; der.high = 101.3
  assert.equal(agentMomentum(b).vote, 1)
  // Hausse continue : RSI à 100, abstention
  const r = agentMomentum(serie(80, 1))
  assert.equal(r.vote, 0)
  assert.match(r.raisons.join(' '), /RSI extrême/)
})

test('agent Volatilité : veto si ATR > 2,5 × médiane', () => {
  const calme = serie(150, 0.01, HEURE, 100, 0.1)
  assert.equal(agentVolatilite(calme).veto, false)
  const agite = serie(150, 0.01, HEURE, 100, 0.1)
  for (const b of agite.slice(-5)) { b.high += 5; b.low -= 5 }
  assert.equal(agentVolatilite(agite).veto, true)
})

test('régime macro et lecture par actif', () => {
  const pts = (vals) => vals.map((v, i) => ({ t: i, v }))
  assert.equal(regimeMacro({ vix: pts([30]), hy: pts([3, 3, 3, 3, 3, 3]) }).regime, 'refuge')
  assert.equal(regimeMacro({ vix: pts([20]), hy: pts([3, 3, 3, 3, 3, 3.4]) }).regime, 'refuge')
  assert.equal(regimeMacro({ vix: pts([15]), hy: pts([3.2, 3, 3, 3, 3, 3]) }).regime, 'risque')
  assert.equal(regimeMacro({ vix: pts([20]), hy: pts([3, 3, 3, 3, 3, 3]) }).regime, 'neutre')
  assert.equal(regimeMacro({ vix: null, hy: [] }).regime, 'inconnu')
  assert.equal(agentMacro('XAU/USD', { regime: 'refuge', raisons: [] }).vote, 1)
  assert.equal(agentMacro('BTC/USD', { regime: 'refuge', raisons: [] }).vote, -1)
  assert.equal(agentMacro('EUR/USD', { regime: 'inconnu', raisons: [] }).vote, 0)
})

test('agent Risque : chaque limite lève un veto', () => {
  const h1 = serie(100, 0.1)
  const maintenant = h1.at(-1).t + HEURE + 60e3
  const base = { symbole: 'EUR/USD', h1, maintenant, ouvertes: [], pnlJour: 0, fed: [] }
  assert.equal(agentRisque(base).veto, false)
  assert.equal(agentRisque({ ...base, maintenant: maintenant + 3 * HEURE }).veto, true) // marché fermé
  assert.equal(agentRisque({ ...base, ouvertes: [{ actif: 'EUR/USD' }] }).veto, true)
  assert.equal(agentRisque({ ...base, ouvertes: [{ actif: 'A' }, { actif: 'B' }, { actif: 'C' }] }).veto, true)
  assert.equal(agentRisque({ ...base, pnlJour: -REGLES.pertesJourMax * REGLES.capital }).veto, true)
  assert.equal(agentRisque({ ...base, fed: [maintenant - HEURE] }).veto, true)
  assert.equal(agentRisque({ ...base, fed: [maintenant - 3 * HEURE] }).veto, false)
})

test('comité : accord, opposition macro et vetos', () => {
  const v = (vote, veto = false) => ({ vote, veto, raisons: ['r'] })
  assert.deepEqual(comite({ tendance: v(1), momentum: v(1), macro: v(1), volatilite: v(0), risque: v(0) }).accord, 3)
  const deux = comite({ tendance: v(-1), momentum: v(-1), macro: v(0), volatilite: v(0), risque: v(0) })
  assert.equal(deux.sens, -1); assert.equal(deux.accord, 2)
  assert.equal(comite({ tendance: v(1), momentum: v(1), macro: v(-1), volatilite: v(0), risque: v(0) }).sens, 0)
  assert.equal(comite({ tendance: v(1), momentum: v(0), macro: v(1), volatilite: v(0), risque: v(0) }).sens, 0)
  assert.equal(comite({ tendance: v(1), momentum: v(1), macro: v(1), volatilite: v(0, true), risque: v(0) }).sens, 0)
  assert.equal(comite({ tendance: v(1), momentum: v(1), macro: v(1), volatilite: v(0), risque: v(0, true) }).sens, 0)
})

test('portefeuille fictif : taille, objectif, stop prudent, durée maximale, frais', () => {
  const h1 = serie(100, 0)
  const p = ouvrir({ symbole: 'EUR/USD', frais: 0, sens: 1, accord: 3, h1, atrH1: 1 })
  assert.equal(p.stop, 98.5); assert.equal(p.cible, 103)
  assert.equal(p.quantite * 1.5, REGLES.capital * REGLES.risque) // perte au stop = 0,5 % du capital
  const debut = Date.parse(p.ouverte_le)
  const bougie = (i, o) => ({ t: debut + i * HEURE, open: 100, close: 100, high: 100.5, low: 99.5, ...o })

  assert.equal(suivre(p, [bougie(0)]), null)
  const gain = suivre(p, [bougie(0), bougie(1, { high: 103.5 })])
  assert.equal(gain.raison_sortie, 'objectif'); assert.ok(Math.abs(gain.r - 2) < 1e-9)
  const deuxSens = suivre(p, [bougie(0, { high: 104, low: 98 })])
  assert.equal(deuxSens.raison_sortie, 'stop'); assert.ok(Math.abs(deuxSens.r + 1) < 1e-9)
  const ecart = suivre(p, [bougie(0, { open: 97, low: 96.5, high: 97.5, close: 97 })])
  assert.equal(ecart.sortie, 97) // ouverture sous le stop : exécution à l'ouverture
  const longue = suivre(p, Array.from({ length: REGLES.dureeMax }, (_, i) => bougie(i)))
  assert.equal(longue.raison_sortie, 'durée maximale')
  assert.equal(suivre(p, [bougie(-1, { high: 110 })]), null) // bougie antérieure à l'ouverture ignorée

  const court = ouvrir({ symbole: 'BTC/USD', frais: 10, sens: -1, accord: 2, h1, atrH1: 1 })
  const c = suivre(court, [bougie(0, { low: 96.9 })])
  assert.equal(c.raison_sortie, 'objectif')
  // 2R moins les frais : 10 pb × (100 + 97) / risque de 1,5 par unité
  assert.ok(Math.abs(c.r - (2 - (10 / 1e4) * 197 / 1.5)) < 1e-9)
})

test('bilan par niveau d’accord', () => {
  const b = bilan([
    { statut: 'fermee', accord: 3, pnl: 100, r: 2 },
    { statut: 'fermee', accord: 3, pnl: -50, r: -1 },
    { statut: 'fermee', accord: 2, pnl: -50, r: -1 },
    { statut: 'ouverte', accord: 2 },
  ])
  assert.equal(b.global.n, 3)
  assert.equal(b.accord3.taux, 0.5)
  assert.equal(b.accord3.totalR, 1)
  assert.equal(b.accord2.gagnantes, 0)
})
