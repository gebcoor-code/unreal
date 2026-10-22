// Drop-down lists drawn by the page, the same on every browser and device (iPad / iPhone Safari draw <select> their own
// way and open it as a system menu). Every <select> of the page is kept as the source of the data — its options, value,
// onchange, hidden / disabled stay what the code uses — and is hidden; a box drawn next to it shows the chosen option and
// opens a list under it (above it when there is no room below; never past the bottom of the screen).
// Not changed: list boxes (size > 1, multiple) and selects with data-native.
(function () {
  'use strict';
  const done = new WeakMap(); // select → box
  // the windows a list stays inside (CSS selector); set UnrealSelect.windows before DOMContentLoaded to change it
  const api = { windows: '[data-usel-window], .fwin, [role="dialog"]' };
  let pop = null, popFor = null, popAnchor = null; // popAnchor: the element the list hangs from (a box, or a text field with suggestions)

  // CSS written for "select" also styles the boxes: each such rule gets a copy for .usel (an #id of a select: its box)
  function cssMirror() {
    const ids = new Set([...document.querySelectorAll('select[id]')].map((s) => s.id));
    const cls = new Set(); document.querySelectorAll('select[class]').forEach((s) => s.classList.forEach((c) => cls.add(c)));
    const fix = (sel) => sel.split(',').map((p) => {
      let q = p.replace(/(^|[\s>+~(])select(?![\w-])/g, '$1.usel');
      q = q.replace(/#([\w-]+)/g, (m, id) => (ids.has(id) ? '.usel[data-for="' + id + '"]' : m));
      q = q.replace(/\.([\w-]+)/g, (m, c) => (cls.has(c) && c !== 'usel' ? '.usel[data-c~="' + c + '"]' : m)); // a class of a select: the box has it in data-c
      return q !== p ? q : null;
    }).filter(Boolean);
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch (e) { continue; }
      const walk = (list) => {
        for (let i = list.length - 1; i >= 0; i--) {
          const r = list[i];
          if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; } // @media
          if (!r.selectorText || !/select|#|\./.test(r.selectorText)) continue;
          const add = fix(r.selectorText);
          if (add.length) try { r.selectorText = r.selectorText + ', ' + add.join(', '); } catch (e) {}
        }
      };
      walk(rules);
    }
  }

  function label(sel) {
    const o = sel.options[sel.selectedIndex];
    return o ? o.textContent : '';
  }
  // the box: all option texts in one grid cell (only the chosen one visible), so it is as wide as the widest, like a select
  function render(sel) {
    const box = done.get(sel); if (!box) return;
    const opts = [...sel.options];
    const sig = opts.map((o) => o.textContent + (o.hidden ? '\u0001' : '')).join('\u0002') + '|' + sel.selectedIndex;
    if (box._sig !== sig) {
      box._sig = sig;
      const cell = box.firstChild; cell.textContent = '';
      opts.forEach((o, i) => {
        const s = document.createElement('span'); s.textContent = o.textContent || ' ';
        if (i !== sel.selectedIndex) s.className = 'usel-alt';
        cell.appendChild(s);
      });
      if (!opts.length) { const s = document.createElement('span'); s.textContent = ' '; cell.appendChild(s); }
      const o = opts[sel.selectedIndex];
      box.classList.toggle('usel-ph', !!(o && o.disabled)); // a placeholder ("Select from server")
    }
    box.hidden = sel.hidden;
    box.classList.toggle('usel-dis', sel.disabled);
    box.tabIndex = sel.disabled ? -1 : 0;
    box.title = sel.title || '';
    const c = sel.className.replace(/\busel-src\b/, '').trim(); // the select's classes go to data-c (not class: code finds selects by class)
    if (c !== box._cls) { box._cls = c; if (c) box.dataset.c = c; else delete box.dataset.c; }
    const st = sel.getAttribute('style') || ''; if (box._st !== st) { box._st = st; box.setAttribute('style', st); }
    if (sel.hasAttribute('aria-label')) box.setAttribute('aria-label', sel.getAttribute('aria-label'));
  }

  function enhance(sel) {
    if (done.has(sel) || sel.multiple || sel.size > 1 || sel.hasAttribute('data-native')) return;
    const box = document.createElement('div');
    box.className = 'usel'; box.setAttribute('role', 'combobox'); box.setAttribute('aria-haspopup', 'listbox');
    if (sel.id) box.dataset.for = sel.id;
    box.innerHTML = '<span class="usel-v"></span><svg class="usel-arr" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>';
    sel.insertAdjacentElement('afterend', box);
    sel.classList.add('usel-src');
    done.set(sel, box); box._sel = sel;
    // the code sets value / selectedIndex and focuses the select: the box follows
    const P = HTMLSelectElement.prototype;
    for (const k of ['value', 'selectedIndex']) {
      const d = Object.getOwnPropertyDescriptor(P, k);
      Object.defineProperty(sel, k, { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); render(this); } });
    }
    sel.focus = (o) => box.focus(o);
    sel.blur = () => box.blur();
    new MutationObserver(() => render(sel)).observe(sel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'title', 'class', 'style', 'label'] });
    box.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      e.preventDefault(); // no focus moves away from the window, no text selection
      if (sel.disabled) return;
      box.focus({ preventScroll: true });
      if (popFor === sel) close(); else open(sel);
    });
    box.addEventListener('keydown', (e) => keydown(e, sel));
    render(sel);
  }

  function pick(sel, i) {
    if (i < 0 || i >= sel.options.length) return;
    const o = sel.options[i]; if (o.disabled || o.hidden) return;
    if (sel.selectedIndex !== i) {
      sel.selectedIndex = i;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    render(sel);
  }
  const usable = (sel) => [...sel.options].map((o, i) => [o, i]).filter(([o]) => !o.disabled && !o.hidden).map(([, i]) => i);

  function open(sel) {
    close();
    const box = done.get(sel);
    pop = document.createElement('div'); pop.className = 'usel-pop'; pop.setAttribute('role', 'listbox');
    let group = null;
    [...sel.options].forEach((o, i) => {
      if (o.hidden) return;
      const g = o.parentElement && o.parentElement.tagName === 'OPTGROUP' ? o.parentElement : null;
      if (g !== group) { group = g; if (g) { const h = document.createElement('div'); h.className = 'usel-grp'; h.textContent = g.label; pop.appendChild(h); } }
      const d = document.createElement('div');
      d.className = 'usel-it' + (i === sel.selectedIndex ? ' on' : '') + (o.disabled ? ' dis' : '') + (g ? ' ing' : '');
      d.textContent = o.textContent || ' '; d.dataset.i = i;
      if (o.title) d.title = o.title;
      pop.appendChild(d);
    });
    pop.addEventListener('pointerdown', (e) => e.preventDefault()); // the box keeps the focus
    pop.addEventListener('click', (e) => { const d = e.target.closest('.usel-it'); if (!d || d.classList.contains('dis')) return; pick(sel, +d.dataset.i); close(); box.focus({ preventScroll: true }); });
    pop.addEventListener('pointermove', (e) => { const d = e.target.closest('.usel-it'); if (d && !d.classList.contains('dis')) hot(d); });
    document.body.appendChild(pop);
    popFor = sel; popAnchor = box; box.classList.add('open'); box.setAttribute('aria-expanded', 'true');
    place();
    const on = pop.querySelector('.usel-it.on'); if (on) { hot(on); on.scrollIntoView({ block: 'nearest' }); }
  }
  // fixed, under the box (or above it), as wide as the box at least. The height stays inside the visible screen and inside
  // the window the list belongs to (Options, Load, File Commander…): it never covers what is below that window
  function place() {
    if (!pop || !popAnchor) return;
    const r = popAnchor.getBoundingClientRect(), vv = window.visualViewport, vw = document.documentElement.clientWidth;
    let lo = 4, hi = Math.min(window.innerHeight, document.documentElement.clientHeight || 1e9, vv ? vv.height + vv.offsetTop : 1e9) - 4;
    if (vv) lo = Math.max(lo, vv.offsetTop + 4);
    const win = popAnchor.closest(api.windows);
    if (win) { // inside the window; a window with almost no room on both sides of the box: the screen
      const wr = win.getBoundingClientRect();
      if (Math.max(wr.bottom - r.bottom, r.top - wr.top) >= 100) { hi = Math.min(hi, wr.bottom - 4); lo = Math.max(lo, wr.top + 4); }
    }
    pop.style.minWidth = Math.round(r.width) + 'px'; pop.style.maxWidth = (vw - 8) + 'px';
    pop.style.maxHeight = ''; pop.style.top = pop.style.bottom = '';
    const below = hi - r.bottom - 2, above = r.top - 2 - lo, want = Math.min(pop.scrollHeight, 320);
    if (below >= Math.min(want, 120) || below >= above) { pop.style.top = (r.bottom + 2) + 'px'; pop.style.maxHeight = Math.max(60, below) + 'px'; }
    else { pop.style.top = Math.max(lo, r.top - 2 - Math.min(pop.scrollHeight, above)) + 'px'; pop.style.maxHeight = Math.max(60, above) + 'px'; }
    const w = pop.offsetWidth; pop.style.left = Math.max(4, Math.min(r.left, vw - w - 4)) + 'px';
  }
  function hot(d) { if (!pop) return; pop.querySelectorAll('.usel-it.hot').forEach((x) => x.classList.remove('hot')); d.classList.add('hot'); }
  function close() {
    if (!pop) return;
    const box = popFor && done.get(popFor);
    if (box) { box.classList.remove('open'); box.setAttribute('aria-expanded', 'false'); }
    if (popAnchor && popAnchor.classList.contains('usel-combo')) popAnchor.classList.remove('open');
    pop.remove(); pop = null; popFor = null; popAnchor = null;
  }

  function keydown(e, sel) {
    const isOpen = popFor === sel, k = e.key;
    const list = usable(sel);
    const cur = isOpen ? +((pop.querySelector('.usel-it.hot') || pop.querySelector('.usel-it.on') || {}).dataset || {}).i : sel.selectedIndex;
    const at = list.indexOf(isNaN(cur) ? sel.selectedIndex : cur);
    const go = (j) => {
      j = Math.max(0, Math.min(list.length - 1, j)); if (!list.length) return;
      if (isOpen) { const d = pop.querySelector('.usel-it[data-i="' + list[j] + '"]'); if (d) { hot(d); d.scrollIntoView({ block: 'nearest' }); } }
      else pick(sel, list[j]);
    };
    let used = true;
    if (k === 'ArrowDown' && e.altKey && !isOpen) open(sel);
    else if (k === 'ArrowDown') go(at < 0 ? 0 : at + 1);
    else if (k === 'ArrowUp') go(at < 0 ? 0 : at - 1);
    else if (k === 'Home') go(0);
    else if (k === 'End') go(list.length - 1);
    else if (k === 'PageDown') go(at + 8);
    else if (k === 'PageUp') go(at - 8);
    else if (k === 'Enter' || k === ' ') {
      if (isOpen) { const d = pop.querySelector('.usel-it.hot'); if (d) pick(sel, +d.dataset.i); close(); }
      else if (k === ' ' || !sel.closest('form')) open(sel);
    }
    else if (k === 'Escape' && isOpen) close();
    else if (k === 'Tab') { if (isOpen) close(); used = false; }
    else if (k.length === 1 && /\S/.test(k) && !e.ctrlKey && !e.metaKey && !e.altKey) { // the next option starting with the letter
      const t = k.toLowerCase(), n = list.length;
      for (let s = 1; s <= n; s++) { const j = (at + s + n) % n; if ((sel.options[list[j]].textContent || '').trim().toLowerCase().startsWith(t)) { go(j); break; } }
    }
    else used = false;
    if (used) { e.preventDefault(); e.stopPropagation(); }
  }

  // a text field with suggestions (<input list>): the browser's suggestion list (on iPhone above the keyboard, or nothing)
  // is replaced by an arrow button in the field that opens the suggestions as a list like the others; typing stays free
  const combos = new WeakSet();
  function enhanceCombo(inp) {
    if (combos.has(inp) || !inp.getAttribute('list')) return;
    combos.add(inp);
    const dl = inp.getAttribute('list'); inp.removeAttribute('list'); inp.dataset.list = dl;
    const wrap = document.createElement('span'); wrap.className = 'usel-combo';
    inp.insertAdjacentElement('beforebegin', wrap); wrap.appendChild(inp);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'usel-cbtn'; b.tabIndex = -1; b.title = 'Choose from the list';
    b.innerHTML = '<svg class="usel-arr" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>';
    wrap.appendChild(b);
    const items = () => { const d = document.getElementById(dl); return d ? [...d.options].map((o) => ({ value: o.value, text: o.label || o.textContent || o.value })) : []; };
    const toggle = () => {
      if (pop && popAnchor === wrap) { close(); return; }
      close();
      const list = items(); if (!list.length) return;
      pop = document.createElement('div'); pop.className = 'usel-pop'; pop.setAttribute('role', 'listbox');
      list.forEach((it) => { const d = document.createElement('div'); d.className = 'usel-it' + (it.value === inp.value ? ' on' : ''); d.textContent = it.text; d.title = it.value; d.dataset.v = it.value; pop.appendChild(d); });
      pop.addEventListener('pointerdown', (e) => e.preventDefault());
      pop.addEventListener('pointermove', (e) => { const d = e.target.closest('.usel-it'); if (d) hot(d); });
      pop.addEventListener('click', (e) => {
        const d = e.target.closest('.usel-it'); if (!d) return;
        inp.value = d.dataset.v; close();
        inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
      });
      document.body.appendChild(pop); popAnchor = wrap; wrap.classList.add('open'); place();
      const on = pop.querySelector('.usel-it.on'); if (on) on.scrollIntoView({ block: 'nearest' });
    };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && (e.altKey || !(pop && popAnchor === wrap))) { e.preventDefault(); e.stopPropagation(); if (!(pop && popAnchor === wrap)) toggle(); return; }
      if (!(pop && popAnchor === wrap)) return;
      const its = [...pop.querySelectorAll('.usel-it')], h = pop.querySelector('.usel-it.hot'), at = its.indexOf(h);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { const d = its[Math.max(0, Math.min(its.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))]; if (d) { hot(d); d.scrollIntoView({ block: 'nearest' }); } }
      else if (e.key === 'Enter' && h) h.click();
      else if (e.key === 'Escape') close();
      else return;
      e.preventDefault(); e.stopPropagation();
    });
  }
  function scan(root) {
    if (root.tagName === 'SELECT') enhance(root);
    else if (root.tagName === 'INPUT') enhanceCombo(root);
    else if (root.querySelectorAll) { root.querySelectorAll('select').forEach(enhance); root.querySelectorAll('input[list]').forEach(enhanceCombo); }
  }
  function init() {
    cssMirror();
    scan(document.body);
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) scan(n); }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('pointerdown', (e) => { if (pop && !pop.contains(e.target) && !(popAnchor && popAnchor.contains(e.target))) close(); }, true);
    window.addEventListener('resize', place);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', place);
    document.addEventListener('scroll', (e) => { if (pop && !pop.contains(e.target)) close(); }, true);
    setInterval(() => { // values set by code that the setters do not see (an option's .selected)
      document.querySelectorAll('select.usel-src').forEach((s) => { const b = done.get(s); if (b && b._sig && !b._sig.endsWith('|' + s.selectedIndex)) render(s); });
    }, 400);
  }
  window.UnrealSelect = Object.assign(api, { init, enhance, close, isBox: (el) => !!(el && el.closest && el.closest('.usel')) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
