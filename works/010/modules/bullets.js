
import { CONFIG } from './config.js';
import { getPlayer } from './player.js';
import { getBulletCollision } from './collision.js';
import {
    TILE,
    destroyBrickAt
} from './map.js';
import {
    createMuzzleFlash,
    createHitParticles
} from './effects.js';
import { createExplosion } from './explosions.js';
import { events } from './events.js';

const BULLET_SIZE = 6;

let bullets = [];

export function fireBullet() {
    const player = getPlayer();

    if (!player) {
        return;
    }

    const playerBullets = bullets.filter(
        bullet => bullet.owner === 'player'
    );

    if (playerBullets.length >= CONFIG.bullets.maxPerPlayer) {
        return;
    }

    createBullet(player, 'player');

    events.emit('player:shoot');
}

export function fireEnemyBullet(enemy) {
    if (!enemy) {
        return;
    }

    const enemyBullets = bullets.filter(
        bullet => bullet.owner === 'enemy' && bullet.shooter === enemy
    );

    if (enemyBullets.length >= CONFIG.bullets.enemyMax) {
        return;
    }

    createBullet(enemy, 'enemy');
}

function createBullet(tank, owner) {
    const centerX = tank.x + tank.width / 2;
    const centerY = tank.y + tank.height / 2;

    const bullet = {
        x: centerX - BULLET_SIZE / 2,
        y: centerY - BULLET_SIZE / 2,
        width: BULLET_SIZE,
        height: BULLET_SIZE,
        direction: tank.direction,
        speed: owner === 'player'
            ? CONFIG.bullets.speed
            : CONFIG.enemies.bulletSpeed,
        owner,
        shooter: tank
    };

    switch (bullet.direction) {
        case 'up':
            bullet.y = tank.y - BULLET_SIZE;
            break;

        case 'down':
            bullet.y = tank.y + tank.height;
            break;

        case 'left':
            bullet.x = tank.x - BULLET_SIZE;
            break;

        case 'right':
            bullet.x = tank.x + tank.width;
            break;
    }

    createMuzzleFlash(
        bullet.x + BULLET_SIZE / 2,
        bullet.y + BULLET_SIZE / 2,
        bullet.direction,
        owner === 'player'
    );

    bullets.push(bullet);
}

export function updateBullets(deltaTime, targets = {}) {
    const player = targets.player || null;
    const enemies = targets.enemies || [];

    const stepCount = Math.max(
        1,
        Math.ceil(deltaTime / 4)
    );

    const stepTime = deltaTime / stepCount;

    for (let step = 0; step < stepCount; step++) {
        // Переміщуємо всі кулі синхронно
        for (const bullet of [...bullets]) {
            if (bullets.includes(bullet)) {
                moveBullet(bullet, stepTime);
            }
        }

        // Перевіряємо зіткнення між кулями
        handleBulletCollisions();

        // Перевіряємо зіткнення з картою, танками та межами
        for (const bullet of [...bullets]) {
            if (!bullets.includes(bullet)) {
                continue;
            }

            if (handleMapCollision(bullet, targets)) {
                continue;
            }

            if (handleTankCollision(bullet, player, enemies, targets)) {
                continue;
            }

            if (isOutsideCanvas(bullet)) {
                removeBullet(bullet);
            }
        }
    }
}

function moveBullet(bullet, deltaTime) {
    const movement = bullet.speed * (deltaTime / (1000 / 60));

    switch (bullet.direction) {
        case 'up':
            bullet.y -= movement;
            break;

        case 'down':
            bullet.y += movement;
            break;

        case 'left':
            bullet.x -= movement;
            break;

        case 'right':
            bullet.x += movement;
            break;
    }
}

function handleBulletCollisions() {
    const removed = new Set();
    const currentBullets = [...bullets];

    for (let i = 0; i < currentBullets.length; i++) {
        const bullet = currentBullets[i];

        if (removed.has(bullet)) {
            continue;
        }

        for (let j = i + 1; j < currentBullets.length; j++) {
            const other = currentBullets[j];

            if (
                removed.has(other) ||
                bullet.owner === other.owner
            ) {
                continue;
            }

            if (!intersects(bullet, other)) {
                continue;
            }

            const hitX = (
                bullet.x + bullet.width / 2 +
                other.x + other.width / 2
            ) / 2;

            const hitY = (
                bullet.y + bullet.height / 2 +
                other.y + other.height / 2
            ) / 2;

            removed.add(bullet);
            removed.add(other);

            createExplosion(hitX, hitY);

            break;
        }
    }

    if (removed.size > 0) {
        bullets = bullets.filter(
            bullet => !removed.has(bullet)
        );
    }
}

function handleMapCollision(bullet, targets) {
    const collision = getBulletCollision(
        bullet.x,
        bullet.y,
        bullet.width,
        bullet.height
    );

    if (!collision) {
        return false;
    }

    const hitX = bullet.x + bullet.width / 2;
    const hitY = bullet.y + bullet.height / 2;

    if (collision.tile === TILE.BRICK) {
        destroyBrickAt(collision.row, collision.column);
        createHitParticles(hitX, hitY, 'brick');

        if (bullet.owner === 'player') {
            events.emit('bullet:brick-hit');
        }
    } else if (collision.tile === TILE.STEEL || collision.tile === null) {
        createHitParticles(hitX, hitY, 'spark');

        if (
            collision.tile === TILE.STEEL &&
            bullet.owner === 'player'
        ) {
            events.emit('bullet:steel-hit');
        }
    }

    if (collision.tile === TILE.HEADQUARTERS) {
        targets.onHeadquartersHit?.(bullet);
    }

    removeBullet(bullet);

    return true;
}

function handleTankCollision(bullet, player, enemies, targets) {
    if (bullet.owner === 'enemy' && player) {
        if (intersects(bullet, player)) {
            targets.onPlayerHit?.(bullet);
            removeBullet(bullet);
            return true;
        }
    }

    if (bullet.owner === 'player') {
        for (const enemy of enemies) {
            if (intersects(bullet, enemy)) {
                targets.onEnemyHit?.(enemy, bullet);
                removeBullet(bullet);
                return true;
            }
        }
    }

    return false;
}

function intersects(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function isOutsideCanvas(bullet) {
    return (
        bullet.x + bullet.width < 0 ||
        bullet.y + bullet.height < 0 ||
        bullet.x > CONFIG.canvas.width ||
        bullet.y > CONFIG.canvas.height
    );
}

function removeBullet(bullet) {
    bullets = bullets.filter(item => item !== bullet);
}

export function drawBullets(ctx) {
    bullets.forEach(bullet => {
        ctx.save();

        ctx.translate(
            bullet.x + bullet.width / 2,
            bullet.y + bullet.height / 2
        );

        const rotations = {
            up: 0,
            right: Math.PI / 2,
            down: Math.PI,
            left: -Math.PI / 2
        };

        ctx.rotate(rotations[bullet.direction]);

        const isPlayer = bullet.owner === 'player';

        // Огненный хвіст
        const trailGrad = ctx.createLinearGradient(0, -2, 0, 9);
        trailGrad.addColorStop(0, isPlayer ? 'rgba(255, 230, 100, 0.9)' : 'rgba(255, 90, 90, 0.9)');
        trailGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');

        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.moveTo(-1.8, 1);
        ctx.lineTo(1.8, 1);
        ctx.lineTo(0, 9);
        ctx.closePath();
        ctx.fill();

        // Світіння боєголовки
        ctx.shadowColor = isPlayer ? '#ffdd59' : '#ff4d4d';
        ctx.shadowBlur = 6;

        // Корпус снаряда
        ctx.fillStyle = isPlayer ? '#fff8e1' : '#ffcccc';
        ctx.beginPath();
        ctx.moveTo(0, -4.5);
        ctx.quadraticCurveTo(2.2, -1.5, 1.8, 2.5);
        ctx.lineTo(-1.8, 2.5);
        ctx.quadraticCurveTo(-2.2, -1.5, 0, -4.5);
        ctx.fill();

        ctx.restore();
    });
}

export function clearBullets() {
    bullets = [];
}
