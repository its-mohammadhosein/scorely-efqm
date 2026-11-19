// Organization indicators (Your company pages): yearly results computed from the saved inputs
// with js/formula.js, plus targets and benchmark values. Pure functions over Store.state
// ({ inputs, values, indicators }); runs in the browser and in Node tests.
(function (root) {
  const F = typeof module !== 'undefined' && module.exports ? require('./formula.js') : root.Formula;
  const isNum = v => v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v));

  const inputByName = (state, name) => state.inputs.find(i => F.key(i.name) === F.key(name));
  const value = (state, name, y) => { const i = inputByName(state, name); return i ? state.values[i.id]?.[y] : undefined; };

  // One result per year: { ok, value } or { ok: false, code, names }.
  // get(name, year) reads an input; by default the saved values.
  const results = (formula, years, get) => {
    const p = F.parse(formula);
    return years.map(y => (p.ok ? F.evaluate(p.ast, name => get(name, y)) : { ok: false, code: 'formula' }));
  };
  const resultsOf = (state, ind, years) => results(ind.formula, years, (n, y) => value(state, n, y));

  // Benchmark as { label, values: { [year]: number } }, or null.
  // Saves made before benchmarks had one value per year kept { label, year, value }.
  const benchmark = ind => {
    const c = ind.comparator;
    if (!c) return null;
    if (c.values) return { label: c.label || '', values: { ...c.values } };
    return { label: c.label || '', values: isNum(c.value) ? { [c.year]: Number(c.value) } : {} };
  };
  const target = (ind, y) => (isNum(ind.targets?.[y]?.value) ? Number(ind.targets[y].value) : null);

  // Whether a value is at least as good as a goal, in the indicator's good direction.
  const meets = (higher, v, goal) => (higher ? v >= goal : v <= goal);

  const Indicators = { inputByName, value, results, resultsOf, benchmark, target, meets, isNum };
  if (typeof module !== 'undefined' && module.exports) module.exports = Indicators;
  else root.Indicators = Indicators;
})(typeof self !== 'undefined' ? self : this);
