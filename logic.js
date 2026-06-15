// Jeu solo (toute la simulation tourne côté client dans index.html).
// La plateforme de déploiement exige un module de règles à la racine ;
// ce stub satisfait le contrat sans logique serveur.
export const meta = { game: "odyssee-solaire", minPlayers: 1, maxPlayers: 1 };
export function setup() { return {}; }
export function validateAction() { return { ok: true }; }
export function applyAction(state) { return state; }
export function isGameOver() { return { over: false }; }
export function viewFor(state) { return state; }
