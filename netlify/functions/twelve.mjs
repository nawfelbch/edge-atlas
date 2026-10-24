// Relais Twelve Data pour le site en ligne : la clé reste dans les variables
// Netlify (TWELVE_DATA_API_KEY) et n'est servie qu'avec le mot de passe du
// site (EDGE_ATLAS_PASSWORD), pour que personne d'autre n'use le quota.
import { createHash, timingSafeEqual } from 'node:crypto'

const frames = new Set(['1month', '1week', '1day', '4h', '1h', '15min', '5min', '1min'])

const reponse = (status, corps) =>
  new Response(typeof corps === 'string' ? corps : JSON.stringify(corps), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })

const empreinte = (texte) => createHash('sha256').update(String(texte)).digest()

export default async (req) => {
  if (req.method !== 'GET') return reponse(405, { error: 'Lecture uniquement' })
  const cle = process.env.TWELVE_DATA_API_KEY
  const motDePasse = process.env.EDGE_ATLAS_PASSWORD
  if (!cle || !motDePasse) return reponse(503, { error: 'Variables TWELVE_DATA_API_KEY et EDGE_ATLAS_PASSWORD à définir sur Netlify' })
  if (!timingSafeEqual(empreinte(req.headers.get('x-edge-pass') ?? ''), empreinte(motDePasse))) return reponse(401, { error: 'Mot de passe incorrect' })

  const recu = new URL(req.url).searchParams
  const symbol = recu.get('symbol'), interval = recu.get('interval')
  if (!symbol || !/^[-A-Za-z0-9_./:^ ]{1,40}$/.test(symbol) || !frames.has(interval)) return reponse(400, { error: 'Symbole ou unité invalide' })

  const cible = new URL('https://api.twelvedata.com/time_series')
  for (const [k, v] of Object.entries({ symbol, interval, outputsize: '500', timezone: 'UTC', order: 'desc', apikey: cle })) cible.searchParams.set(k, v)
  try {
    const amont = await fetch(cible, { signal: AbortSignal.timeout(20000), redirect: 'error', headers: { Accept: 'application/json' } })
    const texte = await amont.text()
    // Message de Twelve Data recopié (symbole inconnu, plan insuffisant, quota…)
    if (!amont.ok) {
      let message = ''
      try { message = JSON.parse(texte).message || '' } catch { /* réponse non JSON */ }
      return reponse(amont.status, { error: 'Réponse Twelve Data ' + amont.status + (message ? ' : ' + message : '') })
    }
    if (texte.length > 8 * 1024 * 1024) return reponse(502, { error: 'Réponse trop volumineuse' })
    return reponse(200, texte)
  } catch (err) {
    return reponse(502, { error: err.name === 'TimeoutError' ? 'Délai source dépassé' : 'Connexion à la source impossible' })
  }
}
