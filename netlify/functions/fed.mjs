// Relais en lecture seule du flux RSS des communiqués monétaires de la Fed
// (même source que /api/fed dans server.cjs).
const reponse = (status, corps, type = 'application/json; charset=utf-8') =>
  new Response(typeof corps === 'string' ? corps : JSON.stringify(corps), {
    status,
    headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' },
  })

export default async (req) => {
  if (req.method !== 'GET') return reponse(405, { error: 'Lecture uniquement' })
  try {
    const amont = await fetch('https://www.federalreserve.gov/feeds/press_monetary.xml', { signal: AbortSignal.timeout(20000), redirect: 'error', headers: { Accept: 'application/xml' } })
    if (!amont.ok) return reponse(amont.status, { error: 'Source indisponible : HTTP ' + amont.status })
    const texte = await amont.text()
    if (texte.length > 8 * 1024 * 1024) return reponse(502, { error: 'Réponse trop volumineuse' })
    return reponse(200, texte, 'application/xml; charset=utf-8')
  } catch (err) {
    return reponse(502, { error: err.name === 'TimeoutError' ? 'Délai source dépassé' : 'Connexion à la source impossible' })
  }
}
