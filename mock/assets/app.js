/* duckthedev — mock interactions (theme, progress bar, filters, toc) */

// ---- Theme ----
(function () {
  const KEY = 'dtd-theme';
  const root = document.documentElement;
  const saved = localStorage.getItem(KEY);
  if (saved) root.setAttribute('data-theme', saved);

  function label() {
    const isDim = root.getAttribute('data-theme') === 'dim';
    document.querySelectorAll('[data-theme-label]').forEach(el => {
      el.textContent = isDim ? 'light' : 'dim';
    });
  }
  label();

  document.addEventListener('click', e => {
    const btn = e.target.closest('.theme-toggle');
    if (!btn) return;
    const next = root.getAttribute('data-theme') === 'dim' ? 'light' : 'dim';
    root.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
    label();
  });
})();

// ---- Reading progress line ----
(function () {
  const line = document.getElementById('progress-line');
  if (!line) return;
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    line.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ---- Filter buttons (mock: filters by data-tag on rows) ----
document.addEventListener('click', e => {
  const btn = e.target.closest('.filter');
  if (!btn) return;
  const row = btn.closest('.filter-row');
  row.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const target = document.querySelector(row.dataset.target || '.article-list');
  if (!target) return;
  const want = btn.dataset.filter;
  target.querySelectorAll('[data-tags]').forEach(item => {
    const tags = item.dataset.tags.split(/\s+/);
    item.style.display = !want || want === 'all' || tags.includes(want) ? '' : 'none';
  });
});

// ---- TOC scroll spy ----
(function () {
  const links = [...document.querySelectorAll('.toc a')];
  if (!links.length) return;
  const targets = links
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
      });
    },
    { rootMargin: '-110px 0px -70% 0px' }
  );
  targets.forEach(t => io.observe(t));
})();
