// Laboratoire > Mes candidats : stratégies repérées par les recherches
// (backtest/forex-recherche.mjs, backtest/multi-tf.mjs), conservées pour être
// re-testées. Chiffres réels des tests du 25/10/2026, sans valeur de prévision.
(function () {
'use strict';
const candidats = [
  {
    nom: 'Carry confirmé par le momentum 12 mois', horizon: 'Mensuel · 6 paires', statut: 'Piste la plus sérieuse',
    regle: 'Chaque fin de mois, acheter la devise dont le taux à 3 mois est le plus élevé (écart > 0,25 %), seulement si la paire a monté sur 12 mois (et l’inverse pour vendre). Taille de position visant 10 % de volatilité annuelle par paire. Swap compté, moins 0,5 %/an de marge courtier.',
    chiffres: [['Bénéfice (validation ≈ 7,5 ans)', '+10,8 %', 'positive'], ['Drawdown maximal', '10,7 %', 'negative'], ['Bénéfice / drawdown', '1,00'], ['Paires positives', '4 / 6']],
    details: 'Dont +5,7 % de swap. Environ 1,4 % par an pour 10 % de volatilité. Paires : EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, XAU/USD.',
    limites: ['Négative sur la période ancienne (bénéfice / drawdown −0,77) : elle dépend des écarts de taux, élevés depuis 2022.', 'Taux EUR et GBP arrêtés en janvier 2026 et prolongés : léger flou sur 2026.', 'Pas encore confirmée sur des paires non utilisées pour choisir.'],
  },
  {
    nom: 'Rupture 55/20 avec filtre journalier et stop suiveur', horizon: 'H4 · 6 paires', statut: 'À confirmer',
    regle: 'En H4, acheter à la clôture au-dessus du plus haut des 55 bougies précédentes (vendre sous le plus bas), seulement dans le sens de la tendance journalière (moyennes 15/60 du journalier). Stop suiveur à 2 ATR, sortie sur rupture inverse des 20 bougies. Risque 0,5 % du capital par position.',
    chiffres: [['Bénéfice (validation ≈ 1 an)', '+1,4 %', 'positive'], ['Drawdown maximal', '1,2 %', 'negative'], ['Bénéfice / drawdown', '1,17'], ['Transactions', '149']],
    details: 'Positive sur 3 paires sur 6. La version 55/27 donne le même résultat : c’est presque toujours le stop suiveur qui fait sortir.',
    limites: ['Seulement 8e sur la période de recherche : retenue après avoir vu la validation, donc risque de sélection a posteriori.', 'Gains faibles en valeur absolue avec 0,5 % de risque par position.', 'Pas encore confirmée sur des paires non utilisées pour choisir.'],
  },
  {
    nom: 'Tendance 10/50 avec filtre journalier et stop suiveur', horizon: 'H4 · 6 paires', statut: 'À surveiller',
    regle: 'En H4, entrer au croisement des moyennes 10 et 50, seulement dans le sens de la tendance journalière. Stop suiveur à 2 ATR. Risque 0,5 % par position.',
    chiffres: [['Bénéfice (validation ≈ 1 an)', '+0,8 %', 'positive'], ['Drawdown maximal', '1,4 %', 'negative'], ['Bénéfice / drawdown', '0,59'], ['Transactions', '133']],
    details: 'Famille la plus régulière de la validation glissante H4 (gains sur 2 périodes sur 4).',
    limites: ['Bénéfice inférieur au drawdown.'],
  },
  {
    nom: 'Retour RSI 25/75 avec filtre SMA 200', horizon: 'H4 · 6 paires', statut: 'Trop peu de transactions',
    regle: 'En H4, acheter quand le RSI14 passe sous 25 au-dessus de la SMA 200 (vendre au-dessus de 75 sous la SMA 200). Sortie au retour du RSI vers 50 ou au stop à 2 ATR.',
    chiffres: [['Bénéfice (validation)', '+0,1 %', 'positive'], ['Drawdown maximal', '0,2 %', 'negative'], ['Bénéfice / drawdown', '0,77'], ['Transactions', '6']],
    details: 'Positive sur 4 paires sur 6, mais une seule transaction par paire.',
    limites: ['6 transactions : impossible de distinguer le résultat du hasard.'],
  },
]
const lecons = [
  'Les réglages « optimisés » sur le passé s’effondrent souvent ensuite (exemple : BTC journalier, +836 % en recherche → −3 % en validation). Les réglages par défaut font souvent mieux.',
  'EUR/USD journalier : les bougies de week-end des flux Forex faussaient les moyennes (+1,13 % avec, −0,64 % sans). Elles sont désormais retirées automatiquement.',
  'Coûts Forex réalistes : 0,5 + 0,5 pb par côté, sans emprunt sur un short ; le swap compte, surtout pour le carry.',
  'Aucune des 325 configurations Forex n’a réussi les trois tests à la fois (découpage 60/40, primes documentées, validation glissante).',
  'En validation glissante, choisir chaque fois « le meilleur du passé » a perdu en journalier (−4,0 %) et presque rien gagné en H4 (+0,3 %).',
]
function render() {
  $('#main').innerHTML = title('03 / LABORATOIRE', 'Mes candidats.', 'Les stratégies repérées par les recherches, gardées pour être re-testées. Une candidate n’est pas une stratégie validée : résultats simulés, sans valeur de prévision.') +
    '<section class="section" style="padding-top:0">' + labNav('cand') +
    '<div class="notice warn"><b>À lire avant tout.</b> Chiffres des tests du 25/10/2026 sur cours réels (Twelve Data, Binance), moteur EDGE ATLAS. Aucune stratégie n’a encore passé tous les tests. Prochaine étape prévue : tester les candidats tels quels sur EUR/GBP, EUR/JPY, GBP/JPY, NZD/USD, USD/CHF et AUD/JPY, jamais utilisées pour choisir.</div>' +
    candidats.map((c, i) => '<article class="card candidate"><span class="num">CANDIDAT ' + (i + 1) + ' · ' + esc(c.horizon) + ' · ' + esc(c.statut.toUpperCase()) + '</span><h3>' + esc(c.nom) + '</h3><p>' + esc(c.regle) + '</p>' + metrics(c.chiffres.map(([l, v, cl]) => [esc(l), esc(v), cl])) + '<p class="hint">' + esc(c.details) + '</p><h4>Limites</h4><ul>' + c.limites.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul></article>').join('') +
    '<article class="card candidate"><span class="num">CE QUE LES TESTS ONT APPRIS</span><ul>' + lecons.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul><p class="hint">Détail et commandes : <code>backtest/candidats.md</code> et <code>backtest/forex-recherche.mjs --candidats</code> dans le dépôt edge-atlas.</p></article>' +
    '</section>'
  bindNav()
}
window.CandidatsPage = { render }
})();
