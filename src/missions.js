import * as THREE from "three";
import { PLANETS, CAMPAIGN_ORDER } from "./config.js";
import { T } from "./strings.js";

export class Missions {
  constructor(system, hud, onWin) {
    this.system = system; this.hud = hud; this.onWin = onWin;
    this.list = CAMPAIGN_ORDER
      .map((k) => PLANETS.find((p) => p.key === k))
      .filter((d) => d && d.mission)
      .map((d) => ({ key: d.key, def: d, done: false }));
    this.index = 0;
    this.progress = 0;
    this.credits = 0;
    this.completed = 0;
    this._pos = new THREE.Vector3();
    this._wonGiven = false;
    this.activeKey = this.list[0]?.key || null;
    this._refreshPanel();
    this.hud.renderLog(this.list);
    this.hud.setCredits(0);
  }

  current() { return this.list[this.index]; }

  _refreshPanel() {
    const m = this.current();
    if (!m) return;
    this.activeKey = m.key;
    this.progress = 0;
    this.hud.setMission(this.completed + 1, this.list.length, m.def.mission.title, m.def.mission.desc, m.def.name);
  }

  _rangeFor(m, radius) {
    if (m.def.mission.type === "land") return radius * 0.2;   // près de la surface
    return radius * 2.8;                                      // ~2,8 rayons (proportionnel)
  }

  update(dt, ship, input) {
    const m = this.current();
    if (!m) return;
    const body = this.system.bodies.get(m.key);
    if (!body) return;
    body.getWorldPosition(this._pos);
    const dist = ship.group.position.distanceTo(this._pos);
    const altitude = Math.max(0, dist - body.radius);
    this.hud.setDistance(altitude);

    const type = m.def.mission.type;

    if (type === "flythrough") {
      const r = m.def.ring;
      const inShell = dist > r.inner * 0.75 && dist < r.outer * 1.2;
      this.hud.showPrompt(inShell ? null : `<b>${m.def.mission.title}</b> — foncez à travers les anneaux`);
      if (inShell) this.progress += dt / 0.8;
      else this.progress = Math.max(0, this.progress - dt * 0.4);
      this.hud.setProgress(this.progress);
      if (this.progress >= 1) this._complete(m);
      return;
    }

    // scan / probe / sample / land
    const range = this._rangeFor(m, body.radius);
    const inRange = altitude < range;
    const hold = m.def.mission.hold || (type === "land" ? 1.5 : 3);
    const verbs = T("verbs");
    const verb = verbs[m.def.mission.verb] || verbs.scan;

    if (inRange) {
      if (input.interact()) {
        this.progress += dt / hold;
        this.hud.showPrompt(T("promptScanning")(Math.min(99, Math.floor(this.progress * 100))));
      } else {
        this.hud.showPrompt(T("promptHold")(verb, m.def.name));
        this.progress = Math.max(0, this.progress - dt * 0.4);
      }
    } else {
      this.hud.showPrompt(null);
      this.progress = Math.max(0, this.progress - dt * 0.5);
    }
    this.hud.setProgress(this.progress);
    if (this.progress >= 1) this._complete(m);
  }

  _complete(m) {
    m.done = true;
    this.completed++;
    this.progress = 0;
    const reward = m.def.mission.reward || 100;
    this.credits += reward;
    this.hud.showPrompt(null);
    this.hud.setCredits(this.credits);
    this.hud.renderLog(this.list);
    this.hud.toast(`${T("objComplete")(m.def.name)}  ·  ${T("reward")(reward)}`);

    const next = this.list.findIndex((x) => !x.done);
    if (next === -1) {
      if (!this._wonGiven) { this._wonGiven = true; this.activeKey = null; this.hud.toast(T("allDone")); this.onWin && this.onWin(this.credits); }
      return;
    }
    this.index = next;
    this._refreshPanel();
    this.hud.toast(T("nextMission")(this.current().def.name), "warn");
  }
}
