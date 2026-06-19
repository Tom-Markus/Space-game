// ===================================================================
//  STATUS — intégrité de la coque et du bouclier de l'Odyssée.
//  Les dangers (radiations, chaleur, éruption, tempête) entament d'abord
//  le bouclier, puis la coque. Pas de game-over brutal : si la coque tombe
//  à zéro, le jeu applique un repli « fail-soft » (cf. missions.js).
//  Le bouclier se régénère après quelques secondes sans dégât.
// ===================================================================
export class Status {
  constructor() { this.reset(); }

  reset() { this.hull = 1; this.shield = 1; this._calm = 0; this._lastHit = false; }

  // Inflige `amount` (0..1). Renvoie true si la coque vient de tomber à zéro.
  damage(amount) {
    if (amount <= 0) return false;
    this._calm = 0; this._lastHit = true;
    const absorbed = Math.min(this.shield, amount);
    this.shield -= absorbed;
    const rest = amount - absorbed;
    const before = this.hull;
    if (rest > 0) this.hull = Math.max(0, this.hull - rest);
    return before > 0 && this.hull <= 0;
  }

  update(dt) {
    this._lastHit = false;
    this._calm += dt;
    if (this._calm > 2.2 && this.shield < 1) this.shield = Math.min(1, this.shield + dt * 0.18);
  }

  // Après un repli fail-soft : coque rétablie partiellement, bouclier vidé.
  recover() { this.hull = Math.max(this.hull, 0.45); this.shield = 0; this._calm = 0; }
}
