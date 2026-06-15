// ===================================================================
//  Système Solaire — ÉCHELLE RÉELLE (proportions réelles).
//  Unité scène : 1 u = 100 km.  Rayons et distances = valeurs réelles / 100.
//  -> les planètes sont énormes face au vaisseau, et les écarts immenses :
//     on traverse grâce à la vitesse de distorsion (pulse drive).
// ===================================================================
const TEX = "./assets/textures/";
const K = 1 / 100;                       // km -> unités scène
const r = (km) => +(km * K).toFixed(2);  // rayon
const d = (km) => Math.round(km * K);    // distance orbitale

export const SUN = {
  name: "Soleil",
  radius: r(696340),                     // ~6963 u
  map: TEX + "sun.jpg",
  light: { color: 0xfff6e8, intensity: 3.0 },
  fact: "Étoile naine jaune — 99,86 % de la masse du Système Solaire.",
};

export const PLANETS = [
  {
    key: "mercury", name: "Mercure", map: TEX + "mercury.jpg", bump: TEX + "mercury_bump.jpg",
    radius: r(2440), distance: d(57900000), orbSpeed: 0.0118, rotSpeed: 0.0030, tilt: 0.03, color: 0x9c8c7a,
    fact: "La planète la plus proche du Soleil : 430 °C le jour, -180 °C la nuit.",
    mission: { type: "scan", verb: "scan", hold: 3.0, reward: 200,
      title: "Relevé thermique", desc: "Approchez Mercure côté jour et lancez une analyse de surface." },
  },
  {
    key: "venus", name: "Vénus", map: TEX + "venus.jpg", bump: TEX + "venus_bump.jpg",
    radius: r(6052), distance: d(108200000), orbSpeed: 0.0088, rotSpeed: -0.0012, tilt: 177.4, color: 0xd8b87a,
    atmosphere: { color: 0xf3d28c, power: 2.4, size: 1.06 },
    fact: "Rotation rétrograde, 465 °C sous des nuages d'acide sulfurique.",
    mission: { type: "scan", verb: "probe", hold: 3.5, reward: 240,
      title: "Sonde atmosphérique", desc: "Larguez une sonde dans l'épaisse atmosphère de Vénus." },
  },
  {
    key: "earth", name: "Terre", map: TEX + "earth.jpg",
    night: TEX + "earth_lights.png", clouds: TEX + "earth_clouds.png",
    normal: TEX + "earth_normal.jpg", spec: TEX + "earth_specular.jpg",
    radius: r(6371), distance: d(149600000), orbSpeed: 0.0075, rotSpeed: 0.05, tilt: 23.44, color: 0x2a6fb0,
    atmosphere: { color: 0x6db8ff, power: 2.6, size: 1.05 },
    fact: "Notre berceau : 71 % de la surface couverte d'océans.",
    moon: { name: "Lune", map: TEX + "moon.jpg", radius: r(1737), distance: d(384400), orbSpeed: 0.02, rotSpeed: 0.01 },
    mission: { type: "scan", verb: "scan", hold: 2.5, reward: 150,
      title: "Calibration orbitale", desc: "Mise en orbite terrestre : calibrez les capteurs avant le grand voyage." },
  },
  {
    key: "moon", name: "Lune", isMoonOf: "earth", map: TEX + "moon.jpg",
    radius: r(1737), color: 0xbfbfbf,
    fact: "Unique satellite naturel de la Terre, criblé de cratères.",
    mission: { type: "land", verb: "land", reward: 220,
      title: "Alunissage", desc: "Posez-vous en douceur à la surface de la Lune." },
  },
  {
    key: "mars", name: "Mars", map: TEX + "mars.jpg", bump: TEX + "mars_bump.jpg",
    radius: r(3390), distance: d(227900000), orbSpeed: 0.0061, rotSpeed: 0.048, tilt: 25.19, color: 0xc1502e,
    atmosphere: { color: 0xff9b6b, power: 3.0, size: 1.04 },
    fact: "La planète rouge : Olympus Mons culmine à 22 km.",
    mission: { type: "scan", verb: "sample", hold: 4.0, reward: 300,
      title: "Recherche de glace", desc: "Prélevez des échantillons à la surface martienne." },
  },
  {
    key: "jupiter", name: "Jupiter", map: TEX + "jupiter.jpg",
    radius: r(69911), distance: d(778500000), orbSpeed: 0.0033, rotSpeed: 0.10, tilt: 3.13, color: 0xd2a679,
    fact: "Géante gazeuse : la Grande Tache Rouge est plus large que la Terre.",
    mission: { type: "scan", verb: "scan", hold: 4.5, reward: 380,
      title: "La Grande Tache Rouge", desc: "Étudiez la tempête géante de Jupiter." },
  },
  {
    key: "saturn", name: "Saturne", map: TEX + "saturn.jpg",
    radius: r(58232), distance: d(1434000000), orbSpeed: 0.0024, rotSpeed: 0.09, tilt: 26.73, color: 0xe3c98f,
    ring: { map: TEX + "saturn_ring.jpg", inner: r(74500), outer: r(140180) },
    fact: "Ses anneaux de glace s'étendent sur 280 000 km.",
    mission: { type: "flythrough", verb: "flythrough", reward: 420,
      title: "Traversée des anneaux", desc: "Effectuez un passage à travers le plan des anneaux de Saturne." },
  },
  {
    key: "uranus", name: "Uranus", map: TEX + "uranus.jpg",
    radius: r(25362), distance: d(2871000000), orbSpeed: 0.0017, rotSpeed: -0.06, tilt: 97.77, color: 0x9fe0e6,
    ring: { map: TEX + "uranus_ring.jpg", inner: r(38000), outer: r(51000), faint: true, vertical: true },
    fact: "Géante de glaces inclinée à 98° : elle « roule » sur son orbite.",
    mission: { type: "scan", verb: "probe", hold: 4.0, reward: 360,
      title: "Champ magnétique", desc: "Mesurez le champ magnétique incliné d'Uranus." },
  },
  {
    key: "neptune", name: "Neptune", map: TEX + "neptune.jpg",
    radius: r(24622), distance: d(4495000000), orbSpeed: 0.0013, rotSpeed: 0.06, tilt: 28.32, color: 0x3a66d6,
    atmosphere: { color: 0x4f7dff, power: 2.6, size: 1.05 },
    fact: "Vents les plus violents du Système Solaire : 2 100 km/h.",
    mission: { type: "scan", verb: "scan", hold: 4.5, reward: 400,
      title: "Tempêtes de Neptune", desc: "Analysez les vents supersoniques de la dernière géante." },
  },
  {
    key: "pluto", name: "Pluton", map: TEX + "pluto.jpg",
    radius: r(1188), distance: d(5906000000), orbSpeed: 0.0009, rotSpeed: 0.016, tilt: 122.5, color: 0xcbb8a0,
    fact: "Planète naine de la ceinture de Kuiper. Frontière de notre voyage.",
    mission: { type: "scan", verb: "scan", hold: 5.0, reward: 500,
      title: "Frontière du système", desc: "Plantez le drapeau aux confins du Système Solaire." },
  },
];

// ---- Vaisseau & pilotage (modèle arcade : la vitesse suit le cap) ----
export const SHIP = {
  size: 1.2,             // longueur ~1,2 u (≈120 km à l'échelle) — minuscule face aux planètes
  cruiseMax: 60,         // vitesse de manœuvre près des astres
  boostMax: 420,         // postcombustion (Maj)
  accel: 60,             // réactivité de la poussée
  decel: 1.4,            // amortissement quand on relâche
  reverse: 0.6,          // fraction de cruiseMax en marche arrière
  // vitesse de distorsion (super-boost) : proportionnelle à la distance au corps le plus proche
  warp: { factor: 0.7, min: 60, max: 6.0e6, engageDist: 900, ramp: 2.2 },
  yawRate: 0.85, pitchRate: 0.85,   // rad/s (clavier / manette)
  mouseSens: 0.0016, mouseSmooth: 14,
  autoLevel: 2.6,        // force de remise à l'horizontale (anti-nausée)
  cam: { dist: 4.0, height: 1.35, lag: 9, lookAhead: 6 },
  startOffsetR: 3.2,     // position de départ : earthR * 3.2 au-dessus de la surface
};

export const CAMPAIGN_ORDER = ["earth", "moon", "mars", "venus", "mercury", "jupiter", "saturn", "uranus", "neptune", "pluto"];

export const SCALE = { unitKm: 100 };    // pour l'affichage des distances
