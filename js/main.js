// Saramadan landing — reveals, dashboard gauge and the score calculator.
(() => {
  document.documentElement.classList.add('js');
  const ARC = 377; // length of the 270° gauge arc (r = 80)
  const FA = document.documentElement.lang === 'fa';
  const num = n => FA ? n.toLocaleString('fa-IR') : String(n);
  const pct = n => FA ? num(n) + '٪' : n + '%';

  const setGauge = (el, value) => {
    const max = Number(el.dataset.max) || 1000;
    el.querySelector('.gauge__val').style.setProperty('--off', ARC - ARC * Math.min(value / max, 1));
  };

  // count a number up once
  const countUp = (el, to, ms = 1600) => {
    const start = performance.now();
    const step = now => {
      const t = Math.min((now - start) / ms, 1);
      el.textContent = num(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // header border once the page scrolls
  const header = document.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // reveals
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // hero dashboard: gauge fills, number counts up, bars grow
  const app = document.querySelector('.app');
  const appIO = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    const g = app.querySelector('.gauge');
    setGauge(g, Number(g.dataset.value));
    const n = app.querySelector('[data-count]');
    reduce ? null : countUp(n, Number(n.dataset.count));
    app.classList.add('is-in');
    appIO.disconnect();
  }, { threshold: 0.3 });
  appIO.observe(app);

  // calculator
  const form = document.getElementById('calc');
  const gauge = document.getElementById('calc-gauge');
  const total = document.getElementById('calc-total');
  const band = document.getElementById('calc-band');
  const hint = document.getElementById('calc-hint');
  const dims = { en: [0, 1, 2, 3, 4, 5], res: [6] }; // 1404 model: enablers 1–6 (550), results 7 (450)
  const names = FA ? ['رهبری', 'استراتژی', 'کارکنان', 'قابلیت‌ها', 'مشتریان', 'عملیات', 'نتایج'] : ['leadership', 'strategy', 'people', 'capabilities', 'customers', 'operations', 'results'];
  const bands = FA ? [
    [0, 'در آغاز راه', 'از توافق بر سر هدف و چند رویکرد کلیدی شروع کنید.'],
    [250, 'در حال توسعه', 'پایه‌ها شکل گرفته‌اند. روی استقرار یکپارچهٔ رویکردها تمرکز کنید.'],
    [400, 'تثبیت‌شده', 'پایه‌ها محکم است. سریع‌ترین پیشرفت شما در معیار {c} است.'],
    [550, 'پیشرفته', 'در کل مدل قوی هستید. شواهد بیشتری از بازنگری و پالایش نشان دهید، به‌ویژه در معیار {c}.'],
    [700, 'الگو', 'عالی است. به سنجش، الگوبرداری و به اشتراک گذاشتن تجربه‌ها ادامه دهید.'],
  ] : [
    [0, 'Getting started', 'Start by agreeing your purpose and the few approaches that matter most.'],
    [250, 'Developing', 'The basics are there. Focus on deploying approaches consistently.'],
    [400, 'Established', 'Solid foundations. Your quickest wins are in criterion {c}.'],
    [550, 'Advanced', 'Strong across the model. Show more evidence of review and refinement, especially in criterion {c}.'],
    [700, 'Role model', 'Impressive. Keep measuring, benchmarking and sharing what works.'],
  ];
  const inputs = [...form.querySelectorAll('input[type=range]')];

  const update = () => {
    const pts = inputs.map(i => Math.round(i.value / 100 * i.dataset.pts));
    inputs.forEach(i => {
      i.style.setProperty('--p', i.value + '%');
      i.nextElementSibling.textContent = pct(Number(i.value));
    });
    const sum = pts.reduce((a, b) => a + b, 0);
    total.textContent = num(sum);
    for (const [k, idx] of Object.entries(dims)) document.getElementById('d-' + k).textContent = num(idx.reduce((a, i) => a + pts[i], 0));
    // weakest criterion, weighted by the points it could still add
    const lost = inputs.map(i => (100 - i.value) / 100 * i.dataset.pts);
    const weakest = lost.indexOf(Math.max(...lost));
    const b = bands.filter(b => sum >= b[0]).pop();
    band.textContent = b[1];
    hint.textContent = b[2].replace('{c}', num(weakest + 1) + ' (' + names[weakest] + ')');
    gauge.dataset.value = sum;
    setGauge(gauge, sum);
  };
  form.addEventListener('input', update);
  update();
})();
