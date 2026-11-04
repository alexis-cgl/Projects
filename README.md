# Projects

[![Projects, la collection web d’Alexis Coniglio](docs/banner.svg)](https://alexis-cgl.github.io/Projects/)

Une vitrine pour parcourir mes réalisations web. Chaque fiche présente un projet, son usage et, lorsqu’il est disponible en ligne, un lien pour l’ouvrir.

**[Explorer la vitrine ↗](https://alexis-cgl.github.io/Projects/)** · [Parcourir le catalogue](https://alexis-cgl.github.io/Projects/#catalogue)

## Dans le catalogue

| Projet | À découvrir |
| --- | --- |
| **RackFlow** | Un éditeur visuel pour organiser une baie réseau et suivre le câblage entre ses équipements. Sa fiche se déplie dans le catalogue. |
| **[Portfolio ↗](https://alexis-cgl.github.io/alexis-coniglio/)** | Mon parcours en réseaux et télécommunications et mes réalisations en cybersécurité. |

## Repères dans le dépôt

| Fichier | Rôle |
| --- | --- |
| [index.html](index.html) | Structure de la page, navigation et fiches du catalogue. |
| [assets/css/styles.css](assets/css/styles.css) | Couleurs, mise en page mobile et rotation de l’anneau. |
| [assets/js/ring.js](assets/js/ring.js) | Dessin des sections de l’anneau en SVG. |
| [docs/banner.svg](docs/banner.svg) | Bannière de présentation du README. |

## Modifier la vitrine

Ouvre `index.html` dans ton navigateur pour prévisualiser le site en local. Aucune installation ni compilation nécessaire.

Pour ajouter un projet, reprends un bloc `<article>` dans la grille de la section `#catalogue`. Renseigne sa catégorie, son nom, sa description et son lien. Pour présenter un projet sans adresse publique, utilise une fiche dépliable comme celle de RackFlow.

L’anneau respecte le réglage de réduction des animations de l’appareil. Le catalogue et ses liens restent utilisables lorsque JavaScript est désactivé.
