import * as THREE from "three";
import { SUN, PLANETS } from "./config.js";

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
  gl_Position = projectionMatrix * viewMatrix * wp;
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
  float spec = pow(max(dot(N,H),0.0), 30.0) * ocean * clamp(ndl*3.0,0.0,1.0);
  vec3 col = mix(nightC * 1.6, dayC, day);
  col += vec3(0.7,0.85,1.0) * spec * 0.7;
  col *= mix(0.9, 1.12, day);
  gl_FragColor = vec4(col, 1.0);
}`;

const ATMO_VERT = EARTH_VERT;
const ATMO_FRAG = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 glowColor; uniform float power; uniform vec3 sunPos;
varying vec2 vUv; varying vec3 vWorldPos; varying vec3 vWorldNormal;
void main(){
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(sunPos - vWorldPos);
  float rim = pow(1.0 - abs(dot(N, V)), power);
  float lit = clamp(dot(N, L) + 0.35, 0.0, 1.0);
  gl_FragColor = vec4(glowColor, rim * lit);
}`;

const RING_FRAG = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D ringMap; uniform float alphaMul; varying vec2 vUv;
${SRGB2LIN}
void main(){
  #include <logdepthbuf_fragment>
  vec4 c = texture2D(ringMap, vUv);
  float a = clamp((c.r + c.g + c.b) / 3.0 * 1.7, 0.0, 1.0) * alphaMul;
  if (a < 0.02) discard;
  gl_FragColor = vec4(toLin(c.rgb), a);
}`;

function coronaTexture() {
  const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,246,224,1)");
  g.addColorStop(0.2, "rgba(255,228,170,0.85)");
  g.addColorStop(0.45, "rgba(255,180,90,0.35)");
  g.addColorStop(1, "rgba(255,150,60,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
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
  }

  load(onProgress) {
    return new Promise((resolve) => {
      const mgr = new THREE.LoadingManager();
      mgr.onProgress = (_u, a, b) => onProgress && onProgress(a / b);
      mgr.onLoad = () => { this._build(); resolve(this); };
      const loader = new THREE.TextureLoader(mgr);
      const urls = new Set([SUN.map]);
      for (const p of PLANETS)
        for (const k of ["map", "bump", "normal", "spec", "night", "clouds"])
          if (p[k]) urls.add(p[k]);
        // ring + moon maps
      for (const p of PLANETS) { if (p.ring) urls.add(p.ring.map); if (p.moon) urls.add(p.moon.map); }
      for (const u of urls) this.tex[u] = loader.load(u);
    });
  }

  _color(u, srgb = true) { const t = this.tex[u]; if (t) t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t; }

  _build() {
    const scene = this.scene;

    // ---- éclairage ----
    this.sunLight = new THREE.PointLight(SUN.light.color, SUN.light.intensity, 0, 0);
    scene.add(this.sunLight);
    // ambiance « espace » : presque aucune lumière d'appoint -> côtés sombres très noirs
    scene.add(new THREE.AmbientLight(0x14223c, 0.025));

    // ---- Soleil ----
    const sunMat = new THREE.MeshBasicMaterial({ map: this._color(SUN.map), color: new THREE.Color(1.25, 1.15, 0.95) });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN.radius, 64, 48), sunMat);
    scene.add(sun); this.sun = sun;
    const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    corona.scale.setScalar(SUN.radius * 3.5); sun.add(corona); this.corona = corona;
    this.bodies.set("sun", { def: SUN, holder: sun, radius: SUN.radius, getWorldPosition: (v) => v.set(0, 0, 0) });

    // ---- étoiles ----
    this._buildStars();

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

    // nuages (Terre)
    if (def.clouds) {
      const cmat = new THREE.MeshStandardMaterial({
        alphaMap: this._color(def.clouds), color: 0xffffff, transparent: true,
        depthWrite: false, opacity: 0.9, roughness: 1,
      });
      const clouds = new THREE.Mesh(new THREE.SphereGeometry(def.radius * 1.015, 64, 48), cmat);
      tilt.add(clouds); this._clouds.push(clouds);
    }
    // atmosphère
    if (def.atmosphere) {
      const amat = new THREE.ShaderMaterial({
        uniforms: { glowColor: { value: new THREE.Color(def.atmosphere.color) }, power: { value: def.atmosphere.power }, sunPos: { value: new THREE.Vector3() } },
        vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
        transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
      });
      this._atmoMats.push(amat);
      tilt.add(new THREE.Mesh(new THREE.SphereGeometry(def.radius * def.atmosphere.size, 48, 32), amat));
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
      uniforms: { ringMap: { value: this._color(r.map) }, alphaMul: { value: r.faint ? 0.5 : 1.0 } },
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

  _buildStars() {
    // champ d'étoiles discret et lointain (look « ISS » : ciel quasi noir,
    // étoiles ténues qui se noient près de la lumière du Soleil)
    const N = 2400, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const r = 4.0e11 + Math.random() * 3.0e11;
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(th); pos[i * 3 + 1] = r * u; pos[i * 3 + 2] = r * s * Math.sin(th);
      const l = 0.3 + Math.random() * 0.45;
      c.setHSL(0.6, 0.05, l);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 1.1, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  // ---------- boucle ----------
  // À l'échelle réelle, le mouvement orbital ferait « fuir » une planète hors de
  // portée pendant un scan -> orbites figées, mais rotation propre conservée (vivant).
  update(dt) {
    this._t += dt;
    for (const [, b] of this.bodies) {
      const def = b.def;
      if (!def || def.key === "sun" || def.key === "moon") continue;
      const pivot = b.holder.parent;
      const spin = pivot && pivot.userData ? pivot.userData.spin : null;
      if (spin) spin.rotation.y += (def.rotSpeed || 0) * dt;
    }
    for (const cl of this._clouds) cl.rotation.y += 0.006 * dt;
    if (this._moon) this._moon.spin.rotation.y += this._moon.def.rotSpeed * dt;
    if (this.stars) this.stars.rotation.y += 1e-6 * dt;
    if (this.sun) this.sun.rotation.y += 0.006 * dt;
    if (this.corona) this.corona.scale.setScalar(SUN.radius * 3.5 * (0.93 + Math.sin(this._t * 1.5) * 0.05));

    // Soleil à l'origine -> direction de lumière pour les shaders custom
    for (const m of this._earthMats) m.uniforms.sunPos.value.set(0, 0, 0);
    for (const m of this._atmoMats) m.uniforms.sunPos.value.set(0, 0, 0);
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
