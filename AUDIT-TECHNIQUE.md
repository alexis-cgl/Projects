# Audit technique de production — Projects

**Date :** 5 novembre 2026  
**Périmètre :** dépôt `alexis-cgl/Projects`, branche d'audit `audit/production-hardening-2026-11`.  
**Hors périmètre :** dépôt `alexis-cgl/alexis-coniglio` (Portfolio), non modifié.  
**Méthode :** inventaire Git récursif, revue du code source propriétaire et des ressources, vérification des licences des dépendances distribuées, tests statiques et tests Chrome/Playwright. Les fichiers minifiés tiers sont identifiés par version et provenance, sans prétendre avoir audité leur implémentation interne ligne à ligne.

## 1. Synthèse

Projects est un site **statique**, constitué de deux pages HTML et de trois scripts applicatifs en JavaScript natif. Il utilise GSAP et ScrollTrigger 3.13.0, et un tore simulé en **Canvas 2D** : il ne contient aucun composant React, hook React, TypeScript, shader, Three.js, React Three Fiber ni Framer Motion. Une migration vers ces technologies augmenterait la complexité sans bénéfice démontré.

**Position :** la base fonctionnelle est cohérente et légère. Les faiblesses principales concernaient la gestion du document RackFlow préchargé, les invalidations inutiles du rendu Canvas/GSAP, le focus clavier et un véritable overflow à 320 px. La défaillance GitHub Pages constatée précédemment est distincte : le build a réussi, mais le service de publication est resté à l'état « updating_pages » jusqu'au timeout de dix minutes.

La qualité « production » ne peut pas être garantie par une revue de code seule. Les tests automatisés exécutés sur Chrome doivent passer sur le dernier commit et un déploiement GitHub Pages doit réussir ; des validations réelles Safari/Firefox, un audit WCAG et une mesure de performances sur téléphone restent nécessaires.

## 2. Inventaire exhaustif des fichiers

| Chemin | Rôle | Résultat de la revue |
| --- | --- | --- |
| index.html | Page d'accueil / cartes du carrousel | Conservée ; métadonnées SEO complétées |
| rackflow.html | Fiche projet et démonstration | Conservée ; landmarks accessibles et SEO |
| assets/js/portal.js | Tore Canvas, GSAP ScrollTrigger, carrousel | Optimisé : densité mobile, travail au repos |
| assets/js/premium.js | Tilt, état visuel, navigation réversible, iframe | Renforcé : cycle de vie, focus, métadonnées, BFCache |
| assets/js/rackflow.js | Simulateur, câbles, inspecteur, parcours | Renforcé : activation/hibernation, focus, redessins |
| assets/css/styles.css | Design global, Hero, cartes, responsive | Reformatté ; anciennes règles inutilisées supprimées |
| assets/css/rackflow.css | Layout RackFlow et démonstration | Reformatté ; halo responsable d'overflow corrigé |
| assets/css/world-nav.css | Surface de caméra unique | Conservé : utilisé par la navigation actuelle |
| assets/img/favicon.svg | Icône | Conservée : référencée par les deux pages |
| assets/vendor/gsap.min.js | GSAP 3.13.0 | Conservé, dépendance tierce avec en-tête de licence |
| assets/vendor/ScrollTrigger.min.js | ScrollTrigger 3.13.0 | Conservé, dépendance tierce avec en-tête de licence |
| assets/vendor/README.md | Sources et licence GSAP | Conservé |
| docs/banner.svg | Ancienne bannière du dépôt | Supprimée : non référencée par les pages ni le README |
| README.md | Documentation utilisateur et architecture | À jour avec l'audit et les tests |
| .github/workflows/navigation-smoke.yml | CI automatisée | Étendue aux tests structurels et UX |
| tests/navigation-smoke.cjs | 20 allers-retours RackFlow | Conservé et exécuté |
| tests/static-audit.cjs | Syntaxe, liens, HTML, CSS et ressources | Nouveau test |
| tests/quality-regression.cjs | UI, iframe, clavier, fallback, viewport | Nouveau test |
| sitemap.xml | Indexation des deux pages publiées | Nouveau fichier |
| AUDIT-TECHNIQUE.md | Présent rapport | Nouveau fichier |

Aucun fichier package.json, compilateur, fichier source TypeScript, module React ou pipeline de bundle applicatif n'existe : les scripts sont directement chargés par les pages HTML. Les ressources vendored ne doivent pas être supprimées sans les remplacer explicitement et conserver leurs licences.

## 3. Bugs critiques et priorité

| Priorité | Constat | Impact | Statut |
| --- | --- | --- | --- |
| P0 hors code | Déploiement Pages au statut « updating_pages » jusqu'au timeout 600 s | Une version testée peut ne pas être publiée | Dépend de GitHub Pages ; vérifier la prochaine publication |
| P1 | Débordement horizontal à 320 px : élément .product-glow, rectangle de −27 à 347 px | Scrolling horizontal parasite sur mobile | Corrigé en conservant le halo dans son conteneur |
| P1 | RackFlow chargé en iframe invisible, mais son GSAP/ScrollTrigger/ResizeObserver pouvait rester actif | CPU/animations inutiles et animations déclenchées avant l'ouverture | Corrigé par activation et suspension de la page intégrée |
| P1 | Arrière-plan du site accessible au clavier derrière la page immersive | Erreur d'accessibilité/navigation | Corrigé : régions d'accueil rendues inertes pendant la visite |
| P1 | Timeline de transition suspendue au pagehide, sans reprise garantie en BFCache | Transition bloquée après restauration de session | Corrigé : reprise de la timeline existante au pageshow |
| P2 | Éditeur RackFlow reconstruisant des boutons après chaque interaction | Perte de focus clavier | Corrigé : repositionnement du focus sur le bouton équivalent |
| P2 | Taille de matrice Canvas identique sur mobile et desktop | Calculs trigonométriques excessifs sur petit écran | Optimisé avec maillage adaptatif |
| P2 | Transformations GSAP appliquées à chaque frame même lorsque le carrousel est immobile | Travail de layout/compositing superflu | Corrigé par comparaison de l'état de présentation |
| P2 | Plusieurs requestAnimationFrame pour redessiner les câbles après scroll/rendu | Redessins redondants | Corrigé : une seule demande par frame |

## 4. Stabilité, nettoyage et fuites mémoire

**Cycle de vie GSAP :** le carrousel possède déjà un contexte GSAP réinitialisé via context.revert() lors du re-setup ; RackFlow utilise également un contexte dédié. La navigation conserve volontairement le document d'accueil monté. Les ScrollTriggers RackFlow restent maintenant désactivés lorsqu'il est préchargé sans être visible. Le retour rembobine la même timeline caméra plutôt que d'en instancier une nouvelle.

**Événements / observers :** l'observation ResizeObserver de la scène RackFlow est activée seulement quand la page est utilisée, puis déconnectée. L'écouteur de scroll est retiré lorsqu'il n'est plus nécessaire et les dessins SVG sont regroupés dans un requestAnimationFrame unique. Les écouteurs de navigation de l'iframe restent associés à sa durée de vie unique : leur présence ne constitue pas en soi une fuite.

**DOM et focus :** la reconstruction du simulateur reste limitée à un petit inventaire fictif (maximum huit équipements). Les données affichées par innerHTML sont issues de valeurs fixes et les textes d'équipement passent par escapeHtml. Ce n'est pas un système d'import de données non fiables : si des données externes sont ajoutées, privilégier textContent ou un sanitizer éprouvé. Les boutons recréés restaurent désormais le focus.

**Risque résiduel :** le routeur natif et la démo exposent des API sur window et utilisent l'accès direct à un iframe de même origine. Cela fonctionne sur GitHub Pages, mais impose la même origine et rend une future migration vers un domaine distinct plus coûteuse. Un mécanisme postMessage avec validation de l'origine pourra devenir nécessaire.

## 5. Optimisations de performances

| Axe | Avant | Après / résultat attendu |
| --- | --- | --- |
| Maillage du tore sur mobile | 48 × 33 + 8 × 97 ≈ 2 360 points projetés par passage | 26 × 19 + 5 × 57 ≈ 779 points : **environ 67 % de sommets projetés en moins** par passage |
| Résolution Canvas mobile | Ratio de pixels plafonné à 1,75 | Plafond à 1,5 sous 680 px : mémoire et surface de dessin réduites sur écrans très denses |
| Cartes GSAP immobiles | Deux mises à jour complètes de style par frame de rendu | Aucune mise à jour si les valeurs de layout sont inchangées |
| Connexions RackFlow | Multiples redraws SVG pouvant être planifiés dans la même frame | Coalescing en un redraw maximum par frame |
| RackFlow préchargé | ScrollTriggers et observers actifs avant l'entrée | Pas d'animation ni d'observation tant que la page est invisible |

Les valeurs ci-dessus décrivent du **travail supprimé dans le code**, pas une accélération FPS mesurée. Les gains réels dépendront de l'appareil, de Chrome/Safari et de la complexité de la scène. L'iframe est toujours préchargé pour ne pas casser la continuité cinématique : c'est un compromis assumé entre trafic initial et délai d'ouverture. Il ne faut pas promettre 60 FPS sans profiler sur du matériel réel.

**Budget source constaté dans le premier passage CI :** environ 100 KiB de HTML, CSS et JS applicatifs non compressés ; environ 114 KiB pour GSAP et ScrollTrigger vendored. Ce ne sont ni la taille transférée avec compression HTTP ni une mesure du coût d'exécution.

## 6. Code supprimé et éléments conservés

Supprimés : anciennes classes de transition .portal-overlay, .portal-vignette, .portal-particles, .portal-launch, .launching ; logique obsolète d'entrée RackFlow basée sur le marqueur « rackflow-enter » ; bannière historique docs/banner.svg ; redessins SVG redondants ; exécution de ScrollTriggers hors écran.

Conservés volontairement : surface de transition world-nav.css, GSAP/ScrollTrigger distribués localement, favicon, maquettes HTML/CSS de RackFlow, code du carrousel Canvas, données statiques de démonstration.

Aucun composant React, hook, import Three.js, shader, texture ou dépendance Framer Motion n'a été trouvé : il n'y a rien à supprimer dans ces catégories.

## 7. Réorganisation recommandée

**Court terme (déjà engagé) :** garder les trois scripts mais assurer un contrat clair entre le portail d'accueil, le routeur caméra et RackFlow ; maintenir les tests statiques et de navigation ; appliquer des changements ciblés sans migration de framework.

**Moyen terme (recommandé, non effectué pour ne pas risquer de casser la transition) :**
1. Séparer le routeur caméra et l'effet tilt en modules JS ; isoler le dessin Canvas de la synchronisation GSAP.
2. Factoriser les helpers de formatage des équipements et le modèle des connexions RackFlow.
3. Ajouter une politique de versions et de mises à jour des fichiers GSAP vendored ; vérifier périodiquement les avis de sécurité.
4. Adopter un formatage automatique et un lint JavaScript/CSS dans CI, avec un script de construction seulement si la complexité du site augmente.
5. Conserver une seule source de vérité pour l'état du carrousel et sa représentation historique.

**React/TypeScript strict :** migration non recommandée à ce stade. Si le site évolue vers une application avec de nombreux composants, plusieurs équipes et des états complexes, réévaluer TypeScript et un routeur dédié avec une stratégie de migration progressive.

## 7 bis. Dépendances et sécurité

**GSAP / ScrollTrigger :** les distributions conservées dans le dépôt sont en version **3.13.0** (en-têtes officiels vérifiés). Au 5 novembre 2026, la version npm stable disponible est **3.15.1** : la dépendance est donc en retard sur les versions publiées. Selon la fiche Snyk du package **gsap@3.13.0**, aucune vulnérabilité directe connue n'y est répertoriée à cette date. Cela n'équivaudrait pas à une garantie d'absence de vulnérabilité.

Sources publiques :
- https://www.npmjs.com/package/gsap?activeTab=versions
- https://security.snyk.io/package/npm/gsap/3.13.0
- https://gsap.com/docs/v3/Installation/

**Décision :** ne pas remplacer à l'aveugle les fichiers minifiés utilisés par la caméra sur un correctif de stabilité déjà validé. Prévoir une **pull request dédiée** mettant à jour GSAP et ScrollTrigger ensemble vers une version stable épinglée, avec les tests 20 cycles et le contrôle visuel avant fusion. Ne pas adopter de versions bêta.

## 8. Accessibilité et SEO

**Corrigé :** landmarks explicites sur la démo, représentation illustrative annoncée comme image, état inert de l'arrière-plan en navigation immersive, restauration du focus après rerender et retour, gestion prefers-reduced-motion, titres et descriptions des deux pages, URLs canoniques, métadonnées Open Graph et Twitter, sitemap.xml.

**À vérifier manuellement :** contraste WCAG AA des micro-libellés et couleurs secondaires ; taille effective des boutons de ports, très petits sur écran tactile ; tests lecteurs d'écran NVDA/VoiceOver ; zoom navigateur 200–400 % ; navigation clavier dans tous les panneaux et scénarios ; focus et annonces au début/à la fin des animations ; fonctionnement réel sur Safari iOS et Firefox.

**SEO résiduel :** prévoir une image de partage compatible Open Graph si besoin ; soumettre le sitemap aux moteurs de recherche. Le contenu est accessible via les URLs statiques réelles, y compris en navigation directe sans routeur côté client.

## 9. Tests et niveau de confiance

Le pipeline vérifie désormais :
- Intégrité des ressources, liens relatifs, doublons d'ID, h1, canonical, syntaxe JS et équilibrage CSS ;
- Vingt allers-retours Projects → RackFlow → Projects avec scroll et carte conservés, fonctionnement de l'anneau et absence de calques résiduels ;
- Focus clavier, cycle d'activation du document RackFlow, édition simulée, ajout/suppression de câbles, retour footer et métadonnées ;
- Navigation de secours sans chargement de GSAP ;
- Viewports 320, 390, 768 et 1440 px et mode réduction des animations.

**Limites :** les tests visuels automatisés sont exécutés sur Chrome Linux. Ils ne remplacent ni un profil de performances sur smartphone, ni une analyse heap snapshot, ni un test multipériphérique Safari/Firefox, ni une certification WCAG. L'audit des deux distributions minifiées GSAP porte sur leurs versions/licences et leur intégration, pas sur l'ensemble de leur code interne.

## 10. Validation avant production

Le feu vert final exige : tous les jobs de la CI sur le dernier commit en succès ; aucune régression desktop/mobile ; déploiement GitHub Pages réussi ; accès réel aux deux URLs ; validation de la fluidité sur un téléphone physique et vérification manuelle des parcours clavier. Si le job GitHub Pages repart en timeout « updating_pages » malgré un build réussi, traiter l'incident de publication séparément : ce n'est pas une raison pour réécrire GSAP ou le code applicatif.

**Conclusion :** la base technique est saine pour un portfolio interactif statique, après corrections et validation CI. La dette principale restante concerne la modularité du routeur, la couverture multi-navigateurs et l'accessibilité approfondie, pas l'absence de React ou de Three.js.
