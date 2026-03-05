import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createNetworkMarketSystem } from './NetworkMarketSystem.js';
import { createEnvironment } from './Environment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById('canvas3d');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030814);
scene.fog = new THREE.FogExp2(0x030814, 0.0085);

const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(0, 0.04, 4.95);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.powerPreference = 'high-performance';
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = false;

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.2;
bloomPass.strength = 1.6;
bloomPass.radius = 0.5;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

const ambientLight = new THREE.AmbientLight(0x203a5d, 0.46);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xa7d7ff, 1.35);
directionalLight.position.set(6, 8, 4);
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0x66b9ff, 0.55);
fillLight.position.set(-6, 3, 2);
scene.add(fillLight);

const networkMarketSystem = createNetworkMarketSystem(scene);
const environment = createEnvironment(scene);

const starGeometry = new THREE.BufferGeometry();
const starCount = 1500;
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);
const white = new THREE.Color(0xffffff);
const blue = new THREE.Color(0x8ecfff);

for (let i = 0; i < starCount; i++) {
  const radius = 42 + Math.random() * 110;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
  starPositions[i * 3 + 2] = radius * Math.cos(phi);

  const brightness = 0.45 + Math.random() * 0.55;
  const c = white.clone().lerp(blue, Math.random() * 0.35);
  starColors[i * 3] = c.r * brightness;
  starColors[i * 3 + 1] = c.g * brightness;
  starColors[i * 3 + 2] = c.b * brightness;
}

starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

const starMaterial = new THREE.PointsMaterial({
  size: 0.55,
  vertexColors: true,
  transparent: true,
  opacity: 0.82,
  depthWrite: false
});

const starfield = new THREE.Points(starGeometry, starMaterial);
scene.add(starfield);

const clock = new THREE.Clock();
const scrollState = {
  camZ: 4.95,
  camFov: 60,
  systemRot: 0
};

ScrollTrigger.create({
  trigger: 'main',
  start: 'top top',
  end: 'bottom bottom',
  scrub: 1,
  onUpdate: (self) => {
    const p = self.progress;
    scrollState.camZ = 4.95 - p * 0.45;
    scrollState.camFov = 60 - p * 2.2;
    scrollState.systemRot = p * 0.22;
  }
});

const sectionTweenConfig = {
  opacity: 0,
  y: 100,
  rotateX: 5,
  scale: 0.9,
  filter: 'blur(12px)',
  duration: 1.05
};

document.querySelectorAll('.glass-section').forEach((section) => {
  gsap.from(section, {
    ...sectionTweenConfig,
    scrollTrigger: {
      trigger: section,
      start: 'top 90%',
      end: 'top 62%',
      scrub: true
    }
  });
});

document.querySelectorAll('.reveal-text').forEach((text) => {
  gsap.from(text, {
    scrollTrigger: {
      trigger: text,
      start: 'top 95%'
    },
    opacity: 0,
    y: 24,
    duration: 0.95,
    ease: 'expo.out'
  });
});

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  composer.setSize(width, height);
}

window.addEventListener('resize', onResize);

function animate() {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  networkMarketSystem.setScrollInfluence(scrollState.systemRot);
  networkMarketSystem.update(delta);
  environment.update(delta);

  camera.position.z = scrollState.camZ;
  camera.lookAt(1.1, -0.08, -2.65);
  if (Math.abs(camera.fov - scrollState.camFov) > 0.001) {
    camera.fov = scrollState.camFov;
    camera.updateProjectionMatrix();
  }

  starfield.rotation.y += delta * 0.0025;
  starfield.rotation.x = Math.sin(elapsed * 0.04) * 0.02;

  composer.render();
  requestAnimationFrame(animate);
}

animate();
