# Mes Projets — Alexis Coniglio

Une vitrine de projets personnels et d'applications métier, avec une direction artistique noir spatial, violet néon et cyan électrique.

**[Voir le site ↗](https://alexis-cgl.github.io/Projects/)** · **[Explorer RackFlow ↗](https://alexis-cgl.github.io/Projects/rackflow.html)**

## Expérience

- **Accueil / Mes Projets :** portail animé en Canvas 2D, scénarisé par GSAP ScrollTrigger, défilement horizontal du carrousel et rendu 3D léger des cartes.
- **RackFlow :** transition cinématique à partir de la carte puis page projet immersive, storytelling, parcours guidé et simulation interactive.
- **Démo RackFlow :** sélection des équipements, inspection, ajout/suppression d'appareils, création/suppression de liaisons entre ports, inventaire et réinitialisation.
- **Portfolio :** uniquement un lien externe. **Le dépôt séparé \`alexis-cgl/alexis-coniglio\` n'est pas modifié par ce site.**

## Direction artistique

| Usage | Couleur |
|---|---|
| Fond spatial | \`#07070D\` |
| Violet principal | \`#A78BFA\` |
| Cyan d'interaction | \`#22D3EE\` |
| Or discret / badges RackFlow | \`#FBBF24\` |

Les fonds combinent des dégradés subtils, un quadrillage discret et des surfaces translucides. Les cartes possèdent des reflets et un léger tilt sur les appareils dotés d'un pointeur précis.

## Organisation

| Fichier | Rôle |
|---|---|
| \`index.html\` | Accueil « Mes Projets » et carrousel |
| \`rackflow.html\` | Présentation et simulateur RackFlow |
| \`assets/css/styles.css\` | Style global, cartes et accueil |
| \`assets/css/rackflow.css\` | Style de la page et du simulateur |
| \`assets/js/portal.js\` | Portail Canvas, ScrollTrigger et carrousel d'origine |
| \`assets/js/premium.js\` | Tilt, halo dynamique et transition RackFlow |
| \`assets/js/rackflow.js\` | Simulation autonome, inspection, câblage et visite guidée |
| \`assets/vendor/\` | GSAP et ScrollTrigger distribués localement |

## Lancer en local

Ouvrez \`index.html\` dans un navigateur récent, ou servez le dossier avec un serveur local statique :

\`\`\`bash
python -m http.server 8000
\`\`\`

Puis visitez \`http://localhost:8000/\`.

Aucun bundler ni framework lourd n'est nécessaire. Le site est compatible avec GitHub Pages.

## Performance et accessibilité

Le portail 3D d'origine reste dessiné en Canvas 2D, avec un ratio de pixels limité et une animation suspendue quand la section est invisible. GSAP ne sert qu'aux animations pilotées par le scroll et aux transitions ciblées. Le survol des cartes utilise des transforms CSS et \`requestAnimationFrame\`.

- En mode \`prefers-reduced-motion\`, pas de transition cinématique ni de carrousel épinglé : navigation et grille classiques.
- Les liens, boutons et ports de la démo sont accessibles au clavier.
- Si GSAP n'est pas disponible, l'expérience de navigation reste utilisable.
- La fluidité réelle dépend de l'appareil et du navigateur : 60 FPS constitue un objectif, pas une garantie.

**La démo RackFlow est volontairement fictive et locale au navigateur** : pas de lecture des données réelles, ni d'accès au logiciel d'entreprise.

## Licence et dépendances

Les licences et mentions d'attribution des versions locales de GSAP figurent dans \`assets/vendor/README.md\`.
