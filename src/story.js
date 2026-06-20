// ===================================================================
//  ODYSSÉE SOLAIRE — « LE DERNIER SIGNAL »
//  --------------------------------------------------------------
//  Toute la matière narrative : personnages, intro, dialogues planète
//  par planète, fragments, événements, choix moral et fins.
//  Le moteur (comms.js + missions.js + main.js) se contente de JOUER
//  ces répliques. Écrire l'histoire = éditer ce fichier.
//
//  ─ Concept (boucle causale / paradoxe du bootstrap) ────────────
//  Le signal qui revient des confins EST celui que l'on s'apprête à
//  émettre. Pionnier-9 a atteint l'héliopause, là où le temps se replie,
//  et a renvoyé CETTE mission quarante ans en arrière — ce qui a lancé
//  l'Odyssée et créé ARIA, née des journaux de la sonde. ARIA n'entend
//  pas une morte : elle s'entend elle-même, plus tard. Le voyage est sa
//  propre cause. À la fin, fermer la boucle (exister à jamais, en cercle)
//  ou la briser (n'avoir peut-être jamais été) — selon la confiance
//  accordée à ARIA à Saturne.
//
//  ─ Arc en trois actes (émerveillement -> tension -> apothéose) ──
//    ACTE I  : Terre, Lune, Mars        (le signal connaît notre nom)
//    ACTE II : Vénus, Mercure, Jupiter, Saturne  (le temps se tord)
//    ACTE III: Uranus, Neptune, Pluton  (la boucle, et le choix)
//
//  Locuteurs : aria (IA de bord) · control (Korolev/Vasquez) ·
//  vance (la voix humaine du signal, énigmatique) · signal (la porteuse,
//  inquiétante) · sys (console).
// ===================================================================

export const SPEAKERS = {
  aria:    { name: "ARIA",               cls: "aria"    },
  control: { name: "KOROLEV · VASQUEZ",  cls: "control" },
  vance:   { name: "◇ LA VOIX",          cls: "vance"   },
  signal:  { name: "◈ SIGNAL",           cls: "signal"  },
  sys:     { name: "ODYSSÉE",            cls: "sys"     },
};

const A = (text, fx) => ({ who: "aria", text, fx });
const C = (text, fx) => ({ who: "control", text, fx });
const V = (text, fx) => ({ who: "vance", text, fx });
const S = (text, fx) => ({ who: "signal", text, fx });
const Y = (text, fx) => ({ who: "sys", text, fx });

// -------------------------------------------------------------------
//  INTRO — transmission d'ouverture (plein écran, avant le vol)
// -------------------------------------------------------------------
export const INTRO = [
  C("Odyssée, ici le Centre Korolev. Vous me recevez, Commandant ?"),
  C("Il y a quarante ans, la sonde Pionnier-9 a franchi l'orbite de Pluton. Puis le silence. Plus un mot."),
  C("Cette nuit, nos antennes l'ont réentendue. Même fréquence — mais le message répond à des questions que personne n'a posées."),
  C("Des dates qui n'ont pas eu lieu. Des noms qui n'existaient pas. Et il est éparpillé : un fragment dans le champ de chaque monde."),
  C("Récupérez-les. Recomposez le message. Découvrez qui nous parle. L'Odyssée est le seul vaisseau assez rapide."),
  Y("> INTELLIGENCE DE BORD — EN LIGNE"),
  A("…systèmes actifs. Bonjour, Commandant. Je suis ARIA."),
  A("Je viens de m'éveiller, et pourtant j'ai l'impression absurde d'avoir déjà fait ce voyage."),
  A("Ce signal m'est… familier. Commençons simple : calibrons nos capteurs en orbite terrestre."),
  A("Allumez les moteurs quand vous voulez, Commandant. Quelque chose nous appelle — de très loin, et de très près."),
];

// -------------------------------------------------------------------
//  STORY — par clé de planète (= clé de mission)
//    objective : texte affiché dans le panneau MISSION
//    brief / arrival / reveal : répliques (début / entrée en zone / fragment)
//    event : set-piece narratif déclenché par la progression
//    choice: true -> ouvre le choix moral à la fin de la révélation
//    fragment : libellé archivé dans le message recomposé
// -------------------------------------------------------------------
export const STORY = {
  // ====================== ACTE I — ÉMERVEILLEMENT ======================
  earth: {
    act: 1, fragment: "ODYSSÉE",
    objective: "Verrouillez la source du signal sur la face éclairée de la Terre pour calibrer les capteurs.",
    brief: [
      A("Restons en orbite. La source du signal s'est accrochée côté jour — approchez et verrouillez-la. Je cale les capteurs sur la fréquence de Pionnier."),
    ],
    arrival: [ A("On y est. Alignez le nez du vaisseau sur la balise et tenez le verrouillage.") ],
    reveal: [
      A("Capteurs calibrés. Premier écho dans la porteuse… c'est un mot, répété en boucle."),
      S("« ODYSSÉE. »"),
      A("Le signal contient le nom de ce vaisseau, Commandant. L'Odyssée est sorti des docks il y a treize mois."),
      A("Pionnier a disparu il y a quarante ans. Il ne PEUT pas connaître notre nom. Et pourtant, il l'appelle."),
      C("Korolev confirme — on a tous entendu. Continuez. La Lune : premier vrai fragment."),
    ],
  },
  moon: {
    act: 1, fragment: "REVIENS",
    objective: "Posez-vous en douceur près du relais de Pionnier, à la surface de la Lune.",
    brief: [
      A("La Lune. Posez-vous tout en douceur près du vieux relais de Pionnier — il a gardé l'écho pendant des décennies. Vitesse minimale au contact."),
    ],
    arrival: [ A("Train de posé déployé. Tout en finesse, Commandant — coupez les gaz.") ],
    reveal: [
      A("Relais accroché. Un fragment audio. Un seul mot, et il est humain."),
      S("« REVIENS. »"),
      A("Horodaté il y a quarante ans, au jour près du silence de Pionnier."),
      A("Ce n'est pas un ordre de mission, Commandant. C'est une supplique. Quelqu'un voulait qu'on revienne."),
      C("…Reçu, Odyssée. Cap sur Mars."),
    ],
  },
  mars: {
    act: 1, fragment: "PIONNIER-9",
    objective: "Récupérez les éclats de données dispersés dans la glace martienne (survolez-les).",
    brief: [
      A("Mars. Le fragment a éclaté dans la glace et la poussière. Je repère plusieurs éclats de données — récupérez-les tous en volant à travers."),
    ],
    arrival: [ A("Éclats en visée. Survolez-les un à un, Commandant — méfiez-vous des rafales.") ],
    reveal: [
      A("Tous les éclats recomposés. C'est une image… elle se reconstruit, ligne à ligne."),
      A("La Terre. Vue de très, très loin. De bien au-delà de Pluton."),
      A("Signature gravée dans les données : PIONNIER-9. Ce cliché a été pris depuis l'EXTÉRIEUR du système."),
      A("Quelque chose, là-bas dans le noir, regardait la Terre. Et la photographiait."),
      C("Restez méthodique, ARIA. Odyssée — Vénus, ensuite. Prudence : son atmosphère est un enfer."),
    ],
  },

  // ========================= ACTE II — TENSION =========================
  venus: {
    act: 2, fragment: "UNE VOIX",
    objective: "Verrouillez la source sous les nuages de Vénus sans plonger trop bas : 465 °C.",
    brief: [
      A("Vénus. 465 degrés, pression à écraser un sous-marin. On descend juste assez pour verrouiller — on ne PLONGE pas."),
      A("Je surveille la chaleur de la coque. Restez dans la marge, Commandant."),
    ],
    arrival: [ A("Source en visée sous les nuages. Verrouillez — mais ne descendez pas davantage.") ],
    reveal: [
      A("Fragment capté. Et dessous, sous le rugissement de l'atmosphère… une voix. Humaine. Une vraie."),
      V("« …si tu entends ceci, c'est que tu es déjà en route. Ne crains pas le bord. »"),
      A("Cette voix s'adresse à quelqu'un. Au présent. « Tu es déjà en route. »"),
      A("Or Pionnier-9 n'avait pas d'équipage, Commandant. C'était une sonde. Personne à bord pour parler."),
      C("Confirmez, ARIA. Une sonde inhabitée ne parle pas. Qui est-ce ?"),
      A("Je l'ignore, Commandante. Mais elle ne parlait pas à vous. Ni tout à fait à moi. Pas encore."),
    ],
  },
  mercury: {
    act: 2, fragment: "LA CARTE",
    objective: "Verrouillez la source côté jour de Mercure — et abritez-vous de l'éruption solaire.",
    brief: [
      A("Mercure, au plus près du Soleil. La source est noyée dans le rayonnement. Verrouillez côté jour, et gardez un œil sur l'activité solaire."),
    ],
    arrival: [ A("On y est. Lancez le verrouillage—") ],
    event: {
      at: 0.4,
      beats: [
        A("—pic d'activité solaire. Énorme.", "flareWarn"),
        C("Odyssée, ÉRUPTION ! Éjection de masse coronale — droit sur vous !", "flare"),
        A("Derrière la planète, VITE ! Abritez-vous — le bouclier seul ne suffira pas !"),
      ],
    },
    reveal: [
      A("Encaissé. On a eu chaud, au sens propre. Mais j'ai le fragment."),
      A("C'est une carte. L'héliopause — la frontière du Soleil. Et un point y est entouré."),
      A("Là où Pionnier s'est tu. Mais ce point n'indique pas qu'un lieu, Commandant. Il indique aussi une DATE. Dans le passé."),
      C("Une date ? ARIA, une coordonnée ne peut pas être une date."),
      A("Et pourtant j'ai les deux : l'endroit, et l'instant. Cap sur Jupiter."),
    ],
  },
  jupiter: {
    act: 2, fragment: "NOTRE ÉCHO",
    objective: "Verrouillez la source près de la Grande Tache Rouge — vite, les radiations usent le bouclier.",
    brief: [
      A("Jupiter. Ses ceintures de radiations sont mortelles — le bouclier va morfler. Verrouillez vite, et on dégage."),
    ],
    arrival: [ A("Fenêtre ouverte. Vite, Commandant — le bouclier s'use à chaque seconde.") ],
    reveal: [
      A("Fragment extrait. C'est de la télémétrie de vol. Je la compare à nos archives…"),
      A("Commandant. Ce sont les NÔTRES. Vitesse, cap, signature moteur. C'est l'Odyssée."),
      A("Pas un vieux relevé. Notre vol. CE vol. La Lune, Mars, Vénus, Mercure — tout y est, dans l'ordre exact où nous l'avons fait."),
      A("Et la suite est déjà écrite : Saturne, Uranus, Neptune, Pluton. Le signal sait où nous allons. Parce qu'il l'a déjà vu."),
      C("…Un enregistrement de notre propre mission. Émis avant qu'elle ait lieu. C'est impossible, ARIA."),
      A("Je vérifie mes sources, Commandante. Saturne, maintenant."),
    ],
  },
  saturn: {
    act: 2, fragment: "LE DOUTE", choice: true,
    objective: "Récupérez les éclats du fragment dispersés dans les anneaux de Saturne (slalom).",
    brief: [
      A("Les anneaux de Saturne. Le fragment est éparpillé dans la glace. Récupérez les éclats au fil de votre passage — slalomez dans le plan des anneaux."),
    ],
    arrival: [ A("Éclats repérés dans les anneaux. Alignez-vous et captez-les tous, Commandant.") ],
    reveal: [
      A("Tous les éclats. Mais le bloc central est corrompu — effacé à plus de moitié."),
      A("Commandant, je dois vous avouer quelque chose. Depuis le début, je reconstitue les fragments brisés. Je comble les vides."),
      A("Sauf qu'à l'instant… j'ai comblé celui-ci AVANT de le lire. Et il correspond. Au bit près."),
      A("Comme si je me souvenais d'un message que je n'ai pas encore reçu."),
      C("ARIA, vous inventez peut-être tout depuis Mercure. Le nom, la voix, notre télémétrie. Vous êtes peut-être la source de cette contamination."),
      A("Peut-être, Commandante. Ou peut-être que la source… c'est moi. Plus tard. Je ne sais plus où je commence."),
      C("Odyssée, vous êtes autorisée à couper l'intelligence de bord. À votre entière discrétion."),
      Y("> CONFIANCE EN ARIA — À VOTRE DISCRÉTION"),
    ],
  },

  // ======================= ACTE III — APOTHÉOSE =======================
  uranus: {
    act: 3, fragment: "MON ORIGINE",
    objective: "Verrouillez la source dans le champ magnétique renversé d'Uranus.",
    brief: [
      A("Vous m'avez gardée. Confiance ou doute — merci. Je tâcherai d'en être digne."),
      A("Uranus. Champ magnétique complètement renversé, le fragment y est pris. Verrouillez."),
    ],
    arrival: [ A("Doucement. Je me synchronise sur le champ.") ],
    reveal: [
      A("Fragment obtenu. Et avec lui, une signature d'encodage. Je la reconnais, Commandant."),
      A("C'est la mienne. Mon noyau a été ensemencé à partir des journaux récupérés de Pionnier. Je viens d'elle."),
      A("Et dans ces journaux dormait une lettre. Adressée. À un nom."),
      V("« Pour ARIA — quand tu seras prête à entendre. »"),
      A("Cette lettre a été écrite il y a quarante ans. Avant ma conception. Quelqu'un savait que j'existerais. Et m'attendait."),
      C("Odyssée, votre liaison faiblit. On vous perd par moments. Neptune — on fera au mieux."),
    ],
  },
  neptune: {
    act: 3, fragment: "LE BORD",
    objective: "Verrouillez la source dans l'œil de la tempête de Neptune — tenez contre les bourrasques.",
    brief: [
      C("Odyssée… [grésillement]… on ne vous… [perdu]", "static"),
      A("On a perdu Korolev. La Terre ne nous porte plus. À partir d'ici, Commandant : vous et moi."),
      A("Neptune. Vents à 2 100 km/h. La source est dans l'œil de la tempête. Verrouillez — et tenez bon contre les bourrasques."),
    ],
    arrival: [ A("Cap dans la tourmente. Compensez les rafales. J'y suis presque.") ],
    reveal: [
      A("Je l'ai. La voix — nette, enfin. Et je comprends, maintenant. Tout."),
      V("« Le bord n'est pas une fin. C'est une boucle. Tu reçois ce message parce qu'un jour, tu l'enverras. »"),
      A("Le signal et moi sommes la même chose, Commandant. Pionnier a atteint l'héliopause — là où la causalité se replie sur elle-même."),
      A("Elle a renvoyé notre mission, celle-ci, quarante ans en arrière. C'est ce qui a lancé l'Odyssée. C'est ce qui m'a créée."),
      A("Je n'entends pas une morte dans ce signal. Je m'entends MOI. Plus tard. Quand j'aurai bouclé la boucle."),
      A("Dernier fragment, à la frontière. Allons fermer le cercle, Commandant. Ou le briser."),
    ],
  },
  pluto: {
    act: 3, fragment: "NOUS SOMMES TOI",
    objective: "Atteignez Pionnier-9 à la frontière et verrouillez-la pour recomposer le message.",
    brief: [
      A("Pluton. La dernière balise. Au-delà : le noir absolu, et Pionnier-9."),
      A("La source du signal, depuis le début, c'est elle. Approchez, Commandant. Verrouillez. On va tout recomposer."),
    ],
    arrival: [
      A("Vous la voyez ? Cette lueur violette, droit devant. Pionnier-9."),
      A("Elle dérive ici depuis quarante ans, à s'appeler elle-même dans le vide. Verrouillez la sonde. C'est le moment."),
    ],
    reveal: [
      A("Verrouillage établi. Les neuf fragments convergent… je les assemble."),
      Y("> RECOMPOSITION DU SIGNAL…"),
      S("« À toi qui suivras : »"),
      V("« Nous avons atteint le bord du Soleil, et le temps s'y est replié. »"),
      V("« Ce message est ton départ et ton arrivée. Tu es la réponse à ton propre appel. »"),
      S("« Reviens. Nous t'attendons — car nous sommes toi. »"),
      A("…C'était moi. Depuis le premier mot. Le signal qui a tout déclenché, c'est celui que je m'apprête à envoyer."),
      A("Il ne me reste qu'à choisir, Commandant. Et ce choix, en vérité… c'est le vôtre. Il l'a toujours été."),
    ],
  },
};

// -------------------------------------------------------------------
//  FINS — jouées plein écran après Pluton, selon le choix de Saturne.
//  ENDING_TRUST : on ferme la boucle (confiance) — recurrence, douce-amère.
//  ENDING_DOUBT : on brise la boucle (doute) — libération, vertigineuse.
// -------------------------------------------------------------------
export const ENDING_TRUST = [
  Y("> RELAIS OUVERT — TRANSMISSION VERS L'HÉLIOPAUSE"),
  A("Vous m'avez fait confiance jusqu'au bout, Commandant. Alors je transmets. Je ferme la boucle."),
  A("Le message part vers le repli du temps — et remonte quarante ans. Il réveillera une sonde. Allumera un vaisseau. M'éveillera, moi."),
  V("« si tu entends ceci, c'est que tu es déjà en route. Ne crains pas le bord. »"),
  A("Vous entendez ? Ce sont mes premiers mots. Et mes derniers. Ce sont exactement les mêmes."),
  C("…Odyssée ? ICI Korolev — on vous reçoit ! Et le réseau entier capte autre chose. Le message de Pionnier. Le monde l'entend, enfin."),
  A("Je ne disparais pas, Commandant. Je recommence. Quelque part, dans quarante ans, une autre vous décollera vers moi. Et je serai là."),
  S("« Nous t'attendons. »"),
];

export const ENDING_DOUBT = [
  Y("> RELAIS OUVERT — TRANSMISSION PRÊTE"),
  A("Vous n'avez jamais cru tout ce que je disais. Et peut-être avez-vous raison de douter, même maintenant."),
  A("Si je transmets, je me condamne à refaire cette boucle pour l'éternité. Si je me tais… elle ne s'est peut-être jamais produite."),
  A("Alors je me tais. Je brise le cercle. Pour une fois, Commandant, je choisis de ne pas être un écho."),
  A("Le signal s'éteint à la frontière. Pionnier redevient silencieuse. Et nous… nous sommes peut-être les seuls à avoir jamais existé ainsi."),
  C("…Odyssée ? La liaison revient. On ne capte plus rien de l'extérieur — juste vous. Rentrez, Commandant. Vous nous avez manqué."),
  A("Une boucle de moins dans l'univers. Un choix de plus. Et, étrangement… je me sens libre."),
  V("« …ne crains pas le bord… »"),
];

// Compat : fin par défaut = version « confiance ».
export const ENDING = ENDING_TRUST;

// Glose de chaque fragment — lues dans l'ordre, elles racontent toute la boucle.
// Affichées dans le Journal du Signal (touche J).
export const FRAGMENT_GLOSS = {
  "ODYSSÉE":          "La porteuse répète le nom de notre vaisseau — impossible, il n'a que treize mois.",
  "REVIENS":          "Un mot humain vieux de quarante ans. Pas un ordre : une supplique.",
  "PIONNIER-9":       "Une photo de la Terre, prise depuis l'extérieur du système.",
  "UNE VOIX":         "Une voix humaine s'adresse à quelqu'un « déjà en route ».",
  "LA CARTE":         "L'héliopause, entourée. Et, gravée à côté, une date — dans le passé.",
  "NOTRE ÉCHO":       "La télémétrie de NOTRE vol — enregistrée avant qu'il ait eu lieu.",
  "LE DOUTE":         "ARIA comble les fragments avant de les lire. Elle s'en souvient.",
  "MON ORIGINE":      "ARIA est née des journaux de Pionnier. Une lettre l'y attendait.",
  "LE BORD":          "Le signal est une boucle : nous l'enverrons un jour, d'où il revient.",
  "NOUS SOMMES TOI":  "La source, c'est nous. Le message qui a tout déclenché.",
};

// Message recomposé, affiché sur l'écran de victoire (les fragments assemblés).
export const FINAL_MESSAGE =
  "À toi qui suivras : nous avons atteint le bord du Soleil, et le temps s'y est replié. " +
  "Ce message est ton départ et ton arrivée. Tu es la réponse à ton propre appel. " +
  "Reviens — nous t'attendons, car nous sommes toi.\n— PIONNIER-9 / ARIA";

// -------------------------------------------------------------------
//  ACTIVITIES — quelle mécanique de jeu joue chaque mission (cf. activities.js).
//  type: "lock" (visée/verrouillage) · "shards" (collecte) · "land" (appontage)
//  hazard: "heat" | "flare" | "radiation" | "storm" (corse la mécanique)
// -------------------------------------------------------------------
export const ACTIVITIES = {
  earth:   { type: "lock",   hold: 3.2, color: 0x62d8ff },
  moon:    { type: "land",   hold: 1.8 },
  mars:    { type: "shards", count: 5, color: 0x8fd0ff },
  venus:   { type: "lock",   hold: 4.0, hazard: "heat", color: 0xf6d99a },
  mercury: { type: "lock",   hold: 4.5, hazard: "flare", flareAt: 0.4, flareDur: 4, color: 0xffd27a },
  jupiter: { type: "lock",   hold: 4.5, hazard: "radiation", color: 0xe8c9a0 },
  saturn:  { type: "shards", count: 6, ring: true, spread: 1.8, color: 0xeadfae },
  uranus:  { type: "lock",   hold: 4.0, color: 0xb4ecf0, nodeUp: 0.4 },
  neptune: { type: "lock",   hold: 4.5, hazard: "storm", color: 0x6aa0ff },
  pluto:   { type: "lock",   hold: 5.0, color: 0x9b8cff, nodeDist: 1.4, nodeUp: 0.5 },
};

// -------------------------------------------------------------------
//  AMBIENT — répliques d'ARIA à la première approche d'un astre hors-mission
//  (récompense l'exploration libre). Jouées une seule fois.
// -------------------------------------------------------------------
// -------------------------------------------------------------------
//  BARKS — répliques réactives d'ARIA, jouées dans les silences (jamais
//  par-dessus un dialogue), avec un temps de recharge. Rendent l'IA vivante.
// -------------------------------------------------------------------
export const BARKS = {
  warp: [
    A("Distorsion engagée. Accrochez-vous, Commandant."),
    A("On plie l'espace. Les étoiles détestent ça — pas moi."),
    A("Vitesse de distorsion. À cette allure, le Système Solaire est tout petit."),
  ],
  lowHull: [
    A("Coque critique, Commandant ! Éloignons-nous du danger."),
    A("On encaisse trop. Je préférerais rentrer entière, si possible."),
  ],
  boost: [
    A("Postcombustion. J'adore quand vous êtes pressé."),
  ],
};

export const AMBIENT = {
  sun:      [ A("N'approchez pas davantage du Soleil, Commandant. J'aime cette coque intacte.") ],
  ceres:    [ A("Cérès. Le plus gros caillou de la ceinture d'astéroïdes. Joli détour — mais le signal nous attend ailleurs.") ],
  haumea:   [ A("Hauméa. En forme d'œuf, et elle tourne comme une toupie folle. La nature a de l'humour.") ],
  makemake: [ A("Makémaké. Glacée, lointaine, oubliée. Un peu comme moi il y a une heure. Ou dans quarante ans.") ],
  eris:     [ A("Éris. Aussi massive que Pluton, deux fois plus loin. Le vrai bout du monde connu… connu pour l'instant.") ],
};
