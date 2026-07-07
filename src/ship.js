import * as THREE from "three";
import { SHIP } from "./config.js";
import { SETTINGS } from "./settings.js";

const WORLD_UP = new THREE.Vector3(0, 1, 0);

// ---- couleurs des réacteurs selon le mode de poussée ----
const FX_COL = {
  cruiseHot: new THREE.Color(0xeafdff), cruiseTip: new THREE.Color(0x2ea6ff),
  boostHot: new THREE.Color(0xfff0cf), boostTip: new THREE.Color(0xff5e16),
  warpHot: new THREE.Color(0xffffff), warpTip: new THREE.Color(0xab6bff),
};

// ---- flamme de réacteur : dégradé longitudinal + scintillement (shader) ----
const PLUME_VERT = `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}`;
const PLUME_FRAG = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 colHot; uniform vec3 colTip; uniform float opacity; uniform float time; uniform float taper;
varying vec2 vUv;
void main(){
  #include <logdepthbuf_fragment>
  float along = clamp(vUv.y, 0.0, 1.0);                       // 0 = tuyère, 1 = pointe
  float body = pow(1.0 - along, taper);                       // dégradé chaud -> éteint
  float flick = 0.80 + 0.20 * sin(time * 47.0 + along * 16.0) * sin(time * 29.0 + 1.3);
  vec3 col = mix(colHot, colTip, pow(along, 0.65));
  gl_FragColor = vec4(col, body * opacity * flick);
}`;

// ---- écrans MFD du cockpit : interfaces dessinées sur canvas ----
function mfdTexture(kind) {
  const W = 256, H = 160, cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const CYAN = "#62d8ff", AMBER = "#ffc24d", GREEN = "#62ffb0", DIM = "rgba(98,216,255,.28)";
  // fond + cadre + très léger quadrillage
  ctx.fillStyle = "#050f17"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(98,216,255,.35)"; ctx.lineWidth = 2; ctx.strokeRect(3, 3, W - 6, H - 6);
  ctx.strokeStyle = "rgba(98,216,255,.07)"; ctx.lineWidth = 1;
  for (let x = 16; x < W; x += 16) { ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, H - 4); ctx.stroke(); }
  for (let y = 16; y < H; y += 16) { ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(W - 4, y); ctx.stroke(); }
  ctx.font = "9px ui-monospace, monospace";

  if (kind === "nav") {                                  // radar circulaire + échos
    const cx = W / 2, cy = H / 2 + 6, R = 56;
    ctx.strokeStyle = DIM;
    for (const f of [1, 0.66, 0.33]) { ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    ctx.fillStyle = "rgba(98,216,255,.12)";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, -0.5, 0.35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = CYAN;
    for (const [bx, by] of [[-22, -30], [30, -12], [12, 26], [-35, 18]]) { ctx.fillRect(cx + bx, cy + by, 3, 3); }
    ctx.fillStyle = AMBER; ctx.fillRect(cx + 40, cy - 34, 4, 4);
    ctx.fillStyle = CYAN; ctx.fillText("NAV · PROX", 10, 16);
    ctx.fillStyle = "rgba(220,235,255,.7)"; ctx.fillText("R 200k", W - 52, 16);
  } else if (kind === "adi") {                           // horizon artificiel + cap
    const cy = H / 2 + 8;
    ctx.strokeStyle = "rgba(98,216,255,.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, cy); ctx.lineTo(W - 30, cy); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = DIM;
    for (const off of [-32, -16, 16, 32]) {
      const w = Math.abs(off) === 32 ? 26 : 44;
      ctx.beginPath(); ctx.moveTo(W / 2 - w, cy + off); ctx.lineTo(W / 2 + w, cy + off); ctx.stroke();
      ctx.fillStyle = DIM; ctx.fillText(String(Math.abs(off) / 3.2 | 0), W / 2 + w + 4, cy + off + 3);
    }
    ctx.fillStyle = AMBER;
    ctx.beginPath(); ctx.moveTo(W / 2, cy - 6); ctx.lineTo(W / 2 - 8, cy + 7); ctx.lineTo(W / 2 + 8, cy + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = CYAN; ctx.fillText("ADI · ATT", 10, 16);
    ctx.fillStyle = "rgba(220,235,255,.85)"; ctx.font = "bold 13px ui-monospace, monospace";
    ctx.fillText("000 · 12.4", W / 2 - 34, 26);
  } else {                                               // systèmes : barres verticales
    const bars = [["PWR", 0.86, CYAN], ["SHD", 0.72, CYAN], ["THR", 0.55, AMBER], ["O2", 0.93, GREEN], ["RCS", 0.64, GREEN]];
    bars.forEach(([label, v, col], i) => {
      const x = 26 + i * 44, y0 = H - 34, hMax = 88;
      ctx.fillStyle = "rgba(98,216,255,.10)"; ctx.fillRect(x, y0 - hMax, 16, hMax);
      ctx.fillStyle = col; ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y0 - hMax * v, 16, hMax * v);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(220,235,255,.7)"; ctx.fillText(label, x - 2, y0 + 14);
    });
    ctx.fillStyle = CYAN; ctx.fillText("SYS · ÉNERGIE", 10, 16);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// petit halo radial réutilisé (lueur de tuyère)
function radialGlowTexture(s = 128) {
  const cv = document.createElement("canvas"); cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(cv);
}

export class Ship {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();          // transform (jamais mis à l'échelle)
    this.speed = 0;                          // vitesse signée le long du cap
    this.boosting = false; this.warping = false;
    this.warpAmount = 0; this.throttleVis = 0;
    this.velocity = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._c = new THREE.Vector3(); this._to = new THREE.Vector3();
    this._prevPos = new THREE.Vector3(); this._camTmp = new THREE.Vector3();
    this._Rd = new THREE.Vector3(); this._Ud = new THREE.Vector3();
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion();
    this._baseFov = 60; this._t = 0; this._collided = false;
    this._bank = 0;                          // inclinaison visuelle en virage
    this.clearance = SHIP.size * 1.6;
    this._build();
    scene.add(this.group);
  }

  _build() {
    const model = new THREE.Group(); this.model = model;
    // Métallisme/rugosité modérés : sans environnement réfléchi, un metalness élevé donne
    // une coque noire sauf face au Soleil où elle « brûle ». Réglages plus mats = plus réaliste.
    const hull = new THREE.MeshStandardMaterial({ color: 0xb8c2d2, metalness: 0.35, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x252c39, metalness: 0.3, roughness: 0.7 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xff7a1f, metalness: 0.2, roughness: 0.55, emissive: 0x3a1500, emissiveIntensity: 0.4 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0a2546, metalness: 0.4, roughness: 0.18, emissive: 0x1f64b0, emissiveIntensity: 0.5 });
    this.glow = new THREE.MeshBasicMaterial({ color: 0x7fe6ff, toneMapped: false });
    const nozTex = radialGlowTexture();

    // --- fuselage : profil révolutionné lisse (nez vers -z, tuyères vers +z) ---
    // longueur ≈ 6 u de base ; model.scale = size/6 -> ≈ 1 u = 100 m.
    const prof = [
      [0.02, 0.0], [0.32, 0.22], [0.45, 0.85], [0.54, 1.8], [0.575, 2.7],
      [0.55, 3.6], [0.45, 4.4], [0.31, 5.1], [0.14, 5.7], [0.0, 6.0],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const fuse = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), hull);
    fuse.rotation.x = -Math.PI / 2;       // axe le long de z, nez vers -z
    fuse.position.z = 2.5;                 // nez ≈ -3.5, queue ≈ +2.5
    model.add(fuse);

    // bandes de coque (accent orange) le long du dos
    for (const sx of [-0.22, 0.22]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 3.4), trim);
      st.position.set(sx, 0.42, -0.6); model.add(st);
    }
    // quille ventrale
    const keel = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.32, 2.6), dark);
    keel.position.set(0, -0.46, 0.5); model.add(keel);
    // pointe de nez sombre (capteur)
    const noseTip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7, 14), dark);
    noseTip.rotation.x = -Math.PI / 2; noseTip.position.z = -3.7; model.add(noseTip);

    // --- cockpit / verrière ---
    const cab = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), glass);
    cab.rotation.x = -Math.PI / 2.1; cab.position.set(0, 0.33, -1.5); cab.scale.set(0.72, 1, 1.9); model.add(cab);
    const cabFrame = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 24), dark);
    cabFrame.position.set(0, 0.22, -0.55); cabFrame.scale.set(0.72, 0.5, 1); model.add(cabFrame);

    // --- ailes delta en flèche (extrudées, bords biseautés) ---
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0.0, 0.0);          // racine, bord d'attaque
    wingShape.lineTo(0.0, 1.55);         // racine, bord de fuite
    wingShape.lineTo(2.35, 1.95);        // saumon, fuite (flèche)
    wingShape.lineTo(2.55, 1.4);         // saumon, bord d'attaque
    wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 1 });
    const mkWing = (s) => {
      const g = new THREE.Group();
      const w = new THREE.Mesh(wingGeo, dark); w.rotation.x = Math.PI / 2; g.add(w);
      // liseré d'attaque clair
      const edge = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 0.12), hull);
      edge.position.set(1.25, 0.02, 0.05); edge.rotation.y = -0.16; g.add(edge);
      // feu de navigation au saumon (rouge bâbord / vert tribord)
      const navHex = s < 0 ? 0xff3b3b : 0x37ff6a;
      const lt = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), new THREE.MeshBasicMaterial({ color: navHex, toneMapped: false }));
      lt.position.set(2.45, 0.04, 1.55); g.add(lt);
      g.scale.x = s;                      // miroir bâbord/tribord
      g.position.set(s * 0.4, -0.14, 0.0);
      g.rotation.z = s * 0.07;            // léger dièdre
      return g;
    };
    model.add(mkWing(-1)); model.add(mkWing(1));

    // canards avant
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 0.42), dark);
      c.position.set(s * 0.5, 0.02, -2.25); c.rotation.y = -s * 0.28; model.add(c);
    }

    // --- canons à plasma sous les ailes (tubes + bouche émissive) ---
    this.muzzles = [];
    for (const s of [-1, 1]) {
      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.5), dark);
      mount.position.set(s * 1.7, -0.16, 0.25); model.add(mount);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.6, 12), dark);
      barrel.rotation.x = Math.PI / 2; barrel.position.set(s * 1.7, -0.16, -0.45); model.add(barrel);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 8, 16), hull);
      collar.position.set(s * 1.7, -0.16, -0.95); model.add(collar);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 10), this.glow.clone());
      tip.rotation.x = Math.PI / 2; tip.position.set(s * 1.7, -0.16, -1.27); model.add(tip);
      const muzzle = new THREE.Object3D();                 // point d'émission des bolts
      muzzle.position.set(s * 1.7, -0.16, -1.4); model.add(muzzle);
      this.muzzles.push(muzzle);
    }

    // --- détails de coque : antenne, blocs RCS, arête dorsale ---
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 6), dark);
    mast.position.set(0.16, 0.5, 0.4); model.add(mast);
    const mastTip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), trim);
    mastTip.position.set(0.16, 0.76, 0.4); model.add(mastTip);
    for (const [sx, sy] of [[-0.3, 0.28], [0.3, 0.28], [-0.3, -0.3], [0.3, -0.3]]) {
      const rcs = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.16), dark);
      rcs.position.set(sx, sy, -2.05); model.add(rcs);     // tuyères d'attitude au nez
    }
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 2.6), hull);
    spine.position.set(0, 0.47, 0.35); model.add(spine);   // arête dorsale
    // dérive dorsale
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.7, 0.95), dark);
    fin.position.set(0, 0.5, 1.65); fin.rotation.x = -0.16; model.add(fin);
    const finTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.12), trim);
    finTrim.position.set(0, 0.62, 2.0); model.add(finTrim);

    // --- moteurs : nacelles + tuyères incandescentes + flammes en couches ---
    this.thrusters = [];
    const mkPlume = (radius, taper, baseOpacity, lenMul) => {
      const geo = new THREE.ConeGeometry(radius, 1, 20, 1, true);
      geo.translate(0, 0.5, 0);          // base à y=0 -> s'étire vers la pointe
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          colHot: { value: FX_COL.cruiseHot.clone() }, colTip: { value: FX_COL.cruiseTip.clone() },
          opacity: { value: 0 }, time: { value: 0 }, taper: { value: taper },
        },
        vertexShader: PLUME_VERT, fragmentShader: PLUME_FRAG,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat); m.rotation.x = Math.PI / 2;   // pointe vers +z (traîne)
      m.userData = { baseOpacity, lenMul };
      return m;
    };
    for (const s of [-0.6, 0.6]) {
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.5, 24), dark);
      eng.rotation.x = Math.PI / 2; eng.position.set(s, -0.05, 1.75); model.add(eng);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.05, 12, 24), hull);
      ring.position.set(s, -0.05, 2.48); model.add(ring);
      const noz = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), this.glow.clone());
      noz.position.set(s, -0.05, 2.49); noz.rotation.y = Math.PI; model.add(noz);

      const outer = mkPlume(0.4, 2.4, 0.32, 1.5);
      const inner = mkPlume(0.22, 1.6, 0.95, 1.0);
      const plumes = [outer, inner];
      for (const p of plumes) { p.position.set(s, -0.05, 2.5); model.add(p); }
      const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nozTex, color: 0x59d8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      glowSprite.position.set(s, -0.05, 2.52); model.add(glowSprite);
      this.thrusters.push({ noz, plumes, glowSprite });
    }
    // halo central (flash de poussée)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: nozTex, color: 0x66ddff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.set(0, -0.05, 2.6); model.add(halo); this.halo = halo;

    // --- cockpit intérieur détaillé (visible uniquement en vue pilote) ---
    // L'œil est à (0, 0.52, -1.02) : tout l'habitacle est construit autour.
    const cp = new THREE.Group(); this.cockpit = cp;
    // Pas de lumière dans l'habitacle (une PointLight à 3 m nucléarise tout en
    // éclairage physique) : les matériaux sont AUTO-ÉCLAIRÉS, sombres et mats,
    // ambiance « poste de pilotage de nuit ».
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x0a0d13, metalness: 0.1, roughness: 0.95,
      emissive: 0x141a24, emissiveIntensity: 0.85, side: THREE.BackSide,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x080b10, metalness: 0.2, roughness: 0.85, emissive: 0x10151f, emissiveIntensity: 0.9,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0d1017, metalness: 0.4, roughness: 0.6, emissive: 0x1d2431, emissiveIntensity: 0.9,
    });

    // baignoire de coque : le pilote est DANS le fuselage, mais la VUE PRIME.
    // Rebord bas devant (la console n'occupe que le bas de l'écran), épaules
    // sur les côtés, dossier haut derrière.
    // rotation NÉGATIVE : le rebord plonge à l'AVANT (vue plongeante dégagée)
    // et remonte derrière la tête du pilote.
    const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.46, 0.50, 28, 1, true), shellMat);
    tub.position.set(0, 0.22, -1.10); tub.rotation.x = -0.30;
    cp.add(tub);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28), panelMat.clone());
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.0, -1.10); floor.material.side = THREE.FrontSide;
    cp.add(floor);

    // console principale, BASSE (dégagée du champ de vision) + visière fine
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.14, 0.30), panelMat);
    dash.position.set(0, 0.28, -1.64); dash.rotation.x = 0.30; cp.add(dash);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.016, 0.12), frameMat);
    hood.position.set(0, 0.372, -1.685); hood.rotation.x = 0.46; cp.add(hood);

    // trois écrans MFD (interfaces dessinées : radar / horizon / systèmes),
    // posés sur la console, inclinés vers le pilote, sous la ligne d'horizon
    const mkScreen = (kind, x, w, h) => {
      const bezel = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.024, h + 0.024), frameMat);
      bezel.position.set(x, 0.349, -1.545); bezel.rotation.x = -1.05; cp.add(bezel);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: mfdTexture(kind), toneMapped: false }));
      scr.position.set(x, 0.35, -1.541); scr.rotation.x = -1.05; cp.add(scr);
    };
    mkScreen("nav", -0.24, 0.175, 0.11);
    mkScreen("adi", 0, 0.205, 0.13);
    mkScreen("sys", 0.24, 0.175, 0.11);

    // rangées de boutons rétroéclairés (petits, tamisés), SUR la face inclinée
    const BTN_COLS = [0x62d8ff, 0xffc24d, 0x62ffb0, 0x9b8cff, 0x8fa8cd];
    const dimmed = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
    const BTN_ROWS = [[0.322, -1.522], [0.309, -1.479]];        // points sur la face (précalculés)
    BTN_ROWS.forEach(([by, bz], r) => {
      for (let i = 0; i < 11; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.005, 0.008),
          new THREE.MeshBasicMaterial({ color: dimmed(BTN_COLS[(i * 3 + r) % BTN_COLS.length], 0.42), toneMapped: false }));
        b.position.set(-0.15 + i * 0.03, by, bz);
        b.rotation.x = 0.30;
        cp.add(b);
      }
    });

    // consoles latérales : accoudoirs techniques avec témoins
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.52), panelMat);
      side.position.set(s * 0.36, 0.30, -1.28); side.rotation.z = s * -0.12; cp.add(side);
      for (let i = 0; i < 4; i++) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.005, 0.022),
          new THREE.MeshBasicMaterial({ color: dimmed(BTN_COLS[(i + (s > 0 ? 2 : 0)) % BTN_COLS.length], 0.42), toneMapped: false }));
        led.position.set(s * 0.345, 0.338, -1.44 + i * 0.09); led.rotation.z = s * -0.12;
        cp.add(led);
      }
    }

    // manche central + manette des gaz à gauche
    const stick = new THREE.Group();
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.07), panelMat);
    pedestal.position.y = -0.06; stick.add(pedestal);            // socle jusqu'au plancher
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.15, 10), frameMat);
    shaft.position.y = 0.075; stick.add(shaft);
    const grip = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), panelMat);
    grip.scale.set(1, 1.35, 1); grip.position.y = 0.165; stick.add(grip);
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.012),
      new THREE.MeshBasicMaterial({ color: 0xff5d6c, toneMapped: false }));
    trigger.position.set(0, 0.16, -0.024); stick.add(trigger);
    stick.position.set(0, 0.14, -1.335); stick.rotation.x = -0.16;
    cp.add(stick);
    const throttle = new THREE.Group();
    const tBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.12), frameMat); throttle.add(tBase);
    const tLever = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 8), frameMat);
    tLever.position.set(0, 0.045, 0.01); tLever.rotation.x = 0.5; throttle.add(tLever);
    const tKnob = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), panelMat);
    tKnob.position.set(0, 0.085, 0.032); throttle.add(tKnob);
    throttle.position.set(-0.36, 0.345, -1.30); throttle.rotation.z = 0.12;
    cp.add(throttle);

    // montants de verrière TRÈS fins, plaqués aux bords du champ de vision,
    // et traverse haute reculée : un cadre discret, pas des barreaux
    for (const s of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.60, 0.035), frameMat);
      pillar.position.set(s * 0.46, 0.60, -1.36);
      pillar.rotation.z = s * -0.36; pillar.rotation.x = 0.20;
      cp.add(pillar);
    }
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.035), frameMat);
    topBar.position.set(0, 0.895, -1.44); cp.add(topBar);
    // console plafonnier (interrupteurs), reculée : visible en levant les yeux
    const over = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.018, 0.09), panelMat);
    over.position.set(0, 0.875, -1.14); cp.add(over);
    for (let i = 0; i < 4; i++) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.016),
        new THREE.MeshBasicMaterial({ color: dimmed(i === 2 ? 0xffc24d : 0x62d8ff, 0.42), toneMapped: false }));
      sw.position.set(-0.075 + i * 0.05, 0.864, -1.14);
      cp.add(sw);
    }

    cp.visible = false;
    model.add(cp);
    // œil du pilote un peu plus HAUT (vue dégagée au-dessus de la console)
    // + point regardé (repère du MODÈLE : suit l'inclinaison en virage)
    this._eyeLocal = new THREE.Vector3(0, 0.55, -1.02);
    this._lookLocal = new THREE.Vector3(0, 0.47, -30);

    // coque ≈ 6,5 u de base -> /6.5 = exactement 1 u = 100 m (référence d'échelle)
    model.scale.setScalar(SHIP.size / 6.5);
    this.group.add(model);
    this.setView(SETTINGS.view === "cockpit" ? "cockpit" : "chase");
  }

  // Vue « chase » (3ᵉ personne) ou « cockpit » (dans la verrière).
  setView(mode) {
    this.view = mode === "cockpit" ? "cockpit" : "chase";
    const chase = this.view === "chase";
    for (const child of this.model.children) child.visible = chase;
    this.cockpit.visible = !chase;
  }

  reset(pos, lookTarget) {
    this.group.position.copy(pos);
    this.speed = 0; this.warpAmount = 0; this.velocity.set(0, 0, 0);
    this._m.lookAt(pos, lookTarget, WORLD_UP);
    this.group.quaternion.setFromRotationMatrix(this._m);
    this._look.copy(lookTarget);
    this._prevPos.copy(pos);
  }

  forward(out) { return out.set(0, 0, -1).applyQuaternion(this.group.quaternion); }

  update(dt, input, nav) {
    this._t += dt; this._collided = false;
    const g = this.group;

    // ---- orientation (souris + clavier), sensibilité douce ----
    const md = input.consumeMouse();
    const s = SHIP.mouseSens * SETTINGS.sens;
    const ySign = SETTINGS.invertY ? -1 : 1;
    let yaw = -md.dx * s - input.axisYaw() * SHIP.yawRate * dt;
    let pitch = (-md.dy * s) * ySign - input.axisPitch() * SHIP.pitchRate * dt;
    const cap = 0.06;                                   // limite anti à-coups
    yaw = THREE.MathUtils.clamp(yaw, -cap, cap);
    pitch = THREE.MathUtils.clamp(pitch, -cap, cap);
    if (yaw) g.rotateY(yaw);
    if (pitch) g.rotateX(pitch);

    // ---- inclinaison en virage : le MODÈLE se penche dans le virage ----
    // (la caméra, elle, reste à l'horizontale -> dynamique sans nausée)
    const bankTarget = THREE.MathUtils.clamp((yaw / Math.max(dt, 1e-4)) * 0.28, -0.5, 0.5);
    this._bank += (bankTarget - this._bank) * Math.min(1, dt * 4.5);
    this.model.rotation.z = this._bank;

    // ---- auto-nivellement du roulis (horizon stable = anti-nausée) ----
    this.forward(this._fwd);
    if (Math.abs(this._fwd.y) < 0.96) {
      this._Rd.crossVectors(this._fwd, WORLD_UP).normalize();
      this._Ud.crossVectors(this._Rd, this._fwd).normalize();
      this._m.makeBasis(this._Rd, this._Ud, this._fwd.clone().negate());
      this._q.setFromRotationMatrix(this._m);
      g.quaternion.slerp(this._q, Math.min(1, dt * SHIP.autoLevel));
    }

    // ---- moteur : la vitesse cible dépend du mode ----
    const thr = THREE.MathUtils.clamp(input.throttle(), -1, 1);
    this.boosting = input.boost() && thr >= 0;
    const wantWarp = input.warp();
    const near = nav ? nav.dist : 1e9;
    let target, ramp = SHIP.accel;
    this.warping = false;
    if (wantWarp) {
      const w = SHIP.warp;
      target = THREE.MathUtils.clamp(near * w.factor, w.min, w.max);
      this.warping = near > w.engageDist;
      ramp = w.ramp;
    } else if (this.boosting) {
      target = SHIP.boostMax;
      ramp = SHIP.boostRamp;                              // rampe propre à la postcombustion
    } else if (thr > 0) {
      target = SHIP.cruiseMax * thr;
    } else if (thr < 0) {
      target = -SHIP.cruiseMax * SHIP.reverse;
    } else {
      target = 0; ramp = SHIP.decel;
    }
    this.speed += (target - this.speed) * Math.min(1, dt * ramp);
    if (!Number.isFinite(this.speed)) this.speed = 0;     // garde-fou
    if (Math.abs(this.speed) < 0.02) this.speed = 0;

    // ---- déplacement (arcade : la vitesse suit le cap) ----
    this.forward(this._fwd);
    g.position.addScaledVector(this._fwd, this.speed * dt);
    this.velocity.copy(this._fwd).multiplyScalar(this.speed);

    this._updateFX(dt, thr);
  }

  resolveCollision(bodies) {
    const g = this.group, pos = g.position;
    for (const b of bodies) {
      b.getWorldPosition(this._c);
      this._to.copy(pos).sub(this._c);
      const dd = this._to.length(), minD = b.radius + this.clearance;
      if (dd > 0 && dd < minD) {
        this._to.multiplyScalar(minD / dd);
        pos.copy(this._c).add(this._to);
        if (this.speed > 0) this.speed *= 0.2;          // impact : on casse la vitesse
        this._collided = true;
      }
    }
    return this._collided;
  }

  _updateFX(dt, thr) {
    const tv = this.warping || this.boosting ? 1 : (thr > 0 ? 0.55 : 0.12);
    this.throttleVis += (tv - this.throttleVis) * Math.min(1, dt * 8);
    // couleurs selon le mode
    let hot, tip;
    if (this.warping) { hot = FX_COL.warpHot; tip = FX_COL.warpTip; }
    else if (this.boosting) { hot = FX_COL.boostHot; tip = FX_COL.boostTip; }
    else { hot = FX_COL.cruiseHot; tip = FX_COL.cruiseTip; }
    const len = 0.4 + this.throttleVis * (this.warping ? 3.4 : 1.7);
    for (const t of this.thrusters) {
      for (const p of t.plumes) {
        const u = p.material.uniforms;
        u.time.value = this._t;
        u.opacity.value = this.throttleVis * p.userData.baseOpacity;
        u.colHot.value.copy(hot); u.colTip.value.copy(tip);
        p.scale.set(1, len * p.userData.lenMul, 1);
      }
      t.glowSprite.material.opacity = this.throttleVis * 0.85;
      t.glowSprite.material.color.copy(hot);
      t.glowSprite.scale.setScalar(0.45 + this.throttleVis * 0.7);
      t.noz.material.color.copy(hot);
    }
    this.halo.material.opacity = this.throttleVis * 0.45; this.halo.material.color.copy(hot);
    this.halo.scale.setScalar(1.2 + this.throttleVis * (this.warping ? 5 : 2.5));
    const wt = this.warping ? 1 : 0;
    this.warpAmount += (wt - this.warpAmount) * Math.min(1, dt * 3);
  }

  updateCamera(dt, camera) {
    const g = this.group; g.updateMatrixWorld();

    // ---- vue cockpit : caméra rigide à l'œil du pilote ----
    if (this.view === "cockpit") {
      camera.position.copy(this._eyeLocal).applyMatrix4(this.model.matrixWorld);
      this._prevPos.copy(g.position);            // garde le suivi 3ᵉ personne cohérent au retour
      if (this.warpAmount > 0.05) {
        const a = this.warpAmount * 0.05;
        camera.position.x += (Math.random() - 0.5) * a;
        camera.position.y += (Math.random() - 0.5) * a;
      }
      const look = this._look.copy(this._lookLocal).applyMatrix4(this.model.matrixWorld);
      this._up.set(0, 1, 0).transformDirection(this.model.matrixWorld);   // l'horizon s'incline avec le virage
      camera.up.copy(this._up);
      camera.lookAt(look);
      const cfov = this._baseFov + 3 + Math.min(Math.abs(this.speed) / SHIP.boostMax, 1) * 7 + this.warpAmount * 24;
      if (Math.abs(camera.fov - cfov) > 0.05) { camera.fov = cfov; camera.updateProjectionMatrix(); }
      return;
    }

    // suivi RIGIDE du déplacement (sans retard, même en distorsion) ...
    camera.position.add(this._camTmp.copy(g.position).sub(this._prevPos));
    this._prevPos.copy(g.position);
    // ... puis lissage de l'erreur d'offset (orientation/hauteur)
    this._desired.set(0, SHIP.cam.height, SHIP.cam.dist).applyMatrix4(g.matrixWorld);
    camera.position.lerp(this._desired, 1 - Math.exp(-SHIP.cam.lag * dt));
    if (this.warpAmount > 0.05) {                       // très légère vibration en distorsion seulement
      const a = this.warpAmount * 0.08;
      camera.position.x += (Math.random() - 0.5) * a;
      camera.position.y += (Math.random() - 0.5) * a;
    }
    const look = this._look.set(0, SHIP.cam.height * 0.3, -SHIP.cam.lookAhead).applyMatrix4(g.matrixWorld);
    this._up.set(0, 1, 0).applyQuaternion(g.quaternion);
    camera.up.copy(this._up);
    camera.lookAt(look);
    const fov = this._baseFov + Math.min(Math.abs(this.speed) / SHIP.boostMax, 1) * 7 + this.warpAmount * 24;
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }
}
