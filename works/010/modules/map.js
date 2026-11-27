import { CONFIG } from './config.js';
import { generateLevelMap } from './level-generator.js';

export const TILE = {
    EMPTY: '.',
    BRICK: 'B',
    STEEL: 'S',
    WATER: 'W',
    FOREST: 'F',
    HEADQUARTERS: 'C'
};

export const LEVEL_MAP = generateLevelMap(TILE, CONFIG.game.initialLevel);

let levelMap = LEVEL_MAP.map(row => [...row]);
let currentMap = levelMap.map(row => [...row]);

export function getTile(row, column) {
    if (
        row < 0 ||
        row >= CONFIG.map.rows ||
        column < 0 ||
        column >= CONFIG.map.columns
    ) {
        return null;
    }

    return currentMap[row][column];
}

export function getMap() {
    return currentMap;
}

export function destroyBrickAt(row, column) {
    if (getTile(row, column) !== TILE.BRICK) {
        return false;
    }

    currentMap[row][column] = TILE.EMPTY;
    return true;
}

export function isTankOnForest(tank) {
    if (!tank) return false;

    const tileSize = CONFIG.map.tileSize;

    const left = Math.floor(tank.x / tileSize);
    const right = Math.floor((tank.x + tank.width - 1) / tileSize);
    const top = Math.floor(tank.y / tileSize);
    const bottom = Math.floor((tank.y + tank.height - 1) / tileSize);

    for (let row = top; row <= bottom; row++) {
        for (let column = left; column <= right; column++) {
            if (getTile(row, column) === TILE.FOREST) {
                return true;
            }
        }
    }

    return false;
}

export function generateNewLevel(level) {
    levelMap = generateLevelMap(TILE, level);
    currentMap = levelMap.map(row => [...row]);

    return currentMap;
}

export function resetMap() {
    currentMap = levelMap.map(row => [...row]);
}

export function getMapSize() {
    return {
        width: CONFIG.map.columns * CONFIG.map.tileSize,
        height: CONFIG.map.rows * CONFIG.map.tileSize
    };
}