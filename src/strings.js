// All player-visible text lives here. Switching language = swapping LANG.
export const STRINGS = {
  fr: {
    loadingSub: "Initialisation des systèmes de navigation…",
    tagline: "Un signal impossible répond depuis les confins du Système Solaire — et il connaît votre nom. Pilotez l'Odyssée, récupérez le message éparpillé sur chaque monde, et découvrez qui appelle avant que le silence ne retombe.",
    startBtn: "DÉCOLLAGE",
    startHint: "La souris pilote, l'horizon se stabilise tout seul. Maintenez Espace pour la distorsion — elle ralentit automatiquement près des astres. ARIA, votre intelligence de bord, vous guidera.",
    freeBtn: "MODE LIBRE",
    freeHint: "Mode libre : aucune mission, aucune histoire. Juste vous, le vaisseau et tout le Système Solaire à explorer.",
    menuBtn: "MENU",
    introLaunchBtn: "DÉCOLLER ▸",
    winReportBtn: "VOIR LE RAPPORT ▸",
    winMessageTag: "MESSAGE RECOMPOSÉ",
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
    winTitle: "SIGNAL RECOMPOSÉ",
    winSub: "Quarante ans de silence, enfin rompus. Le message de Pionnier a été rendu à la Terre — et la porte des étoiles vient de se rouvrir. Bravo, Commandant.",
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
      ["Clic gauche", "TIR — canons à plasma"],
      ["Z / W", "Accélérer"],
      ["S", "Ralentir / reculer"],
      ["Maj", "Postcombustion"],
      ["Espace", "DISTORSION (super-boost)"],
      ["V", "Vue cockpit / poursuite"],
      ["J", "Journal du signal"],
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
