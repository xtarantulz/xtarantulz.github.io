
const listeners = new Map();

export const events = {
    on(event, callback) {
        if (!listeners.has(event)) {
            listeners.set(event, new Set());
        }

        listeners.get(event).add(callback);

        // Возвращаем функцию для отписки
        return () => this.off(event, callback);
    },

    off(event, callback) {
        const callbacks = listeners.get(event);

        if (!callbacks) return;

        callbacks.delete(callback);

        if (callbacks.size === 0) {
            listeners.delete(event);
        }
    },

    emit(event, data = null) {
        const callbacks = listeners.get(event);

        if (!callbacks) return;

        callbacks.forEach(callback => callback(data));
    },

    clear(event = null) {
        if (event) {
            listeners.delete(event);
            return;
        }

        listeners.clear();
    }
};
