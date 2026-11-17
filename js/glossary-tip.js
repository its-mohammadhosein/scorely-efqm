// T1.3 — Glossary hints. Glossary.apply(container, selector) underlines the first
// occurrence of each glossary term in every matching element and shows its definition
// on hover or keyboard focus. Terms come from the model (window.IMI_1404.glossary).
(function (root) {
  const M = root.IMI_1404;
  const I18N = root.I18N;
  if (!M || !I18N || typeof document === 'undefined') return;
  const { t, FA, esc } = I18N;

  // Too generic to underline: they appear in almost every sentence.
  const SKIP = new Set(['data', 'information', 'knowledge', 'change', 'needs', 'process', 'technology']);
  const terms = M.glossary.filter(g => !SKIP.has(g.id)).map(g => ({ id: g.id, text: t(g.term), def: t(g.def), term: g }));
  const byKey = new Map(terms.map(x => [x.text.toLocaleLowerCase(), x]));
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // longest first, so "Key Stakeholders" wins over "Stakeholders"
  const alts = terms.map(x => x.text).sort((a, b) => b.length - a.length).map(escRe).join('|');
  // whole words only; English allows a plural "s"; Persian words join with letters or a half-space
  const RE = FA
    ? new RegExp(`(?<![\\p{L}\\u200c])(${alts})(?![\\p{L}])`, 'gu')
    : new RegExp(`(?<![\\p{L}])(${alts})(?:s|es)?(?![\\p{L}])`, 'giu');
  const find = s => byKey.get(s.toLocaleLowerCase()) || byKey.get(s.toLocaleLowerCase().replace(/e?s$/, ''));

  function apply(container, selector) {
    if (!container) return;
    for (const block of container.querySelectorAll(selector)) {
      if (block.dataset.gloss === 'done') continue;
      block.dataset.gloss = 'done';
      const seen = new Set();
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('.gl, button, a, input, textarea, select')) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const text = node.nodeValue;
        RE.lastIndex = 0;
        let m, last = 0, frag = null;
        while ((m = RE.exec(text))) {
          const hit = find(m[1]);
          if (!hit || seen.has(hit.id)) continue;
          seen.add(hit.id);
          frag = frag || document.createDocumentFragment();
          frag.append(text.slice(last, m.index));
          const span = document.createElement('span');
          span.className = 'gl';
          span.tabIndex = 0;
          span.dataset.gl = hit.id;
          span.textContent = m[0];
          frag.append(span);
          last = m.index + m[0].length;
        }
        if (frag) { frag.append(text.slice(last)); node.replaceWith(frag); }
      }
    }
  }

  // one shared tooltip
  const tip = document.createElement('div');
  tip.className = 'tip tip--gl';
  tip.setAttribute('role', 'tooltip');
  tip.id = 'gl-tip';
  let current = null;
  const show = el => {
    const g = terms.find(x => x.id === el.dataset.gl);
    if (!g) return;
    if (!tip.isConnected) document.body.appendChild(tip);
    const def = g.def.length > 260 ? `${g.def.slice(0, 250).replace(/\s+\S*$/, '')}…` : g.def;
    tip.innerHTML = `<b>${esc(g.text)}</b>${esc(def)}`;
    current = el;
    el.setAttribute('aria-describedby', tip.id);
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const x = Math.min(Math.max(r.left + r.width / 2, w / 2 + 8), innerWidth - w / 2 - 8);
    const below = r.top < tip.offsetHeight + 90;     // no room above: show it underneath
    tip.classList.toggle('is-below', below);
    tip.style.left = `${x}px`;
    tip.style.top = `${below ? r.bottom : r.top}px`;
    tip.classList.add('is-on');
  };
  const hide = () => {
    tip.classList.remove('is-on');
    if (current) current.removeAttribute('aria-describedby');
    current = null;
  };
  document.addEventListener('pointerover', e => { const el = e.target.closest?.('.gl'); if (el && el !== current) show(el); });
  document.addEventListener('pointerout', e => { const el = e.target.closest?.('.gl'); if (el && !el.contains(e.relatedTarget)) hide(); });
  document.addEventListener('focusin', e => { const el = e.target.closest?.('.gl'); if (el) show(el); });
  document.addEventListener('focusout', e => { if (e.target.closest?.('.gl')) hide(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
  addEventListener('scroll', hide, { passive: true });

  root.Glossary = { apply };
})(typeof self !== 'undefined' ? self : this);
