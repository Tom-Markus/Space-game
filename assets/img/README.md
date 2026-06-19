# 🎨 Assets visuels (Higgsfield) — brief de génération

Le jeu fonctionne **sans** ces images (avatars dessinés en CSS + écran-titre animé).
Mais si tu les génères, le jeu les utilisera **automatiquement** : il suffit de
déposer le fichier ici et d'écrire son nom dans `portraits.json`.

## Comment faire

1. Génère chaque image avec Higgsfield (prompts ci-dessous).
2. Télécharge-la et place-la dans **`assets/img/`** (ce dossier).
3. Ouvre **`portraits.json`** et mets le nom du fichier en face de la bonne clé.
   Exemple : `"aria": "aria.png"`.
4. Commit + push. C'est tout — le jeu l'affiche.

> Tu peux aussi simplement me **coller les URL** des images générées : je m'occupe de les intégrer.

## Les 5 images (prompts prêts à coller)

| Clé | Fichier conseillé | Format | Modèle conseillé | Prompt |
|---|---|---|---|---|
| `keyart` | `keyart.jpg` | **16:9** (1920×1080+) | `soul_location` ou `nano_banana_pro` | *Cinematic sci-fi key art, a lone sleek exploration starship silhouetted against the rings of Saturn at the edge of the solar system, a faint mysterious violet signal pulse coming from deep space beyond Pluto, vast dark void, volumetric god rays, deep blacks with cyan and amber accents, awe and cosmic dread, film-poster composition, ultra detailed, 8k* |
| `aria` | `aria.png` | **1:1** (512²+) | `soul_2` ou `soul_cast` | *Portrait of a benevolent ship AI as a luminous holographic face made of flowing cyan light and data streams, ethereal, semi-transparent, glowing concentric rings, sci-fi HUD aesthetic, dark background, centered, square* |
| `control` | `vasquez.png` | **1:1** | `soul_2` | *Portrait of a calm weathered female mission-control commander in her fifties, headset, dim amber control-room lighting, serious and caring expression, cinematic, dark background, square* |
| `vance` | `vance.png` | **1:1** | `soul_2` | *Ethereal portrait of a warm enigmatic scientist, face half-dissolved into golden light and sound waves, nostalgic and haunting, soft rose-gold tones, a voice from across time, dark background, square* |
| `signal` | `signal.png` | **1:1** | `soul_2` / `nano_banana_pro` | *Abstract eerie cosmic anomaly, a violet glitching sigil of unknown origin, fractal interference patterns, unsettling, deep space, dark background, square, no face* |

## Voix off (étape suivante)

Pour les voix (`generate_audio`, modèle `text2speech_v2_elevenlabs` ou `_minimax`) :
choisis **une voix par personnage** (ARIA — féminine, posée, synthétique douce ;
VASQUEZ — féminine, grave, autoritaire ; LA VOIX — chaleureuse, lointaine, voilée).
Dis-moi les `voice_id` retenus et je te fournis la **liste exacte des répliques à
générer** (avec les noms de fichiers `assets/voice/…`) ; je câblerai ensuite la
lecture synchronisée avec la machine à écrire des dialogues.
