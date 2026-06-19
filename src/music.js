// ===================================================================
//  Musique de fond : lit musique_1.mp3, musique_2.mp3, … DANS LE DÉSORDRE
//  (tirage aléatoire, jamais deux fois la même piste d'affilée), avec 5 s
//  de silence entre chaque piste. Démarre au premier geste (clic DÉCOLLAGE).
//  Coupure « en fantôme » : muet = on baisse le son SANS mettre en pause,
//  donc la piste continue d'avancer et reprend plus loin quand on rallume.
// ===================================================================
const BASE = "./assets/music/";
const MAX = 16;                                   // musique_1 … musique_16
const GAP_MS = 5000;                              // silence entre deux pistes

export class Music {
  constructor() {
    this.tracks = [];
    this.idx = -1;                                 // piste en cours (-1 = aucune encore)
    this.started = false;
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.loop = false;                       // on enchaîne nous-mêmes (tirage aléatoire + silence)
    this.muted = false;
    try { this.muted = localStorage.getItem("musicMuted") === "1"; } catch (e) {}
    this.audio.muted = this.muted;
    this.audio.volume = 1.0;
    this._gapTimer = null;
    // fin d'une piste -> silence puis piste suivante ; erreur de lecture -> idem (on saute)
    this.audio.addEventListener("ended", () => this._scheduleNext());
    this.audio.addEventListener("error", () => { if (this.started) this._scheduleNext(); });
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
    this.idx = this._pickNext();                    // première piste tirée au hasard
    this._play();
  }

  // Tire un index au hasard, jamais égal à l'actuel (sauf s'il n'y a qu'une piste).
  _pickNext() {
    if (this.tracks.length <= 1) return 0;
    let next;
    do { next = Math.floor(Math.random() * this.tracks.length); } while (next === this.idx);
    return next;
  }

  _play() {
    if (!this.tracks.length) return;
    this.audio.src = this.tracks[this.idx];
    this.audio.muted = this.muted;
    const p = this.audio.play();
    if (p && p.catch) p.catch(() => {});           // ignore les refus d'autoplay
  }

  // Silence de GAP_MS avant d'enchaîner sur une piste tirée au hasard (jamais la même).
  _scheduleNext() {
    if (!this.tracks.length) return;
    clearTimeout(this._gapTimer);
    this._gapTimer = setTimeout(() => {
      this.idx = this._pickNext();
      this._play();
    }, GAP_MS);
  }

  // Coupe / rallume SANS interrompre la lecture (la piste avance « en fantôme »).
  toggleMute() {
    this.muted = !this.muted;
    this.audio.muted = this.muted;
    try { localStorage.setItem("musicMuted", this.muted ? "1" : "0"); } catch (e) {}
    return this.muted;
  }
}

