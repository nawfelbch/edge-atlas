// Tâche planifiée : toutes les heures (minute 3, UTC), collecte les données,
// fait voter les agents, suit et ouvre des positions FICTIVES, et enregistre
// tout dans la base EDGE ATLAS. Aucun ordre réel n'est passé.
import {
  ACTIFS, HEURE, JOUR, agentMacro, agentMomentum, agentRisque, agentTendance, agentVolatilite,
  comite, lireFed, lireFred, lireTwelve, ouvrir, regimeMacro, suivre,
} from '../lib/agents.mjs'
import { base } from '../lib/base.mjs'

export const config = { schedule: '3 * * * *' }

const telecharger = async (url, type = 'text') => {
  const res = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'error' })
  if (!res.ok) throw Error('HTTP ' + res.status + ' sur ' + new URL(url).hostname)
  return type === 'json' ? res.json() : res.text()
}

function twelve(symbole, intervalle, taille) {
  const p = new URLSearchParams({ symbol: symbole, interval: intervalle, outputsize: String(taille), timezone: 'UTC', order: 'desc', apikey: process.env.TWELVE_DATA_API_KEY })
  return telecharger('https://api.twelvedata.com/time_series?' + p, 'json')
}

const fred = (id) => telecharger('https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + id).then(lireFred)

export async function executer(maintenant = Date.now()) {
  if (!process.env.TWELVE_DATA_API_KEY) throw Error('Variable TWELVE_DATA_API_KEY à définir sur Netlify')
  const db = base()
  const heure = new Date(Math.floor(maintenant / HEURE) * HEURE).toISOString()

  // Une seule exécution par heure, même si Netlify relance la tâche
  const [run] = await db.inserer('agent_runs', [{ heure }], '?on_conflict=heure')
  if (!run) return { deja: true, heure }

  const erreurs = []
  const noter = (source) => (e) => { erreurs.push(source + ' : ' + e.message); return null }

  // Contexte commun : Fed, VIX, écart de crédit (sources gratuites, sans clé)
  const [fedXml, vix, hy] = await Promise.all([
    telecharger('https://www.federalreserve.gov/feeds/press_monetary.xml').catch(noter('Fed')),
    fred('VIXCLS').catch(noter('FRED VIX')),
    fred('BAMLH0A0HYM2').catch(noter('FRED crédit')),
  ])
  const fed = fedXml ? lireFed(fedXml) : []
  const regime = regimeMacro({ vix, hy })

  // Cours : 2 appels par actif, 6 au total, sous la limite gratuite de 8 par minute
  const cours = {}
  for (const { symbole } of ACTIFS) {
    const [h1, d] = await Promise.all([
      twelve(symbole, '1h', 200).then((j) => lireTwelve(j, HEURE, maintenant)).catch(noter(symbole + ' H1')),
      twelve(symbole, '1day', 120).then((j) => lireTwelve(j, JOUR, maintenant)).catch(noter(symbole + ' D')),
    ])
    cours[symbole] = { h1: h1 || [], d: d || [] }
  }

  // 1. Suivi des positions ouvertes
  const ouvertes = await db.lire('paper_trades?statut=eq.ouverte&select=*')
  for (const p of [...ouvertes]) {
    const fin = suivre({ ...p, entree: +p.entree, stop: +p.stop, cible: +p.cible, quantite: +p.quantite, frais_bps: +p.frais_bps }, cours[p.actif]?.h1 || [])
    if (fin) {
      await db.modifier('paper_trades?id=eq.' + p.id + '&statut=eq.ouverte', fin)
      ouvertes.splice(ouvertes.indexOf(p), 1)
    }
  }

  // 2. Perte réalisée depuis minuit UTC
  const minuit = new Date(Math.floor(maintenant / JOUR) * JOUR).toISOString()
  const fermeesJour = await db.lire('paper_trades?statut=eq.fermee&fermee_le=gte.' + minuit + '&select=pnl')
  const pnlJour = fermeesJour.reduce((s, t) => s + Number(t.pnl), 0)

  // 3. Votes et décisions
  const votes = [], decisions = []
  for (const { symbole, frais } of ACTIFS) {
    const { h1, d } = cours[symbole]
    const v = {
      tendance: agentTendance(h1, d),
      momentum: agentMomentum(h1),
      macro: agentMacro(symbole, regime),
      volatilite: agentVolatilite(h1),
      risque: agentRisque({ symbole, h1, maintenant, ouvertes, pnlJour, fed }),
    }
    const decision = comite(v)
    for (const [agent, r] of Object.entries(v)) votes.push({ run_id: run.id, actif: symbole, agent, vote: r.vote, veto: r.veto, raisons: r.raisons })
    votes.push({ run_id: run.id, actif: symbole, agent: 'comite', vote: decision.sens, veto: false, raisons: [decision.raison] })
    decisions.push({ actif: symbole, ...decision })
    if (decision.sens) {
      const position = { ...ouvrir({ symbole, frais, sens: decision.sens, accord: decision.accord, h1, atrH1: v.volatilite.atr }), run_id: run.id }
      const [creee] = await db.inserer('paper_trades', [position], '?on_conflict=actif,ouverte_le')
      if (creee) ouvertes.push(creee)
    }
  }
  await db.inserer('agent_votes', votes)

  const resume = decisions.map((x) => x.actif + ' ' + (x.sens > 0 ? 'ACHAT' : x.sens < 0 ? 'VENTE' : '—')).join(' · ')
  await db.modifier('agent_runs?id=eq.' + run.id, { macro: { regime: regime.regime, raisons: regime.raisons }, erreurs, resume })
  return { heure, resume, erreurs }
}

export default async () => {
  try {
    const resultat = await executer()
    console.log('agents-h1', JSON.stringify(resultat))
  } catch (e) {
    console.error('agents-h1 en échec :', e.message)
  }
  return new Response('ok')
}
