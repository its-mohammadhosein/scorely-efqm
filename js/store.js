// T1.2 — Persistence for the full assessment (assessment, report pages).
// Everything lives in localStorage under one key. When storage is blocked (private
// window, blocked site data) the app keeps working in memory for the session, and
// Export / Import JSON lets people back up or move their work.
//
// State (v3):
// { v, plan, cur, assessments: [{ id, model, year, name, curSite, sites: [{ id, name }],
//     data: { [siteId]: { scores, guidance, notes, indicators } } }],
//   inputs, values, indicators }
// The last three belong to the organization, not to one assessment (Your company page):
//   inputs: [{ id, name, unit }]                       raw data items, entered once
//   values: { [inputId]: { [year]: number } }
//   indicators: [{ id, name, unit, higher, kind, part, formula, method, origin,
//                  targets: { [year]: { value, setAt } }, comparator: { label, values: { [year]: number } } | null }]
// They are optional, so older saves and export files still load.
(function (root) {
  const KEY = 'scorely-app';
  const V = 3;
  const MODEL = 'imi-1404';
  const PLANS = ['starter', 'team', 'enterprise'];

  const uid = p => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const emptySite = () => ({ scores: {}, guidance: {}, notes: {}, indicators: {} });

  // The current Solar Hijri year (the model's calendar), falling back to an estimate.
  const thisYear = () => {
    try {
      const y = parseInt(new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric' }).format(new Date()), 10);
      if (y > 1300) return y;
    } catch (e) { /* older browsers */ }
    return new Date().getFullYear() - 621;
  };

  const newAssessment = (year = thisYear(), name = '') => {
    const site = uid('s');
    return { id: uid('a'), model: MODEL, year, name, curSite: site, sites: [{ id: site, name: '' }], data: { [site]: emptySite() } };
  };
  const fresh = () => {
    const a = newAssessment();
    return { v: V, plan: 'team', cur: a.id, assessments: [a], inputs: [], values: {}, indicators: [] };
  };

  let blocked = false;
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { blocked = true; return null; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, value); blocked = false; return true; } catch (e) { blocked = true; return false; }
  };

  // Shape check used on load and on import; throws with a reason people can read.
  function validate(s) {
    if (!s || typeof s !== 'object') throw new Error('not a Saramadan file');
    if (s.v !== V) throw new Error(`unsupported version ${s.v}`);
    if (!Array.isArray(s.assessments) || !s.assessments.length) throw new Error('no assessments');
    for (const a of s.assessments) {
      if (a.model !== MODEL) throw new Error(`unknown model "${a.model}"`);
      if (!Array.isArray(a.sites) || !a.sites.length || !a.data) throw new Error('an assessment has no sites');
      for (const site of a.sites) {
        const d = a.data[site.id] = a.data[site.id] || emptySite();
        for (const k of ['scores', 'guidance', 'notes', 'indicators']) d[k] = d[k] || {};
      }
      if (!a.sites.some(x => x.id === a.curSite)) a.curSite = a.sites[0].id;
    }
    if (!s.assessments.some(a => a.id === s.cur)) s.cur = s.assessments[0].id;
    if (!PLANS.includes(s.plan)) s.plan = 'team';
    if (!Array.isArray(s.inputs)) s.inputs = [];
    if (!Array.isArray(s.indicators)) s.indicators = [];
    if (!s.values || typeof s.values !== 'object') s.values = {};
    return s;
  }

  // Older or unreadable data: keep a raw copy aside so nothing is lost, then start fresh.
  let notice = null;
  function load() {
    const s = read();
    if (!s) return fresh();
    try { return validate(s); } catch (e) {
      write(`${KEY}-backup`, JSON.stringify(s));
      notice = 'reset';
      return fresh();
    }
  }

  let state = load();

  const Store = {
    KEY, V, PLANS,
    get state() { return state; },
    get blocked() { return blocked; },
    get notice() { return notice; },             // 'reset' when old data was set aside
    save() { return write(KEY, JSON.stringify(state)); },

    current() { return state.assessments.find(a => a.id === state.cur); },
    site() { const a = Store.current(); return a.data[a.curSite]; },

    // assessments (one per year, usually)
    addAssessment(year, name) {
      const a = newAssessment(year, name);
      state.assessments.push(a); state.cur = a.id; Store.save();
      return a;
    },
    switchAssessment(id) { if (state.assessments.some(a => a.id === id)) { state.cur = id; Store.save(); } },
    deleteAssessment(id) {
      if (state.assessments.length < 2) return false;
      state.assessments = state.assessments.filter(a => a.id !== id);
      if (state.cur === id) state.cur = state.assessments[state.assessments.length - 1].id;
      Store.save(); return true;
    },

    // sites (Enterprise)
    addSite(name = '') {
      const a = Store.current(), id = uid('s');
      a.sites.push({ id, name }); a.data[id] = emptySite(); a.curSite = id; Store.save();
      return id;
    },
    renameSite(id, name) { const s = Store.current().sites.find(x => x.id === id); if (s) { s.name = name; Store.save(); } },
    switchSite(id) { const a = Store.current(); if (a.sites.some(x => x.id === id)) { a.curSite = id; Store.save(); } },
    deleteSite(id) {
      const a = Store.current();
      if (a.sites.length < 2) return false;
      a.sites = a.sites.filter(x => x.id !== id); delete a.data[id];
      if (a.curSite === id) a.curSite = a.sites[0].id;
      Store.save(); return true;
    },

    setPlan(p) { if (PLANS.includes(p)) { state.plan = p; Store.save(); } },
    thisYear,
    uid,

    // backup
    exportJSON() {
      const a = Store.current();
      const day = new Date().toISOString().slice(0, 10);
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `saramadan-${a.year}-${day}.json` });
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    },
    // Reads a file and returns the parsed state without applying it, so the page can confirm first.
    readImport(file) {
      return file.text().then(text => validate(JSON.parse(text)));
    },
    replace(next) { state = validate(next); notice = null; return Store.save(); },
    reset() { state = fresh(); return Store.save(); },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Store;
  else root.Store = Store;
})(typeof self !== 'undefined' ? self : this);
