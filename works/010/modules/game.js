
import { CONFIG } from './config.js';
import { renderMap } from './renderer.js';
import { generateNewLevel } from './map.js';
import { events } from './events.js';
import './sounds.js';

import {
    createPlayer,
    movePlayer,
    stopPlayer,
    getPlayer
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
    return { ...stats };
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

    if (input.direction) {
        movePlayer(input.direction, deltaTime, getEnemies());
    } else {
        stopPlayer();
    }

    if (input.fire) {
        fireBullet();
    }

    updateEnemies(deltaTime);

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

    events.emit('level:start', stats.level);
}

function handlePlayerHit() {
    if (gameState !== 'playing') return;

    const player = getPlayer();

    if (player) {
        createExplosion(
            player.x + player.width / 2,
            player.y + player.height / 2,
            'large'
        );
    }

    stats.lives--;
    clearBullets();

    if (stats.lives <= 0) {
        updateStats();
        endGame('defeat');
        return;
    }

    createPlayer();
    updateStats();
}

function handleEnemyHit(enemy) {
    if (gameState !== 'playing') return;

    const enemies = getEnemies();
    const index = enemies.indexOf(enemy);

    if (index === -1) return;

    createExplosion(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2
    );

    enemies.splice(index, 1);

    enemiesDefeated++;
    stats.score += 100;
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

    // Затемнення ігрового поля
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Центральна панель
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

    // Головний напис
    const title = result === 'victory'
        ? 'ПЕРЕМОГА!'
        : 'ГРУ ЗАВЕРШЕНО';

    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(title, canvas.width / 2, panelY + 43);

    ctx.fillStyle = result === 'victory' ? '#ffcc00' : '#ff5555';
    ctx.fillText(title, canvas.width / 2, panelY + 43);

    // Причина завершення
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
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText('ПАУЗА', canvas.width / 2, canvas.height / 2);

    ctx.restore();
}

function handleKeyDown(event) {
    if (event.code !== 'Enter' || event.repeat) return;

    event.preventDefault();

    startGame();
}

function updateStartButton() {
    if (!startButton) return;

    const labels = {
        ready: 'ПОЧАТИ ГРУ',
        playing: 'ПАУЗА',
        paused: 'ПРОДОВЖИТИ',
        over: 'ПОЧАТИ ГРУ'
    };

    startButton.textContent = labels[gameState];
}

function updateStats() {
    const levelElement = document.getElementById('level');
    const livesElement = document.getElementById('lives');
    const enemiesElement = document.getElementById('enemies');
    const scoreElement = document.getElementById('score');

    if (levelElement) {
        levelElement.textContent = stats.level;
    }

    if (livesElement) {
        livesElement.textContent = stats.lives;
    }

    if (enemiesElement) {
        enemiesElement.textContent = stats.enemies;
    }

    if (scoreElement) {
        scoreElement.textContent = String(stats.score).padStart(5, '0');
    }
}
