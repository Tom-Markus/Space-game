# 🚀 Odyssée Solaire — *Le Dernier Signal*

Un jeu **3D du Système Solaire** jouable dans le navigateur, doublé d'une **campagne narrative
en trois actes**. Pilotez l'**Odyssée** à la **3ᵉ personne** à travers les huit planètes (plus la
Lune et Pluton), épaulé·e par **ARIA**, votre intelligence de bord, et par le **Centre Korolev**.

> Il y a quarante ans, la sonde **Pionnier-9** a franchi l'orbite de Pluton, puis s'est tue.
> Cette nuit, son signal est revenu — et il connaît le nom de votre vaisseau. Le message est
> **éparpillé** : un fragment piégé dans le champ de chaque monde. Récupérez-les tous,
> recomposez le message, et découvrez qui appelle… avant que le silence ne retombe.

L'histoire se raconte **pendant que vous pilotez**, par radio : briefings, répliques d'arrivée,
**éruption solaire** à Mercure, **twist** dans les anneaux de Saturne, **silence radio** passé
Neptune, et un **final** à la frontière du système. *Émerveillement → tension → apothéose.*

Rendu avec [Three.js](https://threejs.org) (WebGL) et de **vraies cartes de textures
planétaires** (NASA / Planet Pixel Emporium) pour un maximum de réalisme : éclairage
ponctuel depuis le Soleil, terminateurs jour/nuit, lumières des villes côté nuit de la
Terre, océans spéculaires, nuages, atmosphères, anneaux de Saturne et d'Uranus, halo
solaire avec *bloom*, et un fond de **Voie lactée** réelle (ambiance « ISS » : ciel quasi noir).

Textures haute définition **8K** fournies par l'utilisateur (cartes `tom_`) avec filtrage
anisotrope. Un **sélecteur de qualité** dans le menu (Ultra 8K / Élevé 4K / Perf 2K)
adapte la résolution chargée à la machine — chaque mode ne télécharge que sa résolution.
Bonus : 4 **planètes naines** explorables — Cérès, Hauméa, Makémaké, Éris — à leur vraie distance.

### ✨ Effets d'immersion (procéduraux, aucun asset)

- **Soleil vivant** : surface convective **animée par shader** (granulation, taches,
  assombrissement centre-bord) — approchez-vous, les halos s'effacent et la fournaise apparaît.
- **Lens flare** du Soleil (fantômes + strie anamorphique), occulté par les planètes.
- **Poussière de vitesse** enveloppant la caméra : le vide « défile » enfin en croisière,
  et s'étire en **traînées d'étoiles 3D** à la distorsion.
- **Ceintures d'astéroïdes** (principale + Kuiper) : voile de particules au loin, et
  **vrais rochers instanciés** qui se matérialisent autour de vous quand vous les traversez —
  y compris **dans les anneaux de Saturne**. ARIA les commente à l'entrée.
- **Inclinaison en virage** : le vaisseau se penche dans les courbes (la caméra reste stable).
- Départ **côté jour** : la première image du jeu est un lever de Terre éclairé.

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
| Journal du signal | **J** |
| Orienter (alternatif) | **Flèches** |
| Carte du système / Aide / Pause | **M** / **H** / **Échap** |
| Couper / remettre le son | **C** |

La **sensibilité souris** et l'**inversion de l'axe Y** se règlent dans le menu **Pause**
(préférences mémorisées).

La touche **M** (ou un clic sur le radar) ouvre la **carte du système** en plein écran :
cliquez un astre pour en faire votre **cap**. De retour au pilotage, une **flèche** vous
y guide en permanence, indépendamment de la mission en cours.

La **distorsion** accélère énormément en espace ouvert puis **ralentit toute seule** près
d'un astre — c'est ainsi qu'on franchit les distances réelles. Manette et tactile gérés.

Manette (Gamepad) et commandes **tactiles** (joystick + boutons) sont également prises en charge.

## 🎯 But du jeu — la campagne « Le Dernier Signal »

Dix chapitres, un par astre, chacun porteur d'un **fragment du signal** à récupérer.
Suivez le marqueur d'objectif : **verrouillez** les sources en les gardant dans le nez
du vaisseau, **collectez** les éclats de données en volant à travers, **posez-vous** en
douceur sur la Lune. ARIA décode chaque fragment et le récit avance, ponctué par des
**cartes de titre d'acte** plein écran.

| Acte | Astres | Ce qui se joue |
|---|---|---|
| **I — Émerveillement** | Terre · Lune · Mars | Le signal connaît le nom du vaisseau. Premiers fragments, premiers frissons. |
| **II — Tension** | Vénus · Mercure · Jupiter · Saturne | Une voix humaine, une éruption solaire, une télémétrie impossible… et un **twist** : ARIA reconstitue-t-elle les fragments, ou les invente-t-elle ? |
| **III — Apothéose** | Uranus · Neptune · Pluton | Liaison perdue avec la Terre, l'origine d'ARIA révélée, et la **source** du signal au bord du Système Solaire. |

À Pluton, les neuf fragments **se recomposent** — et l'on découvre que le signal forme une
**boucle causale** : le message qu'on recompose est celui qui a lancé la mission. Le **choix
fait à Saturne** (faire confiance à ARIA, ou douter) détermine **laquelle des deux fins** se
joue. Toute l'écriture vit dans `src/story.js` : éditez-le, et vous réécrivez le film.

### Activités & dangers (le gameplay)

Fini le « maintien E » : chaque mission a sa **mécanique**, et des **dangers** entament la
**coque/bouclier** (sans game-over : si la coque tombe, le vaisseau se replie et repart).

| Mécanique | En quoi ça consiste | Exemples |
|---|---|---|
| **Verrouillage** | Approchez la source du signal et **orientez le nez** dessus pour remplir l'anneau de verrouillage | Terre, Vénus, Mercure, Jupiter, Uranus, Neptune, Pluton |
| **Collecte d'éclats** | Volez **à travers** des éclats de données dispersés pour les capter | Mars (glace), Saturne (anneaux) |
| **Appontage** | Posez-vous **en douceur** (vitesse + altitude faibles) | Lune |

| Danger | Effet |
|---|---|
| 🔥 **Éruption solaire** (Mercure) | Abritez-vous **derrière la planète** ou la coque fond |
| ♨️ **Surchauffe** (Vénus) | Ne **descendez pas trop bas** dans l'atmosphère |
| ☢️ **Radiations** (Jupiter) | Le **bouclier s'use** : faites vite |
| 🌪️ **Tempête** (Neptune) | Des **bourrasques** déstabilisent votre visée |

## 🗂️ Structure

```
index.html          page du jeu + import map Three.js
styles.css          interface (HUD, menus)
logic.js            stub requis par la plateforme de déploiement
src/
  main.js           amorçage, boucle de jeu, machine à états
  scene.js          renderer, caméra, post-traitement (bloom)
  bodies.js         Soleil (shader animé), planètes, Lune, anneaux, atmosphères, étoiles
  fx.js             ★ immersion : poussière de vitesse, traînées warp, lens flare,
                      champs de roches locaux (ceintures, anneaux de Saturne)
  ship.js           vaisseau (modèle + physique de vol + inclinaison + caméra 3ᵉ personne)
  input.js          clavier / souris / tactile / manette
  settings.js       préférences (sensibilité, inversion Y) persistées
  starmap.js        carte du système plein écran (cap de navigation)
  missions.js       campagne : enchaîne les missions, le récit et les activités
  activities.js     ★ gameplay : verrouillage (visée) / collecte d'éclats / appontage + dangers
  status.js         intégrité coque + bouclier (dangers, repli « fail-soft »)
  story.js          ★ toute la matière narrative (intro, dialogues, fragments, fins)
  comms.js          système de dialogues radio (machine à écrire, locuteurs, file)
  hud.js            HUD, marqueurs de cible, mini-carte radar, jauges
  strings.js        tous les textes d'interface (FR) — externalisés
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
