(() => {
  'use strict';
  const albums = (window.PHOTO_ALBUMS || []).filter(album => album.photos?.length);
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function albumURL(album) { return `photography.html?album=${encodeURIComponent(album.id)}`; }
  function locationLabel(album) { return `${album.place}, ${album.country} · ${album.year}`; }
  function dateLabel(photo) {
    if (photo.date.length === 4) return photo.date;
    return new Intl.DateTimeFormat('en', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${photo.date}T00:00:00Z`));
  }
  function photograph(photo, eager = false, sizes = '(max-width: 680px) 100vw, 50vw', thumbnailOnly = false) {
    const img = el('img');
    img.width = photo.width;
    img.height = photo.height;
    img.alt = `${photo.title}${photo.localTitle ? ` / ${photo.localTitle}` : ''}`;
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    // Set selection and loading hints before assigning any image URLs (Safari).
    img.sizes = sizes;
    if (eager) img.fetchPriority = 'high';
    if (!thumbnailOnly) img.srcset = `${photo.thumb} ${photo.thumbWidth}w, ${photo.src} ${photo.largeWidth}w`;
    img.src = photo.thumb;
    return img;
  }
  const preview = document.getElementById('photography-preview');
  if (preview) {
    const chosen = ['2026-china-sayram-lake', '2025-china-nanjing', '2025-china-hongkong']
      .map(id => albums.find(a => a.id === id)).filter(Boolean);
    for (const album of albums) if (chosen.length < 3 && !chosen.includes(album)) chosen.push(album);
    const grid = preview.querySelector('.photo-preview-grid');
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    const frames = [];
    const simulations = new WeakMap();
    const simulatedAlbums = new Set(['2026-china-sayram-lake', '2025-china-nanjing', '2025-china-hongkong']);
    let motionModule;
    function loadMotionModule() {
      if (!motionModule) motionModule = new Promise((resolve, reject) => {
        const script = el('script');
        script.src = 'photography-motion.js?v=20261018-fixed-frame';
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
      return motionModule;
    }
    async function prepareMotion(frame) {
      if (simulations.has(frame) || frame.dataset.preparing || frame.dataset.failed === 'true') return;
      frame.dataset.preparing = 'true';
      try {
        const img = frame.querySelector('img');
        await img.decode();
        await loadMotionModule();
        const renderer = window.createPhotoMotion(frame, img, frame.dataset.album, () => {
          frame.dataset.failed = 'true';
          updateMotion();
        });
        if (renderer) simulations.set(frame, renderer);
        else frame.dataset.failed = 'true';
      } catch { frame.dataset.failed = 'true'; }
      updateMotion();
    }
    function updateMotion() {
      const reduced = motionPreference.matches || connection?.saveData;
      frames.forEach(frame => {
        const video = frame.querySelector('video');
        const running = !reduced && !document.hidden
          && frame.dataset.visible === 'true' && frame.dataset.failed !== 'true';
        if (!video) {
          const renderer = simulations.get(frame);
          if (renderer) renderer.setRunning(running, !!reduced);
          else if (running && frame.dataset.motion === 'true') prepareMotion(frame);
          return;
        }
        frame.dataset.running = String(running);
        if (reduced) frame.classList.remove('has-video');
        if (!running) { video.pause(); return; }
        // No video URL is assigned until this card is visible and motion is allowed.
        if (!video.hasAttribute('src')) video.src = video.dataset.src;
        if (video.paused && frame.dataset.pending !== 'true') {
          frame.dataset.pending = 'true';
          video.play().then(() => {
            if (frame.dataset.running !== 'true') video.pause();
          }).catch(() => {
            // Keep the original still if the browser blocks autoplay.
            frame.dataset.failed = 'true';
            frame.classList.remove('has-video');
            updateMotion();
          }).finally(() => { frame.dataset.pending = 'false'; });
        }
      });
    }
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      entries.forEach(entry => { entry.target.dataset.visible = String(entry.isIntersecting); });
      updateMotion();
    }) : null;
    chosen.forEach(album => {
      const link = el('a', 'photo-preview-card');
      link.href = albumURL(album);
      // The original photograph remains visible until an actual motion clip plays.
      const frame = el('span', 'photo-preview-frame');
      frame.dataset.album = album.id;
      frame.dataset.motion = String(!!album.previewVideo || simulatedAlbums.has(album.id));
      const img = photograph(album.photos[0], false, '(max-width: 600px) 90vw, 300px', true);
      frame.append(img);
      if (album.previewVideo) {
        const video = el('video');
        video.muted = true;
        video.defaultMuted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'none';
        video.disablePictureInPicture = true;
        video.setAttribute('aria-hidden', 'true');
        video.tabIndex = -1;
        video.dataset.src = album.previewVideo;
        video.addEventListener('playing', () => {
          if (frame.dataset.running === 'true') frame.classList.add('has-video');
          else video.pause();
        });
        video.addEventListener('error', () => {
          frame.dataset.failed = 'true';
          frame.classList.remove('has-video');
          updateMotion();
        });
        frame.append(video);
      }
      link.append(frame, el('span', 'preview-place', album.place), el('span', 'preview-year', `${album.country} · ${album.year}`));
      grid.append(link);
      frames.push(frame);
      if (observer) observer.observe(frame);
      else frame.dataset.visible = 'true';
    });
    document.addEventListener('visibilitychange', updateMotion);
    motionPreference.addEventListener('change', updateMotion);
    connection?.addEventListener('change', updateMotion);
    updateMotion();
    if (!albums.length) preview.remove();
    return;
  }

  const content = document.getElementById('photo-content');
  if (!content) return;
  const dialog = document.querySelector('.photo-lightbox');
  const viewerImage = dialog.querySelector('img');
  const loading = dialog.querySelector('.viewer-loading');
  const viewerCaption = document.getElementById('viewer-caption');
  const previous = dialog.querySelector('.viewer-prev');
  const next = dialog.querySelector('.viewer-next');
  let viewingAlbum, viewingIndex = 0;
  function updateViewer() {
    const photo = viewingAlbum.photos[viewingIndex];
    viewerImage.style.visibility = 'hidden';
    loading.textContent = 'Loading photograph…';
    loading.hidden = false;
    viewerImage.onload = () => { viewerImage.style.visibility = 'visible'; loading.hidden = true; };
    viewerImage.onerror = () => { loading.textContent = 'This photograph could not load. Please try again.'; };
    viewerImage.src = photo.src;
    viewerImage.alt = `${photo.title} / ${photo.localTitle || viewingAlbum.place}`;
    viewerCaption.replaceChildren(el('strong', '', photo.title));
    if (photo.localTitle) {
      const title = el('span', 'viewer-local-title', photo.localTitle);
      title.lang = 'zh';
      viewerCaption.append(title);
    }
    viewerCaption.append(el('span', 'viewer-meta', `${viewingAlbum.place}, ${viewingAlbum.country} · ${dateLabel(photo)}`));
    document.getElementById('viewer-count').textContent = `${viewingIndex + 1} / ${viewingAlbum.photos.length}`;
    previous.disabled = viewingIndex === 0;
    next.disabled = viewingIndex === viewingAlbum.photos.length - 1;
  }
  function openViewer(album, index) {
    viewingAlbum = album;
    viewingIndex = index;
    updateViewer();
    dialog.showModal();
    document.body.classList.add('viewer-open');
  }
  function step(amount) {
    const index = viewingIndex + amount;
    if (index < 0 || index >= viewingAlbum.photos.length) return;
    viewingIndex = index;
    updateViewer();
  }
  dialog.querySelector('.viewer-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { document.body.classList.remove('viewer-open'); viewerImage.removeAttribute('src'); });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  let touchStart;
  viewerImage.addEventListener('touchstart', event => { touchStart = event.touches.length === 1 ? event.touches[0].clientX : null; }, {passive: true});
  viewerImage.addEventListener('touchend', event => {
    if (touchStart == null) return;
    const distance = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(distance) > 55) step(distance < 0 ? 1 : -1);
    touchStart = null;
  }, {passive: true});

  function kicker(text) { return el('p', 'photo-kicker', text); }
  function albumCard(album) {
    const link = el('a', 'album-card');
    link.href = albumURL(album);
    const frame = el('div', 'album-cover');
    frame.append(photograph(album.photos[0]), el('span', 'album-count', `${album.photos.length} ${album.photos.length === 1 ? 'photograph' : 'photographs'}`));
    const caption = el('div', 'album-caption');
    const heading = el('h3', '', album.place);
    const local = el('span', 'album-local', album.localPlace); local.lang = 'zh';
    heading.append(local);
    caption.append(heading, el('span', 'album-year', album.year));
    link.append(frame, caption, el('p', 'album-country', album.country));
    return link;
  }
  function renderCollections() {
    document.title = 'Photography · Jie-Jing Shao';
    const intro = el('div', 'photo-intro');
    const left = el('div');
    left.append(kicker('JIE-JING SHAO / PHOTOGRAPHY'), el('h1', '', 'Along the way.'));
    const right = el('div', 'photo-intro-note');
    right.append(el('p', '', 'A few things I stopped to look at.'), el('p', '', 'Photographs from conference trips, travels, and the places in between.'));
    intro.append(left, right); content.append(intro);
    if (!albums.length) { content.append(el('p', 'photo-empty', 'New photographs will appear here soon.')); return; }
    const album = albums[0], photo = album.photos[0];
    const feature = el('figure', 'photo-feature');
    const button = el('button', 'feature-image'); button.type = 'button';
    button.setAttribute('aria-label', `Enlarge ${photo.title}`);
    const img = photograph(photo, true, '(max-width: 1240px) 94vw, 1180px');
    button.append(img); button.addEventListener('click', () => openViewer(album, 0));
    const caption = el('figcaption');
    const link = el('a', '', `${photo.title} ↗`); link.href = albumURL(album);
    caption.append(link, el('span', '', locationLabel(album)));
    feature.append(button, caption); content.append(feature);
    const collections = el('section', 'photo-collections'); collections.id = 'collections';
    const heading = el('div', 'collections-heading');
    heading.append(el('h2', '', 'Places & moments'), el('span', '', `${albums.length} collections · ${albums.reduce((n, a) => n + a.photos.length, 0)} photographs`));
    const filters = el('div', 'photo-filters'); filters.setAttribute('aria-label', 'Filter collections by year');
    const grid = el('div', 'album-grid');
    const status = el('p', 'photo-filter-status'); status.setAttribute('role', 'status');
    ['All years', ...new Set(albums.map(a => a.year))].forEach((year, i) => {
      const button = el('button', '', year); button.type = 'button'; button.setAttribute('aria-pressed', String(i === 0));
      button.addEventListener('click', () => {
        filters.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
        const selected = albums.filter(a => i === 0 || a.year === year);
        grid.replaceChildren(...selected.map(albumCard));
        status.textContent = `${selected.length} ${selected.length === 1 ? 'collection' : 'collections'} shown`;
      }); filters.append(button);
    });
    grid.append(...albums.map(albumCard));
    collections.append(heading, filters, status, grid); content.append(collections);
  }
  function renderAlbum(album) {
    document.title = `${album.place} ${album.year} · Photography · Jie-Jing Shao`;
    const back = el('a', 'album-back', '← All collections'); back.href = 'photography.html#collections';
    const intro = el('div', 'album-intro');
    intro.append(kicker(`${album.country} / ${album.year}`), el('h1', '', album.place));
    const local = el('p', 'album-local-heading', album.localPlace); local.lang = 'zh'; intro.append(local);
    if (album.description) intro.append(el('p', 'album-description', album.description));
    intro.append(el('p', 'album-total', `${album.photos.length} ${album.photos.length === 1 ? 'photograph' : 'photographs'}`));
    content.append(back, intro);
    const grid = el('div', 'photograph-grid');
    album.photos.forEach((photo, index) => {
      const figure = el('figure', 'photograph');
      const button = el('button', 'photograph-button'); button.type = 'button'; button.setAttribute('aria-label', `Enlarge ${photo.title}`);
      button.append(photograph(photo, index < 2)); button.addEventListener('click', () => openViewer(album, index));
      const caption = el('figcaption');
      const heading = el('h2', '', photo.title);
      if (photo.localTitle) { const local = el('span', 'photograph-local', photo.localTitle); local.lang = 'zh'; heading.append(local); }
      const date = el('time', '', dateLabel(photo)); date.dateTime = photo.date;
      caption.append(heading, date); figure.append(button, caption); grid.append(figure);
    });
    content.append(grid);
    const end = el('a', 'album-end', 'Explore all collections →'); end.href = 'photography.html#collections'; content.append(end);
  }
  const requested = new URLSearchParams(location.search).get('album');
  const selected = albums.find(a => a.id === requested);
  if (selected) renderAlbum(selected);
  else {
    if (requested) content.append(el('p', 'photo-notice', 'This collection is not available yet. Explore the collections below.'));
    renderCollections();
  }
  if (location.hash === '#collections') document.getElementById('collections')?.scrollIntoView();
})();
