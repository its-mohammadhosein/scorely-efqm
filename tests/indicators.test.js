// Organization indicator tests. Run from scorely-efqm/:  node --test "tests/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const X = require('../js/indicators.js');

const state = {
  inputs: [{ id: 'in_l', name: 'Leavers', unit: 'people' }, { id: 'in_h', name: 'Average headcount', unit: 'people' }],
  values: { in_l: { 1403: 5, 1404: 8 }, in_h: { 1402: 52, 1403: 53, 1404: 56 } },
  indicators: [],
};
const turnover = { formula: '=[Leavers] / [Average headcount] * 100', higher: false, targets: { 1404: { value: 8, setAt: '2025-01-01' } } };

test('results per year from saved inputs, with the reason when one is missing', () => {
  const rs = X.resultsOf(state, turnover, [1402, 1403, 1404]);
  assert.deepEqual(rs[0], { ok: false, code: 'missing', names: ['Leavers'] });
  assert.equal(rs[1].value, 5 / 53 * 100);
  assert.equal(rs[2].value, 8 / 56 * 100);
});

test('input names are found loosely', () => {
  assert.equal(X.value(state, ' average  HEADCOUNT', 1404), 56);
  assert.equal(X.value(state, 'Unknown', 1404), undefined);
});

test('targets and the good direction', () => {
  assert.equal(X.target(turnover, 1404), 8);
  assert.equal(X.target(turnover, 1403), null);
  assert.equal(X.meets(false, 7, 8), true);
  assert.equal(X.meets(false, 9, 8), false);
  assert.equal(X.meets(true, 8, 8), true);
});

test('benchmark: one value per year, and older single-year saves still read', () => {
  assert.equal(X.benchmark({}), null);
  assert.deepEqual(X.benchmark({ comparator: { label: 'Peer', values: { 1403: 9, 1404: 7 } } }), { label: 'Peer', values: { 1403: 9, 1404: 7 } });
  assert.deepEqual(X.benchmark({ comparator: { label: 'Peer', year: 1404, value: 7 } }), { label: 'Peer', values: { 1404: 7 } });
  assert.deepEqual(X.benchmark({ comparator: { label: 'Peer', year: 1404, value: null } }), { label: 'Peer', values: {} });
});
