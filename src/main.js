import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Rocket } from './Rocket';
import { ParticleSystem } from './ParticleSystem';

gsap.registerPlugin(ScrollTrigger);

// 3D Scene Setup
const canvas = document.getElementById('canvas3d');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Lights
const hemiLight = new THREE.HemisphereLight(0x0f172a, 0x010105, 2);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 3);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

const blueFill = new THREE.DirectionalLight(0x06b6d4, 2);
blueFill.position.set(-5, 0, -5);
scene.add(blueFill);

const redRim = new THREE.PointLight(0xcc1111, 5, 20);
redRim.position.set(0, 5, -5);
scene.add(redRim);

// Rocket & Particles
const rocketPathGroup = new THREE.Group();
const rocket = new Rocket();
rocketPathGroup.add(rocket.group);
// Offset rocket to the right side of the screen
rocketPathGroup.position.set(2.5, -0.5, 0);
scene.add(rocketPathGroup);

const particleSystem = new ParticleSystem();

camera.position.z = 5;

// Handle Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animations & Timing
const clock = new THREE.Clock();

function animate() {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = clock.getDelta();

  rocket.update(elapsedTime);

  // Air streaks follow rocket orientation
  particleSystem.update(deltaTime, rocket.group);

  if (window.starsMaterial) {
    window.starsMaterial.uniforms.time.value = elapsedTime;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// GSAP Scroll Animations
function setupAnimations() {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.5,
    }
  });

  // Gentle global scroll drift: Rocket stays mostly fixed near the center-right, minimal parallax
  tl.to(rocketPathGroup.position, {
    y: -0.5, // Keeps it visible across all sections
    x: 1.5, // Slight drift inwards
    ease: "power1.inOut"
  }, 0);

  // Minimal scroll-based rotation, allowing the natural hover animation (in Rocket.js) to shine
  tl.to(rocketPathGroup.rotation, {
    x: -0.05,
    y: 0.1,
    z: 0.05,
    ease: "sine.inOut"
  }, 0);

  // Reveal Sections with Premium Glass Effect
  const sections = document.querySelectorAll('.glass-section');
  sections.forEach((section) => {
    gsap.from(section, {
      scrollTrigger: {
        trigger: section,
        start: "top 90%",
        end: "top 60%",
        scrub: true,
      },
      opacity: 0,
      y: 150,
      rotateX: 10,
      scale: 0.8,
      filter: "blur(20px)",
      duration: 1.5,
    });
  });

  // Reveal Text with "Slide and Fade"
  const revealTexts = document.querySelectorAll('.reveal-text');
  revealTexts.forEach((text) => {
    gsap.from(text, {
      scrollTrigger: {
        trigger: text,
        start: "top 95%",
      },
      opacity: 0,
      y: 40,
      duration: 1.2,
      ease: "expo.out",
    });
  });
}

// Initial Star Setup (3D)
function setupStars() {
  const starsGeometry = new THREE.BufferGeometry();
  const count = 800; // Increased to add some stars back, keeping it subtle
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  // Natural star colors with varied opacity
  const colorChoices = [
    new THREE.Color(0xffffff), // Bright white
    new THREE.Color(0xefefef), // Soft white
    new THREE.Color(0xfff4e8), // Very soft warm
    new THREE.Color(0xe8f4ff), // Very soft cool
  ];

  for (let i = 0; i < count; i++) {
    const r = 40 + Math.random() * 80; // Spread out further
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const col = colorChoices[Math.floor(Math.random() * colorChoices.length)];
    // Varying brightness (boosted for visibility)
    const brightness = 0.6 + Math.random() * 0.4;
    colors[i * 3] = col.r * brightness;
    colors[i * 3 + 1] = col.g * brightness;
    colors[i * 3 + 2] = col.b * brightness;

    // Increased, varying sizes (small to medium)
    sizes[i] = 2.0 + Math.random() * 4.0;
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  window.starsMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float time;
            void main() {
                vColor = color;
                vec3 pos = position;
                
                // Parallax depth calculation
                float dist = length(pos);
                float parallax = 40.0 / max(dist, 10.0); // Near stars have higher parallax multiplier
                
                // 1. Procedural orbital drifting using sine and cosine over time
                pos.x += sin(time * 0.15 * parallax + pos.z) * 3.0 * parallax;
                pos.y += cos(time * 0.15 * parallax + pos.x) * 3.0 * parallax;
                pos.z += sin(time * 0.1 * parallax + pos.y) * 2.0 * parallax;
                
                // 2. Synchronize with rocket's natural hover (sine waves from Rocket.js update)
                // We move the stars opposite to the rocket's movement to simulate camera following the rocket
                pos.y -= sin(time * 1.2) * 1.8 * parallax;
                pos.x -= cos(time * 0.8) * 1.2 * parallax;

                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                // Smooth twinkling
                float twinkle = sin(time * 1.5 + position.x * 0.5 + position.y * 0.5) * 0.5 + 0.5;
                gl_PointSize = size * (100.0 / -mvPosition.z) * (0.6 + twinkle * 0.6);
            }
        `,
    fragmentShader: `
            varying vec3 vColor;
            void main() {
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;
                // Softer radial gradient 
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                gl_FragColor = vec4(vColor, alpha * 0.95); // Higher max opacity for visibility
            }
        `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const starFieldGroup = new THREE.Points(starsGeometry, window.starsMaterial);
  scene.add(starFieldGroup);
}

// Initialize everything
setupStars();
setupAnimations();
animate();
