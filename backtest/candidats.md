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
