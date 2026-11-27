import { CONFIG } from './config.js';
import { canMoveTo } from './collision.js';
import { fireEnemyBullet } from './bullets.js';
import { addTrack } from './effects.js';

const ENEMY_SIZE = CONFIG.enemies.size;

const SPAWN_POSITIONS = [
    { x: 3, y: 3 },
    { x: CONFIG.canvas.width / 2 - ENEMY_SIZE / 2, y: 3 },
    { x: CONFIG.canvas.width - ENEMY_SIZE - 3, y: 3 }
];

const DIRECTIONS = ['up', 'right', 'down', 'left'];

let enemies = [];
let spawnedCount = 0;
let spawnTimer = 0;

export function createEnemies() {
    enemies = [];
    spawnedCount = 0;
    spawnTimer = CONFIG.enemies.spawnInterval;

    spawnEnemy();
}

export function getEnemies() {
    return enemies;
}

export function updateEnemies(deltaTime) {
    if (spawnedCount < CONFIG.enemies.total) {
        spawnTimer += deltaTime;

        if (
            spawnTimer >= CONFIG.enemies.spawnInterval &&
            enemies.length < CONFIG.enemies.maxOnScreen
        ) {
            if (spawnEnemy()) {
                spawnTimer = 0;
            }
        }
    }

    enemies.forEach(enemy => {
        updateEnemy(enemy, deltaTime);
    });
}

function spawnEnemy() {
    if (
        enemies.length >= CONFIG.enemies.maxOnScreen ||
        spawnedCount >= CONFIG.enemies.total
    ) {
        return false;
    }

    const shuffledPositions = [...SPAWN_POSITIONS]
        .sort(() => Math.random() - 0.5);

    for (const position of shuffledPositions) {
        const x = position.x;
        const y = position.y;

        if (!canMoveTo(x, y, ENEMY_SIZE, ENEMY_SIZE)) continue;
        if (hasEnemyCollision(x, y)) continue;

        enemies.push({
            x,
            y,
            width: ENEMY_SIZE,
            height: ENEMY_SIZE,
            direction: 'down',
            speed: CONFIG.enemies.speed,
            turnTimer: randomTurnTime(),
            fireTimer: randomFireTime()
        });

        spawnedCount++;
        return true;
    }

    return false;
}

function updateEnemy(enemy, deltaTime) {
    enemy.turnTimer -= deltaTime;

    if (enemy.turnTimer <= 0) {
        changeDirection(enemy);
        enemy.turnTimer = randomTurnTime();
    }

    const movement = enemy.speed * (deltaTime / (1000 / 60));
    const nextPosition = getNextPosition(enemy, movement);

    if (
        canMoveTo(nextPosition.x, nextPosition.y, enemy.width, enemy.height) &&
        !hasEnemyCollision(nextPosition.x, nextPosition.y, enemy)
    ) {
        enemy.x = nextPosition.x;
        enemy.y = nextPosition.y;

        addTrack(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            enemy.direction
        );
    } else {
        changeDirection(enemy);
        enemy.turnTimer = randomTurnTime();
    }

    enemy.fireTimer -= deltaTime;

    if (enemy.fireTimer <= 0) {
        fireEnemyBullet(enemy);
        enemy.fireTimer = randomFireTime();
    }
}

function getNextPosition(enemy, movement) {
    const position = { x: enemy.x, y: enemy.y };

    switch (enemy.direction) {
        case 'up':
            position.y -= movement;
            break;
        case 'down':
            position.y += movement;
            break;
        case 'left':
            position.x -= movement;
            break;
        case 'right':
            position.x += movement;
            break;
    }

    return position;
}

function changeDirection(enemy) {
    const availableDirections = DIRECTIONS.filter(
        direction => direction !== enemy.direction
    );

    const shuffledDirections = availableDirections.sort(
        () => Math.random() - 0.5
    );

    for (const direction of shuffledDirections) {
        enemy.direction = direction;
        const position = getNextPosition(enemy, 1);

        if (
            canMoveTo(position.x, position.y, enemy.width, enemy.height) &&
            !hasEnemyCollision(position.x, position.y, enemy)
        ) {
            return;
        }
    }

    enemy.direction = DIRECTIONS[
        Math.floor(Math.random() * DIRECTIONS.length)
        ];
}

function hasEnemyCollision(x, y, currentEnemy = null) {
    return enemies.some(enemy => {
        if (enemy === currentEnemy) return false;

        return (
            x < enemy.x + enemy.width &&
            x + ENEMY_SIZE > enemy.x &&
            y < enemy.y + enemy.height &&
            y + ENEMY_SIZE > enemy.y
        );
    });
}

function randomTurnTime() {
    return 700 + Math.random() * 1300;
}

function randomFireTime() {
    return CONFIG.enemies.fireInterval * (0.6 + Math.random() * 0.8);
}

export function drawEnemies(ctx, timestamp = 0) {
    enemies.forEach(enemy => drawEnemy(ctx, enemy, timestamp));
}

function drawEnemy(ctx, enemy, timestamp = 0) {
    const { x, y, width, height, direction } = enemy;

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);

    const rotations = {
        up: 0,
        right: Math.PI / 2,
        down: Math.PI,
        left: -Math.PI / 2
    };

    ctx.rotate(rotations[direction]);

    // Тень
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(-6.5, -5.5, 14, 13, 2);
    ctx.fill();

    // Гусеницы
    ctx.fillStyle = '#1b1e23';
    ctx.beginPath();
    ctx.roundRect(-7, -6.5, 3.2, 13, 1);
    ctx.roundRect(3.8, -6.5, 3.2, 13, 1);
    ctx.fill();

    // Анимация траков
    const trackOffset = Math.floor(timestamp / 85) % 3;
    ctx.fillStyle = '#57606a';
    for (let ty = -5 + trackOffset; ty <= 5; ty += 3) {
        ctx.fillRect(-6.5, ty, 2.2, 1.2);
        ctx.fillRect(4.3, ty, 2.2, 1.2);
    }

    // Бронекорпус (багровый металлик)
    const bodyGrad = ctx.createLinearGradient(-4.5, -6, 4.5, 6);
    bodyGrad.addColorStop(0, '#ff6b6b');
    bodyGrad.addColorStop(0.5, '#d63031');
    bodyGrad.addColorStop(1, '#7f1414');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-4.5, -5.5, 9, 11, 1.5);
    ctx.fill();

    ctx.strokeStyle = '#4a0808';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Красные сенсоры/фары спереди
    ctx.fillStyle = '#ffcccc';
    ctx.fillRect(-3.5, -6, 1.5, 1);
    ctx.fillRect(2, -6, 1.5, 1);

    // Ствол
    const barrelGrad = ctx.createLinearGradient(-1.5, 0, 1.5, 0);
    barrelGrad.addColorStop(0, '#636e72');
    barrelGrad.addColorStop(0.5, '#dfe6e9');
    barrelGrad.addColorStop(1, '#2d3436');

    ctx.fillStyle = barrelGrad;
    ctx.fillRect(-1.1, -8.5, 2.2, 6);

    ctx.fillStyle = '#2d3436';
    ctx.fillRect(-1.4, -9, 2.8, 1.4);

    // Угловатая башня врага
    const turretGrad = ctx.createRadialGradient(-1, -1, 0.5, 0, 0, 4.5);
    turretGrad.addColorStop(0, '#ff8787');
    turretGrad.addColorStop(0.7, '#c92a2a');
    turretGrad.addColorStop(1, '#660f0f');

    ctx.fillStyle = turretGrad;
    ctx.beginPath();
    ctx.roundRect(-3.2, -3, 6.4, 6.4, 1.2);
    ctx.fill();
    ctx.stroke();

    // Люк
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(0, 0.5, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}
