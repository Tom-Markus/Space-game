import * as THREE from "three";
import { PLANETS, SCALE } from "./config.js";

const $ = (id) => document.getElementById(id);
const KM = SCALE.unitKm;                         // km par unité scène

function fmtKm(km) {
  if (km >= 1e9) return (km / 1e9).toFixed(2) + " G km";
  if (km >= 1e6) return (km / 1e6).toFixed(2) + " M km";
  if (km >= 1e3) return (km / 1e3).toFixed(1) + " k km";
  return Math.round(km) + " km";
}
function fmtSpeed(kmps) {
  if (kmps >= 1e6) return (kmps / 1e6).toFixed(1) + "M";
  if (kmps >= 1e3) return (kmps / 1e3).toFixed(1) + "k";
  return Math.round(kmps).toString();
}

export class Hud {
  constructor() {
    this.el = {
      mpTitle: $("mpTitle"), mpDesc: $("mpDesc"), mpCount: $("mpCount"), mpProg: $("mpProgFill"), mpDist: $("mpDist"),
      prompt: $("prompt"), toast: $("toast"), log: $("logList"), credits: $("creditsVal"),
      speed: $("speedVal"), mode: $("modeBadge"), gauge: $("gaugeFill"),
      near: $("nearVal"), nearDist: $("nearDist"),
      marker: $("targetMarker"), markerName: $("targetMarkerName"), markerDist: $("targetMarkerDist"),
      arrow: $("targetArrow"), arrowDist: $("targetArrowDist"), minimap: $("minimap"),
      hull: $("hullFill"), shield: $("shieldFill"), statusWrap: $("statusWidget"),
      lockRing: $("lockRing"), reticle: $("reticle"), hitmark: $("hitmark"),
    };
    this._hitT = null;
    this.mm = this.el.minimap.getContext("2d");
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    // rayon radar = orbite de Pluton (les objets épars au-delà sont plaqués au bord)
    this._maxDist = (PLANETS.find((p) => p.key === "pluto")?.distance || 1) * 1.1;
    this._list = [];
  }

  setMission(num, total, title, desc, name, act) {
    this.el.mpTitle.textContent = `${name} — ${title}`;
    this.el.mpDesc.textContent = desc;
    this.el.mpCount.textContent = act ? `${act} · ${num}/${total}` : `${num}/${total}`;
    this.setProgress(0);
  }
  setProgress(p) {
    p = Math.max(0, Math.min(1, p));
    this.el.mpProg.style.width = p * 100 + "%";
    if (this.el.lockRing) {                       // anneau de verrouillage autour du réticule
      const C = 188.5;                            // 2π·30
      this.el.lockRing.style.strokeDashoffset = (C * (1 - p)).toFixed(1);
      this.el.lockRing.classList.toggle("active", p > 0.001);
      this.el.lockRing.classList.toggle("full", p >= 1);
    }
  }
  setDistance(altU) { this.el.mpDist.textContent = altU == null ? "" : "Cible : " + fmtKm(altU * KM); }
  setCredits(c) { this.el.credits.textContent = c; }

  setNav(name, distU) {
    this.el.near.textContent = name || "—";
    this.el.nearDist.textContent = distU == null ? "" : fmtKm(distU * KM);
  }

  setSpeed(speedU, mode, gaugeFrac) {
    this.el.speed.textContent = fmtSpeed(Math.abs(speedU) * KM);
    this.el.mode.className = "mode " + mode;
    this.el.mode.textContent = mode === "warp" ? "DISTORSION" : mode === "boost" ? "POSTCOMBUSTION" : "CROISIÈRE";
    this.el.gauge.style.width = Math.max(0, Math.min(1, gaugeFrac)) * 100 + "%";
    this.el.gauge.style.background = mode === "warp"
      ? "linear-gradient(90deg,#5a7bff,#b06bff)"
      : mode === "boost" ? "linear-gradient(90deg,#ff8a3c,#ffc24d)" : "linear-gradient(90deg,#2b8fc6,#62d8ff)";
  }

  showPrompt(html, warn) {
    if (!html) { this.el.prompt.classList.add("hidden"); return; }
    this.el.prompt.innerHTML = html;
    this.el.prompt.classList.toggle("warn", !!warn);
    this.el.prompt.classList.remove("hidden");
  }

  // intégrité coque / bouclier (0..1)
  setStatus(hull, shield) {
    if (this.el.hull) this.el.hull.style.width = Math.max(0, Math.min(1, hull)) * 100 + "%";
    if (this.el.shield) this.el.shield.style.width = Math.max(0, Math.min(1, shield)) * 100 + "%";
    if (this.el.statusWrap) this.el.statusWrap.classList.toggle("critical", hull < 0.34);
  }

  // marqueur de touche : X ambre qui claque sur le réticule (impact confirmé)
  hitmark() {
    if (!this.el.hitmark) return;
    this.el.hitmark.classList.remove("show");
    void this.el.hitmark.getBoundingClientRect();     // relance la transition
    this.el.hitmark.classList.add("show");
    clearTimeout(this._hitT);
    this._hitT = setTimeout(() => this.el.hitmark.classList.remove("show"), 160);
  }

  // réticule « armé » pendant que la gâchette est tenue
  setFiring(on) {
    if (this.el.reticle) this.el.reticle.classList.toggle("firing", !!on);
  }

  toast(msg, type = "ok") {
    const d = document.createElement("div");
    d.className = "toast-item" + (type === "warn" ? " warn" : "");
    d.textContent = msg; this.el.toast.appendChild(d);
    setTimeout(() => d.remove(), 4000);
  }

  renderLog(list) {
    this._list = list;
    const active = list.findIndex((m) => !m.done);
    this.el.log.innerHTML = "";
    list.forEach((m, i) => {
      const li = document.createElement("li");
      li.className = m.done ? "done" : i === active ? "active" : "";
      li.innerHTML = `<span class="ic">${m.done ? "✔" : i === active ? "▸" : "•"}</span><span>${m.def.name} — ${m.def.mission.title}</span>`;
      this.el.log.appendChild(li);
    });
  }

  updateTargetMarker(camera, world, name, distU, isNav = false) {
    if (!world) { this.el.marker.style.display = "none"; this.el.arrow.style.display = "none"; return; }
    const W = innerWidth, H = innerHeight;
    const inFront = this._v2.copy(world).applyMatrix4(camera.matrixWorldInverse).z < 0;
    this._v.copy(world).project(camera);
    const sx = (this._v.x * 0.5 + 0.5) * W, sy = (-this._v.y * 0.5 + 0.5) * H;
    const label = isNav ? "⌖ " + name : name;
    this.el.marker.classList.toggle("nav", isNav);
    this.el.arrow.classList.toggle("nav", isNav);
    if (inFront && sx >= 26 && sx <= W - 26 && sy >= 76 && sy <= H - 96) {
      this.el.arrow.style.display = "none";
      this.el.marker.style.display = "flex";
      this.el.marker.style.left = sx + "px"; this.el.marker.style.top = sy + "px";
      this.el.markerName.textContent = label; this.el.markerDist.textContent = fmtKm(distU * KM);
    } else {
      this.el.marker.style.display = "none";
      this.el.arrow.style.display = "flex";
      let dx = this._v.x, dy = this._v.y; if (!inFront) { dx = -dx; dy = -dy; }
      const ang = Math.atan2(dy, dx), R = Math.min(W, H) * 0.33;
      this.el.arrow.style.left = (W / 2 + Math.cos(ang) * R) + "px";
      this.el.arrow.style.top = (H / 2 - Math.sin(ang) * R) + "px";
      this.el.arrow.firstElementChild.style.transform = `rotate(${90 - ang * 180 / Math.PI}deg)`;
      this.el.arrowDist.textContent = label + " · " + fmtKm(distU * KM);
    }
  }

  updateMinimap(system, ship, targetKey) {
    const ctx = this.mm, S = this.el.minimap.width, c = S / 2;
    const rMax = c - 10;
    const scale = rMax / this._maxDist;
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = "rgba(98,216,255,.10)"; ctx.lineWidth = 1;
    for (const p of PLANETS) {
      if (!p.distance || p.distance > this._maxDist) continue;
      ctx.beginPath(); ctx.arc(c, c, p.distance * scale, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "#ffd27a"; ctx.beginPath(); ctx.arc(c, c, 3.5, 0, Math.PI * 2); ctx.fill();
    for (const [key, b] of system.bodies) {
      if (key === "sun" || key === "moon") continue;
      b.getWorldPosition(this._v);
      let x = c + this._v.x * scale, y = c + this._v.z * scale;
      // au-delà du rayon radar (Hauméa, Makémaké, Éris…) : plaqué au bord, atténué
      const dx = x - c, dy = y - c, dd = Math.hypot(dx, dy);
      const clamped = dd > rMax;
      if (clamped) { x = c + (dx / dd) * rMax; y = c + (dy / dd) * rMax; }
      if (key === targetKey) {
        ctx.strokeStyle = "#ffc24d"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = clamped ? 0.45 : 1;
      ctx.fillStyle = "#" + new THREE.Color(b.def.color || 0x99aabb).getHexString();
      ctx.beginPath(); ctx.arc(x, y, key === targetKey ? 3 : clamped ? 1.6 : 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    let sx = c + ship.group.position.x * scale, sy = c + ship.group.position.z * scale;
    const sdx = sx - c, sdy = sy - c, sdd = Math.hypot(sdx, sdy);
    if (sdd > rMax) { sx = c + (sdx / sdd) * rMax; sy = c + (sdy / sdd) * rMax; }   // vaisseau plaqué au bord
    ship.forward(this._v); const a = Math.atan2(this._v.z, this._v.x);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
    ctx.fillStyle = "#62ffb0"; ctx.beginPath();
    ctx.moveTo(7, 0); ctx.lineTo(-4, 4); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  buildControls(container, controls) {
    container.innerHTML = "";
    for (const [key, label] of controls) {
      const row = document.createElement("div"); row.className = "row";
      row.innerHTML = `<span>${label}</span><span class="key">${key}</span>`;
      container.appendChild(row);
    }
  }
  buildHelp(el, controls) {
    el.innerHTML = `<h3>COMMANDES</h3>` +
      controls.map(([k, l]) => `<div class="row"><span>${l}</span><span class="key">${k}</span></div>`).join("");
  }
}
