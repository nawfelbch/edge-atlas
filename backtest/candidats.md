# Stratégies candidates (à confirmer)

Configurations repérées par les recherches, gardées pour être re-testées.
Une candidate n'est **pas** une stratégie validée : elle doit tenir sur la
validation 60/40, avec au moins 20 transactions, et en validation glissante.

## 1. H4 · retour RSI 25/75 · filtre SMA 200 · stop 2 ATR
- Repérée le 25/10/2026 (`backtest/forex-recherche.mjs`, 1re version).
- Règle : en H4, acheter quand le RSI14 passe sous 25 au-dessus de la SMA 200,
  vendre quand il passe au-dessus de 75 sous la SMA 200 ; sortie au retour
  du RSI vers 50 ou au stop à 2 ATR. Risque 0,5 % par position.
- Recherche (60 % anciens) : bénéfice / DD du portefeuille = 5,14.
- Validation (25/09/2025 → 23/10/2026) : +0,1 % pour 0,2 % de DD
  (ratio 0,77), positive sur 4 paires sur 6.
- **Limite** : 6 transactions au total en validation (1 par paire). Le
  résultat ne peut pas être distingué du hasard.
- Statut : **à confirmer** — prochain test avec plus d'historique ou plus de
  paires pour atteindre au moins 30 transactions.

## 2. M · carry si momentum 12 mois d'accord · volatilité visée 10 %
- Repérée le 25/10/2026 (`forex-recherche.mjs`, version momentum/carry).
- Règle : chaque fin de mois, acheter la devise au taux à 3 mois le plus
  élevé (écart > 0,25 %) seulement si la paire a monté sur 12 mois (et
  inversement) ; taille = 10 % de volatilité visée ; swap compté.
- Validation (≈ 7,5 ans récents, 6 paires) : +10,8 % pour 10,7 % de DD
  (ratio 1,00), 4 paires sur 6 positives, dont +5,7 % de swap.
- **Limite** : négative sur la période ancienne (ratio −0,77) ; dépend des
  écarts de taux. ≈ 1,4 %/an pour 10 % de volatilité.

## 3. H4 · rupture 55/20 · filtre D · stop 2 ATR suiveur
- Validation : +1,4 % pour 1,2 % de DD (ratio 1,17), 149 transactions,
  3 paires sur 6 positives.
- **Limite** : seulement 8e sur la recherche ; retenue après avoir vu la
  validation, donc à confirmer sur d'autres paires.

## 4. H4 · tendance 10/50 · filtre D · stop 2 ATR suiveur
- Validation : +0,8 % pour 1,4 % de DD (ratio 0,59), 133 transactions ;
  famille la plus régulière de la validation glissante H4.

## Test de confirmation
`node backtest/forex-recherche.mjs --candidats --pairs=EUR/GBP,EUR/JPY,GBP/JPY,NZD/USD,USD/CHF,AUD/JPY`
Les 4 candidats, tels quels, sur 6 paires jamais utilisées pour choisir.
