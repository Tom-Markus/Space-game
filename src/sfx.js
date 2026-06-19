// ===================================================================
//  Bruitages du jeu, synthétisés en direct via Web Audio API (aucun
//  fichier requis) : post-combustion, distorsion, impacts, interface
//  et missions. Suit le même état « muet » que la musique (bouton ♪
//  / touche C).
// ===================================================================
export class SFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    try { this.muted = localStorage.getItem("musicMuted") === "1"; } catch (e) {}
    this._lastImpact = 0;
  }

  // À appeler depuis un geste utilisateur (clic DÉCOLLAGE) -> autorise l'audio.
  start() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.05);
  }

  _noiseBuffer(dur) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, Math.max(1, Math.round(ctx.sampleRate * dur)), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---- petit clic d'interface ----
  click() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = "square"; osc.frequency.value = 880;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g).connect(this.master); osc.start(t); osc.stop(t + 0.09);
  }

  // ---- enclenchement distorsion : montée sifflante ----
  warpOn() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(200, t); osc.frequency.exponentialRampToValueAtTime(1400, t + 0.6);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.1); g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(g).connect(this.master); osc.start(t); osc.stop(t + 0.72);
  }

  // ---- coupure de la distorsion : redescente ----
  warpOff() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(900, t); osc.frequency.exponentialRampToValueAtTime(120, t + 0.35);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(g).connect(this.master); osc.start(t); osc.stop(t + 0.42);
  }

  // ---- impact (collision avec un astre) ----
  impact() {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this._lastImpact < 250) return;          // anti-rafale (plusieurs pas physiques/frame)
    this._lastImpact = now;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource(); noise.buffer = this._noiseBuffer(0.25);
    const filter = this.ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 500;
    const g1 = this.ctx.createGain();
    g1.gain.setValueAtTime(0.45, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    noise.connect(filter).connect(g1).connect(this.master); noise.start(t);
    const osc = this.ctx.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(90, t); osc.frequency.exponentialRampToValueAtTime(35, t + 0.25);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.38, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g2).connect(this.master); osc.start(t); osc.stop(t + 0.26);
  }

  // ---- petit arpège (fréquences en Hz) pour les notifications de mission ----
  _arp(notes, gain = 0.18, noteLen = 0.14) {
    if (!this.ctx) return;
    let t = this.ctx.currentTime;
    for (const f of notes) {
      const osc = this.ctx.createOscillator(); osc.type = "triangle"; osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + noteLen);
      osc.connect(g).connect(this.master); osc.start(t); osc.stop(t + noteLen + 0.02);
      t += noteLen * 0.85;
    }
  }

  missionComplete() { this._arp([523.25, 659.25, 783.99, 1046.5]); }       // objectif accompli
  missionNext() { this._arp([392.0, 523.25], 0.14, 0.16); }                // nouvel objectif assigné
  win() { this._arp([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.2, 0.18); } // victoire finale
}
