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
import { Comms, typeInto } from "./comms.js";
import { Status } from "./status.js";
import { INTRO, ENDING_TRUST, ENDING_DOUBT, FINAL_MESSAGE, AMBIENT, SPEAKERS } from "./story.js";
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
const status = new Status();
const isTouch = matchMedia("(pointer:coarse)").matches || "ontouchstart" in window;

// ---- comms : dialogues radio scénarisés (ARIA, Korolev, le Signal) ----
const comms = new Comms({
  panel: document.getElementById("comms"),
  whoEl: document.getElementById("commsWho"),
  textEl: document.getElementById("commsText"),
  avatarEl: document.getElementById("commsAvatar"),
  sfx,
  onFx,
});
const seenAmbient = new Set();

// Effets scénarisés déclenchés par les répliques (fx) : flash d'éruption,
// alerte solaire, parasites de liaison perdue.
let _fxTimer = null, _signalTimer = null, _damageTimer = null;
function onFx(fx) {
  if (fx === "flare") {
    sfx.alert && sfx.alert();
    document.body.classList.add("flare");
    clearTimeout(_fxTimer);
    _fxTimer = setTimeout(() => document.body.classList.remove("flare"), 2800);
  } else if (fx === "flareWarn") {
    document.body.classList.add("flare-warn");
    setTimeout(() => document.body.classList.remove("flare-warn"), 1600);
  } else if (fx === "static") {
    document.body.classList.add("staticfx");
    setTimeout(() => document.body.classList.remove("staticfx"), 2400);
  } else if (fx === "signal") {
    document.body.classList.add("signalfx");
    clearTimeout(_signalTimer);
    _signalTimer = setTimeout(() => document.body.classList.remove("signalfx"), 1100);
  } else if (fx === "damage") {
    document.body.classList.add("damagefx");
    clearTimeout(_damageTimer);
    _damageTimer = setTimeout(() => document.body.classList.remove("damagefx"), 650);
  }
}

// ---- son : bouton ♪ et touche C (coupent musique + bruitages ensemble) ----
// La piste continue « en fantôme » pendant la coupure (cf. music.js).
const musicBtn = document.getElementById("musicBtn");
function refreshMusicBtn() {
  if (!musicBtn) return;
  musicBtn.classList.toggle("muted", music.muted);
  musicBtn.setAttribute("aria-label", music.muted ? "Remettre le son" : "Couper le son");
}
function toggleSound() {
  music.toggleMute();
  sfx.setMuted(music.muted);
  refreshMusicBtn();
}
refreshMusicBtn();
musicBtn && musicBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleSound(); });
addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.code === "KeyC" || (e.key || "").toLowerCase() === "c") toggleSound();
});

let system, ship, missions, starmap, pionnier;
let navTarget = null;                    // cap choisi par le joueur via la carte
let trustAria = true, choiceMade = false; // choix moral de Saturne -> oriente la fin
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
  pionnier = buildProbe();                 // la sonde Pionnier-9, dérivant près de Pluton
  scene.add(pionnier);
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
  comms.clear(); seenAmbient.clear();
  trustAria = true; choiceMade = false;
  status.reset();
  missions = new Missions(system, hud, onWin, sfx, comms, onChoice, { status, scene, onFx });
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
  state = "paused"; input.enabled = false; input.exitLock();
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

// ---- choix moral (déclenché après la révélation de Saturne) ----
function onChoice() {
  if (choiceMade || state !== "playing") return;     // une seule fois
  choiceMade = true;
  state = "choice"; input.enabled = false; input.exitLock();
  document.body.classList.remove("warping");
  document.getElementById("choice").classList.remove("hidden");
}
function resolveChoice(trust) {
  if (state !== "choice") return;
  trustAria = trust; sfx.click();
  document.getElementById("choice").classList.add("hidden");
  input.enabled = true; state = "playing"; last = performance.now();
  if (!isTouch) input.requestLock();
}

function onWin(credits, fragments) {
  state = "win"; input.enabled = false; input.exitLock();
  document.body.classList.remove("warping");
  comms.clear();
  // Cinématique finale (message recomposé) — variante selon le choix de Saturne.
  const ending = trustAria ? ENDING_TRUST : ENDING_DOUBT;
  runCinematic(ending, T("winReportBtn")).then(() => {
    sfx.win();
    showWinScreen(credits, fragments || []);
  });
}

function showWinScreen(credits, fragments) {
  const time = (performance.now() - stats.start) / 1000;
  const mm = Math.floor(time / 60), ss = Math.round(time % 60).toString().padStart(2, "0");
  const Mkm = (stats.dist * SCALE.unitKm / 1e6).toFixed(1);
  document.getElementById("winStats").innerHTML =
    `<div class="stat"><b>${mm}:${ss}</b><span>${T("statTime")}</span></div>` +
    `<div class="stat"><b>${credits}</b><span>${T("statCredits")}</span></div>` +
    `<div class="stat"><b>${Mkm}</b><span>${T("statDist")} (M km)</span></div>`;
  const msg = document.getElementById("winMessage");
  if (msg) msg.textContent = FINAL_MESSAGE;
  const frEl = document.getElementById("winFragments");
  if (frEl) frEl.innerHTML = fragments.map((f) => `<span class="frag">${f}</span>`).join("");
  document.getElementById("win").classList.remove("hidden");
  missions = null;
}

// -------------------------------------------------------------------
//  Cinématique plein écran (intro & final). Joue une liste de répliques
//  dans le panneau #cinema avec effet machine à écrire. Cliquer / Espace
//  avance ; « PASSER » saute jusqu'au bouton final. Renvoie une promesse
//  résolue quand le joueur valide (ou saute).
// -------------------------------------------------------------------
function runCinematic(beats, ctaLabel) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("cinema");
    const log = document.getElementById("cinemaLog");
    const skip = document.getElementById("cinemaSkip");
    const cta = document.getElementById("cinemaCta");
    const ctrl = { cancelled: false, advance: false };
    let finished = false;

    log.innerHTML = "";
    cta.classList.add("hidden");
    skip.classList.remove("hidden");
    cta.textContent = ctaLabel || "CONTINUER ▸";
    overlay.classList.remove("hidden");

    const onSkip = (e) => { e && e.stopPropagation(); ctrl.cancelled = true; ctrl.advance = true; };
    const onAdvance = () => { ctrl.advance = true; };
    const onKey = (e) => {
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); ctrl.advance = true; }
      else if (e.code === "Escape") { ctrl.cancelled = true; ctrl.advance = true; }
    };
    const finish = () => {
      if (finished) return; finished = true;
      overlay.classList.add("hidden");
      skip.removeEventListener("click", onSkip);
      cta.removeEventListener("click", finish);
      overlay.removeEventListener("click", onAdvance);
      removeEventListener("keydown", onKey, true);
      resolve();
    };
    skip.addEventListener("click", onSkip);
    cta.addEventListener("click", finish);
    overlay.addEventListener("click", onAdvance);
    addEventListener("keydown", onKey, true);

    (async () => {
      for (const b of beats) {
        if (ctrl.cancelled) break;
        const sp = SPEAKERS[b.who] || SPEAKERS.sys;
        const line = document.createElement("div");
        line.className = "cine-line " + sp.cls;
        const av = document.createElement("div"); av.className = "av cine-av " + sp.cls;
        const body = document.createElement("div"); body.className = "cine-body";
        const who = document.createElement("span"); who.className = "cine-who"; who.textContent = sp.name;
        const txt = document.createElement("span"); txt.className = "cine-text";
        body.appendChild(who); body.appendChild(txt);
        line.appendChild(av); line.appendChild(body); log.appendChild(line);
        log.scrollTop = log.scrollHeight;
        if (b.fx) onFx(b.fx);
        if (sfx) { if (b.who === "signal" && sfx.signal) sfx.signal(); else if (sfx.comm) sfx.comm(b.who); }
        ctrl.advance = false;
        await typeInto(txt, b.text, 48, ctrl);
        log.scrollTop = log.scrollHeight;
        await waitHold(b.text, ctrl);
      }
      skip.classList.add("hidden");
      cta.classList.remove("hidden");
      cta.focus && cta.focus();
      if (ctrl.cancelled) { /* le bouton reste, mais Échap/PASSER ferme direct */ }
    })();

    function waitHold(text, c) {
      return new Promise((res) => {
        const dur = Math.min(5200, Math.max(1500, text.length * 46));
        const t0 = performance.now();
        const poll = () => {
          if (c.cancelled || c.advance) return res();
          if (performance.now() - t0 >= dur) return res();
          requestAnimationFrame(poll);
        };
        poll();
      });
    }
  });
}

document.getElementById("startBtn").onclick = async () => {
  music.start(); sfx.start();              // 1er geste utilisateur -> autorise l'audio
  document.getElementById("start").classList.add("hidden");
  await runCinematic(INTRO, T("introLaunchBtn"));   // transmission d'ouverture
  startGame();
};
document.getElementById("resumeBtn").onclick = () => { sfx.click(); resumeGame(); };
document.getElementById("restartBtn").onclick = () => { sfx.click(); newGame(); startGame(); };
document.getElementById("helpBtn").onclick = () => { sfx.click(); document.getElementById("help").classList.toggle("hidden"); };
document.getElementById("choiceTrust").onclick = () => resolveChoice(true);
document.getElementById("choiceDoubt").onclick = () => resolveChoice(false);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

input.onPress("unlock", () => { if (state === "playing") pauseGame(); });
input.onPress("pause", () => (state === "playing" ? pauseGame() : state === "paused" ? resumeGame() : null));
input.onPress("map", () => { sfx.click(); openMap(); });
input.onPress("help", () => document.getElementById("help").classList.toggle("hidden"));
document.getElementById("radar").addEventListener("click", () => { sfx.click(); openMap(); });
addEventListener("blur", () => pauseGame());

// ---- Pionnier-9 : la sonde perdue, modélisée et dérivant près de Pluton ----
const _probePos = new THREE.Vector3(), _probeOut = new THREE.Vector3(), _probeSide = new THREE.Vector3();
const _PROBE_UP = new THREE.Vector3(0, 1, 0);

function beaconTexture(s = 128) {
  const cv = document.createElement("canvas"); cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(190,170,255,0.7)");
  g.addColorStop(0.7, "rgba(140,110,255,0.18)");
  g.addColorStop(1, "rgba(120,90,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(cv);
}

function buildProbe() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24b, metalness: 0.75, roughness: 0.38, emissive: 0x3a2a08, emissiveIntensity: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a32, metalness: 0.5, roughness: 0.6 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xc2cad6, metalness: 0.3, roughness: 0.5, emissive: 0x0a0e16, emissiveIntensity: 0.4 });
  const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 8), gold); g.add(bus);          // bus octogonal doré
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.15, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.32), pale);
  dish.scale.set(1, 0.32, 1); dish.position.y = 0.95; dish.rotation.x = Math.PI; g.add(dish);          // antenne grand gain
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), dark); feed.position.y = 0.62; g.add(feed);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 8), dark); boom.rotation.z = Math.PI / 2; boom.position.x = -1.3; g.add(boom);
  const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12), dark); rtg.rotation.z = Math.PI / 2; rtg.position.x = -2.5; g.add(rtg); // générateur RTG
  const mag = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, 0.05), pale); mag.position.x = 2.1; g.add(mag);  // perche magnétomètre
  const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: beaconTexture(), color: 0x9b8cff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  beacon.scale.setScalar(6); beacon.position.y = 0.62; g.add(beacon);                                  // balise violette du signal
  const light = new THREE.PointLight(0x9b8cff, 1.8, 0, 2); light.position.y = 0.62; g.add(light);
  g.scale.setScalar(320);                 // agrandie pour rester visible à l'échelle de Pluton
  g.userData = { beacon, light, t: 0 };
  return g;
}

function updateProbe(dt) {
  system.worldPos("pluto", _probePos);
  _probeOut.copy(_probePos).normalize();
  _probeSide.crossVectors(_PROBE_UP, _probeOut).normalize();
  const pr = system.radiusOf("pluto");
  pionnier.position.copy(_probePos)
    .addScaledVector(_probeOut, pr * 1.6)
    .addScaledVector(_PROBE_UP, pr * 0.55)
    .addScaledVector(_probeSide, pr * 0.7);
  const u = pionnier.userData; u.t += dt;
  pionnier.rotation.y += dt * 0.05;
  pionnier.rotation.x = Math.sin(u.t * 0.3) * 0.12;
  const pulse = 0.5 + 0.5 * Math.sin(u.t * 2.1);
  u.beacon.material.opacity = 0.5 + 0.5 * pulse;
  u.beacon.scale.setScalar(5 + 3 * pulse);
  u.light.intensity = 1.0 + 1.8 * pulse;
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
      lastNav = system.nearestSurface(ship.group.position);
      ship.update(STEP, input, lastNav);
      if (ship.resolveCollision(system.bodies.values())) sfx.impact();
      missions.update(STEP, ship, input);
      stats.dist += Math.abs(ship.speed) * STEP;
      acc -= STEP;
    }
    comms.update(dt);
    status.update(dt);                                                     // régénération du bouclier
    // réplique d'ambiance à la première approche d'un astre hors-mission
    if (lastNav.key && AMBIENT[lastNav.key] && !seenAmbient.has(lastNav.key) && !comms.busy) {
      const ab = system.bodies.get(lastNav.key);
      if (ab && lastNav.dist < Math.max(ab.radius * 1.2, 4000)) {
        seenAmbient.add(lastNav.key);
        comms.playSequence(AMBIENT[lastNav.key]);
      }
    }
    system.update(dt, camera);
    ship.updateCamera(dt, camera);
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    const mode = ship.warping ? "warp" : ship.boosting ? "boost" : "cruise";
    if (mode !== prevMode) {
      if (mode === "warp") sfx.warpOn();
      else if (prevMode === "warp") sfx.warpOff();
      prevMode = mode;
    }
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
  }

  if (pionnier && system) updateProbe(dt);                               // sonde Pionnier-9 près de Pluton
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
