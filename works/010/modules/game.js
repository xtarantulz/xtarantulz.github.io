import {CONFIG} from './config.js';
import {renderMap} from './renderer.js';
import {generateNewLevel} from './map.js';
import {events} from './events.js';
import './sounds.js';

import {
    createPlayer,
    movePlayer,
    stopPlayer,
    getPlayer,
    activatePlayerRespawn,
    updatePlayer
} from './player.js';

import {
    initControls,
    getInput
} from './controls.js';

import {
    fireBullet,
    updateBullets,
    clearBullets
} from './bullets.js';

import {
    createEnemies,
    updateEnemies,
    getEnemies
} from './enemies.js';

import {
    createExplosion,
    updateExplosions,
    clearExplosions
} from './explosions.js';

import {
    updateEffects,
    clearEffects
} from './effects.js';

let canvas;
let ctx;
let startButton;

let gameState = 'ready';
let animationFrame = null;
let lastFrameTime = 0;
let enemiesDefeated = 0;

let stats = {
    level: CONFIG.game.initialLevel,
    lives: CONFIG.player.lives,
    enemies: CONFIG.enemies.total,
    score: 0
};

function vibrate(pattern) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
    }
}

export function initGame(options) {
    canvas = options.canvas;
    ctx = canvas.getContext('2d');

    canvas.width = CONFIG.canvas.width;
    canvas.height = CONFIG.canvas.height;

    startButton = options.startButton;

    createPlayer();
    initControls();

    updateStats();
    drawInitialScreen();
    updateStartButton();

    startButton.addEventListener('click', startGame);
    document.addEventListener('keydown', handleKeyDown);
}

export function startGame() {
    if (gameState === 'playing') {
        pauseGame();
        return;
    }

    if (gameState === 'paused') {
        resumeGame();
        return;
    }

    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    generateNewLevel(CONFIG.game.initialLevel);

    clearBullets();
    clearExplosions();
    clearEffects();

    createPlayer();
    createEnemies();

    enemiesDefeated = 0;

    stats = {
        level: CONFIG.game.initialLevel,
        lives: CONFIG.player.lives,
        enemies: CONFIG.enemies.total,
        score: 0
    };

    updateStats();

    gameState = 'playing';
    lastFrameTime = 0;

    updateStartButton();
    vibrate(25);

    events.emit('game:start');

    animationFrame = requestAnimationFrame(gameLoop);
}

export function pauseGame() {
    if (gameState !== 'playing') return;

    gameState = 'paused';

    updateStartButton();

    events.emit('game:pause');

    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    drawPauseScreen();
}

export function resumeGame() {
    if (gameState !== 'paused') return;

    gameState = 'playing';
    lastFrameTime = 0;

    updateStartButton();

    events.emit('game:resume');

    animationFrame = requestAnimationFrame(gameLoop);
}

export function getGameState() {
    return gameState;
}

export function getStats() {
    return {...stats};
}

function gameLoop(timestamp) {
    if (gameState !== 'playing') return;

    const deltaTime = lastFrameTime
        ? Math.min(timestamp - lastFrameTime, 100)
        : 16.67;

    lastFrameTime = timestamp;

    update(deltaTime);

    if (gameState !== 'playing') return;

    render(timestamp);

    animationFrame = requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    const input = getInput();

    updatePlayer(deltaTime);

    if (input.direction) {
        movePlayer(input.direction, deltaTime, getEnemies());
    } else {
        stopPlayer();
    }

    if (input.fire) {
        fireBullet();
    }

    updateEnemies(deltaTime, getPlayer());

    updateBullets(deltaTime, {
        player: getPlayer(),
        enemies: getEnemies(),
        onPlayerHit: handlePlayerHit,
        onEnemyHit: handleEnemyHit,
        onHeadquartersHit: handleHeadquartersHit
    });

    updateExplosions(deltaTime);
    updateEffects(deltaTime);

    stats.enemies = CONFIG.enemies.total - enemiesDefeated;
    updateStats();

    if (enemiesDefeated >= CONFIG.enemies.total) {
        startNextLevel();
    }
}

function startNextLevel() {
    stats.level++;
    enemiesDefeated = 0;

    generateNewLevel(stats.level);

    clearBullets();
    clearExplosions();
    clearEffects();

    createPlayer();
    createEnemies();

    stats.enemies = CONFIG.enemies.total;

    updateStats();
    vibrate([30, 40, 50]);

    events.emit('level:start', stats.level);
}

function handlePlayerHit() {
    if (gameState !== 'playing') return;

    const player = getPlayer();

    if (!player || player.invulnerable) return;

    createExplosion(
        player.x + player.width / 2,
        player.y + player.height / 2,
        'large'
    );

    vibrate([90, 40, 120]);

    stats.lives--;
    clearBullets();

    if (stats.lives <= 0) {
        updateStats();
        endGame('defeat');
        return;
    }

    createPlayer();
    activatePlayerRespawn();

    events.emit('player:respawn');

    updateStats();
}

function handleEnemyHit(enemy, bullet) {
    if (gameState !== 'playing') return;

    const enemies = getEnemies();
    const index = enemies.indexOf(enemy);

    if (index === -1) return;

    enemy.health = Math.max(0, (enemy.health ?? 1) - 1);

    if (enemy.health > 0) {
        vibrate(18);
        return;
    }

    const isArmored = enemy.type === 'armored';

    createExplosion(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        isArmored ? 'large' : undefined
    );

    vibrate(isArmored ? [55, 30, 70] : 40);

    enemies.splice(index, 1);

    enemiesDefeated++;
    stats.score += enemy.score ?? 100;
    stats.enemies = CONFIG.enemies.total - enemiesDefeated;

    updateStats();
}

function handleHeadquartersHit() {
    if (gameState !== 'playing') return;

    endGame('headquarters');
}

function endGame(result) {
    if (gameState === 'over') return;

    gameState = 'over';

    if (result !== 'victory') {
        vibrate([150, 50, 150, 50, 220]);
    }

    updateStartButton();

    events.emit('game:over', result);

    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    render(lastFrameTime);
    drawGameOver(result);
}

function drawGameOver(result) {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const panelWidth = 360;
    const panelHeight = 150;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;

    ctx.fillStyle = '#171717';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    ctx.strokeStyle = result === 'victory' ? '#ffcc00' : '#ff4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const title = result === 'victory'
        ? 'ПЕРЕМОГА!'
        : 'ГРУ ЗАВЕРШЕНО';

    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(title, canvas.width / 2, panelY + 43);

    ctx.fillStyle = result === 'victory' ? '#ffcc00' : '#ff5555';
    ctx.fillText(title, canvas.width / 2, panelY + 43);

    let message = 'УСІ ВОРОГИ ЗНИЩЕНІ';

    if (result === 'headquarters') {
        message = 'ШТАБ ЗНИЩЕНО';
    } else if (result === 'defeat') {
        message = 'УСІ ЖИТТЯ ВТРАЧЕНО';
    }

    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(message, canvas.width / 2, panelY + 88);

    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(
        'НАТИСНІТЬ «ПОЧАТИ ГРУ»',
        canvas.width / 2,
        panelY + 121
    );

    ctx.restore();
}

function render(timestamp = 0) {
    renderMap(ctx, timestamp);
}

function drawInitialScreen() {
    render(0);

    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillText('BATTLE CITY', canvas.width / 2, 185);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText('PRESS START', canvas.width / 2, 225);

    ctx.restore();
}

function drawPauseScreen() {
    render(lastFrameTime);

    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText('ПАУЗА', canvas.width / 2, canvas.height / 2);

    ctx.restore();
}

function handleKeyDown(event) {
    if (event.code !== 'Enter') return;

    event.preventDefault();

    if (gameState === 'playing') {
        pauseGame();
    } else if (gameState === 'paused') {
        resumeGame();
    }
}

function updateStartButton() {
    if (!startButton) return;

    if (gameState === 'playing') {
        startButton.textContent = 'Пауза';
    } else if (gameState === 'paused') {
        startButton.textContent = 'Продовжити';
    } else {
        startButton.textContent = 'Почати гру';
    }
}

function updateStats() {
    const levelElement = document.getElementById('level');
    const livesElement = document.getElementById('lives');
    const enemiesElement = document.getElementById('enemies');
    const scoreElement = document.getElementById('score');

    if (levelElement) {
        levelElement.textContent = String(stats.level).padStart(2, '0');
    }

    if (livesElement) {
        livesElement.textContent = String(stats.lives).padStart(2, '0');
    }

    if (enemiesElement) {
        enemiesElement.textContent = String(stats.enemies).padStart(2, '0');
    }

    if (scoreElement) {
        scoreElement.textContent = String(stats.score).padStart(5, '0');
    }
}