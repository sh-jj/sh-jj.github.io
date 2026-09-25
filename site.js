const publicationToolbar = document.querySelector('.pub-toolbar');
const topicTemplate = document.getElementById('template-topic');
const allPublications = [...document.getElementById('template-date').content.querySelectorAll('.pub-card')];
function papersForTopic(id) {
  return allPublications.filter(paper => paper.dataset.topics.split(/\s+/).includes(id.replace(/^topic-/, '')));
}
function createPaperMeta(paper) {
  const citation = paper.querySelector('.paper-citation');
  const rawVenue = citation?.querySelector('b')?.textContent.trim()
    || citation?.textContent.trim().split(/[.(]/, 1)[0].trim();
  const venue = rawVenue?.replace(/'([0-9]{2})\b/g, (_, year) => ` ${Number(year) >= 70 ? '19' : '20'}${year}`);
  const topicIds = (paper.dataset.topics || '').split(/\s+/).filter(Boolean);
  const meta = document.createElement('div');
  meta.className = 'pub-paper-meta';
  if (venue) {
    const badge = document.createElement('span');
    badge.className = 'pub-paper-venue';
    badge.textContent = venue;
    meta.append(badge);
  }
  const tags = document.createElement('div');
  tags.className = 'pub-paper-topics';
  tags.setAttribute('aria-label', 'Paper topics');
  topicTemplate.content.querySelectorAll('.pub-topic').forEach(heading => {
    if (!topicIds.includes(heading.id.replace(/^topic-/, ''))) return;
    const tag = document.createElement('span');
    tag.className = heading.className.replace('pub-topic', 'pub-paper-topic');
    tag.textContent = heading.textContent;
    tags.append(tag);
  });
  if (tags.childElementCount) meta.append(tags);
  return meta;
}
topicTemplate.content.querySelectorAll('.pub-topic').forEach(heading => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = heading.className.replace('pub-topic', '').trim();
  button.dataset.pubView = 'topic';
  button.dataset.template = 'template-topic';
  button.dataset.topic = heading.id;
  button.textContent = heading.textContent;
  publicationToolbar.append(button);
});
const publicationButtons = [...publicationToolbar.querySelectorAll('[data-pub-view]')];
publicationButtons.forEach(button => {
  const template = document.getElementById(button.dataset.template).content;
  const total = button.dataset.topic
    ? papersForTopic(button.dataset.topic).length
    : template.querySelectorAll('.pub-card, .pub-item-with-img').length;
  const count = document.createElement('span');
  count.className = 'publication-tag-count';
  count.textContent = `(${total})`;
  button.append(' ', count);
});
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
      // Reuse the canonical paper classification and the toolbar's color classes.
      // Selected-only preprints keep their classification on the selected card.
      const normalizeTitle = title => title.replace(/\s+/g, ' ').trim().replace(/\.$/, '');
      const title = normalizeTitle(content.querySelector('.paper-title').textContent);
      const paper = allPublications.find(item =>
        normalizeTitle(item.querySelector('.paper-title').textContent) === title);
      const topicIds = (paper?.dataset.topics || content.closest('li').dataset.topics || '').split(/\s+/);
      const tags = document.createElement('div');
      tags.className = 'pub-paper-topics';
      tags.setAttribute('aria-label', 'Paper topics');
      topicTemplate.content.querySelectorAll('.pub-topic').forEach(heading => {
        if (!topicIds.includes(heading.id.replace(/^topic-/, ''))) return;
        const tag = document.createElement('span');
        tag.className = heading.className.replace('pub-topic', 'pub-paper-topic');
        tag.textContent = heading.textContent;
        tags.append(tag);
      });
      if (tags.childElementCount) {
        const meta = document.createElement('div');
        meta.className = 'pub-paper-meta';
        const citation = content.querySelector('.paper-citation');
        if (citation) {
          citation.replaceWith(meta);
          meta.append(citation, tags);
        } else {
          meta.append(tags);
          content.prepend(meta);
        }
      }
    });
  }
  if (button.dataset.topic) {
    const heading = viewport.querySelector(`#${button.dataset.topic}`);
    const list = document.createElement('ul');
    list.append(...papersForTopic(button.dataset.topic).map(paper => paper.cloneNode(true)));
    viewport.replaceChildren(heading, list);
  }
  if (button.dataset.pubView !== 'selected') {
    viewport.querySelectorAll('.pub-card').forEach(paper => {
      const title = paper.querySelector('.paper-title');
      if (title) title.before(createPaperMeta(paper));
    });
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
  button.id = `view-${button.dataset.topic || button.dataset.pubView}`;
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
  if (hash.startsWith('topic-') && ![...viewport.querySelectorAll('.pub-topic')].some(heading => heading.id === hash)) {
    const button = publicationButtons.find(button => button.dataset.topic === hash);
    if (button) showPublicationView(button);
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
