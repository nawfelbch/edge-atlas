// Lecture du journal des agents pour le site, protégée par le mot de passe
// EDGE ATLAS (même règle que twelve.mjs). Lecture seule.
import { createHash, timingSafeEqual } from 'node:crypto'
import { bilan } from '../lib/agents.mjs'
import { base } from '../lib/base.mjs'

const reponse = (status, corps) =>
  new Response(JSON.stringify(corps), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })

const empreinte = (texte) => createHash('sha256').update(String(texte)).digest()

export default async (req) => {
  if (req.method !== 'GET') return reponse(405, { error: 'Lecture uniquement' })
  const motDePasse = process.env.EDGE_ATLAS_PASSWORD
  if (!motDePasse) return reponse(503, { error: 'Variable EDGE_ATLAS_PASSWORD à définir sur Netlify' })
  if (!timingSafeEqual(empreinte(req.headers.get('x-edge-pass') ?? ''), empreinte(motDePasse))) return reponse(401, { error: 'Mot de passe incorrect' })
  try {
    const db = base()
    const [runs, trades] = await Promise.all([
      db.lire('agent_runs?select=id,heure,macro,erreurs,resume,agent_votes(actif,agent,vote,veto,raisons)&order=heure.desc&limit=24'),
      db.lire('paper_trades?select=*&order=ouverte_le.desc&limit=500'),
    ])
    const propres = trades.map((t) => ({ ...t, accord: Number(t.accord), pnl: t.pnl == null ? null : Number(t.pnl), r: t.r == null ? null : Number(t.r) }))
    return reponse(200, { runs, trades: propres.slice(0, 100), bilan: bilan(propres) })
  } catch (e) {
    return reponse(502, { error: e.message })
  }
}
