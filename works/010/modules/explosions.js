
import { events } from './events.js';

const explosions = [];

export function createExplosion(x, y, size = 'normal') {
    const sparks = Array.from({ length: size === 'large' ? 14 : 9 }, (_, i) => ({
        angle: (Math.PI * 2 / (size === 'large' ? 14 : 9)) * i + (Math.random() - 0.5) * 0.4,
        speed: 0.7 + Math.random() * 0.6,
        size: 1.5 + Math.random() * 1.5
    }));

    explosions.push({
        x,
        y,
        age: 0,
        duration: size === 'large' ? 750 : 500,
        size: size === 'large' ? 36 : 24,
        sparks
    });

    events.emit('explosion:create', { size });
}

export function updateExplosions(deltaTime) {
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].age += deltaTime;

        if (explosions[i].age >= explosions[i].duration) {
            explosions.splice(i, 1);
        }
    }
}

export function drawExplosions(ctx) {
    explosions.forEach(explosion => {
        const progress = explosion.age / explosion.duration;
        const radius = explosion.size * (0.2 + Math.pow(progress, 0.7) * 0.8);
        const alpha = 1 - Math.pow(progress, 1.3);

        ctx.save();
        ctx.translate(explosion.x, explosion.y);

        // Клубы тёмного дыма на заднем плане
        ctx.globalAlpha = alpha * 0.65;
        ctx.fillStyle = '#2d3436';

        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i + progress;
            const dist = radius * 0.45;

            ctx.beginPath();
            ctx.arc(
                Math.cos(angle) * dist,
                Math.sin(angle) * dist,
                radius * 0.45,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // Ударная волна
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = '#ff9f43';
        ctx.lineWidth = Math.max(0.5, 2.5 * (1 - progress));

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Огненное ядро с мягким градиентом
        ctx.globalAlpha = alpha;

        const fireGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.85);

        fireGrad.addColorStop(0, '#ffffff');
        fireGrad.addColorStop(0.25, '#ffeaa7');
        fireGrad.addColorStop(0.55, '#ff7675');
        fireGrad.addColorStop(0.85, '#d63031');
        fireGrad.addColorStop(1, 'rgba(214, 48, 49, 0)');

        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Разлетающиеся искры
        ctx.fillStyle = '#ffeaa7';

        explosion.sparks.forEach(spark => {
            const distance = radius * spark.speed * (0.4 + progress * 0.9);
            const sx = Math.cos(spark.angle) * distance;
            const sy = Math.sin(spark.angle) * distance;

            ctx.beginPath();
            ctx.arc(
                sx,
                sy,
                spark.size * (1 - progress * 0.6),
                0,
                Math.PI * 2
            );
            ctx.fill();
        });

        ctx.restore();
    });
}

export function clearExplosions() {
    explosions.length = 0;
}
