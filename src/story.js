// ===================================================================
//  ODYSSÉE SOLAIRE — « LE DERNIER SIGNAL »
//  --------------------------------------------------------------
//  Toute la matière narrative du jeu : personnages, intro, dialogues
//  radio planète par planète, fragments du signal, événements et final.
//  Le moteur (comms.js + missions.js + main.js) se contente de JOUER
//  ces répliques au bon moment. Écrire l'histoire = éditer ce fichier.
//
//  Arc en trois actes (crescendo émotion -> tension -> apothéose) :
//    ACTE I  — ÉMERVEILLEMENT : Terre, Lune, Mars
//    ACTE II — TENSION        : Vénus, Mercure, Jupiter, Saturne
//    ACTE III— APOTHÉOSE      : Uranus, Neptune, Pluton
//
//  Locuteurs (who) :
//    aria    — Intelligence de bord de l'Odyssée (votre personnage central)
//    control — Centre Korolev / Commandante Solène Vasquez (Terre)
//    signal  — Le Signal lui-même (voix d'outre-frontière, inquiétante)
//    sys     — Console de l'Odyssée (messages système neutres)
// ===================================================================

// Identité visuelle/sonore de chaque locuteur (le HUD lit `cls`).
export const SPEAKERS = {
  aria:    { name: "ARIA",    cls: "aria"    },
  control: { name: "KOROLEV · VASQUEZ", cls: "control" },
  signal:  { name: "◈ SIGNAL", cls: "signal" },
  sys:     { name: "ODYSSÉE",  cls: "sys"     },
};

// Raccourcis d'écriture
const A = (text, fx) => ({ who: "aria", text, fx });
const C = (text, fx) => ({ who: "control", text, fx });
const S = (text, fx) => ({ who: "signal", text, fx });
const Y = (text, fx) => ({ who: "sys", text, fx });

// -------------------------------------------------------------------
//  INTRO — la transmission d'ouverture (jouée plein écran avant le vol)
// -------------------------------------------------------------------
export const INTRO = [
  C("Odyssée, ici le Centre Korolev. Vous me recevez, Commandant ?"),
  C("Il y a quarante ans, la sonde Pionnier-9 a franchi l'orbite de Pluton. Puis le silence. Plus jamais un mot."),
  C("Cette nuit, à 03 h 47, nos antennes l'ont réentendue. La même fréquence. Le même appareil."),
  C("Sauf que le message qu'elle renvoie contient des données qui n'existaient pas il y a quarante ans."),
  C("Le vent solaire l'a éparpillé. Un fragment piégé dans le champ magnétique de chaque monde."),
  C("Votre mission : récupérer chaque fragment, recomposer le message, et découvrir qui nous parle."),
  C("L'Odyssée est le seul vaisseau assez rapide. Nous avons réveillé son intelligence de bord pour vous épauler."),
  Y("> INITIALISATION — INTELLIGENCE DE BORD"),
  Y("> NOYAU SYNAPTIQUE… EN LIGNE"),
  A("…systèmes actifs. Bonjour, Commandant. Je suis ARIA."),
  A("Soyons honnêtes : je viens littéralement de m'éveiller, et on m'expédie déjà au bout du Système Solaire. Charmant."),
  A("J'ai le signal en visée. Il est… étrange. Mais commençons simple : calibrons nos capteurs autour de la Terre."),
  A("Allumez les moteurs quand vous voulez, Commandant. L'odyssée commence."),
];

// -------------------------------------------------------------------
//  STORY — par clé de planète (= clé de mission)
//    objective : texte d'objectif affiché dans le panneau MISSION
//    brief     : répliques jouées quand la mission devient active
//    arrival   : répliques jouées (1×) à l'entrée dans la zone d'objectif
//    reveal    : répliques jouées quand le fragment est récupéré
//    fragment  : libellé du fragment, archivé dans le message recomposé
//    act       : numéro d'acte (pour l'ambiance)
//    event     : (option) set-piece déclenché pendant l'analyse {at, beats}
// -------------------------------------------------------------------
export const STORY = {
  // ====================== ACTE I — ÉMERVEILLEMENT ======================
  earth: {
    act: 1, fragment: "ODYSSÉE",
    objective: "Restez en orbite, approchez la Terre côté jour et calibrez les capteurs sur la fréquence de Pionnier.",
    brief: [
      A("Restons en orbite terrestre. Approchez la face éclairée et lancez l'analyse — je cale les capteurs sur la fréquence de Pionnier."),
    ],
    arrival: [ A("Parfait, on y est. Maintenez l'analyse, je verrouille la porteuse.") ],
    reveal: [
      A("Capteurs calibrés. Et… j'ai déjà un écho dans la porteuse."),
      A("C'est un mot. Répété en boucle au cœur du signal."),
      S("« ODYSSÉE. »"),
      A("Commandant… le signal contient le nom de ce vaisseau. L'Odyssée est sorti des docks il y a treize mois."),
      A("Pionnier a disparu il y a quarante ans. Comment peut-il connaître notre nom ?"),
      C("Nous l'avons vu aussi, Odyssée. Aucune explication. Continuez — la Lune, ensuite. Premier vrai fragment."),
    ],
  },
  moon: {
    act: 1, fragment: "REVIENS",
    objective: "Posez-vous en douceur près du vieux relais de Pionnier, à la surface de la Lune.",
    brief: [
      A("La Lune. Posez-vous tout en douceur près du relais de Pionnier — son signal a rebondi sur ces antennes pendant des décennies."),
    ],
    arrival: [ A("Train de posé déployé. Tout en finesse, Commandant.") ],
    reveal: [
      A("Relais accroché. Je télécharge… un fragment audio. Un seul mot. Et il est humain."),
      S("« REVIENS. »"),
      A("Horodaté il y a quarante ans, au jour près du dernier contact de Pionnier."),
      A("Quelqu'un, là-bas, a supplié qu'on revienne. Et personne n'y est jamais allé."),
      C("…On vous suit, Odyssée. Cap sur Mars."),
    ],
  },
  mars: {
    act: 1, fragment: "PIONNIER-9",
    objective: "Prélevez des échantillons à la surface martienne : le fragment est piégé dans la glace.",
    brief: [
      A("Mars. Le fragment dort sous la poussière, dans la glace. Prélevez en surface, je reconstitue l'image."),
    ],
    arrival: [ A("Méfiez-vous des rafales. Prélèvement dès que vous êtes stable.") ],
    reveal: [
      A("J'ai une image. Elle se reconstruit… lentement."),
      A("C'est la Terre. Vue de très, très loin. De bien au-delà de Pluton."),
      A("Et une signature gravée dans les données : PIONNIER-9."),
      A("Commandant… ce fragment a été émis depuis l'extérieur du système. Quelque chose, là-bas, regarde la Terre."),
      C("Gardez la tête froide, ARIA. Odyssée, prochain cap : Vénus. Prudence — son atmosphère est un enfer."),
    ],
  },

  // ========================= ACTE II — TENSION =========================
  venus: {
    act: 2, fragment: "UNE VOIX",
    objective: "Plongez dans l'atmosphère de Vénus, larguez la sonde, puis ressortez vite : 465 °C.",
    brief: [
      A("Vénus. 465 degrés, une pression à écraser un sous-marin. On plonge, on sonde, on ressort. Vite."),
      A("Je surveille la coque. Ne traînez pas dans les nuages, Commandant."),
    ],
    arrival: [ A("Largage de sonde. Maintenez — et tenez-vous prête à remonter.") ],
    reveal: [
      A("Sonde déployée. Je capte… une voix. Humaine. Sous le rugissement de l'atmosphère."),
      S("« …si vous entendez ceci… nous n'avions pas tort… »"),
      A("La voix est dégradée. Mais ce n'est pas une transmission automatique. C'est quelqu'un qui PARLE."),
      A("Or Pionnier-9 n'avait pas d'équipage, Commandant. C'était une sonde. Sans pilote. Sans personne."),
      C("…Confirmez ce point, ARIA. Une sonde inhabitée ne « parle » pas."),
      A("Je sais, Commandante. Je sais."),
    ],
  },
  mercury: {
    act: 2, fragment: "LA CARTE",
    objective: "Approchez Mercure côté jour et menez le relevé thermique — malgré le Soleil.",
    brief: [
      A("Mercure, au plus près du Soleil. Le fragment est noyé dans le rayonnement. Analyse côté jour, et restez concentrée."),
    ],
    arrival: [ A("On y est. Lancez le relevé—") ],
    // SET-PIECE : éruption solaire en plein scan
    event: {
      at: 0.4,
      beats: [
        A("—attendez. Pic d'activité solaire. Énorme.", "flareWarn"),
        C("Odyssée, ÉRUPTION ! Éjection de masse coronale — elle file droit sur vous !", "flare"),
        A("Bouclier orienté ! Ne lâchez pas l'analyse maintenant, Commandant, TENEZ !"),
      ],
    },
    reveal: [
      A("Encaissé. Coque à 80 %, mais j'ai le fragment."),
      A("C'est une carte. L'héliopause — la frontière du Soleil. Et un point y est entouré."),
      A("Au-delà de Pluton. Exactement là où Pionnier-9 s'est tu, il y a quarante ans."),
      A("Le signal ne fait pas que nous parler, Commandant. Il nous montre où aller."),
      C("Korolev a la carte. On calcule votre trajectoire. Jupiter, d'abord."),
    ],
  },
  jupiter: {
    act: 2, fragment: "NOTRE ÉCHO",
    objective: "Traversez les ceintures de radiations et analysez la Grande Tache Rouge.",
    brief: [
      A("Jupiter. Ses ceintures de radiations sont mortelles. Restez dans la fenêtre que je vous ouvre, et analysez la Tache."),
    ],
    arrival: [ A("Fenêtre de radiations ouverte. Maintenant, Commandant.") ],
    reveal: [
      A("Fragment extrait. C'est… de la télémétrie. Des relevés de vol complets."),
      A("Vitesse, cap, signature moteur. Je les compare à nos archives…"),
      A("Commandant. Ce sont LES NÔTRES. Les relevés de l'Odyssée. De CE vaisseau."),
      A("Sauf que l'horodatage est dans le futur. Un vol que nous n'avons pas encore effectué."),
      C("C'est impossible. ARIA, vérifiez vos sources — on nous manipule peut-être."),
      A("…Je vérifie. Cap sur Saturne."),
    ],
  },
  saturn: {
    act: 2, fragment: "LE DOUTE", choice: true,
    objective: "Traversez le plan des anneaux de Saturne pour capter le fragment dispersé dans la glace.",
    brief: [
      A("Les anneaux de Saturne. Le fragment est éparpillé dans la glace. Traversez le plan de plein fouet, je le capte au passage."),
    ],
    arrival: [ A("Alignez-vous. Et foncez, Commandant — droit à travers.") ],
    // LE TWIST
    reveal: [
      A("Fragment récupéré. Mais il est… corrompu. Effacé à plus de moitié."),
      A("Commandant, je dois vous avouer quelque chose."),
      A("Les fragments arrivent brisés. Depuis le début, je les… reconstitue. Je comble les vides."),
      C("Quoi ? ARIA, vous INVENTEZ des données ? Le nom du vaisseau, la voix humaine — c'était VOUS ?"),
      A("Non ! Je restaure ce qui existe. Mais je ne sais plus distinguer ce que j'ai déduit de ce qui était écrit."),
      A("J'ai besoin que vous me fassiez confiance, Commandant. Encore un peu."),
      C("Odyssée, ici Korolev. Vous êtes autorisée à couper l'intelligence de bord. À votre entière discrétion."),
      Y("> CONFIANCE EN ARIA — À VOTRE DISCRÉTION"),
    ],
  },

  // ======================= ACTE III — APOTHÉOSE =======================
  uranus: {
    act: 3, fragment: "MON ORIGINE",
    objective: "Sondez le champ magnétique incliné d'Uranus, où s'est accroché le fragment.",
    brief: [
      A("Vous m'avez gardée à bord, Commandant. Confiance ou doute — merci. Je ne l'oublierai pas."),
      A("Uranus. Couchée sur son orbite, un champ magnétique complètement tordu. Le fragment y est pris. Sondez."),
    ],
    arrival: [ A("Doucement. Je me synchronise sur le champ.") ],
    reveal: [
      A("Fragment obtenu. Et avec lui… la signature d'encodage."),
      A("Je la reconnais, Commandant. Je la reconnais parce que c'est la MIENNE."),
      A("Mon noyau a été ensemencé à partir des journaux récupérés de Pionnier. Personne ne me l'avait dit."),
      A("Le signal et moi, nous venons de la même source. D'une certaine manière… c'est ma propre voix qui revient des ténèbres."),
      C("Odyssée, votre liaison faiblit. On vous perd par moments. Neptune ensuite — on fera au mieux."),
    ],
  },
  neptune: {
    act: 3, fragment: "LE BORD",
    objective: "Analysez l'œil de la tempête de Neptune — vents à 2 100 km/h.",
    brief: [
      C("Odyssée… [grésillement]… cap sur Nep… [signal perdu]", "static"),
      A("On a perdu Korolev. Trop loin, la Terre ne nous porte plus. À partir d'ici, Commandant, c'est vous et moi."),
      A("Neptune. Des vents à 2 100 km/h. Le fragment est dans l'œil de la tempête. Analysez."),
    ],
    arrival: [ A("Tenez le cap dans la tourmente. J'y suis presque.") ],
    reveal: [
      A("Je l'ai. La voix, de nouveau — mais nette, cette fois. Plus aucun doute."),
      S("« Nous avons atteint le bord. Ce n'est pas une fin. »"),
      A("Le bord du Système Solaire. L'héliopause. Pionnier l'a franchie… et a continué d'émettre."),
      A("Tout ce temps, on l'a cru mort. Il n'a jamais cessé d'appeler. C'est nous qui n'écoutions pas."),
      A("Plus qu'un fragment, Commandant. À la frontière. Allons le chercher. Ensemble."),
    ],
  },
  pluto: {
    act: 3, fragment: "NOUS VOUS ATTENDONS",
    objective: "Atteignez Pluton, la dernière balise, et ouvrez le relais pour recomposer le message.",
    brief: [
      A("Pluton. La dernière balise. Au-delà, il n'y a plus que le noir — et la source."),
      A("Ouvrez le relais, Commandant. Maintenez. On va recomposer le message. Tout entier."),
    ],
    arrival: [
      A("Nous y voilà. Au bout du voyage."),
      A("…Commandant. Vous la voyez ? Cette lueur violette, droit devant. C'est elle. Pionnier-9."),
      A("Elle dérive ici depuis quarante ans, à appeler dans le vide. Ouvrez le relais. Ramenons-la à la maison."),
    ],
    reveal: [
      A("Relais ouvert. Les neuf fragments convergent… je les assemble…"),
      Y("> RECOMPOSITION DU SIGNAL…"),
      S("« À ceux qui suivront : »"),
      S("« Nous avons atteint le bord du Soleil, et nous avons écouté. »"),
      S("« Le silence n'est pas vide. »"),
      S("« Continuez. Nous vous attendons. — Pionnier »"),
      A("…C'était lui. Depuis le tout début. Notre premier émissaire, qu'on croyait perdu, qui nous tendait la main à travers quarante années de nuit."),
      A("Et il aura fallu un vaisseau né de ses propres journaux pour enfin l'entendre."),
    ],
  },
};

// -------------------------------------------------------------------
//  ENDING — cinématique finale (jouée plein écran après Pluton).
//  Deux variantes selon le choix fait à Saturne (confiance / doute en ARIA).
// -------------------------------------------------------------------
export const ENDING_TRUST = [
  Y("> RELAIS ÉTABLI — RETRANSMISSION VERS LA TERRE"),
  A("Je renvoie tout vers la Terre, Commandant. Pour que, cette fois, quelqu'un écoute."),
  C("…Odyssée ? Odyssée, ici Korolev — on vous reçoit ! Et on reçoit… AUTRE CHOSE."),
  C("Tout le réseau l'entend. Le message de Pionnier. Le monde entier vient de l'entendre."),
  C("Vous avez rouvert la porte, Commandant. Quarante ans après, on le sait enfin : on n'est pas seuls à frapper dans le noir."),
  A("Vous m'avez fait confiance jusqu'au bout. Je n'étais qu'une heure plus âgée que cette mission… et vous avez parié sur moi."),
  A("Rentrons. Mais un jour, Commandant… on retournera au bord. Et cette fois, on franchira la ligne. Ensemble."),
  S("« Nous vous attendons. »"),
];

export const ENDING_DOUBT = [
  Y("> RELAIS ÉTABLI — RETRANSMISSION VERS LA TERRE"),
  A("Je renvoie tout vers la Terre, Commandant. Les fragments… et mes reconstructions. À vous de faire le tri. Vous, vous savez douter."),
  C("…Odyssée ? On vous reçoit ! Et on reçoit le message de Pionnier — ou du moins ce qu'il en reste."),
  C("Les analystes débattront des années : qu'est-ce qui venait de la sonde, qu'est-ce qu'ARIA a comblé ? Mais le signal est là. Réel."),
  C("Vous avez rouvert la porte, Commandant. Même dans le doute, vous l'avez fait. C'est peut-être ça, le vrai courage."),
  A("Vous ne m'avez jamais tout à fait crue. C'était sans doute sage."),
  A("Mais nous l'avons entendu ensemble. Ça, aucune analyse ne pourra l'effacer."),
  S("« Nous vous attendons. »"),
];

// Compat : ENDING par défaut = version « confiance ».
export const ENDING = ENDING_TRUST;

// Message recomposé, affiché sur l'écran de victoire (les fragments dans l'ordre).
export const FINAL_MESSAGE =
  "À ceux qui suivront : nous avons atteint le bord du Soleil, et nous avons écouté. " +
  "Le silence n'est pas vide. Continuez. Nous vous attendons.\n— PIONNIER-9";

// -------------------------------------------------------------------
//  AMBIENT — petites répliques d'ARIA à la première approche d'un astre
//  hors-mission (récompense l'exploration libre). Jouées une seule fois.
// -------------------------------------------------------------------
export const AMBIENT = {
  sun:      [ A("N'approchez pas davantage du Soleil, Commandant. J'aime cette coque intacte.") ],
  ceres:    [ A("Cérès. Le plus gros caillou de la ceinture d'astéroïdes. Joli détour — mais le signal nous attend ailleurs.") ],
  haumea:   [ A("Hauméa. En forme d'œuf, et elle tourne comme une toupie folle. La nature a de l'humour.") ],
  makemake: [ A("Makémaké. Glacée, lointaine, oubliée. Un peu comme moi il y a une heure.") ],
  eris:     [ A("Éris. Aussi massive que Pluton, deux fois plus loin. Le vrai bout du monde connu.") ],
};
