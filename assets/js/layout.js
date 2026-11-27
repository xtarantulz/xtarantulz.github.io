
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
                    new URL(`partials/${file}`, rootUrl)
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

        const catalogLink = document.querySelector('.catalog-link');

        if (catalogLink) {
            catalogLink.href = rootUrl.href;
            catalogLink.hidden = Boolean(
                document.querySelector('#worksGrid')
            );
        }

        const brand = document.querySelector('.brand');

        if (brand) {
            brand.href = rootUrl.href;
        }

    });
})();
