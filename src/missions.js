import * as THREE from "three";
import { PLANETS, CAMPAIGN_ORDER } from "./config.js";
import { T } from "./strings.js";
import { STORY, ACTIVITIES, ACTS } from "./story.js";
import { makeActivity } from "./activities.js";

// La campagne « Le Dernier Signal » : une mission par astre, chacune porteuse
// d'un fragment du message. Cette classe orchestre la campagne + la mise en
// scène radio (briefing, arrivée, set-piece, révélation) et délègue le GAMEPLAY
// à une Activity (verrouillage / collecte / appontage, avec dangers).
export class Missions {
  constructor(system, hud, onWin, sfx, comms, onChoice, ctx) {
    this.system = system; this.hud = hud; this.onWin = onWin; this.sfx = sfx;
    this.comms = comms; this.onChoice = onChoice;
    ctx = ctx || {};
    this.status = ctx.status; this.scene = ctx.scene; this.onFx = ctx.onFx || (() => {});
    this.onAct = ctx.onAct || (() => {});
    this._lastAct = 0;
    this.list = CAMPAIGN_ORDER
      .map((k) => PLANETS.find((p) => p.key === k))
      .filter((d) => d && d.mission)
      .map((d) => ({ key: d.key, def: d, done: false }));
    this.index = 0;
    this.credits = 0;
    this.completed = 0;
    this.fragments = [];
    this._pos = new THREE.Vector3();
    this._wonGiven = false;
    this._arrived = false;
    this._eventDone = false;
    this.activity = null;
    this.activeKey = this.list[0]?.key || null;
    this._begin(true);
    this.hud.renderLog(this.list);
    this.hud.setCredits(0);
  }

  current() { return this.list[this.index]; }

  _begin(brief) {
    const m = this.current();
    if (!m) return;
    this.activeKey = m.key;
    this._arrived = false;
    this._eventDone = false;
    this.targetReady = false;          // le marqueur de cap n'apparaît qu'après le briefing
    if (this.activity) { this.activity.cleanup(); this.activity = null; }
    const st = STORY[m.key] || {};
    // carte de titre à chaque changement d'acte (« ACTE II — L'ÉCHO »…)
    if (st.act && st.act !== this._lastAct) { this._lastAct = st.act; this.onAct(st.act); }
    const actLabel = st.act && ACTS[st.act] ? ACTS[st.act].num : "";
    this.hud.setMission(this.completed + 1, this.list.length, m.def.mission.title, st.objective || m.def.mission.desc, m.def.name, actLabel);
    this.hud.setProgress(0);
    const body = this.system.bodies.get(m.key);
    const adef = ACTIVITIES[m.key] || { type: "lock" };
    this.activity = makeActivity(adef, {
      scene: this.scene, system: this.system, key: m.key, body,
      sfx: this.sfx, status: this.status, onFx: this.onFx,
    });
    // Le marqueur de cap (rectangle orange) n'apparaît qu'une fois le briefing
    // terminé — ARIA présente d'abord l'astre, ensuite seulement on le pointe.
    if (brief && this.comms && st.brief) this.comms.playSequence(st.brief, () => { this.targetReady = true; });
    else this.targetReady = true;
  }

  _arrive(st) {
    if (this._arrived) return;
    this._arrived = true;
    if (this.comms && st.arrival) this.comms.playSequence(st.arrival);
  }

  update(dt, ship, input) {
    if (this.activeKey == null) return;
    const m = this.current();
    if (!m) return;
    const body = this.system.bodies.get(m.key);
    if (!body || !this.activity) return;
    body.getWorldPosition(this._pos);
    this.hud.setDistance(Math.max(0, ship.group.position.distanceTo(this._pos) - body.radius));

    const st = STORY[m.key] || {};
    const act = this.activity;
    const fell = act.update(dt, ship, input);

    if (act.engaged && !this._arrived) this._arrive(st);

    // set-piece narratif (dialogue) déclenché par la progression (ex. Mercure)
    if (st.event && !this._eventDone && act.progress >= (st.event.at ?? 0.4)) {
      this._eventDone = true;
      if (this.comms && st.event.beats) this.comms.playSequence(st.event.beats);
    }

    this.hud.setProgress(act.progress);
    this.hud.showPrompt(act.prompt || null, !!act.danger);
    if (this.status) this.hud.setStatus(this.status.hull, this.status.shield);

    if (fell) this._failSoft(ship, body);
    if (act.done) this._complete(m);
  }

  // Repli « fail-soft » : coque à zéro -> on éloigne le vaisseau et on repart.
  _failSoft(ship, body) {
    this.sfx && this.sfx.damage && this.sfx.damage();
    this.onFx("damage");
    body.getWorldPosition(this._pos);
    const out = ship.group.position.clone().sub(this._pos);
    if (out.length() < 1) out.set(1, 0, 0);
    out.normalize();
    ship.group.position.copy(this._pos).addScaledVector(out, body.radius * 2.6);
    ship.speed = 0;
    if (ship.velocity) ship.velocity.set(0, 0, 0);
    this.status && this.status.recover();
    if (this.activity) { this.activity.lock = 0; this.activity.progress = Math.max(0, this.activity.progress - 0.3); }
    if (this.comms) this.comms.say({ who: "aria", text: "On a failli y rester ! Je nous éloigne — bouclier régénéré. On y retourne, Commandant." });
  }

  _complete(m) {
    m.done = true;
    this.completed++;
    if (this.activity) { this.activity.cleanup(); this.activity = null; }
    const st = STORY[m.key] || {};
    if (st.fragment) this.fragments.push(st.fragment);
    const reward = m.def.mission.reward || 100;
    this.credits += reward;
    this.hud.showPrompt(null);
    this.hud.setProgress(0);
    this.hud.setCredits(this.credits);
    this.hud.renderLog(this.list);
    this.hud.toast(`${T("objComplete")(m.def.name)}  ·  ${T("reward")(reward)}`);
    this.sfx && this.sfx.missionComplete();

    const next = this.list.findIndex((x) => !x.done);
    const last = next === -1;
    const revealDone = last ? () => this._finish()
      : (st.choice && this.onChoice ? () => this.onChoice() : null);
    if (this.comms && st.reveal) this.comms.playSequence(st.reveal, revealDone);
    else if (revealDone) revealDone();

    if (last) { this.activeKey = null; return; }
    this.index = next;
    this._begin(true);
    this.hud.toast(T("nextMission")(this.current().def.name), "warn");
    this.sfx && this.sfx.missionNext();
  }

  _finish() {
    if (this._wonGiven) return;
    this._wonGiven = true;
    this.activeKey = null;
    if (this.activity) { this.activity.cleanup(); this.activity = null; }
    this.onWin && this.onWin(this.credits, this.fragments.slice());
  }
}
