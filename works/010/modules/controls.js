
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

let initialized = false;

export function initControls() {
    if (initialized) return;

    initialized = true;

    document.addEventListener('keydown', (event) => {
        if (event.code in keys) {
            event.preventDefault();
            keys[event.code] = true;
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.code in keys) {
            event.preventDefault();
            keys[event.code] = false;
        }
    });

    window.addEventListener('blur', () => {
        for (const key in keys) {
            keys[key] = false;
        }
    });
}

export function getInput() {
    let direction = null;

    if (keys.ArrowUp) {
        direction = 'up';
    } else if (keys.ArrowDown) {
        direction = 'down';
    } else if (keys.ArrowLeft) {
        direction = 'left';
    } else if (keys.ArrowRight) {
        direction = 'right';
    }

    return {
        direction,
        fire: keys.Space
    };
}
