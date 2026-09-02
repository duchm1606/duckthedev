/* duckthedev — client behaviour (theme, reading progress, toc scroll spy) */

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

// ---- TOC scroll spy ----
(function () {
  // The sidebar and the inline <details> both carry a .toc — only one is
  // visible at a time, so every link with a matching hash gets the class.
  const links = [...document.querySelectorAll('.toc a')].filter(a =>
    a.getAttribute('href')?.startsWith('#')
  );
  if (!links.length) return;
  const targets = [...new Set(links.map(a => a.getAttribute('href')))]
    .map(h => document.querySelector(h))
    .filter(Boolean);
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
      });
    },
    { rootMargin: '-90px 0px -70% 0px' }
  );
  targets.forEach(t => io.observe(t));
})();
