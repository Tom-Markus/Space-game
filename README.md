# 🚀 Odyssée Solaire

Un jeu **3D du Système Solaire** jouable dans le navigateur. Pilotez un vaisseau spatial
à la **3ᵉ personne** à travers les huit planètes (plus la Lune et Pluton) et accomplissez
une **mission scientifique** sur chaque astre.

Rendu avec [Three.js](https://threejs.org) (WebGL) et de **vraies cartes de textures
planétaires** (NASA / Planet Pixel Emporium) pour un maximum de réalisme : éclairage
ponctuel depuis le Soleil, terminateurs jour/nuit, lumières des villes côté nuit de la
Terre, océans spéculaires, nuages, atmosphères, anneaux de Saturne et d'Uranus, halo
solaire avec *bloom*, et un champ d'étoiles procédural.

## ▶️ Jouer

Le jeu utilise des modules ES — il doit être servi par un petit serveur HTTP
(pas en `file://`) :

```bash
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

## 🎮 Commandes

| Action | Touche |
|---|---|
| Orienter le vaisseau | **Souris** (curseur verrouillé) |
| Propulsion avant / arrière | **Z/W** / **S** |
| Tonneau (roulis) | **A** / **D** |
| Postcombustion (boost) | **Maj** |
| Frein inertiel | **Espace** |
| Analyser / Atterrir | **E** (maintenir) |
| Tangage / lacet (alternatif) | **Flèches** |
| Carte / Aide / Pause | **M** / **H** / **Échap** |

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
