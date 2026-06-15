// ===================================================================
//  Données du Système Solaire (échelle de jeu, pas à l'échelle réelle).
//  Distances/rayons en "unités scène". Les faits sont réalistes.
//  rotSpeed / orbSpeed : rad/s (lents, surtout visuels).
// ===================================================================
const TEX = "./assets/textures/";

export const SUN = {
  name: "Soleil",
  radius: 130,
  map: TEX + "sun.jpg",
  light: { color: 0xfff4e6, intensity: 3.2 },
  fact: "Étoile naine jaune — 99,86 % de la masse du Système Solaire.",
};

// chaque planète peut porter une "mission".
export const PLANETS = [
  {
    key: "mercury", name: "Mercure", map: TEX + "mercury.jpg", bump: TEX + "mercury_bump.jpg",
    radius: 4.2, distance: 430, orbSpeed: 0.0118, rotSpeed: 0.0030, tilt: 0.03, color: 0x9c8c7a,
    fact: "La planète la plus proche du Soleil. Jours brûlants (430 °C), nuits glaciales (-180 °C).",
    mission: { type: "scan", verb: "scan", hold: 3.0, reward: 200,
      title: "Relevé thermique", desc: "Approchez Mercure côté jour et lancez une analyse de surface." },
  },
  {
    key: "venus", name: "Vénus", map: TEX + "venus.jpg", bump: TEX + "venus_bump.jpg",
    radius: 9.6, distance: 640, orbSpeed: 0.0088, rotSpeed: -0.0012, tilt: 177.4, color: 0xd8b87a,
    atmosphere: { color: 0xf3d28c, power: 2.4, size: 1.16 },
    fact: "Rotation rétrograde. Effet de serre extrême : 465 °C sous des nuages d'acide sulfurique.",
    mission: { type: "scan", verb: "probe", hold: 3.5, reward: 240,
      title: "Sonde atmosphérique", desc: "Larguez une sonde dans l'épaisse atmosphère de Vénus." },
  },
  {
    key: "earth", name: "Terre", map: TEX + "earth.jpg",
    night: TEX + "earth_lights.png", clouds: TEX + "earth_clouds.png",
    normal: TEX + "earth_normal.jpg", spec: TEX + "earth_specular.jpg",
    radius: 10, distance: 880, orbSpeed: 0.0075, rotSpeed: 0.026, tilt: 23.44, color: 0x2a6fb0,
    atmosphere: { color: 0x6db8ff, power: 2.6, size: 1.14 },
    fact: "Notre berceau. Seule planète connue abritant la vie. 71 % de sa surface est couverte d'océans.",
    moon: { name: "Lune", map: TEX + "moon.jpg", radius: 2.7, distance: 34, orbSpeed: 0.05, rotSpeed: 0.005 },
    mission: { type: "scan", verb: "scan", hold: 2.5, reward: 150,
      title: "Calibration orbitale", desc: "Mise en orbite terrestre : calibrez les capteurs avant le grand voyage." },
  },
  {
    key: "moon", name: "Lune", isMoonOf: "earth", map: TEX + "moon.jpg",
    radius: 2.7, color: 0xbfbfbf,
    fact: "Unique satellite naturel de la Terre. Marquée par d'innombrables cratères d'impact.",
    mission: { type: "land", verb: "land", hold: 0, reward: 220, approach: 7,
      title: "Alunissage", desc: "Posez-vous en douceur à la surface de la Lune." },
  },
  {
    key: "mars", name: "Mars", map: TEX + "mars.jpg", bump: TEX + "mars_bump.jpg",
    radius: 5.4, distance: 1180, orbSpeed: 0.0061, rotSpeed: 0.025, tilt: 25.19, color: 0xc1502e,
    atmosphere: { color: 0xff9b6b, power: 3.0, size: 1.10 },
    fact: "La planète rouge. Abrite Olympus Mons, plus haut volcan connu (22 km).",
    mission: { type: "scan", verb: "sample", hold: 4.0, reward: 300,
      title: "Recherche de glace", desc: "Prélevez des échantillons à la surface martienne, indices d'eau ancienne." },
  },
  {
    key: "jupiter", name: "Jupiter", map: TEX + "jupiter.jpg",
    radius: 52, distance: 1850, orbSpeed: 0.0033, rotSpeed: 0.05, tilt: 3.13, color: 0xd2a679,
    fact: "Géante gazeuse. La Grande Tache Rouge est une tempête plus large que la Terre.",
    mission: { type: "scan", verb: "scan", hold: 4.5, reward: 380,
      title: "La Grande Tache Rouge", desc: "Étudiez la tempête géante depuis la haute atmosphère de Jupiter." },
  },
  {
    key: "saturn", name: "Saturne", map: TEX + "saturn.jpg",
    radius: 44, distance: 2520, orbSpeed: 0.0024, rotSpeed: 0.046, tilt: 26.73, color: 0xe3c98f,
    ring: { map: TEX + "saturn_ring.jpg", inner: 52, outer: 96 },
    fact: "Célèbre pour ses anneaux de glace et de roche, larges de 280 000 km.",
    mission: { type: "flythrough", verb: "flythrough", hold: 0, reward: 420, band: 0.55,
      title: "Traversée des anneaux", desc: "Effectuez un passage à travers le plan des anneaux de Saturne." },
  },
  {
    key: "uranus", name: "Uranus", map: TEX + "uranus.jpg",
    radius: 21, distance: 3120, orbSpeed: 0.0017, rotSpeed: -0.032, tilt: 97.77, color: 0x9fe0e6,
    ring: { map: TEX + "uranus_ring.jpg", inner: 26, outer: 38, faint: true, vertical: true },
    fact: "Géante de glaces inclinée à 98° : elle « roule » sur son orbite.",
    mission: { type: "scan", verb: "probe", hold: 4.0, reward: 360,
      title: "Champ magnétique", desc: "Mesurez le champ magnétique étrangement incliné d'Uranus." },
  },
  {
    key: "neptune", name: "Neptune", map: TEX + "neptune.jpg",
    radius: 20, distance: 3680, orbSpeed: 0.0013, rotSpeed: 0.034, tilt: 28.32, color: 0x3a66d6,
    atmosphere: { color: 0x4f7dff, power: 2.6, size: 1.13 },
    fact: "Vents les plus violents du Système Solaire : jusqu'à 2 100 km/h.",
    mission: { type: "scan", verb: "scan", hold: 4.5, reward: 400,
      title: "Tempêtes de Neptune", desc: "Analysez les vents supersoniques de la dernière géante." },
  },
  {
    key: "pluto", name: "Pluton", map: TEX + "pluto.jpg",
    radius: 3.0, distance: 4150, orbSpeed: 0.0009, rotSpeed: 0.008, tilt: 122.5, color: 0xcbb8a0,
    fact: "Planète naine de la ceinture de Kuiper. Frontière de notre voyage.",
    mission: { type: "scan", verb: "scan", hold: 5.0, reward: 500,
      title: "Frontière du système", desc: "Plantez le drapeau de l'expédition aux confins du Système Solaire." },
  },
];

export const SHIP = {
  accel: 130,           // u/s^2 propulsion normale
  boostAccel: 900,      // u/s^2 en postcombustion
  reverse: 90,
  maxSpeed: 280,
  boostMax: 1500,
  damping: 0.18,        // friction arcade par seconde (fraction)
  brakeDamping: 1.6,
  yawRate: 1.15,        // rad/s clavier
  pitchRate: 1.05,
  rollRate: 1.9,
  mouseSens: 0.0022,    // rad/pixel
  start: { distance: 880, offset: { x: 46, y: 16, z: 60 } }, // près de la Terre
  cam: { dist: 17, height: 5.2, lag: 6.5, lookAhead: 9 },
};

// ordre de la campagne : la 1re mission disponible = Terre (point de départ).
export const CAMPAIGN_ORDER = ["earth", "moon", "mars", "venus", "mercury", "jupiter", "saturn", "uranus", "neptune", "pluto"];
