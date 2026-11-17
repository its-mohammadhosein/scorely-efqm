// EFQM calculator page — fa/calculator.html (Persian) and calculator.html (English).
// Each criterion is scored on its RADAR attributes (0–100 in steps of 25);
// the criterion % is their average, then weighted by the criterion's points.
// The plan switch (Starter / Team / Enterprise) previews what each plan unlocks:
//   Starter     total, maturity level, dimension totals
//   Team        + criterion breakdown, biggest gaps, evidence notes, print / PDF
//   Enterprise  + several units or sites, compared side by side
(() => {
  const FA = document.documentElement.lang === 'fa';
  const num = n => Math.round(n).toLocaleString(FA ? 'fa-IR' : 'en-US');
  const pct = n => FA ? num(n) + '٪' : num(n) + '%';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ARC = 377;
  const KEY = 'scorely-calc'; // shared by both languages, so switching keeps the answers
  const PLANS = ['starter', 'team', 'enterprise'];

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
    confirm: 'همهٔ پاسخ‌ها و یادداشت‌های این واحد پاک شود؟',
    addNote: '+ یادداشت شواهد',
    notePh: 'چه شواهدی این پاسخ را پشتیبانی می‌کند؟ (سند، شاخص، فرایند…)',
    mainUnit: 'واحد اصلی',
    unitN: n => `واحد ${num(n)}`,
    newUnit: 'نام واحد یا سایت جدید:',
    rename: 'نام تازهٔ این واحد:',
    delUnit: n => `«${n}» و همهٔ پاسخ‌هایش حذف شود؟`,
    planDesc: {
      starter: 'پلن پایه: امتیاز کل، سطح بلوغ و امتیاز سه بُعد.',
      team: 'پلن تیمی: به‌علاوهٔ تفکیک هر معیار، بیشترین فرصت‌های بهبود، یادداشت شواهد برای هر پرسش و خروجی PDF.',
      enterprise: 'پلن سازمانی: به‌علاوهٔ ارزیابی جداگانهٔ چند واحد یا سایت و مقایسهٔ آن‌ها کنار هم.',
    },
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
    confirm: 'Clear all answers and notes for this unit?',
    addNote: '+ Add evidence note',
    notePh: 'What evidence supports this answer? (document, KPI, process…)',
    mainUnit: 'Main unit',
    unitN: n => `Unit ${n}`,
    newUnit: 'Name of the new unit or site:',
    rename: 'New name for this unit:',
    delUnit: n => `Delete "${n}" and all its answers?`,
    planDesc: {
      starter: 'Starter: your total score, maturity level and the three dimension totals.',
      team: 'Team: adds the breakdown by criterion, your biggest gaps, an evidence note on every question, and print / PDF.',
      enterprise: 'Enterprise: adds separate assessments for several units or sites, compared side by side.',
    },
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
  const TOTAL_Q = CRITERIA.reduce((a, c) => a + c.q.length, 0);

  // ---------- state: plan + units, each unit with its answers (a) and notes (n) ----------
  const load = () => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* start fresh */ }
    if (!s || s.v !== 2) { // first visit, or answers saved by the earlier one-unit version
      s = { v: 2, plan: 'team', cur: 0, units: [{ name: '', a: s && typeof s === 'object' ? s : {}, n: {} }] };
    }
    const fromUrl = new URLSearchParams(location.search).get('plan');
    if (PLANS.includes(fromUrl)) s.plan = fromUrl;
    if (!PLANS.includes(s.plan)) s.plan = 'team';
    if (!s.units[s.cur]) s.cur = 0;
    return s;
  };
  const state = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };
  const unit = () => state.units[state.cur];
  const unitName = i => state.units[i].name || (i === 0 ? T.mainUnit : T.unitN(i + 1));

  const scoreOf = a => {
    let sum = 0, done = 0;
    const dims = [0, 0, 0];
    const rows = CRITERIA.map(c => {
      const vals = c.q.map((_, qi) => {
        const v = a[`c${c.n}q${qi}`];
        if (v !== undefined) done++;
        return Number(v || 0);
      });
      const p = vals.reduce((x, y) => x + y, 0) / vals.length;
      const pts = p / 100 * c.pts;
      sum += pts; dims[c.dim] += pts;
      return { c, p, pts, lost: c.pts - pts };
    });
    return { sum, done, dims, rows };
  };

  // ---------- build the form ----------
  const form = document.getElementById('cp-form');
  let html = '';
  CRITERIA.forEach((c, ci) => {
    if (ci === 0 || CRITERIA[ci - 1].dim !== c.dim) html += `<p class="cp-dim">${T.dims[c.dim]}</p>`;
    html += `<fieldset class="cp-card" id="c${c.n}">
      <legend class="cp-card__head"><span class="cp-card__n">${num(c.n)}</span><span class="cp-card__name">${c.name}</span><span class="cp-card__pts"><b data-pts="${ci}">${num(0)}</b> ${T.of(c.pts)}</span></legend>`;
    c.q.forEach(([label, help], qi) => {
      const name = `c${c.n}q${qi}`;
      const lv = li => T.short && T.short[li] ? `<i class="lv">${T.levels[li]}</i><i class="lv-s">${T.short[li]}</i>` : T.levels[li];
      html += `<div class="cp-q" role="radiogroup" aria-label="${c.name} — ${label}">
        <p class="cp-q__l">${label}</p><p class="cp-q__h">${help}</p>
        <div class="cp-opts">${LEVELS.map((v, li) => `<label><input type="radio" name="${name}" value="${v}"><span><b>${num(v)}</b>${lv(li)}</span></label>`).join('')}</div>
        <div class="cp-note need-team"><button type="button" class="cp-note__btn">${T.addNote}</button><textarea name="n-${name}" rows="2" placeholder="${T.notePh}" hidden></textarea></div>
      </div>`;
    });
    html += `</fieldset>`;
  });
  form.innerHTML = html;

  const $ = id => document.getElementById(id);
  $('cp-crit').innerHTML = CRITERIA.map(c => `<li><span class="cp-crit__n">${num(c.n)}</span><span class="cp-crit__t"><i></i></span><b>${pct(0)}</b></li>`).join('');
  $('cp-count').textContent = num(TOTAL_Q);

  const showNote = (ta, open) => {
    ta.hidden = !open;
    ta.previousElementSibling.hidden = open;
  };

  // put the current unit's answers and notes into the form
  const applyUnit = () => {
    form.reset();
    const { a, n } = unit();
    for (const [name, v] of Object.entries(a)) {
      const el = form.querySelector(`input[name="${name}"][value="${v}"]`);
      if (el) el.checked = true;
    }
    form.querySelectorAll('textarea').forEach(ta => {
      ta.value = n[ta.name.slice(2)] || '';
      showNote(ta, !!ta.value);
    });
  };

  // ---------- results ----------
  const update = () => {
    const a = {};
    form.querySelectorAll('input[type=radio]:checked').forEach(el => { a[el.name] = el.value; });
    unit().a = a;
    const { sum, done, dims, rows } = scoreOf(a);

    rows.forEach((r, ci) => {
      form.querySelector(`[data-pts="${ci}"]`).textContent = num(r.pts);
      const li = $('cp-crit').children[ci];
      li.querySelector('i').style.width = r.p + '%';
      li.querySelector('b').textContent = pct(r.p);
    });
    $('cp-total').textContent = num(sum);
    $('cp-bar-total').textContent = num(sum);
    dims.forEach((d, i) => { $('cp-d' + i).textContent = num(d); });
    $('cp-band').textContent = T.bands[BANDS.filter(b => Math.round(sum) >= b).length - 1];
    $('cp-done').textContent = num(done);
    $('cp-done-bar').style.width = (done / TOTAL_Q * 100) + '%';
    $('cp-gauge').querySelector('.gauge__val').style.setProperty('--off', ARC - ARC * Math.min(sum / 1000, 1));

    // biggest opportunities: points still available, largest first
    $('cp-gaps').innerHTML = rows.slice().sort((x, y) => y.lost - x.lost).slice(0, 3)
      .map(r => `<li><span><em>${T.crit(r.c.n)}</em> ${r.c.name}</span><b>${T.pts(r.lost)}</b></li>`).join('');

    // enterprise: every unit side by side
    $('cp-compare').innerHTML = state.units.map((u, i) => {
      const s = scoreOf(u.a).sum;
      return `<li class="${i === state.cur ? 'on' : ''}"><span>${esc(unitName(i))}</span><span class="cp-crit__t"><i style="width:${s / 10}%"></i></span><b>${num(s)}</b></li>`;
    }).join('');

    save();
  };

  // ---------- units (enterprise) ----------
  const renderUnits = () => {
    $('cp-units').innerHTML = state.units.map((u, i) =>
      `<button type="button" class="cp-unit${i === state.cur ? ' on' : ''}" data-i="${i}" aria-pressed="${i === state.cur}">${esc(unitName(i))}</button>`).join('');
    $('cp-unit-del').disabled = state.units.length < 2;
  };
  const switchUnit = i => { state.cur = i; applyUnit(); renderUnits(); update(); };

  $('cp-units').addEventListener('click', e => {
    const b = e.target.closest('.cp-unit');
    if (b) switchUnit(Number(b.dataset.i));
  });
  $('cp-unit-add').addEventListener('click', () => {
    const name = prompt(T.newUnit, T.unitN(state.units.length + 1));
    if (name === null) return;
    state.units.push({ name: name.trim(), a: {}, n: {} });
    switchUnit(state.units.length - 1);
  });
  $('cp-unit-rename').addEventListener('click', () => {
    const name = prompt(T.rename, unitName(state.cur));
    if (name === null) return;
    unit().name = name.trim();
    renderUnits(); update();
  });
  $('cp-unit-del').addEventListener('click', () => {
    if (state.units.length < 2 || !confirm(T.delUnit(unitName(state.cur)))) return;
    state.units.splice(state.cur, 1);
    switchUnit(Math.max(0, state.cur - 1));
  });

  // ---------- plan switch ----------
  const setPlan = p => {
    state.plan = p;
    document.body.dataset.plan = p;
    const r = document.querySelector(`input[name="plan"][value="${p}"]`);
    if (r) r.checked = true;
    $('cp-plan-desc').textContent = T.planDesc[p];
    // keep the address in step, so a reload or a shared link opens the same plan
    try { const u = new URL(location.href); u.searchParams.set('plan', p); history.replaceState(null, '', u); } catch (e) { /* file:// in some browsers */ }
    // below Enterprise only one unit exists, so show the first one
    if (p !== 'enterprise' && state.cur !== 0) switchUnit(0);
    save();
  };
  document.querySelectorAll('input[name="plan"]').forEach(r => r.addEventListener('change', () => setPlan(r.value)));
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => setPlan(b.dataset.go)));

  // ---------- notes (team) ----------
  form.addEventListener('click', e => {
    const b = e.target.closest('.cp-note__btn');
    if (!b) return;
    const ta = b.nextElementSibling;
    showNote(ta, true);
    ta.focus();
  });
  form.addEventListener('input', e => {
    if (e.target.tagName !== 'TEXTAREA') return;
    const key = e.target.name.slice(2);
    if (e.target.value.trim()) unit().n[key] = e.target.value; else delete unit().n[key];
    save();
  });
  form.addEventListener('change', e => { if (e.target.type === 'radio') update(); });

  // phones: hide the floating total once the full result is on screen
  const bar = document.querySelector('.cp-bar');
  new IntersectionObserver(([e]) => bar.classList.toggle('is-hidden', e.isIntersecting), { threshold: 0.15 }).observe($('result'));

  $('cp-print').addEventListener('click', () => print());
  $('cp-reset').addEventListener('click', () => {
    if (!confirm(T.confirm)) return;
    unit().a = {}; unit().n = {};
    applyUnit(); update();
    scrollTo({ top: 0, behavior: 'smooth' });
  });

  applyUnit();
  renderUnits();
  setPlan(state.plan);
  update();
})();
