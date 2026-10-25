# EDGE ATLAS

Observatoire personnel et pédagogique du trading : radar multi-horizons (MN → M1),
simulations, journal, fiches et sources. **Aucun ordre réel, aucune connexion à un courtier.**

## En ligne (Netlify)
- `dist/` : le site statique.
- `netlify/functions/fred.mjs` : relais en lecture seule vers FRED (3 séries autorisées),
  car FRED refuse les appels directs du navigateur.
- `netlify/functions/twelve.mjs` : relais Twelve Data. La clé reste dans la variable Netlify
  `TWELVE_DATA_API_KEY` ; la page demande le mot de passe `EDGE_ATLAS_PASSWORD`
  (mémorisé sur l'appareil, jamais la clé).
- Binance est appelé directement par le navigateur.

## En local
Double-cliquer `DEMARRER.cmd` (Node.js requis), puis ouvrir http://127.0.0.1:4173/#radar.
Sans serveur : ouvrir `EDGE-ATLAS.html`.

Voir `LIRE-MOI.txt` pour le détail et les limites.

## Backtest chiffré multi-horizons (sur ton PC)
`node backtest/multi-tf.mjs` télécharge de vrais cours (Binance ; Forex/or si
`TWELVE_DATA_API_KEY` est définie) et teste les stratégies du site (moteur
`dist/engine.js`) sur W, D, H4, H1, M15, plus un filtre de tendance journalière.
Réglages choisis sur les 70 % anciens, mesurés sur les 30 % récents. Résultats
dans `backtest/resultats/` (CSV + HTML, non envoyés sur GitHub).

## Recherche Forex : bénéfice supérieur au drawdown (sur ton PC)
`node backtest/forex-recherche.mjs` (clé `TWELVE_DATA_API_KEY` ; taux à 3 mois
lus sur FRED, swap compté) ajoute le momentum 3/6/12 mois et le carry en mensuel,
et une validation glissante sur 5 périodes. Il combine aussi les
briques du site (tendance, ruptures, RSI, filtre SMA 200, filtre journalier,
stop ATR fixe ou suiveur, objectif 3R, risque 0,5 % par position) sur 6 paires
en D et H4. Chaque configuration est commune à toutes les paires, classée sur
les 60 % anciens et jugée sur les 40 % récents. Données en cache 12 h dans
`backtest/cache/`, résultats dans `backtest/resultats/` (non envoyés sur GitHub).
