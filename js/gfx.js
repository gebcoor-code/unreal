// Graphics finder for the debugger: shows memory as pictures to spot sprites, fonts and screens.
// Modes: ZX (1 bpp, square pixels), VGA (1 bpp, 640x200 narrow pixels), EGA (ATM 320x200: 2 pixels per byte).
(function (root) {
  'use strict';

  const MODES = {
    ZX:  { ppb: 8, sx: 2, sy: 2 },  // pixels per byte, CSS pixel size
    EGA: { ppb: 2, sx: 2, sy: 2 },
    VGA: { ppb: 8, sx: 1, sy: 2 },
  };
  const hex = (v, n) => v.toString(16).toUpperCase().padStart(n, '0');

  function create(api) {
    const $ = (id) => document.getElementById(id);
    const win = $('gfxwin'), cv = $('gfxcanvas'), ctx = cv.getContext('2d'), bar = $('gfxscroll');
    let st = { mode: 'ZX', src: 0, addr: 0, w: 32, h: 192, inv: false, live: true, ww: 600, wh: 520, zoom: 1 };
    try { Object.assign(st, JSON.parse(api.load('gfx') || '{}')); } catch (e) {}
    st.src = 1; // every start: RAM (CPU 64K can be chosen in the window)
    let mem = null, size = 0x10000, img = null, hoverAddr = -1;
    const save = () => api.store('gfx', JSON.stringify(st));

    const fw = api.floatWin(win, 'gfxpos', () => {
      const dw = $('dbgwin'), vw = document.documentElement.clientWidth;
      const r = (dw.hidden ? $('screenwrap') : dw).getBoundingClientRect();
      let x = r.left - win.offsetWidth - 8, y = r.top;
      if (x < 0) { x = Math.max(0, Math.min(r.left + 40, vw - win.offsetWidth)); y = r.top + 48; }
      return { x, y };
    });

    function clamp() {
      st.w = Math.max(1, Math.min(640, win.hidden ? 640 : maxW(), st.w | 0)); // the orange edge stays inside the window
      st.h = Math.max(1, Math.min(1024, st.h | 0));
      if (!MODES[st.mode]) st.mode = 'ZX';
      if (![1, 2, 4].includes(st.zoom)) st.zoom = 1;
      st.addr = clampAddr(st.addr);
    }
    // no wrap-around: the view stops at the start and at the end of memory
    function clampAddr(v) { return Math.max(0, Math.min(v | 0, Math.max(0, size - st.w * st.h))); }
    function fmtAddr(a) {
      if (st.src === 1 || st.src === 2) return hex(a >> 14, 2) + ':' + hex(a & 0x3FFF, 4);
      if (st.src >= 9) return '#' + hex(a, size > 0x100000 ? 6 : 5); // a disk image or a file: offset
      return '#' + hex(a, 4);
    }
    function parseAddr(t) {
      t = t.trim().replace(/^#|^0x|^\$/i, '');
      const m = /^([0-9a-f]+):([0-9a-f]+)$/i.exec(t); // RAM page:offset
      if (m) return parseInt(m[1], 16) * 0x4000 + (parseInt(m[2], 16) & 0x3FFF);
      const v = parseInt(t, 16);
      return isNaN(v) ? null : v;
    }

    function syncControls() {
      $('gfxmode').value = st.mode; $('gfxsrc').value = String(st.src);
      if (document.activeElement !== $('gfxaddr')) $('gfxaddr').value = fmtAddr(st.addr).replace('#', '');
      if (document.activeElement !== $('gfxw')) $('gfxw').value = pxW();
      $('gfxlive').checked = st.live;
      $('gfxinv').checked = st.inv; $('gfxzoom').value = String(st.zoom || 1);
      // the thumb is at the bottom when the view shows the end of memory
      bar.max = String(Math.max(0, size - st.w * st.h)); bar.step = '1'; bar.value = String(st.addr);
    }
    function status() {
      const n = st.w * st.h, end = Math.min(st.addr + n, size) - 1;
      let s = `${fmtAddr(st.addr)}–${fmtAddr(end)}  ${pxW()}×${st.h} px = ${n} bytes`;
      if (hoverAddr >= 0) s += `   cursor ${fmtAddr(hoverAddr)}`;
      $('gfxstat').textContent = s;
    }

    // memory: RAM is read in place; the Z80 view copies only the bytes that are on screen
    // sources: 0 CPU 64K, 1 RAM, 2 ROM, 10 + drive: the floppy image in that drive (as TRD / ISD), read again every second
    // 9: a file from File Commander (View → Graf): only its bytes
    let disk = null, diskAt = 0, file = null;
    function sources() {
      const sel = $('gfxsrc'), list = [['0', 'CPU 64K'], ['1', 'RAM'], ['2', 'ROM'], ...(file ? [['9', 'File ' + file.name]] : []), ...(api.disks ? api.disks() : []).map((d) => [String(10 + d.drive), d.label])];
      const key = list.map((x) => x.join('=')).join('|');
      if (sel.dataset.key !== key) {
        sel.innerHTML = ''; for (const [v, t] of list) { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); }
        sel.dataset.key = key;
      }
      if (!list.some((x) => +x[0] === st.src)) st.src = 1; // the disk was taken out
      sel.value = String(st.src);
    }
    function refresh() {
      const E = api.E();
      if (!E || win.hidden) return;
      sources();
      if (st.src === 9) size = file ? file.data.length : 0x10000;
      else if (st.src >= 10) {
        const now = performance.now();
        if (!disk || disk.src !== st.src || now - diskAt > 1000) { const d = api.diskBytes(st.src - 10); disk = d ? { src: st.src, data: d } : null; diskAt = now; }
        size = disk ? disk.data.length : 0x10000;
      } else size = E.web_gfx_size(st.src);
      clamp();
      draw();
    }
    function draw() {
      const E = api.E(), M = MODES[st.mode];
      if (!E || win.hidden) return;
      // height: as many lines as fit into the window (the picture never scrolls vertically)
      const vh = $('gfxview').clientHeight;
      const z = st.zoom || 1;
      if (vh > 0) st.h = Math.max(1, Math.floor(vh / (M.sy * z)));
      st.addr = clampAddr(st.addr);
      const W = st.w * M.ppb, H = st.h;
      mem = st.src === 9 ? (file ? file.data : new Uint8Array(size)) : st.src >= 10 ? (disk && disk.src === st.src ? disk.data : new Uint8Array(size)) : new Uint8Array(E.memory.buffer, E.web_gfx_mem(st.src, st.addr, st.w * H), size);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; img = null; }
      if (!img) img = ctx.createImageData(W, H);
      const px = new Uint32Array(img.data.buffer);
      const ink = 0xFFE8E8E8, paper = 0xFF000000, xor = st.inv ? 0xFF : 0; // inverse = inverted bytes
      const pal = st.mode === 'EGA' ? new Uint32Array(E.memory.buffer, E.web_gfx_pal(), 16).slice() : null;
      let a = st.addr, o = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < st.w; x++) {
          const b = a < size ? mem[a] ^ xor : 0; a++;
          if (pal) { // ATM EGA: left pixel = bits 0,1,2,6; right pixel = bits 3,4,5,7
            px[o++] = pal[(b & 7) | ((b >> 3) & 8)];
            px[o++] = pal[((b >> 3) & 7) | ((b >> 4) & 8)];
          } else {
            for (let k = 7; k >= 0; k--) px[o++] = (b >> k) & 1 ? ink : paper;
          }
        }
      }
      ctx.putImageData(img, 0, 0);
      cv.style.width = W * M.sx * z + 'px';   // the picture scrolls inside the window if wider
      cv.style.height = H * M.sy * z + 'px';
      syncControls(); status();
    }

    const pxW = () => st.w * (MODES[st.mode] || MODES.ZX).ppb; // width shown in pixels
    function setAddr(v) { st.addr = clampAddr(v); save(); draw(); }
    let ed = null; // right edge drag in progress: keep the window where it is
    function change(fn) { fn(); clamp(); save(); draw(); }

    // ---- controls
    // switching modes keeps the picture's right edge where it is: width in bytes is recalculated
    function setMode(m) {
      const o = MODES[st.mode], n = MODES[m];
      const px = st.w * o.ppb * o.sx;                     // on-screen width
      st.w = Math.max(1, Math.round(px / (n.ppb * n.sx)));
      st.mode = m;
    }
    $('gfxmode').onchange = () => {
      const v = $('gfxmode').value;
      if (!v.startsWith('v:')) { change(() => setMode(v)); return; }
      $('gfxmode').value = st.mode; // a viewer, not a picture mode: the picture keeps its mode
      openViewer(v.slice(2));
    };
    // Text / Hex / Z80asm: the File Commander viewer over this memory (CPU 64K whole, others: the 64K around the address)
    function openViewer(m) {
      const E = api.E(); if (!E || !api.view) return;
      let all, name;
      if (st.src === 9) { all = file && file.data; name = file && file.name; }
      else if (st.src >= 10) { all = disk ? disk.data : api.diskBytes(st.src - 10); name = $('gfxsrc').selectedOptions[0].textContent; }
      else if (st.src === 0) { const p = E.web_gfx_mem(0, 0, 0x10000); all = new Uint8Array(E.memory.buffer, p, 0x10000).slice(); name = 'CPU 64K'; }
      else { const n = E.web_gfx_size(st.src), p = E.web_gfx_mem(st.src, 0, n); all = new Uint8Array(E.memory.buffer, p, n); name = st.src === 2 ? 'ROM' : 'RAM'; }
      if (!all) return;
      // disk images: whole (5-digit offsets); RAM / ROM: the 64K from the page of the address
      const start = st.src === 0 || st.src >= 9 || all.length <= 0x10000 ? 0 : Math.min(st.addr & ~0x3FFF, Math.max(0, all.length - 0x10000));
      const data = st.src >= 9 ? all.slice() : all.slice(start, start + 0x10000), hx = (v) => '#' + v.toString(16).toUpperCase();
      api.view({ name, data, org: st.src === 0 ? 0 : 0 }, 'Graph Search · ' + name + (start ? ' from ' + hx(start) : ''), m, st.addr - start);
    }
    // iOS: the picker may report the choice by 'input' only; both save it
    // a disk image is not live (it is read again every second while shown); back on RAM / ROM / CPU the earlier choice returns
    let liveMem = st.live;
    $('gfxsrc').onchange = $('gfxsrc').oninput = () => {
      const was = st.src; st.src = +$('gfxsrc').value; disk = null;
      if (st.src >= 9 && was < 9) { liveMem = st.live; st.live = false; } else if (st.src < 9 && was >= 9) st.live = liveMem;
      save(); refresh();
    };
    $('gfxinv').onchange = () => change(() => { st.inv = $('gfxinv').checked; });
    $('gfxzoom').onchange = $('gfxzoom').oninput = () => change(() => { st.zoom = +$('gfxzoom').value || 1; fitWidth(); });
    const addrIn = $('gfxaddr');
    const applyAddr = () => { const v = parseAddr(addrIn.value); if (v !== null) setAddr(v); addrIn.value = fmtAddr(st.addr).replace('#', ''); };
    addrIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { applyAddr(); addrIn.select(); } e.stopPropagation(); });
    addrIn.addEventListener('blur', applyAddr);
    const wIn = $('gfxw'); // width in pixels, rounded to whole bytes; applied on Enter or when the field loses focus
    const applyW = () => { const v = parseInt(wIn.value, 10); if (v > 0) change(() => { st.w = Math.max(1, Math.round(v / MODES[st.mode].ppb)); }); wIn.value = pxW(); };
    wIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { applyW(); wIn.select(); }
      else if (e.key === 'Escape') { wIn.value = pxW(); cv.focus(); }
      e.stopPropagation();
    });
    wIn.addEventListener('blur', applyW);
    bar.addEventListener('input', () => setAddr(+bar.value));
    // a finger on the scroll bar: Safari does not drag a vertical range input — position = address
    let bd = null;
    const barAt = (e) => { const r = bar.getBoundingClientRect(); setAddr(Math.round(Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * +bar.max)); };
    bar.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      e.preventDefault(); bd = e.pointerId; bar.setPointerCapture(e.pointerId); barAt(e);
    });
    bar.addEventListener('pointermove', (e) => { if (e.pointerId === bd) { e.preventDefault(); barAt(e); } });
    const barEnd = (e) => { if (e.pointerId === bd) bd = null; };
    bar.addEventListener('pointerup', barEnd); bar.addEventListener('pointercancel', barEnd);

    // ---- wheel: 8 rows per notch; Shift: 1 byte; Ctrl: a page
    $('gfxview').addEventListener('wheel', (e) => {
      e.preventDefault();
      const n = Math.sign(e.deltaY || e.deltaX);
      if (!n) return;
      if (e.shiftKey) setAddr(st.addr + n);
      else if (e.ctrlKey) setAddr(st.addr + n * st.w * st.h);
      else setAddr(st.addr + n * st.w * 8);
    }, { passive: false });

    // ---- drag the picture (mouse or finger): rows vertically, bytes horizontally
    let drag = null;
    const cellOf = (e) => {
      const r = cv.getBoundingClientRect(), M = MODES[st.mode];
      const x = Math.floor((e.clientX - r.left) / (r.width / cv.width) / M.ppb);
      const y = Math.floor((e.clientY - r.top) / (r.height / cv.height));
      return { x, y, inside: x >= 0 && y >= 0 && x < st.w && y < st.h };
    };
    cv.addEventListener('pointerdown', (e) => {
      cv.focus();
      const c = cellOf(e);
      drag = { id: e.pointerId, x: c.x, y: c.y, addr: st.addr };
      cv.setPointerCapture(e.pointerId); e.preventDefault();
    });
    cv.addEventListener('pointermove', (e) => {
      const c = cellOf(e);
      if (drag && e.pointerId === drag.id) {
        setAddr(drag.addr - (c.y - drag.y) * st.w - (c.x - drag.x));
        return;
      }
      const ha = st.addr + c.y * st.w + c.x;
      hoverAddr = c.inside && ha < size ? ha : -1;
      status();
    });
    const endDrag = () => { drag = null; };

    // ---- right edge: drag to change the width (in bytes)
    const edge = $('gfxedge');
    edge.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect();
      ed = { id: e.pointerId, x: e.clientX, w: st.w, bw: r.width / st.w }; // CSS pixels per byte
      edge.setPointerCapture(e.pointerId); edge.classList.add('drag'); e.preventDefault(); e.stopPropagation();
    });
    edge.addEventListener('pointermove', (e) => {
      if (!ed || e.pointerId !== ed.id) return;
      const w = Math.min(maxW(), Math.round(ed.w + (e.clientX - ed.x) / ed.bw)); // the orange edge stays inside the window
      if (w !== st.w) change(() => { st.w = w; });
    });
    const edEnd = () => { if (ed) { ed = null; edge.classList.remove('drag'); cv.focus(); } };
    edge.addEventListener('pointerup', edEnd); edge.addEventListener('pointercancel', edEnd);
    cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
    cv.addEventListener('pointerleave', () => { if (!drag) { hoverAddr = -1; status(); } });

    // ---- keys (while the graphics window has focus)
    function key(e) {
      const page = st.w * st.h;
      switch (e.code) {
        case 'ArrowLeft':  if (e.ctrlKey) change(() => st.w--); else setAddr(st.addr - 1); break;
        case 'ArrowRight': if (e.ctrlKey) change(() => st.w++); else setAddr(st.addr + 1); break;
        case 'ArrowUp':    setAddr(st.addr - st.w); break;
        case 'ArrowDown':  setAddr(st.addr + st.w); break;
        case 'PageUp':     setAddr(st.addr - page); break;
        case 'PageDown':   setAddr(st.addr + page); break;
        case 'Home':       setAddr(0); break;
        case 'End':        setAddr(size - page); break;
        case 'KeyI':       change(() => { st.inv = !st.inv; }); break;
        case 'KeyZ':       change(() => { st.zoom = st.zoom === 1 ? 2 : st.zoom === 2 ? 4 : 1; fitWidth(); }); break;
        case 'KeyM': { const k = Object.keys(MODES); change(() => setMode(k[(k.indexOf(st.mode) + 1) % k.length])); break; }
        case 'KeyG':       addrIn.focus(); addrIn.select(); break;
        case 'Escape':     show(false); break;
        case 'F1':         showHelp(hw.hidden); break;
        default: return false;
      }
      return true;
    }

    // ---- window size: independent of the picture, changed by dragging the window edges
    // the window is at least as wide as the controls on top need in one line; a phone: the width of the screen
    let MINW = 300; const MINH = 200;
    const narrow = () => document.documentElement.clientWidth <= 620; // a phone (a tablet resizes like a desktop)
    function barWidth() {
      const bar = win.querySelector('.gfxbar'), cs = getComputedStyle(bar), was = win.hidden; win.hidden = false;
      let need = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 4;
      [...bar.children].forEach((c, k) => { need += c.getBoundingClientRect().width + (k ? parseFloat(cs.columnGap) || 8 : 0); });
      win.hidden = was; return Math.ceil(need);
    }
    function applySize() {
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      if (narrow()) { st.ww = vw - 16; MINW = st.ww; } // room for the window gaps on both sides
      else { MINW = Math.min(vw - 4, Math.max(300, barWidth())); st.ww = Math.max(MINW, Math.min(st.ww | 0, vw - 4)); }
      st.wh = Math.max(MINH, Math.min(st.wh | 0, vh - 8));
      win.style.width = st.ww + 'px'; win.style.height = st.wh + 'px';
    }
    api.edgeResize(win, { minW: () => MINW, minH: MINH, fixedW: narrow, size: (w, h) => { st.ww = w; st.wh = h; applySize(); },
      end: (r) => { save(); fw.setPos({ x: r.left, y: r.top }); cv.focus(); } });
    applySize();
    window.addEventListener('resize', () => { if (!win.hidden) applySize(); });
    let lastVH = -1, lastVW = -1;
    if (window.ResizeObserver) new ResizeObserver(() => {
      const vh = $('gfxview').clientHeight, vw = $('gfxview').clientWidth;
      if (!win.hidden && (vh !== lastVH || vw !== lastVW)) { lastVH = vh; lastVW = vw; fitWidth(); draw(); } // narrower window: narrower picture
    }).observe($('gfxview'));

    // on open: the picture must not be wider than the window, so the orange edge can be grabbed
    // the picture and its orange edge fit into the window, with a small gap on the right
    function maxW() {
      const M = MODES[st.mode] || MODES.ZX, perByte = M.ppb * M.sx * (st.zoom || 1), pad = parseFloat(getComputedStyle(win.querySelector('.gfxcw')).paddingRight) || 10, room = $('gfxview').clientWidth - pad - 14;
      return room > 0 ? Math.max(1, Math.floor(room / perByte)) : 640;
    }
    function fitWidth() { const m = maxW(); if (st.w > m) { st.w = m; save(); } }
    function show(v) {
      win.hidden = !v;
      $('gfxbtn').classList.toggle('on', v); api.onToggle && api.onToggle();
      if (v) { st.src = 1; st.live = true; liveMem = true; disk = null; applySize(); fitWidth(); refresh(); fw.place(); cv.focus(); } // every opening: RAM, live view
      else { st.src = +$('gfxsrc').value; if (st.src === 9) st.src = 1; disk = null; file = null; save(); showHelp(false); if (api.onClose) api.onClose(); }
    }
    // a file (File Commander viewer, Graf): the picture of its bytes only, from its start, not live
    function showFile(name, data) {
      file = { name, data: data.slice() };
      if (win.hidden) show(true);
      liveMem = true; st.src = 9; st.live = false; st.addr = 0; disk = null;
      refresh(); cv.focus();
    }
    // live view: while the emulator runs (not stopped in the debugger) redraw 25 times a second
    setInterval(() => { if (!win.hidden && st.live && api.live()) refresh(); }, 40);
    $('gfxlive').onchange = () => { st.live = $('gfxlive').checked; save(); refresh(); };
    $('gfxclose').onclick = () => show(false);

    // ---- help window
    const hw = $('gfxhelp');
    const hfw = api.floatWin(hw, 'gfxhelppos', () => {
      const r = win.getBoundingClientRect(), vw = document.documentElement.clientWidth;
      let x = r.right + 8, y = r.top;
      if (x + hw.offsetWidth > vw) { x = Math.max(0, Math.min(r.left + 24, vw - hw.offsetWidth)); y = r.top + 32; }
      return { x, y };
    });
    function showHelp(v) {
      hw.hidden = !v; $('gfxhelpbtn').classList.toggle('on', v);
      if (v) hfw.setPos(api.snapRight(win.getBoundingClientRect(), hw)); // stick to the right side
    }
    $('gfxhelpbtn').onclick = (e) => { e.stopPropagation(); showHelp(hw.hidden); cv.focus(); };
    $('gfxhelpclose').onclick = () => { showHelp(false); cv.focus(); };

    return {
      show, showFile, refresh, key,
      get open() { return !win.hidden; },
      hasFocus: () => win.contains(document.activeElement),
      typing: () => ['INPUT', 'SELECT'].includes(document.activeElement && document.activeElement.tagName) || !!(document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('usel')),
    };
  }

  root.UnrealGfx = { create };
})(typeof self !== 'undefined' ? self : this);
