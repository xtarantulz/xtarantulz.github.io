$(function () {
  const $grid = $('#worksGrid');
  const $category = $('#categoryFilter');
  const $tags = $('#tagList');
  const $catalogInfo = $('#catalogInfo');
  const $emptyState = $('#emptyState');
  const $worksCount = $('#worksCount');

  let works = [];
  let categories = [];
  let activeTag = '';

  $.getJSON('data/works.json')
      .done(function (worksData) {
        works = (Array.isArray(worksData) ? worksData : []).sort((a, b) => {
          const dateDiff = new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
          if (dateDiff !== 0) return dateDiff;
          return String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
        });

        $.getJSON('data/categories.json')
            .done(function (categoriesData) {
              categories = Array.isArray(categoriesData)
                  ? categoriesData
                  : [];

              buildFilters();
              renderWorks();
            })
            .fail(function (xhr, status, error) {
              showLoadError('categories.json', xhr, status, error);
            });
      })
      .fail(function (xhr, status, error) {
        showLoadError('works.json', xhr, status, error);
      });

  function showLoadError(file, xhr, status, error) {
    console.error('Помилка завантаження:', file, {
      status: status,
      error: error,
      response: xhr.responseText
    });

    $catalogInfo.text(
        'Не вдалося завантажити data/' + file
    );

    $emptyState.prop('hidden', false);
    $emptyState.find('strong').text('Помилка завантаження каталогу');
  }

  function formatDate(date) {
    if (!date) return '';

    const [year, month, day] = date.split('-');

    return `${day}.${month}.${year}`;
  }

  function buildFilters() {
    categories.forEach(category => {
      $('<option>')
          .val(category.id)
          .text(category.title)
          .appendTo($category);
    });

    const allTags = [
      ...new Set(works.flatMap(work => work.tags || []))
    ].sort();

    allTags.forEach(tag => {
      $('<button>', {
        type: 'button',
        class: 'tag-filter',
        text: tag,
        'data-tag': tag
      }).appendTo($tags);
    });
  }

  function renderWorks() {
    const categoryId = $category.val();

    const filtered = works.filter(work => {
      return (!categoryId || work.categoryId === categoryId)
          && (!activeTag || (work.tags || []).includes(activeTag));
    });

    $grid.empty();

    $catalogInfo.text(
        `Показано ${filtered.length} з ${works.length} робіт`
    );

    $worksCount.text(String(works.length).padStart(2, '0'));

    $emptyState.prop('hidden', filtered.length > 0);

    filtered.forEach(work => {
      const category = categories.find(
          item => item.id === work.categoryId
      );

      const $card = $('<a>', {
        class: 'work-card',
        href: work.url || `works/${work.id}/`,
        'aria-label': `Відкрити роботу: ${work.title}`
      });

      // Попередній перегляд роботи через iframe
      const $preview = $('<div>', {
        class: 'work-preview'
      });

      const workUrl = work.url || `works/${work.id}/`;
      const previewUrl = new URL(workUrl, window.location.href);

      previewUrl.searchParams.set('preview', '1');

      const $iframe = $('<iframe>', {
        src: previewUrl.href,
        title: `Попередній перегляд: ${work.title}`,
        loading: 'lazy',
        tabindex: '-1'
      });

      $iframe.on('load', function () {
        $(this).addClass('loaded');
      });

      $iframe.appendTo($preview);

      // Вміст картки
      const $content = $('<div>', {
        class: 'work-content'
      });

      const $line = $('<div>', {
        class: 'work-topline'
      });

      $('<span>', {
        class: 'work-category',
        text: category ? category.title : 'Без категорії'
      }).appendTo($line);

      $('<span>', {
        class: 'work-id',
        text: '#' + work.id
      }).appendTo($line);

      $('<div>', {
        class: 'work-title',
        text: work.title || 'Без назви'
      }).appendTo($content);

      if (work.addedAt) {
        $('<div>', {
          class: 'work-date',
          text: 'Додано: ' + formatDate(work.addedAt)
        }).appendTo($content);
      }

      const $workTags = $('<div>', {
        class: 'work-tags'
      });

      (work.tags || []).forEach(tag => {
        $('<span>', {
          class: 'work-tag',
          text: tag
        }).appendTo($workTags);
      });

      $content.append($line, $workTags);
      $card.append($preview, $content);
      $grid.append($card);
    });
  }

  // Фільтр категорій
  $category.on('change', renderWorks);

  // Фільтр тегів
  $tags.on('click', '.tag-filter', function () {
    const clicked = $(this).data('tag');

    activeTag = activeTag === clicked ? '' : clicked;

    $tags.find('.tag-filter').removeClass('active');

    if (activeTag) {
      $(this).addClass('active');
    }

    renderWorks();
  });
});
