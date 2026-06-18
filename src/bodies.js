import * as THREE from "three";
import { SUN, PLANETS, SKYBOX, S } from "./config.js";

// ---------- petits shaders réutilisés ----------
const SRGB2LIN = `vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }`;

const EARTH_VERT = `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv; varying vec3 vWorldPos; varying vec3 vWorldNormal;
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position,1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  // gl_Position via modelViewMatrix (précalculé en double précision côté CPU) :
  // évite le tremblement dû à la perte de précision float32 aux distances réelles.
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  #include <logdepthbuf_vertex>
}`;
const EARTH_FRAG = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D specMap; uniform vec3 sunPos;
varying vec2 vUv; varying vec3 vWorldPos; varying vec3 vWorldNormal;
${SRGB2LIN}
void main(){
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(sunPos - vWorldPos);
  float ndl = dot(N, L);
  float day = smoothstep(-0.08, 0.30, ndl);
  vec3 dayC = toLin(texture2D(dayMap, vUv).rgb);
  vec3 nightC = toLin(texture2D(nightMap, vUv).rgb);
  float ocean = texture2D(specMap, vUv).r;
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 H = normalize(L + V);
  // spéculaire océan : Blinn-Phong étroit, contribution modérée -> pas de « brûlure »
  float spec = pow(max(dot(N,H),0.0), 80.0) * ocean * clamp(ndl*3.0,0.0,1.0);
  vec3 col = mix(nightC * 1.4, dayC, day);
  col += vec3(0.7,0.85,1.0) * spec * 0.28;
  col *= mix(0.92, 1.04, day);
  gl_FragColor = vec4(col, 1.0);
}`;

// Atmosphère ANALYTIQUE (intersection rayon/sphère) plutôt qu'un fondu basé sur
// la normale (qui bandait sur le maillage et disparaissait de près). Pour chaque
// pixel on reconstruit le vrai rayon de vue et on mesure la longueur de la corde
// traversée DANS la couche d'atmosphère, bornée par la surface de la planète.
// -> halo parfaitement lisse, qui épouse le limbe, se fond dans le vide, et qui
//    reste visible (et éclaircit le ciel) quand on entre dans l'atmosphère.
const ATMO_VERT = `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec4 vClip;
void main(){
  vClip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vClip;
  #include <logdepthbuf_vertex>
}`;
// Tout est calculé dans le repère CENTRÉ sur la planète : camRel (= position
// caméra - centre planète) et sunDir sont pré-soustraits côté CPU en double
// précision. Indispensable à l'échelle réelle (centres à ~1e9 u) : sinon la
// soustraction en float32 dans le shader détruit la normale (jour/nuit faux).
const ATMO_FRAG = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 glowColor; uniform vec3 camRel; uniform vec3 sunDir;
uniform float planetR; uniform float atmoR; uniform float scaleH; uniform float density;
uniform mat4 projInv; uniform mat4 viewInv;
varying vec4 vClip;
// intersections rayon/sphère centrée à l'origine : (tNear, tFar) ; x>y si raté
vec2 raySphere(vec3 ro, vec3 rd, float R){
  float b = dot(ro, rd);
  float c = dot(ro, ro) - R * R;
  float disc = b * b - c;
  if (disc < 0.0) return vec2(1.0, -1.0);
  float s = sqrt(disc);
  return vec2(-b - s, -b + s);
}
void main(){
  #include <logdepthbuf_fragment>
  // rayon de vue EXACT reconstruit depuis la caméra (indépendant du maillage)
  // -> aucune facette/bande, même de très près ou depuis l'intérieur.
  // NB : on reconstruit sur le plan PROCHE (ndc.z = -1). Au plan lointain (z=+1)
  // le w de l'inverse vaut ~0 à cette échelle (far = 1e12) -> Inf/NaN en float32.
  vec2 ndc = vClip.xy / vClip.w;
  vec4 vp = projInv * vec4(ndc, -1.0, 1.0);
  vec3 viewDir = normalize(vp.xyz / vp.w);
  vec3 rd = normalize((viewInv * vec4(viewDir, 0.0)).xyz);
  vec3 ro = camRel;                       // origine = centre de la planète

  vec2 ta = raySphere(ro, rd, atmoR);
  if (ta.x > ta.y) discard;
  float near = max(ta.x, 0.0);            // si on est DANS l'atmosphère, on part de la caméra
  float far = ta.y;
  // la planète opaque arrête le rayon : on ne compte pas l'atmosphère derrière elle
  vec2 tp = raySphere(ro, rd, planetR);
  if (tp.x <= tp.y && tp.x > 0.0) far = min(far, tp.x);
  if (far <= near) discard;

  // DENSITÉ EXPONENTIELLE : rho ~ exp(-altitude/H). On évalue au point le plus bas
  // du rayon (le périapse), borné au segment visible. Comme exp() tend vers 0 en
  // douceur, l'atmosphère se FOND progressivement dans l'espace (pas de bord net) ;
  // à ~12·H (≈ ligne de Kármán pour la Terre) la densité est déjà ~0.
  float tP = clamp(-dot(ro, rd), near, far);
  vec3 pP = ro + rd * tP;
  float hP = max(length(pP) - planetR, 0.0);          // altitude minimale du rayon
  // colonne traversée façon Chapman : largeur gaussienne sqrt(2π·r·H) au limbe,
  // tronquée à la portion réellement parcourue dans l'atmosphère (segment visible).
  float gw = sqrt(6.2832 * (planetR + hP) * scaleH);
  float pathFrac = 1.0 - exp(-(far - near) / gw);     // 0..1 (fraction de colonne)
  float colDens = exp(-hP / scaleH) * pathFrac;        // ~1 au ras du sol, ->0 en altitude
  float glow = 1.0 - exp(-density * colDens);           // opacité (Beer-Lambert), fondu doux

  // éclairage jour/nuit au périapse + diffusion vers l'avant + teinte au terminateur
  vec3 Nl = normalize(pP);
  float ndl = dot(Nl, sunDir);
  float day = smoothstep(-0.25, 0.25, ndl);
  float forward = pow(clamp(dot(rd, sunDir) * 0.5 + 0.5, 0.0, 1.0), 3.0);
  float dusk = smoothstep(0.15, 0.8, 1.0 - abs(ndl)) * day;

  vec3 col = glowColor;
  col = mix(col, glowColor * vec3(1.5, 0.85, 0.55) + vec3(0.06, 0.015, 0.0), dusk * 0.6);
  col += glowColor * forward * day * 0.4;

  float a = day * glow * (0.8 + 0.4 * forward);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}`;

const RING_FRAG = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D ringMap; uniform sampler2D alphaMap; uniform float useAlpha; uniform float alphaMul; varying vec2 vUv;
${SRGB2LIN}
void main(){
  #include <logdepthbuf_fragment>
  vec4 c = texture2D(ringMap, vUv);
  float a = (useAlpha > 0.5 ? texture2D(alphaMap, vUv).r : clamp((c.r + c.g + c.b) / 3.0 * 1.7, 0.0, 1.0)) * alphaMul;
  if (a < 0.02) discard;
  gl_FragColor = vec4(toLin(c.rgb), a);
}`;

const SKY_VERT = `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  #include <logdepthbuf_vertex>
}`;
const SKY_FRAG = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D map; uniform float bright; uniform float contrast; uniform float satur; uniform vec3 tint;
varying vec2 vUv;
void main(){
  #include <logdepthbuf_fragment>
  vec3 c = texture2D(map, vUv).rgb;
  c = pow(max(c, 0.0), vec3(2.2));                 // sRGB -> linéaire
  c = pow(max(c, 0.0), vec3(contrast));            // contraste : ciel profond, bande qui ressort
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, satur);                      // saturation
  c *= bright * tint;
  gl_FragColor = vec4(c, 1.0);
}`;

// Dégradé radial doux et haute résolution (anti-banding) pour les halos lumineux.
// Le dégradé descend à 0 bien avant le bord du canvas (rayon utile ~46%) — combiné
// à mipmaps désactivés + clampToEdge, cela évite tout liseré carré sous le bloom.
function glowTexture(stops, s = 512) {
  const cv = document.createElement("canvas"); cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, s, s);
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
// Cœur dense et chaud autour du disque solaire (dégradé qui s'éteint avant le bord).
const SUN_CORE = [
  [0.00, "rgba(255,251,238,1.0)"], [0.08, "rgba(255,245,214,0.92)"],
  [0.20, "rgba(255,221,158,0.55)"], [0.34, "rgba(255,186,104,0.22)"],
  [0.48, "rgba(255,156,74,0.07)"], [0.62, "rgba(255,140,60,0.015)"],
  [0.78, "rgba(255,140,60,0.0)"], [1.0, "rgba(255,140,60,0.0)"],
];
// Halo externe très diffus (toujours rond — reste visible et lisse à grande distance).
const SUN_HALO = [
  [0.00, "rgba(255,247,224,0.45)"], [0.12, "rgba(255,232,184,0.22)"],
  [0.28, "rgba(255,204,138,0.085)"], [0.46, "rgba(255,180,104,0.025)"],
  [0.62, "rgba(255,166,88,0.006)"], [0.78, "rgba(255,160,80,0.0)"], [1.0, "rgba(255,160,80,0.0)"],
];
function makeGlowSprite(stops) {
  // depthWrite false + depthTest true : le halo se fond autour du disque et reste
  // occulté par un corps opaque qui passerait devant le Soleil (éclipse), tout en
  // s'affichant par-dessus la skybox (dessiné dans la passe transparente, après elle).
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(stops), blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false,
  }));
}

export class SolarSystem {
  constructor(scene) {
    this.scene = scene;
    this.bodies = new Map();     // key -> {def,holder,radius,getWorldPosition}
    this.tex = {};
    this._earthMats = [];
    this._atmoMats = [];
    this._clouds = [];
    this._tmp = new THREE.Vector3();
    this._t = 0;
    this.maxAniso = 8;                       // filtrage anisotrope (netteté aux angles rasants)
  }

  load(onProgress) {
    return new Promise((resolve) => {
      const mgr = new THREE.LoadingManager();
      mgr.onProgress = (_u, a, b) => onProgress && onProgress(a / b);
      mgr.onLoad = () => { this._build(); resolve(this); };
      const loader = new THREE.TextureLoader(mgr);
      const urls = new Set([SUN.map, SKYBOX]);
      for (const p of PLANETS)
        for (const k of ["map", "bump", "normal", "spec", "night", "clouds"])
          if (p[k]) urls.add(p[k]);
      for (const p of PLANETS) {
        if (p.ring) { urls.add(p.ring.map); if (p.ring.alpha) urls.add(p.ring.alpha); }
        if (p.moon) urls.add(p.moon.map);
      }
      for (const u of urls) this.tex[u] = loader.load(u);
    });
  }

  _color(u, srgb = true) { const t = this.tex[u]; if (t) { t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = this.maxAniso; } return t; }

  _build() {
    const scene = this.scene;

    // ---- éclairage ----
    this.sunLight = new THREE.PointLight(SUN.light.color, SUN.light.intensity, 0, 0);
    scene.add(this.sunLight);
    // ambiance « espace » : presque aucune lumière d'appoint -> côtés sombres très noirs
    scene.add(new THREE.AmbientLight(0x14223c, 0.025));

    // ---- Soleil ----
    const sunMat = new THREE.MeshBasicMaterial({ map: this._color(SUN.map), color: new THREE.Color(1.0, 0.92, 0.78) });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN.radius, 64, 48), sunMat);
    scene.add(sun); this.sun = sun;
    // halo solaire en deux couches : un cœur dense + un voile diffus.
    const core = makeGlowSprite(SUN_CORE); core.scale.setScalar(SUN.radius * 3.2);
    const halo = makeGlowSprite(SUN_HALO); halo.scale.setScalar(SUN.radius * 9.0);
    sun.add(halo); sun.add(core);
    this.sunGlow = { core, halo };
    this.bodies.set("sun", { def: SUN, holder: sun, radius: SUN.radius, getWorldPosition: (v) => v.set(0, 0, 0) });

    // ---- fond galactique (Voie lactée) ----
    this._buildSkybox();

    // ---- planètes ----
    for (const def of PLANETS) {
      if (def.isMoonOf) continue;            // la Lune est construite avec la Terre
      this._buildPlanet(def);
    }
  }

  _buildPlanet(def) {
    const pivot = new THREE.Group();
    pivot.rotation.y = Math.random() * Math.PI * 2;        // phase orbitale
    this.scene.add(pivot);
    const holder = new THREE.Group(); holder.position.x = def.distance; pivot.add(holder);
    const tilt = new THREE.Group(); tilt.rotation.z = THREE.MathUtils.degToRad(def.tilt || 0); holder.add(tilt);

    const seg = def.radius > 300 ? 128 : def.radius > 50 ? 96 : 64;
    const geo = new THREE.SphereGeometry(def.radius, seg, Math.round(seg / 2));
    let mesh;
    if (def.key === "earth") {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: this._color(def.map, false) },
          nightMap: { value: this._color(def.night, false) },
          specMap: { value: this._color(def.spec, false) },
          sunPos: { value: new THREE.Vector3(0, 0, 0) },
        },
        vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG,
      });
      this._earthMats.push(mat);
      mesh = new THREE.Mesh(geo, mat);
    } else {
      const mat = new THREE.MeshStandardMaterial({
        map: this._color(def.map), roughness: 0.95, metalness: 0.0,
      });
      if (def.bump) { mat.bumpMap = this._color(def.bump, false); mat.bumpScale = 0.4; }
      mesh = new THREE.Mesh(geo, mat);
    }
    tilt.add(mesh);
    pivot.userData.spin = mesh; pivot.userData.def = def;

    // nuages (Terre) : dérivent nettement plus vite que le sol (météo visible)
    if (def.clouds) {
      const cmat = new THREE.MeshStandardMaterial({
        alphaMap: this._color(def.clouds), color: 0xffffff, transparent: true,
        depthWrite: false, opacity: 0.92, roughness: 1, metalness: 0,
      });
      // couche nuageuse ~4 km (altitude typique) : 1 + 4/6371 ≈ 1.0006
      const clouds = new THREE.Mesh(new THREE.SphereGeometry(def.radius * 1.0006, 96, 64), cmat);
      tilt.add(clouds);
      // décalage clair par rapport à la rotation propre de la planète -> dérive perceptible
      const drift = (def.rotSpeed || 0) + 0.018;
      this._clouds.push({ mesh: clouds, speed: drift });
    }
    // atmosphère : densité exponentielle (exp(-altitude/H)) -> fondu doux vers
    // l'espace. La coque va jusqu'à ~12·H (≈ Kármán) où la densité est ~nulle.
    // BackSide -> reste rendue (et éclaircit le ciel) quand la caméra entre dedans.
    if (def.atmosphere) {
      const a = def.atmosphere;
      const Hu = (a.H || 8.5) * S;            // hauteur d'échelle en unités scène
      const atmoR = def.radius + 12 * Hu;     // sommet géométrique (~ligne de Kármán)
      const amat = new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(a.color) },
          camRel: { value: new THREE.Vector3() },
          sunDir: { value: new THREE.Vector3() },
          planetR: { value: def.radius },
          atmoR: { value: atmoR },
          scaleH: { value: Hu },
          density: { value: a.density != null ? a.density : 2.0 },
          projInv: { value: new THREE.Matrix4() },
          viewInv: { value: new THREE.Matrix4() },
        },
        vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
        transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
      });
      this._atmoMats.push({ mat: amat, key: def.key });
      const atmo = new THREE.Mesh(new THREE.SphereGeometry(atmoR, 64, 48), amat);
      atmo.renderOrder = 3;                  // dessiné après la surface et les nuages
      tilt.add(atmo);
    }
    // anneaux
    if (def.ring) this._buildRing(def, tilt);

    this.bodies.set(def.key, { def, holder, radius: def.radius, getWorldPosition: (v) => holder.getWorldPosition(v) });

    // ---- Lune (avec la Terre) ----
    if (def.moon) {
      const moonDef = PLANETS.find((p) => p.key === "moon") || {};
      const mpivot = new THREE.Group(); holder.add(mpivot);
      mpivot.rotation.y = Math.random() * Math.PI * 2;
      const mholder = new THREE.Group(); mholder.position.x = def.moon.distance; mpivot.add(mholder);
      const mr = def.moon.radius;
      const mmesh = new THREE.Mesh(new THREE.SphereGeometry(mr, 48, 32),
        new THREE.MeshStandardMaterial({ map: this._color(def.moon.map), roughness: 1, metalness: 0 }));
      mholder.add(mmesh);
      this.bodies.set("moon", { def: moonDef, holder: mholder, radius: mr, getWorldPosition: (v) => mholder.getWorldPosition(v) });
      this._moon = { pivot: mpivot, spin: mmesh, def: def.moon };
    }
  }

  _buildRing(def, parent) {
    const r = def.ring, segs = 160;
    const geo = new THREE.RingGeometry(r.inner, r.outer, segs, 4);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const rad = v.length();
      uv.setXY(i, (rad - r.inner) / (r.outer - r.inner), 0.5);
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ringMap: { value: this._color(r.map) },
        alphaMap: { value: this._color(r.alpha || r.map, false) },
        useAlpha: { value: r.alpha ? 1 : 0 },
        alphaMul: { value: r.faint ? 0.5 : 1.0 },
      },
      vertexShader: `#include <common>
        #include <logdepthbuf_pars_vertex>
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: RING_FRAG, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;          // dans le plan équatorial
    if (r.vertical) ring.rotation.x = 0;     // Uranus : anneaux quasi verticaux
    parent.add(ring);
  }

  _orbitLine(radius, parent = this.scene, color = 0x2c4a66, opacity = 0.35) {
    const pts = [], N = 256;
    for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)); }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
    parent.add(line);
  }

  _buildSkybox() {
    // Voie lactée réelle, retravaillée par shader : ciel profond + bande galactique
    // contrastée et colorée, léger halo (bloom) sur le cœur. Suit la caméra (à l'infini).
    const tex = this._color(SKYBOX, false);
    if (!tex) return;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex },
        bright: { value: 1.85 },
        contrast: { value: 1.4 },
        satur: { value: 1.6 },
        tint: { value: new THREE.Color(0.92, 0.95, 1.08) },   // ciel légèrement froid
      },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(5.0e11, 96, 48), this.skyMat);
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
  }

  // ---------- boucle ----------
  // À l'échelle réelle, le mouvement orbital ferait « fuir » une planète hors de
  // portée pendant un scan -> orbites figées, mais rotation propre conservée (vivant).
  update(dt, camera) {
    this._t += dt;
    for (const [, b] of this.bodies) {
      const def = b.def;
      if (!def || def.key === "sun" || def.key === "moon") continue;
      const pivot = b.holder.parent;
      const spin = pivot && pivot.userData ? pivot.userData.spin : null;
      if (spin) spin.rotation.y += (def.rotSpeed || 0) * dt;
    }
    for (const cl of this._clouds) cl.mesh.rotation.y += cl.speed * dt;
    if (this._moon) this._moon.spin.rotation.y += this._moon.def.rotSpeed * dt;
    if (this.stars) this.stars.rotation.y += 1e-6 * dt;
    if (this.sun) this.sun.rotation.y += 0.006 * dt;
    // halo solaire : pulsation douce + taille angulaire minimale gardée à toute distance
    // (le voile reste rond et visible de très loin au lieu de devenir un bloom carré).
    if (this.sunGlow && camera) {
      const d = Math.max(camera.position.length(), SUN.radius);   // Soleil à l'origine
      const pulse = 0.97 + Math.sin(this._t * 1.5) * 0.03;
      // Taille proportionnelle au disque solaire vu : grandit légèrement avec la
      // distance pour rester visible, mais reste TOUJOURS proche du diamètre apparent
      // -> jamais une « grosse boule » carrée bloomée loin du Soleil.
      const coreMin = SUN.radius * 2.6, haloMin = SUN.radius * 6.0;
      const coreD = d * 0.025, haloD = d * 0.065;
      this.sunGlow.core.scale.setScalar(Math.max(coreMin, coreD) * pulse);
      this.sunGlow.halo.scale.setScalar(Math.max(haloMin, haloD) * pulse);
    }

    // Soleil à l'origine -> direction de lumière pour les shaders custom
    for (const m of this._earthMats) m.uniforms.sunPos.value.set(0, 0, 0);
  }

  // Uniformes des atmosphères, calculés en double précision côté CPU et juste
  // AVANT le rendu (caméra à jour, pas de retard d'une frame) :
  //  - matrices caméra -> rayon de vue exact (anti-banding)
  //  - camRel/sunDir dans le repère centré sur la planète -> jour/nuit précis.
  syncAtmosphere(camera) {
    if (!this._atmoMats.length) return;
    camera.updateMatrixWorld();
    for (const { mat, key } of this._atmoMats) {
      const b = this.bodies.get(key);
      if (!b) continue;
      b.getWorldPosition(this._tmp);                       // centre planète (monde)
      const u = mat.uniforms;
      u.projInv.value.copy(camera.projectionMatrixInverse);
      u.viewInv.value.copy(camera.matrixWorld);
      u.camRel.value.subVectors(camera.position, this._tmp);   // caméra relative au centre
      u.sunDir.value.copy(this._tmp).multiplyScalar(-1).normalize();  // vers le Soleil (origine)
    }
  }

  // distance à la surface du corps le plus proche (pilote la distorsion + le HUD)
  nearestSurface(pos) {
    let bd = Infinity, bk = null, bb = null;
    for (const [key, b] of this.bodies) {
      b.getWorldPosition(this._tmp);
      const dsurf = pos.distanceTo(this._tmp) - b.radius;
      if (dsurf < bd) { bd = dsurf; bk = key; bb = b; }
    }
    return { dist: Math.max(0, bd), key: bk, body: bb };
  }

  // util : position monde + rayon d'un corps
  worldPos(key, out) { const b = this.bodies.get(key); return b ? b.getWorldPosition(out) : out.set(0, 0, 0); }
  radiusOf(key) { const b = this.bodies.get(key); return b ? b.radius : 1; }
}
