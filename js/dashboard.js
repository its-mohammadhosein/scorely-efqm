// Management dashboard (yourcompany/dashboard.html, fa/yourcompany/dashboard.html).
// For top managers: one chart per indicator, with the yearly results as bars, the target as a
// dashed line and the benchmark as a solid line, all on one axis. Headline tiles and a
// "needs attention" list sit above; filters in one row; a table view under every chart.
// Reads the indicators made on the Your company page. With none yet, it can show
// Company X sample data, held in memory and never saved.
(() => {
  const M = window.IMI_1404, S = window.Store, X = window.Indicators, E = window.Engine;
  const { t, num, pct, esc, FA, digits, LOCALE, itemId: fmtId } = window.I18N;
  const root = document.getElementById('db-root');
  if (!M || !S || !X || !E || !root) return;

  const L = (en, fa) => (FA ? fa : en);
  const results = M.criteria.find(c => c.kind === 'result');
  const PARTS = results.subs.flatMap(s => s.items.map(p => ({ ...p, sub: s })));
  const partById = Object.fromEntries(PARTS.map(p => [p.id, p]));
  const isNum = X.isNum;
  const year = y => digits(y);
  const fmtVal = v => num(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);
  const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
  const fmtAxis = v => (Math.abs(v) >= 10000 ? compact.format(v) : fmtVal(v));
  // A value with the unit typed in the wizard: "14.3%" for percentages, "39.3 hours" otherwise.
  const isPct = u => /^\s*(%|٪|percent|درصد)\s*$/i.test(u || '');
  const withUnit = (v, unit) => (isPct(unit) ? pct(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2) : unit ? `${fmtVal(v)} ${unit}` : fmtVal(v));

  const ICON = {
    ok: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    no: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    up: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17 10 12l3.5 3.5L19 9"/><path d="M14 9h5v5"/></svg>',
    down: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7l5 5 3.5-3.5L19 15"/><path d="M14 15h5v-5"/></svg>',
    print: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><path d="M7 14h10v7H7Z"/></svg>',
    plus: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    flag: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4h11l-2 4 2 4H5"/></svg>',
  };

  // ---------------------------------------------------------------- data
  // One record per indicator, the same whether it comes from the store or the sample:
  // { id, name, unit, part, higher, years, now, actual[], target[], peer[], peerLabel }
  // `now` is the index of the latest year with actuals; a later year can carry a target only.
  const trim = rec => {
    // drop trailing years with nothing in them
    let n = rec.years.length;
    while (n > rec.now + 1 && !isNum(rec.target[n - 1]) && !isNum(rec.peer[n - 1])) n--;
    for (const k of ['years', 'actual', 'target', 'peer']) rec[k] = rec[k].slice(0, n);
    return rec;
  };

  const fromStore = () => {
    const LAST = S.current().year;
    const years = [LAST - 4, LAST - 3, LAST - 2, LAST - 1, LAST, LAST + 1];
    return S.state.indicators.map(ind => {
      const bench = X.benchmark(ind);
      const rs = X.resultsOf(S.state, ind, years);
      return trim({
        id: ind.id, name: ind.name, unit: ind.unit, part: ind.part, higher: ind.higher, years, now: 4,
        actual: rs.map((r, k) => (r.ok && k <= 4 ? r.value : null)),
        target: years.map(y => X.target(ind, y)),
        peer: years.map(y => (bench && isNum(bench.values[y]) ? Number(bench.values[y]) : null)),
        peerLabel: bench?.label || '',
      });
    });
  };

  // Company X (an imaginary lead and silver mine), 1400–1404 actuals and a 1405 target.
  const _ = null;
  const SAMPLE_YEARS = [1400, 1401, 1402, 1403, 1404, 1405];
  const PEER = L('Peer company', 'شرکت هم‌تراز');
  const SAMPLE = [
    ['margin', '7-5C', true, { en: 'Operating margin', fa: 'حاشیهٔ سود عملیاتی' }, { en: '%', fa: 'درصد' },
      [15.3, 8.3, 31.4, 34.2, 51.8], [16.1, 8.9, 36.4, 41.8, 63.3, 65.2], [_, _, 62.6, 57.9, 97.6]],
    ['cost', '7-5C', false, { en: 'Production cost per tonne', fa: 'هزینهٔ تولید هر تن' }, { en: 'M rial / t', fa: 'میلیون ریال بر تن' },
      [507.9, 776.9, 624.3, 904.0, 1272.5], [424.1, 354.3, 616.5, 921.5, 1118.7, 1859.2], [_, _, 332.7, 454.6, 526.0]],
    ['revenue', '7-5C', true, { en: 'Operating revenue', fa: 'درآمد عملیاتی' }, { en: 'M rial', fa: 'میلیون ریال' },
      [464104, 399991, 887812, 1462110, 2123860], [487309, 407991, 843421, 1315899, 1911474, 3502500], [_, _, 2688494, 3546801, 6180000]],
    ['recovery', '7-5C', true, { en: 'Lead recovery', fa: 'بازیابی سرب' }, { en: '%', fa: 'درصد' },
      [40.0, 56.2, 60.8, 48.5, 69.8], [66.7, 66.7, 66.7, 73.3, 63.3], []],
    ['csat', '7-1A', true, { en: 'Key-customer satisfaction', fa: 'رضایت مشتریان کلیدی' }, { en: 'score / 10', fa: 'امتیاز از ۱۰' },
      [5, 6, 8, 9, 10], [], []],
    ['turnover', '7-2B', false, { en: 'Staff turnover', fa: 'نرخ ترک کارکنان' }, { en: '%', fa: 'درصد' },
      [67.3, 50.0, 15.4, 9.4, 14.3], [_, _, _, _, 8], []],
    ['training', '7-2B', true, { en: 'Training hours per employee', fa: 'ساعت آموزش به ازای هر نفر' }, { en: 'hours', fa: 'ساعت' },
      [28.8, 11.9, 19.2, 34.0, 39.3], [_, _, _, _, 35], []],
    ['local', '7-3B', true, { en: 'Local employment', fa: 'اشتغال نیروی بومی' }, { en: '%', fa: 'درصد' },
      [59.6, 69.0, 71.2, 75.5, 80.4], [], []],
    ['kwh', '7-3B', false, { en: 'Electricity per tonne', fa: 'مصرف برق به ازای هر تن' }, { en: 'kWh / t', fa: 'کیلووات‌ساعت بر تن' },
      [1487, 2723, 1306, 2155, 3671], [1104, 1104, 1146, 1953, 2869], []],
  ];
  const fromSample = () => SAMPLE.map(([id, part, higher, name, unit, actual, target, peer]) => trim({
    id: `sample-${id}`, name: t(name), unit: t(unit), part, higher, years: SAMPLE_YEARS, now: 4,
    actual: SAMPLE_YEARS.map((_y, k) => (isNum(actual[k]) ? actual[k] : null)),
    target: SAMPLE_YEARS.map((_y, k) => (isNum(target[k]) ? target[k] : null)),
    peer: SAMPLE_YEARS.map((_y, k) => (isNum(peer[k]) ? peer[k] : null)),
    peerLabel: peer.length ? PEER : '',
  }));

  // ---------------------------------------------------------------- readings
  const latestPeerIndex = r => { for (let k = r.now; k >= 0; k--) if (isNum(r.actual[k]) && isNum(r.peer[k])) return k; return -1; };
  const targetStatus = r => (isNum(r.actual[r.now]) && isNum(r.target[r.now]) ? X.meets(r.higher, r.actual[r.now], r.target[r.now]) : null);
  const peerStatus = r => {
    const k = latestPeerIndex(r);
    if (k < 0) return null;
    const a = r.actual[k], p = r.peer[k];
    const gap = p ? ((a - p) / Math.abs(p)) * 100 * (r.higher ? 1 : -1) : 0;
    return { k, ahead: X.meets(r.higher, a, p), gap };
  };
  // Same rule as the assessment's suggested Trends score: 3 consecutive years improving or holding.
  const improving = r => {
    const series = {};
    r.years.forEach((y, k) => { if (k <= r.now && isNum(r.actual[k])) series[y] = r.actual[k]; });
    const s = E.suggest([{ series, higher: r.higher }]);
    return s ? s.basis.trendsOk === 1 : null;
  };
  const attention = r => targetStatus(r) === false || peerStatus(r)?.ahead === false;

  // ---------------------------------------------------------------- chart
  const niceTicks = (lo, hi, count = 4) => {
    const raw = (hi - lo) / count;
    const exp = 10 ** Math.floor(Math.log10(raw));
    const f = raw / exp;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
    const out = [];
    for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  };
  const W = 560, H = 250, ML = 58, MR = 14, MT = 24, MB = 30;

  const chart = r => {
    const n = r.years.length;
    const band = (W - ML - MR) / n;
    const cx = i => ML + band * (i + 0.5);
    const vals = [...r.actual, ...r.target, ...r.peer].filter(isNum);
    const ticks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals) || 1);
    const dMin = ticks[0], dMax = ticks[ticks.length - 1];
    const y = v => MT + ((dMax - v) / (dMax - dMin)) * (H - MT - MB);
    const y0 = y(0);

    const grid = ticks.map(v => `
      <line class="db-grid${v === 0 ? ' db-grid--zero' : ''}" x1="${ML}" x2="${W - MR}" y1="${y(v)}" y2="${y(v)}"/>
      <text class="db-axis" x="${ML - 8}" y="${y(v) + 4}" text-anchor="end">${fmtAxis(v)}</text>`).join('');

    // bars: anchored at zero, 4px rounded at the value end
    const bw = Math.min(band * 0.56, 46);
    const bars = r.actual.map((v, i) => {
      if (!isNum(v) || v === 0) return '';
      const x = cx(i) - bw / 2, top = Math.min(y(v), y0), bot = Math.max(y(v), y0);
      const rr = Math.min(4, bot - top, bw / 2);
      const d = v > 0
        ? `M${x} ${bot}V${top + rr}Q${x} ${top} ${x + rr} ${top}H${x + bw - rr}Q${x + bw} ${top} ${x + bw} ${top + rr}V${bot}Z`
        : `M${x} ${top}V${bot - rr}Q${x} ${bot} ${x + rr} ${bot}H${x + bw - rr}Q${x + bw} ${bot} ${x + bw} ${bot - rr}V${top}Z`;
      return `<path class="db-bar${i === r.now ? ' db-bar--now' : ''}" d="${d}"/>`;
    }).join('');

    // lines break where a year has no value; a lone value still shows its marker
    const path = arr => arr.reduce((d, v, i) => (isNum(v) ? d + `${isNum(arr[i - 1]) ? 'L' : 'M'}${cx(i).toFixed(1)} ${y(v).toFixed(1)}` : d), '');
    const hasT = r.target.some(isNum), hasP = r.peer.some(isNum);
    const tLine = hasT ? `<path class="db-tgt" d="${path(r.target)}"/>${r.target.map((v, i) => (isNum(v) ? `<circle class="db-tgt__dot" cx="${cx(i)}" cy="${y(v)}" r="4.5"/>` : '')).join('')}` : '';
    const pLine = hasP ? `<path class="db-peer" d="${path(r.peer)}"/>${r.peer.map((v, i) => (isNum(v) ? `<rect class="db-peer__dot" x="${cx(i) - 4.5}" y="${y(v) - 4.5}" width="9" height="9" rx="1.5"/>` : '')).join('')}` : '';

    // the one direct label: the latest result
    const now = r.actual[r.now];
    const label = isNum(now) ? `<text class="db-lab" x="${cx(r.now)}" y="${now >= 0 ? y(now) - 8 : y(now) + 16}" text-anchor="middle">${fmtVal(now)}</text>` : '';

    const xs = r.years.map((yr, i) => `<text class="db-x${i > r.now ? ' db-x--next' : ''}" x="${cx(i)}" y="${H - 9}" text-anchor="middle">${year(yr)}</text>`).join('');
    const hits = r.years.map((yr, i) => `<rect class="db-hit" x="${ML + band * i}" y="${MT - 10}" width="${band}" height="${H - MT - MB + 10}" data-i="${i}"/>`).join('');

    const aria = L(`${r.name}. Latest ${isNum(now) ? fmtVal(now) : 'no value'} ${r.unit} in ${r.years[r.now]}.`, `${r.name}. آخرین مقدار ${isNum(now) ? fmtVal(now) : 'ندارد'} ${r.unit} در ${year(r.years[r.now])}.`);
    const unitTitle = r.unit ? `<text class="db-axis db-axis--unit" x="${ML - 8}" y="${MT - 12}" text-anchor="end">${esc(isPct(r.unit) ? (FA ? '٪' : '%') : r.unit)}</text>` : '';
    return `<svg class="db-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}" data-id="${r.id}">
      ${unitTitle}${grid}<rect class="db-hl" x="0" y="${MT - 10}" width="${band}" height="${H - MT - MB + 10}" rx="8"/>
      ${bars}${pLine}${tLine}${label}${xs}${hits}
    </svg>`;
  };

  const legend = r => `<ul class="db-legend">
      <li><i class="db-sw db-sw--bar"></i>${L('Result', 'عملکرد')}</li>
      ${r.target.some(isNum) ? `<li><i class="db-sw db-sw--tgt"></i>${L('Target', 'هدف')}</li>` : ''}
      ${r.peer.some(isNum) ? `<li><i class="db-sw db-sw--peer"></i>${esc(r.peerLabel || L('Benchmark', 'الگو'))}</li>` : ''}
    </ul>`;

  const table = r => `<details class="db-table">
      <summary>${L('Show the numbers', 'نمایش اعداد')}</summary>
      <div class="db-table__wrap"><table>
        <caption class="visually-hidden">${esc(r.name)}</caption>
        <thead><tr><th scope="col">${r.unit ? esc(r.unit) : ''}</th>${r.years.map(y => `<th scope="col">${year(y)}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">${L('Result', 'عملکرد')}</th>${r.actual.map(v => `<td>${isNum(v) ? fmtVal(v) : '—'}</td>`).join('')}</tr>
          ${r.target.some(isNum) ? `<tr><th scope="row">${L('Target', 'هدف')}</th>${r.target.map(v => `<td>${isNum(v) ? fmtVal(v) : '—'}</td>`).join('')}</tr>` : ''}
          ${r.peer.some(isNum) ? `<tr><th scope="row">${esc(r.peerLabel || L('Benchmark', 'الگو'))}</th>${r.peer.map(v => `<td>${isNum(v) ? fmtVal(v) : '—'}</td>`).join('')}</tr>` : ''}
        </tbody>
      </table></div>
    </details>`;

  const card = r => {
    const ts = targetStatus(r), ps = peerStatus(r);
    const now = r.actual[r.now];
    const badges = [
      ts === null ? '' : ts
        ? `<span class="yc-badge yc-badge--ok">${ICON.ok}${L('Target met', 'هدف محقق شد')}</span>`
        : `<span class="yc-badge yc-badge--no">${ICON.no}${L(`Target missed (${esc(withUnit(r.target[r.now], r.unit))})`, `هدف محقق نشد (${esc(withUnit(r.target[r.now], r.unit))})`)}</span>`,
      !ps ? '' : ps.ahead
        ? `<span class="yc-badge yc-badge--ok">${ICON.up}${L(`${num(Math.abs(ps.gap), 0)}% better than benchmark`, `${num(Math.abs(ps.gap), 0)}٪ بهتر از الگو`)}</span>`
        : `<span class="yc-badge yc-badge--no">${ICON.down}${L(`${num(Math.abs(ps.gap), 0)}% behind benchmark`, `${num(Math.abs(ps.gap), 0)}٪ عقب‌تر از الگو`)}</span>`,
    ].join('');
    const next = r.years.length > r.now + 1 && isNum(r.target[r.now + 1])
      ? `<p class="db-next">${L(`${r.years[r.now + 1]} target`, `هدف ${year(r.years[r.now + 1])}`)}: <b>${esc(withUnit(r.target[r.now + 1], r.unit))}</b></p>` : '';
    return `
    <article class="db-card" id="c-${r.id}">
      <header class="db-card__head">
        <div><h3>${esc(r.name)}</h3><p>${esc(r.unit || '')}${r.unit ? ' · ' : ''}${r.higher ? L('higher is better', 'بیشتر بهتر است') : L('lower is better', 'کمتر بهتر است')}</p></div>
        <a class="mp-id mp-id--soft db-part" href="../model.html#i-${r.part}" data-part="${r.part}" aria-label="${esc(`${fmtId(r.part)} ${t(partById[r.part]?.name)}`)}">${fmtId(r.part)}</a>
      </header>
      <div class="db-card__now">
        <strong>${isNum(now) ? fmtVal(now) : '—'}${isNum(now) && r.unit ? `<span class="db-unit">${isPct(r.unit) ? (FA ? '٪' : '%') : esc(r.unit)}</span>` : ''}</strong><small>${year(r.years[r.now])}</small>
        <span class="db-badges">${badges}</span>
      </div>
      ${chart(r)}
      <div class="db-card__foot">${legend(r)}${next}</div>
      ${table(r)}
    </article>`;
  };

  // ---------------------------------------------------------------- page
  let sample = false;
  let group = 'all';
  let onlyAttention = false;
  const records = () => (sample ? fromSample() : fromStore());

  const tiles = rs => {
    const withT = rs.filter(r => targetStatus(r) !== null), met = withT.filter(r => targetStatus(r)).length;
    const withP = rs.filter(r => peerStatus(r)), ahead = withP.filter(r => peerStatus(r).ahead).length;
    const withTr = rs.filter(r => improving(r) !== null), up = withTr.filter(r => improving(r)).length;
    const covered = PARTS.filter(p => rs.some(r => r.part === p.id)).length;
    const now = rs[0] ? rs[0].years[rs[0].now] : S.current().year;
    const tile = (big, of, label, sub) => `<li class="db-tile">
      <span class="db-tile__l">${label}</span>
      <span class="db-tile__n"><b>${num(big)}</b>${of !== null ? `<small>${L(`of ${num(of)}`, `از ${num(of)}`)}</small>` : ''}</span>
      <span class="db-tile__s">${sub}</span></li>`;
    return `<ul class="db-tiles">
      ${tile(met, withT.length, L(`Targets met in ${now}`, `اهداف محقق‌شده در ${year(now)}`), withT.length ? L(`${withT.length - met} missed`, `${num(withT.length - met)} محقق نشد`) : L('No targets for this year yet', 'هنوز هدفی برای این سال نیست'))}
      ${tile(ahead, withP.length, L('Ahead of the benchmark', 'جلوتر از الگو'), withP.length ? L('latest year with a benchmark', 'آخرین سال دارای الگو') : L('No benchmark values yet', 'هنوز مقدار الگویی ثبت نشده'))}
      ${tile(up, withTr.length, L('Improving for 3 years', 'رو به بهبود در ۳ سال'), L('or holding steady', 'یا پایدار'))}
      ${tile(covered, PARTS.length, L('Result parts covered', 'بخش‌های پوشش‌داده‌شدهٔ نتایج'), L('criterion 7 of the model', 'معیار ۷ الگو'))}
    </ul>`;
  };

  const attentionList = rs => {
    const list = rs.filter(attention);
    if (!list.length) return `<p class="db-calm">${ICON.ok}${L('Nothing needs attention: every target and benchmark is met.', 'موردی برای توجه نیست: همهٔ اهداف و الگوها محقق شده‌اند.')}</p>`;
    return `<div class="db-attn"><p class="db-attn__t">${ICON.flag}${L('Needs attention', 'نیازمند توجه')}</p>
      <ul>${list.map(r => `<li><a href="#c-${r.id}">${esc(r.name)}</a></li>`).join('')}</ul></div>`;
  };

  const filters = rs => `<div class="db-filters" role="group" aria-label="${L('Filter', 'فیلتر')}">
      <button type="button" class="db-f" data-g="all" aria-pressed="${group === 'all'}">${L('All', 'همه')}<small>${num(rs.length)}</small></button>
      ${results.subs.map(s => {
        const n = rs.filter(r => r.part.startsWith(s.id)).length;
        return n ? `<button type="button" class="db-f" data-g="${s.id}" aria-pressed="${group === s.id}">${esc(t(s.name))}<small>${num(n)}</small></button>` : '';
      }).join('')}
      <label class="db-f db-f--check"><input type="checkbox" data-f="attn"${onlyAttention ? ' checked' : ''}>${L('Needs attention only', 'فقط موارد نیازمند توجه')}</label>
    </div>`;

  const grid = rs => {
    const shown = rs.filter(r => (group === 'all' || r.part.startsWith(group)) && (!onlyAttention || attention(r)));
    return shown.length
      ? `<div class="db-cards">${shown.map(card).join('')}</div>`
      : `<p class="yc-empty">${L('No indicators match this filter.', 'هیچ شاخصی با این فیلتر مطابقت ندارد.')}</p>`;
  };

  const hero = rs => {
    const now = rs[0] ? rs[0].years[rs[0].now] : S.current().year;
    return `
    <section class="mp-hero yc-hero db-hero"><div class="container">
      <nav class="yc-tabs" aria-label="${L('Your company', 'سازمان شما')}">
        <a href="index.html">${L('Indicators', 'شاخص‌ها')}</a>
        <a href="dashboard.html" aria-current="page">${L('Management dashboard', 'داشبورد مدیریت')}</a>
      </nav>
      <span class="eyebrow yc-ent"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6"/></svg>${L('Enterprise feature', 'قابلیت پلن سازمانی')}</span>
      <h1 class="h2">${L(`Results at a glance<br><span class="soft">${now}</span>`, `نتایج در یک نگاه<br><span class="soft">${year(now)}</span>`)}</h1>
      <p class="lead">${L('Every indicator your team created, set against its target and the benchmark. Bars are what the company achieved; the dashed line is the target; the solid line is the benchmark.', 'همهٔ شاخص‌هایی که تیم شما ساخته، در برابر هدف و الگو. ستون‌ها عملکرد سازمان‌اند؛ خط‌چین هدف است و خط پیوسته الگو.')}</p>
      ${rs.length ? `<button type="button" class="btn btn--ghost btn--sm db-print" data-act="print">${ICON.print}${L('Print or save as PDF', 'چاپ یا ذخیره به‌صورت PDF')}</button>` : ''}
    </div></section>`;
  };

  const render = () => {
    const rs = records();
    if (!rs.length) {
      root.innerHTML = `${hero(rs)}<div class="container yc-main">
        <div class="yc-empty yc-empty--big">
          <p>${L('No indicators yet. Create them on the Indicators page, or preview the dashboard with sample data from Company X.', 'هنوز شاخصی ندارید. آن‌ها را در صفحهٔ شاخص‌ها بسازید، یا داشبورد را با داده‌های نمونهٔ شرکت ایکس ببینید.')}</p>
          <div class="yc-hero__btns">
            <a class="btn btn--dark" href="index.html">${ICON.plus}${L('Create indicators', 'ساخت شاخص')}</a>
            <button type="button" class="btn btn--ghost" data-act="sample">${L('Preview with sample data', 'پیش‌نمایش با داده‌های نمونه')}</button>
          </div>
        </div></div>`;
      return;
    }
    root.innerHTML = `${hero(rs)}<div class="container yc-main db-main">
      ${sample ? `<p class="db-sample">${L('You’re looking at sample data from Company X, an imaginary mine. Nothing here is saved.', 'در حال دیدن داده‌های نمونهٔ شرکت ایکس (یک معدن خیالی) هستید. چیزی ذخیره نمی‌شود.')} <button type="button" class="yc-link" data-act="mine">${L('Back to my data', 'بازگشت به داده‌های من')}</button></p>` : ''}
      <section class="db-top" aria-label="${L('Summary', 'خلاصه')}">${tiles(rs)}${attentionList(rs)}</section>
      <section class="db-charts" aria-label="${L('Indicators', 'شاخص‌ها')}">
        ${filters(rs)}
        <div id="db-grid">${grid(rs)}</div>
      </section>
    </div>
    <div class="db-tip" role="tooltip" hidden></div>
    <div class="db-ptip" id="db-ptip" role="tooltip" hidden></div>`;
  };

  // ---------------------------------------------------------------- result part card
  // Hover or focus on a part chip ("7-2 B") shows what that part of the model asks for.
  const clip = (s, n) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s);
  const partCard = id => {
    const p = partById[id];
    if (!p) return '';
    const here = records().filter(r => r.part === id).length;
    return `
      <div class="db-ptip__top">
        <span class="mp-id">${fmtId(p.id)}</span>
        <span class="db-ptip__k">${L(`Criterion 7 · ${t(results.name)}`, `معیار ۷ · ${t(results.name)}`)}</span>
      </div>
      <b class="db-ptip__name">${esc(t(p.name))}</b>
      <p class="db-ptip__sub">${fmtId(p.sub.id)} ${esc(t(p.sub.name))}
        <span class="mp-w">${L(`${num(p.weight)} of ${num(p.sub.weight)} pts`, `${num(p.weight)} از ${num(p.sub.weight)} امتیاز`)}</span></p>
      <p class="db-ptip__intro">${esc(clip(t(p.intro), 190))}</p>
      <ul class="db-ptip__ex">${p.examples.slice(0, 4).map(x => `<li>${esc(t(x))}</li>`).join('')}
        ${p.examples.length > 4 ? `<li class="db-ptip__more">${L(`+${p.examples.length - 4} more`, `+${num(p.examples.length - 4)} مورد دیگر`)}</li>` : ''}</ul>
      <p class="db-ptip__foot"><span>${L(`${here} indicator${here === 1 ? '' : 's'} on this dashboard`, `${num(here)} شاخص در این داشبورد`)}</span><span>${L('Click to open in the model →', 'برای دیدن در الگو کلیک کنید ←')}</span></p>`;
  };
  let partOn = null;
  const showPart = chip => {
    const tip = root.querySelector('#db-ptip');
    if (!tip || chip === partOn) return;
    tip.innerHTML = partCard(chip.dataset.part);
    tip.hidden = false;
    partOn = chip;
    chip.setAttribute('aria-describedby', 'db-ptip');
    const r = chip.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    const below = r.bottom + h + 12 < innerHeight || r.top < h + 12;
    const x = FA ? r.right - w : r.left;
    tip.style.left = `${Math.min(Math.max(8, x), innerWidth - w - 8)}px`;
    tip.style.top = `${below ? r.bottom + 8 : r.top - h - 8}px`;
    tip.classList.toggle('is-above', !below);
  };
  const hidePart = () => {
    const tip = root.querySelector('#db-ptip');
    if (tip) tip.hidden = true;
    if (partOn) partOn.removeAttribute('aria-describedby');
    partOn = null;
  };
  root.addEventListener('pointerover', e => { const c = e.target.closest('.db-part'); if (c) showPart(c); });
  root.addEventListener('pointerout', e => { const c = e.target.closest('.db-part'); if (c && !c.contains(e.relatedTarget)) hidePart(); });
  root.addEventListener('focusin', e => { const c = e.target.closest('.db-part'); if (c) showPart(c); });
  root.addEventListener('focusout', e => { if (e.target.closest('.db-part')) hidePart(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') hidePart(); });
  addEventListener('scroll', hidePart, { passive: true });

  // ---------------------------------------------------------------- behaviour
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-act], [data-g]');
    if (!el) return;
    if (el.dataset.g) {
      group = el.dataset.g;
      root.querySelectorAll('.db-f[data-g]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.g === group)));
      root.querySelector('#db-grid').innerHTML = grid(records());
    } else if (el.dataset.act === 'print') window.print();
    else if (el.dataset.act === 'sample') { sample = true; group = 'all'; render(); }
    else if (el.dataset.act === 'mine') { sample = false; group = 'all'; render(); }
  });
  root.addEventListener('change', e => {
    if (e.target.dataset.f !== 'attn') return;
    onlyAttention = e.target.checked;
    root.querySelector('#db-grid').innerHTML = grid(records());
  });

  // hover: highlight the year and show all three values in one tooltip
  const hideTip = () => {
    const tip = root.querySelector('.db-tip');
    if (tip) tip.hidden = true;
    root.querySelectorAll('.db-chart.is-hover').forEach(s => s.classList.remove('is-hover'));
  };
  root.addEventListener('pointerover', e => {
    const hit = e.target.closest('.db-hit');
    if (!hit) return;
    const svg = hit.ownerSVGElement;
    const r = records().find(x => x.id === svg.dataset.id);
    if (!r) return;
    const i = Number(hit.dataset.i);
    root.querySelectorAll('.db-chart.is-hover').forEach(s => s.classList.remove('is-hover'));
    svg.classList.add('is-hover');
    svg.querySelector('.db-hl').setAttribute('x', hit.getAttribute('x'));
    const row = (cls, label, v) => (isNum(v) ? `<span><i class="db-sw ${cls}"></i>${esc(label)}<b>${esc(withUnit(v, r.unit))}</b></span>` : '');
    const tip = root.querySelector('.db-tip');
    tip.innerHTML = `<strong>${year(r.years[i])}</strong>
      ${isNum(r.actual[i]) ? row('db-sw--bar', L('Result', 'عملکرد'), r.actual[i]) : i <= r.now ? `<span class="db-tip__none">${L('No result', 'بدون عملکرد')}</span>` : ''}
      ${row('db-sw--tgt', L('Target', 'هدف'), r.target[i])}
      ${row('db-sw--peer', r.peerLabel || L('Benchmark', 'الگو'), r.peer[i])}`;
    tip.hidden = false;
    const hr = hit.getBoundingClientRect(), tr = tip.getBoundingClientRect();
    tip.style.left = `${Math.min(Math.max(8, hr.left + hr.width / 2 - tr.width / 2), innerWidth - tr.width - 8)}px`;
    tip.style.top = `${Math.max(8, hr.top - tr.height - 6)}px`;
  });
  root.addEventListener('pointerout', e => { if (e.target.closest('.db-hit') && !e.relatedTarget?.closest?.('.db-hit')) hideTip(); });
  addEventListener('scroll', hideTip, { passive: true });

  render();
})();
