// File Commander: two panels over the emulator's disks (TR-DOS and CP/M), the hard disk (ATM CP/M) and a RAM disk.
// Files are copied between TR-DOS and CP/M as Hobeta (NAME.$T), the way Honey Commander does it.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TRD_SIZE = 655360;
  const RAM_CAP = 2 * TRD_SIZE;           // the RAM disk holds as much as two TRD images
  const CPM_FLOPPY = { bs: 2048, dsm: 315, drm: 127, off: 2 * 4096 };       // ATM BIOS: 16×256 sectors, 2 system tracks
  const CPM_PROFI = { bs: 2048, dsm: 399, drm: 127, off: 0 };               // Profi CP/M (.PRO): 80×2×5×1024, no system tracks (boot: sector 9 = block 2)
  const CPM_HDD = { bs: 2048, dsm: 3161, drm: 127, spt: 17, heads: 5 };    // ATM BIOS: 17 sectors, 5 heads, 1 system track

  const ascii = (b) => String.fromCharCode(...b).replace(/[^\x20-\x7e]/g, '?');
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  const u16 = (a, o) => a[o] | (a[o + 1] << 8);
  const put16 = (a, o, v) => { a[o] = v & 255; a[o + 1] = (v >> 8) & 255; };
  const fmtSize = (n) => n >= 10485760 ? (n / 1048576).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 10240 ? Math.round(n / 1024) + 'K' : String(n);
  const dirNote = (v) => { if (!v.dirFree) return ''; const d = v.dirFree(); return ` · dir ${d.free}/${d.all}`; }; // CP/M: free directory entries

  // ---- Hobeta: 17-byte header (name 8, type 1, start 2, length 2, size in sectors << 8, checksum) + sector data
  function hobetaMake(f) {
    const secs = Math.max(1, Math.ceil(f.data.length / 256));
    const out = new Uint8Array(17 + secs * 256);
    for (let i = 0; i < 8; i++) out[i] = f.name.charCodeAt(i) || 32;
    out[8] = f.zx.type.charCodeAt(0); put16(out, 9, f.zx.start); put16(out, 11, f.zx.len); out[13] = 0; out[14] = secs;
    let c = 0; for (let i = 0; i < 15; i++) c += out[i] * 257 + i;
    put16(out, 15, c & 0xFFFF);
    out.set(f.data.subarray(0, secs * 256), 17);
    return out;
  }
  function hobetaParse(d) {
    if (d.length < 17) return null;
    let c = 0; for (let i = 0; i < 15; i++) c += d[i] * 257 + i;
    if ((c & 0xFFFF) !== u16(d, 15)) return null;
    const secs = d[14] || Math.ceil(u16(d, 11) / 256);
    return { name: ascii(d.subarray(0, 8)), zx: { type: String.fromCharCode(d[8]), start: u16(d, 9), len: u16(d, 11) },
      data: d.slice(17, 17 + secs * 256) };
  }
  // a file object: { name (8), ext (3, CP/M) | zx: { type, start, len } (TR-DOS), data }
  function toZx(f) {
    if (f.zx) return f;
    if (f.ext && f.ext[0] === '$') { const h = hobetaParse(f.data); if (h) return h; }
    const n = Math.min(f.data.length, 0xFF00);
    return { name: f.name, zx: { type: 'C', start: f.addr || 0, len: n }, data: f.data.slice(0, n) };
  }
  // split files: a long file cut by a copier into 255-sector parts — the same NAME, type '0'..'9' and the start field
  // holding two more digits ("01", "02"…): a 3-character extension NAME.001, NAME.002…
  function partExt(zx) {
    if (!zx || !/^[0-9]$/.test(zx.type)) return '';
    const a = zx.start & 255, b = zx.start >> 8;
    return a >= 48 && a <= 57 && b >= 48 && b <= 57 ? zx.type + String.fromCharCode(a, b) : '';
  }
  const partRaw = (f) => ({ name: f.name.trim(), ext: partExt(f.zx), data: f.data.slice(0, f.zx.len || f.data.length) });
  // the parts glued back: their real lengths in order; the extension from the contents
  function joinParts(name, parts) {
    const data = new Uint8Array(parts.reduce((n, f) => n + (f.zx.len || f.data.length), 0));
    let o = 0; for (const f of parts) { const d = f.data.subarray(0, f.zx.len || f.data.length); data.set(d, o); o += d.length; }
    const sig = (off, t) => String.fromCharCode(...data.subarray(off, off + t.length)) === t;
    const ext = sig(0x2C, 'SCRM') ? 'S3M' : sig(1080, 'M.K.') || sig(1080, 'FLT4') || sig(1080, '8CHN') || sig(1080, '6CHN') ? 'MOD'
      : sig(0, 'Extended Module') ? 'XM' : sig(0, 'IMPM') ? 'IT' : sig(0, 'PK\x03\x04') ? 'ZIP' : 'BIN';
    return { name: name.trim(), ext, data };
  }
  function toCpm(f) {
    if (!f.zx) return f;
    if (partExt(f.zx)) return Object.assign(partRaw(f), { name: f.name.trim().toUpperCase() });
    return { name: f.name.toUpperCase(), ext: '$' + f.zx.type.toUpperCase(), data: hobetaMake(f) };
  }
  const cpmName = (s) => s.toUpperCase().replace(/[^A-Z0-9!#$%&'()\-@^_`{}~]/g, '_');

  // ---- TR-DOS on a TRD image
  function trdos(img) {
    const info = 0x800;
    const vol = {
      kind: 'TR-DOS',
      label: ascii(img.subarray(info + 0xF5, info + 0xFD)).trim(),
      list() {
        const out = [], n = img[info + 0xE4];
        for (let i = 0; i < 128; i++) {
          const e = img.subarray(i * 16, i * 16 + 16);
          if (e[0] === 0) break;
          if (e[0] === 1) continue; // deleted
          const type = String.fromCharCode(e[8]), zx = { type, start: u16(e, 9), len: u16(e, 11) };
          out.push({ id: i, name: ascii(e.subarray(0, 8)), ext: partExt(zx) || type, part: partExt(zx), zx,
            size: e[13] * 256, show: type === 'B' ? u16(e, 11) : u16(e, 11), sub: type === 'B' ? '' : String(u16(e, 9)) });
        }
        return out;
      },
      free() { return u16(img, info + 0xE5) * 256; },
      read(it) {
        const e = img.subarray(it.id * 16, it.id * 16 + 16);
        const off = (e[15] * 16 + e[14]) * 256;
        return { name: it.name, zx: Object.assign({}, it.zx), data: img.slice(off, off + e[13] * 256) };
      },
      write(f0) {
        // a long plain file (over 255 sectors): split files NAME.001, .002… (type digit + two digits in the start field)
        const hob = f0.ext && f0.ext[0] === '$' && hobetaParse(f0.data);
        if (!f0.zx && !hob && f0.data.length > 0xFF00) {
          const n = Math.ceil(f0.data.length / 0xFF00), secs = Math.ceil(f0.data.length / 256);
          if (img[info + 0xE4] + n > 128) throw new Error('catalog full');
          if (u16(img, info + 0xE5) < secs) throw new Error('disk full');
          if (n > 999) throw new Error('too long');
          for (let k = 1; k <= n; k++) {
            const x = String(k).padStart(3, '0'), d = f0.data.subarray((k - 1) * 0xFF00, k * 0xFF00);
            this.write({ name: f0.name, zx: { type: x[0], start: x.charCodeAt(1) | (x.charCodeAt(2) << 8), len: d.length }, data: d });
          }
          return;
        }
        const f = toZx(f0);
        const secs = Math.max(1, Math.ceil(f.data.length / 256));
        const cnt = img[info + 0xE4];
        if (cnt >= 128) throw new Error('catalog full');
        if (u16(img, info + 0xE5) < secs) throw new Error('disk full');
        if (secs > 255) throw new Error('too long for TR-DOS');
        const nm = pad(f.name, 8), ty = f.zx.type.charCodeAt(0), pe = partExt(f.zx);
        for (let i = 0; i < cnt; i++) {
          const e = img.subarray(i * 16, i * 16 + 16);
          if (e[0] > 1 && ascii(e.subarray(0, 8)) === nm && e[8] === ty && (!pe || u16(e, 9) === f.zx.start)) throw new Error('file exists');
        }
        let sec = img[info + 0xE1], trk = img[info + 0xE2];
        img.set(f.data.subarray(0, secs * 256), (trk * 16 + sec) * 256);
        const e = img.subarray(cnt * 16, cnt * 16 + 16);
        for (let i = 0; i < 8; i++) e[i] = nm.charCodeAt(i);
        e[8] = ty; put16(e, 9, f.zx.start); put16(e, 11, f.zx.len); e[13] = secs; e[14] = sec; e[15] = trk;
        const lin = trk * 16 + sec + secs;
        img[info + 0xE1] = lin % 16; img[info + 0xE2] = Math.floor(lin / 16);
        img[info + 0xE4] = cnt + 1; put16(img, info + 0xE5, u16(img, info + 0xE5) - secs);
      },
      // the editor: new contents of a file in its own sectors when they still fit the same count (catalogue order kept)
      rewrite(it, data) {
        const e = img.subarray(it.id * 16, it.id * 16 + 16), secs = Math.max(1, Math.ceil(data.length / 256));
        if (secs !== e[13]) return false;
        const off = (e[15] * 16 + e[14]) * 256; img.fill(0, off, off + secs * 256); img.set(data, off);
        if (e[8] !== 0x42) put16(e, 11, data.length); // code / data: the length; BASIC keeps its header
        return true;
      },
      del(it) {
        const cnt = img[info + 0xE4], e = img.subarray(it.id * 16, it.id * 16 + 16);
        if (it.id === cnt - 1) { // the last file: its space comes back
          img[info + 0xE1] = e[14]; img[info + 0xE2] = e[15];
          put16(img, info + 0xE5, u16(img, info + 0xE5) + e[13]);
          const at = (e[15] * 16 + e[14]) * 256; img.fill(0, at, Math.min(img.length, at + e[13] * 256)); // zeroed: a saved zip shrinks
          img[info + 0xE4] = cnt - 1; e.fill(0);
        } else { e[0] = 1; img[info + 0xF4]++; }
      },
    };
    return vol;
  }
  function trdFormat(label) { // an empty 80-track double-sided TR-DOS disk
    const img = new Uint8Array(TRD_SIZE), info = 0x800;
    img[info + 0xE1] = 0; img[info + 0xE2] = 1; img[info + 0xE3] = 0x16; img[info + 0xE4] = 0;
    put16(img, info + 0xE5, 2544); img[info + 0xE7] = 0x10;
    for (let i = 0; i < 8; i++) img[info + 0xF5 + i] = (pad(label || '', 8)).charCodeAt(i);
    return img;
  }

  // ---- CP/M 2.2 file system (EXM 0, 2K blocks); io(byteOffset, length[, data]) reads / writes the volume
  function cpm(p, io) {
    const dirBytes = (p.drm + 1) * 32, dirBlocks = Math.ceil(dirBytes / p.bs), wide = p.wide !== undefined ? p.wide : p.dsm > 255;
    const exm = Math.max(0, p.bs * (wide ? 8 : 16) / 16384 - 1), recsOf = (e) => (e[12] & exm) * 128 + e[15]; // records held by an entry (EXM: several 16K extents per entry)
    let dir = io(p.off, dirBytes);
    const ents = () => { const out = []; for (let i = 0; i <= p.drm; i++) out.push(dir.subarray(i * 32, i * 32 + 32)); return out; };
    const blocks = (e) => { const b = []; for (let k = 0; k < (wide ? 8 : 16); k++) { const v = wide ? u16(e, 16 + k * 2) : e[16 + k]; if (v) b.push(v); } return b; };
    const key = (e) => e[0] + ':' + ascii(e.subarray(1, 12).map((x) => x & 0x7F));
    function files() {
      const m = new Map();
      ents().forEach((e, i) => {
        if (e[0] > 15) return;
        const k = key(e);
        if (!m.has(k)) m.set(k, { user: e[0], name: ascii(e.subarray(1, 9).map((x) => x & 0x7F)), ext: ascii(e.subarray(9, 12).map((x) => x & 0x7F)), ents: [] });
        m.get(k).ents.push(i);
      });
      return [...m.values()];
    }
    const extNo = (e) => e[12] + 32 * e[14];
    const vol = {
      kind: 'CP/M',
      list() {
        return files().map((f, i) => {
          const es = f.ents.map((j) => dir.subarray(j * 32, j * 32 + 32));
          const size = es.reduce((s, e) => s + recsOf(e) * 128, 0);
          return { id: f, name: (f.user ? f.user + '/' : '') + f.name.trim(), ext: f.ext.trim(), size, show: size, sub: '' };
        });
      },
      free() {
        const used = new Set(); for (let b = 0; b < dirBlocks; b++) used.add(b);
        ents().forEach((e) => { if (e[0] <= 15) blocks(e).forEach((b) => used.add(b)); });
        return (p.dsm + 1 - used.size) * p.bs;
      },
      read(it) {
        const es = it.id.ents.map((j) => dir.subarray(j * 32, j * 32 + 32)).sort((a, b) => extNo(a) - extNo(b));
        const parts = []; let total = 0;
        for (const e of es) {
          let need = recsOf(e) * 128;
          for (const b of blocks(e)) { if (need <= 0) break; const n = Math.min(need, p.bs); parts.push(io(p.off + b * p.bs, n)); need -= n; total += n; }
        }
        const data = new Uint8Array(total); let o = 0; for (const x of parts) { data.set(x, o); o += x.length; }
        return { name: it.id.name.trim(), ext: it.id.ext.trim(), data };
      },
      write(f0) {
        const f = toCpm(f0);
        const nm = pad(cpmName(f.name.trim()), 8), ex = pad(cpmName((f.ext || '').trim()), 3);
        if (files().some((x) => x.user === 0 && x.name === nm && x.ext === ex)) throw new Error('file exists');
        const recs = Math.max(1, Math.ceil(f.data.length / 128)), nblk = Math.ceil(recs * 128 / p.bs), cap = (exm + 1) * 128, nent = Math.ceil(recs / cap);
        const used = new Set(); for (let b = 0; b < dirBlocks; b++) used.add(b);
        ents().forEach((e) => { if (e[0] <= 15) blocks(e).forEach((b) => used.add(b)); });
        const freeB = []; for (let b = dirBlocks; b <= p.dsm && freeB.length < nblk; b++) if (!used.has(b)) freeB.push(b);
        if (freeB.length < nblk) throw new Error('disk full');
        const slots = []; ents().forEach((e, i) => { if (e[0] === 0xE5 && slots.length < nent) slots.push(i); });
        if (slots.length < nent) throw new Error(`directory full: ${slots.length} of ${p.drm + 1} entries free, the file needs ${nent} (one per ${cap / 8}K)`);
        const buf = new Uint8Array(nblk * p.bs).fill(0x1A); buf.set(f.data);
        freeB.forEach((b, k) => io(p.off + b * p.bs, p.bs, buf.subarray(k * p.bs, (k + 1) * p.bs)));
        const perEnt = cap * 128 / p.bs;
        for (let k = 0; k < nent; k++) {
          const e = dir.subarray(slots[k] * 32, slots[k] * 32 + 32); e.fill(0);
          for (let i = 0; i < 8; i++) e[1 + i] = nm.charCodeAt(i);
          for (let i = 0; i < 3; i++) e[9 + i] = ex.charCodeAt(i);
          const r = Math.min(cap, recs - k * cap), x = k * (exm + 1) + Math.floor((r - 1) / 128);
          e[12] = x & 31; e[14] = x >> 5; e[15] = r - Math.floor((r - 1) / 128) * 128;
          freeB.slice(k * perEnt, (k + 1) * perEnt).forEach((b, j) => { if (wide) put16(e, 16 + j * 2, b); else e[16 + j] = b; });
        }
        io(p.off, dirBytes, dir);
      },
      del(it) { it.id.ents.forEach((j) => { dir[j * 32] = 0xE5; }); io(p.off, dirBytes, dir); },
      // directory entries: each holds 16K × (EXM + 1) of a file, so a full directory stops writing before the blocks run out
      dirFree() { return { free: ents().filter((e) => e[0] > 15).length, all: p.drm + 1, per: (exm + 1) * 16384 }; },
    };
    return vol;
  }
  function looksCpm(dir) { // a plausible CP/M directory: every entry is free (E5) or a user 0..15 entry with a printable name
    let used = 0;
    for (let i = 0; i < 64; i++) {
      const e = dir.subarray(i * 32, i * 32 + 32);
      if (e[0] === 0xE5) continue;
      if (e[0] > 15) return false;
      for (let k = 1; k < 12; k++) { const c = e[k] & 0x7F; if (c < 0x20 || c > 0x7E) return false; }
      used++;
    }
    return true;
  }

  // ---- partitioned ATM hard disks (the drives are listed in the image's .chs file, see app.js): a CP/M drive is a run of
  // whole cylinders addressed as plain sectors; block size, pointer width and directory size come from the directory.
  const plausEnt = (a, o) => { // 0 = not a directory entry, 1 = free / other, 2 = a file entry
    const u = a[o]; if (u === 0xE5) return 1; if (u > 0x21) return 0;
    if (u > 15) return 1; // label / time stamps (CP/M 3)
    for (let k = 1; k < 12; k++) { const c = a[o + k] & 0x7F; if (c < 0x20 || c > 0x7E) return 0; }
    return 2;
  };
  function dirRun(a, o) { let n = 0, used = 0; for (let q = o, end = Math.min(a.length, o + 65536); q + 32 <= end; q += 32) { const r = plausEnt(a, q); if (!r) break; n++; if (r === 2) used++; } return { n, used }; }
  function cpmDpb(a, off, size) {
    const run = dirRun(a, off), ents = [];
    for (let i = 0; i < run.n; i++) { const o = off + i * 32; if (a[o] <= 15) ents.push(a.subarray(o, o + 32)); }
    let best = null;
    for (const bs of [1024, 2048, 4096, 8192, 16384]) for (const wide of [true, false]) {
      const ptrs = wide ? 8 : 16, exm = bs * ptrs / 16384 - 1; if (exm < 0) continue;
      const maxB = Math.min(Math.floor(size / bs), wide ? 65536 : 256);
      let ok = 0, minP = Infinity, maxP = 0; const seen = new Set();
      for (const e of ents) {
        const b = []; let gap = false, fine = e[15] <= 128;
        for (let k = 0; k < ptrs; k++) { const v = wide ? e[16 + 2 * k] | (e[17 + 2 * k] << 8) : e[16 + k]; if (v) { if (gap || v >= maxB || seen.has(v)) fine = false; b.push(v); } else gap = true; }
        if (b.length !== Math.ceil(((e[12] & exm) * 128 + e[15]) * 128 / bs)) fine = false;
        if (fine) { ok++; b.forEach((v) => { seen.add(v); minP = Math.min(minP, v); maxP = Math.max(maxP, v); }); }
      }
      const miss = minP === Infinity ? 1e9 : Math.abs(minP * bs - run.n * 32); // the directory usually ends where the first file begins
      if (!best || ok > best.ok || (ok === best.ok && miss < best.miss)) best = { bs, wide, ok, miss, minP, maxP };
    }
    if (!ents.length) { const bs = size > 4194304 ? 4096 : 2048; best = { bs, wide: true, ok: 0, minP: Math.ceil(Math.min(run.n, 512) * 32 / bs), maxP: 0 }; }
    if (ents.length && best.ok < ents.length * 0.9) return null;
    const per = best.bs / 32, dirN = Math.max(per, Math.min(best.minP * per, Math.ceil(run.n / per) * per));
    let dsm = Math.min(Math.floor(size / best.bs), 8388608 / best.bs, best.wide ? 65536 : 256) - 1;
    dsm = Math.max(dsm, best.maxP);
    return { bs: best.bs, wide: best.wide, drm: dirN - 1, dsm, guessed: !ents.length };
  }
  // a CP/M drive inside cylinders [off, end): the directory is the first one in its first 256 sectors (after the system tracks)
  function cpmPart(a, off, end) {
    let at = -1;
    for (let s = 0; s < 256 && off + s * 512 < end; s++) {
      const o = off + s * 512;
      if (plausEnt(a, o) === 2 && dirRun(a, o).n >= 64) { at = o; break; }
      if (at < 0 && dirRun(a, o).n >= 64) at = o; // empty drive: the first all-free run
    }
    if (at < 0) return null;
    const d = cpmDpb(a, at, end - at);
    return d && Object.assign(d, { off: at, end });
  }

  // ---- a new image from chosen drives (cylinder 0 always copied). pack: CP/M drives stay at their cylinders (their
  // table is in the CP/M system), iS-DOS drives move down into the free cylinders. Then (both ways) every drive table that
  // holds cylinders is updated: HDD boot loader in cylinder 0 (S, H at +8, boot cylinder + drives A:–H: at +10) and the
  // iS-DOS HDD driver ("hdd" 2, S, H, drives A:–H:) in the chosen drives — as a file and in saved system images — and the
  // cr_boot.com loaders that start another system from its drive
  function hddRepack(src, g, parts, sel, pack) {
    const cylB = g.h * g.s * 512, placed = [];
    const fixed = sel.filter((p) => !pack || p.fs !== 'isdos');
    fixed.forEach((p) => placed.push({ p, at: p.c0 }));
    let cur = 1;
    for (const p of sel.filter((q) => pack && q.fs === 'isdos')) {
      const n = p.c1 - p.c0 + 1;
      for (let moved = true; moved;) { moved = false; for (const f of fixed) if (cur <= f.c1 && cur + n - 1 >= f.c0) { cur = f.c1 + 1; moved = true; } }
      placed.push({ p, at: cur }); cur += n;
    }
    placed.sort((a, b) => a.at - b.at);
    const end = Math.max(0, ...placed.map(({ p, at }) => at + p.c1 - p.c0));
    const img = new Uint8Array((end + 1) * cylB);
    const copy = (from, to, n) => img.set(src.subarray(Math.min(src.length, from * cylB), Math.min(src.length, (from + n) * cylB)), to * cylB);
    copy(0, 0, 1);
    placed.forEach(({ p, at }) => copy(p.c0, at, p.c1 - p.c0 + 1));
    // cylinders in the drive tables: chosen drives move with their data; left-out drives become 0 = "no drive"
    // (the iS-DOS driver then answers error 6 instead of reading someone else's cylinders); others stay
    let patched = 0;
    const moves = placed.map(({ p, at }) => ({ c0: p.c0, c1: p.c1, d: at - p.c0 }));
    const gone = parts.filter((p) => !sel.includes(p));
    const map = (v) => {
      const m = moves.find((x) => v >= x.c0 && v <= x.c1); if (m) return v + m.d;
      return gone.some((p) => v >= p.c0 && v <= p.c1) ? 0 : v;
    };
    const firstIs = placed.find(({ p }) => p.fs === 'isdos');
    const fix = (o, n) => { // n cylinder words at o, all plausible
      for (let k = 0; k < n; k++) if (u16(img, o + k * 2) >= g.c) return;
      for (let k = 0; k < n; k++) put16(img, o + k * 2, map(u16(img, o + k * 2)));
      patched++;
    };
    let bootMoved = 0;
    for (let s = 0; s < g.s; s++) {
      const o = s * 512; if (img[o + 8] !== g.s || img[o + 9] !== g.h || img[o] !== 0x18) continue;
      const was = patched; fix(o + 10, 9);
      if (patched > was && !u16(img, o + 10) && firstIs) { put16(img, o + 10, firstIs.at); bootMoved = firstIs.p; } // its system was left out: boot the first chosen iS-DOS drive
    }
    placed.filter(({ p }) => p.fs === 'isdos').forEach(({ p, at }) => {
      const a = at * cylB, b = (at + p.c1 - p.c0 + 1) * cylB;
      for (let o = a; o + 22 <= b; o++) {
        // cr_boot.com loaders (BOOT\bootsys?.com: boot another system): JR, 0, JP #5Exx, S, H, its cylinder — whole files
        if (!(o & 255) && img[o] === 0x18 && img[o + 2] === 0 && img[o + 3] === 0xC3 && img[o + 5] === 0x5E && img[o + 6] === g.s && img[o + 7] === g.h && u16(img, o + 8)) fix(o + 8, 1);
        if (img[o] === 0x68 && img[o + 1] === 0x64 && img[o + 2] === 0x64 && img[o + 3] === 2 && img[o + 4] === g.s && img[o + 5] === g.h) {
          const was = patched; fix(o + 6, 8);
          // a running driver (saved system image) also caches the cylinders of its current position: words 8 and 10
          if (patched > was) [o + 22, o + 26].forEach((q) => { const v = u16(img, q); if (v) put16(img, q, map(v)); });
        }
      }
    });
    return { img, placed, patched, bootMoved };
  }

  // ---- FAT12 / 16 / 32 (SD cards, ZX-Evolution HDDs): on a whole image `a` (a superfloppy or MBR partitions), in place.
  // Names: long names are shown; new files and directories get 8.3 names. TR-DOS files are written as Hobeta (NAME.$T).
  function fatWhy(a) { // why fatFind found nothing: a hint for the message
    if (a.length >= 512 && String.fromCharCode(...a.subarray(0, 8)) === 'conectix') return ' (a dynamic VHD: convert it to a fixed one)';
    if (a.length < 1024 || a[510] !== 0x55 || a[511] !== 0xAA) return ' (no boot record)';
    const t = []; for (let k = 0; k < 4; k++) { const e = 446 + k * 16; if (a[e + 4]) t.push('#' + a[e + 4].toString(16).toUpperCase().padStart(2, '0') + ' at ' + ((a[e + 8] | (a[e + 9] << 8) | (a[e + 10] << 16) | (a[e + 11] << 24)) >>> 0)); }
    return t.length ? ' (partitions: ' + t.join(', ') + ')' : ' (no partitions)';
  }
  function fatFind(a) { // → byte offsets of the FAT volumes
    const u16a = (o) => a[o] | (a[o + 1] << 8), u32a = (o) => (a[o] | (a[o + 1] << 8) | (a[o + 2] << 16) | (a[o + 3] << 24)) >>> 0;
    const isBpb = (o) => o + 512 <= a.length && (a[o] === 0xEB || a[o] === 0xE9) && u16a(o + 11) === 512 && [1, 2, 4, 8, 16, 32, 64, 128].includes(a[o + 13]) && a[o + 16] >= 1 && a[o + 16] <= 2 && u16a(o + 14) >= 1;
    if (a.length < 1024 || a[510] !== 0x55 || a[511] !== 0xAA) return [];
    if (isBpb(0)) return [0];
    const out = [], FAT = [0x01, 0x04, 0x06, 0x0B, 0x0C, 0x0E, 0x11, 0x14, 0x16, 0x1B, 0x1C, 0x1E], EXT = [0x05, 0x0F, 0x85];
    for (let k = 0; k < 4; k++) {
      const e = 446 + k * 16, t = a[e + 4], lba = u32a(e + 8);
      if (EXT.includes(t)) { // logical partitions: a chain of EBRs (links relative to the extended partition)
        for (let ebr = lba, n = 0; ebr && n < 64 && ebr * 512 + 512 <= a.length && a[ebr * 512 + 510] === 0x55; n++) {
          const o = ebr * 512 + 446, lt = a[o + 4], ll = u32a(o + 8);
          if (ll && (FAT.includes(lt) || isBpb((ebr + ll) * 512)) && isBpb((ebr + ll) * 512)) out.push((ebr + ll) * 512);
          const nx = u32a(o + 16 + 8); ebr = EXT.includes(a[o + 16 + 4]) && nx ? lba + nx : 0;
        }
      } else if (t && lba && isBpb(lba * 512)) out.push(lba * 512); // any type with a FAT boot sector there
    }
    return out;
  }
  // an empty FAT disk of `bytes` (whole sectors): an MBR with one partition from `start` (0: a superfloppy).
  // FAT16 up to 256 MB (FAT12 when too small for it), FAT32 above; CHS fields of the MBR from heads × spt.
  function fatFormat(bytes, label, o = {}) {
    const N = Math.floor(bytes / 512), start = o.start === undefined ? 63 : o.start, H = o.heads || 16, S = o.spt || 63;
    const a = new Uint8Array(N * 512), P = N - start, b = start * 512;
    const p16 = (q, v) => { a[q] = v & 255; a[q + 1] = (v >> 8) & 255; };
    const p32 = (q, v) => { a[q] = v & 255; a[q + 1] = (v >>> 8) & 255; a[q + 2] = (v >>> 16) & 255; a[q + 3] = (v >>> 24) & 255; };
    const lab = pad((label || 'NO NAME').toUpperCase().replace(/[^A-Z0-9 _\-!#$%&'()@^`{}~]/g, '_').slice(0, 11), 11);
    let type = o.type || (P * 512 > 256 * 1048576 ? 32 : 16), spc, rsvd, rootEnt, fsz, ncl;
    const fit = (t) => { // sectors per cluster and FAT size for type t
      rsvd = t === 32 ? 32 : 1; rootEnt = t === 32 ? 0 : 512;
      const calc = () => {
        fsz = 1;
        for (let i = 0; i < 8; i++) { ncl = Math.floor((P - rsvd - 2 * fsz - rootEnt / 16) / spc); fsz = Math.ceil((ncl + 2) * (t === 12 ? 1.5 : t / 8) / 512); }
        ncl = Math.floor((P - rsvd - 2 * fsz - rootEnt / 16) / spc);
      };
      if (t === 32) { // 4K clusters (8K above 8 GB, …), smaller while the count would make it FAT16
        spc = o.spc || (P > 64 * 2097152 ? 64 : P > 32 * 2097152 ? 32 : P > 16 * 2097152 ? 16 : 8);
        for (calc(); spc > 1 && ncl < 65525; calc()) spc /= 2;
        return ncl >= 65525;
      }
      for (spc = 1; spc <= 128; spc *= 2) { calc(); if (t === 12 ? ncl < 4085 : ncl < 65525) return true; }
      return false;
    };
    if (!fit(type) && type === 32) { type = 16; fit(16); } // too small for FAT32
    if (type === 16 && ncl < 4085) { type = 12; fit(12); }
    if (start) { // MBR
      const chs = (l) => { const c = Math.floor(l / (H * S)); if (c > 1023) return [254, 255, 255]; return [Math.floor(l / S) % H, ((c >> 2) & 0xC0) | (l % S + 1), c & 255]; };
      const e = 446; a[e] = 0x80; a.set(chs(start), e + 1); a.set(chs(N - 1), e + 5);
      a[e + 4] = type === 32 ? 0x0C : type === 12 ? 0x01 : P < 65536 ? 0x04 : 0x06; p32(e + 8, start); p32(e + 12, P);
      a[510] = 0x55; a[511] = 0xAA;
    }
    a.set([0xEB, type === 32 ? 0x58 : 0x3C, 0x90], b); for (let i = 0; i < 8; i++) a[b + 3 + i] = 'UNREAL  '.charCodeAt(i);
    p16(b + 11, 512); a[b + 13] = spc; p16(b + 14, rsvd); a[b + 16] = 2; p16(b + 17, rootEnt);
    if (P < 65536 && type !== 32) p16(b + 19, P); else p32(b + 32, P);
    a[b + 21] = 0xF8; if (type !== 32) p16(b + 22, fsz); p16(b + 24, S); p16(b + 26, H); p32(b + 28, start);
    const serial = (Date.now() / 1000) >>> 0;
    if (type === 32) {
      p32(b + 36, fsz); p32(b + 44, 2); p16(b + 48, 1); p16(b + 50, 6);
      a[b + 64] = 0x80; a[b + 66] = 0x29; p32(b + 67, serial); for (let i = 0; i < 11; i++) a[b + 71 + i] = lab.charCodeAt(i);
      for (let i = 0; i < 8; i++) a[b + 82 + i] = 'FAT32   '.charCodeAt(i);
      const fi = b + 512; p32(fi, 0x41615252); p32(fi + 484, 0x61417272); p32(fi + 488, ncl - 1); p32(fi + 492, 3); p16(fi + 510, 0xAA55);
    } else {
      a[b + 36] = 0x80; a[b + 38] = 0x29; p32(b + 39, serial); for (let i = 0; i < 11; i++) a[b + 43 + i] = lab.charCodeAt(i);
      for (let i = 0; i < 8; i++) a[b + 54 + i] = (type === 12 ? 'FAT12   ' : 'FAT16   ').charCodeAt(i);
    }
    p16(b + 510, 0xAA55);
    if (type === 32) a.copyWithin(b + 6 * 512, b, b + 1024); // backup boot sector + FSInfo (after the boot signature)
    for (let f = 0; f < 2; f++) {
      const t = b + (rsvd + f * fsz) * 512;
      if (type === 12) a.set([0xF8, 0xFF, 0xFF], t);
      else if (type === 16) { p16(t, 0xFFF8); p16(t + 2, 0xFFFF); }
      else { p32(t, 0x0FFFFFF8); p32(t + 4, 0x0FFFFFFF); p32(t + 8, 0x0FFFFFFF); }
    }
    const root = b + (rsvd + 2 * fsz) * 512; // FAT32: cluster 2 (first data cluster)
    for (let i = 0; i < 11; i++) a[root + i] = lab.charCodeAt(i);
    a[root + 11] = 0x08;
    return a;
  }
  function fatVol(a, base, onWrite) {
    const u16a = (o) => a[o] | (a[o + 1] << 8), u32a = (o) => (a[o] | (a[o + 1] << 8) | (a[o + 2] << 16) | (a[o + 3] << 24)) >>> 0;
    const p32 = (o, v) => { a[o] = v & 255; a[o + 1] = (v >>> 8) & 255; a[o + 2] = (v >>> 16) & 255; a[o + 3] = (v >>> 24) & 255; };
    const p16 = (o, v) => { a[o] = v & 255; a[o + 1] = (v >> 8) & 255; };
    const spc = a[base + 13], rsvd = u16a(base + 14), nfats = a[base + 16], rootEnt = u16a(base + 17);
    const tot = u16a(base + 19) || u32a(base + 32), fsz = u16a(base + 22) || u32a(base + 36);
    const rootSecs = Math.ceil(rootEnt * 32 / 512), dataSec = rsvd + nfats * fsz + rootSecs;
    const nclus = Math.floor((tot - dataSec) / spc), type = nclus < 4085 ? 12 : nclus < 65525 ? 16 : 32;
    const cb = spc * 512, fat0 = base + rsvd * 512, eoc = type === 12 ? 0xFF8 : type === 16 ? 0xFFF8 : 0x0FFFFFF8;
    const coff = (c) => base + (dataSec + (c - 2) * spc) * 512;
    const label = ascii(a.subarray(base + (type === 32 ? 71 : 43), base + (type === 32 ? 82 : 54))).trim();
    function getF(c) {
      if (type === 16) return u16a(fat0 + c * 2);
      if (type === 32) return u32a(fat0 + c * 4) & 0x0FFFFFFF;
      const o = fat0 + Math.floor(c * 1.5), v = u16a(o); return c & 1 ? v >> 4 : v & 0xFFF;
    }
    function setF(c, v) {
      for (let f = 0; f < nfats; f++) {
        const t0 = fat0 + f * fsz * 512;
        if (type === 16) p16(t0 + c * 2, v);
        else if (type === 32) p32(t0 + c * 4, (u32a(t0 + c * 4) & 0xF0000000) | (v & 0x0FFFFFFF));
        else { const o = t0 + Math.floor(c * 1.5), w = u16a(o); p16(o, c & 1 ? (w & 0x000F) | (v << 4) : (w & 0xF000) | (v & 0xFFF)); }
      }
    }
    const chain = (c) => { const out = []; while (c >= 2 && c < eoc && out.length <= nclus) { out.push(c); c = getF(c); } return out; };
    const freeN = (n) => { const out = []; for (let c = 2; c < nclus + 2 && out.length < n; c++) if (!getF(c)) out.push(c); if (out.length < n) throw new Error('disk full'); return out; };
    const link = (cs) => cs.forEach((c, i) => setF(c, i + 1 < cs.length ? cs[i + 1] : (type === 12 ? 0xFFF : type === 16 ? 0xFFFF : 0x0FFFFFFF)));
    if (type === 32) p32(base + u16a(base + 48) * 512 + 488, 0xFFFFFFFF); // FSInfo: free count unknown (recounted by the OS)
    // a directory: list of 32-byte slot offsets (root of FAT12/16: fixed area; others: cluster chain)
    const rootStart = type === 32 ? u32a(base + 44) : 0;
    const slotsOf = (d) => {
      const out = [];
      if (d === 0) { const o = base + (rsvd + nfats * fsz) * 512; for (let i = 0; i < rootEnt; i++) out.push(o + i * 32); }
      else for (const c of chain(d)) for (let i = 0; i < cb; i += 32) out.push(coff(c) + i);
      return out;
    };
    function entries(d) {
      const out = []; let lfn = [];
      for (const o of slotsOf(d)) {
        const b0 = a[o]; if (b0 === 0) break;
        if (b0 === 0xE5) { lfn = []; continue; }
        if (a[o + 11] === 0x0F) { lfn.push(o); continue; }
        if (a[o + 11] & 0x08) { lfn = []; continue; } // volume label
        let short = ascii(a.subarray(o, o + 8)).trimEnd(), ext = ascii(a.subarray(o + 8, o + 11)).trimEnd();
        if (a[o + 12] & 0x08) short = short.toLowerCase(); // NT case bits
        if (a[o + 12] & 0x10) ext = ext.toLowerCase();
        let long = '';
        if (lfn.length) { for (let i = lfn.length - 1; i >= 0; i--) { const q = lfn[i]; for (const k of [1, 3, 5, 7, 9, 14, 16, 18, 20, 22, 24, 28, 30]) { const ch = u16a(q + k); if (ch === 0 || ch === 0xFFFF) break; long += String.fromCharCode(ch); } } }
        const name = short === '.' || short === '..' ? short : long || (short + (ext ? '.' + ext : ''));
        if (name !== '.' && name !== '..') out.push({ o, lfn: lfn.slice(), name, dir: !!(a[o + 11] & 0x10), size: u32a(o + 28), date: u16a(o + 24) * 65536 + u16a(o + 22), clus: u16a(o + 26) | (type === 32 ? u16a(o + 20) << 16 : 0) });
        lfn = [];
      }
      return out;
    }
    let path = [{ name: '', d: rootStart }];
    const cwd = () => path[path.length - 1].d;
    const split = (n) => { const m = /^(.*?)(?:\.([^.]*))?$/.exec(n); return [m[1], m[2] || '']; };
    function slotFree(d, need) { // `need` free slots in a row (a new cluster for sub-directories / FAT32 root when full)
      for (;;) {
        const sl = slotsOf(d);
        for (let i = 0, run = 0; i < sl.length; i++) { const b0 = a[sl[i]]; run = b0 === 0 || b0 === 0xE5 ? run + 1 : 0; if (run === need) return sl.slice(i - need + 1, i + 1); }
        if (d === 0) throw new Error('root directory full');
        const [c] = freeN(1), cs = chain(d); a.fill(0, coff(c), coff(c) + cb); link(cs.concat(c));
      }
    }
    // a name that is a plain 8.3 one (upper case, allowed characters) needs no long-name entries
    const OK83 = /^[A-Z0-9!#$%&'()\-@^_`{}~]{1,8}(\.[A-Z0-9!#$%&'()\-@^_`{}~]{1,3})?$/;
    const fits83 = (name) => OK83.test(name);
    const short83 = (name, d) => { // the short name: as is when it fits, else NAME~k.EXT (Windows style)
      const [n0, x0] = split(name.toUpperCase());
      const clean = (s, l) => s.replace(/[ .]/g, '').replace(/[^A-Z0-9!#$%&'()\-@^_`{}~]/g, '_').slice(0, l);
      const used = new Set(entries(d).map((e) => ascii(a.subarray(e.o, e.o + 11))));
      const x = clean(x0, 3);
      // a plain 8.3 name in any case: the same short name (as Windows)
      if (fits83(name.toUpperCase())) { const n = clean(n0, 8); if (!used.has(pad(n, 8) + pad(x, 3))) return pad(n, 8) + pad(x, 3); }
      const b = clean(n0, 8) || '_';
      for (let k = 1; k < 1e6; k++) { const t = '~' + k, n = b.slice(0, 8 - t.length) + t; if (!used.has(pad(n, 8) + pad(x, 3))) return pad(n, 8) + pad(x, 3); }
      throw new Error('too many similar names');
    };
    function makeEntry(d, nm83, attr, clus, size, long) {
      // case only (all-lower / all-upper name and extension): no long name, the NT case bits do it (as Windows)
      let nt = -1;
      if (long && fits83(long.toUpperCase())) {
        const [b, x] = split(long), one = (t) => t === t.toUpperCase() ? 0 : t === t.toLowerCase() ? 1 : -1, cb = one(b), cx = one(x);
        if (cb >= 0 && cx >= 0) nt = (cb ? 0x08 : 0) | (cx ? 0x10 : 0);
      }
      const lfn = long && nt < 0 && !fits83(long) ? long.slice(0, 255) : '', nl = lfn ? Math.ceil(lfn.length / 13) : 0;
      const sl = slotFree(d, nl + 1), o = sl[nl];
      if (nl) { // long-name entries, last part first; each holds 13 UCS-2 characters
        let sum = 0; for (let i = 0; i < 11; i++) sum = (((sum & 1) << 7) + (sum >> 1) + nm83.charCodeAt(i)) & 255;
        for (let k = 1; k <= nl; k++) {
          const q = sl[nl - k]; a.fill(0, q, q + 32);
          a[q] = k | (k === nl ? 0x40 : 0); a[q + 11] = 0x0F; a[q + 13] = sum;
          [1, 3, 5, 7, 9, 14, 16, 18, 20, 22, 24, 28, 30].forEach((off, j) => {
            const i = (k - 1) * 13 + j; p16(q + off, i < lfn.length ? lfn.charCodeAt(i) : i === lfn.length ? 0 : 0xFFFF);
          });
        }
      }
      a.fill(0, o, o + 32);
      for (let i = 0; i < 11; i++) a[o + i] = nm83.charCodeAt(i);
      a[o + 11] = attr; if (nt > 0) a[o + 12] = nt; p16(o + 26, clus & 0xFFFF); if (type === 32) p16(o + 20, clus >>> 16); p32(o + 28, size);
      const t = new Date(), dt = ((t.getFullYear() - 1980) << 9) | ((t.getMonth() + 1) << 5) | t.getDate(), tm = (t.getHours() << 11) | (t.getMinutes() << 5) | (t.getSeconds() >> 1);
      p16(o + 14, tm); p16(o + 16, dt); p16(o + 18, dt); p16(o + 22, tm); p16(o + 24, dt);
      return o;
    }
    const vol = {
      kind: 'FAT' + type, label, get path() { return '/' + path.slice(1).map((x) => x.name).join('/'); },
      setPath(names) {
        path = [path[0]];
        for (const n of names || []) { const e = entries(cwd()).find((x) => x.dir && x.name === n); if (!e) break; path.push({ name: n, d: e.clus }); }
        return path.slice(1).map((x) => x.name);
      },
      enter(it) { if (it.up) { if (path.length > 1) path.pop(); } else path.push({ name: it.name, d: it.id.clus }); return path.slice(1).map((x) => x.name); },
      list() {
        const out = [];
        if (path.length > 1) out.push({ id: null, up: true, dir: true, name: '..', ext: '', size: 0, show: '', sub: '' });
        for (const e of entries(cwd())) {
          const [n, x] = e.dir ? [e.name, ''] : split(e.name);
          out.push({ id: e, dir: e.dir, name: n, ext: x, size: e.dir ? 0 : e.size, show: e.dir ? '<DIR>' : e.size, sub: '', date: e.date });
        }
        return out;
      },
      free() { let n = 0; for (let c = 2; c < nclus + 2; c++) if (!getF(c)) n++; return n * cb; },
      read(it) {
        if (it.dir) throw new Error('a directory');
        const e = it.id, data = new Uint8Array(e.size); let o = 0;
        for (const c of chain(e.clus)) { if (o >= e.size) break; const n = Math.min(cb, e.size - o); data.set(a.subarray(coff(c), coff(c) + n), o); o += n; }
        const [n, x] = split(e.name);
        return { name: n, ext: x, data };
      },
      write(f0) {
        const f = f0.zx ? (partExt(f0.zx) ? partRaw(f0) : { name: f0.name.trim(), ext: '$' + f0.zx.type.toLowerCase(), data: hobetaMake(f0) }) : f0;
        const name = (f.name || 'FILE').trim() + (f.ext && f.ext.trim() ? '.' + f.ext.trim() : '');
        if (entries(cwd()).some((e) => e.name.toLowerCase() === name.toLowerCase())) throw new Error('file exists');
        const cs = f.data.length ? freeN(Math.ceil(f.data.length / cb)) : [];
        cs.forEach((c, i) => { const part = f.data.subarray(i * cb, (i + 1) * cb); a.fill(0, coff(c), coff(c) + cb); a.set(part, coff(c)); });
        link(cs);
        try { makeEntry(cwd(), short83(name, cwd()), 0x20, cs[0] || 0, f.data.length, name); } catch (e) { cs.forEach((c) => setF(c, 0)); throw e; }
        onWrite && onWrite();
      },
      del(it) { // a folder goes with everything inside it
        if (it.up) return;
        const kill = (e) => {
          if (e.dir && e.clus) for (const x of entries(e.clus)) kill(x);
          if (e.clus) chain(e.clus).forEach((c) => { a.fill(0, coff(c), coff(c) + cb); setF(c, 0); }); // zeroed: a saved zip shrinks
          for (const q of e.lfn.concat(e.o)) a[q] = 0xE5;
        };
        kill(it.id);
        onWrite && onWrite();
      },
      reserve(bytes) { // the current directory gets room for `bytes` of entries now, in clusters that follow each other
        const d = cwd(); if (d === 0) return; // FAT12/16 root: fixed size
        const cs = chain(d), need = Math.ceil(bytes / cb); if (cs.length >= need) return;
        const add = freeN(need - cs.length); add.forEach((c) => a.fill(0, coff(c), coff(c) + cb)); link(cs.concat(add));
        onWrite && onWrite();
      },
      mkdir(name0) {
        const name = (name0 || '').trim(); if (!name) throw new Error('no name');
        if (entries(cwd()).some((e) => e.name.toLowerCase() === name.toLowerCase())) throw new Error('exists');
        const [c] = freeN(1); a.fill(0, coff(c), coff(c) + cb); link([c]);
        makeEntry(cwd(), short83(name, cwd()), 0x10, c, 0, name);
        const parent = cwd() === rootStart && type !== 32 ? 0 : cwd() === rootStart ? 0 : cwd();
        const t = new Date(), dt = ((t.getFullYear() - 1980) << 9) | ((t.getMonth() + 1) << 5) | t.getDate(), tm = (t.getHours() << 11) | (t.getMinutes() << 5) | (t.getSeconds() >> 1);
        const dot = (o, n, cl) => { for (let i = 0; i < 11; i++) a[o + i] = (pad(n, 11)).charCodeAt(i); a[o + 11] = 0x10; p16(o + 26, cl & 0xFFFF); if (type === 32) p16(o + 20, cl >>> 16);
          p16(o + 14, tm); p16(o + 16, dt); p16(o + 18, dt); p16(o + 22, tm); p16(o + 24, dt); };
        dot(coff(c), '.', c); dot(coff(c) + 32, '..', parent);
        onWrite && onWrite();
      },
    };
    return vol;
  }

  // ---- iS-DOS / TASiS: 80 × 2 × 5 sectors of 1024 bytes, seen as 3200 logical sectors of 256 bytes (raw ISD order).
  // Sector 0: disk descriptor (name at 2, total sectors at #12, root sector at #14); sectors 1–2: bitmap (bit 7 first, 1 = used).
  // Directory slot = 32 bytes: name 8, ext 3, attr, addr 2, length 3, start 2, … , checksum 2 (#1A), date 2 (#1E, DOS).
  // attr: bit 0 = exists (clear: deleted), bit 5 = directory, bit 6 = contiguous (clear: start = extent map:
  // count, then count × (sector 2, length 1)). Slot 0 of a directory describes it: #15 = slots used, #16 = live entries.
  const ISD_SIZE = 80 * 2 * 5 * 1024;
  const cp866 = (() => { try { return new TextDecoder('ibm866'); } catch (e) { return null; } })();
  const dec866 = (b) => cp866 ? cp866.decode(b) : ascii(b);
  const raw = (b) => String.fromCharCode(...b);
  function looksIsdos(img) {
    if (!img || img.length < ISD_SIZE) return false;
    const total = u16(img, 0x12), root = img[0x14];
    return total > 16 && total <= 3200 && root >= 3 && root < 64 && img[0x19] === 5 && img[0x17] === 3;
  }
  function isdos(img) {
    const S = (n) => img.subarray(n * 256, n * 256 + 256);
    const total = Math.min(img.length >> 8, u16(img, 0x12)), bm = img.subarray(0x100, 0x100 + Math.ceil(total / 8)); // floppy: 3200 sectors; HDD drive: up to 65535
    const isUsed = (i) => (bm[i >> 3] >> (7 - (i & 7))) & 1;
    const setUsed = (i, v) => { if (v) bm[i >> 3] |= 0x80 >> (i & 7); else bm[i >> 3] &= ~(0x80 >> (i & 7)); };
    const len3 = (e) => e[14] | (e[15] << 8) | (e[16] << 16);
    function chain(e) { // { secs, maps } of an entry
      const at = e[11], st = u16(e, 17);
      if (at & 0x40 || at === 0xFF) return { secs: Array.from({ length: Math.ceil(len3(e) / 256) }, (_, k) => st + k), maps: [] };
      const m = S(st), n = m[0];
      if (!n || n > 85) throw new Error('bad extent map');
      const secs = [];
      for (let i = 0; i < n; i++) { const a = u16(m, 1 + i * 3); for (let k = 0; k < m[3 + i * 3]; k++) secs.push(a + k); }
      return { secs, maps: [st] };
    }
    // a directory: its data sectors; slot i lives in secs[i >> 3]
    const slot = (dir, i) => { const s = dir.secs[i >> 3]; return s === undefined || s >= total ? null : img.subarray(s * 256 + (i & 7) * 32, s * 256 + (i & 7) * 32 + 32); };
    const rootSelf = S(img[0x14]).subarray(0, 32);
    const root = { name: '', secs: chain(rootSelf).secs, root: true };
    let path = [root];
    const cwd = () => path[path.length - 1];
    const self = (dir) => slot(dir, 0);
    const live = (e) => e && e.some((x) => x) && (e[11] === 0xFF || (e[11] & 1));
    const isDir = (e) => e[11] !== 0xFF && (e[11] & 0x20);
    const dname = (e) => { const n = dec866(e.subarray(0, 8)).trimEnd(), x = dec866(e.subarray(8, 11)).trimEnd(); return [n, x]; };
    function entries(dir) {
      const out = [], me = self(dir), cnt = Math.min(me[21], dir.secs.length * 8);
      for (let i = 1; i < cnt; i++) { const e = slot(dir, i); if (live(e)) out.push({ i, e }); }
      return out;
    }
    function openDir(e, name) { return { name, secs: chain(e).secs }; }
    const vol = {
      kind: 'iS-DOS',
      label: dec866(img.subarray(2, 13)).trim(),
      get path() { return '/' + path.slice(1).map((d) => d.name).join('/'); },
      setPath(names) { // names from the root; stops where a directory is missing
        path = [root];
        for (const n of names || []) {
          const hit = entries(cwd()).find(({ e }) => isDir(e) && dname(e)[0] === n);
          if (!hit) break;
          try { path.push(openDir(hit.e, n)); } catch (err) { break; }
        }
        return path.slice(1).map((d) => d.name);
      },
      enter(it) { // → path names after entering (it.up: one level up)
        if (it.up) { if (path.length > 1) path.pop(); }
        else path.push(openDir(it.id.e, it.name));
        return path.slice(1).map((d) => d.name);
      },
      list() {
        const out = [];
        if (path.length > 1) out.push({ id: null, up: true, dir: true, name: '..', ext: '', size: 0, show: '', sub: '' });
        for (const { i, e } of entries(cwd())) {
          const [n, x] = dname(e), d = isDir(e);
          out.push({ id: { i, e }, dir: !!d, name: n, ext: x, size: d ? 0 : len3(e), show: d ? '<DIR>' : len3(e), sub: '', sys: e[11] === 0xFF, date: u16(e, 30) * 65536 });
        }
        return out;
      },
      free() { let n = 0; for (let i = 0; i < total; i++) if (!isUsed(i)) n++; return n * 256; },
      read(it) {
        if (it.dir) throw new Error('a directory');
        const e = it.id.e, n = len3(e), { secs } = chain(e), data = new Uint8Array(n);
        secs.forEach((s, k) => { if (k * 256 < n) data.set(S(s).subarray(0, Math.min(256, n - k * 256)), k * 256); });
        const name = raw(e.subarray(0, 8)).trimEnd(), ext = raw(e.subarray(8, 11)).trimEnd();
        return { name, ext, addr: u16(e, 12), data };
      },
      write(f0) {
        let f = f0, addr = f.addr || 0;
        if (f.zx) { addr = f.zx.start; f = { name: f.name, ext: partExt(f.zx) || f.zx.type, data: f.data.slice(0, f.zx.type === 'B' ? f.data.length : Math.min(f.data.length, f.zx.len || f.data.length)) }; }
        const nm = pad((f.name || 'file').trim(), 8), ex = pad((f.ext || '').trim(), 3);
        const dir = cwd();
        if (entries(dir).some(({ e }) => raw(e.subarray(0, 8)) === nm && raw(e.subarray(8, 11)) === ex)) throw new Error('file exists');
        const need = Math.max(1, Math.ceil(f.data.length / 256));
        let start = -1;
        for (let s = 0, run = 0; s < total; s++) { run = isUsed(s) ? 0 : run + 1; if (run === need) { start = s - need + 1; break; } }
        if (start < 0) throw new Error('disk full (no ' + need + ' free sectors in a row)');
        const me = self(dir); let cnt = me[21], k = -1;
        for (let i = 1; i < cnt; i++) { const e = slot(dir, i); if (e && !live(e)) { k = i; break; } }
        if (k < 0) { if (cnt >= dir.secs.length * 8) throw new Error('directory full'); k = cnt++; }
        for (let i = 0; i < need; i++) { setUsed(start + i, 1); S(start + i).fill(0); }
        img.set(f.data, start * 256);
        const e = slot(dir, k); e.fill(0);
        for (let i = 0; i < 8; i++) e[i] = nm.charCodeAt(i) & 255;
        for (let i = 0; i < 3; i++) e[8 + i] = ex.charCodeAt(i) & 255;
        e[11] = 0x41; put16(e, 12, addr); e[14] = f.data.length & 255; e[15] = (f.data.length >> 8) & 255; e[16] = f.data.length >> 16;
        put16(e, 17, start);
        let sum = 0; for (const b of f.data) sum += b;
        put16(e, 26, (-sum) & 0xFFFF);
        const d = new Date(); put16(e, 30, ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate());
        me[21] = cnt; me[22] = entries(dir).length;
        if (!dir.root && len3(me) < cnt * 32) { const z = cnt * 32; me[14] = z & 255; me[15] = (z >> 8) & 255; me[16] = z >> 16; }
      },
      mkdir(name0) { // a contiguous 4-sector directory (32 slots); slot 0 describes it, +12 = the parent's first sector
        const nm = pad((name0 || '').trim().toUpperCase().slice(0, 8), 8), ex = pad('', 3), dir = cwd();
        if (!nm.trim()) throw new Error('no name');
        if (entries(dir).some(({ e }) => raw(e.subarray(0, 8)) === nm && raw(e.subarray(8, 11)) === ex)) throw new Error('exists');
        const need = 4;
        let start = -1;
        for (let s = 0, run = 0; s < total; s++) { run = isUsed(s) ? 0 : run + 1; if (run === need) { start = s - need + 1; break; } }
        if (start < 0) throw new Error('disk full');
        const me = self(dir); let cnt = me[21], k = -1;
        for (let i = 1; i < cnt; i++) { const e = slot(dir, i); if (e && !live(e)) { k = i; break; } }
        if (k < 0) { if (cnt >= dir.secs.length * 8) throw new Error('directory full'); k = cnt++; }
        for (let i = 0; i < need; i++) { setUsed(start + i, 1); S(start + i).fill(0); }
        const d = new Date(), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
        const fill = (e) => {
          e.fill(0);
          for (let i = 0; i < 8; i++) e[i] = nm.charCodeAt(i) & 255;
          for (let i = 0; i < 3; i++) e[8 + i] = ex.charCodeAt(i) & 255;
          e[11] = 0x61; e[14] = 0; e[15] = need; e[16] = 0; put16(e, 17, start); put16(e, 19, start); put16(e, 30, date);
        };
        fill(slot(dir, k));
        const own = img.subarray(start * 256, start * 256 + 32); fill(own);
        put16(own, 12, dir.secs[0]); own[21] = 1; own[22] = 0; own[23] = 1;
        me[21] = cnt; me[22] = entries(dir).length;
        if (!dir.root && len3(me) < cnt * 32) { const z = cnt * 32; me[14] = z & 255; me[15] = (z >> 8) & 255; me[16] = z >> 16; }
      },
      del(it) {
        if (it.up) return;
        const e = it.id.e;
        if (it.sys) throw new Error('system file');
        const sysIn = (d) => entries(d).some(({ e: x }) => x[11] === 0xFF || (isDir(x) && sysIn(openDir(x))));
        if (it.dir && sysIn(openDir(e))) throw new Error('a system file inside');
        const kill = (x) => { // a folder goes with everything inside it
          if (isDir(x)) for (const { e: y } of entries(openDir(x))) kill(y);
          const { secs, maps } = chain(x);
          for (const s of secs.concat(maps)) if (s < total) { S(s).fill(0); setUsed(s, 0); } // zeroed: a saved zip shrinks
          x[11] &= ~1;
        };
        kill(e);
        const me = self(cwd()); me[22] = entries(cwd()).length;
      },
    };
    return vol;
  }

  // an empty iS-DOS disk (raw ISD image): descriptor, bitmap, a 4-sector root with "." and device.sys (sectors 0–2)
  // hdd = size of an HDD drive in bytes: 65528 sectors, bitmap in 1–32, root's extent map in 33, root 34–37 (as on ATM HDDs)
  function isdosFormat(label, hdd) {
    const img = new Uint8Array(hdd || ISD_SIZE), d = new Date();
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const nm = pad(label || 'iS-DOS', 11);
    for (let i = 0; i < 11; i++) img[2 + i] = nm.charCodeAt(i) & 255;
    img.set([0x44, 0x53, 0x4B], 0x0D);                                  // "DSK"
    const total = hdd ? Math.min(65528, Math.floor(hdd / 256) & ~7) : 3200, root = hdd ? 34 : 3;
    put16(img, 0x12, total); img[0x14] = root; img[0x16] = 80; img[0x17] = 3; img[0x18] = 4; img[0x19] = 5;
    put16(img, 0x1E, date);
    if (!hdd) img.set([0, 1, 2, 3, 8], 0x40);                            // floppy: sector numbers 1 2 3 4 9 − 1
    for (let i = 0; i < root + 4; i++) img[0x100 + (i >> 3)] |= 0x80 >> (i & 7); // descriptor, bitmap, (map,) root used
    const ent = (o, name, ext, at, addr, len, st) => {
      const n = pad(name, 8), x = pad(ext, 3);
      for (let i = 0; i < 8; i++) img[o + i] = n.charCodeAt(i) & 255;
      for (let i = 0; i < 3; i++) img[o + 8 + i] = x.charCodeAt(i) & 255;
      img[o + 11] = at; put16(img, o + 12, addr); img[o + 14] = len & 255; img[o + 15] = (len >> 8) & 255; img[o + 16] = len >> 16;
      put16(img, o + 17, st); put16(img, o + 30, date);
    };
    const r = root * 256;
    if (hdd) { // root through an extent map (1 run: sectors 34–37); device.sys = the system sectors 0–32
      img.set([1, root, 0, 4], 33 * 256);
      ent(r, '\xff.', '', 0xA1, root, 0x400, 33); put16(img, r + 19, root); img[r + 21] = 2; img[r + 22] = 1;
      ent(r + 32, 'device', 'sys', 0xFF, 0, 33 * 256, 0); img[r + 32 + 19] = 0xFF;
    } else {
      ent(r, '\xff.', '', 0xE1, 3, 0x400, 3); put16(img, r + 19, 3); img[r + 21] = 2; img[r + 22] = 1;   // root: 2 slots, 1 live
      ent(r + 32, 'device', 'sys', 0xFF, 0, 0x300, 0); img[r + 32 + 19] = 0xFF;
    }
    return img;
  }

  // ---- RAM disk: files as they are (TR-DOS or CP/M)
  function ramdisk(store) {
    return {
      kind: 'RAM',
      list() { return store.map((f, i) => ({ id: f, name: f.name.trim(), ext: f.zx ? partExt(f.zx) || f.zx.type : (f.ext || '').trim(), zx: f.zx, size: f.data.length, show: f.zx ? f.zx.len : f.data.length, sub: f.zx && f.zx.type !== 'B' ? String(f.zx.start) : '' })); },
      free() { return RAM_CAP - store.reduce((s, f) => s + Math.ceil(f.data.length / 256) * 256, 0); },
      read(it) { const f = it.id; return { name: f.name, ext: f.ext, zx: f.zx && Object.assign({}, f.zx), data: f.data.slice() }; },
      write(f) {
        if (Math.ceil(f.data.length / 256) * 256 > this.free()) throw new Error('RAM disk full');
        const same = (x) => x.name.trim() === f.name.trim() && (x.zx ? (f.zx && x.zx.type === f.zx.type && (!partExt(f.zx) || x.zx.start === f.zx.start)) : (!f.zx && (x.ext || '').trim() === (f.ext || '').trim()));
        if (store.some(same)) throw new Error('file exists');
        store.push({ name: f.name, ext: f.ext, zx: f.zx && Object.assign({}, f.zx), data: f.data.slice() });
      },
      del(it) { const i = store.indexOf(it.id); if (i >= 0) store.splice(i, 1); },
    };
  }

  // ---- Z80 disassembler: z80dis(rd, pc) → { len, text }; rd(addr) returns a byte
  const Z = (() => {
    const R8 = ['B', 'C', 'D', 'E', 'H', 'L', '(HL)', 'A'], RP = ['BC', 'DE', 'HL', 'SP'], RP2 = ['BC', 'DE', 'HL', 'AF'];
    const CC = ['NZ', 'Z', 'NC', 'C', 'PO', 'PE', 'P', 'M'], ALU = ['ADD A,', 'ADC A,', 'SUB ', 'SBC A,', 'AND ', 'XOR ', 'OR ', 'CP '];
    const ROT = ['RLC', 'RRC', 'RL', 'RR', 'SLA', 'SRA', 'SLL', 'SRL'], ACC = ['RLCA', 'RRCA', 'RLA', 'RRA', 'DAA', 'CPL', 'SCF', 'CCF'];
    const BLK = [['LDI', 'CPI', 'INI', 'OUTI'], ['LDD', 'CPD', 'IND', 'OUTD'], ['LDIR', 'CPIR', 'INIR', 'OTIR'], ['LDDR', 'CPDR', 'INDR', 'OTDR']];
    const IM = ['0', '0', '1', '2', '0', '0', '1', '2'], EDZ7 = ['LD I,A', 'LD R,A', 'LD A,I', 'LD A,R', 'RRD', 'RLD', 'NOP', 'NOP'];
    const h2 = (v) => '#' + v.toString(16).toUpperCase().padStart(2, '0'), h4 = (v) => '#' + (v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return function dis(rd, pc0) {
      let pc = pc0;
      const nb = () => rd(pc++ & 0xFFFF), n16 = () => { const l = nb(); return l | (nb() << 8); };
      const ret = (text) => ({ len: (pc - pc0) & 0xFFFF, text });
      let op = nb(), ix = null;
      if (op === 0xDD || op === 0xFD) {
        const nx = rd(pc & 0xFFFF);
        if (nx === 0xDD || nx === 0xFD || nx === 0xED) return ret('DB ' + h2(op));
        ix = op === 0xDD ? 'IX' : 'IY'; op = nb();
      }
      let dsp = null; // (IX+d): d is fetched once, right after the opcode
      const mem = () => { if (!ix) return '(HL)'; if (dsp === null) { const d = nb(); dsp = d < 128 ? d : d - 256; } return '(' + ix + (dsp < 0 ? '-' + h2(-dsp) : '+' + h2(dsp)) + ')'; };
      const r = (i, plain) => i === 6 ? mem() : ix && !plain && (i === 4 || i === 5) ? ix + (i === 4 ? 'H' : 'L') : R8[i];
      const hl = () => ix || 'HL';
      const rp = (p) => p === 2 ? hl() : RP[p], rp2 = (p) => p === 2 ? hl() : RP2[p];
      const rel = () => { const e = nb(); return h4(pc + (e < 128 ? e : e - 256)); };
      if (op === 0xCB) {
        let d = 0; if (ix) { d = nb(); dsp = d < 128 ? d : d - 256; }
        const c = nb(), x = c >> 6, y = (c >> 3) & 7, z = c & 7;
        const t = ix ? mem() : R8[z], tail = ix && z !== 6 && x !== 1 ? ',' + R8[z] : '';
        return ret((x === 0 ? ROT[y] + ' ' : ['', 'BIT ', 'RES ', 'SET '][x] + y + ',') + t + tail);
      }
      if (op === 0xED) {
        const c = nb(), x = c >> 6, y = (c >> 3) & 7, z = c & 7, p = y >> 1, q = y & 1;
        if (x === 1) {
          switch (z) {
            case 0: return ret(y === 6 ? 'IN (C)' : 'IN ' + R8[y] + ',(C)');
            case 1: return ret(y === 6 ? 'OUT (C),0' : 'OUT (C),' + R8[y]);
            case 2: return ret((q ? 'ADC HL,' : 'SBC HL,') + RP[p]);
            case 3: { const a = h4(n16()); return ret(q ? 'LD ' + RP[p] + ',(' + a + ')' : 'LD (' + a + '),' + RP[p]); }
            case 4: return ret('NEG');
            case 5: return ret(y === 1 ? 'RETI' : 'RETN');
            case 6: return ret('IM ' + IM[y]);
            default: return ret(EDZ7[y]);
          }
        }
        if (x === 2 && z <= 3 && y >= 4) return ret(BLK[y - 4][z]);
        return ret('DB #ED,' + h2(c));
      }
      const x = op >> 6, y = (op >> 3) & 7, z = op & 7, p = y >> 1, q = y & 1;
      if (x === 0) {
        switch (z) {
          case 0: return ret(y === 0 ? 'NOP' : y === 1 ? "EX AF,AF'" : y === 2 ? 'DJNZ ' + rel() : y === 3 ? 'JR ' + rel() : 'JR ' + CC[y - 4] + ',' + rel());
          case 1: return ret(q ? 'ADD ' + hl() + ',' + rp(p) : 'LD ' + rp(p) + ',' + h4(n16()));
          case 2: {
            if (p < 2) return ret(q ? 'LD A,(' + RP[p] + ')' : 'LD (' + RP[p] + '),A');
            const a = h4(n16()), rr = p === 2 ? hl() : 'A';
            return ret(q ? 'LD ' + rr + ',(' + a + ')' : 'LD (' + a + '),' + rr);
          }
          case 3: return ret((q ? 'DEC ' : 'INC ') + rp(p));
          case 4: return ret('INC ' + r(y));
          case 5: return ret('DEC ' + r(y));
          case 6: { const t = r(y); return ret('LD ' + t + ',' + h2(nb())); }
          default: return ret(ACC[y]);
        }
      }
      if (x === 1) { if (y === 6 && z === 6) return ret('HALT'); const m = y === 6 || z === 6; return ret('LD ' + r(y, m) + ',' + r(z, m)); }
      if (x === 2) return ret(ALU[y] + r(z));
      switch (z) {
        case 0: return ret('RET ' + CC[y]);
        case 1: return ret(q ? ['RET', 'EXX', 'JP (' + hl() + ')', 'LD SP,' + hl()][p] : 'POP ' + rp2(p));
        case 2: return ret('JP ' + CC[y] + ',' + h4(n16()));
        case 3: switch (y) {
          case 0: return ret('JP ' + h4(n16()));
          case 2: return ret('OUT (' + h2(nb()) + '),A');
          case 3: return ret('IN A,(' + h2(nb()) + ')');
          case 4: return ret('EX (SP),' + hl());
          case 5: return ret('EX DE,HL');
          case 6: return ret('DI');
          default: return ret('EI');
        }
        case 4: return ret('CALL ' + CC[y] + ',' + h4(n16()));
        case 5: return ret(q ? 'CALL ' + h4(n16()) : 'PUSH ' + rp2(p));
        case 6: return ret(ALU[y] + h2(nb()));
        default: return ret('RST ' + h2(y * 8));
      }
    };
  })();

  // ---- file viewer: text or address + hex + text, several 8-bit encodings
  const ENC = [['zx', 'ZX Spectrum'], ['cp866', 'CP866 (alt)'], ['koi8-r', 'KOI8-R'], ['windows-1251', 'Windows-1251'], ['latin1', 'Latin-1']];
  const decTab = {};
  function table(enc) { // 256 printable characters for the encoding (controls shown as ·)
    if (decTab[enc]) return decTab[enc];
    let t;
    if (enc === 'zx' || enc === 'latin1') { t = []; for (let i = 0; i < 256; i++) t.push(i < 32 ? '·' : i < 127 ? String.fromCharCode(i) : enc === 'latin1' && i >= 160 ? String.fromCharCode(i) : '·');
      if (enc === 'zx') { t[0x5E] = '↑'; t[0x60] = '£'; t[0x7F] = '©'; } }
    else { const b = new Uint8Array(256); for (let i = 0; i < 256; i++) b[i] = i; t = [...new TextDecoder(enc).decode(b)];
      for (let i = 0; i < 32; i++) t[i] = '·'; if (t[127]) t[127] = '·'; }
    return (decTab[enc] = t);
  }
  const MODES = ['text', 'hex', 'dis'];
  // load address: TR-DOS code files → their start, CP/M .COM → #0100, otherwise 0
  const defOrg = (f) => f.org !== undefined ? f.org : f.zx ? (f.zx.type === 'C' ? f.zx.start : 0) : ((f.ext || '').trim().toUpperCase() === 'COM' ? 0x100 : 0);
  function makeViewer(api) {
    const w = $('fvwin'), body = $('fvbody');
    let file = null, mode = MODES.includes(api.load('fv.mode')) ? api.load('fv.mode') : 'text', enc = api.load('fv.enc') || 'zx';
    const fw = api.floatWin(w, 'fvpos', () => {
      const r = $('fcwin').getBoundingClientRect(), vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.left + 40, vw - w.offsetWidth - 4)), y: Math.max(8, r.top + 30) };
    });
    ENC.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; $('fvenc').appendChild(o); });
    // size: dragging the window edges (remembered); never larger than the page
    try { const z = JSON.parse(api.load('fv.size')); if (z && z.w > 0 && z.h > 0) { w.style.width = z.w + 'px'; w.style.height = z.h + 'px'; } } catch (e) {}
    api.edgeResize(w, { minW: () => 300, minH: 180, end: (r) => { api.store('fv.size', JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height) })); fw.setPos({ x: r.left, y: r.top }); body.focus(); } });
    function render() {
      if (!file) return;
      $('fvmode').value = mode; $('fvenc').value = enc;
      const t = table(enc), d = file.data;
      const org = parseInt($('fvorg').value, 16), base = isFinite(org) ? org & 0xFFFF : defOrg(file);
      $('fvorg').hidden = mode === 'text'; $('fvorgl').hidden = mode === 'text'; $('fvgo').hidden = mode === 'text'; $('fvgol').hidden = mode === 'text';
      let out = ''; rowAddr = [];
      if (mode === 'dis') {
        const rows = [], n = d.length, hx = (v, l) => v.toString(16).toUpperCase().padStart(l, '0');
        const big = base + n > 0x10000; // over 64K (a disk image): 5-digit offsets, no wrap
        for (let o = 0; o < n;) {
          const pc = (base + o) & 0xFFFF;
          const r = Z((a) => { const k = o + ((a - pc) & 0xFFFF); return k < n ? d[k] : 0; }, pc);
          const len = Math.min(r.len, n - o);
          let h = '', c = ''; for (let i = 0; i < len; i++) { h += hx(d[o + i], 2) + ' '; c += t[d[o + i]]; }
          rowAddr.push(o);
          rows.push((big ? hx(base + o, 5) : hx(pc, 4)) + '  ' + h.padEnd(13) + (len < r.len ? 'DB ' + [...d.subarray(o, o + len)].map((v) => '#' + hx(v, 2)).join(',') : r.text).padEnd(22) + c);
          o += len;
        }
        out = rows.join('\n');
      } else if (mode === 'hex') {
        const rows = [];
        for (let o = 0; o < d.length; o += 16) {
          const a = (base + o) & 0xFFFF, bytes = d.subarray(o, o + 16); rowAddr.push(o);
          let h = '', c = '';
          for (let i = 0; i < 16; i++) { h += i < bytes.length ? bytes[i].toString(16).toUpperCase().padStart(2, '0') + (i === 7 ? '  ' : ' ') : (i === 7 ? '    ' : '   '); c += i < bytes.length ? t[bytes[i]] : ''; }
          rows.push((base || isFinite(org) ? a.toString(16).toUpperCase().padStart(4, '0') : o.toString(16).toUpperCase().padStart(5, '0')) + '  ' + h + ' ' + c);
        }
        out = rows.join('\n');
      } else {
        let end = d.length; if (!file.zx) { const z = d.indexOf(0x1A); if (z >= 0) end = z; } // CP/M text ends at ^Z
        const parts = [];
        for (let i = 0; i < end; i++) {
          const b = d[i];
          if (b === 13) { parts.push('\n'); if (d[i + 1] === 10) i++; }
          else if (b === 10) parts.push('\n');
          else if (b === 9) parts.push('\t');
          else parts.push(t[b]);
        }
        out = parts.join('');
      }
      body.textContent = out;
      body.classList.toggle('hex', mode !== 'text');
      $('fvinfo').textContent = d.length + ' bytes' + (file.zx ? ` · <${file.zx.type}> start ${file.zx.start} length ${file.zx.len}` : '');
    }
    // quick jump (hex, disassembler): the address as shown in the left column; the line is selected and scrolled into view
    let rowAddr = [];
    function goTo(txt) {
      if (!file || mode === 'text') return;
      const v = parseInt(String(txt).trim().replace(/^#|^0x|^\$/i, ''), 16); if (!isFinite(v)) return;
      const org = parseInt($('fvorg').value, 16), base = isFinite(org) ? org & 0xFFFF : defOrg(file);
      const plain = (mode === 'hex' && !base && !isFinite(org)) || base + file.data.length > 0x10000; // offsets, not 16-bit addresses
      const off = plain ? v - (mode === 'dis' ? base : 0) : (v - base) & 0xFFFF;
      if (off >= file.data.length) { $('fvinfo').textContent = 'address out of the file'; return; }
      let line = 0; while (line + 1 < rowAddr.length && rowAddr[line + 1] <= off) line++;
      const lines = body.textContent.split('\n'); let pos = 0; for (let i = 0; i < line; i++) pos += lines[i].length + 1;
      const node = body.firstChild; if (!node) return;
      const r = document.createRange(); r.setStart(node, pos); r.setEnd(node, pos + lines[line].length);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      const lh = parseFloat(getComputedStyle(body).lineHeight) || 16;
      body.scrollTop = Math.max(0, line * lh - body.clientHeight / 3);
    }
    function open(f, title) {
      // TR-DOS files: only the file's own length (the rest of the last sector is junk)
      file = f.zx && f.zx.len && f.zx.type !== 'B' ? Object.assign({}, f, { data: f.data.subarray(0, f.zx.len) }) : f;
      $('fvtitle').textContent = title;
      $('fvorg').value = ''; $('fvorg').placeholder = defOrg(file).toString(16).toUpperCase().padStart(4, '0');
      w.hidden = false; fw.place(); render(); body.scrollTop = 0; body.focus();
    }
    function close() { w.hidden = true; file = null; }
    // from Graf Search: memory in a given view (text / hex / dis), the cursor at an address
    function openAt(f, title, m, go) {
      if (MODES.includes(m)) mode = m;
      open(f, title);
      if (go !== undefined && mode !== 'text') goTo(go.toString(16));
    }
    $('fvmode').onchange = () => {
      if ($('fvmode').value === 'gfx') { // Graf: Graf Search over this file only (the viewer keeps its view)
        $('fvmode').value = mode;
        if (file && api.graf) api.graf((file.name || 'file').trim() + (file.ext && file.ext.trim() ? '.' + file.ext.trim() : ''), file.data);
        return;
      }
      mode = $('fvmode').value; api.store('fv.mode', mode); render(); body.focus();
    };
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
      if ((e.target.tagName === 'SELECT' || (e.target.classList && e.target.classList.contains('usel'))) && e.key !== 'Escape') return;
      const k = e.key;
      if (k === 'Escape' || k === 'F3' || k === 'F10') { $('fvclose').onclick(); }
      else if (k === 'F4') { mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length]; api.store('fv.mode', mode); render(); }
      else if (k === 't' || k === 'T' || k === 'h' || k === 'H' || k === 'd' || k === 'D') { mode = { t: 'text', h: 'hex', d: 'dis' }[k.toLowerCase()]; api.store('fv.mode', mode); render(); }
      else if (k === 'F8' || k === 'e' || k === 'E') { const i = ENC.findIndex((x) => x[0] === enc); enc = ENC[(i + 1) % ENC.length][0]; api.store('fv.enc', enc); render(); }
      else if ((k === 'g' || k === 'G' || k === ':') && mode !== 'text') { $('fvgo').focus(); $('fvgo').select(); }
      else if (k === 'Home') body.scrollTop = 0;
      else if (k === 'End') body.scrollTop = body.scrollHeight;
      else if (k === 'PageDown' || k === 'PageUp' || k === 'ArrowDown' || k === 'ArrowUp') return; // native scrolling
      else return;
      e.preventDefault(); e.stopPropagation();
    });
    return { open, openAt, close, hasFocus: () => !w.hidden && w.contains(document.activeElement) };
  }

  // ---- file editor (F4): text or hex, the encodings of the viewer; Save writes the file back to its disk
  // Text: every byte has its own character, so a file goes back byte for byte: controls as ␀…␟, bytes the encoding has
  // no letter for as private-use characters; line ends as the file had them (CR, LF or CR LF); CP/M text up to ^Z.
  const edTabs = {};
  function edTable(enc) {
    if (edTabs[enc]) return edTabs[enc];
    const t = table(enc).slice(), back = new Map();
    for (let i = 0; i < 256; i++) {
      let c = t[i];
      if (i < 32) c = String.fromCharCode(0x2400 + i);
      else if (i === 127 && enc !== 'zx') c = '␡';
      else if (c === '·' || (enc === 'zx' && i >= 128) || (enc === 'latin1' && i >= 128 && i < 160)) c = String.fromCharCode(0xE000 + i);
      if (back.has(c)) c = String.fromCharCode(0xE000 + i);
      t[i] = c; back.set(c, i);
    }
    return (edTabs[enc] = { dec: t, back });
  }
  function makeEditor(api) {
    const w = $('fewin'), ta = $('fetext'), hx = $('fehex'), rows = hx.querySelector('.ferows'), sp = hx.querySelector('.fesp');
    let doc = null, mode = api.load('fe.mode') === 'hex' ? 'hex' : 'text', enc = api.load('fv.enc') || 'zx', bytes = null, dirty = false, eol = '\r', ctrlZ = false;
    let pos = 0, nib = 0, pane = 'hex';
    const fw = api.floatWin(w, 'fepos', () => {
      const r = $('fcwin').getBoundingClientRect(), vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.left + 60, vw - w.offsetWidth - 4)), y: Math.max(8, r.top + 40) };
    });
    ENC.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; $('feenc').appendChild(o); });
    try { const z = JSON.parse(api.load('fe.size')); if (z && z.w > 0 && z.h > 0) { w.style.width = z.w + 'px'; w.style.height = z.h + 'px'; } } catch (e) {}
    api.edgeResize(w, { minW: () => 300, minH: 180, end: (r) => { api.store('fe.size', JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height) })); fw.setPos({ x: r.left, y: r.top }); drawHex(); } });
    const info = (t, err) => { $('feinfo').textContent = t; $('feinfo').classList.toggle('err', !!err); };
    // questions of the editor: a box inside its own window (modal for the editor only)
    let dlgEnd = null;
    function ask(o) {
      const d = $('fedlg');
      d.querySelector('.t').textContent = o.title || ''; const x = d.querySelector('.x'); x.textContent = o.text || ''; if (o.body) x.appendChild(o.body);
      const okb = d.querySelector('.ok'); okb.textContent = o.ok || 'OK'; d.querySelector('.no').textContent = o.no || 'Cancel';
      d.hidden = false; setTimeout(() => (o.focus ? o.focus() : okb.focus()), 20);
      return new Promise((res) => { dlgEnd = (v) => { d.hidden = true; dlgEnd = null; (mode === 'text' ? ta : hx).focus(); res(v); }; });
    }
    $('fedlg').querySelector('.ok').onclick = () => dlgEnd && dlgEnd(true);
    $('fedlg').querySelector('.no').onclick = () => dlgEnd && dlgEnd(false);
    $('fedlg').addEventListener('keydown', (e) => {
      if (!dlgEnd) return;
      if (e.key === 'Escape') dlgEnd(false);
      else if (e.key === 'Enter' && (e.target.classList.contains('ok') || e.target.tagName === 'INPUT')) dlgEnd(true);
      else if (e.key === 'Enter' && e.target.classList.contains('no')) dlgEnd(false);
      else { e.stopPropagation(); return; }
      e.preventDefault(); e.stopPropagation();
    });
    const showInfo = () => info((bytes ? bytes.length : 0) + ' bytes' + (dirty ? ' · changed' : '') + (mode === 'hex' ? ' · offset ' + pos.toString(16).toUpperCase().padStart(5, '0') : ''));
    const setDirty = (v) => { dirty = v; $('fetitle').textContent = (dirty ? '* ' : '') + doc.title; showInfo(); };
    // bytes ↔ text
    function toText(b) {
      const { dec } = edTable(enc); let end = b.length; ctrlZ = false;
      if (!doc.zx) { const z = b.indexOf(0x1A); if (z >= 0) { end = z; ctrlZ = true; } }
      let cr = 0, lf = 0, crlf = 0; for (let i = 0; i < end; i++) { if (b[i] === 13) { if (b[i + 1] === 10) { crlf++; i++; } else cr++; } else if (b[i] === 10) lf++; }
      eol = crlf >= cr && crlf >= lf && crlf ? '\r\n' : lf > cr ? '\n' : '\r';
      const out = [];
      for (let i = 0; i < end; i++) {
        const c = b[i];
        if (eol === '\r\n' && c === 13 && b[i + 1] === 10) { out.push('\n'); i++; }
        else if ((eol === '\r' && c === 13) || (eol === '\n' && c === 10)) out.push('\n');
        else if (c === 9) out.push('\t');
        else out.push(dec[c]);
      }
      return out.join('');
    }
    function fromText(s) {
      const { back } = edTable(enc), out = []; let bad = 0;
      for (const ch of s) {
        if (ch === '\n') { for (const c of eol) out.push(c.charCodeAt(0)); continue; }
        if (ch === '\t') { out.push(9); continue; }
        const v = back.get(ch); if (v === undefined) { bad++; out.push(0x3F); } else out.push(v);
      }
      if (ctrlZ) out.push(0x1A);
      return { b: new Uint8Array(out), bad };
    }
    // hex: only the rows in sight are drawn
    const LH = () => parseFloat(getComputedStyle(rows).lineHeight) || 16;
    let cw = 0;
    function drawHex() {
      if (mode !== 'hex' || !bytes) return;
      const lh = LH(), n = Math.ceil((bytes.length + 1) / 16);
      sp.style.height = n * lh + 'px';
      const first = Math.max(0, Math.floor(hx.scrollTop / lh)), cnt = Math.ceil(hx.clientHeight / lh) + 1, { dec } = edTable(enc);
      const disp = (v) => { const c = dec[v]; return c.charCodeAt(0) >= 0x2400 && c.charCodeAt(0) < 0x2422 || c.charCodeAt(0) >= 0xE000 ? '·' : c; };
      let html = '';
      for (let r = first; r < Math.min(n, first + cnt); r++) {
        const o = r * 16; let h = '', c = '';
        for (let i = 0; i < 16; i++) {
          const k = o + i, here = k === pos, cls = here ? (pane === 'hex' ? ' class="cur"' : ' class="cur2"') : '', cls2 = here ? (pane === 'chr' ? ' class="cur"' : ' class="cur2"') : '';
          if (k < bytes.length) { const x = bytes[k].toString(16).toUpperCase().padStart(2, '0'); h += (here && pane === 'hex' ? `<b${cls}>${nib ? x[0] + '<u>' + x[1] + '</u>' : '<u>' + x[0] + '</u>' + x[1]}</b>` : `<b${cls}>${x}</b>`) + (i === 7 ? '  ' : ' '); c += `<b${cls2}>${esc(disp(bytes[k]))}</b>`; }
          else if (k === bytes.length && here) { h += `<b${cls}>__</b>` + (i === 7 ? '  ' : ' '); c += `<b${cls2}> </b>`; }
          else { h += i === 7 ? '    ' : '   '; }
        }
        html += o.toString(16).toUpperCase().padStart(5, '0') + '  ' + h + ' ' + c + '\n';
      }
      rows.style.top = first * lh + 'px'; rows.innerHTML = html; showInfo();
    }
    const esc = (c) => (c === '<' ? '&lt;' : c === '&' ? '&amp;' : c === '>' ? '&gt;' : c);
    function seen() { // keep the cursor row in sight
      const lh = LH(), r = Math.floor(pos / 16), top = r * lh;
      if (top < hx.scrollTop) hx.scrollTop = top; else if (top + lh > hx.scrollTop + hx.clientHeight) hx.scrollTop = top + lh - hx.clientHeight;
      drawHex();
    }
    function setMode(m) {
      if (m === mode && (m === 'text' ? !ta.hidden : !hx.hidden)) return;
      if (mode === 'text' && !ta.hidden) { const r = fromText(ta.value); bytes = r.b; if (r.bad) info(r.bad + ' characters not in ' + enc + ': saved as ?', true); }
      mode = m; api.store('fe.mode', mode); $('femode').value = mode;
      ta.hidden = mode !== 'text'; hx.hidden = mode !== 'hex';
      if (mode === 'text') { ta.value = toText(bytes); ta.focus(); ta.setSelectionRange(0, 0); ta.scrollTop = 0; }
      else { pos = Math.min(pos, bytes.length); hx.focus(); seen(); }
      showInfo();
    }
    function open(o) { // o: { title, name, data, zx, save(bytes) → Promise<string>, saveAs(bytes, name, panel), targets(), here() }
      doc = o; bytes = o.data.slice(); pos = 0; nib = 0; pane = 'hex';
      enc = api.load('fv.enc') || enc; $('feenc').value = enc; $('femode').value = mode;
      w.hidden = false; fw.place();
      ta.hidden = mode !== 'text'; hx.hidden = mode !== 'hex';
      if (mode === 'text') { ta.value = toText(bytes); ta.scrollTop = 0; ta.focus(); ta.setSelectionRange(0, 0); } else { hx.scrollTop = 0; hx.focus(); drawHex(); }
      setDirty(false);
    }
    const current = () => { if (mode === 'text') { const r = fromText(ta.value); return r; } return { b: bytes, bad: 0 }; };
    const badNote = (r) => (r.bad ? ' · ' + r.bad + ' characters not in the encoding saved as ?' : '');
    async function save() {
      if (!doc || dlgEnd) return;
      const r = current(); if (mode === 'text') bytes = r.b;
      try { const msg = await doc.save(r.b); setDirty(false); info((msg || 'Saved') + badNote(r), !!r.bad); }
      catch (e) {
        info('Not saved: ' + e.message, true);
        if (e.saveAs && doc.saveAs) await saveAs(e.message + '.\nSave as a new file?');
      }
    }
    // a new name (and the disk: this one or the other panel's); the original file stays as it was
    async function saveAs(why) {
      if (!doc || !doc.saveAs || dlgEnd) return;
      const r = current(); if (mode === 'text') bytes = r.b;
      const body = document.createElement('div'); body.className = 'fesa';
      const tg = doc.targets();
      body.innerHTML = '<label>Name <input class="nm" spellcheck="false" autocomplete="off"></label><label>To <select class="tg"></select></label>';
      const nm = body.querySelector('.nm'), sel = body.querySelector('.tg');
      tg.forEach(([i, t]) => { const o = document.createElement('option'); o.value = i; o.textContent = t; sel.appendChild(o); });
      const here = doc.here(); sel.value = String(why && tg.length > 1 ? tg.find(([i]) => i !== here)[0] : here >= 0 ? here : tg.length ? tg[0][0] : 0);
      const dot = doc.name.lastIndexOf('.'); nm.value = dot > 0 ? doc.name.slice(0, dot) + '_1' + doc.name.slice(dot) : doc.name + '_1';
      if (!await ask({ title: 'Save as', text: (why ? why + '\n' : '') + '', body, ok: 'Save', focus: () => { nm.focus(); nm.select(); } })) return;
      try { const o = await doc.saveAs(r.b, nm.value.trim(), +sel.value); doc.title = o.title; doc.name = nm.value.trim(); setDirty(false); info(o.msg + badNote(r), !!r.bad); }
      catch (e) { info('Not saved: ' + e.message, true); if (e.saveAs) await saveAs(e.message + '.\nChoose another disk or a shorter file.'); }
    }
    async function close() {
      if (!doc) { w.hidden = true; return; }
      if (dlgEnd) return;
      if (dirty && !await ask({ title: 'Close', text: doc.title + ' was changed. Close without saving?', ok: 'Close' })) return;
      w.hidden = true; doc = null; bytes = null;
      const l = document.querySelector('#fcwin .fcpanel.act .fclist'); if (l) l.focus();
    }
    $('femode').onchange = () => setMode($('femode').value);
    $('feenc').onchange = () => {
      const was = enc;
      if (mode === 'text') { const keep = dirty; enc = was; const r = fromText(ta.value); bytes = r.b; enc = $('feenc').value; ta.value = toText(bytes); setDirty(keep); }
      else { enc = $('feenc').value; drawHex(); }
      api.store('fv.enc', enc); (mode === 'text' ? ta : hx).focus();
    };
    $('fesave').onclick = save; $('fesaveas').onclick = () => saveAs(''); $('feclose').onclick = close;
    ta.addEventListener('input', () => { if (!dirty) setDirty(true); });
    hx.addEventListener('scroll', drawHex);
    // a click in the hex rows: the byte under it (hex column or character column)
    hx.addEventListener('pointerdown', (e) => {
      if (!bytes) return;
      if (!cw) { const s = document.createElement('span'); s.textContent = '0000000000'; rows.appendChild(s); cw = s.getBoundingClientRect().width / 10; s.remove(); }
      const r = rows.getBoundingClientRect(), lh = LH(), row = Math.floor((e.clientY - r.top) / lh) + Math.floor(parseFloat(rows.style.top || 0) / lh);
      const col = Math.floor((e.clientX - r.left - parseFloat(getComputedStyle(rows).paddingLeft)) / cw);
      let k = -1;
      if (col >= 7 && col < 7 + 49) { const c = col - 7, i = c < 24 ? Math.floor(c / 3) : Math.floor((c - 25) / 3) + 8; if (i >= 0 && i < 16) { k = row * 16 + i; pane = 'hex'; nib = 0; } }
      else if (col >= 57 && col < 73) { k = row * 16 + (col - 57); pane = 'chr'; }
      if (k >= 0) { pos = Math.min(k, bytes.length); e.preventDefault(); hx.focus(); drawHex(); }
    });
    hx.addEventListener('keydown', (e) => {
      if (!bytes) return;
      const k = e.key, rowsIn = Math.max(1, Math.floor(hx.clientHeight / LH()) - 1);
      const mv = (p) => { pos = Math.max(0, Math.min(bytes.length, p)); nib = 0; seen(); };
      if (e.ctrlKey || e.metaKey || e.altKey) { if (k === 'Home') mv(0); else if (k === 'End') mv(bytes.length); else return; }
      else if (k === 'ArrowRight') { if (pane === 'hex' && !nib && pos < bytes.length) { nib = 1; drawHex(); } else mv(pos + 1); }
      else if (k === 'ArrowLeft') { if (pane === 'hex' && nib) { nib = 0; drawHex(); } else mv(pos - 1); }
      else if (k === 'ArrowDown') mv(pos + 16); else if (k === 'ArrowUp') mv(pos - 16);
      else if (k === 'PageDown') mv(pos + 16 * rowsIn); else if (k === 'PageUp') mv(pos - 16 * rowsIn);
      else if (k === 'Home') mv(pos - pos % 16); else if (k === 'End') mv(Math.min(bytes.length, pos - pos % 16 + 15));
      else if (k === 'Tab') { pane = pane === 'hex' ? 'chr' : 'hex'; nib = 0; drawHex(); }
      else if (k === 'Insert') { const b = new Uint8Array(bytes.length + 1); b.set(bytes.subarray(0, pos)); b.set(bytes.subarray(pos), pos + 1); bytes = b; nib = 0; setDirty(true); seen(); }
      else if (k === 'Delete') { if (pos < bytes.length) { const b = new Uint8Array(bytes.length - 1); b.set(bytes.subarray(0, pos)); b.set(bytes.subarray(pos + 1), pos); bytes = b; nib = 0; setDirty(true); seen(); } }
      else if (k === 'Backspace') mv(pos - 1);
      else if (pane === 'hex' && /^[0-9a-f]$/i.test(k)) {
        if (pos >= bytes.length) { const b = new Uint8Array(bytes.length + 1); b.set(bytes); bytes = b; } // typing past the end adds bytes
        const v = parseInt(k, 16); bytes[pos] = nib ? (bytes[pos] & 0xF0) | v : (bytes[pos] & 0x0F) | (v << 4);
        if (nib) { nib = 0; pos++; } else nib = 1;
        setDirty(true); seen();
      } else if (pane === 'chr' && k.length === 1) {
        const v = edTable(enc).back.get(k); if (v === undefined) { info('"' + k + '" is not in ' + enc, true); e.preventDefault(); return; }
        if (pos >= bytes.length) { const b = new Uint8Array(bytes.length + 1); b.set(bytes); bytes = b; }
        bytes[pos] = v; pos++; setDirty(true); seen();
      } else return;
      e.preventDefault(); e.stopPropagation();
    });
    w.addEventListener('keydown', (e) => {
      if (dlgEnd) { if (!$('fedlg').contains(e.target)) { e.preventDefault(); e.stopPropagation(); } return; } // the question is answered first
      if ((e.target.tagName === 'SELECT' || (e.target.classList && e.target.classList.contains('usel'))) && e.key !== 'Escape') return;
      const k = e.key;
      if (k === 'Escape' || k === 'F10') close();
      else if ((k === 'F2' && e.shiftKey) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 's' || k === 'S'))) saveAs('');
      else if (k === 'F2' || ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'S'))) save();
      else if (k === 'F4') setMode(mode === 'text' ? 'hex' : 'text');
      else if (k === 'F8') { const i = ENC.findIndex((x) => x[0] === enc); $('feenc').value = ENC[(i + 1) % ENC.length][0]; $('feenc').onchange(); }
      else { e.stopPropagation(); return; } // typing stays in the editor
      e.preventDefault(); e.stopPropagation();
    });
    return { open, close, get open_() { return !w.hidden; }, hasFocus: () => !w.hidden && w.contains(document.activeElement) };
  }

  function create(api) {
    const win = $('fcwin'), ram = [];
    let SRC = [];
    function srcList() {
      const E = api.E(), out = [];
      if (E.web_disk_present(0)) out.push(['A', 'A:']);
      if (E.web_disk_present(1)) out.push(['B', 'B:']);
      [0, 1].forEach((d) => {
        const n = api.hddName(d); if (!n || !api.fs.exists(n)) return;
        const parts = api.hddParts(d); // from the .chs file; none: the ATM BIOS 1.07 layout (one CP/M drive)
        if (!parts || !parts.length) { out.push(['H' + d, 'HDD ' + d]); return; }
        parts.forEach((p, i) => out.push([i ? 'H' + d + '.' + i : 'H' + d, 'HDD ' + d + (p.fs === 'isdos' ? ' iS ' : ' ') + p.letter + ':']));
      });
      const sd = api.sdName && api.sdName();
      if (sd && api.fs.exists(sd)) {
        const n = Math.max(1, fatFind(api.fs.read(sd)).length);
        for (let k = 0; k < n; k++) out.push([k ? 'SD.' + k : 'SD', n > 1 ? 'SD ' + (k + 1) : 'SD card']);
      }
      out.push(['RAM', 'RAM']);
      return out;
    }
    const SORTS = ['ext', 'name', 'size'];
    const P = [0, 1].map((i) => ({ el: $('fcp' + i), src: api.load('fc.src' + i) || (i ? 'RAM' : 'A'), want: null, vol: null, items: [], cur: 0, sel: new Set(), msg: '', commit: null, dir: [], sort: SORTS.includes(api.load('fc.sort' + i)) ? api.load('fc.sort' + i) : 'ext' }));
    let act = 0;
    P.forEach((p) => { p.want = p.src; });
    const fw = api.floatWin(win, 'fcpos', () => {
      const r = $('screenwrap').getBoundingClientRect(), vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.left + (r.width - win.offsetWidth) / 2, vw - win.offsetWidth - 4)), y: Math.max(8, r.top + 30) };
    });

    // open a source as a volume (+ how to write it back)
    function openVol(src) {
      const E = api.E(), fs = api.fs;
      if (src === 'RAM') return { vol: ramdisk(ram), commit: null };
      if (/^SD/.test(src)) { // the Z-Controller SD card: FAT partitions, changed in place
        const name = api.sdName && api.sdName(); if (!name || !fs.exists(name)) return { err: 'no SD card' };
        const a = fs.read(name), vols = fatFind(a), k = Math.min(+(src.split('.')[1] || 0) || 0, vols.length - 1);
        if (!vols.length) return { err: 'no FAT file system on the SD card' + fatWhy(a) };
        return { vol: fatVol(a, vols[k]), commit: () => api.sdTouch() };
      }
      if (src === 'A' || src === 'B') {
        const d = src === 'A' ? 0 : 1;
        if (!E.web_disk_present(d)) return { err: 'no disk' };
        // iS-DOS: 1024-byte sectors, read as a raw ISD image and written back as one
        if (E.web_disk_peek_isd) {
          const tmpi = '__fc' + d + '.isd';
          api.setName(tmpi);
          if (E.web_disk_peek_isd(d)) {
            const img = new Uint8Array(fs.read(tmpi)); fs.remove(tmpi);
            if (looksCpm(img.subarray(0, 2048)) && !looksIsdos(img)) { // Profi CP/M (.PRO): directory from the first sector, 400 blocks of 2K
              const commit = () => {
                if (E.web_get_wp(d)) throw new Error('drive ' + src + ': is write protected');
                const cur = api.diskName(d) || ('disk' + src);
                const name = cur.replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '') + '.pro';
                fs.write(name, img); api.insert(name, d); E.web_disk_mark(d, 1);
              };
              const io = (o, n, w) => { if (w) { img.set(w, o); return; } return img.slice(o, o + n); };
              const v = cpm(CPM_PROFI, io); v.label = 'Profi 800K'; v.profi = true; return { vol: v, commit };
            }
            if (looksIsdos(img)) {
              const commit = () => {
                if (E.web_get_wp(d)) throw new Error('drive ' + src + ': is write protected');
                const cur = api.diskName(d) || ('disk' + src);
                const name = cur.replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '') + '.isd';
                fs.write(name, img); api.insert(name, d); E.web_disk_mark(d, 1);
              };
              return { vol: isdos(img), commit };
            }
          } else { try { fs.remove(tmpi); } catch (e) {} }
        }
        const tmp = '__fc' + d + '.trd';
        api.setName(tmp);
        if (!E.web_disk_peek_trd(d)) return { err: 'not a 16×256 disk (TR-DOS / CP/M 640K)' };
        let img = new Uint8Array(fs.read(tmp)); fs.remove(tmp);
        if (img.length < TRD_SIZE) { const t = new Uint8Array(TRD_SIZE); t.set(img); img = t; }
        const commit = () => {
          if (E.web_get_wp(d)) throw new Error('drive ' + src + ': is write protected');
          const cur = api.diskName(d) || ('disk' + src);
          const name = cur.replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '') + '.trd';
          fs.write(name, img);
          api.insert(name, d);
          E.web_disk_mark(d, 1);
        };
        if (img[0x8E7] === 0x10) return { vol: trdos(img), commit };
        const io = (o, n, w) => { if (w) { img.set(w, o); return; } return img.slice(o, o + n); };
        if (looksCpm(img.subarray(CPM_FLOPPY.off, CPM_FLOPPY.off + 2048))) return { vol: cpm(CPM_FLOPPY, io), commit };
        return { err: 'unknown format (not TR-DOS, ATM CP/M, Profi CP/M or iS-DOS)' };
      }
      // HDD: ATM CP/M drive C:; the BIOS addresses it as CHS 17 sectors × 5 heads, the image follows the emulator's geometry
      const d = src[1] === '1' ? 1 : 0, idx = +(src.split('.')[1] || 0), name = api.hddName(d);
      if (!name || !fs.exists(name)) return { err: 'no image' };
      let img = new Uint8Array(fs.read(name));
      const H = E.web_hdd_get(d, 1) || 15, S = E.web_hdd_get(d, 2) || 38;
      const parts = api.hddParts(d), part = parts && parts[idx];
      if (part) { // a drive of a partitioned disk: plain sectors inside its cylinders
        const cyl = H * S * 512, off = part.c0 * cyl, end = Math.min(img.length, (part.c1 + 1) * cyl);
        const where = part.letter + ': cyl ' + part.c0 + '-' + part.c1;
        if (end <= off) return { err: where + ' is beyond the image' };
        const commit = () => { fs.write(name, img); api.hddRemount(d); };
        if (part.fs === 'isdos') { // 256-byte iS-DOS sectors packed two to an HDD sector
          const v = img.subarray(off, end);
          if (!(u16(v, 0x12) > 16 && v[0x14] > 1)) return { err: where + ': no iS-DOS disk here' };
          const r = isdos(v); r.label = where + (r.label ? ' · ' + r.label : ''); return { vol: r, commit };
        }
        const cp = cpmPart(img, off, end);
        if (!cp) return { err: where + ': no CP/M directory' };
        const io = (o, n, w) => {
          if (o < cp.off || o + (w ? w.length : n) > cp.end) throw new Error('outside drive ' + part.letter + ':');
          if (w) { img.set(w, o); return; } return img.slice(o, o + n);
        };
        const r = cpm(cp, io);
        r.label = where + ', ' + (cp.bs >> 10) + 'K blocks' + (cp.guessed ? ' (guessed)' : '');
        r.drive = d ? '' : part.letter.toLowerCase();
        return { vol: r, commit };
      }
      if (!part && idx) return { err: 'no such drive' };
      let grown = false;
      const pos = (n) => { const c = Math.floor(n / (CPM_HDD.spt * CPM_HDD.heads)), h = Math.floor(n / CPM_HDD.spt) % CPM_HDD.heads, s = n % CPM_HDD.spt; return ((c * H + h) * S + s) * 512; };
      const io = (o, n, w) => {
        const out = w ? null : new Uint8Array(n);
        for (let k = 0; k < (w ? w.length : n); k += 512) {
          const at = pos(Math.floor((o + k) / 512));
          if (w) {
            if (at + 512 > img.length) { const t = new Uint8Array(Math.max(at + 512, img.length * 2)); t.set(img); img = t; grown = true; }
            img.set(w.subarray(k, k + 512), at);
          } else if (at < img.length) out.set(img.subarray(at, Math.min(at + 512, img.length)).subarray(0, n - k), k);
        }
        return out;
      };
      const p = Object.assign({ off: CPM_HDD.spt * 512 }, CPM_HDD, { drm: ((api.hddGeo(d) || {}).dir || 128) - 1 }); // DirEntries= of its .chs (BIOS 1.07: 128)
      if (!looksCpm(io(p.off, 2048))) { // ZX-Evolution and others: FAT (the first FAT partition), changed in place
        const a = fs.read(name), vols = fatFind(a);
        if (vols.length) return { vol: fatVol(a, vols[0]), commit: () => api.hddTouch(d) };
        return { err: 'not an ATM CP/M or FAT hard disk' };
      }
      const orig = img.length;
      const commit = () => { // a grown image is trimmed back to its last used sector (never below the original size)
        let end = img.length; if (grown) { while (end > orig && !img.subarray(end - 512, end).some((x) => x)) end -= 512; }
        fs.write(name, img.slice(0, end));
        api.hddRemount(d);
      };
      const v = cpm(p, io); if (!d) v.drive = 'c';
      return { vol: v, commit };
    }

    // only mounted drives are offered; a panel whose drive went away shows another one
    let availSig = '';
    function fillSrc() {
      const av = SRC = srcList();
      availSig = av.map((x) => x[0]).join();
      P.forEach((p, i) => {
        if (!av.some((x) => x[0] === p.src)) {
          const o = P[1 - i].src;
          p.src = (av.find((x) => x[0] === p.want && x[0] !== o) || av.find((x) => x[0] !== 'RAM' && x[0] !== o) || ['RAM'])[0];
        } else if (p.src !== p.want && av.some((x) => x[0] === p.want) && P[1 - i].src !== p.want) p.src = p.want;
        const sel = p.el.querySelector('.fcsrc'); sel.innerHTML = '';
        av.forEach(([v, t]) => { const op = document.createElement('option'); op.value = v; op.textContent = t; sel.appendChild(op); });
        sel.value = p.src;
      });
    }
    function poll() { // a disk or HDD was mounted / ejected while the window is open
      if (win.hidden) return;
      const sig = srcList().map((x) => x[0]).join();
      if (sig === availSig) return;
      const was = P.map((p) => p.src); fillSrc();
      P.forEach((p, i) => { if (p.src !== was[i] || !p.vol) load(i); });
    }
    setInterval(poll, 700);
    // ".." , folders, files; each group by name (A–Z, numbers in order). TR-DOS stays in its catalogue order
    // (the order there matters: boot first, the space of the last file comes back on delete)
    const byName = (x, y) => (x.name + '.' + (x.ext || '')).localeCompare(y.name + '.' + (y.ext || ''), undefined, { numeric: true, sensitivity: 'base' });
    // the panel's sort (right of its header): ext (then name), name, size (largest first)
    function listed(vol, mode) {
      const rank = (x) => (x.up ? 0 : x.dir ? 1 : 2), abc = vol.kind !== 'TR-DOS';
      const byExt = (x, y) => (x.dir || y.dir ? 0 : String(x.ext || '').localeCompare(String(y.ext || ''), undefined, { numeric: true, sensitivity: 'base' }));
      const by = mode === 'size' ? (x, y) => (y.dir || x.dir ? 0 : (y.size || 0) - (x.size || 0)) || (abc && byName(x, y))
        : mode === 'ext' ? (x, y) => abc && (byExt(x, y) || byName(x, y))
        : (x, y) => abc && byName(x, y);
      return vol.list().map((x, k) => [x, k]).sort((a, b) => rank(a[0]) - rank(b[0]) || by(a[0], b[0]) || a[1] - b[1]).map((x) => x[0]);
    }
    const fdate = (d) => { if (!d) return ''; const v = d >>> 16, t = d & 0xFFFF; const z = (n) => String(n).padStart(2, '0');
      return `${1980 + (v >> 9)}-${z((v >> 5) & 15)}-${z(v & 31)}` + (t ? ` ${z(t >> 11)}:${z((t >> 5) & 63)}` : ''); };
    function load(i) {
      const p = P[i];
      const r = openVol(p.src);
      p.vol = r.vol || null; p.commit = r.commit || null; p.msg = r.err || '';
      if (p.vol && p.vol.setPath) p.dir = p.vol.setPath(p.dir); // iS-DOS: stay in the same directory
      p.items = p.vol ? listed(p.vol, p.sort) : [];
      p.sel.clear(); p.cur = Math.min(p.cur, Math.max(0, p.items.length - 1));
      draw(i);
    }
    // the size of an item; a folder: everything inside it (counted once per listing)
    const sizes = new WeakMap();
    function treeSize(p, it) {
      if (!it.dir) return it.size || 0;
      if (sizes.has(it)) return sizes.get(it);
      let sum = 0;
      if (p.vol && p.vol.setPath) {
        const walk = (names, depth) => {
          p.vol.setPath(names);
          for (const x of p.vol.list()) {
            if (x.up) continue;
            if (!x.dir) sum += x.size || 0;
            else if (depth < 32) { walk(names.concat(x.name), depth + 1); p.vol.setPath(names); }
          }
        };
        try { walk((p.dir || []).concat(it.name), 0); } catch (e) {}
        p.vol.setPath(p.dir || []);
      }
      sizes.set(it, sum);
      return sum;
    }
    function draw(i) {
      const p = P[i], el = p.el;
      el.classList.toggle('act', i === act);
      if (i === act) $('fcmkdir').disabled = !(p.vol && p.vol.mkdir);
      el.querySelector('.fcsort').value = p.sort;
      el.querySelector('.fcsrc').value = p.src;
      el.querySelector('.fckind').textContent = p.vol ? (p.vol.kind + (p.vol.label ? ' · ' + p.vol.label : '') + (p.vol.setPath ? ' · ' + p.vol.path : '')) : '';
      const list = el.querySelector('.fclist');
      list.innerHTML = '';
      if (!p.vol && p.msg) { const m = document.createElement('div'); m.className = 'fcmsg'; m.textContent = p.msg; list.appendChild(m); }
      p.items.forEach((it, k) => {
        const r = document.createElement('div');
        r.className = 'fcrow' + (k === p.cur ? ' cur' : '') + (p.sel.has(k) ? ' sel' : '') + (it.dir ? ' dir' : '');
        r.innerHTML = '<span class="n"></span><span class="e"></span><span class="s"></span>';
        r.children[0].textContent = it.name; r.children[1].textContent = it.ext; r.children[2].textContent = fmtSize(it.show);
        r.title = it.dir ? (it.up ? 'up' : it.name + ': directory (Enter opens it)') : it.zx ? `${it.name} <${it.zx.type}>  start ${it.zx.start}  length ${it.zx.len}` : `${it.name}.${it.ext}  ${it.size} bytes` + (it.date ? '  ' + fdate(it.date) : '');
        r.onmousedown = (e) => {
          e.preventDefault(); setAct(i);
          // rows are rebuilt on every click, so the browser's dblclick never fires: a second press on the same row
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
      const sel = [...p.sel].map((k) => p.items[k]).filter((x) => x && !x.up), n = sel.length;
      const nd = sel.filter((x) => x.dir).length, bytes = sel.reduce((s, x) => s + treeSize(p, x), 0);
      el.querySelector('.fcfoot').textContent = p.vol
        ? (n ? `${n} selected${nd ? ` (${nd} folder${nd > 1 ? 's' : ''})` : ''}, ${fmtSize(bytes)}` : `${p.items.filter((x) => !x.dir).length} files`) + ` · free ${fmtSize(p.vol.free())}` + dirNote(p.vol) : '\u00a0';
      const c = list.children[p.cur]; if (c && i === act) c.scrollIntoView({ block: 'nearest' });
    }
    let lastDown = { t: 0 };
    const toggle = (p, k) => { if (p.sel.has(k)) p.sel.delete(k); else p.sel.add(k); };
    function setAct(i) { if (act !== i) { act = i; draw(0); draw(1); } }
    const picked = (p) => (p.sel.size ? [...p.sel].sort((a, b) => a - b).map((k) => p.items[k]) : (p.items[p.cur] ? [p.items[p.cur]] : [])).filter((it) => it && !it.dir);
    function enter() { // iS-DOS directories: Enter opens, Backspace / ".." goes up
      const p = P[act], it = p.items[p.cur];
      if (!p.vol || !p.vol.enter || !it || !it.dir) return false;
      const from = p.vol.path;
      try { p.dir = p.vol.enter(it); } catch (e) { status(it.name + ': ' + e.message, true); return true; }
      p.items = listed(p.vol, p.sort); p.sel.clear(); p.cur = 0;
      if (it.up) { const back = from.slice(from.lastIndexOf('/') + 1); const k = p.items.findIndex((x) => x.dir && x.name === back); if (k >= 0) p.cur = k; }
      draw(act); return true;
    }
    function goUp() { const p = P[act]; if (p.items[0] && p.items[0].up) { p.cur = 0; enter(); return true; } return false; }
    function status(t, err) { $('fcstat').textContent = t || ''; $('fcstat').classList.toggle('err', !!err); }

    // ---- own small dialogs inside the window: ask({ title, text, ok }) → Promise<boolean>
    let dlgDone = null;
    const dlgText = (t) => { const x = $('fcdlg').querySelector('.x'); if (x.firstChild && x.firstChild.nodeType === 3) x.firstChild.textContent = t; };
    function ask(o) {
      const d = $('fcdlg');
      d.querySelector('.t').textContent = o.title; d.querySelector('.x').textContent = ''; d.querySelector('.x').appendChild(document.createTextNode(o.text || ''));
      if (o.body) d.querySelector('.x').appendChild(o.body);
      d.querySelector('.box').classList.toggle('wide', !!o.body);
      const okb = d.querySelector('.ok'); okb.textContent = o.ok || 'OK'; okb.classList.toggle('danger', !!o.danger);
      d.querySelector('.no').textContent = o.no || 'Cancel';
      d.hidden = false; okb.focus();
      return new Promise((res) => { dlgDone = (v) => { d.hidden = true; dlgDone = null; P[act].el.querySelector('.fclist').focus(); res(v); }; });
    }
    $('fcdlg').querySelector('.ok').onclick = () => dlgDone && dlgDone(true);
    $('fcdlg').querySelector('.no').onclick = () => dlgDone && dlgDone(false);
    $('fcdlg').addEventListener('keydown', (e) => {
      if (!dlgDone) return;
      if (e.key === 'Escape') dlgDone(false);
      else if (e.key === 'Enter' && e.target.classList.contains('ok')) dlgDone(true);
      else if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !/^(checkbox|radio)$/.test(e.target.type)) dlgDone(true);
      else if (e.key === 'Enter' && e.target.classList.contains('no')) dlgDone(false);
      else if (['ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && e.target.tagName === 'BUTTON') { const b = [...$('fcdlg').querySelectorAll('button')]; b[(b.indexOf(document.activeElement) + 1) % b.length].focus(); }
      else return;
      e.preventDefault(); e.stopPropagation();
    });
    const fname = (it) => it.name + (it.ext ? (it.zx ? ' <' + it.ext + '>' : '.' + it.ext) : '');
    const what = (list) => list.length === 1 ? fname(list[0]) : list.length + ' files (' + fmtSize(list.reduce((n, it) => n + it.size, 0)) + ')';
    const srcName = (p) => (SRC.find((x) => x[0] === p.src) || ['', p.src])[1];

    async function copy() {
      const s = P[act], t = P[1 - act];
      if (!s.vol || !t.vol) { status('Both panels need a disk', true); return; }
      if (s.src === t.src) { status('Source and target are the same', true); return; }
      const list = picked(s); if (!list.length) return;
      const conv = s.vol.kind !== t.vol.kind && t.vol.kind !== 'RAM' && s.vol.kind !== 'RAM'
        ? (t.vol.kind === 'TR-DOS' ? '\nOther files become code files (Hobeta .$T files are restored), files over 255 sectors are split (NAME.001…).' : s.vol.kind === 'TR-DOS' ? '\nTR-DOS files are stored as Hobeta (NAME.$T).' : '') : '';
      // split files (NAME.001, .002…): glued back into one file, except onto TR-DOS (255 sectors per file at most)
      const groups = new Map();
      for (const it of list) if (it.part) { const g = groups.get(it.name) || []; g.push(it); groups.set(it.name, g); }
      let body = null;
      if (groups.size && t.vol.kind !== 'TR-DOS') {
        body = document.createElement('label'); body.className = 'fcjoin';
        body.innerHTML = '<input type="checkbox" checked> Join split files';
      }
      if (!await ask({ title: 'Copy', text: `Copy ${what(list)}\nfrom ${srcName(s)} (${s.vol.kind}) to ${srcName(t)} (${t.vol.kind})?` + conv, ok: 'Copy', body })) return;
      const join = body && body.querySelector('input').checked;
      const jobs = []; // [label, () => file]
      for (const it of list) {
        if (join && it.part) {
          const g = groups.get(it.name); if (g[0] !== it) continue;
          const parts = g.slice().sort((a, b) => a.part.localeCompare(b.part)).map((x) => s.vol.read(x));
          jobs.push([it.name.trim() + ' (' + g.length + ' parts)', () => joinParts(it.name, parts)]);
        } else jobs.push([fname(it), () => s.vol.read(it)]);
      }
      let ok = 0; const errs = []; tickAt = 0;
      for (const [k, [label, get]] of jobs.entries()) {
        await tick(`Copying ${k + 1} / ${jobs.length}: ${label}`);
        try { t.vol.write(get()); ok++; } catch (e) { errs.push(label + ': ' + e.message); }
      }
      try { if (ok && t.commit) t.commit(); } catch (e) { errs.push(e.message); }
      load(1 - act); s.sel.clear(); draw(act);
      status(errs.length ? `Copied ${ok}, errors: ` + errs.join('; ') : `Copied ${ok} file${ok === 1 ? '' : 's'}`, errs.length > 0);
    }
    async function del() {
      const s = P[act]; if (!s.vol) return;
      const list = pickedAll(s); if (!list.length) return;
      const nd = list.filter((it) => it.dir).length, nf = list.length - nd;
      const txt = list.length === 1 ? (nd ? 'folder ' + list[0].name + ' with all its contents' : fname(list[0]))
        : [nf ? what(list.filter((it) => !it.dir)) : '', nd ? nd + ' folder' + (nd > 1 ? 's' : '') + ' with all their contents' : ''].filter(Boolean).join(' and ');
      if (!await ask({ title: 'Delete', text: `Delete ${txt} from ${srcName(s)}?`, ok: 'Delete', danger: true })) return;
      // TR-DOS: from the end, so the space of trailing files comes back
      const order = s.vol.kind === 'TR-DOS' ? list.slice().sort((a, b) => b.id - a.id) : list;
      const errs = []; let ok = 0;
      for (const it of order) { try { s.vol.del(it); ok++; } catch (e) { errs.push(it.name + ': ' + e.message); } }
      try { if (s.commit) s.commit(); } catch (e) { errs.push(e.message); }
      load(act); status(errs.length ? `Deleted ${ok}, errors: ` + errs.join('; ') : `Deleted ${ok}`, errs.length > 0);
    }
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    // progress in the status line; gives the browser a moment to show it (and stay responsive) every 60 ms
    let tickAt = 0;
    async function tick(msg) { const now = performance.now(); if (now - tickAt < 60) return; tickAt = now; status(msg); await sleep(0); }
    const pickedAll = (p) => (p.sel.size ? [...p.sel].sort((a, b) => a - b).map((k) => p.items[k]) : [p.items[p.cur]]).filter((it) => it && !it.up);
    // Get Files: one file as is; several: separately or one FCfiles.zip (the only choice when a folder is among them:
    // folders go into the archive with what is inside)
    async function download() {
      const s = P[act]; if (!s.vol) return;
      const sel = pickedAll(s); if (!sel.length) return;
      const hasDir = sel.some((it) => it.dir);
      const fileOf = (it, prefix, seen) => {
        const f = s.vol.read(it);
        let n = f.zx ? f.name.trim() + '.$' + f.zx.type.toLowerCase() : f.name.trim() + (f.ext ? '.' + f.ext.trim() : '');
        n = n.replace(/[\\/:*?"<>|]/g, '_') || 'file';
        for (let k = 2; seen.has((prefix + n).toLowerCase()); k++) n = n.replace(/(~\d+)?(\.[^.]*)?$/, (m0, m1, e) => '~' + k + (e || ''));
        seen.add((prefix + n).toLowerCase());
        return { name: prefix + n, data: f.zx ? hobetaMake(f) : f.data };
      };
      if (sel.length === 1 && !hasDir) { const f = fileOf(sel[0], '', new Set()); api.download(f.name, f.data); return; }
      let zip = true;
      if (!hasDir) {
        const body = document.createElement('div'); body.className = 'fchdd';
        body.innerHTML = `<label><input type="radio" name="fcgf" value="zip"${api.load('fc.getzip') === '0' ? '' : ' checked'}> <b>One archive</b> <span class="d">FCfiles.zip</span></label>` +
          `<label><input type="radio" name="fcgf" value="each"${api.load('fc.getzip') === '0' ? ' checked' : ''}> <b>Separately</b> <span class="d">${sel.length} files</span></label>`;
        if (!await ask({ title: 'Download Files', text: `Get ${what(sel)} from ${srcName(s)}\n`, body, ok: 'Get' })) return;
        zip = body.querySelector('[name=fcgf]:checked').value === 'zip'; api.store('fc.getzip', zip ? '1' : '0');
      } else if (!await ask({ title: 'Download Files', text: `Get ${sel.length === 1 ? sel[0].name : sel.length + ' items'} from ${srcName(s)} as FCfiles.zip?\nFolders are packed with everything inside them.`, ok: 'Get' })) return;
      const files = [], seen = new Set(), base = s.dir ? s.dir.slice() : [];
      let nd = 0;
      tickAt = 0;
      const walk = (names, prefix) => { // a folder: everything in it, with the sub-folders
        s.vol.setPath(names);
        const items = s.vol.list().filter((x) => !x.up);
        if (!items.length) files.push({ name: prefix, data: new Uint8Array(0), dir: true });
        for (const x of items) {
          if (x.dir) { nd++; walk(names.concat(x.name), prefix + x.name + '/'); s.vol.setPath(names); }
          else files.push(fileOf(x, prefix, seen));
        }
      };
      try {
        for (const it of sel) {
          if (it.dir) { nd++; walk(base.concat(it.name), it.name + '/'); s.vol.setPath(base); }
          else files.push(fileOf(it, '', seen));
        }
      } catch (e) { status('Download Files: ' + e.message, true); }
      if (s.vol.setPath) s.vol.setPath(base);
      const real = files.filter((f) => !f.dir);
      if (zip) {
        status(`Packing ${real.length} file${real.length === 1 ? '' : 's'} into FCfiles.zip…`); await sleep(20);
        api.download('FCfiles.zip', await api.zip(files.filter((f) => !f.dir || !real.some((r) => r.name.startsWith(f.name)))));
        status(`FCfiles.zip: ${real.length} file${real.length === 1 ? '' : 's'}${nd ? ', ' + nd + ' folder' + (nd === 1 ? '' : 's') : ''}`);
      } else {
        for (const [k, f] of real.entries()) { status(`Downloading ${k + 1} / ${real.length}: ${f.name}`); api.download(f.name, f.data); await sleep(300); }
        status(`${real.length} files downloaded`);
      }
    }
    // a file from the PC as the target disk takes it: Hobeta (.$x) → a TR-DOS file; TR-DOS: others become code files;
    // FAT keeps the whole name; CP/M, iS-DOS, RAM: 8.3
    function pcFile(kind, nm, data) {
      const m = /^(.*?)(?:\.([^.]*))?$/.exec(nm), full = m[1] || 'FILE', ext0 = m[2] || '', base = full.slice(0, 8), ext = ext0.slice(0, 3);
      let f = null;
      // Hobeta: a TR-DOS file for TR-DOS (its own name); FAT keeps the file as it is; CP/M, iS-DOS: the data under the PC name
      // (several Hobeta files may carry the same inner name)
      if (/^\$/.test(ext0) && !/^FAT/.test(kind)) { f = hobetaParse(data); if (f && kind !== 'TR-DOS') f.name = base; }
      if (!f) f = kind === 'TR-DOS' ? (data.length > 0xFF00 ? { name: pad(base, 8), data } // long: split files (see trdos write)
        : { name: pad(base, 8), zx: { type: 'C', start: 0, len: data.length }, data })
        : /^FAT/.test(kind) ? { name: full, ext: ext0, data } : { name: base, ext, data };
      return f;
    }
    // Put Files: files from the PC into this panel. A .zip is unpacked (after a question): iS-DOS and FAT get its folders,
    // the others (TR-DOS, CP/M, RAM) take all the files into one place, names cut to what the disk takes
    async function upload(files) {
      const t = P[act]; if (!t.vol) { status('No disk in this panel', true); return; }
      const arr = await Promise.all([...files].map((fl) => fl.arrayBuffer().then((b) => [fl.name, new Uint8Array(b)])));
      const Z = window.UnrealZip, zips = arr.filter(([nm, d]) => /\.zip$/i.test(nm) && Z && Z.isZip(d));
      const kind = t.vol.kind, tree = !!(t.vol.mkdir && t.vol.setPath), isd = kind === 'iS-DOS';
      let ok = 0, nd = 0; const errs = [];
      const commit = () => { try { if (ok + nd && t.commit) t.commit(); } catch (e) { errs.push(e.message); } };
      const report = (what) => {
        load(act);
        status(errs.length ? `${what} ${ok}, errors: ` + errs.slice(0, 6).join('; ') + (errs.length > 6 ? ` … (${errs.length} in all)` : '') : `${what} ${ok} file${ok === 1 ? '' : 's'}${nd ? ', ' + nd + ' folder' + (nd === 1 ? '' : 's') : ''}`, errs.length > 0);
      };
      if (!zips.length) { // plain files, as always
        tickAt = 0;
        for (const [k, [nm, data]] of arr.entries()) {
          await tick(`Adding ${k + 1} / ${arr.length}: ${nm}`);
          try { t.vol.write(pcFile(kind, nm, data)); ok++; } catch (e) { errs.push(nm + ': ' + e.message); }
        }
        commit(); report('Added'); return;
      }
      // what is going where
      const items = []; // { dirs: [...], name, zip, e } | { dirs, data } for plain files
      for (const [nm, d] of arr) {
        if (!zips.some((z) => z[1] === d)) { items.push({ dirs: [], name: nm, data: d }); continue; }
        for (const e of Z.list(d, true)) {
          const parts = e.name.replace(/\\/g, '/').split('/').filter((x) => x && x !== '.' && x !== '..');
          if (!parts.length) continue;
          if (/\/$/.test(e.name)) items.push({ dirs: parts, name: null });
          else items.push({ dirs: parts.slice(0, -1), name: parts[parts.length - 1], zip: d, e });
        }
      }
      const nf = items.filter((x) => x.name).length, dirSet = new Set();
      items.forEach((x) => x.dirs.forEach((_, k) => dirSet.add(x.dirs.slice(0, k + 1).join('/'))));
      const where = srcName(t) + (t.vol.setPath ? ' ' + t.vol.path : '');
      const note = tree ? (dirSet.size ? `The folders are made as in the archive${isd ? ' (names cut to 8 characters)' : ''}.` : '')
        : (dirSet.size ? 'Folders are ignored: all files go into one place. ' : '') +
          (kind === 'TR-DOS' ? 'Names are cut to 8 characters; files other than Hobeta become code files.' : 'Names are cut to 8.3.');
      if (!await ask({ title: 'Upload Files', text: `Unpack ${zips.map((z) => z[0]).join(', ')}: ${nf} file${nf === 1 ? '' : 's'}${dirSet.size ? ', ' + dirSet.size + ' folder' + (dirSet.size === 1 ? '' : 's') : ''}\ninto ${where}?\n${note}`, ok: 'Copy' })) return;
      status('Copying…'); await sleep(20);
      const base = t.dir ? t.dir.slice() : [];
      const dname = (n) => isd ? n.toUpperCase().slice(0, 8) : n;
      const enter = (dirs) => { // make the folders that are missing, step by step; → false if one cannot be made
        let cur = base.slice();
        for (const d0 of dirs) {
          t.vol.setPath(cur);
          const d = dname(d0), hit = t.vol.list().find((x) => x.dir && !x.up && x.name.toLowerCase() === d.toLowerCase());
          if (!hit) { try { t.vol.mkdir(d); nd++; } catch (e) { errs.push(cur.concat(d).join('/') + ': ' + e.message); return false; } }
          cur = cur.concat(hit ? hit.name : d);
        }
        return t.vol.setPath(cur).length === cur.length;
      };
      tickAt = 0; let done = 0;
      for (const it of items) {
        if (it.name) await tick(`Copying ${++done} / ${nf}: ${it.dirs.concat(it.name).join('/')}${errs.length ? ' · errors: ' + errs.length : ''}`);
        if (tree && !enter(it.dirs)) continue;
        if (!it.name) continue;
        try {
          const data = it.data || await Z.extract(it.zip, it.e);
          t.vol.write(pcFile(kind, it.name, data)); ok++;
        } catch (e) { errs.push((tree ? it.dirs.concat(it.name).join('/') : it.name) + ': ' + e.message); }
      }
      if (tree) t.vol.setPath(base);
      commit(); report('Copied');
    }
    // New disk: an empty TR-DOS, ATM CP/M (640K, 16×256) or iS-DOS (800K) disk in the panel's drive (A: / B:)
    // New disk: an empty floppy (TR-DOS, ATM CP/M 640K, iS-DOS 800K) in the panel's drive (A: / B:), or a new HDD image:
    // CP/M in the ATM BIOS 1.07 layout (one drive C:, CHS 723/15/38) or 1–8 iS-DOS drives of 33 cylinders (16 MB) each
    // after an empty cylinder 0 (CHS c/16/63, the drives in its geometry.chs). The HDD is mounted and marked as changed.
    const NEW_KINDS = [['trd', 'TR-DOS', '640K, 80 tracks × 2 sides'], ['cpm', 'CP/M', 'ATM CP/M 640K, 16 × 256 sectors'], ['isd', 'iS-DOS', '800K, 5 × 1024 sectors'], ['pro', 'Profi CP/M', '800K, 5 × 1024 sectors (.PRO, no system)'],
      ['hcpm', 'HDD CP/M', 'ATM (one drive C:), up to 6 MB'], ['hisd', 'HDD iS-DOS', 'drives of 1–16 MB, no boot loader'],
      ['hfat', 'HDD FAT', 'ZX-Evolution (NEMO interface): FAT16 / FAT32'], ['sfat', 'SD card', 'Z-Controller: FAT16 / FAT32']];
    const FAT_MB = { hfat: 10, sfat: 8 };
    // FAT type and size: FAT32 needs 65525 clusters at least (about 35 MB with 512-byte clusters: fewer clusters make any
    // driver see FAT16); FAT16 stays within 2 GB (32K clusters). Auto: FAT16 up to 256 MB, FAT32 above.
    function fatPlan(mb0, ft, cl) {
      let mb = Math.max(2, Math.min(4096, Math.round(mb0) || 8)), note = '';
      const type = ft === '32' ? 32 : ft === '16' ? 16 : mb > 256 ? 32 : 16;
      if (type === 32 && mb < 35) { mb = 35; note = " (FAT32 needs at least 35 MB)"; }
      if (type === 16 && mb > 2047) { mb = 2047; note = ' (FAT16: at most 2047 MB)'; }
      // cluster (sectors): FAT32 as chosen (fewer than 65525 clusters: halved, as fatFormat does); FAT16 / Auto: the smallest that fits
      const P = mb * 2048; let spc = +cl || 0;
      if (type === 32) { spc = spc || (P > 64 * 2097152 ? 64 : P > 32 * 2097152 ? 32 : P > 16 * 2097152 ? 16 : 8); while (spc > 1 && P / spc < 65525) spc /= 2; }
      else { spc = 1; while (P / spc >= 65525 && spc < 128) spc *= 2; if (+cl && +cl > spc) note += ' (FAT16: the cluster is chosen by the size)'; }
      return { mb, type, note, spc: type === 32 ? spc : 0, cl: spc === 1 ? '512 B' : spc / 2 + 'K' };
    }
    // New HDD geometry. CP/M: the ATM BIOS 1.07 drive C: has a fixed size (its DPB is in the ROM: 6 MB, logical 17 sectors ×
    // 5 heads), so the image is exactly that: CHS 149/5/17, nothing wasted. iS-DOS: drives of 1–16 MB (16 MB = 33 cylinders
    // of 16 × 63, the most iS-DOS can address: 65535 sectors of 256 bytes) after cylinder 0
    const ISD_CYL_B = 16 * 63 * 512;
    function hddGeoFor(kind, mb, n) {
      if (kind === 'hcpm') {
        const C = Math.ceil((CPM_HDD.spt + (CPM_HDD.dsm + 1) * (CPM_HDD.bs / 512)) / (CPM_HDD.spt * CPM_HDD.heads));
        return { C, H: CPM_HDD.heads, S: CPM_HDD.spt, mb: +(C * CPM_HDD.heads * CPM_HDD.spt * 512 / 1048576).toFixed(1) };
      }
      const per = Math.max(1, Math.min(33, Math.ceil((mb || 16) * 1048576 / ISD_CYL_B))); // cylinders per drive
      if (kind === 'hfat') { const C = Math.max(4, Math.ceil(mb * 1048576 / ISD_CYL_B)); return { C, H: 16, S: 63, mb: +(C * ISD_CYL_B / 1048576).toFixed(1) }; }
      return { C: 1 + per * n, H: 16, S: 63, per, drive: +(per * ISD_CYL_B / 1048576).toFixed(1), mb: +((1 + per * n) * ISD_CYL_B / 1048576).toFixed(1) };
    }
    async function newDisk() {
      const p = P[act], E = api.E();
      let d = p.src === 'A' ? 0 : p.src === 'B' ? 1 : -1;
      if (d < 0) d = !E.web_disk_present(0) ? 0 : !E.web_disk_present(1) ? 1 : 0; // panel on HDD / RAM: an empty drive (or A:)
      const drv = d ? 'B' : 'A', body = document.createElement('div'); body.className = 'fchdd';
      const last = api.load('fc.newkind') || 'trd', hd0 = /^H1/.test(p.src) ? 1 : 0;
      body.innerHTML = NEW_KINDS.map(([v, t, h]) => `<label><input type="radio" name="fcnk" value="${v}"${v === last ? ' checked' : ''}> <b>${t}</b> <span class="d">${h}</span></label>`).join('') +
        '<label class="n">Label <input class="nm" maxlength="11" spellcheck="false" autocomplete="off" value="NEW"></label>' +
        `<div class="hrow">HDD <select class="hd"><option value="0">0</option><option value="1"${hd0 ? ' selected' : ''}>1</option></select>` +
        '<span class="isd"> &nbsp; Drives <select class="nd">' + [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<option${n === 1 ? ' selected' : ''}>${n}</option>`).join('') + '</select>' +
        ' &nbsp; of <select class="mb">' + [1, 2, 4, 8, 12, 16].map((m) => `<option${m === 16 ? ' selected' : ''}>${m}</option>`).join('') + '</select> MB</span>' +
        `<span class="cdir"> &nbsp; Directory <select class="dn">${[128, 512, 1024].map((n) => `<option value="${n}"${String(n) === (api.load('fc.cpmdir') || '128') ? ' selected' : ''}>${n}</option>`).join('')}</select></span>` +
        '</div><div class="frow">Size <input class="fmb" type="number" min="2" max="4096" step="1"> MB &nbsp; <select class="ft"><option value="">Auto</option><option value="16">FAT16</option><option value="32">FAT32</option></select>' +
        ' &nbsp; Cluster <select class="fcl"><option value="">Auto</option>' + [1, 2, 4, 8, 16, 32, 64].map((k) => `<option value="${k}">${k === 1 ? '512 B' : k / 2 + 'K'}</option>`).join('') + '</select>' +
        '<div class="d">For NedoOS do not use 1K cluster (seems to cause problems with loading files)</div></div><div class="d geo"></div>';
      let fk = '';
      const upd = () => {
        const k = body.querySelector('[name=fcnk]:checked').value, hdd = k[0] === 'h', fat = FAT_MB[k], n = +body.querySelector('.nd').value;
        body.querySelector('.hrow').hidden = !hdd; body.querySelector('.isd').hidden = k !== 'hisd'; body.querySelector('.cdir').hidden = k !== 'hcpm'; body.querySelector('.frow').hidden = !fat;
        const fi = body.querySelector('.fmb');
        if (fat && fk !== k) { fi.value = api.load('fc.mb.' + k) || FAT_MB[k]; body.querySelector('.ft').value = api.load('fc.ft.' + k) || ''; body.querySelector('.fcl').value = api.load('fc.cl.' + k) || ''; }
        fk = k;
        const fp = fatPlan(+fi.value || FAT_MB[k], body.querySelector('.ft').value, body.querySelector('.fcl').value), mb = fp.mb;
        const geo = body.querySelector('.geo'); geo.textContent = '';
        if (hdd) {
          const g = hddGeoFor(k, k === 'hfat' ? mb : +body.querySelector('.mb').value, n);
          geo.textContent = k === 'hisd'
            ? `CHS ${g.C}/16/63 · ${g.mb} MB: cylinder 0 + ${n} × ${g.per} cylinders (${g.drive} MB)`
            : k === 'hfat' ? `CHS ${g.C}/16/63 · ${g.mb} MB · FAT${fp.type}, ${fp.cl} clusters, one partition${fp.note}`
            : `CHS ${g.C}/${g.H}/${g.S} · ${g.mb} MB · ` + ({
              512: '512 entries; ROM table changed while mounted. ',
              1024: '1024 entries: up to 1024 small files (directory 32K); ROM table changed while mounted. ' }[body.querySelector('.dn').value]
              || '128 entries of 16K: about 2MB (as real HW)');
          if (k === 'hcpm' && body.querySelector('.dn').value !== '128') { const w = document.createElement('span'); w.style.color = 'var(--accent)'; w.textContent = 'Real HW BIOS needs the same changes'; geo.appendChild(w); }
        } else if (k === 'sfat') geo.textContent = `${mb} MB · FAT${fp.type}, ${fp.cl} clusters, one partition${fp.note}`;
        const t = hdd ? 'HDD ' + body.querySelector('.hd').value : drv + ':';
        dlgText(hdd ? (api.hddName(+body.querySelector('.hd').value) ? 'The image in ' + t + ' will be replaced (save it first if it was changed).\n' : '')
          : k === 'sfat' ? (api.sdName && api.sdName() ? 'The SD card image will be replaced (save it first if it was changed).\n' : '')
          : E.web_disk_present(d) ? 'The disk in ' + drv + ': will be replaced.\n' : '');
      };
      body.addEventListener('change', upd); body.querySelector('.fmb').addEventListener('input', upd);
      setTimeout(upd, 0);
      if (!await ask({ title: 'New Disk', text: '', body, ok: 'Create' })) return;
      const kind = body.querySelector('[name=fcnk]:checked').value, label = body.querySelector('.nm').value.trim() || 'NEW';
      api.store('fc.newkind', kind);
      const fpl = fatPlan(+body.querySelector('.fmb').value || FAT_MB[kind], body.querySelector('.ft').value, body.querySelector('.fcl').value), fmb = fpl.mb;
      if (FAT_MB[kind]) { api.store('fc.mb.' + kind, String(fmb)); api.store('fc.ft.' + kind, body.querySelector('.ft').value); api.store('fc.cl.' + kind, body.querySelector('.fcl').value); }
      const fname = (sfx) => (label.replace(/[\\/:*?"<>| ]/g, '_').toLowerCase() || 'new') + sfx;
      if (kind === 'sfat') { // a new SD card image (mounted, marked as changed)
        status('Creating the SD card image…'); await new Promise((r) => setTimeout(r, 30));
        await api.sdNew(fname('_sd.vhd'), fatFormat(fmb * 1048576, label, { start: 2048, type: fpl.type, spc: fpl.spc || undefined }));
        p.src = p.want = 'SD'; api.store('fc.src' + act, p.src);
        fillSrc(); load(act); if (P[1 - act].src.startsWith('SD')) load(1 - act);
        status(`New SD card: ${fname('_sd.vhd')} (${fmb} MB, FAT${fpl.type}) — Save it from the Save window`);
        return;
      }
      if (kind[0] === 'h') { // a new HDD image
        const hd = +body.querySelector('.hd').value, n = +body.querySelector('.nd').value;
        const g = hddGeoFor(kind, kind === 'hfat' ? fmb : +body.querySelector('.mb').value, n);
        status('Creating the HDD image…'); await new Promise((r) => setTimeout(r, 30));
        let img, chs;
        if (kind === 'hfat') {
          img = fatFormat(g.C * ISD_CYL_B, label, { start: 63, heads: 16, spt: 63, type: fpl.type, spc: fpl.spc || undefined });
          chs = `# ${label}: FAT (ZX-Evolution, NEMO interface)\r\nCHS=${g.C}/16/63\r\nInterface=NEMO-DIVIDE\r\n`;
        } else if (kind === 'hcpm') {
          const H = g.H, S = g.S, cylL = CPM_HDD.spt * CPM_HDD.heads;
          img = new Uint8Array(g.C * H * S * 512);
          const dn = +body.querySelector('.dn').value; api.store('fc.cpmdir', String(dn));
          for (let k = 0; k < dn * 32 / 512; k++) { // the directory (logical sectors from 17) = E5
            const L = CPM_HDD.spt + k, c = Math.floor(L / cylL), h = Math.floor(L / CPM_HDD.spt) % CPM_HDD.heads, sc = L % CPM_HDD.spt;
            img.fill(0xE5, ((c * H + h) * S + sc) * 512, ((c * H + h) * S + sc) * 512 + 512);
          }
          chs = `# ${label}: CP/M, ATM BIOS 1.07 layout (drive C:)\r\n` + (dn !== 128 ? `#HDD extra size 6MB, ${dn} entries, works only on WEB Unreal Speccy (from v 0.37.1)\r\n` : '') +
            `CHS=${g.C}/${H}/${S}\r\nInterface=ATM\r\n` + (dn !== 128 ? `DirEntries=${dn}  # ROM HDD table changed while mounted\r\n` : '');
        } else {
          const cylB = ISD_CYL_B, C = g.C, lines = [];
          img = new Uint8Array(C * cylB);
          for (let i = 0; i < n; i++) {
            const L = String.fromCharCode(66 + i), c0 = 1 + g.per * i;
            img.set(isdosFormat((label + ' ' + L).slice(0, 11), g.per * cylB), c0 * cylB);
            lines.push(`ISDOS=${L} ${c0}-${c0 + g.per - 1}`);
          }
          chs = `# ${label}: ${n} iS-DOS drive${n > 1 ? 's' : ''}, cylinder 0 empty (no boot loader)\r\nCHS=${C}/16/63\r\nInterface=ATM\r\n` + lines.join('\r\n') + '\r\n';
        }
        // a file name of its own: two new HDDs must not share one image
        let base = (label.replace(/[\\/:*?"<>| ]/g, '_').toLowerCase() || 'new') + (kind === 'hcpm' ? '_cpm' : kind === 'hfat' ? '_fat' : '_isdos');
        for (let k = 2; [0, 1].some((x) => x !== hd && (api.hddName(x) || '').toLowerCase() === base + '.hdd'); k++) base = base.replace(/_\d+$/, '') + '_' + k;
        const zip = new Uint8Array(await (await api.zip([{ name: base + '.hdd', data: img }, { name: 'geometry.chs', data: new TextEncoder().encode(chs) }])).arrayBuffer());
        await api.hddNew(hd, base + '.zip', zip);
        p.src = p.want = 'H' + hd; api.store('fc.src' + act, p.src);
        fillSrc(); load(act); if (P[1 - act].src.startsWith('H' + hd)) load(1 - act);
        status(`New HDD ${hd}: ${base}.hdd (${NEW_KINDS.find((x) => x[0] === kind)[1]}) — Save it from the Save window`);
        return;
      }
      p.src = p.want = drv; api.store('fc.src' + act, p.src);
      let name, img;
      if (kind === 'isd') { name = 'new' + drv + '.isd'; img = isdosFormat(label); }
      else if (kind === 'pro') { name = 'new' + drv + '.pro'; img = new Uint8Array(80 * 2 * 5 * 1024).fill(0xE5); } // empty directory and blocks
      else if (kind === 'cpm') { name = 'new' + drv + '.trd'; img = new Uint8Array(TRD_SIZE).fill(0xE5); }
      else { name = 'new' + drv + '.trd'; img = trdFormat(label); }
      api.fs.write(name, img); api.insert(name, d); api.E().web_disk_mark(d, 1);
      fillSrc(); load(act); if (P[1 - act].src === p.src) load(1 - act);
      status('Empty ' + NEW_KINDS.find((x) => x[0] === kind)[1] + ' disk in ' + drv + ':');
    }

    function key(e) {
      const p = P[act];
      const k = e.key;
      if (k === 'Tab') { setAct(1 - act); return true; }
      if (k === 'ArrowDown') { p.cur = Math.min(p.items.length - 1, p.cur + 1); draw(act); return true; }
      if (k === 'ArrowUp') { p.cur = Math.max(0, p.cur - 1); draw(act); return true; }
      if (k === 'Home') { p.cur = 0; draw(act); return true; }
      if (k === 'End') { p.cur = Math.max(0, p.items.length - 1); draw(act); return true; }
      if (k === 'PageDown') { p.cur = Math.min(p.items.length - 1, p.cur + 10); draw(act); return true; }
      if (k === 'PageUp') { p.cur = Math.max(0, p.cur - 10); draw(act); return true; }
      if (k === 'Insert' || k === ' ') { if (p.items.length) { toggle(p, p.cur); p.cur = Math.min(p.items.length - 1, p.cur + 1); draw(act); } return true; }
      if (k === '+' || (k === 'a' && (e.ctrlKey || e.metaKey))) { p.items.forEach((_, i) => p.sel.add(i)); draw(act); return true; }
      if (k === '-') { p.sel.clear(); draw(act); return true; }
      if (k === 'Enter') { if (!enter()) run(); return true; }
      if (k === 'Backspace') { goUp(); return true; }
      if (k === 'F3') { view(); return true; }
      if (k === 'F4') { edit(); return true; }
      if (k === 'F5') { copy(); return true; }
      if (k === 'F7') { mkdir(); return true; }
      if (k === 'F8' || k === 'Delete') { del(); return true; }
      if (k === 'F2') { fillSrc(); load(0); load(1); status('Re-read'); return true; }
      if (k === 'Escape' || (k === 'F1' && !e.shiftKey)) { show(false); return true; }
      return false;
    }
    async function mkdir() { // iS-DOS and FAT (TR-DOS and CP/M have no directories)
      const p = P[act];
      if (!p.vol || !p.vol.mkdir) { status('MkDir: iS-DOS and FAT disks only', true); return; }
      const body = document.createElement('div'); body.className = 'fchdd';
      body.innerHTML = `<label class="n">Name <input class="nm" maxlength="${/^FAT/.test(p.vol.kind) ? 64 : 8}" spellcheck="false" autocomplete="off"></label>`;
      setTimeout(() => body.querySelector('.nm').focus(), 30);
      if (!await ask({ title: 'MkDir', text: 'New directory in ' + srcName(p) + ' ' + (p.vol.path || '/') + '\n', body, ok: 'Create' })) return;
      const nm = body.querySelector('.nm').value.trim();
      try { p.vol.mkdir(nm); if (p.commit) p.commit(); load(act); status('Directory ' + nm.toUpperCase() + ' created'); }
      catch (e) { status('MkDir: ' + e.message, true); }
    }
    // quick run: the same machinery as the REST API (run= for TR-DOS, cpm= for CP/M)
    // a disk image file (HDD, SD card, RAM): mounted into a drive of the machine
    const DISK_IMG = /^\.(trd|scl|fdi|udi|td0|isd|pro|dsk|ipf)$/i;
    async function mountImage(s, it) {
      const body = document.createElement('div'); body.className = 'fchdd';
      body.innerHTML = '<div class="hrow">Drive <select class="dv"><option value="0">A:</option><option value="1">B:</option></select></div>';
      body.querySelector('.dv').value = api.load('fc.mountdrv') === '1' ? '1' : '0';
      if (!await ask({ title: 'Mount', text: `Mount ${fname(it)} from ${srcName(s)} into a drive?`, body, ok: 'Mount' })) return;
      const d = +body.querySelector('.dv').value; api.store('fc.mountdrv', String(d));
      const f = s.vol.read(it), name = (f.name || it.name).trim() + '.' + (f.ext || it.ext).trim().toLowerCase();
      const ok = await api.mountDisk(name, f.data, d);
      if (ok === false) return;
      status(fname(it) + ' in drive ' + 'AB'[d] + ':');
      P.forEach((p, i) => { if (p.src === 'AB'[d]) load(i); });
    }
    async function run() {
      const s = P[act]; if (!s.vol || !api.run) return;
      const it = s.items[s.cur]; if (!it || it.dir) return;
      if (DISK_IMG.test('.' + (it.ext || '').trim()) && s.src !== 'A' && s.src !== 'B' && api.mountDisk) { mountImage(s, it); return; }
      const o = { kind: s.vol.kind, profi: !!s.vol.profi, src: s.src, drive: s.vol.drive || '', name: it.name.trim(), ext: (it.ext || '').trim(), type: it.zx ? it.zx.type : '' };
      const err = api.run(o, true);
      if (err) { status(err, true); return; }
      if (!await ask({ title: 'Run', text: `Run ${fname(it)} from ${srcName(s)}?\nThe machine will be reset.`, ok: 'Yes', no: 'No' })) return;
      const res = api.run(o, false);
      if (res) { status(res, true); return; }
      show(false);
    }
    // F4: the editor; Save puts the new contents back in place of the file (same name, type, start) and writes the disk
    function edit() {
      const s = P[act]; if (!s.vol) return;
      const it0 = s.items[s.cur]; if (!it0 || it0.dir) return;
      if (!s.vol.write || !s.vol.del) { status('Edit: this disk cannot be written', true); return; }
      const f0 = s.vol.read(it0);
      const f = f0.zx && f0.zx.len && f0.zx.type !== 'B' ? Object.assign({}, f0, { data: f0.data.subarray(0, f0.zx.len) }) : f0;
      const key = (x) => x.name + '|' + (x.ext || '') + '|' + (x.zx ? x.zx.type + x.zx.start : '');
      // which image a source is now: a Save must go into the very image the file came from (not one put in its place since)
      const ident = (src) => src === 'A' || src === 'B' ? (api.E().web_disk_present(src === 'A' ? 0 : 1) ? 'disk:' + api.diskName(src === 'A' ? 0 : 1) : '')
        : /^H[01]/.test(src) ? (api.hddName(+src[1]) || '') : /^SD/.test(src) ? ((api.sdName && api.sdName()) || '') : src;
      const at = { src: s.src, k: key(it0), id: ident(s.src), dir: (s.dir || []).slice(), name: srcName(s) }; // where the file is now (Save as moves it)
      const offer = (m) => { const e = new Error(m); e.saveAs = true; return e; }; // the editor then offers Save as
      // the source as it is now, read again (no panel needed); the file found by name, type and start
      function fresh() {
        const id = ident(at.src);
        if (id !== at.id) throw offer(at.name + (id ? ' now holds another image' : ' is empty now (ejected)') + ' — the file was not saved');
        const r = openVol(at.src); if (!r.vol) throw offer(at.name + ': ' + (r.err || 'cannot be read'));
        if (r.vol.setPath) r.vol.setPath(at.dir);
        const cur = r.vol.list().find((x) => key(x) === at.k);
        return { vol: r.vol, commit: r.commit, cur };
      }
      const after = (src, nm, ext) => { // panels showing that source: read again, the cursor on the file
        P.forEach((p, i) => { if (p.src !== src) return; load(i); const again = p.items.find((x) => key(x) === at.k) || p.items.find((x) => x.name.trim() === nm.trim() && (x.ext || '').trim() === (ext || '').trim()); if (again) { p.cur = p.items.indexOf(again); draw(i); } });
      };
      const save = async (bytes) => {
        const { vol, commit, cur } = fresh();
        if (!cur) throw offer(fname({ name: f0.name, ext: it0.ext, zx: f0.zx }) + ' is not on ' + at.name + ' any more');
        let how = 'in place';
        if (!(vol.rewrite && vol.rewrite(cur, bytes))) {
          const old = vol.read(cur), nf = Object.assign({}, old, { data: bytes });
          if (old.zx) nf.zx = Object.assign({}, old.zx, old.zx.type === 'B' ? {} : { len: bytes.length });
          const free = vol.free ? vol.free() : Infinity;
          const need = vol.kind === 'TR-DOS' ? Math.ceil(bytes.length / 256) * 256 : bytes.length - (cur.size || old.data.length); // TR-DOS writes a moved file at the end
          if (need > free) throw offer('Not enough space on ' + at.name + ' (' + free + ' bytes free, ' + need + ' more needed)');
          vol.del(cur);
          try { vol.write(nf); } catch (e) { try { vol.write(old); } catch (e2) {} throw /full/i.test(e.message) ? offer('Not enough space on ' + at.name + ' (' + e.message + ')') : e; }
          how = vol.kind === 'TR-DOS' ? 'at the end of the disk (size in sectors changed)' : 'rewritten';
        }
        if (commit) commit();
        at.id = ident(at.src); // written back: the disk may have a new name (aaa.scl → aaa.trd)
        after(at.src, cur.name, cur.ext);
        status('Edit: ' + fname(cur) + ' saved, ' + bytes.length + ' bytes');
        return 'Saved, ' + bytes.length + ' bytes, ' + how;
      };
      // Save as: a new file on a disk of a panel (read again first); the original stays; later Saves go to the new file
      const saveAs = async (bytes, name, ti) => {
        const p = P[ti]; if (!p) throw new Error('no panel');
        load(ti); if (!p.vol || !p.vol.write) throw new Error(srcName(p) + ': ' + (p.msg || 'cannot be written'));
        const dot = name.lastIndexOf('.'), base = (dot > 0 ? name.slice(0, dot) : name).trim(), ext = dot > 0 ? name.slice(dot + 1).trim() : '';
        if (!base) throw new Error('no name');
        const nf = { name: base, ext, data: bytes };
        if (f0.zx && p.vol.kind === 'TR-DOS') { nf.zx = Object.assign({}, f0.zx, f0.zx.type === 'B' ? {} : { len: bytes.length }); nf.ext = f0.zx.type; }
        if (p.vol.free && p.vol.free() < bytes.length) { const e = new Error('Not enough space on ' + srcName(p) + ' (' + p.vol.free() + ' bytes free)'); e.saveAs = true; throw e; }
        p.vol.write(nf);
        if (p.commit) p.commit();
        load(ti);
        const nm = p.vol.kind === 'TR-DOS' ? base.slice(0, 8) : base, made = p.items.find((x) => x.name.trim().toLowerCase() === nm.toLowerCase() && (x.ext || '').trim().toLowerCase() === (nf.ext || '').toLowerCase());
        Object.assign(at, { src: p.src, id: ident(p.src), dir: (p.dir || []).slice(), name: srcName(p), k: made ? key(made) : '' });
        if (made) { p.cur = p.items.indexOf(made); draw(ti); }
        status('Edit: saved as ' + srcName(p) + ' ' + name);
        return { msg: 'Saved as ' + srcName(p) + ' ' + name + ', ' + bytes.length + ' bytes', title: srcName(p) + ' ' + name };
      };
      const targets = () => P.map((p, i) => [i, p]).filter(([, p]) => p.vol && p.vol.write).map(([i, p]) => [i, srcName(p) + ' (' + p.vol.kind + ')' + (p.src === at.src && ident(p.src) === at.id ? ' — this disk' : '')]);
      editor.open({ title: srcName(s) + ' ' + fname(it0), name: it0.name.trim() + (it0.ext && !it0.zx ? '.' + it0.ext.trim() : ''), data: f.data, zx: f.zx, save, saveAs, targets, here: () => P.findIndex((p) => p.src === at.src && ident(p.src) === at.id) });
    }
    function view() {
      const s = P[act]; if (!s.vol) return;
      const it = s.items[s.cur]; if (!it || it.dir) return;
      const f = s.vol.read(it);
      viewer.open(f, srcName(s) + ' ' + fname(it));
    }

    // ---- wiring
    P.forEach((p, i) => {
      const sel = p.el.querySelector('.fcsrc');
      sel.onchange = () => { p.src = p.want = sel.value; api.store('fc.src' + i, p.src); p.cur = 0; p.dir = []; setAct(i); load(i); setTimeout(() => p.el.querySelector('.fclist').focus(), 0); }; // after the list box takes the focus back
      const list = p.el.querySelector('.fclist');
      list.tabIndex = 0;
      list.addEventListener('focus', () => setAct(i));
      list.addEventListener('keydown', (e) => { if (key(e)) { e.preventDefault(); e.stopPropagation(); } });
      list.addEventListener('dragover', (e) => { e.preventDefault(); list.classList.add('drop'); });
      list.addEventListener('dragleave', () => list.classList.remove('drop'));
      list.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); list.classList.remove('drop'); setAct(i); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); });
    });
    $('fcmkdir').onclick = mkdir; $('fcview').onclick = view; $('fcedit').onclick = edit;
    // ---- a new HDD image from chosen drives of a partitioned one (+ its .chs), saved as ZIP
    async function hddBuild() {
      // the HDD of this panel; else the first one with drives in its .chs, else the first one mounted
      const has = (x) => { const n = api.hddName(x); return !!(n && api.fs.exists(n)); }, hasParts = (x) => has(x) && (api.hddParts(x) || []).length > 0;
      let d = /^H[01]/.test(P[act].src) ? +P[act].src[1] : hasParts(0) ? 0 : hasParts(1) ? 1 : has(0) ? 0 : 1;
      const parts = api.hddParts(d) || [], name = api.hddName(d);
      if (!has(d)) { status('HDD Remaster: no HDD image mounted', true); return; }
      if (!parts.length) {
        let fat = false; try { fat = fatFind(api.fs.read(name)).length > 0; } catch (e) {}
        status(`HDD Remaster: ${name} in HDD ${d} is ${fat ? 'a FAT disk' : 'one CP/M drive (ATM BIOS 1.07 layout)'}: no drives to choose from — save it as it is in the Save window`, true); return;
      }
      const g = api.hddGeo(d), cylB = g.h * g.s * 512, base0 = name.replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '');
      const body = document.createElement('div'); body.className = 'fchdd';
      const kind = (p) => (p.fs === 'isdos' ? 'iS-DOS ' : 'CP/M ') + p.letter + ':';
      body.innerHTML = '<div class="l"></div>' +
        '<label><input type="radio" name="fchm" value="keep" checked> same cylinders</label>' +
        '<label><input type="radio" name="fchm" value="pack"> iS-DOS drives packed (smaller image; CP/M drives stay)</label>' +
        '<div class="h">Drive tables of HDD boot loader and the iS-DOS HDD driver are updated: drives left out become "no drive".</div>' +
        '<label class="n">File <input class="nm" spellcheck="false" autocomplete="off"></label>';
      parts.forEach((p, i) => {
        const l = document.createElement('label');
        l.innerHTML = `<input type="checkbox" data-i="${i}" checked> <b></b> <span></span>`;
        l.querySelector('b').textContent = kind(p);
        l.querySelector('span').textContent = 'cyl ' + p.c0 + '-' + p.c1 + (p.note ? ' · ' + p.note : '');
        body.querySelector('.l').appendChild(l);
      });
      body.querySelector('.nm').value = base0 + '_new';
      if (!await ask({ title: 'New HDD from HDD ' + d, text: `${name} · ${g.c}/${g.h}/${g.s}. Cylinder 0 (BIOS config, boot loaders) is always copied.\n`, body, ok: 'Save ZIP' })) return;
      const sel = parts.filter((p, i) => body.querySelector(`[data-i="${i}"]`).checked).sort((a, b) => a.c0 - b.c0);
      const pack = body.querySelector('[name=fchm]:checked').value === 'pack';
      const base = (body.querySelector('.nm').value.trim() || base0 + '_new').replace(/[\\/:*?"<>|]/g, '_').replace(/\.zip$/i, '');
      if (!sel.length) { status('HDD: no drives chosen', true); return; }
      status('Building ' + base + '.zip…'); await new Promise((r) => setTimeout(r, 30));
      try {
        const r = hddRepack(api.fs.read(name), g, parts, sel, pack), img = r.img, out = [];
        for (const { p, at } of r.placed) {
          const n = p.c1 - p.c0 + 1;
          out.push((`${p.fs === 'isdos' ? 'ISDOS' : 'CPM'}=${p.letter} ${at}-${at + n - 1}`.padEnd(18) + (p.note ? ' # ' + p.note : '') + (at !== p.c0 ? (p.note ? ',' : ' #') + ' was ' + p.c0 + '-' + p.c1 : '')).trimEnd());
        }
        const chs = [`# ${base}.hdd: drives of ${name}` + (pack ? ', iS-DOS drives packed' : ', at their cylinders'),
          '# cylinder 0: config and boot loaders of the original',
          `# ${r.patched} drive table${r.patched === 1 ? '' : 's'} (HDD boot loader, iS-DOS HDD driver) updated, drives left out = "no drive"` +
          (r.bootMoved ? `; boots ${r.bootMoved.letter}: now` : ''),
          '', `CHS=${g.c}/${g.h}/${g.s}`, `Interface=${['NONE', 'ATM', 'NEMO', 'NEMO-A8', 'NEMO-DIVIDE', 'SMUC', 'PROFI', 'DIVIDE'][g.iface === undefined ? 1 : g.iface]}`, '', ...out, ''].join('\r\n');
        const zip = await api.zip([{ name: base + '.hdd', data: img }, { name: 'geometry.chs', data: new TextEncoder().encode(chs) }]);
        api.download(base + '.zip', zip);
        status(`Saved ${base}.zip: ${sel.length} drive${sel.length > 1 ? 's' : ''}, ${Math.round(img.length / 1048576)} MB image` + `, ${r.patched} drive tables updated` + (r.bootMoved ? `, boots ${r.bootMoved.letter}:` : ''));
      } catch (e) { status('HDD: ' + e.message, true); }
    }
    P.forEach((p, i) => { // each panel's sort (right of its header); the cursor stays on the same item
      const sel0 = p.el.querySelector('.fcsort');
      sel0.onchange = () => {
        const it = p.items[p.cur], sel = new Set([...p.sel].map((k) => p.items[k]));
        p.sort = sel0.value; api.store('fc.sort' + i, p.sort);
        if (p.vol) { p.items = listed(p.vol, p.sort); p.cur = Math.max(0, p.items.indexOf(it)); p.sel = new Set(p.items.map((x, k) => (sel.has(x) ? k : -1)).filter((k) => k >= 0)); }
        setAct(i); draw(i); setTimeout(() => p.el.querySelector('.fclist').focus(), 0); // after the list box takes the focus back
      };
    });
    // Files / Disks: small menus over the button bar (the look of the page's lists, usel.js)
    let mpop = null;
    function menuClose() { if (!mpop) return; mpop.btn.classList.remove('open'); mpop.remove(); mpop = null; }
    function menuBtn(btn, items) {
      btn.onclick = (e) => {
        e.stopPropagation();
        const was = mpop && mpop.btn === btn; menuClose(); if (was) return;
        const pop = document.createElement('div'); pop.className = 'usel-pop fcmpop'; pop.btn = btn;
        for (const [t, d, fn] of items) {
          const it = document.createElement('div'); it.className = 'usel-it'; it.textContent = t;
          if (d) { const s = document.createElement('span'); s.className = 'd'; s.textContent = d; it.appendChild(s); }
          it.onclick = (ev) => { ev.stopPropagation(); menuClose(); P[act].el.querySelector('.fclist').focus(); fn(); };
          pop.appendChild(it);
        }
        document.body.appendChild(pop); mpop = pop; btn.classList.add('open');
        const r = btn.getBoundingClientRect(), h = pop.offsetHeight, w = pop.offsetWidth;
        const wr = win.getBoundingClientRect(), wl = Math.max(wr.left, 0) + 4, wrr = Math.min(wr.right, window.innerWidth) - 4;
        pop.style.left = Math.max(wl, Math.min(r.left, wrr - w)) + 'px'; // inside the window: from the button's left, moved left at the right edge
        const wb = Math.min(wr.bottom, window.innerHeight) - 4; // down when it fits, else up
        pop.style.top = (r.bottom + 2 + h <= wb ? r.bottom + 2 : Math.max(4, r.top - 2 - h)) + 'px';
      };
    }
    document.addEventListener('pointerdown', (e) => { if (mpop && !mpop.contains(e.target) && e.target.closest('.fcmenu') !== mpop.btn) menuClose(); }, true);
    document.addEventListener('keydown', (e) => { if (mpop && e.key === 'Escape') { e.stopPropagation(); menuClose(); } }, true);
    window.addEventListener('resize', menuClose);
    menuBtn($('fcfiles'), [['Download Files', 'to PC', () => download()], ['Upload Files', 'from PC', () => $('fcfile').click()]]);
    menuBtn($('fcdisks'), [['New Disk', '', () => newDisk()], ['HDD Remaster', '', () => hddBuild()]]);
    $('fccopy').onclick = copy; $('fcdel').onclick = del;
    $('fcfile').onchange = (e) => { if (e.target.files.length) upload(e.target.files); e.target.value = ''; };
    $('fcclose').onclick = () => show(false);
    // help: opens at the File Commander window's side (right, left when there is no room, over it on a narrow screen),
    // same height; then it can be dragged
    let helpFW = null;
    function help(v) {
      const h = $('fchelp');
      if (!helpFW) helpFW = api.floatWin(h, 'fchelppos', () => ({ x: 0, y: 0 }));
      h.hidden = !v; $('fchelpbtn').classList.toggle('on', v);
      if (!v) return;
      const r = win.getBoundingClientRect();
      h.style.height = r.height + 'px'; helpFW.setPos(api.snapRight(r, h));
    }
    $('fchelpbtn').onclick = (e) => { e.stopPropagation(); help($('fchelp').hidden); P[act].el.querySelector('.fclist').focus(); };
    $('fchelpclose').onclick = () => { help(false); P[act].el.querySelector('.fclist').focus(); };
    win.addEventListener('keydown', (e) => { if (dlgDone || e.target.tagName === 'SELECT' || (e.target.classList && e.target.classList.contains('usel'))) return; if (key(e)) { e.preventDefault(); e.stopPropagation(); } });
    // keys go to the active panel again whenever the window gets the focus back (title bar click, another window, another app)
    const focusList = () => { if (!win.hidden && !dlgDone && !viewer.hasFocus()) P[act].el.querySelector('.fclist').focus({ preventScroll: true }); };
    win.addEventListener('pointerup', (e) => { if (!e.target.closest('select, input, button, .fclist')) focusList(); });
    let hadFocus = false;
    window.addEventListener('blur', () => { hadFocus = !win.hidden && win.contains(document.activeElement); });
    window.addEventListener('focus', () => { if (hadFocus) setTimeout(focusList, 0); });

    const viewer = makeViewer(api), editor = makeEditor(api);
    // size: at least as wide as the buttons under the panels need (one row), at most half the page high;
    // a phone (narrow screen): the screen width, the height as before
    function fitSize() {
      const vw = document.documentElement.clientWidth, narrow = vw <= 620; // a phone; a tablet resizes like a PC
      win.classList.toggle('narrow', narrow);
      if (narrow) { win.style.minWidth = ''; win.style.width = ''; return; }
      const was = win.hidden; win.hidden = false;
      const bar = win.querySelector('.fcbar'), cs = getComputedStyle(bar);
      let need = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 2;
      [...bar.children].forEach((b, k) => { if (!b.classList.contains('sp')) need += b.getBoundingClientRect().width + (k ? parseFloat(cs.columnGap) || 3 : 0); else need += 12; });
      win.hidden = was;
      win.style.minWidth = Math.min(vw - 8, Math.ceil(need)) + 'px';
      if (win.offsetWidth < need) win.style.width = Math.min(vw - 8, Math.ceil(need)) + 'px';
    }
    window.addEventListener('resize', () => { if (!win.hidden) fitSize(); });
    // size by dragging the window edges (remembered); not narrower than the buttons under the panels need (phone: height only)
    try { const z = JSON.parse(api.load('fc.size')); if (z && z.w > 0 && z.h > 0) { win.style.width = z.w + 'px'; win.style.height = z.h + 'px'; } } catch (e) {}
    api.edgeResize(win, { minW: () => parseFloat(win.style.minWidth) || 360, minH: 200, fixedW: () => win.classList.contains('narrow'),
      end: (r) => { api.store('fc.size', JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height) })); fw.setPos({ x: r.left, y: r.top }); } });
    function show(v) {
      if (!v && dlgDone) dlgDone(false);
      if (!v) { viewer.close(); if (!$('fewin').hidden) editor.close(); help(false); menuClose(); }
      win.hidden = !v;
      $('fcbtn').classList.toggle('on', v);
      if (v) { fitSize(); fw.place(); fillSrc(); load(0); load(1); status('Tab: other panel · Space/Ins: select · Enter: run, mount disk image, open folder · F2 re-read · F3 view · F4 edit · F5 copy · F7 MkDir · F8 delete · ? help'); P[act].el.querySelector('.fclist').focus(); }
      else if (api.onClose) api.onClose();
    }
    // a key of the on-screen keyboard (KeyboardEvent.code + held modifiers) as if typed into the window in use
    const SHIFTED = { Digit1: '!', Digit2: '@', Digit3: '#', Digit4: '$', Digit5: '%', Digit6: '^', Digit7: '&', Digit8: '*', Digit9: '(', Digit0: ')',
      Minus: '_', Equal: '+', Semicolon: ':', Quote: '"', Comma: '<', Period: '>', Slash: '?', BracketLeft: '{', BracketRight: '}', Backslash: '|', Backquote: '~' };
    const PLAIN = { Minus: '-', Equal: '=', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Backquote: '`', Space: ' ' };
    function vkey(code, mods) {
      const shift = [...mods].some((m) => m.startsWith('Shift')), ctrl = [...mods].some((m) => m.startsWith('Control')), alt = [...mods].some((m) => m.startsWith('Alt'));
      let key = code;
      if (/^Key[A-Z]$/.test(code)) key = shift ? code[3] : code[3].toLowerCase();
      else if (/^Digit\d$/.test(code)) key = shift ? SHIFTED[code] : code[5];
      else if (code in PLAIN) key = shift && SHIFTED[code] ? SHIFTED[code] : PLAIN[code];
      let t;
      const fv = $('fvwin');
      if (editor.hasFocus()) t = document.activeElement;
      else if (dlgDone) t = $('fcdlg').contains(document.activeElement) ? document.activeElement : $('fcdlg').querySelector('.ok');
      else if (!fv.hidden && (viewer.hasFocus() || !win.contains(document.activeElement))) t = fv.contains(document.activeElement) ? document.activeElement : $('fvbody');
      else t = win.contains(document.activeElement) && document.activeElement.tagName !== 'BUTTON' ? document.activeElement : P[act].el.querySelector('.fclist');
      t.dispatchEvent(new KeyboardEvent('keydown', { key, code, shiftKey: shift, ctrlKey: ctrl, altKey: alt, bubbles: true, cancelable: true }));
    }
    return { show, vkey, view: (f, title, m, go) => viewer.openAt(f, title, m, go), get open() { return !win.hidden; }, hasFocus: () => win.contains(document.activeElement) || viewer.hasFocus() || editor.hasFocus() };
  }
  window.UnrealFC = { create, _test: { trdos, cpm, isdos, looksIsdos, isdosFormat, trdFormat, hobetaMake, hobetaParse, toZx, toCpm, looksCpm, CPM_FLOPPY, cpmPart, cpmDpb, hddRepack, fatFind, fatVol, fatFormat, partExt, joinParts } };
})();
