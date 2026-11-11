// Accès à la base Supabase dédiée à EDGE ATLAS (jamais celle de SECOTO), par
// l'API REST : pas de dépendance npm. La clé secrète reste dans les variables
// Netlify EDGE_SUPABASE_URL et EDGE_SUPABASE_SECRET_KEY.

export function base() {
  const url = process.env.EDGE_SUPABASE_URL, cle = process.env.EDGE_SUPABASE_SECRET_KEY
  if (!url || !cle) throw Error('Variables EDGE_SUPABASE_URL et EDGE_SUPABASE_SECRET_KEY à définir sur Netlify')
  // Les anciennes clés service_role sont des JWT (« eyJ… ») et vont aussi dans Authorization ;
  // les nouvelles clés « sb_secret_… » passent uniquement par l'en-tête apikey.
  const entetes = { apikey: cle, 'Content-Type': 'application/json', ...(cle.startsWith('eyJ') ? { Authorization: 'Bearer ' + cle } : {}) }

  async function requete(methode, chemin, corps, prefer) {
    const res = await fetch(url.replace(/\/$/, '') + '/rest/v1/' + chemin, {
      method: methode,
      headers: { ...entetes, ...(prefer ? { Prefer: prefer } : {}) },
      body: corps === undefined ? undefined : JSON.stringify(corps),
      signal: AbortSignal.timeout(10000),
    })
    const texte = await res.text()
    if (!res.ok) throw Error('Base ' + res.status + ' sur ' + chemin.split('?')[0] + ' : ' + texte.slice(0, 200))
    return texte ? JSON.parse(texte) : null
  }

  return {
    lire: (chemin) => requete('GET', chemin),
    inserer: (table, lignes, options = '') => requete('POST', table + options, lignes, 'return=representation' + (options.includes('on_conflict') ? ',resolution=ignore-duplicates' : '')),
    modifier: (chemin, valeurs) => requete('PATCH', chemin, valeurs, 'return=representation'),
  }
}
