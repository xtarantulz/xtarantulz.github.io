import { CONFIG } from './config.js';
import { getMap, TILE } from './map.js';

import { drawPlayer } from './player.js';
import { drawBullets } from './bullets.js';
import { drawEnemies } from './enemies.js';
import { drawExplosions } from './explosions.js';
import { drawBonuses } from './bonuses.js';
import {
    drawTracks,
    drawForegroundEffects
} from './effects.js';

const SIZE = CONFIG.map.tileSize;

export function renderMap(ctx, timestamp = 0) {
    clearCanvas(ctx);

    const map = getMap();

    // Основной слой карты
    for (let row = 0; row < CONFIG.map.rows; row++) {
        for (let column = 0; column < CONFIG.map.columns; column++) {
            const tile = map[row][column];
            const x = column * SIZE;
            const y = row * SIZE;

            switch (tile) {
                case TILE.BRICK:
                    drawBrick(ctx, x, y);
                    break;

                case TILE.STEEL:
                    drawSteel(ctx, x, y);
                    break;

                case TILE.WATER:
                    drawWater(ctx, x, y, timestamp);
                    break;

                case TILE.HEADQUARTERS:
                    drawHeadquarters(ctx, x, y, timestamp);
                    break;
            }
        }
    }

    // Следы гусениц на земле
    drawTracks(ctx);

    // Игровые объекты
    drawPlayer(ctx, timestamp);
    drawEnemies(ctx, timestamp);
    drawBullets(ctx);
    drawExplosions(ctx);
    drawForegroundEffects(ctx);

    // Лес поверх танков и эффектов с лёгкой полупрозрачностью
    for (let row = 0; row < CONFIG.map.rows; row++) {
        for (let column = 0; column < CONFIG.map.columns; column++) {
            if (map[row][column] === TILE.FOREST) {
                drawForest(ctx, column * SIZE, row * SIZE, timestamp);
            }
        }
    }

    // Бонусы поверх карты и леса
    drawBonuses(ctx, timestamp);
}

function clearCanvas(ctx) {
    // Глубокий графитовый фон с лёгким градиентом
    const bgGrad = ctx.createRadialGradient(
        CONFIG.canvas.width / 2,
        CONFIG.canvas.height / 2,
        40,
        CONFIG.canvas.width / 2,
        CONFIG.canvas.height / 2,
        CONFIG.canvas.width * 0.75
    );
    bgGrad.addColorStop(0, '#14171c');
    bgGrad.addColorStop(1, '#090b0e');

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    // Едва заметная тактическая сетка
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= CONFIG.canvas.width; x += SIZE) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CONFIG.canvas.height);
    }
    for (let y = 0; y <= CONFIG.canvas.height; y += SIZE) {
        ctx.moveTo(0, y);
        ctx.lineTo(CONFIG.canvas.width, y);
    }
    ctx.stroke();
}

// Объёмная кирпичная кладка
function drawBrick(ctx, x, y) {
    // Тень под блоком
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x + 1.5, y + 1.5, SIZE, SIZE);

    // Раствор (швы)
    ctx.fillStyle = '#3d1c10';
    ctx.fillRect(x, y, SIZE, SIZE);

    // Градиент кирпича
    const brickGrad = ctx.createLinearGradient(x, y, x, y + SIZE);
    brickGrad.addColorStop(0, '#d96b38');
    brickGrad.addColorStop(0.5, '#b84c24');
    brickGrad.addColorStop(1, '#8c3314');

    ctx.fillStyle = brickGrad;

    // Верхний ряд кирпичей
    ctx.fillRect(x + 1, y + 1, 6, 6);
    ctx.fillRect(x + 9, y + 1, 6, 6);

    // Нижний ряд со смещённым швом
    ctx.fillRect(x + 1, y + 9, 2, 6);
    ctx.fillRect(x + 5, y + 9, 6, 6);
    ctx.fillRect(x + 13, y + 9, 2, 6);

    // Светлые верхние блики (фаска)
    ctx.fillStyle = 'rgba(255, 195, 150, 0.45)';
    ctx.fillRect(x + 1, y + 1, 6, 1);
    ctx.fillRect(x + 9, y + 1, 6, 1);
    ctx.fillRect(x + 5, y + 9, 6, 1);
}

// Бронированная стальная плита с заклёпками
function drawSteel(ctx, x, y) {
    // Тень
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x + 1.5, y + 1.5, SIZE, SIZE);

    // Внешняя тёмная рамка
    ctx.fillStyle = '#3b424c';
    ctx.fillRect(x, y, SIZE, SIZE);

    // Металлический градиент
    const steelGrad = ctx.createLinearGradient(x, y, x + SIZE, y + SIZE);
    steelGrad.addColorStop(0, '#cfd8e3');
    steelGrad.addColorStop(0.5, '#8e99a8');
    steelGrad.addColorStop(1, '#525b66');

    ctx.fillStyle = steelGrad;
    ctx.fillRect(x + 1, y + 1, SIZE - 2, SIZE - 2);

    // Внутренняя углублённая пластина
    ctx.fillStyle = '#6b7582';
    ctx.fillRect(x + 3.5, y + 3.5, SIZE - 7, SIZE - 7);

    // Блик по левому и верхнему краю
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(x + 1, y + 1, SIZE - 2, 1);
    ctx.fillRect(x + 1, y + 1, 1, SIZE - 2);

    // 4 заклёпки по углам
    const rivets = [
        [x + 2.5, y + 2.5],
        [x + SIZE - 2.5, y + 2.5],
        [x + 2.5, y + SIZE - 2.5],
        [x + SIZE - 2.5, y + SIZE - 2.5]
    ];

    rivets.forEach(([rx, ry]) => {
        ctx.fillStyle = '#2d333b';
        ctx.beginPath();
        ctx.arc(rx, ry, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#eef4fa';
        ctx.beginPath();
        ctx.arc(rx - 0.3, ry - 0.3, 0.6, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Живая анимированная вода
function drawWater(ctx, x, y, timestamp = 0) {
    const waterGrad = ctx.createLinearGradient(x, y, x, y + SIZE);
    waterGrad.addColorStop(0, '#0f4c81');
    waterGrad.addColorStop(1, '#1b6ca8');

    ctx.fillStyle = waterGrad;
    ctx.fillRect(x, y, SIZE, SIZE);

    // Плавное движение волн
    const shift = Math.sin(timestamp / 300 + (x + y) * 0.05) * 2.5;

    ctx.strokeStyle = 'rgba(130, 210, 255, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x + 2 + shift, y + 5);
    ctx.quadraticCurveTo(x + 5 + shift, y + 3.5, x + 8 + shift, y + 5);

    ctx.moveTo(x + 6 - shift, y + 11);
    ctx.quadraticCurveTo(x + 9 - shift, y + 9.5, x + 12 - shift, y + 11);
    ctx.stroke();
}

// Пышный многослойный лес
function drawForest(ctx, x, y) {
    ctx.save();
    ctx.globalAlpha = 0.88;

    const clusters = [
        { cx: x + 4.5, cy: y + 4.5, r: 4.5, color: '#1b5e20' },
        { cx: x + 11.5, cy: y + 4.5, r: 4.5, color: '#1e6924' },
        { cx: x + 4.5, cy: y + 11.5, r: 4.5, color: '#1e6924' },
        { cx: x + 11.5, cy: y + 11.5, r: 4.5, color: '#174f1c' },
        { cx: x + 8, cy: y + 8, r: 5, color: '#2e7d32' }
    ];

    clusters.forEach(c => {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
        ctx.fill();
    });

    // Светлые блики листьев
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.arc(x + 7, y + 6.5, 2, 0, Math.PI * 2);
    ctx.arc(x + 10.5, y + 4, 1.3, 0, Math.PI * 2);
    ctx.arc(x + 4, y + 10.5, 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Штаб с золотым орлом
function drawHeadquarters(ctx, x, y, timestamp = 0) {
    // Постамент
    ctx.fillStyle = '#262b33';
    ctx.fillRect(x, y, SIZE, SIZE);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, SIZE - 1, SIZE - 1);

    // Лёгкое пульсирующее сияние вокруг штаба
    const pulse = 0.75 + Math.sin(timestamp / 250) * 0.25;

    ctx.save();
    ctx.translate(x + SIZE / 2, y + SIZE / 2);

    ctx.shadowColor = `rgba(255, 215, 0, ${pulse})`;
    ctx.shadowBlur = 6;

    // Крылья и тело орла
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(0, -5.5);
    ctx.lineTo(2, -3.5);
    ctx.lineTo(6.5, -2.5);
    ctx.lineTo(5, 1.5);
    ctx.lineTo(2.5, 1);
    ctx.lineTo(3, 5.5);
    ctx.lineTo(0, 4);
    ctx.lineTo(-3, 5.5);
    ctx.lineTo(-2.5, 1);
    ctx.lineTo(-5, 1.5);
    ctx.lineTo(-6.5, -2.5);
    ctx.lineTo(-2, -3.5);
    ctx.closePath();
    ctx.fill();

    // Центральный щит на груди
    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    ctx.arc(0, -0.5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}
