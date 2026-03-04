import * as THREE from 'three';

export class ParticleSystem {
    constructor() {
        this.streaks = [];
        this.sparks = [];
        this.maxStreaks = 32;
        this.maxSparks = 42;

        this.streakGeom = new THREE.CylinderGeometry(0.003, 0.003, 1.0, 6);
        this.streakMat = new THREE.MeshBasicMaterial({
            color: 0xcfe9ff,
            transparent: true,
            opacity: 0.14,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.sparkGeom = new THREE.CylinderGeometry(0.012, 0.003, 0.22, 6);
        this.sparkMat = new THREE.MeshBasicMaterial({
            color: 0xffb260,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }

    emitStreak(rocketGroup) {
        if (this.streaks.length >= this.maxStreaks) return;
        const particle = new THREE.Mesh(this.streakGeom, this.streakMat.clone());

        // Spawn near nose/front hemisphere and move backward in rocket local axis.
        const side = (Math.random() - 0.5) * 2.2;
        const depth = (Math.random() - 0.5) * 1.6;
        particle.position.set(side, 3.8 + Math.random() * 2.8, depth);
        particle.scale.y = 1.8 + Math.random() * 2.3;

        // Align streak with rocket's travel axis (local Y), with only slight angular jitter.
        particle.rotation.y = (Math.random() - 0.5) * 0.08;
        particle.rotation.x = (Math.random() - 0.5) * 0.08;

        particle.userData = {
            life: 1.0,
            speedY: 8.5 + Math.random() * 3.0,
            maxOpacity: 0.045 + Math.random() * 0.05
        };

        rocketGroup.add(particle);
        this.streaks.push(particle);
    }

    emitSpark(rocketGroup) {
        if (this.sparks.length >= this.maxSparks) return;
        const particle = new THREE.Mesh(this.sparkGeom, this.sparkMat.clone());
        const offsetX = (Math.random() - 0.5) * 0.2;
        const offsetZ = (Math.random() - 0.5) * 0.2;
        particle.position.set(offsetX, -2.1 - Math.random() * 0.38, offsetZ);

        particle.userData = {
            life: 1.0,
            speedY: 2.5 + Math.random() * 1.5,
            speedX: (Math.random() - 0.5) * 0.65,
            speedZ: (Math.random() - 0.5) * 0.65,
            rotSpeed: (Math.random() - 0.5) * 3
        };

        const colors = [0xffcc7a, 0xff8d35, 0xfff2c2];
        particle.material.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
        particle.scale.setScalar(0.34 + Math.random() * 0.16);

        rocketGroup.add(particle);
        this.sparks.push(particle);
    }

    update(dt, rocketGroup, intensity = 1) {
        // Lower streak density for cleaner cinematic motion.
        if (Math.random() > 1 - (0.028 * intensity)) {
            this.emitStreak(rocketGroup);
        }

        // Fewer physical sparks with better trajectories.
        if (Math.random() > 1 - (0.14 * intensity)) {
            this.emitSpark(rocketGroup);
        }

        for (let i = this.streaks.length - 1; i >= 0; i--) {
            const p = this.streaks[i];
            p.position.y -= p.userData.speedY * dt;
            p.userData.life -= dt * 0.92;
            p.material.opacity = p.userData.life * p.userData.maxOpacity;
            p.scale.y *= 0.995;

            if (p.position.y < -8 || p.userData.life <= 0) {
                rocketGroup.remove(p);
                this.streaks.splice(i, 1);
            }
        }

        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const p = this.sparks[i];

            p.position.y -= p.userData.speedY * dt;
            p.position.x += p.userData.speedX * dt;
            p.position.z += p.userData.speedZ * dt;

            p.rotation.y += p.userData.rotSpeed * dt;
            p.rotation.x += p.userData.rotSpeed * 0.6 * dt;

            p.userData.speedX *= 0.986;
            p.userData.speedZ *= 0.986;
            p.userData.life -= dt * 1.18;
            p.material.opacity = p.userData.life * 0.42;

            // Stretch sparks as they move to mimic short motion trails.
            p.scale.y += dt * 0.18;
            p.scale.x *= 0.992;
            p.scale.z *= 0.992;

            if (p.userData.life <= 0) {
                rocketGroup.remove(p);
                this.sparks.splice(i, 1);
            }
        }
    }
}
