import * as THREE from 'three';

const NODE_COUNT = 300;
const MAX_CONNECTIONS = 1200;
const CANDLE_COUNT = 140;
const SHIP_COUNT = 5;

const TMP_POS = new THREE.Vector3();
const TMP_SCALE = new THREE.Vector3(1, 1, 1);
const TMP_QUAT = new THREE.Quaternion();
const TMP_MAT4 = new THREE.Matrix4();
const TMP_EULER = new THREE.Euler();

function buildSphereNodes(count, radius) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  return positions;
}

function buildConnectionIndices(positions, maxDistance) {
  const nodeCount = positions.length / 3;
  const pairs = [];
  const used = new Set();
  const maxDb = maxDistance * maxDistance;

  for (let i = 0; i < nodeCount && pairs.length / 2 < MAX_CONNECTIONS; i++) {
    const ix = i * 3;
    const ax = positions[ix];
    const ay = positions[ix + 1];
    const az = positions[ix + 2];

    for (let j = i + 1; j < nodeCount && pairs.length / 2 < MAX_CONNECTIONS; j++) {
      const jx = j * 3;
      const dx = ax - positions[jx];
      const dy = ay - positions[jx + 1];
      const dz = az - positions[jx + 2];

      if (dx * dx + dy * dy + dz * dz > maxDb) continue;

      const key = `${i}-${j}`;
      if (used.has(key)) continue;

      used.add(key);
      pairs.push(i, j);
    }
  }
  return pairs;
}

function createGlowTexture(colorStr, alpha = 1) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size * 0.5, size * 0.5, 0, size * 0.5, size * 0.5, size * 0.5);
  g.addColorStop(0, `rgba(${colorStr}, ${1.0 * alpha})`);
  g.addColorStop(0.2, `rgba(${colorStr}, ${0.8 * alpha})`);
  g.addColorStop(0.5, `rgba(${colorStr}, ${0.2 * alpha})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createNetworkMarketSystem(scene) {
  const group = new THREE.Group();
  group.position.set(1.1, -0.15, -2.8);
  group.scale.setScalar(1.2);

  // 1. Core Cyber Globe
  const coreSphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 64, 64),
    new THREE.MeshPhongMaterial({
      color: 0x020813,
      emissive: 0x01081a,
      specular: 0x55aaff,
      shininess: 90,
      transparent: true,
      opacity: 0.95
    })
  );
  group.add(coreSphere);

  // 2. Network Grid on Globe
  const nodePositions = buildSphereNodes(NODE_COUNT, 2.02);
  const nodeGeometry = new THREE.BufferGeometry();
  nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));

  const nodes = new THREE.Points(
    nodeGeometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  group.add(nodes);

  const connectionIndices = buildConnectionIndices(nodePositions, 0.75);
  const connectionGeometry = new THREE.BufferGeometry();
  connectionGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
  connectionGeometry.setIndex(connectionIndices);
  const connectionMaterial = new THREE.LineBasicMaterial({
    color: 0x33bfff,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const connectionLines = new THREE.LineSegments(connectionGeometry, connectionMaterial);
  group.add(connectionLines);

  // Surface Highlights
  const highlightTex = createGlowTexture('200, 240, 255', 0.8);
  const highlightMat = new THREE.SpriteMaterial({
    map: highlightTex, color: 0x88ddff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(highlightMat);
    const idx = Math.floor(Math.random() * NODE_COUNT) * 3;
    s.position.set(nodePositions[idx], nodePositions[idx + 1], nodePositions[idx + 2]);
    s.position.multiplyScalar(1.02); // Just outside
    s.scale.setScalar(0.4 + Math.random() * 0.6);
    group.add(s);
  }

  // 3. Ring System
  const ringSystem = new THREE.Group();
  ringSystem.rotation.x = Math.PI * 0.22; // Tilted like Saturn
  ringSystem.rotation.z = -Math.PI * 0.08;
  group.add(ringSystem);

  const ringConfigs = [
    { radius: 2.6, tube: 0.005, color: 0x44aaff, speed: 0.02, opacity: 0.6 },
    { radius: 2.7, tube: 0.02, color: 0x1166cc, speed: -0.015, opacity: 0.2 },
    { radius: 3.3, tube: 0.008, color: 0x22eeff, speed: 0.01, opacity: 0.4 },
    { radius: 3.4, tube: 0.002, color: 0xffffff, speed: 0.03, opacity: 0.7 },
    { radius: 3.6, tube: 0.015, color: 0x004488, speed: -0.02, opacity: 0.3 },
    { radius: 4.2, tube: 0.006, color: 0x55ccff, speed: 0.012, opacity: 0.5 },
  ];

  const ringMeshes = [];
  ringConfigs.forEach(cfg => {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.radius, cfg.tube, 8, 128),
      new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ringSystem.add(r);
    ringMeshes.push({ mesh: r, speed: cfg.speed });
  });

  // Flowing trails on rings
  const trailCount = 300;
  const trailPositions = new Float32Array(trailCount * 3);
  const trailColors = new Float32Array(trailCount * 3);
  for (let i = 0; i < trailCount; i++) {
    const ring = ringConfigs[Math.floor(Math.random() * ringConfigs.length)];
    const angle = Math.random() * Math.PI * 2;
    trailPositions[i * 3] = Math.cos(angle) * ring.radius;
    trailPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
    trailPositions[i * 3 + 2] = Math.sin(angle) * ring.radius;

    // bluish white
    trailColors[i * 3] = 0.5 + Math.random() * 0.5;
    trailColors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
    trailColors[i * 3 + 2] = 1.0;
  }
  const trailGeom = new THREE.BufferGeometry();
  trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeom.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
  const trailPoints = new THREE.Points(trailGeom, new THREE.PointsMaterial({
    size: 0.03, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  ringSystem.add(trailPoints);

  // 4. Candlesticks (Market Data rings)
  const candleGeom = new THREE.BoxGeometry(0.04, 1, 0.04);
  const candleWickGeom = new THREE.BoxGeometry(0.01, 1, 0.01);

  const greenMat = new THREE.MeshBasicMaterial({ color: 0x11ffa5, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
  const redMat = new THREE.MeshBasicMaterial({ color: 0xff1544, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });

  const greenCandles = new THREE.InstancedMesh(candleGeom, greenMat, CANDLE_COUNT / 2);
  const redCandles = new THREE.InstancedMesh(candleGeom, redMat, CANDLE_COUNT / 2);
  const greenWicks = new THREE.InstancedMesh(candleWickGeom, greenMat, CANDLE_COUNT / 2);
  const redWicks = new THREE.InstancedMesh(candleWickGeom, redMat, CANDLE_COUNT / 2);

  const candleData = []; // unified list
  const ringRadiiForCandles = [2.9, 3.1, 3.5, 3.8, 4.4];

  for (let i = 0; i < CANDLE_COUNT; i++) {
    const isGreen = i % 2 === 0;
    const r = ringRadiiForCandles[Math.floor(Math.random() * ringRadiiForCandles.length)];
    const angle = (i / CANDLE_COUNT) * Math.PI * 2 + Math.random() * 0.2;
    const height = 0.15 + Math.random() * 0.4;
    const yOffset = (Math.random() - 0.5) * 0.2; // Slight vertical jitter

    candleData.push({
      isGreen,
      index: Math.floor(i / 2),
      radius: r,
      angle: angle,
      height: height,
      yOffset: yOffset,
      speed: (1.5 / r) * 0.06 * (i % 3 === 0 ? -1 : 1), // orbit speed varies by radius
      phase: Math.random() * Math.PI * 2
    });
  }

  function updateCandles(t) {
    for (let c of candleData) {
      c.angle += c.speed;
      const x = Math.cos(c.angle) * c.radius;
      const z = Math.sin(c.angle) * c.radius;

      // fluctuate height slightly
      const currentHeight = c.height * (0.8 + 0.3 * Math.sin(t * 2 + c.phase));

      TMP_POS.set(x, c.yOffset, z);

      // Face camera or just keep it upright? In a ring, usually upright is fine. 
      // But we want them perpendicular to the ring plane, which they are since ringSystem is rotated!
      TMP_QUAT.identity(); // local up is Y

      // Body
      TMP_SCALE.set(1, currentHeight, 1);
      TMP_MAT4.compose(TMP_POS, TMP_QUAT, TMP_SCALE);
      if (c.isGreen) greenCandles.setMatrixAt(c.index, TMP_MAT4);
      else redCandles.setMatrixAt(c.index, TMP_MAT4);

      // Wick
      TMP_SCALE.set(1, currentHeight * 1.6, 1);
      TMP_MAT4.compose(TMP_POS, TMP_QUAT, TMP_SCALE);
      if (c.isGreen) greenWicks.setMatrixAt(c.index, TMP_MAT4);
      else redWicks.setMatrixAt(c.index, TMP_MAT4);
    }
    greenCandles.instanceMatrix.needsUpdate = true;
    redCandles.instanceMatrix.needsUpdate = true;
    greenWicks.instanceMatrix.needsUpdate = true;
    redWicks.instanceMatrix.needsUpdate = true;
  }
  ringSystem.add(greenCandles, redCandles, greenWicks, redWicks);

  // 5. Ships/Flying Capsules
  const shipTex = createGlowTexture('60, 180, 255', 1.0);
  const shipGlowMat = new THREE.SpriteMaterial({ map: shipTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending });

  const shipGeom = new THREE.CapsuleGeometry(0.06, 0.2, 4, 16);
  // lay the capsule flat along X axis
  shipGeom.rotateZ(Math.PI / 2);
  const shipMat = new THREE.MeshPhongMaterial({ color: 0x112233, emissive: 0x001122, specular: 0xeeeeff, shininess: 100 });

  const ships = [];
  const shipRadii = [4.1, 4.3, 4.0, 3.4, 3.2];
  for (let i = 0; i < SHIP_COUNT; i++) {
    const sGroup = new THREE.Group();
    const mesh = new THREE.Mesh(shipGeom, shipMat);

    // Front and back lights
    const engineSprite = new THREE.Sprite(shipGlowMat);
    engineSprite.scale.set(0.6, 0.6, 1);
    engineSprite.position.set(-0.15, 0, 0); // Back

    const headlightSprite = new THREE.Sprite(createGlowTexture('200,240,255', 0.8));
    headlightSprite.scale.set(0.3, 0.3, 1);
    headlightSprite.position.set(0.15, 0, 0); // Front

    sGroup.add(mesh, engineSprite, headlightSprite);

    // Add trails
    const trailLineMat = new THREE.LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
    const trailPoints = [];
    const trailLen = 20;
    const r = shipRadii[i];

    // Since ships move along the ring, we can just attach the trail curve to the ring system.
    // Actually simpler: a static circular line behind the ship

    const shipSpeed = (i % 2 === 0 ? 0.015 : -0.012) * (4 / r);
    ships.push({
      group: sGroup,
      angle: Math.random() * Math.PI * 2,
      radius: r,
      speed: shipSpeed,
      yOffset: (Math.random() - 0.5) * 0.3
    });

    ringSystem.add(sGroup);
  }

  scene.add(group);

  let time = 0;
  let scrollInfluence = 0;

  function update(delta) {
    const dt = Math.min(delta, 0.05); // cap delta to avoid massive jumps
    time += dt;

    coreSphere.rotation.y += dt * 0.05;
    nodes.rotation.y += dt * 0.05;
    connectionLines.rotation.y += dt * 0.05;

    // Pulse connections
    connectionMaterial.opacity = 0.1 + (Math.sin(time * 1.5) * 0.5 + 0.5) * 0.15;

    ringMeshes.forEach(r => {
      r.mesh.rotation.z += dt * r.speed;
    });
    trailPoints.rotation.y -= dt * 0.03;

    updateCandles(time);

    // Update Ships
    ships.forEach(s => {
      s.angle += s.speed;
      const x = Math.cos(s.angle) * s.radius;
      const z = Math.sin(s.angle) * s.radius;
      s.group.position.set(x, s.yOffset, z);

      // Orient the ship along the tangent
      // The tangent vector:
      const tx = -Math.sin(s.angle);
      const tz = Math.cos(s.angle);
      const angleY = Math.atan2(tx, tz);

      s.group.rotation.y = angleY + (s.speed < 0 ? Math.PI : 0);
      s.group.rotation.x = Math.sin(time * 2 + s.radius) * 0.1; // slight bobbing
    });

    group.rotation.y = scrollInfluence * 0.8;
  }

  function setScrollInfluence(v) {
    scrollInfluence = v;
  }

  return { group, update, setScrollInfluence };
}
