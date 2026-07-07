// Carte du système plein écran : vue de dessus, sélection d'une destination.
// Cliquer un astre (sur la carte ou dans la liste) définit le « cap » : de retour
// au pilotage, une flèche du HUD pointe vers lui.
import * as THREE from "three";
import { SCALE } from "./config.js";

const KM = SCALE.unitKm;
function fmtKm(km) {
  if (km >= 1e9) return (km / 1e9).toFixed(2) + " G km";
  if (km >= 1e6) return (km / 1e6).toFixed(2) + " M km";
  if (km >= 1e3) return (km / 1e3).toFixed(1) + " k km";
  return Math.round(km) + " km";
}

export class StarMap {
  constructor(system, onSelect, onClose) {
    this.system = system; this.onSelect = onSelect; this.onClose = onClose;
    this.open = false;
    this._openedAt = 0;
    this.cap = null;            // clé de l'astre choisi
    this.ship = null;
    this._v = new THREE.Vector3();
    this._hits = [];            // { key, x, y, r } pour le clic sur la carte
    this._build();
  }

  _build() {
    const ov = document.createElement("div");
    ov.id = "starmap"; ov.className = "overlay hidden";
    ov.innerHTML = `
      <div class="sm-panel">
        <div class="sm-head">
          <h2>CARTE DU SYSTÈME</h2>
          <span class="sm-sub">Choisissez une destination — une flèche vous y guidera</span>
        </div>
        <div class="sm-body">
          <div class="sm-mapwrap"><canvas id="smCanvas" width="620" height="620"></canvas></div>
          <div class="sm-side">
            <div class="sm-cap"><span class="sm-cap-tag">CAP ACTUEL</span><b id="smCapName">— aucun —</b></div>
            <ul id="smList" class="sm-list"></ul>
          </div>
        </div>
        <div class="sm-actions">
          <button id="smClear" class="btn">EFFACER LE CAP</button>
          <button id="smClose" class="btn primary">RETOUR AU PILOTAGE</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    this.ov = ov;
    this.canvas = ov.querySelector("#smCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.listEl = ov.querySelector("#smList");
    this.capName = ov.querySelector("#smCapName");

    ov.querySelector("#smClose").addEventListener("click", () => this.onClose && this.onClose());
    ov.querySelector("#smClear").addEventListener("click", () => this._select(null));
    this.canvas.addEventListener("click", (e) => this._onCanvasClick(e));
    addEventListener("keydown", (e) => {
      if (!this.open) return;
      // ignore l'événement M qui vient tout juste d'OUVRIR la carte (même frappe :
      // le gestionnaire d'input s'exécute avant celui-ci) -> sinon la carte se
      // referme instantanément et la sortie de pointer-lock déclenche la pause.
      if (performance.now() - this._openedAt < 200) return;
      const key = (e.key || "").toLowerCase();
      if (e.code === "Escape" || e.code === "KeyM" || key === "m") { e.preventDefault(); this.onClose && this.onClose(); }
    });
  }

  // liste des astres sélectionnables (tout sauf le Soleil), triés par distance orbitale
  _bodies() {
    const arr = [];
    for (const [key, b] of this.system.bodies) {
      if (key === "sun") continue;
      arr.push({ key, b });
    }
    arr.sort((a, c) => {
      a.b.getWorldPosition(this._v); const da = this._v.length();
      c.b.getWorldPosition(this._v); const dc = this._v.length();
      return da - dc;
    });
    return arr;
  }

  show(ship, cap) {
    this.ship = ship; this.cap = cap || null;
    this.open = true;
    this._openedAt = performance.now();
    this.ov.classList.remove("hidden");
    this._buildList();
    this._refreshCap();
    this.draw();
  }
  close() { this.open = false; this.ov.classList.add("hidden"); }

  _select(key) {
    this.cap = key;
    this.onSelect && this.onSelect(key);
    this._refreshCap();
    this._buildList();
    this.draw();
  }

  _refreshCap() {
    const b = this.cap && this.system.bodies.get(this.cap);
    this.capName.textContent = b ? b.def.name : "— aucun —";
  }

  _buildList() {
    this.listEl.innerHTML = "";
    const shipPos = this.ship ? this.ship.group.position : new THREE.Vector3();
    for (const { key, b } of this._bodies()) {
      b.getWorldPosition(this._v);
      const distU = shipPos.distanceTo(this._v);
      const li = document.createElement("li");
      li.className = "sm-item" + (key === this.cap ? " sel" : "");
      const col = "#" + new THREE.Color(b.def.color || 0x99aabb).getHexString();
      li.innerHTML = `<span class="sm-dot" style="background:${col}"></span>` +
        `<span class="sm-name">${b.def.name}</span>` +
        `<span class="sm-dist">${fmtKm(distU * KM)}</span>`;
      li.addEventListener("click", () => this._select(key));
      this.listEl.appendChild(li);
    }
  }

  _onCanvasClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    let best = null, bd = 22 * 22;
    for (const h of this._hits) {
      const dx = x - h.x, dy = y - h.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = h.key; }
    }
    if (best) this._select(best);
  }

  // échelle radiale racine : compresse les distances lointaines, rend tout cliquable
  draw() {
    const ctx = this.ctx, S = this.canvas.width, c = S / 2, R = c - 30;
    ctx.clearRect(0, 0, S, S);

    const list = this._bodies();
    let maxD = 1;
    for (const { b } of list) { b.getWorldPosition(this._v); maxD = Math.max(maxD, this._v.length()); }
    const rr = (d) => Math.pow(Math.min(d / maxD, 1), 0.5) * R;

    // cercles de repère
    ctx.strokeStyle = "rgba(98,216,255,.08)"; ctx.lineWidth = 1;
    for (const f of [0.25, 0.5, 0.75, 1]) { ctx.beginPath(); ctx.arc(c, c, R * f, 0, Math.PI * 2); ctx.stroke(); }

    // orbites (rayon = distance courante de chaque astre)
    ctx.strokeStyle = "rgba(120,170,220,.10)";
    for (const { b } of list) {
      b.getWorldPosition(this._v); const d = this._v.length();
      ctx.beginPath(); ctx.arc(c, c, rr(d), 0, Math.PI * 2); ctx.stroke();
    }

    // Soleil
    ctx.fillStyle = "#ffd27a"; ctx.shadowColor = "#ffae3c"; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(c, c, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

    // astres + libellés
    this._hits = [];
    ctx.font = "12px ui-monospace, monospace"; ctx.textBaseline = "middle";
    for (const { key, b } of list) {
      b.getWorldPosition(this._v);
      const d = this._v.length(), ang = Math.atan2(this._v.z, this._v.x);
      const x = c + Math.cos(ang) * rr(d), y = c + Math.sin(ang) * rr(d);
      const isCap = key === this.cap;
      const col = "#" + new THREE.Color(b.def.color || 0x99aabb).getHexString();
      if (isCap) {
        ctx.strokeStyle = "#ffc24d"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, isCap ? 5 : 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isCap ? "#ffe3a0" : "#9fb6dd";
      ctx.fillText(b.def.name, x + 9, y);
      this._hits.push({ key, x, y, r: 16 });
    }

    // vaisseau
    if (this.ship) {
      const p = this.ship.group.position, d = Math.hypot(p.x, p.z), ang = Math.atan2(p.z, p.x);
      const x = c + Math.cos(ang) * rr(d), y = c + Math.sin(ang) * rr(d);
      this.ship.forward(this._v); const a = Math.atan2(this._v.z, this._v.x);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = "#62ffb0"; ctx.shadowColor = "#62ffb0"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, 5); ctx.lineTo(-5, -5); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.shadowBlur = 0;
      // trait vers le cap
      if (this.cap) {
        const b = this.system.bodies.get(this.cap); b.getWorldPosition(this._v);
        const cd = this._v.length(), cang = Math.atan2(this._v.z, this._v.x);
        const cx = c + Math.cos(cang) * rr(cd), cy = c + Math.sin(cang) * rr(cd);
        ctx.strokeStyle = "rgba(255,194,77,.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx, cy); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }
}
