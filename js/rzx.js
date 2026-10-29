// RZX input recordings (Ramsoft format, rzxarchive.co.uk): the file read into the segments the core plays (web/web_rzx.cpp).
// A segment: an input recording block and the snapshot before it (SNA, Z80 or SZX: turned into the core's state, RZST).
(function (root) {
  'use strict';
  const PAGE = 16384, ST = 128 + 8 * PAGE;
  const u16 = (b, o) => b[o] | (b[o + 1] << 8);
  const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  const asc = (b) => { let s = ''; for (const c of b) { if (!c) break; s += String.fromCharCode(c); } return s; };

  async function inflate(data) { // zlib (RZX blocks, SZX pages)
    if (typeof DecompressionStream === 'undefined') throw new Error('this browser cannot unpack the recording (no DecompressionStream)');
    const ds = new DecompressionStream('deflate');
    const out = new Response(new Blob([data]).stream().pipeThrough(ds));
    return new Uint8Array(await out.arrayBuffer());
  }

  // the state (layout: web/web_rzx.cpp); machines: 0 48K, 1 128K, 2 +2A / +3, 3 +2, 4 Pentagon 128
  function state() { const s = new Uint8Array(ST); s.set([0x52, 0x5A, 0x53, 0x54]); return s; }
  const w16 = (s, o, v) => { s[o] = v & 0xFF; s[o + 1] = (v >> 8) & 0xFF; };
  const w32 = (s, o, v) => { w16(s, o, v & 0xFFFF); w16(s, o + 2, v >>> 16); };
  const page = (s, n) => s.subarray(128 + n * PAGE, 128 + (n + 1) * PAGE);
  // r: { af, bc, de, hl, af_, bc_, de_, hl_, ix, iy, sp, pc, i, r, iff1, iff2, im, halt, memptr }
  function regs(s, r) {
    const o = [r.af, r.bc, r.de, r.hl, r.af_, r.bc_, r.de_, r.hl_, r.ix, r.iy, r.sp, r.pc];
    for (let k = 0; k < 12; k++) w16(s, 4 + 2 * k, o[k]);
    s[28] = r.i; s[29] = r.r; s[30] = r.iff1 ? 1 : 0; s[31] = r.iff2 ? 1 : 0; s[32] = r.im & 3; s[33] = r.halt ? 1 : 0;
    w16(s, 34, r.memptr || 0);
  }
  const ports = (s, p7ffd, p1ffd, fe, mach) => { s[40] = p7ffd; s[41] = p1ffd; s[42] = fe; s[61] = mach; };

  // SNA: 48K (49179 bytes) or 128K (131103 / 147487)
  function sna(b) {
    if (b.length < 49179) throw new Error('SNA: the file is cut');
    const s = state(), h = b;
    const r = { i: h[0], hl_: u16(h, 1), de_: u16(h, 3), bc_: u16(h, 5), af_: u16(h, 7), hl: u16(h, 9), de: u16(h, 11), bc: u16(h, 13),
      iy: u16(h, 15), ix: u16(h, 17), iff2: !!(h[19] & 4), r: h[20], af: u16(h, 21), sp: u16(h, 23), im: h[25] };
    r.iff1 = r.iff2;
    const ram = b.subarray(27, 27 + 49152);
    if (b.length >= 131103) {
      const p7 = b[49181], top = p7 & 7;
      page(s, 5).set(ram.subarray(0, PAGE)); page(s, 2).set(ram.subarray(PAGE, 2 * PAGE)); page(s, top).set(ram.subarray(2 * PAGE));
      let p = 49183;
      for (let n = 0; n < 8; n++) { if (n === 5 || n === 2 || n === top) continue; if (p + PAGE > b.length) break; page(s, n).set(b.subarray(p, p + PAGE)); p += PAGE; }
      r.pc = u16(b, 49179);
      regs(s, r); ports(s, p7, 0, h[26] & 7, 1); if (b[49182]) s[60] |= 1;
      return { s, mach: 1 };
    }
    page(s, 5).set(ram.subarray(0, PAGE)); page(s, 2).set(ram.subarray(PAGE, 2 * PAGE)); page(s, 0).set(ram.subarray(2 * PAGE));
    const rd = (a) => ram[a - 0x4000];
    r.pc = rd(r.sp) | (rd((r.sp + 1) & 0xFFFF) << 8); r.sp = (r.sp + 2) & 0xFFFF; // RETN
    regs(s, r); ports(s, 0x30, 0, h[26] & 7, 0);
    return { s, mach: 0 };
  }

  // Z80 (versions 1, 2, 3)
  function unz80(src, len) { // the ED ED nn bb packing
    const out = new Uint8Array(len); let o = 0, i = 0;
    while (i < src.length && o < len) {
      if (src[i] === 0xED && src[i + 1] === 0xED) { const n = src[i + 2], v = src[i + 3]; for (let k = 0; k < n && o < len; k++) out[o++] = v; i += 4; }
      else out[o++] = src[i++];
    }
    return out;
  }
  function z80(b) {
    if (b.length < 30) throw new Error('Z80: the file is cut');
    let fl = b[12]; if (fl === 0xFF) fl = 1;
    const r = { af: (b[0] << 8) | b[1], bc: u16(b, 2), hl: u16(b, 4), pc: u16(b, 6), sp: u16(b, 8), i: b[10], r: (b[11] & 0x7F) | ((fl & 1) << 7),
      de: u16(b, 13), bc_: u16(b, 15), de_: u16(b, 17), hl_: u16(b, 19), af_: (b[21] << 8) | b[22], iy: u16(b, 23), ix: u16(b, 25),
      iff1: b[27], iff2: b[28], im: b[29] & 3 };
    const s = state(), border = (fl >> 1) & 7;
    if (r.pc) { // version 1: 48K
      const m = (fl & 0x20) ? unz80(b.subarray(30), 49152) : b.subarray(30, 30 + 49152);
      page(s, 5).set(m.subarray(0, PAGE)); page(s, 2).set(m.subarray(PAGE, 2 * PAGE)); page(s, 0).set(m.subarray(2 * PAGE, 3 * PAGE));
      regs(s, r); ports(s, 0x30, 0, border, 0);
      return { s, mach: 0 };
    }
    const ext = u16(b, 30), v3 = ext >= 54, hw = b[34];
    r.pc = u16(b, 32);
    let mach;
    if (!v3) mach = hw >= 3 ? 1 : 0;
    else if (hw <= 3) mach = 0;
    else if (hw <= 6) mach = (b[37] & 0x80) ? 3 : 1; // "modify hardware": a +2
    else if (hw === 12) mach = 3;
    else if (hw === 9) mach = 4;
    else if (hw === 7 || hw === 8 || hw === 13) mach = 2;
    else throw new Error('Z80: this machine (hardware ' + hw + ') is not supported');
    let p = 32 + ext;
    while (p + 3 <= b.length) {
      const len = u16(b, p), pg = b[p + 2]; p += 3;
      const raw = len === 0xFFFF ? b.subarray(p, p + PAGE) : unz80(b.subarray(p, p + len), PAGE);
      p += len === 0xFFFF ? PAGE : len;
      let n = -1;
      if (mach) { if (pg >= 3 && pg <= 10) n = pg - 3; }
      else n = pg === 4 ? 2 : pg === 5 ? 0 : pg === 8 ? 5 : -1;
      if (n >= 0) page(s, n).set(raw);
    }
    regs(s, r);
    ports(s, mach ? b[35] : 0x30, mach === 2 && ext === 55 ? b[86] : 0, border, mach);
    if (b[37] & 4 || mach) { s[43] = b[38] & 15; s.set(b.subarray(39, 55), 44); }
    return { s, mach };
  }

  // SZX (zx-state, Spectaculator / Fuse / SpecEmu)
  async function szx(b) {
    if (b.length < 8 || asc(b.subarray(0, 4)) !== 'ZXST') throw new Error('SZX: not an SZX snapshot');
    const ver = (b[4] << 8) | b[5], mid = b[6];
    const MACH = { 0: 0, 1: 0, 15: 0, 2: 1, 3: 3, 7: 4, 16: 1, 4: 2, 5: 2, 6: 2 };
    if (!(mid in MACH)) throw new Error('SZX: this machine (' + mid + ') is not supported');
    const mach = MACH[mid], s = state();
    let r = null, swapAF = false, p7 = mach ? 0 : 0x30, p1 = 0, fe = 0;
    for (let p = 8; p + 8 <= b.length;) {
      const id = asc(b.subarray(p, p + 4)), len = u32(b, p + 4), d = b.subarray(p + 8, p + 8 + len); p += 8 + len;
      if (id === 'CRTR' && len > 36) { // old libspectrum wrote A and F the other way round
        const m = /libspectrum: (\d+)\.(\d+)\.(\d+)/.exec(asc(d.subarray(36)));
        if (m && +m[1] === 0 && (+m[2] < 5 || (+m[2] === 5 && +m[3] === 0))) swapAF = true;
      } else if (id === 'Z80R' && len >= 37) {
        const afs = (o) => swapAF ? (d[o] << 8) | d[o + 1] : (d[o + 1] << 8) | d[o];
        r = { af: afs(0), bc: u16(d, 2), de: u16(d, 4), hl: u16(d, 6), af_: afs(8), bc_: u16(d, 10), de_: u16(d, 12), hl_: u16(d, 14),
          ix: u16(d, 16), iy: u16(d, 18), sp: u16(d, 20), pc: u16(d, 22), i: d[24], r: d[25], iff1: d[26], iff2: d[27], im: d[28],
          halt: ver >= 0x0101 && !!(d[34] & 2), memptr: ver >= 0x0104 ? u16(d, 35) : 0 };
      } else if (id === 'SPCR' && len >= 8) {
        fe = d[0] & 7; if (mach) p7 = d[1]; if (mach === 2) p1 = d[2];
      } else if (id === 'RAMP' && len >= 3) {
        const fl = u16(d, 0), n = d[2];
        if (n < 8) page(s, n).set(((fl & 1) ? await inflate(d.subarray(3)) : d.subarray(3, 3 + PAGE)).subarray(0, PAGE));
      } else if (id === 'AY\0\0' && len >= 18) {
        s[43] = d[1] & 15; s.set(d.subarray(2, 18), 44);
      }
    }
    if (!r) throw new Error('SZX: no Z80 registers');
    regs(s, r); ports(s, mach ? p7 : 0x30, p1, fe, mach);
    return { s, mach };
  }

  async function snap(ext, data) {
    if (ext === 'sna') return sna(data);
    if (ext === 'z80') return z80(data);
    if (ext === 'szx') return szx(data);
    throw new Error('snapshots of type ' + (ext.toUpperCase() || '?') + ' are not supported');
  }

  // → { creator, mach, total, segs: [{ state, n, tstart }], buf (for web_rzx_load) }
  async function read(b) {
    if (b.length < 10 || asc(b.subarray(0, 4)) !== 'RZX!') throw new Error('not an RZX file');
    let creator = '', pend = null, mach = -1, p = 10;
    const segs = [];
    while (p + 5 <= b.length) {
      const id = b[p], len = u32(b, p + 1);
      if (len < 5 || p + len > b.length) break; // cut: what came before still plays
      const d = b.subarray(p + 5, p + len); p += len;
      if (id === 0x10 && d.length >= 24) creator = asc(d.subarray(0, 20)).trim() + ' ' + u16(d, 20) + '.' + u16(d, 22);
      else if (id === 0x30 && d.length >= 12) {
        const fl = u32(d, 0), ext = asc(d.subarray(4, 8)).toLowerCase();
        if (fl & 1) throw new Error('the snapshot is in another file (' + asc(d.subarray(16)) + ')');
        const data = (fl & 2) ? await inflate(d.subarray(12)) : d.subarray(12);
        pend = await snap(ext, data);
      } else if (id === 0x80 && d.length >= 13) {
        const n = u32(d, 0), ts = u32(d, 5), fl = u32(d, 9);
        if (fl & 1) throw new Error('a protected (encrypted) recording of a competition');
        if (!n) continue;
        const data = (fl & 2) ? await inflate(d.subarray(13)) : d.subarray(13);
        if (pend && mach < 0) mach = pend.mach;
        segs.push({ state: pend ? pend.s : null, n, tstart: ts, data });
        pend = null;
      }
    }
    if (!segs.length) throw new Error('no input recording in the file');
    if (!segs[0].state) throw new Error('no snapshot to start from');
    // the core's layout: "RZXW", count; each segment: has state, [state], frames, t-states, length, frames
    let size = 8;
    for (const g of segs) size += 4 + (g.state ? ST : 0) + 12 + g.data.length;
    const buf = new Uint8Array(size);
    buf.set([0x52, 0x5A, 0x58, 0x57]); w32(buf, 4, segs.length);
    let o = 8, total = 0;
    for (const g of segs) {
      w32(buf, o, g.state ? 1 : 0); o += 4;
      if (g.state) { buf.set(g.state, o); o += ST; }
      w32(buf, o, g.n); w32(buf, o + 4, g.tstart); w32(buf, o + 8, g.data.length); o += 12;
      buf.set(g.data, o); o += g.data.length;
      total += g.n;
    }
    return { creator, mach, total, segs: segs.map((g) => ({ state: !!g.state, n: g.n })), buf };
  }

  // ------------------------------------------------------------------ writing (Save / RZX recording)
  async function deflate(data) { // zlib
    const cs = new CompressionStream('deflate');
    return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(cs)).arrayBuffer());
  }
  const cat = (parts) => { const n = parts.reduce((a, p) => a + p.length, 0), o = new Uint8Array(n); let k = 0; for (const p of parts) { o.set(p, k); k += p.length; } return o; };
  const ascii = (t, n) => { const b = new Uint8Array(n); for (let i = 0; i < Math.min(t.length, n - 1); i++) b[i] = t.charCodeAt(i) & 0x7F; return b; };
  const le = (n, v) => { const b = new Uint8Array(n); for (let i = 0; i < n; i++) b[i] = (v >>> (8 * i)) & 0xFF; return b; };
  // the state (RZST) as an SZX snapshot; mach: 0 48K, 1 128K, 2 +3, 3 +2, 4 Pentagon 128
  async function szxOf(s, mach, creator, major, minor) {
    const SZX_MID = [1, 2, 5, 3, 7][mach];
    const parts = [new Uint8Array([0x5A, 0x58, 0x53, 0x54, 1, 4, SZX_MID, 0])];
    const blk = (id, d) => parts.push(ascii(id, 5).subarray(0, 4), le(4, d.length), d);
    blk('CRTR', cat([ascii(creator, 32), le(2, major), le(2, minor)]));
    const z = new Uint8Array(37), rw = (o) => s[o] | (s[o + 1] << 8);
    const af = rw(4), af_ = rw(12);
    z[0] = af & 0xFF; z[1] = af >> 8; z.set(s.subarray(6, 12), 2); z[8] = af_ & 0xFF; z[9] = af_ >> 8; z.set(s.subarray(14, 28), 10); // BC DE HL, BC' DE' HL', IX IY SP PC
    z[24] = s[28]; z[25] = s[29]; z[26] = s[30]; z[27] = s[31]; z[28] = s[32];
    z.set(s.subarray(36, 40), 29); z[33] = 0; z[34] = s[33] ? 2 : 0; z[35] = s[34]; z[36] = s[35];
    blk('Z80R', z);
    blk('SPCR', new Uint8Array([s[42] & 7, mach === 0 ? 0 : s[40], mach === 2 ? s[41] : 0, s[42], 0, 0, 0, 0]));
    blk('AY\0\0', cat([new Uint8Array([0, s[43]]), s.subarray(44, 60)]));
    for (const n of (mach === 0 ? [0, 2, 5] : [0, 1, 2, 3, 4, 5, 6, 7])) {
      const c = await deflate(page(s, n));
      blk('RAMP', cat([le(2, 1), new Uint8Array([n]), c]));
    }
    return cat(parts);
  }
  // rec: { state (RZST), mach, frames (the input block's frames), n, creator, major, minor } → the .rzx file
  async function write(rec) {
    const snap = await szxOf(rec.state, rec.mach, rec.creator, rec.major, rec.minor);
    const fr = await deflate(rec.frames), t = rec.state[36] | (rec.state[37] << 8) | (rec.state[38] << 16) | (rec.state[39] << 24);
    return cat([
      new Uint8Array([0x52, 0x5A, 0x58, 0x21, 0, 13]), le(4, 0),
      new Uint8Array([0x10]), le(4, 29), ascii(rec.creator, 20), le(2, rec.major), le(2, rec.minor),
      new Uint8Array([0x30]), le(4, 17 + snap.length), le(4, 0), ascii('szx', 4), le(4, snap.length), snap,
      new Uint8Array([0x80]), le(4, 18 + fr.length), le(4, rec.n), new Uint8Array([0]), le(4, t >>> 0), le(4, 2), fr,
    ]);
  }

  root.UnrealRzx = { read, write, ST, PAGE };
})(typeof window !== 'undefined' ? window : globalThis);
