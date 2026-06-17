// All player-visible text lives here. Switching language = swapping LANG.
export const STRINGS = {
  fr: {
    loadingSub: "Initialisation des systèmes de navigation…",
    tagline: "Pilotez votre vaisseau à la 3ᵉ personne dans un Système Solaire à l'échelle réelle et accomplissez une mission sur chaque astre. La vitesse de distorsion franchit les distances immenses.",
    startBtn: "DÉCOLLAGE",
    startHint: "La souris pilote, l'horizon se stabilise tout seul. Maintenez Espace pour la distorsion — elle ralentit automatiquement près des astres.",
    qualityTag: "QUALITÉ DES TEXTURES",
    qualityHints: {
      ultra: "8192 px — netteté maximale (~2 Go de VRAM, chargement plus long). Idéal sur PC.",
      high: "4096 px — très bon compromis qualité / performance.",
      perf: "2048 px — chargement rapide, compatible GPU modestes et mobiles.",
    },
    missionTag: "MISSION",
    journalTag: "JOURNAL DE BORD",
    creditsTag: "Crédits",
    speedTag: "VITESSE",
    boostTag: "POSTCOMBUSTION",
    nearTag: "CORPS PROCHE",
    pauseTitle: "PAUSE",
    resumeBtn: "REPRENDRE",
    helpBtn: "COMMANDES",
    winTitle: "MISSION ACCOMPLIE",
    winSub: "Vous avez exploré l'intégralité du Système Solaire. L'humanité vous salue, commandant.",
    restartBtn: "NOUVELLE EXPÉDITION",
    promptHold: (verb, name) => `Maintenez <b>E</b> pour ${verb} ${name}`,
    promptScanning: (pct) => `Analyse en cours… ${pct}%`,
    objComplete: (name) => `Mission accomplie : ${name}`,
    arrived: (name) => `Approche de ${name} — objectif à portée`,
    reward: (c) => `+${c} crédits`,
    nextMission: (name) => `Nouveau cap : ${name}`,
    allDone: "Toutes les missions sont terminées !",
    statTime: "TEMPS",
    statCredits: "CRÉDITS",
    statDist: "DISTANCE",
    distUnit: "Mu", // millions d'unités
    controls: [
      ["Souris", "Orienter le vaisseau"],
      ["Z / W", "Accélérer"],
      ["S", "Ralentir / reculer"],
      ["Maj", "Postcombustion"],
      ["Espace", "DISTORSION (super-boost)"],
      ["E", "Analyser / Atterrir"],
      ["Flèches", "Orienter (alternatif)"],
      ["M / H", "Carte / Aide"],
      ["Échap", "Pause"],
    ],
    verbs: { scan: "analyser", land: "vous poser sur", flythrough: "traverser les anneaux de", probe: "sonder", sample: "prélever sur" },
  },
};

export let LANG = "fr";
export const T = (k) => STRINGS[LANG][k];

export function applyStaticStrings(root = document) {
  root.querySelectorAll("[data-str]").forEach((el) => {
    const v = STRINGS[LANG][el.dataset.str];
    if (typeof v === "string") el.innerHTML = v;
  });
}
