
import { CONFIG } from './config.js';
import { canMoveTo } from './collision.js';
import { addTrack } from './effects.js';
import { isTankOnForest } from './map.js';
import { events } from './events.js';

const PLAYER_SIZE = 14;

let player = null;
let playerOnForest = false;

export function createPlayer() {
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
        speed: CONFIG.player.speed,
        isMoving: false
    };

    return player;
}

export function getPlayer() {
    return player;
}

export function movePlayer(direction, deltaTime, enemies = []) {
    if (!player || !direction) return;

    player.direction = direction;

    const distance = player.speed * (deltaTime / 16.67);

    let nextX = player.x;
    let nextY = player.y;

    switch (direction) {
        case 'up':
            nextY -= distance;
            break;

        case 'down':
            nextY += distance;
            break;

        case 'left':
            nextX -= distance;
            break;

        case 'right':
            nextX += distance;
            break;
    }

    if (!canMoveTo(nextX, nextY, player.width, player.height)) {
        stopPlayer();
        return;
    }

    if (hasEnemyCollision(nextX, nextY, enemies)) {
        stopPlayer();
        return;
    }

    player.x = nextX;
    player.y = nextY;

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

function updateForestState() {
    const onForest = isTankOnForest(player);

    if (playerOnForest === onForest) return;

    playerOnForest = onForest;

    events.emit('player:forest', onForest);
}

function hasEnemyCollision(x, y, enemies) {
    return enemies.some(enemy => (
        x < enemy.x + enemy.width &&
        x + player.width > enemy.x &&
        y < enemy.y + enemy.height &&
        y + player.height > enemy.y
    ));
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

    const { x, y, width, height, direction, isMoving } = player;

    ctx.save();
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

    ctx.fillStyle = '#6e7681';

    for (let ty = -5 + trackOffset; ty <= 5; ty += 3) {
        ctx.fillRect(-6.5, ty, 2.2, 1.2);
        ctx.fillRect(4.3, ty, 2.2, 1.2);
    }

    // Бронекорпус
    const bodyGrad = ctx.createLinearGradient(-4.5, -6, 4.5, 6);
    bodyGrad.addColorStop(0, '#ffe066');
    bodyGrad.addColorStop(0.5, '#f5b800');
    bodyGrad.addColorStop(1, '#b37d00');

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
    const barrelGrad = ctx.createLinearGradient(-1.5, 0, 1.5, 0);
    barrelGrad.addColorStop(0, '#7a828e');
    barrelGrad.addColorStop(0.5, '#e6edf3');
    barrelGrad.addColorStop(1, '#57606a');

    ctx.fillStyle = barrelGrad;
    ctx.fillRect(-1.1, -8.5, 2.2, 6);

    // Дульне гальмо
    ctx.fillStyle = '#30363d';
    ctx.fillRect(-1.5, -9, 3, 1.5);

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

    // Командирський люк
    ctx.fillStyle = '#d49b00';
    ctx.beginPath();
    ctx.arc(0.6, 0.6, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}
