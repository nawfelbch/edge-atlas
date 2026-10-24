const CONTENT = {
  "verifiedAt": "2026-10-24",
  "editorialNote": "Contenu pédagogique original. Les protocoles chiffrés sont des exemples à tester, pas des résultats validés ni des conseils personnalisés. Une source sur une famille de stratégies ne valide pas les paramètres du simulateur.",
  "sources": [
    {
      "id": "amf-cfd",
      "title": "AMF — Comprendre les CFD",
      "url": "https://www.amf-france.org/fr/espace-epargnants/comprendre-les-produits-financiers/produits-complexes/cfd"
    },
    {
      "id": "esma-2026",
      "title": "ESMA — CFD et contrats perpétuels : protections applicables",
      "url": "https://www.esma.europa.eu/press-news/esma-news/esma-reminds-firms-their-obligations-under-cfd-product-intervention-measures"
    },
    {
      "id": "sec-long-short",
      "title": "SEC Investor.gov — Longs et shorts",
      "url": "https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/stock-purchases-and-sales-long-and"
    },
    {
      "id": "sec-short",
      "title": "SEC — Risques de la vente à découvert",
      "url": "https://www.sec.gov/investor/pubs/regsho.htm"
    },
    {
      "id": "sec-orders",
      "title": "SEC Investor.gov — Types d’ordres",
      "url": "https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders"
    },
    {
      "id": "sec-stops",
      "title": "SEC Investor.gov — Stop, stop-limit et trailing stop",
      "url": "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-15"
    },
    {
      "id": "sec-execution",
      "title": "SEC Investor.gov — Exécution des ordres",
      "url": "https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/executing-order"
    },
    {
      "id": "sec-diversification",
      "title": "SEC Investor.gov — Allocation et diversification",
      "url": "https://www.investor.gov/introduction-investing/getting-started/asset-allocation"
    },
    {
      "id": "momentum",
      "title": "Moskowitz, Ooi & Pedersen — Time Series Momentum (2012)",
      "url": "https://www.aqr.com/Insights/Research/Journal-Article/Time-Series-Momentum"
    },
    {
      "id": "reversal",
      "title": "Ignashkina, Rinne & Suominen — Réversion et fourniture de liquidité (2022)",
      "url": "https://doi.org/10.1016/j.jbankfin.2022.106430"
    },
    {
      "id": "pairs",
      "title": "Gatev, Goetzmann & Rouwenhorst — Pairs Trading (NBER)",
      "url": "https://www.nber.org/papers/w7032"
    },
    {
      "id": "carry",
      "title": "Koijen et al. — Carry (2018)",
      "url": "https://www.aqr.com/Insights/Research/Journal-Article/Carry"
    },
    {
      "id": "cme-basis",
      "title": "CME Group — Calculer la juste valeur d’un future",
      "url": "https://www.cmegroup.com/trading/equity-index/fairvalue.html"
    },
    {
      "id": "overfit",
      "title": "Bailey et al. — The Probability of Backtest Overfitting",
      "url": "https://www.davidhbailey.com/dhbpapers/backtest-prob.pdf"
    },
    {
      "id": "abe",
      "title": "ABE Infoservice — Trading en ligne et escroqueries",
      "url": "https://www.abe-infoservice.fr/fr/epargne/autres-placements-risque/trading-en-ligne-forex-crypto-actifs-produits-derives-sur-crypto-actifs-cfd-de-quoi-parle-t"
    },
    {
      "id": "ecb-transmission",
      "title": "BCE — Transmission de la politique monétaire",
      "url": "https://www.ecb.europa.eu/mopo/intro/transmission/html/index.en.html"
    },
    {
      "id": "fed-curve",
      "title": "Federal Reserve — Modèles de courbe des taux",
      "url": "https://www.federalreserve.gov/data/yield-curve-models.htm"
    },
    {
      "id": "bls-cpi",
      "title": "BLS — Comprendre l’indice des prix à la consommation",
      "url": "https://www.bls.gov/cpi/questions-and-answers.htm"
    },
    {
      "id": "bea-gdp",
      "title": "BEA — PIB, premières estimations et révisions",
      "url": "https://www.bea.gov/news/gdp-release-additional-information"
    },
    {
      "id": "fed-surprises",
      "title": "Dallas Fed — Surprise monétaire et information économique",
      "url": "https://www.dallasfed.org/research/economics/2023/0822"
    },
    {
      "id": "bis-correlation",
      "title": "BRI — Relation changeante entre matières premières et dollar",
      "url": "https://www.bis.org/publications/bulletin-74-changing-nexus-between-commodity-prices-and-dollar-causes-and-implications"
    },
    {
      "id": "fed-identification",
      "title": "Kansas City Fed — Identifier les effets causaux de la politique monétaire",
      "url": "https://www.kansascityfed.org/research/economic-review/estimating-the-effects-of-monetary-policy-an-ongoing-evolution/"
    },
    {
      "id": "fidelity-ta",
      "title": "Fidelity — Analyse technique et limites",
      "url": "https://www.fidelity.com/learning-center/trading-investing/technical-analysis/what-is-technical-analysis"
    },
    {
      "id": "fidelity-rsi",
      "title": "Fidelity — Formule et interprétation du RSI",
      "url": "https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/RSI"
    },
    {
      "id": "fidelity-atr",
      "title": "Fidelity — Average True Range",
      "url": "https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/atr"
    },
    {
      "id": "tv-vwap",
      "title": "TradingView — Calcul et ancrage du VWAP",
      "url": "https://www.tradingview.com/support/solutions/43000502018-volume-weighted-average-price-vwap/"
    },
    {
      "id": "cftc-spoof",
      "title": "CFTC — Distinguer spoofing et annulation légitime",
      "url": "https://www.cftc.gov/LawRegulation/FederalRegister/FinalRules/2013-12365.html"
    },
    {
      "id": "oanda-pip",
      "title": "OANDA — Pip et fraction de pip",
      "url": "https://www.oanda.com/ca-en/skills-and-insights/education/introduction-trading/basics/what-is-a-pip/"
    },
    {
      "id": "cme-pnl",
      "title": "CME Group — Calcul du résultat d’un contrat future",
      "url": "https://www.cmegroup.com/education/courses/introduction-to-futures/calculating-futures-contract-profit-or-loss"
    },
    {
      "id": "cme-roll",
      "title": "CME Group — Échéance et roulement des futures",
      "url": "https://www.cmegroup.com/education/courses/introduction-to-futures/understanding-futures-expiration-contract-roll"
    },
    {
      "id": "oic-greeks",
      "title": "Options Industry Council — Sensibilités des options",
      "url": "https://prd-web.optionseducation.org/advancedconcepts/understanding-options-greeks"
    },
    {
      "id": "cftc-crypto",
      "title": "CFTC — Risques du trading de crypto-actifs",
      "url": "https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/understand_risks_of_virtual_currency.html"
    },
    {
      "id": "coinbase-funding",
      "title": "Coinbase International Exchange — Règles de funding",
      "url": "https://www.coinbase.com/international-exchange/legal/trading-rules"
    },
    {
      "id": "cointegration",
      "title": "NobelPrize.org — Cointégration et séries non stationnaires",
      "url": "https://www.nobelprize.org/prizes/economic-sciences/2003/9216-popular-information-swedish/"
    },
    {
      "id": "bootstrap",
      "title": "Politis & Romano — The Stationary Bootstrap (1994)",
      "url": "https://doi.org/10.1080/01621459.1994.10476870"
    },
    {
      "id": "kelly",
      "title": "Jacot & Mochkovitch — Kelly et Kelly fractionnaire (2023)",
      "url": "https://www.degruyterbrill.com/document/doi/10.1515/jqas-2020-0122"
    },
    {
      "id": "behavior",
      "title": "MoneySense — Biais cognitifs et investissement",
      "url": "https://www.moneysense.gov.sg/investments/behavioural-science-and-investing/"
    },
    {
      "id": "radar-binance",
      "title": "Binance — Documentation des données de marché",
      "url": "https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints"
    },
    {
      "id": "radar-twelve",
      "title": "Twelve Data — Documentation des séries temporelles",
      "url": "https://twelvedata.com/docs"
    },
    {
      "id": "radar-fred",
      "title": "FRED — Sources et séries économiques",
      "url": "https://fred.stlouisfed.org/"
    }
  ],
  "lessons": [
    {
      "id": "market",
      "level": "Débutant",
      "title": "Le marché : prix, liquidité, horizon",
      "summary": "Comprendre ce que l’on échange avant de chercher un signal.",
      "body": [
        "Une action est une part de société ; un indice est une mesure ; un ETF est un fonds coté ; un future, une option ou un CFD est un contrat aux propriétés propres. Un graphique identique ne rend pas ces produits interchangeables.",
        "Le bid est le prix proposé par un acheteur, l’ask celui d’un vendeur. Acheter immédiatement implique généralement de payer l’ask. Le dernier cours affiché peut être différent de votre prix d’exécution.",
        "Distinguez votre horizon d’analyse, votre horizon de détention et les heures réellement négociables du produit. Le choix d’un instrument commence par sa fiche contractuelle."
      ],
      "sourceIds": [
        "sec-execution",
        "amf-cfd"
      ]
    },
    {
      "id": "long-short",
      "level": "Débutant",
      "title": "Long et short : deux expositions asymétriques",
      "summary": "Le sens de la position ne résume pas son risque.",
      "body": [
        "Être long signifie bénéficier d’une hausse ; être short, d’une baisse. Pour une exposition linéaire de q unités, le résultat brut est q × (sortie − entrée) en long et q × (entrée − sortie) en short. Un multiplicateur de contrat peut s’ajouter.",
        "Acheter 10 actions à 100 € puis les revendre 110 € produit 100 € bruts. Les vendre à découvert à 100 € puis les racheter 90 € produit aussi 100 € bruts.",
        "Le long au comptant sans emprunt peut perdre la mise. Le short action peut subir une perte théoriquement illimitée, des frais d’emprunt et des paiements compensant les dividendes. Ces mécanismes ne décrivent pas toutes les options ni tous les dérivés."
      ],
      "sourceIds": [
        "sec-long-short",
        "sec-short"
      ]
    },
    {
      "id": "leverage",
      "level": "Débutant",
      "title": "Levier, marge et liquidation",
      "summary": "La marge déposée n’est pas le montant exposé.",
      "body": [
        "Un dépôt de 1 000 € avec une exposition de 5 000 € représente un levier initial de 5. Un mouvement défavorable de 2 % représente environ 100 € de perte, soit 10 % du dépôt, avant frais, pour une exposition linéaire inchangée.",
        "La liquidation dépend du produit, de la marge de maintenance, des autres positions et des règles du courtier. Elle ne se calcule pas universellement par « 100 / levier ».",
        "Des protections spécifiques, dont le solde négatif, concernent certains CFD destinés aux particuliers dans le cadre européen. Elles ne couvrent pas tous les produits, clients ou prestataires ; vérifiez le contrat et votre statut."
      ],
      "sourceIds": [
        "amf-cfd",
        "esma-2026"
      ]
    },
    {
      "id": "orders",
      "level": "Débutant",
      "title": "Ordres : choisir le compromis",
      "summary": "Maîtriser le prix ou favoriser l’exécution.",
      "body": [
        "Un ordre au marché vise l’exécution au meilleur prix disponible, avec un prix final incertain. Un ordre limite fixe le prix maximal d’achat ou minimal de vente ; il peut rester inexécuté ou n’être exécuté qu’en partie.",
        "Un stop classique devient un ordre au marché après déclenchement : un gap peut produire une perte supérieure au scénario prévu. Un stop-limit contrôle le prix mais peut ne pas sortir la position.",
        "Exercice : une position longue entre à 100, le stop est à 98, le marché rouvre à 94. La perte réalisée n’est pas automatiquement 2 par unité."
      ],
      "sourceIds": [
        "sec-orders",
        "sec-stops"
      ]
    },
    {
      "id": "sizing",
      "level": "Débutant",
      "title": "Dimensionner la position",
      "summary": "Partir du risque accepté, puis calculer la quantité.",
      "body": [
        "Exemple pédagogique : capital 10 000 €, budget de perte planifié 0,5 %, entrée 100 €, stop 98 €. Sans frais, quantité théorique = 50 / 2 = 25 unités. Le taux de 0,5 % illustre un calcul, pas un niveau recommandé.",
        "Ajoutez les frais et une hypothèse de glissement, arrondissez au lot autorisé, puis vérifiez exposition, marge et risque cumulé. La formule suppose un produit linéaire et une valeur du point connue.",
        "Le risque planifié n’est pas une garantie de perte maximale. Un gap, une panne ou une exécution partielle peuvent le dépasser."
      ],
      "sourceIds": [
        "sec-stops"
      ]
    },
    {
      "id": "expectancy",
      "level": "Intermédiaire",
      "title": "Espérance : dépasser le taux de réussite",
      "summary": "Avoir souvent raison ne suffit pas.",
      "body": [
        "Avec une probabilité de gain p, un gain moyen G, une perte moyenne L et un coût moyen C, l’espérance par opération est E = pG − (1 − p)L − C. Il s’agit d’une estimation, soumise à l’incertitude de l’échantillon.",
        "Exemple : 40 % de gains à 2R et 60 % de pertes à 1R donnent +0,20R avant coûts ; 0,25R de coûts rendent le résultat négatif. R représente le risque initial planifié.",
        "Un résultat moyen masque les queues de distribution, les séries de pertes et les changements de régime. Comparez des intervalles d’incertitude, pas seulement un chiffre."
      ],
      "sourceIds": []
    },
    {
      "id": "costs",
      "level": "Intermédiaire",
      "title": "L’avantage doit survivre aux coûts",
      "summary": "Le résultat brut n’est pas le résultat économique.",
      "body": [
        "Comptabilisez commissions, spread, glissement, financement, emprunt de titres et éventuels coûts de change. La fiscalité dépend du pays et de la situation ; elle n’est pas simulée ici.",
        "Évitez le double comptage : si les achats et ventes sont déjà valorisés à l’ask et au bid, le spread est déjà incorporé. Le glissement doit être mesuré par rapport à un prix de référence explicite.",
        "Un signal rapide peut échouer après frais. Faites varier les coûts et la taille : la liquidité disponible peut se dégrader quand la quantité augmente."
      ],
      "sourceIds": [
        "sec-execution"
      ]
    },
    {
      "id": "portfolio",
      "level": "Intermédiaire",
      "title": "Risque de portefeuille et drawdown",
      "summary": "Plusieurs positions peuvent cacher le même pari.",
      "body": [
        "Diversifier les noms ne suffit pas si leurs expositions économiques se ressemblent. Plusieurs actions technologiques, un indice et une position de change peuvent partager une sensibilité au même scénario.",
        "Le drawdown mesure le recul depuis un précédent sommet de valeur du portefeuille. Une baisse de 20 % exige ensuite +25 % pour retrouver ce sommet : 0,8 × 1,25 = 1.",
        "Surveillez l’exposition brute, nette et les facteurs communs. Une exposition nette faible n’implique pas un risque faible, surtout avec deux jambes importantes et une relation instable."
      ],
      "sourceIds": [
        "sec-diversification"
      ]
    },
    {
      "id": "backtest",
      "level": "Intermédiaire",
      "title": "Un backtest reproductible",
      "summary": "Une expérience historique doit pouvoir être refaite.",
      "body": [
        "Définissez avant le test l’univers, les dates, le signal, le prix d’exécution, les coûts, la taille et la règle de sortie. Un signal calculé à la clôture ne doit pas être exécuté rétroactivement à un prix déjà connu sans justification.",
        "Conservez les titres disparus pour éviter le biais de survivance. Traitez opérations sur titres, données manquantes, fuseaux horaires et disponibilité réelle des informations.",
        "Séparez chronologiquement développement et évaluation. Comparez à une référence adaptée. Les données synthétiques de démonstration enseignent la mécanique ; elles ne prouvent aucun avantage sur un marché réel."
      ],
      "sourceIds": [
        "overfit"
      ]
    },
    {
      "id": "overfitting",
      "level": "Professionnel",
      "title": "Surapprentissage et tests multiples",
      "summary": "Le meilleur résultat testé peut être le plus chanceux.",
      "body": [
        "Tester beaucoup de variantes puis ne montrer que la meilleure sélectionne aussi le bruit. Conservez un registre des essais, y compris les échecs, et un jeu final jamais utilisé pour choisir les paramètres.",
        "Cherchez une zone de paramètres raisonnablement stable plutôt qu’un pic isolé. Examinez plusieurs périodes, actifs et niveaux de coûts. Un walk-forward réduit certaines fuites ; il ne supprime pas la sélection répétée.",
        "La recherche de Bailey et coauteurs formalise ce risque. Un score élevé en échantillon n’est donc pas une preuve suffisante de performance future."
      ],
      "sourceIds": [
        "overfit"
      ]
    },
    {
      "id": "process",
      "level": "Tous niveaux",
      "title": "Journal, discipline et droit de ne pas trader",
      "summary": "Évaluer une décision séparément de son résultat.",
      "body": [
        "Avant une opération, écrivez hypothèse, invalidation, horizon, quantité, exposition et coût prévu. Après, enregistrez ce qui s’est effectivement passé, sans réécrire la thèse pour justifier le résultat.",
        "Une opération rentable peut avoir violé toutes les règles ; une perte peut provenir d’une décision cohérente. Évaluez séparément processus, exécution et performance.",
        "Définissez à l’avance une condition d’arrêt : incident de données, exposition excessive ou comportement impulsif. Dans les défis, la bonne réponse peut être « pas de position »."
      ],
      "sourceIds": []
    },
    {
      "id": "protection",
      "level": "Débutant",
      "title": "Vérifier le prestataire et le cadre",
      "summary": "Un beau tableau de bord n’est pas une preuve d’agrément.",
      "body": [
        "Consultez les registres officiels et comparez exactement raison sociale, domaine et coordonnées. L’absence d’un nom sur une liste noire ne prouve pas son autorisation ; des fraudeurs usurpent des sociétés réelles.",
        "Méfiez-vous des rendements garantis, des pressions pour déposer davantage et des conditions de retrait opaques. Comprendre le produit et le statut du prestataire fait partie du travail.",
        "Ce site est éducatif : ni conseil personnalisé, ni signal, ni recommandation d’investissement. Le capital est exposé à des pertes. Les résultats historiques ou simulés ne garantissent rien pour l’avenir."
      ],
      "sourceIds": [
        "abe"
      ]
    },
    {
      "id": "macro",
      "level": "Débutant",
      "title": "Macro : croissance, emploi, inflation",
      "summary": "Lire une publication sans confondre niveau, variation et surprise.",
      "body": [
        "L’inflation mesure une variation de prix. Une inflation qui ralentit ne signifie pas nécessairement que les prix baissent. Distinguez variation mensuelle, glissement annuel et séries corrigées des variations saisonnières.",
        "Le PIB mesure la production ; le PIB réel vise à retirer l’effet des prix. Les premières estimations peuvent être révisées : un backtest macro doit utiliser la version disponible à la date de décision.",
        "Pour chaque annonce, notez unité, période, heure, consensus, valeur publiée et révisions. Une croissance trimestrielle annualisée américaine n’est pas directement comparable à une croissance trimestrielle non annualisée."
      ],
      "sourceIds": [
        "bls-cpi",
        "bea-gdp"
      ]
    },
    {
      "id": "central-banks",
      "level": "Intermédiaire",
      "title": "Banques centrales : suivre la transmission",
      "summary": "Les taux influencent l’économie par plusieurs canaux.",
      "body": [
        "Le taux directeur affecte le marché monétaire puis, de façon imparfaite, les crédits et dépôts. Le financement, les anticipations, les prix d’actifs et le change influencent ensuite demande et inflation.",
        "Ces effets arrivent avec des délais variables. Une banque centrale ne pilote pas mécaniquement chaque taux obligataire ni chaque cours de Bourse.",
        "Pour construire un scénario, distinguez décision du jour, trajectoire future attendue et informations sur l’économie. Documentez la chaîne supposée, puis ce qui pourrait la contredire."
      ],
      "sourceIds": [
        "ecb-transmission"
      ]
    },
    {
      "id": "surprises",
      "level": "Intermédiaire",
      "title": "Le marché réagit à l’écart aux attentes",
      "summary": "Une bonne nouvelle économique peut faire baisser un actif.",
      "body": [
        "Une hausse de taux déjà anticipée peut produire moins de mouvement qu’un maintien inattendu. La surprise porte aussi sur le communiqué, les projections et la trajectoire future.",
        "Une annonce peut révéler simultanément un changement de politique et des informations sur la croissance. Leurs effets peuvent s’opposer : « taux en hausse = actions en baisse » n’est pas une règle universelle.",
        "Exercice : inflation supérieure au consensus, mais révision du mois précédent en baisse. Formulez deux scénarios, observez taux et change, puis définissez une invalidation. N’inventez pas une explication certaine après le mouvement."
      ],
      "sourceIds": [
        "fed-surprises",
        "fed-identification"
      ]
    },
    {
      "id": "yield-curve",
      "level": "Intermédiaire",
      "title": "Courbe des taux : prix, rendement, primes",
      "summary": "Une courbe n’est pas une prévision pure.",
      "body": [
        "La courbe relie échéances et rendements. Pour une obligation à flux fixes, une hausse du rendement exigé réduit généralement son prix ; la sensibilité dépend notamment de sa durée et de ses flux.",
        "Un taux long reflète les anticipations de taux courts et des primes, notamment de terme. Les écarts nominal/réel peuvent renseigner sur la compensation d’inflation, avec des composantes de risque et de liquidité.",
        "Étudiez séparément mouvement de niveau, pentification et aplatissement. Une inversion seule ne donne ni date certaine de récession ni ordre de trading."
      ],
      "sourceIds": [
        "fed-curve"
      ]
    },
    {
      "id": "intermarket",
      "level": "Professionnel",
      "title": "Intermarchés : liens conditionnels",
      "summary": "Dollar, matières premières, actions et taux changent de relation.",
      "body": [
        "Une matière première cotée en dollars et le dollar peuvent évoluer en sens opposés, mais ce lien peut changer. La BRI documente des périodes où ils montent ensemble, sous l’effet des chocs et des structures économiques.",
        "Le change est un prix relatif : comparez deux économies, leurs anticipations de taux et leurs primes de risque. Le pétrole dépend aussi de l’offre ; l’or ne répond pas uniquement à l’inflation.",
        "Construisez plusieurs scénarios de régime : croissance, inflation, stress de liquidité. Une flèche sur une carte macro représente une hypothèse conditionnelle, jamais une causalité automatique."
      ],
      "sourceIds": [
        "bis-correlation",
        "ecb-transmission"
      ]
    },
    {
      "id": "causality",
      "level": "Professionnel",
      "title": "Corrélation, causalité et variables cachées",
      "summary": "Deux séries qui bougent ensemble ne prouvent pas un mécanisme.",
      "body": [
        "Corrélation : association statistique. Causalité : effet d’une intervention, toutes choses pertinentes prises en compte. Un facteur commun peut faire bouger deux actifs ; la causalité peut aussi aller dans les deux sens.",
        "Une avance temporelle ou un test de Granger indique au mieux une capacité prédictive conditionnelle dans un modèle, pas une cause structurelle. Il faut examiner événements simultanés, anticipation, sélection et stabilité.",
        "Préférez des rendements synchronisés aux niveaux de prix pour une corrélation exploratoire. Examinez plusieurs fenêtres glissantes, les observations extrêmes et les retards. Une corrélation estimée peut être bruitée et changer de signe."
      ],
      "sourceIds": [
        "fed-identification",
        "bis-correlation"
      ]
    },
    {
      "id": "top-down",
      "level": "Tous niveaux",
      "title": "Top-down : du contexte W1 à l’exécution M1",
      "summary": "Attribuer une fonction à chaque horizon.",
      "body": [
        "Protocole pédagogique : W1 (semaine) et D1 (jour) pour le contexte et les zones ; H4/H1 pour le scénario ; M15/M5 pour une configuration ; M1 (une minute) pour examiner l’exécution. Cette organisation n’est pas une preuve d’avantage statistique.",
        "Consignez direction, invalidation et horizon à chaque étage. Un signal M1 opposé au scénario D1 peut être du bruit ou une opération différente : ne changez pas d’horizon après une perte pour sauver la thèse.",
        "Les horizons sont imbriqués, pas indépendants : cinq confirmations du même mouvement ne sont pas cinq preuves. Fixez le rôle des conflits avant le test. « Attendre » reste une décision valide."
      ],
      "sourceIds": []
    },
    {
      "id": "m1",
      "level": "Professionnel",
      "title": "M1 : microstructure et faux sentiment de précision",
      "summary": "Plus de bougies ne signifie pas plus d’information exploitable.",
      "body": [
        "Une bougie d’une minute résume les transactions ; elle ne décrit ni le carnet complet ni l’ordre exact des prix à l’intérieur de la minute. Un spread ou un changement de liquidité peut dominer un petit objectif.",
        "Si stop et cible sont touchés dans la même bougie, l’ordre réel est inconnu avec les seules données OHLC. Utilisez une convention prudente explicite ou des données plus fines, jamais l’issue la plus favorable par défaut.",
        "Pour tester W1→M1, n’utilisez que les bougies supérieures déjà clôturées à chaque instant. Mesurez délais, coûts et remplissages manqués. Les données de démonstration ne simulent pas une exécution réelle."
      ],
      "sourceIds": [
        "sec-orders",
        "sec-execution"
      ]
    },
    {
      "id": "technical-structure",
      "level": "Débutant",
      "title": "Structure, tendance et zones de prix",
      "summary": "Décrire ce qui est visible sans inventer une certitude.",
      "body": [
        "Une tendance peut être décrite par une succession de sommets et creux croissants ou décroissants ; un range par une oscillation dans une zone. Le résultat dépend de l’horizon et de la règle choisie pour identifier les pivots.",
        "Supports et résistances sont des zones d’observation, pas des murs. Fixez leur définition avant de regarder la suite : prix, largeur, nombre de contacts et condition d’invalidation.",
        "Une cassure ou un chandelier ne prouve ni manipulation ni avantage rentable. Les pivots confirmés plusieurs bougies après leur apparition ne doivent devenir exploitables qu’au moment de leur confirmation."
      ],
      "sourceIds": [
        "fidelity-ta"
      ]
    },
    {
      "id": "moving-average-rsi",
      "level": "Intermédiaire",
      "title": "Moyennes mobiles et RSI : calculs, pas oracles",
      "summary": "Connaître la transformation appliquée aux prix.",
      "body": [
        "SMA sur n clôtures = leur somme divisée par n. Une EMA courante suit EMAₜ = αCₜ + (1−α)EMAₜ₋₁, avec α = 2/(n+1) ; l’initialisation doit être documentée. Le lissage retarde les retournements et peut multiplier les faux signaux en range.",
        "RSI = 100 − 100/(1+RS), où RS compare gains moyens et pertes moyennes positives. La version de Wilder utilise un lissage de coefficient 1/n après initialisation ; précisez le traitement des séries sans perte ou sans variation.",
        "« Suracheté » ne signifie pas « doit baisser ». En tendance forte, un RSI peut rester extrême. Des indicateurs issus des mêmes prix ne constituent pas des confirmations indépendantes."
      ],
      "sourceIds": [
        "fidelity-ta",
        "fidelity-rsi"
      ]
    },
    {
      "id": "atr-vwap",
      "level": "Intermédiaire",
      "title": "ATR et VWAP : amplitude et prix moyen",
      "summary": "Deux mesures qui répondent à des questions différentes.",
      "body": [
        "True Range = max(H−L, |H−C précédent|, |L−C précédent|). L’ATR de Wilder lisse cette amplitude : ATRₜ = ((n−1)ATRₜ₋₁ + TRₜ)/n après initialisation. Il mesure une amplitude, pas une direction ni une perte maximale.",
        "VWAP = somme(prix × volume) / somme(volume) depuis un ancrage défini. À partir de bougies, un prix typique (H+L+C)/3 fournit une approximation du calcul transaction par transaction.",
        "Un stop en multiple d’ATR et un retour au VWAP sont des hypothèses à tester. Spécifiez session, fuseau, ancrage et type de volume ; un flux partiel ne représente pas nécessairement tout le marché."
      ],
      "sourceIds": [
        "fidelity-atr",
        "tv-vwap"
      ]
    },
    {
      "id": "order-flow",
      "level": "Professionnel",
      "title": "Volume, carnet et order flow",
      "summary": "Ne pas confondre liquidité affichée et engagement définitif.",
      "body": [
        "Le volume mesure les échanges réalisés ; le carnet expose des ordres en attente sur un lieu donné. Chaque transaction a un acheteur et un vendeur : un volume « acheteur » désigne généralement une classification du côté agressif, pas l’absence de vendeur.",
        "Les ordres peuvent être déplacés ou annulés légitimement ; des quantités peuvent rester cachées. Un gros ordre affiché n’est donc pas une garantie de soutien.",
        "Le spoofing implique une intention de tromper par des ordres destinés à être annulés. Une capture du carnet ou une simple annulation ne démontre pas cette intention. Sans données complètes, évitez les récits certains sur les institutions."
      ],
      "sourceIds": [
        "cftc-spoof"
      ]
    },
    {
      "id": "forex-units",
      "level": "Intermédiaire",
      "title": "Forex : base, cotation, pip et conversion",
      "summary": "Toujours exprimer le résultat dans la bonne devise.",
      "body": [
        "EUR/USD exprime des dollars par euro. Acheter la paire expose positivement à l’euro et négativement au dollar. Pour une position linéaire de q euros, le résultat brut en dollars est q × variation du taux.",
        "Sur EUR/USD, un pip usuel vaut 0,0001 : 10 000 unités représentent 1 USD par pip. Pour de nombreuses paires en yen, le pip usuel vaut 0,01 ; vérifiez toujours la convention du contrat.",
        "La valeur du pip en devise de compte peut varier avec le taux de conversion. Cumulez les expositions par devise : plusieurs paires peuvent concentrer le même pari dollar. Intégrez financement et spread."
      ],
      "sourceIds": [
        "oanda-pip"
      ]
    },
    {
      "id": "futures-contracts",
      "level": "Intermédiaire",
      "title": "Futures : tick, multiplicateur et échéance",
      "summary": "Un mouvement d’un point ne vaut pas la même somme partout.",
      "body": [
        "Pour un future linéaire, valeur d’un tick = taille du tick × multiplicateur. Exemple fictif : tick de 0,25 point et multiplicateur de 20 € par point donnent 5 € par tick ; 3 contrats déplacés de 8 ticks donnent 120 € bruts dans le bon sens.",
        "Le dépôt de marge n’est pas la valeur notionnelle du contrat. Vérifiez devise, horaires, limites de prix, dates de négociation et modalités de règlement ou de livraison.",
        "Rouler consiste à fermer une échéance et ouvrir une autre : spreads et coûts changent. Un historique continu ajusté est utile pour l’analyse mais ne correspond pas toujours à des prix réellement négociables."
      ],
      "sourceIds": [
        "cme-pnl",
        "cme-roll"
      ]
    },
    {
      "id": "options-greeks",
      "level": "Professionnel",
      "title": "Options : direction, convexité et volatilité",
      "summary": "Avoir raison sur le sous-jacent ne garantit pas un gain.",
      "body": [
        "Un call donne un droit d’achat et un put un droit de vente, selon strike, échéance et conditions contractuelles. Pour un achat simple payé intégralement, la perte de l’option est la prime et les frais ; son exercice peut créer une nouvelle exposition. Certaines ventes non couvertes ont un risque très élevé, voire illimité pour le call.",
        "Delta décrit une sensibilité locale au sous-jacent ; gamma, sa variation ; theta, le passage du temps ; vega, la volatilité implicite. Ces approximations dépendent du modèle et changent avec les conditions.",
        "La volatilité réalisée est calculée sur un passé choisi. L’implicite est déduite des prix d’options via un modèle, pas une prédiction certaine. Comprenez exercice, assignation et multiplicateur avant une simulation."
      ],
      "sourceIds": [
        "oic-greeks"
      ]
    },
    {
      "id": "crypto-perpetual",
      "level": "Intermédiaire",
      "title": "Crypto : spot, perpétuels et risque de plateforme",
      "summary": "Le funding n’est pas un rendement garanti.",
      "body": [
        "Au comptant, l’exposition porte sur l’actif ; un perpétuel est un dérivé dont les règles de marge, liquidation et référence de prix dépendent de la plateforme. La conservation des actifs ajoute un risque de perte de clés ou de défaillance d’intermédiaire.",
        "Dans le modèle fréquent où un funding positif est payé par les longs aux shorts, le montant dépend du taux et du notionnel à l’instant pertinent. Exemple : 2 000 € × 0,01 % = 0,20 € pour une période, sans supposer que ce taux persistera.",
        "Lire fréquence, indice, mark price, collatéral et clauses de liquidation. Une couverture spot/short perpétuel reste exposée à base, financement, décorrélation du collatéral, retrait impossible et contrepartie."
      ],
      "sourceIds": [
        "coinbase-funding",
        "cftc-crypto"
      ]
    },
    {
      "id": "stationarity",
      "level": "Professionnel",
      "title": "Stationnarité et cointégration",
      "summary": "Une relation statistique doit être définie et éprouvée.",
      "body": [
        "Dans une formulation faible, une série stationnaire conserve moyenne, variance et covariances selon le décalage temporel. De nombreuses séries de prix ne respectent pas cette hypothèse ; une régression sur leurs niveaux peut sembler convaincante sans relation exploitable.",
        "La cointégration concerne des séries non stationnaires dont une combinaison est stationnaire sous les hypothèses du modèle. Une forte corrélation des rendements n’établit pas cette propriété.",
        "Un test statistique ne garantit pas une convergence rentable ni sa vitesse. Fixez fenêtre, retards et méthode avant sélection ; examinez ruptures structurelles, coûts et stabilité du coefficient de couverture hors échantillon."
      ],
      "sourceIds": [
        "cointegration"
      ]
    },
    {
      "id": "monte-carlo",
      "level": "Professionnel",
      "title": "Monte Carlo : explorer les chemins de pertes",
      "summary": "Une distribution simulée dépend du monde que l’on suppose.",
      "body": [
        "Monte Carlo génère des trajectoires à partir d’un modèle ; un bootstrap rééchantillonne les données observées. Comparez drawdown, séries de pertes, capital final et fréquence de franchissement d’un seuil de risque explicitement défini.",
        "Tirer chaque rendement indépendamment détruit sa dépendance temporelle. Des blocs de rendements peuvent en préserver une partie ; leur longueur et l’hypothèse de stationnarité changent les conclusions.",
        "Une simulation ne crée pas des crises absentes des données. Ajoutez des scénarios de gap, de coûts et de liquidité dégradée. Un percentile à 95 % n’est ni une perte maximale ni une certitude sur le futur."
      ],
      "sourceIds": [
        "bootstrap"
      ]
    },
    {
      "id": "kelly-risk",
      "level": "Professionnel",
      "title": "Kelly, risque d’estimation et survie",
      "summary": "Une taille optimale dans un modèle peut être excessive en pratique.",
      "body": [
        "Dans un pari binaire répété où une mise perdante est perdue intégralement et une mise gagnante rapporte b fois la mise en gain net, Kelly donne f* = p − (1−p)/b. Il maximise la croissance logarithmique sous des hypothèses précises ; f* est une fraction de capital misée.",
        "Ce raccourci ne s’applique pas directement à une stratégie aux pertes variables, aux gaps ou à des positions corrélées. Estimer p et b avec peu d’opérations peut conduire à une taille très excessive.",
        "Un Kelly fractionnaire réduit l’exposition du modèle, sans rendre ses hypothèses vraies. Testez estimation pessimiste, coûts, séquences défavorables et contraintes de marge. La survie opérationnelle et le capital disponible restent des contraintes distinctes."
      ],
      "sourceIds": [
        "kelly"
      ]
    },
    {
      "id": "psychology",
      "level": "Tous niveaux",
      "title": "Biais : transformer une intuition en protocole",
      "summary": "La discipline ne remplace pas un avantage, mais protège l’expérience.",
      "body": [
        "Biais de confirmation : ne chercher que ce qui soutient la thèse. Ancrage : traiter son prix d’entrée comme une valeur objective. Excès de confiance : attribuer les gains au talent et les pertes au hasard. Ces pièges touchent aussi les professionnels.",
        "Écrivez une observation qui vous ferait changer d’avis, puis une règle « si… alors… ». Comparez votre journal aux règles initiales ; ne jugez pas une méthode sur la dernière opération.",
        "Après une perte, vouloir se refaire n’améliore pas les probabilités. Prévoyez une pause et un contrôle d’exposition. Les défis récompensent un raisonnement vérifiable, y compris le choix de ne pas ouvrir de position."
      ],
      "sourceIds": [
        "behavior"
      ]
    },
    {
      "id": "monthly-first",
      "level": "Tous niveaux",
      "title": "Du mensuel à M1 : préserver la thèse",
      "summary": "Un scénario de plusieurs mois et un déclencheur minute ne répondent pas à la même question.",
      "body": [
        "Commencez par MN : environnement économique, valorisations, financement et grandes zones. W décrit la structure et D le scénario tactique ; H4/H1 suivent son évolution ; M15/M5 organisent une configuration ; M1 examine une exécution.",
        "Avant de descendre, notez ce que vous attendez, les observations qui vous feraient changer d’avis et l’horizon de cette attente. Une baisse M1 ne réfute pas automatiquement une hypothèse mensuelle. Réciproquement, un scénario mensuel ne justifie pas de conserver une position minute qui a franchi son invalidation.",
        "Une seule baisse peut apparaître dans les huit horizons. Compter huit confirmations surestime alors l’information. Le radar décrit cet alignement ; il ne le convertit pas en huit preuves indépendantes."
      ],
      "sourceIds": [
        "ecb-transmission",
        "overfit"
      ]
    },
    {
      "id": "radar-scores",
      "level": "Intermédiaire",
      "title": "Score, fréquence et probabilité : trois objets distincts",
      "summary": "Un 80/100 ne signifie pas 80 % de chance de baisse.",
      "body": [
        "Un score additionne des conditions selon des poids choisis. Il devient une probabilité seulement après une procédure de calibration évaluée sur des observations nouvelles. Des conditions issues du même prix sont souvent fortement dépendantes.",
        "La précision descriptive d’une alerte est la fraction des alertes suivies de l’événement défini. Comparez-la à la fréquence naturelle du même événement sur les mêmes dates. Si l’événement est fréquent même sans alerte, un taux de réussite élevé peut avoir peu de valeur.",
        "Fixez sens, amplitude et horizon avant le test. Un signal peut annoncer davantage d’amplitude sans prédire sa direction. Examiner plusieurs paramètres puis conserver le meilleur résultat réutilise l’échantillon et exige une nouvelle validation."
      ],
      "sourceIds": [
        "overfit"
      ]
    },
    {
      "id": "market-data-personal",
      "level": "Tous niveaux",
      "title": "Choisir et auditer ses données",
      "summary": "La précision d’un calcul ne compense pas un mauvais historique.",
      "body": [
        "Vérifiez instrument exact, lieu de cotation, devise, fuseau et date de fin de la bougie. SPY est un ETF qui suit le S&P 500 : ses horaires, frais et prix ne sont pas ceux de l’indice. BTC/USDT sur une plateforme n’est pas un prix universel du Bitcoin en dollars.",
        "Sur actions, documentez splits, dividendes, radiations et ajustements. Pour M1, vérifiez les trous de séance, retards de diffusion et types de prix. Une API accessible ne garantit ni un droit temps réel ni un historique complet.",
        "Une donnée journalière publiée avec délai peut éclairer le contexte macro. Elle ne devient pas une donnée minute parce que le site la télécharge chaque minute. Conservez la date de l’observation et celle de son acquisition."
      ],
      "sourceIds": [
        "radar-binance",
        "radar-twelve",
        "radar-fred"
      ]
    },
    {
      "id": "personal-forecast-journal",
      "level": "Professionnel",
      "title": "Évaluer ses anticipations sans réécrire le passé",
      "summary": "Figer les hypothèses puis observer les résultats.",
      "body": [
        "Enregistrez date, source, mesure, horizon, événement attendu et condition d’invalidation avant le résultat. Un commentaire vague comme « le marché pourrait bouger » ne permet pas d’évaluer une compétence prédictive.",
        "Le journal du radar fige vos notes et mesures. Lorsqu’un même flux fournit cinq nouvelles bougies clôturées, il mesure le rendement observé et si la clôture a baissé d’au moins deux ATR initiaux. Ce diagnostic ne juge pas automatiquement le scénario libre que vous avez écrit.",
        "Séparez qualité de la prévision et résultat d’une stratégie. Même une prévision utile peut produire une perte après frais, gap ou mauvaise taille. Comparez les résultats par régime et par horizon ; le but est d’apprendre où votre méthode échoue autant que là où elle fonctionne."
      ],
      "sourceIds": [
        "overfit"
      ]
    }
  ],
  "strategies": [
    {
      "title": "Suivi de tendance",
      "level": "Intermédiaire",
      "idea": "Hypothèse documentée : certains mouvements persistent. Les études historiques multi-actifs ne valident pas automatiquement un indicateur particulier.",
      "rules": "Exemple de recherche : signal calculé en clôture, long si moyenne rapide > lente, short dans le cas inverse ; exécution à la séance suivante et exposition plafonnée.",
      "failure": "Marchés sans direction, retournements rapides, coûts de rotation et concentration de risque.",
      "validation": "Évaluer séparément long/short, périodes et coûts ; comparer à une exposition passive. Le short requiert un instrument et un emprunt disponibles.",
      "sourceIds": [
        "momentum",
        "sec-short"
      ]
    },
    {
      "title": "Cassure avec filtre de régime",
      "level": "Intermédiaire",
      "idea": "Variante expérimentale de suivi de tendance, pas une anomalie prouvée pour ces paramètres.",
      "rules": "Définir à l’avance le plus haut/bas des N barres passées, hors barre courante ; tester une entrée après cassure confirmée et une sortie prédéfinie.",
      "failure": "Fausses cassures, gap d’entrée, liquidité faible et multiplication de petites pertes.",
      "validation": "Tester des fenêtres voisines et le prix réellement accessible après signal. Rejeter les règles qui ne résistent qu’à un seul réglage.",
      "sourceIds": [
        "momentum",
        "sec-orders"
      ]
    },
    {
      "title": "Retour à la moyenne",
      "level": "Intermédiaire",
      "idea": "Des déplacements temporaires liés à la liquidité peuvent s’inverser. Un actif n’est pas obligé de revenir à son ancien prix.",
      "rules": "Exemple : écart standardisé à une moyenne passée, entrée au-delà d’un seuil préétabli, sortie au retour ou à une durée maximale ; taille bornée.",
      "failure": "Nouvelle information durable, tendance forte, séries corrélées et coûts élevés. Renforcer sans limite peut provoquer une ruine.",
      "validation": "Tester le filtre de régime hors échantillon ; distinguer vraies transactions et rebonds artificiels entre bid et ask.",
      "sourceIds": [
        "reversal"
      ]
    },
    {
      "title": "Paires et valeur relative",
      "level": "Professionnel",
      "idea": "Acheter le membre relativement faible et vendre le fort d’une paire économiquement liée ; la convergence reste incertaine.",
      "rules": "Séparer formation et négociation. Estimer la couverture sur le passé, plafonner chaque jambe et fixer durée maximale et seuil de rupture.",
      "failure": "Relation économique rompue, faux lien statistique, emprunt indisponible et exécution d’une seule jambe. Corrélation ne signifie pas cointégration.",
      "validation": "Inclure titres disparus, coûts d’emprunt, dividendes et variation de la couverture. Examiner le risque brut et les pertes lors de divergences persistantes.",
      "sourceIds": [
        "pairs"
      ]
    },
    {
      "title": "Carry et base spot–future",
      "level": "Professionnel",
      "idea": "Le carry est le rendement associé au portage sous hypothèses de prix et conditions inchangés ; une prime apparente rémunère souvent un risque.",
      "rules": "Pour un future indiciel, décomposer prix spot, financement, dividendes et échéance. Comparer le différentiel au coût complet des deux jambes.",
      "failure": "Appels de marge, financement variable, dividendes différents des attentes, contraintes de livraison et rupture de liquidité. Le funding d’un perpétuel n’est pas un taux garanti.",
      "validation": "Simuler le chemin de trésorerie, pas seulement le profit final ; tester chocs de base et financement. Réserver ces modèles à l’étude avant toute exécution.",
      "sourceIds": [
        "carry",
        "cme-basis"
      ]
    },
    {
      "title": "Réduire le coût d’exécution",
      "level": "Professionnel",
      "idea": "Une meilleure exécution peut préserver un avantage existant ; elle ne crée pas nécessairement une direction prédictive.",
      "rules": "Comparer, sur une même intention d’ordre, exécution immédiate et limites avec délai maximum. Mesurer exécutions partielles et prix manqués.",
      "failure": "Sélection adverse : être exécuté juste avant un mouvement défavorable ; manquer les meilleurs départs ; surestimer la liquidité.",
      "validation": "Mesurer l’écart entre prix de décision et prix exécuté, y compris les ordres jamais remplis. Les seules clôtures OHLC ne permettent pas de reconstruire une file d’attente.",
      "sourceIds": [
        "sec-execution",
        "reversal"
      ]
    }
  ],
  "disclaimers": {
    "global": "Contenu éducatif et simulations hypothétiques. Aucun conseil personnalisé, signal d’achat/vente ou rendement promis. Toute stratégie peut perdre ; les performances passées ou simulées ne préjugent pas des résultats futurs.",
    "simulation": "Données synthétiques de démonstration sauf mention explicite d’un fichier importé. Résultats dépendants des hypothèses de coûts et d’exécution. Fiscalité, profondeur du carnet, financement et contraintes d’emprunt ne sont pas nécessairement modélisés.",
    "professional": "Les protocoles de recherche proposés sont des hypothèses. Les références académiques documentent des résultats dans des univers et périodes particuliers ; elles ne certifient ni ces paramètres ni leur rentabilité actuelle.",
    "risk": "Risque de perte en capital. Le levier amplifie gains et pertes ; la vente à découvert d’actions peut produire une perte théoriquement illimitée. Les protections dépendent du produit, de la juridiction, du statut client et du prestataire.",
    "scope": "Parcours couvrant les fondamentaux et plusieurs méthodes avancées, sans prétendre être exhaustif ou exempt de toute erreur. Sources consultées le 24 octobre 2026."
  }
};