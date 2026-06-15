import * as THREE from "three";
import { PLANETS } from "./config.js";
import { T } from "./strings.js";

const $ = (id) => document.getElementById(id);
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : Math.round(n).toString());

export class Hud {
  constructor() {
    this.el = {
      mpTitle: $("mpTitle"), mpDesc: $("mpDesc"), mpCount: $("mpCount"),
      mpProg: $("mpProgFill"), mpDist: $("mpDist"),
      prompt: $("prompt"), toast: $("toast"), log: $("logList"), credits: $("creditsVal"),
      speed: $("speedVal"), throttle: $("throttleFill"), throttleWrap: $("throttleWrap"),
      near: $("nearVal"), marker: $("targetMarker"), markerName: $("targetMarkerName"),
      markerDist: $("targetMarkerDist"), arrow: $("targetArrow"), arrowDist: $("targetArrowDist"),
      minimap: $("minimap"),
    };
    this.mmctx = this.el.minimap.getContext("2d");
    this._v = new THREE.Vector3();
    this._maxDist = Math.max(...PLANETS.map((p) => p.distance || 0)) * 1.05;
  }

  setMission(num, total, title, desc, name) {
    this.el.mpTitle.textContent = `${name} — ${title}`;
    this.el.mpDesc.textContent = desc;
    this.el.mpCount.textContent = `${num}/${total}`;
    this.setProgress(0);
  }
  setProgress(p) { this.el.mpProg.style.width = Math.max(0, Math.min(1, p)) * 100 + "%"; }
  setDistance(alt) { this.el.mpDist.textContent = alt == null ? "" : `Distance : ${fmt(alt)} u`; }
  setCredits(c) { this.el.credits.textContent = c; }
  setNearest(name) { this.el.near.textContent = name || "—"; }

  setSpeed(speed, boosting, throttleVis) {
    this.el.speed.textContent = Math.round(speed);
    this.el.throttle.style.width = Math.max(0, Math.min(1, throttleVis)) * 100 + "%";
    this.el.throttleWrap.classList.toggle("boost", !!boosting);
  }

  showPrompt(html) {
    if (!html) { this.el.prompt.classList.add("hidden"); return; }
    this.el.prompt.innerHTML = html; this.el.prompt.classList.remove("hidden");
  }

  toast(msg, type = "ok") {
    const d = document.createElement("div");
    d.className = "toast-item" + (type === "warn" ? " warn" : "");
    d.textContent = msg;
    this.el.toast.appendChild(d);
    setTimeout(() => d.remove(), 4000);
  }

  renderLog(list) {
    this.el.log.innerHTML = "";
    for (const m of list) {
      const li = document.createElement("li");
      if (m.done) li.className = "done";
      li.innerHTML = `<span class="ic">${m.done ? "✔" : "•"}</span><span>${m.def.name} — ${m.def.mission.title}</span>`;
      this.el.log.appendChild(li);
    }
  }

  updateTargetMarker(camera, world, name, dist) {
    if (!world) { this.el.marker.style.display = "none"; this.el.arrow.style.display = "none"; return; }
    const W = innerWidth, H = innerHeight;
    const cam = world.clone().applyMatrix4(camera.matrixWorldInverse);
    const inFront = cam.z < 0;
    this._v.copy(world).project(camera);
    const sx = (this._v.x * 0.5 + 0.5) * W, sy = (-this._v.y * 0.5 + 0.5) * H;
    const onScreen = inFront && sx >= 24 && sx <= W - 24 && sy >= 70 && sy <= H - 90;
    if (onScreen) {
      this.el.arrow.style.display = "none";
      this.el.marker.style.display = "flex";
      this.el.marker.style.left = sx + "px"; this.el.marker.style.top = sy + "px";
      this.el.markerName.textContent = name; this.el.markerDist.textContent = fmt(dist) + " u";
    } else {
      this.el.marker.style.display = "none";
      this.el.arrow.style.display = "flex";
      let dx = this._v.x, dy = this._v.y;
      if (!inFront) { dx = -dx; dy = -dy; }
      const ang = Math.atan2(dy, dx);
      const R = Math.min(W, H) * 0.34;
      const ax = W / 2 + Math.cos(ang) * R, ay = H / 2 - Math.sin(ang) * R;
      this.el.arrow.style.left = ax + "px"; this.el.arrow.style.top = ay + "px";
      this.el.arrow.firstElementChild.style.transform = `rotate(${90 - ang * 180 / Math.PI}deg)`;
      this.el.arrowDist.textContent = name + " · " + fmt(dist) + " u";
    }
  }

  updateMinimap(system, ship, targetKey) {
    const ctx = this.mmctx, S = this.el.minimap.width, c = S / 2;
    const scale = (c - 12) / this._maxDist;
    ctx.clearRect(0, 0, S, S);
    // orbites
    ctx.strokeStyle = "rgba(95,208,255,.16)"; ctx.lineWidth = 1;
    for (const p of PLANETS) {
      if (!p.distance) continue;
      ctx.beginPath(); ctx.arc(c, c, p.distance * scale, 0, Math.PI * 2); ctx.stroke();
    }
    // soleil
    ctx.fillStyle = "#ffd27a"; ctx.beginPath(); ctx.arc(c, c, 4, 0, Math.PI * 2); ctx.fill();
    // planètes
    for (const [key, b] of system.bodies) {
      if (key === "sun" || key === "moon") continue;
      b.getWorldPosition(this._v);
      const x = c + this._v.x * scale, y = c + this._v.z * scale;
      if (key === targetKey) {
        ctx.strokeStyle = "#ffcf5f"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = "#" + new THREE.Color(b.def.color || 0x99aabb).getHexString();
      ctx.beginPath(); ctx.arc(x, y, key === targetKey ? 3.2 : 2.4, 0, Math.PI * 2); ctx.fill();
    }
    // vaisseau
    const sx = c + ship.group.position.x * scale, sy = c + ship.group.position.z * scale;
    ship.forward(this._v);
    const a = Math.atan2(this._v.z, this._v.x);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
    ctx.fillStyle = "#7CFFB2"; ctx.beginPath();
    ctx.moveTo(7, 0); ctx.lineTo(-4, 4); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  buildControls(container) {
    container.innerHTML = "";
    for (const [key, label] of T("controls")) {
      const row = document.createElement("div"); row.className = "row";
      row.innerHTML = `<span>${label}</span><span class="key">${key}</span>`;
      container.appendChild(row);
    }
  }

  buildHelp(el) {
    el.innerHTML = `<h3>COMMANDES</h3>` +
      T("controls").map(([k, l]) => `<div class="row"><span>${l}</span><span class="key">${k}</span></div>`).join("");
  }
}
