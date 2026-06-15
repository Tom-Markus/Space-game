#!/usr/bin/env bash
# Réduit Three.js vendorisé à la fermeture réellement chargée par le jeu
# (confirmée par les logs du serveur HTTP lors d'un rendu complet avec bloom).
set -euo pipefail
cd /home/user/Space-game

# nettoyage d'éventuels résidus npm à la racine
rm -rf node_modules package.json package-lock.json

# build : ne garder que three.module.js (importé par index.html)
cd vendor/three/build
for f in *; do [ "$f" = "three.module.js" ] || rm -f "$f"; done
cd /home/user/Space-game

# jsm : ne garder que les addons effectivement importés
KEEP_PP="EffectComposer RenderPass UnrealBloomPass OutputPass ShaderPass MaskPass Pass"
KEEP_SH="CopyShader LuminosityHighPassShader OutputShader"
TMP=$(mktemp -d)
mkdir -p "$TMP/postprocessing" "$TMP/shaders"
for n in $KEEP_PP; do cp "vendor/three/jsm/postprocessing/$n.js" "$TMP/postprocessing/"; done
for n in $KEEP_SH; do cp "vendor/three/jsm/shaders/$n.js" "$TMP/shaders/"; done
rm -rf vendor/three/jsm
mkdir -p vendor/three/jsm
mv "$TMP/postprocessing" "$TMP/shaders" vendor/three/jsm/
rmdir "$TMP" 2>/dev/null || true

echo "=== vendor after prune ==="
du -sh vendor
find vendor/three/jsm -type f | sort
echo "=== repo size (excl .git) ==="
du -sh --exclude=.git .
