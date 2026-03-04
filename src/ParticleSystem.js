import * as THREE from 'three';

export class ParticleSystem {
    constructor() {
        this.particles = [];
        // Make lines thinner, base length 1 (will be scaled randomly)
        this.geometry = new THREE.CylinderGeometry(0.002, 0.002, 1, 4);

        this.material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending
        });
    }

    emit(rocketGroup) {
        const radius = 1.0 + Math.random() * 3.0;
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 5 + Math.random() * 2;

        const particle = new THREE.Mesh(this.geometry, this.material.clone());
        particle.position.set(x, y, z);

        // Random variations in length (streak size)
        particle.scale.y = 2.0 + Math.random() * 4.0;

        rocketGroup.add(particle);

        particle.userData.life = 1.0;
        particle.userData.speed = 0.08 + Math.random() * 0.06; // Slow relative to natural movement
        particle.userData.maxOpacity = 0.05 + Math.random() * 0.1; // Subdued, varying opacity

        this.particles.push(particle);
    }

    update(dt, rocketGroup) {
        // Reduce number of streak lines by about 50%, less frequent spawning
        if (Math.random() > 0.8) {
            this.emit(rocketGroup);
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.position.y -= p.userData.speed;
            p.userData.life -= dt * 0.6;

            p.material.opacity = p.userData.life * p.userData.maxOpacity;

            if (p.position.y < -8 || p.userData.life <= 0) {
                rocketGroup.remove(p);
                this.particles.splice(i, 1);
            }
        }
    }
}
