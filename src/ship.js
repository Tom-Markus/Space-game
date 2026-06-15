import * as THREE from "three";
import { SHIP } from "./config.js";

export class Ship {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.velocity = new THREE.Vector3();
    this.speed = 0;
    this.boosting = false;
    this.throttleVis = 0;
    this._look = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._m = new THREE.Matrix4();
    this._baseFov = 62;
    this._build();
    scene.add(this.group);
  }

  _build() {
    const hull = new THREE.MeshStandardMaterial({ color: 0xc4ccd8, metalness: 0.85, roughness: 0.34 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a3340, metalness: 0.6, roughness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0e2a4d, metalness: 0.2, roughness: 0.08, emissive: 0x1d4f8c, emissiveIntensity: 0.5 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xe06a2a, metalness: 0.5, roughness: 0.5 });
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0x7fe6ff });

    const g = this.group;
    // fuselage (le long de -Z)
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 3.0, 8, 16), hull);
    body.rotation.x = Math.PI / 2; g.add(body);
    // nez
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.7, 16), hull);
    nose.rotation.x = -Math.PI / 2; nose.position.z = -2.6; g.add(nose);
    // cockpit
    const cab = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), glass);
    cab.rotation.x = -Math.PI / 2.1; cab.position.set(0, 0.34, -0.9); cab.scale.set(0.8, 1, 1.5); g.add(cab);
    // ailes
    const wingGeo = new THREE.BoxGeometry(3.4, 0.12, 1.5);
    const wL = new THREE.Mesh(wingGeo, dark); wL.position.set(-1.7, -0.05, 0.5); wL.rotation.z = 0.18; wL.rotation.y = 0.12; g.add(wL);
    const wR = wL.clone(); wR.position.x = 1.7; wR.rotation.z = -0.18; wR.rotation.y = -0.12; g.add(wR);
    // bandes orange
    for (const x of [-1.7, 1.7]) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.13, 0.18), trim); s.position.set(x, -0.04, 0.0); g.add(s); }
    // dérive verticale
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 1.2), dark); fin.position.set(0, 0.5, 1.2); g.add(fin);
    // moteurs + tuyères lumineuses
    this.thrusters = [];
    for (const x of [-0.62, 0.62]) {
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.8, 16), dark);
      eng.rotation.x = Math.PI / 2; eng.position.set(x, -0.02, 1.7); g.add(eng);
      const noz = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), this.glowMat);
      noz.position.set(x, -0.02, 2.1); noz.rotation.y = Math.PI; g.add(noz);
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.26, 2.2, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x59d8ff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      plume.rotation.x = -Math.PI / 2; plume.position.set(x, -0.02, 3.1); g.add(plume);
      this.thrusters.push({ noz, plume });
    }
    // halo moteur (bloom)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x66ddff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(3); halo.position.z = 2.3; g.add(halo); this.halo = halo;
  }

  reset(pos, lookTarget) {
    this.group.position.copy(pos);
    this.velocity.set(0, 0, 0); this.speed = 0;
    this._m.lookAt(pos, lookTarget, new THREE.Vector3(0, 1, 0));
    this.group.quaternion.setFromRotationMatrix(this._m);
    this._look.copy(lookTarget);
  }

  forward(out) { return out.set(0, 0, -1).applyQuaternion(this.group.quaternion); }

  update(dt, input) {
    const g = this.group;
    // ---- rotation ----
    const md = input.consumeMouse();
    const sens = SHIP.mouseSens;
    const yaw = -md.dx * sens - input.axisYaw() * SHIP.yawRate * dt;
    const pitch = -md.dy * sens - input.axisPitch() * SHIP.pitchRate * dt;
    const roll = -input.axisRoll() * SHIP.rollRate * dt;
    if (yaw) g.rotateY(yaw);
    if (pitch) g.rotateX(pitch);
    if (roll) g.rotateZ(roll);

    // ---- poussée ----
    const thr = THREE.MathUtils.clamp(input.throttle(), -1, 1);
    this.boosting = input.boost() && thr > 0;
    this.forward(this._fwd);
    if (thr > 0) {
      const a = this.boosting ? SHIP.boostAccel : SHIP.accel;
      this.velocity.addScaledVector(this._fwd, thr * a * dt);
    } else if (thr < 0) {
      this.velocity.addScaledVector(this._fwd, thr * SHIP.reverse * dt);
    }
    if (input.brake()) this.velocity.multiplyScalar(Math.max(0, 1 - SHIP.brakeDamping * dt));
    this.velocity.multiplyScalar(Math.max(0, 1 - SHIP.damping * dt));

    const max = this.boosting ? SHIP.boostMax : SHIP.maxSpeed;
    this.speed = this.velocity.length();
    if (this.speed > max) { this.velocity.multiplyScalar(max / this.speed); this.speed = max; }

    g.position.addScaledVector(this.velocity, dt);

    // ---- FX moteurs ----
    const targetVis = thr > 0 ? (this.boosting ? 1 : 0.55) : 0.12;
    this.throttleVis += (targetVis - this.throttleVis) * Math.min(1, dt * 8);
    const c = this.boosting ? 0xff8a3c : 0x59d8ff;
    for (const t of this.thrusters) {
      t.plume.material.opacity = this.throttleVis * 0.85;
      t.plume.scale.set(1, 0.4 + this.throttleVis * 1.4, 1);
      t.plume.material.color.setHex(c); t.noz.material.color.setHex(c);
    }
    this.halo.material.opacity = this.throttleVis * 0.5; this.halo.material.color.setHex(c);
    this.halo.scale.setScalar(2 + this.throttleVis * 3);
  }

  updateCamera(dt, camera) {
    const g = this.group;
    g.updateMatrixWorld();
    this._desired.set(0, SHIP.cam.height, SHIP.cam.dist).applyMatrix4(g.matrixWorld);
    const k = 1 - Math.exp(-SHIP.cam.lag * dt);
    camera.position.lerp(this._desired, k);

    // secousse au boost
    if (this.boosting) {
      const s = Math.min(this.speed / SHIP.boostMax, 1) * 0.25;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
    // point visé devant le vaisseau
    const look = new THREE.Vector3(0, SHIP.cam.height * 0.35, -SHIP.cam.lookAhead).applyMatrix4(g.matrixWorld);
    this._look.lerp(look, Math.min(1, dt * 9));
    this._up.set(0, 1, 0).applyQuaternion(g.quaternion);
    camera.up.copy(this._up);
    camera.lookAt(this._look);

    // FOV dynamique (sensation de vitesse)
    const fov = this._baseFov + Math.min(this.speed / SHIP.boostMax, 1) * 16;
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }
}
