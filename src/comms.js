// ===================================================================
//  COMMS — système de dialogues radio diégétiques.
//  Affiche les répliques (ARIA, Korolev, le Signal…) en bas de l'écran,
//  effet machine à écrire + chip de locuteur coloré + bip d'arrivée.
//  Non bloquant : l'histoire se raconte PENDANT que vous pilotez.
//  La file d'attente s'enchaîne toute seule ; quand elle est vide, le
//  panneau s'efface en douceur.
// ===================================================================
import { SPEAKERS } from "./story.js";

const CPS = 52;                 // vitesse de frappe (caractères/seconde)
const READ_MIN = 1.7;           // temps de lecture min après frappe (s)
const READ_MAX = 5.4;
const READ_PER_CHAR = 0.045;
const IDLE_HIDE = 2.4;          // délai avant de masquer le panneau (s)

export class Comms {
  constructor({ panel, whoEl, textEl, avatarEl, sfx, onFx }) {
    this.panel = panel; this.whoEl = whoEl; this.textEl = textEl; this.avatarEl = avatarEl;
    this.sfx = sfx; this.onFx = onFx || (() => {});
    this.queue = [];
    this.cur = null;
    this.shown = -1;
    this.t = 0;
    this.state = "idle";        // idle | typing | hold
    this.idleHide = 0;
  }

  // Enfile une séquence de répliques ; onDone appelé après la dernière.
  playSequence(beats, onDone) {
    if (!beats || !beats.length) { onDone && onDone(); return; }
    const items = beats.map((b) => ({ ...b }));
    if (onDone) items[items.length - 1]._done = onDone;
    for (const it of items) this.queue.push(it);
    if (this.state === "idle") this._next();
  }
  say(beat, onDone) { this.playSequence([beat], onDone); }

  get busy() { return this.state !== "idle" || this.queue.length > 0; }

  clear() { this.queue.length = 0; this.cur = null; this.state = "idle"; this._hide(); }

  _next() {
    const b = this.queue.shift();
    if (!b) { this.state = "idle"; this.idleHide = IDLE_HIDE; return; }
    this.cur = b; this.shown = -1; this.t = 0; this.state = "typing";
    const sp = SPEAKERS[b.who] || SPEAKERS.sys;
    this.whoEl.textContent = sp.name;
    this.whoEl.className = "comms-who " + sp.cls;
    if (this.avatarEl) this.avatarEl.className = "comms-avatar av " + sp.cls;   // portrait animé
    this.panel.setAttribute("data-who", sp.cls);   // teinte le panneau selon le locuteur
    this.textEl.textContent = "";
    this.panel.classList.remove("hidden");
    // reflow pour relancer l'animation d'entrée
    void this.panel.offsetWidth;
    this.panel.classList.add("show");
    if (this.sfx) {
      if (b.who === "signal" && this.sfx.signal) this.sfx.signal();
      else if (this.sfx.comm) this.sfx.comm(b.who);
    }
    if (b.who === "signal") this.onFx("signal");   // pulsation violette à chaque message du Signal
    if (b.fx) this.onFx(b.fx);
  }

  _readTime(text) {
    return Math.min(READ_MAX, Math.max(READ_MIN, text.length * READ_PER_CHAR));
  }

  update(dt) {
    if (this.state === "typing") {
      this.t += dt;
      const total = this.cur.text.length;
      const n = Math.min(total, Math.floor(this.t * CPS));
      if (n !== this.shown) { this.shown = n; this.textEl.textContent = this.cur.text.slice(0, n); }
      if (n >= total) { this.state = "hold"; this.t = 0; }
    } else if (this.state === "hold") {
      this.t += dt;
      if (this.t >= this._readTime(this.cur.text)) {
        const done = this.cur._done;
        this.cur = null;
        if (this.queue.length) this._next();
        else { this.state = "idle"; this.idleHide = IDLE_HIDE; }
        if (done) done();
      }
    } else if (this.idleHide > 0) {
      this.idleHide -= dt;
      if (this.idleHide <= 0) this._hide();
    }
  }

  _hide() { this.panel.classList.remove("show"); this.panel.classList.add("hidden"); }
}

// -------------------------------------------------------------------
//  Aide réutilisable : tape `text` caractère par caractère dans `el`.
//  Renvoie une promesse résolue à la fin. `ctrl.cancelled` => affiche
//  tout d'un coup et résout (pour « passer » une cinématique).
// -------------------------------------------------------------------
export function typeInto(el, text, cps, ctrl) {
  return new Promise((resolve) => {
    let i = 0; el.textContent = "";
    const tick = () => {
      if (ctrl && ctrl.cancelled) { el.textContent = text; return resolve(); }
      i++; el.textContent = text.slice(0, i);
      if (i >= text.length) return resolve();
      setTimeout(tick, 1000 / (cps || CPS));
    };
    tick();
  });
}
