const tracks = [];
const flashes = [];
const debris = [];

export function addTrack(x, y, direction) {
    // Не дублируем след, если танк почти не сдвинулся
    const last = tracks[tracks.length - 1];
    if (last && Math.hypot(last.x - x, last.y - y) < 3.5) {
        return;
    }

    tracks.push({
        x,
        y,
        direction,
        age: 0,
        duration: 3200
    });

    if (tracks.length > 220) {
        tracks.shift();
    }
}

export function createMuzzleFlash(x, y, direction, isPlayer = true) {
    flashes.push({
        x,
        y,
        direction,
        isPlayer,
        age: 0,
        duration: 110
    });
}

export function createHitParticles(x, y, type = 'brick') {
    const count = type === 'brick' ? 10 : 7;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (type === 'brick' ? 0.6 : 1.1) + Math.random() * 1.4;

        debris.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: type === 'brick' ? 1.8 + Math.random() * 1.8 : 1.4 + Math.random(),
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.25,
            type,
            age: 0,
            duration: type === 'brick' ? 420 : 280
        });
    }
}

export function updateEffects(deltaTime) {
    const step = deltaTime / 16.67;

    for (let i = tracks.length - 1; i >= 0; i--) {
        tracks[i].age += deltaTime;
        if (tracks[i].age >= tracks[i].duration) {
            tracks.splice(i, 1);
        }
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
        flashes[i].age += deltaTime;
        if (flashes[i].age >= flashes[i].duration) {
            flashes.splice(i, 1);
        }
    }

    for (let i = debris.length - 1; i >= 0; i--) {
        const p = debris[i];
        p.age += deltaTime;

        if (p.age >= p.duration) {
            debris.splice(i, 1);
            continue;
        }

        p.x += p.vx * step;
        p.y += p.vy * step;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.rotation += p.vRot * step;
    }
}

export function drawTracks(ctx) {
    tracks.forEach(track => {
        const alpha = (1 - track.age / track.duration) * 0.28;

        ctx.save();
        ctx.translate(track.x, track.y);

        const rotations = {
            up: 0,
            right: Math.PI / 2,
            down: Math.PI,
            left: -Math.PI / 2
        };

        ctx.rotate(rotations[track.direction] || 0);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

        // Два отпечатка гусениц
        ctx.fillRect(-6.2, -1.5, 2.6, 3);
        ctx.fillRect(3.6, -1.5, 2.6, 3);

        ctx.restore();
    });
}

export function drawForegroundEffects(ctx) {
    // 1. Вспышки от выстрелов
    flashes.forEach(flash => {
        const progress = flash.age / flash.duration;
        const alpha = 1 - progress;
        const scale = 0.6 + progress * 0.6;

        ctx.save();
        ctx.translate(flash.x, flash.y);

        const rotations = {
            up: 0,
            right: Math.PI / 2,
            down: Math.PI,
            left: -Math.PI / 2
        };

        ctx.rotate(rotations[flash.direction] || 0);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;

        // Ореол вспышки
        const grad = ctx.createRadialGradient(0, -2, 0.5, 0, -2, 8);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, flash.isPlayer ? '#ffe066' : '#ff8787');
        grad.addColorStop(1, 'rgba(255, 140, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, -2, 8, 0, Math.PI * 2);
        ctx.fill();

        // Язык пламени вперёд из дула
        ctx.fillStyle = '#fff9db';
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(2.5, -1);
        ctx.lineTo(-2.5, -1);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    });

    // 2. Осколки кирпича и искры рикошета
    debris.forEach(p => {
        const progress = p.age / p.duration;
        const alpha = 1 - progress;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;

        if (p.type === 'brick') {
            ctx.fillStyle = progress < 0.5 ? '#d96b38' : '#8c3314';
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75);
        } else {
            ctx.fillStyle = progress < 0.4 ? '#ffffff' : '#ffd43b';
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }

        ctx.restore();
    });
}

export function clearEffects() {
    tracks.length = 0;
    flashes.length = 0;
    debris.length = 0;
}
