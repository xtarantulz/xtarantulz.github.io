import { CONFIG } from './config.js';
import { canMoveTo } from './collision.js';
import { addTrack } from './effects.js';
import { isTankOnForest } from './map.js';
import { events } from './events.js';

const PLAYER_SIZE = 14;
const RESPAWN_INVULNERABILITY = 3000;
const CORNER_ASSIST_PX = 4;

let player = null;
let playerOnForest = false;

export function createPlayer(keepRank = false) {
    const prevRank = keepRank && player ? player.rank : 1;

    if (player?.isMoving) {
        events.emit('player:stop');
    }

    if (playerOnForest) {
        playerOnForest = false;
        events.emit('player:forest', false);
    }

    player = {
        x: CONFIG.canvas.width / 2 + 16,
        y: CONFIG.canvas.height - PLAYER_SIZE,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        direction: 'up',
        speed: CONFIG.player.speed + (prevRank - 1) * 0.15,
        rank: prevRank,
        isMoving: false,
        invulnerable: false,
        invulnerabilityTime: 0
    };

    return player;
}

export function getPlayer() {
    return player;
}

export function upgradePlayerRank() {
    if (!player) return 1;

    if (player.rank < 4) {
        player.rank++;
        player.speed = CONFIG.player.speed + (player.rank - 1) * 0.15;
    }

    return player.rank;
}

export function activatePlayerRespawn() {
    if (!player) return;

    player.invulnerable = true;
    player.invulnerabilityTime = RESPAWN_INVULNERABILITY;
}

export function updatePlayer(deltaTime) {
    if (!player?.invulnerable) return;

    player.invulnerabilityTime -= deltaTime;

    if (player.invulnerabilityTime <= 0) {
        player.invulnerabilityTime = 0;
        player.invulnerable = false;
    }
}

export function movePlayer(direction, deltaTime, enemies = []) {
    if (!player || !direction) return;

    player.direction = direction;

    const distance = player.speed * (deltaTime / 16.67);
    const resolved = resolvePlayerStep(direction, distance, enemies);

    if (!resolved) {
        stopPlayer();
        return;
    }

    player.x = resolved.x;
    player.y = resolved.y;

    if (!player.isMoving) {
        player.isMoving = true;
        events.emit('player:move');
    }

    updateForestState();

    addTrack(
        player.x + player.width / 2,
        player.y + player.height / 2,
        player.direction
    );
}

function resolvePlayerStep(direction, distance, enemies) {
    const step = getStepVector(direction, distance);
    const directX = player.x + step.dx;
    const directY = player.y + step.dy;

    if (isFreeForPlayer(directX, directY, enemies)) {
        return { x: directX, y: directY };
    }

    // М'яке огинання кутів перешкод (Corner Assist)
    const isVertical = direction === 'up' || direction === 'down';
    const offsets = [1, -1, 2, -2, 3, -3, 4, -4];

    for (const offset of offsets) {
        if (Math.abs(offset) > CORNER_ASSIST_PX) continue;

        const testX = isVertical ? player.x + offset : directX;
        const testY = isVertical ? directY : player.y + offset;

        if (isFreeForPlayer(testX, testY, enemies)) {
            return { x: testX, y: testY };
        }
    }

    // Якщо повний крок заблоковано, під'їжджаємо впритул до перешкоди
    const halfStep = getStepVector(direction, distance * 0.4);
    if (isFreeForPlayer(player.x + halfStep.dx, player.y + halfStep.dy, enemies)) {
        return { x: player.x + halfStep.dx, y: player.y + halfStep.dy };
    }

    return null;
}

function getStepVector(direction, distance) {
    switch (direction) {
        case 'up':
            return { dx: 0, dy: -distance };
        case 'down':
            return { dx: 0, dy: distance };
        case 'left':
            return { dx: -distance, dy: 0 };
        case 'right':
            return { dx: distance, dy: 0 };
        default:
            return { dx: 0, dy: 0 };
    }
}

function isFreeForPlayer(nextX, nextY, enemies) {
    if (!canMoveTo(nextX, nextY, player.width, player.height)) {
        return false;
    }

    return !hasEnemyCollision(nextX, nextY, enemies);
}

function updateForestState() {
    const onForest = isTankOnForest(player);

    if (playerOnForest === onForest) return;

    playerOnForest = onForest;

    events.emit('player:forest', onForest);
}

function hasEnemyCollision(nextX, nextY, enemies) {
    const curCenterX = player.x + player.width / 2;
    const curCenterY = player.y + player.height / 2;
    const nextCenterX = nextX + player.width / 2;
    const nextCenterY = nextY + player.height / 2;

    return enemies.some(enemy => {
        const overlapsNext = (
            nextX < enemy.x + enemy.width &&
            nextX + player.width > enemy.x &&
            nextY < enemy.y + enemy.height &&
            nextY + player.height > enemy.y
        );

        if (!overlapsNext) return false;

        // Якщо танки вже зчепилися кутами — дозволяємо рух у бік роз'їзду
        const alreadyOverlapping = (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        );

        if (alreadyOverlapping) {
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const curDist = Math.hypot(curCenterX - enemyCenterX, curCenterY - enemyCenterY);
            const nextDist = Math.hypot(nextCenterX - enemyCenterX, nextCenterY - enemyCenterY);

            if (nextDist > curDist) {
                return false;
            }
        }

        return true;
    });
}

export function stopPlayer() {
    if (!player || !player.isMoving) return;

    player.isMoving = false;
    events.emit('player:stop');

    if (playerOnForest) {
        playerOnForest = false;
        events.emit('player:forest', false);
    }
}

export function drawPlayer(ctx, timestamp = 0) {
    if (!player) return;

    const {
        x,
        y,
        width,
        height,
        direction,
        isMoving,
        invulnerable,
        rank = 1
    } = player;

    ctx.save();

    if (invulnerable && Math.floor(timestamp / 120) % 2 === 0) {
        ctx.restore();
        return;
    }

    ctx.translate(x + width / 2, y + height / 2);

    const rotations = {
        up: 0,
        right: Math.PI / 2,
        down: Math.PI,
        left: -Math.PI / 2
    };

    ctx.rotate(rotations[direction]);

    // Тінь під танком
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(-6.5, -5.5, 14, 13, 2);
    ctx.fill();

    // Гусениці
    ctx.fillStyle = '#1f2328';
    ctx.beginPath();
    ctx.roundRect(-7, -6.5, 3.2, 13, 1);
    ctx.roundRect(3.8, -6.5, 3.2, 13, 1);
    ctx.fill();

    // Анімація траків гусениць
    const trackOffset = isMoving ? Math.floor(timestamp / 60) % 3 : 0;

    ctx.fillStyle = rank >= 3 ? '#ffd43b' : '#6e7681';

    for (let ty = -5 + trackOffset; ty <= 5; ty += 3) {
        ctx.fillRect(-6.5, ty, 2.2, 1.2);
        ctx.fillRect(4.3, ty, 2.2, 1.2);
    }

    // Бронекорпус
    const bodyGrad = ctx.createLinearGradient(-4.5, -6, 4.5, 6);
    if (rank >= 4) {
        bodyGrad.addColorStop(0, '#fff9db');
        bodyGrad.addColorStop(0.5, '#ffd43b');
        bodyGrad.addColorStop(1, '#e67700');
    } else {
        bodyGrad.addColorStop(0, '#ffe066');
        bodyGrad.addColorStop(0.5, '#f5b800');
        bodyGrad.addColorStop(1, '#b37d00');
    }

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-4.5, -5.5, 9, 11, 1.5);
    ctx.fill();

    ctx.strokeStyle = '#664400';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Передні фари
    ctx.fillStyle = '#fff9c4';
    ctx.fillRect(-3.5, -6, 1.6, 1);
    ctx.fillRect(1.9, -6, 1.6, 1);

    // Ствол гармати
    const barrelWidth = rank >= 3 ? 2.8 : 2.2;
    const barrelGrad = ctx.createLinearGradient(-1.5, 0, 1.5, 0);
    barrelGrad.addColorStop(0, '#7a828e');
    barrelGrad.addColorStop(0.5, '#e6edf3');
    barrelGrad.addColorStop(1, '#57606a');

    ctx.fillStyle = barrelGrad;
    ctx.fillRect(-barrelWidth / 2, -8.8, barrelWidth, 6.3);

    // Дульне гальмо
    ctx.fillStyle = rank >= 4 ? '#ffd43b' : '#30363d';
    ctx.fillRect(-1.7, -9.2, 3.4, 1.6);

    // Башта
    const turretGrad = ctx.createRadialGradient(-1, -1, 0.5, 0, 0, 4.5);
    turretGrad.addColorStop(0, '#fff099');
    turretGrad.addColorStop(0.7, '#f5b800');
    turretGrad.addColorStop(1, '#996b00');

    ctx.fillStyle = turretGrad;
    ctx.beginPath();
    ctx.roundRect(-3.2, -3, 6.4, 6.4, 2);
    ctx.fill();
    ctx.stroke();

    // Індикатори рангу (смужки на кормі)
    ctx.fillStyle = '#ffffff';
    for (let r = 0; r < rank - 1; r++) {
        ctx.fillRect(-3 + r * 2.2, 4, 1.5, 1.2);
    }

    // Командирський люк
    ctx.fillStyle = '#d49b00';
    ctx.beginPath();
    ctx.arc(0.6, 0.6, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}
