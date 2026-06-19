import * as THREE from "three";
import { PLANETS, CAMPAIGN_ORDER } from "./config.js";
import { T } from "./strings.js";
import { STORY } from "./story.js";

// La campagne « Le Dernier Signal » : une mission par astre, chacune porteuse
// d'un fragment du message. Cette classe pilote la mécanique (scan / posé /
// traversée) ET déclenche la mise en scène radio (briefing, arrivée, set-piece,
// révélation du fragment) via le système de comms.
export class Missions {
  constructor(system, hud, onWin, sfx, comms) {
    this.system = system; this.hud = hud; this.onWin = onWin; this.sfx = sfx; this.comms = comms;
    this.list = CAMPAIGN_ORDER
      .map((k) => PLANETS.find((p) => p.key === k))
      .filter((d) => d && d.mission)
      .map((d) => ({ key: d.key, def: d, done: false }));
    this.index = 0;
    this.progress = 0;
    this.credits = 0;
    this.completed = 0;
    this.fragments = [];          // libellés des fragments déjà recomposés
    this._pos = new THREE.Vector3();
    this._wonGiven = false;
    this._arrived = false;        // réplique d'arrivée déjà jouée ?
    this._eventDone = false;      // set-piece déjà joué ?
    this.activeKey = this.list[0]?.key || null;
    this._refreshPanel(true);
    this.hud.renderLog(this.list);
    this.hud.setCredits(0);
  }

  current() { return this.list[this.index]; }

  _refreshPanel(brief) {
    const m = this.current();
    if (!m) return;
    this.activeKey = m.key;
    this.progress = 0;
    this._arrived = false;
    this._eventDone = false;
    const st = STORY[m.key] || {};
    const desc = st.objective || m.def.mission.desc;
    this.hud.setMission(this.completed + 1, this.list.length, m.def.mission.title, desc, m.def.name);
    if (brief && this.comms && st.brief) this.comms.playSequence(st.brief);
  }

  _rangeFor(m, radius) {
    if (m.def.mission.type === "land") return radius * 0.2;   // près de la surface
    return radius * 2.8;                                      // ~2,8 rayons (proportionnel)
  }

  _arrive(st) {
    if (this._arrived) return;
    this._arrived = true;
    if (this.comms && st.arrival) this.comms.playSequence(st.arrival);
  }

  update(dt, ship, input) {
    if (this.activeKey == null) return;                       // campagne terminée : on n'analyse plus
    const m = this.current();
    if (!m) return;
    const body = this.system.bodies.get(m.key);
    if (!body) return;
    body.getWorldPosition(this._pos);
    const dist = ship.group.position.distanceTo(this._pos);
    const altitude = Math.max(0, dist - body.radius);
    this.hud.setDistance(altitude);

    const type = m.def.mission.type;
    const st = STORY[m.key] || {};

    if (type === "flythrough") {
      const r = m.def.ring;
      const inShell = dist > r.inner * 0.75 && dist < r.outer * 1.2;
      if (inShell) this._arrive(st);
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
      this._arrive(st);
      if (input.interact()) {
        this.progress += dt / hold;
        this.hud.showPrompt(T("promptScanning")(Math.min(99, Math.floor(this.progress * 100))));
        // set-piece scénarisé déclenché en plein scan (ex. éruption solaire à Mercure)
        if (st.event && !this._eventDone && this.progress >= st.event.at) {
          this._eventDone = true;
          if (this.comms && st.event.beats) this.comms.playSequence(st.event.beats);
        }
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
    const st = STORY[m.key] || {};
    if (st.fragment) this.fragments.push(st.fragment);
    const reward = m.def.mission.reward || 100;
    this.credits += reward;
    this.hud.showPrompt(null);
    this.hud.setCredits(this.credits);
    this.hud.renderLog(this.list);
    this.hud.toast(`${T("objComplete")(m.def.name)}  ·  ${T("reward")(reward)}`);
    this.sfx && this.sfx.missionComplete();

    const next = this.list.findIndex((x) => !x.done);
    const last = next === -1;

    // Révélation du fragment. Sur la dernière mission, elle enchaîne sur la victoire.
    if (this.comms && st.reveal) {
      this.comms.playSequence(st.reveal, last ? () => this._finish() : null);
    } else if (last) {
      this._finish();
    }

    if (last) { this.activeKey = null; return; }
    this.index = next;
    this._refreshPanel(true);
    this.hud.toast(T("nextMission")(this.current().def.name), "warn");
    this.sfx && this.sfx.missionNext();
  }

  _finish() {
    if (this._wonGiven) return;
    this._wonGiven = true;
    this.activeKey = null;
    this.onWin && this.onWin(this.credits, this.fragments.slice());
  }
}
