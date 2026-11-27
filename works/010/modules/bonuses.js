import { CONFIG } from './config.js';
import { getTile, TILE, setBaseFortification } from './map.js';
import { events } from './events.js';

const BONUS_SIZE = 16;
const BONUS_LIFETIME = 14000;

export const BONUS_TYPES = Array.of(
    { type: 'life', label: '+1 ЖИТТЯ', color: '#2ecc71', bg: '#0b2e19' },
    { type: 'freeze', label: 'ЗАМОРОЗКА', color: '#38bdf8', bg: '#0b2538' },
    { type: 'bomb', label: 'БОМБА!', color: '#ff5252', bg: '#380d0d' },
    { type: 'shovel', label: 'ШТАБ: СТАЛЬ 60с', color: '#ff9f43', bg: '#382008' },
    { type: 'star', label: 'РАНГ ТАНКА ↑', color: '#ffd43b', bg: '#382e08' }
);

let activeBonuses = [];
let floatingTexts = [];

let freezeTimeLeft = 0;
let shovelTimeLeft = 0;

export function clearBonuses() {
    activeBonuses = [];
    floatingTexts = [];
    freezeTimeLeft = 0;
    shovelTimeLeft = 0;
}

export function isEnemiesFrozen() {
    return freezeTimeLeft > 0;
}

export function spawnBonus(fromBonusEnemy = false) {
    // Бонус з'являється ТІЛЬКИ після повного знищення миготливого бонусного танка
    if (fromBonusEnemy !== true) {
        return;
    }

    const randomIndex = Math.floor(Math.random() * BONUS_TYPES.length);
    const typeObj = BONUS_TYPES.at(randomIndex);
    if (!typeObj) return;

    const pos = findFreeCell();
    if (!pos) return;

    // На карті одночасно може бути лише один активний бонус (новий замінює старий)
    activeBonuses = Array.of({
        x: pos.x,
        y: pos.y,
        width: BONUS_SIZE,
        height: BONUS_SIZE,
        type: typeObj.type,
        label: typeObj.label,
        color: typeObj.color,
        bg: typeObj.bg,
        age: 0,
        duration: BONUS_LIFETIME
    });

    events.emit('bonus:spawn');
}

function findFreeCell() {
    const tileSize = CONFIG.map.tileSize;

    for (let attempt = 0; attempt < 60; attempt++) {
        const row = 2 + Math.floor(Math.random() * (CONFIG.map.rows - 5));
        const col = 1 + Math.floor(Math.random() * (CONFIG.map.columns - 2));
        const tile = getTile(row, col);

        if (tile === TILE.EMPTY || tile === TILE.FOREST) {
            return {
                x: col * tileSize,
                y: row * tileSize
            };
        }
    }

    return null;
}

export function updateBonuses(deltaTime, player, handlers = {}) {
    // Таймер заморозки ворогів
    if (freezeTimeLeft > 0) {
        freezeTimeLeft = Math.max(0, freezeTimeLeft - deltaTime);
    }

    // Таймер сталевого захисту штабу (60 секунд)
    if (shovelTimeLeft > 0) {
        const prev = shovelTimeLeft;
        shovelTimeLeft = Math.max(0, shovelTimeLeft - deltaTime);

        if (shovelTimeLeft > 0 && shovelTimeLeft <= 5000) {
            const blinkSteel = Math.floor(shovelTimeLeft / 250) % 2 === 0;
            setBaseFortification(blinkSteel ? TILE.STEEL : TILE.BRICK);
        } else if (prev > 0 && shovelTimeLeft === 0) {
            setBaseFortification(TILE.BRICK);
        }
    }

    // Оновлення активного бонусу на карті та перевірка підбору гравцем
    for (let i = activeBonuses.length - 1; i >= 0; i--) {
        const bonus = activeBonuses.at(i);
        bonus.age += deltaTime;

        if (bonus.age >= bonus.duration) {
            activeBonuses.splice(i, 1);
            continue;
        }

        if (player && intersects(player, bonus)) {
            applyBonus(bonus, handlers);
            activeBonuses.splice(i, 1);
        }
    }

    // Спливаючі підписи при підборі
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const item = floatingTexts.at(i);
        item.age += deltaTime;
        item.y -= 18 * (deltaTime / 1000);

        if (item.age >= item.duration) {
            floatingTexts.splice(i, 1);
        }
    }
}

function applyBonus(bonus, handlers) {
    events.emit('bonus:collect', bonus.type);

    floatingTexts.push({
        x: bonus.x + bonus.width / 2,
        y: bonus.y,
        text: bonus.label,
        color: bonus.color,
        age: 0,
        duration: 1400
    });

    switch (bonus.type) {
        case 'life':
            handlers.onExtraLife?.();
            break;

        case 'freeze':
            freezeTimeLeft = 10000;
            handlers.onFreeze?.();
            break;

        case 'bomb':
            handlers.onBomb?.();
            break;

        case 'shovel':
            shovelTimeLeft = 60000;
            setBaseFortification(TILE.STEEL);
            handlers.onShovel?.();
            break;

        case 'star':
            handlers.onUpgrade?.();
            break;
    }
}

function intersects(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

export function drawBonuses(ctx, timestamp = 0) {
    activeBonuses.forEach(bonus => {
        const timeLeft = bonus.duration - bonus.age;
        if (timeLeft < 3000 && Math.floor(timestamp / 110) % 2 === 0) {
            return;
        }

        const pulse = 0.85 + Math.sin(timestamp / 180) * 0.15;

        ctx.save();
        ctx.translate(bonus.x + bonus.width / 2, bonus.y + bonus.height / 2);
        ctx.scale(pulse, pulse);

        ctx.shadowColor = bonus.color;
        ctx.shadowBlur = 8;

        ctx.fillStyle = bonus.bg;
        ctx.beginPath();
        ctx.roundRect(-7.5, -7.5, 15, 15, 3);
        ctx.fill();

        ctx.strokeStyle = bonus.color;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.shadowBlur = 0;

        drawBonusIcon(ctx, bonus.type, bonus.color);

        ctx.restore();
    });

    floatingTexts.forEach(item => {
        const alpha = 1 - item.age / item.duration;

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = 'bold 11px "Pixelify Sans", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const safeX = Math.max(48, Math.min(CONFIG.canvas.width - 48, item.x));
        const safeY = Math.max(16, item.y);

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(item.text, safeX, safeY);

        ctx.fillStyle = item.color;
        ctx.fillText(item.text, safeX, safeY);
        ctx.restore();
    });
}

function drawBonusIcon(ctx, type, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    switch (type) {
        case 'life': {
            ctx.beginPath();
            ctx.arc(-2, -1.5, 2.2, 0, Math.PI * 2);
            ctx.arc(2, -1.5, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-4.1, -0.8);
            ctx.lineTo(4.1, -0.8);
            ctx.lineTo(0, 4.5);
            ctx.closePath();
            ctx.fill();
            break;
        }

        case 'freeze': {
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -2.8);
            ctx.moveTo(0, 0);
            ctx.lineTo(2.4, 0);
            ctx.stroke();
            break;
        }

        case 'bomb': {
            ctx.beginPath();
            ctx.arc(0, 1, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-1.5, -4, 3, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(1.5, -5.2, 2, 2);
            break;
        }

        case 'shovel': {
            ctx.fillRect(-3, -1, 6, 4.5);
            ctx.beginPath();
            ctx.moveTo(-3, 3.5);
            ctx.lineTo(3, 3.5);
            ctx.lineTo(0, 5.5);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(-1, -5, 2, 4);
            break;
        }

        case 'star': {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                const innerAngle = outerAngle + Math.PI / 5;
                const ox = Math.cos(outerAngle) * 5.2;
                const oy = Math.sin(outerAngle) * 5.2;
                const ix = Math.cos(innerAngle) * 2.2;
                const iy = Math.sin(innerAngle) * 2.2;
                if (i === 0) ctx.moveTo(ox, oy);
                else ctx.lineTo(ox, oy);
                ctx.lineTo(ix, iy);
            }
            ctx.closePath();
            ctx.fill();
            break;
        }
    }
}
