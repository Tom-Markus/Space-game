import * as THREE from "three";
import { createStage } from "./scene.js";
import { SolarSystem } from "./bodies.js";
import { Ship } from "./ship.js";
import { Missions } from "./missions.js";
import { Hud } from "./hud.js";
import { StarMap } from "./starmap.js";
import { Input } from "./input.js";
import { Music } from "./music.js";
import { SFX } from "./sfx.js";
import { applyStaticStrings, T } from "./strings.js";
import { SHIP, SCALE, QUALITY } from "./config.js";

applyStaticStrings();

const canvas = document.getElementById("scene");
const stage = createStage(canvas);
const { scene, camera } = stage;
const hud = new Hud();
const input = new Input(canvas);
const music = new Music();
const sfx = new SFX();
const isTouch = matchMedia("(pointer:coarse)").matches || "ontouchstart" in window;

// ---- bouton son (couper / remettre musique + bruitages — la piste continue « en fantôme ») ----
(function setupMusic() {
  const btn = document.getElementById("musicBtn");
  if (!btn) return;
  const refresh = () => {
    btn.classList.toggle("muted", music.muted);
    btn.setAttribute("aria-label", music.muted ? "Remettre le son" : "Couper le son");
  };
  refresh();
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    music.toggleMute();
    sfx.setMuted(music.muted);
    refresh();
  });
})();

let system, ship, missions, starmap;
let navTarget = null;                    // cap choisi par le joueur via la carte
let state = "loading";
let last = performance.now(), acc = 0;
const STEP = 1 / 60;
const stats = { dist: 0, start: 0 };
let prevMode = "cruise";
const tmp = new THREE.Vector3();
let lastNav = { dist: 1e9, key: null };

hud.buildControls(document.getElementById("controlsGrid"), T("controls"));
hud.buildHelp(document.getElementById("help"), T("controls"));

// ---- sélecteur de qualité des textures (recharge la page au changement) ----
(function setupQuality() {
  const hints = T("qualityHints");
  const sel = document.getElementById("qualitySel");
  const hint = document.getElementById("qHint");
  const show = (q) => { hint.textContent = hints[q] || ""; };
  sel.querySelectorAll(".q-opt").forEach((b) => {
    if (b.dataset.q === QUALITY) b.classList.add("active");
    b.addEventListener("click", () => {
      if (b.dataset.q === QUALITY) return;
      try { localStorage.setItem("texQuality", b.dataset.q); } catch (e) {}
      location.reload();
    });
    b.addEventListener("mouseenter", () => show(b.dataset.q));
    b.addEventListener("mouseleave", () => show(QUALITY));
  });
  show(QUALITY);
})();

// ---- chargement ----
system = new SolarSystem(scene);
system.maxAniso = stage.renderer.capabilities.getMaxAnisotropy();
system.load((p) => {
  const pct = Math.round(p * 100);
  document.getElementById("loadbar").style.width = pct + "%";
  document.getElementById("loadlabel").textContent = pct + "%";
}).then(() => {
  ship = new Ship(scene);
  starmap = new StarMap(system, (key) => { navTarget = key; }, closeMap);
  placeShipStart();
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("start").classList.remove("hidden");
  state = "start";
});

function placeShipStart() {
  system.worldPos("earth", tmp);
  const er = system.radiusOf("earth");
  const outward = tmp.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(up, outward).normalize();
  const start = tmp.clone()
    .addScaledVector(outward, er * SHIP.startOffsetR)
    .addScaledVector(up, er * 0.7)
    .addScaledVector(tangent, er * 1.3);
  ship.reset(start, tmp);
  camera.position.copy(start).addScaledVector(outward, SHIP.cam.dist).addScaledVector(up, SHIP.cam.height);
  camera.lookAt(tmp);
}

function newGame() {
  placeShipStart();
  stats.dist = 0; stats.start = performance.now();
  missions = new Missions(system, hud, onWin, sfx);
}

function startGame() {
  music.start();                           // 1er geste utilisateur -> autorise la lecture audio
  sfx.start();
  if (!missions) newGame();
  for (const id of ["start", "win", "pause"]) document.getElementById(id).classList.add("hidden");
  document.getElementById("hud").classList.remove("hidden");
  if (isTouch) document.getElementById("touchUI").classList.remove("hidden");
  input.enabled = true; state = "playing"; last = performance.now(); acc = 0;
  if (!isTouch) input.requestLock();
}

function pauseGame() {
  if (state !== "playing") return;
  state = "paused"; input.enabled = false;
  document.body.classList.remove("warping");
  document.getElementById("pause").classList.remove("hidden");
}
function resumeGame() {
  if (state !== "paused") return;
  document.getElementById("pause").classList.add("hidden");
  input.enabled = true; state = "playing"; last = performance.now();
  if (!isTouch) input.requestLock();
}

function openMap() {
  if (state !== "playing" || !starmap) return;
  state = "map"; input.enabled = false; input.exitLock();
  document.body.classList.remove("warping");
  starmap.show(ship, navTarget);
}
function closeMap() {
  if (state !== "map") return;
  starmap.close();
  input.enabled = true; state = "playing"; last = performance.now();
  if (!isTouch) input.requestLock();
}

function onWin(credits) {
  state = "win"; input.enabled = false; input.exitLock();
  document.body.classList.remove("warping");
  sfx.win();
  const time = (performance.now() - stats.start) / 1000;
  const mm = Math.floor(time / 60), ss = Math.round(time % 60).toString().padStart(2, "0");
  const Mkm = (stats.dist * SCALE.unitKm / 1e6).toFixed(1);
  document.getElementById("winStats").innerHTML =
    `<div class="stat"><b>${mm}:${ss}</b><span>${T("statTime")}</span></div>` +
    `<div class="stat"><b>${credits}</b><span>${T("statCredits")}</span></div>` +
    `<div class="stat"><b>${Mkm}</b><span>${T("statDist")} (M km)</span></div>`;
  document.getElementById("win").classList.remove("hidden");
  missions = null;
}

document.getElementById("startBtn").onclick = startGame;
document.getElementById("resumeBtn").onclick = () => { sfx.click(); resumeGame(); };
document.getElementById("restartBtn").onclick = () => { sfx.click(); newGame(); startGame(); };
document.getElementById("helpBtn").onclick = () => { sfx.click(); document.getElementById("help").classList.toggle("hidden"); };
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

input.onPress("unlock", () => { if (state === "playing") pauseGame(); });
input.onPress("pause", () => (state === "playing" ? pauseGame() : state === "paused" ? resumeGame() : null));
input.onPress("map", () => { sfx.click(); openMap(); });
input.onPress("help", () => document.getElementById("help").classList.toggle("hidden"));
document.getElementById("radar").addEventListener("click", () => { sfx.click(); openMap(); });
addEventListener("blur", () => pauseGame());

// ---- boucle ----
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05); last = now;

  if (state === "playing") {
    input.pollGamepad();
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 5) {
      lastNav = system.nearestSurface(ship.group.position);
      ship.update(STEP, input, lastNav);
      if (ship.resolveCollision(system.bodies.values())) sfx.impact();
      missions.update(STEP, ship, input);
      stats.dist += Math.abs(ship.speed) * STEP;
      acc -= STEP;
    }
    system.update(dt, camera);
    ship.updateCamera(dt, camera);
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    const mode = ship.warping ? "warp" : ship.boosting ? "boost" : "cruise";
    if (mode !== prevMode) {
      if (mode === "warp") sfx.warpOn();
      else if (prevMode === "warp") sfx.warpOff();
      else if (mode === "boost") sfx.boostOn();
      prevMode = mode;
    }
    sfx.updateEngine(ship.throttleVis, mode);
    hud.setSpeed(ship.speed, mode, ship.warping ? 1 : Math.min(Math.abs(ship.speed) / SHIP.boostMax, 1));
    document.body.classList.toggle("warping", ship.warping && ship.warpAmount > 0.25);
    const nb = lastNav.key && system.bodies.get(lastNav.key);
    hud.setNav(nb ? nb.def.name : null, lastNav.dist);

    // cap manuel (carte) prioritaire, sinon objectif de mission
    const tk = (navTarget && system.bodies.has(navTarget)) ? navTarget : missions.activeKey;
    if (tk) {
      const b = system.bodies.get(tk);
      b.getWorldPosition(tmp);
      hud.updateTargetMarker(camera, tmp, b.def.name, Math.max(0, ship.group.position.distanceTo(tmp) - b.radius), tk === navTarget);
    } else hud.updateTargetMarker(camera, null);
    hud.updateMinimap(system, ship, tk);
  } else if (system) {
    system.update(dt * 0.4, camera);
    if (ship) ship.updateCamera(dt, camera);
    sfx.updateEngine(0, "cruise");
  }

  if (system && system.sky) system.sky.position.copy(camera.position);   // fond stellaire à l'infini
  if (system) system.syncAtmosphere(camera);                             // rayon de vue exact des atmosphères
  stage.render();
}

window.__game = {
  THREE,
  get state() { return state; }, get ship() { return ship; },
  get missions() { return missions; }, get system() { return system; }, get input() { return input; },
  get camera() { return camera; },
};

requestAnimationFrame(frame);
