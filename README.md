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

## Navigation réversible RackFlow

Le lien « Découvrir le projet » sur Projects ouvre RackFlow dans un calque plein écran **sans détruire l'accueil** :

1. Le carrousel enregistre sa progression ScrollTrigger, la carte active et la position réelle du scroll dans `sessionStorage`.
2. Une copie de la carte effectue un zoom vers un écran RackFlow préchargé et isolé dans un document embarqué de même origine.
3. Les boutons de retour RackFlow et le bouton Retour du navigateur rembobinent le mouvement : écran → carte centrale → position initiale exacte.
4. L'instance Canvas et sa timeline restent montées et suspendues pendant la visite ; la reprise relance une seule boucle de rendu, sans dupliquer les listeners.

La page `rackflow.html` reste directement consultable, et son retour se comporte comme une navigation classique avec récupération de la position précédente lorsqu'elle est connue. Les préférences `prefers-reduced-motion` désactivent les mouvements complexes.

**Architecture :** JavaScript natif, GSAP Context et Canvas 2D. Il n'y a pas de composants React ni Three.js dans ce site. Ajouter React Router, Zustand ou React Three Fiber n'apporterait pas de bénéfice pour ce cycle de vie et augmenterait les risques de remount.

### Régression

Le test Playwright `tests/navigation-smoke.cjs` vérifie vingt allers-retours successifs (carte active, scroll, rendu de l'anneau, absence de calques résiduels) et le mode mouvement réduit.

```bash
npm install --no-save playwright@1.56.1
npx playwright install chromium
python3 -m http.server 8123
# dans un second terminal
node tests/navigation-smoke.cjs
```

Le workflow GitHub Actions `.github/workflows/navigation-smoke.yml` exécute le même test sur la branche concernée.
