// T5.1 — Assessment report (report.html, fa/report.html).
// Reads the current assessment and site from js/store.js and shows the total, criteria,
// gaps, concept coverage, strengths and areas to improve, year-on-year change and sites.
(() => {
  const M = window.IMI_1404;
  const { t, num, esc, FA, itemId, digits } = window.I18N;
  const Store = window.Store;
  const Engine = window.Engine;
  const root = document.getElementById('rp-root');
  if (!M || !root || !Store || !Engine) return;

  const L = (en, fa) => (FA ? fa : en);
  const ITEMS = Engine.items(M);
  const BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  const SUBS = Object.fromEntries(M.criteria.filter(c => c.subs).flatMap(c => c.subs.map(s => [s.id, s])));
  const pct = n => (FA ? `${num(n)}٪` : `${num(n)}%`);
  const pts = n => num(n, n % 1 ? 1 : 0);
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + pts(Math.abs(n));
  const ARC = 377;

  // Scorely's own maturity levels (the model defines none) — same as the calculator.
  const LEVELS = [0, 250, 400, 550, 700];
  const LEVEL_NAMES = FA
    ? ['در آغاز راه', 'در حال توسعه', 'تثبیت‌شده', 'پیشرفته', 'الگو']
    : ['Getting started', 'Developing', 'Established', 'Advanced', 'Role model'];
  const level = total => LEVEL_NAMES[LEVELS.filter(b => Math.round(total) >= b).length - 1];

  const siteName = (s, k) => s.name || (k === 0 ? L('Main site', 'واحد اصلی') : L(`Site ${k + 1}`, `واحد ${num(k + 1)}`));
  const asmtName = a => `${digits(a.year)}${a.name ? ` — ${a.name}` : ''}`;
  const itemName = id => {
    const i = BY_ID[id];
    return i.kind === 'result' ? `${t(SUBS[i.subId].name)} — ${t(i.item.name)}` : t(i.item.name);
  };
  const link = id => `assessment.html#${id}`;
  const bar = (v, cls = '') => `<span class="rp-bar ${cls}"><i style="--v:${Math.max(0, Math.min(100, v))}"></i></span>`;

  // ---------------------------------------------------------------- sections
  const section = (id, title, intro, body) => `
    <section class="rp-sec" id="${id}" aria-labelledby="h-${id}">
      <header class="rp-sec__head"><h2 id="h-${id}">${title}</h2>${intro ? `<p>${intro}</p>` : ''}</header>
      ${body}
    </section>`;

  const overview = (a, res) => {
    const share = res.progress.done / res.progress.total;
    const started = Object.values(res.items).filter(i => i.answered).length;
    return `
      <div class="rp-overview">
        <div class="rp-score">
          <p class="calc__kicker">${L('Total score', 'امتیاز کل')}</p>
          <div class="gauge gauge--lg"><svg viewBox="0 0 200 200" aria-hidden="true">
            <defs><linearGradient id="g-rp" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#c7ef6b"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
            <circle class="gauge__track" cx="100" cy="100" r="80"/><circle class="gauge__val" cx="100" cy="100" r="80" stroke="url(#g-rp)" style="--off:${ARC - ARC * Math.min(res.total / M.totals.max, 1)}"/></svg>
            <div class="gauge__num"><strong>${pts(Math.round(res.total))}</strong><span>${L(`of ${num(M.totals.max)}`, `از ${num(M.totals.max)}`)}</span></div>
          </div>
          <p class="calc__band">${level(res.total)}</p>
          <p class="rp-score__fine">${L('Maturity level as defined by Scorely, not by the model.', 'سطح بلوغ بر اساس تعریف اسکورلی است، نه الگو.')}</p>
        </div>
        <div class="rp-kinds">
          ${['enabler', 'result'].map(k => `
            <div class="rp-kind">
              <span class="rp-kind__t">${esc(t(M.kinds[k]))}</span>
              <b>${pts(res[k])}<small>/ ${num(M.totals[k])}</small></b>
              ${bar((res[k] / M.totals[k]) * 100)}
            </div>`).join('')}
          <div class="rp-kind rp-kind--meta">
            <span class="rp-kind__t">${L('Scored so far', 'امتیازدهی تاکنون')}</span>
            <b>${pct(Math.round(share * 100))}</b>
            ${bar(share * 100, 'rp-bar--muted')}
            <small>${L(`${res.progress.done} of ${res.progress.total} attributes, ${started} of ${ITEMS.length} items started`, `${num(res.progress.done)} از ${num(res.progress.total)} ویژگی، ${num(started)} از ${num(ITEMS.length)} زیرمعیار آغاز شده`)}</small>
          </div>
          <dl class="rp-meta">
            <div><dt>${L('Assessment', 'ارزیابی')}</dt><dd>${esc(asmtName(a))}</dd></div>
            <div><dt>${L('Site', 'واحد')}</dt><dd>${esc(siteName(a.sites.find(s => s.id === a.curSite), a.sites.findIndex(s => s.id === a.curSite)))}</dd></div>
            <div><dt>${L('Model', 'الگو')}</dt><dd>${esc(t(M.name))}</dd></div>
          </dl>
        </div>
      </div>`;
  };

  const criteria = res => `<div class="rp-crits">${res.criteria.map(rc => {
    const c = M.criteria.find(x => x.id === rc.id);
    const rows = rc.items.map(r => `
      <li>
        <a href="${link(r.id)}" class="rp-item">
          <span class="as-id">${itemId(r.id)}</span>
          <span class="rp-item__name">${esc(itemName(r.id))}
            ${r.capped ? `<em class="rp-flag rp-flag--cap">${L('capped', 'محدود به سقف')}</em>` : ''}
            ${!r.answered ? `<em class="rp-flag">${L('not scored', 'امتیازدهی نشده')}</em>` : !r.complete ? `<em class="rp-flag">${L('incomplete', 'ناقص')}</em>` : ''}</span>
          ${bar(r.pct)}
          <b>${pts(r.points)}<small>/${num(r.max)}</small></b>
        </a>
      </li>`).join('');
    return `<details class="rp-crit">
      <summary>
        <span class="rp-crit__n">${num(c.id)}</span>
        <span class="rp-crit__name">${esc(t(c.name))}<small>${esc(t(M.kinds[c.kind]))}</small></span>
        ${bar(rc.pct)}
        <span class="rp-crit__pts"><b>${pts(rc.points)}</b><small>/${num(rc.max)}</small><em>${pct(Math.round(rc.pct))}</em></span>
      </summary>
      <ul class="rp-items">${rows}</ul>
    </details>`;
  }).join('')}</div>`;

  const gaps = res => {
    const top = res.gaps.slice(0, 5);
    if (!top.length) return `<p class="rp-empty">${L('No points left to gain. Every item is at 100.', 'امتیازی برای کسب باقی نمانده است. همهٔ زیرمعیارها ۱۰۰ هستند.')}</p>`;
    return `<ol class="rp-gaps">${top.map((g, k) => `
      <li><a href="${link(g.id)}">
        <span class="rp-gaps__n">${num(k + 1)}</span>
        <span class="rp-gaps__t"><span class="as-id">${itemId(g.id)}</span> ${esc(itemName(g.id))}
          <small>${L(`Now ${pct(g.pct)} · weight ${num(g.weight)}`, `اکنون ${pct(g.pct)} · وزن ${num(g.weight)}`)}</small></span>
        <b>${L(`+${pts(g.lost)} pts`, `+${pts(g.lost)} امتیاز`)}<small>${L('possible', 'قابل کسب')}</small></b>
      </a></li>`).join('')}</ol>`;
  };

  const concepts = res => `<ul class="rp-concepts">${res.concepts.map(rc => {
    const c = M.concepts.find(x => x.id === rc.id);
    return `<li><a href="model.html#c-${c.id}">${esc(t(c.name))}</a>${bar(rc.pct)}<b>${pct(Math.round(rc.pct))}</b></li>`;
  }).join('')}</ul>`;

  const strengths = (res, d) => {
    const scored = Object.values(res.items).filter(r => r.answered);
    const list = (rows, empty) => (rows.length ? `<ul class="rp-sa">${rows.map(r => {
      const note = d.notes[r.id]?.item;
      return `<li><a href="${link(r.id)}"><span class="as-id">${itemId(r.id)}</span>${esc(itemName(r.id))}<b>${pct(r.pct)}</b></a>${note ? `<p class="rp-note">${esc(note)}</p>` : ''}</li>`;
    }).join('')}</ul>` : `<p class="rp-empty">${empty}</p>`);
    const strong = scored.filter(r => r.pct >= 65).sort((a, b) => b.pct - a.pct);
    const weak = scored.filter(r => r.pct <= 35).sort((a, b) => a.pct - b.pct);
    const unscored = ITEMS.length - scored.length;
    return `<div class="rp-cols">
        <div class="rp-col rp-col--good"><h3>${L('Strengths', 'نقاط قوت')}<small>${L('items at 65% or more', 'زیرمعیارهای ۶۵٪ و بالاتر')}</small></h3>${list(strong, L('No item has reached 65% yet.', 'هنوز هیچ زیرمعیاری به ۶۵٪ نرسیده است.'))}</div>
        <div class="rp-col rp-col--bad"><h3>${L('Areas to improve', 'زمینه‌های بهبود')}<small>${L('scored items at 35% or less', 'زیرمعیارهای امتیازدهی‌شده با ۳۵٪ و کمتر')}</small></h3>${list(weak, L('No scored item is at 35% or below.', 'هیچ زیرمعیار امتیازدهی‌شده‌ای ۳۵٪ یا کمتر نیست.'))}</div>
      </div>
      ${unscored ? `<p class="rp-fine">${L(`${unscored} items are not scored yet and are left out of both lists.`, `${num(unscored)} زیرمعیار هنوز امتیازدهی نشده و در این دو فهرست نیامده است.`)}</p>` : ''}`;
  };

  // the latest earlier assessment of the same model; the site is matched by name, else the first one
  const previous = a => {
    const earlier = Store.state.assessments.filter(x => x.model === a.model && Number(x.year) < Number(a.year))
      .sort((x, y) => y.year - x.year)[0];
    if (!earlier) return null;
    const cur = a.sites.find(s => s.id === a.curSite);
    const site = earlier.sites.find(s => cur.name && s.name === cur.name) || earlier.sites[0];
    return { a: earlier, res: Engine.assess(M, earlier.data[site.id]) };
  };
  const yearOnYear = (res, prev) => `
    <div class="as-ind-wrap rp-yoy-wrap"><table class="rp-table">
      <thead><tr><th>${L('Criterion', 'معیار')}</th><th>${digits(prev.a.year)}</th><th>${digits(Store.current().year)}</th><th>${L('Change', 'تغییر')}</th></tr></thead>
      <tbody>${res.criteria.map((rc, k) => {
        const p = prev.res.criteria[k].points, d = rc.points - p;
        return `<tr><td>${num(rc.id)} · ${esc(t(M.criteria[k].name))}</td><td>${pts(p)}</td><td>${pts(rc.points)}</td><td class="${d > 0 ? 'is-up' : d < 0 ? 'is-down' : ''}">${signed(d)}</td></tr>`;
      }).join('')}
      <tr class="rp-table__total"><td>${L('Total', 'جمع')}</td><td>${pts(prev.res.total)}</td><td>${pts(res.total)}</td><td class="${res.total > prev.res.total ? 'is-up' : res.total < prev.res.total ? 'is-down' : ''}">${signed(res.total - prev.res.total)}</td></tr>
      </tbody></table></div>`;

  const sites = a => `<ul class="rp-sites">${a.sites.map((s, k) => {
    const total = Engine.assess(M, a.data[s.id]).total;
    return `<li class="${s.id === a.curSite ? 'is-on' : ''}"><span>${esc(siteName(s, k))}</span>${bar((total / M.totals.max) * 100)}<b>${pts(total)}</b></li>`;
  }).join('')}</ul>`;

  // ---------------------------------------------------------------- page
  const render = () => {
    const a = Store.current();
    const d = Store.site();
    const res = Engine.assess(M, d);
    const prev = previous(a);
    root.innerHTML = `
      <div class="as-bar rp-bar-top"><div class="container as-bar__row">
        <div class="as-bar__pick">
          <label class="as-select"><span>${L('Assessment', 'ارزیابی')}</span><select id="rp-asmt">${Store.state.assessments.map(x => `<option value="${x.id}"${x.id === a.id ? ' selected' : ''}>${esc(asmtName(x))}</option>`).join('')}</select></label>
          ${a.sites.length > 1 ? `<label class="as-select"><span>${L('Site', 'واحد')}</span><select id="rp-site">${a.sites.map((s, k) => `<option value="${s.id}"${s.id === a.curSite ? ' selected' : ''}>${esc(siteName(s, k))}</option>`).join('')}</select></label>` : ''}
        </div>
        <div class="as-bar__tools">
          <a class="btn btn--ghost btn--sm" href="assessment.html">${L('Edit scores', 'ویرایش امتیازها')}</a>
          <button type="button" class="btn btn--dark btn--sm" id="rp-print">${L('Print or save as PDF', 'چاپ یا ذخیرهٔ PDF')}</button>
        </div>
      </div></div>
      <div class="container rp-body">
        <header class="rp-head">
          <p class="eyebrow">${L('Self-assessment report', 'گزارش خودارزیابی')}</p>
          <h1 class="h2">${esc(t(M.name))}</h1>
          <p class="rp-head__sub">${L('Assessment', 'ارزیابی')} ${esc(asmtName(a))}${a.sites.length > 1 ? ` · ${esc(siteName(a.sites.find(s => s.id === a.curSite), a.sites.findIndex(s => s.id === a.curSite)))}` : ''} · ${L('printed', 'تاریخ')} ${new Date().toLocaleDateString(FA ? 'fa-IR' : 'en-GB')}</p>
        </header>
        ${res.progress.done === 0 ? `<p class="as-notice rp-start">${L('Nothing has been scored yet, so every score below is 0.', 'هنوز چیزی امتیازدهی نشده است، پس همهٔ امتیازهای زیر صفر هستند.')} <a href="assessment.html">${L('Start the assessment →', 'شروع ارزیابی ←')}</a></p>` : ''}
        ${overview(a, res)}
        ${section('criteria', L('Score by criterion', 'امتیاز هر معیار'), L('Open a criterion to see its items. Each item links to its scores in the assessment.', 'هر معیار را باز کنید تا زیرمعیارهایش را ببینید. هر زیرمعیار به امتیازهایش در ارزیابی پیوند دارد.'), criteria(res))}
        ${section('gaps', L('Biggest gaps', 'بزرگ‌ترین شکاف‌ها'), L('The five items with the most points still available: weight × (100 − score).', 'پنج زیرمعیاری که بیشترین امتیاز قابل کسب را دارند: وزن × (۱۰۰ − امتیاز).'), gaps(res))}
        ${section('strengths', L('Strengths and areas to improve', 'نقاط قوت و زمینه‌های بهبود'), L('With the notes recorded for each item.', 'همراه با یادداشت‌های ثبت‌شده برای هر زیرمعیار.'), strengths(res, d))}
        ${section('concepts', L('Fundamental concepts coverage', 'پوشش مفاهیم بنیادین'), L('Each concept scored as the average of its related enabler sub-criteria. Derived from the concept–criteria map (p.52); not a score defined by the model.', 'هر مفهوم برابر میانگین زیرمعیارهای توانمندساز مرتبط با آن است. برگرفته از جدول ارتباط مفاهیم و معیارها (ص. ۵۲)؛ امتیازی که الگو تعریف کرده باشد نیست.'), concepts(res))}
        ${prev ? section('yoy', L('Change since last assessment', 'تغییر نسبت به ارزیابی قبلی'), L(`Compared with the ${prev.a.year} assessment.`, `در مقایسه با ارزیابی ${digits(prev.a.year)}.`), yearOnYear(res, prev)) : ''}
        ${a.sites.length > 1 ? section('sites', L('Sites compared', 'مقایسهٔ واحدها'), L('Total score of each site in this assessment.', 'امتیاز کل هر واحد در این ارزیابی.'), sites(a)) : ''}
        <p class="rp-disclaimer">${L('A structured self-assessment against the 1404 Organizational Excellence Model, not an official award score.', 'خودارزیابی ساختاریافته بر پایهٔ الگوی تعالی سازمانی ۱۴۰۴؛ امتیاز رسمی جایزه نیست.')}</p>
      </div>`;

    root.querySelector('#rp-asmt').addEventListener('change', e => { Store.switchAssessment(e.target.value); render(); });
    root.querySelector('#rp-site')?.addEventListener('change', e => { Store.switchSite(e.target.value); render(); });
    root.querySelector('#rp-print').addEventListener('click', () => print());
  };

  // print every criterion opened, then restore what the reader had open
  let openBefore = [];
  addEventListener('beforeprint', () => {
    const all = [...root.querySelectorAll('details')];
    openBefore = all.filter(d => d.open);
    all.forEach(d => { d.open = true; });
  });
  addEventListener('afterprint', () => {
    root.querySelectorAll('details').forEach(d => { d.open = openBefore.includes(d); });
  });

  render();
})();
