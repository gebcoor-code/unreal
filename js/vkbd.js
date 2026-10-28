// On-screen keyboards for touch devices: XT (PC) keyboard, ZX keyboards (Spectrum+ and 48K), joystick.
// Keys are reported as KeyboardEvent.code strings through press(code) / release(code).
(function (root) {
  'use strict';

  // [code, label, width]
  const XT_ROWS = [
    [['Escape', 'Esc', 1.3], ['F1', 'F1'], ['F2', 'F2'], ['F3', 'F3'], ['F4', 'F4'], ['F5', 'F5'], ['F6', 'F6'],
     ['F7', 'F7'], ['F8', 'F8'], ['F9', 'F9'], ['F10', 'F10'], ['F11', 'F11'], ['F12', 'F12']],
    [['Backquote', '`'], ['Digit1', '1'], ['Digit2', '2'], ['Digit3', '3'], ['Digit4', '4'], ['Digit5', '5'], ['Digit6', '6'],
     ['Digit7', '7'], ['Digit8', '8'], ['Digit9', '9'], ['Digit0', '0'], ['Minus', '-'], ['Equal', '='], ['Backspace', '⌫', 1.6]],
    [['Tab', 'Tab', 1.4], ['KeyQ', 'Q'], ['KeyW', 'W'], ['KeyE', 'E'], ['KeyR', 'R'], ['KeyT', 'T'], ['KeyY', 'Y'], ['KeyU', 'U'],
     ['KeyI', 'I'], ['KeyO', 'O'], ['KeyP', 'P'], ['BracketLeft', '['], ['BracketRight', ']'], ['Backslash', '\\', 1.2]],
    [['CapsLock', 'Caps', 1.7], ['KeyA', 'A'], ['KeyS', 'S'], ['KeyD', 'D'], ['KeyF', 'F'], ['KeyG', 'G'], ['KeyH', 'H'], ['KeyJ', 'J'],
     ['KeyK', 'K'], ['KeyL', 'L'], ['Semicolon', ';'], ['Quote', "'"], ['Enter', 'Enter', 1.9]],
    [['ShiftLeft', 'Shift', 2.2], ['KeyZ', 'Z'], ['KeyX', 'X'], ['KeyC', 'C'], ['KeyV', 'V'], ['KeyB', 'B'], ['KeyN', 'N'],
     ['KeyM', 'M'], ['Comma', ','], ['Period', '.'], ['Slash', '/', 1.6], ['ArrowUp', '▲'], ['ShiftRight', 'Shift']],
    [['ControlLeft', 'Ctrl', 1.5], ['AltLeft', 'Alt', 1.3], ['Space', '', 6.2], ['ShiftLeft+Semicolon', ':', 1.3], ['ControlRight', 'Ctrl', 1.5],
     ['ArrowLeft', '◀'], ['ArrowDown', '▼'], ['ArrowRight', '▶']],
  ];
  const MODIFIERS = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight']);

  // Joystick types. Sinclair joysticks press number keys; Kempston uses the joystick port (KJ_* codes).
  const JOY_MAPS = {
    sinclair2: { name: 'Sinclair 2', left: 'Digit6', right: 'Digit7', down: 'Digit8', up: 'Digit9', fire: 'Digit0' },
    sinclair1: { name: 'Sinclair 1', left: 'Digit1', right: 'Digit2', down: 'Digit3', up: 'Digit4', fire: 'Digit5' },
    kempston:  { name: 'Kempston',   left: 'KJ_LEFT', right: 'KJ_RIGHT', down: 'KJ_DOWN', up: 'KJ_UP', fire: 'KJ_FIRE' },
    arrows:    { name: 'Arrow keys', left: 'ArrowLeft', right: 'ArrowRight', down: 'ArrowDown', up: 'ArrowUp', fire: 'Space' },
  };
  // keys for FIRE and the extra buttons (Options / Input / Joystick): KeyboardEvent codes, as the PC keyboard sends them
  const JOY_KEYS = [['Space', 'Space'], ['Enter', 'Enter'], ['Escape', 'Esc'], ['Tab', 'Tab'], ['Backspace', 'Backspace'],
    ['ShiftLeft', 'Shift (CS)'], ['ControlLeft', 'Ctrl'], ['AltLeft', 'Alt'], ['AltRight', 'AltGr'],
    ['ArrowUp', 'Arrow up'], ['ArrowDown', 'Arrow down'], ['ArrowLeft', 'Arrow left'], ['ArrowRight', 'Arrow right'],
    ...'0123456789'.split('').map((d) => ['Digit' + d, d]), ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => ['Key' + c, c])];
  const keyShort = (code) => ({ Space: 'SPC', Enter: 'ENT', Escape: 'ESC', Tab: 'TAB', Backspace: 'BS', ShiftLeft: 'SH', ControlLeft: 'CTL', AltLeft: 'ALT', AltRight: 'AGR',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' })[code] || code.replace(/^(Digit|Key)/, '');


  // cursor arrows of the ZX keyboard: one outlined block arrow (the same on every system, fonts draw ⇦⇧⇨⇩ differently)
  const ZARR = (rot) => `<svg class="zarr" viewBox="0 0 24 24" style="transform:rotate(${rot}deg)"><path d="M12 2.5 21 12h-5.2v8.5H8.2V12H3z"/></svg>`;

  // ZX matrix: index = half-row * 8 + bit
  const ZXI = {};
  ['CS', 'Z', 'X', 'C', 'V', 'A', 'S', 'D', 'F', 'G', 'Q', 'W', 'E', 'R', 'T', '1', '2', '3', '4', '5',
   '0', '9', '8', '7', '6', 'P', 'O', 'I', 'U', 'Y', 'ENT', 'L', 'K', 'J', 'H', 'SPC', 'SS', 'M', 'N', 'B']
    .forEach((n, i) => { ZXI[n] = Math.floor(i / 5) * 8 + (i % 5); });

  // Spectrum+ keyboard. Grid of 67 columns (a regular key = 5).
  // m main, t top (extended, green), s symbol (red), kw keyword, b bottom (extended, red)
  const G = '#2f9e44', C = { BLUE: '#2b5bd7', RED: '#d6302b', MAGENTA: '#b23cc2', GREEN: '#2f9e44', CYAN: '#1c9fb5', YELLOW: '#c9a400', WHITE: '#ffffff', BLACK: '#111' };
  const d = (m, t, s, b) => ({ m, t, tc: C[t], s, b, keys: [m], w: 5 });
  const L = (m, t, s, kw, b) => ({ m, t, s, kw, b, keys: [m], w: 5 });
  const F = (label, keys, w, extra) => Object.assign({ label, keys, w }, extra || {});
  const ZX_ROWS = [
    [F('INV.<br>VIDEO', ['CS', '4'], 5, { short: 'INV' }), F('TRUE<br>VIDEO', ['CS', '3'], 5, { short: 'TRUE' }),
     d('1', 'BLUE', '!', 'DEF FN'), d('2', 'RED', '@', 'FN'), d('3', 'MAGENTA', '#', 'LINE'), d('4', 'GREEN', '$', 'OPEN #'),
     d('5', 'CYAN', '%', 'CLOSE #'), d('6', 'YELLOW', '&', 'MOVE'), d('7', 'WHITE', "'", 'ERASE'), d('8', '', '(', 'POINT'),
     d('9', '', ')', 'CAT'), d('0', 'BLACK', '_', 'FORMAT'), F('BREAK', ['CS', 'SPC'], 7, { cls: 'red', short: 'BRK' })],
    [F('DELETE', ['CS', '0'], 7, { short: 'DEL' }), F('GRAPH', ['CS', '9'], 5, { short: 'GRA' }),
     L('Q', 'SIN', '<=', 'PLOT', 'ASIN'), L('W', 'COS', '<>', 'DRAW', 'ACOS'), L('E', 'TAN', '>=', 'REM', 'ATAN'),
     L('R', 'INT', '<', 'RUN', 'VERIFY'), L('T', 'RND', '>', 'RAND', 'MERGE'), L('Y', 'STR$', 'AND', 'RETURN', '['),
     L('U', 'CHR$', 'OR', 'IF', ']'), L('I', 'CODE', 'AT', 'INPUT', 'IN'), L('O', 'PEEK', ';', 'POKE', 'OUT'),
     L('P', 'TAB', '"', 'PRINT', '©'), F('&#8629;', ['ENT'], 5, { rows: 2, cls: 'enter' })],
    [F('EXTEND<br>MODE', ['CS', 'SS'], 9, { short: 'EXT<br>MODE' }), F('EDIT', ['CS', '1'], 8),
     L('A', 'READ', 'STOP', 'NEW', '~'), L('S', 'RESTORE', 'NOT', 'SAVE', '|'), L('D', 'DATA', 'STEP', 'DIM', '\\'),
     L('F', 'SGN', 'TO', 'FOR', '{'), L('G', 'ABS', 'THEN', 'GOTO', '}'), L('H', 'SQR', '↑', 'GOSUB', 'CIRCLE'),
     L('J', 'VAL', '-', 'LOAD', 'VAL$'), L('K', 'LEN', '+', 'LIST', 'SCREEN$'), L('L', 'USR', '=', 'LET', 'ATTR')],
    [F('CAPS SHIFT', ['CS'], 10, { mod: 'CS', short: 'CAPS<br>SHIFT' }), F('CAPS<br>LOCK', ['CS', '2'], 5, { short: 'CAPS<br>LOCK' }),
     L('Z', 'LN', ':', 'COPY', 'BEEP'), L('X', 'EXP', '£', 'CLEAR', 'INK'), L('C', 'LPRINT', '?', 'CONT', 'PAPER'),
     L('V', 'LLIST', '/', 'CLS', 'FLASH'), L('B', 'BIN', '*', 'BORDER', 'BRIGHT'), L('N', 'INKEY$', ',', 'NEXT', 'OVER'),
     L('M', 'PI', '.', 'PAUSE', 'INVERSE'), F('.', ['SS', 'M'], 4, { cls: 'big' }), F(ZARR(0), ['CS', '7'], 4, { cls: 'big' }),
     F('CAPS SHIFT', ['CS'], 9, { mod: 'CS', short: 'CAPS<br>SHIFT' })],
    // arrows as a cross (like the XT keyboard): ↑ above ↓, the comma right of SPACE under M, the point above ←
    [F('SYMBOL<br>SHIFT', ['SS'], 5, { mod: 'SS', short: 'SYM<br>SHIFT' }), F(';', ['SS', 'O'], 5, { cls: 'big' }), F('"', ['SS', 'P'], 5, { cls: 'big' }),
     F('', ['SPC'], 30), F(',', ['SS', 'N'], 5, { cls: 'big' }),
     F(ZARR(-90), ['CS', '5'], 4, { cls: 'big' }), F(ZARR(180), ['CS', '6'], 4, { cls: 'big' }), F(ZARR(90), ['CS', '8'], 4, { cls: 'big' }),
     F('SYMBOL<br>SHIFT', ['SS'], 5, { mod: 'SS', short: 'SYM<br>SHIFT' })],
  ];

  // ZX Spectrum 48K keyboard: 40 rubber keys, the legends as on the 48K: above the key (green: extended mode; row 1: the colour
  // and the CAPS SHIFT function), on the key (the key, the red SYMBOL SHIFT sign, the white keyword; row 1: the block graphic),
  // under the key (red: extended mode + SYMBOL SHIFT). Grid of 86 columns (a key = 8): 40 keys of one size, CAPS SHIFT, ENTER,
  // SYMBOL SHIFT and BREAK / SPACE too; the rows indented as on the 48K: Q row 1/2 of a key, A row 3/4, CAPS SHIFT row 1/8.
  // u: above, uc: its colour, u2: second line above (row 1), m: key, s: red sign, kw: keyword, g: graphic (bits: 1 top right,
  // 2 top left, 4 bottom right), b: under
  const N = (m, uc, u, u2, s, g, b) => ({ m, u, uc: C[uc] || '', u2, s, g, b, keys: [m], w: 8 });
  const K = (m, u, s, kw, b) => ({ m, u, uc: G, s, kw, b, keys: [m], w: 8 });
  const Z48_ROWS = [
    [N('1', 'BLUE', 'BLUE', 'EDIT', '!', 1, 'DEF FN'), N('2', 'RED', 'RED', 'CAPS LOCK', '@', 2, 'FN'), N('3', 'MAGENTA', 'MAGENTA', 'TRUE VIDEO', '#', 3, 'LINE'),
     N('4', 'GREEN', 'GREEN', 'INV. VIDEO', '$', 4, 'OPEN #'), N('5', 'CYAN', 'CYAN', ZARR(-90), '%', 5, 'CLOSE #'), N('6', 'YELLOW', 'YELLOW', ZARR(180), '&', 6, 'MOVE'),
     N('7', 'WHITE', 'WHITE', ZARR(0), "'", 7, 'ERASE'), N('8', '', '', ZARR(90), '(', 0, 'POINT'), N('9', '', '', 'GRAPHICS', ')', -1, 'CAT'),
     N('0', 'BLACK', 'BLACK', 'DELETE', '_', -1, 'FORMAT'), { gap: 6 }],
    [{ gap: 4 }, K('Q', 'SIN', '<=', 'PLOT', 'ASN'), K('W', 'COS', '<>', 'DRAW', 'ACS'), K('E', 'TAN', '>=', 'REM', 'ATN'), K('R', 'INT', '<', 'RUN', 'VERIFY'),
     K('T', 'RND', '>', 'RAND', 'MERGE'), K('Y', 'STR$', 'AND', 'RETURN', '['), K('U', 'CHR$', 'OR', 'IF', ']'), K('I', 'CODE', 'AT', 'INPUT', 'IN'),
     K('O', 'PEEK', ';', 'POKE', 'OUT'), K('P', 'TAB', '"', 'PRINT', '©'), { gap: 2 }],
    [{ gap: 6 }, K('A', 'READ', 'STOP', 'NEW', '~'), K('S', 'RESTORE', 'NOT', 'SAVE', '|'), K('D', 'DATA', 'STEP', 'DIM', '\\'), K('F', 'SGN', 'TO', 'FOR', '{'),
     K('G', 'ABS', 'THEN', 'GO TO', '}'), K('H', 'SQR', '↑', 'GO SUB', 'CIRCLE'), K('J', 'VAL', '-', 'LOAD', 'VAL$'), K('K', 'LEN', '+', 'LIST', 'SCREEN$'),
     K('L', 'USR', '=', 'LET', 'ATTR'), { fn: 'ENTER', keys: ['ENT'], w: 8 }],
    [{ gap: 1 }, { fn: 'CAPS<br>SHIFT', keys: ['CS'], w: 8, mod: 'CS' }, K('Z', 'LN', ':', 'COPY', 'BEEP'), K('X', 'EXP', '£', 'CLEAR', 'INK'), K('C', 'LPRINT', '?', 'CONT', 'PAPER'),
     K('V', 'LLIST', '/', 'CLS', 'FLASH'), K('B', 'BIN', '*', 'BORDER', 'BRIGHT'), K('N', 'INKEY$', ',', 'NEXT', 'OVER'), K('M', 'PI', '.', 'PAUSE', 'INVERSE'),
     { fn: 'SYMBOL<br>SHIFT', keys: ['SS'], w: 8, mod: 'SS', cls: 'ss' }, { fn: '<small>BREAK</small><br>SPACE', keys: ['SPC'], w: 8 }, { gap: 5 }],
  ];
  // the block graphic of keys 1-8 (GRAPHICS mode): 2x2 squares, white = ink
  const Z48G = (g) => g < 0 ? '' : `<svg class="g" viewBox="0 0 10 10"><rect x=".5" y=".5" width="9" height="9" class="gf"/>${
    [[1, 5, 0], [2, 0, 0], [4, 5, 5], [8, 0, 5]].filter(([b]) => g & b).map(([, x, y]) => `<rect x="${x + .5}" y="${y + .5}" width="4.5" height="4.5"/>`).join('')}</svg>`;

  const MIN_HOLD = 60; // ms: ZX keyboard matrix is sampled once per frame

  function create(container, opts) {
    const press = opts.press, release = opts.release;
    const downAt = new Map();
    const down = (code) => { if (downAt.has(code)) return; downAt.set(code, performance.now()); press(code); if (navigator.vibrate) navigator.vibrate(8); };
    const up = (code) => {
      if (!downAt.has(code)) return;
      const left = MIN_HOLD - (performance.now() - downAt.get(code));
      downAt.delete(code);
      if (left > 0) setTimeout(() => release(code), left); else release(code);
    };

    container.innerHTML = '';
    container.classList.add('vkbd');
    const pages = {};

    // ---------------------------------------------------------------- modifiers (sticky or held)
    // 0 = held only while pressed, 1 = latched for the next key, 2 = latched until tapped again
    let sticky = opts.sticky === false ? 0 : opts.sticky === true || opts.sticky === undefined ? 1 : +opts.sticky;
    const latched = new Map();   // group -> codes pressed by the latched modifier
    const modEls = new Map();    // group -> [elements]
    const refreshMods = () => { for (const [g, els] of modEls) els.forEach((el) => el.classList.toggle('latched', latched.has(g))); };
    function unlatchAll() { for (const codes of latched.values()) codes.forEach(up); latched.clear(); refreshMods(); }
    // codes: list of key codes pressed together; group: modifier group (null for ordinary keys)
    function bindKey(el, codes, group) {
      el._bind = [codes, group]; // the split keyboard binds a copy of a long key (SPACE) the same way
      if (group) { if (!modEls.has(group)) modEls.set(group, []); modEls.get(group).push(el); }
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); el.setPointerCapture(e.pointerId);
        if (group && sticky) {
          if (latched.has(group)) { latched.get(group).forEach(up); latched.delete(group); }
          else { codes.forEach(down); latched.set(group, codes); }
          refreshMods(); return;
        }
        el.classList.add('down'); codes.forEach(down);
      });
      const end = () => {
        if (!el.classList.contains('down')) return;
        el.classList.remove('down'); codes.slice().reverse().forEach(up);
        if (!group && latched.size && sticky === 1) unlatchAll();
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }

    // ---------------------------------------------------------------- XT keyboard
    const xt = document.createElement('div'); xt.className = 'vk-page vk-xt';
    for (const row of XT_ROWS) {
      // grid in 0.1-key units: rows with equal totals line up exactly (arrow up above arrow down)
      const r = document.createElement('div'); r.className = 'vk-row';
      const units = row.reduce((t, k) => t + Math.round((k[2] || 1) * 10), 0);
      r.style.gridTemplateColumns = `repeat(${units}, 1fr)`; r.dataset.u = units;
      let col = 1;
      for (const [code, label, w] of row) {
        const k = document.createElement('div'); k.className = 'vk-key'; k.textContent = label; k.dataset.code = code;
        k.style.gridColumn = 'span ' + Math.round((w || 1) * 10); k.dataset.c = col; k.dataset.s = Math.round((w || 1) * 10); col += Math.round((w || 1) * 10);
        if (code.length > 1 && !/^(Key|Digit)/.test(code) && label.length > 1) k.classList.add('small');
        bindKey(k, code.split('+'), MODIFIERS.has(code) ? code : null); // 'ShiftLeft+Semicolon': a key pressed with Shift (':' for CP/M drives)
        r.appendChild(k);
      }
      xt.appendChild(r);
    }
    pages.xt = xt;

    // ---------------------------------------------------------------- ZX keyboard (Spectrum+ layout)
    const zx = document.createElement('div'); zx.className = 'vk-page vk-zx';
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let row = 0;
    for (const line of ZX_ROWS) {
      row++; let col = 1;
      for (const k of line) {
        const el = document.createElement('div');
        el.className = 'zk' + (k.cls ? ' ' + k.cls : '');
        el.style.gridRow = k.rows ? row + ' / span ' + k.rows : String(row);
        el.style.gridColumn = 'span ' + k.w; el.dataset.c = col; el.dataset.s = k.w; col += k.w;
        if (k.m !== undefined) {
          const tl = (k.t || '').length > 6 ? ' long' : '', sl = (k.s || '').length > 2 ? ' long' : (k.s || '').length === 2 ? ' two' : '';
          el.innerHTML = `<span class="t${tl}${k.t === 'WHITE' ? ' white' : ''}" style="${k.tc ? 'color:' + k.tc : ''}">${esc(k.t || '')}</span>` +
            `<span class="m">${esc(k.m)}</span><span class="s${sl}">${esc(k.s || '')}</span>` +
            `<span class="w">${esc(k.kw || '')}</span><span class="b">${esc(k.b || '')}</span>`;
        } else {
          el.classList.add('fn');
          el.innerHTML = k.short ? `<span class="lg">${k.label}</span><span class="sh">${k.short}</span>` : `<span>${k.label}</span>`;
        }
        bindKey(el, k.keys.map((n) => 'ZX:' + ZXI[n]), k.mod || null);
        zx.appendChild(el);
      }
    }
    pages.zx = zx;

    // ---------------------------------------------------------------- ZX Spectrum 48K keyboard
    const z48 = document.createElement('div'); z48.className = 'vk-page vk-z48';
    row = 0;
    for (const line of Z48_ROWS) {
      row++; let col = 1;
      for (const k of line) {
        const el = document.createElement('div');
        el.style.gridRow = String(row); el.style.gridColumn = 'span ' + (k.gap || k.w);
        if (k.gap) { z48.appendChild(el); col += k.gap; continue; }
        el.dataset.c = col; el.dataset.s = k.w; col += k.w;
        el.className = 'zq' + (k.cls ? ' ' + k.cls : '') + (k.fn ? ' fn' : '') + (k.g !== undefined ? ' num' : ''); el.dataset.k = k.m || k.keys.join('+');
        if (k.fn) el.innerHTML = `<span class="up"></span><span class="cap"><span class="fl">${k.fn}</span></span><span class="dn"></span>`;
        else {
          const up = k.u2 !== undefined ? `<span class="c${k.u === 'BLACK' ? ' blk' : ''}" style="color:${k.uc}">${esc(k.u || '')}</span><span class="f">${k.u2.startsWith('<svg') ? k.u2 : esc(k.u2)}</span>` : esc(k.u);
          el.innerHTML = `<span class="up${k.u2 !== undefined ? ' two' : ''}" style="${k.u2 === undefined ? 'color:' + k.uc : ''}">${up}</span>` +
            `<span class="cap"><span class="m">${esc(k.m)}</span>${k.g !== undefined ? Z48G(k.g) : ''}<span class="s${(k.s || '').length > 2 ? ' long' : ''}">${esc(k.s || '')}</span>` +
            `<span class="w">${esc(k.kw || '')}</span></span><span class="dn">${esc(k.b || '')}</span>`;
        }
        bindKey(el, k.keys.map((n) => 'ZX:' + ZXI[n]), k.mod || null);
        z48.appendChild(el);
      }
    }
    // the corner: 4 stripes in the colours of this page (the accent), not the machine's; under the keys, taking no room. Placed
    // from the keys as on the 48K: the slope of the line through the bottom right corners of ENTER and of BREAK SPACE (the
    // centre of the 2nd stripe goes by them); the upper edge of the 1st one comes to the right edge at the level of the top of
    // P, and from that point the stripes follow one another down the right edge, so that the 4th one leaves a small triangle
    // of background in the very corner (that gives their width and place); the 3rd and 4th are out of the keys
    const zs = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); zs.setAttribute('class', 'z48s'); zs.setAttribute('aria-hidden', 'true');
    zs.innerHTML = [0, 1, 2, 3].map((i) => `<path class="z${i}"/>`).join('');
    z48.appendChild(zs);
    function stripes() {
      const box = z48.getBoundingClientRect(); if (!box.width) return;
      const cap = (k) => { const e = z48.querySelector(`.zq[data-k="${k}"] .cap`); return e && e.getBoundingClientRect(); };
      const p = cap('P'), en = cap('ENT'), sp = cap('SPC'); if (!p || !en || !sp) return;
      const ax = en.right - box.left, ay = en.bottom - box.top, bx = sp.right - box.left, by = sp.bottom - box.top;
      const k = (bx - ax) / (by - ay), c = (y) => ax + (y - ay) * k, W = box.width, H = box.height;
      const yp = p.top - box.top, corner = 0.55 * en.width; // the triangle left in the corner: its bottom side
      const w = Math.max(0.22 * en.width, Math.min(0.6 * en.width, (c(yp) - c(H) - corner) / 4));
      const o = W + 1.5 * w - c(yp); // the 1st: its upper edge meets the right edge at the top of P
      zs.setAttribute('viewBox', `0 0 ${W} ${H}`);
      zs.querySelectorAll('path').forEach((path, i) => {
        const l = o + (i - 1) * w - w / 2, r = l + w;
        path.setAttribute('d', `M${c(0) + l} 0L${c(0) + r} 0L${c(H) + r} ${H}L${c(H) + l} ${H}Z`);
      });
    }
    if (window.ResizeObserver) new ResizeObserver(stripes).observe(z48);
    pages.zx48 = z48;

    // ---------------------------------------------------------------- joystick
    const joy = document.createElement('div'); joy.className = 'vk-page vk-joy';
    let map = JOY_MAPS[opts.joy] || JOY_MAPS.sinclair2;
    const pad = document.createElement('div'); pad.className = 'vk-pad';
    pad.innerHTML = `<svg viewBox="-100 -100 200 200">
      <defs><radialGradient id="vkKnobG" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#6a6f7a"/><stop offset=".55" stop-color="#3a3e46"/><stop offset="1" stop-color="#1c1e23"/></radialGradient>
      </defs>
      <circle r="96" class="ring"/><circle r="62" class="well"/>
      ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path class="arr${a % 90 ? ' diag' : ''}" data-a="${a}" transform="rotate(${a})" d="${a % 90 ? 'M 88 0 L 78 -6 L 78 6 Z' : 'M 90 0 L 72 -11 L 72 11 Z'}"/>`).join('')}
      <g class="knob"><circle r="36" cy="5" class="ks"/><circle r="34" class="kb" fill="url(#vkKnobG)"/><circle r="22" class="kt"/></g></svg>`;
    const knob = pad.querySelector('.knob');
    const fire = document.createElement('div'); fire.className = 'vk-fire';
    const label = document.createElement('select'); label.className = 'vk-joytype'; label.title = 'Joystick type';
    for (const [id, m] of Object.entries(JOY_MAPS)) { const o = document.createElement('option'); o.value = id; o.textContent = m.name; label.appendChild(o); }
    label.value = Object.keys(JOY_MAPS).find((k) => JOY_MAPS[k] === map);
    label.addEventListener('pointerdown', (e) => e.stopPropagation());
    label.onchange = () => { releaseAll(); map = JOY_MAPS[label.value]; if (opts.onJoy) opts.onJoy(label.value); label.blur(); };
    const jopt = opts.joyOpts || {};
    // FIRE key per joystick type (Kempston: its port bit, fixed) and up to 3 extra buttons: { fire: {type: code}, extra: [{on, key}] }
    let jkeys = opts.joyKeys || {};
    const fireCode = () => (map === JOY_MAPS.kempston ? map.fire : (jkeys.fire && jkeys.fire[label.value]) || map.fire);
    let curFire = null; // the key FIRE holds now
    const xwrap = document.createElement('div'); xwrap.className = 'vk-fires';
    const xcol = document.createElement('div'); xcol.className = 'vk-xbtns';
    xwrap.append(xcol, fire);
    function buildExtra() {
      xcol.textContent = '';
      const list = (jkeys.extra || []).filter((x) => x && x.on && x.key);
      for (const x of list) {
        const b = document.createElement('div'); b.className = 'vk-xbtn'; b.textContent = keyShort(x.key); b.title = 'Button: ' + x.key;
        let held = null;
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); buzz(10); held = x.key; b.classList.add('down'); down(held); });
        const end = () => { if (held) { up(held); held = null; b.classList.remove('down'); } };
        b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
        b.addEventListener('contextmenu', (e) => e.preventDefault());
        xcol.appendChild(b);
      }
      xwrap.classList.toggle('x', list.length > 0);
      joy.classList.toggle('xb', list.length > 0);
    }
    const SIZES = [1, 0.75, 0.5], SIZE_TXT = { 1: '1x', 0.75: '¾x', 0.5: '½x' };
    let way8 = jopt.way8 !== false, auto = !!jopt.auto, swap = !!jopt.swap, overlay = !!jopt.overlay;
    let size = SIZES.includes(jopt.size) ? jopt.size : 1;
    const saveOpts = () => { if (opts.onJoyOpts) opts.onJoyOpts({ way8, auto, swap, overlay, size, opac: OPAC[opac][0] }); };
    // a toggle with a long and a short label (the short one on narrow screens and over the screen)
    const lab = (b, long, short) => { b.innerHTML = `<span class="l">${long}</span><span class="s">${short}</span>`; };
    const tog = (txt, title, on, fn, short) => {
      const b = document.createElement('button'); b.className = 'vk-tog' + (on ? ' on' : ''); lab(b, txt, short || txt); b.title = title;
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.onclick = () => { b.classList.toggle('on', fn()); b.blur(); saveOpts(); };
      return b;
    };
    const bWay = tog(way8 ? '8-WAY' : '4-WAY', '8 directions (with diagonals) or 4 directions', false, () => { way8 = !way8; lab(bWay, way8 ? '8-WAY' : '4-WAY', way8 ? '8W' : '4W'); pad.classList.toggle('w4', !way8); return false; }, way8 ? '8W' : '4W');
    const bAuto = tog('AUTOFIRE', 'Autofire: a tap on FIRE starts shooting, the next tap stops it', auto, () => { auto = !auto; stopFire(); return auto; }, 'AF');
    const bSwap = tog('SWAP', 'Fire on the left, stick on the right', swap, () => { swap = !swap; layout(); return swap; }, 'SWP');
    const bSize = tog('SIZE ' + SIZE_TXT[size], 'Stick and fire size', false, () => { size = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length]; lab(bSize, 'SIZE ' + SIZE_TXT[size], SIZE_TXT[size]); layout(); return false; }, SIZE_TXT[size]);
    const bOver = tog('OVERLAY', 'Stick and fire over the screen', overlay, () => { overlay = !overlay; layout(); return overlay; }, 'OVL');
    // OPACITY: how much the stick and fire over the screen show (HI = the most transparent)
    const OPAC = [['HI', 0.45], ['MID', 0.62], ['LOW', 0.8]];
    let opac = Math.max(0, OPAC.findIndex((o) => o[0] === jopt.opac));
    const bOpac = tog('OPACITY ' + OPAC[opac][0], 'Transparency of the stick and fire over the screen: HI, MID, LOW', false, () => {
      opac = (opac + 1) % OPAC.length; lab(bOpac, 'OPACITY ' + OPAC[opac][0], 'OP·' + OPAC[opac][0]); layout(); return false; }, 'OP·' + OPAC[opac][0]);
    const bSet = tog('⚙ BUTTONS', 'Joystick settings: FIRE key, extra buttons (Options / Input / Joystick)', false, () => { if (opts.onJoySettings) opts.onJoySettings(); return false; }, '⚙');
    pad.classList.toggle('w4', !way8);
    const mid = document.createElement('div'); mid.className = 'vk-joymid';
    const togs = document.createElement('div'); togs.className = 'vk-togs';
    togs.append(bWay, bAuto, bSwap, bSize, bOver, bOpac);
    mid.append(label, togs, bSet);
    // gamepad body: two round grips joined by a bridge (CSS), stick in one grip, fire in the other
    const gripL = document.createElement('div'); gripL.className = 'vk-grip l';
    const gripR = document.createElement('div'); gripR.className = 'vk-grip r';
    const body = document.createElement('div'); body.className = 'vk-body';
    joy.append(body, gripL, mid, gripR);
    pages.joy = joy;
    // overlay: stick and fire are moved over the screen (opts.overlayHost); the panel keeps the settings
    const ovl = document.createElement('div'); ovl.className = 'vk-ovl'; ovl.hidden = true;
    // OVL / AF over the screen: in a fixed slot of the page's bottom bar (opts.ovBarHost), else at the bottom centre
    const ovBar = opts.ovBarHost || document.createElement('div'); if (!opts.ovBarHost) ovBar.className = 'vk-ovbar';
    if (opts.overlayHost) opts.overlayHost.appendChild(ovl);
    let shown = true, land = false; // land: a phone in landscape: the stick and fire are always over the screen
    function layout() {
      const ov = (overlay || land) && !!opts.overlayHost;
      if (ov) { ovBar.append(bOver, bAuto); ovl.append(pad, xwrap); if (!opts.ovBarHost) ovl.append(ovBar); }
      else { gripL.appendChild(pad); gripR.appendChild(xwrap); togs.append(bWay, bAuto, bSwap, bSize, bOver, bOpac); }
      joy.classList.toggle('ov', ov);
      joy.classList.toggle('swap', swap); ovl.classList.toggle('swap', swap);
      if (opts.ovBarHost && opts.ovBarHost.parentElement) opts.ovBarHost.parentElement.classList.toggle('swap', swap);
      joy.style.setProperty('--js', size); ovl.style.setProperty('--js', size); ovl.style.setProperty('--jo', OPAC[opac][1]);
      ovlShow();
      if (opts.onLayout) opts.onLayout();
    }
    // overlay on the JOY tab: the panel itself is not shown, only the screen with the stick
    function ovlShow() {
      const on = (overlay || land) && !!opts.overlayHost && shown && current === 'joy';
      ovl.hidden = !on;
      ovBar.classList.toggle('on', on);
      container.classList.toggle('vk-none', on);
    }
    const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } };
    let dirs = new Set(); let padPointer = null;
    const arrows = Array.from(pad.querySelectorAll('.arr'));
    function setDirs(next) {
      let changed = false;
      for (const d of dirs) if (!next.has(d)) { up(map[d]); changed = true; }
      for (const d of next) if (!dirs.has(d)) { down(map[d]); changed = true; }
      if (changed && next.size) buzz(8);
      dirs = next;
      // highlight: angle of the active direction
      let act = -1;
      if (next.size) {
        const x = (next.has('right') ? 1 : 0) - (next.has('left') ? 1 : 0), y = (next.has('down') ? 1 : 0) - (next.has('up') ? 1 : 0);
        act = (Math.round(Math.atan2(y, x) * 180 / Math.PI / 45) * 45 + 360) % 360;
      }
      arrows.forEach((a) => a.classList.toggle('on', +a.dataset.a === act));
    }
    function setKnob(x, y, anim) {
      knob.style.transition = anim ? 'transform .14s cubic-bezier(.3,1.6,.5,1)' : 'none';
      knob.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
    function padMove(e) {
      const r = pad.getBoundingClientRect();
      const k = 200 / r.width; // screen px -> svg units
      let dx = (e.clientX - (r.left + r.width / 2)) * k, dy = (e.clientY - (r.top + r.height / 2)) * k;
      const dist = Math.hypot(dx, dy), max = 58;
      const next = new Set();
      if (dist > 20) { // dead zone
        let ang = Math.atan2(dy, dx);
        if (way8) {
          const sector = (Math.round(ang / (Math.PI / 4)) + 8) % 8; // 0 = right, 2 = down
          if ([7, 0, 1].includes(sector)) next.add('right');
          if ([3, 4, 5].includes(sector)) next.add('left');
          if ([1, 2, 3].includes(sector)) next.add('down');
          if ([5, 6, 7].includes(sector)) next.add('up');
        } else {
          const sector = (Math.round(ang / (Math.PI / 2)) + 4) % 4;
          next.add(['right', 'down', 'left', 'up'][sector]);
          ang = sector * Math.PI / 2; // knob snaps to the axis
          const m = Math.min(dist, max); dx = Math.cos(ang) * m; dy = Math.sin(ang) * m;
        }
      }
      const m = Math.min(dist, max) / (dist || 1);
      setKnob(dx * m, dy * m, false);
      setDirs(next);
    }
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); padPointer = e.pointerId; pad.setPointerCapture(e.pointerId); pad.classList.add('held'); padMove(e); });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === padPointer) padMove(e); });
    const padEnd = (e) => { if (e.pointerId === padPointer) { padPointer = null; pad.classList.remove('held'); setKnob(0, 0, true); setDirs(new Set()); } };
    pad.addEventListener('pointerup', padEnd);
    pad.addEventListener('pointercancel', padEnd);
    // fire; AUTOFIRE: a tap starts shooting (~8 presses per second), the next tap stops it
    let fireHeld = false, autoT = null, autoOn = false;
    const startAuto = () => { curFire = fireCode(); autoOn = true; down(curFire); fire.classList.add('down'); // the button stays down, the key repeats
      autoT = setInterval(() => { autoOn = !autoOn; autoOn ? down(curFire) : up(curFire); }, 60); };
    function stopFire() {
      if (autoT) { clearInterval(autoT); autoT = null; if (autoOn) up(curFire); autoOn = false; }
      else if (fireHeld) up(curFire);
      fireHeld = false; fire.classList.remove('down');
    }
    fire.addEventListener('pointerdown', (e) => {
      e.preventDefault(); fire.setPointerCapture(e.pointerId); buzz(12);
      if (auto) { if (autoT) stopFire(); else startAuto(); return; }
      fire.classList.add('down'); fireHeld = true; curFire = fireCode(); down(curFire);
    });
    const fireEnd = () => { if (!auto && fireHeld) stopFire(); };
    fire.addEventListener('pointerup', fireEnd);
    fire.addEventListener('pointercancel', fireEnd);
    fire.addEventListener('contextmenu', (e) => e.preventDefault());
    pad.addEventListener('contextmenu', (e) => e.preventDefault());

    for (const p of Object.values(pages)) container.appendChild(p);

    // ---------------------------------------------------------------- split (a phone in landscape): the left half of a keyboard at
    // the left edge, the right half at the right edge. Two frames as wide as the whole keyboard (its sizes: the same), each with
    // the keys of its half where they are in the whole one; a key goes to the side its centre is on. The keys are moved, not
    // copied (their handlers stay); back in place when the split ends
    const SPLIT = { xt: 0, zx: 67, zx48: 86 }, splitW = {};
    let split = false;
    function splitBuild(id) {
      const page = pages[id], w = document.createElement('div'); w.className = 'vk-splitw'; w.style.display = 'none';
      const L = page.cloneNode(false), R = page.cloneNode(false); L.classList.add('vk-half', 'l'); R.classList.add('vk-half', 'r'); L.style.display = R.style.display = '';
      w.append(L, R); container.appendChild(w);
      const homes = new Map(), moves = [], twins = [];
      // a key over the middle (SPACE): its part on each side, the right one a copy that presses the same keys
      const place = (k, total, l, r) => {
        const c = +k.dataset.c, n = +k.dataset.s, mid = Math.round(total / 2);
        if (n >= total / 5 && c - 1 < mid - 2 && c - 1 + n > mid + 2 && k._bind) { // a long key only (SPACE); the others go by their centre
          const t = k.cloneNode(true); t.classList.remove('down', 'latched'); bindKey(t, ...k._bind);
          t.style.gridColumn = (mid + 1) + ' / ' + (c + n); r.appendChild(t); twins.push(t);
          moves.push([k, l, c + ' / ' + (mid + 1)]);
        } else moves.push([k, (c - 1 + n / 2) < total / 2 ? l : r, c + ' / span ' + n]);
      };
      if (id === 'xt') for (const row of [...page.children]) {
        const rl = row.cloneNode(false), rr = row.cloneNode(false); L.appendChild(rl); R.appendChild(rr); homes.set(row, [...row.children]);
        for (const k of [...row.children]) place(k, +row.dataset.u, rl, rr);
      } else {
        homes.set(page, [...page.children]);
        for (const k of [...page.children]) if (k.dataset.c) place(k, SPLIT[id], L, R);
      }
      splitW[id] = { w, homes, moves, twins };
    }
    function setSplit(v) {
      v = !!v; if (v === split) return; releaseAll(); split = v;
      for (const id of Object.keys(SPLIT)) {
        if (v && !splitW[id]) splitBuild(id);
        const S = splitW[id]; if (!S) continue;
        if (v) for (const [k, to, gc] of S.moves) { k.style.gridColumn = gc; to.appendChild(k); }
        else { for (const [k] of S.moves) k.style.gridColumn = 'span ' + k.dataset.s; for (const [home, kids] of S.homes) home.replaceChildren(...kids); }
      }
      if (current) show(current);
    }
    container.addEventListener('contextmenu', (e) => e.preventDefault());

    let current = null;
    function show(id) {
      releaseAll();
      current = id;
      for (const [k, p] of Object.entries(pages)) p.style.display = k === id && !(split && splitW[k]) ? '' : 'none';
      for (const [k, S] of Object.entries(splitW)) S.w.style.display = split && k === id ? '' : 'none';
      ovlShow();
      if (opts.onTab) opts.onTab(id);
      if (opts.onLayout) opts.onLayout();
    }
    function releaseAll() {
      for (const code of Array.from(downAt.keys())) up(code);
      stopFire();
      latched.clear(); refreshMods(); dirs = new Set(); arrows.forEach((a) => a.classList.remove('on')); setKnob(0, 0, false);
      container.querySelectorAll('.down').forEach((k) => k.classList.remove('down'));
    }
    show(opts.tab && pages[opts.tab] ? opts.tab : 'xt');
    buildExtra();
    layout();
    // the panel was hidden / shown: the overlay goes with it
    function visible(v) { shown = !!v; if (!v) releaseAll(); ovlShow(); }
    return { show, releaseAll, visible, setSticky(v) { sticky = v === true ? 1 : +v || 0; unlatchAll(); }, get tab() { return current; },
      // Options / Input / Joystick: the type, the FIRE keys and the extra buttons
      get joy() { return label.value; },
      setJoy(id) { if (!JOY_MAPS[id] || label.value === id) return; releaseAll(); label.value = id; map = JOY_MAPS[id]; if (opts.onJoy) opts.onJoy(id); },
      setJoyKeys(k) { releaseAll(); jkeys = k || {}; buildExtra(); layout(); },
      setLand(v) { setSplit(v); if (land === !!v) return; land = !!v; layout(); },
      get split() { return split; }, half() { const S = splitW[current]; return split && S ? S.w.firstChild : null; } };
  }

  root.UnrealVKbd = { create, JOY_MAPS, JOY_KEYS };
})(window);
