// All player-visible text lives here. Switching language = swapping LANG.
export const STRINGS = {
  fr: {
    loadingSub: "Initialisation des systèmes de navigation…",
    tagline: "Pilotez votre vaisseau à la 3ᵉ personne à travers le Système Solaire et accomplissez une mission scientifique sur chaque astre.",
    startBtn: "DÉCOLLAGE",
    startHint: "Astuce : la souris pilote le vaisseau. Le curseur se verrouille au démarrage (Échap pour le libérer).",
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
      ["Z / W", "Propulsion avant"],
      ["S", "Rétro-propulsion"],
      ["A / D", "Tonneau (roulis)"],
      ["Maj", "Postcombustion (boost)"],
      ["Espace", "Frein inertiel"],
      ["E", "Analyser / Atterrir"],
      ["Flèches", "Tangage / lacet"],
      ["M", "Carte"],
      ["H", "Aide"],
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
