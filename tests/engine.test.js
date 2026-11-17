// T2.3 — Engine tests. Run from scorely-efqm/:  node --test tests/
// They use the real model file, so data mistakes show up here too.
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../js/models/imi-1404.js');
const Engine = require('../js/engine.js');

const ITEMS = Engine.items(model);
const attrIds = kind => Engine.attributesOf(model, kind).map(a => a.id);
const fill = (kind, v) => Object.fromEntries(attrIds(kind).map(id => [id, v]));
const allAt = v => ({ scores: Object.fromEntries(ITEMS.map(i => [i.id, fill(i.kind, v)])) });
const only = (id, v) => {
  const i = ITEMS.find(x => x.id === id);
  return { scores: { [id]: fill(i.kind, v) } };
};

test('model shape the engine relies on', () => {
  assert.equal(ITEMS.length, 33);
  assert.equal(attrIds('enabler').length, 6);
  assert.equal(attrIds('result').length, 6);
});

test('all attributes at 100 → 1000; at 0 → 0', () => {
  const full = Engine.assess(model, allAt(100));
  assert.equal(full.total, 1000);
  assert.equal(full.enabler, 550);
  assert.equal(full.result, 450);
  assert.equal(Engine.assess(model, allAt(0)).total, 0);
});

test('empty data → 0, nothing answered, every item incomplete', () => {
  const r = Engine.assess(model, {});
  assert.equal(r.total, 0);
  assert.equal(r.progress.done, 0);
  assert.equal(r.progress.total, 33 * 6);
  assert.ok(Object.values(r.items).every(i => !i.complete));
});

test('enabler cap: Sound 40 with everything else 80 → item 40, capped', () => {
  const attrs = { ...fill('enabler', 80), sound: 40 };
  const s = Engine.itemScore(model, 'enabler', attrs);
  assert.equal(s.pct, 40);
  assert.equal(s.capped, true);
  assert.equal(s.complete, true);
});

test('result cap: Scope 30 with everything else 90 → item 30, capped', () => {
  const s = Engine.itemScore(model, 'result', { ...fill('result', 90), scope: 30 });
  assert.equal(s.pct, 30);
  assert.equal(s.capped, true);
});

test('no cap when the cap attribute is the highest', () => {
  const s = Engine.itemScore(model, 'enabler', { ...fill('enabler', 50), sound: 90 });
  assert.equal(s.capped, false);
  // approach = (90 + 50) / 2 = 70, deployment 50, assess 50 → 56.67 → rounds to 55
  assert.equal(s.pct, 55);
});

test('every item % is a multiple of 5', () => {
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let run = 0; run < 50; run++) {
    const data = { scores: Object.fromEntries(ITEMS.map(i => [i.id,
      Object.fromEntries(attrIds(i.kind).map(id => [id, Math.floor(rnd() * 21) * 5]))])) };
    for (const i of Object.values(Engine.assess(model, data).items)) assert.equal(i.pct % 5, 0, `${i.id}: ${i.pct}`);
  }
});

test('a single item at 100 gives exactly its weight', () => {
  assert.equal(Engine.assess(model, only('2-3', 100)).total, 30);
  assert.equal(Engine.assess(model, only('4-2', 100)).total, 20);
  assert.equal(Engine.assess(model, only('7-5B', 100)).total, 60);
  assert.equal(Engine.assess(model, only('7-1A', 100)).total, 65);
});

test('criterion and sub totals', () => {
  const r = Engine.assess(model, allAt(50));
  assert.deepEqual(r.criteria.map(c => c.max), [100, 80, 100, 90, 80, 100, 450]);
  assert.ok(r.criteria.every(c => c.pct === 50));
  assert.deepEqual(r.criteria[6].subs.map(s => s.max), [100, 100, 50, 50, 150]);
});

test('unanswered attributes count as 0 and mark the item incomplete', () => {
  const s = Engine.itemScore(model, 'enabler', { sound: 60, aligned: 60 });
  // approach 60, deployment 0, assess 0 → 20
  assert.equal(s.pct, 20);
  assert.equal(s.complete, false);
  assert.equal(s.answered, 2);
});

test('gaps: sorted by points lost, largest first', () => {
  const r = Engine.assess(model, allAt(0));
  assert.equal(r.gaps[0].id, '7-1A');            // weight 65, the largest
  assert.equal(r.gaps.length, 33);
  for (let k = 1; k < r.gaps.length; k++) assert.ok(r.gaps[k - 1].lost >= r.gaps[k].lost);
  assert.equal(Engine.assess(model, allAt(100)).gaps.length, 0);
});

test('concepts: mean of linked items', () => {
  const c1 = model.concepts.find(c => c.id === 'C1');
  const data = { scores: Object.fromEntries(c1.links.map(id => [id, fill('enabler', 60)])) };
  const r = Engine.assess(model, data);
  assert.equal(r.concepts.find(c => c.id === 'C1').pct, 60);
  assert.ok(r.concepts.find(c => c.id === 'C2').pct < 60);  // C2 shares only some items with C1
});

test('band: index of the scale band', () => {
  assert.equal(Engine.band(model, 0), 0);
  assert.equal(Engine.band(model, 10), 0);
  assert.equal(Engine.band(model, 15), 1);
  assert.equal(Engine.band(model, 47.3), 2);
  assert.equal(Engine.band(model, 86), 3);       // rounds to 85
  assert.equal(Engine.band(model, 100), 4);
});

// ---- T2.2 suggestions
const ind = (series, extra = {}) => ({ name: 'x', series, ...extra });

test('suggest: no indicators → null', () => {
  assert.equal(Engine.suggest([]), null);
  assert.equal(Engine.suggest([ind({})]), null);
});

test('suggest: targets = share of indicators meeting target', () => {
  const s = Engine.suggest([
    ind({ 1402: 80 }, { target: 75 }),
    ind({ 1402: 70 }, { target: 70 }),
    ind({ 1402: 90 }, { target: 85 }),
    ind({ 1402: 60 }, { target: 65 }),
  ]);
  assert.equal(s.targets, 75);
  assert.equal(s.basis.targetsOk, 3);
});

test('suggest: trends need 3 consecutive improving or steady years', () => {
  assert.equal(Engine.suggest([ind({ 1401: 70, 1402: 74 })]).trends, 0);              // only 2 years
  assert.equal(Engine.suggest([ind({ 1400: 70, 1401: 74, 1402: 78 })]).trends, 100);
  assert.equal(Engine.suggest([ind({ 1399: 70, 1401: 74, 1402: 78 })]).trends, 0);    // gap in years
  assert.equal(Engine.suggest([ind({ 1400: 70, 1401: 74, 1402: 60 })]).trends, 0);    // a drop
  assert.equal(Engine.suggest([ind({ 1400: 80, 1401: 79, 1402: 80 })]).trends, 100);  // steady within 2%
});

test('suggest: lower-is-better indicators', () => {
  const s = Engine.suggest([ind({ 1400: 12, 1401: 10, 1402: 8 }, { higher: false, target: 9, comparator: { value: 10 } })]);
  assert.equal(s.trends, 100);
  assert.equal(s.targets, 100);
  assert.equal(s.comparisons, 100);
});

test('suggest: comparisons, rounded to the 5-point grid', () => {
  const s = Engine.suggest([
    ind({ 1402: 80 }, { comparator: { value: 70 } }),
    ind({ 1402: 60 }, { comparator: { value: 70 } }),
    ind({ 1402: 50 }),
  ]);
  assert.equal(s.comparisons, 35);               // 1 of 3 → 33.3 → 35
});
