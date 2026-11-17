// T1.1 — Language helpers shared by every page.
// The page language comes from <html lang>; Persian pages live in fa/ and set lang="fa".
// Model texts are { en, fa } objects: always read them through t(), never obj.en.
(function (root) {
  const LANG = typeof document !== 'undefined' && document.documentElement.lang === 'fa' ? 'fa' : 'en';
  const FA = LANG === 'fa';
  const LOCALE = FA ? 'fa-IR' : 'en-US';

  const t = o => (o == null ? '' : typeof o === 'string' ? o : o[LANG] ?? o.en ?? '');
  const num = (n, digits = 0) => Number(n || 0).toLocaleString(LOCALE, { maximumFractionDigits: digits });
  const pct = (n, digits = 0) => (FA ? `${num(n, digits)}٪` : `${num(n, digits)}%`);
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  const digits = s => (FA ? String(s).replace(/\d/g, d => FA_DIGITS[d]) : String(s));
  // Item ids: "7-1A" → "7-1 A" / "۷-۱ الف". Persian ids start with an Arabic Letter Mark
  // (U+061C) so they always read right to left like the source, whatever text surrounds them.
  const PART_FA = { A: 'الف', B: 'ب', C: 'ج' };
  const itemId = id => {
    const m = String(id).match(/^(\d-\d)([ABC])?$/);
    if (!m) return digits(id);
    return (FA ? '؜' : '') + digits(m[1]) + (m[2] ? ' ' + (FA ? PART_FA[m[2]] : m[2]) : '');
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // UI strings that are not model text. A value can be a function for strings with numbers.
  const UI = {
    of: { en: n => `of ${num(n)}`, fa: n => `از ${num(n)}` },
    pts: { en: n => `${num(n)} pts`, fa: n => `${num(n)} امتیاز` },
    criterion: { en: n => `Criterion ${n}`, fa: n => `معیار ${num(n)}` },
    explainHow: { en: 'Explain how you:', fa: 'توضیح دهید که چگونه:' },
    saved: { en: 'Saved', fa: 'ذخیره شد' },
    notSaved: { en: 'Not saved: browser storage is blocked', fa: 'ذخیره نشد: حافظهٔ مرورگر مسدود است' },
    capped: { en: (n, attr, el) => `Capped at ${num(n)} by ${attr} (${el})`, fa: (n, attr, el) => `محدود به ${num(n)} با ویژگی «${attr}» (${el})` },
    derived: { en: 'Derived from the concept–criteria map (p.52)', fa: 'برگرفته از جدول ارتباط مفاهیم بنیادین و معیارها (ص. ۵۲)' },
  };
  const ui = (key, ...args) => {
    const v = UI[key] && (UI[key][LANG] ?? UI[key].en);
    if (v === undefined) return key;
    return typeof v === 'function' ? v(...args) : v;
  };

  const I18N = { LANG, FA, LOCALE, t, num, pct, esc, ui, UI, digits, itemId };
  if (typeof module !== 'undefined' && module.exports) module.exports = I18N;
  else root.I18N = I18N;
})(typeof self !== 'undefined' ? self : this);
