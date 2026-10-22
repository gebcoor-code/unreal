// File Commander (BK): two panels over file sets — ZIP sets of BK tape files (.bin, overlays, data) from the server
// or from the PC, and a RAM panel (files put from the PC, files saved by BK programs). Built on the File Commander
// of the Unreal Speccy web port: the same keys, buttons, dialogs and viewer; the volumes and the viewer modes are BK ones.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const u16 = (a, o) => a[o] | (a[o + 1] << 8);
  const put16 = (a, o, v) => { a[o] = v & 255; a[o + 1] = (v >> 8) & 255; };
  const fmtSize = (n) => n >= 10240 ? Math.round(n / 1024) + 'K' : String(n);
  const oct = (v, n) => (v >>> 0).toString(8).padStart(n || 6, '0');
  const RAM_CAP = 2 * 1024 * 1024;

  // ---- BK KOI-8 (the BK's own table, devemu/Globals.h koi8tbl): 0..31 controls, 127 ■, 0240..0277 pseudographics
  const BK_HI = [
    ...' '.repeat(32),
    '¶', '┴', '♥', '┐', '╡', '├', '└', '═', '╤', '♠', '┌', '┬', '╨', '↓', '┼', '║',
    '┤', '←', '╬', '↑', '♣', '─', '╫', '│', '♦', '┘', '╪', '╥', '╧', '╞', '→', '▓',
    ...'юабцдефгхийклмнопярстужвьызшэщчъЮАБЦДЕФГХИЙКЛМНОПЯРСТУЖВЬЫЗШЭЩЧЪ'];
  const bkChar = (b) => b < 32 ? '' : b < 127 ? String.fromCharCode(b) : b === 127 ? '■' : BK_HI[b - 128];
  const bkName = (b) => { let s = ''; for (const x of b) { if (!x) break; s += bkChar(x) || ' '; } return s.trimEnd(); };

  // ---- a BK tape file (.bin): address, length, data (some carry address, length, name[16], data, checksum)
  function binInfo(d) {
    if (d.length < 4) return null;
    const addr = u16(d, 0), len = u16(d, 2);
    if (len === d.length - 4) return { addr, len, off: 4 };
    if (d.length >= 22 && len === d.length - 22) return { addr, len, off: 20 };
    return { addr, len: Math.max(0, Math.min(len || d.length - 4, d.length - 4)), off: 4, odd: true };
  }
  const splitName = (n) => { const m = /^(.*?)(?:\.([^.]*))?$/.exec(n); return { base: m[1] || n, ext: m[2] || '' }; };

  // ---- a file set: { name, files: [{ path ('DIR/NAME.EXT'), data }] } — a ZIP from the server / the PC, or RAM
  // The volume shows one directory at a time (ZIP folders: Enter opens, Backspace / ".." goes up).
  function setVolume(set, kind) {
    let path = '';
    const inDir = (f) => { const p = f.path; if (!p.startsWith(path)) return null; const rest = p.slice(path.length); return rest; };
    const vol = {
      kind, label: set.name, set,
      get path() { return '/' + path.replace(/\/$/, ''); },
      setPath(dir) { path = (dir && dir.length) ? dir.join('/') + '/' : ''; if (!set.files.some((f) => f.path.startsWith(path))) path = ''; return path ? path.slice(0, -1).split('/') : []; },
      enter(it) {
        if (it.up) path = path.replace(/[^/]+\/$/, '');
        else path += it.name + '/';
        return path ? path.slice(0, -1).split('/') : [];
      },
      list() {
        const out = [], dirs = new Set();
        if (path) out.push({ dir: true, up: true, name: '..', ext: '', size: 0, show: '' });
        set.files.forEach((f, i) => {
          const rest = inDir(f); if (rest === null) return;
          const k = rest.indexOf('/');
          if (k >= 0) { const d = rest.slice(0, k); if (!dirs.has(d)) { dirs.add(d); out.push({ dir: true, name: d, ext: '', size: 0, show: '<DIR>' }); } return; }
          const { base, ext } = splitName(rest), bi = binInfo(f.data);
          out.push({ id: f, name: base, ext, size: f.data.length, show: bi && !bi.odd ? bi.len : f.data.length, bin: bi && !bi.odd ? bi : null, sub: bi && !bi.odd ? oct(bi.addr) : '' });
        });
        const dirsFirst = out.filter((x) => x.dir && !x.up).sort((a, b) => a.name.localeCompare(b.name));
        return out.filter((x) => x.up).concat(dirsFirst, out.filter((x) => !x.dir));
      },
      free() { if (set.disk) return set.disk.free ? set.disk.free() : 0; return Math.max(0, RAM_CAP - set.files.reduce((s, f) => s + f.data.length, 0)); },
      read(it) { const { base, ext } = splitName(it.id.path.replace(/^.*\//, '')); return { name: base, ext, data: it.id.data.slice() }; },
      write(f) {
        const name = (f.name + (f.ext ? '.' + f.ext : '')).toUpperCase();
        if (set.disk) { // a disk image: the file goes into its file system (BK .bin: address from the header)
          if (!set.disk.add) throw new Error(set.disk.kind + ': read only' + (set.mounted ? ' (mounted disk)' : ''));
          const bi = binInfo(f.data), ok = bi && !bi.odd;
          set.disk.add(path, name, ok ? bi.addr : 0o1000, ok ? f.data.subarray(bi.off, bi.off + bi.len) : f.data);
          set.reload(); return;
        }
        if (f.data.length > vol.free()) throw new Error('no room (' + fmtSize(RAM_CAP) + ' per set)');
        if (set.files.some((x) => x.path.toUpperCase() === (path + name).toUpperCase())) throw new Error('file exists');
        set.files.push({ path: path + name, data: f.data.slice() });
        set.dirty = true;
      },
      del(it) {
        if (set.disk) { if (!set.disk.del) throw new Error(set.disk.kind + ': read only' + (set.mounted ? ' (mounted disk)' : '')); set.disk.del(it.id.disk); set.reload(); return; }
        const i = set.files.indexOf(it.id); if (i >= 0) set.files.splice(i, 1); set.dirty = true;
      },
      dir() { return path; },
    };
    return vol;
  }

  // ---- PDP-11 (K1801VM1) disassembler, octal: dis(rd, pc) → { len (bytes), text }; rd(addr) returns a word
  const PDP = (() => {
    const R = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'SP', 'PC'];
    const NOARG = { 0: 'HALT', 1: 'WAIT', 2: 'RTI', 3: 'BPT', 4: 'IOT', 5: 'RESET', 6: 'RTT', 7: 'MFPT', 0o10: 'START', 0o14: 'STEP', 0o240: 'NOP', 0o257: 'CCC', 0o277: 'SCC' };
    const ONE = { 0o50: 'CLR', 0o51: 'COM', 0o52: 'INC', 0o53: 'DEC', 0o54: 'NEG', 0o55: 'ADC', 0o56: 'SBC', 0o57: 'TST', 0o60: 'ROR', 0o61: 'ROL', 0o62: 'ASR', 0o63: 'ASL', 0o65: 'MFPI', 0o66: 'MTPI', 0o67: 'SXT' };
    const ONEB = { 0o50: 'CLRB', 0o51: 'COMB', 0o52: 'INCB', 0o53: 'DECB', 0o54: 'NEGB', 0o55: 'ADCB', 0o56: 'SBCB', 0o57: 'TSTB', 0o60: 'RORB', 0o61: 'ROLB', 0o62: 'ASRB', 0o63: 'ASLB', 0o64: 'MTPS', 0o65: 'MFPD', 0o66: 'MTPD', 0o67: 'MFPS' };
    const TWO = ['', 'MOV', 'CMP', 'BIT', 'BIC', 'BIS', 'ADD'], TWOB = ['', 'MOVB', 'CMPB', 'BITB', 'BICB', 'BISB', 'SUB'];
    const BR = { 0o400: 'BR', 0o1000: 'BNE', 0o1400: 'BEQ', 0o2000: 'BGE', 0o2400: 'BLT', 0o3000: 'BGT', 0o3400: 'BLE',
      0o100000: 'BPL', 0o100400: 'BMI', 0o101000: 'BHI', 0o101400: 'BLOS', 0o102000: 'BVC', 0o102400: 'BVS', 0o103000: 'BHIS', 0o103400: 'BLO' };
    return function dis(rd, pc0) {
      let pc = pc0;
      const w = rd(pc); pc = (pc + 2) & 0xFFFF;
      const words = [w];
      const next = () => { const v = rd(pc); words.push(v); pc = (pc + 2) & 0xFFFF; return v; };
      const arg = (f) => {
        const m = (f >> 3) & 7, r = f & 7;
        if (r === 7) {
          if (m === 2) return '#' + oct(next());
          if (m === 3) return '@#' + oct(next());
          if (m === 6) { const x = next(); return oct((x + pc) & 0xFFFF); }
          if (m === 7) { const x = next(); return '@' + oct((x + pc) & 0xFFFF); }
        }
        switch (m) {
          case 0: return R[r];
          case 1: return '(' + R[r] + ')';
          case 2: return '(' + R[r] + ')+';
          case 3: return '@(' + R[r] + ')+';
          case 4: return '-(' + R[r] + ')';
          case 5: return '@-(' + R[r] + ')';
          case 6: return oct(next()) + '(' + R[r] + ')';
          default: return '@' + oct(next()) + '(' + R[r] + ')';
        }
      };
      const ret = (t) => ({ len: (pc - pc0) & 0xFFFF, text: t, words });
      if (w in NOARG) return ret(NOARG[w]);
      if (w >= 0o240 && w <= 0o277) { // condition codes
        const f = w & 0o17, n = [[8, 'N'], [4, 'Z'], [2, 'V'], [1, 'C']].filter(([b]) => f & b).map(([, c]) => c);
        return ret((w & 0o20 ? 'SE' : 'CL') + n.join('|' + (w & 0o20 ? 'SE' : 'CL')));
      }
      if ((w & 0o177700) === 0o000100) return ret('JMP ' + arg(w));
      if ((w & 0o177770) === 0o000200) return ret('RTS ' + R[w & 7]);
      if ((w & 0o177700) === 0o000300) return ret('SWAB ' + arg(w));
      const br = BR[w & 0o177400];
      if (br) { let off = w & 0o377; if (off & 0o200) off -= 0o400; return ret(br + ' ' + oct((pc + off * 2) & 0xFFFF)); }
      if ((w & 0o177000) === 0o004000) return ret('JSR ' + R[(w >> 6) & 7] + ',' + arg(w));
      if ((w & 0o177400) === 0o104000) return ret('EMT ' + oct(w & 0o377, 3));
      if ((w & 0o177400) === 0o104400) return ret('TRAP ' + oct(w & 0o377, 3));
      if ((w & 0o177700) === 0o006400) return ret('MARK ' + oct(w & 0o77, 2));
      const op1 = (w >> 6) & 0o777;
      if (!(w & 0o100000) && ONE[op1 & 0o77] && (op1 >> 6) === 0) return ret(ONE[op1 & 0o77] + ' ' + arg(w));
      if ((w & 0o100000) && ((w >> 6) & 0o1700) === 0o1000 && ONEB[op1 & 0o77]) return ret(ONEB[op1 & 0o77] + ' ' + arg(w));
      const top = (w >> 12) & 0o17;
      if (top >= 1 && top <= 6) { const s = arg(w >> 6); return ret(TWO[top] + ' ' + s + ',' + arg(w)); }
      if (top >= 0o11 && top <= 0o16) { const s = arg(w >> 6); return ret(TWOB[top - 0o10] + ' ' + s + ',' + arg(w)); }
      const t7 = (w >> 9) & 0o177;
      if (t7 === 0o070 || t7 === 0o071 || t7 === 0o072 || t7 === 0o073) return ret(['MUL', 'DIV', 'ASH', 'ASHC'][t7 - 0o70] + ' ' + arg(w) + ',' + R[(w >> 6) & 7]);
      if (t7 === 0o074) return ret('XOR ' + R[(w >> 6) & 7] + ',' + arg(w));
      if (t7 === 0o077) return ret('SOB ' + R[(w >> 6) & 7] + ',' + oct((pc - (w & 0o77) * 2) & 0xFFFF));
      return ret('.WORD ' + oct(w));
    };
  })();

  // ---- file viewer: text (BK KOI-8, CP866, KOI8-R, Windows-1251), hex, octal words, PDP-11 disassembler
  const ENC = [['bk', 'BK KOI-8'], ['koi8-r', 'KOI8-R'], ['cp866', 'CP866 (alt)'], ['windows-1251', 'Windows-1251']];
  const decTab = {};
  function table(enc) {
    if (decTab[enc]) return decTab[enc];
    let t = [];
    if (enc === 'bk') for (let i = 0; i < 256; i++) t.push(i < 32 ? '·' : bkChar(i));
    else { const b = new Uint8Array(256); for (let i = 0; i < 256; i++) b[i] = i; t = [...new TextDecoder(enc).decode(b)]; for (let i = 0; i < 32; i++) t[i] = '·'; }
    return (decTab[enc] = t);
  }
  const MODES = ['text', 'hex', 'oct', 'dis'];
  function makeViewer(api) {
    const w = $('fvwin'), body = $('fvbody');
    let file = null, mode = MODES.includes(api.load('fv.mode')) ? api.load('fv.mode') : 'text', enc = api.load('fv.enc') || 'bk';
    const fw = api.floatWin(w, 'fvpos', () => {
      const r = $('fcwin').getBoundingClientRect(), vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.left + 40, vw - w.offsetWidth - 4)), y: Math.max(8, r.top + 30) };
    });
    ENC.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; $('fvenc').appendChild(o); });
    let rowAddr = [];
    const orgOf = () => { const v = parseInt($('fvorg').value.trim(), 8); return isFinite(v) ? v & 0xFFFF : (file.bin ? file.bin.addr : 0); };
    function render() {
      if (!file) return;
      $('fvmode').value = mode; $('fvenc').value = enc;
      const t = table(enc), d = file.body, base = orgOf();
      const code = mode !== 'text';
      for (const id of ['fvorg', 'fvorgl', 'fvgo', 'fvgol']) $(id).hidden = !code;
      let out = ''; rowAddr = [];
      const rows = [];
      if (mode === 'dis') {
        const rd = (a) => { const k = (a - base) & 0xFFFF; return k + 1 < d.length ? u16(d, k) : k < d.length ? d[k] : 0; };
        for (let o = 0; o < d.length;) {
          const r = PDP(rd, (base + o) & 0xFFFF), len = Math.max(2, Math.min(r.len, d.length - o));
          rowAddr.push(o);
          rows.push(oct((base + o) & 0xFFFF) + '  ' + r.words.slice(0, len / 2).map((x) => oct(x)).join(' ').padEnd(21) + r.text);
          o += len;
        }
      } else if (mode === 'oct') {
        for (let o = 0; o < d.length; o += 8) {
          rowAddr.push(o);
          let ws = '', c = '';
          for (let i = 0; i < 8; i += 2) ws += (o + i + 1 < d.length ? oct(u16(d, o + i)) : o + i < d.length ? '   ' + oct(d[o + i], 3) : '      ') + ' ';
          for (let i = 0; i < 8 && o + i < d.length; i++) c += t[d[o + i]];
          rows.push(oct((base + o) & 0xFFFF) + '  ' + ws + ' ' + c);
        }
      } else if (mode === 'hex') {
        for (let o = 0; o < d.length; o += 16) {
          rowAddr.push(o);
          let h = '', c = '';
          for (let i = 0; i < 16; i++) { h += o + i < d.length ? d[o + i].toString(16).toUpperCase().padStart(2, '0') + (i === 7 ? '  ' : ' ') : (i === 7 ? '    ' : '   '); if (o + i < d.length) c += t[d[o + i]]; }
          rows.push(oct((base + o) & 0xFFFF) + '  ' + h + ' ' + c);
        }
      }
      if (code) out = rows.join('\n');
      else {
        const parts = [];
        for (let i = 0; i < d.length; i++) {
          const b = d[i];
          if (b === 13) { parts.push('\n'); if (d[i + 1] === 10) i++; } else if (b === 10) parts.push('\n'); else if (b === 9) parts.push('\t'); else if (b) parts.push(t[b]);
        }
        out = parts.join('');
      }
      body.textContent = out;
      body.classList.toggle('hex', code);
      $('fvinfo').textContent = file.data.length + ' bytes' + (file.bin ? ` · address ${oct(file.bin.addr)} length ${oct(file.bin.len)} (${file.bin.len})` : '');
    }
    // quick jump (codes): the address (octal) as shown in the left column; the line is selected and scrolled into view
    function goTo(txt) {
      if (!file || mode === 'text') return;
      const v = parseInt(String(txt).trim(), 8); if (!isFinite(v)) return;
      const off = (v - orgOf()) & 0xFFFF;
      if (off >= file.body.length) { $('fvinfo').textContent = 'address out of the file'; return; }
      let line = 0; while (line + 1 < rowAddr.length && rowAddr[line + 1] <= off) line++;
      const lines = body.textContent.split('\n'); let pos = 0; for (let i = 0; i < line; i++) pos += lines[i].length + 1;
      const node = body.firstChild; if (!node) return;
      const r = document.createRange(); r.setStart(node, pos); r.setEnd(node, pos + lines[line].length);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      const lh = parseFloat(getComputedStyle(body).lineHeight) || 16;
      body.scrollTop = Math.max(0, line * lh - body.clientHeight / 3);
    }
    function open(f, title) {
      const bi = /\.(MSF|BKSCRIPT)$/i.test(title) ? null : binInfo(f.data);
      // .bin files: the data without the header (the left column shows BK addresses)
      file = Object.assign({}, f, { bin: bi, body: bi ? f.data.subarray(bi.off, bi.off + bi.len) : f.data });
      $('fvtitle').textContent = title;
      // state files: the picture of the screen saved with them
      const pv = /\.MSF$/i.test(title) && api.preview ? api.preview(f.data) : null;
      $('fvimg').hidden = !pv; $('fvimg').innerHTML = '';
      if (pv) { $('fvimg').appendChild(pv.canvas); const t = document.createElement('span'); t.textContent = pv.info; $('fvimg').appendChild(t); }
      $('fvorg').value = ''; $('fvorg').placeholder = oct(bi ? bi.addr : 0);
      w.hidden = false; fw.place(); render(); body.scrollTop = 0; body.focus();
    }
    function close() { w.hidden = true; file = null; }
    $('fvmode').onchange = () => { mode = $('fvmode').value; api.store('fv.mode', mode); render(); body.focus(); };
    $('fvorg').oninput = () => render();
    $('fvgo').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); goTo($('fvgo').value); body.focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); body.focus(); }
      else e.stopPropagation();
    });
    $('fvorg').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); body.focus(); } else e.stopPropagation(); });
    $('fvenc').onchange = () => { enc = $('fvenc').value; api.store('fv.enc', enc); render(); body.focus(); };
    $('fvclose').onclick = () => { close(); const l = document.querySelector('#fcwin .fcpanel.act .fclist'); if (l) l.focus(); };
    w.addEventListener('keydown', (e) => {
      if ((e.target.tagName === 'SELECT' || e.target.closest('.usel')) && e.key !== 'Escape') return;
      const k = e.key;
      if (k === 'Escape' || k === 'F3' || k === 'F10') { $('fvclose').onclick(); }
      else if (k === 'F4') { mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length]; api.store('fv.mode', mode); render(); }
      else if ('tThHoOdD'.includes(k) && k.length === 1) { mode = { t: 'text', h: 'hex', o: 'oct', d: 'dis' }[k.toLowerCase()]; api.store('fv.mode', mode); render(); }
      else if (k === 'F8' || k === 'e' || k === 'E') { const i = ENC.findIndex((x) => x[0] === enc); enc = ENC[(i + 1) % ENC.length][0]; api.store('fv.enc', enc); render(); }
      else if ((k === 'g' || k === 'G' || k === ':') && mode !== 'text') { $('fvgo').focus(); $('fvgo').select(); }
      else if (k === 'Home') body.scrollTop = 0;
      else if (k === 'End') body.scrollTop = body.scrollHeight;
      else return;
      e.preventDefault(); e.stopPropagation();
    });
    return { open, close, hasFocus: () => !w.hidden && w.contains(document.activeElement) };
  }

  function create(api) {
    const win = $('fcwin');
    // sources: the server sets (api.sets(): [{ id, name, url }]), sets opened from the PC (zips), RAM
    const ram = { name: 'RAM', files: api.ramFiles };
    const own = []; // { id, name, set }
    function srcList() {
      const out = [];
      api.sets().forEach((s) => out.push([s.id, s.name]));
      own.forEach((s) => out.push([s.id, s.name]));
      if (api.drives) api.drives().forEach((d) => out.push(['D' + d.i, d.label]));
      out.push(['RAM', 'RAM']);
      return out;
    }
    let SRC = [];
    const P = [0, 1].map((i) => ({ el: $('fcp' + i), src: api.load('fc.src' + i) || (i ? 'RAM' : ''), want: null, vol: null, items: [], cur: 0, sel: new Set(), msg: '', dir: [] }));
    let act = 0;
    P.forEach((p) => { p.want = p.src; });
    const fw = api.floatWin(win, 'fcpos', () => {
      const r = $('screenwrap').getBoundingClientRect(), vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.left + (r.width - win.offsetWidth) / 2, vw - win.offsetWidth - 4)), y: Math.max(8, r.top + 30) };
    });

    // open a source as a volume; server sets are fetched once (the panel shows "loading…" meanwhile)
    const vols = new Map();
    function openVol(src) {
      if (src === 'RAM') return { vol: vols.get('RAM') || vols.set('RAM', setVolume(ram, 'RAM')).get('RAM') };
      if (/^D\d$/.test(src)) return driveVol(+src[1]);
      const o = own.find((s) => s.id === src);
      if (o) return { vol: vols.get(src) || vols.set(src, setVolume(o.set, o.set.kind || 'ZIP')).get(src) };
      const s = api.sets().find((x) => x.id === src);
      if (!s) return { err: 'no such set' };
      if (vols.has(src)) return { vol: vols.get(src) };
      if (!s.loading) {
        s.loading = api.loadSet(s).then((set) => { vols.set(src, setVolume(set, 'ZIP')); }).catch((e) => { s.err = e.message; })
          .finally(() => { s.loading = null; P.forEach((p, i) => { if (p.src === src) load(i); }); });
      }
      return { err: s.err || 'loading ' + s.name + '…' };
    }
    // a mounted drive: its files as the machine has them now (read only: the BK's DOS keeps its own copy of the directory)
    const dvols = new Map();
    function driveVol(i) {
      const d = api.drives().find((x) => x.i === i); if (!d) return { err: 'not mounted' };
      const data = api.driveData(i); if (!data) return { err: 'no image' };
      const disk = window.BKDisk.open(d.name, data);
      if (!disk) return { err: d.hdd ? 'HDD image: files are not shown (Eject: ⏏)' : 'unknown file system' };
      const ro = { kind: disk.kind, label: disk.label, files: disk.files, dirs: disk.dirs, free: disk.free };
      const set = { name: d.label, kind: disk.kind, disk: ro, mounted: true, files: disk.files.map((f) => ({ path: f.path, data: f.data, disk: f })) };
      const old = dvols.get(i), vol = setVolume(set, disk.kind);
      if (old) vol.setPath(old.dir() ? old.dir().replace(/\/$/, '').split('/') : []);
      dvols.set(i, vol);
      return { vol };
    }
    function fillSrc() {
      const av = SRC = srcList();
      P.forEach((p, i) => {
        if (!av.some((x) => x[0] === p.src)) p.src = (av.find((x) => x[0] === p.want) || av[i ? av.length - 1 : 0] || ['RAM'])[0];
        const sel = p.el.querySelector('.fcsrc'); sel.innerHTML = '';
        av.forEach(([v, t]) => { const op = document.createElement('option'); op.value = v; op.textContent = t; sel.appendChild(op); });
        sel.value = p.src;
      });
    }
    function load(i) {
      const p = P[i];
      const r = openVol(p.src);
      p.vol = r.vol || null; p.msg = r.err || '';
      if (p.vol && p.vol.setPath) p.dir = p.vol.setPath(p.dir);
      p.items = p.vol ? p.vol.list() : [];
      p.sel.clear(); p.cur = Math.min(p.cur, Math.max(0, p.items.length - 1));
      draw(i);
    }
    function draw(i) {
      const p = P[i], el = p.el;
      el.classList.toggle('act', i === act);
      el.querySelector('.fcsrc').value = p.src;
      el.querySelector('.fckind').textContent = p.vol ? (p.vol.kind + (p.vol.path !== '/' ? ' · ' + p.vol.path : '')) : '';
      const ej = el.querySelector('.fceject'); ej.hidden = !/^D\d$/.test(p.src);
      const dv = /^D\d$/.test(p.src) && api.drives().find((d) => d.i === +p.src[1]);
      el.querySelector('.fcboot').hidden = !(dv && dv.boot);
      const list = el.querySelector('.fclist');
      list.innerHTML = '';
      if (!p.vol && p.msg) { const m = document.createElement('div'); m.className = 'fcmsg'; m.textContent = p.msg; list.appendChild(m); }
      p.items.forEach((it, k) => {
        const r = document.createElement('div');
        r.className = 'fcrow' + (k === p.cur ? ' cur' : '') + (p.sel.has(k) ? ' sel' : '') + (it.dir ? ' dir' : '');
        r.innerHTML = '<span class="n"></span><span class="e"></span><span class="s"></span>';
        r.children[0].textContent = it.name; r.children[1].textContent = it.ext; r.children[2].textContent = it.dir ? it.show : fmtSize(it.show);
        r.title = it.dir ? (it.up ? 'up' : it.name + ': folder (Enter opens it)') : it.bin ? `${it.name}${it.ext ? '.' + it.ext : ''}  address ${oct(it.bin.addr)}  length ${oct(it.bin.len)} (${it.bin.len})` : `${it.name}.${it.ext}  ${it.size} bytes`;
        r.onmousedown = (e) => {
          e.preventDefault(); setAct(i);
          const now = performance.now(), dbl = e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && lastDown.i === i && lastDown.k === k && now - lastDown.t < 450;
          lastDown = dbl ? { t: 0 } : { i, k, t: now };
          p.cur = k;
          if (dbl) { draw(i); list.focus(); if (it.dir) enter(); else run(); return; }
          if (e.ctrlKey || e.metaKey) toggle(p, k);
          else if (e.shiftKey) { p.sel.add(k); }
          draw(i); list.focus();
        };
        list.appendChild(r);
      });
      const n = p.sel.size, bytes = [...p.sel].reduce((s, k) => s + (p.items[k] ? p.items[k].size : 0), 0);
      el.querySelector('.fcfoot').textContent = p.vol
        ? (n ? `${n} selected, ${fmtSize(bytes)}` : `${p.items.filter((x) => !x.dir).length} files`) + (p.vol.kind === 'RAM' ? ` · free ${fmtSize(p.vol.free())}` : '') : ' ';
      const c = list.children[p.cur]; if (c && i === act) c.scrollIntoView({ block: 'nearest' });
    }
    let lastDown = { t: 0 };
    const toggle = (p, k) => { if (p.items[k] && p.items[k].dir) return; if (p.sel.has(k)) p.sel.delete(k); else p.sel.add(k); };
    function setAct(i) { if (act !== i) { act = i; draw(0); draw(1); } }
    const picked = (p) => (p.sel.size ? [...p.sel].sort((a, b) => a - b).map((k) => p.items[k]) : (p.items[p.cur] ? [p.items[p.cur]] : [])).filter((it) => it && !it.dir);
    function enter() {
      const p = P[act], it = p.items[p.cur];
      if (!p.vol || !it || !it.dir) return false;
      const from = p.vol.path;
      p.dir = p.vol.enter(it);
      p.items = p.vol.list(); p.sel.clear(); p.cur = 0;
      if (it.up) { const back = from.slice(from.lastIndexOf('/') + 1); const k = p.items.findIndex((x) => x.dir && x.name === back); if (k >= 0) p.cur = k; }
      draw(act); return true;
    }
    function goUp() { const p = P[act]; if (p.items[0] && p.items[0].up) { p.cur = 0; enter(); return true; } return false; }
    function status(t, err) { $('fcstat').textContent = t || ''; $('fcstat').classList.toggle('err', !!err); }

    // ---- own small dialogs inside the window: ask({ title, text, ok }) → Promise<boolean>
    let dlgDone = null;
    // the dialog lives on the page (not in this window): its box is centred on the BK window, inside the screen
    const dlg = $('fcdlg'); document.body.appendChild(dlg);
    function placeDlg() {
      if (dlg.hidden) return;
      const box = dlg.querySelector('.box'), sw = $('screenwin'), vw = document.documentElement.clientWidth, vh = window.innerHeight;
      const r = sw ? sw.getBoundingClientRect() : { left: 0, top: 0, width: vw, height: vh };
      const bw = box.offsetWidth, bh = box.offsetHeight;
      box.style.left = Math.max(8, Math.min(r.left + (r.width - bw) / 2, vw - bw - 8)) + 'px';
      box.style.top = Math.max(8, Math.min(r.top + (r.height - bh) / 2, vh - bh - 8)) + 'px';
    }
    window.addEventListener('resize', placeDlg);
    // o.buttons: several answers (the index is returned, -1 = Esc); else OK / Cancel (true / false)
    function ask(o) {
      const d = $('fcdlg');
      d.querySelector('.t').textContent = o.title; d.querySelector('.x').textContent = o.text;
      const labels = o.buttons || [o.ok || 'OK', o.no || 'Cancel'];
      const bar = d.querySelector('.b'); bar.innerHTML = '';
      labels.forEach((l, i) => {
        const e = document.createElement('button'); e.textContent = l;
        if (i === 0) e.className = 'ok primary' + (o.danger ? ' danger' : '');
        else if (!o.buttons) e.className = 'no';
        e.onclick = () => dlgDone && dlgDone(o.buttons ? i : i === 0);
        bar.appendChild(e);
      });
      d.hidden = false; placeDlg(); bar.querySelector('button').focus();
      return new Promise((res) => { dlgDone = (v) => { d.hidden = true; dlgDone = null; P[act].el.querySelector('.fclist').focus();
        res(o.buttons ? (v === true ? 0 : v === false ? -1 : v) : v); }; });
    }
    $('fcdlg').addEventListener('keydown', (e) => {
      if (!dlgDone) return;
      const b = [...$('fcdlg').querySelectorAll('button')], at = b.indexOf(document.activeElement);
      if (e.key === 'Escape') dlgDone(false);
      else if (e.key === 'Enter' || e.key === ' ') { (at >= 0 ? b[at] : b[0]).click(); } // the focused answer (also from on-screen keys)
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) b[(Math.max(0, at) - 1 + b.length) % b.length].focus();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Tab') b[(at + 1) % b.length].focus();
      else return;
      e.preventDefault(); e.stopPropagation();
    });
    const fname = (it) => it.name + (it.ext ? '.' + it.ext : '');
    const what = (list) => list.length === 1 ? fname(list[0]) : list.length + ' files (' + fmtSize(list.reduce((n, it) => n + it.size, 0)) + ')';
    const srcName = (p) => (SRC.find((x) => x[0] === p.src) || ['', p.src])[1];

    async function copy() {
      const s = P[act], t = P[1 - act];
      if (!s.vol || !t.vol) { status('Both panels need a set', true); return; }
      if (s.src === t.src && s.vol.dir() === t.vol.dir()) { status('Source and target are the same', true); return; }
      const list = picked(s); if (!list.length) return;
      if (!await ask({ title: 'Copy', text: `Copy ${what(list)}\nfrom ${srcName(s)} to ${srcName(t)}${t.vol.path !== '/' ? ' ' + t.vol.path : ''}?`, ok: 'Copy' })) return;
      let ok = 0; const errs = [];
      for (const it of list) { try { t.vol.write(s.vol.read(it)); ok++; } catch (e) { errs.push(fname(it) + ': ' + e.message); } }
      load(1 - act); s.sel.clear(); draw(act);
      status(errs.length ? `Copied ${ok}, errors: ` + errs.join('; ') : `Copied ${ok} file${ok === 1 ? '' : 's'}`, errs.length > 0);
    }
    async function del() {
      const s = P[act]; if (!s.vol) return;
      const list = picked(s); if (!list.length) return;
      if (!await ask({ title: 'Delete', text: `Delete ${what(list)} from ${srcName(s)}?` + (s.vol.kind === 'ZIP' ? '\n(only in this page: server file stays)' : ''), ok: 'Delete', danger: true })) return;
      try { for (const it of list) s.vol.del(it); } catch (e) { status(e.message, true); return; }
      load(act); if (P[1 - act].src === s.src) load(1 - act);
      status(`Deleted ${list.length}`);
    }
    async function download() { // Get Files: one file as is, several in FCfiles.zip (folders kept)
      const s = P[act]; if (!s.vol) return;
      const list = picked(s); if (!list.length) return;
      const files = list.map((it) => ({ name: fname(it).replace(/[\\/:*?"<>|]/g, '_'), data: it.id.data }));
      if (files.length === 1) { api.download(files[0].name, files[0].data); return; }
      api.download('FCfiles.zip', await api.zip(files));
      status(`FCfiles.zip: ${files.length} files`);
    }
    // Put Files: files from the PC into this panel (ZIP files open as a new set)
    function upload(files) {
      const t = P[act];
      Promise.all([...files].map((fl) => fl.arrayBuffer().then((b) => [fl.name, new Uint8Array(b)]))).then(async (arr) => {
        let ok = 0; const errs = [];
        for (const [nm, data] of arr) {
          if (/\.zip$/i.test(nm)) {
            try { const set = await api.openZip(nm, data); addSet(set, act); ok++; } catch (e) { errs.push(nm + ': ' + e.message); }
            continue;
          }
          if (!t.vol) { errs.push(nm + ': no set in this panel'); continue; }
          const { base, ext } = splitName(nm.replace(/^.*[\\/]/, ''));
          try { t.vol.write({ name: base, ext, data }); ok++; } catch (e) { errs.push(nm + ': ' + e.message); }
        }
        load(act);
        status(errs.length ? `Added ${ok}, errors: ` + errs.join('; ') : `Added ${ok} file${ok === 1 ? '' : 's'}`, errs.length > 0);
      });
    }
    let ownN = 0;
    function addSet(set, i) {
      const id = 'Z' + (++ownN);
      own.push({ id, name: set.name, set });
      fillSrc();
      const p = P[i]; p.src = p.want = id; p.cur = 0; p.dir = [];
      fillSrc(); load(i);
      return id;
    }

    function key(e) {
      const p = P[act];
      const k = e.key;
      if (!$('fchelp').hidden && k !== 'Escape' && k !== 'F1') return false; // help open: its own scrolling
      if (k === 'Tab') { setAct(1 - act); return true; }
      if (k === 'ArrowDown') { p.cur = Math.min(p.items.length - 1, p.cur + 1); draw(act); return true; }
      if (k === 'ArrowUp') { p.cur = Math.max(0, p.cur - 1); draw(act); return true; }
      if (k === 'Home') { p.cur = 0; draw(act); return true; }
      if (k === 'End') { p.cur = Math.max(0, p.items.length - 1); draw(act); return true; }
      if (k === 'PageDown') { p.cur = Math.min(p.items.length - 1, p.cur + 10); draw(act); return true; }
      if (k === 'PageUp') { p.cur = Math.max(0, p.cur - 10); draw(act); return true; }
      if (k === 'Insert' || k === ' ') { if (p.items.length) { toggle(p, p.cur); p.cur = Math.min(p.items.length - 1, p.cur + 1); draw(act); } return true; }
      if (k === '+' || (k === 'a' && (e.ctrlKey || e.metaKey))) { p.items.forEach((it, i) => { if (!it.dir) p.sel.add(i); }); draw(act); return true; }
      if (k === '-') { p.sel.clear(); draw(act); return true; }
      if (k === 'Enter') { if (!enter()) run(); return true; }
      if (k === 'Backspace') { goUp(); return true; }
      if (k === 'F3') { view(); return true; }
      if (k === 'F5') { copy(); return true; }
      if (k === 'F8' || k === 'Delete') { del(); return true; }
      if (k === 'F2') { fillSrc(); load(0); load(1); status('Re-read'); return true; }
      if (k === 'Escape') { if (!$('fchelp').hidden) helpShow(false); else show(false); return true; }
      if (k === 'F1') { show(false); return true; }
      // quick search: a letter / digit jumps to the next file starting with it
      if (k.length === 1 && /[0-9a-zа-я]/i.test(k) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const n = p.items.length, c = k.toUpperCase();
        for (let j = 1; j <= n; j++) { const q = (p.cur + j) % n; if (p.items[q].name.toUpperCase().startsWith(c)) { p.cur = q; draw(act); break; } }
        return true;
      }
      return false;
    }
    // Run: the file is started in the current model (the machine is reset); the set it is in becomes the "tape":
    // overlays and data files the program loads with EMT 36 are taken from it (its folder first)
    async function run() {
      const s = P[act]; if (!s.vol) return;
      const it = s.items[s.cur]; if (!it || it.dir) return;
      const ext = (it.ext || '').toUpperCase();
      if (api.isImage && api.isImage(fname(it), it.id.data)) {
        const r = await api.mount(fname(it), it.id.data, ask); if (!r) return;
        if (r.drive === undefined) { show(false); return; } // a tape
        select('D' + r.drive); // the drive in this panel: its files
        if (r.boot) show(false);
        return;
      }
      const err = api.run(s.vol, it.id, true);
      if (err) { status(err, true); return; }
      const q = ext === 'MSF' ? { title: 'Load state', text: `Load state ${fname(it)} from ${srcName(s)}?\nCurrent machine state will be lost.` }
        : ext === 'BKSCRIPT' ? { title: 'Run script', text: `Run script ${fname(it)} on ${api.modelName()}?\nIts text is typed into BK as from keyboard.`, ok: 'Run', no: 'Cancel' }
        : { title: 'Run', text: `Run ${fname(it)} from ${srcName(s)} on ${api.modelName()}?\nMachine will be reset.` };
      if (!await ask(Object.assign({ ok: 'Yes', no: 'No' }, q))) return;
      const res = api.run(s.vol, it.id, false);
      if (res) { status(res, true); return; }
      show(false);
    }
    function view() {
      const s = P[act]; if (!s.vol) return;
      const it = s.items[s.cur]; if (!it || it.dir) return;
      viewer.open(s.vol.read(it), srcName(s) + ' ' + (s.vol.path !== '/' ? s.vol.path.slice(1) + '/' : '') + fname(it));
    }

    // a source in the active panel (a drive just mounted, a server set from Load)
    function select(id) { fillSrc(); const p = P[act]; p.src = p.want = id; p.cur = 0; p.dir = []; api.store('fc.src' + act, id); fillSrc(); load(act); }
    // ---- wiring
    P.forEach((p, i) => {
      const sel = p.el.querySelector('.fcsrc');
      sel.onchange = () => { p.src = p.want = sel.value; api.store('fc.src' + i, p.src); p.cur = 0; p.dir = []; setAct(i); load(i); setTimeout(() => p.el.querySelector('.fclist').focus(), 0); }; // after the list gives the focus back to its box
      const list = p.el.querySelector('.fclist');
      list.tabIndex = 0;
      list.addEventListener('focus', () => setAct(i));
      list.addEventListener('keydown', (e) => { if (key(e)) { e.preventDefault(); e.stopPropagation(); } });
      list.addEventListener('dragover', (e) => { e.preventDefault(); list.classList.add('drop'); });
      list.addEventListener('dragleave', () => list.classList.remove('drop'));
      list.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); list.classList.remove('drop'); setAct(i); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); });
    });
    P.forEach((p) => { p.el.querySelector('.fcboot').onclick = async () => {
      const d = +p.src.slice(1); if (!/^D\d$/.test(p.src)) return;
      if (!await ask({ title: 'Boot', text: `Boot from ${srcName(p)}?\nMachine restarts` + (d >= 4 ? '.' : (d ? ', image goes to A:.' : '.')), ok: 'Boot' })) return;
      const to = await api.boot(d); if (to === false) return;
      select('D' + to); show(false);
    }; });
    P.forEach((p, i) => { p.el.querySelector('.fceject').onclick = async () => {
      const d = +p.src.slice(1); if (!/^D\d$/.test(p.src)) return;
      if (!await ask({ title: 'Eject', text: `Take ${srcName(p)} out of the drive?` + (d >= 4 ? '\nMachine restarts (HDD).' : ''), ok: 'Eject' })) return;
      await api.eject(d); fillSrc(); load(0); load(1); status('Ejected');
    }; });
    $('fcview').onclick = view;
    $('fccopy').onclick = copy; $('fcdel').onclick = del; $('fcdown').onclick = download;
    $('fcup').onclick = () => $('fcfile').click();
    $('fcfile').onchange = (e) => { if (e.target.files.length) upload(e.target.files); e.target.value = ''; };
    $('fcclose').onclick = () => show(false);
    // help: over the panels, ? in the title or Esc closes it
    function helpShow(v) { $('fchelp').hidden = !v; $('fchelpbtn').classList.toggle('on', v); if (v) $('fchelp').focus(); else P[act].el.querySelector('.fclist').focus(); }
    $('fchelpbtn').onclick = () => helpShow($('fchelp').hidden);
    win.addEventListener('keydown', (e) => { if (dlgDone || e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.target.closest('.usel')) return; if (key(e)) { e.preventDefault(); e.stopPropagation(); } });
    // keys go to the active panel again whenever the window gets the focus back
    const focusList = () => { if (!win.hidden && !dlgDone && !viewer.hasFocus()) P[act].el.querySelector('.fclist').focus({ preventScroll: true }); };
    win.addEventListener('pointerup', (e) => { if (!e.target.closest('select, input, button, .fclist, #fchelp')) focusList(); });

    const viewer = makeViewer(api);
    function show(v) {
      if (!v && dlgDone) dlgDone(false);
      if (!v) viewer.close();
      if (!v) $('fchelp').hidden = true, $('fchelpbtn').classList.remove('on');
      win.hidden = !v;
      $('fcbtn').classList.toggle('on', v); if ($('fctb')) $('fctb').classList.toggle('on', v);
      if (v) { fw.place(); fillSrc(); load(0); load(1); status('Tab: other panel · Space/Ins: select · Enter / double click: run, open folder · F3 view · F5 copy · F8 delete · F2 re-read · ? help'); P[act].el.querySelector('.fclist').focus(); }
      else if (api.onClose) api.onClose();
    }
    // the file under the cursor of the active panel (the monitor's "M" with an empty name)
    function current() { const p = P[act]; const it = p.items[p.cur]; return p.vol && it && !it.dir ? { vol: p.vol, file: it.id } : null; }
    return {
      show, get open() { return !win.hidden; }, hasFocus: () => win.contains(document.activeElement) || viewer.hasFocus(),
      current, ask, dialogOpen: () => !!dlgDone, addSet: (set, other) => addSet(set, other ? 1 - act : act), refresh: () => { if (!win.hidden) { fillSrc(); load(0); load(1); } },
      select,
    };
  }
  window.BKFC = { create, binInfo, bkName, splitName, setVolume, _test: { PDP } };
})();
