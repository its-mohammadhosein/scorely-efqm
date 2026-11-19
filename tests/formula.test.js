// Indicator formula tests. Run from scorely-efqm/:  node --test "tests/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const Formula = require('../js/formula.js');

const calc = (text, vals = {}) => {
  const p = Formula.parse(text);
  assert.ok(p.ok, `parse failed: ${JSON.stringify(p.error)}`);
  const byKey = Object.fromEntries(Object.entries(vals).map(([k, v]) => [Formula.key(k), v]));
  return Formula.evaluate(p.ast, name => byKey[Formula.key(name)]);
};
const errorOf = text => {
  const p = Formula.parse(text);
  assert.equal(p.ok, false, `expected an error for ${text}`);
  return p.error;
};

test('a ratio as a percentage, with or without the leading =', () => {
  const vals = { Leavers: 8, 'Average headcount': 56 };
  assert.equal(calc('=[Leavers] / [Average headcount] * 100', vals).value, 8 / 56 * 100);
  assert.equal(calc('[Leavers]/[Average headcount]*100', vals).value, 8 / 56 * 100);
});

test('precedence follows the spreadsheet: * before +, ^ before *, brackets first', () => {
  assert.equal(calc('=1 + 2 * 3').value, 7);
  assert.equal(calc('=(1 + 2) * 3').value, 9);
  assert.equal(calc('=2 * 3 ^ 2').value, 18);
  assert.equal(calc('=10 - 4 - 3').value, 3);
  assert.equal(calc('=-2 ^ 2').value, 4);           // as in Excel: negation first
});

test('postfix % divides by 100', () => {
  assert.equal(calc('=[Electricity] * 80%', { Electricity: 1000 }).value, 800);
});

test('functions', () => {
  assert.equal(calc('=SUM(1, 2, 3)').value, 6);
  assert.equal(calc('=average(2, 4)').value, 3);     // names are not case-sensitive
  assert.equal(calc('=MIN(5, 2, 9)').value, 2);
  assert.equal(calc('=MAX(5, 2, 9)').value, 9);
  assert.equal(calc('=ROUND(2.345, 2)').value, 2.35);
  assert.equal(calc('=ROUND(2.5)').value, 3);
  assert.equal(calc('=ABS(-4)').value, 4);
  assert.equal(calc('=IF([A] > 10, 1, 2)', { A: 12 }).value, 1);
  assert.equal(calc('=IF([A] > 10, 1)', { A: 3 }).value, 0);
  assert.equal(calc('=IFERROR([A] / [B], 0)', { A: 1, B: 0 }).value, 0);
});

test('Persian digits, separators, operators and names', () => {
  const vals = { 'تعداد ترک‌کنندگان': 8, 'میانگین تعداد کارکنان': 56 };
  assert.equal(calc('=[تعداد ترک‌کنندگان] ÷ [میانگین تعداد کارکنان] × ۱۰۰', vals).value, 8 / 56 * 100);
  assert.equal(calc('=ROUND(۲٫۳۴۵؛ ۲)').value, 2.35);
  assert.equal(calc('=SUM(۱، ۲)').value, 3);
  assert.equal(calc('=۵ − ۲').value, 3);
});

test('input names match loosely: case, spaces, ZWNJ, Arabic letter forms', () => {
  assert.equal(Formula.key('  Average   Headcount '), Formula.key('average headcount'));
  assert.equal(Formula.key('ترک‌کنندگان'), Formula.key('ترک کنندگان'));
  assert.equal(Formula.key('كاركنان'), Formula.key('کارکنان'));
});

test('refs lists each input once, as first written', () => {
  const p = Formula.parse('=[A] + [b] * [a] + [C]');
  assert.deepEqual(p.refs, ['A', 'b', 'C']);
});

test('missing values are reported by name, never treated as zero', () => {
  const r = calc('=[A] / [B] + [C]', { A: 1, B: '', C: null });
  assert.deepEqual(r, { ok: false, code: 'missing', names: ['B', 'C'] });
});

test('division by zero and non-numbers', () => {
  assert.deepEqual(calc('=[A] / [B]', { A: 1, B: 0 }), { ok: false, code: 'div0' });
  assert.equal(calc('=10 ^ 400').code, 'invalid');
});

test('errors say what is wrong and where', () => {
  assert.equal(errorOf('').code, 'empty');
  assert.equal(errorOf('=').code, 'empty');
  assert.deepEqual(errorOf('=[Leavers / 2'), { code: 'unclosedName', pos: 1, end: 13, params: {} });
  assert.equal(errorOf('=[]').code, 'emptyName');
  assert.deepEqual(errorOf('=Leavers / 2'), { code: 'bareName', pos: 1, end: 8, params: { word: 'Leavers' } });
  assert.deepEqual(errorOf('=SUMM(1)'), { code: 'unknownFn', pos: 1, end: 5, params: { name: 'SUMM' } });
  assert.equal(errorOf('=ABS(1, 2)').code, 'args');
  assert.equal(errorOf('=IF(1)').params.min, 2);
  assert.equal(errorOf('=(1 + 2').params.what, ')');
  assert.equal(errorOf('=1 +').params.what, 'value');
  assert.equal(errorOf('=[A] [B]').code, 'trailing');
  assert.deepEqual(errorOf('=1 $ 2'), { code: 'char', pos: 3, end: 4, params: { ch: '$' } });
});

test('describe reads the formula back in plain notation', () => {
  const read = text => Formula.describe(Formula.parse(text).ast);
  assert.equal(read('=[Leavers]/[Average headcount]*100'), 'Leavers ÷ Average headcount × 100');
  assert.equal(read('=([A] + [B]) / [C]'), '(A + B) ÷ C');
  assert.equal(read('=[A] - ([B] - [C])'), 'A − (B − C)');
  assert.equal(read('=ROUND([A] / [B], 1)'), 'ROUND(A ÷ B, 1)');
});

test('context: inside a name, inside a function, or neither', () => {
  assert.deepEqual(Formula.context('=[Lea', 5), { kind: 'name', start: 1, query: 'Lea' });
  assert.equal(Formula.context('=[Leavers] + ', 13), null);
  assert.deepEqual(Formula.context('=ROUND([A] / [B], ', 18), { kind: 'fn', name: 'ROUND', arg: 1 });
  assert.deepEqual(Formula.context('=IF(SUM(1, 2) > 3, ', 19), { kind: 'fn', name: 'IF', arg: 1 });
  assert.deepEqual(Formula.context('=SUM([a, b], ', 13), { kind: 'fn', name: 'SUM', arg: 1 });
});
