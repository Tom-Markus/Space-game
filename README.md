# 🚀 Odyssée Solaire

Un jeu **3D du Système Solaire** jouable dans le navigateur. Pilotez un vaisseau spatial
à la **3ᵉ personne** à travers les huit planètes (plus la Lune et Pluton) et accomplissez
une **mission scientifique** sur chaque astre.

Rendu avec [Three.js](https://threejs.org) (WebGL) et de **vraies cartes de textures
planétaires** (NASA / Planet Pixel Emporium) pour un maximum de réalisme : éclairage
ponctuel depuis le Soleil, terminateurs jour/nuit, lumières des villes côté nuit de la
Terre, océans spéculaires, nuages, atmosphères, anneaux de Saturne et d'Uranus, halo
solaire avec *bloom*, et un fond de **Voie lactée** réelle (ambiance « ISS » : ciel quasi noir).

Textures haute définition **8K** fournies par l'utilisateur (cartes `tom_`) avec filtrage
anisotrope. Un **sélecteur de qualité** dans le menu (Ultra 8K / Élevé 4K / Perf 2K)
adapte la résolution chargée à la machine — chaque mode ne télécharge que sa résolution.
Bonus : 4 **planètes naines** explorables — Cérès, Hauméa, Makémaké, Éris — à leur vraie distance.

## 📐 Échelle — à taille réelle

L'**unité de référence est le vaisseau** : il mesure **exactement 100 m de long = 1 unité scène**.
Tout le reste (astres et distances) est à la **vraie échelle**, proportionnel à cette mesure :

> **1 unité = 100 m**, donc **1 km = 10 unités** (`S = 10`).
> Chaque astre/distance = sa valeur réelle × `S`.

Quelques conséquences, vérifiables dans `src/config.js` :

| Objet | Réel | Dans la simulation | Rapport au vaisseau |
|---|---|---|---|
| Vaisseau | 100 m | 1 u | ×1 |
| Diamètre Terre | 12 742 km | 127 420 u | **×127 420** |
| Rayon Soleil | 696 340 km | 6 963 400 u | ×6 963 400 |
| Orbite Terre | 149,6 M km | 1,496 G u | — |
| Orbite Neptune | 4,495 G km | 44,95 G u | — |

Vu l'amplitude colossale (du vaisseau de 100 m jusqu'à Neptune à 4,5 milliards de km),
le rendu utilise un **depth-buffer logarithmique** pour rester précis de près comme de loin.
Les distances immenses se franchissent à la **vitesse de distorsion** (voir Commandes), qui
**ralentit automatiquement** à l'approche d'un astre.

## ▶️ Jouer

Le jeu utilise des modules ES — il doit être servi par un petit serveur HTTP
(pas en `file://`) :

```bash
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

## 🎮 Commandes

L'horizon se **stabilise automatiquement** (anti-nausée) : pas de roulis à gérer.

| Action | Touche |
|---|---|
| Orienter le vaisseau | **Souris** (curseur verrouillé) |
| Accélérer / Ralentir-reculer | **Z/W** / **S** |
| Postcombustion | **Maj** |
| **Distorsion (super-boost)** | **Espace** (maintenir) |
| Analyser / Atterrir | **E** (maintenir) |
| Orienter (alternatif) | **Flèches** |
| Carte du système / Aide / Pause | **M** / **H** / **Échap** |

La touche **M** (ou un clic sur le radar) ouvre la **carte du système** en plein écran :
cliquez un astre pour en faire votre **cap**. De retour au pilotage, une **flèche** vous
y guide en permanence, indépendamment de la mission en cours.

La **distorsion** accélère énormément en espace ouvert puis **ralentit toute seule** près
d'un astre — c'est ainsi qu'on franchit les distances réelles. Manette et tactile gérés.

Manette (Gamepad) et commandes **tactiles** (joystick + boutons) sont également prises en charge.

## 🎯 But du jeu

Une campagne enchaîne une mission par corps céleste — calibration en orbite terrestre,
alunissage, prélèvements sur Mars, traversée des anneaux de Saturne, jusqu'à la frontière
de Pluton. Suivez le marqueur d'objectif, approchez la cible et maintenez **E** pour
réaliser l'analyse. Gagnez des crédits et terminez l'expédition complète.

## 🗂️ Structure

```
index.html          page du jeu + import map Three.js
styles.css          interface (HUD, menus)
logic.js            stub requis par la plateforme de déploiement
src/
  main.js           amorçage, boucle de jeu, machine à états
  scene.js          renderer, caméra, post-traitement (bloom)
  bodies.js         Soleil, planètes, Lune, anneaux, atmosphères, étoiles
  ship.js           vaisseau (modèle + physique de vol + caméra 3ᵉ personne)
  input.js          clavier / souris / tactile / manette
  missions.js       campagne et objectifs
  hud.js            HUD, marqueurs de cible, mini-carte radar
  strings.js        tous les textes (FR) — externalisés
assets/textures/    cartes planétaires réelles
vendor/three/       Three.js r160 (vendorisé, sans CDN)
```

## 🛠️ Régénérer les dépendances

Three.js et les textures sont déjà inclus. Pour les retélécharger :

```bash
./tools/setup_assets.sh
```

Textures : NASA / James Hastings-Trew (Planet Pixel Emporium) via les dépôts
`mrdoob/three.js` et `jeromeetienne/threex.planets`.
