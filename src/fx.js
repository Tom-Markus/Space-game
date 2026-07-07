// ===================================================================
//  FX — effets visuels d'immersion, tous procéduraux (aucun asset) :
//
//   • SpeedDust   : poussière spatiale enveloppant la caméra. Donne la
//                   sensation de vitesse (croisière/boost) ; en distorsion
//                   les grains s'étirent en traînées d'étoiles 3D.
//   • LensFlare   : reflet d'objectif du Soleil (DOM, mode screen),
//                   atténué quand un astre s'interpose ou hors-champ.
//   • LocalRocks  : astéroïdes instanciés qui se matérialisent autour de
//                   la caméra quand on traverse une région (ceinture
//                   principale, ceinture de Kuiper, anneaux de Saturne).
//                   Placement déterministe par hachage de grille -> le
//                   même caillou réapparaît toujours au même endroit.
//   • BeltHaze    : les deux ceintures vues de loin — anneaux de fines
//                   particules scintillantes autour du plan écliptique.
// ===================================================================
import * as THREE from "three";

// disque doux partagé par tous les systèmes de points (sinon : carrés bruts)
let _discTex = null;
function discTexture() {
  if (_discTex) return _discTex;
  const s = 64, cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  _discTex = new THREE.CanvasTexture(cv);
  return _discTex;
}

// ------------------------------------------------------------------
//  Poussière de vitesse + traînées de distorsion
// ------------------------------------------------------------------
const DUST_N = 650;          // grains (points)
const DUST_D = 5200;         // taille du cube enveloppant la caméra (u)
const STREAK_N = 320;        // traînées (segments) en boost/warp

export class SpeedDust {
  constructor(scene) {
    this.scene = scene;
    this._tmp = new THREE.Vector3();

    // grains : points additifs discrets, opacité liée à la vitesse
    const pos = new Float32Array(DUST_N * 3);
    for (let i = 0; i < DUST_N * 3; i++) pos[i] = (Math.random() - 0.5) * DUST_D;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.dustMat = new THREE.PointsMaterial({
      color: 0xa8c4e8, size: 8, sizeAttenuation: true, transparent: true, map: discTexture(),
      opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.dust = new THREE.Points(pg, this.dustMat);
    this.dust.frustumCulled = false;
    scene.add(this.dust);

    // traînées : paires de sommets (tête/queue) mises à jour chaque frame
    this._streakBase = new Float32Array(STREAK_N * 3);       // position "tête" persistante
    for (let i = 0; i < STREAK_N * 3; i++) this._streakBase[i] = (Math.random() - 0.5) * DUST_D;
    const lpos = new Float32Array(STREAK_N * 6);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.BufferAttribute(lpos, 3));
    this.streakMat = new THREE.LineBasicMaterial({
      color: 0xcfe4ff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.streaks = new THREE.LineSegments(lg, this.streakMat);
    this.streaks.frustumCulled = false;
    scene.add(this.streaks);
  }

  // repli d'une coordonnée dans le cube centré sur c
  static _wrap(v, c) {
    let d = v - c;
    d -= Math.round(d / DUST_D) * DUST_D;
    return c + d;
  }

  update(dt, camera, velocity, warpAmount) {
    const c = camera.position;
    const speed = velocity.length();

    // ---- grains ----
    const pa = this.dust.geometry.attributes.position.array;
    for (let i = 0; i < DUST_N; i++) {
      pa[i * 3] = SpeedDust._wrap(pa[i * 3], c.x);
      pa[i * 3 + 1] = SpeedDust._wrap(pa[i * 3 + 1], c.y);
      pa[i * 3 + 2] = SpeedDust._wrap(pa[i * 3 + 2], c.z);
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    // visibles dès qu'on avance, effacés en distorsion (remplacés par les traînées)
    const dustTarget = speed > 250 ? Math.min(0.55, speed / 12000) * (1 - warpAmount) : 0;
    this.dustMat.opacity += (dustTarget - this.dustMat.opacity) * Math.min(1, dt * 4);
    this.dust.visible = this.dustMat.opacity > 0.01;

    // ---- traînées (surtout distorsion, à peine en boost soutenu) ----
    const streakTarget = speed > 25000 || warpAmount > 0.1
      ? Math.min(0.85, warpAmount * 0.7 + Math.max(0, speed - 25000) / 2.5e5) : 0;
    this.streakMat.opacity += (streakTarget - this.streakMat.opacity) * Math.min(1, dt * 5);
    this.streaks.visible = this.streakMat.opacity > 0.02;
    if (this.streaks.visible) {
      // longueur de traînée : proportionnelle à la vitesse, bornée au volume
      const len = Math.min(DUST_D * 0.42, Math.max(60, speed * 0.010 + warpAmount * 900));
      this._tmp.copy(velocity);
      if (speed > 1) this._tmp.multiplyScalar(len / speed); else this._tmp.set(0, 0, len);
      const la = this.streaks.geometry.attributes.position.array;
      const sb = this._streakBase;
      for (let i = 0; i < STREAK_N; i++) {
        const x = SpeedDust._wrap(sb[i * 3], c.x);
        const y = SpeedDust._wrap(sb[i * 3 + 1], c.y);
        const z = SpeedDust._wrap(sb[i * 3 + 2], c.z);
        sb[i * 3] = x; sb[i * 3 + 1] = y; sb[i * 3 + 2] = z;
        la[i * 6] = x; la[i * 6 + 1] = y; la[i * 6 + 2] = z;
        la[i * 6 + 3] = x - this._tmp.x; la[i * 6 + 4] = y - this._tmp.y; la[i * 6 + 5] = z - this._tmp.z;
      }
      this.streaks.geometry.attributes.position.needsUpdate = true;
    }
  }
}

// ------------------------------------------------------------------
//  Lens flare du Soleil (DOM, mix-blend screen) : cœur + fantômes +
//  strie anamorphique. S'éteint si le Soleil est hors-champ ou occulté.
// ------------------------------------------------------------------
export class LensFlare {
  constructor(system) {
    this.system = system;
    this.op = 0;
    this._sun = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._v = new THREE.Vector3();

    const root = document.createElement("div");
    root.id = "lensflare";
    // fantômes le long de l'axe centre-écran <-> Soleil : [décalage, taille px, teinte, alpha]
    this.ghostDefs = [
      [1.0, 190, "255,236,200", 0.50],   // cœur diffus sur le Soleil
      [0.55, 26, "150,200,255", 0.30],
      [0.32, 60, "255,190,120", 0.16],
      [0.05, 14, "200,230,255", 0.30],
      [-0.22, 44, "140,190,255", 0.18],
      [-0.5, 90, "255,170,110", 0.10],
      [-0.72, 22, "180,220,255", 0.22],
    ];
    this.ghosts = this.ghostDefs.map(([, size, tint, a]) => {
      const g = document.createElement("div");
      g.className = "lf-ghost";
      g.style.width = g.style.height = size + "px";
      g.style.background = `radial-gradient(circle, rgba(${tint},${a}) 0%, rgba(${tint},${a * 0.5}) 35%, rgba(${tint},0) 70%)`;
      root.appendChild(g);
      return g;
    });
    this.streak = document.createElement("div");
    this.streak.className = "lf-streak";
    root.appendChild(this.streak);
    document.body.appendChild(root);
    this.root = root;
  }

  update(dt, camera) {
    this._sun.set(0, 0, 0);                 // Soleil à l'origine du monde
    this._v.copy(this._sun).project(camera);
    const inFront = this._v.z < 1;
    const sx = (this._v.x * 0.5 + 0.5) * innerWidth;
    const sy = (-this._v.y * 0.5 + 0.5) * innerHeight;
    let target = 0;
    if (inFront && sx > -80 && sx < innerWidth + 80 && sy > -80 && sy < innerHeight + 80) {
      target = 1;
      // occlusion : un astre coupe-t-il le segment caméra -> Soleil ?
      const cam = camera.position;
      const toSun = this._b.copy(this._sun).sub(cam);
      const L = toSun.length();
      toSun.multiplyScalar(1 / L);
      for (const [key, b] of this.system.bodies) {
        if (key === "sun") continue;
        b.getWorldPosition(this._v);
        this._v.sub(cam);
        const t = this._v.dot(toSun);
        if (t <= 0 || t >= L) continue;
        const d2 = this._v.lengthSq() - t * t;
        const r = b.radius * 1.02;
        if (d2 < r * r) { target = 0; break; }
      }
      // fondu doux vers les bords de l'écran
      const ex = Math.min(sx, innerWidth - sx) / innerWidth;
      const ey = Math.min(sy, innerHeight - sy) / innerHeight;
      target *= Math.max(0, Math.min(1, Math.min(ex, ey) * 6 + 0.25));
    }
    this.op += (target - this.op) * Math.min(1, dt * 6);
    if (this.op < 0.02) { this.root.style.opacity = "0"; return; }
    this.root.style.opacity = this.op.toFixed(3);
    const cx = innerWidth / 2, cy = innerHeight / 2;
    const dx = sx - cx, dy = sy - cy;
    for (let i = 0; i < this.ghosts.length; i++) {
      const k = this.ghostDefs[i][0];
      this.ghosts[i].style.transform = `translate(${cx + dx * k}px, ${cy + dy * k}px) translate(-50%,-50%)`;
    }
    this.streak.style.transform = `translate(${sx}px, ${sy}px) translate(-50%,-50%)`;
  }
}

// ------------------------------------------------------------------
//  Champs de roches locaux : hachage de grille déterministe.
//  Régions : ceinture principale, Kuiper, anneaux de Saturne.
//  Les astéroïdes sont destructibles (canons à plasma, cf. weapons.js).
// ------------------------------------------------------------------
function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;             // [0,1)
}

// Géométrie d'astéroïde : icosaèdre déformé par une somme de lobes sinusoïdaux
// (grosses bosses lisses) + cratères d'impact creusés, rendu en flat shading
// -> silhouette anguleuse et facettée, façon 253 Mathilde / 951 Gaspra.
function makeRockGeo(seed, detail) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const gp = geo.attributes.position;
  const v = new THREE.Vector3();
  const s1 = 1.7 + (seed % 5) * 0.53, s2 = 2.9 + (seed % 3) * 0.77, s3 = 4.3 + (seed % 7) * 0.31;
  // cratères : quelques directions aléatoires, creusées en cuvette
  const craters = [];
  for (let i = 0; i < 5 + (seed % 3); i++) {
    const a = hash3(seed, i * 17, 3) * Math.PI * 2, b = Math.acos(hash3(seed, i * 31, 7) * 2 - 1);
    craters.push({
      dir: new THREE.Vector3(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)),
      size: 0.75 + hash3(seed, i, 11) * 0.18,      // cos(θ) au bord du cratère
      depth: 0.10 + hash3(seed, i, 13) * 0.16,
    });
  }
  for (let i = 0; i < gp.count; i++) {
    v.fromBufferAttribute(gp, i);
    // lobes lisses (3 fréquences) -> patatoïde irrégulier
    let r = 1
      + 0.26 * Math.sin(v.x * s1 + seed) * Math.sin(v.y * s1 * 0.8 + seed * 2.1)
      + 0.14 * Math.sin(v.y * s2 + seed * 3.7) * Math.sin(v.z * s2 * 1.1 + seed)
      + 0.07 * Math.sin(v.z * s3 + seed * 1.3) * Math.sin(v.x * s3 * 0.9 + seed * 5.2);
    // cratères en cuvette douce
    for (const c of craters) {
      const d = v.dot(c.dir);
      if (d > c.size) {
        const t = (d - c.size) / (1 - c.size);        // 0 au bord -> 1 au centre
        r -= c.depth * t * t * (3 - 2 * t);
      }
    }
    v.multiplyScalar(Math.max(0.45, r));
    gp.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export class LocalRocks {
  // regions : [{ name, contains(pos)->bool, cell, prob, sizeMin, sizeMax, color }]
  // opts    : { range (cellules), max (instances), detail (subdivision géométrie) }
  //           -> pilotés par la qualité choisie (2K/4K/8K = distance de rendu)
  constructor(scene, regions, opts = {}) {
    this.regions = regions;
    this.range = opts.range || 8;
    this.max = opts.max || 256;
    this.activeRegion = null;                  // exposé (barks d'ARIA)
    this.destroyed = new Set();                // cellules dont la roche a été détruite
    this.list = [];                            // roches courantes { key, x,y,z, r } (cibles de tir)
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._p = new THREE.Vector3();
    this._e = new THREE.Euler();
    this._c = new THREE.Color();
    this._acc = 1;                             // premier passage immédiat

    // 3 variantes de géométrie (variété des silhouettes), flat shading
    const detail = opts.detail ?? 3;
    this.meshes = [];
    for (let vI = 0; vI < 3; vI++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.97, metalness: 0.03, flatShading: true });
      const m = new THREE.InstancedMesh(makeRockGeo(vI * 47 + 13, detail), mat, this.max);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
      m.frustumCulled = false;
      scene.add(m);
      this.meshes.push(m);
    }

    // offsets de cellules TRIÉS par distance : quand le plafond d'instances est
    // atteint, ce sont les cellules LOINTAINES qu'on abandonne (jamais celles
    // sous le nez du joueur) -> distribution isotrope autour de la caméra.
    const R = this.range;
    this._offsets = [];
    for (let x = -R; x <= R; x++)
      for (let y = -R; y <= R; y++)
        for (let z = -R; z <= R; z++)
          if (x * x + y * y + z * z <= R * R) this._offsets.push([x, y, z]);
    this._offsets.sort((a, b) => (a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) - (b[0] * b[0] + b[1] * b[1] + b[2] * b[2]));
  }

  update(dt, camPos) {
    // rafraîchissement dosé (10 Hz suffit largement)
    this._acc += dt;
    if (this._acc < 0.1) return;
    this._acc = 0;

    let region = null;
    for (const r of this.regions) if (r.contains(camPos)) { region = r; break; }
    this.activeRegion = region;
    if (!region) {
      if (this.list.length) { this.list.length = 0; for (const m of this.meshes) m.count = 0; }
      return;
    }

    const cell = region.cell;
    const cx = Math.floor(camPos.x / cell), cy = Math.floor(camPos.y / cell), cz = Math.floor(camPos.z / cell);
    for (const m of this.meshes) m.count = 0;    // reconstruction complète à chaque passe
    let total = 0;
    this.list.length = 0;
    for (const [ox, oy, oz] of this._offsets) {
      if (total >= this.max) break;         // plafond GLOBAL (toutes variantes confondues)
      const ix = cx + ox, iy = cy + oy, iz = cz + oz;
      const h = hash3(ix, iy, iz);
      if (h > region.prob) continue;
      const key = region.name + ":" + ix + "," + iy + "," + iz;
      if (this.destroyed.has(key)) continue;
      // position déterministe dans la cellule
      const fx = hash3(ix + 71, iy, iz), fy = hash3(ix, iy + 37, iz), fz = hash3(ix, iy, iz + 113);
      this._p.set((ix + fx) * cell, (iy + fy) * cell, (iz + fz) * cell);
      if (!region.contains(this._p)) continue;
      const variant = (h * 3 / region.prob) | 0;
      const mesh = this.meshes[Math.min(2, variant)];
      if (mesh.count >= this.max) continue;
      const size = region.sizeMin + hash3(ix + 5, iy + 9, iz + 3) * (region.sizeMax - region.sizeMin);
      this._e.set(fx * 6.28, fy * 6.28, fz * 6.28);
      this._q.setFromEuler(this._e);
      this._s.set(size * (0.75 + fx * 0.5), size * (0.75 + fy * 0.5), size * (0.75 + fz * 0.5));
      this._m.compose(this._p, this._q, this._s);
      const n = mesh.count;
      mesh.setMatrixAt(n, this._m);
      this._c.setHex(region.color || 0x8d8578).multiplyScalar(0.72 + fx * 0.55);
      mesh.setColorAt(n, this._c);
      mesh.count = n + 1;
      total++;
      this.list.push({ key, x: this._p.x, y: this._p.y, z: this._p.z, r: size * 1.25 });
    }
    for (const m of this.meshes) {
      if (m.count) {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    }
  }

  // Collision vaisseau <-> roches, BALAYÉE (segment prev -> pos : aucun
  // tunneling, même à 80 000 u/s). Désactivée en distorsion (traverser la
  // ceinture à des millions d'u/s ne doit jamais stopper le vaisseau).
  // Renvoie true si un impact vient d'être résolu.
  resolveShipCollision(prev, ship) {
    if (!this.list.length) return false;
    if (Math.abs(ship.speed) > 80000) return false;      // vitesse de distorsion
    const p = ship.group.position;
    for (const rock of this.list) {
      const R = rock.r + ship.clearance;
      const abx = p.x - prev.x, aby = p.y - prev.y, abz = p.z - prev.z;
      const apx = rock.x - prev.x, apy = rock.y - prev.y, apz = rock.z - prev.z;
      const ab2 = abx * abx + aby * aby + abz * abz;
      let t = ab2 > 0 ? (apx * abx + apy * aby + apz * abz) / ab2 : 0;
      t = Math.max(0, Math.min(1, t));
      const dx = apx - abx * t, dy = apy - aby * t, dz = apz - abz * t;
      if (dx * dx + dy * dy + dz * dz >= R * R) continue;
      // repousse le vaisseau hors de la sphère (depuis sa position courante)
      let nx = p.x - rock.x, ny = p.y - rock.y, nz = p.z - rock.z;
      let L = Math.hypot(nx, ny, nz);
      if (L < 1e-3) { nx = abx; ny = aby; nz = abz; L = Math.hypot(nx, ny, nz) || 1; }
      const k = (R * 1.02) / L;
      p.set(rock.x + nx * k, rock.y + ny * k, rock.z + nz * k);
      if (ship.speed > 0) ship.speed *= 0.2;             // l'impact casse la vitesse
      if (ship.velocity) ship.velocity.multiplyScalar(0.2);
      return true;
    }
    return false;
  }

  // Impact d'un tir : segment (a -> b, rayon élargi rr). Détruit la roche touchée.
  // Renvoie la roche ({x,y,z,r}) ou null.
  tryBoltHit(a, b, rr) {
    for (const rock of this.list) {
      const R = rock.r + rr;
      // distance point-segment (au carré)
      const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
      const apx = rock.x - a.x, apy = rock.y - a.y, apz = rock.z - a.z;
      const ab2 = abx * abx + aby * aby + abz * abz;
      let t = ab2 > 0 ? (apx * abx + apy * aby + apz * abz) / ab2 : 0;
      t = Math.max(0, Math.min(1, t));
      const dx = apx - abx * t, dy = apy - aby * t, dz = apz - abz * t;
      if (dx * dx + dy * dy + dz * dz < R * R) {
        this.destroyed.add(rock.key);
        this._acc = 1;                       // re-matérialise immédiatement (sans la roche)
        return rock;
      }
    }
    return null;
  }
}

// ------------------------------------------------------------------
//  Explosions : flash additif + éclats projetés, en pool réutilisable.
// ------------------------------------------------------------------
const EXPLO_MAX = 10;
const SPARKS = 7;

export class Explosions {
  constructor(scene) {
    this.pool = [];
    for (let i = 0; i < EXPLO_MAX; i++) {
      const grp = new THREE.Group();
      const core = new THREE.Sprite(new THREE.SpriteMaterial({
        map: discTexture(), color: 0xffd9a0, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      grp.add(core);
      const sparks = [];
      for (let k = 0; k < SPARKS; k++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: discTexture(), color: 0xffb060, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        s.userData.dir = new THREE.Vector3().randomDirection();
        grp.add(s);
        sparks.push(s);
      }
      grp.visible = false;
      scene.add(grp);
      this.pool.push({ grp, core, sparks, t: 1e9, size: 1 });
    }
    this._next = 0;
  }

  spawn(pos, size) {
    const e = this.pool[this._next];
    this._next = (this._next + 1) % EXPLO_MAX;
    e.grp.position.copy(pos);
    e.grp.visible = true;
    e.t = 0;
    e.size = size;
    for (const s of e.sparks) { s.position.set(0, 0, 0); s.userData.dir.randomDirection(); }
  }

  update(dt) {
    for (const e of this.pool) {
      if (e.t > 0.9) { if (e.grp.visible) e.grp.visible = false; continue; }
      e.t += dt;
      const t = Math.min(1, e.t / 0.65);
      const fade = 1 - t;
      e.core.material.opacity = fade * fade;
      e.core.scale.setScalar(e.size * (0.5 + t * 1.7));
      e.core.material.color.setHSL(0.09 - t * 0.05, 1, 0.75 - t * 0.3);
      for (const s of e.sparks) {
        s.position.copy(s.userData.dir).multiplyScalar(e.size * t * 3.2);
        s.scale.setScalar(e.size * 0.28 * fade);
        s.material.opacity = fade;
      }
    }
  }
}

// ------------------------------------------------------------------
//  Ceintures vues de loin : anneaux de particules scintillantes.
// ------------------------------------------------------------------
export class BeltHaze {
  // belts : [{ inner, outer, thickness, count, color, opacity, size }]
  constructor(scene, belts) {
    this.meshes = [];
    for (const b of belts) {
      const pos = new Float32Array(b.count * 3);
      for (let i = 0; i < b.count; i++) {
        const a = Math.random() * Math.PI * 2;
        // densité maximale au centre de l'anneau (loi en cloche simple)
        const t = (Math.random() + Math.random()) / 2;
        const r = b.inner + t * (b.outer - b.inner);
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = (Math.random() + Math.random() - 1) * b.thickness;
        pos[i * 3 + 2] = Math.sin(a) * r;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({
        color: b.color, size: b.size || 2.2, sizeAttenuation: false, transparent: true, map: discTexture(),
        opacity: b.opacity, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const pts = new THREE.Points(g, m);
      pts.frustumCulled = false;
      scene.add(pts);
      this.meshes.push(pts);
    }
  }
}
