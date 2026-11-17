// Landing hero: the product preview behaves like the real app.
// Tabs, tooltips, dimension highlight, last-year comparison, evidence filters
// and an improvement plan whose ticks raise the projected score.
(() => {
  const app = document.querySelector('.app');
  if (!app) return;
  const FA = document.documentElement.lang === 'fa';
  const num = n => Math.round(n).toLocaleString(FA ? 'fa-IR' : 'en-US');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- tabs ----------
  const tabs = [...app.querySelectorAll('[data-view-btn]')];
  const views = [...app.querySelectorAll('.app__view')];
  const show = v => {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.viewBtn === v)));
    views.forEach(p => p.classList.toggle('is-on', p.dataset.view === v));
    hideTip();
  };
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.viewBtn)));
  // arrow keys move between tabs
  app.querySelector('.seg').addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0 || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const step = (e.key === 'ArrowRight') !== FA ? 1 : -1;
    const next = tabs[(i + step + tabs.length) % tabs.length];
    next.focus(); next.click();
  });

  // "biggest gap" → plan tab, its first action flashes
  app.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => {
    show(b.dataset.goto);
    const row = document.getElementById(b.dataset.focus);
    if (!row) return;
    row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
  }));

  // ---------- tooltip ----------
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  let tipFor = null, tipTimer = 0;
  function hideTip() { tip.classList.remove('is-on'); tipFor = null; }
  const showTip = el => {
    tipFor = el;
    tip.textContent = el.dataset.tip;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const x = Math.min(Math.max(r.left + r.width / 2, w / 2 + 8), innerWidth - w / 2 - 8);
    tip.style.left = x + 'px';
    tip.style.top = r.top + 'px';
    tip.classList.add('is-on');
  };
  app.addEventListener('pointerover', e => {
    const el = e.target.closest('[data-tip]');
    if (el && el !== tipFor) showTip(el);
  });
  app.addEventListener('pointerout', e => {
    const el = e.target.closest('[data-tip]');
    if (el && !el.contains(e.relatedTarget)) hideTip();
  });
  // touch: tap shows it for a moment
  app.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    const el = e.target.closest('[data-tip]');
    if (!el) return;
    showTip(el);
    clearTimeout(tipTimer);
    tipTimer = setTimeout(hideTip, 2200);
  });
  app.addEventListener('focusin', e => { const el = e.target.closest('[data-tip]'); if (el) showTip(el); });
  app.addEventListener('focusout', hideTip);
  addEventListener('scroll', () => tipFor && hideTip(), { passive: true });

  // ---------- dimension highlight ----------
  app.querySelectorAll('.dims li').forEach(li => {
    const on = () => { app.dataset.dim = li.dataset.dim; };
    const off = () => { delete app.dataset.dim; };
    li.addEventListener('pointerenter', on);
    li.addEventListener('pointerleave', off);
    li.addEventListener('focus', on);
    li.addEventListener('blur', off);
  });

  // ---------- compare with last year ----------
  const cmp = document.getElementById('cmp-prev');
  if (cmp) cmp.addEventListener('change', () => app.classList.toggle('is-compare', cmp.checked));

  // ---------- evidence filters ----------
  const filters = [...app.querySelectorAll('[data-filter]')];
  filters.forEach(f => f.addEventListener('click', () => {
    filters.forEach(x => x.setAttribute('aria-pressed', String(x === f)));
    app.querySelectorAll('.ev__list li').forEach(li => {
      li.classList.toggle('is-hidden', f.dataset.filter !== 'all' && li.dataset.status !== f.dataset.filter);
    });
  }));

  // ---------- improvement plan ----------
  const done = document.getElementById('plan-done');
  const proj = document.getElementById('plan-proj');
  const boxes = [...app.querySelectorAll('.acts input')];
  let shown = Number(proj.dataset.base);
  const tween = to => {
    const from = shown, start = performance.now(), ms = reduce ? 0 : 600;
    shown = to;
    const step = now => {
      const t = ms ? Math.min((now - start) / ms, 1) : 1;
      proj.textContent = num(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const updatePlan = () => {
    const ticked = boxes.filter(b => b.checked);
    done.textContent = done.dataset.tpl.replace('{d}', num(ticked.length)).replace('{t}', num(Number(done.dataset.total)));
    tween(Number(proj.dataset.base) + ticked.reduce((a, b) => a + Number(b.dataset.pts), 0));
    proj.parentElement.classList.remove('bump'); void proj.offsetWidth; proj.parentElement.classList.add('bump');
  };
  boxes.forEach(b => b.addEventListener('change', updatePlan));
})();
