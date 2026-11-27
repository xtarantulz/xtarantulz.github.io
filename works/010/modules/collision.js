import { CONFIG } from './config.js';
import { getTile, TILE } from './map.js';

const TANK_BLOCKING_TILES = new Set([
    TILE.BRICK,
    TILE.STEEL,
    TILE.WATER,
    TILE.HEADQUARTERS
]);

const BULLET_BLOCKING_TILES = new Set([
    TILE.BRICK,
    TILE.STEEL,
    TILE.HEADQUARTERS
]);

export function canMoveTo(x, y, width, height) {
    const tileSize = CONFIG.map.tileSize;

    const left = Math.floor(x / tileSize);
    const right = Math.floor((x + width - 0.001) / tileSize);
    const top = Math.floor(y / tileSize);
    const bottom = Math.floor((y + height - 0.001) / tileSize);

    for (let row = top; row <= bottom; row++) {
        for (let column = left; column <= right; column++) {
            const tile = getTile(row, column);

            if (tile === null || TANK_BLOCKING_TILES.has(tile)) {
                return false;
            }
        }
    }

    return true;
}

export function getBulletCollision(x, y, width, height) {
    const tileSize = CONFIG.map.tileSize;

    const left = Math.floor(x / tileSize);
    const right = Math.floor((x + width - 0.001) / tileSize);
    const top = Math.floor(y / tileSize);
    const bottom = Math.floor((y + height - 0.001) / tileSize);

    for (let row = top; row <= bottom; row++) {
        for (let column = left; column <= right; column++) {
            const tile = getTile(row, column);

            if (tile === null || BULLET_BLOCKING_TILES.has(tile)) {
                return {
                    row,
                    column,
                    tile
                };
            }
        }
    }

    return null;
}
