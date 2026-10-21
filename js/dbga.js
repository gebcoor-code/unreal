// deBUGa: the second debugger window (after Xpeccy's "deBUGa"). It works on the same debugger loop of the core as the
// Unreal debugger: Stop or a breakpoint enters it, the page shows this window instead of the Unreal screen; one of the
// two at a time. Registers, disassembly with labels, memory dump, stack; step, step over, run to cursor / return.
(function () {
  'use strict';
  const hex2 = (v) => (v & 0xFF).toString(16).toUpperCase().padStart(2, '0');
  const hex4 = (v) => (v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  const hex6 = (v) => (v & 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const REGS = ['AF', 'BC', 'DE', 'HL', "AF'", "BC'", "DE'", "HL'", 'IX', 'IY', 'SP', 'PC', 'IR'];
  const FLAGS = [['S', 0x80], ['Z', 0x40], ['5', 0x20], ['H', 0x10], ['3', 0x08], ['P', 0x04], ['N', 0x02], ['C', 0x01]];
  const COND = { nz: (f) => !(f & 0x40), z: (f) => !!(f & 0x40), nc: (f) => !(f & 1), c: (f) => !!(f & 1), po: (f) => !(f & 4), pe: (f) => !!(f & 4), p: (f) => !(f & 0x80), m: (f) => !!(f & 0x80) };

  function create(api) {
    const $ = (id) => document.getElementById(id);
    const win = $('dgawin'), dis = $('dgadis'), mem = $('dgamem');
    const E = () => api.E();
    let open = false, stopped = false, shownPc = -1;
    let top = 0, curs = 0, memTop = 0, memCurs = 0, pane = 'dis', rows = 0, memRows = 0, memCols = 8; // pane: the part the keys go to
    let last = null, prev = null; // registers now / at the stop before (changed ones are lit)
    const back = []; // addresses the listing came from (Enter on a jump; Backspace returns)
    // deBUGa breakpoints (web/web_dga.cpp): kind 0 Z80 address, 1 RAM / 2 ROM physical byte (page × #4000 + offset),
    // 3 IN / 4 OUT port (port & mask), 5 INT; acc 1 X, 2 R, 4 W; act 0 stop, 1 count. Kept for the visitor.
    let bps = []; try { const j = JSON.parse(api.load('dga.bps')); if (Array.isArray(j)) bps = j.filter((b) => b && b.kind >= 0 && b.kind <= 5); } catch (e) {}
    let tab = 'mem', hitIdx = -1, hitText = '', lastE = null;
    // the dump: msrc 0 the Z80 64K as paged now, 1 a RAM page, 2 a ROM page (16K, page offsets); mpage its number
    let msrc = 0, mpage = 0;
    const memSize = () => (msrc ? 0x4000 : 0x10000), memEnd = () => memSize() - 1;
    function pageBuf() { const e = E(); return new Uint8Array(e.memory.buffer, e.web_gfx_mem(msrc, 0, 0) + mpage * 0x4000, 0x4000); }
    const mrd = (a) => (msrc ? pageBuf()[a & 0x3FFF] : E().web_peek(a & 0xFFFF));
    function mwr(a, v) { if (msrc) pageBuf()[a & 0x3FFF] = v & 0xFF; else E().web_poke(a & 0xFFFF, v & 0xFF); }
    const mAd = (a) => (msrc ? hex2(mpage) + ':' + hex4(a) : hex4(a));
    function memSrcList() { // the choices: CPU, every RAM / ROM page (the ones mapped now: their window)
      const e = E(); if (!e) return;
      const nr = e.web_gfx_size(1) >> 14, no = e.web_gfx_size(2) >> 14, map = {};
      for (let w = 0; w < 4; w++) { const k = pkRaw(w * 0x4000); if (k[0] !== 'X') map[k[0] + ((+k.slice(1)) >> 14)] = w * 0x4000; }
      const opt = (v, t) => `<option value="${v}">${t}</option>`;
      let h = opt('0:0', 'CPU 64K');
      for (let i = 0; i < nr; i++) h += opt('1:' + i, 'RAM ' + hex2(i) + (map['R' + i] !== undefined ? ' @' + hex4(map['R' + i]) : ''));
      for (let i = 0; i < no; i++) h += opt('2:' + i, 'ROM ' + hex2(i) + (map['O' + i] !== undefined ? ' @' + hex4(map['O' + i]) : ''));
      const sel = $('dgamsrc'); if (sel.innerHTML !== h) sel.innerHTML = h;
      if (msrc && mpage >= (msrc === 1 ? nr : no)) { msrc = 0; mpage = 0; }
      sel.value = msrc + ':' + mpage;
    }
    function memSrc(src, page, at) { // at: offset / address for the cursor
      msrc = src; mpage = page; memCurs = Math.min(memEnd(), at || 0); nib = null; memSrcList(); layout(); setMemTop(memCurs - (memCurs % memCols)); drawMem();
    }
    const KIND = ['Z80', 'RAM', 'ROM', 'IN', 'OUT', 'INT'];
    const fw = api.floatWin(win, 'dgapos', () => {
      const vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.round((vw - win.offsetWidth) / 2)), y: 60 };
    });
    api.edgeResize(win, { minW: () => Math.min(360, document.documentElement.clientWidth - 4), minH: 260, end: (r) => { api.store('dgasize', JSON.stringify({ w: r.width, h: r.height })); layout(); } });
    try { const s = JSON.parse(api.load('dgasize')); if (s && s.w > 200 && s.h > 150) { win.style.width = s.w + 'px'; win.style.height = s.h + 'px'; } } catch (e) {}
    if (window.ResizeObserver) new ResizeObserver(() => { if (open) layout(); }).observe(win);

    // ---- one instruction: { len, text, plain } (text with labels, plain with numbers)
    function ins(a) {
      const e = E(), n = e.web_dga_dis(a & 0xFFFF, 1), text = api.cstr(e.web_txt());
      e.web_dga_dis(a & 0xFFFF, 0); const plain = api.cstr(e.web_txt());
      return { len: n || 1, text, plain };
    }
    // the instruction that ends at a: from up to 24 bytes back, the walk that lands on a from the earliest start
    function prevAddr(a) {
      a &= 0xFFFF;
      for (let s = 24; s >= 1; s--) { // the farthest start that walks exactly onto a: the most likely real code
        let p = (a - s) & 0xFFFF, before = -1, left = s;
        while (left > 0) { const l = E().web_dga_dis(p, 0) || 1; if (l > left) break; before = p; p = (p + l) & 0xFFFF; left -= l; }
        if (left === 0 && before >= 0) return before;
      }
      return (a - 1) & 0xFFFF;
    }
    const ulabel = (a) => { const p = E().web_dga_label(a & 0xFFFF); return p ? api.cstr(p) : ''; }; // the Unreal debugger's labels
    const label = (a) => prj.l[pk(a)] || ulabel(a); // ours first

    // ---- the project (after Xpeccy's .xmap): marks of data (B bytes, W words, A address words, T text; code has none),
    // labels and comments — each by the physical byte (RAM / ROM page and offset), so they stay with their code on any
    // paging. Kept in the browser per model; Save / Load as an .xmap file.
    const pkRaw = (a) => { const v = E().web_dga_phys(a & 0xFFFF); return v & 0x80000000 ? 'X' + (a & 0xFFFF) : v & 0x40000000 ? 'O' + (v & 0x3FFFFFFF) : 'R' + v; };
    const pk = (a) => pkRaw(a); // R<ram offset> / O<rom offset> / X<z80 address> (cache, other)
    let prj = { t: {}, l: {}, c: {} }, prjModel = '', prjSave = 0;
    // the project name (file of Save .xmap): typed, or the loaded file; kept per model
    const prjName = $('dgaprjn');
    function prjFile(ext) { let n = prjName.value.trim().replace(/[\\/:*?"<>|]/g, '_'); if (!n) n = defName(); return n.replace(/\.xmap$/i, '') + ext; }
    function defName() { const d = (api.diskName() || '').replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, ''); return (d || prjModel.toLowerCase() || 'project') + '.xmap'; }
    function setPrjName(n) { prjName.value = n || ''; api.store('dga.prjname.' + prjModel, prjName.value); }
    prjName.addEventListener('focus', () => { if (!prjName.value.trim()) setPrjName(defName()); requestAnimationFrame(() => { const n = prjName.value.length; try { prjName.setSelectionRange(n, n); } catch (e) {} }); }); // the caret at the end (no selection)
    prjName.addEventListener('change', () => setPrjName(prjName.value.trim() ? prjFile('.xmap') : ''));
    prjName.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); prjName.blur(); win.focus({ preventScroll: true }); } });
    function prjLoad() {
      prjModel = api.model(); prj = { t: {}, l: {}, c: {} }; prjName.value = api.load('dga.prjname.' + prjModel) || '';
      try { const j = JSON.parse(api.load('dga.prj.' + prjModel)); if (j && j.t) prj = { t: j.t || {}, l: j.l || {}, c: j.c || {} }; } catch (e) {}
    }
    function prjChanged() { clearTimeout(prjSave); prjSave = setTimeout(() => api.store('dga.prj.' + prjModel, JSON.stringify(prj)), 300); }
    const typeAt = (a) => prj.t[pk(a & 0xFFFF)] || 'C';
    function cpuOf(k) { // the Z80 address where a physical byte is now (-1: not mapped)
      if (k[0] === 'X') return +k.slice(1);
      for (let w = 0; w < 4; w++) { const b = pkRaw(w * 0x4000); if (b[0] !== k[0]) continue; const o = +k.slice(1) - +b.slice(1); if (o >= 0 && o < 0x4000) return w * 0x4000 + o; }
      return -1;
    }
    function labelAddr(name) { // a label (ours, then the Unreal debugger's are not searched) → Z80 address
      for (const [k, v] of Object.entries(prj.l)) if (v.toLowerCase() === name.toLowerCase()) return cpuOf(k);
      return -1;
    }
    const isText = (v) => v >= 32 && v < 127 && v !== 34;
    // one line of the listing at a: { len, text, plain, data }
    function line(a) {
      a &= 0xFFFF;
      const t = typeAt(a), pe = (x) => E().web_peek(x & 0xFFFF);
      const grow = (step, max, align) => { let n = step; while (n < max && a + n <= 0xFFFF && typeAt(a + n) === t && !prj.l[pk(a + n)] && !prj.c[pk(a + n - step)] && ((a + n) % align)) n += step; return n; };
      if (t === 'B') { const n = grow(1, 8, 8); const b = []; for (let i = 0; i < n; i++) b.push('#' + hex2(pe(a + i))); return { len: n, text: 'db ' + b.join(','), plain: '', data: 1 }; }
      if (t === 'T') {
        const n = grow(1, 16, 16); const parts = []; let str = '';
        for (let i = 0; i < n; i++) { const v = pe(a + i); if (isText(v)) str += String.fromCharCode(v); else { if (str) { parts.push('"' + str + '"'); str = ''; } parts.push('#' + hex2(v)); } }
        if (str) parts.push('"' + str + '"');
        return { len: n, text: 'db ' + parts.join(','), plain: '', data: 1 };
      }
      if (t === 'W' || t === 'A') {
        const v = pe(a) | (pe(a + 1) << 8), lb = t === 'A' ? label(v) : '';
        return { len: 2, text: 'dw ' + (lb || '#' + hex4(v)), plain: '', data: 1 };
      }
      const x = ins(a);
      // our labels in the operands (4-digit hex numbers the disassembler printed)
      const text = x.text.replace(/\b([0-9A-F]{4})\b/g, (m, h) => { const n = prj.l[pk(parseInt(h, 16))]; return n || m; });
      return { len: x.len, text, plain: x.plain, data: 0 };
    }
    function prevLine(a) { // the line that ends at a (data lines from their own run; code: prevAddr)
      a &= 0xFFFF;
      const p = (a - 1) & 0xFFFF, t = typeAt(p);
      if (t === 'B' || t === 'T') { const al = t === 'B' ? 8 : 16; let q = p; while (q % al && typeAt(q - 1) === t && !prj.l[pk(q)] && !prj.c[pk(q - 1)]) q--; return q; }
      if (t === 'W' || t === 'A') return typeAt((a - 2) & 0xFFFF) === t ? (a - 2) & 0xFFFF : p;
      return prevAddr(a);
    }

    // ---- the jump of the instruction at PC: where to, and does it go (condition)
    function jumpInfo(a, plain, r) {
      const m = /^\s*(jp|jr|call|ret|djnz|rst|reti|retn)\b\s*(nz|z|nc|c|po|pe|p|m)?\s*,?\s*(.*)$/i.exec(plain);
      if (!m) return null;
      const op = m[1].toLowerCase(), cc = m[2] && m[2].toLowerCase(), arg = (m[3] || '').trim().toLowerCase(), f = r[0] & 0xFF;
      let to = null;
      if (op.startsWith('ret')) to = E().web_peek(r[10]) | (E().web_peek((r[10] + 1) & 0xFFFF) << 8);
      else if (arg === '(hl)') to = r[3]; else if (arg === '(ix)') to = r[8]; else if (arg === '(iy)') to = r[9];
      else { const n = /([0-9a-f]{2,4})h?$/i.exec(arg); if (n) to = parseInt(n[1], 16); }
      let go = true;
      if (op === 'djnz') go = ((r[1] >> 8) & 0xFF) !== 1;
      else if (cc && COND[cc] && !(op === 'jp' && arg.startsWith('('))) go = COND[cc](f);
      return { to, go };
    }

    // ---- drawing (only while stopped: no page changes while the machine runs)
    function layout() {
      if (!open) return;
      win.classList.toggle('narrow', win.clientWidth < 520); // phone: registers and stack under the listing
      const rh = 16;
      rows = Math.max(4, Math.floor(dis.clientHeight / rh));
      memRows = Math.max(1, Math.floor(mem.clientHeight / rh));
      const cols = mem.clientWidth > 520 ? 16 : 8;
      if (cols !== memCols || !mem.firstChild) { memCols = cols; mem.innerHTML = '<div class="mrows"></div><div class="mpad"></div>'; }
      mem.lastChild.style.height = Math.max(0, (memSize() / memCols - memRows) * rh) + 'px'; // the whole 64K (16K page) under the scroll bar
      setMemTop(memTop);
      render();
    }
    function render() {
      if (!open || !E()) return;
      win.classList.toggle('dgarun', !stopped);
      if (lastE !== E()) apply(); // a new machine (model switch): its tables are empty
      $('dgastate').textContent = stopped ? 'stopped' + (hitText ? ' · ' + hitText : '') : 'running';
      $('dgarun').textContent = stopped ? 'Run' : 'Stop';
      win.querySelectorAll('[data-c]').forEach((b) => { b.disabled = !stopped; });
      if (!stopped) return;
      const r = E().web_dga_regs(), regs = Array.from(new Uint32Array(E().memory.buffer, r, 20));
      if (!last || regs.join() !== last.join()) { prev = last; last = regs; }
      drawRegs(regs); drawDis(regs); drawStack(regs);
      drawWatch();
      if (tab === 'mem') { memSrcList(); drawMem(); } else if (tab === 'scr') drawScr(); else if (tab === 'dev') drawDev(); else drawBps();
    }
    function drawRegs(r) {
      const p = prev || r, ch = (i) => (p[i] !== r[i] ? ' class="chg"' : '');
      let h = '<div class="dgargrid">';
      REGS.forEach((n, i) => { h += `<span class="n">${n}</span><span data-r="${i}"${ch(i)} title="Click to edit">${hex4(r[i])}</span>`; });
      h += `<span class="n">IM</span><span data-r="13"${ch(13)}>${r[13]}</span><span class="n">IFF</span><span data-r="14"${ch(14)} title="IFF1 (click: toggle)">${r[14]}${r[15]}</span>`;
      h += '</div><div class="dgaflags">';
      for (const [n, b] of FLAGS) h += `<span data-f="${b}" class="${r[0] & b ? 'on' : ''}" title="Flag ${n} (click: toggle)">${n}</span>`;
      h += `</div><div class="dgat">T ${r[17]} / ${r[18]}${r[16] ? ' · HALT' : ''}</div>`;
      const pages = [0, 1, 2, 3].map((a) => { const pg = E().web_gfx_page ? E().web_gfx_page(a) : -1; return pg < 0 ? 'ROM' : 'R' + pg; });
      h += `<div class="dgat">#7FFD ${hex2(E().web_p7ffd())} · ${pages.join(' ')}</div>`;
      $('dgaregs').innerHTML = h;
    }
    function drawDis(r) {
      const pc = r[11];
      let a = top, h = '';
      for (let i = 0; i < rows; i++) {
        const x = line(a), lb = label(a), cm = prj.c[pk(a)] || '', bp = bpAt(a) >= 0, ubp = !bp && (E().web_dga_bp(a, 0) & 0x40); // ours / the Unreal debugger's
        let hint = '';
        if (a === pc && !x.data) { const j = jumpInfo(a, x.plain, r); if (j) hint = `<span class="hint ${j.go ? 'go' : 'no'}">${j.go ? '→' : '×'}${j.to !== null ? ' ' + hex4(j.to) : ''}</span>`; }
        h += `<div class="dl${a === pc ? ' pc' : ''}${a === curs ? ' cur' : ''}${bp ? ' bp' : ubp ? ' ubp' : ''}${inSel(a) ? ' sel' : ''}${x.data ? ' data' : ''}" data-a="${a}"><span class="bpm" title="Breakpoint (click / Space)"></span><span class="ad">${hex4(a)}</span><span class="lb">${esc(lb)}</span><span class="tx">${esc(x.text)}</span>${hint}${cm ? '<span class="cm">; ' + esc(cm) + '</span>' : ''}</div>`;
        a = (a + x.len) & 0xFFFF;
      }
      dis.innerHTML = h; dis.dataset.end = a;
    }
    function drawMem() {
      if (!mem.firstChild) return;
      let h = '';
      for (let i = 0; i < memRows; i++) {
        const a = memTop + i * memCols; if (a > memEnd()) break;
        let hx = '', tx = '';
        for (let k = 0; k < memCols; k++) {
          const b = (a + k) & memEnd(), v = mrd(b);
          hx += `<span data-m="${b}"${b === memCurs ? ' class="cur"' : ''}>${b === memCurs && nib !== null ? nib.toString(16).toUpperCase() + '_' : hex2(v)}</span>`;
          tx += v >= 32 && v < 127 ? esc(String.fromCharCode(v)) : '.';
        }
        h += `<div class="ml"><span class="ad">${mAd(a)}</span>${hx}<span class="tx">${tx}</span></div>`;
      }
      mem.firstChild.innerHTML = h;
    }
    // the dump: rows of memCols bytes from 0000 to FFFF (no wrap), its own scroll bar
    const memMax = () => Math.max(0, memSize() - memRows * memCols);
    function setMemTop(v) {
      memTop = Math.max(0, Math.min(memMax(), v - (v % memCols)));
      const st = (memTop / memCols) * 16; if (Math.abs(mem.scrollTop - st) > 1) { memScrollSet = true; mem.scrollTop = st; }
    }
    let memScrollSet = false;
    mem.addEventListener('scroll', () => {
      if (memScrollSet) { memScrollSet = false; return; }
      memTop = Math.min(memMax(), Math.round(mem.scrollTop / 16) * memCols); if (stopped) drawMem();
    });
    // ---- ZX screen of a RAM page (6144 pixels + 768 attributes), as the stop left it
    const scv = $('dgascv'), scx = scv.getContext('2d'); let scImg = scx.createImageData(256, 192);
    // -3 As Shown: the last picture drawn (any mode); -2 TSframe: the TS-Conf video frame; -1 ZXScr: the ZX screen of the page shown now
    // (#7FFD bit 3: 7, else 5); -4 / -5 CPM: the ATM picture drawn from the RAM now, the video page shown / the other one; 0..: a RAM page as a ZX screen
    let scrPage = -1;
    const scrNow = () => { const c = (E().web_p7ffd() & 8) ? 7 : 5; return scrPage >= 0 ? scrPage : scrPage === -6 ? c ^ 2 : c; }; // -6: the other ZX screen
    const tsOn = () => api.tsOn && api.tsOn() && E().web_ts_frame;
    function scrSize(w, h) { if (scv.width !== w || scv.height !== h) { scv.width = w; scv.height = h; scImg = scx.createImageData(w, h); } }
    function drawScr() {
      const e = E(), nr = e.web_gfx_size(1) >> 14, pg = Math.min(scrNow(), nr - 1), ts = tsOn();
      const fw = e.web_fb_w(), fh = e.web_fb_h(), cur = (e.web_p7ffd() & 8) ? 7 : 5, atm = !!(e.web_scr_atm && e.web_scr_atm(cur));
      if ((scrPage === -2 && !ts) || ((scrPage === -4 || scrPage === -5) && !atm)) scrPage = -1;
      const sel = $('dgascrsrc'); let h = '<option value="-3">As Shown</option>' + (ts ? '<option value="-2">TSframe</option>' : '') + `<option value="-1">ZXScr (${hex2(cur)})</option><option value="-6">ZXScr (${hex2(cur ^ 2)})</option>`;
      if (atm) h += `<option value="-4">CPM (${hex2(cur)})</option><option value="-5">CPM (${hex2(cur ^ 2)})</option>`;
      for (let i = 0; i < nr; i++) h += `<option value="${i}">RAM ${hex2(i)}</option>`;
      if (sel.dataset.h !== h) { sel.innerHTML = h; sel.dataset.h = h; } sel.value = String(scrPage);
      if (scrPage === -3) { // the last picture the emulator drew: whatever the mode (ATM CP/M text and EGA, TS-Conf, ZX with the border)
        scrSize(fw, fh); new Uint32Array(scImg.data.buffer).set(new Uint32Array(e.memory.buffer, e.web_fb(), fw * fh)); scx.putImageData(scImg, 0, 0); scrFit(); return;
      }
      if ((scrPage === -4 || scrPage === -5)) { // ATM: the screen as the video would draw it from the RAM now (the modes of the last frame), page 5 or 7
        const p = e.web_scr_atm(scrPage === -4 ? cur : cur ^ 2);
        scrSize(fw, fh); new Uint32Array(scImg.data.buffer).set(new Uint32Array(e.memory.buffer, p, fw * fh)); scx.putImageData(scImg, 0, 0); scrFit(); return;
      }
      if (scrPage === -2) { // the frame buffer of the TS video: 720×576 (doubled), every other pixel
        scrSize(360, 288); const fb = new Uint32Array(e.memory.buffer, e.web_ts_frame(), 720 * 576), px = new Uint32Array(scImg.data.buffer);
        for (let y = 0; y < 288; y++) for (let x = 0; x < 360; x++) px[y * 360 + x] = fb[y * 1440 + x * 2] | 0xFF000000;
        scx.putImageData(scImg, 0, 0); scrFit(); return;
      }
      scrSize(256, 192);
      const ram = new Uint8Array(e.memory.buffer, e.web_gfx_mem(1, 0, 0) + pg * 0x4000, 0x1B00);
      const pal = new Uint32Array(e.memory.buffer, e.web_gfx_pal(), 16).slice(), px = new Uint32Array(scImg.data.buffer);
      for (let y = 0; y < 192; y++) {
        const ro = ((y & 0xC0) << 5) | ((y & 7) << 8) | ((y & 0x38) << 2), ao = 0x1800 + (y >> 3) * 32;
        for (let c = 0; c < 32; c++) {
          const b = ram[ro + c], at = ram[ao + c], br = (at & 0x40) ? 8 : 0, ink = pal[(at & 7) | br], pap = pal[((at >> 3) & 7) | br];
          for (let k = 0; k < 8; k++) px[y * 256 + c * 8 + k] = (b & (0x80 >> k)) ? ink : pap;
        }
      }
      scx.putImageData(scImg, 0, 0); scrFit();
    }
    // the size on the page: 1:1 at most, smaller when the pane is smaller; set from the pane only, so the pointer or the
    // hint text never change it
    function scrFit() {
      const box = $('dgascr'), W = box.clientWidth - 8, H = box.clientHeight - 8; if (W <= 0 || H <= 0) return;
      const k = Math.min(1, W / scv.width, H / scv.height), w = Math.floor(scv.width * k) + 'px', h = Math.floor(scv.height * k) + 'px';
      if (scv.style.width !== w) scv.style.width = w; if (scv.style.height !== h) scv.style.height = h;
    }
    if (window.ResizeObserver) new ResizeObserver(scrFit).observe($('dgascr'));
    function scrAt(e) { // pixel under the pointer: { x, y, pix offset, attr offset }
      const r = scv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) * scv.width / r.width), y = Math.floor((e.clientY - r.top) * scv.height / r.height);
      if (x < 0 || y < 0 || x >= scv.width || y >= scv.height) return null;
      if (scrPage === -4 || scrPage === -5) { // ATM: the byte under the point in the video mode of that line
        const c = (E().web_p7ffd() & 8) ? 7 : 5, pg = scrPage === -4 ? c : c ^ 2, a = new Int32Array(E().memory.buffer, E().web_atm_at(pg, x, y), 5);
        return a[0] < 0 ? { x, y, ts: 1 } : { x, y, atm: a[0], p: a[1], a: a[2], mx: a[3], my: a[4] };
      }
      if (scrPage < -1 && scrPage !== -6) return { x, y, ts: 1 };
      if (x < 0 || y < 0 || x > 255 || y > 191) return null;
      return { x, y, p: ((y & 0xC0) << 5) | ((y & 7) << 8) | ((y & 0x38) << 2) | (x >> 3), a: 0x1800 + (y >> 3) * 32 + (x >> 3) };
    }
    const AMODE = { 0: 'EGA', 2: 'hires', 6: 'text' };
    scv.addEventListener('pointermove', (e) => { const q = scrAt(e); $('dgascrinfo').textContent = q && q.atm !== undefined ? `${AMODE[q.atm]} ${q.atm === 6 ? 'col' : 'x'} ${q.mx} ${q.atm === 6 ? 'row' : 'y'} ${q.my} · ${q.atm === 6 ? 'char' : 'pixel'} ${pa(q.p)}` + (q.a >= 0 ? ` · attr ${pa(q.a)}` : '') : q && q.ts ? `x ${q.x} y ${q.y} of ${scv.width}×${scv.height}` + (scrPage === -2 ? ' (the 256×192 ZX area from x 52 y 48)' : '') : q ? `x ${q.x} y ${q.y} · pixel ${hex2(scrNow())}:${hex4(q.p)} · attr ${hex2(scrNow())}:${hex4(q.a)}` : ''; });
    scv.addEventListener('click', (e) => {
      const q = scrAt(e); if (!q || q.ts || !stopped) return; setTab('mem');
      if (q.atm !== undefined) { const v = e.shiftKey && q.a >= 0 ? q.a : q.p; memSrc(1, v >> 14, v & 0x3FFF); } else memSrc(1, scrNow(), e.shiftKey ? q.a : q.p);
      setPane('mem');
    }); // the byte in the dump (Shift: its attribute)
    $('dgascrsrc').onchange = () => { scrPage = +$('dgascrsrc').value; $('dgascrinfo').textContent = scrPage === -2 ? 'the TS-Conf picture as the video drew it' : scrPage === -3 ? 'the last picture drawn, as on the screen' : 'click: the byte in the dump (Shift: its attribute)'; if (stopped) drawScr(); };
    // ---- watches (side, under the stack): address, label or register; 4 bytes there; a press: the dump from it
    let watches = []; try { const j = JSON.parse(api.load('dga.watch')); if (Array.isArray(j)) watches = j.filter((x) => typeof x === 'string'); } catch (e) {}
    const RNAMES = { AF: 0, BC: 1, DE: 2, HL: 3, "AF'": 4, "BC'": 5, "DE'": 6, "HL'": 7, IX: 8, IY: 9, SP: 10, PC: 11 };
    function watchAddr(x) {
      const t = x.trim().replace(/^\((.*)\)$/, '$1').toUpperCase();
      if (RNAMES[t] !== undefined) return last ? last[RNAMES[t]] & 0xFFFF : NaN;
      const n = /^[0-9A-F]{1,4}$/.test(t) ? parseInt(t, 16) : num(x.trim().replace(/^\((.*)\)$/, '$1'));
      return isFinite(n) ? n & 0xFFFF : NaN;
    }
    function drawWatch() {
      let h = '';
      watches.forEach((w, i) => {
        const a = watchAddr(w), b = isFinite(a) ? [0, 1, 2, 3].map((k) => hex2(E().web_peek((a + k) & 0xFFFF))).join(' ') : '?';
        h += `<div class="wl" data-w="${i}" title="${esc(w)}: the dump from here"><span class="wn">${esc(w.length > 6 ? w.slice(0, 6) + '…' : w)}</span><span class="wa">${isFinite(a) ? hex4(a) : '----'}</span><span>${b}</span><span class="wx" data-x="${i}" title="Remove">×</span></div>`;
      });
      const wl = $('dgawatch'), inp = wl.querySelector('input');
      if (inp) return; // typing a new one
      if (wl.innerHTML !== h) wl.innerHTML = h || '<div class="dgat">+ : address, label, HL, (IX)…</div>';
    }
    function watchAdd() {
      const wl = $('dgawatch'); if (wl.querySelector('input')) return;
      const inp = document.createElement('input'); inp.placeholder = '8000 · LABEL · HL'; inp.spellcheck = false; wl.appendChild(inp); inp.focus();
      let done = false;
      const fin = (ok) => { if (done) return; done = true; const v = inp.value.trim(); inp.remove(); if (ok && v) { watches.push(v); api.store('dga.watch', JSON.stringify(watches)); } if (stopped) drawWatch(); win.focus({ preventScroll: true }); };
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); fin(true); } else if (e.key === 'Escape') { e.preventDefault(); fin(false); } });
      inp.addEventListener('blur', () => fin(true));
    }
    $('dgawadd').onclick = (e) => { e.stopPropagation(); setPane('side', true); watchAdd(); };

    // ---- Devices: AY, WD1793, tape (as the stop left them; read only, a tape block can be chosen)
    const ENV = ['\\___', '\\___', '\\___', '\\___', '/|__', '/|__', '/|__', '/|__', '\\\\\\\\', '\\___', '\\/\\/', '\\|~~', '////', '/~~~', '/\\/\\', '/|__'];
    // TS-Conf: the registers of the configuration, the memory, INT, DMA, the palette (CRAM) and the sprites (SFILE)
    const VM = ['ZX', '16c', '256c', 'text'], RES = ['256×192', '320×200', '320×240', '360×288'];
    function tsDev(e) {
      const v = new Uint32Array(e.memory.buffer, e.web_ts_info(), 40), r = (k) => `<span class="k">${k}</span>`;
      const [vconf, vpage, gx, gy, tsc, palsel, border, tmpage, t0g, t1g, sg, t0x, t0y, t1x, t1y, p0, p1, p2, p3, memconf, sysconf, intmask, hsint, vsint, vsinc, fmaddr, fddvirt, dsa, dda, dlen, dnum, mult, vdos, intf, cache, p7ffd, lock] = v;
      let h = '<div class="dv"><h6>TS-Conf video</h6>';
      h += `<div>${r('VConfig')}${hex2(vconf)} · ${VM[vconf & 3]} ${RES[vconf >> 6]}${vconf & 0x20 ? ' · no gfx' : ''}${vconf & 0x10 ? ' · no TSU' : ''}${vconf & 4 ? ' · FT812' : ''}</div>`;
      h += `<div>${r('VPage')}${hex2(vpage)} · ${r('scroll')}X ${gx} Y ${gy} · ${r('border')}${hex2(border)}</div>`;
      h += `<div>${r('PalSel')}${hex2(palsel)} · gfx ${palsel & 15} · T0 ${(palsel >> 4) & 3} T1 ${palsel >> 6}</div>`;
      h += `<div>${r('TSConfig')}${hex2(tsc)} · ${tsc & 0x20 ? 'T0' : '<span class="dim">T0</span>'}${tsc & 4 ? '+z' : ''} ${tsc & 0x40 ? 'T1' : '<span class="dim">T1</span>'}${tsc & 8 ? '+z' : ''} ${tsc & 0x80 ? 'S' : '<span class="dim">S</span>'}</div>`;
      h += `<div>${r('pages')}TMap ${hex2(tmpage)} · T0G ${hex2(t0g)} · T1G ${hex2(t1g)} · SG ${hex2(sg)}</div>`;
      h += `<div>${r('T0 XY')}${t0x} ${t0y} · ${r('T1 XY')}${t1x} ${t1y}</div></div>`;
      h += '<div class="dv"><h6>TS-Conf system</h6>';
      h += `<div>${r('pages')}${hex2(p0)} ${hex2(p1)} ${hex2(p2)} ${hex2(p3)}${vdos ? ' · vDOS' : ''}</div>`;
      h += `<div>${r('MemConfig')}${hex2(memconf)} · ${memconf & 8 ? 'RAM' : 'ROM'} at 0${memconf & 4 ? ' · no map' : ''}${memconf & 2 ? ' · W0 write' : ''} · #7FFD ${['512K', '128K', 'auto', '1024K'][memconf >> 6]}${lock ? ' · locked (bit 5)' : ''}</div>`;
      h += `<div>${r('SysConfig')}${hex2(sysconf)} · ${3.5 * mult} MHz${sysconf & 4 ? ' · cache' : ''} · ${r('#7FFD')}${hex2(p7ffd)}</div>`;
      h += `<div>${r('FMAddr')}${hex2(fmaddr)}${fmaddr & 0x10 ? ' · files at #' + hex2(fmaddr & 15).slice(1) + '000' : ''} · ${r('FDDVirt')}${hex2(fddvirt)}</div>`;
      h += `<div>${r('INT')}mask ${hex2(intmask)} · line ${hsint} · Y ${vsint} +${vsinc} · ${['frame', 'line', 'DMA'].map((n, i) => intf & (1 << i) ? n : `<span class="dim">${n}</span>`).join(' ')}</div>`;
      h += `<div>${r('DMA')}src ${hex6(dsa)} → ${hex6(dda)} · len ${dlen} (${(dlen + 1) * 2} b) · num ${dnum}</div></div>`;
      const pal = new Uint32Array(e.memory.buffer, e.web_ts_pal(), 256), col = (c) => '#' + [c & 255, (c >> 8) & 255, (c >> 16) & 255].map((x) => x.toString(16).padStart(2, '0')).join('');
      h += '<div class="dv"><h6>CRAM</h6><div class="tspal">';
      for (let i = 0; i < 256; i++) h += `<i style="background:${col(pal[i])}" title="${hex2(i)}${(i >> 4) === (palsel & 15) ? ' · gfx' : ''}"${(i >> 4) === (palsel & 15) ? ' class="g"' : ''}></i>`;
      h += '</div></div>';
      if (e.web_ts_sfile) {
        const sf = new Uint16Array(e.memory.buffer, e.web_ts_sfile(), 256); let n = 0, lst = '';
        for (let i = 0; i < 85; i++) {
          const w0 = sf[i * 3], w1 = sf[i * 3 + 1], w2 = sf[i * 3 + 2];
          if (w0 & 0x2000) { n++; lst += `<div><span class="k">${String(i).padStart(2)}</span>X ${w1 & 511} Y ${w0 & 511} · ${((w1 >> 9) & 7) * 8 + 8}×${((w0 >> 9) & 7) * 8 + 8} · tile ${hex4(w2 & 0xFFF).slice(1)} pal ${w2 >> 12}${w1 & 0x8000 ? ' · X flip' : ''}${w0 & 0x8000 ? ' · Y flip' : ''}</div>`; }
          if (w0 & 0x4000) lst += `<div class="dim">${String(i).padStart(2)} leap: the next layer</div>`;
        }
        h += `<div class="dv"><h6>Sprites · ${n} on</h6>${lst || '<span class="dim">none</span>'}</div>`;
      }
      return h;
    }
    function drawDev() {
      const e = E(), k = api.sysinfo(); let h = '';
      const sch = +k.ayscheme || 0, nay = sch === 0 ? 0 : sch >= 3 ? 2 : 1;
      if (!nay) h += '<div class="dv"><h6>AY</h6><span class="dim">off</span></div>';
      for (let c = 0; c < nay; c++) {
        const r = Array.from(new Uint8Array(e.memory.buffer, e.web_dga_ay(c), 19)), mx = r[7];
        h += `<div class="dv"><h6>AY${nay > 1 ? ' ' + (c + 1) : ''}${nay > 1 && r[17] === c ? ' · active' : ''}</h6><div class="ayr">`;
        for (let i = 0; i < 16; i++) h += `<span${r[16] === i ? ' class="sel" title="selected register"' : ''}>${hex2(r[i])}</span>`;
        h += '</div>';
        for (let ch = 0; ch < 3; ch++) {
          const per = r[ch * 2] | ((r[ch * 2 + 1] & 15) << 8), v = r[8 + ch];
          h += `<div><span class="k">${'ABC'[ch]}</span>tone ${hex4(per).slice(1)} · vol ${v & 16 ? 'env' : hex2(v & 15).slice(1)} · ${mx & (1 << ch) ? '<span class="dim">T</span>' : 'T'} ${mx & (8 << ch) ? '<span class="dim">N</span>' : 'N'}</div>`;
        }
        h += `<div><span class="k">noise</span>${hex2(r[6] & 31)}</div><div><span class="k">envelope</span>${hex4(r[11] | (r[12] << 8))} · shape ${hex2(r[13] & 15).slice(1)} ${esc(ENV[r[13] & 15])}</div>`;
        h += `<div><span class="k">ports A B</span>${hex2(r[14])} ${hex2(r[15])} <span class="dim">(mixer ${hex2(mx)})</span></div></div>`;
      }
      if (tsOn() && e.web_ts_info) h += tsDev(e);
      h += '<div class="dv"><h6>WD1793</h6>' + api.wdRows(k.wdx).slice(0, 11).map(([n, v]) => `<div><span class="k">${esc(n)}</span>${v}</div>`).join('') + '</div>';
      const tp = (k.tape || '').split('|'), cur = e.web_tape_list(), ls = api.cstr(e.web_txt()).split('\n').filter(Boolean);
      h += `<div class="dv"><h6>Tape</h6>`;
      if (cur < 0 || !ls.length) h += '<span class="dim">no tape</span>';
      else {
        h += `<div><span class="k">state</span>${tp[1] === '1' ? 'playing' : 'stopped'} · block ${cur + 1} of ${ls.length}</div>`;
        ls.forEach((t, i) => { h += `<div class="tb${i === cur ? ' cur' : ''}" data-tb="${i}" title="Play from this block">${String(i + 1).padStart(3)} ${esc(t)}</div>`; });
      }
      h += '</div>';
      const d = $('dgadev'); if (d.innerHTML !== h) d.innerHTML = h;
    }

    // ---- Fill / Save / Load of a block (in the dump's memory: Z80 64K or the chosen page)
    function form(anchor, rows, okText, ok) { // a small form under a button; rows: [label, html]; ok(get) → true closes
      formClose();
      const f = document.createElement('div'); f.className = 'dgaform'; f.id = 'dgaform';
      f.innerHTML = rows.map(([l, x]) => (l === null ? `<div class="fn">${x}</div>` : `<label>${l}</label>${x}`)).join('') + `<div class="fb"><button data-f="0">Cancel</button><button data-f="1" class="primary">${okText}</button></div>`;
      document.body.appendChild(f);
      const b = anchor.getBoundingClientRect(), w = win.getBoundingClientRect();
      f.style.left = Math.max(w.left + 2, Math.min(b.left, w.right - f.offsetWidth - 2)) + 'px';
      f.style.top = Math.max(2, b.top - f.offsetHeight - 4) + 'px';
      const get = (n) => f.querySelector('[name="' + n + '"]');
      const go = () => { if (ok(get)) { formClose(); win.focus({ preventScroll: true }); } };
      f.addEventListener('click', (e) => { const x = e.target.closest('[data-f]'); if (!x) return; if (x.dataset.f === '1') go(); else { formClose(); win.focus({ preventScroll: true }); } });
      f.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); go(); } else if (e.key === 'Escape') { e.preventDefault(); formClose(); win.focus({ preventScroll: true }); } });
      const first = f.querySelector('input'); if (first) { first.focus(); first.select(); }
    }
    function formClose() { const f = document.getElementById('dgaform'); if (f) f.remove(); }
    const inHex = (n, v, ml) => `<input name="${n}" value="${v}" maxlength="${ml || 4}" spellcheck="false" autocomplete="off">`;
    function rangeOf(get) { // from / to (hex, labels): [a, n] or null
      const a = num(get('a').value.replace(/^([0-9a-f]+)$/i, '#$1')), b = num(get('b').value.replace(/^([0-9a-f]+)$/i, '#$1'));
      if (!isFinite(a) || !isFinite(b) || a > memEnd() || b > memEnd() || b < a) { api.toast('From / to: hex addresses, to ≥ from' + (msrc ? ' (page: 0000-3FFF)' : ''), true); return null; }
      return [a, b - a + 1];
    }
    const where = () => (msrc ? (msrc === 1 ? 'RAM ' : 'ROM ') + hex2(mpage) : 'CPU 64K');
    $('dgafill').onclick = () => form($('dgafill'), [[null, 'Fill in ' + where() + ': bytes (00, AA 55, #FF) or "text"; repeated'], ['From', inHex('a', hex4(memCurs))], ['To', inHex('b', hex4(Math.min(memEnd(), memCurs + 0xFF)))], ['With', '<input name="v" value="00" spellcheck="false" autocomplete="off">']], 'Fill', (get) => {
      const r = rangeOf(get); if (!r) return false;
      const t = get('v').value.trim(); let pat = [];
      if (/^".*"$/.test(t)) pat = [...t.slice(1, -1)].map((c) => c.charCodeAt(0) & 0xFF);
      else for (const x of t.split(/[\s,]+/).filter(Boolean)) { const n = num(/^[0-9a-f]{1,2}$/i.test(x) ? '#' + x : x); if (!isFinite(n)) { api.toast('Fill: ' + x + '?', true); return false; } pat.push(n & 0xFF); }
      if (!pat.length) { api.toast('Fill: the bytes', true); return false; }
      for (let i = 0; i < r[1]; i++) mwr(r[0] + i, pat[i % pat.length]);
      api.repaint(); drawMem(); api.toast('Filled ' + r[1] + ' bytes'); return true;
    });
    $('dgasave').onclick = () => form($('dgasave'), [[null, 'Save from ' + where() + ' (download)'], ['From', inHex('a', hex4(memCurs))], ['To', inHex('b', hex4(Math.min(memEnd(), memCurs + 0x1AFF)))],
      ['Format', '<select name="f"><option value="bin">binary (.bin)</option><option value="hob">Hobeta (.$C)</option></select>'], ['Name', `<input name="n" value="block" maxlength="8" spellcheck="false" autocomplete="off">`]], 'Save', (get) => {
      const r = rangeOf(get); if (!r) return false;
      const data = new Uint8Array(r[1]); for (let i = 0; i < r[1]; i++) data[i] = mrd(r[0] + i);
      const name = (get('n').value.trim() || 'block').replace(/[\\/:*?"<>|]/g, '_');
      if (get('f').value === 'bin') { api.download(name + '_' + hex4(r[0]) + '.bin', data); return true; }
      if (r[1] > 0xFF00) { api.toast('Hobeta: up to 255 sectors (65280 bytes)', true); return false; }
      const sec = Math.ceil(r[1] / 256), out = new Uint8Array(17 + sec * 256), hd = out.subarray(0, 17);
      const nm = name.slice(0, 8).padEnd(8, ' '); for (let i = 0; i < 8; i++) hd[i] = nm.charCodeAt(i) & 0x7F;
      hd[8] = 0x43; hd[9] = r[0] & 255; hd[10] = (r[0] >> 8) & 255; hd[11] = r[1] & 255; hd[12] = (r[1] >> 8) & 255; hd[13] = 0; hd[14] = sec; // 'C', start, length, sectors
      let cs = 0; for (let i = 0; i < 15; i++) cs += hd[i] * 257 + i; hd[15] = cs & 255; hd[16] = (cs >> 8) & 255;
      out.set(data, 17); api.download(name.trim() + '.$C', out); return true;
    });
    $('dgaload').onclick = () => api.pickFile('', (fname, d) => {
      let data = d, at = memCurs, hob = /\.\$.$/i.test(fname) && d.length >= 17;
      if (hob) { at = msrc ? memCurs : d[9] | (d[10] << 8); data = d.subarray(17, 17 + (d[11] | (d[12] << 8))); }
      form($('dgaload'), [[null, esc(fname) + ': ' + data.length + ' bytes into ' + where() + (hob ? ' (Hobeta: its start)' : '')], ['At', inHex('a', hex4(at))], ['Offset', inHex('o', '0', 6)]], 'Load', (get) => {
        const a = num('#' + get('a').value.trim()), o = parseInt(get('o').value.trim() || '0', 16);
        if (!isFinite(a) || a > memEnd()) { api.toast('At: hex address', true); return false; }
        if (!isFinite(o) || o >= data.length) { api.toast('Offset beyond the file', true); return false; }
        const n = Math.min(data.length - o, memSize() - a); for (let i = 0; i < n; i++) mwr(a + i, data[o + i]);
        memCurs = a; memKeep(); api.repaint(); api.toast('Loaded ' + n + ' bytes to ' + hex4(a) + (n < data.length - o ? ' (cut at the end)' : '')); return true;
      });
    });
    function drawStack(r) {
      let h = '';
      for (let i = -2; i < 8; i++) {
        const a = (r[10] + i * 2) & 0xFFFF, v = E().web_peek(a) | (E().web_peek((a + 1) & 0xFFFF) << 8), lb = label(v);
        h += `<div class="sl${i === 0 ? ' sp' : ''}" data-g="${v}"><span class="ad">${hex4(a)}</span>${hex4(v)}${lb ? ' <span class="lb">' + esc(lb) + '</span>' : ''}</div>`;
      }
      $('dgastack').innerHTML = h;
    }

    // ---- listing cursor and view
    function toAddr(a, keepBack) { if (!keepBack && top !== (a & 0xFFFF)) back.push(curs); curs = top = a & 0xFFFF; render(); }
    function cursorDown(n) {
      for (let i = 0; i < n; i++) {
        const nx = (curs + line(curs).len) & 0xFFFF;
        curs = nx;
        if (!inView(curs)) top = (top + line(top).len) & 0xFFFF;
      }
      render();
    }
    function cursorUp(n) {
      for (let i = 0; i < n; i++) { const p = prevLine(curs); if (curs === top) top = p; curs = p; }
      render();
    }
    function inView(a) { let p = top; for (let i = 0; i < rows; i++) { if (p === a) return true; p = (p + line(p).len) & 0xFFFF; } return false; }
    function scroll(n) {
      if (n > 0) for (let i = 0; i < n; i++) top = (top + line(top).len) & 0xFFFF;
      else for (let i = 0; i < -n; i++) top = prevLine(top);
      render();
    }
    function follow() { // Enter: the jump target of the instruction at the cursor
      const r = last; if (!r) return;
      const x = line(curs); if (x.data) return; const j = jumpInfo(curs, x.plain, r);
      if (j && j.to !== null) toAddr(j.to);
    }

    // ---- selection (Shift + arrows / Shift + click) and marking
    let selA = -1; // the other end of the selection (-1: none, the cursor line only)
    const selRange = () => { if (selA < 0) return [curs, curs]; return selA <= curs ? [selA, curs] : [curs, selA]; };
    const inSel = (a) => { if (selA < 0) return false; const [x, y] = selRange(); return a >= x && a <= y; };
    function mark(t) { // the bytes of the selected lines (or the cursor line) become t (C: code again)
      const [x, y] = selRange(), end = Math.min(0xFFFF, y + line(y).len - 1);
      for (let a = x; a <= end; a++) { const k = pk(a); if (t === 'C') delete prj.t[k]; else prj.t[k] = t; }
      // words / addresses: an even count from the start
      prjChanged(); selA = -1; curs = x; render();
    }
    // a small input over the cursor line: assemble (db / dw / Z80), label, comment
    function lineEdit(kind, first) {
      const row = dis.querySelector('.dl.cur'); if (!row || !stopped) return;
      const a = curs, k = pk(a), tx = row.querySelector(kind === 'label' ? '.lb' : kind === 'comment' ? '.cm, .tx' : '.tx');
      const inp = document.createElement('input'); inp.className = 'dgaline';
      inp.value = first !== undefined ? first : kind === 'label' ? (prj.l[k] || '') : kind === 'comment' ? (prj.c[k] || '') : line(a).text;
      inp.placeholder = kind === 'label' ? 'label' : kind === 'comment' ? 'comment' : 'ld a,#10 · db 1,2,"text" · dw #4000';
      const host = kind === 'label' ? row.querySelector('.lb') : row.querySelector('.tx');
      host.textContent = ''; host.appendChild(inp); row.classList.add('edit'); inp.focus(); if (first === undefined) inp.select();
      let done = false;
      const fin = (ok) => {
        if (done) return; done = true;
        if (ok) {
          const v = inp.value.trim();
          if (kind === 'label') { if (v && !/^[A-Za-z_.@?$][\w.@?$!]*$/.test(v)) { api.toast('Label: letters, digits, _ . @ ? $ !', true); done = false; return; } if (v) prj.l[k] = v; else delete prj.l[k]; prjChanged(); }
          else if (kind === 'comment') { if (v) prj.c[k] = v; else delete prj.c[k]; prjChanged(); }
          else if (v && !assembleAt(a, v)) { done = false; inp.classList.add('err'); return; }
        }
        render(); win.focus({ preventScroll: true });
      };
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); fin(true); } else if (e.key === 'Escape') { e.preventDefault(); fin(false); } else inp.classList.remove('err'); });
      inp.addEventListener('blur', () => { if (!done) { done = true; render(); } });
    }
    // numbers: #10 $10 0x10 10h %1010 'a' 16 (decimal), labels (ours)
    function num(t) {
      t = t.trim(); let m;
      if ((m = /^(?:#|\$|0x)([0-9a-f]+)$/i.exec(t)) || (m = /^([0-9][0-9a-f]*)h$/i.exec(t))) return parseInt(m[1], 16);
      if ((m = /^%([01]+)$/.exec(t))) return parseInt(m[1], 2);
      if ((m = /^'(.)'$/.exec(t))) return m[1].charCodeAt(0);
      if (/^\d+$/.test(t)) return parseInt(t, 10);
      const la = labelAddr(t); return la >= 0 ? la : NaN;
    }
    function splitArgs(t) { const out = []; let cur = '', q = null; for (const c of t) { if (q) { cur += c; if (c === q) q = null; } else if (c === '"' || c === "'") { q = c; cur += c; } else if (c === ',') { out.push(cur.trim()); cur = ''; } else cur += c; } if (cur.trim()) out.push(cur.trim()); return out; }
    function assembleAt(a, v) {
      const pe = (x, b) => E().web_poke(x & 0xFFFF, b & 0xFF);
      let m;
      if ((m = /^(db|defb|defm)\s+(.+)$/i.exec(v))) {
        const bytes = []; let text = true;
        for (const p of splitArgs(m[2])) { if (/^".*"$/.test(p) || /^'.{2,}'$/.test(p)) { for (const c of p.slice(1, -1)) bytes.push(c.charCodeAt(0) & 0xFF); } else { const n = num(p); if (!isFinite(n)) { api.toast('db: ' + p + '?', true); return false; } bytes.push(n & 0xFF); text = false; } }
        bytes.forEach((b, i) => { pe(a + i, b); prj.t[pk(a + i)] = text ? 'T' : 'B'; });
        prjChanged(); api.repaint(); curs = (a + bytes.length) & 0xFFFF; return true;
      }
      if ((m = /^(dw|defw)\s+(.+)$/i.exec(v))) {
        const ws = splitArgs(m[2]).map(num); if (ws.some((x) => !isFinite(x))) { api.toast('dw: numbers or labels', true); return false; }
        ws.forEach((w, i) => { pe(a + i * 2, w); pe(a + i * 2 + 1, w >> 8); prj.t[pk(a + i * 2)] = prj.t[pk(a + i * 2 + 1)] = 'W'; });
        prjChanged(); api.repaint(); curs = (a + ws.length * 2) & 0xFFFF; return true;
      }
      // Z80: our labels → hex for the assembler of the Unreal debugger
      // numbers (#10 $10 0x10 10h %1010, plain = decimal) and labels → bare hex with a leading 0 ("0a", not the register a)
      const hx = (n) => '0' + (n & 0xFFFF).toString(16);
      const src = v.replace(/'.'|(?:#|\$|0x)[0-9a-f]+\b|\b[0-9][0-9a-f]*h\b|%[01]+\b|\b\d+\b|[A-Za-z_.@?][\w.@?$!]*/gi, (w) => {
        if (w[0] === "'") return w;
        if (/^[#$%0-9]/.test(w)) { const n = num(w); return isFinite(n) ? hx(n) : w; }
        const la = labelAddr(w); return la >= 0 ? hx(la) : w; });
      api.txt(src); const n = E().web_dga_asm(a);
      if (!n) { api.toast('Cannot assemble: ' + v, true); return false; }
      for (let i = 0; i < n; i++) delete prj.t[pk(a + i)];
      prjChanged(); api.repaint(); curs = (a + n) & 0xFFFF; if (!inView(curs)) scroll(1); return true;
    }
    // the menu of a listing line (right click, long press, ☰)
    const MENU = [['C', 'Code', 'Disassemble (no mark)'], ['B', 'Bytes (db)', ''], ['W', 'Words (dw)', ''], ['A', 'Addresses (dw label)', ''], ['T', 'Text (db "…")', ''],
      ['-'], ['label', 'Label…  :', ''], ['comment', 'Comment…  ;', ''], ['asm', 'Assemble…  (type)', '']];
    function menuOpen(x, y) {
      menuClose();
      const m = document.createElement('div'); m.className = 'dgamenu'; m.id = 'dgamenu';
      m.innerHTML = MENU.map((i) => (i[0] === '-' ? '<hr>' : `<button data-m="${i[0]}" title="${i[2]}">${esc(i[1])}</button>`)).join('');
      document.body.appendChild(m);
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      m.style.left = Math.max(2, Math.min(x, vw - m.offsetWidth - 2)) + 'px'; m.style.top = Math.max(2, Math.min(y, vh - m.offsetHeight - 2)) + 'px';
      m.addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b) return; const c = b.dataset.m; menuClose(); if (c.length === 1) mark(c); else lineEdit(c === 'asm' ? 'asm' : c); });
      setTimeout(() => document.addEventListener('pointerdown', menuAway, true), 0);
    }
    function menuAway(e) { const m = document.getElementById('dgamenu'); if (e.target.closest('#dgamenu') || (m && m.dataset.by && e.target.closest('#' + m.dataset.by))) return; menuClose(); } // a press on the button of the menu: its click closes it
    function menuClose() { const m = document.getElementById('dgamenu'); if (m) m.remove(); document.removeEventListener('pointerdown', menuAway, true); }

    // ---- labels in files: "PP:AAAA name" (page, address in the page; FF: Z80 address now — SJASMPlus / Xpeccy),
    // "AAAA name", "name equ #AAAA", "name: AAAA"
    function labelsImport(text) {
      let n = 0;
      for (const ln of String(text).split(/\r?\n/)) {
        let m, k = null, name = null;
        if ((m = /^\s*([0-9a-f]{1,2}):([0-9a-f]{4})\s+([A-Za-z_.@?$][\w.@?$!]*)/i.exec(ln))) { const pg = parseInt(m[1], 16), ad = parseInt(m[2], 16); name = m[3]; k = pg === 0xFF ? pk(ad) : 'R' + (pg * 0x4000 + (ad & 0x3FFF)); }
        else if ((m = /^\s*(?:#|\$|0x)?([0-9a-f]{4})h?\s+([A-Za-z_.@?$][\w.@?$!]*)\s*$/i.exec(ln))) { k = pk(parseInt(m[1], 16)); name = m[2]; }
        else if ((m = /^\s*([A-Za-z_.@?$][\w.@?$!]*):?\s+(?:equ|=)?\s*(?:#|\$|0x)?([0-9a-f]{1,4})h?\s*$/i.exec(ln))) { k = pk(parseInt(m[2], 16)); name = m[1]; }
        if (k && name) { prj.l[k] = name; n++; }
      }
      prjChanged(); return n;
    }
    function rWin(k, o) { // the Z80 address of a RAM label: where the page is mapped now, else its usual window (5: #4000, 2: #8000, others #C000)
      const c = cpuOf(k); if (c >= 0) return c;
      const pg = o >> 14; return (pg === 5 ? 0x4000 : pg === 2 ? 0x8000 : 0xC000) | (o & 0x3FFF);
    }
    function labelsExport() {
      return Object.entries(prj.l).map(([k, v]) => { const o = +k.slice(1); return k[0] === 'R' ? hex2(o >> 14) + ':' + hex4(rWin(k, o)) + ' ' + v : k[0] === 'X' ? 'FF:' + hex4(o) + ' ' + v : null; }).filter(Boolean).join('\r\n') + '\r\n';
    }

    // ---- actions
    function cmd(n, a) { if (!stopped) return; api.cmd(n, a); }
    function bpAt(a) { return bps.findIndex((b) => b.on && b.kind === 0 && (b.acc & 1) && a >= b.a && a <= b.b); }
    function toggleBp(a) { // the listing: an execution breakpoint at one address (ours; one of the Unreal debugger goes off too)
      const i = bps.findIndex((b) => b.kind === 0 && b.acc === 1 && b.a === a && b.b === a);
      if (i >= 0) bps.splice(i, 1); else if (E().web_dga_bp(a, 0) & 0x40) E().web_dga_bp(a, 2); else bps.push({ kind: 0, acc: 1, a, b: a, port: 0, mask: 0, act: 0, on: 1, count: 0 });
      apply(); render();
    }
    // the table into the core (counters kept), maps rebuilt there; only while the window is open
    function apply() {
      const e = E(); if (!e || !e.web_dga_tab) return;
      const t = new Uint32Array(e.memory.buffer, e.web_dga_tab(), 64 * 9);
      if (lastE === e) bps.forEach((b) => { if (b._n !== undefined) b.count = t[b._n * 9 + 8]; }); // by the old places (a list change moves them)
      bps.forEach((b, i) => { t.set([b.kind, b.acc, b.a, b.b, b.port, b.mask, b.act, b.on ? 1 : 0, b.count || 0], i * 9); b._n = i; });
      e.web_dga_apply(Math.min(64, bps.length), open ? 1 : 0); lastE = e;
      api.store('dga.bps', JSON.stringify(bps.map(({ kind, acc, a, b, port, mask, act, on }) => ({ kind, acc, a, b, port, mask, act, on }))));
    }
    function counts() { const e = E(); if (!e || lastE !== e) return; const t = new Uint32Array(e.memory.buffer, e.web_dga_tab(), 64 * 9); bps.forEach((b) => { if (b._n !== undefined) b.count = t[b._n * 9 + 8]; }); }
    const pa = (v) => hex2(v >> 14) + ':' + hex4(v & 0x3FFF);
    function bpRange(b) {
      if (b.kind === 0) return '#' + hex4(b.a) + (b.b !== b.a ? '-' + hex4(b.b) : '');
      if (b.kind <= 2) return pa(b.a) + (b.b !== b.a ? '-' + pa(b.b) : '');
      if (b.kind <= 4) return '#' + hex4(b.port) + (b.mask !== 0xFFFF ? ' &' + hex4(b.mask) : '');
      return '';
    }
    const accText = (b) => (b.kind <= 2 ? (b.acc & 1 ? 'X' : '') + (b.acc & 2 ? 'R' : '') + (b.acc & 4 ? 'W' : '') : '');
    function drawBps() {
      counts();
      let h = bps.length ? '' : '<div class="none">No breakpoints. Add one above, or click the left edge of the listing.</div>';
      bps.forEach((b, i) => {
        h += `<div class="bl${i === hitIdx ? ' hit' : ''}"><input type="checkbox" data-on="${i}"${b.on ? ' checked' : ''} title="On / off"><span class="k">${KIND[b.kind]}</span><span class="r">${bpRange(b)}</span><span class="ac">${accText(b)}</span><span class="act">${b.act ? 'count' : 'stop'}</span><span class="n" title="Hits">${b.count || 0}</span><button data-del="${i}" title="Delete">✕</button></div>`;
      });
      $('dgablist').innerHTML = h;
    }
    // the add form: hex, RAM / ROM as page:offset (or linear), port + mask
    function parsePhys(t) { const m = /^\s*([0-9a-f]{1,3}):([0-9a-f]{1,4})\s*$/i.exec(t); if (m) return parseInt(m[1], 16) * 0x4000 + (parseInt(m[2], 16) & 0x3FFF); const v = parseInt(t, 16); return isFinite(v) ? v : NaN; }
    function addBp() {
      const kind = +$('dgabk').value, A = $('dgaba').value.trim(), B = $('dgabb').value.trim();
      const acc = ($('dgabx').checked ? 1 : 0) | ($('dgabr').checked ? 2 : 0) | ($('dgabw').checked ? 4 : 0);
      const b = { kind, acc: kind <= 2 ? acc : 0, a: 0, b: 0, port: 0, mask: 0xFFFF, act: +$('dgabact').value, on: 1, count: 0 };
      if (kind === 0) { b.a = parseInt(A, 16); b.b = B ? parseInt(B, 16) : b.a; }
      else if (kind <= 2) { b.a = parsePhys(A); b.b = B ? parsePhys(B) : b.a; }
      else if (kind <= 4) { b.port = parseInt(A, 16); b.mask = B ? parseInt(B, 16) : 0xFFFF; if (!isFinite(b.port) || !isFinite(b.mask)) { api.toast('Port in hex: FE, 7FFD', true); return; } b.port &= 0xFFFF; b.mask &= 0xFFFF; }
      if (kind <= 2) {
        if (!isFinite(b.a) || !isFinite(b.b) || b.b < b.a) { api.toast(kind ? 'Page:offset in hex: 05:1A00' : 'Address in hex: 8000', true); return; }
        if (!b.acc) { api.toast('Choose X, R or W', true); return; }
        if (kind === 0) { b.a &= 0xFFFF; b.b &= 0xFFFF; }
      }
      if (bps.length >= 64) { api.toast('64 breakpoints at most', true); return; }
      bps.push(b); apply(); render();
    }
    function bpFromCursor() {
      const k = +$('dgabk').value;
      if (k === 0) { $('dgaba').value = hex4(curs); return; }
      const ph = E().web_dga_phys(curs);
      if (ph & 0x80000000) { api.toast('The cursor address is not in RAM / ROM now', true); return; }
      const rom = !!(ph & 0x40000000); $('dgabk').value = rom ? '2' : '1'; $('dgaba').value = pa(ph & 0x3FFFFFFF); kindUI();
    }
    function kindUI() { const k = +$('dgabk').value; win.querySelector('.dgaacc').hidden = k > 2; $('dgaba').hidden = k === 5; $('dgabb').hidden = k === 5; $('dgabb').placeholder = k >= 3 ? 'mask' : 'to'; $('dgabcur').hidden = k > 2; }
    // .xbrk: one breakpoint per line — kind access from to action on (Xpeccy keeps its own format; this one is ours)
    function bpText() { return bps.map((b) => [KIND[b.kind], accText(b) || '-', b.kind >= 3 && b.kind <= 4 ? hex4(b.port) : hex4(b.a), b.kind >= 3 && b.kind <= 4 ? hex4(b.mask) : hex4(b.b), b.act ? 'count' : 'stop', b.on ? 'on' : 'off'].join(' ')).join('\r\n') + '\r\n'; }
    function bpParse(t) {
      const out = [];
      for (const ln of String(t).split(/\r?\n/)) {
        const f = ln.trim().split(/\s+/); if (f.length < 6) continue;
        const kind = KIND.indexOf(f[0].toUpperCase()); if (kind < 0) continue;
        const acc = (/X/i.test(f[1]) ? 1 : 0) | (/R/i.test(f[1]) ? 2 : 0) | (/W/i.test(f[1]) ? 4 : 0), x = parseInt(f[2], 16), y = parseInt(f[3], 16);
        if (!isFinite(x) || !isFinite(y)) continue;
        out.push(kind >= 3 && kind <= 4 ? { kind, acc: 0, a: 0, b: 0, port: x, mask: y, act: f[4] === 'count' ? 1 : 0, on: f[5] !== 'off' ? 1 : 0, count: 0 }
          : { kind, acc, a: x, b: y, port: 0, mask: 0xFFFF, act: f[4] === 'count' ? 1 : 0, on: f[5] !== 'off' ? 1 : 0, count: 0 });
      }
      return out.slice(0, 64);
    }
    function stopRun() { if (stopped) cmd(5); else api.stop(); }
    win.classList.add('p-dis');
    // a key of the on-screen keyboard (XT): typed into the field in use, else a key of the window (the part in use)
    const VK_PLAIN = { Space: ' ', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backquote: '`' };
    const VK_SHIFT = { Minus: '_', Equal: '+', BracketLeft: '{', BracketRight: '}', Backslash: '|', Semicolon: ':', Quote: '"', Comma: '<', Period: '>', Slash: '?', Backquote: '~' };
    function vkey(code, mods) {
      const has = (p) => [...mods].some((m) => m.startsWith(p)), shift = has('Shift'), ctrl = has('Control'), alt = has('Alt');
      let k = code, m;
      if ((m = /^Key([A-Z])$/.exec(code))) k = shift ? m[1] : m[1].toLowerCase();
      else if ((m = /^Digit(\d)$/.exec(code))) k = shift ? ')!@#$%^&*('[+m[1]] : m[1];
      else if (code in VK_PLAIN) k = shift && VK_SHIFT[code] ? VK_SHIFT[code] : VK_PLAIN[code];
      const a = document.activeElement;
      if (a && win.contains(a) && a.tagName === 'INPUT') {
        const s0 = a.selectionStart, s1 = a.selectionEnd;
        if (k.length === 1 && !ctrl && !alt) { a.setRangeText(k, s0, s1, 'end'); a.dispatchEvent(new Event('input', { bubbles: true })); return; }
        if (k === 'Backspace') { if (s0 === s1) { if (s0 > 0) a.setRangeText('', s0 - 1, s0, 'end'); } else a.setRangeText('', s0, s1, 'end'); a.dispatchEvent(new Event('input', { bubbles: true })); return; }
        if (k === 'Delete') { if (s0 === s1) a.setRangeText('', s0, s0 + 1, 'end'); else a.setRangeText('', s0, s1, 'end'); return; }
        if (k === 'ArrowLeft' || k === 'ArrowRight') { const p = Math.max(0, Math.min(a.value.length, (k === 'ArrowLeft' ? Math.min(s0, s1) - (s0 === s1 ? 1 : 0) : Math.max(s0, s1) + (s0 === s1 ? 1 : 0)))); a.setSelectionRange(p, p); return; }
        if (k === 'Home' || k === 'End') { const p = k === 'Home' ? 0 : a.value.length; a.setSelectionRange(p, p); return; }
        a.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, shiftKey: shift, ctrlKey: ctrl, altKey: alt, bubbles: false, cancelable: true })); // Enter, Esc, Tab: its own handler
        return;
      }
      if (open && !win.contains(document.activeElement)) win.focus({ preventScroll: true });
      win.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, shiftKey: shift, ctrlKey: ctrl, altKey: alt, bubbles: false, cancelable: true }));
    }
    function key(e) { // keys while the window (or the screen with the machine stopped) has the focus
      if (e.target && e.target.tagName === 'INPUT') return false;
      const k = e.key;
      if (k === 'F1' && !e.shiftKey && !e.ctrlKey && !e.altKey) { api.help(); return true; }
      if (k === 'F9') { stopRun(); return true; }
      if (!stopped) return false;
      if (k === 'F7') cmd(1); else if (k === 'F8') cmd(2); else if (k === 'F4') cmd(3, curs); else if (k === 'F6') cmd(4);
      else if (k === 'Tab') setPane(PANES[(PANES.indexOf(pane) + (e.shiftKey ? PANES.length - 1 : 1)) % PANES.length]);
      else if (pane === 'mem') {
        const span = memCols * memRows;
        if (k === 'ArrowDown') memMove(memCols); else if (k === 'ArrowUp') memMove(-memCols);
        else if (k === 'ArrowRight') memMove(1); else if (k === 'ArrowLeft') memMove(-1);
        else if (k === 'PageDown') { setMemTop(memTop + span); memMove(span); } else if (k === 'PageUp') { setMemTop(memTop - span); memMove(-span); }
        else if (k === 'Home') { memCurs = 0; memKeep(); } else if (k === 'End') { memCurs = memEnd(); memKeep(); }
        else if (/^[0-9a-f]$/i.test(k)) memType(k);
        else return false;
      } else if (pane === 'dis') {
        if ((k === 'ArrowDown' || k === 'ArrowUp' || k === 'PageDown' || k === 'PageUp') && e.shiftKey) { if (selA < 0) selA = curs; }
        else if (k.startsWith('Arrow') || k.startsWith('Page') || k === 'Home') selA = -1;
        if (k === 'ArrowDown') cursorDown(1); else if (k === 'ArrowUp') cursorUp(1);
        else if (k === 'PageDown') cursorDown(rows - 1); else if (k === 'PageUp') cursorUp(rows - 1);
        else if (k === 'Home') toAddr(last ? last[11] : curs);
        else if (k === ' ') toggleBp(curs);
        else if (k === 'Enter') follow();
        else if (k === 'Backspace') { if (back.length) toAddr(back.pop(), true); }
        else if (k === ';') lineEdit('comment'); else if (k === ':') lineEdit('label');
        else if (k === 'ContextMenu') { const r = dis.querySelector('.dl.cur'); if (r) { const b = r.getBoundingClientRect(); menuOpen(b.left + 60, b.bottom); } }
        else if (k.length === 1 && /[a-z0-9]/i.test(k) && !e.ctrlKey && !e.altKey && !e.metaKey) lineEdit('asm', k); // typing: assemble at the line
        else return false;
      } else return false;
      return true;
    }
    let nib = null; // memory typing: the first hex digit of a byte
    function memType(k) {
      if (nib === null) { nib = parseInt(k, 16); render(); return; }
      mwr(memCurs, (nib << 4) | parseInt(k, 16)); nib = null;
      memCurs = Math.min(memEnd(), memCurs + 1); memKeep(); api.repaint();
    }
    function memMove(n) { memCurs = Math.max(0, Math.min(memEnd(), memCurs + n)); memKeep(); }
    function memKeep() { // the cursor stays in view
      if (memCurs < memTop) setMemTop(memCurs);
      else if (memCurs >= memTop + memCols * memRows) setMemTop(memCurs - memCols * (memRows - 1));
      nib = null; drawMem();
    }
    // the part the keys go to: listing, registers + stack, memory, breakpoints (click in it, or Tab); lit at its left edge
    const PANES = ['dis', 'side', 'mem', 'bp', 'scr', 'dev'];
    function setPane(p, keepFocus) { // keepFocus: a press on an input / button of the part keeps its own focus
      if ((p === 'mem' || p === 'bp' || p === 'scr' || p === 'dev') && tab !== p) setTab(p);
      pane = p; PANES.forEach((x) => win.classList.toggle('p-' + x, x === p));
      if (open && !keepFocus) win.focus({ preventScroll: true });
    }
    // a value edited in place (register): a small input over it, Enter applies, Esc drops
    function editIn(el, val, apply) {
      const inp = document.createElement('input'); inp.className = 'dgaedit'; inp.value = val; inp.dataset.hex = ''; inp.maxLength = 4; inp.spellcheck = false;
      el.textContent = ''; el.appendChild(inp); inp.focus(); inp.select();
      let done = false;
      const fin = (ok) => { if (done) return; done = true; if (ok && inp.value.trim() !== '') apply(parseInt(inp.value, 16)); render(); win.focus(); };
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); fin(true); } else if (e.key === 'Escape') { e.preventDefault(); fin(false); } });
      inp.addEventListener('blur', () => fin(true));
    }

    // ---- mouse / touch
    // presses act at mousedown: the stop repaints the parts, a click (down and up on one element) could get lost
    const press = (el, fn) => el.addEventListener('mousedown', (e) => { if (e.button !== 0 || !stopped || e.target.closest('input, select, button')) return; e.preventDefault(); if (!win.contains(document.activeElement) || document.activeElement === document.body) win.focus({ preventScroll: true }); fn(e); });
    let lastDown = { a: -1, t: 0 }; // double press: go to the jump target
    press(dis, (e) => {
      const row = e.target.closest('.dl'); if (!row) return;
      const a = +row.dataset.a;
      if (e.target.closest('.bpm')) { toggleBp(a); return; }
      const dbl = lastDown.a === a && e.timeStamp - lastDown.t < 400; lastDown = { a, t: e.timeStamp };
      if (e.shiftKey) { if (selA < 0) selA = curs; } else selA = -1;
      curs = a; if (dbl) follow(); else render();
    });
    dis.addEventListener('contextmenu', (e) => { const row = e.target.closest('.dl'); if (!row || !stopped) return; e.preventDefault(); const a = +row.dataset.a; if (!inSel(a)) { selA = -1; curs = a; render(); } menuOpen(e.clientX, e.clientY); });
    let lp = 0; // long press (finger): the line menu
    dis.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; const row = e.target.closest('.dl'); if (!row) return; const x = e.clientX, y = e.clientY; clearTimeout(lp); lp = setTimeout(() => { if (!stopped) return; curs = +row.dataset.a; render(); menuOpen(x, y); }, 550); });
    for (const ev of ['pointerup', 'pointercancel', 'pointermove']) dis.addEventListener(ev, (e) => { if (ev !== 'pointermove' || Math.abs(e.movementX) + Math.abs(e.movementY) > 4) clearTimeout(lp); });
    dis.addEventListener('wheel', (e) => { if (!stopped) return; e.preventDefault(); scroll(Math.sign(e.deltaY) * 3); }, { passive: false });
    press(mem, (e) => { const b = e.target.closest('[data-m]'); if (b) { memCurs = +b.dataset.m; nib = null; drawMem(); } });
    // a press in a part makes it the one for the keys (not on its inputs / buttons)
    for (const [el, p] of [[dis, 'dis'], [win.querySelector('.dgaside'), 'side'], [mem, 'mem'], [$('dgabp'), 'bp'], [$('dgascr'), 'scr'], [$('dgadev'), 'dev']])
      el.addEventListener('pointerdown', (e) => setPane(p, !!e.target.closest('input, select, button')));
    press($('dgaregs'), (e) => {
      if (!last) return;
      const f = e.target.closest('[data-f]');
      if (f) { E().web_dga_setreg(0, last[0] ^ +f.dataset.f); api.repaint(); render(); return; }
      const v = e.target.closest('[data-r]'); if (!v || v.querySelector('input')) return;
      const i = +v.dataset.r;
      if (i === 14) { E().web_dga_setreg(14, last[14] ? 0 : 1); E().web_dga_setreg(15, last[14] ? 0 : 1); api.repaint(); render(); return; }
      if (i === 13) { E().web_dga_setreg(13, (last[13] + 1) % 3); api.repaint(); render(); return; }
      editIn(v, hex4(last[i]), (x) => { if (isFinite(x)) { E().web_dga_setreg(i, x); api.repaint(); if (i === 11) toAddr(x, true); } });
    });
    press($('dgastack'), (e) => { const s = e.target.closest('[data-g]'); if (s) toAddr(+s.dataset.g); });
    press($('dgawatch'), (e) => { const x = e.target.closest('[data-x]'); if (x) { watches.splice(+x.dataset.x, 1); api.store('dga.watch', JSON.stringify(watches)); drawWatch(); return; } const w = e.target.closest('[data-w]'); if (w) { const a = watchAddr(watches[+w.dataset.w]); if (isFinite(a)) { setTab('mem'); memSrc(0, 0, a); setPane('mem'); } } });
    press($('dgadev'), (e) => { const b = e.target.closest('[data-tb]'); if (b) { E().web_tape_set(+b.dataset.tb); drawDev(); } });
    win.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => { const c = +b.dataset.c; cmd(c, c === 3 ? curs : 0); }; });
    $('dgarun').onclick = stopRun;
    $('dgamark').onclick = (e) => { const o = document.getElementById('dgamenu'); if (o && o.dataset.by === 'dgamark') { menuClose(); return; } const r = $('dgamark').getBoundingClientRect(); setPane('dis'); menuOpen(r.left, r.bottom + 2); document.getElementById('dgamenu').dataset.by = 'dgamark'; };
    // the project menu: our own list, kept inside the window (a select's list may fall outside it)
    const PRJ_MENU = [['save', 'Save .xmap'], ['load', 'Load .xmap'], ['-'], ['lbl', 'Load labels (PP:AAAA name…)'], ['lblsave', 'Save labels'], ['-'], ['clear', 'Clear project']];
    $('dgaprj').onclick = (e) => {
      e.stopPropagation(); const o = document.getElementById('dgamenu'); menuClose(); if (o && o.dataset.by === 'dgaprj') return; // the second click closes it
      const m = document.createElement('div'); m.className = 'dgamenu'; m.id = 'dgamenu'; m.dataset.by = 'dgaprj';
      m.innerHTML = PRJ_MENU.map((i) => (i[0] === '-' ? '<hr>' : `<button data-p="${i[0]}">${esc(i[1])}</button>`)).join('');
      document.body.appendChild(m);
      const b = $('dgaprj').getBoundingClientRect(), w = win.getBoundingClientRect();
      m.style.left = Math.max(w.left + 2, Math.min(b.right - m.offsetWidth, w.right - m.offsetWidth - 2)) + 'px';
      m.style.top = Math.max(2, Math.min(b.bottom + 2, window.innerHeight - m.offsetHeight - 2)) + 'px';
      m.addEventListener('click', (ev) => { const x = ev.target.closest('[data-p]'); if (!x) return; menuClose(); prjAction(x.dataset.p); });
      setTimeout(() => document.addEventListener('pointerdown', menuAway, true), 0);
    };
    function prjAction(v) {
      if (v === 'save') { if (!prjName.value.trim()) setPrjName(defName()); api.download(prjFile('.xmap'), new TextEncoder().encode(JSON.stringify({ format: 'deBUGa xmap', version: 1, machine: prjModel, t: prj.t, l: prj.l, c: prj.c }))); }
      else if (v === 'load') api.pickFile('.xmap,.json', (name, data) => { try { const j = JSON.parse(new TextDecoder().decode(data)); if (!j || !j.t) throw new Error(); prj = { t: j.t || {}, l: j.l || {}, c: j.c || {} }; prjChanged(); setPrjName(name.replace(/^.*[\\/]/, '')); render(); api.toast(name + ': ' + Object.keys(prj.l).length + ' labels, ' + Object.keys(prj.c).length + ' comments'); } catch (err) { api.toast(name + ': not an .xmap of deBUGa', true); } });
      else if (v === 'lbl') api.pickFile('.txt,.lbl,.sym,.l,.labels', (name, data) => { const n = labelsImport(new TextDecoder('latin1').decode(data)); render(); api.toast(name + ': ' + n + ' labels'); });
      else if (v === 'lblsave') api.download(prjFile('-labels.txt'), new TextEncoder().encode(labelsExport()));
      else if (v === 'clear') api.askBox('deBUGa', 'Drop all marks, labels and comments of ' + prjModel + '?', 'Drop').then((ok) => { if (ok) { prj = { t: {}, l: {}, c: {} }; prjChanged(); render(); } });
    };
    function setTab(t) {
      tab = t; win.querySelectorAll('.dgamemh [data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
      mem.hidden = t !== 'mem'; $('dgabp').hidden = t !== 'bp'; $('dgascr').hidden = t !== 'scr'; $('dgadev').hidden = t !== 'dev';
      win.querySelector('.dgatm').hidden = t !== 'mem'; win.querySelector('.dgatb').hidden = t !== 'bp'; win.querySelector('.dgats').hidden = t !== 'scr';
      pane = t; PANES.forEach((x) => win.classList.toggle('p-' + x, x === t));
      if (t === 'bp') { kindUI(); drawBps(); } else layout();
      if (t === 'scr' && stopped) drawScr();
      if (t === 'dev' && stopped) drawDev();
    }
    win.querySelectorAll('.dgamemh [data-t]').forEach((b) => { b.onclick = () => setTab(b.dataset.t); });
    $('dgabk').onchange = kindUI;
    $('dgabadd').onclick = addBp; $('dgabcur').onclick = bpFromCursor;
    for (const id of ['dgaba', 'dgabb']) $(id).addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); addBp(); } });
    $('dgablist').addEventListener('click', (e) => {
      const d = e.target.closest('[data-del]'); if (d) { bps.splice(+d.dataset.del, 1); hitIdx = -1; apply(); render(); if (!stopped) drawBps(); return; }
      const c = e.target.closest('[data-on]'); if (c) { counts(); bps[+c.dataset.on].on = c.checked ? 1 : 0; apply(); render(); if (!stopped) drawBps(); }
    });
    $('dgabpclr').onclick = () => { bps.forEach((b) => { b.count = 0; }); lastE = null; apply(); drawBps(); };
    $('dgabpsave').onclick = () => api.download('deBUGa.xbrk', new TextEncoder().encode(bpText()));
    $('dgabpload').onclick = () => api.pickFile('.xbrk,.txt', (name, data) => { const l = bpParse(new TextDecoder().decode(data)); if (!l.length) { api.toast(name + ': no breakpoints in it', true); return; } bps = l; lastE = null; apply(); render(); drawBps(); api.toast(name + ': ' + l.length + ' breakpoints'); });
    // splitters: listing | registers, upper part / lower part (mouse and finger), sizes kept
    function splitter(el, get, set, key) {
      let d = null;
      el.addEventListener('pointerdown', (e) => { d = { id: e.pointerId, x: e.clientX, y: e.clientY, v: get() }; el.setPointerCapture(e.pointerId); el.classList.add('drag'); e.preventDefault(); e.stopPropagation(); });
      el.addEventListener('pointermove', (e) => { if (!d || e.pointerId !== d.id) return; set(d.v, e.clientX - d.x, e.clientY - d.y); layout(); });
      const end = () => { if (!d) return; d = null; el.classList.remove('drag'); api.store(key, String(get())); };
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    }
    const side = win.querySelector('.dgaside'), bot = $('dgabot');
    splitter($('dgasv'), () => side.offsetWidth, (v, dx) => { side.style.width = Math.max(150, Math.min(win.clientWidth - 220, v - dx)) + 'px'; }, 'dga.sideW');
    splitter($('dgash'), () => bot.offsetHeight, (v, dx, dy) => { bot.style.height = Math.max(60, Math.min(win.clientHeight - 150, v - dy)) + 'px'; }, 'dga.botH');
    { const w = +api.load('dga.sideW'), h = +api.load('dga.botH'); if (w > 100) side.style.width = w + 'px'; if (h > 40) bot.style.height = h + 'px'; }
    $('dgaclose').onclick = () => show(false);
    const go = (inp, fn) => inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); const v = parseInt(inp.value, 16); if (isFinite(v)) { fn(v & 0xFFFF); win.focus({ preventScroll: true }); } } else if (e.key === 'Escape') win.focus({ preventScroll: true }); }); // there: the keys go to the part again
    go($('dgago'), (v) => { setPane('dis'); toAddr(v); });
    go($('dgamemgo'), (v) => { setPane('mem'); memCurs = Math.min(memEnd(), v); setMemTop(memCurs); nib = null; drawMem(); });
    $('dgamsrc').onchange = () => { const [a, b] = $('dgamsrc').value.split(':').map(Number); memSrc(a, b, 0); setPane('mem'); };
    win.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !(e.target && e.target.tagName === 'INPUT')) { e.preventDefault(); e.stopPropagation(); show(false); return; } if (key(e)) { e.preventDefault(); e.stopPropagation(); } });

    // ---- the window
    function show(v) {
      if (v === open) { if (v) api.activate(win); return; }
      open = v; win.hidden = !v; api.changed(); apply(); // its breakpoints work only while it is open
      if (v) {
        if (prjModel !== api.model()) prjLoad();
        fw.place(); api.activate(win);
        if (api.stoppedNow()) state(true); else api.stop(); // opening it stops the machine (as in Xpeccy)
        win.focus();
      } else {
        if (stopped) { stopped = false; api.cmd(5); } // closed while stopped: the machine runs on
        api.focusScreen();
      }
    }
    const pcNow = () => new Uint32Array(E().memory.buffer, E().web_dga_regs(), 20)[11];
    function state(on) { // the debugger loop of the core entered / left
      stopped = on;
      if (on) { // why: a breakpoint of ours (the core keeps the first one that hit)
        const e = E(), h = e.web_dga_hit ? new Uint32Array(e.memory.buffer, e.web_dga_hit(), 4) : null;
        hitIdx = -1; hitText = '';
        if (h && h[0]) { hitIdx = h[0] - 1; const b = bps[hitIdx]; hitText = 'BP ' + h[0] + ': ' + ({ 1: 'exec', 2: 'read', 4: 'write', 8: 'IN', 16: 'OUT', 32: 'INT' })[h[1]] + (h[1] !== 32 ? ' #' + hex4(h[2]) : '') + (b && b.kind <= 2 && b.kind ? ' (' + KIND[b.kind] + ')' : ''); h[0] = 0; }
      }
      if (on) { const pc = pcNow(); shownPc = pc; if (!inView(pc)) top = pc; curs = pc; }
      layout();
    }
    return {
      get open() { return open; }, show, state, key, sync() { lastE = null; apply(); if (open && prjModel !== api.model()) { prjLoad(); render(); } }, // sync: a new machine instance
      refresh() { if (open && stopped) { const pc = pcNow(); if (pc !== shownPc) { shownPc = pc; if (!inView(pc)) top = pc; curs = pc; } if (!win.querySelector('.dgaline, .dgaedit')) render(); } }, // after a step: follow PC only when it moved (a plain repaint keeps the view)
      hasFocus() { return win.contains(document.activeElement); },
      vkey,
    };
  }
  window.UnrealDbga = { create };
})();
