// Préférences de pilotage, persistées dans localStorage.
//  sens    : multiplicateur de sensibilité souris (0.4 .. 2.0)
//  invertY : inverser l'axe vertical de la souris
export const SETTINGS = { sens: 1, invertY: false };

const KEY = "odysseePrefs";

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (typeof p.sens === "number" && p.sens >= 0.2 && p.sens <= 3) SETTINGS.sens = p.sens;
    if (typeof p.invertY === "boolean") SETTINGS.invertY = p.invertY;
  } catch (e) { /* prefs corrompues -> défauts */ }
}

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(SETTINGS)); } catch (e) {}
}

loadSettings();
