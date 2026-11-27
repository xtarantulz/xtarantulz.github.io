
document.addEventListener('DOMContentLoaded', function () {
    // --- Фонова музика ---
    const backgroundMusic = document.getElementById('backgroundMusic');
    const musicButton = document.getElementById('musicButton');

    if (!backgroundMusic) {
        console.warn('Елемент backgroundMusic не знайдено');
        return;
    }

    backgroundMusic.volume = 0.4;

    if (musicButton) {
        musicButton.textContent = '▶ Увімкнути музику';

        musicButton.addEventListener('click', async function () {
            try {
                if (backgroundMusic.paused) {
                    await backgroundMusic.play();
                    musicButton.textContent = '❚❚ Вимкнути музику';
                } else {
                    backgroundMusic.pause();
                    musicButton.textContent = '▶ Увімкнути музику';
                }
            } catch (error) {
                console.error('Помилка відтворення:', error);
            }
        });
    } else {
        console.warn('Кнопку musicButton не знайдено');
    }

    backgroundMusic.addEventListener('error', function () {
        console.error('Помилка завантаження MP3:', backgroundMusic.error);
    });

    backgroundMusic.addEventListener('ended', function () {
        if (musicButton) {
            musicButton.textContent = '▶ Увімкнути музику';
        }
    });
});
