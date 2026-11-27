
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

const ENEMY_TYPES = {
    basic: {
        name: 'basic',
        width: 14,
        height: 14,
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
        width: 16,
        height: 16,
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
        width: 16,
        height: 16,
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
    { type: 'basic', weight: 45 },
    { type: 'fast', weight: 25 },
    { type: 'power', weight: 20 },
    { type: 'armored', weight: 10 }
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

function spawnEnemy() {
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
        if (hasEnemyCollision(x, y, type.width, type.height)) continue;

        enemies.push({
            x,
            y,
            width: type.width,
            height: type.height,

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
        !hasEnemyCollision(
            nextPosition.x,
            nextPosition.y,
            enemy.width,
            enemy.height,
            enemy
        )
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
        enemy.fireTimer = randomFireTime(enemy.fireInterval);
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
            !hasEnemyCollision(
                position.x,
                position.y,
                enemy.width,
                enemy.height,
                enemy
            )
        ) {
            return;
        }
    }

    enemy.direction = DIRECTIONS[
        Math.floor(Math.random() * DIRECTIONS.length)
        ];
}

function hasEnemyCollision(
    x,
    y,
    width,
    height,
    currentEnemy = null
) {
    return enemies.some(enemy => {
        if (enemy === currentEnemy) return false;

        return (
            x < enemy.x + enemy.width &&
            x + width > enemy.x &&
            y < enemy.y + enemy.height &&
            y + height > enemy.y
        );
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

export function drawEnemies(ctx, timestamp = 0) {
    enemies.forEach(enemy => drawEnemy(ctx, enemy, timestamp));
}

function drawEnemy(ctx, enemy, timestamp = 0) {
    const { x, y, width, height, direction } = enemy;

    const scaleX = width / 14;
    const scaleY = height / 14;

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

    if (enemy.type === 'fast') {
        ctx.roundRect(-4, -5.5, 8, 11, 2);
    } else if (enemy.type === 'power') {
        ctx.roundRect(-5, -5.5, 10, 11, 1);
    } else if (enemy.type === 'armored') {
        ctx.roundRect(-5, -6, 10, 12, 0.5);
    } else {
        ctx.roundRect(-4.5, -5.5, 9, 11, 1.5);
    }

    ctx.fill();

    ctx.strokeStyle = colors.dark;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Додаткова броня важкого танка
    if (enemy.type === 'armored') {
        ctx.strokeStyle = '#dcd6ff';
        ctx.lineWidth = 0.7;
        ctx.strokeRect(-4, -5, 8, 10);

        ctx.fillStyle = '#dcd6ff';
        ctx.fillRect(-4, -2, 8, 0.8);
        ctx.fillRect(-4, 2, 8, 0.8);
    }

    // Фари
    ctx.fillStyle = colors.light;
    ctx.fillRect(-3.5, -6, 1.5, 1);
    ctx.fillRect(2, -6, 1.5, 1);

    // Ствол
    const barrelGrad = ctx.createLinearGradient(-1.5, 0, 1.5, 0);

    barrelGrad.addColorStop(0, '#636e72');
    barrelGrad.addColorStop(0.5, '#dfe6e9');
    barrelGrad.addColorStop(1, '#2d3436');

    ctx.fillStyle = barrelGrad;

    if (enemy.type === 'power' || enemy.type === 'armored') {
        ctx.fillRect(-1.5, -9, 3, 7);
    } else {
        ctx.fillRect(-1.1, -8.5, 2.2, 6);
    }

    ctx.fillStyle = '#2d3436';
    ctx.fillRect(-1.4, -9, 2.8, 1.4);

    // Башта
    const turretGrad = ctx.createRadialGradient(
        -1,
        -1,
        0.5,
        0,
        0,
        4.5
    );

    turretGrad.addColorStop(0, colors.light);
    turretGrad.addColorStop(0.7, colors.turret);
    turretGrad.addColorStop(1, colors.dark);

    ctx.fillStyle = turretGrad;
    ctx.beginPath();

    if (enemy.type === 'fast') {
        ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
    } else if (enemy.type === 'power') {
        ctx.roundRect(-3.8, -3.5, 7.6, 7, 0.5);
    } else {
        ctx.roundRect(-3.2, -3, 6.4, 6.4, 1.2);
    }

    ctx.fill();

    ctx.strokeStyle = colors.dark;
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Люк
    ctx.fillStyle = colors.dark;
    ctx.beginPath();
    ctx.arc(0, 0.5, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function getEnemyColors(enemy) {
    if (enemy.type !== 'armored') {
        return enemy.colors;
    }

    // Колір броньованого танка змінюється після влучань
    const damageStage = enemy.maxHealth - enemy.health;

    if (damageStage === 1) {
        return {
            ...enemy.colors,
            light: '#ffeaa7',
            main: '#d6a928',
            dark: '#80600e',
            turret: '#bd941c'
        };
    }

    if (damageStage === 2) {
        return {
            ...enemy.colors,
            light: '#ffb86b',
            main: '#d97706',
            dark: '#85420a',
            turret: '#b85c0a'
        };
    }

    if (damageStage >= 3) {
        return {
            ...enemy.colors,
            light: '#ff8a8a',
            main: '#b33939',
            dark: '#641d1d',
            turret: '#8e2929'
        };
    }

    return enemy.colors;
}
