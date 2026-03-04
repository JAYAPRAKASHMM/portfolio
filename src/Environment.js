import * as THREE from 'three';

export class TechEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.satellites = [];

        this.setupMainPlanet();
        this.setupMarketFlowRings();
        this.setupTradingPlanet();
        this.setupNetworkPlanet();
        this.setupConstellations();
        this.setupAsteroids();

        this.scene.add(this.group);
    }

    setupMarketFlowRings() {
        this.marketFlowGroup = new THREE.Group();
        this.planet1Group.add(this.marketFlowGroup);

        this.marketFlowTracks = [];
        const ringConfigs = [
            { radius: 7.35, tiltX: 1.32, tiltY: 0.08, color: 0x39dfff, opacity: 0.16, speed: 0.44 },
            { radius: 7.95, tiltX: 1.48, tiltY: -0.28, color: 0x8fb4ff, opacity: 0.13, speed: 0.31 },
            { radius: 8.55, tiltX: 1.18, tiltY: 0.42, color: 0x5ef3ff, opacity: 0.11, speed: 0.24 }
        ];

        ringConfigs.forEach((cfg, idx) => {
            const ringGeom = new THREE.TorusGeometry(cfg.radius, 0.018, 12, 180);
            const ringMat = new THREE.MeshBasicMaterial({
                color: cfg.color,
                transparent: true,
                opacity: cfg.opacity
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.rotation.x = cfg.tiltX;
            ring.rotation.y = cfg.tiltY;
            ring.renderOrder = 3;
            this.marketFlowGroup.add(ring);

            // Streaming order-flow pulses riding each ring.
            const pulseCount = 3 - (idx === 2 ? 1 : 0);
            const pulses = [];
            for (let i = 0; i < pulseCount; i++) {
                const pulse = new THREE.Mesh(
                    new THREE.SphereGeometry(0.075, 8, 8),
                    new THREE.MeshBasicMaterial({
                        color: idx % 2 ? 0xbdd6ff : 0x66efff,
                        transparent: true,
                        opacity: 0.75,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    })
                );
                pulse.renderOrder = 3;
                this.marketFlowGroup.add(pulse);
                pulses.push({ mesh: pulse, offset: (i / pulseCount) * Math.PI * 2 });
            }

            this.marketFlowTracks.push({
                ring,
                pulses,
                radius: cfg.radius,
                speed: cfg.speed,
                phase: Math.random() * Math.PI * 2
            });
        });
    }

    setupMainPlanet() {
        this.planet1Group = new THREE.Group();
        // Keep only ~30-40% visible in frame and behind headline layer.
        this.planet1Group.position.set(-8.9, -0.55, -13.4);
        this.group.add(this.planet1Group);

        const p1Geom = new THREE.SphereGeometry(6.5, 56, 56);

        this.circuitMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0x2de0ff) },
                bgColor: { value: new THREE.Color(0x020611) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vWorldPos;
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    vWorldPos = worldPos.xyz;
                    gl_Position = projectionMatrix * viewMatrix * worldPos;
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vWorldPos;
                uniform float time;
                uniform vec3 color;
                uniform vec3 bgColor;

                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }

                float rectMask(vec2 p, vec2 center, vec2 halfSize) {
                    vec2 d = abs(p - center) - halfSize;
                    return 1.0 - step(0.0, max(d.x, d.y));
                }

                void main() {
                    vec2 uv = vUv * 44.0;
                    vec2 grid = fract(uv);
                    vec2 id = floor(uv);

                    float h = smoothstep(0.95, 1.0, grid.y);
                    float v = smoothstep(0.95, 1.0, grid.x);
                    float traceMask = step(0.28, random(id + vec2(4.0, 11.0)));
                    float traces = (h + v) * traceMask;

                    vec2 diagUv = fract((uv + vec2(time * 0.4, -time * 0.2)) * mat2(1.0, 0.45, -0.35, 1.0));
                    float angledTrace = smoothstep(0.965, 1.0, diagUv.x) * step(0.58, random(id + vec2(9.0, 2.0)));

                    // Microchip-like blocks and channels.
                    float chipCore = rectMask(grid, vec2(0.5), vec2(0.20, 0.12)) * step(0.86, random(id + vec2(1.0, 5.0)));
                    float chipPinA = rectMask(grid, vec2(0.5, 0.84), vec2(0.18, 0.03)) * chipCore;
                    float chipPinB = rectMask(grid, vec2(0.5, 0.16), vec2(0.18, 0.03)) * chipCore;
                    float chipPins = chipPinA + chipPinB;

                    float node = smoothstep(0.18, 0.0, length(grid - vec2(0.5))) * step(0.84, random(id + vec2(7.0, 3.0)));
                    float pulse = sin(time * 1.1 + id.x * 0.7 + id.y * 0.95) * 0.5 + 0.5;

                    vec3 boardBase = bgColor + vec3(0.002, 0.007, 0.02);
                    vec3 traceGlow = color * (traces * 0.11 + angledTrace * 0.10);
                    vec3 chipGlow = vec3(0.15, 0.65, 0.95) * (chipCore * 0.35 + chipPins * 0.5);
                    vec3 nodeGlow = vec3(0.55, 0.98, 1.0) * node * (0.4 + pulse * 0.9);

                    // Spherical grid accent for wrapped-tech feel.
                    float sphereGridA = smoothstep(0.99, 1.0, fract(vUv.x * 22.0));
                    float sphereGridB = smoothstep(0.99, 1.0, fract(vUv.y * 22.0));
                    vec3 geoGrid = color * (sphereGridA + sphereGridB) * 0.03;

                    vec3 viewDir = normalize(cameraPosition - vWorldPos);
                    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.2);
                    vec3 edgeScatter = color * fresnel * 0.20;

                    vec3 finalColor = boardBase + traceGlow + chipGlow + nodeGlow + geoGrid + edgeScatter;
                    gl_FragColor = vec4(finalColor, 0.95);
                }
            `,
            transparent: true
        });

        const planet1 = new THREE.Mesh(p1Geom, this.circuitMaterial);
        planet1.renderOrder = 3;
        this.planet1Group.rotation.z = Math.PI / 8;
        this.planet1Group.rotation.x = Math.PI / 6;
        this.planet1Group.add(planet1);

        // Atmospheric cyan rim for separation from dark space.
        const atmosphereGeom = new THREE.SphereGeometry(6.95, 48, 48);
        const atmosphereMat = new THREE.MeshBasicMaterial({
            color: 0x4be7ff,
            transparent: true,
            opacity: 0.09,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.atmosphere = new THREE.Mesh(atmosphereGeom, atmosphereMat);
        this.atmosphere.renderOrder = 3;
        this.planet1Group.add(this.atmosphere);
    }

    setupNetworkPlanet() {
        this.planet2Group = new THREE.Group();
        this.planet2Group.position.set(-2.5, 2.0, -18.7);
        this.group.add(this.planet2Group);

        const p2Geom = new THREE.IcosahedronGeometry(3.0, 2);

        const p2WireMat = new THREE.MeshBasicMaterial({
            color: 0x73a6ff,
            wireframe: true,
            transparent: true,
            opacity: 0.12
        });
        const planet2Wire = new THREE.Mesh(p2Geom, p2WireMat);
        planet2Wire.renderOrder = 2;
        this.planet2Group.add(planet2Wire);

        const p2PointsMat = new THREE.PointsMaterial({
            color: 0x7de8ff,
            size: 0.11,
            transparent: true,
            opacity: 0.30,
            depthWrite: false
        });
        const planet2Points = new THREE.Points(p2Geom, p2PointsMat);
        planet2Points.renderOrder = 2;
        this.planet2Group.add(planet2Points);

        const ringGeom = new THREE.TorusGeometry(4.25, 0.013, 16, 120);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x47dbff,
            transparent: true,
            opacity: 0.16
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.renderOrder = 2;
        ring.rotation.x = Math.PI / 2.25;
        ring.rotation.y = Math.PI / 7;
        this.planet2Group.add(ring);

        const createSatellite = (size, color, orbitRadius, speed, shape = 'octahedron') => {
            let geom;
            if (shape === 'box') geom = new THREE.BoxGeometry(size, size, size);
            else if (shape === 'tetrahedron') geom = new THREE.TetrahedronGeometry(size);
            else geom = new THREE.OctahedronGeometry(size);

            const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.28 });
            const mesh = new THREE.Mesh(geom, mat);

            const pivot = new THREE.Group();
            pivot.rotation.x = Math.random() * Math.PI;
            pivot.rotation.y = Math.random() * Math.PI;
            mesh.position.x = orbitRadius;
            pivot.add(mesh);
            return { pivot, mesh, speed };
        };

        this.satellites.push(createSatellite(0.22, 0x54dfff, 7.4, 0.26, 'octahedron'));
        this.satellites.push(createSatellite(0.18, 0xc7e6ff, 8.15, 0.36, 'box'));
        this.planet1Group.add(this.satellites[0].pivot);
        this.planet1Group.add(this.satellites[1].pivot);

        this.satellites.push(createSatellite(0.18, 0x6c8cff, 4.95, -0.18, 'tetrahedron'));
        this.planet2Group.add(this.satellites[2].pivot);
    }

    setupTradingPlanet() {
        this.tradingPlanetGroup = new THREE.Group();
        // Keep to right-mid background so it complements rocket side without stealing focus.
        this.tradingPlanetGroup.position.set(8.6, -2.4, -23.5);
        this.group.add(this.tradingPlanetGroup);

        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(2.4, 40, 40),
            new THREE.MeshStandardMaterial({
                color: 0x0f1f34,
                metalness: 0.55,
                roughness: 0.46,
                emissive: 0x0b2947,
                emissiveIntensity: 0.55
            })
        );
        sphere.renderOrder = 2;
        this.tradingPlanetGroup.add(sphere);
        this.tradingPlanet = sphere;

        // Equatorial flow ring.
        const tradeRing = new THREE.Mesh(
            new THREE.TorusGeometry(3.2, 0.022, 12, 180),
            new THREE.MeshBasicMaterial({
                color: 0x58dfff,
                transparent: true,
                opacity: 0.24
            })
        );
        tradeRing.rotation.x = Math.PI / 2.3;
        tradeRing.rotation.y = Math.PI / 5.5;
        tradeRing.renderOrder = 2;
        this.tradingPlanetGroup.add(tradeRing);
        this.tradeRing = tradeRing;

        // Candlestick belt.
        this.candleOrbit = new THREE.Group();
        this.tradingPlanetGroup.add(this.candleOrbit);
        this.candles = [];

        const candleCount = 24;
        for (let i = 0; i < candleCount; i++) {
            const up = Math.random() > 0.45;
            const bodyH = 0.18 + Math.random() * 0.36;
            const bodyW = 0.07 + Math.random() * 0.03;
            const bodyD = 0.05;

            const candle = new THREE.Group();
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(bodyW, bodyH, bodyD),
                new THREE.MeshBasicMaterial({
                    color: up ? 0x32ff8f : 0xff5c7a,
                    transparent: true,
                    opacity: 0.86
                })
            );

            const wick = new THREE.Mesh(
                new THREE.CylinderGeometry(0.008, 0.008, bodyH * (1.3 + Math.random() * 0.7), 6),
                new THREE.MeshBasicMaterial({
                    color: 0xd3e8ff,
                    transparent: true,
                    opacity: 0.74
                })
            );
            wick.position.y = bodyH * 0.35;

            candle.add(body);
            candle.add(wick);

            const angle = (i / candleCount) * Math.PI * 2;
            const radius = 3.75 + Math.sin(i * 0.9) * 0.25;
            candle.position.set(Math.cos(angle) * radius, Math.sin(i * 0.6) * 0.35, Math.sin(angle) * radius);
            candle.lookAt(0, 0, 0);
            candle.rotateX(Math.PI / 2);
            candle.rotateZ((Math.random() - 0.5) * 0.2);

            this.candleOrbit.add(candle);
            this.candles.push({
                group: candle,
                body,
                wick,
                baseH: bodyH,
                up,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    setupConstellations() {
        const constGroup = new THREE.Group();
        const material = new THREE.LineBasicMaterial({ color: 0x9ec5ff, transparent: true, opacity: 0.038 });

        const createShape = (points, position, scale) => {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            line.position.copy(position);
            line.scale.setScalar(scale);
            line.renderOrder = 0;

            const ptsMat = new THREE.PointsMaterial({ color: 0xc5e0ff, size: 1.9, transparent: true, opacity: 0.09 });
            const pts = new THREE.Points(geometry, ptsMat);
            line.add(pts);
            return line;
        };

        const bracePoints = [
            new THREE.Vector3(1, 1, 0),
            new THREE.Vector3(0.5, 1, 0),
            new THREE.Vector3(0.5, 0.2, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.5, -0.2, 0),
            new THREE.Vector3(0.5, -1, 0),
            new THREE.Vector3(1, -1, 0)
        ];
        const rBracePoints = bracePoints.map((p) => new THREE.Vector3(-p.x, p.y, p.z));

        const leftAngle = [
            new THREE.Vector3(1, 1, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(1, -1, 0)
        ];
        const rightAngle = [
            new THREE.Vector3(-1, 1, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(-1, -1, 0)
        ];

        const leftParen = [];
        const rightParen = [];
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const y = 1 - 2 * t;
            const x = Math.sqrt(1 - y * y) * -0.5;
            leftParen.push(new THREE.Vector3(x + 0.5, y, 0));
            rightParen.push(new THREE.Vector3(-x - 0.5, y, 0));
        }

        constGroup.add(createShape(bracePoints, new THREE.Vector3(-8, -14, -66), 4.4));
        constGroup.add(createShape(rBracePoints, new THREE.Vector3(-1, -14, -66), 4.4));
        constGroup.add(createShape(leftAngle, new THREE.Vector3(18, 13, -72), 4.7));
        constGroup.add(createShape(rightAngle, new THREE.Vector3(25, 13, -72), 4.7));
        constGroup.add(createShape(leftParen, new THREE.Vector3(-22, -9, -70), 4.8));
        constGroup.add(createShape(rightParen, new THREE.Vector3(-15, -9, -70), 4.8));

        this.constellationGroup = constGroup;
        this.group.add(this.constellationGroup);
    }

    setupAsteroids() {
        this.asteroids = [];
        this.asteroidGroup = new THREE.Group();

        const materials = [
            new THREE.MeshStandardMaterial({ color: 0x202433, roughness: 0.9, flatShading: true }),
            new THREE.MeshStandardMaterial({ color: 0x151c2c, roughness: 0.85, flatShading: true })
        ];

        for (let i = 0; i < 10; i++) {
            const size = 0.08 + Math.random() * 0.35;
            const geom = new THREE.IcosahedronGeometry(size, 0);
            const mat = materials[Math.floor(Math.random() * materials.length)];
            const mesh = new THREE.Mesh(geom, mat);

            mesh.position.set(
                (Math.random() - 0.5) * 52,
                (Math.random() - 0.5) * 58,
                -46 - Math.random() * 45
            );
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

            const driftSpeed = (Math.random() * 0.35 + 0.2) * (Math.random() > 0.5 ? 1 : -1);
            const rotSpeed = Math.random() * 0.12;
            this.asteroidGroup.add(mesh);
            this.asteroids.push({ mesh, driftSpeed, rotSpeed });
        }

        this.group.add(this.asteroidGroup);
    }

    update(dt, elapsedTime) {
        this.circuitMaterial.uniforms.time.value = elapsedTime;

        this.planet1Group.rotation.y += dt * 0.017;
        this.planet2Group.rotation.y -= dt * 0.045;
        this.planet2Group.rotation.x += dt * 0.008;

        const pulse = (Math.sin(elapsedTime * 1.2) * 0.5 + 0.5) * 0.2 + 0.12;
        this.planet2Group.children[1].material.opacity = pulse + 0.16;

        if (this.constellationGroup) {
            this.constellationGroup.rotation.y = Math.sin(elapsedTime * 0.03) * 0.04;
            const lineOpacity = 0.024 + (Math.sin(elapsedTime * 0.42) * 0.5 + 0.5) * 0.014;
            this.constellationGroup.children.forEach((shape) => {
                shape.material.opacity = lineOpacity;
                if (shape.children[0]?.material) {
                    shape.children[0].material.opacity = lineOpacity * 1.8;
                }
            });
        }

        this.satellites.forEach((sat) => {
            sat.pivot.rotation.y += dt * sat.speed;
            sat.mesh.rotation.x += dt * 0.35;
            sat.mesh.rotation.y += dt * 0.35;
        });

        // Market data pulse routing around primary tech planet.
        this.marketFlowTracks.forEach((track, idx) => {
            const localSpeed = track.speed + idx * 0.03;
            const pulseScale = 0.85 + (Math.sin(elapsedTime * 1.2 + idx) * 0.5 + 0.5) * 0.45;
            track.ring.material.opacity = 0.095 + pulseScale * 0.05;

            track.pulses.forEach((pulseObj) => {
                const t = elapsedTime * localSpeed + track.phase + pulseObj.offset;
                const x = Math.cos(t) * track.radius;
                const z = Math.sin(t) * track.radius;
                pulseObj.mesh.position.set(x, 0, z);
                pulseObj.mesh.quaternion.copy(track.ring.quaternion);
                pulseObj.mesh.position.applyQuaternion(track.ring.quaternion);
                const glow = 0.35 + (Math.sin(t * 2.8) * 0.5 + 0.5) * 0.55;
                pulseObj.mesh.scale.setScalar(0.65 + glow * 0.65);
                pulseObj.mesh.material.opacity = 0.35 + glow * 0.45;
            });
        });

        if (this.tradingPlanetGroup) {
            this.tradingPlanetGroup.rotation.y += dt * 0.05;
            this.tradingPlanetGroup.rotation.x = Math.sin(elapsedTime * 0.2) * 0.08;
            this.candleOrbit.rotation.y += dt * 0.42;
            this.tradeRing.material.opacity = 0.17 + (Math.sin(elapsedTime * 1.1) * 0.5 + 0.5) * 0.11;

            this.candles.forEach((entry, idx) => {
                const vol = Math.sin(elapsedTime * (1.1 + idx * 0.02) + entry.phase) * 0.5 + 0.5;
                const h = entry.baseH * (0.75 + vol * 0.75);
                entry.body.scale.y = h / entry.baseH;
                entry.body.material.opacity = 0.66 + vol * 0.28;
                entry.wick.scale.y = 0.9 + vol * 0.8;
                // Tiny shimmer to suggest live market ticks.
                entry.group.rotation.z = Math.sin(elapsedTime * 2.0 + entry.phase) * 0.03;
            });
        }

        this.asteroids.forEach((ast) => {
            ast.mesh.position.y += ast.driftSpeed * dt;
            ast.mesh.rotation.x += ast.rotSpeed * dt;
            ast.mesh.rotation.y += ast.rotSpeed * dt;
            if (ast.mesh.position.y > 34) ast.mesh.position.y = -34;
            if (ast.mesh.position.y < -34) ast.mesh.position.y = 34;
        });
    }
}
