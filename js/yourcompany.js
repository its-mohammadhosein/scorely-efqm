// Your company (yourcompany/index.html, fa/yourcompany/index.html) — Enterprise feature page.
// An organization creates its own indicators with a guided wizard and an Excel-like formula:
//   start → describe → result part → formula → data → targets → review.
// Inputs (raw data items) are entered once and shared by every indicator that uses them.
// Saved through js/store.js in this browser; the formula language is js/formula.js.
(() => {
  const M = window.IMI_1404, F = window.Formula, S = window.Store, X = window.Indicators;
  const { t, num, esc, FA, digits, itemId: fmtId, ui } = window.I18N;
  const root = document.getElementById('yc-root');
  if (!M || !F || !S || !X || !root) return;

  const L = (en, fa) => (FA ? fa : en);
  const state = S.state;
  const results = M.criteria.find(c => c.kind === 'result');
  const PARTS = results.subs.flatMap(s => s.items.map(p => ({ ...p, sub: s })));
  const partById = Object.fromEntries(PARTS.map(p => [p.id, p]));
  const kindOf = id => (/A$/.test(id) ? 'perception' : 'performance');

  const LAST = S.current().year;
  const YEARS = [LAST - 4, LAST - 3, LAST - 2, LAST - 1, LAST];
  const TARGET_YEARS = [...YEARS, LAST + 1];
  const year = y => digits(y);
  const today = () => new Date().toISOString().slice(0, 10);
  // 1 Farvardin of a Solar Hijri year, close enough for "was the target set before the year began?"
  const yearStart = y => `${y + 621}-03-21`;

  const isNum = v => v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v));
  const parseNum = s => {
    const clean = F.normalize(String(s ?? '')).replace(/[,٬\s]/g, '');
    if (!clean) return null;
    const n = Number(clean);
    return Number.isFinite(n) ? n : NaN;
  };
  const showNum = v => (isNum(v) ? (FA ? digits(String(v)) : String(v)) : '');
  const fmtVal = v => num(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);

  const ICON = {
    plus: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    arrow: '<svg class="i yc-dir" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    back: '<svg class="i yc-dir yc-back" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    ok: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    warn: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.5 20h19Z"/><path d="M12 10v4M12 17v.5"/></svg>',
    no: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    fx: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h-2a3 3 0 0 0-3 3v13M6 10h7"/><path d="m15 13 5 6M20 13l-5 6"/></svg>',
    table: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/></svg>',
    target: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".5"/></svg>',
  };

  // ---------------------------------------------------------------- inputs and values
  const inputByName = name => X.inputByName(state, name);
  const savedValue = (name, y) => X.value(state, name, y);
  const usedBy = input => state.indicators.filter(ind => {
    const p = F.parse(ind.formula);
    return p.ok && p.refs.some(r => F.key(r) === F.key(input.name));
  });
  const series = (formula, get) => X.results(formula, YEARS, get);

  // ---------------------------------------------------------------- examples to start from
  // {n} in a formula is the n-th input, written in the page language.
  const I = {
    leavers: [{ en: 'Leavers', fa: 'تعداد ترک‌کنندگان' }, { en: 'people', fa: 'نفر' }],
    headcount: [{ en: 'Average headcount', fa: 'میانگین تعداد کارکنان' }, { en: 'people', fa: 'نفر' }],
    training: [{ en: 'Training hours', fa: 'ساعت آموزش' }, { en: 'hours', fa: 'ساعت' }],
    accidents: [{ en: 'Accidents', fa: 'تعداد حوادث' }, { en: 'count', fa: 'تعداد' }],
    days: [{ en: 'Working days', fa: 'روزهای کاری' }, { en: 'days', fa: 'روز' }],
    profit: [{ en: 'Operating profit', fa: 'سود عملیاتی' }, { en: 'M rial', fa: 'میلیون ریال' }],
    revenue: [{ en: 'Operating revenue', fa: 'درآمد عملیاتی' }, { en: 'M rial', fa: 'میلیون ریال' }],
    cost: [{ en: 'Total cost', fa: 'هزینهٔ کل' }, { en: 'M rial', fa: 'میلیون ریال' }],
    production: [{ en: 'Production', fa: 'میزان تولید' }, { en: 't', fa: 'تن' }],
    ontime: [{ en: 'On-time deliveries', fa: 'حواله‌های تحویل به‌موقع' }, { en: 'count', fa: 'تعداد' }],
    deliveries: [{ en: 'Total deliveries', fa: 'کل حواله‌های تحویلی' }, { en: 'count', fa: 'تعداد' }],
    local: [{ en: 'Local staff', fa: 'تعداد کارکنان بومی' }, { en: 'people', fa: 'نفر' }],
    kwh: [{ en: 'Electricity used', fa: 'مصرف برق' }, { en: 'kWh', fa: 'کیلووات‌ساعت' }],
    csat: [{ en: 'Customer survey score', fa: 'امتیاز نظرسنجی مشتریان' }, { en: 'score / 10', fa: 'امتیاز از ۱۰' }],
    cgrade: [{ en: 'Concentrate grade', fa: 'عیار کنسانتره' }, { en: '%', fa: 'درصد' }],
    ctonnes: [{ en: 'Concentrate produced', fa: 'کنسانترهٔ تولیدی' }, { en: 't', fa: 'تن' }],
    ore: [{ en: 'Ore processed', fa: 'خوراک مصرفی' }, { en: 't', fa: 'تن' }],
    ograde: [{ en: 'Lead in ore', fa: 'عیار سرب خوراک' }, { en: '%', fa: 'درصد' }],
  };
  const TEMPLATES = [
    { key: 'turnover', part: '7-2B', higher: false, name: { en: 'Staff turnover', fa: 'نرخ ترک کارکنان' }, unit: { en: '%', fa: 'درصد' }, f: '={0} / {1} * 100', inputs: [I.leavers, I.headcount] },
    { key: 'training', part: '7-2B', higher: true, name: { en: 'Training hours per employee', fa: 'ساعت آموزش به ازای هر نفر' }, unit: { en: 'hours / employee', fa: 'ساعت به ازای هر نفر' }, f: '={0} / {1}', inputs: [I.training, I.headcount] },
    { key: 'accidents', part: '7-2B', higher: false, name: { en: 'Accident rate', fa: 'نرخ حوادث کاری' }, unit: { en: 'per 100 working days', fa: 'در هر ۱۰۰ روز کاری' }, f: '={0} / {1} * 100', inputs: [I.accidents, I.days] },
    { key: 'margin', part: '7-5C', higher: true, name: { en: 'Operating margin', fa: 'حاشیهٔ سود عملیاتی' }, unit: { en: '%', fa: 'درصد' }, f: '={0} / {1} * 100', inputs: [I.profit, I.revenue] },
    { key: 'unitcost', part: '7-5C', higher: false, name: { en: 'Cost per tonne', fa: 'هزینهٔ تولید هر تن' }, unit: { en: 'M rial / t', fa: 'میلیون ریال بر تن' }, f: '=ROUND({0} / {1}, 1)', inputs: [I.cost, I.production] },
    { key: 'recovery', part: '7-5C', higher: true, name: { en: 'Lead recovery', fa: 'بازیابی سرب' }, unit: { en: '%', fa: 'درصد' }, f: '=({0} * {1}) / ({2} * {3}) * 100', inputs: [I.cgrade, I.ctonnes, I.ore, I.ograde] },
    { key: 'ontime', part: '7-1B', higher: true, name: { en: 'On-time delivery', fa: 'تحویل به‌موقع' }, unit: { en: '%', fa: 'درصد' }, f: '={0} / {1} * 100', inputs: [I.ontime, I.deliveries] },
    { key: 'csat', part: '7-1A', higher: true, name: { en: 'Customer satisfaction', fa: 'رضایت مشتریان' }, unit: { en: 'score / 10', fa: 'امتیاز از ۱۰' }, f: '={0}', inputs: [I.csat] },
    { key: 'local', part: '7-3B', higher: true, name: { en: 'Local employment', fa: 'اشتغال نیروی بومی' }, unit: { en: '%', fa: 'درصد' }, f: '={0} / {1} * 100', inputs: [I.local, I.headcount] },
    { key: 'energy', part: '7-3B', higher: false, name: { en: 'Electricity per tonne', fa: 'مصرف برق به ازای هر تن' }, unit: { en: 'kWh / t', fa: 'کیلووات‌ساعت بر تن' }, f: '={0} / {1}', inputs: [I.kwh, I.production] },
  ];
  const tplFormula = tp => tp.f.replace(/\{(\d)\}/g, (_, n) => `[${t(tp.inputs[n][0])}]`);

  const UNITS = [L('%', 'درصد'), L('score / 10', 'امتیاز از ۱۰'), L('count', 'تعداد'), L('people', 'نفر'), L('hours', 'ساعت'),
    L('days', 'روز'), L('M rial', 'میلیون ریال'), L('M rial / t', 'میلیون ریال بر تن'), L('t', 'تن'), L('kWh / t', 'کیلووات‌ساعت بر تن')];

  // ---------------------------------------------------------------- formula messages
  const FN_HELP = {
    SUM: L('Adds numbers up.', 'اعداد را جمع می‌کند.'),
    AVERAGE: L('The mean of the numbers.', 'میانگین اعداد.'),
    MIN: L('The smallest number.', 'کوچک‌ترین عدد.'),
    MAX: L('The largest number.', 'بزرگ‌ترین عدد.'),
    ROUND: L('Rounds to a number of decimal places.', 'به تعداد رقم اعشار گرد می‌کند.'),
    ABS: L('Drops the minus sign.', 'علامت منفی را حذف می‌کند.'),
    IF: L('One value when a condition holds, another when it doesn’t.', 'اگر شرط برقرار باشد یک مقدار، وگرنه مقدار دیگر.'),
    IFERROR: L('A fallback value when the calculation fails, for example on division by zero.', 'مقدار جایگزین وقتی محاسبه خطا دارد، مثلاً تقسیم بر صفر.'),
  };
  const FN_ARGS = {
    SUM: L('number1, number2, …', 'عدد۱، عدد۲، …'), AVERAGE: L('number1, number2, …', 'عدد۱، عدد۲، …'),
    MIN: L('number1, number2, …', 'عدد۱، عدد۲، …'), MAX: L('number1, number2, …', 'عدد۱، عدد۲، …'),
    ROUND: L('number, digits', 'عدد، تعداد رقم'), ABS: L('number', 'عدد'),
    IF: L('condition, if true, if false', 'شرط، اگر درست، اگر نادرست'), IFERROR: L('value, if error', 'مقدار، اگر خطا'),
  };
  const parseMsg = e => {
    const p = e.params || {};
    switch (e.code) {
      case 'empty': return L('Write a formula, for example =[Leavers] / [Average headcount] * 100', 'یک فرمول بنویسید، مثلاً =[تعداد ترک‌کنندگان] / [میانگین تعداد کارکنان] * 100');
      case 'char': return L(`“${p.ch}” can’t be used in a formula.`, `«${p.ch}» در فرمول قابل استفاده نیست.`);
      case 'unclosedName': return L('An input name is missing its closing ].', 'نام یک ورودی، کروشهٔ بسته ] ندارد.');
      case 'emptyName': return L('Empty brackets []: put an input name inside.', 'کروشهٔ خالی []: نام یک ورودی را داخل آن بنویسید.');
      case 'bareName': return L(`“${p.word}” isn’t a function. If it’s an input, put it in square brackets: [${p.word}]`, `«${p.word}» تابع نیست. اگر ورودی است، آن را داخل کروشه بنویسید: [${p.word}]`);
      case 'unknownFn': return L(`There’s no function called ${p.name}. You can use ${Object.keys(F.FUNCS).join(', ')}.`, `تابعی به نام ${p.name} وجود ندارد. این توابع را می‌توانید به کار ببرید: ${Object.keys(F.FUNCS).join('، ')}.`);
      case 'args': return p.max === Infinity
        ? L(`${p.name} needs at least ${p.min} value.`, `${p.name} دست‌کم به ${num(p.min)} مقدار نیاز دارد.`)
        : p.min === p.max
          ? L(`${p.name} takes ${p.min} value${p.min > 1 ? 's' : ''}: ${p.name}(${FN_ARGS[p.name]}).`, `${p.name} به ${num(p.min)} مقدار نیاز دارد: ${p.name}(${FN_ARGS[p.name]}).`)
          : L(`${p.name} takes ${p.min} to ${p.max} values: ${p.name}(${FN_ARGS[p.name]}).`, `${p.name} بین ${num(p.min)} تا ${num(p.max)} مقدار می‌گیرد: ${p.name}(${FN_ARGS[p.name]}).`);
      case 'expected': return p.what === ')'
        ? L('A closing bracket ) is missing.', 'یک پرانتز بسته ) کم است.')
        : L('Something is missing here: a number, an [input] or a bracket.', 'اینجا چیزی کم است: یک عدد، یک [ورودی] یا یک پرانتز.');
      case 'trailing': return L('This part doesn’t connect to the rest. Is an operator (+ − × ÷) missing?', 'این بخش به بقیهٔ فرمول وصل نیست. آیا یک عملگر (+ − × ÷) جا افتاده است؟');
    }
    return L('The formula can’t be read.', 'فرمول قابل خواندن نیست.');
  };
  const evalMsg = (r, y) => {
    if (r.code === 'missing') return L(`No value for ${r.names.map(n => `[${n}]`).join(', ')} in ${y}`, `مقدار ${r.names.map(n => `[${n}]`).join('، ')} برای ${year(y)} وارد نشده است`);
    if (r.code === 'div0') return L(`Division by zero in ${y}`, `تقسیم بر صفر در ${year(y)}`);
    return L('Not a number', 'عدد معتبر نیست');
  };

  // Closest saved input name, for "did you mean …?"
  const lev = (a, b) => {
    const d = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let prev = d[0]; d[0] = i;
      for (let j = 1; j <= b.length; j++) { const tmp = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; }
    }
    return d[b.length];
  };
  const closest = name => {
    const k = F.key(name);
    let best = null, score = Infinity;
    for (const i of state.inputs) {
      const s = lev(k, F.key(i.name));
      if (s < score) { score = s; best = i; }
    }
    return best && score <= Math.max(2, Math.floor(k.length / 4)) ? best : null;
  };

  // ---------------------------------------------------------------- the wizard
  const STEPS = [
    { id: 'start', title: L('Start', 'شروع'), lead: L('Start from an example or from a blank page. Everything can be changed in the next steps.', 'از یک نمونه یا یک صفحهٔ خالی شروع کنید. همه‌چیز در گام‌های بعد قابل تغییر است.') },
    { id: 'describe', title: L('Describe', 'معرفی'), lead: L('What the indicator is called, its unit, and which direction is good.', 'نام شاخص، واحد آن، و اینکه کدام جهت مطلوب است.') },
    { id: 'part', title: L('Result part', 'بخش نتایج'), lead: L('Which part of criterion 7 this indicator is evidence for. The model’s own examples are listed under each part.', 'این شاخص شاهدی برای کدام بخش از معیار ۷ است. نمونه‌های خود الگو زیر هر بخش آمده است.') },
    { id: 'formula', title: L('Formula', 'فرمول'), lead: L('Write it as in a spreadsheet. Put input names in square brackets; inputs that don’t exist yet are created for you.', 'مثل صفحه‌گسترده بنویسید. نام ورودی‌ها را داخل کروشه بگذارید؛ ورودی‌هایی که هنوز وجود ندارند برایتان ساخته می‌شوند.') },
    { id: 'data', title: L('Data', 'داده‌ها'), lead: L('Enter the inputs for past years and check the results. You can paste a row straight from Excel.', 'مقادیر ورودی سال‌های گذشته را وارد کنید و نتیجه را ببینید. می‌توانید یک ردیف را مستقیم از اکسل بچسبانید.') },
    { id: 'targets', title: L('Targets', 'اهداف'), lead: L('A target for each year, and a peer or benchmark if you have one.', 'هدف هر سال، و در صورت وجود، یک شرکت هم‌تراز یا الگو برای مقایسه.') },
    { id: 'review', title: L('Review', 'بازبینی'), lead: L('Check the summary and the warnings, then save.', 'خلاصه و هشدارها را بررسی کنید، سپس ذخیره کنید.') },
  ];

  let view = 'list';      // 'list' | 'wizard'
  let draft = null;

  const blankDraft = () => ({
    id: null, step: 0, origin: 'custom', name: '', unit: '', higher: true, kind: 'performance', part: '',
    formula: '', units: {}, values: {}, targets: {}, comparator: { label: '', values: {} },
  });
  const draftFrom = ind => ({
    ...blankDraft(), id: ind.id, step: 1, origin: ind.origin, name: ind.name, unit: ind.unit, higher: ind.higher,
    kind: ind.kind, part: ind.part, formula: ind.formula,
    targets: JSON.parse(JSON.stringify(ind.targets || {})),
    comparator: X.benchmark(ind) || { label: '', values: {} },
  });
  const applyTemplate = tp => {
    Object.assign(draft, {
      origin: `template:${tp.key}`, name: t(tp.name), unit: t(tp.unit), higher: tp.higher,
      kind: kindOf(tp.part), part: tp.part, formula: tplFormula(tp),
      units: Object.fromEntries(tp.inputs.map(([n, u]) => [F.key(t(n)), t(u)])),
    });
  };

  // draft values first, then saved ones
  const draftValue = (name, y) => {
    const d = draft.values[F.key(name)];
    if (d && y in d) return d[y];
    return savedValue(name, y);
  };
  const parsed = () => F.parse(draft.formula);
  const newRefs = p => (p.ok ? p.refs.filter(r => !inputByName(r)) : []);

  // returns an error message, or '' when the step is complete
  const stepError = id => {
    if (id === 'describe') {
      if (!draft.name.trim()) return L('Give the indicator a name.', 'برای شاخص یک نام بنویسید.');
      const dup = state.indicators.find(i => i.id !== draft.id && F.key(i.name) === F.key(draft.name));
      if (dup) return L('An indicator with this name already exists.', 'شاخصی با این نام از قبل وجود دارد.');
    }
    if (id === 'part' && (!draft.part || kindOf(draft.part) !== draft.kind)) return L('Choose a result part.', 'یک بخش از نتایج را انتخاب کنید.');
    if (id === 'formula') {
      const p = parsed();
      if (!p.ok) return parseMsg(p.error);
      if (!p.refs.length) return L('Use at least one [input], so the indicator has data behind it.', 'دست‌کم یک [ورودی] به کار ببرید تا شاخص داده‌ای پشت خود داشته باشد.');
    }
    return '';
  };

  // ---- step: start
  const stepStart = () => `
    <div class="yc-tpls">
      <button type="button" class="yc-tpl yc-tpl--blank" data-act="blank">
        <span class="yc-tpl__icon">${ICON.plus}</span>
        <b>${L('Blank indicator', 'شاخص خالی')}</b>
        <small>${L('Write your own formula from scratch.', 'فرمول خودتان را از ابتدا بنویسید.')}</small>
      </button>
      ${TEMPLATES.map((tp, k) => `
        <button type="button" class="yc-tpl" data-act="tpl" data-k="${k}">
          <span class="mp-id mp-id--soft">${fmtId(tp.part)}</span>
          <b>${esc(t(tp.name))}</b>
          <code dir="ltr">${esc(tplFormula(tp))}</code>
        </button>`).join('')}
    </div>`;

  // ---- step: describe
  const stepDescribe = () => `
    <div class="yc-form">
      <label class="yc-field"><span>${L('Name', 'نام')}</span>
        <input type="text" data-f="name" value="${esc(draft.name)}" placeholder="${L('e.g. Staff turnover', 'مثلاً نرخ ترک کارکنان')}" maxlength="80" autocomplete="off"></label>
      <label class="yc-field"><span>${L('Unit', 'واحد')}</span>
        <input type="text" data-f="unit" value="${esc(draft.unit)}" list="yc-units" placeholder="${L('e.g. %', 'مثلاً درصد')}" maxlength="40" autocomplete="off">
        <datalist id="yc-units">${UNITS.map(u => `<option value="${esc(u)}">`).join('')}</datalist></label>
      <fieldset class="yc-field yc-choice">
        <legend>${L('Which direction is good?', 'کدام جهت مطلوب است؟')}</legend>
        <label><input type="radio" name="yc-higher" value="1"${draft.higher ? ' checked' : ''}><span><b>${L('Higher is better', 'بیشتر بهتر است')}</b><small>${L('e.g. margin, satisfaction', 'مثلاً حاشیهٔ سود، رضایت')}</small></span></label>
        <label><input type="radio" name="yc-higher" value="0"${draft.higher ? '' : ' checked'}><span><b>${L('Lower is better', 'کمتر بهتر است')}</b><small>${L('e.g. cost, turnover, accidents', 'مثلاً هزینه، ترک کارکنان، حوادث')}</small></span></label>
      </fieldset>
      <fieldset class="yc-field yc-choice">
        <legend>${L('What kind of indicator is it?', 'نوع شاخص چیست؟')}</legend>
        <label><input type="radio" name="yc-kind" value="performance"${draft.kind === 'performance' ? ' checked' : ''}><span><b>${L('Performance indicator', 'شاخص عملکردی')}</b><small>${L('Measured from your own operations and records.', 'از عملیات و سوابق خود سازمان اندازه‌گیری می‌شود.')}</small></span></label>
        <label><input type="radio" name="yc-kind" value="perception"${draft.kind === 'perception' ? ' checked' : ''}><span><b>${L('Perception', 'برداشت')}</b><small>${L('A score from a survey of customers, staff, the community or partners.', 'امتیاز نظرسنجی از مشتریان، کارکنان، جامعه یا شرکا.')}</small></span></label>
      </fieldset>
    </div>`;

  // ---- step: result part
  const stepPart = () => results.subs.map(s => {
    const list = s.items.filter(p => kindOf(p.id) === draft.kind);
    if (!list.length) return '';
    return `<fieldset class="yc-parts"><legend>${fmtId(s.id)} — ${esc(t(s.name))}</legend>
      ${list.map(p => {
        const n = state.indicators.filter(i => i.part === p.id && i.id !== draft.id).length;
        return `<label class="yc-part">
          <input type="radio" name="yc-part" value="${p.id}"${draft.part === p.id ? ' checked' : ''}>
          <span class="yc-part__body">
            <span class="yc-part__top"><span class="mp-id">${fmtId(p.id)}</span><b>${esc(t(p.name))}</b>
              <small class="yc-part__n">${n ? L(`${n} already`, `${num(n)} شاخص موجود`) : L('none yet', 'هنوز هیچ')}</small></span>
            <span class="yc-part__ex">${p.examples.slice(0, 4).map(x => esc(t(x))).join(L(' · ', ' · '))}</span>
          </span>
        </label>`;
      }).join('')}
    </fieldset>`;
  }).join('');

  // ---- step: formula
  const inputChips = () => {
    const p = parsed();
    const fresh = newRefs(p);
    const chips = [
      ...state.inputs.map(i => ({ name: i.name, unit: i.unit, isNew: false })),
      ...fresh.map(n => ({ name: n, unit: draft.units[F.key(n)] || '', isNew: true })),
    ];
    if (!chips.length) return `<p class="yc-muted">${L('No inputs yet. Type [ and a name to create one.', 'هنوز ورودی‌ای نیست. با تایپ [ و یک نام، ورودی بسازید.')}</p>`;
    return chips.map(c => `<button type="button" class="yc-chip${c.isNew ? ' yc-chip--new' : ''}" data-act="ins-ref" data-name="${esc(c.name)}">${esc(c.name)}${c.unit ? `<small>${esc(c.unit)}</small>` : ''}</button>`).join('');
  };
  const stepFormula = () => `
    <div class="yc-fx">
      <label class="yc-fx__label" for="yc-formula">${ICON.fx}${esc(draft.name || L('Indicator', 'شاخص'))}${draft.unit ? ` <small>(${esc(draft.unit)})</small>` : ''}</label>
      <div class="yc-fx__box">
        <span class="yc-fx__eq" aria-hidden="true">=</span>
        <textarea id="yc-formula" rows="2" dir="ltr" spellcheck="false" autocomplete="off" aria-describedby="yc-fx-status" aria-autocomplete="list" aria-controls="yc-suggest">${esc(draft.formula.replace(/^\s*=/, ''))}</textarea>
        <ul class="yc-suggest" id="yc-suggest" role="listbox" hidden></ul>
      </div>
      <p class="yc-fx__hint" id="yc-fx-hint" hidden></p>
      <div class="yc-fx__status" id="yc-fx-status" aria-live="polite"></div>
      <div class="yc-fx__new" id="yc-fx-new"></div>

      <div class="yc-tools">
        <div class="yc-tools__g">
          <h4>${L('Inputs', 'ورودی‌ها')}</h4>
          <div class="yc-chips" id="yc-chips">${inputChips()}</div>
        </div>
        <div class="yc-tools__g">
          <h4>${L('Operators', 'عملگرها')}</h4>
          <div class="yc-keys" dir="ltr">
            ${[['+', ' + '], ['−', ' - '], ['×', ' * '], ['÷', ' / '], ['(', '('], [')', ')'], ['%', '%'], ['× 100', ' * 100']].map(([label, ins]) => `<button type="button" class="yc-key" data-act="ins" data-text="${esc(ins)}">${label}</button>`).join('')}
          </div>
        </div>
        <div class="yc-tools__g">
          <h4>${L('Functions', 'توابع')}</h4>
          <div class="yc-keys" dir="ltr">
            ${Object.keys(F.FUNCS).map(n => `<button type="button" class="yc-key yc-key--fn" data-act="ins-fn" data-fn="${n}" title="${esc(FN_HELP[n])}">${n}</button>`).join('')}
          </div>
        </div>
      </div>

      <details class="yc-help">
        <summary>${L('How formulas work', 'فرمول‌ها چگونه کار می‌کنند')}</summary>
        <ul>
          <li>${L('Inputs are raw numbers you enter once, such as headcount or energy used. Write them in square brackets: <code dir="ltr">[Average headcount]</code>.', 'ورودی‌ها اعداد خامی هستند که یک بار وارد می‌کنید، مثل تعداد کارکنان یا مصرف انرژی. آن‌ها را داخل کروشه بنویسید: <code dir="ltr">[میانگین تعداد کارکنان]</code>.')}</li>
          <li>${L('Operators: <code>+ - * /</code> and <code>^</code> for powers; <code>80%</code> means 0.8. Use brackets to group.', 'عملگرها: <code>+ - * /</code> و <code>^</code> برای توان؛ <code>80%</code> یعنی ۰٫۸. برای گروه‌بندی از پرانتز استفاده کنید.')}</li>
          <li>${L('Functions work as in Excel: <code dir="ltr">ROUND([Total cost] / [Production], 1)</code>, <code dir="ltr">IFERROR([A] / [B], 0)</code>.', 'توابع مثل اکسل کار می‌کنند: <code dir="ltr">ROUND([هزینهٔ کل] / [میزان تولید], 1)</code>، <code dir="ltr">IFERROR([A] / [B], 0)</code>.')}</li>
          <li>${L('A year with a missing input shows as “no value”, never as zero.', 'سالی که یکی از ورودی‌هایش خالی باشد «بدون مقدار» نشان داده می‌شود، نه صفر.')}</li>
          <li>${L('For a survey score, the formula can simply be the score input: <code dir="ltr">[Customer survey score]</code>.', 'برای امتیاز نظرسنجی، فرمول می‌تواند فقط خود ورودی امتیاز باشد: <code dir="ltr">[امتیاز نظرسنجی مشتریان]</code>.')}</li>
        </ul>
      </details>
    </div>`;

  // live parts of the formula step, updated without re-rendering the field
  const renderFormulaStatus = () => {
    const box = root.querySelector('#yc-fx-status');
    if (!box) return;
    const p = parsed();
    if (!p.ok) {
      const e = p.error;
      const src = F.normalize(draft.formula);
      const echo = e.code !== 'empty'
        ? `<code class="yc-echo" dir="ltr">${esc(src.slice(0, e.pos))}<mark>${esc(src.slice(e.pos, Math.max(e.end, e.pos + 1))) || '&nbsp;'}</mark>${esc(src.slice(Math.max(e.end, e.pos + 1)))}</code>`
        : '';
      box.innerHTML = `<p class="yc-msg yc-msg--${e.code === 'empty' ? 'info' : 'no'}">${e.code === 'empty' ? '' : ICON.no}${esc(parseMsg(e))}</p>${echo}`;
    } else {
      const latest = F.evaluate(p.ast, n => draftValue(n, LAST));
      box.innerHTML = `<p class="yc-msg yc-msg--ok">${ICON.ok}<span>${L('Reads as', 'خوانده می‌شود')}: <b dir="auto">${esc(F.describe(p.ast, { sep: L(', ', '، ') }))}</b></span></p>
        ${latest.ok ? `<p class="yc-muted">${L(`${LAST} with saved data`, `${year(LAST)} با داده‌های ذخیره‌شده`)}: <b>${fmtVal(latest.value)}</b>${draft.unit ? ` ${esc(draft.unit)}` : ''}</p>` : ''}`;
    }
    // inputs that will be created, with a unit field and a "did you mean" for near misses
    const fresh = newRefs(p);
    root.querySelector('#yc-fx-new').innerHTML = fresh.length ? `
      <p class="yc-fx__newt">${L('New inputs — they’ll be added to your raw data:', 'ورودی‌های جدید — به داده‌های خام شما اضافه می‌شوند:')}</p>
      <ul>${fresh.map(n => {
        const near = closest(n);
        return `<li>
          <span class="yc-chip yc-chip--new">${esc(n)}</span>
          <label>${L('unit', 'واحد')} <input type="text" data-f="new-unit" data-key="${esc(F.key(n))}" value="${esc(draft.units[F.key(n)] || '')}" list="yc-units" maxlength="30"></label>
          ${near ? `<button type="button" class="yc-link" data-act="rename-ref" data-from="${esc(n)}" data-to="${esc(near.name)}">${L(`Did you mean [${esc(near.name)}]?`, `منظورتان [${esc(near.name)}] بود؟`)}</button>` : ''}
        </li>`;
      }).join('')}</ul>
      <datalist id="yc-units">${UNITS.map(u => `<option value="${esc(u)}">`).join('')}</datalist>` : '';
    root.querySelector('#yc-chips').innerHTML = inputChips();
  };

  // suggestions: input names after "[", a signature hint inside a function call
  let sugg = { items: [], at: -1, ctx: null };
  const renderSuggest = () => {
    const field = root.querySelector('#yc-formula');
    const list = root.querySelector('#yc-suggest');
    const hint = root.querySelector('#yc-fx-hint');
    if (!field || !list) return;
    const caret = field.selectionStart;
    const ctx = F.context(field.value, caret);
    sugg = { items: [], at: -1, ctx };
    if (ctx && ctx.kind === 'name') {
      const q = F.key(ctx.query);
      const names = [...state.inputs.map(i => i.name), ...newRefs(parsed()).filter(n => F.key(n) !== q)];
      sugg.items = names.filter(n => F.key(n).includes(q)).slice(0, 8).map(n => ({ name: n, isNew: false }));
      if (q && !names.some(n => F.key(n) === q)) sugg.items.push({ name: ctx.query.trim(), isNew: true });
    }
    list.hidden = !sugg.items.length;
    list.innerHTML = sugg.items.map((s, k) => `<li role="option" id="yc-sg-${k}" data-k="${k}" aria-selected="false">${s.isNew ? `${ICON.plus}${L('New input', 'ورودی جدید')}: ` : ''}<b>${esc(s.name)}</b></li>`).join('');
    field.setAttribute('aria-expanded', String(!list.hidden));
    if (ctx && ctx.kind === 'fn') {
      const args = FN_ARGS[ctx.name].split(L(', ', '، '));
      hint.hidden = false;
      hint.innerHTML = `<code dir="ltr">${ctx.name}(${args.map((a, k) => (k === Math.min(ctx.arg, args.length - 1) ? `<b>${esc(a)}</b>` : esc(a))).join(', ')})</code> ${esc(FN_HELP[ctx.name])}`;
    } else hint.hidden = true;
  };
  const moveSuggest = d => {
    if (!sugg.items.length) return false;
    sugg.at = (sugg.at + d + sugg.items.length) % sugg.items.length;
    root.querySelectorAll('#yc-suggest li').forEach((li, k) => li.setAttribute('aria-selected', String(k === sugg.at)));
    root.querySelector('#yc-formula').setAttribute('aria-activedescendant', `yc-sg-${sugg.at}`);
    return true;
  };
  const pickSuggest = k => {
    const s = sugg.items[k], field = root.querySelector('#yc-formula');
    if (!s || !sugg.ctx) return;
    const caret = field.selectionStart;
    const after = field.value[caret] === ']' ? 1 : 0;
    field.setRangeText(`[${s.name}]`, sugg.ctx.start, caret + after, 'end');
    syncFormula(field);
  };
  const insertAtCaret = (text, back = 0) => {
    const field = root.querySelector('#yc-formula');
    if (!field) return;
    field.focus();
    field.setRangeText(text, field.selectionStart, field.selectionEnd, 'end');
    if (back) field.selectionStart = field.selectionEnd = field.selectionEnd - back;
    syncFormula(field);
  };
  const syncFormula = field => {
    draft.formula = `=${field.value.replace(/^\s*=/, '')}`;
    renderFormulaStatus();
    renderSuggest();
    setError('');
  };

  // ---- step: data
  const refsOrEmpty = () => { const p = parsed(); return p.ok ? p.refs : []; };
  const resultCells = () => {
    const rs = series(draft.formula, draftValue);
    return rs.map((r, k) => (r.ok
      ? `<td class="yc-res">${fmtVal(r.value)}</td>`
      : `<td class="yc-res yc-res--none" title="${esc(evalMsg(r, YEARS[k]))}">—</td>`)).join('');
  };
  const stepData = () => {
    const refs = refsOrEmpty();
    return `
    <div class="yc-grid-wrap">
      <table class="yc-grid">
        <caption class="visually-hidden">${L('Input values by year', 'مقادیر ورودی به تفکیک سال')}</caption>
        <thead><tr><th scope="col">${L('Input', 'ورودی')}</th>${YEARS.map(y => `<th scope="col">${year(y)}</th>`).join('')}</tr></thead>
        <tbody>
          ${refs.map(n => {
            const unit = inputByName(n)?.unit || draft.units[F.key(n)] || '';
            return `<tr><th scope="row">${esc(n)}${unit ? `<small>${esc(unit)}</small>` : ''}</th>
              ${YEARS.map(y => `<td><input type="text" inputmode="decimal" data-f="val" data-key="${esc(F.key(n))}" data-y="${y}" value="${showNum(draftValue(n, y))}" aria-label="${esc(n)} ${year(y)}"></td>`).join('')}</tr>`;
          }).join('')}
        </tbody>
        <tfoot><tr><th scope="row">${esc(draft.name || L('Result', 'نتیجه'))}${draft.unit ? `<small>${esc(draft.unit)}</small>` : ''}</th>${resultCells()}</tr></tfoot>
      </table>
    </div>
    <p class="yc-muted">${L('Values are saved to your raw data and shared with every indicator that uses the same input. Leave a cell empty when the value is unknown.', 'مقادیر در داده‌های خام شما ذخیره می‌شوند و همهٔ شاخص‌هایی که از همان ورودی استفاده می‌کنند آن‌ها را می‌بینند. اگر مقداری معلوم نیست، خانه را خالی بگذارید.')}</p>`;
  };
  const refreshResults = () => {
    const row = root.querySelector('.yc-grid tfoot tr');
    if (row) row.innerHTML = row.firstElementChild.outerHTML + resultCells();
  };

  // ---- step: targets
  const stepTargets = () => `
    <div class="yc-grid-wrap">
      <table class="yc-grid">
        <caption class="visually-hidden">${L('Targets by year', 'اهداف به تفکیک سال')}</caption>
        <thead><tr><th scope="col"></th>${TARGET_YEARS.map(y => `<th scope="col">${year(y)}${y > LAST ? `<small>${L('next', 'آینده')}</small>` : ''}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">${L('Result', 'نتیجه')}</th>${resultCells()}<td class="yc-res yc-res--none">—</td></tr>
          <tr><th scope="row">${ICON.target}${L('Target', 'هدف')}<small>${draft.higher ? L('at least', 'حداقل') : L('at most', 'حداکثر')}</small></th>
            ${TARGET_YEARS.map(y => `<td><input type="text" inputmode="decimal" data-f="target" data-y="${y}" value="${showNum(draft.targets[y]?.value)}" aria-label="${L('Target', 'هدف')} ${year(y)}"></td>`).join('')}</tr>
          <tr><th scope="row">${L('Benchmark', 'الگو (بنچ‌مارک)')}<small>${L('optional', 'اختیاری')}</small></th>
            ${TARGET_YEARS.map(y => `<td><input type="text" inputmode="decimal" data-f="peer" data-y="${y}" value="${showNum(draft.comparator.values[y])}" aria-label="${L('Benchmark', 'الگو')} ${year(y)}"></td>`).join('')}</tr>
        </tbody>
      </table>
    </div>
    <p class="yc-note">${ICON.warn}${L(`Targets entered after a year has started are marked “set late”. A target is most useful when it’s set in advance, so start with ${LAST + 1}.`, `هدفی که پس از شروع سال وارد شود با برچسب «دیرهنگام» مشخص می‌شود. هدف وقتی بیشترین فایده را دارد که از پیش تعیین شود؛ پس از ${year(LAST + 1)} شروع کنید.`)}</p>
    <div class="yc-form yc-peer">
      <label class="yc-field"><span>${L('Who is the benchmark?', 'الگوی مقایسه کیست؟')}</span>
        <input type="text" data-f="peer-label" value="${esc(draft.comparator.label)}" placeholder="${L('e.g. Peer company, sector average', 'مثلاً شرکت هم‌تراز، میانگین صنعت')}" maxlength="60"></label>
    </div>`;

  // ---- step: review
  const checks = () => {
    const out = [];
    const p = parsed();
    const part = partById[draft.part];
    const others = state.indicators.filter(i => i.part === draft.part && i.id !== draft.id).length;
    out.push(['ok', L(`Evidence for ${fmtId(draft.part)} ${t(part.name)}${others ? `, next to ${others} other indicator${others > 1 ? 's' : ''}` : ' — the first one for this part'}.`,
      `شاهدی برای ${fmtId(draft.part)} ${t(part.name)}${others ? `، در کنار ${num(others)} شاخص دیگر` : ' — نخستین شاخص این بخش'}.`)]);
    const rs = series(draft.formula, draftValue);
    const done = rs.filter(r => r.ok).length;
    out.push([done >= 3 ? 'ok' : 'warn', done >= 3
      ? L(`${done} years of results: enough to show a trend.`, `${num(done)} سال نتیجه: برای نشان دادن روند کافی است.`)
      : L(`${done} year${done === 1 ? '' : 's'} of results. RADAR looks for trends over at least 3 years.`, `${num(done)} سال نتیجه. رادار روند دست‌کم ۳ ساله را بررسی می‌کند.`)]);
    const late = Object.entries(draft.targets).filter(([y, tg]) => isNum(tg.value) && tg.setAt > yearStart(Number(y))).map(([y]) => Number(y));
    if (late.length) out.push(['warn', L(`Targets for ${late.join(', ')} are set late (after the year began).`, `اهداف ${late.map(year).join('، ')} دیرهنگام تعیین شده‌اند (پس از شروع سال).`)]);
    if (!isNum(draft.targets[LAST + 1]?.value)) out.push(['warn', L(`No target for ${LAST + 1} yet.`, `هنوز هدفی برای ${year(LAST + 1)} تعیین نشده است.`)]);
    const zeros = [];
    for (const n of (p.ok ? p.refs : [])) for (const y of YEARS) if (Number(draftValue(n, y)) === 0 && isNum(draftValue(n, y))) zeros.push(`[${n}] ${year(y)}`);
    if (zeros.length) out.push(['ask', L(`Zero values: ${zeros.join(', ')}. Is zero the real value, or is the data missing? Leave missing data empty.`, `مقدار صفر: ${zeros.join('، ')}. آیا صفر مقدار واقعی است یا داده موجود نیست؟ دادهٔ ناموجود را خالی بگذارید.`)]);
    const jumps = [];
    rs.forEach((r, k) => {
      const prev = rs[k - 1];
      if (k && r.ok && prev?.ok && prev.value && r.value && (r.value / prev.value > 3 || r.value / prev.value < 1 / 3)) jumps.push(YEARS[k]);
    });
    if (jumps.length) out.push(['ask', L(`Big jump in ${jumps.join(', ')}: more than 3× up or down from the year before. Worth checking the inputs.`, `جهش بزرگ در ${jumps.map(year).join('، ')}: بیش از ۳ برابر افزایش یا کاهش نسبت به سال قبل. ورودی‌ها را بررسی کنید.`)]);
    return out;
  };
  const stepReview = () => {
    const p = parsed();
    const fresh = newRefs(p);
    const rs = series(draft.formula, draftValue);
    const ICONS = { ok: ICON.ok, warn: ICON.warn, ask: ICON.warn };
    return `
    <div class="yc-review">
      <dl class="yc-sumlist">
        <div><dt>${L('Name', 'نام')}</dt><dd>${esc(draft.name)}${draft.unit ? ` <small>(${esc(draft.unit)})</small>` : ''}</dd></div>
        <div><dt>${L('Direction', 'جهت مطلوب')}</dt><dd>${draft.higher ? L('Higher is better', 'بیشتر بهتر است') : L('Lower is better', 'کمتر بهتر است')}</dd></div>
        <div><dt>${L('Result part', 'بخش نتایج')}</dt><dd><span class="mp-id mp-id--soft">${fmtId(draft.part)}</span> ${esc(t(partById[draft.part].name))}</dd></div>
        <div><dt>${L('Formula', 'فرمول')}</dt><dd><code dir="ltr">${esc(draft.formula)}</code><small dir="auto">${esc(F.describe(p.ast, { sep: L(', ', '، ') }))}</small></dd></div>
        ${fresh.length ? `<div><dt>${L('New inputs', 'ورودی‌های جدید')}</dt><dd>${fresh.map(n => `<span class="yc-chip yc-chip--new">${esc(n)}</span>`).join(' ')}</dd></div>` : ''}
        <div><dt>${L('Results', 'نتایج')}</dt><dd class="yc-sumyears">${YEARS.map((y, k) => `<span><small>${year(y)}</small>${rs[k].ok ? fmtVal(rs[k].value) : '—'}</span>`).join('')}</dd></div>
      </dl>
      <div class="yc-checks">
        <h3>${L('Checks', 'بررسی‌ها')}</h3>
        <ul>${checks().map(([lvl, msg]) => `<li class="yc-msg yc-msg--${lvl}">${ICONS[lvl]}<span>${esc(msg)}</span></li>`).join('')}</ul>
        <p class="yc-muted">${L('Warnings never block saving. You can come back and edit at any time.', 'هشدارها مانع ذخیره نمی‌شوند. هر زمان می‌توانید برگردید و ویرایش کنید.')}</p>
      </div>
    </div>`;
  };

  const BODY = { start: stepStart, describe: stepDescribe, part: stepPart, formula: stepFormula, data: stepData, targets: stepTargets, review: stepReview };

  const wizard = () => {
    const s = STEPS[draft.step];
    const first = draft.id ? 1 : 0;
    return `
    <section class="yc-wiz" id="wizard" aria-labelledby="yc-wiz-h">
      <header class="yc-wiz__head">
        <div>
          <span class="yc-wiz__k">${draft.id ? L('Edit indicator', 'ویرایش شاخص') : L('New indicator', 'شاخص جدید')} · ${L(`Step ${draft.step + 1} of ${STEPS.length}`, `گام ${num(draft.step + 1)} از ${num(STEPS.length)}`)}</span>
          <h2 id="yc-wiz-h" tabindex="-1">${s.title}</h2>
          <p>${s.lead}</p>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" data-act="cancel">${L('Cancel', 'انصراف')}</button>
      </header>
      <ol class="yc-steps">${STEPS.map((x, k) => `
        <li class="${k < draft.step ? 'is-done' : k === draft.step ? 'is-on' : ''}${k < first ? ' is-skip' : ''}">
          ${k < draft.step && k >= first ? `<button type="button" data-act="goto" data-k="${k}">` : '<span>'}<i>${num(k + 1)}</i><span>${x.title}</span>${k < draft.step && k >= first ? '</button>' : '</span>'}
        </li>`).join('')}</ol>
      <div class="yc-wiz__body yc-step--${s.id}">${BODY[s.id]()}</div>
      <footer class="yc-wiz__foot">
        ${draft.step > first ? `<button type="button" class="btn btn--ghost" data-act="back">${ICON.back}${L('Back', 'قبلی')}</button>` : '<span></span>'}
        <p class="yc-wiz__err" id="yc-wiz-err" role="alert"></p>
        ${s.id === 'start' ? ''
          : s.id === 'review' ? `<button type="button" class="btn btn--green" data-act="save">${ICON.ok}${draft.id ? L('Save changes', 'ذخیرهٔ تغییرات') : L('Save indicator', 'ذخیرهٔ شاخص')}</button>`
            : `<button type="button" class="btn btn--dark" data-act="next">${L('Next', 'بعدی')}${ICON.arrow}</button>`}
      </footer>
    </section>`;
  };
  const setError = msg => { const el = root.querySelector('#yc-wiz-err'); if (el) el.textContent = msg; };

  // ---------------------------------------------------------------- list view
  const indicatorCard = ind => {
    const p = F.parse(ind.formula);
    const rs = series(ind.formula, savedValue);
    const latest = rs[rs.length - 1];
    const tg = ind.targets?.[LAST]?.value;
    const bench = X.benchmark(ind);
    let status = '';
    if (latest.ok && isNum(tg)) {
      const met = ind.higher ? latest.value >= tg : latest.value <= tg;
      status = met ? `<span class="yc-badge yc-badge--ok">${ICON.ok}${L('Target met', 'هدف محقق شد')}</span>` : `<span class="yc-badge yc-badge--no">${ICON.no}${L('Target missed', 'هدف محقق نشد')}</span>`;
    }
    return `
    <article class="yc-ind" id="ind-${ind.id}">
      <header class="yc-ind__head">
        <div><h3>${esc(ind.name)}</h3><p>${esc(ind.unit || '')}${ind.unit ? ' · ' : ''}${ind.higher ? L('higher is better', 'بیشتر بهتر است') : L('lower is better', 'کمتر بهتر است')}</p></div>
        <a class="mp-id mp-id--soft" href="../model.html#i-${ind.part}" title="${esc(t(partById[ind.part]?.name))}">${fmtId(ind.part)}</a>
      </header>
      <div class="yc-ind__now">
        <strong>${latest.ok ? fmtVal(latest.value) : '—'}</strong><small>${year(LAST)}</small>${status}
      </div>
      <code class="yc-ind__f" dir="ltr">${esc(ind.formula)}</code>
      ${p.ok ? `<p class="yc-ind__read" dir="auto">${esc(F.describe(p.ast, { sep: L(', ', '، ') }))}</p>` : ''}
      <table class="yc-mini">
        <caption class="visually-hidden">${esc(ind.name)}</caption>
        <thead><tr>${YEARS.map(y => `<th scope="col">${year(y)}</th>`).join('')}</tr></thead>
        <tbody>
          <tr>${rs.map((r, k) => (r.ok ? `<td>${fmtVal(r.value)}</td>` : `<td class="yc-res--none" title="${esc(evalMsg(r, YEARS[k]))}">—</td>`)).join('')}</tr>
          ${Object.keys(ind.targets || {}).length ? `<tr class="yc-mini__tgt" title="${L('Target', 'هدف')}">${YEARS.map(y => `<td>${isNum(ind.targets[y]?.value) ? fmtVal(ind.targets[y].value) : ''}</td>`).join('')}</tr>` : ''}
          ${bench && Object.keys(bench.values).length ? `<tr class="yc-mini__peer" title="${esc(bench.label || L('Benchmark', 'الگو'))}">${YEARS.map(y => `<td>${isNum(bench.values[y]) ? fmtVal(bench.values[y]) : ''}</td>`).join('')}</tr>` : ''}
        </tbody>
      </table>
      <footer class="yc-ind__foot">
        <button type="button" class="yc-link" data-act="edit" data-id="${ind.id}">${L('Edit', 'ویرایش')}</button>
        <button type="button" class="yc-link yc-link--danger" data-act="del-ind" data-id="${ind.id}">${L('Delete', 'حذف')}</button>
      </footer>
    </article>`;
  };

  // raw data edits update the cards in place, so the cursor stays in the grid
  const refreshCards = () => {
    const box = root.querySelector('.yc-inds');
    if (box) box.innerHTML = state.indicators.map(indicatorCard).join('');
  };

  const coverage = () => `<ul class="yc-cov" aria-label="${L('Indicators per result part', 'شاخص‌ها به تفکیک بخش‌های نتایج')}">${PARTS.map(p => {
    const n = state.indicators.filter(i => i.part === p.id).length;
    return `<li class="${n ? 'is-on' : ''}" title="${esc(t(p.name))}"><span>${fmtId(p.id)}</span><b>${num(n)}</b></li>`;
  }).join('')}</ul>`;

  const rawData = () => {
    if (!state.inputs.length) return `<p class="yc-empty">${L('Inputs appear here when an indicator uses them.', 'ورودی‌ها وقتی یک شاخص از آن‌ها استفاده کند اینجا نمایش داده می‌شوند.')}</p>`;
    return `<div class="yc-grid-wrap"><table class="yc-grid yc-raw">
      <caption class="visually-hidden">${L('Raw data by year', 'داده‌های خام به تفکیک سال')}</caption>
      <thead><tr><th scope="col">${L('Input', 'ورودی')}</th>${YEARS.map(y => `<th scope="col">${year(y)}</th>`).join('')}<th scope="col">${L('Used by', 'کاربرد')}</th></tr></thead>
      <tbody>${state.inputs.map(i => {
        const users = usedBy(i);
        return `<tr><th scope="row">${esc(i.name)}${i.unit ? `<small>${esc(i.unit)}</small>` : ''}</th>
          ${YEARS.map(y => `<td><input type="text" inputmode="decimal" data-f="raw" data-id="${i.id}" data-y="${y}" value="${showNum(state.values[i.id]?.[y])}" aria-label="${esc(i.name)} ${year(y)}"></td>`).join('')}
          <td class="yc-raw__use">${users.length ? L(`${users.length} indicator${users.length > 1 ? 's' : ''}`, `${num(users.length)} شاخص`)
            : `<button type="button" class="yc-link yc-link--danger" data-act="del-input" data-id="${i.id}">${L('Delete', 'حذف')}</button>`}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  };

  const listView = () => `
    <section class="mp-sec" id="indicators" aria-labelledby="h-ind">
      <header class="mp-sec__head">
        <div><h2 id="h-ind">${L('Your indicators', 'شاخص‌های شما')}</h2>
          <p>${L('Each one is evidence for a part of criterion 7. The grey parts still have none.', 'هر شاخص شاهدی برای بخشی از معیار ۷ است. بخش‌های خاکستری هنوز شاخصی ندارند.')}</p></div>
        <button type="button" class="btn btn--green btn--sm" data-act="new">${ICON.plus}${L('New indicator', 'شاخص جدید')}</button>
      </header>
      ${coverage()}
      ${state.indicators.length
        ? `<div class="yc-inds">${state.indicators.map(indicatorCard).join('')}</div>`
        : `<div class="yc-empty yc-empty--big">
            <p>${L('No indicators yet. Start with an example such as staff turnover, or write your own formula.', 'هنوز شاخصی ندارید. با یک نمونه مثل نرخ ترک کارکنان شروع کنید یا فرمول خودتان را بنویسید.')}</p>
            <button type="button" class="btn btn--dark" data-act="new">${ICON.plus}${L('Create your first indicator', 'ساخت نخستین شاخص')}</button>
          </div>`}
    </section>
    <section class="mp-sec" id="raw" aria-labelledby="h-raw">
      <header class="mp-sec__head"><div><h2 id="h-raw">${ICON.table}${L('Raw data', 'داده‌های خام')}</h2>
        <p>${L('The numbers behind your formulas. Enter each one once; every indicator that uses it updates.', 'اعداد پشت فرمول‌های شما. هر کدام را یک بار وارد کنید؛ همهٔ شاخص‌هایی که از آن استفاده می‌کنند به‌روز می‌شوند.')}</p></div></header>
      ${rawData()}
    </section>`;

  // ---------------------------------------------------------------- page
  const hero = () => `
    <section class="mp-hero yc-hero"><div class="container">
      <nav class="yc-tabs" aria-label="${L('Your company', 'سازمان شما')}">
        <a href="index.html" aria-current="page">${L('Indicators', 'شاخص‌ها')}</a>
        <a href="dashboard.html">${L('Management dashboard', 'داشبورد مدیریت')}</a>
      </nav>
      <span class="eyebrow yc-ent"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6"/></svg>${L('Enterprise feature', 'قابلیت پلن سازمانی')}</span>
      <h1 class="h2">${L('Your company,<br><span class="soft">your indicators.</span>', 'سازمان شما،<br><span class="soft">شاخص‌های شما.</span>')}</h1>
      <p class="lead">${L('Every organization measures different things. Create your own indicators with spreadsheet-style formulas, guided step by step, and each one lands in the right place in the results criterion of the 1404 model.', 'هر سازمان چیزهای متفاوتی را اندازه می‌گیرد. شاخص‌های خودتان را با فرمول‌هایی شبیه صفحه‌گسترده و گام‌به‌گام بسازید؛ هر شاخص در جای درست خود در معیار نتایج الگوی ۱۴۰۴ قرار می‌گیرد.')}</p>
      <ul class="yc-feats">
        <li>${ICON.fx}<span><b>${L('Excel-style formulas', 'فرمول‌هایی مثل اکسل')}</b>${L('With suggestions, plain-language errors and a live result.', 'با پیشنهاد، پیام خطای ساده و نتیجهٔ زنده.')}</span></li>
        <li>${ICON.table}<span><b>${L('Raw data entered once', 'داده‌های خام، یک بار')}</b>${L('Headcount, energy, revenue… reused by every indicator.', 'تعداد کارکنان، انرژی، درآمد… برای همهٔ شاخص‌ها.')}</span></li>
        <li>${ICON.target}<span><b>${L('Mapped to the model', 'متصل به الگو')}</b>${L('Targets, peers and checks that feed RADAR.', 'اهداف، مقایسه و بررسی‌هایی که به رادار می‌رسند.')}</span></li>
      </ul>
      <div class="yc-hero__btns">
        <button type="button" class="btn btn--green" data-act="new">${ICON.plus}${L('Create an indicator', 'ساخت شاخص')}</button>
      </div>
      <p class="yc-hero__fine">${L('Preview: everything is saved in this browser only, and goes into your Saramadan backup file.', 'پیش‌نمایش: همه‌چیز فقط در همین مرورگر ذخیره می‌شود و در فایل پشتیبان سرآمدان شما قرار می‌گیرد.')}</p>
    </div></section>`;

  const render = (focus = false) => {
    root.innerHTML = `${hero()}<div class="container yc-main">${view === 'wizard' ? wizard() : listView()}
      <p class="yc-saved" id="yc-saved" role="status"></p></div>`;
    if (view === 'wizard') {
      if (STEPS[draft.step].id === 'formula') { renderFormulaStatus(); }
      if (focus) {
        document.getElementById('wizard').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        const first = root.querySelector('.yc-wiz__body input:not([type=radio]), .yc-wiz__body textarea');
        (first || root.querySelector('#yc-wiz-h')).focus({ preventScroll: true });
      }
    }
  };
  const persist = () => {
    const ok = S.save();
    const el = root.querySelector('#yc-saved');
    if (el) el.textContent = ok ? '' : ui('notSaved');
    return ok;
  };

  const open = d => { draft = d; view = 'wizard'; render(true); };
  const go = k => {
    // leaving a step forward: check it first
    if (k > draft.step) {
      for (let s = draft.step; s < k; s++) {
        const err = stepError(STEPS[s].id);
        if (err) { draft.step = s; render(); setError(err); return; }
      }
    }
    draft.step = k;
    render(true);
  };

  const save = () => {
    const p = parsed();
    const refs = p.ok ? p.refs : [];
    // create new inputs, then commit typed values for every input the formula uses
    for (const n of refs) {
      if (!inputByName(n)) state.inputs.push({ id: S.uid('in'), name: n.trim(), unit: (draft.units[F.key(n)] || '').trim() });
      const input = inputByName(n);
      const typed = draft.values[F.key(n)];
      if (typed) {
        const row = state.values[input.id] = state.values[input.id] || {};
        for (const [y, v] of Object.entries(typed)) { if (isNum(v)) row[y] = Number(v); else delete row[y]; }
      }
    }
    const targets = Object.fromEntries(Object.entries(draft.targets).filter(([, tg]) => isNum(tg.value)));
    const c = draft.comparator;
    const peerValues = Object.fromEntries(Object.entries(c.values).filter(([, v]) => isNum(v)).map(([y, v]) => [y, Number(v)]));
    const ind = {
      id: draft.id || S.uid('ind'), name: draft.name.trim(), unit: draft.unit.trim(), higher: draft.higher,
      kind: draft.kind, part: draft.part, formula: draft.formula.trim(), method: F.describe(p.ast), origin: draft.origin,
      targets, comparator: c.label.trim() || Object.keys(peerValues).length ? { label: c.label.trim(), values: peerValues } : null,
    };
    const k = state.indicators.findIndex(i => i.id === ind.id);
    if (k >= 0) state.indicators[k] = ind; else state.indicators.push(ind);
    persist();
    view = 'list'; draft = null;
    render();
    const card = document.getElementById(`ind-${ind.id}`);
    if (card) { card.scrollIntoView({ block: 'center' }); card.classList.add('is-flash'); }
    const el = root.querySelector('#yc-saved');
    if (el && !S.blocked) el.textContent = L('Indicator saved.', 'شاخص ذخیره شد.');
  };

  // two clicks to delete: the first arms the button for a few seconds
  const armed = btn => {
    if (btn.dataset.armed) return true;
    btn.dataset.armed = '1';
    const was = btn.textContent;
    btn.textContent = L('Click again to delete', 'برای حذف دوباره کلیک کنید');
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = was; } }, 3000);
    return false;
  };

  // ---------------------------------------------------------------- events
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'new') open(blankDraft());
    else if (act === 'edit') open(draftFrom(state.indicators.find(i => i.id === el.dataset.id)));
    else if (act === 'cancel') { view = 'list'; draft = null; render(); root.querySelector('#indicators')?.scrollIntoView({ block: 'start' }); }
    else if (act === 'blank') { Object.assign(draft, { ...blankDraft(), step: 0 }); go(1); }
    else if (act === 'tpl') { applyTemplate(TEMPLATES[Number(el.dataset.k)]); go(1); }
    else if (act === 'next') go(draft.step + 1);
    else if (act === 'back') { draft.step--; render(true); }
    else if (act === 'goto') go(Number(el.dataset.k));
    else if (act === 'save') save();
    else if (act === 'ins') insertAtCaret(el.dataset.text);
    else if (act === 'ins-fn') insertAtCaret(`${el.dataset.fn}()`, 1);
    else if (act === 'ins-ref') insertAtCaret(`[${el.dataset.name}]`);
    else if (act === 'rename-ref') {
      const field = root.querySelector('#yc-formula');
      const from = F.key(el.dataset.from);
      field.value = field.value.replace(/\[([^\]]*)\]/g, (m, n) => (F.key(n) === from ? `[${el.dataset.to}]` : m));
      syncFormula(field);
    } else if (act === 'del-ind' && armed(el)) {
      state.indicators = state.indicators.filter(i => i.id !== el.dataset.id);
      persist(); render();
    } else if (act === 'del-input' && armed(el)) {
      const id = el.dataset.id;
      state.inputs = state.inputs.filter(i => i.id !== id);
      delete state.values[id];
      persist(); render();
    }
  });

  // suggestions are picked with the pointer before the field loses focus
  root.addEventListener('mousedown', e => {
    const li = e.target.closest('#yc-suggest li');
    if (!li) return;
    e.preventDefault();
    pickSuggest(Number(li.dataset.k));
  });

  root.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'yc-formula') { syncFormula(el); return; }
    const f = el.dataset.f;
    if (!f) return;
    if (f === 'name') draft.name = el.value;
    else if (f === 'unit') draft.unit = el.value;
    else if (f === 'new-unit') draft.units[el.dataset.key] = el.value;
    else if (f === 'peer-label') draft.comparator.label = el.value;
    else if (f === 'val' || f === 'target' || f === 'peer' || f === 'raw') {
      const v = parseNum(el.value);
      el.toggleAttribute('aria-invalid', Number.isNaN(v));
      if (Number.isNaN(v)) return;
      if (f === 'val') {
        const row = draft.values[el.dataset.key] = draft.values[el.dataset.key] || {};
        row[el.dataset.y] = v;
        refreshResults();
      } else if (f === 'target') {
        if (v === null) delete draft.targets[el.dataset.y];
        else draft.targets[el.dataset.y] = { value: v, setAt: draft.targets[el.dataset.y]?.value === v ? draft.targets[el.dataset.y].setAt : today() };
      } else if (f === 'peer') {
        if (v === null) delete draft.comparator.values[el.dataset.y]; else draft.comparator.values[el.dataset.y] = v;
      }
      else if (f === 'raw') {
        const row = state.values[el.dataset.id] = state.values[el.dataset.id] || {};
        if (v === null) delete row[el.dataset.y]; else row[el.dataset.y] = v;
        persist();
        refreshCards();
      }
    }
    setError('');
  });

  root.addEventListener('change', e => {
    const el = e.target;
    if (el.name === 'yc-higher') draft.higher = el.value === '1';
    if (el.name === 'yc-kind') { draft.kind = el.value; if (draft.part && kindOf(draft.part) !== draft.kind) draft.part = ''; }
    if (el.name === 'yc-part') { draft.part = el.value; setError(''); }
  });

  // paste a row (or a block) from a spreadsheet into the values grid
  root.addEventListener('paste', e => {
    const el = e.target;
    if (!['val', 'raw', 'target', 'peer'].includes(el.dataset?.f)) return;
    const text = e.clipboardData?.getData('text') || '';
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    const rows = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(r => r.split('\t'));
    const tr = el.closest('tr'), table = el.closest('tbody');
    const rowEls = [...table.querySelectorAll('tr')].filter(r => r.querySelector(`input[data-f="${el.dataset.f}"]`));
    const r0 = rowEls.indexOf(tr);
    const c0 = [...tr.querySelectorAll(`input[data-f="${el.dataset.f}"]`)].indexOf(el);
    rows.forEach((vals, dr) => {
      const rowInputs = rowEls[r0 + dr] ? [...rowEls[r0 + dr].querySelectorAll(`input[data-f="${el.dataset.f}"]`)] : [];
      vals.forEach((v, dc) => {
        const cell = rowInputs[c0 + dc];
        if (!cell) return;
        cell.value = v.trim();
        cell.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  });

  root.addEventListener('keydown', e => {
    const el = e.target;
    if (el.id === 'yc-formula') {
      if (e.key === 'ArrowDown' && moveSuggest(1)) e.preventDefault();
      else if (e.key === 'ArrowUp' && moveSuggest(-1)) e.preventDefault();
      else if ((e.key === 'Enter' || e.key === 'Tab') && sugg.items.length) { e.preventDefault(); pickSuggest(Math.max(0, sugg.at)); }
      else if (e.key === 'Escape' && sugg.items.length) { e.preventDefault(); root.querySelector('#yc-suggest').hidden = true; sugg.items = []; }
      else if (e.key === 'Enter') { e.preventDefault(); go(draft.step + 1); }
      return;
    }
    // Enter on a text field moves to the next step, as a form would
    if (e.key === 'Enter' && view === 'wizard' && el.matches('.yc-wiz__body input[type=text]')) { e.preventDefault(); go(draft.step + 1); }
  });
  root.addEventListener('keyup', e => { if (e.target.id === 'yc-formula' && /^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) renderSuggest(); });
  root.addEventListener('click', e => { if (e.target.id === 'yc-formula') renderSuggest(); });
  root.addEventListener('focusout', e => {
    if (e.target.id === 'yc-formula') setTimeout(() => { const l = root.querySelector('#yc-suggest'); if (l) l.hidden = true; }, 120);
  });

  render();
})();
