#!/usr/bin/env bash
set -uo pipefail
cd /home/user/Space-game
mkdir -p vendor/three assets/textures
echo "### Installing three.js ###"
npm init -y >/dev/null 2>&1
npm install three@0.160.0 2>&1 | tail -3
cp -r node_modules/three/build vendor/three/build
cp -r node_modules/three/examples/jsm vendor/three/jsm
echo "three build files:"; ls vendor/three/build
echo "### Downloading textures ###"
BASE_TJS=https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets
BASE_TX=https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images
cd assets/textures
dl(){ if curl -sfL --max-time 90 "$1" -o "$2"; then echo "OK   $2 ($(wc -c <"$2") bytes)"; else echo "FAIL $2  <- $1"; fi; }
dl $BASE_TJS/earth_atmos_2048.jpg     earth.jpg
dl $BASE_TJS/earth_clouds_1024.png    earth_clouds.png
dl $BASE_TJS/earth_normal_2048.jpg    earth_normal.jpg
dl $BASE_TJS/earth_specular_2048.jpg  earth_specular.jpg
dl $BASE_TJS/earth_lights_2048.png    earth_lights.png
dl $BASE_TJS/moon_1024.jpg            moon.jpg
dl $BASE_TX/sunmap.jpg                sun.jpg
dl $BASE_TX/mercurymap.jpg            mercury.jpg
dl $BASE_TX/mercurybump.jpg           mercury_bump.jpg
dl $BASE_TX/venusmap.jpg              venus.jpg
dl $BASE_TX/venusbump.jpg             venus_bump.jpg
dl $BASE_TX/marsmap1k.jpg             mars.jpg
dl $BASE_TX/marsbump1k.jpg            mars_bump.jpg
dl $BASE_TX/jupitermap.jpg            jupiter.jpg
dl $BASE_TX/saturnmap.jpg             saturn.jpg
dl $BASE_TX/saturnringcolor.jpg       saturn_ring.jpg
dl $BASE_TX/uranusmap.jpg             uranus.jpg
dl $BASE_TX/uranusringcolour.jpg      uranus_ring.jpg
dl $BASE_TX/neptunemap.jpg            neptune.jpg
dl $BASE_TX/plutomap1k.jpg            pluto.jpg
echo "### Cleaning node_modules ###"
rm -rf node_modules package.json package-lock.json
echo "ALL DONE"
