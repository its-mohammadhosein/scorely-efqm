// EFQM calculator page — fa/calculator.html (Persian) and calculator.html (English).
// Each criterion is scored on its RADAR attributes (0–100 in steps of 25);
// the criterion % is their average, then weighted by the criterion's points.
(() => {
  const FA = document.documentElement.lang === 'fa';
  const num = n => FA ? Math.round(n).toLocaleString('fa-IR') : Math.round(n).toLocaleString('en-US');
  const pct = n => FA ? num(n) + '٪' : num(n) + '%';
  const ARC = 377;
  const KEY = 'scorely-calc'; // shared by both languages, so switching keeps the answers

  const T = FA ? {
    enabler: [
      ['رویکرد', 'آیا روشی مشخص، مستدل و هم‌راستا با استراتژی برای این معیار دارید؟'],
      ['استقرار', 'آیا این روش به‌طور کامل، منظم و در همهٔ بخش‌های مرتبط اجرا می‌شود؟'],
      ['ارزیابی و پالایش', 'آیا اثربخشی آن را می‌سنجید و بر پایهٔ یادگیری و نوآوری بهبودش می‌دهید؟'],
    ],
    result: [
      ['ارتباط و قابلیت استفاده', 'آیا شاخص‌های درست، با داده‌های قابل اعتماد، به‌موقع و با تفکیک کافی دارید؟'],
      ['عملکرد', 'آیا روند مثبت دارید، به اهدافتان می‌رسید و در مقایسه با دیگران خوب هستید؟'],
    ],
    names: ['هدف، چشم‌انداز و استراتژی', 'فرهنگ سازمانی و رهبری', 'درگیر کردن ذی‌نفعان', 'خلق ارزش پایدار', 'هدایت عملکرد و تحول', 'ادراکات ذی‌نفعان', 'عملکرد استراتژیک و عملیاتی'],
    dims: ['جهت‌گیری', 'اجرا', 'نتایج'],
    levels: ['بدون شواهد', 'محدود', 'مشهود', 'روشن', 'جامع'],
    bands: ['در آغاز راه', 'در حال توسعه', 'تثبیت‌شده', 'پیشرفته', 'الگو'],
    of: max => `از ${num(max)}`,
    crit: n => `معیار ${num(n)}`,
    pts: n => `${num(n)} امتیاز`,
    confirm: 'همهٔ پاسخ‌ها پاک شود؟',
  } : {
    enabler: [
      ['Approach', 'Do you have a clear, sound approach for this criterion that is aligned with your strategy?'],
      ['Deployment', 'Is it implemented fully, systematically and in every relevant part of the organisation?'],
      ['Assessment & refinement', 'Do you measure how well it works and improve it through learning and innovation?'],
    ],
    result: [
      ['Relevance & usability', 'Do you have the right indicators, with reliable, timely and well-segmented data?'],
      ['Performance', 'Are your trends positive, are targets met, and do you compare well with others?'],
    ],
    names: ['Purpose, vision & strategy', 'Organisational culture & leadership', 'Engaging stakeholders', 'Creating sustainable value', 'Driving performance & transformation', 'Stakeholder perceptions', 'Strategic & operational performance'],
    dims: ['Direction', 'Execution', 'Results'],
    levels: ['No evidence', 'Limited', 'Evident', 'Clear', 'Comprehensive'],
    short: { 4: 'Full' }, // phones: the long word doesn't fit a fifth of the width
    bands: ['Getting started', 'Developing', 'Established', 'Advanced', 'Role model'],
    of: max => `of ${num(max)}`,
    crit: n => `Criterion ${n}`,
    pts: n => `${num(n)} pts`,
    confirm: 'Clear all answers?',
  };

  const CRITERIA = [
    { n: 1, dim: 0, pts: 100, q: T.enabler },
    { n: 2, dim: 0, pts: 100, q: T.enabler },
    { n: 3, dim: 1, pts: 100, q: T.enabler },
    { n: 4, dim: 1, pts: 200, q: T.enabler },
    { n: 5, dim: 1, pts: 100, q: T.enabler },
    { n: 6, dim: 2, pts: 200, q: T.result },
    { n: 7, dim: 2, pts: 200, q: T.result },
  ].map((c, i) => ({ ...c, name: T.names[i] }));
  const LEVELS = [0, 25, 50, 75, 100];
  const BANDS = [0, 250, 400, 550, 700];

  // ---------- build the form ----------
  const form = document.getElementById('cp-form');
  let html = '';
  CRITERIA.forEach((c, ci) => {
    if (ci === 0 || CRITERIA[ci - 1].dim !== c.dim) html += `<p class="cp-dim">${T.dims[c.dim]}</p>`;
    html += `<fieldset class="cp-card" id="c${c.n}">
      <legend class="cp-card__head"><span class="cp-card__n">${num(c.n)}</span><span class="cp-card__name">${c.name}</span><span class="cp-card__pts"><b data-pts="${ci}">${num(0)}</b> ${T.of(c.pts)}</span></legend>`;
    c.q.forEach(([label, help], qi) => {
      const name = `c${c.n}q${qi}`;
      html += `<div class="cp-q" role="radiogroup" aria-label="${c.name} — ${label}">
        <p class="cp-q__l">${label}</p><p class="cp-q__h">${help}</p>
        <div class="cp-opts">${LEVELS.map((v, li) => `<label><input type="radio" name="${name}" value="${v}"><span><b>${num(v)}</b>${T.short && T.short[li] ? `<i class="lv">${T.levels[li]}</i><i class="lv-s">${T.short[li]}</i>` : T.levels[li]}</span></label>`).join('')}</div>
      </div>`;
    });
    html += `</fieldset>`;
  });
  form.innerHTML = html;

  // ---------- restore saved answers ----------
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    for (const [name, v] of Object.entries(saved)) {
      const el = form.querySelector(`input[name="${name}"][value="${v}"]`);
      if (el) el.checked = true;
    }
  } catch (e) { /* storage unavailable: start empty */ }

  // ---------- result panel ----------
  const $ = id => document.getElementById(id);
  const critList = $('cp-crit');
  critList.innerHTML = CRITERIA.map(c => `<li><span class="cp-crit__n">${num(c.n)}</span><span class="cp-crit__t"><i></i></span><b>${pct(0)}</b></li>`).join('');
  const total = CRITERIA.reduce((a, c) => a + c.q.length, 0);
  $('cp-count').textContent = num(total);

  const update = () => {
    const answers = {};
    let done = 0, sum = 0;
    const dims = [0, 0, 0];
    const rows = CRITERIA.map((c, ci) => {
      const vals = c.q.map((_, qi) => {
        const el = form.querySelector(`input[name="c${c.n}q${qi}"]:checked`);
        if (el) { done++; answers[el.name] = el.value; return Number(el.value); }
        return 0;
      });
      const p = vals.reduce((a, b) => a + b, 0) / vals.length;
      const pts = p / 100 * c.pts;
      sum += pts; dims[c.dim] += pts;
      form.querySelector(`[data-pts="${ci}"]`).textContent = num(pts);
      const li = critList.children[ci];
      li.querySelector('i').style.width = p + '%';
      li.querySelector('b').textContent = pct(p);
      return { c, lost: c.pts - pts };
    });

    $('cp-total').textContent = num(sum);
    $('cp-bar-total').textContent = num(sum);
    dims.forEach((d, i) => { $('cp-d' + i).textContent = num(d); });
    $('cp-band').textContent = T.bands[BANDS.filter(b => Math.round(sum) >= b).length - 1];
    $('cp-done').textContent = num(done);
    $('cp-done-bar').style.width = (done / total * 100) + '%';
    $('cp-gauge').querySelector('.gauge__val').style.setProperty('--off', ARC - ARC * Math.min(sum / 1000, 1));

    // biggest opportunities: points still available, largest first
    $('cp-gaps').innerHTML = rows.slice().sort((a, b) => b.lost - a.lost).slice(0, 3)
      .map(r => `<li><span><em>${T.crit(r.c.n)}</em> ${r.c.name}</span><b>${T.pts(r.lost)}</b></li>`).join('');

    try { localStorage.setItem(KEY, JSON.stringify(answers)); } catch (e) { /* ignore */ }
  };

  // phones: hide the floating total once the full result is on screen
  const bar = document.querySelector('.cp-bar');
  new IntersectionObserver(([e]) => bar.classList.toggle('is-hidden', e.isIntersecting), { threshold: 0.15 }).observe($('result'));

  form.addEventListener('change', update);
  $('cp-print').addEventListener('click', () => print());
  $('cp-reset').addEventListener('click', () => {
    if (!confirm(T.confirm)) return;
    form.reset();
    update();
    scrollTo({ top: 0, behavior: 'smooth' });
  });
  update();
})();
