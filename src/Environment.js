import * as THREE from 'three';

function createNebulaTexture(colorA, colorB) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.05, size * 0.5, size * 0.5, size * 0.5);
    grad.addColorStop(0, colorA);
    grad.addColorStop(0.5, colorB);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 180; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 1 + Math.random() * 3.8;
        ctx.fillStyle = `rgba(120,185,255,${0.02 + Math.random() * 0.06})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

export function createEnvironment(scene) {
    const group = new THREE.Group();

    const texA = createNebulaTexture('rgba(70,140,255,0.35)', 'rgba(30,60,140,0.16)');
    const texB = createNebulaTexture('rgba(120,180,255,0.22)', 'rgba(20,40,110,0.12)');

    const spriteA = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map: texA,
            color: 0x8acfff,
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    spriteA.position.set(-8, 4, -36);
    spriteA.scale.set(46, 30, 1);

    const spriteB = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map: texB,
            color: 0x7bc6ff,
            transparent: true,
            opacity: 0.18,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    spriteB.position.set(10, -6, -44);
    spriteB.scale.set(52, 34, 1);

    group.add(spriteA, spriteB);
    scene.add(group);

    let time = 0;

    function update(delta) {
        time += delta;
        spriteA.material.opacity = 0.18 + (Math.sin(time * 0.13) * 0.5 + 0.5) * 0.08;
        spriteB.material.opacity = 0.14 + (Math.cos(time * 0.11) * 0.5 + 0.5) * 0.07;
        spriteA.position.x = -8 + Math.sin(time * 0.03) * 1.4;
        spriteB.position.x = 10 + Math.cos(time * 0.025) * 1.2;
    }

    return { group, update };
}
