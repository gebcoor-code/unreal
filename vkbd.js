// On-screen keyboards (from the Unreal Speccy web port): the BK-0010-01 keyboard, XT (PC) keyboard, joystick.
// Keys are reported through press(code) / release(code): 'BK:<n>' (web_bk_key), KeyboardEvent.code strings (XT),
// 'J:<code>' (joystick).
(function (root) {
  'use strict';

  // [code, label, width]. Codes are KeyboardEvent.code strings: the keys go the same way as the PC keyboard's
  // (BK keys: Help). F keys are no BK keys: they go to the page (File Commander, Debugger), as from the PC keyboard.
  const XT_ROWS = [
    [['Escape', 'Esc', 1.3], ['F1', 'F1'], ['F2', 'F2'], ['F3', 'F3'], ['F4', 'F4'], ['F5', 'F5'], ['F6', 'F6'], ['F7', 'F7'],
     ['F8', 'F8'], ['F9', 'F9'], ['F10', 'F10'], ['F11', 'F11'], ['F12', 'F12']],
    [['Insert', 'Ins'], ['Delete', 'Del'], ['Home', 'Home'], ['End', 'End'], ['PageUp', 'PgUp'], ['PageDown', 'PgDn'],
     ['Numpad7', 'Num7'], ['Numpad4', 'Num4'], ['Numpad5', 'Num5'], ['Numpad6', 'Num6'], ['Numpad1', 'Num1'], ['Numpad2', 'Num2'],
     ['Numpad3', 'Num3'], ['Pause', 'Pause', 1.2]],
    [['Backquote', '`'], ['Digit1', '1'], ['Digit2', '2'], ['Digit3', '3'], ['Digit4', '4'], ['Digit5', '5'], ['Digit6', '6'],
     ['Digit7', '7'], ['Digit8', '8'], ['Digit9', '9'], ['Digit0', '0'], ['Minus', '-'], ['Equal', '='], ['Backspace', '⌫', 1.6]],
    [['Tab', 'Tab', 1.4], ['KeyQ', 'Q'], ['KeyW', 'W'], ['KeyE', 'E'], ['KeyR', 'R'], ['KeyT', 'T'], ['KeyY', 'Y'], ['KeyU', 'U'],
     ['KeyI', 'I'], ['KeyO', 'O'], ['KeyP', 'P'], ['BracketLeft', '['], ['BracketRight', ']'], ['Backslash', '\\', 1.2]],
    [['CapsLock', 'Caps', 1.7], ['KeyA', 'A'], ['KeyS', 'S'], ['KeyD', 'D'], ['KeyF', 'F'], ['KeyG', 'G'], ['KeyH', 'H'], ['KeyJ', 'J'],
     ['KeyK', 'K'], ['KeyL', 'L'], ['Semicolon', ';'], ['Quote', "'"], ['Enter', 'Enter', 1.9]],
    [['ShiftLeft', 'Shift', 2.2], ['KeyZ', 'Z'], ['KeyX', 'X'], ['KeyC', 'C'], ['KeyV', 'V'], ['KeyB', 'B'], ['KeyN', 'N'],
     ['KeyM', 'M'], ['Comma', ','], ['Period', '.'], ['Slash', '/', 1.6], ['ArrowUp', '▲'], ['ShiftRight', 'Shift']],
    [['ControlLeft', 'Ctrl', 1.6], ['Space', '', 8.6], ['ControlRight', 'Ctrl', 1.6], ['ArrowLeft', '◀'], ['ArrowDown', '▼'], ['ArrowRight', '▶']],
  ];
  const MODIFIERS = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight']);

  // Joystick: KEYS — the cursor keys, fire = space (held as the keys are held: every program sees them, one at a time);
  // PORT — the joystick of port 177714 ('JP:<bit>'): directions and fire at the same time, for programs with joystick support
  const JOY_KEYS = { left: 'ArrowLeft', right: 'ArrowRight', down: 'ArrowDown', up: 'ArrowUp', fire: 'Space' };
  const JOY_PORT = { up: 'JP:1', right: 'JP:2', down: 'JP:4', left: 'JP:8', fire: 'JP:32' };

  // ---------------------------------------------------------------- BK-0010-01 keyboard
  // Outlined arrows as on the BK caps. Wide arrows: viewBox 40 x 20.
  const SV = (vb, d, cls) => `<svg class="bka${cls ? ' ' + cls : ''}" viewBox="${vb}"><path d="${d}"/></svg>`;
  const ARR_R = 'M2 7.5h23V3l13 7-13 7v-4.5H2z', ARR_L = 'M38 7.5H15V3L2 10l13 7v-4.5h23z';
  const BKI = {
    rgtdel: SV('0 0 40 20', ARR_R + 'M11 3v14M38.5 2v16'),        // =|=>|  delete to the right
    sdvig: SV('0 0 40 20', 'M2 2v16M39 7.5H17V3L5 10l12 7v-4.5h22z'), // |<==   close up
    razdvig: SV('0 0 40 20', ARR_R),                               // ==>    open up
    zab: SV('0 0 40 20', ARR_L),                                   // <==    ЗАБ (backspace)
    enter: SV('0 0 40 20', 'M36 2v11H13v4L3 11l10-6v4h19V2z'),     // ВВОД
    nr: SV('0 0 24 24', 'M12 22 3 11.5h5.2V2h7.6v9.5H21z', 'tall'), // НР (lower register)
    up: SV('0 0 24 24', 'M12 2.5 21 12h-5.2v8.5H8.2V12H3z'),
    down: SV('0 0 24 24', 'M12 21.5 21 12h-5.2V3.5H8.2V12H3z'),
    left: SV('0 0 24 24', 'M2.5 12 12 3v5.2h8.5v7.6H12V21z'),
    right: SV('0 0 24 24', 'M21.5 12 12 3v5.2H3.5v7.6H12V21z'),
  };
  // Geometry as on a BK-0010-01 (in px of a photo of it): the field is 1600 x 632, rows are 97.5 apart, keys 82 high.
  // [x, width, code, top label, bottom label, options]; code: the BK code in ЛАТ (the symbol on the cap without НР),
  // 0x100 = the key interrupts at 274; negative: modifiers / switches (web_bk_key)
  const I274 = 0x100, X0 = 388 - 30;
  const L = (rus, lat, code) => ({ t: rus, b: lat, code });
  const BK_ROWS = [
    // ПОВТ КТ =|=>| |<== ==> ИНД СУ БЛОК РЕД ШАГ СБР СТОП
    [[388, 140, 1 | I274, 'ПОВТ'], [536, 140, 3, 'КТ'], [684, 140, 0o13 | I274, BKI.rgtdel, '', { title: 'delete to the right' }],
     [832, 140, 0o26, BKI.sdvig, '', { title: 'close up' }], [980, 140, 0o27, BKI.razdvig, '', { title: 'open up' }],
     [1128, 140, 2 | I274, 'ИНД<br>СУ'], [1276, 140, 4 | I274, 'БЛОК<br>РЕД'], [1424, 140, 0 | I274, 'ШАГ'], [1572, 140, 0o14, 'СБР'],
     [1724, 204, -6, 'СТОП', '', { cls: 'stop' }]],
    [[388, 86, -1, BKI.nr, '', { mod: 'nr', title: 'НР: the lower symbols' }]].concat(
      [[';', '+', 0o73], ['1', '!', 0o61], ['2', '"', 0o62], ['3', '#', 0o63], ['4', '¤', 0o64], ['5', '%', 0o65], ['6', '&amp;', 0o66],
       ['7', "'", 0o67], ['8', '(', 0o70], ['9', ')', 0o71], ['0', '{', 0o60], ['−', '=', 0o55], ['/', '?', 0o57]]
        .map((k, i) => [484 + i * 99.5, 90, k[2], k[0], k[1]]),
      [[1785, 143, 0o30, BKI.zab, '', { title: 'ЗАБ (backspace)' }]]),
    [[388, 137, 0o11 | I274, 'ТАБ']].concat(
      [['Й', 'J', 0o112], ['Ц', 'C', 0o103], ['У', 'U', 0o125], ['К', 'K', 0o113], ['Е', 'E', 0o105], ['Н', 'N', 0o116], ['Г', 'G', 0o107],
       ['Ш', '[', 0o133], ['Щ', ']', 0o135], ['З', 'Z', 0o132], ['Х', 'H', 0o110], [':', '*', 0o72], ['Ъ', '}', 0o137 | 0x200]]
        .map((k, i) => [535 + i * 99.5, 90, k[2], k[0], k[1]]),
      [[1838, 90, 0o23, 'ВС']]),
    [[415, 135, -3, 'СУ', '', { mod: 'su' }]].concat(
      [['Ф', 'F', 0o106], ['Ы', 'Y', 0o131], ['В', 'W', 0o127], ['А', 'A', 0o101], ['П', 'P', 0o120], ['Р', 'R', 0o122], ['О', 'O', 0o117],
       ['Л', 'L', 0o114], ['Д', 'D', 0o104], ['Ж', 'V', 0o126], ['Э', '\\', 0o134], ['.', '&gt;', 0o56]]
        .map((k, i) => [560 + i * 99.5, 90, k[2], k[0], k[1]]),
      [[1760, 142, 0o12, BKI.enter, '', { title: 'ВВОД' }]]),
    [[410, 90, -4, 'ЗАГЛ', '', { cls: 'small', ind: 'zagl' }], [510, 90, -5, 'СТР', '', { ind: 'str' }]].concat(
      [['Я', 'Q', 0o121], ['Ч', '¬', 0o136], ['С', 'S', 0o123], ['М', 'M', 0o115], ['И', 'I', 0o111], ['Т', 'T', 0o124], ['Ь', 'X', 0o130],
       ['Б', 'B', 0o102], ['Ю', '@', 0o100], [',', '&lt;', 0o54]]
        .map((k, i) => [610 + i * 99.5, 90, k[2], k[0], k[1]]),
      [[1620, 86, 0o10, BKI.left, '', { rows: 2 }], [1712, 88, 0o32, BKI.up], [1812, 90, 0o31, BKI.right, '', { rows: 2 }]]),
    [[410, 140, 0o16, 'РУС', '', { ind: 'rus' }], [560, 90, -2, 'АР2', '', { mod: 'ar2' }], [660, 782, 0o40, '', '', { cls: 'space' }],
     [1455, 143, 0o17, 'ЛАТ', '', { ind: 'lat' }], [1712, 88, 0o33, BKI.down]],
  ];

  const MIN_HOLD = 60; // ms: a short tap is held long enough for the BK program to see it

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
      r.style.gridTemplateColumns = `repeat(${units}, 1fr)`;
      for (const [code, label, w] of row) {
        const k = document.createElement('div'); k.className = 'vk-key'; k.textContent = label; k.dataset.code = code;
        k.style.gridColumn = 'span ' + Math.round((w || 1) * 10);
        if (code.length > 1 && !/^(Key|Digit)/.test(code) && label.length > 1) k.classList.add('small');
        bindKey(k, code.split('+'), MODIFIERS.has(code) ? code : null); // 'ShiftLeft+Semicolon': a key pressed with Shift (':' for CP/M drives)
        r.appendChild(k);
      }
      xt.appendChild(r);
    }
    pages.xt = xt;

    // ---------------------------------------------------------------- BK keyboard
    const bk = document.createElement('div'); bk.className = 'vk-page vk-bk';
    const bkField = document.createElement('div'); bkField.className = 'bk-field'; bk.appendChild(bkField);
    const inds = {};
    const pc = (v, of) => (v / of * 100).toFixed(3) + '%';
    BK_ROWS.forEach((row, r) => {
      for (const [x, w, code, top, bot, o = {}] of row) {
        const el = document.createElement('div');
        el.className = 'bk-k' + (o.cls ? ' ' + o.cls : '') + (bot ? ' two' : '') + (/^<svg/.test(top) ? ' ic' : '');
        const y = 30 + r * 97.5, h = o.rows ? 82 + 97.5 * (o.rows - 1) : 82;
        el.style.left = pc(x - X0, 1600); el.style.width = pc(w, 1600);
        el.style.top = pc(y, 632); el.style.height = pc(h, 632);
        el.innerHTML = bot ? `<span class="t">${top}</span><span class="b">${bot}</span>` : `<span class="t">${top}</span>`;
        if (o.title) el.title = o.title;
        if (o.ind) { const d = document.createElement('i'); d.className = 'led'; el.appendChild(d); inds[o.ind] = el; }
        el.dataset.code = 'BK:' + code;
        bindKey(el, ['BK:' + code], o.mod || null);
        bkField.appendChild(el);
      }
    });
    pages.bk = bk;
    // РУС / ЛАТ, ЗАГЛ / СТР: the mode in use is lit (bits as web_kbd_state: 1 РУС, 8 ЗАГЛ)
    let lastState = -1;
    function setState(st) {
      if (st === lastState) return; lastState = st;
      inds.rus.classList.toggle('lit', !!(st & 1)); inds.lat.classList.toggle('lit', !(st & 1));
      inds.zagl.classList.toggle('lit', !!(st & 8)); inds.str.classList.toggle('lit', !(st & 8));
    }

    // ---------------------------------------------------------------- joystick
    const joy = document.createElement('div'); joy.className = 'vk-page vk-joy';
    let map = JOY_KEYS;
    const pad = document.createElement('div'); pad.className = 'vk-pad';
    pad.innerHTML = `<svg viewBox="-100 -100 200 200">
      <defs><radialGradient id="vkKnobG" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#6a6f7a"/><stop offset=".55" stop-color="#3a3e46"/><stop offset="1" stop-color="#1c1e23"/></radialGradient>
      </defs>
      <circle r="96" class="ring"/><circle r="62" class="well"/>
      ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path class="arr${a % 90 ? ' diag' : ''}" data-a="${a}" transform="rotate(${a})" d="${a % 90 ? 'M 88 0 L 78 -6 L 78 6 Z' : 'M 90 0 L 72 -11 L 72 11 Z'}"/>`).join('')}
      <g class="knob"><circle r="36" cy="5" class="ks"/><circle r="34" class="kb" fill="url(#vkKnobG)"/><circle r="22" class="kt"/></g></svg>`;
    const knob = pad.querySelector('.knob');
    const fire = document.createElement('div'); fire.className = 'vk-fire';
    const jopt = opts.joyOpts || {};
    const SIZES = [1, 0.75, 0.5], SIZE_TXT = { 1: '1x', 0.75: '¾x', 0.5: '½x' };
    let way8 = jopt.way8 !== false, auto = !!jopt.auto, swap = !!jopt.swap, overlay = !!jopt.overlay, port = !!jopt.port;
    map = port ? JOY_PORT : JOY_KEYS;
    let size = SIZES.includes(jopt.size) ? jopt.size : 1;
    const saveOpts = () => { if (opts.onJoyOpts) opts.onJoyOpts({ way8, auto, swap, overlay, size, opac: OPAC[opac][0], port }); };
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
    pad.classList.toggle('w4', !way8);
    const mid = document.createElement('div'); mid.className = 'vk-joymid';
    const togs = document.createElement('div'); togs.className = 'vk-togs';
    const jl = document.createElement('div'); jl.className = 'vk-joyname';
    const joyName = () => { jl.textContent = port ? 'port 177714 · fire: button 1' : 'cursor keys · fire: space'; };
    const bPort = tog('PORT', 'Off: cursor keys and space (all programs, one key at a time). On: joystick port 177714 — directions and fire together (programs with joystick support)',
      port, () => { releaseAll(); port = !port; map = port ? JOY_PORT : JOY_KEYS; joyName(); return port; }, 'PRT');
    joyName();
    togs.append(bWay, bAuto, bSwap, bSize, bOver, bOpac, bPort);
    mid.append(jl, togs);
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
    let shown = true;
    function layout() {
      const ov = overlay && !!opts.overlayHost;
      if (ov) { ovBar.append(bOver, bAuto); ovl.append(pad, fire); if (!opts.ovBarHost) ovl.append(ovBar); }
      else { gripL.appendChild(pad); gripR.appendChild(fire); togs.append(bWay, bAuto, bSwap, bSize, bOver, bOpac, bPort); }
      joy.classList.toggle('ov', ov);
      joy.classList.toggle('swap', swap); ovl.classList.toggle('swap', swap);
      if (opts.ovBarHost && opts.ovBarHost.parentElement) opts.ovBarHost.parentElement.classList.toggle('swap', swap);
      joy.style.setProperty('--js', size); ovl.style.setProperty('--js', size); ovl.style.setProperty('--jo', OPAC[opac][1]);
      ovlShow();
      if (opts.onLayout) opts.onLayout();
    }
    // overlay on the JOY tab: the panel itself is not shown, only the screen with the stick
    function ovlShow() {
      const on = overlay && !!opts.overlayHost && shown && current === 'joy';
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
    const startAuto = () => { autoOn = true; down(map.fire); fire.classList.add('down'); // the button stays down, the key repeats
      autoT = setInterval(() => { autoOn = !autoOn; autoOn ? down(map.fire) : up(map.fire); }, 60); };
    function stopFire() {
      if (autoT) { clearInterval(autoT); autoT = null; if (autoOn) up(map.fire); autoOn = false; }
      else if (fireHeld) up(map.fire);
      fireHeld = false; fire.classList.remove('down');
    }
    fire.addEventListener('pointerdown', (e) => {
      e.preventDefault(); fire.setPointerCapture(e.pointerId); buzz(12);
      if (auto) { if (autoT) stopFire(); else startAuto(); return; }
      fire.classList.add('down'); fireHeld = true; down(map.fire);
    });
    const fireEnd = () => { if (!auto && fireHeld) stopFire(); };
    fire.addEventListener('pointerup', fireEnd);
    fire.addEventListener('pointercancel', fireEnd);
    fire.addEventListener('contextmenu', (e) => e.preventDefault());
    pad.addEventListener('contextmenu', (e) => e.preventDefault());

    for (const p of Object.values(pages)) container.appendChild(p);
    container.addEventListener('contextmenu', (e) => e.preventDefault());

    let current = null;
    function show(id) {
      releaseAll();
      current = id;
      for (const [k, p] of Object.entries(pages)) p.style.display = k === id ? '' : 'none';
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
    show(opts.tab && pages[opts.tab] ? opts.tab : 'bk');
    layout();
    // the panel was hidden / shown: the overlay goes with it
    function visible(v) { shown = !!v; if (!v) releaseAll(); ovlShow(); }
    return { show, releaseAll, visible, setState, setSticky(v) { sticky = v === true ? 1 : +v || 0; unlatchAll(); }, get tab() { return current; } };
  }

  root.BKVKbd = { create };
})(window);
