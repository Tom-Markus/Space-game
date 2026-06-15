import * as THREE from "three";
import { SHIP } from "./config.js";

const WORLD_UP = new THREE.Vector3(0, 1, 0);

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
    const hull = new THREE.MeshStandardMaterial({ color: 0xccd4e0, metalness: 0.9, roughness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x232a36, metalness: 0.7, roughness: 0.45 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xe8741f, metalness: 0.5, roughness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0c2a4d, metalness: 0.3, roughness: 0.05, emissive: 0x1d5ba0, emissiveIntensity: 0.6 });
    this.glow = new THREE.MeshBasicMaterial({ color: 0x7fe6ff, toneMapped: false });

    // --- fuselage principal : profilé ---
    const fuse = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 2.7, 10, 18), hull);
    fuse.rotation.x = Math.PI / 2; model.add(fuse);
    // ventre / quille
    const keel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 2.4), dark);
    keel.position.set(0, -0.42, 0.2); model.add(keel);
    // nez allongé
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.0, 18), hull);
    nose.rotation.x = -Math.PI / 2; nose.position.z = -2.6; model.add(nose);
    const noseTip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 12), dark);
    noseTip.rotation.x = -Math.PI / 2; noseTip.position.z = -3.7; model.add(noseTip);
    // cockpit verrière
    const cab = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), glass);
    cab.rotation.x = -Math.PI / 2.05; cab.position.set(0, 0.36, -1.0); cab.scale.set(0.82, 1, 1.7); model.add(cab);

    // --- ailes en flèche + winglets ---
    const wingShape = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 1.25), dark);
    const mkWing = (s) => {
      const g = new THREE.Group();
      const w = wingShape.clone(); w.position.set(s * 1.55, -0.04, 0.55); w.rotation.y = s * 0.22; w.rotation.z = s * 0.12; g.add(w);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.7), hull);
      tip.position.set(s * 2.75, 0.12, 0.7); tip.rotation.z = s * 0.2; g.add(tip);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.16), trim);
      stripe.position.set(s * 1.5, 0.02, 0.15); g.add(stripe);
      // feu de navigation (rouge bâbord / vert tribord)
      const lt = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8),
        new THREE.MeshBasicMaterial({ color: s < 0 ? 0xff3b3b : 0x37ff6a, toneMapped: false }));
      lt.position.set(s * 2.78, 0.18, 0.95); g.add(lt);
      return g;
    };
    model.add(mkWing(-1)); model.add(mkWing(1));
    // canards avant
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.5), dark); c.position.set(s * 0.7, 0.05, -1.7); c.rotation.y = s * 0.3; model.add(c); }
    // dérive
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 1.1), dark); fin.position.set(0, 0.55, 1.3); model.add(fin);

    // --- moteurs + tuyères ---
    this.thrusters = [];
    for (const s of [-0.6, 0.6]) {
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.42, 1.1, 18), dark);
      eng.rotation.x = Math.PI / 2; eng.position.set(s, -0.04, 1.6); model.add(eng);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 10, 20), hull);
      ring.position.set(s, -0.04, 2.05); model.add(ring);
      const noz = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18), this.glow);
      noz.position.set(s, -0.04, 2.07); noz.rotation.y = Math.PI; model.add(noz);
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.27, 2.6, 14, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x59d8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      plume.rotation.x = -Math.PI / 2; plume.position.set(s, -0.04, 3.3); model.add(plume);
      this.thrusters.push({ noz, plume });
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x66ddff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.z = 2.4; model.add(halo); this.halo = halo;

    model.scale.setScalar(SHIP.size / 6);   // corps ≈ 1 u = 100 m (référence d'échelle)
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
    const active = this.warping || this.boosting || thr > 0;
    const tv = this.warping || this.boosting ? 1 : (thr > 0 ? 0.55 : 0.12);
    this.throttleVis += (tv - this.throttleVis) * Math.min(1, dt * 8);
    const col = this.warping ? 0xffffff : this.boosting ? 0xff8a3c : 0x59d8ff;
    for (const t of this.thrusters) {
      t.plume.material.opacity = this.throttleVis * 0.9;
      t.plume.scale.set(1, 0.4 + this.throttleVis * (this.warping ? 3.0 : 1.5), 1);
      t.plume.material.color.setHex(col); t.noz.material.color.setHex(col);
    }
    this.halo.material.opacity = this.throttleVis * 0.5; this.halo.material.color.setHex(col);
    this.halo.scale.setScalar(2 + this.throttleVis * (this.warping ? 6 : 3));
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
