// Venue tags and interactive details follow the presentation at zhiningliu.com.
// Titles, venues, topics, highlights, and resources reuse the publication templates.
(() => {
  const insights = {
    nsi: 'Interaction traces become logic-grounded programs with explicit control flow, enabling reusable skills that adapt to unseen goals.',
    chinatravel: 'A compositional constraint language makes open-ended travel requirements executable and supports fine-grained evaluation of language agents.',
    'nesy-planning': 'Symbolic verification provides constraint-level feedback to refine value estimates and guide LLM planning beyond self-evaluation.',
    abil: 'Abductive reasoning grounds demonstrations in task-relevant symbols, supporting data-efficient imitation and long-horizon planning.',
    re2: 'Reflection and re-execution support embodied decision making.',
    verification: 'Checking predictions against logical rules enables neuro-symbolic learning from unlabeled data without relying on label-based reasoning.',
    shortcuts: 'Knowledge-base complexity, sample size, and the hypothesis space determine shortcut risk; consistency optimization can help reduce it.',
    'safe-abl': 'Selectively using and refining logical rules protects abductive learning from inaccurate knowledge.',
    log: 'Active sample selection and causal invariant learning work together to improve out-of-distribution generalization with few queried labels.',
    auto: 'Detecting distribution shifts and selecting informative samples enables model adaptation under a limited labeling budget.',
    sra: 'Reverse dynamics generate trajectories toward expert-observed states, helping imitation policies generalize beyond their demonstrations.',
    skilltracer: 'Structural failure attribution guides the refinement of agentic skills for long-horizon web tasks.',
    'travel-review': 'The travel planning challenge brings together benchmark design, participant approaches, and evaluation of agents under compositional constraints.',
    formalimg: 'Structural compositional evaluation probes whether text-to-image models can generalize to new combinations of concepts and relations.',
    nesyproact: 'A symbolic decision interface and online verification use execution feedback to keep web-agent planning grounded under partial observability.',
    'knowledge-augmentation': 'A small amount of concept supervision enriches the knowledge base to reduce neuro-symbolic reasoning shortcuts with improved data efficiency.',
    'open-set': 'Multi-source sample generation and supervised contrastive learning encourage invariant representations for open-set recognition under covariate shift.',
  };
  const canonical = document.getElementById('template-date').content;
  const selected = [...document.getElementById('template-selected').content.querySelectorAll('.pub-item-with-img')];
  const topicNames = new Map([...document.getElementById('template-topic').content.querySelectorAll('.pub-topic')]
    .map(heading => [heading.id.replace('topic-', ''), heading.textContent]));
  const triggers = [...document.querySelectorAll('.research-paper')];
  const normalize = text => text.replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  const papers = new Map();
  triggers.forEach(trigger => {
    const id = trigger.dataset.paperId;
    const paper = canonical.querySelector(`[data-paper-id="${id}"]`);
    const title = normalize(paper.querySelector('.paper-title').textContent);
    const venue = paper.querySelector('.paper-citation b').textContent.trim();
    const year = venue.match(/'(\d{2})\b/)?.[1]
      || paper.querySelector('.paper-citation').textContent.match(/\b20(\d{2})\b/)?.[1];
    const venueName = venue.replace(/'\d{2}\b|\s+20\d{2}\b/, '').trim();
    const shortVenue = {'Frontiers of Computer Science': 'FCS', 'Machine Learning': 'MLJ'}[venueName] || venueName;
    const label = venueName === 'Findings of EMNLP' ? `EMNLP’${year} Findings` : `${shortVenue}’${year}`;
    const featured = selected.find(item => normalize(item.querySelector('.paper-title').textContent) === title);
    const links = new Map();
    const addLink = (anchor, label) => {
      if (anchor) links.set(anchor.getAttribute('href'), label);
    };
    addLink(paper.querySelector('.paper-title a'), 'Paper');
    paper.querySelectorAll('.paper-citation a').forEach(anchor => addLink(anchor, anchor.textContent.trim()));
    featured?.querySelectorAll('.pub-links a').forEach(anchor => addLink(anchor, anchor.textContent.trim()));
    papers.set(id, {
      title,
      venue: `${venueName} 20${year}`,
      insight: insights[id],
      topics: paper.dataset.topics.split(/\s+/).map(topic => topicNames.get(topic)).filter(Boolean),
      highlights: [...(featured?.querySelectorAll('.pub-highlight') || [])],
      links,
    });
    trigger.textContent = label;
    trigger.setAttribute('aria-label', `${trigger.textContent}: ${title}`);
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'research-paper-details');
  });

  const panel = document.createElement('aside');
  panel.id = 'research-paper-details';
  panel.className = 'research-popover';
  panel.hidden = true;
  panel.tabIndex = -1;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'research-paper-title');
  panel.innerHTML = `
    <button class="research-popover-close" type="button" aria-label="Close paper details">×</button>
    <div class="research-popover-venue"></div>
    <h3 id="research-paper-title"></h3>
    <div class="research-popover-highlights" aria-label="Paper highlights" hidden></div>
    <p class="research-popover-insight"><strong>Core insight</strong><span></span></p>
    <div class="research-popover-topics" aria-label="Paper topics"></div>
    <div class="research-popover-resources"><strong>Resources</strong><div class="research-popover-links"></div></div>
  `;
  document.body.append(panel);
  const venue = panel.querySelector('.research-popover-venue');
  const title = panel.querySelector('h3');
  const highlights = panel.querySelector('.research-popover-highlights');
  const insight = panel.querySelector('.research-popover-insight span');
  const topics = panel.querySelector('.research-popover-topics');
  const resources = panel.querySelector('.research-popover-links');
  let active = null;
  let closeTimer;
  let restoringFocus = false;
  let suppressHover = false;

  function position() {
    const anchor = active.getBoundingClientRect();
    const spaceBelow = innerHeight - anchor.bottom - 22;
    const spaceAbove = anchor.top - 22;
    panel.style.maxHeight = `${innerHeight - 24}px`;
    const naturalHeight = panel.getBoundingClientRect().height;
    const useBelow = naturalHeight <= spaceBelow || spaceBelow >= spaceAbove;
    panel.style.maxHeight = `${Math.max(0, useBelow ? spaceBelow : spaceAbove)}px`;
    const bounds = panel.getBoundingClientRect();
    const left = Math.max(12, Math.min(anchor.left + anchor.width / 2 - bounds.width / 2, innerWidth - bounds.width - 12));
    const top = useBelow ? anchor.bottom + 10 : Math.max(12, anchor.top - bounds.height - 10);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function show(trigger) {
    clearTimeout(closeTimer);
    if (restoringFocus) return;
    const paper = papers.get(trigger.dataset.paperId);
    active?.setAttribute('aria-expanded', 'false');
    active = trigger;
    venue.textContent = paper.venue;
    title.textContent = paper.title;
    insight.textContent = paper.insight;
    topics.replaceChildren(...paper.topics.map(text => {
      const tag = document.createElement('span');
      tag.textContent = text;
      return tag;
    }));
    highlights.replaceChildren(...paper.highlights.map(item => item.cloneNode(true)));
    highlights.hidden = !paper.highlights.length;
    const labels = {Code: 'GitHub', Webpage: 'Project', 'Project Page': 'Project'};
    resources.replaceChildren(...[...paper.links].map(([href, label]) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = labels[label] || label;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      return link;
    }));
    resources.parentElement.hidden = paper.links.size === 0;
    panel.hidden = false;
    panel.scrollTop = 0;
    trigger.setAttribute('aria-expanded', 'true');
    position();
  }

  function close(restoreFocus = false) {
    clearTimeout(closeTimer);
    const previous = active;
    previous?.setAttribute('aria-expanded', 'false');
    active = null;
    panel.hidden = true;
    if (restoreFocus && previous) {
      restoringFocus = true;
      previous.focus({preventScroll: true});
      restoringFocus = false;
    }
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (!panel.contains(document.activeElement) && document.activeElement !== active) close();
    }, 240);
  }

  triggers.forEach(trigger => {
    trigger.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && !suppressHover) show(trigger);
    });
    trigger.addEventListener('pointerleave', scheduleClose);
    trigger.addEventListener('focus', () => show(trigger));
    trigger.addEventListener('blur', scheduleClose);
    trigger.addEventListener('click', () => {
      show(trigger);
      // Clicking (including touch or Enter) makes the resources keyboard-accessible.
      panel.focus({preventScroll: true});
    });
  });
  panel.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  panel.addEventListener('pointerleave', scheduleClose);
  panel.addEventListener('focusin', () => clearTimeout(closeTimer));
  panel.addEventListener('focusout', scheduleClose);
  panel.querySelector('button').addEventListener('click', () => {
    suppressHover = true;
    close(true);
  });
  document.addEventListener('pointermove', event => {
    if (!suppressHover) return;
    suppressHover = false;
    const trigger = event.target.closest('.research-paper');
    if (trigger && event.pointerType !== 'touch') show(trigger);
  });
  document.addEventListener('pointerdown', event => {
    if (!panel.contains(event.target) && !event.target.closest('.research-paper')) close();
  });
  document.addEventListener('focusin', event => {
    if (active && !panel.contains(event.target) && event.target !== active) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) {
      event.preventDefault();
      suppressHover = true;
      close(panel.contains(document.activeElement));
    }
  });
  window.addEventListener('resize', () => close(panel.contains(document.activeElement)));
  window.addEventListener('scroll', () => close(panel.contains(document.activeElement)), {passive: true});
  window.addEventListener('hashchange', () => close());
})();
