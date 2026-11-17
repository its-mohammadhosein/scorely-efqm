// T2 — Scoring engine. Pure functions over a model (js/models/*.js) and one site's data;
// no DOM access, so it runs in the browser and in Node tests.
//
// Rules (TASKS.md T2.1):
//   element      = aggregate(its attributes)                 assumption, PLAN.md decision 2
//   item raw     = aggregate(elements)                       assumption
//   item %       = round5(min(raw, cap attribute))           cap from the doc, pp.50–51
//   item points  = % × weight / 100                          weights from p.46
//   unanswered attributes count as 0; the item is flagged complete: false
//   concept %    = mean of its linked items' %               derived by the app, not in the doc
(function (root) {
  const isNum = v => v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v));
  const sum = xs => xs.reduce((a, x) => a + x, 0);
  const mean = xs => (xs.length ? sum(xs) / xs.length : 0);
  const round5 = x => Math.round(x / 5) * 5;

  // PLAN.md decision 2: how attribute scores combine into an element, and elements into an item.
  // Change it here only.
  const aggregate = values => mean(values);

  // Flat list of every scored item, in model order.
  const items = model => model.criteria.flatMap(c => (c.kind === 'enabler'
    ? c.items.map(item => ({ id: item.id, kind: c.kind, weight: item.weight, criterionId: c.id, item }))
    : c.subs.flatMap(s => s.items.map(item => ({ id: item.id, kind: c.kind, weight: item.weight, criterionId: c.id, subId: s.id, item })))));

  const attributesOf = (model, kind) => model.radar[kind].elements.flatMap(e => e.attributes.map(a => ({ ...a, elementId: e.id })));

  // One item's score from its attribute scores, e.g. { sound: 40, aligned: 45, … }.
  function itemScore(model, kind, attrs = {}) {
    const radar = model.radar[kind];
    const elements = {};
    let answered = 0, total = 0;
    for (const el of radar.elements) {
      const vals = el.attributes.map(a => {
        total++;
        if (isNum(attrs[a.id])) { answered++; return Number(attrs[a.id]); }
        return 0;
      });
      elements[el.id] = aggregate(vals);
    }
    const raw = aggregate(Object.values(elements));
    const cap = isNum(attrs[radar.cap]) ? Number(attrs[radar.cap]) : 0;
    const pct = round5(Math.min(raw, cap));
    return { elements, raw, cap, capped: raw > cap && answered > 0, pct, complete: answered === total, answered, total };
  }

  // The whole assessment for one site: data = { scores: { itemId: attrs } }.
  function assess(model, data = {}) {
    const scores = data.scores || {};
    const byId = {};
    const criteria = model.criteria.map(c => {
      const list = items(model).filter(i => i.criterionId === c.id).map(i => {
        const s = itemScore(model, c.kind, scores[i.id]);
        const points = (s.pct * i.weight) / 100;
        const row = { id: i.id, kind: c.kind, criterionId: c.id, subId: i.subId, weight: i.weight, max: i.weight,
          pct: s.pct, points, lost: i.weight - points, capped: s.capped, complete: s.complete,
          answered: s.answered, total: s.total, elements: s.elements, raw: s.raw };
        byId[i.id] = row;
        return row;
      });
      const points = sum(list.map(i => i.points));
      const out = { id: c.id, kind: c.kind, points, max: c.weight, pct: (points / c.weight) * 100, items: list };
      if (c.subs) {
        out.subs = c.subs.map(s => {
          const p = sum(list.filter(i => i.subId === s.id).map(i => i.points));
          return { id: s.id, points: p, max: s.weight, pct: (p / s.weight) * 100 };
        });
      }
      return out;
    });
    const all = Object.values(byId);
    const of = kind => sum(criteria.filter(c => c.kind === kind).map(c => c.points));
    return {
      total: sum(criteria.map(c => c.points)),
      enabler: of('enabler'),
      result: of('result'),
      criteria,
      items: byId,
      concepts: model.concepts.map(c => ({ id: c.id, pct: mean(c.links.map(id => byId[id].pct)) })),
      gaps: all.filter(i => i.lost > 0).sort((a, b) => b.lost - a.lost || a.id.localeCompare(b.id))
        .map(i => ({ id: i.id, criterionId: i.criterionId, lost: i.lost, pct: i.pct, weight: i.weight })),
      progress: { done: sum(all.map(i => i.answered)), total: sum(all.map(i => i.total)) },
    };
  }

  // Index of the scale band a percentage falls in (0 = lowest).
  function band(model, pct) {
    const r = round5(Math.max(0, Math.min(100, pct)));
    const k = model.scale.bands.findIndex(b => r <= b.max);
    return k < 0 ? model.scale.bands.length - 1 : k;
  }

  // T2.2 — Suggested Trends / Targets / Comparisons scores from a results item's indicators.
  // Score = share of indicators that pass × 100, mirroring the results scale
  // ("in none / a quarter / half / three-quarters / all of the cases").
  function suggest(indicators = [], { minYears = 3, tolerance = 0.02 } = {}) {
    const rows = indicators.map(ind => {
      const series = Object.entries(ind.series || {})
        .filter(([, v]) => isNum(v)).map(([y, v]) => [Number(y), Number(v)]).sort((a, b) => a[0] - b[0]);
      return { ind, series };
    }).filter(r => r.series.length);
    if (!rows.length) return null;

    let trendsOk = 0, targetsOk = 0, compOk = 0;
    for (const { ind, series } of rows) {
      const higher = ind.higher !== false;
      const better = (a, b) => (higher ? a > b : a < b);       // a is better than b
      const latest = series[series.length - 1][1];
      // trend: the last minYears values are consecutive years, and every step improves
      // or holds within ±tolerance of the year before ("sustained good performance")
      const last = series.slice(-minYears);
      const consecutive = last.length === minYears && last.every(([y], k) => !k || y === last[k - 1][0] + 1);
      const steps = last.every(([, v], k) => {
        if (!k) return true;
        const prev = last[k - 1][1];
        return better(v, prev) || Math.abs(v - prev) <= Math.abs(prev) * tolerance;
      });
      if (consecutive && steps) trendsOk++;
      if (isNum(ind.target) && (latest === Number(ind.target) || better(latest, Number(ind.target)))) targetsOk++;
      if (ind.comparator && isNum(ind.comparator.value) && better(latest, Number(ind.comparator.value))) compOk++;
    }
    const n = rows.length;
    const score = ok => round5((ok / n) * 100);
    return { trends: score(trendsOk), targets: score(targetsOk), comparisons: score(compOk),
      basis: { n, trendsOk, targetsOk, compOk } };
  }

  const Engine = { items, attributesOf, itemScore, assess, band, suggest, round5, aggregate };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(typeof self !== 'undefined' ? self : this);
