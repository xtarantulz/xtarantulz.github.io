
import { CONFIG } from './config.js';

const PLAYER_SIZE = 14;
const ENEMY_SIZE = CONFIG.enemies.size;

const ENEMY_SPAWN_POSITIONS = [
    { x: 3, y: 3 },
    {
        x: CONFIG.canvas.width / 2 - ENEMY_SIZE / 2,
        y: 3
    },
    {
        x: CONFIG.canvas.width - ENEMY_SIZE - 3,
        y: 3
    }
];

const PLAYER_SPAWN_POSITION = {
    x: CONFIG.canvas.width / 2 + 16,
    y: CONFIG.canvas.height - PLAYER_SIZE
};

function createEmptyMap(TILE) {
    return Array.from(
        { length: CONFIG.map.rows },
        () => Array(CONFIG.map.columns).fill(TILE.EMPTY)
    );
}

function isInsideMap(row, column) {
    return (
        row >= 0 &&
        row < CONFIG.map.rows &&
        column >= 0 &&
        column < CONFIG.map.columns
    );
}

function createBrickWall(map, TILE, x, y, width, height) {
    for (let row = y; row < y + height; row++) {
        for (let column = x; column < x + width; column++) {
            if (isInsideMap(row, column)) {
                map[row][column] = TILE.BRICK;
            }
        }
    }
}

function createSteelWall(map, TILE, x, y, width, height) {
    for (let row = y; row < y + height; row++) {
        for (let column = x; column < x + width; column++) {
            if (isInsideMap(row, column)) {
                map[row][column] = TILE.STEEL;
            }
        }
    }
}

function createWaterArea(map, TILE, x, y, width, height) {
    for (let row = y; row < y + height; row++) {
        for (let column = x; column < x + width; column++) {
            if (isInsideMap(row, column)) {
                map[row][column] = TILE.WATER;
            }
        }
    }
}

function createForestArea(map, TILE, x, y, width, height) {
    for (let row = y; row < y + height; row++) {
        for (let column = x; column < x + width; column++) {
            if (isInsideMap(row, column)) {
                map[row][column] = TILE.FOREST;
            }
        }
    }
}

function createRandomObjects(map, TILE, level) {
    const objectCount = Math.min(38, 30 + (level - 1) * 2);

    const objects = [
        { width: 3, height: 2, create: createBrickWall },
        { width: 4, height: 2, create: createBrickWall },
        { width: 2, height: 3, create: createBrickWall },
        { width: 4, height: 3, create: createBrickWall },
        { width: 5, height: 2, create: createBrickWall },
        { width: 3, height: 3, create: createBrickWall },
        { width: 3, height: 3, create: createSteelWall },
        { width: 2, height: 2, create: createSteelWall },
        { width: 4, height: 3, create: createWaterArea },
        { width: 3, height: 3, create: createWaterArea },
        { width: 4, height: 4, create: createForestArea },
        { width: 3, height: 3, create: createForestArea },
        { width: 2, height: 4, create: createForestArea }
    ];

    for (let i = 0; i < objectCount; i++) {
        const object = objects[
            Math.floor(Math.random() * objects.length)
            ];

        const x = Math.floor(
            Math.random() * (CONFIG.map.columns - object.width)
        );

        const y = Math.floor(
            Math.random() * (CONFIG.map.rows - object.height)
        );

        object.create(
            map,
            TILE,
            x,
            y,
            object.width,
            object.height
        );
    }
}

function clearTankSpawn(map, TILE, x, y, size) {
    const tileSize = CONFIG.map.tileSize;

    const left = Math.floor(x / tileSize);
    const right = Math.floor((x + size - 1) / tileSize);
    const top = Math.floor(y / tileSize);
    const bottom = Math.floor((y + size - 1) / tileSize);

    for (let row = top; row <= bottom; row++) {
        for (let column = left; column <= right; column++) {
            if (isInsideMap(row, column)) {
                map[row][column] = TILE.EMPTY;
            }
        }
    }
}

function clearSpawnAreas(map, TILE) {
    ENEMY_SPAWN_POSITIONS.forEach(position => {
        clearTankSpawn(
            map,
            TILE,
            position.x,
            position.y,
            ENEMY_SIZE
        );
    });

    clearTankSpawn(
        map,
        TILE,
        PLAYER_SPAWN_POSITION.x,
        PLAYER_SPAWN_POSITION.y,
        PLAYER_SIZE
    );
}

function createVerticalRoute(map, TILE) {
    const routeColumn = 13;

    for (let row = 0; row < CONFIG.map.rows; row++) {
        map[row][routeColumn] = TILE.EMPTY;
    }

    map[CONFIG.map.rows - 1][14] = TILE.EMPTY;
}

function placeHeadquarters(map, TILE) {
    const headquartersRow = CONFIG.map.rows - 1;
    const headquartersColumn = 12;

    // Верхня частина цегляного огородження.
    for (
        let column = headquartersColumn - 1;
        column <= headquartersColumn + 1;
        column++
    ) {
        map[headquartersRow - 1][column] = TILE.BRICK;
    }

    // Бічні частини огородження.
    map[headquartersRow][headquartersColumn - 1] = TILE.BRICK;
    map[headquartersRow][headquartersColumn + 1] = TILE.BRICK;

    // Штаб.
    map[headquartersRow][headquartersColumn] = TILE.HEADQUARTERS;
}

export function generateLevelMap(TILE, level = 1) {
    const map = createEmptyMap(TILE);

    createRandomObjects(map, TILE, level);

    clearSpawnAreas(map, TILE);
    createVerticalRoute(map, TILE);
    placeHeadquarters(map, TILE);

    return map;
}
