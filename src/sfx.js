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
    g1.gain.setValueAtTime(0.32, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    noise.connect(filter).connect(g1).connect(this.master); noise.start(t);
    const osc = this.ctx.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(90, t); osc.frequency.exponentialRampToValueAtTime(35, t + 0.25);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.26, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
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

  // ---- collecte d'un éclat de données (petit éclat cristallin montant) ----
  pickup() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = "triangle";
    osc.frequency.setValueAtTime(880, t); osc.frequency.exponentialRampToValueAtTime(1760, t + 0.09);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(g).connect(this.master); osc.start(t); osc.stop(t + 0.17);
  }

  // ---- verrouillage acquis (bip de confirmation montant) ----
  lock() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = 740 + i * 360;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + i * 0.06); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.06 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.12);
      osc.connect(g).connect(this.master); osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.13);
    }
  }

  // ---- alarme de coque critique (descente grave urgente) ----
  damage() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, t); osc.frequency.exponentialRampToValueAtTime(70, t + 0.5);
    const flt = this.ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 700;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc.connect(flt).connect(g).connect(this.master); osc.start(t); osc.stop(t + 0.57);
  }

  // ---- tir de canon à plasma : zap bref descendant ----
  laser() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1600, t); osc.frequency.exponentialRampToValueAtTime(240, t + 0.11);
    const flt = this.ctx.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = 900; flt.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    osc.connect(flt).connect(g).connect(this.master); osc.start(t); osc.stop(t + 0.14);
  }

  // ---- explosion (balise / astéroïde) : souffle grave + fracas ----
  boom() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource(); noise.buffer = this._noiseBuffer(0.6);
    const flt = this.ctx.createBiquadFilter(); flt.type = "lowpass";
    flt.frequency.setValueAtTime(1400, t); flt.frequency.exponentialRampToValueAtTime(120, t + 0.55);
    const g1 = this.ctx.createGain();
    g1.gain.setValueAtTime(0.34, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    noise.connect(flt).connect(g1).connect(this.master); noise.start(t);
    const osc = this.ctx.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(140, t); osc.frequency.exponentialRampToValueAtTime(32, t + 0.5);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.3, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.connect(g2).connect(this.master); osc.start(t); osc.stop(t + 0.56);
  }

  missionComplete() { this._arp([523.25, 659.25, 783.99, 1046.5]); }       // objectif accompli
  missionNext() { this._arp([392.0, 523.25], 0.14, 0.16); }                // nouvel objectif assigné
  win() { this._arp([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.2, 0.18); } // victoire finale

  // ---- bip radio à l'arrivée d'une réplique (timbre selon le locuteur) ----
  comm(who) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = who === "control" ? 660 : who === "sys" ? 440 : 770;     // ARIA plus aigu
    const osc = this.ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = base;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc.connect(g).connect(this.master); osc.start(t); osc.stop(t + 0.12);
  }

  // ---- voix du Signal : double bip détuné et filtré, inquiétant ----
  signal() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [f, d] of [[220, 0], [233, 0.02]]) {                       // léger battement
      const osc = this.ctx.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = f;
      const flt = this.ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 820;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.085, t + d + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.5);
      osc.connect(flt).connect(g).connect(this.master); osc.start(t + d); osc.stop(t + d + 0.52);
    }
  }

  // ---- alarme (éruption solaire) : klaxon descendant répété ----
  alert() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    for (let k = 0; k < 3; k++) {
      const t = t0 + k * 0.34;
      const osc = this.ctx.createOscillator(); osc.type = "square";
      osc.frequency.setValueAtTime(720, t); osc.frequency.linearRampToValueAtTime(520, t + 0.26);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(g).connect(this.master); osc.start(t); osc.stop(t + 0.32);
    }
  }
}
