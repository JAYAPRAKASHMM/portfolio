import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Rocket } from './Rocket.js';
import { ParticleSystem } from './ParticleSystem.js';
import { TechEnvironment } from './Environment.js';

gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById('canvas3d');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030611, 0.012);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.22,
  0.55,
  0.82
);
composer.addPass(renderPass);
composer.addPass(bloomPass);

const fxState = { bloomBoost: 0, camZ: 5, camFov: 70 };

const coarsePointerMq = window.matchMedia('(pointer: coarse)');
const mobileWidthMq = window.matchMedia('(max-width: 900px)');

function getMotionProfile() {
  const isMobile = coarsePointerMq.matches || mobileWidthMq.matches;
  if (isMobile) {
    return {
      motionScale: 0.65,
      particleIntensity: 0.7,
      rocketScale: 0.46,
      bloomBase: 0.16,
      starParallaxScale: 0.68
    };
  }

  return {
    motionScale: 1.0,
    particleIntensity: 1.0,
    rocketScale: 0.5,
    bloomBase: 0.24,
    starParallaxScale: 1.0
  };
}

let motionProfile = getMotionProfile();

const hemiLight = new THREE.HemisphereLight(0x10213a, 0x010307, 1.8);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
keyLight.position.set(6, 6, 5);
scene.add(keyLight);

const planetRimLight = new THREE.PointLight(0x33deff, 1.8, 30, 2);
planetRimLight.position.set(-4.8, 1.2, -5);
scene.add(planetRimLight);

const engineWarmLight = new THREE.PointLight(0xff8a33, 1.35, 18, 2);
engineWarmLight.position.set(3.2, -2.1, 1.8);
scene.add(engineWarmLight);

const rocketPathGroup = new THREE.Group();
const rocket = new Rocket();
rocketPathGroup.add(rocket.group);
rocketPathGroup.position.set(3.35, -0.42, 1.35);
scene.add(rocketPathGroup);

const particleSystem = new ParticleSystem();
const techEnv = new TechEnvironment(scene);

const clock = new THREE.Clock();
const starLayers = [];
const rocketForward = new THREE.Vector3(0, 1, 0);
const tmpTangent = new THREE.Vector3();
let scrollProgress = 0;
let flightCurve;

function applyMotionProfile() {
  motionProfile = getMotionProfile();
  rocket.group.scale.setScalar(motionProfile.rocketScale);
  buildRocketFlightCurve();
}

function buildRocketFlightCurve() {
  const m = motionProfile.motionScale;
  flightCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.35, -0.42, 1.35), // right idle
    new THREE.Vector3(3.22, 1.25 + m * 0.35, 1.9), // rise up
    new THREE.Vector3(1.5, 1.55 + m * 0.2, 2.35), // begin U-turn
    new THREE.Vector3(-1.95, 1.0, 3.65), // attack toward viewer and left
    new THREE.Vector3(-4.9, 0.15, 3.25), // left sweep
    new THREE.Vector3(-6.7, -0.55, 2.9), // partially out on left
    new THREE.Vector3(6.2, -3.2, 3.45), // re-enter from bottom-right
    new THREE.Vector3(4.5, -1.7, 2.55), // climb back in
    new THREE.Vector3(3.35, -0.42, 1.45) // settle to right hover
  ]);
  flightCurve.tension = 0.56;
}

function createStarLayer({
  count,
  radiusMin,
  radiusMax,
  sizeMin,
  sizeMax,
  twinkleMin,
  twinkleMax,
  parallax,
  opacity,
  sparkle = 0
}) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkleOffset = new Float32Array(count);
  const twinkleSpeed = new Float32Array(count);

  const colorChoices = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xe8f4ff),
    new THREE.Color(0xfff2cf)
  ];

  for (let i = 0; i < count; i++) {
    const r = radiusMin + Math.random() * (radiusMax - radiusMin);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const col = colorChoices[Math.floor(Math.random() * colorChoices.length)];
    const brightness = 0.55 + Math.random() * 0.45;
    colors[i * 3] = col.r * brightness;
    colors[i * 3 + 1] = col.g * brightness;
    colors[i * 3 + 2] = col.b * brightness;

    sizes[i] = sizeMin + Math.random() * (sizeMax - sizeMin);
    twinkleOffset[i] = Math.random() * Math.PI * 2;
    twinkleSpeed[i] = twinkleMin + Math.random() * (twinkleMax - twinkleMin);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('twinkleOffset', new THREE.BufferAttribute(twinkleOffset, 1));
  geometry.setAttribute('twinkleSpeed', new THREE.BufferAttribute(twinkleSpeed, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      parallax: { value: parallax },
      layerOpacity: { value: opacity },
      sparkle: { value: sparkle }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      attribute float twinkleOffset;
      attribute float twinkleSpeed;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float time;
      uniform float parallax;
      uniform float sparkle;
      void main() {
        vColor = color;
        vec3 pos = position;

        pos.x += sin(time * 0.07 * parallax + position.z * 0.01) * 1.2 * parallax;
        pos.y += cos(time * 0.06 * parallax + position.x * 0.01) * 1.2 * parallax;
        pos.y -= sin(time * 0.95) * 0.35 * parallax;
        pos.x -= cos(time * 0.58) * 0.28 * parallax;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        vTwinkle = sin(time * twinkleSpeed + twinkleOffset + position.x * 0.03 + position.y * 0.04) * 0.5 + 0.5;
        gl_PointSize = size * (90.0 / -mvPosition.z) * (0.72 + vTwinkle * (0.58 + sparkle * 0.35));
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float layerOpacity;
      uniform float sparkle;
      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        float core = 1.0 - smoothstep(0.0, 0.17, dist);
        float halo = (1.0 - smoothstep(0.17, 0.5, dist)) * 0.42;
        float twinkleAlpha = 0.52 + vTwinkle * 0.48;
        float sparkleBoost = 1.0 + sparkle * core * 0.95;
        vec3 finalColor = vColor + (vColor * sparkle * core * 0.5);
        gl_FragColor = vec4(finalColor, (alpha * 0.62 + core + halo) * twinkleAlpha * layerOpacity * sparkleBoost);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  points.renderOrder = 0;
  scene.add(points);
  starLayers.push({ material, baseParallax: parallax });
}

function setupStars() {
  createStarLayer({
    count: 620,
    radiusMin: 90,
    radiusMax: 145,
    sizeMin: 0.9,
    sizeMax: 2.1,
    twinkleMin: 0.18,
    twinkleMax: 0.55,
    parallax: 0.24,
    opacity: 0.58,
    sparkle: 0.08
  });

  createStarLayer({
    count: 460,
    radiusMin: 62,
    radiusMax: 108,
    sizeMin: 1.2,
    sizeMax: 3.4,
    twinkleMin: 0.4,
    twinkleMax: 1.0,
    parallax: 0.5,
    opacity: 0.78,
    sparkle: 0.2
  });

  createStarLayer({
    count: 230,
    radiusMin: 42,
    radiusMax: 74,
    sizeMin: 1.8,
    sizeMax: 5.2,
    twinkleMin: 0.7,
    twinkleMax: 1.6,
    parallax: 0.95,
    opacity: 0.98,
    sparkle: 0.4
  });

  createStarLayer({
    count: 52,
    radiusMin: 34,
    radiusMax: 58,
    sizeMin: 4.0,
    sizeMax: 7.0,
    twinkleMin: 1.1,
    twinkleMax: 2.2,
    parallax: 1.2,
    opacity: 0.64,
    sparkle: 0.85
  });
}

function setupAnimations() {
  const sections = Array.from(document.querySelectorAll('main > section'));

  ScrollTrigger.create({
    trigger: 'main',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.0,
    onUpdate: (self) => {
      scrollProgress = self.progress;
    }
  });

  const fxTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: 'main',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.0
    }
  });

  fxTimeline.to(fxState, { camZ: 4.72, camFov: 67.2, bloomBoost: 0.045, duration: 0.2, ease: 'none' }, 0.2);
  fxTimeline.to(fxState, { camZ: 4.45, camFov: 65.6, bloomBoost: 0.09, duration: 0.24, ease: 'none' }, 0.34);
  fxTimeline.to(fxState, { camZ: 4.85, camFov: 68.2, bloomBoost: 0.025, duration: 0.2, ease: 'none' }, 0.62);
  fxTimeline.to(fxState, { camZ: 5, camFov: 70, bloomBoost: 0, duration: 0.18, ease: 'none' }, 0.82);

  // Subtle per-section bloom beats for stronger section-by-section staging.
  sections.forEach((section, index) => {
    gsap.to(fxState, {
      bloomBoost: 0.012 + (index % 2 ? 0.01 : 0),
      scrollTrigger: {
        trigger: section,
        start: 'top 70%',
        end: 'bottom 30%',
        scrub: true
      },
      overwrite: false
    });
  });

  // Keep existing section reveals.
  const glassSections = document.querySelectorAll('.glass-section');
  glassSections.forEach((section) => {
    gsap.from(section, {
      scrollTrigger: {
        trigger: section,
        start: 'top 90%',
        end: 'top 60%',
        scrub: true
      },
      opacity: 0,
      y: 130,
      rotateX: 8,
      scale: 0.84,
      filter: 'blur(18px)',
      duration: 1.4
    });
  });

  const revealTexts = document.querySelectorAll('.reveal-text');
  revealTexts.forEach((text) => {
    gsap.from(text, {
      scrollTrigger: {
        trigger: text,
        start: 'top 95%'
      },
      opacity: 0,
      y: 34,
      duration: 1.1,
      ease: 'expo.out'
    });
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
  applyMotionProfile();
}

window.addEventListener('resize', onResize);
coarsePointerMq.addEventListener('change', applyMotionProfile);
mobileWidthMq.addEventListener('change', applyMotionProfile);

function animate() {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = clock.getDelta();

  if (flightCurve) {
    const p = flightCurve.getPointAt(scrollProgress);
    rocketPathGroup.position.copy(p);
    flightCurve.getTangentAt(Math.min(0.999, scrollProgress), tmpTangent);
    tmpTangent.normalize();
    const orientQ = new THREE.Quaternion().setFromUnitVectors(rocketForward, tmpTangent);
    // Gentle bank along path for a more natural arc.
    const bankQ = new THREE.Quaternion().setFromAxisAngle(tmpTangent, Math.sin(scrollProgress * Math.PI * 6) * 0.06);
    orientQ.multiply(bankQ);
    rocketPathGroup.quaternion.slerp(orientQ, 0.22);
  }

  rocket.update(elapsedTime, motionProfile.motionScale);
  particleSystem.update(deltaTime, rocket.group, motionProfile.particleIntensity);
  techEnv.update(deltaTime, elapsedTime);

  engineWarmLight.intensity = 1.2 + Math.sin(elapsedTime * 14) * 0.18;
  planetRimLight.intensity = 1.7 + Math.cos(elapsedTime * 0.8) * 0.12;

  for (let i = 0; i < starLayers.length; i++) {
    const layer = starLayers[i];
    layer.material.uniforms.time.value = elapsedTime;
    layer.material.uniforms.parallax.value = layer.baseParallax * motionProfile.starParallaxScale;
  }

  bloomPass.strength = motionProfile.bloomBase + fxState.bloomBoost;
  camera.position.z = fxState.camZ;
  if (Math.abs(camera.fov - fxState.camFov) > 0.001) {
    camera.fov = fxState.camFov;
    camera.updateProjectionMatrix();
  }

  composer.render();
  requestAnimationFrame(animate);
}

applyMotionProfile();
setupStars();
setupAnimations();
animate();
