// Test de bout en bout de la tâche horaire, sans réseau : Twelve Data, FRED,
// la Fed et l'API REST de Supabase sont simulés par un faux fetch.
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { HEURE, JOUR } from '../netlify/lib/agents.mjs'

const H0 = Date.UTC(2026, 10, 10, 0)
const NB = 200
let decalage = 0 // heures ajoutées pour simuler le passage du temps
let regime = 'risque'

// Hausse régulière avec respiration, puis rupture modérée sur la dernière bougie close
function bougiesH1(base, jusqua) {
  const out = []
  for (let i = 0; i < NB + decalage; i++) {
    const t = H0 + i * HEURE
    if (t + HEURE > jusqua + HEURE) break // inclut la bougie en cours, que lireTwelve doit exclure
    let o = base * (1 + 0.0004 * i + (i % 4 < 2 ? 0.001 : -0.001))
    let c = o * (i % 4 < 2 ? 1.0006 : 0.9994)
    if (i === NB - 1) c = o * 1.004 // rupture
    if (i >= NB) { o = base * 1.15; c = o } // heures suivantes : envolée → objectif atteint
    out.push({ t, open: o, close: c, high: Math.max(o, c) * 1.0004, low: Math.min(o, c) * 0.9996 })
  }
  return out
}
const bougiesD = (base) => Array.from({ length: 120 }, (_, i) => { const c = base * (0.8 + i * 0.002); return { t: H0 - (120 - i) * JOUR, open: c, high: c * 1.002, low: c * 0.998, close: c } })
const BASES = { 'EUR/USD': 1.1, 'XAU/USD': 2600, 'BTC/USD': 90000 }
const format = (t, jour) => new Date(t).toISOString().slice(0, jour ? 10 : 19).replace('T', ' ')

// Fausse API REST Supabase, limitée aux requêtes de la tâche
const db = { agent_runs: [], agent_votes: [], paper_trades: [] }
let id = 1
function rest(methode, url, corps) {
  const table = url.pathname.split('/').pop(), p = url.searchParams
  if (methode === 'POST') {
    const lignes = JSON.parse(corps), conflit = p.get('on_conflict')?.split(',')
    const creees = []
    for (const l of lignes) {
      if (conflit && db[table].some((x) => conflit.every((k) => x[k] === l[k]))) continue
      if (table === 'paper_trades' && db.paper_trades.some((x) => x.statut === 'ouverte' && x.actif === l.actif)) throw Error('index unique : une position ouverte par actif')
      const ligne = { id: id++, ...l }
      db[table].push(ligne); creees.push(ligne)
    }
    return creees
  }
  let lignes = db[table]
  for (const [k, v] of p) {
    if (['select', 'order', 'limit'].includes(k)) continue
    const [op, val] = v.split(/\.(.*)/)
    lignes = lignes.filter((x) => (op === 'eq' ? String(x[k]) === val : op === 'gte' ? x[k] >= val : true))
  }
  if (methode === 'PATCH') { lignes.forEach((x) => Object.assign(x, JSON.parse(corps))); return lignes }
  return lignes
}

before(() => {
  process.env.TWELVE_DATA_API_KEY = 'test'
  process.env.EDGE_SUPABASE_URL = 'https://base.test'
  process.env.EDGE_SUPABASE_SECRET_KEY = 'sb_secret_test'
  globalThis.fetch = async (cible, options = {}) => {
    const url = new URL(cible)
    const ok = (corps) => new Response(typeof corps === 'string' ? corps : JSON.stringify(corps), { status: 200 })
    if (url.hostname === 'base.test') {
      assert.equal(options.headers.apikey, 'sb_secret_test')
      assert.equal(options.headers.Authorization, undefined)
      return ok(rest(options.method, url, options.body))
    }
    if (url.hostname === 'api.twelvedata.com') {
      const s = url.searchParams.get('symbol'), jour = url.searchParams.get('interval') === '1day'
      const maintenant = H0 + (NB + decalage) * HEURE
      const b = jour ? bougiesD(BASES[s]) : bougiesH1(BASES[s], maintenant)
      return ok({ values: b.reverse().map((x) => ({ datetime: format(x.t, jour), open: String(x.open), high: String(x.high), low: String(x.low), close: String(x.close) })) })
    }
    if (url.hostname === 'fred.stlouisfed.org') {
      const vals = url.searchParams.get('id') === 'VIXCLS' ? [regime === 'risque' ? 15 : 30] : [3.2, 3.1, 3.1, 3, 3, 3]
      return ok('DATE,X\n' + vals.map((v, i) => '2026-11-0' + (i + 1) + ',' + v).join('\n'))
    }
    if (url.hostname === 'www.federalreserve.gov') return ok('<rss><item><pubDate>Wed, 28 Oct 2026 18:00:00 GMT</pubDate></item></rss>')
    throw Error('Hôte inattendu : ' + url.hostname)
  }
})

test('une heure complète : votes, décisions, positions fictives', async () => {
  const { executer } = await import('../netlify/functions/agents-h1.mjs')
  const maintenant = H0 + NB * HEURE + 3 * 60e3
  const r = await executer(maintenant)
  assert.deepEqual(r.erreurs, [])
  assert.equal(db.agent_runs.length, 1)
  assert.equal(db.agent_votes.length, 3 * 6) // 3 actifs × (5 agents + comité)
  const ouvertes = db.paper_trades.filter((t) => t.statut === 'ouverte')
  // Régime « appétit pour le risque » : EUR/USD et BTC à 3 agents d'accord, or à 2 (macro neutre)
  assert.deepEqual(ouvertes.map((t) => [t.actif, t.sens, t.accord]).sort(), [['BTC/USD', 1, 3], ['EUR/USD', 1, 3], ['XAU/USD', 1, 2]])
  assert.match(db.agent_runs[0].resume, /EUR\/USD ACHAT/)

  // Même heure relancée : rien n'est refait
  assert.equal((await executer(maintenant + 60e3)).deja, true)
  assert.equal(db.agent_votes.length, 18)
})

test('heures suivantes : objectifs atteints, positions fermées, pas de doublon', async () => {
  const { executer } = await import('../netlify/functions/agents-h1.mjs')
  decalage = 2
  regime = 'refuge'
  await executer(H0 + (NB + 2) * HEURE + 3 * 60e3)
  const fermees = db.paper_trades.filter((t) => t.statut === 'fermee')
  assert.equal(fermees.length, 3)
  for (const t of fermees) {
    assert.equal(t.raison_sortie, 'objectif')
    assert.ok(t.r > 1 && t.r < 2, t.actif + ' : ' + t.r) // 2R moins les frais
  }
  // Frais du bitcoin (10 pb par côté) bien plus lourds que ceux d'EUR/USD (1 pb) face à un stop H1 serré
  const r = (actif) => fermees.find((t) => t.actif === actif).r
  assert.ok(r('BTC/USD') < r('EUR/USD') - 0.3)
  // Les positions fermées libèrent la place ; le risque n'en ouvre pas deux sur le même actif
  const ouvertes = db.paper_trades.filter((t) => t.statut === 'ouverte')
  assert.ok(new Set(ouvertes.map((t) => t.actif)).size === ouvertes.length)
})
