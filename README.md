# Mes Projets — Alexis Coniglio

**[Rapport d'audit technique](./AUDIT-TECHNIQUE.md)** — inventaire des fichiers, bugs prioritaires, performances, accessibilité, corrections et limites de validation.

Une vitrine de projets personnels et d'applications métier, avec une direction artistique noir spatial, violet néon et cyan électrique.

**[Voir le site ↗](https://alexis-cgl.github.io/Projects/)** · **[Explorer RackFlow ↗](https://alexis-cgl.github.io/Projects/rackflow.html)**

## Expérience

- **Accueil / Mes Projets :** portail animé en Canvas 2D, scénarisé par GSAP ScrollTrigger, défilement horizontal du carrousel et rendu 3D léger des cartes.
- **RackFlow :** transition cinématique à partir de la carte puis page projet immersive, storytelling, parcours guidé et simulation interactive.
- **Démo RackFlow :** sélection des équipements, inspection, ajout/suppression d'appareils, création/suppression de liaisons entre ports, inventaire et réinitialisation.
- **Portfolio :** uniquement un lien externe. **Le dépôt séparé `alexis-cgl/alexis-coniglio` n'est pas modifié par ce site.**

## Direction artistique

| Usage | Couleur |
|---|---|
| Fond spatial | `#07070D` |
| Violet principal | `#A78BFA` |
| Cyan d'interaction | `#22D3EE` |
| Or discret / badges RackFlow | `#FBBF24` |

Les fonds combinent des dégradés subtils, un quadrillage discret et des surfaces translucides. Les cartes possèdent des reflets et un léger tilt sur les appareils dotés d'un pointeur précis.

## Organisation

| Fichier | Rôle |
|---|---|
| `index.html` | Accueil « Mes Projets » et carrousel |
| `rackflow.html` | Présentation et simulateur RackFlow |
| `assets/css/styles.css` | Style global, cartes et accueil |
| `assets/css/rackflow.css` | Style de la page et du simulateur |
| `assets/js/portal.js` | Portail Canvas, ScrollTrigger et carrousel d'origine |
| `assets/js/premium.js` | Tilt, halo dynamique et transition RackFlow |
| `assets/js/rackflow.js` | Simulation autonome, inspection, câblage et visite guidée |
| `assets/vendor/` | GSAP et ScrollTrigger distribués localement |

## Lancer en local

Ouvrez `index.html` dans un navigateur récent, ou servez le dossier avec un serveur local statique :

```bash
python -m http.server 8000
```

Puis visitez `http://localhost:8000/`.

Aucun bundler ni framework lourd n'est nécessaire. Le site est compatible avec GitHub Pages.

## Performance et accessibilité

Le portail 3D d'origine reste dessiné en Canvas 2D, avec un ratio de pixels limité et une animation suspendue quand la section est invisible. GSAP ne sert qu'aux animations pilotées par le scroll et aux transitions ciblées. Le survol des cartes utilise des transforms CSS et `requestAnimationFrame`.

- En mode `prefers-reduced-motion`, pas de transition cinématique ni de carrousel épinglé : navigation et grille classiques.
- Les liens, boutons et ports de la démo sont accessibles au clavier.
- Si GSAP n'est pas disponible, l'expérience de navigation reste utilisable.
- La fluidité réelle dépend de l'appareil et du navigateur : 60 FPS constitue un objectif, pas une garantie.

**La démo RackFlow est volontairement fictive et locale au navigateur** : pas de lecture des données réelles, ni d'accès au logiciel d'entreprise.

## Licence et dépendances

Les licences et mentions d'attribution des versions locales de GSAP figurent dans `assets/vendor/README.md`.

## Navigation « caméra unique » RackFlow

Sur Projects, **une seule surface graphique** relie la carte du carrousel à la page RackFlow. Au lieu de deux agrandissements successifs, une unique timeline GSAP pilote un paramètre de caméra normalisé de 0 (carte) à 1 (page plein écran), avec l'easing `expo.inOut`.

- La page RackFlow est **préchargée** dans un document de même origine, hors de la zone interactive.
- La carte est représentée dans **la même surface** que la page RackFlow. La géométrie est une interpolation affine continue de sa position exacte vers le plein écran.
- L'éclairage, la disparition des bordures, l'atténuation du carrousel et la révélation progressive de RackFlow dépendent tous de **la même progression**.
- Au retour, `timeline.reverse()` parcourt strictement les mêmes positions en sens inverse, sans nouvelle timeline et sans reconstruire le portail.
- Le carrousel, son ScrollTrigger et son Canvas restent montés ; l'état de scroll et la carte sélectionnée sont restaurés à la sortie.

Le flux depuis un lien RackFlow direct reste navigable sans JavaScript ; si le préchargement échoue, le lien normal sert de repli. Le mode `prefers-reduced-motion` rend le changement de vue immédiat, sans mouvement spatial complexe.

**Architecture réelle :** HTML, CSS, JavaScript natif, GSAP et Canvas 2D. Le projet n'utilise pas React, Framer Motion ni Three.js : les ajouter uniquement pour cette transition alourdirait le déploiement et augmenterait le risque d'animations dupliquées.

### Contrôle de non-régression

`tests/navigation-smoke.cjs` vérifie les vingt aller-retours, la progression de la caméra, le fait que carte et destination résident sur **une même surface**, le maintien de la carte active, du scroll, des frames Canvas et le repli mobile sans animations.

```bash
npm install --no-save playwright@1.56.1
npx playwright install chromium
python3 -m http.server 8123
# dans un autre terminal
node tests/navigation-smoke.cjs
```

Le workflow `.github/workflows/navigation-smoke.yml` lance également ce test sur GitHub Actions.


## Contrôles de qualité et préproduction

Les contrôles ci-dessous sont exécutés par GitHub Actions sur chaque pull request et sur la branche principale.

| Contrôle | Commande |
| --- | --- |
| Intégrité des fichiers, liens, CSS, JS, SEO | `node tests/static-audit.cjs` |
| Navigation immersive, 20 allers-retours | `node tests/navigation-smoke.cjs` |
| RackFlow, clavier, fallback GSAP, responsive | `node tests/quality-regression.cjs` |

Les tests navigateur utilisent Playwright et un serveur statique local (voir le rapport pour les limites). L'application finale n'a aucune dépendance npm à exécuter dans le navigateur.

Le sitemap des deux pages publiques est disponible dans `sitemap.xml`. Un échec de déploiement GitHub Pages sur `updating_pages` est distinct d'un échec de compilation ou de test : vérifier les journaux du job avant toute modification du code.


## Responsive immersif : PC, Android, iPhone et tablettes

La mise en page s'adapte au pointeur, à la largeur, à la hauteur et au mouvement réduit :

- **Téléphones Android et iPhone :** animation de l'anneau et carrousel GSAP au scroll sur les hauteurs compatibles ; gestes tactiles, commandes accessibles, carte RackFlow adaptée et retour cinématique sans perte d'état.
- **Paysage compact :** vue concentrée avec cartes réduites et contrôles adaptés, sans couper les contenus. Pour les très faibles hauteurs, la grille déroulante reste utilisable au lieu de contraindre un portail épinglé illisible.
- **Tablettes :** démonstration RackFlow et cartes avec espacements ajustés ; boutons adaptés au tactile.
- **Safari iOS / Chrome Android :** protection contre le changement de hauteur provoqué par les barres d'adresse mobiles et les réinitialisations inutiles de ScrollTrigger.
- **Accessibilité :** le mode `prefers-reduced-motion` conserve toutes les pages et actions, mais désactive volontairement les mouvements cinématiques complexes.

La présentation responsive est isolée dans `assets/css/responsive.css`, partagée par les deux pages. La démo RackFlow conserve une interface interactive et des ports tactiles d'au moins 26 pixels sur appareils à pointeur grossier.

### Test de compatibilité multi-supports

Le job `mobile-compatibility` exécute `tests/mobile-responsive.cjs` sur Chromium avec émulation tactile Android et sur WebKit (moteur Safari) avec émulation iPhone/iPad. Les tailles contrôlées vont de 320 à 844 pixels, portrait et paysage. Ces simulations ne garantissent pas les mêmes FPS qu'un iPhone ou Android physique : un contrôle manuel reste utile avant une démonstration publique importante.
