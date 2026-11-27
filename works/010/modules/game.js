import { CONFIG } from './config.js';
import { renderMap } from './renderer.js';
import { generateNewLevel } from './map.js';
import { events } from './events.js';
import './sounds.js';

import {
    createPlayer,
    movePlayer,
    stopPlayer,
    getPlayer,
    activatePlayerRespawn,
    updatePlayer,
    upgradePlayerRank
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

import {
    spawnBonus,
    updateBonuses,
    clearBonuses
} from './bonuses.js';

const STAGE_INTRO_DURATION = 2200;
const STAGE_HOLD_RATIO = 0.55;

let canvas;
let ctx;
let startButton;

// 'ready' | 'stage-intro' | 'playing' | 'paused' | 'over'
let gameState = 'ready';
let animationFrame = null;
let lastFrameTime = 0;
let enemiesDefeated = 0;
let stageIntroElapsed = 0;

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

    createPlayer(false);
    initControls();

    updateStats();
    drawInitialScreen();
    updateStartButton();

    startButton.addEventListener('click', startGame);
    document.addEventListener('keydown', handleKeyDown);
}

export function startGame() {
    if (gameState === 'stage-intro') {
        return;
    }

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

    stats = {
        level: CONFIG.game.initialLevel,
        lives: CONFIG.player.lives,
        enemies: CONFIG.enemies.total,
        score: 0
    };

    beginLevelStage(stats.level);
}

function beginLevelStage(level) {
    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    enemiesDefeated = 0;

    generateNewLevel(level);

    clearBullets();
    clearExplosions();
    clearEffects();
    clearBonuses();

    // Зберігаємо ранг танка при переході на наступний рівень
    createPlayer(level > 1);
    activatePlayerRespawn();
    createEnemies();

    stats.level = level;
    stats.enemies = CONFIG.enemies.total;

    updateStats();

    gameState = 'stage-intro';
    stageIntroElapsed = 0;
    lastFrameTime = 0;

    updateStartButton();

    events.emit('game:start');
    events.emit('level:start', level);

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
    if (gameState !== 'playing' && gameState !== 'stage-intro') return;

    const deltaTime = lastFrameTime
        ? Math.min(timestamp - lastFrameTime, 100)
        : 16.67;

    lastFrameTime = timestamp;

    if (gameState === 'stage-intro') {
        stageIntroElapsed += deltaTime;

        const progress = Math.min(1, stageIntroElapsed / STAGE_INTRO_DURATION);

        render(timestamp);
        drawStageCurtain(stats.level, progress);

        if (progress >= 1) {
            gameState = 'playing';
            updateStartButton();
        }

        animationFrame = requestAnimationFrame(gameLoop);
        return;
    }

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

    updateBonuses(deltaTime, getPlayer(), {
        onExtraLife: () => {
            stats.lives++;
            stats.score += 500;
            updateStats();
        },
        onFreeze: () => {
            stats.score += 500;
            updateStats();
        },
        onBomb: () => {
            stats.score += 500;
            const enemies = getEnemies();
            while (enemies.length > 0) {
                const enemy = enemies.pop();
                createExplosion(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height / 2,
                    enemy.type === 'armored' ? 'large' : undefined
                );
                enemiesDefeated++;
                stats.score += enemy.score ?? 100;
            }
            stats.enemies = Math.max(0, CONFIG.enemies.total - enemiesDefeated);
            updateStats();
        },
        onShovel: () => {
            stats.score += 500;
            updateStats();
        },
        onUpgrade: () => {
            upgradePlayerRank();
            stats.score += 500;
            updateStats();
        }
    });

    stats.enemies = Math.max(0, CONFIG.enemies.total - enemiesDefeated);
    updateStats();

    if (enemiesDefeated >= CONFIG.enemies.total) {
        startNextLevel();
    }
}

function startNextLevel() {
    const nextLevel = stats.level + 1;
    beginLevelStage(nextLevel);
}

function drawStageCurtain(level, progress) {
    const halfHeight = canvas.height / 2;

    let openRatio = 0;

    if (progress > STAGE_HOLD_RATIO) {
        const raw = (progress - STAGE_HOLD_RATIO) / (1 - STAGE_HOLD_RATIO);
        openRatio = raw < 0.5
            ? 4 * raw * raw * raw
            : 1 - Math.pow(-2 * raw + 2, 3) / 2;
    }

    const panelOffset = halfHeight * openRatio;

    ctx.save();

    const topGrad = ctx.createLinearGradient(0, -panelOffset, 0, halfHeight - panelOffset);
    topGrad.addColorStop(0, '#090b0e');
    topGrad.addColorStop(1, '#161a22');

    ctx.fillStyle = topGrad;
    ctx.fillRect(0, -panelOffset, canvas.width, halfHeight);

    const bottomGrad = ctx.createLinearGradient(0, halfHeight + panelOffset, 0, canvas.height + panelOffset);
    bottomGrad.addColorStop(0, '#161a22');
    bottomGrad.addColorStop(1, '#090b0e');

    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, halfHeight + panelOffset, canvas.width, halfHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 16) {
        ctx.moveTo(x, -panelOffset);
        ctx.lineTo(x, halfHeight - panelOffset);
        ctx.moveTo(x, halfHeight + panelOffset);
        ctx.lineTo(x, canvas.height + panelOffset);
    }
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = '#ff7b02';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff7b02';

    if (openRatio === 0) {
        ctx.fillRect(0, halfHeight - 1, canvas.width, 2);
    } else if (openRatio < 1) {
        ctx.fillRect(0, halfHeight - panelOffset - 2, canvas.width, 2);
        ctx.fillRect(0, halfHeight + panelOffset, canvas.width, 2);
    }
    ctx.restore();

    if (openRatio < 0.35) {
        const textAlpha = 1 - openRatio / 0.35;
        const levelText = `РІВЕНЬ ${String(level).padStart(2, '0')}`;
        const scoreText = `РАХУНОК: ${String(stats.score).padStart(5, '0')}`;

        const boxWidth = 270;
        const boxHeight = 96;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2;

        ctx.globalAlpha = textAlpha;

        ctx.fillStyle = 'rgba(11, 13, 17, 0.94)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
        ctx.fill();

        ctx.strokeStyle = '#ff7b02';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = 'bold 28px "Pixelify Sans", "Press Start 2P", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(levelText, canvas.width / 2, boxY + 34);

        ctx.font = 'bold 16px "Pixelify Sans", "Press Start 2P", Arial, sans-serif';
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(scoreText, canvas.width / 2, boxY + 68);
    }

    ctx.restore();
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

    stats.lives--;
    clearBullets();

    if (stats.lives <= 0) {
        updateStats();
        endGame('defeat');
        return;
    }

    createPlayer(false);
    activatePlayerRespawn();

    events.emit('player:respawn');

    updateStats();
}

function handleEnemyHit(enemy, bullet) {
    if (gameState !== 'playing') return;

    const enemies = getEnemies();
    const index = enemies.indexOf(enemy);

    if (index === -1) return;

    // Якщо це миготливий бонусний танк — видаємо бонус при ПЕРШОМУ ж влучанні і знімаємо миготіння
    if (enemy.isBonus === true && !enemy.bonusDropped) {
        enemy.isBonus = false;
        enemy.bonusDropped = true;
        spawnBonus(true);
    }

    enemy.health = Math.max(0, (enemy.health ?? 1) - 1);

    if (enemy.health > 0) {
        return;
    }

    const isArmored = enemy.type === 'armored';

    createExplosion(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        isArmored ? 'large' : undefined
    );

    enemies.splice(index, 1);

    enemiesDefeated++;

    stats.score += enemy.score ?? 100;
    stats.enemies = Math.max(0, CONFIG.enemies.total - enemiesDefeated);

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
    ctx.font = 'bold 32px "Pixelify Sans", Arial, sans-serif';
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
    ctx.font = 'bold 16px "Pixelify Sans", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(message, canvas.width / 2, panelY + 88);
    ctx.font = 'bold 13px "Pixelify Sans", Arial, sans-serif';
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
    ctx.font = 'bold 30px "Press Start 2P", Arial, sans-serif';
    ctx.fillText('BATTLE CITY', canvas.width / 2, 185);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Press Start 2P", Arial, sans-serif';
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
    ctx.font = 'bold 28px "Pixelify Sans", Arial, sans-serif';
    ctx.fillText('ПАУЗА', canvas.width / 2, canvas.height / 2);
    ctx.restore();
}
function handleKeyDown(event) {
    if (event.code !== 'Enter') return;
    event.preventDefault();
    startGame();
}
function updateStartButton() {
    const touchPauseBtn = document.getElementById('touch-pause');
    if (gameState === 'playing' || gameState === 'stage-intro') {
        if (startButton) startButton.textContent = 'Пауза';
        if (touchPauseBtn) {
            touchPauseBtn.textContent = 'PAUSE';
            touchPauseBtn.classList.remove('is-start');
        }
    } else if (gameState === 'paused') {
        if (startButton) startButton.textContent = 'Продовжити';
        if (touchPauseBtn) {
            touchPauseBtn.textContent = 'RESUME';
            touchPauseBtn.classList.add('is-start');
        }
    } else {
        if (startButton) startButton.textContent = 'Почати гру';
        if (touchPauseBtn) {
            touchPauseBtn.textContent = 'START';
            touchPauseBtn.classList.add('is-start');
        }
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