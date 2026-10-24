// Relais du calendrier Trading Economics (même règles que /api/calendar dans
// server.cjs) : la clé personnelle arrive dans l'en-tête X-Data-Key, n'est
// ni enregistrée ni journalisée, et n'est transmise qu'à Trading Economics.
const reponse = (status, corps) =>
  new Response(typeof corps === 'string' ? corps : JSON.stringify(corps), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })

const dateOK = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x

export default async (req) => {
  if (req.method !== 'GET') return reponse(405, { error: 'Lecture uniquement' })
  const cle = req.headers.get('x-data-key')
  if (typeof cle !== 'string' || !/^[A-Za-z0-9_:+.=-]{5,256}$/.test(cle)) return reponse(400, { error: 'Clé Trading Economics manquante ou invalide' })
  const recu = new URL(req.url).searchParams
  const start = recu.get('start'), end = recu.get('end')
  if (!dateOK(start) || !dateOK(end) || end < start || (Date.parse(end) - Date.parse(start)) / 86400000 > 31) return reponse(400, { error: 'Période invalide : 31 jours maximum' })

  const cible = new URL('https://api.tradingeconomics.com/calendar/country/All/' + start + '/' + end)
  cible.searchParams.set('c', cle)
  cible.searchParams.set('f', 'json')
  cible.searchParams.set('values', 'true')
  try {
    const amont = await fetch(cible, { signal: AbortSignal.timeout(20000), redirect: 'error', headers: { Accept: 'application/json' } })
    if (!amont.ok) return reponse(amont.status, { error: 'Source indisponible : HTTP ' + amont.status })
    const texte = await amont.text()
    if (texte.length > 8 * 1024 * 1024) return reponse(502, { error: 'Réponse trop volumineuse' })
    return reponse(200, texte)
  } catch (err) {
    return reponse(502, { error: err.name === 'TimeoutError' ? 'Délai source dépassé' : 'Connexion à la source impossible' })
  }
}
