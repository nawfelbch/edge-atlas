# EDGE ATLAS

Observatoire personnel et pédagogique du trading : radar multi-horizons (MN → M1),
simulations, journal, fiches et sources. **Aucun ordre réel, aucune connexion à un courtier.**

## En ligne (Netlify)
- `dist/` : le site statique.
- `netlify/functions/fred.mjs` : relais en lecture seule vers FRED (3 séries autorisées),
  car FRED refuse les appels directs du navigateur.
- Binance et Twelve Data sont appelés directement par le navigateur ; la clé Twelve Data
  n'est jamais envoyée à Netlify.

## En local
Double-cliquer `DEMARRER.cmd` (Node.js requis), puis ouvrir http://127.0.0.1:4173/#radar.
Sans serveur : ouvrir `EDGE-ATLAS.html`.

Voir `LIRE-MOI.txt` pour le détail et les limites.
