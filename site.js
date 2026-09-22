const publicationButtons = [...document.querySelectorAll('[data-pub-view]')];
const viewport = document.getElementById('pubs-viewport');
const sections = [...document.querySelectorAll('main > section')];
const navigation = [...document.querySelectorAll('.nav-links a')];
const homepageSections = new Set(['home', 'news', 'opportunities', 'research']);
function showPublicationView(button) {
  viewport.replaceChildren(document.getElementById(button.dataset.template).content.cloneNode(true));
  // data-view is the styling contract: Selected = image cards; date/topic = text rows.
  // Never infer thumbnails from titles or inject images into the complete lists.
  viewport.dataset.view = button.dataset.pubView;
  if (button.dataset.pubView === 'selected') {
    viewport.querySelectorAll('.pub-thumbnail').forEach(img => {
      const link = document.createElement('a');
      link.className = 'pub-image-link';
      link.href = img.getAttribute('src');
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label', `View full-size image: ${img.alt} (opens in a new tab)`);
      link.title = 'View full-size image';
      img.loading = 'lazy';
      img.replaceWith(link);
      link.append(img);
    });
    // Keep optional highlights above the consistently positioned resource links.
    viewport.querySelectorAll('.pub-content').forEach(content => {
      const links = content.querySelector('.pub-links');
      if (links) content.append(links);
    });
  }
  // Derive jump tags from headings so labels and destinations stay in sync.
  if (button.dataset.pubView === 'topic') {
    const topics = document.createElement('nav');
    topics.className = 'publication-topics';
    topics.setAttribute('aria-label', 'Jump to publication topic');
    viewport.querySelectorAll('.pub-topic').forEach(heading => {
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.className = heading.className.replace('pub-topic', 'publication-topic-tag');
      link.textContent = heading.textContent;
      topics.append(link);
    });
    viewport.prepend(topics);
  }
  publicationButtons.forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });
  viewport.setAttribute('aria-labelledby', button.id);
}
publicationButtons.forEach((button, index) => {
  button.id = `view-${button.dataset.pubView}`;
  button.setAttribute('role', 'tab');
  button.setAttribute('aria-controls', 'pubs-viewport');
  button.addEventListener('click', () => showPublicationView(button));
  button.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % publicationButtons.length;
    if (event.key === 'ArrowLeft') next = (index + publicationButtons.length - 1) % publicationButtons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = publicationButtons.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    publicationButtons[next].focus();
    showPublicationView(publicationButtons[next]);
  });
});
viewport.setAttribute('role', 'tabpanel');
viewport.tabIndex = 0;
showPublicationView(publicationButtons[0]);

function route() {
  const hash = location.hash.slice(1) || 'home';
  // Topic deep links must restore the topic template before resolving the anchor.
  if (hash.startsWith('topic-') && !document.getElementById(hash)) {
    showPublicationView(publicationButtons.find(button => button.dataset.pubView === 'topic'));
  }
  if (hash.startsWith('pub-') && !document.getElementById(hash)) {
    showPublicationView(publicationButtons[0]);
  }
  const target = document.getElementById(hash);
  const parent = target?.closest('main > section');
  const page = homepageSections.has(parent?.id) ? 'home' : parent?.id || 'home';
  sections.forEach(section => {
    section.hidden = page === 'home' ? !homepageSections.has(section.id) : section.id !== page;
  });
  navigation.forEach(link => {
    if (link.hash === `#${page}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const label = navigation.find(link => link.hash === `#${page}`)?.textContent || 'Homepage';
  document.title = `${label} · Jie-Jing Shao`;
  if (target && target !== parent && hash !== 'home') {
    requestAnimationFrame(() => target.scrollIntoView({
      block: 'start',
      behavior: hash.startsWith('topic-') && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant',
    }));
  } else {
    window.scrollTo({top: 0, behavior: 'instant'});
  }
}
window.addEventListener('hashchange', route);
route();
