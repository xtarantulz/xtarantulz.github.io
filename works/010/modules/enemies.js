import {CONFIG} from './config.js';
import {canMoveTo} from './collision.js';
import {fireEnemyBullet} from './bullets.js';
import {addTrack} from './effects.js';

const ENEMY_SIZE = CONFIG.enemies.size;

const SPAWN_POSITIONS = [
    {x: 1, y: 1},
    {x: CONFIG.canvas.width / 2 - ENEMY_SIZE / 2, y: 1},
    {x: CONFIG.canvas.width - ENEMY_SIZE - 1, y: 1}
];

const DIRECTIONS = ['up', 'right', 'down', 'left'];

const ENEMY_TYPES = {
    basic: {
        name: 'basic',
        width: 14,
        height: 14,
        visualScale: 1,
        speed: 1,
        health: 1,
        score: 100,
        fireInterval: 1,
        colors: {
            light: '#ff6b6b',
            main: '#d63031',
            dark: '#7f1414',
            turret: '#c92a2a',
            track: '#57606a'
        }
    },

    fast: {
        name: 'fast',
        width: 12,
        height: 12,
        visualScale: 1,
        speed: 2.2,
        health: 1,
        score: 200,
        fireInterval: 1.3,
        colors: {
            light: '#74b9ff',
            main: '#0984e3',
            dark: '#064b83',
            turret: '#1675bd',
            track: '#34495e'
        }
    },

    power: {
        name: 'power',
        width: 14,
        height: 14,
        visualScale: 1.12,
        speed: 1.3,
        health: 1,
        score: 300,
        fireInterval: 0.8,
        colors: {
            light: '#ffeaa7',
            main: '#e67e22',
            dark: '#873d0b',
            turret: '#c76b1b',
            track: '#4d4035'
        }
    },

    armored: {
        name: 'armored',
        width: 14,
        height: 14,
        visualScale: 1.14,
        speed: 0.8,
        health: 4,
        score: 400,
        fireInterval: 0.9,
        colors: {
            light: '#a29bfe',
            main: '#6c5ce7',
            dark: '#352879',
            turret: '#5745bd',
            track: '#39334f'
        }
    }
};

const ENEMY_TYPE_WEIGHTS = [
    {type: 'basic', weight: 45},
    {type: 'fast', weight: 25},
    {type: 'power', weight: 20},
    {type: 'armored', weight: 10}
];

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

export function updateEnemies(deltaTime, player = null) {
    if (spawnedCount < CONFIG.enemies.total) {
        spawnTimer += deltaTime;

        if (
            spawnTimer >= CONFIG.enemies.spawnInterval &&
            enemies.length < CONFIG.enemies.maxOnScreen
        ) {
            if (spawnEnemy(player)) {
                spawnTimer = 0;
            }
        }
    }

    enemies.forEach(enemy => {
        updateEnemy(enemy, deltaTime, player);
    });
}

function getRandomEnemyType() {
    const totalWeight = ENEMY_TYPE_WEIGHTS.reduce(
        (sum, item) => sum + item.weight,
        0
    );

    let random = Math.random() * totalWeight;

    for (const item of ENEMY_TYPE_WEIGHTS) {
        random -= item.weight;

        if (random <= 0) {
            return ENEMY_TYPES[item.type];
        }
    }

    return ENEMY_TYPES.basic;
}

function spawnEnemy(player = null) {
    if (
        enemies.length >= CONFIG.enemies.maxOnScreen ||
        spawnedCount >= CONFIG.enemies.total
    ) {
        return false;
    }

    const shuffledPositions = [...SPAWN_POSITIONS]
        .sort(() => Math.random() - 0.5);

    const type = getRandomEnemyType();

    for (const position of shuffledPositions) {
        const x = position.x;
        const y = position.y;

        if (!canMoveTo(x, y, type.width, type.height)) continue;
        if (hasTankCollision(x, y, type.width, type.height, null, player)) continue;

        enemies.push({
            x,
            y,
            width: type.width,
            height: type.height,
            visualScale: type.visualScale,

            type: type.name,
            speed: type.speed,

            health: type.health,
            maxHealth: type.health,
            score: type.score,

            colors: type.colors,
            fireInterval: type.fireInterval,

            direction: 'down',
            turnTimer: randomTurnTime(),
            fireTimer: randomFireTime(type.fireInterval)
        });

        spawnedCount++;
        return true;
    }

    return false;
}

function updateEnemy(enemy, deltaTime, player = null) {
    enemy.turnTimer -= deltaTime;

    if (enemy.turnTimer <= 0) {
        changeDirection(enemy, player);
        enemy.turnTimer = randomTurnTime();
    }

    const movement = enemy.speed * (deltaTime / (1000 / 60));
    const resolved = resolveEnemyStep(enemy, movement, player);

    if (resolved) {
        enemy.x = resolved.x;
        enemy.y = resolved.y;

        addTrack(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            enemy.direction
        );
    } else {
        changeDirection(enemy, player);
        enemy.turnTimer = randomTurnTime();
    }

    enemy.fireTimer -= deltaTime;

    if (enemy.fireTimer <= 0) {
        fireEnemyBullet(enemy);
        enemy.fireTimer = randomFireTime(enemy.fireInterval);
    }
}

function resolveEnemyStep(enemy, movement, player) {
    const nextPosition = getNextPosition(enemy, movement);

    if (isFreeForEnemy(nextPosition.x, nextPosition.y, enemy, player)) {
        return nextPosition;
    }

    // М'яке огинання кутів перешкод
    const isVertical = enemy.direction === 'up' || enemy.direction === 'down';
    const offsets = [1, -1, 2, -2, 3, -3];

    for (const offset of offsets) {
        const testX = isVertical ? enemy.x + offset : nextPosition.x;
        const testY = isVertical ? nextPosition.y : enemy.y + offset;

        if (isFreeForEnemy(testX, testY, enemy, player)) {
            return {x: testX, y: testY};
        }
    }

    return null;
}

function isFreeForEnemy(nextX, nextY, enemy, player) {
    if (!canMoveTo(nextX, nextY, enemy.width, enemy.height)) {
        return false;
    }

    return !hasTankCollision(nextX, nextY, enemy.width, enemy.height, enemy, player);
}

function getNextPosition(enemy, movement) {
    const position = {x: enemy.x, y: enemy.y};

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

function changeDirection(enemy, player = null) {
    const availableDirections = DIRECTIONS.filter(
        direction => direction !== enemy.direction
    );

    const shuffledDirections = availableDirections.sort(
        () => Math.random() - 0.5
    );

    for (const direction of shuffledDirections) {
        enemy.direction = direction;

        const position = getNextPosition(enemy, 1.5);

        if (isFreeForEnemy(position.x, position.y, enemy, player)) {
            return;
        }
    }

    enemy.direction = DIRECTIONS[
        Math.floor(Math.random() * DIRECTIONS.length)
        ];
}

function hasTankCollision(
    nextX,
    nextY,
    width,
    height,
    currentEnemy = null,
    player = null
) {
    const targets = player ? [...enemies, player] : enemies;

    return targets.some(other => {
        if (!other || other === currentEnemy) return false;

        const overlapsNext = (
            nextX < other.x + other.width &&
            nextX + width > other.x &&
            nextY < other.y + other.height &&
            nextY + height > other.y
        );

        if (!overlapsNext) return false;

        // Якщо танки вже торкнулися — дозволяємо крок на збільшення дистанції
        if (currentEnemy) {
            const alreadyOverlapping = (
                currentEnemy.x < other.x + other.width &&
                currentEnemy.x + currentEnemy.width > other.x &&
                currentEnemy.y < other.y + other.height &&
                currentEnemy.y + currentEnemy.height > other.y
            );

            if (alreadyOverlapping) {
                const curDist = Math.hypot(
                    (currentEnemy.x + width / 2) - (other.x + other.width / 2),
                    (currentEnemy.y + height / 2) - (other.y + other.height / 2)
                );
                const nextDist = Math.hypot(
                    (nextX + width / 2) - (other.x + other.width / 2),
                    (nextY + height / 2) - (other.y + other.height / 2)
                );

                if (nextDist > curDist) {
                    return false;
                }
            }
        }

        return true;
    });
}

function randomTurnTime() {
    return 700 + Math.random() * 1300;
}

function randomFireTime(multiplier = 1) {
    return CONFIG.enemies.fireInterval *
        multiplier *
        (0.6 + Math.random() * 0.8);
}

function getEnemyColors(enemy) {
    if (enemy.type !== 'armored') {
        return enemy.colors;
    }

    // Візуальна індикація пошкодження броні у важкого танка
    if (enemy.health === 3) {
        return {...enemy.colors, light: '#81ecec', main: '#00cec9', dark: '#006266'};
    }
    if (enemy.health === 2) {
        return {...enemy.colors, light: '#ffeaa7', main: '#fdcb6e', dark: '#b7791f'};
    }
    if (enemy.health === 1) {
        return {...enemy.colors, light: '#ff7675', main: '#d63031', dark: '#7f1414'};
    }

    return enemy.colors;
}

export function drawEnemies(ctx, timestamp = 0) {
    enemies.forEach(enemy => drawEnemy(ctx, enemy, timestamp));
}

function drawEnemy(ctx, enemy, timestamp = 0) {
    const {x, y, width, height, direction} = enemy;

    const scaleX = (width / 14) * (enemy.visualScale || 1);
    const scaleY = (height / 14) * (enemy.visualScale || 1);

    const colors = getEnemyColors(enemy);

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    const rotations = {
        up: 0,
        right: Math.PI / 2,
        down: Math.PI,
        left: -Math.PI / 2
    };
    ctx.rotate(rotations[direction]);
    ctx.scale(scaleX, scaleY);
// Тінь
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(-6.5, -5.5, 14, 13, 2);
    ctx.fill();
// Гусениці
    ctx.fillStyle = '#1b1e23';
    ctx.beginPath();
    ctx.roundRect(-7, -6.5, 3.2, 13, 1);
    ctx.roundRect(3.8, -6.5, 3.2, 13, 1);
    ctx.fill();
// Анімація гусениць
    const trackOffset = Math.floor(timestamp / 85) % 3;
    ctx.fillStyle = colors.track;
    for (let ty = -5 + trackOffset; ty <= 5; ty += 3) {
        ctx.fillRect(-6.5, ty, 2.2, 1.2);
        ctx.fillRect(4.3, ty, 2.2, 1.2);
    }
// Бронекорпус
    const bodyGrad = ctx.createLinearGradient(-4.5, -6, 4.5, 6);
    bodyGrad.addColorStop(0, colors.light);
    bodyGrad.addColorStop(0.5, colors.main);
    bodyGrad.addColorStop(1, colors.dark);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-4.5, -5.5, 9, 11, 1.5);
    ctx.fill();
    ctx.strokeStyle = colors.dark;
    ctx.lineWidth = 0.8;
    ctx.stroke();
// Передні сенсори
    ctx.fillStyle = colors.light;
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
// Башта
    const turretGrad = ctx.createRadialGradient(-1, -1, 0.5, 0, 0, 4.5);
    turretGrad.addColorStop(0, colors.light);
    turretGrad.addColorStop(0.7, colors.turret);
    turretGrad.addColorStop(1, colors.dark);
    ctx.fillStyle = turretGrad;
    ctx.beginPath();
    ctx.roundRect(-3.2, -3, 6.4, 6.4, 1.2);
    ctx.fill();
    ctx.stroke();
// Люк
    ctx.fillStyle = colors.dark;
    ctx.beginPath();
    ctx.arc(0, 0.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}