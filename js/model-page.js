// T3.1 — Model reference page (model.html, fa/model.html).
// Renders the whole model from js/models/imi-1404.js: concepts, criteria with guidance,
// weights, assessment logic, scoring matrices, the concept × criteria map and the glossary.
(() => {
  const M = window.IMI_1404;
  const { t, num, esc, FA, LANG } = window.I18N;
  const root = document.getElementById('mp-root');
  if (!M || !root) return;

  const L = (en, fa) => (FA ? fa : en);
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  const digits = s => (FA ? String(s).replace(/\d/g, d => FA_DIGITS[d]) : String(s));
  const PART_FA = { A: 'الف', B: 'ب', C: 'ج' };
  // "7-1A" → "7-1 A" / "۷-۱ الف". In Persian the id starts with an Arabic Letter Mark
  // (U+061C) so it always reads right to left like the source (criterion number on the
  // right); without it the browser's ordering depends on the text around the id.
  const fmtId = id => {
    const m = String(id).match(/^(\d-\d)([ABC])?$/);
    if (!m) return digits(id);
    return (FA ? '؜' : '') + digits(m[1]) + (m[2] ? ' ' + (FA ? PART_FA[m[2]] : m[2]) : '');
  };
  const anchor = id => `i-${id}`;
  const items = Engine.items(M);
  const itemById = Object.fromEntries(items.map(i => [i.id, i]));
  const enablerItems = items.filter(i => i.kind === 'enabler');
  const ICON = {
    chev: '<svg class="i mp-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    search: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    loop: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/></svg>',
  };

  const SECTIONS = [
    { id: 'concepts', title: L('Fundamental concepts', 'مفاهیم بنیادین'),
      intro: L('The ten ideas the model is built on. Each one links to the sub-criteria where it shows up in practice.', 'ده ایده‌ای که الگو بر آن‌ها بنا شده است. هر مفهوم به زیرمعیارهایی پیوند دارد که در عمل در آن‌ها دیده می‌شود.') },
    { id: 'criteria', title: L('Criteria', 'معیارها'),
      intro: L('Six enabler criteria describe what the organization does; the seventh shows the results it achieves. Each enabler sub-criterion lists the points to explain.', 'شش معیار توانمندساز آنچه سازمان انجام می‌دهد را توصیف می‌کنند و معیار هفتم نتایجی را که به دست آورده است. هر زیرمعیار توانمندساز، مواردی را که باید توضیح داده شوند فهرست می‌کند.') },
    { id: 'weights', title: L('Weighting factors', 'ضرایب وزن'),
      intro: L('How the 1,000 points are split: 550 for enablers and 450 for results.', 'تقسیم ۱٬۰۰۰ امتیاز: ۵۵۰ امتیاز برای توانمندسازها و ۴۵۰ امتیاز برای نتایج.') },
    { id: 'logic', title: L('Assessment logic', 'منطق ارزیابی'),
      intro: L('Every scored item is assessed against six RADAR attributes, grouped into elements.', 'هر زیرمعیار بر پایهٔ شش ویژگی رادار که در قالب عنصرها دسته‌بندی شده‌اند، ارزیابی می‌شود.') },
    { id: 'scoring', title: L('Scoring matrices', 'ماتریس‌های امتیازدهی'),
      intro: L('Each attribute is scored from 0 to 100 in steps of 5. The bands below describe what each range means.', 'هر ویژگی از ۰ تا ۱۰۰ و با گام‌های ۵ امتیازی امتیازدهی می‌شود. بازه‌های زیر معنای هر محدوده را نشان می‌دهند.') },
    { id: 'map', title: L('Concepts × criteria', 'ارتباط مفاهیم و معیارها'),
      intro: L('Which enabler sub-criteria each fundamental concept relates to.', 'هر مفهوم بنیادین با کدام زیرمعیارهای توانمندساز در ارتباط است.') },
    { id: 'glossary', title: L('Glossary', 'واژه‌نامه'),
      intro: L('Definitions of the terms used in the model.', 'تعریف اصطلاحاتی که در الگو به کار رفته‌اند.') },
  ];

  const section = (s, body, tools = '') => `
    <section class="mp-sec" id="${s.id}" aria-labelledby="h-${s.id}">
      <header class="mp-sec__head">
        <div><h2 id="h-${s.id}">${s.title}</h2><p>${s.intro}</p></div>${tools}
      </header>
      ${body}
    </section>`;

  // ---------------------------------------------------------------- concepts
  const concepts = () => `<div class="mp-concepts">${M.concepts.map((c, k) => `
    <article class="mp-concept" id="c-${c.id}">
      <span class="mp-num">${num(k + 1)}</span>
      <h3>${esc(t(c.name))}</h3>
      <p>${esc(t(c.text))}</p>
      <div class="mp-links">
        <span>${L('Related sub-criteria', 'زیرمعیارهای مرتبط')}</span>
        <ul>${c.links.map(id => `<li><a class="mp-chip" href="#${anchor(id)}" title="${esc(t(itemById[id].item.name))}">${fmtId(id)}</a></li>`).join('')}</ul>
      </div>
    </article>`).join('')}</div>`;

  // ---------------------------------------------------------------- criteria
  const pts = n => `<span class="mp-w">${L(`${num(n)} pts`, `${num(n)} امتیاز`)}</span>`;
  const enablerItem = i => `
    <li class="mp-item" id="${anchor(i.id)}">
      <div class="mp-item__head"><span class="mp-id">${fmtId(i.id)}</span><h3>${esc(t(i.name))}</h3>${pts(i.weight)}</div>
      <p class="mp-item__lead">${L('Explain how you:', 'توضیح دهید که چگونه:')}</p>
      <ul class="mp-guide">${i.guidance.map(g => `<li>${esc(t(g))}</li>`).join('')}</ul>
    </li>`;
  const resultSub = s => `
    <li class="mp-item" id="${anchor(s.id)}">
      <div class="mp-item__head"><span class="mp-id">${fmtId(s.id)}</span><h3>${esc(t(s.name))}</h3>${pts(s.weight)}</div>
      ${s.items.map(p => `
        <div class="mp-part" id="${anchor(p.id)}">
          <h4><span class="mp-id mp-id--soft">${fmtId(p.id)}</span><span>${esc(t(p.name))}</span>${pts(p.weight)}</h4>
          <p>${esc(t(p.intro))}</p>
          <ul class="mp-ex">${p.examples.map(x => `<li>${esc(t(x))}</li>`).join('')}</ul>
        </div>`).join('')}
    </li>`;
  const criteria = () => M.criteria.map(c => `
    <details class="mp-crit" id="k-${c.id}">
      <summary>
        <span class="mp-num mp-num--dark">${num(c.id)}</span>
        <span class="mp-crit__name">${esc(t(c.name))}<small>${esc(t(M.kinds[c.kind]))}</small></span>
        ${pts(c.weight)}${ICON.chev}
      </summary>
      <div class="mp-crit__body">
        <p class="mp-crit__text">${esc(t(c.text))}</p>
        <ol class="mp-items">${c.kind === 'enabler' ? c.items.map(enablerItem).join('') : c.subs.map(resultSub).join('')}</ol>
      </div>
    </details>`).join('');
  const criteriaTools = `<button type="button" class="btn btn--ghost btn--sm mp-toggle" data-open="0">${L('Expand all', 'باز کردن همه')}</button>`;

  // ---------------------------------------------------------------- weights
  const weights = () => {
    const row = (id, name, w, cls = '') => `<tr class="${cls}"><td class="mp-td-id">${fmtId(id)}</td><td>${esc(name)}</td><td class="mp-td-num">${num(w)}</td></tr>`;
    const total = (label, w) => `<tr class="mp-total"><th colspan="2" scope="row">${label}</th><td class="mp-td-num">${num(w)}</td></tr>`;
    let body = '';
    for (const kind of ['enabler', 'result']) {
      for (const c of M.criteria.filter(x => x.kind === kind)) {
        body += `<tr class="mp-group"><th colspan="2" scope="rowgroup">${num(c.id)} — ${esc(t(c.name))}</th><td class="mp-td-num">${num(c.weight)}</td></tr>`;
        if (c.kind === 'enabler') body += c.items.map(i => row(i.id, t(i.name), i.weight)).join('');
        else body += c.subs.map(s => row(s.id, t(s.name), s.weight, 'mp-subrow') + s.items.map(p => row(p.id, t(p.name), p.weight, 'mp-partrow')).join('')).join('');
      }
      body += total(kind === 'enabler' ? L('Total score of enabler criteria', 'مجموع امتیاز معیارهای توانمندساز') : L('Total score of results sub-criteria', 'مجموع امتیاز زیرمعیارهای نتایج'), M.totals[kind]);
    }
    body += `<tr class="mp-total mp-total--grand"><th colspan="2" scope="row">${L('Grand total of all criteria', 'جمع کل امتیاز معیارها')}</th><td class="mp-td-num">${num(M.totals.max)}</td></tr>`;
    return `<div class="mp-table-wrap"><table class="mp-table mp-weights">
      <caption class="visually-hidden">${L('Weighting factors of criteria and sub-criteria', 'ضرایب وزن معیارها و زیرمعیارها')}</caption>
      <thead><tr><th scope="col">${L('No.', 'شماره')}</th><th scope="col">${L('Sub-criterion', 'زیرمعیار')}</th><th scope="col" class="mp-td-num">${L('Weight', 'ضریب')}</th></tr></thead>
      <tbody>${body}</tbody></table></div>`;
  };

  // ---------------------------------------------------------------- assessment logic
  const logic = () => {
    const [res, app, dep, ass] = M.radar.cycle;
    const en = M.radar.enabler.elements, rs = M.radar.result.elements;
    const attrList = els => els.map(e => `<li><b>${esc(t(e.name))}</b>${e.attributes.map(a => esc(t(a.name))).join(L(', ', '، '))}</li>`).join('');
    const steps = [
      [res, rs], [app, [en[0]]], [dep, [en[1]]], [ass, [en[2]]],
    ].map(([step, els], k) => `
      <li class="mp-cycle__step mp-cycle__step--${step.id}">
        <span class="mp-num">${num(k + 1)}</span>
        <h3>${esc(t(step.name))}</h3>
        ${step.sub ? `<p class="mp-cycle__sub">${esc(t(step.sub))}</p>` : ''}
        <ul>${els.length > 1 ? attrList(els) : els[0].attributes.map(a => `<li>${esc(t(a.name))}</li>`).join('')}</ul>
      </li>`).join('');
    const table = kind => {
      const r = M.radar[kind];
      const rows = r.elements.map(e => e.attributes.map((a, k) => `
        <tr>${k ? '' : `<th scope="rowgroup" rowspan="${e.attributes.length}" class="mp-el">${esc(t(e.name))}</th>`}
          <th scope="row" class="mp-attr">${esc(t(a.name))}${a.id === r.cap ? `<span class="mp-cap-tag">${L('cap', 'سقف')}</span>` : ''}</th>
          <td><ul class="mp-desc">${a.descriptors.map(d => `<li>${esc(t(d))}</li>`).join('')}</ul></td></tr>`).join('')).join('');
      return `<h3 class="mp-h3">${esc(t(r.title))}</h3>
        <div class="mp-table-wrap"><table class="mp-table mp-logic">
          <thead><tr><th scope="col">${L('Element', 'عنصر')}</th><th scope="col">${L('Attribute', 'ویژگی')}</th><th scope="col">${L('Description', 'توضیحات')}</th></tr></thead>
          <tbody>${rows}</tbody></table></div>`;
    };
    return `<ol class="mp-cycle">${steps}</ol>
      <p class="mp-cycle__loop">${ICON.loop}${L('The cycle repeats: assessment and refinement feed the results the organization sets out to achieve next.', 'این چرخه تکرار می‌شود: ارزیابی و اصلاح، مبنای نتایجی است که سازمان در گام بعد دنبال می‌کند.')}</p>
      ${table('enabler')}${table('result')}`;
  };

  // ---------------------------------------------------------------- scoring
  const scoring = () => ['enabler', 'result'].map(kind => `
    <div class="mp-scale">
      <h3 class="mp-h3">${L(kind === 'enabler' ? 'Scoring matrix for enablers' : 'Scoring matrix for results', kind === 'enabler' ? 'ماتریس امتیازدهی برای توانمندسازها' : 'ماتریس امتیازدهی برای نتایج')}</h3>
      <ol class="mp-bands">${M.scale.bands.map((b, k) => `
        <li style="--k:${k}">
          <span class="mp-bands__pct">${FA ? `${num(b.pct)}٪` : `${b.pct}%`}</span>
          <b>${esc(t(b[kind]))}</b>
          <span class="mp-bands__range">${num(b.min)}–${num(b.max)}</span>
        </li>`).join('')}</ol>
      <p class="mp-note"><b>${L('Note', 'توجه')}</b>${esc(t(M.radar[kind].capNote))}</p>
    </div>`).join('');

  // ---------------------------------------------------------------- concept map
  const map = () => {
    const groups = M.criteria.filter(c => c.kind === 'enabler');
    const head1 = groups.map(c => `<th scope="colgroup" colspan="${c.items.length}" class="mp-map__crit">${num(c.id)}<span>${esc(t(c.name))}</span></th>`).join('');
    const head2 = enablerItems.map((i, k) => `<th scope="col" data-col="${k}" title="${esc(t(i.item.name))}">${fmtId(i.id)}</th>`).join('');
    const rows = M.concepts.map(c => `<tr><th scope="row" class="mp-map__concept"><a href="#c-${c.id}">${esc(t(c.name))}</a></th>${
      enablerItems.map((i, k) => (c.links.includes(i.id)
        ? `<td data-col="${k}"><span class="mp-dot" role="img" aria-label="${L('linked', 'مرتبط')}"></span></td>`
        : `<td data-col="${k}"></td>`)).join('')}</tr>`).join('');
    return `<div class="mp-table-wrap mp-map-wrap"><table class="mp-table mp-map">
      <caption>${L('Source table title: “Relationship between the fundamental concepts and the criteria of the Organizational Excellence Model, 1400 edition.”', 'عنوان جدول در منبع: «جدول ارتباط بین مفاهیم بنیادین و معیارهای مدل تعالی سازمانی – ویرایش ۱۴۰۰»')}</caption>
      <thead><tr><th rowspan="2" scope="col" class="mp-map__corner">${L('Concept', 'مفهوم')}</th>${head1}</tr><tr>${head2}</tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  };

  // ---------------------------------------------------------------- glossary
  const OTHER = FA ? 'en' : 'fa';
  const collator = new Intl.Collator(LANG);
  const gloss = M.glossary.slice().sort((a, b) => collator.compare(t(a.term), t(b.term)));
  const firstLetter = s => s.trim().charAt(0).toLocaleUpperCase(LANG);
  const glossary = () => {
    let html = '', letter = '';
    for (const g of gloss) {
      const l = firstLetter(t(g.term));
      if (l !== letter) { if (letter) html += '</dl></div>'; letter = l; html += `<div class="mp-gloss__group" data-letter="${esc(l)}"><h3 class="mp-gloss__letter">${esc(l)}</h3><dl>`; }
      html += `<div class="mp-gloss__entry" id="g-${g.id}"><dt>${esc(t(g.term))}<span lang="${OTHER}" dir="${OTHER === 'fa' ? 'rtl' : 'ltr'}">${esc(g.term[OTHER])}</span></dt><dd>${esc(t(g.def))}</dd></div>`;
    }
    return `<div class="mp-gloss-tools">
        <label class="mp-search">${ICON.search}<span class="visually-hidden">${L('Search the glossary', 'جستجو در واژه‌نامه')}</span>
          <input type="search" id="mp-gloss-q" placeholder="${L('Search terms and definitions', 'جستجوی اصطلاح یا تعریف')}" autocomplete="off"></label>
        <span class="mp-gloss__count" id="mp-gloss-count" aria-live="polite"></span>
      </div>
      <div class="mp-gloss">${html}</dl></div></div>
      <p class="mp-gloss__empty" id="mp-gloss-empty" hidden>${L('No terms match your search.', 'اصطلاحی با این جستجو پیدا نشد.')}</p>`;
  };

  // ---------------------------------------------------------------- page
  const facts = [
    [M.concepts.length, L('fundamental concepts', 'مفهوم بنیادین')],
    [M.criteria.length, L('criteria', 'معیار')],
    [items.length, L('scored items', 'زیرمعیار امتیازدار')],
    [M.totals.max, L('points', 'امتیاز')],
  ];
  root.innerHTML = `
    <section class="mp-hero"><div class="container">
      <span class="eyebrow">${L('Reference model', 'الگوی مرجع')}</span>
      <h1 class="h2">${esc(t(M.name))}</h1>
      <p class="lead">${L('The full model as published by the Industrial Management Institute: what each criterion asks, how the 1,000 points are weighted, and how every item is scored.', 'الگو به‌طور کامل، همان‌گونه که سازمان مدیریت صنعتی منتشر کرده است: آنچه هر معیار می‌پرسد، نحوهٔ تقسیم ۱٬۰۰۰ امتیاز و منطق امتیازدهی هر زیرمعیار.')}</p>
      <ul class="mp-facts">${facts.map(([n, l]) => `<li><b>${num(n)}</b><span>${l}</span></li>`).join('')}</ul>
    </div></section>
    <div class="container mp-layout">
      <nav class="mp-toc" aria-label="${L('On this page', 'در این صفحه')}">
        <p class="mp-toc__t">${L('On this page', 'در این صفحه')}</p>
        <ol>${SECTIONS.map(s => `<li><a href="#${s.id}">${s.title}</a></li>`).join('')}</ol>
      </nav>
      <div class="mp-body">
        ${section(SECTIONS[0], concepts())}
        ${section(SECTIONS[1], criteria(), criteriaTools)}
        ${section(SECTIONS[2], weights())}
        ${section(SECTIONS[3], logic())}
        ${section(SECTIONS[4], scoring())}
        ${section(SECTIONS[5], map())}
        ${section(SECTIONS[6], glossary())}
      </div>
    </div>`;

  // ---------------------------------------------------------------- behaviour
  const $ = s => root.querySelector(s);
  const $$ = s => [...root.querySelectorAll(s)];
  const crits = $$('.mp-crit');

  // expand / collapse all criteria
  const toggle = $('.mp-toggle');
  const syncToggle = () => {
    const allOpen = crits.every(d => d.open);
    toggle.dataset.open = allOpen ? '1' : '0';
    toggle.textContent = allOpen ? L('Collapse all', 'بستن همه') : L('Expand all', 'باز کردن همه');
  };
  toggle.addEventListener('click', () => {
    const open = toggle.dataset.open !== '1';
    crits.forEach(d => { d.open = open; });
    syncToggle();
  });
  crits.forEach(d => d.addEventListener('toggle', syncToggle));

  // links to an item inside a closed criterion open it first
  const reveal = (hash, smooth) => {
    const el = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el) return;
    const d = el.closest('details');
    if (d && !d.open) d.open = true;
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    if (el.classList.contains('mp-item') || el.classList.contains('mp-part') || el.classList.contains('mp-concept') || el.classList.contains('mp-gloss__entry')) {
      el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
    }
  };
  root.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    history.pushState(null, '', a.getAttribute('href'));
    reveal(a.getAttribute('href'), !matchMedia('(prefers-reduced-motion: reduce)').matches);
  });
  addEventListener('hashchange', () => reveal(location.hash, false));
  if (location.hash) requestAnimationFrame(() => reveal(location.hash, false));

  // contents: mark the section in view
  const tocLinks = $$('.mp-toc a');
  const spy = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      tocLinks.forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === `#${en.target.id}`));
      const on = tocLinks.find(a => a.hasAttribute('aria-current'));
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, { rootMargin: '-30% 0px -60% 0px' });
  $$('.mp-sec').forEach(s => spy.observe(s));

  // concept map: highlight the row and column under the pointer
  const mapTable = $('.mp-map');
  let hl = [];
  const clearHl = () => { hl.forEach(el => el.classList.remove('is-hl')); hl = []; };
  mapTable.addEventListener('pointerover', e => {
    const cell = e.target.closest('td, tbody th');
    clearHl();
    if (!cell) return;
    const row = cell.parentElement;
    const col = cell.dataset.col;
    hl = [...row.children, ...(col !== undefined ? mapTable.querySelectorAll(`[data-col="${col}"]`) : [])];
    hl.forEach(el => el.classList.add('is-hl'));
  });
  mapTable.addEventListener('pointerleave', clearHl);

  // glossary search
  const q = $('#mp-gloss-q');
  const count = $('#mp-gloss-count');
  const empty = $('#mp-gloss-empty');
  const entries = $$('.mp-gloss__entry').map(el => {
    const g = M.glossary.find(x => `g-${x.id}` === el.id);
    return { el, text: `${g.term.en} ${g.term.fa} ${t(g.def)}`.toLocaleLowerCase(LANG).replace(/‌/g, ' ') };
  });
  const groups = $$('.mp-gloss__group');
  const countText = n => L(`${num(n)} ${n === 1 ? 'term' : 'terms'}`, `${num(n)} اصطلاح`);
  const filter = () => {
    const words = q.value.trim().toLocaleLowerCase(LANG).replace(/‌/g, ' ').split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const e of entries) {
      const ok = words.every(w => e.text.includes(w));
      e.el.hidden = !ok;
      if (ok) shown++;
    }
    groups.forEach(g => { g.hidden = !g.querySelector('.mp-gloss__entry:not([hidden])'); });
    count.textContent = countText(shown);
    empty.hidden = shown > 0;
  };
  q.addEventListener('input', filter);
  filter();
})();
