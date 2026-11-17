// T4.1 — Full assessment (assessment.html, fa/assessment.html).
// Score each of the 33 items on its six RADAR attributes. Enabler items have a guidance
// checklist with notes; results items have an indicator table that suggests scores.
// Data lives in js/store.js; scores come from js/engine.js.
(() => {
  const M = window.IMI_1404;
  const { t, num, esc, FA, itemId, digits } = window.I18N;
  const Store = window.Store;
  const Engine = window.Engine;
  const root = document.getElementById('as-root');
  if (!M || !root || !Store || !Engine) return;

  const L = (en, fa) => (FA ? fa : en);
  const ITEMS = Engine.items(M);
  const BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  const CRIT = Object.fromEntries(M.criteria.map(c => [c.id, c]));
  const SUBS = Object.fromEntries(M.criteria.filter(c => c.subs).flatMap(c => c.subs.map(s => [s.id, s])));
  const MODEL_URL = 'model.html';
  const isNum = v => v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v));
  const pts = n => num(n, n % 1 ? 1 : 0);

  const ICON = {
    menu: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    dots: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
    x: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    prev: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    ext: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    note: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v12l-4 4H5Z"/><path d="M15 20v-4h4M8 9h8M8 13h5"/></svg>',
    plus: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  };

  // ---------------------------------------------------------------- data access
  const asmt = () => Store.current();
  const data = () => Store.site();
  const scoresOf = id => data().scores[id] || {};
  const setScore = (id, attr, v) => {
    const s = data().scores[id] = data().scores[id] || {};
    if (v === null) delete s[attr]; else s[attr] = v;
    if (!Object.keys(s).length) delete data().scores[id];
  };
  const notesOf = id => data().notes[id] || {};
  const setNote = (id, key, v) => {
    const n = data().notes[id] = data().notes[id] || {};
    if (v.trim()) n[key] = v; else delete n[key];
    if (!Object.keys(n).length) delete data().notes[id];
  };
  const guidanceOf = id => data().guidance[id] || [];
  const indicatorsOf = id => (data().indicators[id] = data().indicators[id] || []);
  const siteName = (s, k) => s.name || (k === 0 ? L('Main site', 'واحد اصلی') : L(`Site ${k + 1}`, `واحد ${num(k + 1)}`));
  const asmtName = a => `${digits(a.year)}${a.name ? ` — ${a.name}` : ''}`;
  const years = () => { const y = Number(asmt().year); return [y - 4, y - 3, y - 2, y - 1, y]; };

  // ---------------------------------------------------------------- saving
  let saveTimer = 0;
  const status = () => root.querySelector('#as-save');
  const showSaved = ok => {
    const el = status();
    if (!el) return;
    el.textContent = ok ? L('Saved', 'ذخیره شد') : L('Not saved: browser storage is blocked. Export to keep your work.', 'ذخیره نشد: حافظهٔ مرورگر مسدود است. برای نگه‌داشتن کار، خروجی بگیرید.');
    el.classList.toggle('is-bad', !ok);
  };
  const scheduleSave = () => {
    const el = status();
    if (el && !Store.blocked) { el.textContent = L('Saving…', 'در حال ذخیره…'); el.classList.remove('is-bad'); }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => showSaved(Store.save()), 400);
  };
  addEventListener('beforeunload', () => { if (saveTimer) Store.save(); });

  // ---------------------------------------------------------------- layout
  root.innerHTML = `
    ${Store.notice === 'reset' ? `<div class="container"><p class="as-notice" role="status">${L('Saved data from an older version could not be opened, so a fresh assessment was started. The old data is kept in this browser as a backup.', 'داده‌های ذخیره‌شده از نسخهٔ قدیمی‌تر باز نشد، پس ارزیابی تازه‌ای آغاز شد. داده‌های قدیمی به‌عنوان پشتیبان در همین مرورگر نگه داشته شده‌اند.')}</p></div>` : ''}
    <div class="as-bar"><div class="container as-bar__row">
      <div class="as-bar__pick">
        <label class="as-select"><span>${L('Assessment', 'ارزیابی')}</span><select id="as-asmt"></select></label>
        <label class="as-select"><span>${L('Site', 'واحد')}</span><select id="as-site"></select></label>
      </div>
      <div class="as-bar__score" aria-live="polite">
        <span class="as-total"><b id="as-total">0</b><small>/ ${num(M.totals.max)}</small></span>
        <span class="as-progress"><i id="as-progress-bar"></i></span>
        <span class="as-progress__t" id="as-progress"></span>
      </div>
      <div class="as-bar__tools">
        <span class="as-save" id="as-save"></span>
        <details class="as-menu">
          <summary class="as-iconbtn" aria-label="${L('Manage', 'مدیریت')}">${ICON.dots}</summary>
          <div class="as-menu__pop" role="menu">
            <button type="button" role="menuitem" data-act="new">${L('New assessment…', 'ارزیابی جدید…')}</button>
            <button type="button" role="menuitem" data-act="rename-a">${L('Rename assessment…', 'تغییر نام ارزیابی…')}</button>
            <button type="button" role="menuitem" data-act="delete-a">${L('Delete assessment…', 'حذف ارزیابی…')}</button>
            <hr>
            <button type="button" role="menuitem" data-act="add-site">${L('Add site…', 'افزودن واحد…')}</button>
            <button type="button" role="menuitem" data-act="rename-site">${L('Rename site…', 'تغییر نام واحد…')}</button>
            <button type="button" role="menuitem" data-act="delete-site">${L('Delete site…', 'حذف واحد…')}</button>
            <hr>
            <button type="button" role="menuitem" data-act="export">${L('Export as JSON', 'خروجی JSON')}</button>
            <button type="button" role="menuitem" data-act="import">${L('Import JSON…', 'ورود فایل JSON…')}</button>
          </div>
        </details>
        <input type="file" id="as-file" accept="application/json,.json" hidden>
      </div>
    </div></div>
    <div class="container as-layout">
      <button type="button" class="as-navbtn" id="as-navbtn" aria-controls="as-nav" aria-expanded="false">${ICON.menu}<span id="as-navbtn-t"></span></button>
      <nav class="as-nav" id="as-nav" aria-label="${L('Sub-criteria', 'زیرمعیارها')}">
        <div class="as-nav__head"><b>${L('Sub-criteria', 'زیرمعیارها')}</b><button type="button" class="as-iconbtn" id="as-navclose" aria-label="${L('Close', 'بستن')}">${ICON.x}</button></div>
        <div id="as-nav-list"></div>
      </nav>
      <div class="as-scrim" id="as-scrim" hidden></div>
      <article class="as-panel" id="as-panel" tabindex="-1"></article>
    </div>`;

  const $ = s => root.querySelector(s);
  const panel = $('#as-panel');
  let current = null;

  // ---------------------------------------------------------------- toolbar
  const renderBar = () => {
    const a = asmt();
    $('#as-asmt').innerHTML = Store.state.assessments.map(x => `<option value="${x.id}"${x.id === a.id ? ' selected' : ''}>${esc(asmtName(x))}</option>`).join('');
    $('#as-site').innerHTML = a.sites.map((s, k) => `<option value="${s.id}"${s.id === a.curSite ? ' selected' : ''}>${esc(siteName(s, k))}</option>`).join('');
    $('#as-site').closest('label').hidden = a.sites.length < 2;
  };

  // ---------------------------------------------------------------- navigator
  const navItem = (i, r) => {
    const done = r.answered / r.total;
    const label = i.kind === 'result' ? `${t(SUBS[i.subId].name)} — ${t(i.item.name)}` : t(i.item.name);
    return `<li><a href="#${i.id}" class="as-nav__item${i.id === current ? ' is-on' : ''}${r.complete ? ' is-done' : ''}" ${i.id === current ? 'aria-current="true"' : ''}>
      <span class="as-id">${itemId(i.id)}</span>
      <span class="as-nav__name" title="${esc(label)}">${esc(t(i.item.name))}</span>
      <span class="as-nav__pct">${r.answered ? `${num(r.pct)}${FA ? '٪' : '%'}` : '—'}</span>
      <i class="as-nav__bar" style="--d:${done}"></i></a></li>`;
  };
  const renderNav = res => {
    $('#as-nav-list').innerHTML = M.criteria.map(c => {
      const rc = res.criteria.find(x => x.id === c.id);
      const list = ITEMS.filter(i => i.criterionId === c.id);
      let body;
      if (c.kind === 'enabler') body = `<ul>${list.map(i => navItem(i, res.items[i.id])).join('')}</ul>`;
      else body = c.subs.map(s => `<p class="as-nav__sub">${itemId(s.id)} · ${esc(t(s.name))}</p><ul>${list.filter(i => i.subId === s.id).map(i => navItem(i, res.items[i.id])).join('')}</ul>`).join('');
      return `<div class="as-nav__group"><p class="as-nav__crit"><span>${num(c.id)}</span>${esc(t(c.name))}<b>${pts(rc.points)}<small>/${num(c.weight)}</small></b></p>${body}</div>`;
    }).join('');
    const started = Object.values(res.items).filter(i => i.answered).length;
    $('#as-navbtn-t').textContent = L(`Sub-criteria · ${started} of ${ITEMS.length} started`, `زیرمعیارها · ${num(started)} از ${num(ITEMS.length)} آغاز شده`);
  };

  // ---------------------------------------------------------------- totals
  const refresh = () => {
    const res = Engine.assess(M, data());
    $('#as-total').textContent = pts(res.total);
    $('#as-progress-bar').style.width = `${(res.progress.done / res.progress.total) * 100}%`;
    $('#as-progress').textContent = L(`${res.progress.done} of ${res.progress.total} attributes scored`, `${num(res.progress.done)} از ${num(res.progress.total)} ویژگی امتیازدهی شده`);
    renderNav(res);
    if (current) renderSummary(res);
    return res;
  };

  // ---------------------------------------------------------------- item panel
  const bandLabel = (kind, v) => t(M.scale.bands[Engine.band(M, v)][kind]);
  const attrRow = (kind, a, value, extra = '') => {
    const has = isNum(value);
    const v = has ? Number(value) : 0;
    const isCap = M.radar[kind].cap === a.id;
    return `<div class="as-attr${has ? '' : ' is-empty'}" data-attr="${a.id}">
      <div class="as-attr__top">
        <label for="a-${a.id}">${esc(t(a.name))}${isCap ? `<span class="as-cap-tag" title="${esc(t(M.radar[kind].capNote))}">${L('cap', 'سقف')}</span>` : ''}</label>
        <span class="as-attr__band">${has ? esc(bandLabel(kind, v)) : L('Not scored', 'امتیازدهی نشده')}</span>
        <output for="a-${a.id}">${has ? num(v) : '—'}</output>
        <button type="button" class="as-clear" data-clear="${a.id}" aria-label="${L('Clear score', 'پاک کردن امتیاز')}" ${has ? '' : 'hidden'}>${ICON.x}</button>
      </div>
      <input type="range" id="a-${a.id}" min="0" max="100" step="${M.scale.step}" value="${v}" style="--p:${v}%" aria-valuetext="${has ? `${v} — ${esc(bandLabel(kind, v))}` : L('not scored', 'امتیازدهی نشده')}">
      <div class="as-ticks" aria-hidden="true">${M.scale.bands.map(b => `<span>${num(b.min)}</span>`).join('')}<span>${num(100)}</span></div>
      ${extra}
      <details class="as-desc"><summary>${L('What this attribute looks for', 'این ویژگی چه چیزی را می‌سنجد')}</summary>
        <ul>${a.descriptors.map(d => `<li>${esc(t(d))}</li>`).join('')}</ul></details>
    </div>`;
  };

  const radarBlock = (kind, id) => {
    const scores = scoresOf(id);
    return M.radar[kind].elements.map(el => `
      <div class="as-el">
        <h3>${esc(t(el.name))}<b data-el="${el.id}"></b></h3>
        ${el.attributes.map(a => attrRow(kind, a, scores[a.id], kind === 'result' && ['trends', 'targets', 'comparisons'].includes(a.id) ? `<div class="as-suggest" data-suggest="${a.id}"></div>` : '')).join('')}
      </div>`).join('');
  };

  const guidanceBlock = (item, id) => {
    const g = guidanceOf(id), notes = notesOf(id);
    const LEVELS = [L('Not yet', 'هنوز نه'), L('Partly', 'تا حدی'), L('Covered', 'پوشش کامل')];
    return `<ol class="as-guide">${item.guidance.map((p, k) => `
      <li class="as-guide__item">
        <p class="as-guide__t">${esc(t(p))}</p>
        <div class="as-guide__row">
          <div class="as-seg" role="radiogroup" aria-label="${L('Coverage', 'میزان پوشش')}">
            ${LEVELS.map((lv, v) => `<label><input type="radio" name="g${k}" value="${v}" data-guide="${k}"${g[k] === v ? ' checked' : ''}><span>${lv}</span></label>`).join('')}
          </div>
          <button type="button" class="as-notebtn" data-notebtn="g${k}" ${notes[`g${k}`] ? 'hidden' : ''}>${ICON.note}${L('Add note', 'یادداشت')}</button>
        </div>
        <textarea class="as-note" data-note="g${k}" rows="2" placeholder="${L('Evidence for this point: document, KPI, process…', 'شواهد این مورد: سند، شاخص، فرایند…')}" ${notes[`g${k}`] ? '' : 'hidden'}>${esc(notes[`g${k}`] || '')}</textarea>
      </li>`).join('')}</ol>`;
  };

  const indicatorRow = (ind, k) => `
    <tr data-k="${k}">
      <td><input type="text" data-f="name" value="${esc(ind.name || '')}" placeholder="${L('Indicator name', 'نام شاخص')}" aria-label="${L('Indicator name', 'نام شاخص')}"></td>
      <td><select data-f="higher" aria-label="${L('Better when', 'بهتر وقتی')}">
        <option value="1"${ind.higher !== false ? ' selected' : ''}>${L('Higher', 'بیشتر')}</option>
        <option value="0"${ind.higher === false ? ' selected' : ''}>${L('Lower', 'کمتر')}</option></select></td>
      ${years().map(y => `<td><input type="number" inputmode="decimal" step="any" data-f="year" data-y="${y}" value="${isNum(ind.series?.[y]) ? ind.series[y] : ''}" aria-label="${digits(y)}"></td>`).join('')}
      <td><input type="number" inputmode="decimal" step="any" data-f="target" value="${isNum(ind.target) ? ind.target : ''}" aria-label="${L('Target', 'هدف')}"></td>
      <td><input type="number" inputmode="decimal" step="any" data-f="comp" value="${isNum(ind.comparator?.value) ? ind.comparator.value : ''}" aria-label="${L('Comparator', 'مقایسه')}"></td>
      <td><button type="button" class="as-iconbtn as-iconbtn--sm" data-del="${k}" aria-label="${L('Delete indicator', 'حذف شاخص')}">${ICON.x}</button></td>
    </tr>`;
  const indicatorsBlock = id => {
    const list = indicatorsOf(id);
    return `<div class="as-ind-wrap"><table class="as-ind">
        <thead><tr><th>${L('Indicator', 'شاخص')}</th><th>${L('Better when', 'بهتر وقتی')}</th>${years().map(y => `<th>${digits(y)}</th>`).join('')}<th>${L('Target', 'هدف')}</th><th>${L('Comparator', 'مقایسه')}</th><th><span class="visually-hidden">${L('Delete', 'حذف')}</span></th></tr></thead>
        <tbody>${list.map(indicatorRow).join('')}</tbody>
      </table>
      <p class="as-ind__empty"${list.length ? ' hidden' : ''}>${L('No indicators yet. Add the ones you measure, or pick from the examples above.', 'هنوز شاخصی ثبت نشده است. شاخص‌هایی را که اندازه می‌گیرید اضافه کنید یا از نمونه‌های بالا انتخاب کنید.')}</p></div>
      <button type="button" class="btn btn--ghost btn--sm as-addind" data-addind>${ICON.plus}${L('Add indicator', 'افزودن شاخص')}</button>`;
  };

  const renderPanel = id => {
    current = id;
    const i = BY_ID[id];
    const c = CRIT[i.criterionId];
    const k = ITEMS.indexOf(i);
    const prev = ITEMS[k - 1], next = ITEMS[k + 1];
    const crumb = i.kind === 'result'
      ? `${L(`Criterion ${c.id}`, `معیار ${num(c.id)}`)} · ${esc(t(c.name))} · ${itemId(i.subId)} ${esc(t(SUBS[i.subId].name))}`
      : `${L(`Criterion ${c.id}`, `معیار ${num(c.id)}`)} · ${esc(t(c.name))}`;
    const notes = notesOf(id);
    let body;
    if (i.kind === 'enabler') {
      body = `
        <section class="as-block">
          <h2>${L('Explain how you:', 'توضیح دهید که چگونه:')}</h2>
          <p class="as-block__lead">${L('Mark how well your evidence covers each point. This guides the scores below; it does not change them.', 'مشخص کنید شواهد شما هر مورد را تا چه حد پوشش می‌دهد. این کار راهنمای امتیازهای زیر است و آن‌ها را تغییر نمی‌دهد.')}</p>
          ${guidanceBlock(i.item, id)}
        </section>`;
    } else {
      body = `
        <section class="as-block">
          <h2>${L('Indicators', 'شاخص‌ها')}</h2>
          <p class="as-block__lead">${esc(t(i.item.intro))}</p>
          <ul class="as-examples">${i.item.examples.map((x, n) => `<li><button type="button" class="as-ex" data-ex="${n}" title="${L('Add as indicator', 'افزودن به‌عنوان شاخص')}">${ICON.plus}${esc(t(x))}</button></li>`).join('')}</ul>
          ${indicatorsBlock(id)}
        </section>`;
    }
    panel.innerHTML = `
      <header class="as-panel__head">
        <p class="as-crumb">${crumb}</p>
        <h1><span class="as-id as-id--lg">${itemId(id)}</span><span>${esc(t(i.item.name))}</span></h1>
        <a class="as-ref" href="${MODEL_URL}#i-${id}" target="_blank" rel="noopener">${L('Open in the model', 'نمایش در الگو')}${ICON.ext}</a>
      </header>
      <section class="as-summary" id="as-summary" aria-live="polite"></section>
      ${body}
      <section class="as-block">
        <h2>${L('RADAR scoring', 'امتیازدهی رادار')}</h2>
        <p class="as-block__lead">${L('Score each attribute from 0 to 100 in steps of 5.', 'هر ویژگی را از ۰ تا ۱۰۰ و با گام‌های ۵ امتیازی امتیاز دهید.')} ${esc(t(M.radar[i.kind].capNote))}</p>
        ${radarBlock(i.kind, id)}
      </section>
      <section class="as-block">
        <h2><label for="as-item-note">${L('Notes and evidence', 'یادداشت‌ها و شواهد')}</label></h2>
        <textarea class="as-note" id="as-item-note" data-note="item" rows="4" placeholder="${L('Strengths, areas to improve, and where the evidence is.', 'نقاط قوت، زمینه‌های بهبود و محل شواهد.')}">${esc(notes.item || '')}</textarea>
      </section>
      <nav class="as-pager" aria-label="${L('Previous and next', 'قبلی و بعدی')}">
        ${prev ? `<a class="btn btn--ghost btn--sm" href="#${prev.id}">${ICON.prev}${itemId(prev.id)}</a>` : '<span></span>'}
        ${next ? `<a class="btn btn--dark btn--sm" href="#${next.id}">${itemId(next.id)}${ICON.next}</a>` : `<span></span>`}
      </nav>`;
    refresh();
    if (i.kind === 'result') renderSuggestions();
    window.Glossary?.apply(panel, '.as-guide__t, .as-block__lead, .as-desc li');
  };

  // live summary for the current item
  const renderSummary = res => {
    const box = $('#as-summary');
    if (!box) return;
    const i = BY_ID[current];
    const r = res.items[current];
    const kind = i.kind;
    const capAttr = Engine.attributesOf(M, kind).find(a => a.id === M.radar[kind].cap);
    const capEl = M.radar[kind].elements.find(e => e.id === capAttr.elementId);
    box.innerHTML = `
      <div class="as-summary__main">
        <span class="as-summary__pct">${r.answered ? num(r.pct) : '—'}<small>${r.answered ? (FA ? '٪' : '%') : ''}</small></span>
        <span class="as-summary__pts">${L(`${pts(r.points)} of ${num(r.max)} pts`, `${pts(r.points)} از ${num(r.max)} امتیاز`)}</span>
        <span class="as-summary__band">${r.answered ? esc(bandLabel(kind, r.pct)) : L('Not scored yet', 'هنوز امتیازدهی نشده')}</span>
      </div>
      <ul class="as-summary__els">${M.radar[kind].elements.map(el => `<li><span>${esc(t(el.name))}</span><i style="--v:${r.elements[el.id]}"></i><b>${num(Math.round(r.elements[el.id]))}</b></li>`).join('')}</ul>
      ${r.capped ? `<p class="as-summary__cap">${L(`Capped at ${num(r.pct)} by ${t(capAttr.name)} (${t(capEl.name)}): the item can't score higher than this attribute.`, `محدود به ${num(r.pct)} با ویژگی «${t(capAttr.name)}» (${t(capEl.name)}): امتیاز این زیرمعیار نمی‌تواند از این ویژگی بیشتر باشد.`)}</p>` : ''}
      ${r.answered && !r.complete ? `<p class="as-summary__hint">${L(`${r.answered} of ${r.total} attributes scored. Unscored ones count as 0.`, `${num(r.answered)} از ${num(r.total)} ویژگی امتیازدهی شده است. ویژگی‌های بدون امتیاز صفر حساب می‌شوند.`)}</p>` : ''}`;
    for (const el of M.radar[kind].elements) {
      const b = panel.querySelector(`[data-el="${el.id}"]`);
      if (b) b.textContent = num(Math.round(r.elements[el.id]));
    }
  };

  // score suggestions from the indicator table (results items)
  const renderSuggestions = () => {
    const s = Engine.suggest(indicatorsOf(current));
    const basis = {
      trends: b => L(`${b.trendsOk} of ${b.n} indicators improve or hold steady over 3 consecutive years`, `${num(b.trendsOk)} از ${num(b.n)} شاخص در ۳ سال پیاپی بهبود یافته یا پایدار مانده‌اند`),
      targets: b => L(`${b.targetsOk} of ${b.n} indicators meet their target`, `${num(b.targetsOk)} از ${num(b.n)} شاخص به هدف رسیده‌اند`),
      comparisons: b => L(`${b.compOk} of ${b.n} indicators compare favorably`, `${num(b.compOk)} از ${num(b.n)} شاخص در مقایسه وضعیت مطلوبی دارند`),
    };
    panel.querySelectorAll('[data-suggest]').forEach(box => {
      const a = box.dataset.suggest;
      if (!s) { box.innerHTML = `<p class="as-suggest__none">${L('Add indicators with yearly values to get a suggested score.', 'برای دریافت امتیاز پیشنهادی، شاخص‌ها را با مقادیر سالانه وارد کنید.')}</p>`; return; }
      const same = Number(scoresOf(current)[a]) === s[a];
      box.innerHTML = `<button type="button" class="as-suggest__btn" data-apply="${a}" data-v="${s[a]}"${same ? ' disabled' : ''}>
        <b>${L('Suggested', 'پیشنهادی')}: ${num(s[a])}</b><span>${esc(basis[a](s.basis))}</span>${same ? `<em>${L('applied', 'اعمال شد')}</em>` : ''}</button>`;
    });
  };

  // ---------------------------------------------------------------- events
  const updateAttrRow = (row, v) => {
    const kind = BY_ID[current].kind;
    const input = row.querySelector('input[type=range]');
    const has = v !== null;
    row.classList.toggle('is-empty', !has);
    input.value = has ? v : 0;
    input.style.setProperty('--p', `${has ? v : 0}%`);
    input.setAttribute('aria-valuetext', has ? `${v} — ${bandLabel(kind, v)}` : L('not scored', 'امتیازدهی نشده'));
    row.querySelector('output').textContent = has ? num(v) : '—';
    row.querySelector('.as-attr__band').textContent = has ? bandLabel(kind, v) : L('Not scored', 'امتیازدهی نشده');
    row.querySelector('.as-clear').hidden = !has;
  };

  panel.addEventListener('input', e => {
    const el = e.target;
    if (el.type === 'range') {
      const row = el.closest('.as-attr');
      const v = Number(el.value);
      setScore(current, row.dataset.attr, v);
      updateAttrRow(row, v);
      refresh();
      if (BY_ID[current].kind === 'result') renderSuggestions();
      scheduleSave();
    } else if (el.dataset.note) {
      setNote(current, el.dataset.note, el.value);
      scheduleSave();
    } else if (el.closest('.as-ind')) {
      const k = Number(el.closest('tr').dataset.k);
      const ind = indicatorsOf(current)[k];
      const f = el.dataset.f;
      const val = el.value === '' ? null : Number(el.value);
      if (f === 'name') ind.name = el.value;
      else if (f === 'year') { ind.series = ind.series || {}; if (val === null) delete ind.series[el.dataset.y]; else ind.series[el.dataset.y] = val; }
      else if (f === 'target') { if (val === null) delete ind.target; else ind.target = val; }
      else if (f === 'comp') { if (val === null) delete ind.comparator; else ind.comparator = { label: '', value: val }; }
      renderSuggestions();
      scheduleSave();
    }
  });

  panel.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.guide !== undefined) {
      const g = data().guidance[current] = data().guidance[current] || [];
      g[Number(el.dataset.guide)] = Number(el.value);
      scheduleSave();
    } else if (el.dataset.f === 'higher') {
      indicatorsOf(current)[Number(el.closest('tr').dataset.k)].higher = el.value === '1';
      renderSuggestions();
      scheduleSave();
    }
  });

  const addIndicator = (name = '') => {
    const list = indicatorsOf(current);
    list.push({ id: `ind_${Date.now().toString(36)}`, name, unit: '', higher: true, series: {} });
    const wrap = panel.querySelector('.as-ind-wrap');
    wrap.querySelector('tbody').insertAdjacentHTML('beforeend', indicatorRow(list[list.length - 1], list.length - 1));
    wrap.querySelector('.as-ind__empty').hidden = true;
    const input = wrap.querySelector('tbody tr:last-child input[data-f="name"]');
    if (!name) input.focus(); else wrap.querySelector('tbody tr:last-child input[data-f="year"]').focus();
    renderSuggestions();
    scheduleSave();
  };

  panel.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.clear) {
      setScore(current, b.dataset.clear, null);
      updateAttrRow(b.closest('.as-attr'), null);
      refresh();
      if (BY_ID[current].kind === 'result') renderSuggestions();
      scheduleSave();
    } else if (b.dataset.notebtn) {
      b.hidden = true;
      const ta = panel.querySelector(`textarea[data-note="${b.dataset.notebtn}"]`);
      ta.hidden = false; ta.focus();
    } else if (b.dataset.apply) {
      const row = panel.querySelector(`.as-attr[data-attr="${b.dataset.apply}"]`);
      const v = Number(b.dataset.v);
      setScore(current, b.dataset.apply, v);
      updateAttrRow(row, v);
      refresh(); renderSuggestions(); scheduleSave();
    } else if (b.dataset.addind !== undefined) {
      addIndicator();
    } else if (b.dataset.ex !== undefined) {
      addIndicator(t(BY_ID[current].item.examples[Number(b.dataset.ex)]));
    } else if (b.dataset.del !== undefined) {
      const list = indicatorsOf(current);
      const k = Number(b.dataset.del);
      if (list[k].name && !confirm(L(`Delete the indicator "${list[k].name}"?`, `شاخص «${list[k].name}» حذف شود؟`))) return;
      list.splice(k, 1);
      const wrap = panel.querySelector('.as-ind-wrap');
      wrap.querySelector('tbody').innerHTML = list.map(indicatorRow).join('');
      wrap.querySelector('.as-ind__empty').hidden = list.length > 0;
      renderSuggestions(); scheduleSave();
    }
  });

  // routing: #1-1 opens that item
  const navOpen = open => {
    root.classList.toggle('is-nav-open', open);
    $('#as-navbtn').setAttribute('aria-expanded', String(open));
    $('#as-scrim').hidden = !open;
    if (open) $('#as-nav').querySelector('.is-on')?.scrollIntoView({ block: 'center' });
  };
  const route = focus => {
    const id = decodeURIComponent(location.hash.slice(1));
    renderPanel(BY_ID[id] ? id : ITEMS[0].id);
    navOpen(false);
    if (focus) { scrollTo({ top: 0 }); panel.focus({ preventScroll: true }); }
  };
  addEventListener('hashchange', () => route(true));
  $('#as-navbtn').addEventListener('click', () => navOpen(true));
  $('#as-navclose').addEventListener('click', () => navOpen(false));
  $('#as-scrim').addEventListener('click', () => navOpen(false));
  addEventListener('keydown', e => { if (e.key === 'Escape') { navOpen(false); $('.as-menu').open = false; } });

  // ---------------------------------------------------------------- toolbar actions
  const reload = () => { renderBar(); route(false); };
  $('#as-asmt').addEventListener('change', e => { Store.switchAssessment(e.target.value); reload(); });
  $('#as-site').addEventListener('change', e => { Store.switchSite(e.target.value); reload(); });
  document.addEventListener('click', e => { const m = $('.as-menu'); if (m.open && !m.contains(e.target)) m.open = false; });

  $('.as-menu__pop').addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    $('.as-menu').open = false;
    const a = asmt();
    const k = a.sites.findIndex(s => s.id === a.curSite);
    if (act === 'new') {
      const y = prompt(L('Year of the new assessment (Solar Hijri):', 'سال ارزیابی جدید (شمسی):'), String(Number(a.year) + 1));
      if (y === null) return;
      const year = parseInt(String(y).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)), 10);
      if (!year) return;
      Store.addAssessment(year, '');
    } else if (act === 'rename-a') {
      const n = prompt(L('Name for this assessment (optional):', 'نام این ارزیابی (اختیاری):'), a.name);
      if (n === null) return;
      a.name = n.trim(); Store.save();
    } else if (act === 'delete-a') {
      if (Store.state.assessments.length < 2) { alert(L('This is the only assessment, so it cannot be deleted.', 'این تنها ارزیابی است و حذف نمی‌شود.')); return; }
      if (!confirm(L(`Delete the assessment ${asmtName(a)} and all its scores?`, `ارزیابی ${asmtName(a)} و همهٔ امتیازهایش حذف شود؟`))) return;
      Store.deleteAssessment(a.id);
    } else if (act === 'add-site') {
      const n = prompt(L('Name of the new site or unit:', 'نام واحد یا سایت جدید:'), '');
      if (n === null) return;
      Store.addSite(n.trim());
    } else if (act === 'rename-site') {
      const n = prompt(L('New name for this site:', 'نام تازهٔ این واحد:'), siteName(a.sites[k], k));
      if (n === null) return;
      Store.renameSite(a.curSite, n.trim());
    } else if (act === 'delete-site') {
      if (a.sites.length < 2) { alert(L('This is the only site, so it cannot be deleted.', 'این تنها واحد است و حذف نمی‌شود.')); return; }
      if (!confirm(L(`Delete "${siteName(a.sites[k], k)}" and all its scores?`, `«${siteName(a.sites[k], k)}» و همهٔ امتیازهایش حذف شود؟`))) return;
      Store.deleteSite(a.curSite);
    } else if (act === 'export') {
      Store.save(); Store.exportJSON(); return;
    } else if (act === 'import') {
      $('#as-file').click(); return;
    }
    reload(); showSaved(!Store.blocked);
  });

  $('#as-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const next = await Store.readImport(file);
      const n = next.assessments.length;
      if (!confirm(L(`Replace everything in this browser with the ${n} assessment(s) in "${file.name}"?`, `همهٔ داده‌های این مرورگر با ${num(n)} ارزیابی موجود در «${file.name}» جایگزین شود؟`))) return;
      showSaved(Store.replace(next));
      reload();
    } catch (err) {
      alert(L(`This file can't be imported: ${err.message}.`, `این فایل وارد نمی‌شود: ${err.message}`));
    }
  });

  // ---------------------------------------------------------------- start
  renderBar();
  route(false);
  showSaved(!Store.blocked);
})();
