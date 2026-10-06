/* duckthedev — client behaviour (theme, reading progress, toc scroll spy, copy code) */

// ---- Theme ----
// The inline script in Base already applied the initial theme; this only
// keeps the toggle's label and the browser-chrome colour in step with it.
(function () {
  const KEY = 'dtd-theme';
  const root = document.documentElement;
  const chrome = document.querySelector('meta[name="theme-color"]');

  function sync() {
    const isDim = root.getAttribute('data-theme') === 'dim';
    document.querySelectorAll('.theme-toggle').forEach(el => {
      el.setAttribute('aria-label', isDim ? 'Switch to light theme' : 'Switch to dark theme');
    });
    chrome?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
  }
  sync();

  document.addEventListener('click', e => {
    const btn = e.target.closest('.theme-toggle');
    if (!btn) return;
    const next = root.getAttribute('data-theme') === 'dim' ? 'light' : 'dim';
    root.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
    sync();
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
    // top margin clears the two-row sticky masthead
    { rootMargin: '-120px 0px -70% 0px' }
  );
  targets.forEach(t => io.observe(t));
})();

// ---- Copy button on code blocks ----
(function () {
  document.addEventListener('click', async e => {
    const btn = e.target.closest('.copy-code');
    if (!btn) return;
    const code = btn.closest('.code-block')?.querySelector('pre');
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.innerText);
      btn.textContent = 'copied';
    } catch {
      btn.textContent = 'failed';
    }
    setTimeout(() => (btn.textContent = 'copy'), 1600);
  });
})();
