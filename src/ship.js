import * as THREE from "three";
import { SHIP } from "./config.js";

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

    // coque ≈ 6,5 u de base -> /6.5 = exactement 1 u = 100 m (référence d'échelle)
    model.scale.setScalar(SHIP.size / 6.5);
    this.group.add(model);
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
    const s = SHIP.mouseSens;
    let yaw = -md.dx * s - input.axisYaw() * SHIP.yawRate * dt;
    let pitch = -md.dy * s - input.axisPitch() * SHIP.pitchRate * dt;
    const cap = 0.06;                                   // limite anti à-coups
    yaw = THREE.MathUtils.clamp(yaw, -cap, cap);
    pitch = THREE.MathUtils.clamp(pitch, -cap, cap);
    if (yaw) g.rotateY(yaw);
    if (pitch) g.rotateX(pitch);

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
