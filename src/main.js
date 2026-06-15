import * as THREE from "three";
import { createStage } from "./scene.js";
import { SolarSystem } from "./bodies.js";
import { Ship } from "./ship.js";
import { Missions } from "./missions.js";
import { Hud } from "./hud.js";
import { Input } from "./input.js";
import { applyStaticStrings, T } from "./strings.js";

applyStaticStrings();

const canvas = document.getElementById("scene");
const stage = createStage(canvas);
const { scene, camera } = stage;
const hud = new Hud();
const input = new Input(canvas);
const isTouch = matchMedia("(pointer:coarse)").matches || "ontouchstart" in window;

let system, ship, missions;
let state = "loading";
let last = performance.now(), acc = 0;
const STEP = 1 / 60;
const stats = { dist: 0, start: 0 };
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

// ---- écrans ----
hud.buildControls(document.getElementById("controlsGrid"));
hud.buildHelp(document.getElementById("help"));

// ---- chargement ----
system = new SolarSystem(scene);
system.load((p) => {
  const pct = Math.round(p * 100);
  document.getElementById("loadbar").style.width = pct + "%";
  document.getElementById("loadlabel").textContent = pct + "%";
}).then(() => {
  ship = new Ship(scene);
  placeShipStart();
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("start").classList.remove("hidden");
  state = "start";
});

function placeShipStart() {
  system.worldPos("earth", tmp);
  const outward = tmp.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(up, outward).normalize();
  const start = tmp.clone().addScaledVector(outward, 64).addScaledVector(up, 20).addScaledVector(tangent, 34);
  ship.reset(start, tmp);
  camera.position.copy(start).addScaledVector(outward, 18).addScaledVector(up, 7);
  camera.lookAt(tmp);
}

// ---- nouvelle partie ----
function newGame() {
  placeShipStart();
  stats.dist = 0; stats.start = performance.now();
  missions = new Missions(system, hud, onWin);
}

function startGame() {
  if (!missions) newGame();
  document.getElementById("start").classList.add("hidden");
  document.getElementById("win").classList.add("hidden");
  document.getElementById("pause").classList.add("hidden");
  document.getElementById("hud").classList.remove("hidden");
  if (isTouch) document.getElementById("touchUI").classList.remove("hidden");
  input.enabled = true;
  state = "playing"; last = performance.now(); acc = 0;
  if (!isTouch) input.requestLock();
}

function pauseGame() {
  if (state !== "playing") return;
  state = "paused"; input.enabled = false;
  document.getElementById("pause").classList.remove("hidden");
}
function resumeGame() {
  if (state !== "paused") return;
  document.getElementById("pause").classList.add("hidden");
  input.enabled = true; state = "playing"; last = performance.now();
  if (!isTouch) input.requestLock();
}

function onWin(credits) {
  state = "win"; input.enabled = false; input.exitLock();
  const time = (performance.now() - stats.start) / 1000;
  const mm = Math.floor(time / 60), ss = Math.round(time % 60).toString().padStart(2, "0");
  document.getElementById("winStats").innerHTML =
    `<div class="stat"><b>${mm}:${ss}</b><span>${T("statTime")}</span></div>` +
    `<div class="stat"><b>${credits}</b><span>${T("statCredits")}</span></div>` +
    `<div class="stat"><b>${(stats.dist / 1000).toFixed(1)}${T("distUnit")}</b><span>${T("statDist")}</span></div>`;
  document.getElementById("win").classList.remove("hidden");
  missions = null; // force une nouvelle campagne au redémarrage
}

// ---- boutons & touches ----
document.getElementById("startBtn").onclick = startGame;
document.getElementById("resumeBtn").onclick = resumeGame;
document.getElementById("restartBtn").onclick = () => { newGame(); startGame(); };
document.getElementById("helpBtn").onclick = () => document.getElementById("help").classList.toggle("hidden");
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

input.onPress("unlock", () => { if (state === "playing") pauseGame(); });
input.onPress("pause", () => { if (state === "playing") pauseGame(); else if (state === "paused") resumeGame(); });
input.onPress("map", () => document.getElementById("minimap").classList.toggle("hidden"));
input.onPress("help", () => document.getElementById("help").classList.toggle("hidden"));
addEventListener("blur", () => pauseGame());

// ---- corps le plus proche (HUD) ----
function updateNearest() {
  let best = null, bestD = Infinity;
  for (const [key, b] of system.bodies) {
    if (key === "sun") continue;
    b.getWorldPosition(tmp2);
    const d = ship.group.position.distanceTo(tmp2) - b.radius;
    if (d < bestD) { bestD = d; best = b.def.name; }
  }
  hud.setNearest(best);
}

// ---- boucle ----
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05); last = now;

  if (state === "playing") {
    input.pollGamepad();
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 5) {
      ship.update(STEP, input);
      missions.update(STEP, ship, input);
      stats.dist += ship.speed * STEP;
      acc -= STEP;
    }
    system.update(dt);
    ship.updateCamera(dt, camera);
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    hud.setSpeed(ship.speed, ship.boosting, ship.throttleVis);
    updateNearest();
    const tk = missions.activeKey;
    if (tk) {
      system.worldPos(tk, tmp);
      hud.updateTargetMarker(camera, tmp, system.bodies.get(tk).def.name, ship.group.position.distanceTo(tmp));
    } else hud.updateTargetMarker(camera, null);
    hud.updateMinimap(system, ship, tk);
  } else if (system) {
    system.update(dt * 0.35);          // arrière-plan vivant dans les menus
    if (ship) ship.updateCamera(dt, camera);
  }

  stage.render();
}

// petit hook de débogage (utilisé pour les tests automatisés)
window.__game = {
  THREE,
  get state() { return state; },
  get ship() { return ship; },
  get missions() { return missions; },
  get system() { return system; },
  get input() { return input; },
};

requestAnimationFrame(frame);
