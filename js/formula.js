// Indicator formulas: a small Excel-like language, parsed without eval.
//   =[Leavers] / [Average headcount] * 100
//   =ROUND([Total cost] / [Production], 1)
// Names in square brackets are inputs (raw data items). Functions: SUM AVERAGE MIN MAX ROUND ABS
// IF IFERROR. Operators: + - * / ^, postfix %, comparisons = <> < > <= >=.
// Persian digits, ×, ÷, − and the Persian comma are accepted as typed.
// Pure functions, no DOM: runs in the browser and in Node tests.
(function (root) {
  const isNum = v => v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v));

  // Same-length replacements only, so error positions still point into the text as typed.
  const DIGITS = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  const SAME = { '٫': '.', '،': ',', '؛': ',', ';': ',', '×': '*', '÷': '/', '−': '-', '–': '-' };
  const normalize = text => String(text ?? '').replace(/[۰-۹٠-٩٫،؛;×÷−–]/g, c => DIGITS[c] || SAME[c]);

  // Input names match ignoring case, extra spaces, ZWNJ and Arabic/Persian letter variants.
  const key = name => String(name ?? '').replace(/‌/g, ' ').replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .trim().replace(/\s+/g, ' ').toLocaleLowerCase();

  const FUNCS = {
    SUM: { min: 1, max: Infinity, args: 'number1, number2, …' },
    AVERAGE: { min: 1, max: Infinity, args: 'number1, number2, …' },
    MIN: { min: 1, max: Infinity, args: 'number1, number2, …' },
    MAX: { min: 1, max: Infinity, args: 'number1, number2, …' },
    ROUND: { min: 1, max: 2, args: 'number, digits' },
    ABS: { min: 1, max: 1, args: 'number' },
    IF: { min: 2, max: 3, args: 'condition, if true, if false' },
    IFERROR: { min: 2, max: 2, args: 'value, if error' },
  };

  const fail = (code, pos, end, params = {}) => { const e = new Error(code); e.formula = { code, pos, end, params }; throw e; };

  // ---------------------------------------------------------------- tokens
  function tokenize(src) {
    const s = normalize(src);
    const out = [];
    let i = 0;
    // a leading "=" is optional, as in a spreadsheet cell
    const lead = s.match(/^\s*=/);
    if (lead) i = lead[0].length;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '[') {
        const close = s.indexOf(']', i + 1);
        const open = s.indexOf('[', i + 1);
        if (close < 0 || (open >= 0 && open < close)) fail('unclosedName', i, close < 0 ? s.length : open);
        const name = s.slice(i + 1, close).trim();
        if (!name) fail('emptyName', i, close + 1);
        out.push({ t: 'ref', name, pos: i, end: close + 1 });
        i = close + 1; continue;
      }
      const n = s.slice(i).match(/^(\d+\.?\d*|\.\d+)/);
      if (n) { out.push({ t: 'num', v: Number(n[1]), pos: i, end: i + n[1].length }); i += n[1].length; continue; }
      const w = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_.]*/);
      if (w) { out.push({ t: 'word', v: w[0], pos: i, end: i + w[0].length }); i += w[0].length; continue; }
      const cmp = s.slice(i).match(/^(<>|<=|>=|<|>|=)/);
      if (cmp) { out.push({ t: 'cmp', v: cmp[1], pos: i, end: i + cmp[1].length }); i += cmp[1].length; continue; }
      if ('+-*/^%(),'.includes(c)) { out.push({ t: c, pos: i, end: i + 1 }); i++; continue; }
      fail('char', i, i + 1, { ch: src[i] });
    }
    return { tokens: out, length: s.length };
  }

  // ---------------------------------------------------------------- parser
  // Precedence, lowest first (as in Excel): comparison, + -, * /, ^, unary -, postfix %.
  function parseTokens({ tokens, length }) {
    let k = 0;
    const peek = () => tokens[k];
    const endPos = () => (peek() ? peek().pos : length);
    const take = t => { const tok = peek(); if (tok && tok.t === t) { k++; return tok; } return null; };

    const comparison = () => {
      let a = additive();
      while (peek() && peek().t === 'cmp') { const op = tokens[k++].v; a = { t: 'bin', op, a, b: additive() }; }
      return a;
    };
    const additive = () => {
      let a = term();
      while (peek() && (peek().t === '+' || peek().t === '-')) { const op = tokens[k++].t; a = { t: 'bin', op, a, b: term() }; }
      return a;
    };
    const term = () => {
      let a = power();
      while (peek() && (peek().t === '*' || peek().t === '/')) { const op = tokens[k++].t; a = { t: 'bin', op, a, b: power() }; }
      return a;
    };
    const power = () => {
      let a = unary();
      while (take('^')) a = { t: 'bin', op: '^', a, b: unary() };
      return a;
    };
    const unary = () => {
      if (take('-')) return { t: 'neg', a: unary() };
      if (take('+')) return unary();
      let a = primary();
      while (take('%')) a = { t: 'pct', a };
      return a;
    };
    const primary = () => {
      const tok = peek();
      if (!tok) fail(k ? 'expected' : 'empty', length, length, { what: 'value' });
      if (tok.t === 'num') { k++; return { t: 'num', v: tok.v }; }
      if (tok.t === 'ref') { k++; return { t: 'ref', name: tok.name, pos: tok.pos, end: tok.end }; }
      if (tok.t === '(') {
        k++;
        const a = comparison();
        if (!take(')')) fail('expected', endPos(), endPos() + 1, { what: ')' });
        return a;
      }
      if (tok.t === 'word') {
        k++;
        const name = tok.v.toUpperCase();
        if (!(peek() && peek().t === '(')) fail('bareName', tok.pos, tok.end, { word: tok.v });
        if (!FUNCS[name]) fail('unknownFn', tok.pos, tok.end, { name: tok.v });
        k++;
        const args = [];
        if (!take(')')) {
          do args.push(comparison()); while (take(','));
          if (!take(')')) fail('expected', endPos(), endPos() + 1, { what: ')' });
        }
        const f = FUNCS[name];
        if (args.length < f.min || args.length > f.max) fail('args', tok.pos, tokens[k - 1].end, { name, min: f.min, max: f.max, got: args.length });
        return { t: 'call', name, args };
      }
      fail('expected', tok.pos, tok.end, { what: 'value' });
    };

    if (!tokens.length) fail('empty', 0, 0);
    const ast = comparison();
    if (k < tokens.length) fail('trailing', tokens[k].pos, tokens[k].end);
    return ast;
  }

  const refsOf = ast => {
    const seen = new Map();
    const walk = n => {
      if (n.t === 'ref' && !seen.has(key(n.name))) seen.set(key(n.name), n.name);
      (n.args || []).forEach(walk);
      if (n.a) walk(n.a);
      if (n.b) walk(n.b);
    };
    walk(ast);
    return [...seen.values()];
  };

  // { ok, ast, refs } or { ok: false, error: { code, pos, end, params } }
  function parse(text) {
    try {
      const ast = parseTokens(tokenize(text));
      return { ok: true, ast, refs: refsOf(ast) };
    } catch (e) {
      if (e.formula) return { ok: false, error: e.formula };
      throw e;
    }
  }

  // ---------------------------------------------------------------- evaluate
  // get(name) returns the input's number, or null/undefined when it has no value.
  // { ok, value } or { ok: false, code: 'missing' | 'div0' | 'invalid', names }
  function evaluate(ast, get) {
    const missing = refsOf(ast).filter(n => !isNum(get(n)));
    if (missing.length) return { ok: false, code: 'missing', names: missing };
    const err = code => { const e = new Error(code); e.evalCode = code; throw e; };
    const ev = n => {
      switch (n.t) {
        case 'num': return n.v;
        case 'ref': return Number(get(n.name));
        case 'neg': return -ev(n.a);
        case 'pct': return ev(n.a) / 100;
        case 'bin': {
          const a = ev(n.a), b = ev(n.b);
          switch (n.op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return b === 0 ? err('div0') : a / b;
            case '^': return a ** b;
            case '=': return +(a === b);
            case '<>': return +(a !== b);
            case '<': return +(a < b);
            case '>': return +(a > b);
            case '<=': return +(a <= b);
            case '>=': return +(a >= b);
          }
          break;
        }
        case 'call': {
          if (n.name === 'IF') return ev(n.args[0]) ? ev(n.args[1]) : (n.args[2] ? ev(n.args[2]) : 0);
          if (n.name === 'IFERROR') {
            try { const v = ev(n.args[0]); if (!Number.isFinite(v)) throw new Error('invalid'); return v; } catch (e) { return ev(n.args[1]); }
          }
          const xs = n.args.map(ev);
          switch (n.name) {
            case 'SUM': return xs.reduce((s, x) => s + x, 0);
            case 'AVERAGE': return xs.reduce((s, x) => s + x, 0) / xs.length;
            case 'MIN': return Math.min(...xs);
            case 'MAX': return Math.max(...xs);
            case 'ABS': return Math.abs(xs[0]);
            case 'ROUND': { const p = 10 ** Math.trunc(xs[1] || 0); return Math.round(xs[0] * p) / p; }
          }
        }
      }
      return err('invalid');
    };
    try {
      const value = ev(ast);
      return Number.isFinite(value) ? { ok: true, value } : { ok: false, code: 'invalid' };
    } catch (e) {
      if (e.evalCode) return { ok: false, code: e.evalCode };
      throw e;
    }
  }

  // ---------------------------------------------------------------- reading aid
  // The formula in plain notation, for "reads as" lines and the method text:
  //   Leavers ÷ Average headcount × 100
  const PREC = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '+': 2, '-': 2, '*': 3, '/': 3, '^': 4 };
  const SHOW = { '*': '×', '/': '÷', '-': '−', '<>': '≠', '<=': '≤', '>=': '≥' };
  function describe(ast, { sep = ', ' } = {}) {
    const fmtNum = v => String(+v.toFixed(6));
    const go = (n, parent = 0, right = false) => {
      switch (n.t) {
        case 'num': return fmtNum(n.v);
        case 'ref': return n.name;
        case 'neg': return `−${go(n.a, 5)}`;
        case 'pct': return `${go(n.a, 5)}%`;
        case 'call': return `${n.name}(${n.args.map(a => go(a)).join(sep)})`;
        case 'bin': {
          const p = PREC[n.op];
          const s = `${go(n.a, p)} ${SHOW[n.op] || n.op} ${go(n.b, p, true)}`;
          return p < parent || (right && p === parent && p !== 4) ? `(${s})` : s;
        }
      }
      return '';
    };
    return go(ast);
  }

  // What the caret is in, for suggestions:
  //   { kind: 'name', start, query }      inside an unclosed [ … (start = index of "[")
  //   { kind: 'fn', name, arg }           inside the brackets of a known function call
  //   null                                anywhere else
  function context(text, caret) {
    const s = normalize(text).slice(0, caret);
    const open = s.lastIndexOf('[');
    if (open >= 0 && s.indexOf(']', open) < 0) return { kind: 'name', start: open, query: s.slice(open + 1) };
    let depth = 0, arg = 0;
    for (let i = s.length - 1; i >= 0; i--) {
      const c = s[i];
      if (c === ']') { const o = s.lastIndexOf('[', i); if (o >= 0) { i = o; continue; } }
      if (c === ')') depth++;
      else if (c === ',' && !depth) arg++;
      else if (c === '(') {
        if (depth) { depth--; continue; }
        const w = s.slice(0, i).match(/([A-Za-z_][A-Za-z0-9_.]*)\s*$/);
        const name = w && w[1].toUpperCase();
        return name && FUNCS[name] ? { kind: 'fn', name, arg } : null;
      }
    }
    return null;
  }

  const Formula = { parse, evaluate, describe, context, normalize, key, FUNCS };
  if (typeof module !== 'undefined' && module.exports) module.exports = Formula;
  else root.Formula = Formula;
})(typeof self !== 'undefined' ? self : this);
