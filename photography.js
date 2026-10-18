(() => {
  'use strict';
  const albums = (window.PHOTO_ALBUMS || []).filter(album => album.photos?.length);
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function albumURL(album) { return `photography.html?album=${encodeURIComponent(album.id)}&v=20261018-collections`; }
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
    viewerCaption.append(el('span', 'viewer-meta', `${photo.place || viewingAlbum.place}, ${photo.country || viewingAlbum.country} · ${dateLabel(photo)}`));
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
  // Justified rows keep native image ratios and align both edges of the gallery.
  function gallery(photos, collectionCovers = false) {
    const grid = el('div', 'photo-wall');
    const view = {photos};
    const tiles = photos.map((photo, index) => {
      const button = el(collectionCovers ? 'a' : 'button', collectionCovers ? 'wall-photo collection-cover' : 'wall-photo');
      if (collectionCovers) {
        button.href = albumURL(photo.album);
        button.setAttribute('aria-label', `Explore ${photo.place} collection · ${photo.album.photos.length} ${photo.album.photos.length === 1 ? 'photograph' : 'photographs'}`);
      } else {
        button.type = 'button';
        button.setAttribute('aria-label', `Enlarge ${photo.title}`);
      }
      button.append(photograph(photo, index < 4, '(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw'));
      const caption = el('span', 'wall-caption');
      if (collectionCovers) {
        const title = el('strong', '', photo.place);
        const local = el('span', 'collection-local', photo.album.localPlace); local.lang = 'zh';
        title.append(local);
        caption.append(title, el('span', '', `${photo.year} · ${photo.album.photos.length} ${photo.album.photos.length === 1 ? 'photograph' : 'photographs'}`));
      } else {
        caption.append(el('strong', '', photo.title), el('span', '', `${photo.place} · ${photo.year}`));
      }
      button.append(caption);
      if (!collectionCovers) button.addEventListener('click', () => openViewer(view, index));
      return button;
    });
    grid.append(...tiles);
    let lastWidth = 0;
    function layout() {
      const width = grid.clientWidth;
      if (!width || width === lastWidth) return;
      lastWidth = width;
      const gap = parseFloat(getComputedStyle(grid).columnGap);
      const target = width < 600 ? 190 : 220;
      let start = 0;
      while (start < photos.length) {
        let end = start + 1;
        let sum = photos[start].width / photos[start].height;
        while (end < photos.length) {
          const nextSum = sum + photos[end].width / photos[end].height;
          const height = (width - gap * (end - start - 1)) / sum;
          const nextHeight = (width - gap * (end - start)) / nextSum;
          if (Math.abs(height - target) <= Math.abs(nextHeight - target)) break;
          sum = nextSum; end++;
        }
        const fitted = (width - 1 - gap * (end - start - 1)) / sum;
        const height = end === photos.length ? Math.min(fitted, target) : fitted;
        for (let i = start; i < end; i++) {
          tiles[i].style.width = `${height * photos[i].width / photos[i].height}px`;
          tiles[i].style.height = `${height}px`;
        }
        start = end;
      }
    }
    const observer = new ResizeObserver(layout);
    observer.observe(grid);
    // Replacing a filtered gallery must also release its resize observer.
    grid.dispose = () => observer.disconnect();
    return grid;
  }
  function albumPhotos(album) {
    return album.photos.map(photo => ({...photo, place: album.place, country: album.country, year: album.year, albumId: album.id}));
  }
  function renderCollections() {
    document.title = 'Photography · Jie-Jing Shao';
    const intro = el('div', 'photo-intro');
    const left = el('div');
    left.append(kicker('JIE-JING SHAO / PHOTOGRAPHY'), el('h1', '', 'Along the way.'));
    intro.append(left, el('p', 'photo-intro-note', 'Places, light, and moments from my travels.'));
    content.append(intro);
    const photos = albums.map(album => ({...album.photos[0], place: album.place, year: album.year, album}));
    const collections = el('section', 'photo-collections'); collections.id = 'collections';
    const heading = el('div', 'collections-heading');
    const count = el('span');
    function countLabel(selected) {
      return `${selected.length} ${selected.length === 1 ? 'collection' : 'collections'} · ${selected.reduce((total, photo) => total + photo.album.photos.length, 0)} photographs`;
    }
    count.textContent = countLabel(photos);
    count.setAttribute('role', 'status');
    heading.append(el('h2', '', 'Places & moments'), count);
    const controls = el('div', 'gallery-controls');
    let year = '';
    let wall = gallery(photos, true);
    function update() {
      const selected = photos.filter(photo => !year || photo.year === year);
      wall.dispose();
      const nextWall = gallery(selected, true);
      wall.replaceWith(nextWall); wall = nextWall;
      count.textContent = countLabel(selected);
      if (!selected.length) wall.append(el('p', 'photo-empty', 'No collections for this year.'));
    }
    function filterRow(label, options, select) {
      const row = el('div', 'photo-filters'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', label);
      row.append(el('span', 'filter-label', label));
      options.forEach(([value, text], index) => {
        const button = el('button', '', text); button.type = 'button'; button.setAttribute('aria-pressed', String(index === 0));
        button.addEventListener('click', () => {
          row.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
          select(value); update();
        });
        row.append(button);
      });
      controls.append(row);
    }
    filterRow('Year', [['', 'All years'], ...[...new Set(albums.map(a => a.year))].map(y => [y,y])], value => { year = value; });
    collections.append(heading, controls, wall); content.append(collections);
  }
  function renderAlbum(album) {
    document.title = `${album.place} ${album.year} · Photography · Jie-Jing Shao`;
    const back = el('a', 'album-back', '← All collections'); back.href = 'photography.html#collections';
    const intro = el('div', 'album-intro');
    intro.append(kicker(`${album.country} / ${album.year}`), el('h1', '', album.place));
    if (album.description) intro.append(el('p', 'album-description', album.description));
    intro.append(el('p', 'album-total', `${album.photos.length} photographs`));
    content.append(back, intro, gallery(albumPhotos(album)));
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
