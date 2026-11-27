const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    Space: false
};

const touchState = {
    direction: null,
    fire: false
};

let initialized = false;

export function initControls() {
    if (initialized) return;

    initialized = true;

    // Клавіатура
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
        touchState.direction = null;
        touchState.fire = false;
        updateDpadVisual(null);
    });

    // Сенсорний контролер
    initTouchControls();
}

function initTouchControls() {
    const dpad = document.getElementById('touch-dpad');
    const fireBtn = document.getElementById('touch-fire');
    const pauseBtn = document.getElementById('touch-pause');

    if (dpad) {
        let activePointerId = null;

        const resolveDirection = (clientX, clientY) => {
            const rect = dpad.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = clientX - cx;
            const dy = clientY - cy;

            // Мертва зона у самому центрі хрестовини
            if (Math.hypot(dx, dy) < 14) {
                return null;
            }

            if (Math.abs(dx) > Math.abs(dy)) {
                return dx > 0 ? 'right' : 'left';
            }
            return dy > 0 ? 'down' : 'up';
        };

        dpad.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            activePointerId = e.pointerId;
            dpad.setPointerCapture(e.pointerId);

            const dir = resolveDirection(e.clientX, e.clientY);
            touchState.direction = dir;
            updateDpadVisual(dir);
        });

        dpad.addEventListener('pointermove', (e) => {
            if (e.pointerId !== activePointerId) return;
            e.preventDefault();

            const dir = resolveDirection(e.clientX, e.clientY);
            if (touchState.direction !== dir) {
                touchState.direction = dir;
                updateDpadVisual(dir);
            }
        });

        const releaseDpad = (e) => {
            if (e.pointerId !== activePointerId) return;
            activePointerId = null;
            touchState.direction = null;
            updateDpadVisual(null);
        };

        dpad.addEventListener('pointerup', releaseDpad);
        dpad.addEventListener('pointercancel', releaseDpad);
    }

    if (fireBtn) {
        fireBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            fireBtn.setPointerCapture(e.pointerId);
            touchState.fire = true;
            fireBtn.classList.add('is-pressed');
        });

        const releaseFire = (e) => {
            e.preventDefault();
            touchState.fire = false;
            fireBtn.classList.remove('is-pressed');
        };

        fireBtn.addEventListener('pointerup', releaseFire);
        fireBtn.addEventListener('pointercancel', releaseFire);
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            const startButton = document.getElementById('start-button');
            if (startButton) {
                startButton.click();
            }
        });
    }
}

function updateDpadVisual(activeDir) {
    const buttons = document.querySelectorAll('.dpad__btn');
    buttons.forEach(btn => {
        btn.classList.toggle('is-pressed', btn.dataset.dir === activeDir);
    });
}

export function getInput() {
    let direction = touchState.direction;

    if (!direction) {
        if (keys.ArrowUp || keys.KeyW) {
            direction = 'up';
        } else if (keys.ArrowDown || keys.KeyS) {
            direction = 'down';
        } else if (keys.ArrowLeft || keys.KeyA) {
            direction = 'left';
        } else if (keys.ArrowRight || keys.KeyD) {
            direction = 'right';
        }
    }

    return {
        direction,
        fire: keys.Space || touchState.fire
    };
}
