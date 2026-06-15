// ===================================================================
//  Système Solaire à la VRAIE ÉCHELLE.
//  Référence : le VAISSEAU mesure exactement 100 m de long = 1 unité scène.
//  1 unité = 100 m  ->  1 km = 10 unités (S = 10).  Astres/distances = réel × S.
//  Ex. : diamètre Terre = 12 742 km × 10 = 127 420 u = 127 420 × le vaisseau. ✔
//  Textures : nouvelles cartes "tom_" fournies par l'utilisateur (sauf Soleil/Pluton).
// ===================================================================
const TEX = "./assets/textures/";                       // anciennes (Soleil, Pluton, anneaux couleur)
const NEW = "./assets/textures/nouvelles_textures/";    // nouvelles cartes haute déf.
export const S = 10;
const r = (km) => +(km * S).toFixed(1);
const d = (km) => Math.round(km * S);

export const SUN = {
  name: "Soleil",
  radius: r(696340),
  map: TEX + "sun.jpg",                                 // conservé (sa luminosité masque la texture)
  light: { color: 0xfff4e4, intensity: 4.5 },
  fact: "Étoile naine jaune — 99,86 % de la masse du Système Solaire.",
};

export const PLANETS = [
  {
    key: "mercury", name: "Mercure", map: NEW + "tom_mercury.jpg",
    radius: r(2440), distance: d(57900000), orbSpeed: 0.0118, rotSpeed: 0.0030, tilt: 0.03, color: 0x9c8c7a,
    fact: "La planète la plus proche du Soleil : 430 °C le jour, -180 °C la nuit.",
    mission: { type: "scan", verb: "scan", hold: 3.0, reward: 200,
      title: "Relevé thermique", desc: "Approchez Mercure côté jour et lancez une analyse de surface." },
  },
  {
    key: "venus", name: "Vénus", map: NEW + "tom_venus_atmosphere.jpg",
    radius: r(6052), distance: d(108200000), orbSpeed: 0.0088, rotSpeed: -0.0012, tilt: 177.4, color: 0xd8b87a,
    atmosphere: { color: 0xf3d28c, power: 2.4, size: 1.04 },
    fact: "Rotation rétrograde, 465 °C sous des nuages d'acide sulfurique.",
    mission: { type: "scan", verb: "probe", hold: 3.5, reward: 240,
      title: "Sonde atmosphérique", desc: "Larguez une sonde dans l'épaisse atmosphère de Vénus." },
  },
  {
    key: "earth", name: "Terre", map: NEW + "tom_earth_daymap.jpg",
    night: NEW + "tom_earth_nightmap.jpg", clouds: NEW + "tom_earth_clouds.jpg",
    normal: NEW + "tom_earth_normal_map.jpg", spec: NEW + "tom_earth_specular_map.jpg",
    radius: r(6371), distance: d(149600000), orbSpeed: 0.0075, rotSpeed: 0.03, tilt: 23.44, color: 0x2a6fb0,
    atmosphere: { color: 0x6db8ff, power: 2.6, size: 1.035 },
    fact: "Notre berceau : 71 % de la surface couverte d'océans.",
    moon: { name: "Lune", map: NEW + "tom_moon.jpg", radius: r(1737), distance: d(384400), orbSpeed: 0.02, rotSpeed: 0.01 },
    mission: { type: "scan", verb: "scan", hold: 2.5, reward: 150,
      title: "Calibration orbitale", desc: "Mise en orbite terrestre : calibrez les capteurs avant le grand voyage." },
  },
  {
    key: "moon", name: "Lune", isMoonOf: "earth", map: NEW + "tom_moon.jpg",
    radius: r(1737), color: 0xbfbfbf,
    fact: "Unique satellite naturel de la Terre, criblé de cratères.",
    mission: { type: "land", verb: "land", reward: 220,
      title: "Alunissage", desc: "Posez-vous en douceur à la surface de la Lune." },
  },
  {
    key: "mars", name: "Mars", map: NEW + "tom_mars.jpg",
    radius: r(3390), distance: d(227900000), orbSpeed: 0.0061, rotSpeed: 0.029, tilt: 25.19, color: 0xc1502e,
    atmosphere: { color: 0xff9b6b, power: 3.0, size: 1.03 },
    fact: "La planète rouge : Olympus Mons culmine à 22 km.",
    mission: { type: "scan", verb: "sample", hold: 4.0, reward: 300,
      title: "Recherche de glace", desc: "Prélevez des échantillons à la surface martienne." },
  },
  {
    key: "jupiter", name: "Jupiter", map: NEW + "tom_jupiter.jpg",
    radius: r(69911), distance: d(778500000), orbSpeed: 0.0033, rotSpeed: 0.06, tilt: 3.13, color: 0xd2a679,
    fact: "Géante gazeuse : la Grande Tache Rouge est plus large que la Terre.",
    mission: { type: "scan", verb: "scan", hold: 4.5, reward: 380,
      title: "La Grande Tache Rouge", desc: "Étudiez la tempête géante de Jupiter." },
  },
  {
    key: "saturn", name: "Saturne", map: NEW + "tom_saturn.jpg",
    radius: r(58232), distance: d(1434000000), orbSpeed: 0.0024, rotSpeed: 0.055, tilt: 26.73, color: 0xe3c98f,
    ring: { map: TEX + "saturn_ring.jpg", alpha: NEW + "tom_saturn_ring_alpha.png", inner: r(74500), outer: r(140180) },
    fact: "Ses anneaux de glace s'étendent sur 280 000 km.",
    mission: { type: "flythrough", verb: "flythrough", reward: 420,
      title: "Traversée des anneaux", desc: "Effectuez un passage à travers le plan des anneaux de Saturne." },
  },
  {
    key: "uranus", name: "Uranus", map: NEW + "tom_uranus.jpg",
    radius: r(25362), distance: d(2871000000), orbSpeed: 0.0017, rotSpeed: -0.037, tilt: 97.77, color: 0x9fe0e6,
    ring: { map: TEX + "uranus_ring.jpg", inner: r(38000), outer: r(51000), faint: true, vertical: true },
    fact: "Géante de glaces inclinée à 98° : elle « roule » sur son orbite.",
    mission: { type: "scan", verb: "probe", hold: 4.0, reward: 360,
      title: "Champ magnétique", desc: "Mesurez le champ magnétique incliné d'Uranus." },
  },
  {
    key: "neptune", name: "Neptune", map: NEW + "tom_neptune.jpg",
    radius: r(24622), distance: d(4495000000), orbSpeed: 0.0013, rotSpeed: 0.038, tilt: 28.32, color: 0x3a66d6,
    atmosphere: { color: 0x4f7dff, power: 2.6, size: 1.04 },
    fact: "Vents les plus violents du Système Solaire : 2 100 km/h.",
    mission: { type: "scan", verb: "scan", hold: 4.5, reward: 400,
      title: "Tempêtes de Neptune", desc: "Analysez les vents supersoniques de la dernière géante." },
  },
  {
    key: "pluto", name: "Pluton", map: TEX + "pluto.jpg",
    radius: r(1188), distance: d(5906000000), orbSpeed: 0.0009, rotSpeed: 0.01, tilt: 122.5, color: 0xcbb8a0,
    fact: "Planète naine de la ceinture de Kuiper. Frontière des missions.",
    mission: { type: "scan", verb: "scan", hold: 5.0, reward: 500,
      title: "Frontière du système", desc: "Plantez le drapeau aux confins du Système Solaire." },
  },

  // ---- Planètes naines (bonus, sans mission) — utilisent les nouvelles textures ----
  {
    key: "ceres", name: "Cérès", map: NEW + "tom_ceres.jpg",
    radius: r(473), distance: d(413700000), orbSpeed: 0.0064, rotSpeed: 0.05, tilt: 4, color: 0x9a8f80,
    fact: "Plus gros objet de la ceinture d'astéroïdes, entre Mars et Jupiter.",
  },
  {
    key: "haumea", name: "Hauméa", map: NEW + "tom_haumea.jpg",
    radius: r(816), distance: d(6450000000), orbSpeed: 0.0008, rotSpeed: 0.12, tilt: 28, color: 0xd8d2c8,
    fact: "Planète naine du Kuiper, en forme d'œuf, à la rotation très rapide.",
  },
  {
    key: "makemake", name: "Makémaké", map: NEW + "tom_makemake.jpg",
    radius: r(715), distance: d(6850000000), orbSpeed: 0.0007, rotSpeed: 0.014, tilt: 29, color: 0xc08b6a,
    fact: "Planète naine glacée de la ceinture de Kuiper.",
  },
  {
    key: "eris", name: "Éris", map: NEW + "tom_eris.jpg",
    radius: r(1163), distance: d(10125000000), orbSpeed: 0.0004, rotSpeed: 0.008, tilt: 44, color: 0xcfcabd,
    fact: "Disque des objets épars : aussi massive que Pluton, bien plus lointaine.",
  },
];

// ---- Vaisseau (1 u = 100 m) & pilotage ----
export const SHIP = {
  size: 1,
  cruiseMax: 5000, boostMax: 60000, accel: 5000, decel: 1.4, reverse: 0.5,
  warp: { factor: 0.8, min: 5000, max: 5.0e9, engageDist: 3.0e5, ramp: 2.5 },
  yawRate: 0.85, pitchRate: 0.85, mouseSens: 0.0016, autoLevel: 2.6,
  cam: { dist: 2.6, height: 0.9, lag: 9, lookAhead: 4 },
  startOffsetR: 2.2,
};

export const CAMPAIGN_ORDER = ["earth", "moon", "mars", "venus", "mercury", "jupiter", "saturn", "uranus", "neptune", "pluto"];
export const SCALE = { unitKm: 1 / S };
export const SKYBOX = NEW + "tom_stars_milky_way.jpg";
