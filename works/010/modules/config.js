
export const CONFIG = {
    canvas: {
        width: 416,
        height: 416
    },

    map: {
        columns: 26,
        rows: 26,
        tileSize: 16
    },

    player: {
        speed: 2,
        lives: 3
    },

    enemies: {
        total: 20,
        speed: 1,
        maxOnScreen: 4,
        spawnInterval: 1800,
        fireInterval: 1600,
        bulletSpeed: 3,
        size: 14
    },

    bullets: {
        speed: 5,
        maxPerPlayer: 1,
        enemyMax: 1
    },

    game: {
        fps: 60,
        initialLevel: 1
    },

    colors: {
        background: '#000000',
        player: '#ffcc00',
        enemy: '#d93636',
        bullet: '#ffffff'
    }
};
