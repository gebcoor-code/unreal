// Minimal WASI preview1 implementation with an in-memory, case-insensitive file system.
// Paths coming from the emulator may look like "C:\\bios.rom" - drive letters and
// backslashes are normalised so that Win32-style paths just work.
(function (root) {
  'use strict';

  const ERRNO = { SUCCESS: 0, BADF: 8, INVAL: 28, IO: 29, NOENT: 44, NOTDIR: 54, EXIST: 20, ISDIR: 31 };
  const FT = { UNKNOWN: 0, CHAR: 2, DIR: 3, FILE: 4 };

  function normPath(p) {
    p = String(p).replace(/\\/g, '/');
    p = p.replace(/^[a-zA-Z]:/, '');
    const parts = [];
    for (const seg of p.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') { parts.pop(); continue; }
      parts.push(seg);
    }
    return parts.join('/');
  }

  class MemFS {
    constructor() { this.files = new Map(); this.onChange = null; }
    key(p) { return normPath(p).toLowerCase(); }
    exists(p) { return this.files.has(this.key(p)); }
    isDir(p) {
      const k = this.key(p);
      if (k === '') return true;
      const pre = k + '/';
      for (const f of this.files.keys()) if (f.startsWith(pre)) return true;
      return false;
    }
    read(p) { const f = this.files.get(this.key(p)); return f ? f.data.subarray(0, f.size) : null; }
    write(p, data) {
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      this.files.set(this.key(p), { name: normPath(p), data: u8.slice(), size: u8.length });
    }
    remove(p) { this.files.delete(this.key(p)); }
    entry(p, create) {
      const k = this.key(p);
      let f = this.files.get(k);
      if (!f && create) { f = { name: normPath(p), data: new Uint8Array(0), size: 0 }; this.files.set(k, f); }
      return f;
    }
  }

  class WASI {
    constructor(fs, opts) {
      opts = opts || {};
      this.fs = fs;
      this.memory = null;
      this.fds = new Map();
      this.nextFd = 4;
      this.stdout = opts.stdout || ((s) => console.log(s));
      this.outbuf = ['', ''];
      const self = this;
      this.imports = {
        clock_time_get(id, prec, out) {
          const ns = id === 0 ? BigInt(Date.now()) * 1000000n
                              : BigInt(Math.round(self.now() * 1e6));
          self.view().setBigUint64(out, ns, true);
          return 0;
        },
        fd_close(fd) { self.flushFile(fd); self.fds.delete(fd); return 0; },
        fd_fdstat_get(fd, out) {
          const v = self.view();
          let ft = FT.UNKNOWN;
          if (fd <= 2) ft = FT.CHAR; else if (fd === 3) ft = FT.DIR; else if (self.fds.has(fd)) ft = FT.FILE; else return ERRNO.BADF;
          v.setUint8(out, ft); v.setUint16(out + 2, 0, true);
          v.setBigUint64(out + 8, 0xFFFFFFFFFFFFFFFFn, true);
          v.setBigUint64(out + 16, 0xFFFFFFFFFFFFFFFFn, true);
          return 0;
        },
        fd_fdstat_set_flags() { return 0; },
        fd_filestat_get(fd, out) {
          const h = self.fds.get(fd);
          if (fd === 3) { self.writeStat(out, FT.DIR, 0); return 0; }
          if (!h) return ERRNO.BADF;
          self.writeStat(out, FT.FILE, h.f.size); return 0;
        },
        fd_filestat_set_size(fd, size) {
          const h = self.fds.get(fd);
          if (!h || h.dir) return ERRNO.BADF;
          const n = Number(size);
          self.ensure(h.f, n);
          if (n > h.f.size) h.f.data.fill(0, h.f.size, n);
          h.f.size = n; h.dirty = true;
          return 0;
        },
        fd_prestat_get(fd, out) {
          if (fd !== 3) return ERRNO.BADF;
          const v = self.view(); v.setUint8(out, 0); v.setUint32(out + 4, 1, true); return 0;
        },
        fd_prestat_dir_name(fd, ptr, len) {
          if (fd !== 3) return ERRNO.BADF;
          self.u8().set([47], ptr); return 0; // "/"
        },
        fd_read(fd, iovs, iovcnt, nread) {
          const h = self.fds.get(fd);
          const v = self.view();
          if (!h) { v.setUint32(nread, 0, true); return fd === 0 ? 0 : ERRNO.BADF; }
          let total = 0;
          const mem = self.u8();
          for (let i = 0; i < iovcnt; i++) {
            const ptr = v.getUint32(iovs + i * 8, true), len = v.getUint32(iovs + i * 8 + 4, true);
            const n = Math.max(0, Math.min(len, h.f.size - h.pos));
            if (n > 0) mem.set(h.f.data.subarray(h.pos, h.pos + n), ptr);
            h.pos += n; total += n;
            if (n < len) break;
          }
          v.setUint32(nread, total, true);
          return 0;
        },
        fd_write(fd, iovs, iovcnt, nwritten) {
          const v = self.view();
          const mem = self.u8();
          let total = 0;
          if (fd === 1 || fd === 2) {
            let s = '';
            for (let i = 0; i < iovcnt; i++) {
              const ptr = v.getUint32(iovs + i * 8, true), len = v.getUint32(iovs + i * 8 + 4, true);
              for (let j = 0; j < len; j++) s += String.fromCharCode(mem[ptr + j]);
              total += len;
            }
            self.consoleOut(fd - 1, s);
            v.setUint32(nwritten, total, true);
            return 0;
          }
          const h = self.fds.get(fd);
          if (!h) return ERRNO.BADF;
          for (let i = 0; i < iovcnt; i++) {
            const ptr = v.getUint32(iovs + i * 8, true), len = v.getUint32(iovs + i * 8 + 4, true);
            if (h.append) h.pos = h.f.size;
            self.ensure(h.f, h.pos + len);
            h.f.data.set(mem.subarray(ptr, ptr + len), h.pos);
            h.pos += len; if (h.pos > h.f.size) h.f.size = h.pos;
            total += len;
          }
          if (total) h.dirty = true;
          v.setUint32(nwritten, total, true);
          return 0;
        },
        fd_seek(fd, offset, whence, out) {
          const h = self.fds.get(fd);
          if (!h) return ERRNO.BADF;
          const off = Number(offset);
          let np = whence === 0 ? off : whence === 1 ? h.pos + off : h.f.size + off;
          if (np < 0) return ERRNO.INVAL;
          h.pos = np;
          self.view().setBigUint64(out, BigInt(np), true);
          return 0;
        },
        path_filestat_get(fd, flags, pathPtr, pathLen, out) {
          const p = self.str(pathPtr, pathLen);
          const f = self.fs.entry(p, false);
          if (f) { self.writeStat(out, FT.FILE, f.size); return 0; }
          if (self.fs.isDir(p)) { self.writeStat(out, FT.DIR, 0); return 0; }
          return ERRNO.NOENT;
        },
        path_open(dirfd, dirflags, pathPtr, pathLen, oflags, rightsBase, rightsInh, fdflags, outFd) {
          const p = self.str(pathPtr, pathLen);
          const O_CREAT = 1, O_DIRECTORY = 2, O_EXCL = 4, O_TRUNC = 8;
          let f = self.fs.entry(p, false);
          if (!f && self.fs.isDir(p)) {
            if (oflags & O_CREAT) return ERRNO.ISDIR;
            const fd = self.nextFd++;
            self.fds.set(fd, { f: { data: new Uint8Array(0), size: 0 }, pos: 0, dir: true, path: p });
            self.view().setUint32(outFd, fd, true);
            return 0;
          }
          if (oflags & O_DIRECTORY) return ERRNO.NOTDIR;
          if (f && (oflags & O_EXCL) && (oflags & O_CREAT)) return ERRNO.EXIST;
          if (!f) {
            if (!(oflags & O_CREAT)) return ERRNO.NOENT;
            f = self.fs.entry(p, true);
          }
          const h = { f, pos: 0, append: !!(fdflags & 1), path: p, dirty: false };
          if (oflags & O_TRUNC) { f.size = 0; h.dirty = true; }
          const fd = self.nextFd++;
          self.fds.set(fd, h);
          self.view().setUint32(outFd, fd, true);
          return 0;
        },
        proc_exit(code) { throw new Error('WASI proc_exit(' + code + ')'); },
      };
    }
    now() { return (typeof performance !== 'undefined') ? performance.now() : Date.now(); }
    setMemory(m) { this.memory = m; }
    view() { return new DataView(this.memory.buffer); }
    u8() { return new Uint8Array(this.memory.buffer); }
    str(ptr, len) {
      const b = this.u8().subarray(ptr, ptr + len);
      let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
      return s;
    }
    ensure(f, need) {
      if (f.data.length >= need) return;
      const n = new Uint8Array(Math.max(need, f.data.length * 2, 1024));
      n.set(f.data.subarray(0, f.size)); f.data = n;
    }
    writeStat(out, type, size) {
      const v = this.view();
      for (let i = 0; i < 64; i += 8) v.setBigUint64(out + i, 0n, true);
      v.setUint8(out + 16, type);
      v.setBigUint64(out + 24, 1n, true);
      v.setBigUint64(out + 32, BigInt(size), true);
    }
    flushFile(fd) {
      const h = this.fds.get(fd);
      if (h && h.dirty && this.fs.onChange) { h.dirty = false; this.fs.onChange(h.path, h.f); }
    }
    consoleOut(i, s) {
      this.outbuf[i] += s;
      let k;
      while ((k = this.outbuf[i].indexOf('\n')) >= 0) {
        const line = this.outbuf[i].slice(0, k);
        this.outbuf[i] = this.outbuf[i].slice(k + 1);
        this.stdout(line, i);
      }
    }
  }

  const api = { MemFS, WASI, normPath };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.UnrealWasi = api;
})(typeof self !== 'undefined' ? self : this);
