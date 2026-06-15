// Entrées unifiées : clavier (codes physiques), souris (pointer-lock),
// tactile (stick + boutons) et manette (Gamepad API) -> axes normalisés.
const HELD_BIND = {
  KeyW: "forward", KeyZ: "forward",
  KeyS: "back",
  KeyA: "rollL", KeyQ: "rollL",
  KeyD: "rollR",
  ShiftLeft: "boost", ShiftRight: "boost",
  Space: "brake",
  KeyE: "interact",
  ArrowUp: "pitchUp", ArrowDown: "pitchDown",
  ArrowLeft: "yawL", ArrowRight: "yawR",
};
const PRESS_BIND = { KeyM: "map", KeyH: "help", KeyP: "pause" };

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.mouseDX = 0; this.mouseDY = 0;
    this.touch = { dx: 0, dy: 0 };
    this.pad = { yaw: 0, pitch: 0, roll: 0, throttle: 0, boost: false, brake: false, interact: false };
    this.locked = false;
    this.enabled = false;
    this._press = {};
    this._bindKeyboard();
    this._bindMouse();
    this._bindTouch();
  }

  onPress(cmd, fn) { (this._press[cmd] || (this._press[cmd] = [])).push(fn); }
  _emit(cmd) { (this._press[cmd] || []).forEach((f) => f()); }

  _bindKeyboard() {
    addEventListener("keydown", (e) => {
      if (PRESS_BIND[e.code]) { if (this.enabled) this._emit(PRESS_BIND[e.code]); e.preventDefault(); return; }
      const c = HELD_BIND[e.code];
      if (!c) return;
      if (!this.held.has(c) && c === "interact" && this.enabled) this._emit("interact");
      this.held.add(c);
      if (this.enabled) e.preventDefault();
    });
    addEventListener("keyup", (e) => { const c = HELD_BIND[e.code]; if (c) this.held.delete(c); });
    addEventListener("blur", () => this.held.clear());
  }

  _bindMouse() {
    addEventListener("mousemove", (e) => {
      if (!this.locked || !this.enabled) return;
      this.mouseDX += e.movementX; this.mouseDY += e.movementY;
    });
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked && this.enabled) this._emit("unlock");
    });
  }

  requestLock() { if (this.canvas.requestPointerLock) this.canvas.requestPointerLock(); }
  exitLock() { if (document.exitPointerLock) document.exitPointerLock(); }

  _bindTouch() {
    const stick = document.getElementById("stick");
    const knob = document.getElementById("stickKnob");
    if (stick) {
      let id = null, cx = 0, cy = 0; const R = 50;
      const start = (t, rect) => { id = t.identifier; cx = rect.left + rect.width / 2; cy = rect.top + rect.height / 2; };
      stick.addEventListener("touchstart", (e) => {
        e.preventDefault(); start(e.changedTouches[0], stick.getBoundingClientRect());
        this._moveStick(e.changedTouches[0], cx, cy, R, knob);
      }, { passive: false });
      stick.addEventListener("touchmove", (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) if (t.identifier === id) this._moveStick(t, cx, cy, R, knob);
      }, { passive: false });
      const end = (e) => {
        for (const t of e.changedTouches) if (t.identifier === id) {
          id = null; this.touch.dx = 0; this.touch.dy = 0;
          if (knob) knob.style.transform = "translate(0,0)";
        }
      };
      stick.addEventListener("touchend", end); stick.addEventListener("touchcancel", end);
    }
    document.querySelectorAll(".tbtn").forEach((b) => {
      const cmd = b.dataset.cmd;
      const on = (e) => { e.preventDefault(); this.held.add(cmd); if (cmd === "interact" && this.enabled) this._emit("interact"); };
      const off = (e) => { e.preventDefault(); this.held.delete(cmd); };
      b.addEventListener("touchstart", on, { passive: false });
      b.addEventListener("touchend", off, { passive: false });
      b.addEventListener("touchcancel", off, { passive: false });
    });
  }

  _moveStick(t, cx, cy, R, knob) {
    let dx = (t.clientX - cx) / R, dy = (t.clientY - cy) / R;
    const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    this.touch.dx = dx; this.touch.dy = dy;
    if (knob) knob.style.transform = `translate(${dx * R}px,${dy * R}px)`;
  }

  pollGamepad() {
    this.pad.yaw = this.pad.pitch = this.pad.roll = this.pad.throttle = 0;
    this.pad.boost = this.pad.brake = this.pad.interact = false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
      this.pad.yaw += dz(gp.axes[0] || 0);
      this.pad.pitch += dz(gp.axes[1] || 0);
      if (gp.axes.length > 2) this.pad.roll += dz(gp.axes[2] || 0);
      const rt = gp.buttons[7]?.value || 0, lt = gp.buttons[6]?.value || 0;
      this.pad.throttle += rt - lt;
      if (gp.buttons[0]?.pressed) this.pad.interact = true;
      if (gp.buttons[5]?.pressed) this.pad.boost = true;
      if (gp.buttons[1]?.pressed) this.pad.brake = true;
    }
  }

  // ---- API consommée par le vaisseau ----
  consumeMouse() { const d = { dx: this.mouseDX, dy: this.mouseDY }; this.mouseDX = 0; this.mouseDY = 0; return d; }
  axisYaw() { return (this.held.has("yawL") ? -1 : 0) + (this.held.has("yawR") ? 1 : 0) + this.touch.dx + this.pad.yaw; }
  axisPitch() { return (this.held.has("pitchUp") ? -1 : 0) + (this.held.has("pitchDown") ? 1 : 0) + this.touch.dy + this.pad.pitch; }
  axisRoll() { return (this.held.has("rollL") ? -1 : 0) + (this.held.has("rollR") ? 1 : 0) + this.pad.roll; }
  throttle() { return (this.held.has("forward") ? 1 : 0) - (this.held.has("back") ? 1 : 0) + Math.max(0, this.pad.throttle); }
  boost() { return this.held.has("boost") || this.pad.boost; }
  brake() { return this.held.has("brake") || this.pad.brake; }
  interact() { return this.held.has("interact") || this.pad.interact; }
}
