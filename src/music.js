// ===================================================================
//  Musique de fond : lit musique_1.mp3, musique_2.mp3, … en BOUCLE,
//  l'une après l'autre. Démarre au premier geste (clic DÉCOLLAGE).
//  Coupure « en fantôme » : muet = on baisse le son SANS mettre en pause,
//  donc la piste continue d'avancer et reprend plus loin quand on rallume.
// ===================================================================
const BASE = "./assets/music/";
const MAX = 16;                                   // musique_1 … musique_16

export class Music {
  constructor() {
    this.tracks = [];
    this.idx = 0;
    this.started = false;
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.loop = false;                       // on enchaîne nous-mêmes (boucle multi-pistes)
    this.muted = false;
    try { this.muted = localStorage.getItem("musicMuted") === "1"; } catch (e) {}
    this.audio.muted = this.muted;
    this.audio.volume = 1.0;
    // fin d'une piste -> piste suivante ; erreur de lecture -> on saute
    this.audio.addEventListener("ended", () => this._next());
    this.audio.addEventListener("error", () => { if (this.started) this._next(); });
    this._ready = this._discover();
  }

  // Repère les fichiers présents : musique_1, _2, … et S'ARRÊTE au premier manquant
  // (numérotation continue attendue). -> au plus un seul 404 « sentinelle » au lancement.
  async _discover() {
    const found = [];
    for (let i = 1; i <= MAX; i++) {
      const url = `${BASE}musique_${i}.mp3`;
      let ok = false;
      try { ok = (await fetch(url, { method: "HEAD" })).ok; } catch (e) { ok = false; }
      if (!ok) break;
      found.push(url);
    }
    this.tracks = found;
    return found;
  }

  // À appeler depuis un geste utilisateur (clic) pour respecter l'autoplay.
  async start() {
    if (this.started) return;
    this.started = true;
    await this._ready;
    if (!this.tracks.length) return;               // aucune musique déposée
    this.idx = 0;
    this._play();
  }

  _play() {
    if (!this.tracks.length) return;
    this.audio.src = this.tracks[this.idx];
    this.audio.muted = this.muted;
    const p = this.audio.play();
    if (p && p.catch) p.catch(() => {});           // ignore les refus d'autoplay
  }

  _next() {
    if (!this.tracks.length) return;
    this.idx = (this.idx + 1) % this.tracks.length;  // boucle infinie 1->2->…->1
    this._play();
  }

  // Coupe / rallume SANS interrompre la lecture (la piste avance « en fantôme »).
  toggleMute() {
    this.muted = !this.muted;
    this.audio.muted = this.muted;
    try { localStorage.setItem("musicMuted", this.muted ? "1" : "0"); } catch (e) {}
    return this.muted;
  }
}
