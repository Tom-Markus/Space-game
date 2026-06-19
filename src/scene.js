import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // exposition légèrement réduite : compense la baisse d'intensité de lumière
  // côté éclairé sans assombrir le côté nuit (qui reste dominé par l'ambient).
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  // Échelle réelle : énorme amplitude near/far -> depth-buffer logarithmique.
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 1.0e12);
  camera.position.set(0, 3, 12);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // strength / radius / threshold : bloom modéré et LARGE (radius élevé) -> diffuse
  // le disque solaire en un voile rond. Le gros du halo « puissant » est porté par
  // les sprites ronds du Soleil (jamais carrés) ; le bloom ne fait qu'étaler le
  // disque. Seuil haut (0.86) + force contenue (0.62) : un Soleil lointain (1 px)
  // ne se transforme pas en carré, et de près l'écran ne sature pas en blanc.
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.62, 0.9, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function setSize() {
    const w = innerWidth, h = innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }
  addEventListener("resize", setSize);
  addEventListener("orientationchange", setSize);

  return { renderer, scene, camera, composer, bloom, render: () => composer.render() };
}
