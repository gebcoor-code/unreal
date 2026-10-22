// Debugger, memory map and Graph Search windows (in the style of File Commander).
// Debugger: disassembler around PC, registers (editable), system registers, memory dump (editable), breakpoints,
// Run / Stop (F5), Step (F11), Step over (F10), Step out (Shift+F11), Run to cursor (F4), breakpoint (F9), Go to (G).
// The core stops the CPU (breakpoint, step) and keeps drawing the screen; the page's loop goes on.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const oct = (v, n) => (v >>> 0).toString(8).padStart(n || 6, '0');
  const parseOct = (t) => { t = String(t).trim(); if (!/^[0-7]+$/.test(t)) return null; return parseInt(t, 8) & 0xFFFF; };
  const BK_PAL = [0xFF000000, 0xFFFF4040, 0xFF40FF40, 0xFF4040FF]; // black, blue, green, red (ABGR)
  const KOI = (b) => (b < 32 ? '.' : window.BKFC ? (window.BKFC.bkName([b]) || '.') : String.fromCharCode(b));

  // ------------------------------------------------------------------ debugger
  function createDebugger(api) {
    const win = $('dbgwin');
    const fw = api.floatWin(win, 'dbgpos', () => {
      const r = $('screenwin').getBoundingClientRect(), vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.right + 8, vw - win.offsetWidth - 4)), y: Math.max(8, r.top) };
    });
    const E = () => api.E();
    const PDP = window.BKFC._test.PDP;
    const rd = (a) => E().web_dbg_peek(a & 0xFFFF);
    const bps = new Set();
    let top = -1, cur = -1, dumpAt = 0o1000, lines = [], lastPC = -1, regsPrev = [];
    const LINES = 22;

    function dis(a) { const r = PDP(rd, a & 0xFFFF); return { a: a & 0xFFFF, len: Math.max(2, r.len), words: r.words, text: r.text }; }
    // a start a few instructions before PC that decodes onto PC
    function startFor(pc) {
      for (let back = 12; back >= 2; back -= 2) {
        let a = (pc - back) & 0xFFFF, n = 0;
        while (n++ < 8 && a !== pc && ((pc - a) & 0xFFFF) < 40) a = (a + dis(a).len) & 0xFFFF;
        if (a === pc) return (pc - back) & 0xFFFF;
      }
      return pc;
    }
    function render() {
      if (!E() || win.hidden) return;
      const run = E().web_dbg_running(), pc = E().web_reg(7);
      $('dbgstate').textContent = run ? 'running' : 'stopped';
      $('dbgstate').classList.toggle('run', !!run);
      $('dbgrun').disabled = !!run; $('dbgstop').disabled = !run;
      for (const id of ['dbgstep', 'dbgover', 'dbgout', 'dbgto']) $(id).disabled = !!run;
      // disassembler: follows PC when stopped (when PC leaves the shown lines)
      if (!run && (top < 0 || pc !== lastPC)) {
        const inView = lines.length && lines.some((l) => l.a === pc) && lines[lines.length - 3] && pc !== lines[lines.length - 1].a && pc !== lines[lines.length - 2].a;
        if (!inView) top = startFor(pc);
        cur = pc; lastPC = pc;
      }
      if (top < 0) top = startFor(pc);
      lines = []; let a = top;
      for (let i = 0; i < LINES; i++) { const l = dis(a); lines.push(l); a = (a + l.len) & 0xFFFF; }
      const list = $('dbglist'); list.innerHTML = '';
      lines.forEach((l) => {
        const r = document.createElement('div');
        r.className = 'dl' + (l.a === pc && !run ? ' pc' : '') + (l.a === cur ? ' cur' : '') + (bps.has(l.a) ? ' bp' : '');
        r.textContent = (bps.has(l.a) ? '●' : ' ') + oct(l.a) + '  ' + l.words.slice(0, l.len / 2).map((w) => oct(w)).join(' ').padEnd(22) + l.text;
        r.onmousedown = (e) => { e.preventDefault(); cur = l.a; render(); $('dbglist').focus(); };
        r.ondblclick = () => toggleBp(l.a);
        list.appendChild(r);
      });
      // registers
      const names = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'SP', 'PC', 'PSW'];
      const rg = $('dbgregs'); rg.innerHTML = '';
      names.forEach((n, i) => {
        const v = E().web_reg(i), chg = regsPrev.length && regsPrev[i] !== v;
        const d = document.createElement('div'); d.className = 'rg' + (chg ? ' chg' : '');
        d.innerHTML = `<b>${n}</b><span class="v"></span>`;
        const sp = d.querySelector('.v'); sp.textContent = oct(v) + (i === 8 ? '  ' + flags(v) : '');
        sp.title = 'Double click: change'; sp.ondblclick = () => edit(sp, oct(v), (x) => { E().web_set_reg(i, x); render(); });
        rg.appendChild(d);
      });
      if (!run) regsPrev = names.map((_, i) => E().web_reg(i));
      const SR = [['177660', 0], ['177662', 1], ['177662w', 2], ['177664', 3], ['177706', 4], ['177710', 5], ['177712', 6], ['177714', 7], ['177714w', 8], ['177716', 9], ['177716w', 10], ['177716m', 11]];
      $('dbgsys').innerHTML = SR.map(([n, i]) => `<div class="rg"><b>${n}</b><span>${oct(E().web_dbg_sysreg(i))}</span></div>`).join('');
      // memory dump: 8 lines of 4 words
      const dm = $('dbgdump'); dm.innerHTML = '';
      for (let ln = 0; ln < 8; ln++) {
        const base = (dumpAt + ln * 8) & 0xFFFF;
        const row = document.createElement('div'); row.className = 'dm';
        const ad = document.createElement('span'); ad.className = 'a'; ad.textContent = oct(base); row.appendChild(ad);
        let txt = '';
        for (let k = 0; k < 4; k++) {
          const a = (base + k * 2) & 0xFFFF, w = rd(a);
          const s = document.createElement('span'); s.className = 'w'; s.textContent = oct(w); s.title = oct(a) + ': double click to change';
          s.ondblclick = () => edit(s, oct(w), (x) => { E().web_dbg_poke(a, x); render(); });
          row.appendChild(s);
          txt += KOI(w & 255) + KOI(w >> 8);
        }
        const t = document.createElement('span'); t.className = 't'; t.textContent = txt; row.appendChild(t);
        dm.appendChild(row);
      }
      $('dbgbps').textContent = bps.size ? 'Breakpoints: ' + [...bps].map((x) => oct(x)).join(' ') : 'No breakpoints (F9 or double click on a line)';
    }
    const flags = (p) => ['T', 'N', 'Z', 'V', 'C'].map((f, i) => (p >> (4 - i)) & 1 ? f : '·').join('') + ' P' + ((p >> 7) & 1);
    // inline editor for an octal value
    function edit(el, val, done) {
      const inp = document.createElement('input'); inp.className = 'dbgin'; inp.value = val; inp.maxLength = 6;
      el.replaceWith(inp); inp.focus(); inp.select();
      const fin = (ok) => { const v = parseOct(inp.value); if (ok && v !== null) done(v); else render(); };
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') fin(true); else if (e.key === 'Escape') fin(false); });
      inp.addEventListener('blur', () => fin(true));
    }
    function toggleBp(a) {
      if (bps.has(a)) { bps.delete(a); E().web_dbg_bp(a, 0); } else { bps.add(a); E().web_dbg_bp(a, 1); }
      api.store('dbg.bp', JSON.stringify([...bps])); render();
    }
    // after a model change the core forgets the breakpoints: the page's list is put back
    function syncBps() { if (!E()) return; E().web_dbg_bp_clear(); bps.forEach((a) => E().web_dbg_bp(a, 1)); }
    try { (JSON.parse(api.load('dbg.bp')) || []).forEach((a) => bps.add(a & 0xFFFF)); } catch (e) {}
    const act = {
      run: () => { E().web_dbg_run(); api.resume(); render(); },
      stop: () => { E().web_dbg_break(); render(); },
      step: () => { E().web_dbg_into(); api.resume(); },
      over: () => { E().web_dbg_over(); api.resume(); },
      out: () => { E().web_dbg_out(); api.resume(); },
      to: () => { if (cur >= 0) { E().web_dbg_to(cur); api.resume(); } },
    };
    $('dbgrun').onclick = act.run; $('dbgstop').onclick = act.stop; $('dbgstep').onclick = act.step;
    $('dbgover').onclick = act.over; $('dbgout').onclick = act.out; $('dbgto').onclick = act.to;
    $('dbgbp').onclick = () => { if (cur >= 0) toggleBp(cur); };
    // command buttons do not take the focus (Run / Stop get disabled): keys stay with the listing
    for (const id of ['dbgrun', 'dbgstop', 'dbgstep', 'dbgover', 'dbgout', 'dbgto', 'dbgbp']) $(id).addEventListener('mousedown', (e) => { e.preventDefault(); $('dbglist').focus(); });
    const goIn = $('dbggo');
    goIn.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { const v = parseOct(goIn.value); if (v !== null) { top = v; cur = v; render(); } $('dbglist').focus(); }
      else if (e.key === 'Escape') $('dbglist').focus();
    });
    const memIn = $('dbgmem');
    memIn.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { const v = parseOct(memIn.value); if (v !== null) { dumpAt = v & 0xFFFE; render(); } $('dbglist').focus(); }
      else if (e.key === 'Escape') $('dbglist').focus();
    });
    function key(e) {
      const k = e.key;
      if (k === 'F5') { E().web_dbg_running() ? act.stop() : act.run(); }
      else if (k === 'F11' && e.shiftKey) act.out();
      else if (k === 'F11') act.step();
      else if (k === 'F10') act.over();
      else if (k === 'F4') act.to();
      else if (k === 'F9') { if (cur >= 0) toggleBp(cur); }
      else if (k === 'g' || k === 'G') { goIn.focus(); goIn.select(); }
      else if (k === 'm' || k === 'M') { memIn.focus(); memIn.select(); }
      else if (k === 'ArrowDown') { const i = lines.findIndex((l) => l.a === cur); if (i >= 0 && i < lines.length - 1) cur = lines[i + 1].a; else { top = (top + dis(top).len) & 0xFFFF; cur = (cur + dis(cur).len) & 0xFFFF; } render(); }
      else if (k === 'ArrowUp') { const i = lines.findIndex((l) => l.a === cur); if (i > 0) cur = lines[i - 1].a; else { top = (top - 2) & 0xFFFF; cur = top; } render(); }
      else if (k === 'PageDown') { top = lines[lines.length - 1].a; cur = top; render(); }
      else if (k === 'PageUp') { top = (top - LINES * 2) & 0xFFFF; cur = top; render(); }
      else if (k === 'Escape') show(false);
      else return false;
      return true;
    }
    win.addEventListener('keydown', (e) => { if (['INPUT', 'SELECT'].includes(e.target.tagName) || e.target.closest('.usel')) return; if (key(e)) { e.preventDefault(); e.stopPropagation(); } });
    $('dbglist').addEventListener('wheel', (e) => { e.preventDefault(); const n = Math.sign(e.deltaY); top = (top + n * 6) & 0xFFFF; render(); }, { passive: false });
    $('dbgclose').onclick = () => show(false);
    $('dbghelpbtn').onclick = () => { const h = $('dbghelp'); h.hidden = !h.hidden; $('dbghelpbtn').classList.toggle('on', !h.hidden); };
    function show(v) {
      win.hidden = !v; $('dbgbtn').classList.toggle('on', v);
      if (v) { syncBps(); top = -1; fw.place(); render(); $('dbglist').focus(); }
      else if (api.onClose) api.onClose();
    }
    // while the CPU runs the registers are shown live (5 times a second)
    setInterval(() => { if (!win.hidden && E() && E().web_dbg_running()) render(); }, 200);
    return {
      show, render, syncBps, get open() { return !win.hidden; },
      onBreak() { if (win.hidden) show(true); else { top = -1; render(); } },
      hasFocus: () => win.contains(document.activeElement),
    };
  }

  // ------------------------------------------------------------------ memory map: 16 banks of 4K and the physical pages
  function createMemMap(api) {
    const win = $('mmwin'), cv = $('mmcanvas'), ctx = cv.getContext('2d');
    const fw = api.floatWin(win, 'mmpos', () => {
      const r = $('screenwin').getBoundingClientRect();
      return { x: Math.max(4, r.left + 30), y: Math.max(8, r.top + 40) };
    });
    let page = 0, color = api.load('mm.color') === '1';
    const E = () => api.E();
    function render() {
      if (!E() || win.hidden) return;
      const size = E().web_mem_size(), pages = Math.max(1, Math.floor(size / 0x4000));
      const mapped = new Map();
      const rows = [];
      for (let i = 0; i < 16; i++) {
        const m = E().web_memmap(i), off = m & 0x3FFFFFFF, r = (m >>> 30) & 1, w = (m >>> 31) & 1;
        rows.push(`<tr><td>${oct(i * 0o10000)}–${oct(i * 0o10000 + 0o7777)}</td><td>${oct(off, 7)}</td><td>${r ? 'R' : '·'}${w ? 'W' : '·'}</td><td>page ${Math.floor(off / 0x4000)}</td></tr>`);
        if (r) mapped.set(Math.floor(off / 0x4000), true);
      }
      $('mmtable').innerHTML = '<tr><th>Address</th><th>Memory</th><th></th><th></th></tr>' + rows.join('');
      const sel = $('mmpage');
      if (sel.options.length !== pages) { sel.innerHTML = ''; for (let p = 0; p < pages; p++) { const o = document.createElement('option'); o.value = p; sel.appendChild(o); } }
      for (let p = 0; p < pages; p++) sel.options[p].textContent = 'Page ' + p + ' · ' + oct(p * 0x4000, 7) + (mapped.has(p) ? ' · in use' : '');
      if (page >= pages) page = 0;
      sel.value = page;
      // the page as the BK screen shows memory: 64 bytes a line, 256 lines
      const mem = new Uint8Array(E().memory.buffer, E().web_mem(), size);
      const img = ctx.createImageData(512, 256), px = new Uint32Array(img.data.buffer);
      let o = page * 0x4000, q = 0;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
        const b = mem[o++];
        if (color) for (let k = 0; k < 8; k += 2) { const c = BK_PAL[(b >> k) & 3]; px[q++] = c; px[q++] = c; }
        else for (let k = 0; k < 8; k++) px[q++] = (b >> k) & 1 ? 0xFFE8E8E8 : 0xFF000000;
      }
      ctx.putImageData(img, 0, 0);
      $('mmcolor').checked = color;
    }
    $('mmpage').onchange = () => { page = +$('mmpage').value; render(); };
    $('mmcolor').onchange = () => { color = $('mmcolor').checked; api.store('mm.color', color ? '1' : '0'); render(); };
    $('mmclose').onclick = () => show(false);
    win.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); show(false); } });
    function show(v) { win.hidden = !v; $('mmbtn').classList.toggle('on', v); if (v) { fw.place(); render(); } else if (api.onClose) api.onClose(); }
    setInterval(() => { if (!win.hidden && E()) render(); }, 250);
    return { show, render, get open() { return !win.hidden; } };
  }

  // ------------------------------------------------------------------ Graph Search (from the Unreal Speccy web port)
  // memory as pictures to find sprites, fonts and screens. BK bit order: the lowest bit is the left pixel.
  const MODES = { BW: { ppb: 8, sx: 2, sy: 2 }, Color: { ppb: 4, sx: 4, sy: 2 } };
  function createGfx(api) {
    const win = $('gfxwin'), cv = $('gfxcanvas'), ctx = cv.getContext('2d'), bar = $('gfxscroll');
    const st = { mode: 'BW', src: 0, addr: 0o40000, w: 64, h: 256, inv: false, live: true };
    try { Object.assign(st, JSON.parse(api.load('gfx') || '{}')); } catch (e) {}
    if (!MODES[st.mode]) st.mode = 'BW';
    let size = 0x10000, img = null, hoverAddr = -1, cpuBuf = new Uint8Array(0x10000);
    const save = () => api.store('gfx', JSON.stringify(st));
    const E = () => api.E();
    const fw = api.floatWin(win, 'gfxpos', () => {
      const r = $('screenwin').getBoundingClientRect(), vw = document.documentElement.clientWidth;
      let x = r.left - win.offsetWidth - 8, y = r.top;
      if (x < 0) { x = Math.max(0, Math.min(r.left + 40, vw - win.offsetWidth)); y = r.top + 48; }
      return { x, y };
    });
    const clampAddr = (v) => Math.max(0, Math.min(v | 0, Math.max(0, size - st.w * st.h)));
    function memory() {
      if (st.src === 1) { size = E().web_mem_size(); return new Uint8Array(E().memory.buffer, E().web_mem(), size); }
      size = 0x10000;
      const n = Math.min(size, st.addr + st.w * st.h + 2);
      for (let a = st.addr & ~1; a < n; a += 2) { const w = E().web_dbg_peek(a); cpuBuf[a] = w & 255; cpuBuf[a + 1] = w >> 8; }
      return cpuBuf;
    }
    const pxW = () => st.w * MODES[st.mode].ppb;
    function draw() {
      if (!E() || win.hidden) return;
      const M = MODES[st.mode];
      const vh = $('gfxview').clientHeight;
      if (vh > 0) st.h = Math.max(1, Math.floor(vh / M.sy));
      st.w = Math.max(1, Math.min(512, st.w | 0));
      const mem = memory();
      st.addr = clampAddr(st.addr);
      const W = st.w * M.ppb, H = st.h;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; img = null; }
      if (!img) img = ctx.createImageData(W, H);
      const px = new Uint32Array(img.data.buffer), xor = st.inv ? 0xFF : 0;
      let a = st.addr, o = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < st.w; x++) {
        const b = a < size ? mem[a] ^ xor : 0; a++;
        if (st.mode === 'Color') for (let k = 0; k < 8; k += 2) px[o++] = BK_PAL[(b >> k) & 3];
        else for (let k = 0; k < 8; k++) px[o++] = (b >> k) & 1 ? 0xFFE8E8E8 : 0xFF000000;
      }
      ctx.putImageData(img, 0, 0);
      cv.style.width = W * M.sx + 'px'; cv.style.height = H * M.sy + 'px';
      $('gfxmode').value = st.mode; $('gfxsrc').value = String(st.src);
      if (document.activeElement !== $('gfxaddr')) $('gfxaddr').value = oct(st.addr, st.src ? 7 : 6);
      if (document.activeElement !== $('gfxw')) $('gfxw').value = pxW();
      $('gfxlive').checked = st.live; $('gfxinv').checked = st.inv;
      bar.max = String(Math.max(0, size - 1)); bar.value = String(st.addr);
      const n = st.w * st.h;
      $('gfxstat').textContent = `${oct(st.addr, st.src ? 7 : 6)}–${oct(Math.min(st.addr + n, size) - 1, st.src ? 7 : 6)}  ${pxW()}×${st.h} px · ${st.w} bytes a line` + (hoverAddr >= 0 ? `   cursor ${oct(hoverAddr, st.src ? 7 : 6)}` : '');
    }
    function setAddr(v) { st.addr = clampAddr(v); save(); draw(); }
    function change(fn) { fn(); save(); draw(); }
    $('gfxmode').onchange = () => change(() => { const o = MODES[st.mode], n = MODES[$('gfxmode').value]; st.w = Math.max(1, Math.round(st.w * o.ppb * o.sx / (n.ppb * n.sx))); st.mode = $('gfxmode').value; });
    $('gfxsrc').onchange = $('gfxsrc').oninput = () => change(() => { st.src = +$('gfxsrc').value; });
    $('gfxinv').onchange = () => change(() => { st.inv = $('gfxinv').checked; });
    $('gfxlive').onchange = () => change(() => { st.live = $('gfxlive').checked; });
    const addrIn = $('gfxaddr');
    const applyAddr = () => { const t = addrIn.value.trim(); if (/^[0-7]+$/.test(t)) setAddr(parseInt(t, 8)); };
    addrIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { applyAddr(); addrIn.select(); } e.stopPropagation(); });
    addrIn.addEventListener('blur', applyAddr);
    const wIn = $('gfxw');
    const applyW = () => { const v = parseInt(wIn.value, 10); if (v > 0) change(() => { st.w = Math.max(1, Math.round(v / MODES[st.mode].ppb)); }); };
    wIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { applyW(); wIn.select(); } e.stopPropagation(); });
    wIn.addEventListener('blur', applyW);
    bar.addEventListener('input', () => setAddr(+bar.value));
    $('gfxview').addEventListener('wheel', (e) => {
      e.preventDefault(); const n = Math.sign(e.deltaY || e.deltaX); if (!n) return;
      if (e.shiftKey) setAddr(st.addr + n); else if (e.ctrlKey) setAddr(st.addr + n * st.w * st.h); else setAddr(st.addr + n * st.w * 8);
    }, { passive: false });
    let drag = null;
    const cellOf = (e) => { const r = cv.getBoundingClientRect(), M = MODES[st.mode];
      const x = Math.floor((e.clientX - r.left) / (r.width / cv.width) / M.ppb), y = Math.floor((e.clientY - r.top) / (r.height / cv.height));
      return { x, y, inside: x >= 0 && y >= 0 && x < st.w && y < st.h }; };
    cv.addEventListener('pointerdown', (e) => { cv.focus(); const c = cellOf(e); drag = { id: e.pointerId, x: c.x, y: c.y, addr: st.addr }; cv.setPointerCapture(e.pointerId); e.preventDefault(); });
    cv.addEventListener('pointermove', (e) => {
      const c = cellOf(e);
      if (drag && e.pointerId === drag.id) { setAddr(drag.addr - (c.y - drag.y) * st.w - (c.x - drag.x)); return; }
      const ha = st.addr + c.y * st.w + c.x; hoverAddr = c.inside && ha < size ? ha : -1;
    });
    const endDrag = () => { drag = null; };
    cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
    const edge = $('gfxedge'); let ed = null;
    edge.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(); ed = { id: e.pointerId, x: e.clientX, w: st.w, bw: r.width / st.w }; edge.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation(); });
    edge.addEventListener('pointermove', (e) => { if (!ed || e.pointerId !== ed.id) return; const w = Math.round(ed.w + (e.clientX - ed.x) / ed.bw); if (w !== st.w) change(() => { st.w = w; }); });
    const edEnd = () => { ed = null; cv.focus(); };
    edge.addEventListener('pointerup', edEnd); edge.addEventListener('pointercancel', edEnd);
    function key(e) {
      const pg = st.w * st.h;
      switch (e.code) {
        case 'ArrowLeft': if (e.ctrlKey) change(() => st.w--); else setAddr(st.addr - 1); break;
        case 'ArrowRight': if (e.ctrlKey) change(() => st.w++); else setAddr(st.addr + 1); break;
        case 'ArrowUp': setAddr(st.addr - st.w); break;
        case 'ArrowDown': setAddr(st.addr + st.w); break;
        case 'PageUp': setAddr(st.addr - pg); break;
        case 'PageDown': setAddr(st.addr + pg); break;
        case 'Home': setAddr(0); break;
        case 'End': setAddr(size - pg); break;
        case 'KeyI': change(() => { st.inv = !st.inv; }); break;
        case 'KeyM': change(() => { $('gfxmode').value = st.mode === 'BW' ? 'Color' : 'BW'; $('gfxmode').onchange(); }); break;
        case 'KeyG': addrIn.focus(); addrIn.select(); break;
        case 'Escape': show(false); break;
        default: return false;
      }
      return true;
    }
    win.addEventListener('keydown', (e) => { if (['INPUT', 'SELECT'].includes(e.target.tagName) || e.target.closest('.usel')) return; if (key(e)) { e.preventDefault(); e.stopPropagation(); } });
    if (window.ResizeObserver) new ResizeObserver(() => { if (!win.hidden) draw(); }).observe($('gfxview'));
    $('gfxclose').onclick = () => show(false);
    // the width edge (orange strip) is kept in view when the window opens: the width is cut to the window
    function fitWidth() {
      const M = MODES[st.mode], room = $('gfxview').clientWidth - 12;
      if (room > 0 && st.w * M.ppb * M.sx > room) { const n = Math.floor(room / (M.ppb * M.sx)); st.w = Math.max(1, n >= 16 ? n - n % 8 : n); save(); }
    }
    function show(v) { win.hidden = !v; $('gfxbtn').classList.toggle('on', v); if (v) { fw.place(); fitWidth(); draw(); cv.focus(); } else if (api.onClose) api.onClose(); }
    setInterval(() => { if (!win.hidden && st.live && E()) draw(); }, 40);
    return { show, draw, get open() { return !win.hidden; } };
  }

  window.BKDbg = { createDebugger, createMemMap, createGfx };
})();
