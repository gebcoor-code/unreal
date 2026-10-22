// Web BK-0010/0011M front-end: canvas, main loop, keyboard, Options, Help
(function () {
  'use strict';
  const { MemFS, WASI } = window.UnrealWasi; // wasi_fs.js (shared with the Unreal Speccy web port)

  const WASM_URL = 'bk.wasm?v=20261022140203';
  const APP_VER = '0.19.4'; // About (history: changes.txt)
  // the author's e-mail in About, as a picture (not text for address collectors): 12px, the About line's colour, 3x
  const IMG_MAIL = 'data:image/png;base64,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';
  const BUILD = '20261022140203'; // set by make_dist.sh: the build of these files (index.html carries the same in <meta name="build">)
  // bk.ini of the original emulator is used as is (ROM names, options); it sits next to index.html.
  const INI_FILE = 'bk.ini';
  // Folders on the server are lower case: ROM images live in rom/ (names as in bk.ini, lower case).
  // Inside the emulator they are C:\ROM\<name> (bk.ini: Rom Directory = ROM), the WASI file system ignores case.
  const ROM_DIR = 'rom/';

  // ------------------------------------------------------------------ machine models
  // cfg = index in g_mstrConfigBKModelParameters (devemu/Globals.h); files = the ROMs it loads (Board*.cpp, names from bk.ini)
  const R10 = ['bk10_017_mon.rom', 'bk10_106_basic1.rom', 'bk10_107_basic2.rom', 'bk10_108_basic3.rom'];
  const R11 = ['bk11_198_basic1.rom', 'bk11_199_basic2.rom', 'bk11_200_basic3.rom', 'bk11_201_bos.rom', 'bk11_202_ext.rom', 'bk11_203_mstd.rom'];
  const R11M = ['bk11m_324_bos.rom', 'bk11m_325_ext.rom', 'bk11m_327_basic1.rom', 'bk11m_328_basic2.rom', 'bk11m_329_basic3.rom', 'bk11m_330_mstd.rom'];
  const KNGMD = 'disk_327v12.rom', A16M = 'disk_a16m_v2.41.rom', SMK = 'disk_smk512_v2.05.rom';
  const NODISK = ' · disk images: not in this version yet';
  const MODELS = {
    // configurations of the emulator (about: description from its documentation, short)
    BK0010_01:      { name: 'BK-0010-01', cfg: 0, files: R10, note: '32K RAM · Monitor + Vilnius Basic 1986',
      about: 'Vilnius Basic 1986 (syntax close to GW-Basic). RAM 16K, screen 16K; Monitor at 100000, Basic ROM 120000–177577' },
    BK0010_01_MSTD: { name: 'BK-0010-01 + MSTD', cfg: 1, files: ['bk10_017_mon.rom', 'bk10_018_focal.rom', 'bk10_019_mstd.rom'], note: '32K RAM · Monitor + Focal + MSTD tests',
      about: 'MSTD block: Focal ROM at 120000, tests ROM at 160000 (monitor command T)' },
    BK0010_01_EXT32:{ name: 'BK-0010-01 + 32K RAM', cfg: 2, files: ['bk10_017_mon.rom'], note: '32K + 32K RAM · Monitor',
      about: 'extra RAM block 32K: 8K pages at 120000–137777, 48K RAM in all' },
    BK0010_01_FDD:  { name: 'BK-0010-01 + KNGMD', cfg: 3, files: R10.concat(KNGMD), note: 'floppy controller 1801VP1-128 (KNGMD), ROM 327' + NODISK,
      about: 'standard floppy controller (KNGMD) with RAM 16K, drives A: … D:; S 160000 boots system disk' },
    BK0010_01_A16M: { name: 'BK-0010-01 + A16M', cfg: 4, files: R10.concat(A16M), note: 'A16M controller, ROM 2.41' + NODISK,
      about: 'A16M floppy controller: RAM 16K at 120000–157777, ROM at 160000; drives A:, B:' },
    BK0010_01_SMK:  { name: 'BK-0010-01 + SMK-512', cfg: 5, files: R10.concat(SMK), note: 'SMK-512 controller, ROM 2.05' + NODISK,
      about: 'SMK-512 floppy controller with RAM 512K and HDD (IDE master / slave); drives A:, B:' },
    BK0011:         { name: 'BK-0011', cfg: 6, files: R11, note: '128K RAM · BOS',
      about: 'BK-0011 + MSTD: tests 160000G; Basic 11;1C 100000G' },
    BK0011_FDD:     { name: 'BK-0011 + KNGMD', cfg: 7, files: R11.concat(KNGMD), note: '128K RAM · KNGMD' + NODISK,
      about: 'BK-0011 with standard floppy controller (little software for it)' },
    BK0011_SMK:     { name: 'BK-0011 + SMK-512', cfg: 8, files: R11.concat(SMK), note: '128K RAM · SMK-512' + NODISK,
      about: 'BK-0011 with SMK-512 controller and HDD (configuration of the emulator, not in its documentation)' },
    BK0011M:        { name: 'BK-0011M', cfg: 9, files: R11M, note: '128K RAM · BOS · Basic BK11/10',
      about: 'BK-0011M + MSTD: 128K RAM, BOS, Basic; tests: monitor, 160000G' },
    BK0011M_FDD:    { name: 'BK-0011M + KNGMD', cfg: 10, files: R11M.concat(KNGMD), note: '128K RAM · KNGMD' + NODISK,
      about: 'BK-0011M with standard floppy controller' },
    BK0011M_A16M:   { name: 'BK-0011M + A16M', cfg: 11, files: R11M.concat(A16M), note: '128K RAM · A16M' + NODISK,
      about: 'BK-0011M with A16M floppy controller' },
    BK0011M_SMK:    { name: 'BK-0011M + SMK-512', cfg: 12, files: R11M.concat(SMK), note: '128K RAM · SMK-512' + NODISK,
      about: 'BK-0011M with SMK-512 controller and HDD' },
  };
  let model = 'BK0010_01';

  const $ = (id) => document.getElementById(id);
  const canvas = $('screen');
  const ctx2d = canvas.getContext('2d', { alpha: false });
  function store(k, v) { try { localStorage.setItem('bk.' + k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem('bk.' + k); } catch (e) { return null; } }
  function log(s) { console.log('[bk] ' + s); }
  let toastTimer = 0;
  function toast(s, err) {
    log(s);
    const t = $('toast'); t.textContent = s; t.classList.toggle('err', !!err); t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), err ? 4000 : 2500);
  }

  async function fetchBytes(url) {
    // no-cache: revalidate with the server (a replaced ROM is taken at once; unchanged files cost a 304)
    const r = await fetch(encodeURI(url), { cache: 'no-cache' });
    if (!r.ok) throw new Error(url + (r.status === 404 ? ' not found (404)' : ' HTTP ' + r.status));
    // some hosts answer a missing file with their own HTML page (status 200)
    if (/text\/html/i.test(r.headers.get('content-type') || '') && !/\.html?$/i.test(url)) throw new Error(url + ' not found (web page instead of the file)');
    return new Uint8Array(await r.arrayBuffer());
  }

  // ------------------------------------------------------------------ file system
  const fs = new MemFS();
  async function ensureFiles(list, toPath, fromUrl) {
    const need = list.filter((f) => !fs.exists(toPath(f)));
    const errs = [];
    const got = await Promise.all(need.map((f) => (toPath(f).startsWith('rom/') ? fetchRom(f) : fetchBytes(fromUrl(f))).catch((e) => { errs.push(e.message); return null; })));
    need.forEach((f, i) => { if (got[i]) fs.write(toPath(f), got[i]); });
    return errs;
  }
  // ROM names on the server: lower case is asked first, then the name as in bk.ini and in upper case (case-sensitive hosts)
  async function fetchRom(f) {
    const names = [...new Set([f.toLowerCase(), f, f.toUpperCase()])];
    for (let i = 0; ; i++) {
      try { return await fetchBytes(ROM_DIR + names[i]); }
      catch (e) { if (i === names.length - 1 || !/not found/.test(e.message)) throw new Error(ROM_DIR + f.toLowerCase() + (/not found/.test(e.message) ? ' not found (404)' : ': ' + e.message)); }
    }
  }
  const romFiles = (m) => ensureFiles(MODELS[m].files, (f) => 'rom/' + f, (f) => f);

  // ------------------------------------------------------------------ wasm
  let module = null, E = null;
  const dec1251 = new TextDecoder('windows-1251');
  const cstr = (p) => { const m = new Uint8Array(E.memory.buffer); let e = p; while (m[e]) e++; return dec1251.decode(m.subarray(p, e)); };
  const WM_USER = 0x400, WM_TAPE_FILE_LOAD = WM_USER + 105, WM_CPU_DEBUGBREAK = WM_USER + 108;

  async function start() {
    const [wasm, errIni, errRom] = await Promise.all([fetchBytes(WASM_URL), ensureFiles([INI_FILE], (f) => f, (f) => f), romFiles(model)]);
    const errs = errIni.concat(errRom);
    if (errs.length) throw new Error('Cannot load: ' + errs.join(', '));
    module = await WebAssembly.compile(wasm);
    const wasi = new WASI(fs, { stdout: (s) => log(s) });
    const env = {
      web_message: (t, c, type) => {
        const text = cstr(t), cap = cstr(c);
        toast(cap + ': ' + text.replace(/\r?\n/g, ' '), true);
        return 1; // IDOK
      },
      web_event: (msg, wp, lp) => {
        if (msg === WM_CPU_DEBUGBREAK) { if (dbg) dbg.onBreak(); else toast('CPU stopped'); }
      },
      web_tape_lookup: (np, cmd, outp, outn) => tapeLookup(np, cmd, outp, outn),
      web_tape_saved: (pp, np) => tapeSaved(pp, np),
    };
    const inst = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi.imports, env });
    E = inst.exports;
    wasi.setMemory(E.memory);
    E._initialize();
    applyPrefs(); // options kept in the browser (before the machine starts: CPU clock, monitor, keyboard)
    if (E.web_init(MODELS[model].cfg) < 0) throw new Error('The emulator could not start ' + MODELS[model].name);
    log('started ' + cstr(E.web_model_name()) + ', ' + E.web_cpu_freq() + ' Hz');
    modelUI();
  }

  // ------------------------------------------------------------------ tape: file sets (File Commander)
  // Server sets: ZIP files of BK tape files; the first one is opened in File Commander. Folders on the server are lower case.
  // The server list: img/list.json — { "files": [...], "disks": [...], "scripts": [...], "states": [...] }, items
  // { "name", "url", "desc" }: a .zip is a set for File Commander, other files are opened as they are (image, .msf, ...)
  const LIST_GROUPS = [['files', 'Files'], ['disks', 'Disks'], ['scripts', 'Scripts'], ['states', 'States']];
  let serverList = { files: [{ name: 'games', url: 'img/games.zip' }], disks: [{ name: 'disks', url: 'img/disks.zip' }], scripts: [{ name: 'bkscript', url: 'img/bkscript.zip' }] };
  const SETS = [];
  function setsFromList() {
    const old = new Map(SETS.map((x) => [x.url, x])); SETS.length = 0;
    for (const [g] of LIST_GROUPS) for (const it of serverList[g] || []) if (/\.zip$/i.test(it.url)) SETS.push(old.get(it.url) || { id: 'S' + SETS.length + '_' + it.url.length, name: it.name, url: it.url });
  }
  setsFromList();
  async function loadServerList() {
    try {
      const l = JSON.parse(new TextDecoder().decode(await fetchBytes('img/list.json')));
      if (l && typeof l === 'object') { serverList = l; setsFromList(); if (fc) fc.refresh(); }
    } catch (e) { /* no list on the server: the built-in one */ }
  }
  const ramFiles = []; // RAM panel: files put from the PC, files saved by BK programs
  async function zipSet(name, data) {
    const Z = window.UnrealZip;
    if (!Z.isZip(data)) throw new Error('not a ZIP file');
    const files = [];
    for (const e of Z.list(data)) {
      const path = e.name.replace(/\\/g, '/').replace(/^\/+/, '').toUpperCase();
      if (!path || path.endsWith('/')) continue;
      files.push({ path, data: await Z.extract(data, e) });
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    return { name, files };
  }
  async function loadSet(s) {
    if (s.set) return s.set;
    s.set = await zipSet(s.name, await fetchBytes(s.url));
    return s.set;
  }
  // the "tape": the set of the program that was started (its folder first); the monitor's M command reads from it too
  let tape = null; // { vol, dir }
  const tapePath = (name) => 'tape/' + name.replace(/[\\/]/g, '_');
  function writeStr(p, n, str) { const m = new Uint8Array(E.memory.buffer); const b = new TextEncoder().encode(str); const k = Math.min(b.length, n - 1); m.set(b.subarray(0, k), p); m[p + k] = 0; }
  function findInSet(set, dir, name) {
    const N = name.toUpperCase(), files = set.files;
    const tries = [dir + N, N, dir + N + '.BIN', N + '.BIN'];
    for (const t of tries) { const f = files.find((x) => x.path === t); if (f) return f; }
    // a name without extension: NAME.* in the folder, then at the top
    if (!/\./.test(N)) for (const d of [dir, '']) { const f = files.find((x) => x.path.startsWith(d) && !x.path.slice(d.length).includes('/') && x.path.slice(d.length).replace(/\.[^.]*$/, '') === N); if (f) return f; }
    return null;
  }
  function tapeLookup(np, cmd, outp, outn) {
    const raw = new Uint8Array(E.memory.buffer, np, 16);
    const name = BKFC.bkName(raw).trim();
    if (cmd === 2) { // save: into RAM
      const fn = (name || 'NONAME').toUpperCase() + (/\./.test(name) ? '' : '.BIN');
      writeStr(outp, outn, tapePath(fn));
      return 1;
    }
    let f = null, vol = tape ? tape.vol : null;
    if (!name) { // the monitor's M without a name: the file under the cursor in File Commander
      const c = fc && fc.current();
      if (c) { f = c.file; vol = c.vol; }
    } else {
      if (tape) f = findInSet(tape.vol.set, tape.dir, name);
      if (!f) { const r = findInSet({ files: ramFiles }, '', name); if (r) f = r; }
    }
    if (!f) { log('tape: "' + name + '" not found'); return 0; }
    const p = tapePath(f.path.replace(/^.*\//, ''));
    fs.write(p, f.data);
    log('tape: ' + (name || '(no name)') + ' -> ' + f.path);
    writeStr(outp, outn, p);
    return 1;
  }
  function tapeSaved(pp) {
    const p = cstr(pp), data = fs.read(p);
    if (!data) return;
    const nm = p.replace(/^.*\//, '');
    const i = ramFiles.findIndex((x) => x.path === nm);
    if (i >= 0) ramFiles.splice(i, 1);
    ramFiles.push({ path: nm, data: new Uint8Array(data) });
    toast('Saved ' + nm + ' to RAM (File Commander)');
    if (fc) fc.refresh();
  }
  // Run a file of a set in the current model: reset, the boot, then the file comes through the tape (web_run_bin)
  const BOOT_FRAMES = 120;
  function runFile(vol, file, dry) {
    if (/\.MSF$/i.test(file.path)) { if (dry) return null; loadState(file.path.replace(/^.*\//, ''), file.data); return null; }
    if (/\.BKSCRIPT$/i.test(file.path)) { if (dry) return null; runScript(file.path.replace(/^.*\//, ''), file.data); return null; }
    const bi = BKFC.binInfo(file.data);
    if (!/\.BIN$/i.test(file.path)) return file.path.replace(/^.*\//, '') + ': only .BIN, .MSF, .BKSCRIPT start (overlays and data are loaded by programs)';
    if (!bi || !bi.len) return 'not a BK program (no address / length header)';
    if (MODELS[model].cfg >= 6) return MODELS[model].name + ': .bin runs on BK-0010 models (Options → System)';
    if (dry) return null;
    const dir = file.path.includes('/') ? file.path.replace(/[^/]*$/, '') : '';
    tape = { vol, dir };
    const fn = file.path.replace(/^.*\//, ''), p = tapePath(fn);
    fs.write(p, file.data);
    releaseKeys(); stopTape(); E.web_script_stop();
    E.web_reset(0);
    for (let i = 0; i < BOOT_FRAMES; i++) E.web_frame();
    const sp = E.malloc(256), np = E.malloc(32);
    writeStr(sp, 256, p); writeStr(np, 32, fn.slice(0, 16));
    const r = E.web_run_bin(sp, np);
    E.free(sp); E.free(np);
    if (r < 0) return fn + ': cannot start';
    if (userPaused) setUserPaused(false);
    resync(performance.now());
    toast('Run ' + fn);
    canvas.focus();
    return null;
  }
  // ---- state files (.msf): the model of the file is fetched (ROMs) and made, the state restored; the page's options stay
  const cstrIn = (str) => { const b = new TextEncoder().encode(str); const p = E.malloc(b.length + 1); new Uint8Array(E.memory.buffer).set(b, p); new Uint8Array(E.memory.buffer)[p + b.length] = 0; return p; };
  const modelOfCfg = (n) => Object.keys(MODELS).find((k) => MODELS[k].cfg === n);
  async function loadState(name, data) {
    const path = 'state/' + name.replace(/[\\/]/g, '_');
    fs.write(path, data);
    const p = cstrIn(path);
    try {
      const n = E.web_msf_model(p), mk = modelOfCfg(n);
      if (n < 0 || !mk) { toast(name + ': not a state file of this emulator (.msf version 1.2)', true); return false; }
      const errs = await romFiles(mk);
      if (errs.length) { toast('Cannot load: ' + errs.join(', '), true); return false; }
      releaseKeys(); E.web_script_stop();
      const r = E.web_msf_load(p, MODELS[model].cfg);
      if (r < 0) { toast(name + ': the state could not be restored', true); return false; }
      model = mk; store('model', mk); lastVideo = -1; modelUI();
      if (userPaused) setUserPaused(false);
      resync(performance.now());
      toast('State ' + name + ' · ' + MODELS[mk].name);
      canvas.focus(); activateWin(scrWin);
      return true;
    } finally { E.free(p); }
  }
  let stateN = 0;
  function saveState() {
    if (!E) return;
    const p = cstrIn('state/save.msf');
    const ok = E.web_msf_save(p); E.free(p);
    const data = ok && fs.read('state/save.msf');
    if (!data) { toast('Cannot save the state', true); return; }
    let nm; do { nm = 'STATE' + String(++stateN).padStart(2, '0') + '.MSF'; } while (ramFiles.some((x) => x.path === nm));
    ramFiles.push({ path: nm, data: new Uint8Array(data) });
    toast('State saved to RAM: ' + nm + ' (File Commander)');
    if (fc) fc.refresh();
  }
  // preview of a state file for the viewer: canvas 200 x 200 and the model
  function statePreview(data) {
    if (!E) return null;
    fs.write('state/view.msf', data);
    const p = cstrIn('state/view.msf'), px = E.malloc(200 * 200 * 4);
    try {
      const n = E.web_msf_preview(p, px), mk = modelOfCfg(n);
      if (n < 0) return null;
      const c = document.createElement('canvas'); c.width = 200; c.height = 200;
      c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(E.memory.buffer, px, 200 * 200 * 4).slice(), 200, 200), 0, 0);
      return { canvas: c, info: 'state · ' + (mk ? MODELS[mk].name : 'model ' + n) };
    } finally { E.free(p); E.free(px); }
  }
  // ---- keyboard scripts (.bkscript): typed into the BK as the original's ScriptRunner does ('|' waits 5 s)
  // the ScriptRunner reads Windows-1251 (as the original's files); a UTF-8 script is converted
  let cp1251 = null;
  function toCp1251(data) {
    let t; try { t = new TextDecoder('utf-8', { fatal: true }).decode(data); } catch (e) { return data; }
    if (!/[^\x00-\x7F]/.test(t)) return data;
    if (!cp1251) { cp1251 = new Map(); const d = new TextDecoder('windows-1251'); for (let b = 128; b < 256; b++) cp1251.set(d.decode(new Uint8Array([b])), b); }
    return Uint8Array.from([...t], (ch) => ch.charCodeAt(0) < 128 ? ch.charCodeAt(0) : (cp1251.get(ch) || 63));
  }
  function runScript(name, data) {
    data = toCp1251(data);
    const p = E.malloc(data.length + 1); new Uint8Array(E.memory.buffer).set(data, p);
    E.web_script_start(p, data.length, 25); // the first character after 0.5 s
    E.free(p);
    if (userPaused) setUserPaused(false);
    toast('Script ' + name);
    canvas.focus(); activateWin(scrWin);
  }

  // ---- disk images: floppy drives A: .. D: (0..3), HDD master / slave (4, 5) of the controllers (KNGMD, A16M, SMK-512)
  // The image lives in the WASI file system (drv/...): the machine writes into it; Options → Disk downloads it back.
  const DRV_NAMES = ['A:', 'B:', 'C:', 'D:', 'HDD master', 'HDD slave'];
  const drives = [null, null, null, null, null, null]; // { name, path }
  const isImage = (name) => /\.(IMG|BKD|DSK|HDI)$/i.test(name);
  const FAMILY = (m) => MODELS[m].cfg <= 5 ? '10' : MODELS[m].cfg <= 8 ? '11' : '11M';
  const FDD_MODELS = { '10': ['BK0010_01_FDD', 'BK0010_01_A16M', 'BK0010_01_SMK'], '11': ['BK0011_FDD', 'BK0011_SMK'], '11M': ['BK0011M_FDD', 'BK0011M_A16M', 'BK0011M_SMK'] };
  const hasFdd = (m) => FDD_MODELS[FAMILY(m)].includes(m);
  const hasHdd = (m) => /_SMK$/.test(m);
  function driveSet(i, name, data) {
    if (data) { const path = 'drv/' + i + '/' + name.replace(/[\\/]/g, '_'); fs.write(path, data); drives[i] = { name, path, sum: bytesSum(data), boot: !!diskProfile(name, data).boot }; }
    else drives[i] = null;
    const p = drives[i] ? cstrIn(drives[i].path) : 0;
    E.web_drive_set(i, p); if (p) E.free(p);
    disksUI();
    if (fc) fc.refresh();
  }
  // a drive's image as the machine has it now; changed since it was mounted?
  const bytesSum = (d) => { let h = 0x811C9DC5 ^ d.length; for (let k = 0; k < d.length; k++) h = Math.imul(h ^ d[k], 16777619); return h >>> 0; };
  function driveData(i) { if (!drives[i]) return null; E.web_fs_sync(); const d = fs.read(drives[i].path); return d ? new Uint8Array(d) : null; }
  const driveChanged = (i, d) => !!(drives[i] && d && bytesSum(d) !== drives[i].sum);
  async function ejectDrive(i) { driveSet(i, null); if (i >= 4 && hasHdd(model)) await setModel(model, true); }
  // boot after a reset: BK-0010 + KNGMD starts the floppy from the monitor (S160000), the others by themselves
  function bootScript() { if (model === 'BK0010_01_FDD') { const t = new TextEncoder().encode('S160000\n'); const p = E.malloc(t.length); new Uint8Array(E.memory.buffer).set(t, p); E.web_script_start(p, t.length, 75); E.free(p); } }
  // mount an image (File Commander Enter, drop): the drive is asked; a model without the controller is switched first
  // a disk image's files as a set in File Commander (the image is changed in place when files are written into it)
  function openImageFiles(name, data) {
    const d = window.BKDisk.open(name, data);
    if (!d) return false;
    const set = { name, kind: d.kind, files: [], disk: d }; // the kind is shown next to the list (not in it)
    set.reload = () => { set.disk = window.BKDisk.open(name, data) || set.disk; set.files = set.disk.files.map((f) => ({ path: f.path, data: f.data, disk: f })); };
    set.reload();
    fc.addSet(set, true); // in the other panel
    return true;
  }
  // what an image is and where it boots: ANDOS / MKDOS / other floppies — the current model with a floppy controller or
  // BK-0010-01 + KNGMD; DX-DOS — KNGMD (BK-0010-01 or BK-0011M); .hdi — a model with SMK-512 (BK-0011M + SMK-512).
  // FAT12 / ANDOS disks without a system file (*.SYS) and RT-11 disks are not booted: their files are opened.
  function diskProfile(name, data) {
    if (/\.HDI$/i.test(name)) return { hdd: true, kind: 'HDD', boot: hasHdd(model) ? model : 'BK0011M_SMK' };
    const v = window.BKDisk.open(name, data), kind = v ? v.kind : '';
    const sys = v && v.files.some((f) => /\.SYS$/i.test(f.path));
    let boot = hasFdd(model) ? model : 'BK0010_01_FDD';
    if (kind === 'FAT12') boot = ['BK0010_01_FDD', 'BK0011M_FDD'].includes(model) ? model : 'BK0010_01_FDD';
    if (kind === 'RT-11' || ((kind === 'FAT12' || kind === 'ANDOS') && !sys)) boot = null;
    return { hdd: false, kind, vol: v, boot };
  }
  // the model for drive i: the current one when it has the controller, otherwise one of its family is asked
  async function modelFor(hdd, ask) {
    if (hdd ? hasHdd(model) : hasFdd(model)) return model;
    const list = hdd ? FDD_MODELS[FAMILY(model)].filter(hasHdd) : FDD_MODELS[FAMILY(model)];
    const c = await ask({ title: 'Disk controller', text: MODELS[model].name + ' has no ' + (hdd ? 'HDD' : 'floppy') + ' controller. Switch to:', buttons: list.map((m) => MODELS[m].name).concat('Cancel') });
    return c >= 0 && c < list.length ? list[c] : null;
  }
  // an image (File Commander Enter, drop): Boot (its model restarts from it), Files (in File Commander), or a drive without restart
  async function mountImage(name, data, ask) {
    ask = ask || (fc && fc.ask);
    const P = diskProfile(name, data);
    let i = -1, target = model, boot = false;
    if (P.hdd) {
      const k = await ask({ title: name + ' · HDD', text: `Boot: ${MODELS[P.boot].name} restarts from it (IDE master of SMK-512).\nSlave: second drive (machine restarts).`, buttons: ['Boot', 'Slave', 'Cancel'] });
      if (k === 0) { i = 4; target = P.boot; boot = true; }
      else if (k === 1) { i = 5; target = await modelFor(true, ask); if (!target) return false; }
      else return false;
    } else {
      const btn = (P.boot ? ['Boot'] : []).concat(['A:', 'B:', 'C:', 'D:', 'Cancel']);
      const text = (P.boot ? `Boot: ${MODELS[P.boot].name} restarts from it (drive A:).` : 'Not a system disk.') + '\nA: .. D: insert into drive, no restart.';
      const k = await ask({ title: name + (P.kind ? ' · ' + P.kind : ''), text, buttons: btn });
      const b = btn[k];
      if (b === 'Boot') { i = 0; target = P.boot; boot = true; }
      else if (/^[A-D]:$/.test(b || '')) { i = 'ABCD'.indexOf(b[0]); target = await modelFor(false, ask); if (!target) return false; }
      else return false;
    }
    await mountTo(i, name, data, target, boot);
    return { drive: i, boot };
  }
  // the image goes into drive i; target: the model (switched when it is not the current one); boot: restart from it
  async function mountTo(i, name, data, target, boot) {
    const hdd = i >= 4;
    driveSet(i, name, data);
    if (hdd && boot && drives[0]) driveSet(0, null); // boot from the HDD: no floppy in A: (the controller would boot it first)
    const restart = target !== model || hdd;
    if (target !== model) await setModel(target, true);
    else if (hdd) await setModel(model, true);   // HDD: taken when the machine is made
    else if (boot) { releaseKeys(); E.web_reset(0); }
    if (boot || (restart && drives[0])) bootScript();
    toast(name + ' → ' + DRV_NAMES[i] + (boot ? ' · boot' : ''));
    if (boot || restart) { canvas.focus(); activateWin(scrWin); }
  }
  // Boot (File Commander, a mounted system disk): the image as it is now goes to A: (HDD: master) and the machine boots it
  async function bootDrive(i) {
    const d = drives[i]; if (!d) return false;
    const data = driveData(i), P = diskProfile(d.name, data); if (!P.boot) return false;
    const to = P.hdd ? 4 : 0;
    if (i !== to) driveSet(i, null);
    await mountTo(to, d.name, data, P.boot, true);
    return to;
  }
  function disksUI() {
    const t = $('drivelist'); if (!t) return;
    t.innerHTML = '';
    DRV_NAMES.forEach((dn, i) => {
      const tr = document.createElement('div'); tr.className = 'drvrow';
      const st = i < 4 && E ? E.web_drive_state(i) : 0;
      tr.innerHTML = `<b>${dn}</b><span class="dn"></span>`;
      tr.querySelector('.dn').textContent = drives[i] ? drives[i].name + (st & 2 ? ' (read only)' : '') : '—';
      const btn = (txt, title, fn, dis) => { const b = document.createElement('button'); b.textContent = txt; b.title = title; b.disabled = !!dis; b.onclick = fn; tr.appendChild(b); };
      btn('Open', 'Image from host', () => { pendingDrive = i; $('drvfile').click(); });
      btn('Get', 'Download image (with changes made by BK)', () => { E.web_fs_sync(); const d = fs.read(drives[i].path); if (d) downloadBytes(drives[i].name, new Uint8Array(d)); }, !drives[i]);
      btn('Eject', 'Remove image', () => ejectDrive(i), !drives[i]);
      t.appendChild(tr);
    });
    $('fddio').checked = fddIO;
  }
  let pendingDrive = -1, fddIO = load('fddio') !== '0';
  function bindDisks() {
    $('drvfile').onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      const i = pendingDrive; pendingDrive = -1;
      if (!f || i < 0) return;
      const data = new Uint8Array(await f.arrayBuffer());
      const need = i >= 4 ? !hasHdd(model) : !hasFdd(model);
      driveSet(i, f.name.toUpperCase(), data);
      if (need) toast(MODELS[model].name + ': no ' + (i >= 4 ? 'HDD' : 'floppy') + ' controller (Options → System)', true);
      else if (i >= 4) { await setModel(model, true); bootScript(); }
    };
    $('fddio').onchange = () => { fddIO = $('fddio').checked; store('fddio', fddIO ? '1' : '0'); E.web_set_fdd_io(fddIO ? 1 : 0); };
  }

  // ---- tapes (.tap / .wav): played as a real cassette, the BK reads them through port 177716 (BK-0011 too).
  // BK-0010 models after a reset: the load command is typed (Basic: MO, monitor: M and the file's name from the tape).
  const isTape = (name) => /\.(TAP|WAV)$/i.test(name);
  const TAPE_CMD = { BK0010_01: 'MO\n|M\n|', BK0010_01_EXT32: 'M\n|', BK0010_01_FDD: 'M\n|' };
  let tapeWait = false, tapeName = '';
  // unicode -> cp1251 for the script (Russian letters switch РУС)
  const to1251 = (str) => Uint8Array.from([...str].map((c) => { const u = c.charCodeAt(0); return u >= 0x410 && u <= 0x44F ? u - 0x410 + 0xC0 : u === 0x401 ? 0xC5 : u === 0x451 ? 0xE5 : u < 128 ? u : 32; }));
  async function playTape(name, data, ask) {
    const wav = /\.WAV$/i.test(name), path = 'tape/' + name.replace(/[\\/]/g, '_');
    fs.write(path, data);
    const p = cstrIn(path), r = E.web_tape_play(p, wav ? 1 : 0, 0); E.free(p);
    if (!r) { toast(name + ': not a BK tape', true); return false; }
    const np = E.malloc(16), cp = E.malloc(4), info = E.web_tape_info(np, cp);
    const bkn = info < 0 ? '' : BKFC.bkName(new Uint8Array(E.memory.buffer, np, 16));
    const crc = info < 0 ? 0 : new Int32Array(E.memory.buffer, cp, 1)[0];
    E.free(np); E.free(cp);
    const what = info < 0 ? 'no BK file header found' : `file ${bkn} · address ${(info >>> 16).toString(8)} · length ${info & 0xFFFF}${crc ? '' : ' · checksum error'}`;
    const auto = TAPE_CMD[model] !== undefined && info >= 0;
    ask = ask || (fc && fc.ask);
    const k = await ask({ title: 'Tape ' + name, text: what + ' · ' + E.web_tape_seconds() + ' s\n' + (auto ? 'Load: machine resets, load command is typed, tape starts.' : 'Play: type the load command on BK, the tape starts at once.'),
      buttons: auto ? ['Load', 'Play', 'Cancel'] : ['Play', 'Cancel'] });
    const load = auto && k === 0, play = auto ? k === 1 : k === 0;
    if (!load && !play) { stopTape(); return false; }
    tapeName = name;
    if (load) {
      releaseKeys(); E.web_reset(0);
      const t = to1251(TAPE_CMD[model] + bkn + '\n'); const q = E.malloc(t.length); new Uint8Array(E.memory.buffer).set(t, q);
      E.web_script_start(q, t.length, 75, 50); E.free(q);
      tapeWait = true;
    } else E.web_tape_start();
    if (userPaused) setUserPaused(false);
    canvas.focus(); activateWin(scrWin);
    return true;
  }
  function stopTape() { tapeWait = false; tapeName = ''; if (E) E.web_tape_stop(); tapeUI(-1); }
  let tapeShown = -2;
  function tapeUI(pr) {
    if (pr === tapeShown) return; tapeShown = pr;
    const el = $('tapest');
    el.hidden = pr < 0;
    el.textContent = pr < 0 ? '' : (tapeWait ? 'tape ready' : 'tape ' + Math.floor(pr / 10) + '%');
  }
  function tapeTick() {
    if (!E) return;
    if (tapeWait && E.web_script_left() === 0) { tapeWait = false; E.web_tape_start(); }
    const pr = tapeName ? E.web_tape_progress() : -1;
    if (pr < 0) tapeName = '';
    tapeUI(pr);
  }

  // a file dropped on the screen: .bin starts (it goes to RAM), .zip opens in File Commander
  async function dropFiles(list) {
    for (const fl of list) await openFile(fl.name, new Uint8Array(await fl.arrayBuffer()));
  }
  // a file from the computer (drop, Load) or from the server list: a zip opens in File Commander, the others as they are
  async function openFile(name, data) {
    if (/\.zip$/i.test(name)) {
      try { const set = await zipSet(name.replace(/^.*[\\/]/, ''), data); fc.addSet(set); if (!fc.open) fc.show(true); toast(name + ': ' + set.files.length + ' files'); }
      catch (e) { toast(name + ': ' + e.message, true); }
      return;
    }
    const nm = name.replace(/^.*[\\/]/, '').toUpperCase();
    if (/\.MSF$/.test(nm)) { await loadState(nm, data); return; }
    if (/\.BKSCRIPT$/.test(nm)) { runScript(nm, data); return; }
    if (isImage(nm)) { if (!fc.open) fc.show(true); const r = await mountImage(nm, data); if (r) { fc.select('D' + r.drive); if (r.boot) fc.show(false); } return; }
    if (isTape(nm)) { if (!fc.open) fc.show(true); await playTape(nm, data); return; }
    const i = ramFiles.findIndex((x) => x.path === nm); if (i >= 0) ramFiles.splice(i, 1);
    const f = { path: nm, data };
    ramFiles.push(f);
    const err = runFile(BKFC.setVolume({ name: 'RAM', files: ramFiles }, 'RAM'), f, false);
    if (err) toast(name + ': ' + err, true);
  }

  // ---- Load and Save menus (toolbar)
  function menuShow(id, v) {
    document.querySelectorAll('.pop.menu.open').forEach((m) => { if (m.id !== id) { m.classList.remove('open'); const b = m.previousElementSibling; if (b) b.classList.remove('open'); } });
    const m = id && $(id); if (!m) return;
    m.classList.toggle('open', v); if (m.previousElementSibling) m.previousElementSibling.classList.toggle('open', v);
  }
  function buildLoadMenu() {
    const m = $('loadpop'); m.innerHTML = '';
    const item = (text, title, fn, desc, icon) => {
      const b = document.createElement('button'); b.innerHTML = `<svg><use href="#${icon || 'i-load'}"/></svg><span></span>` + (desc ? '<span class="mdesc"></span>' : '');
      b.children[1].textContent = text; if (desc) b.children[2].textContent = desc; b.title = title || '';
      b.onclick = (e) => { e.stopPropagation(); menuShow('loadpop', false); fn(); }; m.appendChild(b);
    };
    const grp = (t) => { const d = document.createElement('div'); d.className = 'mgrp'; d.textContent = t; m.appendChild(d); };
    item('From computer…', 'Files from this computer: .zip, .bin, disk images, .msf, .bkscript, .tap / .wav', () => $('loadfile').click(), '', 'i-fc');
    for (const [g, title] of LIST_GROUPS) {
      const list = serverList[g] || []; if (!list.length) continue;
      grp('Server · ' + title);
      for (const it of list) item(it.name, (it.desc ? it.desc + ' · ' : '') + it.url, () => loadServerItem(it), /\.zip$/i.test(it.url) ? 'set' : '', g === 'disks' ? 'i-disk' : g === 'states' ? 'i-save' : g === 'files' || /\.zip$/i.test(it.url) ? 'i-zip' : 'i-load');
    }
  }
  async function loadServerItem(it) {
    if (/\.zip$/i.test(it.url)) { // a set: File Commander shows it in the active panel
      const s = SETS.find((x) => x.url === it.url); if (!s) return;
      if (!fc.open) fc.show(true);
      fc.select(s.id); return;
    }
    toast('Loading ' + it.name + '…');
    try { await openFile(it.url, await fetchBytes(it.url)); } catch (e) { toast(e.message, true); }
  }
  // Save: the state (.msf), the disk images the machine changed, or both in one zip
  const stamp = () => { const d = new Date(), z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}`; };
  function stateBytes() {
    const p = cstrIn('state/save.msf'); const ok = E.web_msf_save(p); E.free(p);
    const d = ok && fs.read('state/save.msf'); return d ? new Uint8Array(d) : null;
  }
  function diskFiles(all) {
    const out = [];
    drives.forEach((d, i) => { if (!d) return; const data = driveData(i); if (data && (all || driveChanged(i, data))) out.push({ name: d.name.replace(/[\\/:*?"<>|]/g, '_'), data }); });
    return out;
  }
  async function saveMenu(what) {
    if (!E) return;
    if (what === 'msf') { const d = stateBytes(); if (!d) { toast('Cannot save the state', true); return; } downloadBytes('BK_' + stamp() + '.msf', d); toast('State saved'); return; }
    const files = diskFiles(what === 'all');
    if (what === 'disks' && !files.length) { toast(drives.some(Boolean) ? 'No disk image was changed' : 'No disk mounted', true); return; }
    if (what === 'all') { const d = stateBytes(); if (!d) { toast('Cannot save the state', true); return; } files.unshift({ name: 'BK_' + stamp() + '.msf', data: d }); }
    downloadBytes('BK_' + (what === 'all' ? 'state' : 'disks') + '_' + stamp() + '.zip', await UnrealZip.create(files));
    toast('Saved: ' + files.map((f) => f.name).join(', '));
  }
  function bindLoadSave() {
    $('loadbtn').onclick = (e) => { e.stopPropagation(); const v = !$('loadpop').classList.contains('open'); if (v) buildLoadMenu(); menuShow('loadpop', v); };
    $('savebtn').onclick = (e) => { e.stopPropagation(); menuShow('savepop', !$('savepop').classList.contains('open')); };
    $('svmsf').onclick = () => saveMenu('msf'); $('svdisks').onclick = () => saveMenu('disks'); $('svall').onclick = () => saveMenu('all');
    $('loadfile').onchange = async (e) => { const l = [...e.target.files]; e.target.value = ''; await dropFiles(l); };
    document.addEventListener('click', () => { if (document.querySelector('#loadpop.open, #savepop.open')) { menuShow('', false); restoreFocus(); } });
    loadServerList();
  }
  let fc = null, dbg = null, mmap = null, gfx = null;
  function toolsMenu(v) { $('toolspop').classList.toggle('open', v); $('toolsbtn').classList.toggle('open', v); }
  function downloadBytes(name, data) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: 'application/octet-stream' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function bindTools() {
    fc = BKFC.create({ E: () => E, fs, floatWin, load, store, download: downloadBytes, zip: (files) => UnrealZip.create(files),
      sets: () => SETS, loadSet, openZip: zipSet, ramFiles, run: runFile, modelName: () => MODELS[model].name, onClose: () => canvas.focus(), preview: statePreview,
      isImage: (n) => isImage(n) || isTape(n), mount: (n, d, ask) => isTape(n) ? playTape(n, d, ask) : mountImage(n, d, ask),
      drives: () => drives.map((d, i) => d && { i, name: d.name, hdd: i >= 4, boot: d.boot, label: DRV_NAMES[i] + ' ' + d.name }).filter(Boolean), driveData, eject: ejectDrive, boot: bootDrive });
    $('tapest').onclick = () => { stopTape(); toast('Tape stopped'); };
    $('savestbtn').onclick = () => { toolsMenu(false); saveState(); };
    // debugger, memory map, Graph Search (dbg.js)
    const dapi = { E: () => E, floatWin, load, store, onClose: () => canvas.focus(), resume: () => { if (userPaused) setUserPaused(false); } };
    dbg = BKDbg.createDebugger(dapi); mmap = BKDbg.createMemMap(dapi); gfx = BKDbg.createGfx(dapi);
    $('dbgbtn').onclick = () => { toolsMenu(false); dbg.show(!dbg.open); };
    $('mmbtn').onclick = () => { toolsMenu(false); mmap.show(!mmap.open); };
    $('gfxbtn').onclick = () => { toolsMenu(false); gfx.show(!gfx.open); };
    $('fcbtn').onclick = () => { toolsMenu(false); fc.show(!fc.open); };
    $('fctb').onclick = () => fc.show(!fc.open);
    // F1: File Commander on / off (F1 is no BK key; the browser's own help is not opened)
    document.addEventListener('keydown', (e) => { if (e.key === 'F1' && !e.repeat) { e.preventDefault(); if (E && !switching) fc.show(!fc.open); } });
    $('toolsbtn').onclick = (e) => { e.stopPropagation(); toolsMenu(!$('toolspop').classList.contains('open')); };
    document.addEventListener('click', () => { if ($('toolspop').classList.contains('open')) { toolsMenu(false); restoreFocus(); } });
    for (const id of ['stage', 'vkbd']) $(id).addEventListener('contextmenu', (e) => e.preventDefault());
    const sw = $('screenwrap');
    sw.addEventListener('dragover', (e) => { e.preventDefault(); });
    sw.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files.length) dropFiles([...e.dataTransfer.files]); });
  }

  // switch the model: its ROMs are fetched first; on an error the current machine keeps running
  let switching = false;
  async function setModel(m, force) {
    if (switching || !MODELS[m]) return; // force: the same model is made again (an HDD is taken when the machine is made)
    switching = true;
    try {
      const errs = await romFiles(m);
      if (errs.length) { toast('Cannot load: ' + errs.join(', '), true); return; }
      releaseKeys();
      if (E.web_init(MODELS[m].cfg) < 0) { toast('Cannot start ' + MODELS[m].name, true); E.web_init(MODELS[model].cfg); return; }
      model = m; store('model', m);
      lastVideo = -1;
      if (dbg) dbg.syncBps();
      modelUI();
      toast(MODELS[m].name);
    } finally { switching = false; modelSelUI(); }
  }
  function modelUI() {
    const M = MODELS[model];
    $('model').textContent = M.name;
    $('modelsel').value = model;
    modelSelUI();
    speedUI();
    disksUI();
  }
  function modelSelUI() {
    const m = $('modelsel').value;
    $('modelapply').disabled = switching || m === model;
    $('modelnote').textContent = MODELS[m] ? MODELS[m].note : '';
  }
  function bindModels() {
    const sel = $('modelsel');
    for (const [k, v] of Object.entries(MODELS)) { const o = document.createElement('option'); o.value = k; o.textContent = v.name; sel.appendChild(o); }
    sel.value = model;
    sel.onchange = modelSelUI;
    $('modelapply').onclick = async () => { await setModel(sel.value); showOptions(false); }; // the machine starts: Options closes
  }

  // ------------------------------------------------------------------ CPU clock: base frequency (3 MHz BK-0010, 4 MHz BK-0011) × step
  const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3, 5, 10];
  let speedIdx = SPEEDS.indexOf(1);
  const mhzText = (hz) => (hz / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' MHz';
  function setSpeed(idx, save) {
    speedIdx = Math.max(0, Math.min(SPEEDS.length - 1, idx));
    if (E) E.web_set_speed(Math.round(SPEEDS[speedIdx] * 1000));
    if (save) store('speed', String(SPEEDS[speedIdx]));
    speedUI();
  }
  function speedUI() {
    $('speedrange').value = speedIdx;
    $('speedticks').querySelectorAll('span').forEach((t, i) => t.classList.toggle('on', i === speedIdx));
    if (!E) return;
    const base = E.web_base_freq();
    $('speedbase').textContent = mhzText(base) + ' × step';
    $('speedmhz').textContent = mhzText(base * SPEEDS[speedIdx]);
    $('mhz').textContent = $('speedmhz').textContent; // the clock; max speed shows in fps
  }
  function bindSpeed() {
    const ticks = $('speedticks');
    SPEEDS.forEach((x, i) => { const t = document.createElement('span'); t.textContent = x + 'x'; t.onclick = () => setSpeed(i, true); ticks.appendChild(t); });
    $('speedrange').oninput = () => setSpeed(+$('speedrange').value, true);
  }

  // options kept in the browser
  function applyPrefs() {
    const sp = parseFloat(load('speed'));
    if (SPEEDS.includes(sp)) speedIdx = SPEEDS.indexOf(sp);
    E.web_set_speed(Math.round(SPEEDS[speedIdx] * 1000));
    const a = load('adapt'), k = load('bkkbd');
    setMonitor(load('mon') || 'green', false); // green phosphor monitor by default
    E.web_set_adapt(a === null || a === '1' ? 1 : 0); // monochrome: grey levels by default
    if (k !== null) E.web_set_bk_keyboard(k === '1');
    $('adaptmode').checked = !!E.web_get_adapt();
    $('bkkbd').checked = !!E.web_get_bk_keyboard();
    try { const st = JSON.parse(load('snddev')); if (st) for (let i = 0; i <= 6; i++) if (i in st) E.web_snd_set(i, st[i] ? 1 : 0); } catch (e) {}
    E.web_snd_gain(0, volLevel(0)); E.web_snd_gain(1, volLevel(1));
    E.web_set_fdd_io(fddIO ? 1 : 0);
    sndUI();
  }
  // sound options (Options → Sound); the device switches live in the core (g_Config, as the menu of the original)
  function sndUI() {
    document.querySelectorAll('#options [data-snd]').forEach((c) => {
      const i = +c.dataset.snd;
      c.checked = c.hasAttribute('data-filter') ? !!(E.web_snd_get(3) && E.web_snd_get(4) && E.web_snd_get(5)) : !!E.web_snd_get(i);
    });
    for (const [id, k] of [['volspk', 0], ['vol', 1]]) { const v = volLevel(k); $(id).value = v; $(id + 'out').textContent = v + '%'; }
  }
  function bindSound() {
    document.querySelectorAll('#options [data-snd]').forEach((c) => {
      c.onchange = () => {
        if (c.hasAttribute('data-filter')) for (const i of [3, 4, 5]) E.web_snd_set(i, c.checked ? 1 : 0);
        else E.web_snd_set(+c.dataset.snd, c.checked ? 1 : 0);
        const st = {}; for (let i = 0; i <= 6; i++) st[i] = E.web_snd_get(i);
        store('snddev', JSON.stringify(st));
        sndUI();
      };
    });
    for (const [id, k] of [['volspk', 0], ['vol', 1]]) $(id).oninput = () => {
      store(VOL_KEY[k], $(id).value); $(id + 'out').textContent = $(id).value + '%';
      E.web_snd_gain(k, +$(id).value);
    };
    if (IOS) {
      $('iosmixcard').hidden = false;
      $('iosmix').checked = iosMix();
      $('iosmix').onchange = () => {
        store('iosmix', $('iosmix').checked ? '1' : '0');
        setAudioSession();
        // the session type is taken when the sound starts: restart it (this tap is a user gesture, so it may start again)
        if (audio) { killAudio(); if (!muted) startAudio(); }
      };
    }
    $('snd').onclick = toggleSound;
    $('sndhint').onclick = (e) => { e.stopPropagation(); unlockAudio(); $('sndhint').hidden = true; canvas.focus(); };
    // browsers allow sound only after a user gesture: the first one starts (or resumes) it
    for (const ev of ['pointerdown', 'touchend', 'mousedown', 'keydown', 'click']) document.addEventListener(ev, unlockAudio, true);
    updateSoundBtn();
  }
  function bindPrefs() {
    $('monsel').onchange = () => { setMonitor($('monsel').value, true); redraw(); };
    $('fxsel').onchange = () => { store('fx', $('fxsel').value); setFx($('fxsel').value); };
    setFx(fxMode);
    $('adaptmode').onchange = () => { E.web_set_adapt($('adaptmode').checked ? 1 : 0); store('adapt', $('adaptmode').checked ? '1' : '0'); redraw(); };
    $('numjoy').checked = numJoy;
    $('numjoy').onchange = () => { numJoy = $('numjoy').checked; store('numjoy', numJoy ? '1' : '0'); };
    $('bkkbd').onchange = () => { E.web_set_bk_keyboard($('bkkbd').checked ? 1 : 0); store('bkkbd', $('bkkbd').checked ? '1' : '0'); };
  }
  // monitor: colour TV, black & white, green phosphor (the monochrome picture in the phosphor's colour)
  const MONO_TINT = { bw: 0xffffff, green: 0x33ff33 };
  function setMonitor(v, save) {
    if (!['color', 'bw', 'green'].includes(v)) v = 'color';
    E.web_set_color(v === 'color' ? 1 : 0);
    if (v !== 'color') E.web_set_mono_tint(MONO_TINT[v]);
    $('monsel').value = v;
    if (save) store('mon', v);
  }
  // screen filters
  let fxMode = load('fx') || 'sharp';
  function setFx(v) {
    fxMode = ['sharp', 'smooth', 'scan', 'crt'].includes(v) ? v : 'sharp';
    const w = $('screenwrap');
    ['smooth', 'scan', 'crt'].forEach((m) => w.classList.toggle('fx-' + m, m === fxMode));
    $('fxsel').value = fxMode;
    placeFx();
  }
  function placeFx() {
    const fx = $('fx');
    fx.style.width = canvas.style.width; fx.style.height = canvas.style.height;
    const ch = parseFloat(canvas.style.height) || 0;
    const period = canvas.height ? ch / canvas.height : 3; // one BK line
    fx.style.setProperty('--sl', period + 'px');
    // thin lines on small screens turn into moire: make them lighter
    const strong = fxMode === 'crt' ? 0.3 : 0.38;
    fx.style.setProperty('--so', String(period >= 2.5 ? strong : period >= 1.8 ? strong * 0.5 : 0));
  }
  // while stopped the picture is redrawn from the video memory (new colours at once)
  function redraw() { if (E && isPaused()) { E.web_redraw(); blit(); } }

  // ------------------------------------------------------------------ screen
  // The BK picture is 512 x 256 and fills a 4:3 TV screen: the canvas is shown 1.5 times taller than wide pixels
  const ASPECT_Y = 1.5;
  let imageData = null;
  function blit() { // copy the wasm frame buffer to the canvas
    const w = E.web_fb_w(), h = E.web_fb_h();
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; imageData = null; applyScale(); }
    if (!imageData) imageData = new ImageData(w, h);
    imageData.data.set(new Uint8ClampedArray(E.memory.buffer, E.web_fb(), w * h * 4));
    ctx2d.putImageData(imageData, 0, 0);
  }
  // the selected size is the upper limit: a smaller window fits the picture
  function applyScale() {
    const v = $('scale').value;
    const w = canvas.width, h = canvas.height * ASPECT_Y;
    const reserved = $('toolbar').offsetHeight + 8 + 24 + $('screenwin').querySelector('.scrhead').offsetHeight + 2; // gap + padding, title bar + border
    const vw = -2 + Math.max(324, Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth, (window.visualViewport && window.visualViewport.width) || 1e9));
    const vh = Math.min(window.innerHeight, (window.visualViewport && window.visualViewport.height) || 1e9);
    // the on-screen keyboard under the screen: the BK one is as wide as the screen (its height follows the width)
    const vk = $('vkbd'); let kbdH = 0, kbdR = 0;
    if (!vk.hidden && vk.offsetParent) { if (vkbd && vkbd.tab === 'bk') { kbdR = BK_KBD_RATIO; kbdH = 10; } else kbdH = vk.offsetHeight; }
    const fit = Math.max(0.25, Math.min((vw - 16) / w, (vh - reserved - kbdH) / (h + w * kbdR)));
    const k = v === 'fit' ? fit : Math.min(parseFloat(v), fit);
    const cw = Math.floor(w * k), ch = Math.floor(h * k);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    // sharp pixels only where both axes scale by a whole number (2x: 1024 x 768)
    const ky = ch / canvas.height, kx = cw / canvas.width;
    canvas.classList.toggle('smooth', Math.abs(kx - Math.round(kx)) > 0.01 || Math.abs(ky - Math.round(ky)) > 0.01);
    $('stage').style.width = (cw + 2) + 'px';
    // vertical place: centred as if the BK keyboard were open, so opening / closing a keyboard does not move the screen
    const kbdRes = Math.max(Math.round(cw * BK_KBD_RATIO) + 11, vk.hidden ? 0 : vk.offsetHeight);
    const top = Math.max(12, Math.floor((vh - (reserved - 24 + ch + kbdRes)) / 2));
    $('stage').style.paddingTop = top + 'px';
    placeFx();
  }

  // ------------------------------------------------------------------ on-screen keyboards (vkbd.js): BK, XT, joystick
  const BK_KBD_RATIO = 632 / 1600; // the BK keyboard's height / width
  let vkbd = null;
  const pcKey = (code, d) => { const k = VK[code]; if (k) E.web_key(k[0], k[1] || 0, d, 2); }; // locks 2: ЗАГЛ / СТР as they are
  // on-screen keys for the page's windows: while File Commander, the viewer, Debugger, Memory map or Graph Search is the
  // active window, the XT and BK keyboards control it (arrows, Tab, Enter, Esc, letters…); F keys always go to the page
  const KEYWINS = ['fcwin', 'fvwin', 'dbgwin', 'gfxwin', 'mmwin'];
  const synthDown = new Set();
  const keyWin = () => (!$('fcdlg').hidden ? $('fcdlg') : null) || (actWin && actWin !== scrWin && !actWin.hidden && KEYWINS.includes(actWin.id) && !(vkbd && vkbd.tab === 'joy') ? actWin : null); // an open question first
  const PC_KEYS = { Escape: 'Escape', Enter: 'Enter', NumpadEnter: 'Enter', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete', Insert: 'Insert',
    Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight', Space: ' ', Minus: '-', Equal: '+' };
  const BK_KEYS = { 0o12: 'Enter', 0o11: 'Tab', 0o10: 'ArrowLeft', 0o31: 'ArrowRight', 0o32: 'ArrowUp', 0o33: 'ArrowDown', 0o40: ' ', 0o30: 'Backspace', 3: 'Escape', 0o55: '-' };
  function synthKey(code) {
    if (/^F\d+$/.test(code) || PC_KEYS[code]) return PC_KEYS[code] || code;
    let m = /^Key([A-Z])$/.exec(code); if (m) return m[1].toLowerCase();
    m = /^Digit(\d)$/.exec(code); if (m) return m[1];
    if (code === 'BK:-6') return 'Escape'; // СТОП
    m = /^BK:(\d+)$/.exec(code); if (!m) return null;
    const n = +m[1] & 0xFF;
    if (BK_KEYS[n]) return BK_KEYS[n];
    if (n >= 0o101 && n <= 0o132) return String.fromCharCode(n).toLowerCase();
    if (n >= 0o60 && n <= 0o71) return String.fromCharCode(n);
    return null;
  }
  function synth(type, key, code) {
    const w = keyWin();
    const t = w ? (w.contains(document.activeElement) ? document.activeElement : w) : (document.activeElement || document.body);
    t.dispatchEvent(new KeyboardEvent(type, { key, code: /^BK:/.test(code) ? '' : code, bubbles: true, cancelable: true }));
  }
  function bindVKbd() {
    const panel = $('vkbd');
    const press = (code) => {
      if (!E || switching) return;
      const k = synthKey(code);
      if (k && (keyWin() || /^F\d+$/.test(code))) { synthDown.add(code); synth('keydown', k, code); return; } // File Commander, Debugger…: their keys
      if (isPaused()) return;
      activateWin(scrWin);
      if (code.startsWith('BK:')) E.web_bk_key(+code.slice(3), 1);
      else if (code.startsWith('JP:')) joyPort(+code.slice(3), 1);
      else if (code === 'CapsLock') E.web_bk_key(E.web_kbd_state() & 8 ? -5 : -4, 1); // ЗАГЛ <-> СТР
      else pcKey(code, 1);
      kbdStatus();
    };
    const release = (code) => {
      if (synthDown.delete(code)) { const k = synthKey(code); if (k) synth('keyup', k, code); return; }
      if (!E) return;
      if (code.startsWith('BK:')) E.web_bk_key(+code.slice(3), 0);
      else if (code.startsWith('JP:')) joyPort(+code.slice(3), 0);
      else if (code !== 'CapsLock') pcKey(code, 0);
      kbdStatus();
    };
    const sticky = ['0', '1', '2'].includes(load('sticky')) ? +load('sticky') : 1;
    $('sticky').value = String(sticky);
    $('sticky').onchange = () => { store('sticky', $('sticky').value); vkbd.setSticky(+$('sticky').value); $('sticky').blur(); };
    vkbd = BKVKbd.create(panel, { press, release, tab: load('vktab'), sticky,
      onTab: (t) => { store('vktab', t); $('kbdtype').value = t; },
      overlayHost: $('screenwrap'), onLayout: () => applyScale(),
      joyOpts: (() => { try { return JSON.parse(load('vkjoyopt') || '{}'); } catch (e) { return {}; } })(), onJoyOpts: (o) => store('vkjoyopt', JSON.stringify(o)) });
    $('kbdtype').value = vkbd.tab;
    $('kbdtype').onchange = () => { vkbd.show($('kbdtype').value); $('kbdtype').blur(); applyScale(); };
    const showKbd = (v) => {
      panel.hidden = !v; $('kbdtype').hidden = !v; $('kbdbtn').classList.toggle('on', v);
      $('kbdbtn').title = v ? 'Hide the on-screen keyboard' : 'On-screen keyboard';
      vkbd.visible(v);
      store('vkbd', v ? '1' : '0');
      applyScale();
    };
    $('kbdbtn').onclick = () => { showKbd(panel.hidden); canvas.focus(); };
    const saved = load('vkbd');
    showKbd(saved === null ? matchMedia('(pointer: coarse)').matches : saved === '1');
  }

  // ------------------------------------------------------------------ keyboard
  // KeyboardEvent.code -> [Windows virtual key, extended]; the BK keyboard logic is the original one (web_keyboard.cpp)
  const MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const VK = {
    Backspace: [0x08], Tab: [0x09], Enter: [0x0D], NumpadEnter: [0x0D], ShiftLeft: [0x10], ShiftRight: [0x10],
    ControlLeft: [0x11, 0], ControlRight: [0x11, 1], Pause: [0x13], CapsLock: [0x14], Escape: [0x1B], Space: [0x20],
    PageUp: [0x21, 1], PageDown: [0x22, 1], End: [0x23, 1], Home: [0x24, 1],
    ArrowLeft: [0x25, 1], ArrowUp: [0x26, 1], ArrowRight: [0x27, 1], ArrowDown: [0x28, 1], Insert: [0x2D, 1], Delete: [0x2E, 1],
    NumpadDivide: [0x6F], Semicolon: [0xBA], Equal: [0xBB], Comma: [0xBC], Minus: [0xBD], Period: [0xBE], Slash: [0xBF],
    Backquote: [0xC0], BracketLeft: [0xDB], Backslash: [0xDC], BracketRight: [0xDD], Quote: [0xDE],
  };
  for (let i = 0; i < 26; i++) VK['Key' + String.fromCharCode(65 + i)] = [65 + i];
  for (let i = 0; i < 10; i++) { VK['Digit' + i] = [48 + i]; VK['Numpad' + i] = [0x60 + i]; }
  if (MAC) { VK.AltLeft = [0x11, 0]; VK.AltRight = [0x11, 1]; } // no right Ctrl on Mac / iPad keyboards: Option = АР2 / СУ
  const down = new Map(); // code -> vk sent
  const caps = (e) => (e.getModifierState && e.getModifierState('CapsLock')) ? 1 : 0;
  // joystick on port 177714: bits of the on-screen JOY (PORT) and of the PC NumPad (Num Lock off), as EmulateJoystickDown
  let joyBits = 0;
  function joyPort(bit, d) { joyBits = d ? joyBits | bit : joyBits & ~bit; if (E) E.web_joy(joyBits); }
  const NUMJOY = { Numpad8: 1, Numpad6: 2, Numpad2: 4, Numpad4: 8, Numpad5: 0o20, Numpad7: 0o40, Numpad9: 0o100, Numpad1: 0o200, Numpad3: 0o400 };
  let numJoy = load('numjoy') !== '0';
  function keyEvent(e, isDown) {
    if (!E || switching) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || (t.closest && t.closest('.usel')))) return;
    if (e.metaKey && !/^Meta/.test(e.code)) return; // Cmd shortcuts belong to the browser
    if (actWin !== scrWin) return; // keys go to the BK only while its window is the active one (File Commander has its own)
    if (numJoy && e.code in NUMJOY && !(e.getModifierState && e.getModifierState('NumLock'))) {
      e.preventDefault();
      if (!isDown || !isPaused()) joyPort(NUMJOY[e.code], isDown ? 1 : 0);
      return;
    }
    const k = VK[e.code];
    if (!k) return;
    e.preventDefault();
    if (isDown) {
      if (isPaused()) return;
      down.set(e.code, k);
      E.web_key(k[0], k[1] || 0, 1, caps(e));
    } else if (down.has(e.code)) {
      down.delete(e.code);
      E.web_key(k[0], k[1] || 0, 0, caps(e));
    }
  }
  function releaseKeys() { down.clear(); if (vkbd) vkbd.releaseAll(); joyBits = 0; if (E) { E.web_keys_clear(); E.web_joy(0); } }
  function kbdStatus() {
    const s = E.web_kbd_state(), out = [];
    if (s & 1) out.push('РУС');
    if (!(s & 8)) out.push('СТР');
    if (s & 2) out.push('АР2');
    if (s & 4) out.push('СУ');
    const t = out.join(' ');
    if ($('kbdst').textContent !== t) $('kbdst').textContent = t;
    if (vkbd) vkbd.setState(s);
  }
  function bindKeys() {
    document.addEventListener('keydown', (e) => keyEvent(e, true));
    document.addEventListener('keyup', (e) => keyEvent(e, false));
    window.addEventListener('blur', releaseKeys);
  }

  // ------------------------------------------------------------------ audio (as in the Unreal Speccy web port)
  const RATE = 44100; // the core's sound rate (BUFFER_FREQUENCY)
  const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let audio = null;
  const workletSrc = `
    class Ring extends AudioWorkletProcessor {
      constructor() {
        super();
        this.buf = new Float32Array(${RATE} * 2); this.rd = 0; this.wr = 0; this.fill = 0; this.n = 0;
        this.port.onmessage = (e) => {
          const d = e.data;
          if (d === 'flush') { this.rd = this.wr = this.fill = 0; return; }
          const cap = this.buf.length / 2;
          for (let i = 0; i < d.length; i += 2) {
            if (this.fill >= cap) { this.rd = (this.rd + 2) % this.buf.length; this.fill--; }
            this.buf[this.wr] = d[i]; this.buf[this.wr + 1] = d[i + 1];
            this.wr = (this.wr + 2) % this.buf.length; this.fill++;
          }
        };
      }
      process(inputs, outputs) {
        const out = outputs[0]; const L = out[0], R = out[1] || out[0];
        for (let i = 0; i < L.length; i++) {
          if (this.fill > 0) { L[i] = this.buf[this.rd]; R[i] = this.buf[this.rd + 1]; this.rd = (this.rd + 2) % this.buf.length; this.fill--; }
          else { L[i] = 0; R[i] = 0; }
        }
        if ((++this.n & 3) === 0) this.port.postMessage({ fill: this.fill });
        return true;
      }
    }
    registerProcessor('bk-ring', Ring);`;

  let audioStarting = false, pendingCtx = null;
  // iOS audio session: 'playback' = the emulator is the main sound (plays with the silent switch on, other apps' sound
  // stops when it starts); 'ambient' = mixes with other apps (music keeps playing), the silent switch mutes it
  const iosMix = () => load('iosmix') !== '0'; // on by default
  function setAudioSession() { try { if (navigator.audioSession) navigator.audioSession.type = iosMix() ? 'ambient' : 'playback'; } catch (e) {} }
  async function startAudio() {
    if (audio || audioStarting || !(window.AudioContext || window.webkitAudioContext)) return;
    audioStarting = true;
    let ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: RATE, latencyHint: 'interactive' }); }
    catch (err) { log('audio: ' + err); audioStarting = false; return; }
    pendingCtx = ctx;
    // iOS Safari: the context starts only if resume() is called inside the user gesture, i.e. before the first await
    try { if (!isPaused()) ctx.resume().catch(() => {}); } catch (e) {}
    setAudioSession(); // iOS 17+: playback (plays in silent mode, stops other apps) or ambient (mixes with other apps)
    const gain = ctx.createGain(); gain.gain.value = muted ? 0 : volume();
    gain.connect(ctx.destination);
    // analyser before the volume (the oscilloscope also works with the sound muted)
    const an = ctx.createAnalyser(); an.fftSize = 2048; an.connect(gain);
    const a = { ctx, gain, an, node: null, fill: 0, reportAt: performance.now(), push: null, flush: null };
    if (ctx.audioWorklet) {
      const urls = [];
      try { urls.push(URL.createObjectURL(new Blob([workletSrc], { type: 'application/javascript' }))); } catch (e) {}
      urls.push('data:application/javascript;base64,' + btoa(workletSrc));
      for (const url of urls) {
        try {
          await ctx.audioWorklet.addModule(url);
          const node = new AudioWorkletNode(ctx, 'bk-ring', { outputChannelCount: [2] });
          node.connect(an);
          node.port.onmessage = (e) => { a.fill = e.data.fill; a.reportAt = performance.now(); };
          a.node = node;
          a.push = (f) => node.port.postMessage(f, [f.buffer]);
          a.flush = () => { node.port.postMessage('flush'); a.fill = 0; };
          break;
        } catch (e) { /* try next */ }
      }
    }
    if (!a.node) { // ScriptProcessorNode fallback
      const cap = RATE; const ring = new Float32Array(cap * 2); let rd = 0, wr = 0;
      const sp = ctx.createScriptProcessor(1024, 0, 2);
      sp.onaudioprocess = (e) => {
        const L = e.outputBuffer.getChannelData(0), R = e.outputBuffer.getChannelData(1);
        for (let i = 0; i < L.length; i++) {
          if (a.fill > 0) { L[i] = ring[rd]; R[i] = ring[rd + 1]; rd = (rd + 2) % ring.length; a.fill--; }
          else { L[i] = R[i] = 0; }
        }
        a.reportAt = performance.now();
      };
      a.push = (f) => {
        for (let i = 0; i < f.length; i += 2) {
          if (a.fill >= cap) { rd = (rd + 2) % ring.length; a.fill--; }
          ring[wr] = f[i]; ring[wr + 1] = f[i + 1]; wr = (wr + 2) % ring.length; a.fill++;
        }
        a.reportAt = performance.now();
      };
      a.flush = () => { rd = wr = 0; a.fill = 0; };
      a.sp = true;
      sp.connect(an);
      a.node = sp;
    }
    if (pendingCtx !== ctx) { try { ctx.close().catch(() => {}); } catch (e) {} return; } // dropped while it was setting up
    audio = a;
    try { if (ctx.state !== 'running' && !isPaused()) await ctx.resume(); } catch (e) {}
    updateSoundBtn();
  }
  // iOS: a context that went through an app switch comes back broken (no sound, the audio-clocked loop slows down),
  // so on iOS it is closed when the page is hidden; the next touch makes a new one ("Tap for sound" until then)
  function killAudio() {
    const a = audio, c = pendingCtx;
    audio = null; pendingCtx = null; audioStarting = false;
    if (a && a.node) try { a.node.disconnect(); } catch (e) {}
    for (const x of new Set([a && a.ctx, c])) if (x) try { x.close().catch(() => {}); } catch (e) {}
    sentSinceReport = 0; lastReportSeen = 0;
  }
  let muted = load('muted') === '1';
  // volume levels are applied in the core: 0 = speaker (beeper), 5% by default; 1 = AY and Covox, 60% by default
  const VOL_KEY = ['vol.spk', 'vol.ay'], VOL_DEF = [5, 60];
  const volLevel = (k) => { const v = parseInt(load(VOL_KEY[k]), 10); return isFinite(v) ? Math.max(0, Math.min(100, v)) : VOL_DEF[k]; };
  const volume = () => 1;
  // a suspended context (iOS, autoplay rules) is resumed by the next touch / click / key
  function unlockAudio() {
    if (!E || muted) return;
    const c = audio ? audio.ctx : pendingCtx; // the context may still be setting up its worklet
    if (!c) { startAudio(); return; }
    if (c.state !== 'running' && !isPaused()) c.resume().catch(() => {});
  }
  function toggleSound() {
    muted = !muted; store('muted', muted ? '1' : '0');
    if (audio) audio.gain.gain.value = muted ? 0 : volume();
    if (!muted) unlockAudio();
    updateSoundBtn();
  }
  function updateSoundBtn() {
    setIcon('snd', muted ? 'i-mute' : 'i-snd');
    $('snd').title = muted ? 'Sound on' : 'Sound off';
  }
  // is the machine making a sound right now (the output is not running)? Then "Tap for sound" is worth showing
  let soundAt = 0;
  function soundCheck(n) {
    const s16 = new Int16Array(E.memory.buffer, E.web_snd(), n * 2);
    let lo = 32767, hi = -32768;
    for (let i = 0; i < s16.length; i += 6) { const v = s16[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    if (hi - lo > 300) soundAt = performance.now();
  }
  function pushAudio(n) {
    if (!audio || !n) return;
    const s16 = new Int16Array(E.memory.buffer, E.web_snd(), n * 2);
    const f = new Float32Array(n * 2);
    for (let i = 0; i < f.length; i++) f[i] = s16[i] / 32768;
    audio.push(f);
  }

  // ------------------------------------------------------------------ oscilloscope (title bar of the BK window, as in the Unreal Speccy web port)
  const VZ_W = 64, VZ_H = 16;
  let vzOn = load('viz') !== '0', vzAlpha = 0, vzQuietT = 0, vzLast = 0, vzTD = null;
  function vzSetup() {
    const c = $('viz'), dpr = Math.max(1, window.devicePixelRatio || 1);
    c.style.width = VZ_W + 'px'; c.style.height = VZ_H + 'px';
    c.width = Math.round(VZ_W * dpr); c.height = Math.round(VZ_H * dpr);
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawViz(now) {
    const c = $('viz');
    if (!vzOn || !audio || !audio.an || isPaused() || turbo) { if (vzAlpha > 0) { vzAlpha = 0; c.style.opacity = 0; } return; }
    if (now - vzLast < 30) return; // ~33 fps
    vzLast = now;
    const an = audio.an, g = c.getContext('2d'), W = VZ_W, H = VZ_H;
    if (!vzTD) vzTD = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(vzTD);
    let mean = 0; for (let i = 0; i < vzTD.length; i++) mean += vzTD[i];
    mean /= vzTD.length;
    let rms = 0, pk = 0;
    for (let i = 0; i < vzTD.length; i++) { const d = vzTD[i] - mean; rms += d * d; pk = Math.max(pk, Math.abs(d)); }
    rms = Math.sqrt(rms / vzTD.length);
    if (rms > 0.002) vzQuietT = now; // 1/6 s of silence: fade out
    const target = now - vzQuietT < 167 ? 1 : 0;
    vzAlpha += (target - vzAlpha) * (target ? 1 : 0.48);
    c.style.opacity = vzAlpha.toFixed(3);
    if (vzAlpha < 0.01) return;
    // trace with a fading trail, started at a rising zero crossing
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, W, H); g.restore();
    let start = 0; for (let i = 1; i < vzTD.length / 2; i++) if (vzTD[i - 1] < mean && vzTD[i] >= mean) { start = i; break; }
    const k = 0.85 / Math.max(pk, 0.05), mid = H / 2, gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, 'rgba(240,160,80,.15)'); gr.addColorStop(.25, 'rgba(240,160,80,.95)'); gr.addColorStop(.75, 'rgba(255,214,140,.95)'); gr.addColorStop(1, 'rgba(255,214,140,.15)');
    g.lineWidth = 1.2; g.lineJoin = 'round'; g.strokeStyle = gr; g.shadowColor = 'rgba(240,160,80,.6)'; g.shadowBlur = 3;
    g.beginPath();
    for (let x = 0; x <= W; x++) {
      const v = (vzTD[(start + Math.floor(x * 512 / W)) % vzTD.length] - mean) * k;
      const y = mid - Math.max(-1, Math.min(1, v)) * (mid - 1.5);
      x ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke(); g.shadowBlur = 0;
  }
  function bindViz() {
    $('vizon').checked = vzOn;
    $('vizon').onchange = () => { vzOn = $('vizon').checked; store('viz', vzOn ? '1' : '0'); };
    vzSetup();
    window.addEventListener('resize', vzSetup);
  }

  // ------------------------------------------------------------------ run state
  let userPaused = false, hiddenPaused = false;
  const isPaused = () => userPaused || hiddenPaused;
  function setIcon(btn, id) { $(btn).querySelector('use').setAttribute('href', '#' + id); }
  function applyRunState() {
    const p = isPaused();
    $('pausemark').classList.toggle('show', p);
    setIcon('pause', userPaused ? 'i-play' : 'i-pause');
    $('pause').title = userPaused ? 'Start' : 'Stop';
    $('pause').classList.toggle('on', userPaused);
    if (audio) {
      if (p) audio.ctx.suspend().catch(() => {});
      else { audio.flush(); audio.ctx.resume().catch(() => {}); }
    }
    if (p) releaseKeys();
    lastT = performance.now(); frameAcc = 0;
  }
  function setUserPaused(v) { userPaused = v; applyRunState(); }
  document.addEventListener('visibilitychange', () => { hiddenPaused = document.hidden; applyRunState(); if (document.hidden && IOS) killAudio(); });
  // Safari: pagehide / pageshow (back-forward cache, app switch) and freeze / resume (Chrome) also mean "not visible"
  window.addEventListener('pagehide', () => { hiddenPaused = true; applyRunState(); if (IOS) killAudio(); });
  window.addEventListener('pageshow', () => { hiddenPaused = document.hidden; applyRunState(); resync(performance.now()); });
  document.addEventListener('freeze', () => { hiddenPaused = true; applyRunState(); });
  document.addEventListener('resume', () => { hiddenPaused = document.hidden; applyRunState(); resync(performance.now()); });

  // ------------------------------------------------------------------ main loop
  // One web_frame() = 20 ms of the BK (CMotherBoard::ExecuteInstructionSet). The sound leads: ~70 ms of it is kept
  // queued and frames are run until the queue is full. Without running sound a 50 Hz clock by elapsed time.
  let tickEnd = performance.now(), lastT = performance.now(), frameAcc = 0, fpsCount = 0, fpsT = performance.now(), lastVideo = -1;
  let sentSinceReport = 0, lastReportSeen = 0, resyncUntil = 0;
  // The page was frozen (iOS app switch, locked screen, background tab) without a visibilitychange:
  // nothing is caught up — the machine continues as if it had been paused.
  function resync(now) {
    lastT = now; frameAcc = 0; resyncUntil = now + 300; fpsCount = 0; fpsT = now;
    if (audio) { audio.flush(); sentSinceReport = 0; lastReportSeen = audio.reportAt; }
  }
  function frameDone(n) {
    if (n && (!audio || audio.ctx.state !== 'running') && !muted) soundCheck(n);
    // only into a running context: a suspended / interrupted one (iOS after sleep, before the next touch) does not
    // take the messages off its port — they would pile up until the page is reloaded
    if (!turbo && audio && audio.ctx.state === 'running') { pushAudio(n); if (!audio.sp) sentSinceReport += n; else lastReportSeen = audio.reportAt; }
  }
  function tick(now) {
    requestAnimationFrame(tick);
    if (!E || switching) { lastT = tickEnd = now; return; }
    // the page was not run for a while (frozen, app switch): only a gap between ticks counts, not a long tick of our own
    if (now - tickEnd > 400) { resync(now); tickEnd = now; return; }
    let dt = now - lastT; lastT = now;
    if (dt > 100) dt = 100;
    let run = 0;
    if (!isPaused()) {
      if (turbo) run = 1000; // max speed: as many frames as fit in ~40 ms, no sound
      else
      // audio-clocked only while the worklet reports in time (stale reports after a freeze would ask for a burst of frames)
      if (audio && audio.ctx.state === 'running' && now >= resyncUntil && now - audio.reportAt < 250) {
        if (audio.reportAt !== lastReportSeen) { lastReportSeen = audio.reportAt; sentSinceReport = 0; }
        const est = audio.sp ? audio.fill : audio.fill + sentSinceReport - (now - audio.reportAt) * RATE / 1000;
        let queued = est * 1000 / RATE;
        while (queued < 70 && run < 6) { run++; queued += 20; }
      } else {
        frameAcc += dt / 20;
        run = Math.min(Math.floor(frameAcc), 6); frameAcc -= Math.floor(frameAcc);
      }
    }
    for (let i = 0; i < run; i++) {
      // a slow device must not dig itself in: at most ~30 ms of emulation per screen refresh
      if (i && performance.now() - now > (turbo ? 40 : 30)) break;
      frameDone(E.web_frame());
      fpsCount++; // emulated frames (50 a second at the normal speed, more at max speed)
    }
    if (run) {
      tapeTick();
      const v = E.web_frame_count();
      if (v !== lastVideo) { lastVideo = v; blit(); }
      kbdStatus();
    }
    drawViz(now);
    if (now - fpsT >= 1000) {
      // started without a click yet: browsers keep the sound off until the first click / key,
      // the hint is shown only while the machine is actually making a sound that cannot be heard
      $('sndhint').hidden = muted || isPaused() || !!(audio && audio.ctx.state === 'running') || now - soundAt > 1500;
      $('fps').textContent = Math.round(fpsCount * 1000 / (now - fpsT)) + ' fps';
      fpsCount = 0; fpsT = now;
    }
    tickEnd = performance.now();
  }

  // ------------------------------------------------------------------ floating windows
  // drag by the title bar (mouse or finger), position remembered; the last clicked / opened window is on top
  const scrWin = $('screenwin');
  const WINS = [scrWin]; let actWin = null;
  function activateWin(w) {
    if (actWin === w) return;
    if (actWin) actWin.classList.remove('wact');
    actWin = w || null; if (!w) return;
    w.classList.add('wact');
    WINS.splice(WINS.indexOf(w), 1); WINS.push(w);
    WINS.forEach((x, k) => { if (x !== scrWin) x.style.zIndex = String(8 + k); });
  }
  // the focus goes back to the active window (the last focused element in it, or the window itself)
  let lastFocus = null;
  document.addEventListener('focusin', (e) => { if (winOf(e.target)) lastFocus = e.target; });
  function restoreFocus() {
    if (!actWin || actWin === scrWin || actWin.hidden) { canvas.focus(); return; }
    if (lastFocus && lastFocus.isConnected && actWin.contains(lastFocus) && lastFocus.offsetParent) lastFocus.focus();
    else if (!actWin.contains(document.activeElement)) { if (!actWin.hasAttribute('tabindex')) actWin.tabIndex = -1; actWin.focus(); }
  }
  const topVisibleWin = () => { for (let k = WINS.length - 1; k >= 0; k--) if (!WINS[k].hidden) return WINS[k]; return null; };
  const winOf = (t) => (t && t.nodeType === 1 ? WINS.find((w) => w.contains(t)) : null) || null;
  // a click inside a window makes it the active one (a click elsewhere keeps the active window)
  document.addEventListener('pointerdown', (e) => { const w = winOf(e.target); if (w && !e.target.closest('#vkbd, #kbdbtn, #kbdtype, .usel[data-for="kbdtype"]')) activateWin(w); }, true); // the on-screen keyboard (and its button) keeps the active window
  const winObs = new MutationObserver((ms) => {
    for (const m of ms) {
      const w = m.target;
      if (!w.hidden) activateWin(w);
      else if (actWin === w) { w.classList.remove('wact'); actWin = null; activateWin(topVisibleWin()); }
    }
  });
  function floatWin(win, key, defPos) {
    WINS.push(win); winObs.observe(win, { attributes: true, attributeFilter: ['hidden'] });
    const head = win.querySelector('.fhead');
    let pos = null;
    try { const p = JSON.parse(load(key)); if (p && isFinite(p.x) && isFinite(p.y)) pos = p; } catch (e) {}
    function place() {
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      let { x, y } = pos || defPos();
      x = Math.max(0, Math.min(x, vw - Math.min(win.offsetWidth, 120)));
      y = Math.max(0, Math.min(y, vh - 32, vh - win.offsetHeight - 4)); // keep the whole window inside if it fits
      win.style.left = x + 'px'; win.style.top = y + 'px';
    }
    let drag = null;
    // moved by the title bar and (touch screens) by the left edge strip
    const edge = document.createElement('div'); edge.className = 'wedge'; win.classList.add('hasedge'); win.appendChild(edge);
    for (const h of [head, edge]) {
      h.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, select, input, label')) return;
        const r = win.getBoundingClientRect();
        drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
        h.setPointerCapture(e.pointerId); e.preventDefault();
      });
      h.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        pos = { x: e.clientX - drag.dx, y: e.clientY - drag.dy }; place();
      });
      const end = () => { if (!drag) return; drag = null; store(key, JSON.stringify(pos)); };
      h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
    }
    edge.addEventListener('dblclick', () => { pos = null; store(key, ''); place(); });
    head.addEventListener('dblclick', (e) => { if (e.target.closest('button, select, input, label')) return; pos = null; store(key, ''); place(); });
    window.addEventListener('resize', () => { if (!win.hidden) place(); });
    // size: own grip at the bottom right corner (CSS resize has no grip on iPad / iPhone and is hard to hit elsewhere)
    if (getComputedStyle(win).resize !== 'none') {
      win.style.resize = 'none';
      try { const z = JSON.parse(load(key + '.size')); if (z && z.w > 0 && z.h > 0) { win.style.width = z.w + 'px'; win.style.height = z.h + 'px'; } } catch (e) {}
      const grip = document.createElement('div'); grip.className = 'wgrip'; grip.title = 'Drag to resize (double click: default size)';
      win.appendChild(grip);
      let rs = null;
      grip.addEventListener('pointerdown', (e) => {
        const r = win.getBoundingClientRect();
        rs = { id: e.pointerId, x: e.clientX, y: e.clientY, w: r.width, h: r.height };
        grip.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation();
      });
      grip.addEventListener('pointermove', (e) => {
        if (!rs || e.pointerId !== rs.id) return;
        const r = win.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
        win.style.width = Math.max(1, Math.min(rs.w + e.clientX - rs.x, vw - r.left)) + 'px';
        win.style.height = Math.max(1, Math.min(rs.h + e.clientY - rs.y, vh - r.top)) + 'px';
      });
      const rsEnd = () => { if (!rs) return; rs = null; const r = win.getBoundingClientRect(); store(key + '.size', JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height) })); };
      grip.addEventListener('pointerup', rsEnd); grip.addEventListener('pointercancel', rsEnd);
      grip.addEventListener('dblclick', () => { win.style.width = win.style.height = ''; store(key + '.size', ''); place(); });
    }
    return { place, setPos(p) { pos = p; store(key, JSON.stringify(pos)); place(); } };
  }
  // position for a window next to the right edge of another one (left edge if no room)
  function snapRight(r, w) {
    const vw = document.documentElement.clientWidth;
    let x = r.right - 1;
    if (x + w.offsetWidth > vw && r.left - w.offsetWidth + 1 >= 0) x = r.left - w.offsetWidth + 1;
    return { x, y: r.top };
  }

  // About: the models and the ROM files each of them loads
  function aboutModels() {
    const t = $('aboutmodels');
    for (const M of Object.values(MODELS)) {
      const tr = document.createElement('tr');
      const a = document.createElement('td'); a.textContent = M.name;
      const b = document.createElement('td'); b.textContent = M.about;
      tr.append(a, b); t.appendChild(tr);
    }
  }

  // ------------------------------------------------------------------ Options, Help
  let optFW = null, mhFW = null;
  const optOpen = () => !$('options').hidden;
  function showPane(id) {
    optPane = id;
    document.querySelectorAll('#options header [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
    document.querySelectorAll('#options .pane').forEach((p) => p.classList.toggle('gone', p.dataset.pane !== id));
    $('options').querySelector('.body').scrollTop = 0;
    if (id === 'about') {
      const v = $('aboutver'); v.textContent = 'v ' + APP_VER + ' by ae485 (';
      const im = new Image(); im.src = IMG_MAIL; im.alt = 'e-mail'; im.className = 'mailimg'; v.append(im, ')');
      v.title = BUILD !== 'dev' ? 'build ' + BUILD : 'dev build';
    }
    if (optOpen()) optFW.place();
    optBtns();
  }
  // all tabs share one height (the tallest settings tab), so the window does not jump; About scrolls inside
  function fixOptHeight() {
    const body = $('options').querySelector('.body');
    if (body.dataset.fixed) return;
    const panes = [...body.querySelectorAll('.pane')].filter((p) => p.dataset.pane !== 'about');
    let h = 0;
    for (const p of panes) { const g = p.classList.contains('gone'); p.classList.remove('gone'); h = Math.max(h, p.offsetHeight); if (g) p.classList.add('gone'); }
    if (h > 50) { body.style.height = (h + 16) + 'px'; body.dataset.fixed = '1'; }
  }
  let optPane = 'sys';
  function optBtns() { const o = optOpen(); $('optbtn').classList.toggle('on', o && optPane !== 'sys'); $('sysbtn').classList.toggle('on', o && optPane === 'sys'); }
  function showOptions(v) {
    const w = $('options');
    if (v) { w.hidden = false; fixOptHeight(); optFW.place(); }
    else { w.hidden = true; canvas.focus(); }
    optBtns();
  }
  function showMainHelp(v) {
    const h = $('mainhelp');
    h.hidden = !v; $('mainhelpbtn').classList.toggle('on', v);
    if (v) { if (optOpen()) mhFW.setPos(snapRight($('options').getBoundingClientRect(), h)); else mhFW.place(); }
    else canvas.focus();
  }
  function bindWindows() {
    optFW = floatWin($('options'), 'optpos', () => {
      const r = $('screenwrap').getBoundingClientRect(), w = $('options').offsetWidth, vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.left + (r.width - w) / 2, vw - w - 4)), y: Math.max(8, r.top + 16) };
    });
    $('optbtn').onclick = () => showOptions(!optOpen());
    // System: Options on its System tab (model, clock)
    $('sysbtn').onclick = () => { if (optOpen() && optPane === 'sys') showOptions(false); else { showPane('sys'); showOptions(true); } };
    $('options').querySelector('[data-close]').onclick = () => showOptions(false);
    document.querySelectorAll('#options header [data-tab]').forEach((b) => { b.onclick = () => showPane(b.dataset.tab); });
    mhFW = floatWin($('mainhelp'), 'mainhelppos', () => {
      const r = $('screenwrap').getBoundingClientRect(), w = $('mainhelp').offsetWidth, vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.right - w - 8, vw - w - 4)), y: Math.max(8, r.top + 8) };
    });
    $('mainhelpbtn').onclick = () => showMainHelp($('mainhelp').hidden);
    $('mainhelpclose').onclick = () => showMainHelp(false);
    showPane('sys');
  }

  // ------------------------------------------------------------------ UI
  // max speed: frames run back to back (~30 ms per screen refresh), the sound is off meanwhile
  let turbo = false;
  function toggleTurbo() {
    turbo = !turbo;
    $('turbo').classList.toggle('on', turbo);
    $('turbo').title = turbo ? 'Max speed: on' : 'Max speed';
    if (!turbo) resync(performance.now());
    speedUI();
  }
  function bindUI() {
    // buttons do not keep the focus: Space / Enter go to the BK, not to the last clicked button
    // toolbar buttons above the screen do not take the focus nor change the active window (File Commander keeps the keys)
    $('toolbar').addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || winOf(b) || b.closest('#toolspop, #toolsbtn')) return;
      if (b.closest('#toolbar')) { setTimeout(restoreFocus, 0); return; }
      canvas.focus();
    });
    $('pause').onclick = () => setUserPaused(!userPaused);
    $('turbo').onclick = toggleTurbo;
    $('reset').onclick = () => { if (E) { releaseKeys(); E.web_reset(0); toast('Reset'); } };
    const sv = load('scale'); if (sv && [...$('scale').options].some((o) => o.value === sv)) $('scale').value = sv;
    $('scale').onchange = () => { store('scale', $('scale').value); applyScale(); };
    window.addEventListener('resize', applyScale);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', applyScale);
    // iOS (home-screen app, back-forward cache): the final viewport size arrives late, without a resize event
    const rescale = () => { applyScale(); setTimeout(applyScale, 150); setTimeout(applyScale, 600); setTimeout(applyScale, 1500); };
    window.addEventListener('pageshow', rescale); window.addEventListener('orientationchange', rescale);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) rescale(); });
    bindModels();
    bindSpeed();
    bindPrefs();
    bindSound();
    bindViz();
    bindDisks();
    aboutModels();
    bindTools();
    bindLoadSave();
    bindWindows();
    bindKeys();
    bindVKbd();
    activateWin(scrWin);
    applyScale();
  }

  // iOS / iPadOS: no pinch zoom (Safari ignores user-scalable=no; its gesture events can be cancelled)
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 && e.scale !== undefined && e.scale !== 1) e.preventDefault(); }, { passive: false });
  // iOS: a finger drag does not pull the page (rubber band) — only real scrolling (lists, help, a page taller than the screen) and sliders move
  function scrollsUnder(t) {
    for (let el = t; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.classList.contains('usel')) return true;
      const cs = getComputedStyle(el);
      if ((/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) || (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1)) return true;
    }
    const d = document.documentElement;
    return d.scrollHeight > window.innerHeight + 1 || d.scrollWidth > window.innerWidth + 1;
  }
  document.addEventListener('touchmove', (e) => { if (e.touches.length === 1 && e.cancelable && !scrollsUnder(e.target)) e.preventDefault(); }, { passive: false });

  // a home-screen app (iOS) keeps its index.html for a long time: look for a newer build on the server; the 'reload' fetch
  // also refreshes the browser's cached copy, so one reload is enough
  async function checkUpdate() {
    if (BUILD === 'dev' || location.protocol === 'file:') return;
    try {
      const r = await fetch(location.pathname, { cache: 'reload' });
      if (!r.ok) return;
      const m = /<meta name="build" content="([^"]+)"/.exec(await r.text());
      if (!m || m[1] === BUILD) return;
      let tries = 0; try { tries = +sessionStorage.getItem('bk.upd') || 0; sessionStorage.setItem('bk.upd', String(tries + 1)); } catch (e) {}
      if (tries >= 2) return; // the server / a proxy keeps the old page: do not loop
      toast('New version — reloading…');
      setTimeout(() => location.reload(), 600);
    } catch (e) {}
  }
  window.BKDebug = { get E() { return E; }, get fc() { return fc; }, runFile, ramFiles, SETS, get dbg() { return dbg; }, mountImage, playTape, openImageFiles, drives, loadState, saveState, runScript, get audio() { return audio; }, cstr: (p) => cstr(p), fs, setModel, get model() { return model; }, get vkbd() { return vkbd; }, get actWin() { return actWin; } }; // for tests and the console

  // ------------------------------------------------------------------ boot
  window.addEventListener('DOMContentLoaded', async () => {
    const m = load('model'); if (m && MODELS[m]) model = m;
    bindUI();
    try {
      try { await start(); }
      catch (err) { // the saved model cannot start (its ROMs are missing): the default one
        if (model === 'BK0010_01' || E) throw err;
        log(err.message); model = 'BK0010_01'; await start(); toast(err.message, true);
      }
      $('loading').remove();
      hiddenPaused = document.hidden;
      applyRunState();
      canvas.focus();
      requestAnimationFrame(tick);
      checkUpdate();
    } catch (err) {
      let msg = 'Startup error: ' + err.message;
      if (location.protocol === 'file:') msg += '<br>Open the page through a web server.';
      $('loading').innerHTML = msg;
      console.error(err);
    }
  });
})();
