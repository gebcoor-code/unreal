// File systems inside BK disk images for File Commander: ANDOS / FAT12 (read, write, delete), MKDOS and RT-11 (read).
// open(name, image) → null or { kind, label, files: [{ path, data, addr, len }], add(path, name, addr, data), del(file) }.
// File data are given as BK .bin (address, length, bytes) when the file system keeps a load address (ANDOS: in the time
// field of the directory entry, MKDOS: in its record), so File Commander can view and run them.
(function () {
  'use strict';
  const u16 = (a, o) => a[o] | (a[o + 1] << 8);
  const put16 = (a, o, v) => { a[o] = v & 255; a[o + 1] = (v >> 8) & 255; };
  const u32 = (a, o) => (a[o] | (a[o + 1] << 8) | (a[o + 2] << 16) | (a[o + 3] << 24)) >>> 0;
  const put32 = (a, o, v) => { put16(a, o, v & 0xFFFF); put16(a, o + 2, v >>> 16); };
  const name8 = (bytes) => { let s = ''; for (const b of bytes) s += window.BKFC ? (window.BKFC.bkName([b]) || ' ') : String.fromCharCode(b); return s.trimEnd(); };
  const withHeader = (addr, data) => { const o = new Uint8Array(data.length + 4); put16(o, 0, addr); put16(o, 2, data.length); o.set(data, 4); return o; };

  // ------------------------------------------------------------------ FAT12 (ANDOS, DX-DOS, MS-DOS format floppies)
  function fat12(img, name) {
    if (img.length < 1024 || u16(img, 11) !== 512) return null;
    const spc = img[13], res = u16(img, 14), nf = img[16], ne = u16(img, 17), tot = u16(img, 19) || u32(img, 32), media = img[21], spf = u16(img, 22);
    if (!spc || spc & (spc - 1) || !nf || nf > 2 || !ne || !spf || media < 0xF0 || !tot) return null;
    const root = (res + nf * spf) * 512, data0 = root + ne * 32, csize = spc * 512;
    if (data0 >= img.length) return null;
    const ncl = Math.floor((Math.min(tot * 512, img.length) - data0) / csize) + 2; // the image may be shorter than the disk
    const fatAt = (k) => { const o = res * 512 + Math.floor(k * 3 / 2); const v = u16(img, o); return k & 1 ? v >> 4 : v & 0xFFF; };
    const fatSet = (k, v) => { for (let f = 0; f < nf; f++) { const o = (res + f * spf) * 512 + Math.floor(k * 3 / 2); const w = u16(img, o); put16(img, o, k & 1 ? (w & 0x000F) | (v << 4) : (w & 0xF000) | v); } };
    const chain = (c) => { const out = []; while (c >= 2 && c < ncl && out.length < ncl) { out.push(c); c = fatAt(c); if (c >= 0xFF8) break; } return out; };
    const readChain = (c, size) => { const o = new Uint8Array(size); let p = 0; for (const k of chain(c)) { const off = data0 + (k - 2) * csize, n = Math.min(csize, size - p); if (n <= 0) break; o.set(img.subarray(off, off + n), p); p += n; } return o; };
    const andos = /ANDOS/.test(String.fromCharCode(...img.subarray(3, 11)));
    const files = [], adirs = new Map(); // ANDOS directories: id -> { name, parent }
    // directory entries of a directory (root: offset / count; subdir: cluster chain)
    function entries(offsets, path, slots) {
      for (const o of offsets) {
        const e = img.subarray(o, o + 32);
        if (e[0] === 0) break;
        if (e[0] === 0xE5 || e[0] === 0x2E) continue;
        const attr = e[11];
        const nm = name8(e.subarray(0, 8)), ext = name8(e.subarray(8, 11));
        const full = nm + (ext ? '.' + ext : '');
        if (attr & 0x08) { if (andos && e[20]) adirs.set(e[20], { name: name8(e.subarray(0, 11)), parent: e[21], off: o }); continue; } // ANDOS folder: 11 characters
        if (attr & 0x10) { const cl = u16(e, 26); const offs = []; for (const k of chain(cl)) for (let i = 0; i < csize; i += 32) offs.push(data0 + (k - 2) * csize + i); entries(offs, path + full + '/', slots); continue; }
        const size = u32(e, 28), addr = u16(e, 22);
        files.push({ path, name: full, adir: andos ? e[21] : 0, addr, len: size, off: o, cl: u16(e, 26), raw: () => readChain(u16(e, 26), size) });
      }
    }
    const rootOffs = []; for (let i = 0; i < ne; i++) rootOffs.push(root + i * 32);
    entries(rootOffs, '', null);
    const dirPath = (id) => { let p = '', guard = 0; while (id && adirs.has(id) && guard++ < 64) { const d = adirs.get(id); p = d.name + '/' + p; id = d.parent; } return p; };
    const out = files.map((f) => ({ path: (f.adir ? dirPath(f.adir) : f.path) + f.name, f, get data() { return withHeader(f.addr, f.raw()); }, addr: f.addr, len: f.len }));
    // empty ANDOS folders are shown too (as a placeholder folder entry)
    const vol = {
      kind: andos ? 'ANDOS' : 'FAT12', label: name, files: out, dirs: [...adirs.keys()].map(dirPath),
      free() { let n = 0; for (let k = 2; k < ncl; k++) if (!fatAt(k)) n++; return n * csize; },
      // add a file (data: BK .bin with address and length, or raw bytes with addr) into folder dirPath ('' = root)
      add(dir, fname, addr, data) {
        const m = /^(.{1,8}?)(?:\.(.{0,3}))?$/.exec(fname.toUpperCase().replace(/[^A-Z0-9_.$#&@!%(){}'`~^-]/g, '_'));
        if (!m) throw new Error('name: 8.3 only');
        let did = 0;
        if (dir) { did = [...adirs.entries()].find(([id]) => dirPath(id) === dir) || null; if (!did) throw new Error('folder not found'); did = did[0]; }
        const need = Math.max(1, Math.ceil(data.length / csize));
        const freeCl = []; for (let k = 2; k < ncl && freeCl.length < need; k++) if (!fatAt(k)) freeCl.push(k);
        if (freeCl.length < need) throw new Error('disk full');
        let slot = -1; for (let i = 0; i < ne; i++) { const b = img[root + i * 32]; if (b === 0 || b === 0xE5) { slot = root + i * 32; break; } }
        if (slot < 0) throw new Error('directory full');
        if (out.some((x) => x.path.toUpperCase() === (dir + fname).toUpperCase())) throw new Error('file exists');
        freeCl.forEach((k, i) => { fatSet(k, i + 1 < freeCl.length ? freeCl[i + 1] : 0xFFF); const off = data0 + (k - 2) * csize; img.fill(0, off, off + csize); img.set(data.subarray(i * csize, Math.min(data.length, (i + 1) * csize)), off); });
        const e = img.subarray(slot, slot + 32); e.fill(0);
        const pad = (s, n) => { for (let i = 0; i < n; i++) e[(n === 8 ? 0 : 8) + i] = i < s.length ? s.charCodeAt(i) : 32; };
        pad(m[1], 8); pad(m[2] || '', 3);
        e[21] = did; put16(e, 22, addr); put16(e, 26, freeCl[0]); put32(e, 28, data.length);
        const nowD = new Date(); put16(e, 24, ((nowD.getFullYear() - 1980) << 9) | ((nowD.getMonth() + 1) << 5) | nowD.getDate());
      },
      del(file) {
        const f = file.f; if (!f) return;
        for (const k of chain(f.cl)) fatSet(k, 0);
        img[f.off] = 0xE5;
      },
    };
    return vol;
  }

  // ------------------------------------------------------------------ MKDOS (catalog in block 1, records of 24 bytes)
  function mkdos(img, name) {
    if (img.length < 2048 || u16(img, 0o1400) !== 0o123456 || u16(img, 0o1402) !== 0o51414) return null;
    const count = u16(img, 0o1030), dirs = new Map(), recs = [];
    for (let i = 0; i < count && 0o1500 + i * 24 + 24 <= 0o1000 * 20; i++) {
      const o = 0o1500 + i * 24, st = img[o], dir = img[o + 1];
      const nmB = img.subarray(o + 2, o + 16);
      if (nmB[0] === 0o177) { dirs.set(st, { name: name8(nmB.subarray(1)), parent: dir }); continue; }
      if (st === 0o377 || st === 0o200) continue; // deleted, bad
      const block = u16(img, o + 16), nb = u16(img, o + 18), addr = u16(img, o + 20), len = u16(img, o + 22);
      recs.push({ name: name8(nmB), dir, block, nb, addr, len: len || nb * 512 });
    }
    const dirPath = (id) => { let p = '', g = 0; while (id && dirs.has(id) && g++ < 64) { const d = dirs.get(id); p = d.name + '/' + p; id = d.parent; } return p; };
    const files = recs.filter((r) => r.block * 512 < img.length).map((r) => ({
      path: dirPath(r.dir) + r.name, addr: r.addr, len: r.len,
      get data() { return withHeader(r.addr, img.subarray(r.block * 512, Math.min(img.length, r.block * 512 + r.len))); },
    }));
    return { kind: 'MKDOS', label: name, files, dirs: [...dirs.keys()].map(dirPath) };
  }

  // ------------------------------------------------------------------ RT-11 (home block 1, directory segments of 2 blocks)
  const R50 = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ$.%0123456789';
  const rad50 = (w) => R50[Math.floor(w / 1600) % 40] + R50[Math.floor(w / 40) % 40] + R50[w % 40];
  function rt11(img, name) {
    if (img.length < 4096) return null;
    const sig = String.fromCharCode(...img.subarray(512 + 0o760, 512 + 0o770));
    if (!/RT11/.test(sig)) return null;
    let seg = u16(img, 512 + 0o724) || 6;
    const files = [];
    for (let s = 1, guard = 0; s && guard < 32; guard++) {
      const so = (seg + (s - 1) * 2) * 512;
      if (so + 1024 > img.length) break;
      const next = u16(img, so + 2), extra = u16(img, so + 6);
      let block = u16(img, so + 8);
      for (let o = so + 10; o + 14 + extra <= so + 1024;) {
        const st = u16(img, o);
        if (st & 0o4000) break; // end of segment
        const nb = u16(img, o + 8);
        if (st & 0o2000) {
          const nm = (rad50(u16(img, o + 2)) + rad50(u16(img, o + 4))).trim(), ext = rad50(u16(img, o + 6)).trim();
          const b0 = block;
          files.push({ path: nm + (ext ? '.' + ext : ''), addr: 0, len: nb * 512, get data() { return img.slice(b0 * 512, Math.min(img.length, (b0 + nb) * 512)); } });
        }
        block += nb;
        o += 14 + extra;
      }
      s = next;
    }
    return { kind: 'RT-11', label: name, files, dirs: [] };
  }

  function open(name, img) {
    for (const f of [fat12, mkdos, rt11]) { try { const v = f(img, name); if (v) return v; } catch (e) { } }
    return null;
  }
  window.BKDisk = { open };
})();
