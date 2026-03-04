import * as THREE from 'three';

export class Rocket {
    constructor() {
        this.group = new THREE.Group();

        // Materials
        const silverMat = new THREE.MeshStandardMaterial({
            color: 0xe0e0e0,
            metalness: 0.8,
            roughness: 0.35,
        });

        const redMat = new THREE.MeshStandardMaterial({
            color: 0xcc1111,
            metalness: 0.2,
            roughness: 0.4,
        });

        const darkBlueGlassMat = new THREE.MeshPhysicalMaterial({
            color: 0x05102a,
            metalness: 0.9,
            roughness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
        });

        const darkMetalMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.7,
            roughness: 0.6,
        });

        // 1. Body (Silver Cylinder)
        const bodyGeom = new THREE.CylinderGeometry(0.8, 0.8, 3, 32);
        const body = new THREE.Mesh(bodyGeom, silverMat);
        this.group.add(body);

        // Panel seams (Rivets simulation via Torus rings)
        const seamGeom = new THREE.TorusGeometry(0.805, 0.02, 8, 32);
        const seam1 = new THREE.Mesh(seamGeom, darkMetalMat);
        seam1.position.y = 1.0;
        seam1.rotation.x = Math.PI / 2;
        this.group.add(seam1);

        const seam2 = seam1.clone();
        seam2.position.y = -1.0;
        this.group.add(seam2);

        const seam3 = seam1.clone();
        seam3.position.y = 0.0;
        this.group.add(seam3);

        // 2. Nose Cone (Red, smoothed)
        const noseGeom = new THREE.SphereGeometry(0.8, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const nose = new THREE.Mesh(noseGeom, redMat);
        nose.scale.set(1, 1.8, 1);
        nose.position.y = 1.5;
        this.group.add(nose);

        // 3. Window (Blue glass with Red ring)
        const windowGroup = new THREE.Group();
        windowGroup.position.set(0, 0.5, 0.75);

        const ringGeom = new THREE.TorusGeometry(0.35, 0.08, 16, 32);
        const ring = new THREE.Mesh(ringGeom, redMat);
        windowGroup.add(ring);

        const glassGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.1, 32);
        const glass = new THREE.Mesh(glassGeom, darkBlueGlassMat);
        glass.rotation.x = Math.PI / 2;
        windowGroup.add(glass);

        this.group.add(windowGroup);

        // 4. Fins (Three curved red fins, projecting outwards)
        const finShape = new THREE.Shape();
        finShape.moveTo(0.75, 0.2); // Attached to body top (radius is 0.8)
        finShape.lineTo(1.6, -0.6); // Outer sweep down
        finShape.lineTo(1.6, -1.8); // Straight down edge
        finShape.lineTo(0.75, -1.2); // Back to base

        const extrudeSettings = {
            depth: 0.08,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 2,
            bevelSize: 0.02,
            bevelThickness: 0.02
        };
        const finGeom = new THREE.ExtrudeGeometry(finShape, extrudeSettings);
        finGeom.translate(0, 0, -0.04); // Center the depth along Z-axis

        for (let i = 0; i < 3; i++) {
            const fin = new THREE.Mesh(finGeom, redMat);
            const angle = (i / 3) * Math.PI * 2;
            fin.rotation.y = angle; // Rotate around the main cylinder's Y axis perfectly
            this.group.add(fin);
        }

        // 5. Engine Nozzle
        const nozzleGeom = new THREE.CylinderGeometry(0.5, 0.7, 0.5, 32);
        const nozzle = new THREE.Mesh(nozzleGeom, darkMetalMat);
        nozzle.position.y = -1.75;
        this.group.add(nozzle);

        // 6. Constant Engine Flame (Jagged Cartoon Layers)
        this.flameGroup = new THREE.Group();
        this.flameGroup.position.y = -2.2;
        this.group.add(this.flameGroup);

        const createFlameLayer = (color, scale, yOffset) => {
            const group = new THREE.Group();
            const shape = new THREE.Shape();
            // Jagged teardrop fire
            shape.moveTo(0, 0);
            shape.quadraticCurveTo(0.6, 0.5, 0.8, 1.2);
            shape.lineTo(0.5, 1.5);
            shape.quadraticCurveTo(0.9, 2.2, 0.2, 3.2);
            shape.lineTo(0.1, 2.6);
            shape.quadraticCurveTo(0, 3.8, -0.1, 4.0);
            shape.quadraticCurveTo(-0.4, 2.8, -0.3, 2.4);
            shape.quadraticCurveTo(-0.8, 2.0, -0.6, 1.3);
            shape.lineTo(-0.4, 1.4);
            shape.quadraticCurveTo(-0.6, 0.6, 0, 0);

            const geom = new THREE.ShapeGeometry(shape);
            geom.center();
            geom.rotateZ(Math.PI); // Point it downwards

            const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

            // X layers crossed for 3D visibility
            const mesh1 = new THREE.Mesh(geom, mat);
            const mesh2 = new THREE.Mesh(geom, mat);
            mesh2.rotation.y = Math.PI / 2;

            group.add(mesh1, mesh2);
            group.scale.setScalar(scale);
            group.position.y = yOffset;
            return group;
        };

        this.flameOuter = createFlameLayer(0xff2200, 0.6, -0.6); // Red base
        this.flameMid = createFlameLayer(0xffaa00, 0.45, -0.2);  // Orange middle
        this.flameCore = createFlameLayer(0xffffff, 0.3, 0.2);   // Yellow-white core

        this.flameGroup.add(this.flameOuter, this.flameMid, this.flameCore);

        // point light bloom for the fire
        const flameLight = new THREE.PointLight(0xffaa00, 4, 15);
        flameLight.position.y = -2;
        this.flameGroup.add(flameLight);

        // Initial orientation
        this.group.scale.set(0.6, 0.6, 0.6);
        this.group.rotation.x = Math.PI / 8;
        this.group.rotation.y = -Math.PI / 6;
    }

    update(time) {
        // Flame animation (pulsing)
        const pulse = Math.sin(time * 20) * 0.05 + Math.sin(time * 30) * 0.02;
        this.flameCore.scale.setScalar(0.3 * (1 + pulse));
        this.flameMid.scale.setScalar(0.45 * (1 + pulse * 1.5));
        this.flameOuter.scale.setScalar(0.6 * (1 + pulse * 2));

        // Smooth idle hover animation (drift & tilt)
        // Gentle floating up and down
        this.group.position.y = Math.sin(time * 1.2) * 0.2;
        // Slight side-to-side drift
        this.group.position.x = Math.cos(time * 0.8) * 0.15;

        // Small tilt rotations to avoid rigid stillness (approx ±5° to ±10°)
        this.group.rotation.x = (Math.PI / 8) + Math.sin(time * 1.5) * 0.1;
        this.group.rotation.y = (-Math.PI / 6) + Math.cos(time * 1.1) * 0.15;
        this.group.rotation.z = Math.sin(time * 1.8) * 0.08;
    }
}
