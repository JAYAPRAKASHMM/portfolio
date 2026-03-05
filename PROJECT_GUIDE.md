# Project Guide

## 1. What this project is
This is a Vite + Three.js + GSAP portfolio site with a cinematic 3D background scene. The page combines:
- Scroll-driven motion
- A custom rocket model with procedural PBR texturing
- Particle effects (streaks + sparks)
- Multi-layer starfield shader
- A tech-themed environment (planets, rings, satellites, asteroids)
- Selective bloom post-processing

The visible UI is in HTML/CSS (`index.html`, `src/style.css`).
The 3D scene and animation system are in JS modules under `src/`.

## 2. Tech stack
- Runtime/build: Vite 6
- 3D: Three.js
- Scroll animation: GSAP + ScrollTrigger
- Language: JavaScript (ES Modules)

## 3. Repository structure
- `index.html`: Main page structure and content sections.
- `src/main.js`: Scene bootstrap, renderer/composer setup, scroll timelines, animation loop.
- `src/Rocket.js`: Rocket geometry, materials, procedural PBR map generation, flame system.
- `src/ParticleSystem.js`: Rocket trail/spark emission and particle pooling.
- `src/Environment.js`: Background world objects and their updates.
- `src/style.css`: Full page styling and responsive behavior.
- `scripts/context-new.mjs`: Utility script to create new conversation context files.
- `context/`: Session context memory files for continuity across chat sessions.

## 4. Getting started
### Install
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production build
```bash
npm run build
npm run preview
```

### Create new context session file
```bash
npm run context:new
```

## 5. Page structure and content flow
`index.html` has these sections in order:
1. Hero (name, subtitle, positioning text)
2. Experience
3. Skills
4. Education
5. Contact
6. Footer

The 3D canvas (`#canvas3d`) is fixed in the background while content scrolls in front.

## 6. Rendering pipeline (important)
`src/main.js` sets up:
- Three.js scene + fog
- Perspective camera
- WebGL renderer
- PMREM environment from `RoomEnvironment` for realistic reflections

Then two post-processing composers:
1. `bloomComposer`: renders only bloom-layer objects
2. `finalComposer`: renders normal scene + combines bloom texture

Selective bloom is layer-based (`BLOOM_LAYER`) to avoid expensive per-frame material swapping.

## 7. Animation architecture
### Time sources
- `clock.getElapsedTime()` for absolute animation
- `clock.getDelta()` for frame-rate independent updates

### Scroll-driven behavior
GSAP ScrollTrigger updates:
- `scrollProgress` for rocket position along a Catmull-Rom curve
- camera Z/FOV
- bloom boost
- section reveal animations

### Main frame loop responsibilities
Each frame:
1. Sample rocket path point + tangent from curve
2. Orient rocket with quaternion slerp + bank
3. Update rocket local animation
4. Update particles
5. Update environment
6. Update star shader uniforms
7. Render bloom pass then final pass

## 8. Rocket system (`src/Rocket.js`)
The rocket is custom modeled from primitive geometry:
- Body cylinder
- Nose cap
- Window ring + glass
- Three fins
- Nozzle + inner glow
- Multi-layer crossed flame sprites

### PBR authoring in code
A procedural texture generator builds 3 maps for body/fins:
- Albedo (color variation + panels)
- Roughness (micro-variation)
- Normal map (height-derived detail)

These are applied through `MeshPhysicalMaterial` for premium reflections and highlights.

### Why this design
- No external texture files required
- Fully deterministic runtime authoring
- Maintains project portability

## 9. Particle system (`src/ParticleSystem.js`)
Two particle families:
- Streaks near front hemisphere
- Sparks near nozzle

Performance features:
- Object pooling (`streakPool`, `sparkPool`)
- O(1) removal pattern (swap/pop)
- Shared geometry/material templates
- Layer assignment for bloom where needed

## 10. Environment system (`src/Environment.js`)
Contains:
- Main circuit planet (shader material)
- Market flow rings with pulse meshes
- Trading planet with rotating candlestick belt
- Network planet + satellites
- Constellation line art
- Instanced asteroid field

Performance features:
- `InstancedMesh` for asteroid draw-call reduction
- LOD on trading planet sphere
- Loop structures optimized for frame updates

## 11. Quality and performance controls
Quality profile logic exists in `main.js`:
- Auto tier by pointer/mobile width
- URL override: `?quality=low` or `?quality=high`

Profile controls include:
- Motion scale
- Particle intensity
- Rocket scale
- Bloom base strength
- Star parallax scale
- Pixel ratio cap

This is the primary anti-lag control path.

## 12. Why lag can happen
Most common causes:
1. High DPR displays (4K/retina) increasing fragment workload
2. Bloom/postprocessing cost
3. Heavy overdraw from transparency + additive blending
4. Browser tab throttling/recovery jitter

Current mitigations already included:
- Pixel ratio capping by quality tier
- Selective bloom pass
- Instanced asteroid rendering
- Particle pooling
- Allocation-free hot-path math

## 13. Styling system (`src/style.css`)
Key style approach:
- Glassmorphism sections over deep-space background
- Hero typography with gradient accents
- Responsive layout via media query (`max-width: 768px`)
- `will-change` hints on animated elements

## 14. Context memory workflow (`context/`)
Goal: preserve conversation continuity across sessions.

Files:
- `context/README.md`: process rules
- `context/CONVERSATION_TEMPLATE.md`: template
- `context/INDEX.md`: session index
- `context/YYYY-MM-DD-session-XX.md`: per-session notes

Use `npm run context:new` to generate next session file and append index automatically.

## 15. Development conventions used in this codebase
- Keep frame loop allocation-light
- Reuse objects/materials where possible
- Prefer deterministic animation math
- Keep visual output stable when optimizing internals
- Keep context files updated for cross-session continuity

## 16. Known limitations / future upgrades
1. Procedural PBR maps are good, but authored external texture sets can give higher artistic control.
2. No automated tests yet (visual project). Add smoke checks for build + lint.
3. Could split large shader strings/constants into separate modules for maintainability.
4. Could add GPU timing instrumentation for profiling.
5. Could add runtime UI toggles (quality, bloom, particles) for live tuning.

## 17. Quick troubleshooting
### Build fails with sandbox/permission error in this environment
Use elevated run in the execution environment (already needed in this workspace setup).

### Rocket leaves frame too much
Tune control points in `buildRocketFlightCurve()` in `src/main.js`.

### Too much lag on mobile
Open with `?quality=low` and reduce particle intensity or bloom base further.

### Spark visibility too low/high
Adjust spark spawn probability and opacity in `src/ParticleSystem.js`.

## 18. Command reference
```bash
npm run dev          # local development
npm run build        # production build
npm run preview      # preview production output
npm run context:new  # create next context session file + update index
```
