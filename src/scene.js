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
  // strength / radius / threshold : bloom plus doux pour éviter qu'une petite
  // source brillante (Soleil lointain) ne se transforme en tache carrée saturée.
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.7, 0.88);
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
