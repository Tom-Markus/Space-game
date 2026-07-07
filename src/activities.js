// ===================================================================
//  ACTIVITIES — le vrai gameplay des missions (au-delà du « maintien E »).
//  Trois mécaniques, déclinées par des dangers, pour de la variété :
//
//   • lock   : VERROUILLAGE — approchez la source du signal et orientez le
//              nez du vaisseau dessus pour remplir la jauge (skill de visée).
//   • shards : COLLECTE — récupérez des éclats de données dispersés en volant
//              à travers (exploration active).
//   • land   : APPONTAGE — posez-vous en douceur (vitesse + altitude faibles).
//
//  Dangers (def.hazard) : "heat", "flare", "radiation", "storm" — entament le
//  bouclier/coque (cf. status.js) et corsent la mécanique.
//
//  IMPORTANT : toute la LOGIQUE n'utilise que THREE.Vector3 (testable hors
//  navigateur). Les VISUELS (sprites/meshes) sont isolés derrière `this.scene`.
// ===================================================================
import * as THREE from "three";

let _glowTex = null;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(0.7, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(cv);
  return _glowTex;
}

// Balise lumineuse : halo additif + petit noyau facetté + anneau.
function makeBeacon(color, size) {
  const grp = new THREE.Group();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(size * 3.2); grp.add(halo);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(size * 0.5, 0), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  grp.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 1.1, size * 0.08, 8, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, toneMapped: false }));
  grp.add(ring);
  grp.userData = { halo, core, ring };
  return grp;
}

class Activity {
  constructor(ctx, def) {
    this.scene = ctx.scene; this.system = ctx.system; this.key = ctx.key;
    this.body = ctx.body; this.sfx = ctx.sfx; this.status = ctx.status;
    this.onFx = ctx.onFx || (() => {});
    this.onBoom = ctx.onBoom || (() => {});   // explosion (position, taille)
    this.objectiveLabel = null;               // libellé du marqueur GPS (« Source », « Éclat »…)
    this.def = def || {};
    this.progress = 0; this.done = false; this.engaged = false; this.failed = false;
    this.prompt = null; this.lock = 0; this.t = 0;
    this.radius = this.body.radius;
    this._bp = new THREE.Vector3();
    this._sp = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._out = new THREE.Vector3();
    this._d = new THREE.Vector3();
    this._props = [];
  }
  bodyPos() { this.body.getWorldPosition(this._bp); return this._bp; }
  outward(bp) { this._out.copy(bp); const L = this._out.length() || 1; return this._out.multiplyScalar(1 / L); }
  start() {}
  update() {}
  cleanup() { if (this.scene) for (const p of this._props) this.scene.remove(p); this._props.length = 0; }
  // Position PRÉCISE de l'objectif courant (balise, éclat…) pour le marqueur GPS.
  // Remplit `out` et renvoie true ; false -> repli sur le centre de la planète.
  objectivePos(out, shipPos) { return false; }

  // danger commun : renvoie true si la coque vient de tomber (fail-soft géré ailleurs)
  applyHazard(dt, ship, bp) {
    const h = this.def.hazard;
    if (!h) return false;
    this._sp.copy(ship.group.position);
    const sd = this._d.copy(this._sp).sub(bp);            // body -> ship
    const alt = Math.max(0, sd.length() - this.radius);
    this.outward(bp);
    const facingSun = sd.dot(this._out) < 0;              // côté éclairé = exposé
    let dmg = 0;
    if (h === "radiation") { dmg = 0.05 * dt; this.hazardLabel = "RADIATIONS — faites vite"; }
    else if (h === "heat") { if (alt < this.radius * 0.18) { dmg = 0.10 * dt; this.hazardLabel = "SURCHAUFFE — ne descendez pas trop"; } }
    else if (h === "storm") {
      dmg = 0.02 * dt; this.hazardLabel = "VENTS VIOLENTS";
      // bourrasque latérale qui balaie le vaisseau (déstabilise la visée)
      const a = this.t * 1.7;
      ship.group.position.x += Math.cos(a) * this.radius * 0.012 * dt * 60 * dt;
      ship.group.position.y += Math.sin(a * 1.3) * this.radius * 0.010 * dt * 60 * dt;
    } else if (h === "flare") {
      const fAt = this.def.flareAt ?? 0.4, fDur = this.def.flareDur ?? 4;
      if (!this._flareDone) {
        // déclenchement une fois le verrouillage entamé ; ensuite la fenêtre est
        // pilotée par le TEMPS (pas par le verrouillage qui, lui, peut chuter).
        if (!this._flaring && this.lock >= fAt) { this._flaring = true; this._flareT = this.t; this.onFx("flare"); }
        if (this._flaring) {
          if (this.t - this._flareT >= fDur) { this._flaring = false; this._flareDone = true; }
          else if (facingSun) { dmg = 0.4 * dt; this.hazardLabel = "ÉRUPTION ! Abritez-vous derrière la planète"; this.lock = Math.max(0, this.lock - dt * 0.3); }
          else this.hazardLabel = "À l'abri — tenez bon";
        }
      }
    }
    if (dmg > 0) return this.status && this.status.damage(dmg);
    return false;
  }
}

// ---- VERROUILLAGE : approcher la source + viser ----
class LockActivity extends Activity {
  start() {
    this.hold = this.def.hold || 4;
    this.aimDot = this.def.aimDot ?? 0.42;
    this.nodePos = new THREE.Vector3();
    if (this.scene) {
      this.node = makeBeacon(this.def.color || 0x9b8cff, this.radius * 0.06);
      this.scene.add(this.node); this._props.push(this.node);
    }
  }
  _place(bp) {
    this.outward(bp);
    // source posée au-dessus de la surface, côté jour (vers le Soleil = -outward)
    this.nodePos.copy(bp).addScaledVector(this._out, -this.radius * (this.def.nodeDist ?? 1.3));
    this.nodePos.y += this.radius * (this.def.nodeUp ?? 0.25);
    if (this.node) this.node.position.copy(this.nodePos);
  }
  update(dt, ship) {
    this.t += dt;
    const bp = this.bodyPos();
    this._place(bp);
    if (this.node) {
      const p = 0.85 + Math.sin(this.t * 3) * 0.15;
      this.node.userData.halo.material.opacity = p;
      this.node.userData.ring.rotation.z += dt * 0.8;
      this.node.userData.core.rotation.y += dt * 1.2;
    }
    this.hazardLabel = null;
    const fell = this.applyHazard(dt, ship, bp);

    this._sp.copy(ship.group.position);
    this._d.copy(this.nodePos).sub(this._sp);
    const dist = this._d.length();
    const lockDist = this.radius * (this.def.lockDist ?? 0.8);
    const within = dist < lockDist;
    if (within) this.engaged = true;
    ship.forward(this._fwd);
    const aim = within && dist > 1 ? this._fwd.dot(this._d) / dist : -1;
    const aligned = aim > this.aimDot;
    const frozen = this.def.hazard === "flare" && this._flaring && this._d.copy(this._sp).sub(bp).dot(this._out) < 0;

    if (within && aligned && !frozen) {
      this.lock = Math.min(1, this.lock + dt / this.hold);
      this.prompt = this.hazardLabel || `VERROUILLAGE DU SIGNAL · ${Math.floor(this.lock * 100)}%`;
    } else {
      this.lock = Math.max(0, this.lock - dt * (within ? 0.45 : 0.7));
      this.prompt = this.hazardLabel || (within ? "Orientez le nez vers la source ◈" : "Approchez la source du signal ◈");
    }
    this.danger = !!this.hazardLabel;
    this.progress = this.lock;
    if (this.lock >= 1) { this.done = true; this.sfx && this.sfx.lock && this.sfx.lock(); }
    return fell;
  }
  objectivePos(out) {
    if (!this.nodePos || this.nodePos.lengthSq() === 0) return false;
    this.objectiveLabel = "Source";
    out.copy(this.nodePos);
    return true;
  }
}

// ---- COLLECTE : éclats de données dispersés ----
class ShardActivity extends Activity {
  start() {
    this.n = this.def.count || 5;
    this.collected = 0;
    this.spread = this.radius * (this.def.spread ?? 1.5);
    this.reach = this.radius * (this.def.reach ?? 0.45);
    this.ring = !!this.def.ring;                 // disposés dans le plan des anneaux ?
    this.shards = [];
    const bp = this.bodyPos();
    const out = this.outward(bp).clone();
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(up, out).normalize();
    const vert = new THREE.Vector3().crossVectors(out, side).normalize();
    for (let i = 0; i < this.n; i++) {
      const a = (i / this.n) * Math.PI * 2 + 0.6;
      const r = this.ring ? this.spread * (1.0 + (i % 3) * 0.12) : this.spread * (0.8 + (i % 2) * 0.4);
      // anneaux -> dispersés dans le plan (side, vert) ; sinon -> autour de la sphère
      const off = new THREE.Vector3()
        .addScaledVector(side, Math.cos(a) * r)
        .addScaledVector(vert, Math.sin(a) * r * (this.ring ? 1.0 : 0.7))
        .addScaledVector(out, this.ring ? (i % 2 ? 1 : -1) * this.radius * 0.15 : this.radius * 0.5);
      const shard = { off, collected: false, mesh: null, pos: new THREE.Vector3() };
      if (this.scene) {
        const m = makeBeacon(this.def.color || 0x62d8ff, this.radius * 0.035);
        this.scene.add(m); this._props.push(m); shard.mesh = m;
      }
      this.shards.push(shard);
    }
  }
  update(dt, ship) {
    this.t += dt;
    const bp = this.bodyPos();
    this.hazardLabel = null;
    const fell = this.applyHazard(dt, ship, bp);
    this._sp.copy(ship.group.position);
    let remaining = 0;
    for (const sh of this.shards) {
      sh.pos.copy(bp).add(sh.off);
      if (sh.mesh) { sh.mesh.position.copy(sh.pos); sh.mesh.userData.core.rotation.y += dt * 1.5; sh.mesh.userData.ring.rotation.x += dt; }
      if (sh.collected) continue;
      remaining++;
      if (this._sp.distanceTo(sh.pos) < this.reach) {
        sh.collected = true;
        this.collected++;
        if (sh.mesh && this.scene) { this.scene.remove(sh.mesh); }
        this.sfx && this.sfx.pickup && this.sfx.pickup();
      }
    }
    this.engaged = this.collected > 0 || this._sp.distanceTo(bp) - this.radius < this.spread;
    this.progress = this.collected / this.n;
    this.prompt = this.hazardLabel || (remaining > 0
      ? `ÉCLATS DE DONNÉES · ${this.collected}/${this.n} — survolez-les pour les capter`
      : null);
    this.danger = !!this.hazardLabel;
    if (this.collected >= this.n) this.done = true;
    return fell;
  }
  objectivePos(out, shipPos) {
    let best = null, bd = Infinity;
    for (const sh of this.shards) {
      if (sh.collected || sh.pos.lengthSq() === 0) continue;
      const d = shipPos ? shipPos.distanceToSquared(sh.pos) : 0;
      if (d < bd) { bd = d; best = sh; }
    }
    if (!best) return false;
    this.objectiveLabel = `Éclat ${this.collected + 1}/${this.n}`;
    out.copy(best.pos);
    return true;
  }
}

// ---- APPONTAGE : poser en douceur ----
class LandActivity extends Activity {
  start() {
    this.hold = this.def.hold || 1.6;
    this.landSpeed = this.def.landSpeed || 650;   // unités/s max au contact
    this.t2 = 0;
  }
  update(dt, ship) {
    this.t += dt;
    const bp = this.bodyPos();
    this._sp.copy(ship.group.position);
    const alt = Math.max(0, this._sp.distanceTo(bp) - this.radius);
    const lowEnough = alt < this.radius * 0.18;
    const speed = Math.abs(ship.speed || 0);
    const gentle = speed < this.landSpeed;
    if (lowEnough) this.engaged = true;
    if (lowEnough && gentle) {
      this.t2 += dt;
      this.prompt = `APPONTAGE… stabilisez (${Math.floor(Math.min(1, this.t2 / this.hold) * 100)}%)`;
    } else if (lowEnough && !gentle) {
      this.t2 = Math.max(0, this.t2 - dt * 2);
      this.prompt = "TROP RAPIDE — ralentissez (S) pour vous poser";
    } else {
      this.t2 = Math.max(0, this.t2 - dt);
      this.prompt = "Descendez en douceur vers la surface";
    }
    this.danger = lowEnough && !gentle;
    this.progress = Math.min(1, this.t2 / this.hold);
    if (this.t2 >= this.hold) { this.done = true; this.sfx && this.sfx.lock && this.sfx.lock(); }
    return false;
  }
}

// ---- DESTRUCTION : abattre les balises de quarantaine aux canons ----
// Des pods blindés orbitent lentement la planète : il faut les DÉTRUIRE au
// canon à plasma (clic gauche). Le GPS pointe toujours la plus proche.
class DestroyActivity extends Activity {
  start() {
    this.n = this.def.count || 5;
    this.destroyedN = 0;
    this.spread = this.radius * (this.def.spread ?? 1.5);
    this.orbitW = this.def.orbitW ?? 0.004;          // rad/s : dérive orbitale lente
    this.targetSize = this.radius * (this.def.targetSize ?? 0.008);
    this.targets = [];
    for (let i = 0; i < this.n; i++) {
      const t = {
        a0: (i / this.n) * Math.PI * 2 + 0.9,
        rr: this.spread * (0.92 + (i % 3) * 0.12),
        y: this.radius * 0.35 * Math.sin(i * 2.3),
        alive: true,
        pos: new THREE.Vector3(),
        mesh: null,
      };
      if (this.scene) {
        t.mesh = makeBeacon(this.def.color || 0xff9a4d, this.targetSize);
        this.scene.add(t.mesh); this._props.push(t.mesh);
      }
      this.targets.push(t);
    }
  }
  update(dt, ship) {
    this.t += dt;
    const bp = this.bodyPos();
    this.hazardLabel = null;
    const fell = this.applyHazard(dt, ship, bp);
    for (const tg of this.targets) {
      if (!tg.alive) continue;
      const a = tg.a0 + this.t * this.orbitW;
      tg.pos.set(bp.x + Math.cos(a) * tg.rr, bp.y + tg.y, bp.z + Math.sin(a) * tg.rr);
      if (tg.mesh) {
        tg.mesh.position.copy(tg.pos);
        const p = 0.8 + Math.sin(this.t * 5 + tg.a0 * 7) * 0.2;      // pulsation hostile
        tg.mesh.userData.halo.material.opacity = p;
        tg.mesh.userData.ring.rotation.x += dt * 2.2;
        tg.mesh.userData.core.rotation.y += dt * 3;
      }
    }
    this._sp.copy(ship.group.position);
    if (this._sp.distanceTo(bp) - this.radius < this.spread * 1.5) this.engaged = true;
    this.prompt = this.hazardLabel ||
      `BALISES DE QUARANTAINE · ${this.destroyedN}/${this.n} — détruisez-les au canon (clic gauche)`;
    this.danger = !!this.hazardLabel;
    this.progress = this.destroyedN / this.n;
    if (this.destroyedN >= this.n) this.done = true;
    return fell;
  }
  // Impact d'un bolt (segment a->b, rayon rr). Renvoie true si une balise tombe.
  tryBoltHit(a, b, rr) {
    for (const tg of this.targets) {
      if (!tg.alive) continue;
      const R = this.targetSize * 3.5 + rr;          // généreux : le fun avant la précision
      const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
      const apx = tg.pos.x - a.x, apy = tg.pos.y - a.y, apz = tg.pos.z - a.z;
      const ab2 = abx * abx + aby * aby + abz * abz;
      let t = ab2 > 0 ? (apx * abx + apy * aby + apz * abz) / ab2 : 0;
      t = Math.max(0, Math.min(1, t));
      const dx = apx - abx * t, dy = apy - aby * t, dz = apz - abz * t;
      if (dx * dx + dy * dy + dz * dz < R * R) {
        tg.alive = false;
        this.destroyedN++;
        if (tg.mesh && this.scene) this.scene.remove(tg.mesh);
        this.onBoom(tg.pos, this.targetSize * 2.4);
        this.sfx && this.sfx.boom && this.sfx.boom();
        return true;
      }
    }
    return false;
  }
  objectivePos(out, shipPos) {
    let best = null, bd = Infinity;
    for (const tg of this.targets) {
      if (!tg.alive || tg.pos.lengthSq() === 0) continue;
      const d = shipPos ? shipPos.distanceToSquared(tg.pos) : 0;
      if (d < bd) { bd = d; best = tg; }
    }
    if (!best) return false;
    this.objectiveLabel = `Balise ${this.destroyedN + 1}/${this.n}`;
    out.copy(best.pos);
    return true;
  }
}

const TYPES = { lock: LockActivity, shards: ShardActivity, land: LandActivity, destroy: DestroyActivity };

export function makeActivity(def, ctx) {
  const Cls = TYPES[(def && def.type) || "lock"] || LockActivity;
  const a = new Cls(ctx, def);
  a.start();
  return a;
}
