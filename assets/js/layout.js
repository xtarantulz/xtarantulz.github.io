(function () {
    const scriptUrl = document.currentScript.src;
    const rootUrl = new URL('../../', scriptUrl);

    const isPreview = new URLSearchParams(
        window.location.search
    ).get('preview') === '1';

    if (isPreview) {
        document.documentElement.classList.add('preview-mode');
    }

    document.addEventListener('DOMContentLoaded', async function () {

        async function loadComponent(selector, file) {
            const container = document.querySelector(selector);

            if (!container) {
                return;
            }

            try {
                const response = await fetch(
                    new URL(`partials/${file}`, rootUrl),
                    { cache: 'no-store' }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                container.outerHTML = await response.text();

            } catch (error) {
                console.error(`Помилка завантаження ${file}:`, error);
            }
        }

        if (!isPreview) {
            await Promise.all([
                loadComponent('#siteHeader', 'header.html'),
                loadComponent('#siteFooter', 'footer.html')
            ]);
        } else {
            document.querySelector('#siteHeader')?.remove();
            document.querySelector('#siteFooter')?.remove();

            document.querySelectorAll('[data-preview-hide]')
                .forEach(element => element.remove());
        }

        const isCatalogPage = Boolean(document.querySelector('#worksGrid'));

        const catalogLink = document.querySelector('.catalog-link');
        if (catalogLink) {
            catalogLink.href = rootUrl.href;
            catalogLink.hidden = isCatalogPage;
        }

        const brand = document.querySelector('.brand');
        if (brand) {
            brand.href = rootUrl.href;
        }

        initFullscreenButton();
    });

    function initFullscreenButton() {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;

        let btn = document.getElementById('fullscreenBtn');

        if (!btn) {
            btn = document.createElement('button');
            btn.className = 'fullscreen-btn';
            btn.id = 'fullscreenBtn';
            btn.type = 'button';
            btn.setAttribute('aria-label', 'На весь екран');
            btn.innerHTML = `
                <svg class="fullscreen-icon fullscreen-icon--enter" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
                <svg class="fullscreen-icon fullscreen-icon--exit" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="4 14 10 14 10 20"></polyline>
                    <polyline points="20 10 14 10 14 4"></polyline>
                    <line x1="14" y1="10" x2="21" y2="3"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
                <span class="fullscreen-label">На весь екран</span>
            `;
            headerRight.prepend(btn);
        }

        btn.hidden = false;

        const label = btn.querySelector('.fullscreen-label');
        const rootEl = document.documentElement;

        const isNativeFullscreen = () => Boolean(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement
        );

        const isFullscreenActive = () => (
            isNativeFullscreen() ||
            rootEl.classList.contains('is-fullscreen')
        );

        const updateButtonState = () => {
            const active = isFullscreenActive();
            rootEl.classList.toggle('is-fullscreen', active);
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-label', active ? 'Вийти з повного екрану' : 'На весь екран');
            if (label) {
                label.textContent = active ? 'Згорнути' : 'На весь екран';
            }
        };

        btn.addEventListener('click', async () => {
            btn.blur();

            if (isFullscreenActive()) {
                if (isNativeFullscreen()) {
                    try {
                        if (document.exitFullscreen) {
                            await document.exitFullscreen();
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        }
                    } catch {}
                }
                rootEl.classList.remove('is-fullscreen');
                updateButtonState();
                return;
            }

            try {
                if (rootEl.requestFullscreen) {
                    await rootEl.requestFullscreen();
                } else if (rootEl.webkitRequestFullscreen) {
                    rootEl.webkitRequestFullscreen();
                } else {
                    rootEl.classList.add('is-fullscreen');
                }
            } catch {
                rootEl.classList.add('is-fullscreen');
            }

            updateButtonState();
        });

        document.addEventListener('fullscreenchange', updateButtonState);
        document.addEventListener('webkitfullscreenchange', updateButtonState);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && rootEl.classList.contains('is-fullscreen') && !isNativeFullscreen()) {
                rootEl.classList.remove('is-fullscreen');
                updateButtonState();
            }
        });
    }
})();
