// T1.2 — Store tests with a fake localStorage. Run from scorely-efqm/:  node --test "tests/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const PATH = require.resolve('../js/store.js');

// a fresh copy of the store module, reading from the given storage
const loadStore = storage => {
  global.localStorage = storage;
  delete require.cache[PATH];
  return require(PATH);
};
const memoryStorage = (init = {}) => {
  const data = { ...init };
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
};
const blockedStorage = () => ({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });

test('first visit: one assessment with one empty site', () => {
  const Store = loadStore(memoryStorage());
  const a = Store.current();
  assert.equal(Store.state.v, 3);
  assert.equal(a.model, 'imi-1404');
  assert.ok(a.year > 1400);
  assert.equal(a.sites.length, 1);
  assert.deepEqual(Store.site(), { scores: {}, guidance: {}, notes: {}, indicators: {} });
});

test('saved answers survive a reload', () => {
  const storage = memoryStorage();
  let Store = loadStore(storage);
  Store.site().scores['1-1'] = { sound: 40 };
  assert.equal(Store.save(), true);
  Store = loadStore(storage);
  assert.deepEqual(Store.site().scores['1-1'], { sound: 40 });
});

test('blocked storage: works in memory and reports it', () => {
  const Store = loadStore(blockedStorage());
  Store.site().scores['1-1'] = { sound: 40 };
  assert.equal(Store.save(), false);
  assert.equal(Store.blocked, true);
  assert.deepEqual(Store.site().scores['1-1'], { sound: 40 });
});

test('unreadable or old data is set aside, not lost', () => {
  const storage = memoryStorage({ 'scorely-app': JSON.stringify({ v: 2, plan: 'team', units: [] }) });
  const Store = loadStore(storage);
  assert.equal(Store.notice, 'reset');
  assert.equal(Store.state.v, 3);
  assert.match(storage.data['scorely-app-backup'], /"v":2/);
});

test('organization inputs and indicators: empty on first visit, filled in for older saves', () => {
  let Store = loadStore(memoryStorage());
  assert.deepEqual([Store.state.inputs, Store.state.values, Store.state.indicators], [[], {}, []]);

  // a v3 save from before the Your company page had none of these
  const old = loadStore(memoryStorage()).state;
  delete old.inputs; delete old.values; delete old.indicators;
  const storage = memoryStorage({ 'scorely-app': JSON.stringify(old) });
  Store = loadStore(storage);
  assert.equal(Store.notice, null);
  assert.deepEqual([Store.state.inputs, Store.state.values, Store.state.indicators], [[], {}, []]);

  Store.state.inputs.push({ id: 'in_1', name: 'Leavers', unit: 'people' });
  Store.state.values.in_1 = { 1404: 8 };
  Store.save();
  Store = loadStore(storage);
  assert.equal(Store.state.values.in_1[1404], 8);
});

test('sites and assessments: add, switch, delete', () => {
  const Store = loadStore(memoryStorage());
  const first = Store.current().curSite;
  const second = Store.addSite('Plant B');
  assert.equal(Store.current().curSite, second);
  Store.site().scores['1-1'] = { sound: 80 };
  Store.switchSite(first);
  assert.deepEqual(Store.site().scores, {});
  assert.equal(Store.deleteSite(second), true);
  assert.equal(Store.deleteSite(first), false);           // the last site stays

  const a1 = Store.current().id;
  const a2 = Store.addAssessment(1406).id;
  assert.equal(Store.current().id, a2);
  assert.equal(Store.deleteAssessment(a2), true);
  assert.equal(Store.current().id, a1);
  assert.equal(Store.deleteAssessment(a1), false);       // the last assessment stays
});

test('import: valid data replaces the state; bad data is rejected', async () => {
  const Store = loadStore(memoryStorage());
  const good = JSON.parse(JSON.stringify(Store.state));
  good.assessments[0].name = 'Imported';
  const file = obj => ({ text: async () => JSON.stringify(obj) });

  const parsed = await Store.readImport(file(good));
  Store.replace(parsed);
  assert.equal(Store.current().name, 'Imported');

  await assert.rejects(Store.readImport(file({ v: 2 })), /version/);
  await assert.rejects(Store.readImport(file({ ...good, assessments: [{ ...good.assessments[0], model: 'efqm-2025' }] })), /model/);
  await assert.rejects(Store.readImport({ text: async () => 'not json' }));
});
