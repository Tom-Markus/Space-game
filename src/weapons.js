// ===================================================================
//  WEAPONS — les canons à plasma de l'Odyssée.
//  Deux tubes sous les ailes, tir alterné (clic gauche / F / manette X).
//  Les bolts sont des traceurs additifs poolés ; la détection d'impact
//  est déléguée à un callback (balises de mission, astéroïdes…).
// ===================================================================
import * as THREE from "three";

const BOLT_MAX = 18;
const BOLT_SPEED = 45000;        // u/s, ajouté à la vitesse du vaisseau au départ
const BOLT_TTL = 3.2;            // durée de vie (s) -> portée ~150 000 u
const COOLDOWN = 0.16;           // s entre deux tirs
const BOLT_R = 220;              // rayon « généreux » du projectile pour les impacts

// Traceur : capsule de plasma dessinée (cœur blanc -> gaine cyan -> fondu),
// plaquée sur deux plans croisés le long de la trajectoire. Aucune « boule ».
function boltTexture() {
  const w = 64, h = 256, cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d");
  ctx.translate(w / 2, h / 2);
  ctx.scale(1, h / w);                                  // gradient radial -> capsule allongée
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.22, "rgba(210,240,255,0.95)");
  g.addColorStop(0.5, "rgba(120,190,255,0.45)");
  g.addColorStop(0.8, "rgba(70,130,255,0.12)");
  g.addColorStop(1.0, "rgba(50,100,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -w / 2, w, w);
  return new THREE.CanvasTexture(cv);
}

// petit halo rond pour le flash de bouche uniquement
function flashTexture() {
  const s = 64, cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(190,230,255,.7)");
  g.addColorStop(1, "rgba(110,170,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(cv);
}

export class Blaster {
  constructor(scene, ship, sfx) {
    this.scene = scene; this.ship = ship; this.sfx = sfx;
    this.cool = 0;
    this._muzzleIdx = 0;
    this.firedOnce = false;                     // pour la réplique d'ARIA au premier tir
    this._fwd = new THREE.Vector3();
    this._prev = new THREE.Vector3();

    // traceur : deux plans croisés (capsule de plasma), effilés, SANS halo-boule
    this.bolts = [];
    const tex = boltTexture();
    const planeA = new THREE.PlaneGeometry(11, 135);
    planeA.rotateX(Math.PI / 2);                 // longueur le long de z
    const planeB = planeA.clone();
    planeB.rotateZ(Math.PI / 2);                 // croisé à 90°
    const boltMat = new THREE.MeshBasicMaterial({
      map: tex, color: 0xffffff, toneMapped: false, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    for (let i = 0; i < BOLT_MAX; i++) {
      const grp = new THREE.Group();
      grp.add(new THREE.Mesh(planeA, boltMat));
      grp.add(new THREE.Mesh(planeB, boltMat));
      grp.visible = false;
      scene.add(grp);
      this.bolts.push({ grp, vel: new THREE.Vector3(), ttl: 0 });
    }

    // flashs de bouche : ENFANTS du canon (ils suivent le vaisseau, aucun
    // artefact flottant derrière soi), très brefs et discrets.
    const fTex = flashTexture();
    this.flashes = (ship.muzzles || []).map((m) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: fTex, color: 0xdaf0ff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      s.scale.setScalar(0.55);                   // unités du MODÈLE (parent mis à l'échelle)
      m.add(s);
      return { sprite: s, t: 1 };
    });
  }

  // À appeler chaque pas quand la gâchette est tenue.
  tryFire() {
    if (this.cool > 0) return false;
    const muzzles = this.ship.muzzles || [];
    if (!muzzles.length) return false;
    this.cool = COOLDOWN;
    this.firedOnce = true;
    const b = this.bolts.find((x) => x.ttl <= 0);
    if (!b) return false;
    const m = muzzles[this._muzzleIdx % muzzles.length];
    this._muzzleIdx++;
    m.getWorldPosition(b.grp.position);
    this.ship.forward(this._fwd);
    b.vel.copy(this._fwd).multiplyScalar(BOLT_SPEED + Math.max(0, this.ship.speed));
    b.grp.quaternion.copy(this.ship.group.quaternion);
    b.ttl = BOLT_TTL;
    b.grp.visible = true;
    const f = this.flashes[(this._muzzleIdx - 1) % Math.max(1, this.flashes.length)];
    if (f) f.t = 0;
    this.sfx && this.sfx.laser && this.sfx.laser();
    return true;
  }

  // onHit(prevPos, newPos, boltRadius) -> objet touché (troncature du bolt) ou null.
  update(dt, onHit) {
    this.cool -= dt;
    for (const b of this.bolts) {
      if (b.ttl <= 0) continue;
      b.ttl -= dt;
      this._prev.copy(b.grp.position);
      b.grp.position.addScaledVector(b.vel, dt);
      if (onHit && onHit(this._prev, b.grp.position, BOLT_R)) b.ttl = 0;
      if (b.ttl <= 0) b.grp.visible = false;
    }
    for (const f of this.flashes) {
      if (f.t >= 1) { f.sprite.material.opacity = 0; continue; }
      f.t = Math.min(1, f.t + dt * 14);           // ~70 ms : un claquement, pas une lampe
      f.sprite.material.opacity = (1 - f.t);
      f.sprite.scale.setScalar(0.4 + f.t * 0.5);  // unités du modèle (parent = canon)
    }
  }
}
