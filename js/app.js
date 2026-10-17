// UnrealSpeccy web front-end: canvas, Web Audio, keyboard, disk drives
(function () {
  'use strict';
  const { MemFS, WASI } = window.UnrealWasi;
  const SCAN = window.UnrealScan.codeToScan;

  // Files on the server: index.html in the root, scripts in js/, the emulator (wasm, unreal.ini, boot, CMOS) in unreal/,
  // ROM images in rom/. ROM / boot names must match the ones referenced in unreal.ini.
  const WASM_URL = 'unreal/unreal.wasm?v=20261017214812';
  const MAIL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAKMAAAAeCAYAAABAOK4rAAAHfUlEQVR42u2bfZBWVR3HP6vggoiiEWoOKYqOrkVMqIy0FcOLleguUThjcTDRyOBYTDZ5oGUjgTo2kg6eFMdS4cw2jilokA7m5BRiL7gmFtIwJTWuEiDQriQvCvXH831m7ty5z+7D7rPLKvc788yZ5zz3d8+953zP9/dydiFHjhw5cuTIkSNHjhw5cuTIkSPHexRV+RS8P+FDfAYYD9zsrAkd9fcG9DkGF6kPcCUwCRgDnAEMAlqBLcCzQHTW/C2ndM/iuGOMiNcCm4EngJnAR4DB2pQfAC4H5gGbfYgP+hBPyymSK2OlSVgN3Atcr67ngZ8D64GtwD7gdOB8oB64FvgKMMmH+BlnzZ/fa+/srJmQk7H3EfE44BfA1UALcIOz5umMS1/T5zc+xEbgNuAbwNM+xLHOmk25dh0FMvoQa4GbgE8opvov8CqwGvips2Zb6vrjgesAA4wABgI7pTx3OWueb4csnbL1Ib4EfEwq1gzMBcYBZwKvOWuG69JFIuIfgMnOmu1lqEor8E0f4mbgHuAxH+JIZ83+dp7hRWC+nmEwsB14HFjgrNntQ6wCZgA3ADVAX2AjsMhZ82SJdzxZz/554GJgqH76J/AUsMRZ8+8jSWC6uLE7nHMf4l5gAHCps+aFjHucI28E0D85p30yVORuYFbqHv0UU10KjAauSticpBhsXMrmQ8BUYKoPscFZszjjwTptm8AngQeA/ulY2Id4HvBt4A2gzlmzM/GeN2vDDQN2AI8A3wOagHpnTZWzZpkPcajiyFnAj0s8Q23GMwzVGON9iJcBDwFfTNldDqz2IU511qzMuO+PgK9l9F+sz3Qf4rijoNol57ySCcz3E0RsEvEGAKcClwALtbBJ/ERkehdo0CL0A0YCa4rq5EOckjF+V2yLmAW8DkwGBolE5+q3eVKgGUUiCsuAu4ALgWqNewvwW+DE1P0XAW+KuKUwW2o1Sap4BvAt4JBUcIPUbYm+D9DGbtYaLNEGSWMPcD9wBXCeFv8s4AvAJmAIsOIoeNT25rzrbtqHeBbwHX1d7KxpSFz3tiauOaVs58u9AtzqrEkqx0YfYj2wFpggIq+shG0K+4EJzpp/Zbj/yUCzs2Zton8i8FXZ3ap48lCCLANSLnufD/Fx4EYf4tnpcYSdQK2zZnei704f4iXAl4CLgPnOmkWJ31/wIU5Tdn+OSPrX1NhzM8Z6A1jpQ1wPvAJ83Ic4ylnT3INkzJzzSipjPXCCVGBhmfZXUSicb5fKpWOvw8ACfa2R26yEbRIrSkzKKOA0xW1J3Ki2wVmz1FmzzVmzw1lzHzCnxBgb1Q4v8fsDKSIWsV7t4SwXr1pmUbGHHWG2vB14Tl9H97Ayrqg0EdMx4wi165w1B8q0v0jty+3Y/BF4R+6yBvhHBWyTKBUvfbh4/wySAizPsFkuF358qv+g2hNLjFWqQL6jmKk7a95u55oPlrq3D3G8Ep/LFEtnXTekh8nYLTFqUhlPUbv7COxPTriOUjv4XaAtdX1XbbMWPI1iwbot1T8IOOCseTNjvHek1GkMS7jjUm6rI7fWEaoyiHgH8Ixc/fB2NkO/Hibjju4mY1tqEctBWyL7LVUO6JMgUluFbMvBHrWDU/2tQLUPcXCJ8Yak+qooHB/uB17qwfroGCVVxYRrtN7lBCUMVUoyexv+15lyYpqMxbioVicW5aDonka0YzNabhYF65WwLQctqXCgiBfVXpdhMy1jsm5SCNOUrjN2MyaqfdZZ83VnzZ+cNbuk3kVc0AvJuE/t6SV+H14OS58A7lT8Mk81t46wBrhDA89OB+kqVzQWyeSs+XuFbMtBM/CWMupkQvag6n0LfYgHgUdVWrpa718cv0bJzhyVMRp6eFH7JSoZWcr5OZWHehu2ikPjgF9lrOktHZLRWfO6YpR5QKMP8WwgKFitVp2rDjjTWTNTNlt8iE1SlNulcMuVkV9I4UjtCg3RmIrPOm1bZrZ50If4FHCND3Gis+bX6n/Sh7gCmA4s1SdJ4F0ad1MiWJ9S6qSjG1E8vbjSh9igTbRL8euX21vULoQGcxIbcqCzZm8nbvNLJVuzfYhbtdn3ybvcBowtx00XF/3+hBvboJ25R5PTmBHjzQJ+J2L/QCpyQG6/XtcscNY8WqJ42lnbcrBYZZW7fYinJPpnUDiZ2aJMuYVCEXysYsoWeYrpwEhnzZajoDCrKBThq6TsLVrUV4DvUjieXdMLlXGpQrBqCqd524D/aJ0/DfywrGDSWXMImOlDfJjCMdQYBfStkt/VwM9SNm+p/HC9VO6jwElSuPXAUmfNuhLq1WnbMtXxZR/iMpF+lQ+xzlmzV++5RJ80rukNK+qsOexD/CzgKJwFD1MS9SrwmJ79nt7GRK1pLYUacR2Fc+tW4PfA7RKcuWWVE95v8CH2VXnkU9qx0501GzqwqQHuA5Y5a5rI0SM4Jv7twIc4kMIZ7mR1rVUss05u5ACF8+QxUsY6qdA0Z82qnCY5GStNyCqVaebLdbSHdcBsZ81fcorkZOxOUvYHplD4C5tRUsS+imWeAx5O/mFFjhw5jkH8HzsgzyJO/agJAAAAAElFTkSuQmCC';
  const APP_VER = '0.60.2'; // About, System Info (history: changes.txt)
  const BUILD = '20261017214812'; // set by make_dist.sh: the build of these files (index.html carries the same in <meta name="build">)
  // Only what the current machine needs is downloaded; the rest is fetched on a model switch.
  const COMMON_FILES = ['unreal.ini', 'boot6.$b'];
  const GS_ROM = 'bootgs.rom'; // NeoGS ROM: fetched when General Sound is switched on
  // Folders on the server are lower case (rom/, hdd/, trd/ …): Linux hosts are case-sensitive, Windows does not care.
  // ROM images live in rom/; inside the emulator they sit next to unreal.ini (names as in the ini)
  const ROM_DIR = 'rom/';
  const EMU_DIR = 'unreal/', EMU_FILES = /^(unreal\.ini|boot6\.\$b|cmos|sos\.l)$/i;
  const srcUrl = (f) => /\.rom$/i.test(f) ? ROM_DIR + f : EMU_FILES.test(f) ? EMU_DIR + f : f;

  // ------------------------------------------------------------------ machine models
  // unreal.ini is used as is; a model only overrides a few keys through web_model.ini
  // (read by the emulator before unreal.ini). base = t-states per frame at 1x (3.5 MHz).
  const MODELS = {
    ATM710: { name: 'Turbo 2+ (7.10)', base: 69888, speed: 2.5, xt: true, ini: { MISC: { RESET: 'SYS' } }, files: ['bios_1_07_13.rom'],
      note: '1024 KB · BIOS 1.07.13' },
    // eXtra BIOS 1.32XT (NedoPC): 128K ROM, dual TR-DOS (5.04R + vTR-DOS with a WD1793 emulator), setup utility
    XBIOSXT: { name: 'Turbo 2+ xBIOS 1.32XT', base: 69888, speed: 2.5, xt: true, files: ['xbios132xt.rom'], note: '1024 KB · eXtra BIOS 1.32XT (128K ROM: TR-DOS 5.04R + vTR-DOS 2.4)',
      ini: { MISC: { HIMEM: 'ATM710', RAMSize: '1024', RESET: 'SYS' }, ROM: { ROMSET: '', ATM2: 'xbios132xt.rom' } } },
    // eXtra BIOS 1.36XT: same machine and menus as 1.32XT (start macros, CP/M, ROM disk)
    XBIOS136: { name: 'Turbo 2+ xBIOS 1.36', machine: 'XBIOSXT', base: 69888, speed: 2.5, xt: true, files: ['xbios136.rom'], note: '1024 KB · eXtra BIOS 1.36XT (128K ROM: TR-DOS 5.04R + vTR-DOS)',
      ini: { MISC: { HIMEM: 'ATM710', RAMSize: '1024', RESET: 'SYS' }, ROM: { ROMSET: '', ATM2: 'xbios136.rom' } } },
    // ATM-1: the BIOS times the CPU (copy protection, CP/M key), so the clock stays at 3.5 MHz
    // BIOS 1.04.1R: the CP/M part is plain (1.03 is encrypted with a key from CPU timing, so it ran at 3.5 MHz only);
    // CP/M starts "B:XC /R" (X-Commander from the CP/M drive B: = floppy A:) by itself
    ATM450: { name: 'ATM Turbo 1 (4.50)', base: 69888, speed: 2.5, xt: false, files: ['atm1041r.rom'], note: '512 KB · BIOS 1.04.1R',
      ini: { MISC: { HIMEM: 'ATM450', RAMSize: '512', CMOS: 'none', RESET: 'SYS' }, ROM: { ROMSET: '', ATM1: 'atm1041r.rom' }, ULA: { Preset: 'ATM1_2_3.5MHz' } } },
    EVO: { name: 'ZX-Evolution 4096', sysName: 'ZX Evolution 4096 (BaseConf)', base: 69888, speed: 2.5, xt: true, files: ['zxevo_fe.rom', 'CMOS'], note: '4096 KB · EVO Reset Service FE · CMOS (this session only)',
      ini: { MISC: { HIMEM: 'ATM3', RAMSize: '4096', CMOS: 'DALLAS', RESET: 'SYS' }, ROM: { ROMSET: '', ATM3: 'zxevo_fe.rom' } } },
    PENTAGON: { name: 'Pentagon 128', base: 71680, speed: 2.5, xt: false, files: ['pentagon.rom', 'trd504tm.rom'], note: '128 KB · 128K ROM + TR-DOS',
      ini: { MISC: { HIMEM: 'PENTAGON', RAMSize: '128', CMOS: 'none' }, ROM: { ROMSET: 'pentagon' }, 'ROM.pentagon': { 128: 'pentagon.rom:0', sos: 'pentagon.rom:1', dos: 'trd504tm.rom', sys: 'trd504tm.rom' }, ULA: { Preset: 'PENTAGON' } } },
    // other Spectrum clones of UnrealSpeccy: one 64K ROM each (KAY: as a ROM set, the core has no single-file KAY ROM)
    SCORPION: { name: 'Scorpion ZS 256', base: 69888, speed: 2.5, xt: false, files: ['scorp295.rom'], note: '256 KB · ROM 2.95 (128 / 48 / service / TR-DOS 5.03)',
      ini: { MISC: { HIMEM: 'SCORPION', RAMSize: '256', CMOS: 'none', RESET: 'SYS' }, ROM: { ROMSET: '', SCORP: 'scorp295.rom' }, ULA: { Preset: 'SCORPION' } } },
    PROFI: { name: 'Profi 1024', base: 69888, speed: 2.5, xt: false, files: ['profi.rom'], note: '1024 KB · Profi ROM BIOS (Micco Software)',
      ini: { MISC: { HIMEM: 'PROFI', RAMSize: '1024', CMOS: 'none', RESET: 'SYS' }, ROM: { ROMSET: '', PROFI: 'profi.rom' }, ULA: { Preset: 'PROFI' } } },
    KAY: { name: 'KAY 1024', base: 69888, speed: 2.5, xt: false, files: ['kay1024.rom'], note: '1024 KB · Nemo KAY 1024, JV Kramis 0.3',
      ini: { MISC: { HIMEM: 'KAY', RAMSize: '1024', CMOS: 'none', RESET: 'SYS' }, ROM: { ROMSET: 'kay' }, 'ROM.kay': { 128: 'kay1024.rom:0', sos: 'kay1024.rom:1', dos: 'kay1024.rom:2', sys: 'kay1024.rom:3' }, ULA: { Preset: 'KAY1024' } } },
    PLUS3: { name: 'Spectrum +3', base: 70908, speed: 2.5, xt: false, files: ['plus341.rom'], note: '128 KB · Amstrad +3 ROM 4.1 (+3DOS, µPD765)',
      ini: { MISC: { HIMEM: 'PLUS3', RAMSize: '128', CMOS: 'none', RESET: 'MENU' }, ROM: { ROMSET: '', PLUS3: 'plus341.rom' } } },
    QUORUM: { name: 'Quorum 1024', base: 69888, speed: 2.5, xt: false, files: ['qu7v42.rom'], note: '1024 KB · ROM-MENU Quorum 4.2',
      ini: { MISC: { HIMEM: 'QUORUM', RAMSize: '1024', CMOS: 'none', RESET: 'SYS' }, ROM: { ROMSET: '', QUORUM: 'qu7v42.rom' } } },
  };
  // operating systems on HDD: an xBIOS XT machine that boots HDD 0 (setup → Boot → IDE hard drive master) in ATM mode
  const OS_MODELS = {
    TASIS: { name: 'TASiS v5.40', hdd: 'hdd/tasis540.zip', note: 'iS-DOS TASiS v5.40 · starts on Turbo 2+ xBIOS 1.32XT' },
    CHIC: { name: 'iS-DOS Chic v5.01', hdd: 'hdd/isdos501.zip', note: 'iS-DOS Chic v5.01 · starts on Turbo 2+ xBIOS 1.32XT' },
    // NedoOS on the SD card of ZX-Evolution: EVO Reset Service, 5 = SDcard boot (sd_boot.$C)
    NEDOOS: { name: 'NedoOS', machine: 'EVO', sd: 'sd/nedoos.zip', note: 'NedoOS v0.2188.1 · starts on ZX-Evolution from SD (~30 MB, browser caches once)',
      link: 'https://github.com/alfishe/NedoOS' },
  };
  for (const [k, v] of Object.entries(OS_MODELS)) MODELS[k] = Object.assign({}, MODELS[v.machine || 'XBIOSXT'], v, { machine: v.machine || 'XBIOSXT' });
  // ------------------------------------------------------------------ Custom ROM (Options / System)
  // The user picks the machine and what goes where; the page only turns that into web_model.ini.
  // Machine profiles: memory model (HIMEM), RAM, timings, CMOS; the ROM is either one file taken whole ([ROM] key,
  // sizes as the core accepts them) or a ROM set of four 16K slots ([ROM.custom]: 128, sos = 48 BASIC, dos = TR-DOS, sys = service).
  const MACHINES = {
    PENT128: { name: 'Pentagon 128', himem: 'PENTAGON', ram: 128, base: 71680, ula: 'PENTAGON', set: true },
    PENT1024: { name: 'Pentagon 1024', himem: 'PENTAGON', ram: 1024, base: 71680, ula: 'PENTAGON', set: true },
    KAY: { name: 'KAY 1024', himem: 'KAY', ram: 1024, base: 69888, ula: 'KAY1024', set: true },
    SCORPION: { name: 'Scorpion ZS 256', himem: 'SCORPION', ram: 256, base: 69888, ula: 'SCORPION', key: 'SCORP', sizes: [64] },
    PROFSCORP: { name: 'Scorpion + ProfROM', himem: 'PROFSCORP', ram: 256, base: 69888, ula: 'SCORPION', key: 'PROFROM', sizes: [64, 128, 256, 512], page: ':0' },
    PROFI: { name: 'Profi 1024', himem: 'PROFI', ram: 1024, base: 69888, ula: 'PROFI', key: 'PROFI', sizes: [64] },
    PLUS3: { name: 'Spectrum +3', himem: 'PLUS3', ram: 128, base: 70908, key: 'PLUS3', sizes: [64] },
    QUORUM: { name: 'Quorum 1024', himem: 'QUORUM', ram: 1024, base: 69888, key: 'QUORUM', sizes: [64] },
    ATM450: { name: 'ATM Turbo 1 (4.50)', himem: 'ATM450', ram: 512, base: 69888, ula: 'ATM1_2_3.5MHz', key: 'ATM1', sizes: [64] },
    ATM710: { name: 'ATM Turbo 2+ (7.10)', himem: 'ATM710', ram: 1024, base: 69888, key: 'ATM2', sizes: [64, 128, 512, 1024], xt: true },
    EVO: { name: 'ZX-Evolution 4096', himem: 'ATM3', ram: 4096, base: 69888, key: 'ATM3', sizes: [64, 128, 512, 1024], xt: true, cmos: 'DALLAS' },
  };
  const SLOTS = [['128', '128'], ['sos', '48 BASIC'], ['dos', 'TR-DOS'], ['sys', 'Service']]; // ROM set: ini name, label
  // parts on the server to build a ROM set from (rom/roms.json replaces this list): file in rom/ (or rom/<name>.zip), slot, title
  let romParts = [
    { file: '48.rom', slot: 'sos', name: '48 BASIC (1982, original)' },
    { file: '48for128.rom', slot: 'sos', name: '48 BASIC for 128' },
    { file: '2006.rom', slot: 'sos', name: '48 BASIC 2006 (bugfixed, not with 128 BASIC)' },
    { file: 'pentagon.rom', page: 1, slot: 'sos', name: '48 BASIC (Pentagon)' },
    { file: 'pentagon.rom', page: 0, slot: '128', name: '128 BASIC + menu (Pentagon)' },
    { file: 'qc_3_05.rom', slot: '128', name: 'Quick Commander 3.05' },
    { file: 'rrom_200.rom', slot: '128', name: 'RRom 2.00 (STS 6.2)' },
    { file: 'trd503.rom', slot: 'dos', name: 'TR-DOS 5.03' },
    { file: 'trd504tm.rom', slot: 'dos', name: 'TR-DOS 5.04TM' },
    { file: 'trdos.rom', slot: 'dos', name: 'TR-DOS 5.05D' },
    { file: 'dos6_10e.rom', slot: 'dos', name: 'TR-DOS 6.10E' },
    { file: 'dos_607+.rom', slot: 'dos', name: 'PereDOS 6.07+' },
    { file: 'glukpen.rom', slot: 'sys', name: 'Gluk Reset Service 6.5R' },
    { file: 'gluk61r.rom', slot: 'sys', name: 'Gluk Reset Service 6.1R' },
  ];
  // the selected ROM file of this session (FS name, file name, KB, its pages); a slot is 'f:<fs>:<page>' (local) or 's:<file>' (server part)
  let crCur = null;
  // extra: machine settings from the json of a Custom ROM ZIP (speed, fdd, hdd, ini) — they win over the visitor's own
  // settings while this Custom ROM runs and are never stored
  const customCfg = { mach: 'PENT128', reset: '', name: '', whole: '', slots: { 128: '', sos: '', dos: '', sys: '' }, extra: null };
  const crX = () => (model === 'CUSTOM' && customCfg.extra) || {};
  function iniMerge(dst, src) { // ini sections / keys of src over dst, names compared without case
    for (const [sec, kv] of Object.entries(src || {})) {
      if (!kv || typeof kv !== 'object') continue;
      const ds = Object.keys(dst).find((k) => k.toLowerCase() === sec.toLowerCase()) || sec; dst[ds] = dst[ds] || {};
      for (const [k, v] of Object.entries(kv)) { const dk = Object.keys(dst[ds]).find((x) => x.toLowerCase() === k.toLowerCase()) || k; dst[ds][dk] = String(v); }
    }
    return dst;
  }
  const crFile = (fsn) => (crCur && crCur.fs === fsn ? crCur : null);
  // → { ini, files } or { why }
  function customPlan() {
    const c = MACHINES[customCfg.mach], ini = { MISC: { HIMEM: c.himem, RAMSize: String(c.ram), CMOS: c.cmos || 'none' }, ROM: {} };
    if (c.ula) ini.ULA = { Preset: c.ula };
    const files = c.cmos ? ['CMOS'] : [];
    if (!c.set) {
      const p = crFile(customCfg.whole);
      if (!p) return { why: 'Select ROM (' + c.sizes.join(' / ') + ' KB).' };
      if (!c.sizes.includes(p.kb)) return { why: c.name + ' takes ' + c.sizes.join(' / ') + ' KB, ' + p.name + ' is ' + p.kb + ' KB.' };
      ini.ROM.ROMSET = ''; ini.ROM[c.key] = p.fs + (c.page || ''); ini.MISC.RESET = 'SYS'; files.push(p.fs);
      if (customCfg.extra && customCfg.extra.ini) iniMerge(ini, customCfg.extra.ini);
      return { ini, files };
    }
    const set = {};
    for (const [s] of SLOTS) {
      const v = customCfg.slots[s];
      if (v.startsWith('f:')) { const [, fsn, pg] = v.split(':'); if (crFile(fsn)) { set[s] = fsn + ':' + pg; if (!files.includes(fsn)) files.push(fsn); } }
      else if (v.startsWith('s:')) { const [, f, pg] = v.split(':'); set[s] = f + (pg ? ':' + pg : ''); if (!files.includes(f)) files.push(f); }
    }
    if (!set.sos) return { why: 'Choose 48 BASIC ROM (model cannot start without it).' };
    ini.ROM.ROMSET = 'custom'; ini['ROM.custom'] = set;
    const auto = set.sys ? 'SYS' : set['128'] ? 'MENU' : 'BASIC';
    const r = customCfg.reset, ok = r && (r !== 'SYS' || set.sys) && (r !== 'MENU' || set['128']) && (r !== 'DOS' || set.dos);
    ini.MISC.RESET = ok ? r : auto;
    if (customCfg.extra && customCfg.extra.ini) iniMerge(ini, customCfg.extra.ini);
    return { ini, files };
  }
  MODELS.CUSTOM = { name: 'Custom ROM', machine: 'CUSTOM', base: 71680, speed: 2.5, xt: false, files: [], ini: {}, note: '', custom: true };
  function customApply() { // MODELS.CUSTOM from the settings
    const p = customPlan(), m = MODELS.CUSTOM, c = MACHINES[customCfg.mach];
    if (p.ini) { m.ini = p.ini; m.files = p.files; }
    m.base = c.base; m.xt = !!c.xt;
    const x = customCfg.extra || {}, sp = +x.speed;
    m.speed = isFinite(sp) && sp > 0 ? SPEEDS.reduce((a, b) => (Math.abs(b - sp) < Math.abs(a - sp) ? b : a)) : 2.5;
    const xs = [isFinite(sp) && sp > 0 ? 'clock ' + m.speed + 'x' : '', x.fdd ? 'FDD ' + x.fdd : '', x.hdd ? 'HDD ' + x.hdd : '', x.ini && Object.keys(x.ini).length ? 'ini: ' + Object.keys(x.ini).join(', ') : ''].filter(Boolean);
    m.note = (p.ini ? (customCfg.name ? customCfg.name + ' · ' : '') + c.name + (c.set ? ' · ROM set' : ' · whole ROM') : p.why)
      + (xs.length ? '\nFrom its json: ' + xs.join(' · ') : '')
      + '\nMenu SAVE can store this combined ROM to load later.';
    return p;
  }
  customApply();
  let model = 'ATM710';
  const M = () => MODELS[model].machine || model; // the machine under an OS model
  const xbiosOf = (m) => (m === 'XBIOS136' ? 'XBIOS136' : 'XBIOSXT'); // the xBIOS model a ROM disk is built on
  // ROM disk (xBIOS 1.32XT, appendix 4): IMAGE.TRD (40 pages) + empty 256K + XBIOS.ROM = 1 MB ROM; vTR-DOS mounts it read-only
  const ROMDISK_FILE = 'romdisk.rom', ROMDISK_TRD = 40 * 16384, ROM_TARGET = 9;
  let romDisk = null; // { name } for this session
  function modelIniObj(m) { // the ini overrides of model m, as they go to the emulator
    const ini = JSON.parse(JSON.stringify(MODELS[m].ini));
    if ((MODELS[m].machine || m) === 'XBIOSXT' && romDisk && romDisk.model === xbiosOf(m) && fs.exists(ROMDISK_FILE)) ini.ROM.ATM2 = ROMDISK_FILE; // 1 MB: disk + empty + xBIOS
    // no TR-DOS ROM on the server: take TR-DOS 5.03 from the ATM BIOS (page 1)
    for (const set of Object.keys(ini).filter((k) => /^ROM\./.test(k))) for (const r of ['dos', 'sys']) if (ini[set][r] === 'trd504tm.rom' && !fs.exists('trd504tm.rom')) ini[set][r] = 'bios_1_07_13.rom:1';
    return ini;
  }
  function modelIni(m) {
    const ini = modelIniObj(m);
    // HDD images (Image0= / Image1= empty in unreal.ini) are mounted by the page; sound volumes: unreal.ini (8192 = 100%)
    let t = '; web page: overrides for ' + MODELS[m].name + '\r\n';
    for (const [sec, kv] of Object.entries(ini)) {
      t += '[' + sec + ']\r\n';
      for (const [k, v] of Object.entries(kv)) t += k + '=' + v + '\r\n';
    }
    return new TextEncoder().encode(t);
  }
  const NDRIVES = 2; // drives shown in Options (A, B)

  const $ = (id) => document.getElementById(id);
  const canvas = $('screen');
  const ctx2d = canvas.getContext('2d', { alpha: false });
  function log(s) { console.log('[emu] ' + s); }
  let toastTimer = 0;
  function toast(s, err) {
    log(s);
    const t = $('toast'); t.textContent = s; t.classList.toggle('err', !!err); t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), err ? 4000 : 2500);
  }

  async function fetchBytes(url) {
    // revalidate with the server ('no-cache'). Options / System "Force update from server": download again ('reload') —
    // a file replaced by one with an older date (e.g. renamed) gets a 304 on revalidation and the cached copy stays.
    // The wasm has the build in its URL (?v=), so for it a revalidation is always enough.
    const force = load('fetch.reload') === '1' && !/\.wasm(\?|$)/i.test(url);
    const r = await fetch(encodeURI(url).replace(/\$/g, '%24'), { cache: force ? 'reload' : 'no-cache' });
    if (!r.ok) throw new Error(url + (r.status === 404 ? ' not found (404)' : ' HTTP ' + r.status));
    // some hosts answer a missing file with their own HTML page (status 200)
    if (/text\/html/i.test(r.headers.get('content-type') || '') && !/\.html?$/i.test(url)) throw new Error(url + ' not found (web page instead of the file)');
    return new Uint8Array(await r.arrayBuffer());
  }

  // ------------------------------------------------------------------ file system
  const fs = new MemFS();
  const drives = [null, null, null, null]; // {name, ext}

  // ------------------------------------------------------------------ wasm
  let module = null, E = null, AS = null;
  const cstr = (p) => { const m = new Uint8Array(E.memory.buffer); let s = ''; while (m[p]) s += String.fromCharCode(m[p++]); return s; };
  function setName(name) {
    const nb = E.web_namebuf(); const m = new Uint8Array(E.memory.buffer);
    for (let i = 0; i < name.length; i++) m[nb + i] = name.charCodeAt(i) & 0xFF;
    m[nb + name.length] = 0;
  }

  // fetch the files that are not in the in-memory FS yet (once per page session)
  const missing = new Set(), whyMissing = {}; // why: "rom/x.rom not found (404)" or a network error
  // a ROM is looked for as rom/<name>.zip first (the image inside: the same name, or the only / largest ROM there), then rom/<name>
  async function fetchSrv(f) {
    if (/\.rom$/i.test(f)) {
      let zip = null;
      try { zip = await fetchBytes(ROM_DIR + f.replace(/\.rom$/i, '.zip')); } catch (e) {}
      if (zip && UnrealZip.isZip(zip)) {
        const ents = UnrealZip.list(zip).filter((x) => x.size && !/\/$/.test(x.name));
        const e = ents.find((x) => x.name.replace(/^.*\//, '').toLowerCase() === f.toLowerCase())
          || ents.filter((x) => /\.(rom|bin)$/i.test(x.name)).sort((x, y) => y.size - x.size)[0];
        if (e) return UnrealZip.extract(zip, e);
      }
    }
    return fetchBytes(srcUrl(f));
  }
  async function ensureFiles(list) {
    const need = list.filter((f) => !fs.exists(f) && !missing.has(f));
    const got = await Promise.all(need.map((f) => fetchSrv(f).catch((e) => { whyMissing[f] = /not found|HTTP/.test(e.message) ? e.message.replace(/\.rom /i, '.rom (or .zip) ') : srcUrl(f) + ' (' + e.message + ')'; return null; })));
    need.forEach((f, i) => { if (got[i]) fs.write(f, got[i]); else missing.add(f); });
    return list.every((f) => fs.exists(f));
  }
  async function modelFiles(m) {
    const list = MODELS[m].files;
    await ensureFiles(list);
    // Pentagon without trd504tm.rom: TR-DOS is taken from the ATM BIOS (see modelIni)
    if ((m === 'PENTAGON' || m === 'CUSTOM') && list.includes('trd504tm.rom') && !fs.exists('trd504tm.rom')) await ensureFiles(['bios_1_07_13.rom']);
    const lost = list.filter((f) => !fs.exists(f) && !((m === 'PENTAGON' || m === 'CUSTOM') && f === 'trd504tm.rom'));
    if (lost.length) toast('Cannot load: ' + lost.map((f) => whyMissing[f] || srcUrl(f) + ' not found').join(', '), true);
  }

  async function start() {
    if (!module) {
      const [wasm] = await Promise.all([fetchBytes(WASM_URL), ensureFiles(COMMON_FILES), ensureFiles(['sos.l'])]); // sos.l: labels of 48 BASIC for the debugger (optional)
      for (const f of COMMON_FILES) if (!fs.exists(f)) toast('File not found: ' + f, true);
      module = await WebAssembly.compile(wasm);
    }
    await modelFiles(model);
    macro = null;
    if (gsPref() !== '0') await ensureFiles([GS_ROM]); // on, or auto: the ROM is at hand when a program asks
    fs.write('web_model.ini', modelIni(model));
    const wasi = new WASI(fs, { stdout: (s) => log(s) });
    const env = {
      web_fatal: (p) => { const m = cstr(p); log('FATAL: ' + m); throw new Error(m); },
      web_message: (t, c, type) => {
        const text = cstr(t), cap = cstr(c);
        if (coreAnswer !== null) { const a = coreAnswer; coreAnswer = null; return a; } // asked by the page before the core asks (askBox)
        toast(cap + ': ' + text.replace(/\r?\n/g, ' '), true);
        if ((type & 0xF) === 4 || (type & 0xF) === 3) return window.confirm(cap + '\n\n' + text) ? 6 : 7; // a question the page did not ask first (none known)
        return 1;
      },
      web_tz_offset: () => -new Date().getTimezoneOffset(),
      web_sleep: (ms) => as.web_sleep(ms),
      web_debug_notify: (on) => setTimeout(() => debugShown(!!on), 0),
      web_ui: (ptr) => webUi(ptr),
    };
    const as = window.UnrealAsyncify.create();
    const inst = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi.imports, env });
    AS = as;
    E = inst.exports;
    wasi.setMemory(E.memory);
    E._initialize();
    AS.init(E);
    E.web_init();
    bpRestore(); // breakpoints of the last session (debugger, Alt+C)
    statSeq = 0; statBoot = true;
    drives.forEach((d, i) => { if (d) insertFromFs(d.name, i, true); }); // re-insert after restart
    loadSpeed();
    eff7Apply();
    applySoundPrefs();
    applyPal();
    applyFdd(); applyMouseSwap(); applyBorder();
    await applyHdd();
    sdMount(); sdUI();
    updateUI();
  }

  // accurate FDD (Options / Disk): off by default — TR-DOS traps and no WD1793 delays, as before
  // Options / Video / Border: the visitor's choice (kept); not chosen yet: unreal.ini (or a Custom ROM ini) decides
  function applyBorder() {
    if (!E.web_border) return; const v = load('border'); if (v !== null) E.web_border(+v);
    const atm = /^(ATM710|ATM3|ATM450|PROFI)$/.test(himem()); // their video modes need the border area: no "None"
    $('bordersel').querySelector('[value="0"]').hidden = atm; $('bordersel').value = String(E.web_border(-1));
  }
  // Swap Mouse Buttons (Options / Input; swapmouse=1 in a link: this visit only). Off: unreal.ini / a Custom ROM ini decides
  let mswapLink = false;
  function applyMouseSwap() { if (E.web_mouse_swap && (mswapLink || load('mswap') === '1')) E.web_mouse_swap(1); const c = $('mswap'); if (c) c.checked = load('mswap') === '1'; }
  // a Custom ROM ZIP may set it ("fdd", or Traps / Fast in its ini [BETA128]): then the visitor's setting is not applied at start
  function applyFdd(user) {
    if (!E.web_fdd_accurate) return;
    const x = crX(), b = x.ini ? Object.entries(x.ini).find(([k]) => k.toLowerCase() === 'beta128') : null;
    const iniSets = !!b && Object.keys(b[1] || {}).some((k) => /^(traps|fast)$/i.test(k));
    if (!user && x.fdd) E.web_fdd_accurate(/^acc/i.test(x.fdd) ? 1 : 0);
    else if (!user && iniSets) { /* the ini of the ZIP decides */ }
    else E.web_fdd_accurate(load('fdd.acc') === '1' ? 1 : 0);
    const c = $('fddacc'); if (c) c.checked = !!E.web_fdd_accurate(-1);
  }
  // ------------------------------------------------------------------ Options: sound (defaults come from unreal.ini)
  // volumes are stored as % of the unreal.ini value (100% = ini)
  const SND_VOL = [0, 1, 2, 3, 4, 11], SND_OPT = { aychip: 5, aystereo: 6, ayvoltab: 7, sndfilter: 8, sdon: 9 };
  const SND_DEF = { 0: '5', 8: '1' }; // until changed in Options / Sound: beeper 5%, low-pass filter on
  const sndPref = (id) => { const v = load('snd.' + id); return v !== null ? v : SND_DEF[id] !== undefined ? SND_DEF[id] : null; };
  const volOf = (id, pct) => { const d = E.web_snd_get(100 + id) || 4000; return Math.round(d * pct / 100); };
  const pctOf = (id) => { const d = E.web_snd_get(100 + id) || 4000; return Math.round(E.web_snd_get(id) * 100 / d); };
  function fillSndList(sel, list) {
    if (sel.options.length) return;
    for (let i = 0, n = E.web_snd_count(list); i < n; i++) { const o = document.createElement('option'); o.value = i; o.textContent = cstr(E.web_snd_name(list, i)); sel.appendChild(o); }
  }
  function syncSoundUI() {
    fillSndList($('aystereo'), 6); fillSndList($('ayvoltab'), 7);
    for (const id of SND_VOL) { const r = $('vol' + id); r.value = pctOf(id); r.nextElementSibling.textContent = r.value + '%'; }
    for (const [el, id] of Object.entries(SND_OPT)) {
      const v = E.web_snd_get(id);
      if ($(el).type === 'checkbox') $(el).checked = !!v; else $(el).value = String(v);
    }
    $('vol3').disabled = !$('sdon').checked;
  }
  function applySoundPrefs() {
    for (const id of SND_VOL) { const v = sndPref(id); if (v !== null) E.web_snd_set(id, volOf(id, +v)); }
    for (const id of Object.values(SND_OPT)) { const v = sndPref(id); if (v !== null) E.web_snd_set(id, +v); }
    syncSoundUI();
    const gs = gsPref(), ay = load('ay');
    if (!E.web_set_gs(gs === '1' ? 1 : 0) && gs === '1') toast('General Sound: rom/bootgs.rom (512 KB) not found', true);
    if (E.web_gs_auto_set) E.web_gs_auto_set(gs === '2' && fs.exists(GS_ROM) ? 1 : 0);
    if (ay !== null) E.web_set_ay_scheme(+ay);
    zxbusApply(false);
    $('gssel').value = gs === '2' ? '2' : String(E.web_get_gs());
    const sc = String(E.web_get_ay_scheme());
    if ([...$('aysel').options].some((o) => o.value === sc)) $('aysel').value = sc;
  }
  // General Sound: '0' off, '1' on, '2' auto (default): off until a program touches the GS ports
  const gsPref = () => { const v = load('gs'); return v === '0' || v === '1' ? v : '2'; };
  // ZXBUS cards: ZX-MultiSound (Rev.A2 / Max) = TurboSound FM + SAA1099 + GS + SounDrive (+ OPL3 on Max), ZXM-MoonSound = OPL4
  let zxbusWas = false;
  const MOON_ROM = 'YRW801-M.rom'; // rom/YRW801-M.zip (the .rom in it) or rom/YRW801-M.rom
  async function zxbusApply(user) {
    if (!E || !E.web_opl) return;
    const ms = load('zxms') || '', moon = load('moon') === '1';
    if (user && ms) { // the board's chips on: AY = TurboSound with YM2203, SAA, SounDrive, GS (auto when it was off)
      E.web_set_ay_scheme(6); store('ay', '6'); E.web_snd_set(5, 2); store('snd.5', '2'); E.web_snd_set(9, 1); store('snd.9', '1');
      if (gsPref() === '0') { store('gs', '2'); await ensureFiles([GS_ROM]); if (E.web_gs_auto_set) E.web_gs_auto_set(fs.exists(GS_ROM) ? 1 : 0); }
    }
    if (user && !ms && zxbusWas) { // MultiSound off: the AY block (scheme, chip, stereo, volume table, volume) and Covox / SD as in unreal.ini
      E.web_set_ay_scheme(E.web_snd_get(112)); for (const id of [5, 6, 7]) E.web_snd_set(id, E.web_snd_get(100 + id));
      E.web_snd_set(1, E.web_snd_get(101)); E.web_snd_set(9, E.web_snd_get(109) ? 1 : 0);
      for (const k of ['ay', 'snd.1', 'snd.5', 'snd.6', 'snd.7', 'snd.9']) try { localStorage.removeItem('unreal.' + k); } catch (e) {}
    }
    zxbusWas = !!ms;
    E.web_snd_set(10, ms ? 1 : 0);
    if (moon && !fs.exists(MOON_ROM)) { try { await ensureFiles([MOON_ROM]); } catch (e) {} }
    const r = E.web_opl(moon ? 2 : ms === 'max' ? 1 : 0);
    $('moonrom').textContent = moon && !(r & 0x100) ? 'no rom/YRW801-M.zip: FM only, wavetable silent' : '';
    $('moonrom').classList.toggle('err', moon && !(r & 0x100));
    if (user) { syncSoundUI(); $('gssel').value = gsPref() === '2' ? '2' : String(E.web_get_gs()); const sc = String(E.web_get_ay_scheme()); if ([...$('aysel').options].some((o) => o.value === sc)) $('aysel').value = sc; }
  }
  function bindSoundOpts() {
    $('zxms').value = load('zxms') || ''; $('moon').checked = load('moon') === '1';
    $('zxms').onchange = () => { store('zxms', $('zxms').value); zxbusApply(true); };
    $('moon').onchange = () => { store('moon', $('moon').checked ? '1' : '0'); zxbusApply(true); };
    $('gssel').onchange = async () => {
      const v = $('gssel').value, on = v === '1' ? 1 : 0;
      if (v !== '0') await ensureFiles([GS_ROM]);
      if (E && E.web_set_gs(on) !== on) { toast('General Sound: rom/bootgs.rom (512 KB) not found', true); $('gssel').value = '0'; }
      if (E && E.web_gs_auto_set) E.web_gs_auto_set(v === '2' && fs.exists(GS_ROM) ? 1 : 0);
      store('gs', $('gssel').value);
    };
    $('aysel').onchange = () => { if (E) E.web_set_ay_scheme(+$('aysel').value); store('ay', $('aysel').value); };
    for (const id of SND_VOL) {
      const r = $('vol' + id);
      r.oninput = () => { r.nextElementSibling.textContent = r.value + '%'; if (E) E.web_snd_set(id, volOf(id, +r.value)); store('snd.' + id, r.value); };
      r.ondblclick = () => { r.value = SND_DEF[id] !== undefined ? +SND_DEF[id] : 100; r.oninput(); }; // double click: back to the default
    }
    for (const [el, id] of Object.entries(SND_OPT)) {
      $(el).onchange = () => {
        const v = $(el).type === 'checkbox' ? ($(el).checked ? 1 : 0) : +$(el).value;
        if (E) E.web_snd_set(id, v); store('snd.' + id, String(v));
        $('vol3').disabled = !$('sdon').checked;
      };
    }
  }

  // ------------------------------------------------------------------ Options: palette ([COLORS] of unreal.ini, default from color=)
  function applyPal() {
    const sel = $('palsel');
    if (!sel.options.length) {
      for (let i = 0, n = E.web_pal_count(); i < n; i++) { const nm = cstr(E.web_pal_name(i)); if (/^atari\./i.test(nm)) continue; const o = document.createElement('option'); o.value = nm; o.textContent = nm; sel.appendChild(o); } // atari.* are AtariPreset color tables, not palettes
      sel.onchange = () => { setPal(sel.value); store('pal', sel.value); };
    }
    setPal(load('pal'));
  }
  function setPal(name) {
    for (let i = 0, n = E.web_pal_count(); i < n; i++) if (name && cstr(E.web_pal_name(i)) === name) { E.web_set_pal(i); break; }
    $('palsel').value = cstr(E.web_pal_name(E.web_get_pal()));
    if (gfx && gfx.open) gfx.refresh();
  }

  // ------------------------------------------------------------------ Options: video filter (drawn over the canvas)
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
    const lines = canvas.height >= 384 ? canvas.height / 2 : canvas.height; // one ZX line = 2 rows in double size
    const period = lines ? ch / lines : 3;
    fx.style.setProperty('--sl', period + 'px');
    // thin lines on small screens turn into moire: make them lighter
    const strong = fxMode === 'crt' ? 0.3 : 0.38;
    fx.style.setProperty('--so', String(period >= 2.5 ? strong : period >= 1.8 ? strong * 0.5 : 0));
  }

  // ------------------------------------------------------------------ Kempston mouse
  // mouse / trackpad: the toolbar button captures the pointer (Esc releases it);
  // touch: the button turns on taps on the screen — 1 tap moves the pointer there, 2 taps = left button, 3 taps = right button
  let mouseLocked = false, mouseUnlockAt = 0, mfx = 0, mfy = 0, mbtn = 0, touchMouse = false;
  const msum = { x: 0, y: 0 }; // what the core has accumulated (wm_x, wm_y): Kempston X = x, Y = -y (8 bits)
  function mouseSend(dx, dy, dz, b) { msum.x += dx; msum.y += dy; E.web_mouse(dx, dy, dz, b); }
  function canLockMouse() {
    return E && E.web_mouse_type() === 1 && !dbgOn && !isPaused() && !!canvas.requestPointerLock;
  }
  function releaseMouse() { if (mouseLocked && document.exitPointerLock) document.exitPointerLock(); }
  function mouseUI() {
    $('mousebtn').classList.toggle('on', mouseLocked || touchMouse); canvas.classList.toggle('tmouse', touchMouse);
    $('mbar').classList.toggle('on', touchMouse);
    $('mbar').querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', !!(mbtn & +b.dataset.b)));
    $('mpps').textContent = $('tmscale').value + 'pps';
  }
  let tmQ = []; // one action per emulated frame: the program has to see each step
  function setTouchMouse(v) {
    touchMouse = v; mbtn = 0; tmSticky = tmFinger = 0; tmQ = []; tmPend.x = tmPend.y = 0;
    if (E) { mouseSend(0, 0, 0, 0); E.web_mouse_lock(v ? 1 : 0); }
    mouseUI();
  }
  function tmFrame() { if (!touchMouse) return; if (tmQ.length) tmQ.shift()(); else tmFrameMove(); }
  // touch: dragging moves the program's pointer by the same distance (start on the pointer and it stays under the finger),
  // releasing stops it; 2 taps = left button, 3 taps = right button. The program reads the Kempston ports as 8-bit
  // counters, so the movement goes out in steps of at most 40 units a frame.
  const tmPend = { x: 0, y: 0 };
  function tmFrameMove() {
    const step = (v) => Math.max(-40, Math.min(40, Math.trunc(v)));
    const x = step(tmPend.x), y = step(tmPend.y);
    if (x || y) { tmPend.x -= x; tmPend.y -= y; mouseSend(x, y, 0, mbtn); }
  }
  // buttons: tmSticky = LB / RB of the bar, tmFinger = held by a second finger
  let tmSticky = 0, tmFinger = 0;
  function tmButtons() { mbtn = tmSticky | tmFinger; if (E) mouseSend(0, 0, 0, mbtn); mouseUI(); }
  function tmClick(bit) { tmQ.push(() => mouseSend(0, 0, 0, mbtn | bit), () => {}, () => {}, () => mouseSend(0, 0, 0, mbtn)); }
  function bindTouchMouse() {
    let drag = null, second = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (!touchMouse || e.pointerType === 'mouse') return;
      e.preventDefault(); canvas.setPointerCapture(e.pointerId);
      if (drag && second === null) { // a second finger holds the left button while it stays down
        second = e.pointerId; drag.moved = true; tmFinger = 1; tmButtons(); return;
      }
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false };
    });
    const secondUp = (e) => { if (e.pointerId !== second) return false; second = null; tmFinger = 0; tmButtons(); return true; };
    canvas.addEventListener('pointerup', secondUp); canvas.addEventListener('pointercancel', secondUp);
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      e.preventDefault();
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return; // still a tap
      drag.moved = true;
      const r = canvas.getBoundingClientRect(), k = +($('tmscale').value || 1); // the program moves k pixels per Kempston unit
      tmPend.x += (e.clientX - drag.x) * 320 / r.width / k;
      tmPend.y += (e.clientY - drag.y) * 240 / r.height / k;
      drag.x = e.clientX; drag.y = e.clientY;
    });
    const end = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.id) drag = null; });
  }
  function bindMouse() {
    let btnPtr = 'mouse';
    $('tmscale').value = load('tmscale') || '1';
    $('tmscale').onchange = () => { store('tmscale', $('tmscale').value); $('tmscale').blur(); mouseUI(); };
    // the bar under the screen: LB / RB tap = click, long tap = held until the next tap; pps = pointer speed 1 / 2
    $('mbar').querySelectorAll('[data-b]').forEach((b) => {
      const bit = +b.dataset.b; let t = null, long = false;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation(); long = false;
        t = setTimeout(() => { long = true; tmSticky |= bit; tmButtons(); }, 450);
      });
      const up = (e) => {
        e.stopPropagation(); clearTimeout(t);
        if (long) return;
        if (tmSticky & bit) { tmSticky &= ~bit; tmButtons(); } else tmClick(bit);
      };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', () => clearTimeout(t));
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    $('mpps').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
    $('mpps').addEventListener('pointerup', (e) => {
      e.stopPropagation();
      $('tmscale').value = $('tmscale').value === '1' ? '2' : '1'; store('tmscale', $('tmscale').value); mouseUI();
    });
    bindTouchMouse();
    $('mousebtn').addEventListener('pointerdown', (e) => { btnPtr = e.pointerType; });
    $('mousebtn').onclick = () => {
      if (!E || E.web_mouse_type() !== 1) { toast('Kempston mouse is off in unreal.ini', true); return; }
      if (touchMouse) { setTouchMouse(false); toast('Mouse off'); return; }
      if (btnPtr === 'mouse') {
        if (!canLockMouse()) { toast('Mouse: run the machine first', true); return; }
        const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {});
      } else { setTouchMouse(true); toast('Mouse on'); }
    };
    canvas.addEventListener('mousedown', (e) => {
      if (mouseLocked) { mbtn = e.buttons & 7; mouseSend(0, 0, 0, mbtn); e.preventDefault(); return; }
      // Options / Input: a click on the screen captures the mouse (Esc releases it); that click is not a button press
      if (load('mclick') === '1' && e.button === 0 && !matchMedia('(hover: none)').matches && !touchMouse && canLockMouse()) { e.preventDefault(); const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); }
    });
    document.addEventListener('mouseup', (e) => { if (mouseLocked) { mbtn = e.buttons & 7; mouseSend(0, 0, 0, mbtn); } });
    document.addEventListener('mousemove', (e) => {
      if (!mouseLocked) return;
      const k = (canvas.width / 2) / (canvas.getBoundingClientRect().width || 1); // ZX pixels per CSS pixel
      mfx += e.movementX * k; mfy += e.movementY * k;
      const dx = Math.trunc(mfx), dy = Math.trunc(mfy);
      mfx -= dx; mfy -= dy;
      if (dx || dy) mouseSend(dx, dy, 0, mbtn);
    });
    canvas.addEventListener('wheel', (e) => { if (!mouseLocked) return; e.preventDefault(); if (e.deltaY) mouseSend(0, 0, e.deltaY < 0 ? 120 : -120, mbtn); }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => { if (mouseLocked) e.preventDefault(); });
    document.addEventListener('pointerlockchange', () => {
      const on = document.pointerLockElement === canvas;
      if (on === mouseLocked) return;
      mouseLocked = on; mbtn = 0; mfx = mfy = 0;
      if (on && touchMouse) { touchMouse = false; }
      if (E) { mouseSend(0, 0, 0, 0); E.web_mouse_lock(on ? 1 : 0); }
      mouseUI();
      if (on) toast('Mouse captured (Kempston). Esc to release');
      else mouseUnlockAt = performance.now();
    });
  }

  // ------------------------------------------------------------------ video
  let imageData = null;
  function render() {
    E.web_render();
    blit();
  }
  function blit() { // copy the wasm frame buffer to the canvas
    const w = E.web_fb_w(), h = E.web_fb_h();
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; imageData = null; applyScale(); }
    if (!imageData) imageData = new ImageData(w, h);
    imageData.data.set(new Uint8ClampedArray(E.memory.buffer, E.web_fb(), w * h * 4));
    ctx2d.putImageData(imageData, 0, 0);
  }

  // ------------------------------------------------------------------ audio
  const RATE = 44100; // the core's sound rate
  const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let audio = null;
  const workletSrc = `
    class Ring extends AudioWorkletProcessor {
      constructor() {
        super();
        this.buf = new Float32Array(${RATE} * 2); this.rd = 0; this.wr = 0; this.fill = 0; this.n = 0; this.got = 0;
        this.port.onmessage = (e) => {
          const d = e.data;
          if (d === 'flush') { this.rd = this.wr = this.fill = 0; return; }
          const cap = this.buf.length / 2; this.got += d.length / 2; // all samples ever received: the page knows what is still on the way
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
        if ((++this.n & 3) === 0) this.port.postMessage({ fill: this.fill, got: this.got, t: currentTime }); // t: the audio clock of this report
        return true;
      }
    }
    registerProcessor('unreal-ring', Ring);`;

  let audioStarting = false, pendingCtx = null;
  // iOS audio session: 'playback' = the emulator is the main sound (plays with the silent switch on, other apps' sound
  // stops when it starts); 'ambient' = mixes with other apps (music keeps playing), the silent switch mutes it
  const iosMix = () => load('iosmix') !== '0'; // on by default
  function setAudioSession() { try { if (navigator.audioSession) navigator.audioSession.type = iosMix() ? 'ambient' : 'playback'; } catch (e) {} }
  function bindIosMix() {
    if (!IOS) return;
    $('iosmixcard').hidden = false;
    $('iosmix').checked = iosMix();
    $('iosmix').onchange = () => {
      store('iosmix', $('iosmix').checked ? '1' : '0');
      setAudioSession();
      // the session type is taken when the sound starts: restart it (this tap is a user gesture, so it may start again)
      if (audio) { killAudio(); if (!muted) startAudio(); }
    };
  }
  async function startAudio() {
    if (audio || audioStarting || !(window.AudioContext || window.webkitAudioContext)) return;
    audioStarting = true;
    let ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: RATE, latencyHint: 'interactive' }); }
    catch (err) { log('audio: ' + err); audioStarting = false; return; }
    pendingCtx = ctx;
    // iOS Safari: the context starts only if resume() is called inside the user gesture, i.e. before the first await
    try { if (!isPaused() && !dbgOn) ctx.resume().catch(() => {}); } catch (e) {}
    setAudioSession(); // iOS 17+: playback (plays in silent mode, stops other apps) or ambient (mixes with other apps)
    const gain = ctx.createGain(); gain.gain.value = muted ? 0 : volume();
    gain.connect(ctx.destination);
    // analyser before the volume: the meter and the spectrum also work with the sound muted
    // analysers sit before the volume (the visualizer also works with the sound muted):
    // input → split → L / R analysers → merge → mono-summing analyser (spectrum) → volume
    const an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0.5; an.minDecibels = -90; an.maxDecibels = -20;
    const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2);
    const anL = ctx.createAnalyser(), anR = ctx.createAnalyser(); anL.fftSize = anR.fftSize = 1024;
    split.connect(anL, 0); split.connect(anR, 1); anL.connect(merge, 0, 0); anR.connect(merge, 0, 1);
    merge.connect(an); an.connect(gain);
    const a = { ctx, gain, an, anL, anR, node: null, fill: 0, got: 0, sent: 0, reportAt: performance.now(), push: null, flush: null };
    if (ctx.audioWorklet) {
      const urls = [];
      try { urls.push(URL.createObjectURL(new Blob([workletSrc], { type: 'application/javascript' }))); } catch (e) {}
      urls.push('data:application/javascript;base64,' + btoa(workletSrc));
      for (const url of urls) {
        try {
          await ctx.audioWorklet.addModule(url);
          const node = new AudioWorkletNode(ctx, 'unreal-ring', { outputChannelCount: [2] });
          node.connect(split);
          node.port.onmessage = (e) => { a.fill = e.data.fill; a.got = e.data.got || 0; a.repT = e.data.t; a.reportAt = performance.now(); };
          a.node = node;
          a.push = (f) => { a.sent += f.length / 2; node.port.postMessage(f, [f.buffer]); };
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
      sp.connect(split);
      a.node = sp;
    }
    if (pendingCtx !== ctx) { try { ctx.close().catch(() => {}); } catch (e) {} return; } // dropped while it was setting up
    audio = a;
    try { if (ctx.state !== 'running' && !isPaused()) await ctx.resume(); } catch (e) {}
    updateSoundBtn();
  }
  // iOS: a context that went through an app switch comes back broken (no sound, the audio-clocked loop slows down),
  // so on iOS it is closed when the page is hidden; the next touch makes a new one ("Tap for sound" until then)
  let audioLost = false;
  function killAudio() {
    const a = audio, c = pendingCtx;
    audio = null; pendingCtx = null; audioStarting = false;
    if (a && a.node) try { a.node.disconnect(); } catch (e) {}
    for (const x of new Set([a && a.ctx, c])) if (x) try { x.close().catch(() => {}); } catch (e) {}
    if (a || c) audioLost = true;
    sentSinceReport = 0; lastReportSeen = 0;
  }
  let muted = false;
  const VOLUME = 0.6;
  function volume() { return VOLUME; }
  function setIcon(btn, id) { $(btn).querySelector('use').setAttribute('href', '#' + id); }
  // a suspended context (iOS, autoplay rules) is resumed by the next touch / click / key
  function unlockAudio() {
    if (!E) return;
    const c = audio ? audio.ctx : pendingCtx; // the context may still be setting up its worklet
    if (!c) { startAudio(); return; }
    if (c.state !== 'running' && !isPaused() && !dbgOn) c.resume().catch(() => {});
  }
  function toggleSound() {
    if (!audio) { muted = false; startAudio(); updateSoundBtn(); return; }
    muted = !muted; audio.gain.gain.value = muted ? 0 : volume(); updateSoundBtn();
    if (!muted) unlockAudio();
  }
  function updateSoundBtn() {
    const on = !muted; // the sound is on by default; the context itself starts with the first touch / click / key
    setIcon('snd', on ? 'i-snd' : 'i-mute');
    $('snd').title = on ? 'Sound off' : 'Sound on';
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



  // ------------------------------------------------------------------ sound visualizer (top left of the screen)
  // one effect at a time; "smooth decay": bars fall slowly with peak caps, traces leave a fading trail
  const VZ_MODES = { spectrum: 64, mirror: 64, scope: 64, chan: 0, water: 64, xy: 88 }; // width in CSS px (chan: by channel count)
  const VZ_TALL = { xy: 32 }; // the stereo picture is drawn twice as large
  const VZ_NB = { spectrum: 30, mirror: 30, water: 16 }; // frequency bands
  const VZ_H = 16, VZ_BARS = 30;
  let vzMode = load('viz') || 'chan', vzDecay = load('vizdecay') !== '0';
  if (vzMode !== 'off' && !(vzMode in VZ_MODES)) vzMode = 'chan';
  let vzAlpha = 0, vzQuietT = 0, vzLast = 0, vzBins = new Float32Array(VZ_BARS), vzPeak = new Float32Array(VZ_BARS);
  let vzTD = null, vzL = null, vzR = null, vzFD = null, vzCh = new Float32Array(16), vzChP = new Float32Array(16), vzChN = '';
  const vzW = () => vzMode === 'chan' ? vzChW : (VZ_MODES[vzMode] || 1);
  let vzChW = 12;
  function vzSetup() {
    const c = $('viz'), dpr = Math.max(1, window.devicePixelRatio || 1), w = vzW();
    const h = VZ_TALL[vzMode] || VZ_H;
    c.style.width = w + 'px'; c.style.height = h + 'px';
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    vzBins.fill(0); vzPeak.fill(0); vzCh.fill(0); vzChP.fill(0);
  }
  // colors: quiet → loud (Options / Sound), one pair for all sources (AY and General Sound)
  const VZ_COL = { ay: ['#f0783c', '#ffecaa'] };
  const vzCol = { ay: (load('vizcol.ay') || '').split(',') };
  for (const k in VZ_COL) if (!vzCol[k].every((c) => /^#[0-9a-f]{6}$/i.test(c)) || vzCol[k].length !== 2) vzCol[k] = VZ_COL[k].slice();
  const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
  const mixc = (k, t, a) => { const [p, q] = vzCol[k].map(rgbOf); return 'rgba(' + p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(',') + ',' + (a === undefined ? 1 : a) + ')'; };
  const vzGrad = (k, g, x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, mixc(k, 0, .9)); gr.addColorStop(.6, mixc(k, .55, .95)); gr.addColorStop(1, mixc(k, 1, 1)); return gr; };
  const warm = (g, x0, y0, x1, y1) => vzGrad('ay', g, x0, y0, x1, y1);
  function vzClear(g, W, H) {
    if (vzDecay) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, W, H); g.restore(); }
    else g.clearRect(0, 0, W, H);
  }
  function vzBands(an, nb) { // nb log-spaced bands 50 Hz … 16 kHz, 0..1
    an.getByteFrequencyData(vzFD);
    const ny = audio.ctx.sampleRate / 2, n = vzFD.length;
    for (let b = 0; b < nb; b++) {
      const f0 = 50 * Math.pow(320, b / nb), f1 = 50 * Math.pow(320, (b + 1) / nb);
      const i0 = Math.floor(f0 / ny * n), i1 = Math.max(i0 + 1, Math.ceil(f1 / ny * n));
      let m = 0; for (let i = i0; i < i1 && i < n; i++) m = Math.max(m, vzFD[i]);
      const v = m / 255;
      vzBins[b] = vzDecay ? (v > vzBins[b] ? v : vzBins[b] * 0.86) : v;
      vzPeak[b] = v > vzPeak[b] ? v : Math.max(0, vzPeak[b] - 0.012);
    }
  }
  function drawViz(now) {
    const c = $('viz');
    if (vzMode === 'off' || !audio || !audio.an || muted || isPaused() || turbo) { // muted: no sound, no indicator
      if (vzAlpha > 0) { vzAlpha = 0; c.style.opacity = 0; } return; }
    if (now - vzLast < 30) return; // ~33 fps
    vzLast = now;
    const an = audio.an, g = c.getContext('2d'), H = VZ_TALL[vzMode] || VZ_H;
    if (vzMode === 'chan') { // canvas width follows the number of channels (AY 3/6 + GS 4/8)
      const lv = new Uint8Array(E.memory.buffer, E.web_chan_levels(), 18), key = lv[0] + ':' + lv[1];
      if (key !== vzChN) { vzChN = key; vzChW = (lv[0] + lv[1]) * 4 + (lv[1] ? 4 : 0) - 1; vzSetup(); }
    }
    const W = vzW();
    if (!vzTD) { vzTD = new Float32Array(an.fftSize); vzFD = new Uint8Array(an.frequencyBinCount); vzL = new Float32Array(audio.anL.fftSize); vzR = new Float32Array(audio.anR.fftSize); vzSetup(); }
    an.getFloatTimeDomainData(vzTD);
    let mean = 0; for (let i = 0; i < vzTD.length; i++) mean += vzTD[i];
    mean /= vzTD.length;
    let rms = 0, pk = 0;
    for (let i = 0; i < vzTD.length; i++) { const d = vzTD[i] - mean; rms += d * d; pk = Math.max(pk, Math.abs(d)); }
    rms = Math.sqrt(rms / vzTD.length);
    if (rms > 0.002) vzQuietT = now; // ⅙ s of silence: fade out
    const target = now - vzQuietT < 167 ? 1 : 0;
    vzAlpha += (target - vzAlpha) * (target ? 1 : 0.48);
    c.style.opacity = vzAlpha.toFixed(3);
    if (vzAlpha < 0.01) return;

    if (vzMode === 'spectrum' || vzMode === 'mirror') {
      const nb = VZ_NB[vzMode];
      vzBands(an, nb);
      g.clearRect(0, 0, W, H);
      const bw = W / nb;
      if (vzMode === 'spectrum') {
        g.fillStyle = warm(g, 0, H, 0, 0);
        const w1 = Math.max(0.5, bw - 1);
        for (let b = 0; b < nb; b++) { const bh = Math.max(1, vzBins[b] * (H - 2)); g.fillRect(b * bw, H - bh, w1, bh); }
        if (vzDecay) { g.fillStyle = mixc('ay', 1, .75); for (let b = 0; b < nb; b++) if (vzPeak[b] > 0.04) g.fillRect(b * bw, H - 1 - vzPeak[b] * (H - 2), w1, 1); }
      } else { // mirror: bass in the middle, bars grow up and down from the centre line
        const mid = H / 2, half = W / 2, sw = half / nb;
        g.fillStyle = warm(g, 0, mid, 0, 0);
        for (let b = 0; b < nb; b++) {
          const bh = Math.max(0.5, vzBins[b] * (mid - 1));
          for (const x of [half + b * sw, half - (b + 1) * sw]) g.fillRect(x, mid - bh, Math.max(0.5, sw * 0.5), bh * 2);
        }
      }
    } else if (vzMode === 'scope') {
      vzClear(g, W, H);
      let start = 0; for (let i = 1; i < vzTD.length / 2; i++) if (vzTD[i - 1] < mean && vzTD[i] >= mean) { start = i; break; }
      const k = 0.85 / Math.max(pk, 0.05), mid = H / 2, gr = g.createLinearGradient(0, 0, W, 0);
      gr.addColorStop(0, mixc('ay', .3, .15)); gr.addColorStop(.25, mixc('ay', .3, .95)); gr.addColorStop(.75, mixc('ay', .75, .95)); gr.addColorStop(1, mixc('ay', .75, .15));
      g.lineWidth = 1.2; g.lineJoin = 'round'; g.strokeStyle = gr; g.shadowColor = mixc('ay', .3, .6); g.shadowBlur = 3;
      g.beginPath();
      for (let x = 0; x <= W; x++) {
        const v = (vzTD[(start + Math.floor(x * 512 / W)) % vzTD.length] - mean) * k;
        const y = mid - Math.max(-1, Math.min(1, v)) * (mid - 1.5);
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke(); g.shadowBlur = 0;
    } else if (vzMode === 'chan') { // channel amplitudes: AY A B C (… second chip), then General Sound channels
      const lv = new Uint8Array(E.memory.buffer, E.web_chan_levels(), 18), na = lv[0], ng = lv[1];
      g.clearRect(0, 0, W, H);
      const ayG = vzGrad('ay', g, 0, H, 0, 0), gsG = ayG;
      for (let k = 0; k < na + ng; k++) {
        const v = lv[2 + k] / 15;
        vzCh[k] = vzDecay ? (v > vzCh[k] ? v : vzCh[k] * 0.8) : v;
        vzChP[k] = v > vzChP[k] ? v : Math.max(0, vzChP[k] - 0.02);
        const x = k * 4 + (k >= na ? 4 : 0), bh = Math.max(1, vzCh[k] * (H - 2));
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x, 1, 3, H - 2); // dark track: the bars stay visible on a light border
        g.fillStyle = k < na ? ayG : gsG; g.fillRect(x, H - 1 - bh, 3, bh);
        if (vzDecay && vzChP[k] > 0.05) { g.fillStyle = mixc('ay', 1, .85); g.fillRect(x, H - 2 - vzChP[k] * (H - 2), 3, 1); }
      }
    } else if (vzMode === 'water') { // spectrogram: time runs to the left, low notes at the bottom, loudness as heat color
      const nb = VZ_NB.water, dpr = c.width / W;
      vzBands(an, nb);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'copy';
      g.drawImage(c, -Math.max(1, Math.round(dpr)), 0); g.restore(); // scroll one column
      g.clearRect(W - 1, 0, 1, H);
      const bh = H / nb;
      for (let b = 0; b < nb; b++) {
        const v = Math.min(1, Math.pow(vzBins[b], 1.4) * 1.15);
        if (v < 0.04) continue;
        g.fillStyle = mixc('ay', Math.min(1, v * 1.2), (0.25 + 0.75 * v).toFixed(2));
        g.fillRect(W - 1, H - (b + 1) * bh, 1, bh);
      }
    } else if (vzMode === 'xy') { // goniometer: mid (L+R) up, side (L−R) across — glowing dots with a fading trail
      audio.anL.getFloatTimeDomainData(vzL); audio.anR.getFloatTimeDomainData(vzR);
      vzClear(g, W, H);
      let mL = 0, mR = 0; for (let i = 0; i < vzL.length; i++) { mL += vzL[i]; mR += vzR[i]; }
      mL /= vzL.length; mR /= vzR.length;
      let p = 0.04; for (let i = 0; i < vzL.length; i++) p = Math.max(p, Math.abs(vzL[i] - mL) + Math.abs(vzR[i] - mR));
      const cx = W / 2, cy = H / 2, kx = (W / 2 - 1.5) / p * 1.4, ky = (H / 2 - 1) / p;
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(cx - 0.5, 1, 1, H - 2); g.fillRect(2, cy - 0.5, W - 4, 1);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < vzL.length; i += 3) {
        const l = vzL[i] - mL, r = vzR[i] - mR, side = (l - r), mid = (l + r);
        const x = cx + side * kx, y = cy - mid * ky, d = Math.min(1, Math.abs(mid) / p + Math.abs(side) / p);
        g.fillStyle = mixc('ay', d, .09);
        g.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
      }
      g.restore();
    }
  }
  function bindViz() {
    $('vizsel').value = vzMode; $('vizdecay').checked = vzDecay;
    for (const k of ['ay']) {
      const show = () => { $('vz' + k + '0').value = vzCol[k][0]; $('vz' + k + '1').value = vzCol[k][1]; };
      const set = () => { vzCol[k] = [$('vz' + k + '0').value, $('vz' + k + '1').value]; store('vizcol.' + k, vzCol[k].join(',')); };
      show();
      $('vz' + k + '0').oninput = $('vz' + k + '1').oninput = set;
      $('vz' + k + '_r').onclick = () => { vzCol[k] = VZ_COL[k].slice(); store('vizcol.' + k, ''); show(); };
    }
    $('vizsel').onchange = () => { vzMode = $('vizsel').value; store('viz', vzMode); vzSetup(); };
    $('vizdecay').onchange = () => { vzDecay = $('vizdecay').checked; store('vizdecay', vzDecay ? '1' : '0'); vzSetup(); };
    vzSetup();
    window.addEventListener('resize', () => vzSetup());
  }

  // ------------------------------------------------------------------ run state
  let userPaused = false;   // STOP button / Pause key
  let hiddenPaused = false; // tab is not visible
  let turbo = false;
  const isPaused = () => userPaused || hiddenPaused;

  function applyRunState() {
    const p = isPaused();
    $('pausemark').classList.toggle('show', p);
    setIcon('pause', userPaused ? 'i-play' : 'i-pause');
    $('pause').title = userPaused ? 'Start' : 'Stop';
    $('pause').classList.toggle('on', userPaused);
    if (audio) {
      if (p) { audio.ctx.suspend().catch(() => {}); }
      else if (!dbgOn) { audio.flush(); audio.ctx.resume().catch(() => {}); }
    }
    lastT = performance.now(); frameAcc = 0;
    if (p && !dbgOn) releaseAll();
    if (p) releaseMouse();
  }
  function setUserPaused(v) { userPaused = v; applyRunState(); }
  document.addEventListener('visibilitychange', () => { hiddenPaused = document.hidden; applyRunState(); if (document.hidden && IOS) killAudio(); });
  // Safari: pagehide / pageshow (back-forward cache, app switch) and freeze / resume (Chrome) also mean "not visible"
  window.addEventListener('pagehide', () => { hiddenPaused = true; applyRunState(); if (IOS) killAudio(); });
  window.addEventListener('pageshow', () => { hiddenPaused = document.hidden; applyRunState(); resync(performance.now()); });
  document.addEventListener('freeze', () => { hiddenPaused = true; applyRunState(); });
  document.addEventListener('resume', () => { hiddenPaused = document.hidden; applyRunState(); resync(performance.now()); });

  // ------------------------------------------------------------------ main loop
  let tickEnd = performance.now(), lastT = performance.now(), frameAcc = 0, fpsCount = 0, fpsT = performance.now();
  let sentSinceReport = 0, lastReportSeen = 0, sampAcc = 0, frameN = 882; // frameN: sound samples of the last frame

  // The page was frozen (iOS app switch, locked screen, background tab) without a visibilitychange:
  // nothing is caught up — the machine continues as if it had been paused.
  let resyncUntil = 0;
  function resync(now) {
    lastT = now; frameAcc = 0; sampAcc = 0; resyncUntil = now + 300; fpsCount = 0; fpsT = now;
    if (audio) { audio.flush(); sentSinceReport = 0; lastReportSeen = audio.reportAt; }
  }
  function tick(now) {
    requestAnimationFrame(tick);
    if (!E || switching) { lastT = tickEnd = now; return; }
    // the page was not run for a while (frozen, app switch): only a gap between ticks counts, not a long tick of our own
    if (now - tickEnd > 400) { resync(now); tickEnd = now; return; }
    let dt = now - lastT; lastT = now;
    if (dt > 100) dt = 100;
    if (AS.suspended) { // inside the debugger: wake it up when its Sleep() is over
      if (now >= AS.state.wakeAt) debugResume(true);
      tickEnd = performance.now();
      return;
    }
    let run = 0;
    if (!isPaused()) {
      if (turbo) run = 20;
      // audio-clocked only while the worklet reports in time (stale reports after a freeze would ask for a burst of frames)
      else if (audio && audio.ctx.state === 'running' && now >= resyncUntil && now - audio.reportAt < 250) {
        // the machine runs by the clock in sound samples (a Pentagon frame is 903 samples: 48.8 frames a second), and the
        // queue of sound is only a correction: under 60 ms one more frame, over 180 ms one less. The queue = what the worklet
        // holds + what is on its way to it (sent − received, exact) − what it has played since its report, measured by the
        // audio clock itself (the report's currentTime against the context's now: late reports in Safari do not matter)
        if (audio.reportAt !== lastReportSeen) { lastReportSeen = audio.reportAt; sentSinceReport = 0; }
        const played = audio.repT !== undefined ? Math.max(0, audio.ctx.currentTime - audio.repT) * audio.ctx.sampleRate : (now - audio.reportAt) * audio.ctx.sampleRate / 1000;
        const queued = (audio.sp ? audio.fill : audio.fill + (audio.sent - audio.got) - played) * 1000 / RATE;
        sampAcc += dt * RATE / 1000;
        if (queued < 60) sampAcc += frameN * Math.min(2, Math.ceil((60 - queued) / 20)); // behind: make up (at most 2 frames a refresh)
        else if (queued > 180) sampAcc = Math.min(sampAcc, 0);
        sampAcc = Math.min(sampAcc, 6 * frameN);
        run = Math.max(0, Math.floor(sampAcc / frameN)); sampAcc -= run * frameN;
      } else {
        frameAcc += dt / 20;
        run = Math.min(Math.floor(frameAcc), 6); frameAcc -= Math.floor(frameAcc);
      }
    }
    const t0 = performance.now();
    for (let i = 0; i < run; i++) {
      // a slow device (or a throttled page) must not dig itself in: at most ~30 ms of emulation per screen refresh
      // (measured from the start of this loop: Safari's requestAnimationFrame time can be well before the call, which let only one
      // frame run per refresh — 30 frames a second at a 30 Hz refresh)
      if (i && !turbo && performance.now() - t0 > 30) { if (audio) sampAcc += (run - i) * frameN; break; } // not done: kept for the next refresh
      const r = AS.call('web_frame');
      if (!r.done) { debugDraw(); tickEnd = performance.now(); return; } // stopped in the debugger
      if (r.value > 100) frameN = r.value;
      frameDone(r.value);
    }
    if (run) { render(); coreStatus(now); updLed(); if (pf.timer) pfFrame(performance.now() - t0); }
    else if (isPaused() && ledKey) { ledKey = ''; $('dled').hidden = true; }
    drawViz(now);
    if (now - fpsT >= 1000) {
      // started from a link (no click yet): browsers keep the sound off until the first click / key
      // only while the machine is actually making a sound that cannot be heard
      const sh = muted || isPaused() || !!(audio && audio.ctx.state === 'running') || now - soundAt > 1500;
      if ($('sndhint').hidden !== sh) $('sndhint').hidden = sh; // the page is changed only when something did change
      hudSet('fps', Math.round(fpsCount * 1000 / (now - fpsT)) + ' fps');
      if (E && E.web_gs_auto_fired && E.web_gs_auto_fired()) toast('General Sound on: the program uses it (Options / Sound)');
      fpsCount = 0; fpsT = now;
      if (optOpen() || !$('loadwin').hidden) updateUI(); // drives, HDD, SD rows: only while a window shows them (they are refreshed when it opens)
    }
    tickEnd = performance.now();
  }

  // messages of the core (reset, quick save, CPU halted …): shown as toasts instead of text in the picture
  let statSeq = 0, statLast = '', statT = 0, statBoot = true; // statBoot: the power-on "Reset to …" is not shown
  function coreStatus(now) {
    const seq = E.web_status_seq();
    if (seq === statSeq) return;
    statSeq = seq;
    const t = cstr(E.web_statusline());
    if (statBoot) { statBoot = false; if (/^Reset to/.test(t)) return; }
    if (!t || /^ATM mode/.test(t)) return; // shown next to the XT icon
    const again = t === statLast && now - statT < 1500; // repeated every frame (CPU HALTED): once
    statLast = t; statT = now;
    if (!again) toast(t);
  }
  // disk / tape activity at the top centre: floppy blue = read, red = write; tape: cassette
  let ledKey = '';
  function updLed() {
    const b = new Uint8Array(E.memory.buffer, E.web_led(), 8), kind = b[0];
    const key = String(kind);
    if (key === ledKey) return;
    ledKey = key;
    const el = $('dled');
    el.hidden = !kind;
    if (!kind) return;
    el.className = ['', 'r', 'w', 'w', 's', 't'][kind];
    const ic = $('dledi');
    ic.setAttribute('viewBox', kind === 5 ? '0 0 16 12' : '0 0 12 12');
    ic.querySelector('use').setAttribute('href', kind === 5 ? '#i-tape' : '#i-floppy');
  }
  function frameDone(n) {
    macroFrame(); tmFrame(); runRestoreFrame(); if (pf.timer) pfDisk();
    if (n && (!audio || audio.ctx.state !== 'running') && !muted) soundCheck(n);
    // only into a running context: a suspended / interrupted one (iOS after sleep, before the next touch) does not
    // take the messages off its port — they would pile up (~350 KB/s) until the page is reloaded
    if (!turbo && audio && audio.ctx.state === 'running') { pushAudio(n); if (!audio.sp) sentSinceReport += n; else lastReportSeen = audio.reportAt; }
    fpsCount++;
  }

  // ------------------------------------------------------------------ debugger
  // The C debugger loop runs inside web_frame(); while it waits for input it "sleeps" and
  // Asyncify returns control here. Keys/clicks are queued and the frame is resumed.
  let dbgOn = false, dbgIgnore = null, dbgDown = new Set(), afterDbg = new Set(), dbgCtx = null, dbgImg = null;
  function debugResume(idle) {
    if (!AS.suspended) return;
    const r = AS.resume();
    if (r.done) { frameDone(r.value); render(); lastT = performance.now(); frameAcc = 0; }
    else debugDraw(idle);
  }
  let gfx = null, fc = null, fcVk = false;
  function debugDraw(idle) {
    if (!E.web_debug_active()) return;
    if (!idle && gfx && gfx.open) gfx.refresh(); // memory may have changed (step, edit, load)
    blit(); // the debugger repaints the ZX screen itself (dbgpaint.cpp / mon_scr)
    const c = $('dbgcanvas');
    if (!dbgCtx) { dbgCtx = c.getContext('2d', { alpha: false }); dbgImg = new ImageData(640, 480); }
    dbgImg.data.set(new Uint8ClampedArray(E.memory.buffer, E.web_debug_fb(), 640 * 480 * 4));
    dbgCtx.putImageData(dbgImg, 0, 0);
  }
  function debugEnter() {
    if (!E || AS.suspended || E.web_debug_active()) return;
    releaseMouse();
    releaseAll();
    E.web_debug_enter();
    const r = AS.call('web_frame'); // stops at the first instruction
    if (r.done) { frameDone(r.value); render(); } else debugDraw();
  }
  function debugShown(on) {
    if (on === dbgOn) return;
    dbgOn = on;
    const w = $('dbgwin');
    w.hidden = !on;
    $('dbgbtn').classList.toggle('on', on); toolsUI();
    if (on) { placeDebugWin(); debugDraw(); $('dbgcanvas').focus(); }
    else {
      showDbgHelp(false); if (vkbd) vkbd.releaseAll(); E.web_keys_clear(); held.clear(); afterDbg = new Set(dbgDown); dbgDown.clear(); canvas.focus(); }
    if (audio && !isPaused()) {
      if (on) audio.ctx.suspend().catch(() => {});
      else { audio.flush(); audio.ctx.resume().catch(() => {}); }
    }
    lastT = performance.now(); frameAcc = 0;
  }
  function debugKey(e, down) {
    const sc = SCAN[e.code];
    if (down) dbgDown.add(e.code); else dbgDown.delete(e.code);
    if (!down) {
      if (dbgIgnore === e.code) dbgIgnore = null;
      if (sc !== undefined && E.web_debug_active()) E.web_key(sc, 0, locks(e)); // no key-up for the machine after exit
      return;
    }
    if (dbgIgnore === e.code) return; // the key that opened the debugger is still held
    if (e.code === 'F1' && e.shiftKey) { if (!e.repeat) { dbgDown.delete('F1'); debugClose(); } return; } // Shift+F1 toggles the debugger
    if (dbgAltKey(e)) { debugResume(); return; }
    if (sc !== undefined && !e.repeat) E.web_key(sc, 1, locks(e));
    const ch = e.key.length === 1 ? e.key.charCodeAt(0) : (e.key === 'Enter' ? 13 : e.key === 'Escape' ? 27 : e.key === 'Backspace' ? 8 : e.key === 'Tab' ? 9 : 0);
    E.web_debug_key(e.keyCode, ch < 256 ? ch : 0);
    debugResume();
  }
  // keys the browser takes for itself (tabs, address bar, full screen) have stand-ins in the debugger:
  // Alt+Shift+1…8 = Ctrl+1…8, Alt+Shift+D / F = Alt+D / F, Alt+Shift+H = Ctrl+Tab, Alt+Shift+T = Ctrl+T, Shift+F8 = F11
  function dbgAltKey(e) {
    let mods = null, code = e.code, vk = e.keyCode, ch = 0;
    if (e.altKey && e.shiftKey && !e.ctrlKey && /^Digit[1-8]$/.test(e.code)) { mods = ['ControlLeft']; ch = 0; }
    else if (e.altKey && e.shiftKey && !e.ctrlKey && (e.code === 'KeyD' || e.code === 'KeyF')) mods = ['AltLeft'];
    else if (e.altKey && e.shiftKey && !e.ctrlKey && e.code === 'KeyH') { mods = ['ControlLeft']; code = 'Tab'; vk = 9; }
    else if (e.altKey && e.shiftKey && !e.ctrlKey && e.code === 'KeyT') mods = ['ControlLeft'];
    else if (e.shiftKey && !e.altKey && !e.ctrlKey && e.code === 'F8') { mods = []; code = 'F11'; vk = 122; }
    if (!mods) return false;
    const real = ['ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight'].filter((c) => dbgDown.has(c));
    for (const c of real) E.web_key(SCAN[c], 0, locks(e));
    for (const c of mods) E.web_key(SCAN[c], 1, locks(e));
    E.web_key(SCAN[code], 1, locks(e));
    E.web_debug_key(vk, ch); // the key state is taken now
    E.web_key(SCAN[code], 0, locks(e));
    for (const c of mods) E.web_key(SCAN[c], 0, locks(e));
    for (const c of real) E.web_key(SCAN[c], 1, locks(e));
    return true;
  }
  function debugClose() { // same as pressing Esc in the debugger
    if (!dbgOn) return;
    E.web_key(1, 1, 0); E.web_debug_key(27, 27);
    for (let i = 0; i < 20 && AS.suspended && E.web_debug_active(); i++) debugResume();
    E.web_key(1, 0, 0);
  }
  // floating windows (debugger, its help): drag by the title bar (mouse or finger), position remembered
  // window focus: the last clicked / opened window is on top and has a lighter title bar
  const WINS = []; let actWin = null;
  // the main window (toolbar + screen) is not a floating one: it only shows the focus, the others keep their order
  const setMainAct = (on) => $('mainwin').classList.toggle('wact', !!on);
  function activateWin(w) {
    if (w) setMainAct(false);
    if (actWin === w) return;
    if (actWin) actWin.classList.remove('wact');
    actWin = w || null; if (!w) return;
    w.classList.add('wact');
    WINS.splice(WINS.indexOf(w), 1); WINS.push(w);
    helpZ();
  }
  // a help window always stays just above the window it belongs to (it may lie over it on a narrow screen)
  const HELP_OF = [['dbghelp', 'dbgwin'], ['gfxhelp', 'gfxwin'], ['pfhelp', 'perfwin'], ['rahelp', 'restwin'], ['fchelp', 'fcwin'], ['mainhelp', 'options']];
  function helpZ() {
    WINS.forEach((x, k) => { x.style.zIndex = String(8 + 2 * k); });
    for (const [h, p] of HELP_OF) { const he = $(h), pe = $(p); if (he && pe && pe.style.zIndex) he.style.zIndex = String(+pe.style.zIndex + 1); }
  }
  const topVisibleWin = () => { for (let k = WINS.length - 1; k >= 0; k--) if (!WINS[k].hidden) return WINS[k]; return null; };
  const winOf = (t) => (t && t.nodeType === 1 ? WINS.find((w) => w.contains(t)) : null) || null;
  const inMain = (t) => t && t.nodeType === 1 && $('mainwin').contains(t);
  document.addEventListener('pointerdown', (e) => { const w = winOf(e.target); activateWin(w); if (!w) setMainAct(inMain(e.target)); }, true);
  document.addEventListener('focusin', (e) => { const w = winOf(e.target); if (w) activateWin(w); else if (inMain(e.target)) { activateWin(null); setMainAct(true); } }, true);
  const winObs = new MutationObserver((ms) => {
    for (const m of ms) {
      const w = m.target;
      if (!w.hidden) activateWin(w);
      else if (actWin === w) { w.classList.remove('wact'); actWin = null; activateWin(topVisibleWin()); }
    }
  });
  function registerWin(w) {
    if (WINS.includes(w)) return;
    WINS.push(w); winObs.observe(w, { attributes: true, attributeFilter: ['hidden'] });
    if (!w.hidden) activateWin(w);
  }
  function floatWin(win, key, defPos) {
    registerWin(win);
    const head = win.querySelector('.fhead');
    let pos = null;
    try { const p = JSON.parse(load(key)); if (p && isFinite(p.x) && isFinite(p.y)) pos = p; } catch (e) {}
    function place(free) { // free: dragged by hand — may go past the left edge (60 px stay visible); else fully in view
      const vw = document.documentElement.clientWidth, vh = window.innerHeight, w = win.offsetWidth;
      let { x, y } = pos || defPos();
      x = free ? Math.max(-(w - 60), Math.min(x, vw - 60)) : Math.max(0, Math.min(x, vw - Math.min(w, vw)));
      y = Math.max(0, Math.min(y, vh - 32));
      win.style.left = x + 'px'; win.style.top = y + 'px';
    }
    let drag = null;
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, select, input, label')) return;
      const r = win.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
      head.setPointerCapture(e.pointerId); e.preventDefault();
    });
    head.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      pos = { x: e.clientX - drag.dx, y: e.clientY - drag.dy }; place(true);
    });
    const end = () => { if (!drag) return; drag = null; store(key, JSON.stringify(pos)); };
    head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
    head.addEventListener('dblclick', (e) => { if (e.target.closest('button, select, input, label')) return; pos = null; store(key, ''); place(); });
    window.addEventListener('resize', () => { if (!win.hidden) place(); });
    return { place, setPos(p) { pos = p; store(key, JSON.stringify(pos)); place(); } };
  }
  let dbgFW = null, helpFW = null;
  function placeDebugWin() { dbgFW.place(); }
  function showDbgHelp(v) {
    const h = $('dbghelp');
    if (v && !h.dataset.built) { h.querySelector('.hbody').innerHTML = dbgHelpHtml(); h.dataset.built = '1'; }
    h.hidden = !v; $('dbghelpbtn').classList.toggle('on', v);
    if (v) { // stick to the right side of the debugger, same height
      const r = $('dbgwin').getBoundingClientRect();
      h.style.height = r.height + 'px';
      helpFW.setPos(snapRight(r, h));
    }
  }
  // position for a helper window next to the right edge of its parent (left edge if no room)
  // (no room on either side, e.g. a phone: over the parent, at its right edge)
  // one window resizer for every window with edges (File Commander, its viewer, Graf Search): grips on the 4 edges and
  // 4 corners (CSS .rz), mouse and touch alike. o.minW() / o.minH: the least size; o.fixedW(): width not changed
  // (phone); o.size(w, h): the window applies the size itself (default: style width / height); o.end(rect): saved
  function edgeResize(win, o) {
    o = o || {};
    for (const d of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      const h = document.createElement('div'); h.className = 'rz ' + d; win.appendChild(h);
      let rs = null;
      h.addEventListener('pointerdown', (e) => {
        const r = win.getBoundingClientRect();
        rs = { id: e.pointerId, x: e.clientX, y: e.clientY, l: r.left, t: r.top, w: r.width, h: r.height };
        try { h.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault(); e.stopPropagation();
      });
      h.addEventListener('pointermove', (e) => {
        if (!rs || e.pointerId !== rs.id) return;
        e.preventDefault();
        const dx = e.clientX - rs.x, dy = e.clientY - rs.y, vw = document.documentElement.clientWidth, vh = window.innerHeight;
        const fixW = o.fixedW && o.fixedW(), minW = Math.min(vw - 4, o.minW ? o.minW() : 300), minH = Math.min(vh - 8, o.minH || 180);
        let l = rs.l, t = rs.t, w = rs.w, hh = rs.h;
        if (!fixW && d.includes('e')) w = rs.w + dx;
        if (!fixW && d.includes('w')) w = rs.w - dx;
        if (d.includes('s')) hh = rs.h + dy;
        if (d.includes('n')) hh = rs.h - dy;
        w = Math.max(minW, Math.min(w, vw - 4)); hh = Math.max(minH, Math.min(hh, vh - 8));
        if (!fixW && d.includes('w')) l = rs.l + rs.w - w;
        if (d.includes('n')) t = rs.t + rs.h - hh;
        if (o.size) o.size(w, hh); else { if (!fixW) win.style.width = w + 'px'; win.style.height = hh + 'px'; }
        if ((!fixW && d.includes('w')) || d.includes('n')) { win.style.left = l + 'px'; win.style.top = t + 'px'; }
      });
      const end = () => { if (!rs) return; rs = null; if (o.end) o.end(win.getBoundingClientRect()); };
      h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end); h.addEventListener('lostpointercapture', end);
    }
  }
  function snapRight(r, w) {
    const vw = document.documentElement.clientWidth, ww = w.offsetWidth;
    let x = r.right - 1;
    if (x + ww > vw) x = r.left - ww + 1 >= 0 ? r.left - ww + 1 : Math.max(0, Math.min(r.right - ww, vw - ww));
    return { x, y: r.top };
  }
  function toolsMenu(v) { $('toolspop').classList.toggle('open', v); $('toolsbtn').classList.toggle('open', v); }
  function toolsUI() {} // the Tools button keeps one color; the menu items show what is open
  // Graf Search: the floppy images in the drives (TRD; iS-DOS disks as ISD)
  function gfxDisks() {
    const out = [];
    for (let d = 0; d < NDRIVES; d++) if (E && E.web_disk_present(d)) out.push({ drive: d, label: DRV[d] + ': ' + (drives[d] ? drives[d].name : cstr(E.web_disk_name(d)).replace(/^.*[\\/]/, '')) });
    return out;
  }
  function gfxDiskBytes(d) {
    if (!E || !E.web_disk_present(d)) return null;
    const T = UnrealFC._test;
    if (E.web_disk_peek_isd) {
      setName('__gfx.isd');
      if (E.web_disk_peek_isd(d)) { const img = new Uint8Array(fs.read('__gfx.isd')); try { fs.remove('__gfx.isd'); } catch (e) {} if (T.looksIsdos(img)) return img; }
    }
    setName('__gfx.trd');
    if (!E.web_disk_peek_trd(d)) return null;
    const img = new Uint8Array(fs.read('__gfx.trd')); try { fs.remove('__gfx.trd'); } catch (e) {}
    return img;
  }
  function bindDebugger() {
    const w = $('dbgwin'), c = $('dbgcanvas');
    dbgFW = floatWin(w, 'dbgpos', () => {
      const r = $('screenwrap').getBoundingClientRect(), vw = document.documentElement.clientWidth;
      let x = r.right + 12; if (x + w.offsetWidth > vw) x = vw - w.offsetWidth - 8;
      return { x, y: Math.max(8, r.top) };
    });
    const h = $('dbghelp');
    helpFW = floatWin(h, 'dbghelppos', () => {
      const r = w.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      let x = r.left - h.offsetWidth - 8, y = r.top;
      if (x < 0) { x = Math.max(0, Math.min(r.left + 24, vw - h.offsetWidth)); y = r.top + 32; }
      return { x, y };
    });
    $('dbgbtn').onclick = () => { toolsMenu(false); if (dbgOn) debugClose(); else debugEnter(); };
    $('dbgclose').onclick = (e) => { e.stopPropagation(); debugClose(); };
    $('dbghelpbtn').onclick = (e) => { e.stopPropagation(); showDbgHelp(h.hidden); c.focus(); };
    $('dbghelpclose').onclick = () => { showDbgHelp(false); c.focus(); };
    gfx = UnrealGfx.create({ E: () => E, floatWin, edgeResize, load, store, snapRight, live: () => !AS.suspended, disks: gfxDisks, diskBytes: gfxDiskBytes, view: (f, t, m, go) => fc && fc.view(f, t, m, go), onToggle: () => toolsUI(), onClose: () => (dbgOn ? c : canvas).focus() });
    $('gfxbtn').onclick = () => { toolsMenu(false); releaseMouse(); gfx.show(!gfx.open); toolsUI(); };
    fc = UnrealFC.create({ E: () => E, fs, setName, floatWin, edgeResize, snapRight, load, store, download: downloadBytes, askBox,
      insert: (name, d) => { if (d >= 0) E.web_disk_mark(d, 0); return insertFromFs(name, d, true); }, // FC writes the disk back: no "save the changed disk?" question
      diskName: (d) => drives[d] ? drives[d].name : cstr(E.web_disk_name(d)),
      hddName: (d) => hdds[d], hddParts: (d) => hddGeom(d).parts || null, hddGeo: (d) => hddGeom(d), sdName: () => sdName, sdTouch: () => { sdDirty = true; sdUI(); }, sdNew: async (name, bytes) => { await sdFromBytes(name, bytes); sdDirty = true; sdUI(); }, hddTouch: (d) => { hddDirty[d] = true; hddUI(); }, hddNew: async (d, name, bytes) => { await hddFromBytes(d, name, bytes); hddDirty[d] = true; hddUI(); }, zip: (files) => UnrealZip.create(files), hddRemount: (d) => { hddDirty[d] = true; hddMount(d); hddUI(); },
      onClose: () => canvas.focus(), run: fcRun, mountDisk: async (name, data, d) => { const before = drives[d]; await putAndInsert(name, data, d); return drives[d] !== before; }, graf: (name, data) => { gfx.showFile(name, data); toolsUI(); } });
    $('fcbtn').onclick = () => { toolsMenu(false); releaseMouse(); fc.show(!fc.open); fcVk = fc.open; };
    // which window the on-screen keyboard types into: File Commander after a touch inside it, the machine after a touch on the screen
    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#fcwin, #fvwin, #fewin')) fcVk = true;
      else if (e.target.closest('#screenwrap, #toolbar')) fcVk = false;
    }, true);
    // Tools: one toolbar button with a small drop-down (Debugger, Graf Search, File Commander)
    $('toolsbtn').onclick = (e) => { e.stopPropagation(); toolsMenu(!$('toolspop').classList.contains('open')); };
    $('toolspop').addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => { if ($('toolspop').classList.contains('open')) { toolsMenu(false); canvas.focus(); } });
    const click = (e, right) => {
      e.preventDefault(); c.focus();
      if (!dbgOn) return;
      const r = c.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) * 640 / r.width), y = Math.floor((e.clientY - r.top) * 480 / r.height);
      E.web_debug_click(Math.max(0, Math.min(639, x)), Math.max(0, Math.min(479, y)), right ? 1 : 0);
      debugResume();
    };
    c.addEventListener('mousedown', (e) => { if (e.button === 0) click(e, false); });
    c.addEventListener('contextmenu', (e) => click(e, true));
  }

  // ------------------------------------------------------------------ debugger dialogs (HTML windows instead of the Win32 ones)
  // The C side calls env.web_ui(what) (dbgbpx.cpp, dbglabls.cpp, dbgrwdlg.cpp, web_emulkeys.cpp); data goes through web_txt().
  const txtPut = (s) => { const b = new TextEncoder().encode(s), p = E.web_txt(); const m = new Uint8Array(E.memory.buffer, p, 65536); const n = Math.min(b.length, 65535); m.set(b.subarray(0, n)); m[n] = 0; };
  const txtGet = (p) => { const m = new Uint8Array(E.memory.buffer, p, 65536); let n = 0; while (n < 65536 && m[n]) n++; return new TextDecoder('latin1').decode(m.subarray(0, n)); };
  const hex4 = (v) => (v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  const parseNum = (s) => { s = String(s).trim(); let m;
    if ((m = s.match(/^(?:#|\$|0x)([0-9a-f]+)$/i)) || (m = s.match(/^([0-9a-f]+)h$/i))) return parseInt(m[1], 16);
    if (/^\d+$/.test(s)) return parseInt(s, 10); return NaN; };
  const parseHex = (s) => { s = String(s).trim().replace(/^(#|\$|0x)/i, '').replace(/h$/i, ''); return /^[0-9a-f]{1,4}$/i.test(s) ? parseInt(s, 16) : NaN; };
  const escH = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // Unreal expressions take bare hex numbers (a leading 0 when it starts with a letter): #C000, $C000, 0xC000, C000h → 0C000
  const exprFix = (s) => s.replace(/(?:#|\$|0x)([0-9a-f]+)\b/gi, '0$1').replace(/\b([0-9][0-9a-f]*|[a-f][0-9a-f]*)h\b/gi, '0$1');
  function dbgRefresh() { if (E && E.web_debug_active() && AS.suspended) { E.web_debug_key(0x87, 0); debugResume(); } } // F24: no action, the debugger repaints
  let ddKind = '';
  function dlgOpen(kind, title, html, wide) {
    ddKind = kind;
    const w = $('dbgdlg');
    $('ddtitle').textContent = title; $('ddbody').innerHTML = html;
    w.classList.toggle('wide', wide === true); w.classList.toggle('narrow', wide === 'narrow');
    fwinShow('dbgdlg', true);
  }
  function dlgClose() { $('dbgdlg').hidden = true; ddKind = ''; if (dbgOn) $('dbgcanvas').focus(); else canvas.focus(); }
  function dlgMsg(t, err) { const m = $('ddmsg'); if (m) { m.textContent = t || ''; m.classList.toggle('err', !!err); } }
  function webUi(p) {
    const what = txtGet(p);
    setTimeout(() => { try { dbgUi(what); } catch (e) { console.log(e.stack); toast(e.message, true); } }, 0);
  }
  function dbgUi(what) {
    if (what.startsWith('download:')) { const n = what.slice(9).replace(/^.*[\\/]/, ''); const d = fs.exists(n) ? fs.read(n) : null; if (d) { downloadBytes(n, d.slice()); toast('Downloaded: ' + n); } else toast('No file ' + n, true); return; }
    switch (what) {
      case 'bp': return bpDialog();
      case 'watch': return watchDialog();
      case 'labels': return labelsDialog();
      case 'search': return searchDialog();
      case 'poke': return pokeDialog();
      case 'tape': return tapeDialog();
      case 'loadblock': return loadBlockDialog();
      case 'help': return showDbgHelp(true);
      case 'load': return showLoad();
      case 'save': return openSave();
      case 'options': return showOptions(true);
    }
  }
  // ---- breakpoints (Alt+C): conditions, execution ranges, memory access ranges; kept in the browser
  function bpStore() { try { store('dbg.bp', txtGet(E.web_bp_get())); } catch (e) {} }
  function bpRestore() { // after a start: the breakpoints of the last session
    const t = load('dbg.bp'); if (!t || !E || !E.web_bp_get) return;
    for (const ln of t.split('\n')) {
      const f = ln.split('\t');
      if (f[0] === 'c' && f[1]) { txtPut(f[1]); E.web_bp_add_cond(); }
      else if (f[0] === 'x') E.web_bp_range(parseInt(f[1], 16), parseInt(f[2], 16), 1, 1);
      else if (f[0] === 'm') E.web_bp_range(parseInt(f[1], 16), parseInt(f[2], 16), (/R/.test(f[3]) ? 2 : 0) | (/W/.test(f[3]) ? 4 : 0), 1);
    }
  }
  function bpLists() {
    const c = [], x = [], m = [];
    for (const ln of txtGet(E.web_bp_get()).split('\n')) { const f = ln.split('\t'); if (f[0] === 'c') c.push(f[1]); else if (f[0] === 'x') x.push(f); else if (f[0] === 'm') m.push(f); }
    const opt = (v, t) => `<option value="${escH(v)}">${escH(t)}</option>`;
    $('bpc').innerHTML = c.map((e, i) => opt(i, e)).join('');
    $('bpx').innerHTML = x.map((f) => opt(f[1] + '-' + f[2], f[1] === f[2] ? f[1] : f[1] + '-' + f[2])).join('');
    $('bpm').innerHTML = m.map((f) => opt(f[1] + '-' + f[2] + '-' + f[3], (f[1] === f[2] ? f[1] : f[1] + '-' + f[2]) + '  ' + f[3])).join('');
  }
  const rangeOf = (s) => { const m = String(s).trim().match(/^([#$]?[0-9a-f]{1,4}h?)(?:\s*-\s*([#$]?[0-9a-f]{1,4}h?))?$/i); if (!m) return null; const a = parseHex(m[1]), b = m[2] ? parseHex(m[2]) : a; return isNaN(a) || isNaN(b) || a > b ? null : [a, b]; };
  function bpDialog() {
    dlgOpen('bp', 'Breakpoints', `
      <section><h3>Conditions</h3>
        <select id="bpc" size="4" class="ddlist"></select>
        <div class="ldrow"><input id="bpce" placeholder="PC==#8000 &amp;&amp; A==3" spellcheck="false" autocomplete="off"><button id="bpcadd">Add</button><button id="bpcdel">Delete</button></div>
        <p class="note">Registers A…IY, AF'…L', I, R; numbers are hex (#C000 = $C000 = 0C000); M addr = byte at addr, a-&gt;b = byte at a+b; OUT / IN = port of last out / in, VAL = its value, DOS = TR-DOS on, FD = #7FFD; == != &lt; &gt; &lt;= &gt;= &amp;&amp; || + - * / % &amp; | ^ ~ ! ( )</p></section>
      <section><h3>Execution</h3>
        <select id="bpx" size="4" class="ddlist"></select>
        <div class="ldrow"><input id="bpxe" placeholder="8000 or 8000-80FF" spellcheck="false" autocomplete="off"><button id="bpxadd">Add</button><button id="bpxdel">Delete</button></div></section>
      <section><h3>Memory access</h3>
        <select id="bpm" size="4" class="ddlist"></select>
        <div class="ldrow"><input id="bpme" placeholder="5B00-5BFF" spellcheck="false" autocomplete="off"><label class="lddrv"><input type="checkbox" id="bpmr">R</label><label class="lddrv"><input type="checkbox" id="bpmw" checked>W</label><button id="bpmadd">Add</button><button id="bpmdel">Delete</button></div></section>
      <p class="note" id="ddmsg"></p>`);
    bpLists();
    const done = (msg) => { bpLists(); bpStore(); dbgRefresh(); dlgMsg(msg || ''); };
    $('bpcadd').onclick = () => { const v = $('bpce').value.trim(); if (!v) return; txtPut(exprFix(v)); const r = E.web_bp_add_cond(); if (r === 1) { $('bpce').value = ''; done(); } else dlgMsg(r < 0 ? 'No room: 16 conditions at most' : 'Error in the expression', true); };
    $('bpcdel').onclick = () => { const s = $('bpc'); if (s.selectedIndex < 0) return; $('bpce').value = s.options[s.selectedIndex].textContent; E.web_bp_del_cond(+s.value); done(); };
    $('bpxadd').onclick = () => { const r = rangeOf($('bpxe').value); if (!r) { dlgMsg('Address or range: 8000 or 8000-80FF (hex)', true); return; } E.web_bp_range(r[0], r[1], 1, 1); $('bpxe').value = ''; done(); };
    $('bpxdel').onclick = () => { const s = $('bpx'); if (s.selectedIndex < 0) return; const [a, b] = s.value.split('-'); $('bpxe').value = s.options[s.selectedIndex].textContent; E.web_bp_range(parseInt(a, 16), parseInt(b, 16), 1, 0); done(); };
    $('bpmadd').onclick = () => { const r = rangeOf($('bpme').value), k = ($('bpmr').checked ? 2 : 0) | ($('bpmw').checked ? 4 : 0); if (!r || !k) { dlgMsg(!r ? 'Address or range: 5B00 or 5B00-5BFF (hex)' : 'Choose R and / or W', true); return; } E.web_bp_range(r[0], r[1], k, 1); $('bpme').value = ''; done(); };
    $('bpmdel').onclick = () => { const s = $('bpm'); if (s.selectedIndex < 0) return; const [a, b, f] = s.value.split('-'); $('bpme').value = a === b ? a : a + '-' + b; $('bpmr').checked = /R/.test(f); $('bpmw').checked = /W/.test(f); E.web_bp_range(parseInt(a, 16), parseInt(b, 16), 6, 0); done(); };
    for (const [l, b] of [['bpc', 'bpcdel'], ['bpx', 'bpxdel'], ['bpm', 'bpmdel']]) $(l).ondblclick = () => $(b).click(); // as in Unreal: double click takes it back for editing
    for (const [i, b] of [['bpce', 'bpcadd'], ['bpxe', 'bpxadd'], ['bpme', 'bpmadd']]) $(i).onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); $(b).click(); } };
  }
  // ---- watches (Alt+O)
  function watchDialog() {
    const ls = txtGet(E.web_watch_get()).split('\n');
    let h = '<section><h3>On-screen watches (Alt+S)</h3>';
    for (let i = 0; i < 4; i++) { const f = (ls[i] || '0\t').split('\t'); h += `<div class="ldrow"><label class="lddrv"><input type="checkbox" id="ww${i}" ${f[0] === '1' ? 'checked' : ''}>${i + 1}</label><input id="we${i}" value="${escH(f[1] || '')}" placeholder="expression, e.g. M HL or IX->5" spellcheck="false" autocomplete="off"></div>`; }
    const t = (ls[4] || 't\t0\t0').split('\t');
    h += `</section><section><h3>Trace</h3><div class="ldrow"><label class="lddrv"><input type="checkbox" id="wtram" ${t[1] === '1' ? 'checked' : ''}>RAM</label><label class="lddrv"><input type="checkbox" id="wtrom" ${t[2] === '1' ? 'checked' : ''}>ROM</label></div></section>
      <div class="ldrow"><span class="note" id="ddmsg" style="flex:1"></span><button id="wapply" class="primary">Apply</button></div>`;
    dlgOpen('watch', 'Watches', h);
    $('wapply').onclick = () => {
      const bad = [];
      for (let i = 0; i < 4; i++) { const on = $('ww' + i).checked; txtPut(exprFix($('we' + i).value)); if (!E.web_watch_set(i, on ? 1 : 0)) { bad.push(i + 1); $('ww' + i).checked = false; } }
      E.web_trace_set($('wtram').checked ? 1 : 0, $('wtrom').checked ? 1 : 0);
      dbgRefresh();
      if (bad.length) dlgMsg('Error in the expression of watch ' + bad.join(', '), true); else dlgClose();
    };
  }
  // ---- labels (Ctrl+J): list, go to, load a labels file from the computer
  let lblAll = [];
  function labelsDialog() {
    dlgOpen('labels', 'Labels', `
      <div class="ldrow"><input id="lblf" placeholder="filter" spellcheck="false" autocomplete="off"></div>
      <select id="lbll" size="14" class="ddlist mono"></select>
      <div class="ldrow"><button id="lblgo" class="primary" title="Disassembler at the label (Enter, double click)">Go</button><button id="lblmem" title="Memory dump at the label">Dump</button><span style="flex:1"></span><button id="lblload" title="Unreal .l (xxxx name / bb:xxxx name), sjasmplus .sym / .lab, name EQU addr">Load file…</button><button id="lblclr" title="Remove the labels of RAM">Clear</button></div>
      <p class="note" id="ddmsg"></p>`, 'narrow');
    const fill = () => {
      const f = $('lblf').value.trim().toLowerCase();
      const rows = lblAll.filter((r) => !f || r[1].toLowerCase().includes(f) || r[0].toLowerCase().startsWith(f)).slice(0, 3000);
      $('lbll').innerHTML = rows.map((r) => `<option value="${escH(r[0])}">${escH(r[0].padEnd(8))} ${escH(r[1])}</option>`).join('');
      if (rows.length) $('lbll').selectedIndex = 0;
      dlgMsg(lblAll.length + ' labels' + (f ? ', ' + rows.length + ' shown' : '') + '. Other pages: page:offset (not mapped now)');
    };
    const reload = () => { const n = E.web_lbl_get(); lblAll = txtGet(E.web_txt()).split('\n').filter(Boolean).map((l) => l.split('\t')); fill(); return n; };
    reload();
    const go = (mem) => { const v = $('lbll').value; if (!/^[0-9A-F]{4}$/.test(v)) { dlgMsg(v ? 'This label is not in the mapped memory now' : '', true); return; } E.web_dbg_goto(parseInt(v, 16), mem ? 1 : 0); dbgRefresh(); };
    $('lblf').oninput = fill;
    $('lblf').onkeydown = (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); $('lbll').focus(); } if (e.key === 'Enter') { e.preventDefault(); go(false); } };
    $('lbll').ondblclick = () => go(false);
    $('lbll').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(false); } };
    $('lblgo').onclick = () => go(false); $('lblmem').onclick = () => go(true);
    $('lblclr').onclick = () => { E.web_lbl_clear(); reload(); dbgRefresh(); };
    $('lblload').onclick = () => pickFile('.l,.sym,.lab,.txt,.lbl,.map', async (name, b) => {
      const r = labelsToUnreal(new TextDecoder('latin1').decode(b));
      fs.write('user.l', new TextEncoder().encode(r.text));
      const n = E.web_lbl_user(); reload(); dbgRefresh();
      dlgMsg(name + ': ' + n + ' labels loaded' + (r.skipped ? ', ' + r.skipped + ' skipped (ROM or not mapped)' : ''), !n);
    });
  }
  // a labels file → Unreal user.l ("bb:xxxx name"): Unreal lines as they are; "name EQU addr", "name = addr", "name: addr",
  // "addr name" with a Z80 address go to the RAM page mapped at that address now
  function labelsToUnreal(t) {
    const out = []; let skipped = 0;
    const page = (a) => E.web_bank_page(a >> 14);
    const z80 = (a, name) => { const p = page(a); if (p < 0) { skipped++; return; } out.push(p.toString(16).toUpperCase().padStart(2, '0') + ':' + hex4(a & 0x3FFF) + ' ' + name); };
    for (let ln of t.split(/\r?\n/)) {
      ln = ln.replace(/;.*$/, '').trim(); if (!ln) continue;
      let m;
      if ((m = ln.match(/^([0-9a-f]{2}):([0-9a-f]{4})\s+(\S+)/i))) { out.push(m[1].toUpperCase() + ':' + m[2].toUpperCase() + ' ' + m[3]); continue; }
      if ((m = ln.match(/^([A-Za-z_.@?$!][\w.@?$!]*)\s*:?\s*(?:equ|=|defl)\s*([#$]|0x|%)?([0-9a-f]+)(h)?\b/i)) && m[2] !== '%') { z80(parseInt(m[3], m[2] || m[4] || /[a-f]/i.test(m[3]) || m[3].length >= 4 ? 16 : 10) & 0xFFFF, m[1].replace(/:$/, '')); continue; }
      if ((m = ln.match(/^([A-Za-z_.@?$!][\w.@?$!]*):?\s+(?:#|\$|0x)?([0-9a-f]{4})h?$/i))) { z80(parseInt(m[2], 16), m[1]); continue; }
      if ((m = ln.match(/^(?:#|\$|0x)?([0-9a-f]{4})h?:?\s+([A-Za-z_.@?$!][\w.@?$!]*)$/i))) { z80(parseInt(m[1], 16), m[2]); continue; }
    }
    return { text: out.join('\n') + '\n', skipped };
  }
  function pickFile(accept, cb) {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
    i.onchange = async () => { const f = i.files[0]; if (f) try { await cb(f.name, new Uint8Array(await f.arrayBuffer())); } catch (e) { toast(f.name + ': ' + e.message, true); } };
    i.click();
  }
  // ---- memory search (Alt+F6): values in the whole RAM, as the cheat finder of Unreal
  const srch = { mask: null, last: null, n: -1 };
  function searchDialog() {
    dlgOpen('search', 'Memory search', `
      <div class="ldrow"><input id="srv" placeholder="value (dec, or hex: #A0)" spellcheck="false" autocomplete="off"><label class="lddrv"><input type="checkbox" id="srw">word</label></div>
      <div class="ldrow"><button id="srnew" title="Start again: every byte of RAM is a candidate">New</button><button id="sreq" class="primary">= value</button><button id="srinc" title="Bigger than at the last step">Increased</button><button id="srdec" title="Smaller than at the last step">Decreased</button><button id="srsame" title="Same as at the last step">Same</button></div>
      <select id="srl" size="10" class="ddlist mono"></select>
      <div class="ldrow"><input id="srset" placeholder="new value" spellcheck="false" autocomplete="off"><button id="srpoke" title="Write the value at the selected address">Set</button><button id="srgo" title="Memory dump at the address (when mapped)">Dump</button></div>
      <p class="note" id="ddmsg"></p>`);
    const ramKB = +(siData().ram || 128), size = ramKB * 1024;
    const ram = () => new Uint8Array(E.memory.buffer, E.web_gfx_mem(1, 0, 0), size);
    const word = () => $('srw').checked;
    const rd = (m, i) => (word() ? m[i] | (m[i + 1] << 8) : m[i]);
    const show = () => {
      const m = ram(), rows = [];
      if (srch.mask) for (let i = 0; i < size && rows.length < 300; i++) if (srch.mask[i]) rows.push(i);
      const z80 = (i) => { const p = i >> 14; for (let b = 0; b < 4; b++) if (E.web_bank_page(b) === p) return b * 0x4000 + (i & 0x3FFF); return -1; };
      $('srl').innerHTML = rows.map((i) => { const z = z80(i); return `<option value="${i}">${(i >> 14).toString(16).toUpperCase().padStart(2, '0')}:${hex4(i & 0x3FFF)}  ${z >= 0 ? hex4(z) : '----'}  = ${rd(m, i)}</option>`; }).join('');
      dlgMsg(srch.n < 0 ? 'New search: ' + ramKB + ' KB of RAM. Change the value in the program, then narrow down.' : srch.n + ' found' + (srch.n > 300 ? ' (first 300 shown)' : '') + '. page:offset, Z80 address when mapped');
    };
    const step = (test) => {
      const m = ram();
      if (!srch.mask || srch.mask.length !== size) { srch.mask = new Uint8Array(size).fill(1); srch.n = -1; }
      if (test) { let n = 0; const last = srch.last; for (let i = 0; i < size - (word() ? 1 : 0); i++) if (srch.mask[i]) { if (test(rd(m, i), last ? rd(last, i) : 0)) n++; else srch.mask[i] = 0; } if (word()) srch.mask[size - 1] = 0; srch.n = n; }
      srch.last = m.slice(); show();
    };
    $('srnew').onclick = () => { srch.mask = null; srch.n = -1; step(null); };
    $('sreq').onclick = () => { const v = parseNum($('srv').value); if (isNaN(v)) { dlgMsg('Value: decimal, or hex as #A0 / $A0 / 0xA0', true); return; } step((x) => x === (v & (word() ? 0xFFFF : 0xFF))); };
    $('srinc').onclick = () => { if (!srch.last) { dlgMsg('Press New first, then change the value in the program', true); return; } step((x, o) => x > o); };
    $('srdec').onclick = () => { if (!srch.last) { dlgMsg('Press New first, then change the value in the program', true); return; } step((x, o) => x < o); };
    $('srsame').onclick = () => { if (!srch.last) { dlgMsg('Press New first', true); return; } step((x, o) => x === o); };
    $('srpoke').onclick = () => { const i = +$('srl').value, v = parseNum($('srset').value); if ($('srl').selectedIndex < 0 || isNaN(v)) return; const m = ram(); m[i] = v & 255; if (word()) m[i + 1] = (v >> 8) & 255; show(); dbgRefresh(); };
    $('srgo').onclick = () => { const o = $('srl').selectedOptions[0]; if (!o) return; const z = o.textContent.split(/\s+/)[1]; if (/^[0-9A-F]{4}$/.test(z)) { E.web_dbg_goto(parseInt(z, 16), 1); dbgRefresh(); } else dlgMsg('This page is not mapped now', true); };
    show();
  }
  // ---- pokes (Alt+P): "address,value" pairs as in Unreal (decimal; hex with # $ 0x)
  function pokeDialog() {
    dlgOpen('poke', 'Pokes', `
      <textarea id="pkt" rows="4" class="ddarea" spellcheck="false" placeholder="35136,0; 35137,201  or  #8940,#C9"></textarea>
      <div class="ldrow"><span class="note" id="ddmsg" style="flex:1">address,value pairs (separated by space , ; :)</span><button id="pkgo" class="primary">Poke</button></div>`);
    $('pkt').value = load('dbg.poke') || '';
    $('pkgo').onclick = () => {
      const tok = $('pkt').value.split(/[\s,;:]+/).filter(Boolean), pairs = [];
      if (tok.length % 2) { dlgMsg('Incorrect format: an address without a value', true); return; }
      for (let i = 0; i < tok.length; i += 2) { const a = parseNum(tok[i]), v = parseNum(tok[i + 1]); if (isNaN(a) || a < 0x4000 || a > 0xFFFF || isNaN(v) || v > 255) { dlgMsg('Incorrect: ' + tok[i] + ',' + tok[i + 1] + ' (address 16384…65535, value 0…255)', true); return; } pairs.push([a, v]); }
      for (const [a, v] of pairs) E.web_poke(a, v);
      store('dbg.poke', $('pkt').value); dbgRefresh(); dlgMsg(pairs.length + ' pokes done');
    };
  }
  // ---- tape browser (Shift+F7)
  function tapeDialog() {
    dlgOpen('tape', 'Tape', `
      <select id="tpl" size="12" class="ddlist mono"></select>
      <div class="ldrow"><button id="tpset" class="primary" title="Next block to play (double click)">Set position</button><button id="tpplay">Play / Stop</button><span style="flex:1"></span><span class="note" id="ddmsg"></span></div>`, true);
    const fill = () => { const cur = E.web_tape_list(), ls = txtGet(E.web_txt()).split('\n').filter((l, i, a) => i < a.length - 1 || l);
      $('tpl').innerHTML = cur < 0 ? '' : ls.map((l, i) => `<option value="${i}">${i === cur ? '▶ ' : '  '}${escH(l)}</option>`).join('');
      if (cur >= 0) $('tpl').selectedIndex = cur;
      dlgMsg(cur < 0 ? 'No tape loaded' : (E.web_tape_playing() ? 'playing' : 'stopped')); };
    fill();
    $('tpset').onclick = () => { if ($('tpl').selectedIndex >= 0) { E.web_tape_set(+$('tpl').value); fill(); dbgRefresh(); } };
    $('tpl').ondblclick = () => $('tpset').click();
    $('tpplay').onclick = () => { E.web_tape(); fill(); };
  }
  // ---- load a block (Alt+R → from binary file): a file from the computer into memory
  function loadBlockDialog() {
    const a0 = txtGet(E.web_txt()).trim() || '8000';
    dlgOpen('loadblock', 'Load block', `
      <div class="ldrow"><button id="lbfile">Choose File…</button><b id="lbname" class="lbname">— no file —</b></div>
      <div class="ldrow"><span class="lddrv">address</span><input id="lbaddr" value="${escH(a0)}" spellcheck="false" autocomplete="off"><span class="lddrv">offset in file</span><input id="lboff" value="0" spellcheck="false" autocomplete="off"></div>
      <div class="ldrow"><span class="note" id="ddmsg" style="flex:1"></span><button id="lbgo" class="primary" disabled>Load</button></div>`);
    let data = null;
    $('lbfile').onclick = () => pickFile('', (name, b) => { data = b; $('lbname').textContent = name + ' · ' + b.length + ' bytes'; $('lbgo').disabled = false; });
    $('lbgo').onclick = () => {
      const a = parseHex($('lbaddr').value), off = parseNum($('lboff').value || '0');
      if (isNaN(a)) { dlgMsg('Address in hex: 8000', true); return; }
      if (isNaN(off) || off >= data.length) { dlgMsg('Offset beyond the file', true); return; }
      const n = Math.min(data.length - off, 0x10000 - a);
      for (let i = 0; i < n; i++) E.web_poke(a + i, data[off + i]);
      dbgRefresh(); dlgMsg('Loaded ' + n + ' bytes to ' + hex4(a) + '–' + hex4(a + n - 1) + (n < data.length - off ? ' (cut at FFFF)' : ''));
    };
  }

  // debugger key reference (only what works in the web version)
  const DBG_HELP = [
    ['General', [
      ['Run', [
        ['Shift+F1 / Esc', 'exit debugger'], ['F7', 'step'], ['F8', 'step over'],
        ['F11 or Shift+F8', 'run to return'], ['F6', 'breakpoints on range'], ['Shift+F6', 'clear range']]],
      ['Windows', [
        ['Tab / Shift+Tab', 'next / prev window'], ['Alt+D or Alt+Shift+D', 'dump 8 / 32 bytes'],
        ['Ctrl+D', 'dump: mem / CMOS / NVRAM'], ['Alt+S', 'watches / screen / ray-painted'],
        ['Ctrl+U', 'user watch address'], ['Alt+Y', 'active AY'], ['Ctrl+`', 'next CPU']]],
      ['Dialogs', [
        ['Alt+C', 'breakpoints: conditions, execution, memory R/W (kept in browser)'], ['Alt+O', 'watches setup'],
        ['Ctrl+J', 'labels: list, go to, load file (.l, .sym)'], ['Alt+F6', 'memory search (cheats)'], ['Alt+P', 'pokes'],
        ['Shift+F7', 'tape browser'], ['F1', 'this help'], ['F2 / F3', 'Save / Load window'], ['Alt+F1', 'Options']]],
      ['Screen (any key returns)', [
        ['F9', 'video memory'], ['Shift+F9', 'shadow screen'], ['Alt+F9', 'ray-painted']]],
      ['Memory & ports', [
        ['Alt+R', 'load block: binary file from computer, TR-DOS sectors'], ['Alt+W', 'save block: binary / disassembly downloaded, TR-DOS file or sectors'],
        ['Alt+F or Alt+Shift+F', 'fill block'], ['Alt+B', 'out #7FFD'], ['Alt+M', 'out extended memory port'], ['Alt+T', 'ripper (result downloaded)']]],
      ['Reset & NMI', [
        ['F12', 'reset'], ['Shift+F12', 'BASIC 48'], ['Alt+Shift+F12', 'BASIC 48, 128K locked'],
        ['Ctrl+Shift+F12', 'BASIC 128'], ['Ctrl+F12', 'TR-DOS'], ['Alt+F12', 'service ROM'], ['Alt+Ctrl+F12', 'cache'],
        ['Alt+Shift+F11', 'NMI'], ['Ctrl+F11', 'TR-DOS magic'], ['Alt+F11', 'NMI to cache']]],
      ['Snapshots*', [
        ['Alt / Ctrl / Shift+F2', 'quick save 1/2/3'], ['Alt / Ctrl / Shift+F3', 'quick load 1/2/3']]],
    ]],
    ['Registers', [[null, [
      ['←→↑↓', 'select'], ['Enter', 'edit'], ['Ctrl+A / Ctrl+F', 'A / flags'], ['Ctrl+B / Ctrl+D', 'BC / DE'],
      ['H P S X Y', 'HL, PC, SP, IX, IY'], ['I R M', 'I, R, IM'], ['Ctrl+1 / 2 or Alt+Shift+1 / 2', 'IFF1 / IFF2'],
      ['Alt+S Z 5 H 3 P N C', 'toggle flag'], ["'", 'go to address (code)'], [';', 'go to address (dump)']]]]],
    ['Disassembler', [[null, [
      ['↑↓←→ PgUp PgDn', 'move'], ['Home', 'cursor to PC'], ['G', 'go to address'],
      ["'", 'follow operand'], ['Backspace', 'back'], [';', 'operand in dump'],
      ['F4', 'run to cursor'], ['Space / right click', 'breakpoint'], ['Enter', 'assemble'], ['Z', 'PC = cursor'],
      ['Alt+F7', 'find text'], ['Ctrl+F7', 'find code'],
      ['Ctrl+1…8 or Alt+Shift+1…8', 'save position'], ['1…8', 'go to position'], ['Ctrl+L', 'labels on/off'], ['Ctrl+A', 'import XAS/ALASM labels']]]]],
    ['Memory', [[null, [
      ['↑↓←→ PgUp PgDn', 'move'], ['Home / End', 'line start / end'], ['Ctrl+Tab or Alt+Shift+H', 'hex ↔ ASCII'],
      ['digits, chars', 'edit'], ['Ctrl+G', 'go to address'], ['Ctrl+P S B D H X Y', 'go to PC, SP, BC, DE, HL, IX, IY'],
      ['Alt+F7', 'find text'], ['Ctrl+F7', 'find code'],
      ['Ctrl+M', 'memory editor'], ['Ctrl+V', 'disk: physical track'], ['Ctrl+O', 'disk: logical sectors'],
      ['Ctrl+T or Alt+Shift+T', 'drive / track / sector']]]]],
    ['Mouse', [[null, [['Left click', 'select window, place cursor'], ['Right click', 'breakpoint in disassembler']]]]],
  ];
  function dbgHelpHtml() {
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    let h = '<p>Unreal Speccy debugger (full port; Win32 dialogs are page windows).<br>⚠️ may be taken by browser<br>* stored in page memory, not on disk</p>';
    for (const [title, groups] of DBG_HELP) {
      h += `<h4>${esc(title)}</h4>`;
      for (const [sub, rows] of groups) {
        if (sub) h += `<h5>${esc(sub)}</h5>`;
        h += '<dl>' + rows.map(([k, d]) => `<dt>${esc(k)}</dt><dd>${esc(d)}</dd>`).join('') + '</dl>';
      }
    }
    return h + '<p class="hnote">Keys can be reassigned in [SYSTEM.KEYS] of unreal.ini.</p>';
  }

  // ------------------------------------------------------------------ keyboard
  function locks(e) {
    const g = (k) => e.getModifierState && e.getModifierState(k);
    return (g('CapsLock') ? 1 : 0) | (g('NumLock') ? 2 : 0) | (g('ScrollLock') ? 4 : 0);
  }
  const modalOpen = () => false; // no blocking windows any more: every window is a floating one
  const held = new Set();
  function releaseAll() {
    if (!E) return;
    for (const code of held) { const sc = SCAN[code]; if (sc !== undefined) E.web_key(sc, 0, 0); }
    held.clear();
    E.web_keys_clear();
    if (vkbd) vkbd.releaseAll();
    kjBits = 0; E.web_kjoy(0); E.web_zx_clear();
  }
  const HOTKEYS = new Set(['F1', 'F2', 'F3', 'F4', 'F5', 'F7', 'F12', 'Slash', 'NumpadDivide']);
  function hotkey(e) {
    if (e.ctrlKey && e.altKey && !e.metaKey && e.code === 'KeyZ' && MODELS[model].xt) { toggleXT(); return true; } // ATM mode on / off
    if (e.altKey && !(e.ctrlKey || e.shiftKey || e.metaKey) && e.code === 'F1') { showOptions(!optOpen()); return true; } // Alt+F1: Options (as in the debugger)
    if (E.web_xt_kbd()) { // in ATM (XT) mode every key goes to the machine
      if (HOTKEYS.has(e.code) && !(e.shiftKey || e.ctrlKey || e.altKey || e.metaKey)) xtMsg();
      return false;
    }
    if (e.code === 'F1' && e.shiftKey && !(e.ctrlKey || e.altKey || e.metaKey)) { dbgIgnore = 'F1'; debugEnter(); return true; } // Shift+F1: debugger
    if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return false;
    if (e.code === 'F12') { E.web_reset(0); return true; }
    if (e.code === 'F2') { openSave(); return true; }
    if (e.code === 'F3') { showLoad(); return true; }
    if (e.code === 'F4') { toggleSound(); return true; }
    if (e.code === 'F5') { setUserPaused(!userPaused); return true; }
    if (e.code === 'Slash' || e.code === 'NumpadDivide') { toggleTurbo(); return true; }
    if (e.code === 'F7') { E.web_tape(); return true; }
    if (e.code === 'Escape' && (mouseLocked || performance.now() - mouseUnlockAt < 400)) return true; // this Esc released the mouse
    if (e.code === 'F1') { releaseMouse(); fc.show(!fc.open); fcVk = fc.open; return true; } // F1: File Commander
    return false;
  }
  window.addEventListener('keydown', (e) => {
    if (!e.isTrusted) return; // keys of the on-screen keyboard sent to a window (File Commander) never reach the machine
    if (!E) return;
    const fwEl = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.fwin') : null;
    if (fwEl) { // keys for the controls of a floating window; Esc closes it
      if (e.code === 'Escape') { fwinShow(fwEl.id, false); e.preventDefault(); }
      return;
    }
    if (optOpen() && !dbgOn) {
      if (e.code === 'Escape') { showOptions(false); e.preventDefault(); return; }
      if ($('options').contains(document.activeElement)) return; // keys for the option controls
    }
    if (fc && fc.open && fc.hasFocus()) return; // keys for File Commander
    if (gfx && gfx.open && gfx.hasFocus()) { // keys for Graf Search, not for the debugger / emulator
      if (!gfx.typing() && gfx.key(e)) e.preventDefault();
      return;
    }
    if (dbgOn) { e.preventDefault(); debugKey(e, true); return; }
    if (afterDbg.has(e.code)) { e.preventDefault(); return; } // still held since the debugger was closed
    startAudio();
    if (!e.repeat && hotkey(e)) { e.preventDefault(); return; }
    if (isPaused()) return;
    const sc = SCAN[e.code];
    if (sc === undefined) return;
    e.preventDefault();
    held.add(e.code);
    E.web_key(sc, 1, locks(e));
  });
  window.addEventListener('keyup', (e) => {
    if (E && dbgOn) { e.preventDefault(); debugKey(e, false); return; }
    if (E && dbgIgnore === e.code) dbgIgnore = null;
    if (afterDbg.delete(e.code)) { e.preventDefault(); return; }
    if (!E || !held.has(e.code)) return;
    e.preventDefault();
    held.delete(e.code);
    E.web_key(SCAN[e.code], 0, locks(e));
  });
  window.addEventListener("blur", () => { releaseAll(); afterDbg.clear(); });

  function toggleXT() { releaseAll(); E.web_toggle_xt(); updateUI(); xtMsg(); }
  // ATM mode label next to the XT icon (bottom left), in the color of the icon
  let xtMsgT = 0;
  function xtMsg() {
    if (!E || $('xt').hidden) return;
    const on = !!E.web_xt_kbd(), m = $('xtmsg');
    m.textContent = on ? 'ATM mode on · emulator hotkeys off' : 'ATM mode off · emulator hotkeys on';
    m.classList.toggle('on', on);
    clearTimeout(xtMsgT); xtMsgT = setTimeout(() => { m.textContent = ''; }, 2600);
  }
  function toggleTurbo() { turbo = !turbo; $('turbo').classList.toggle('on', turbo); $('turbo').title = turbo ? 'Max speed: on' : 'Max speed'; }

  // ------------------------------------------------------------------ disks
  const DRV = 'ABCD';
  function extOf(name) { const m = /\.([^.]+)$/.exec(name); return m ? m[1].toLowerCase() : ''; }
  function insertFromFs(name, drive, quiet) {
    setName(name);
    if (!E.web_load(drive)) { toast('Cannot load ' + name, true); return false; }
    const ext = extOf(name);
    const isDisk = ['trd', 'scl', 'fdi', 'udi', 'td0', 'isd', 'pro', 'hob', 'dsk', 'ipf'].includes(ext) || ext.startsWith('$');
    if (isDisk) {
      let d = drive;
      if (d < 0) {
        for (let i = 0; i < 4; i++) if (E.web_disk_present(i) && cstr(E.web_disk_name(i)).toLowerCase().endsWith(name.toLowerCase())) d = i;
        if (d < 0) d = 0;
      }
      drives[d] = { name, ext, url: loadingUrl || (quiet && drives[d] ? drives[d].url : null) }; // url: for the REST API link
      if (!quiet) toast('Drive ' + DRV[d] + ': ' + name);
      if (autorunNext && d === 0 && !quiet) {
        autorunNext = false; autorun(); toast('Drive A: ' + name + ' — autorun');
        if (!linkLoading && macro && $('ldpress').value.trim()) macro.steps.push({ wait: 60 }, ...zxPress($('ldpress').value.trim())); // Load window: keys in the boot menu (the REST API has press=)
      }
    } else {
      if (!quiet) toast('Loaded: ' + name);
      if (autorunNext && !quiet && ['tap', 'tzx', 'csw'].includes(ext)) { autorunNext = false; autorunTape(); toast('Tape: ' + name + ' — autorun'); }
    }
    updateUI();
    return true;
  }
  const LOADABLE = /\.(trd|scl|fdi|udi|td0|isd|pro|hob|dsk|ipf|tap|tzx|csw|sna|z80|sp|pal|\$.)$/i;
  // the page's question box: resolves true (OK) / false (Cancel, Esc); OK has the focus
  function askBox(title, text, ok, no) {
    const w = $('askbox'), okb = w.querySelector('.ok'), nob = w.querySelector('.no');
    w.querySelector('.t').textContent = title || ''; w.querySelector('.t').hidden = !title; w.querySelector('.x').textContent = text || '';
    okb.textContent = ok || 'OK'; nob.textContent = no || 'Cancel';
    releaseAll(); w.hidden = false;
    { // centred on the emulator window (not the browser window), inside the screen
      const b = w.querySelector('.box'), r = $('mainwin').getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
      b.style.position = 'absolute';
      b.style.left = Math.max(8, Math.min(r.left + (r.width - b.offsetWidth) / 2, vw - b.offsetWidth - 8)) + 'px';
      b.style.top = Math.max(8, Math.min(r.top + (r.height - b.offsetHeight) / 2, vh - b.offsetHeight - 8)) + 'px';
    }
    okb.focus();
    return new Promise((res) => {
      const done = (v) => { w.hidden = true; w.onkeydown = null; okb.onclick = nob.onclick = null; canvas.focus(); res(v); };
      okb.onclick = () => done(true); nob.onclick = () => done(false);
      w.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); done(false); } else if (e.key === 'Enter') { e.preventDefault(); done(document.activeElement !== nob); }
        else if (['ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) { e.preventDefault(); (document.activeElement === okb ? nob : okb).focus(); } };
    });
  }
  const DISK_EXT = /\.(trd|scl|fdi|udi|td0|isd|pro|hob|dsk|ipf|\$.)$/i;
  let coreAnswer = null; // the answer for the core's next MessageBox question (6 yes, 7 no)
  async function putAndInsert(name, buf, drive) {
    name = name.replace(/^.*[\\/]/, '').replace(/[:]/g, '_');
    if (drive === ROM_TARGET) { const a = autorunNext; autorunNext = false; loadRomDisk(name, buf, a); return; }
    // a disk into a drive whose disk was changed: asked here (the core's "Save disk" question is not used). No drive given:
    // the core's choice (the drive after the last one with a disk; Hobeta: that one)
    let d = drive;
    if (DISK_EXT.test(name)) {
      if (d < 0) { let last = -1; for (let i = 0; i < 4; i++) if (E.web_disk_present(i)) last = i; d = last < 0 ? 0 : /\.\$.$|\.hob$/i.test(name) ? last : (last + 1) & 3; }
      const k = drives.findIndex((x, j) => x && j !== d && j < 4 && x.name.toLowerCase() === name.toLowerCase() && E.web_disk_present(j));
      if (k >= 0) { // the core asks this too: asked here, the core gets the answer
        if (!await askBox('', 'This disk image is already loaded to drive ' + DRV[k] + ':\nDo you still want to load it to drive ' + DRV[d] + ':?')) return;
        coreAnswer = 6;
      }
      if (E.web_disk_present(d) && E.web_disk_changed(d)) {
        if (!await askBox('Disk ' + DRV[d] + ':', 'Discard changes for ' + (drives[d] ? drives[d].name : diskBase(d)) + '?')) return;
        E.web_disk_mark(d, 0);
      }
    }
    fs.write(name, buf);
    try { insertFromFs(name, d); } finally { coreAnswer = null; }
  }
  async function loadFile(file, drive) { await loadBytes(file.name, new Uint8Array(await file.arrayBuffer()), drive); }
  // autorunNext: set by the Load window just before a load, used by the first disk inserted into A:
  let autorunNext = false, zipAuto = false, loadingUrl = null, linkLoading = false; // loadingUrl: where the file being loaded came from
  async function loadBytes(name, buf, drive) {
    if (!UnrealZip.isZip(buf)) { if (HDD_EXT.test(name) && buf.length >= 1 << 20) { await hddFromBytes(0, name, buf); return; } await putAndInsert(name, buf, drive); return; }
    try {
      const entries = UnrealZip.list(buf).filter((e) => LOADABLE.test(e.name));
      if (!entries.length && UnrealZip.list(buf).some((e) => HDD_EXT.test(e.name) || e.size >= 4 << 20)) { await hddFromBytes(0, name, buf); return; }
      if (!entries.length) { toast('No disk, tape or snapshot images in the archive', true); return; }
      const pick = async (e) => putAndInsert(e.name, await UnrealZip.extract(buf, e), drive);
      if (entries.length === 1) { await pick(entries[0]); return; }
      zipAuto = autorunNext; // the choice is made later in the ZIP window
      const list = $('ziplist'); list.innerHTML = '';
      for (const e of entries) {
        const b = document.createElement('button');
        b.textContent = e.name.replace(/^.*[\\/]/, '') + '  (' + Math.round(e.size / 1024) + ' KB)';
        b.onclick = async () => { fwinShow('zippick', false); autorunNext = zipAuto; try { await pick(e); } catch (err) { toast(err.message, true); } autorunNext = false; };
        list.appendChild(b);
      }
      releaseAll(); fwinShow('zippick', true);
    } catch (err) { toast(err.message, true); }
  }
  let pendingDrive = -1, fromLoadWin = false;
  // F3, the Load button and the drive Insert buttons open the Load window
  function openFile(drive) { showLoad(drive); }

  // ------------------------------------------------------------------ floating windows (Load, server browser, Save, ZIP)
  const fwins = {};
  function fwinShow(id, v) {
    const w = $(id);
    if (!fwins[id]) fwins[id] = floatWin(w, 'pos.' + id, () => {
      const r = $('screenwrap').getBoundingClientRect(), vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.left + (r.width - w.offsetWidth) / 2, vw - w.offsetWidth - 4)), y: Math.max(8, r.top + 24) };
    });
    if (v) {
      releaseAll(); releaseMouse(); w.hidden = false; fwins[id].place();
      // touch screens: focus the window itself, a focused select / input would pop up its picker or the on-screen keyboard
      if (matchMedia('(pointer: coarse)').matches) { w.tabIndex = -1; w.focus({ preventScroll: true }); }
      else { const f = w.querySelector('input:not([hidden]), select, button.primary'); if (f) f.focus(); }
    }
    else { w.hidden = true; canvas.focus(); }
  }

  // ------------------------------------------------------------------ autorun: reset to TR-DOS and type RUN (boots "boot")
  // steps run in emulated frames: { wait } or { key: matrix index, hold } (index = half-row * 8 + bit)
  const ZK = { CS: 0, Z: 1, R: 2 * 8 + 3, T: 2 * 8 + 4, ENTER: 6 * 8 + 0, K6: 4 * 8 + 4, K7: 4 * 8 + 3,
    K5: 3 * 8 + 4, K8: 4 * 8 + 2, SPACE: 7 * 8 + 0, SS: 7 * 8 + 1, K1: 3 * 8 + 0, K3: 3 * 8 + 2, K4: 3 * 8 + 3, L: 6 * 8 + 1, O: 5 * 8 + 1, A: 1 * 8 + 0, D: 1 * 8 + 2, P: 5 * 8 + 0 };
  const UP = [ZK.CS, ZK.K7], DOWN = [ZK.CS, ZK.K6]; // cursor keys = CAPS SHIFT + 7 / 6
  let macro = null;
  const zxKeys = (k, d) => [].concat(k).forEach((x) => E.web_zxkey(x, d));
  function runMacro(steps) { if (macro && macro.key) zxKeys(macro.key, 0); macro = { steps: steps.slice(), n: 0, key: null }; }
  function macroFrame() {
    if (!macro) return;
    if (macro.n > 0) { macro.n--; return; }
    if (macro.key) { zxKeys(macro.key, 0); macro.key = null; macro.n = 6; return; } // release, short gap
    if (macro.xtq && macro.xtq.length) { const c = macro.xtq.shift(); E.web_key(SCAN[c], 1, 0); macro.xt.push(c); macro.n = macro.xtq.length ? 2 : 3; return; }
    if (macro.xt) { macro.xt.slice().reverse().forEach((c) => E.web_key(SCAN[c], 0, 0)); macro.xt = null; macro.n = 3; return; }
    const st = macro.steps[0];
    if (!st) { if (macro.xtBack && E.web_xt_kbd && !E.web_xt_kbd()) { E.web_toggle_xt(); updateUI(); } macro = null; return; }
    if (st.prompt) { // CP/M: wait until the screen shows a bare "X>" prompt that stays for a few frames
      const k = cpmPrompt();
      if (k && k === macro.pk) { if (++macro.ps >= 10) { macro.steps.shift(); macro.pk = null; } }
      else { macro.pk = k; macro.ps = 0; }
      if (++macro.pw > 3000) { toast('CP/M: no command prompt', true); macro = null; } // ~1 min
      return;
    }
    macro.steps.shift(); macro.pw = 0;
    if (st.reset !== undefined) { E.web_reset(st.reset); return; }
    if (st.wait) { macro.n = st.wait; return; }
    if (st.xtmode !== undefined) { if (!!E.web_xt_kbd() !== !!st.xtmode) { E.web_toggle_xt(); updateUI(); } return; }
    if (st.xt) { macro.xtq = st.xt.slice(); macro.xt = []; return; } // keys go down one after another (Shift first)
    zxKeys(st.key, 1); macro.key = st.key; macro.n = st.hold || 6;
  }
  // ATM CP/M text screen (page 5): even columns at #01C0 + row × 64, odd columns at #21C0 + row × 64
  function cpmPrompt() {
    if ((E.web_ff77() & 7) !== 6) return null; // not the 80×25 text mode (the BIOS menu, a leftover "A>" in text memory)
    const ram = new Uint8Array(E.memory.buffer, E.web_gfx_mem(1, 0, 0), E.web_gfx_size(1)), base = 5 * 0x4000;
    const ch = (r, c) => ram[base + (c & 1 ? 0x21C0 : 0x01C0) + r * 64 + (c >> 1)];
    const blank = (b) => b === 0x20 || b === 0 || b === 0x5F;
    for (let r = 24; r >= 0; r--) {
      let last = -1; for (let c = 0; c < 80; c++) if (!blank(ch(r, c))) last = c;
      if (last < 0) continue;
      const d = ch(r, 0);
      return last === 1 && d >= 0x41 && d <= 0x50 && ch(r, 1) === 0x3E ? r + ':' + String.fromCharCode(d) : null;
    }
    return null;
  }
  // text → XT key codes (CP/M upper-cases commands itself)
  function xtType(text) {
    const out = [], SH = { ':': 'Semicolon', '_': 'Minus', '>': 'Period', '<': 'Comma', '*': 'Digit8', '?': 'Slash', '"': 'Quote' };
    const PL = { '.': 'Period', ' ': 'Space', '/': 'Slash', '-': 'Minus', ',': 'Comma', '=': 'Equal', ';': 'Semicolon', '[': 'BracketLeft', ']': 'BracketRight', "'": 'Quote', '\\': 'Backslash' };
    for (const c of text) {
      if (/[a-z]/i.test(c)) out.push({ xt: ['Key' + c.toUpperCase()] });
      else if (/\d/.test(c)) out.push({ xt: ['Digit' + c] });
      else if (SH[c]) out.push({ xt: ['ShiftLeft', SH[c]] });
      else if (PL[c]) out.push({ xt: [PL[c]] });
    }
    return out;
  }
  // REST API cpm=: boot CP/M from the ATM BIOS menu and type the commands ("b:|alasm" or "b:alasm")
  function cpmCommands(v) {
    const cmds = [];
    for (let c of String(v).split(/[|;]/)) {
      c = c.trim(); if (!c) continue;
      const m = /^([a-p]):(\S.*)$/i.exec(c);
      if (m) { cmds.push(m[1] + ':'); c = m[2]; }
      cmds.push(c.replace(/\.com\b/i, ''));
    }
    return cmds;
  }
  // an OS model: its HDD image into HDD 0 (ATM IDE on), then xBIOS XT setup: Space, 2 × ↓ (vTR-dos cold → IDE hard drive master), Enter
  // ------------------------------------------------------------------ NedoOS: build date of sd/nedoos.zip, Make Image (a new image from the release)
  const NEDO_REPO = (OS_MODELS.NEDOOS.link || '').replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '') || 'alfishe/NedoOS', NEDO_DIR = 'release';
  const nedoDate = (d) => { const t = new Date(d), z = (n) => String(n).padStart(2, '0'); return isNaN(t) ? '' : t.getFullYear() + '-' + z(t.getMonth() + 1) + '-' + z(t.getDate()); };
  function nedoNote(b) { // the build of a loaded nedoos.zip: its nedoos.json, else the date of the image in the archive (none: nothing)
    const done = (o) => { try { if (o) localStorage.setItem('unreal.nedoos.build', JSON.stringify(o)); else localStorage.removeItem('unreal.nedoos.build'); } catch (e) {} if ($('modelsel').value === 'NEDOOS') nedoUI(); };
    const dated = (t) => t && !isNaN(t) && t.getFullYear() > 1980; // a ZIP entry without a date reads as 1980-01-01 (DOS date 0)
    try {
      if (!UnrealZip.isZip(b)) { done(null); return; }
      const ents = UnrealZip.list(b), j = ents.find((e) => /\.json$/i.test(e.name)), img = ents.reduce((a, e) => (e.size > a.size ? e : a), { size: -1 });
      const byImg = () => done(dated(img.time) ? { date: img.time.toISOString(), commit: '', zipdate: true } : null);
      if (!j) { byImg(); return; }
      UnrealZip.extract(b, j).then((d) => {
        const o = JSON.parse(new TextDecoder().decode(d)), date = o.date || o.built;
        if (dated(new Date(date))) done({ date, commit: o.commit || '', built: o.built || '' }); else byImg();
      }).catch(byImg);
    } catch (e) { done(null); }
  }
  function nedoUI() {
    const on = $('modelsel').value === 'NEDOOS'; $('nedorow').hidden = !on; if (!on) return;
    let o = null; try { o = JSON.parse(load('nedoos.build') || 'null'); } catch (e) {}
    const d = o && o.date ? nedoDate(o.date) : '', ok = d && d > '1980-12-31'; // no data (or the DOS zero date): nothing is written
    $('nedobuild').textContent = ok ? (o.zipdate ? 'from ' : 'build ') + d + (o.commit ? ' · ' + o.commit.slice(0, 7) : '') : '';
    $('nedobuild').title = ok && o.zipdate ? 'nedoos.zip has no nedoos.json: date of the image file in it' : ok && o.built ? 'image made ' + o.built : '';
  }
  let nedoFW = null, nedoLast = null, nedoBusy = false;
  function nedoStat(t, err) { $('nedostat').textContent = t; $('nedostat').classList.toggle('err', !!err); }
  function nedoProg(v) { const p = $('nedoprog'); p.hidden = v === null; if (v !== null) p.value = v; }
  function showNedo(v) {
    $('nedowin').hidden = !v;
    if (v) { if (!nedoFW) nedoFW = floatWin($('nedowin'), 'nedopos', () => { const r = $('screenwrap').getBoundingClientRect(), w = $('nedowin').offsetWidth; return { x: Math.max(4, r.left + (r.width - w) / 2), y: Math.max(8, r.top + 60) }; });
      $('nedomb').value = load('nedo.mb') || '100'; nedoFW.place(); }
  }
  // the release folder from GitHub: 4 API calls (head commit, trees, last change of the folder), then each file from raw.githubusercontent.com
  async function nedoFromGit() {
    const A = 'https://api.github.com/repos/' + NEDO_REPO, j = async (u) => {
      let r; try { r = await fetch(u, { headers: { Accept: 'application/vnd.github+json' } }); } catch (e) { throw new Error('GitHub cannot be reached from this page (network or CORS)'); }
      if (r.status === 403 || r.status === 429) throw new Error('GitHub API limit for this address (60 requests an hour): try later or use From file');
      if (!r.ok) throw new Error('GitHub API: HTTP ' + r.status);
      return r.json();
    };
    nedoStat('GitHub: ' + NEDO_REPO + ' · reading the file list…');
    const head = await j(A + '/commits/HEAD'), root = await j(A + '/git/trees/' + head.commit.tree.sha);
    const rel = root.tree.find((x) => x.path.toLowerCase() === NEDO_DIR && x.type === 'tree'); if (!rel) throw new Error('no folder ' + NEDO_DIR + ' in ' + NEDO_REPO);
    const t = await j(A + '/git/trees/' + rel.sha + '?recursive=1'); if (t.truncated) throw new Error('GitHub gave a cut list of files');
    let date = head.commit.committer.date; try { const c = await j(A + '/commits?path=' + rel.path + '&per_page=1'); if (c[0]) date = c[0].commit.committer.date; } catch (e) {}
    const blobs = t.tree.filter((x) => x.type === 'blob'), dirs = t.tree.filter((x) => x.type === 'tree').map((x) => x.path), files = new Array(blobs.length);
    const total = blobs.reduce((n, x) => n + (x.size || 0), 0); let got = 0, done = 0, next = 0;
    const raw = (p) => 'https://raw.githubusercontent.com/' + NEDO_REPO + '/' + head.sha + '/' + rel.path + '/' + p.split('/').map(encodeURIComponent).join('/');
    const one = async (k) => {
      for (let a = 0; ; a++) {
        try { const r = await fetch(raw(blobs[k].path)); if (!r.ok) throw new Error('HTTP ' + r.status); files[k] = { path: blobs[k].path, data: new Uint8Array(await r.arrayBuffer()) }; break; }
        catch (e) { if (a >= 2) throw new Error(blobs[k].path + ': ' + e.message); await new Promise((res) => setTimeout(res, 500 * (a + 1))); }
      }
      got += files[k].data.length; done++;
      if (done % 20 === 0 || done === blobs.length) { nedoStat(`GitHub: ${done} / ${blobs.length} files · ${(got / 1048576).toFixed(1)} of ${(total / 1048576).toFixed(1)} MB`); nedoProg(got / Math.max(1, total)); }
    };
    await Promise.all(Array.from({ length: 12 }, async () => { while (next < blobs.length) await one(next++); }));
    return { files, dirs, info: { source: 'https://github.com/' + NEDO_REPO + '/tree/' + head.sha + '/' + rel.path, commit: head.sha, date } };
  }
  // a ZIP from this computer: the folder with sd_boot.$C (release/ of a repository ZIP, or a ZIP of that folder)
  async function nedoFromZip(b) {
    if (!UnrealZip.isZip(b)) throw new Error('not a ZIP');
    const ents = UnrealZip.list(b, true).map((e) => Object.assign(e, { name: e.name.replace(/\\/g, '/') })), boots = ents.filter((e) => /(^|\/)sd_boot\.\$c$/i.test(e.name)).map((e) => e.name.slice(0, e.name.length - 10));
    if (!boots.length) throw new Error('no sd_boot.$C in the archive: it is not a NedoOS release');
    const base = boots.find((x) => /(^|\/)release\/$/i.test(x)) || boots.sort((x, y) => x.length - y.length)[0];
    const mine = ents.filter((e) => e.name.startsWith(base) && e.name.length > base.length), files = [], dirs = [];
    let latest = 0, k = 0;
    for (const e of mine) {
      const p = e.name.slice(base.length);
      if (p.endsWith('/')) { dirs.push(p.slice(0, -1)); continue; }
      files.push({ path: p, data: await UnrealZip.extract(b, e) }); if (e.time && e.time.getFullYear() > 1980 && +e.time > latest) latest = +e.time; // 1980: no date in the ZIP
      if (++k % 50 === 0) { nedoStat(`Unpacking: ${k} / ${mine.length}`); nedoProg(k / mine.length); await new Promise((r) => setTimeout(r, 0)); }
    }
    const sha = (/^[0-9a-f]{40}$/i.exec(UnrealZip.comment(b).trim()) || [''])[0]; // GitHub ZIPs carry the commit id as the comment
    return { files, dirs, info: { source: 'ZIP: ' + (base || '(root)'), commit: sha, date: latest ? new Date(latest).toISOString() : new Date().toISOString() } };
  }
  // the files on a new FAT32 image (New Disk / SD card logic); a size too small for them grows to what they need
  async function nedoImage(set, mb0) {
    const T = UnrealFC._test, files = set.files.slice().sort((a, b) => a.path.localeCompare(b.path)), dirs = new Set(set.dirs);
    for (const f of files) { const p = f.path.split('/'); for (let i = 1; i < p.length; i++) dirs.add(p.slice(0, i).join('/')); }
    const data = files.reduce((n, f) => n + f.data.length, 0);
    let mb = Math.max(64, mb0 | 0), note = ''; const skipped = [];
    for (let tries = 0; tries < 6; tries++) {
      // 512-byte clusters, as the images NedoOS ships (its kernel of 13-14.10.2026 does not find bin/term.com on 1K clusters)
      const img = T.fatFormat(mb * 1048576, 'NEDOOS', { start: 2048, type: 32, spc: 1 }), base = T.fatFind(img)[0], vol = T.fatVol(img, base);
      const cb = (img[base + 11] | img[base + 12] << 8) * img[base + 13];
      const per = new Map(); for (const p of [...files.map((f) => f.path), ...dirs]) { const d = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '', n = p.slice(p.lastIndexOf('/') + 1); per.set(d, (per.get(d) || 0) + 1 + (/^[a-z0-9_$~!#%&'()@^`{}-]{1,8}(\.[a-z0-9_$~!#%&'()@^`{}-]{1,3})?$/i.test(n) ? 0 : Math.ceil(n.length / 13))); } // entries: short + long-name ones
      const need = files.reduce((n, f) => n + Math.ceil(f.data.length / cb) * cb, 0) + [...dirs, ''].reduce((n, d) => n + Math.ceil(((per.get(d) || 0) * 32 + 64) / cb) * cb, 0);
      if (need > vol.free()) { const nmb = mb + Math.ceil((need - vol.free()) * 1.05 / 1048576) + 1; note = `${mb} MB is too small for ${(data / 1048576).toFixed(1)} MB of files in ${files.length} files: the image is ${nmb} MB`; mb = nmb; continue; }
      try {
        nedoStat(`Writing ${files.length} files on a ${mb} MB FAT32 image…`); skipped.length = 0;
        // each folder gets all its entries' room at once, in clusters that follow each other (no folder spread over the disk)
        vol.setPath([]); vol.reserve((per.get('') || 0) * 32 + 64);
        for (const d of [...dirs].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))) { const p = d.split('/'); vol.setPath(p.slice(0, -1)); vol.mkdir(p[p.length - 1]); vol.setPath(p); vol.reserve((per.get(d) || 0) * 32 + 64); }
        let k = 0;
        for (const f of files) {
          const p = f.path.split('/'), nm = p.pop(), dot = nm.lastIndexOf('.');
          vol.setPath(p);
          try { vol.write(dot > 0 ? { name: nm.slice(0, dot), ext: nm.slice(dot + 1), data: f.data } : { name: nm, ext: '', data: f.data }); }
          catch (e) { if (!/exists/i.test(e.message)) throw e; skipped.push(f.path); } // same name in another case: FAT keeps one
          if (++k % 100 === 0) { nedoStat(`Writing: ${k} / ${files.length}`); nedoProg(k / files.length); await new Promise((r) => setTimeout(r, 0)); }
        }
        if (skipped.length) note += (note ? '\n' : '') + skipped.length + ' file(s) left out (same name in another case): ' + skipped.slice(0, 3).join(', ');
        return { img, mb, note, nfiles: files.length - skipped.length, data };
      } catch (e) { if (!/full/i.test(e.message)) throw e; const nmb = Math.ceil(mb * 1.15) + 1; note = `${mb} MB was not enough: the image is ${nmb} MB`; mb = nmb; }
    }
    throw new Error('the image cannot be made');
  }
  async function nedoRun(get) {
    if (nedoBusy) return; nedoBusy = true;
    $('nedodone').hidden = true; $('nedogit').disabled = $('nedofile').disabled = true; nedoProg(0);
    try {
      const mb = Math.max(64, Math.min(2047, parseInt($('nedomb').value, 10) || 100)); store('nedo.mb', String(mb));
      const set = await get();
      const boot = set.files.find((f) => /^sd_boot\.\$c$/i.test(f.path));
      if (!boot) throw new Error('no sd_boot.$C in the release folder');
      // the programs the loader starts (its texts: "term.com cmd.com autoexec.bat") must be in bin/
      const want = [...new Set((String.fromCharCode(...boot.data).match(/[a-z0-9_]{1,8}\.(com|bat)/gi) || []).map((x) => x.toLowerCase()))];
      const have = new Set(set.files.map((f) => f.path.toLowerCase()));
      const lost = want.filter((x) => !have.has('bin/' + x) && !have.has(x));
      if (lost.length) throw new Error('sd_boot.$C starts ' + lost.join(', ') + ', but the release has no bin/' + lost[0] + ' — this ZIP is not a whole NedoOS release (' + set.files.length + ' files)');
      const r = await nedoImage(set, mb);
      nedoStat('Packing nedoos.zip…'); nedoProg(null);
      const info = { os: 'NedoOS', date: set.info.date, commit: set.info.commit, source: set.info.source, built: new Date().toISOString(), size_mb: r.mb, files: r.nfiles };
      const vhd = vhdFixed(r.img);
      const zip = await UnrealZip.create([{ name: 'nedoos.vhd', data: vhd }, { name: 'nedoos.json', data: new TextEncoder().encode(JSON.stringify(info, null, 2) + '\n') }]);
      nedoLast = { zip, vhd, info };
      nedoProg(null); nedoStat('Image made: nedoos.zip ' + (zip.size / 1048576).toFixed(1) + ' MB');
      if (await askBox('NedoOS image', `Image made: ${r.mb} MB FAT32 VHD, ${r.nfiles} files, build ${nedoDate(info.date)}${info.commit ? ' · ' + info.commit.slice(0, 7) : ''}.\nDownload nedoos.zip (${(zip.size / 1048576).toFixed(1)} MB)?`, 'Download')) downloadBytes('nedoos.zip', zip);
      nedoStat((r.note ? r.note + '\n' : '') + `Done: nedoos.zip (${(zip.size / 1048576).toFixed(1)} MB) · ${r.mb} MB FAT32 VHD · ${r.nfiles} files, ${(r.data / 1048576).toFixed(1)} MB\nbuild ${nedoDate(info.date)}${info.commit ? ' · ' + info.commit.slice(0, 7) : ''}`);
      $('nedodone').hidden = false;
    } catch (e) { nedoProg(null); nedoStat(e.message + (/GitHub/.test(e.message) ? '\nFrom file: download the repository (GitHub: Code / Download ZIP) or a ZIP of its release folder and choose it here' : ''), true); }
    finally { nedoBusy = false; $('nedogit').disabled = $('nedofile').disabled = false; }
  }
  // ------------------------------------------------------------------ About / changes: the history (changes.txt) to read, not to copy
  let chFW = null, chText = null;
  async function showChanges(v) {
    const w = $('chwin');
    if (!v) { w.hidden = true; return; }
    if (!chFW) {
      chFW = floatWin(w, 'chpos', () => { const r = $('options').getBoundingClientRect(); return { x: Math.max(4, r.left + 24), y: Math.max(8, r.top + 24) }; });
      edgeResize(w, { minW: () => 300, minH: 200, end: (r) => store('chsize', JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height) })) });
      let sz = null; try { sz = JSON.parse(load('chsize') || 'null'); } catch (e) {}
      const o = $('options').getBoundingClientRect(); // first time: the height of Options, wide enough for the 72-character lines
      w.style.width = (sz ? sz.w : Math.min(document.documentElement.clientWidth - 8, Math.max(540, Math.round(o.width) || 440))) + 'px'; w.style.height = (sz ? sz.h : Math.round(o.height) || 420) + 'px';
      const t = $('chtext');
      for (const ev of ['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart']) t.addEventListener(ev, (e) => e.preventDefault());
      t.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && /^Key[ACX]$/.test(e.code)) e.preventDefault(); });
      w.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); showChanges(false); } });
      $('chclose').onclick = () => showChanges(false);
    }
    w.hidden = false; chFW.place();
    if (chText === null) {
      $('chtext').textContent = 'Loading…';
      try { const r = await fetch('changes.txt', { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status); chText = await r.text(); }
      catch (e) { $('chtext').textContent = 'changes.txt: ' + e.message; return; }
      $('chtext').textContent = chText;
    }
    const t = $('chtext'); t.scrollTop = t.scrollHeight; // the newest versions are at the end
    t.focus({ preventScroll: true });
  }
  function bindNedo() {
    $('nedobtn').onclick = () => showNedo($('nedowin').hidden);
    $('nedoclose').onclick = () => showNedo(false);
    $('nedowin').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); showNedo(false); } });
    $('nedogit').title = 'Folder ' + NEDO_DIR + ' of github.com/' + NEDO_REPO + ' (latest commit), file by file';
    $('nedogit').onclick = () => nedoRun(nedoFromGit);
    $('nedofile').onclick = () => $('nedoinput').click();
    $('nedoinput').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) nedoRun(async () => { nedoStat('Reading ' + f.name + '…'); return nedoFromZip(new Uint8Array(await f.arrayBuffer())); }); };
    $('nedodl').onclick = () => { if (nedoLast) downloadBytes('nedoos.zip', nedoLast.zip); };
    $('nedouse').onclick = async () => { if (!nedoLast) return; await sdFromBytes('nedoos.vhd', nedoLast.vhd); if (sdName) sdSrc = new URL(lowDir(OS_MODELS.NEDOOS.sd), location.href).href; /* NedoOS start keeps it */ store('nedoos.build', JSON.stringify({ date: nedoLast.info.date, commit: nedoLast.info.commit, built: nedoLast.info.built })); nedoUI(); };
  }
  async function osBoot() {
    const os = OS_MODELS[model]; if (!os) return;
    if (os.sd) { // an SD card OS: the image (kept when it is already in: its changes stay), Reset, 5 in the EVO Reset Service
      const url = new URL(lowDir(os.sd), location.href).href;
      if (!(sdName && fs.exists(sdName) && sdSrc === url)) {
        toast('Loading ' + os.sd + '…');
        try { const b = await fetchBytes(os.sd); if (model === 'NEDOOS') nedoNote(b); await sdFromBytes(os.sd.replace(/^.*\//, ''), b, true); if (sdName) sdSrc = url; } catch (e) { sdName = null; }
        if (!sdName) { toast(os.sd + ' not found', true); return; }
      }
      if (!sdOn()) store('sd.if.' + M(), '1');
      sdMount(); sdUI();
      const k = Math.max(1, 2 / SPEEDS[speedIdx]);
      runMacro([{ reset: 0 }, { wait: Math.ceil(150 * k) }, { xtmode: 1 }, { xt: ['Digit5'] }]);
      return;
    }
    try { await hddFromBytes(0, os.hdd.replace(/^.*\//, ''), await fetchBytes(os.hdd), true); hddSrc[0] = os.hdd; } catch (e) { hdds[0] = null; }
    if (!hdds[0]) { toast(os.hdd + ' not found', true); return; }
    if (!E.web_hdd_scheme(-1)) { E.web_hdd_scheme(1); hddMount(0); }
    hddUI();
    const w = (f1x) => Math.ceil(f1x / Math.max(1, SPEEDS[speedIdx]));
    runMacro([{ reset: 0 }, { wait: w(100) }, { xtmode: 1 }, { xt: ['Space'] }, { wait: w(60) }, ...rep(2, { xt: ['ArrowDown'] }), { wait: 10 }, { xt: ['Enter'] }]);
  }
  const CPM_MODELS = ['ATM710', 'XBIOSXT', 'EVO'];
  function cpmRun(v) {
    if (!CPM_MODELS.includes(M())) { toast('cpm=: CP/M needs atm710, xbiosxt, xbios136 or evo', true); return; }
    const w = (f1x) => Math.ceil(f1x / Math.max(1, SPEEDS[speedIdx]));
    const k = Math.max(1, 2 / SPEEDS[speedIdx]);
    // into CP/M in ATM mode (XT keyboard): ATM BIOS menu Enter; xBIOS XT setup Space, 3 × ↑ (Boot → CP/M 2.2), Enter;
    // EVO Reset Service R (Service), C (CP/M). Backspace drops a menu key that reached the command line
    const boot = {
      ATM710: [{ reset: 0 }, { wait: Math.max(100, w(250)) }, { xtmode: 1 }, { xt: ['Enter'] }],
      XBIOSXT: [{ reset: 0 }, { wait: w(100) }, { xtmode: 1 }, { xt: ['Space'] }, { wait: w(60) }, ...rep(3, { xt: ['ArrowUp'] }), { wait: 10 }, { xt: ['Enter'] }, { wait: w(100) }, { xt: ['Backspace'] }],
      EVO: [{ reset: 3 }, { wait: Math.ceil(120 * k) }, { xtmode: 1 }, { xt: ['KeyR'] }, { wait: w(60) }, { xt: ['KeyC'] }, { wait: w(100) }, { xt: ['Backspace'] }],
    }[M()];
    const steps = [...boot, { prompt: true }];
    for (const c of cpmCommands(v)) steps.push(...xtType(c), { xt: ['Enter'] }, { wait: 20 }, { prompt: true });
    steps.pop(); // the last command runs: no prompt to wait for
    runMacro(steps); macro.pw = 0;
  }
  // ZX matrix keys for typed characters (press=): digits, letters, space; "enter" = ENTER
  const ZXM = {};
  ['CS', 'Z', 'X', 'C', 'V', 'A', 'S', 'D', 'F', 'G', 'Q', 'W', 'E', 'R', 'T', '1', '2', '3', '4', '5', '0', '9', '8', '7', '6', 'P', 'O', 'I', 'U', 'Y', 'ENT', 'L', 'K', 'J', 'H', 'SPC', 'SS', 'M', 'N', 'B']
    .forEach((n, i) => { ZXM[n] = Math.floor(i / 5) * 8 + (i % 5); });
  function zxPress(v) {
    if (/^enter$/i.test(v)) return [{ key: ZXM.ENT }];
    const out = [];
    for (const c of String(v)) {
      const u = c.toUpperCase();
      if (c === ' ') out.push({ key: ZXM.SPC });
      else if (ZXM[u] !== undefined && u.length === 1) out.push({ key: c !== u ? ZXM[u] : /[A-Z]/.test(u) ? [ZXM.CS, ZXM[u]] : ZXM[u] });
    }
    return out;
  }
  // REST API run=: a TR-DOS file is started through a small "boot" (RANDOMIZE USR 15619: REM: RUN "name"), then the usual autorun
  const zxNum = (n) => [...String(n)].map((c) => c.charCodeAt(0)).concat([0x0E, 0, 0, n & 255, (n >> 8) & 255, 0]);
  function zxLine(no, body) { const b = body.concat([0x0D]); return [no >> 8, no & 255, b.length & 255, b.length >> 8].concat(b); }
  function bootFor(name, type, start) {
    const str = (t) => [...t].map((c) => c.charCodeAt(0) & 255), q = 0x22, dos = [0xF9, 0xC0].concat(zxNum(15619), [0x3A, 0xEA, 0x3A]);
    let prog;
    if (type === 'B') prog = zxLine(10, dos.concat([0xF7, q], str(name), [q]));
    else {
      prog = [];
      if (start > 24000) prog = prog.concat(zxLine(5, [0xFD].concat(zxNum(start - 1))));           // CLEAR start-1
      prog = prog.concat(zxLine(10, dos.concat([0xEF, q], str(name), [q, 0xAF])));                   // LOAD "name"CODE
      prog = prog.concat(zxLine(20, [0xF9, 0xC0].concat(zxNum(start))));                             // RANDOMIZE USR start
    }
    const n = prog.length, data = new Uint8Array(prog.concat([0x80, 0xAA, type === 'B' ? 10 : (start > 24000 ? 5 : 10), 0]));
    return { name: 'boot', zx: { type: 'B', start: n, len: n }, data };
  }
  // our own small boot (see bootFor): "boot", BASIC, a few bytes, RANDOMIZE USR 15619: REM: ...
  function isInjectedBoot(img, e) {
    if (String.fromCharCode(...e.subarray(0, 8)) !== 'boot    ' || e[8] !== 0x42 || e[13] !== 1) return false;
    const off = (e[15] * 16 + e[14]) * 256, d = img.subarray(off, off + 256), sig = [0xF9, 0xC0, 0x31, 0x35, 0x36, 0x31, 0x39, 0x0E, 0, 0, 0x03, 0x3D, 0, 0x3A, 0xEA, 0x3A];
    for (let i = 0; i < 40; i++) if (sig.every((v, k) => d[i + k] === v)) return true;
    return false;
  }
  // run=: the disk gets a small "boot" (the disk's own boot is renamed boot_ for the time being); once the program
  // has loaded (the drive has been quiet for a while) the catalogue is written back as it was — boot_ is gone again
  let runRestore = null;
  function runInject(d, fname, type) {
    setName('__run.trd');
    if (!E.web_disk_peek_trd(d)) { toast('run=: drive ' + DRV[d] + ' is not a TR-DOS disk', true); return false; }
    const img = new Uint8Array(fs.read('__run.trd')); fs.remove('__run.trd');
    if (img[0x8E7] !== 0x10) { toast('run=: drive ' + DRV[d] + ' is not a TR-DOS disk', true); return false; }
    if (runRestore) restoreRun(); // an earlier run that has not been tidied up yet
    const ok = (x) => !type || x.zx.type === type;
    const find = (list) => list.find((x) => x.name.trim() === fname && ok(x)) || list.find((x) => x.name.trim().toLowerCase() === fname.toLowerCase() && ok(x));
    const T = UnrealFC._test;
    if (!find(T.trdos(img).list())) { toast('run=: "' + fname + '" is not on the disk in ' + DRV[d] + ':', true); return false; }
    // leftovers of older versions: an injected boot in the catalogue, the disk's boot kept as boot_
    let cnt = img[0x8E4];
    for (let i = 0; i < cnt; i++) {
      const e = img.subarray(i * 16, i * 16 + 16);
      if (e[0] < 2 || !isInjectedBoot(img, e)) continue;
      const end = e[15] * 16 + e[14] + e[13];
      if (end === img[0x8E2] * 16 + img[0x8E1]) {
        const free = img[0x8E5] + (img[0x8E6] << 8) + e[13];
        img[0x8E1] = e[14]; img[0x8E2] = e[15]; img[0x8E5] = free & 255; img[0x8E6] = free >> 8;
      }
      img.copyWithin(i * 16, (i + 1) * 16, cnt * 16); img.fill(0, (cnt - 1) * 16, cnt * 16);
      img[0x8E4] = --cnt; i--;
    }
    let list = T.trdos(img).list();
    const old = list.find((x) => x.name.trim() === 'boot_' && x.zx.type === 'B');
    if (old && !list.some((x) => x.name.trim() === 'boot' && x.zx.type === 'B')) img.set([...'boot    '].map((c) => c.charCodeAt(0)), old.id * 16);
    list = T.trdos(img).list();
    const it = find(list);
    if (it.zx.type !== 'B' && it.zx.type !== 'C') { toast('run=: "' + fname + '" is neither BASIC nor code', true); return false; }
    const was = !!E.web_disk_changed(d), clean = img.slice(0, 9 * 256); // the catalogue to write back
    const isBoot = it.name.trim() === 'boot' && it.zx.type === 'B';
    if (!isBoot) {
      for (const x of list) if (x.name.trim() === 'boot' && x.zx.type === 'B') img.set([...'boot_   '].map((c) => c.charCodeAt(0)), x.id * 16);
      T.trdos(img).write(bootFor(it.name.trim(), it.zx.type, it.zx.start));
      if (M() === 'EVO') { // the EVO boot menu starts the first BASIC file: our boot changes places with the first entry
        cnt = img[0x8E4]; const first = img.slice(0, 16);
        img.copyWithin(0, (cnt - 1) * 16, cnt * 16); img.set(first, (cnt - 1) * 16);
      }
    }
    const keep = drives[d], name = baseName(keep ? keep.name : 'disk') + '.trd';
    fs.write(name, img); insertFromFs(name, d, true); E.web_disk_mark(d, was ? 1 : 0);
    if (keep) drives[d].url = keep.url;
    runRestore = isBoot ? null : { d, data: clean, was, disk: cstr(E.web_disk_name(d)), t: 0, seen: false, idle: 0 };
    return true;
  }
  function restoreRun() {
    const r = runRestore; runRestore = null;
    if (!r || !E.web_disk_present(r.d) || cstr(E.web_disk_name(r.d)) !== r.disk) return; // another disk by now
    const p = E.malloc(r.data.length);
    new Uint8Array(E.memory.buffer, p, r.data.length).set(r.data);
    E.web_disk_poke_trd(r.d, 0, 9, p);
    E.free(p);
    E.web_disk_mark(r.d, r.was ? 1 : 0);
  }
  function runRestoreFrame() { // after the start macro: activity on the drive, then 1.5 s of quiet (or 30 s anyway)
    const r = runRestore;
    if (!r) return;
    const k = new Uint8Array(E.memory.buffer, E.web_led(), 1)[0]; // 1 read, 2 / 3 write
    if (k >= 1 && k <= 3) { r.seen = true; r.idle = 0; } else r.idle++;
    if (macro) { r.idle = 0; return; }
    r.t++;
    if ((r.seen && r.idle > 75) || r.t > 1500) restoreRun();
  }
  // File Commander quick run (Enter / double click): o = { kind, src, name, ext, type }; dry = only check.
  // Returns an error text or '' (started).
  function fcRun(o, dry) {
    if (o.kind === 'TR-DOS') {
      if (o.src !== 'A') return 'Quick run: TR-DOS boots from drive A: only';
      if (o.type !== 'B' && o.type !== 'C') return 'Quick run: only BASIC and code files can be started';
      if (dry) return '';
      if (!runInject(0, o.name, o.type)) return 'Quick run failed';
      autorun(); return '';
    }
    if (o.kind === 'CP/M' && o.profi) return 'Quick run: Profi CP/M disks (.PRO) can\'t be started from here';
    if (o.kind === 'CP/M') {
      if (!/^com$/i.test(o.ext)) return 'Quick run: only .COM files can be started';
      if (!CPM_MODELS.includes(M())) return 'Quick run: CP/M .COM file needs Turbo 2+ or ZX-Evolution 4096';
      // ATM CP/M: A: = RAM disk, B: = floppy A:, C: = HDD (ZX-Evolution: HDD is not seen this way)
      // partitioned HDD 0 (config in cylinder 0): D:, E:, … as the panel shows them
      const drv = M() === 'EVO' ? { A: 'b' }[o.src] : o.src === 'A' ? 'b' : /^H0/.test(o.src) ? o.drive : '';
      if (!drv) return M() === 'EVO' ? 'Quick run: ZX-Evolution CP/M — floppy A: only (as B:)' : 'Quick run: CP/M sees only floppy A: (as B:) and HDD 0';
      if (dry) return '';
      cpmRun(drv + ':' + o.name); return '';
    }
    return 'Quick run: ' + o.kind + ' files can\'t be started from here';
  }
  // tapes: 128 menu "Tape Loader" (the ini has TapeAutoStart=1: the tape starts when the ROM reads it)
  // ROM disk: setup utility → Options → Virtual drive mode = ROM (drive A:), then Boot → vTR-dos cold (boot) or ZX-Spectrum menu
  const LEFT = [ZK.CS, ZK.K5], RIGHT = [ZK.CS, ZK.K8];
  function romDiskMacro(boot) {
    const w = (f1x) => Math.ceil(f1x / Math.max(1, SPEEDS[speedIdx]));
    runMacro([{ reset: 0 }, { wait: w(100) }, { key: ZK.SPACE }, { wait: w(30) },
      { key: LEFT }, { key: DOWN }, { key: RIGHT }, ...rep(6, { key: DOWN }), { key: ZK.ENTER },
      { key: LEFT }, { key: UP }, { key: RIGHT }, ...rep(5, { key: UP }), ...rep(boot ? 3 : 4, { key: DOWN }), { key: ZK.ENTER }]);
  }
  async function loadRomDisk(name, buf, boot) {
    const ext = extOf(name);
    if (!(['trd', 'scl', 'fdi', 'udi', 'td0', 'isd', 'pro', 'dsk'].includes(ext))) { toast('ROM disk: choose a disk image (TRD, SCL, FDI, UDI, TD0…)', true); return; }
    // any disk format → TRD through the core: a short stay in drive D:
    fs.write(name, buf); setName(name);
    const had = E.web_disk_present(3);
    if (had) { toast('ROM disk: drive D: is busy', true); return; }
    let img = null;
    if (E.web_load(3)) { setName('__romdisk.trd'); if (E.web_disk_peek_trd(3)) { img = new Uint8Array(fs.read('__romdisk.trd')); fs.remove('__romdisk.trd'); } E.web_eject(3); }
    try { fs.remove(name); } catch (e) {}
    if (!img || img.length < 0x900 || img[0x8E7] !== 0x10) { toast('ROM disk: ' + name + ' is not a TR-DOS disk', true); return; }
    const rdModel = xbiosOf(model), xrom = MODELS[rdModel].ini.ROM.ATM2; // xBIOS 1.32XT or 1.36XT
    await ensureFiles([xrom]);
    if (!fs.exists(xrom)) { toast('ROM disk: rom/' + xrom + ' not found', true); return; }
    const x = fs.read(xrom), rom = new Uint8Array(1 << 20).fill(0xFF);
    rom.fill(0, 0, ROMDISK_TRD); rom.set(img.subarray(0, ROMDISK_TRD), 0); rom.set(new Uint8Array(x), rom.length - x.byteLength);
    fs.write(ROMDISK_FILE, rom);
    romDisk = { name, model: rdModel };
    await setModel(rdModel, true);
    romDiskMacro(boot);
    toast('ROM disk: ' + name + (boot ? ' — autorun' : ''));
  }
  // xBIOS: Space opens the setup menu (cursor list, no wrap)
  const rep = (n, st) => Array.from({ length: n }, () => st);
  const LOAD_QQ = [{ key: ZK.L }, { key: ZK.O }, { key: ZK.A }, { key: ZK.D }, { key: [ZK.SS, ZK.P] }, { key: [ZK.SS, ZK.P] }, { key: ZK.ENTER }];
  function autorunTape() {
    const k = Math.max(1, 2 / SPEEDS[speedIdx]);
    const w = (f1x) => Math.ceil(f1x / Math.max(1, SPEEDS[speedIdx]));
    if (M() === 'XBIOSXT') // menu → ZX-Spectrum menu → 128 menu: 128 BASIC → LOAD ""
      runMacro([{ reset: 0 }, { wait: w(100) }, { key: ZK.SPACE }, { wait: w(30) },
        ...rep(5, { key: UP }), ...rep(4, { key: DOWN }), { key: ZK.ENTER },
        { wait: w(100) }, { key: DOWN }, { key: DOWN }, { key: ZK.ENTER }, { wait: w(60) }, ...LOAD_QQ]);
    else if (M() === 'EVO') // EVO Reset Service: T = Tape load
      runMacro([{ reset: 3 }, { wait: Math.ceil(120 * k) }, { key: ZK.T }]);
    else if (M() === 'ATM710' || M() === 'ATM450') // BIOS menu → SPECTRUM 128 → Tape Loader
      runMacro([{ reset: 0 }, { wait: w(100) }, { key: DOWN }, { key: DOWN }, { key: ZK.ENTER }, { wait: w(80) }, { key: ZK.ENTER }]);
    else // Pentagon: the 128 menu comes up with Tape Loader selected
      runMacro([{ reset: 0 }, { wait: w(80) }, { key: ZK.ENTER }]);
  }
  function autorun() {
    // the EVO service ROM needs CPU time: waits are longer at lower clock (tuned for 2x, doubled at 1x)
    const k = Math.max(1, 2 / SPEEDS[speedIdx]);
    const w = (f1x) => Math.ceil(f1x / Math.max(1, SPEEDS[speedIdx])); // ROM boot waits, tuned at 1x (shorter at higher clock)
    // the menus are walked with ZX keys: ATM mode (XT keyboard) off meanwhile, back on at the end when it was on
    const xtWas = !!(E.web_xt_kbd && E.web_xt_kbd());
    // the 128 menu takes keys after it has run a while: 1 s at the usual clock (2.5x), longer at a lower one
    const m128 = (f) => Math.max(f, Math.ceil(f * 2.5 / SPEEDS[speedIdx]));
    if (M() === 'XBIOSXT') // setup utility: Boot → "TR-dos boot" (TR-DOS 5.04R runs boot from A:)
      runMacro([{ reset: 0 }, { wait: w(100) }, { key: ZK.SPACE }, { wait: w(30) }, ...rep(5, { key: UP }), { key: DOWN }, { key: ZK.ENTER }]);
    else if (M() === 'EVO') // ZX-Evolution: EVO Reset Service, Z = TR-DOS boot, Enter = run the first program
      runMacro([{ reset: 3 }, { wait: Math.ceil(120 * k) }, { key: ZK.Z }, { wait: Math.ceil(150 * k) }, { key: ZK.ENTER }]);
    else if (M() === 'ATM710' || M() === 'ATM450') // ATM BIOS menu → SPECTRUM 128 → 128 menu: ↑ = TR-DOS (128K) → RUN
      runMacro([{ reset: 0 }, { wait: w(120) }, { key: DOWN }, { key: DOWN }, { key: ZK.ENTER }, { wait: m128(50) }, // the 128 menu counts frames (interrupts) before it takes keys
        { key: UP }, { key: ZK.ENTER }, { wait: w(120) }, { key: ZK.R }, { key: ZK.ENTER }]);
    else if (M() === 'QUORUM') // ROM-MENU: 3 = Boot DOS
      runMacro([{ reset: 0 }, { wait: w(100) }, { key: ZK.K3 }]);
    else if (M() === 'PLUS3') toast('Spectrum +3: no TR-DOS (Beta Disk) — the disk is mounted, start it from +3 BASIC', true);
    // Pentagon, Scorpion, KAY, Profi: through the reset menu into TR-DOS in 128K mode (128 BASIC set up, #7FFD paging works);
    // reset straight into TR-DOS gives 48K mode: programs then see "ZX 48K" (Quick Commander: no memory pages)
    else if (M() === 'PENTAGON') // 128 menu: ↑ from Tape Loader = TR-DOS
      runMacro([{ reset: 0 }, { wait: m128(50) }, { key: UP }, { key: ZK.ENTER }, { wait: w(120) }, { key: ZK.R }, { key: ZK.ENTER }]);
    else if (M() === 'SCORPION') // reset to the 128 menu (not the service ROM): "128 TR-DOS" is its first item and runs boot by itself
      runMacro([{ reset: 2 }, { wait: m128(70) }, { key: ZK.ENTER }]); // its 128 ROM tests memory first: a bit longer
    else if (M() === 'KAY') // reset to the 128 menu (not the service menu): "TR-DOS" is its first item
      runMacro([{ reset: 2 }, { wait: m128(50) }, { key: ZK.ENTER }, { wait: w(120) }, { key: ZK.R }, { key: ZK.ENTER }]);
    else if (M() === 'PROFI') // main menu: "TR-DOS 128K" is two below CP/M; it runs boot by itself
      runMacro([{ reset: 0 }, { wait: Math.max(120, w(300)) }, { key: DOWN }, { wait: 20 }, { key: DOWN }, { wait: 20 }, { key: ZK.ENTER }]);
    else // other machines (Custom ROM): reset straight into TR-DOS, R = RUN, Enter
      runMacro([{ reset: 1 }, { wait: w(160) }, { key: ZK.R }, { key: ZK.ENTER }]);
    if (macro && xtWas) { macro.steps.unshift({ xtmode: 0 }); macro.xtBack = true; } // keys added later (press=) still go as ZX keys
  }

  // ------------------------------------------------------------------ Load window: local server, local file, server list, URL
  const LOAD_EXT = /\.(zip|trd|scl|fdi|udi|td0|isd|pro|hob|dsk|ipf|tap|tzx|csw|sna|z80|sp|pal|\$.)$/i;
  const ldDrive = () => +$('lddrive').value;
  function ldMsg(t, err) { $('ldmsg').textContent = t || ''; $('ldmsg').classList.toggle('err', !!err); }
  function showLoad(drive) {
    $('lddrive').value = String(drive >= 0 && drive < NDRIVES ? drive : 0); // always A: unless a drive's Insert opened it
    ldMsg(''); ldStoreUI();
    fwinShow('loadwin', true);
  }
  // "//host/dir" and "host/dir" become http(s) URLs
  function normUrl(u, dir) {
    u = u.trim();
    if (!u) return '';
    if (u.startsWith('//')) u = (location.protocol === 'https:' ? 'https:' : 'http:') + u;
    else if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'http://' + u;
    if (dir && !u.endsWith('/')) u += '/';
    return u;
  }
  function urlName(u) {
    try { const p = new URL(u).pathname; return decodeURIComponent(p.slice(p.lastIndexOf('/') + 1)) || 'download'; } catch (e) { return 'download'; }
  }
  async function fetchFile(u) {
    let r;
    try { r = await fetch(u, { cache: 'no-cache' }); } catch (e) { throw new Error('cannot reach the server (network, CORS or https→http)'); }
    if (!r.ok) throw new Error(r.status === 404 ? 'not found (404)' : 'HTTP ' + r.status);
    return r;
  }
  async function loadUrl(u, drive, msg) {
    const name = urlName(u);
    if (!LOAD_EXT.test(name)) { msg('Not a disk, tape, snapshot or ZIP: ' + name, true); return false; }
    msg('Loading ' + name + '…');
    try {
      const buf = new Uint8Array(await (await fetchFile(u)).arrayBuffer());
      autorunNext = false; // "Start TRDOS boot.b" is for the disk / tape / snapshot block (Choose File) only; the server list has its own autostart
      loadingUrl = u; try { await loadBytes(name, buf, drive); } finally { loadingUrl = null; }
      autorunNext = false;
      msg('');
      return true;
    } catch (err) { msg(name + ': ' + err.message, true); return false; }
  }
  // server lists: trd/trd.json (disks) and hdd/hdd.json (HDD images) — ["game.trd", ...] or [{ "name": "...", "url": "...", "tag": "..." }, ...];
  // a path is relative to its folder ("game.trd" = trd/game.trd); "trd/game.trd" (from the site root) is accepted too.
  // Folders on the site are lower case ("TRD/x.trd" → "trd/x.trd")
  const lowDir = (u) => /^[a-z][a-z0-9+.-]*:|^\/\//i.test(u) ? u : u.replace(/^(.*\/)/, (d) => d.toLowerCase());
  // trd.json entries may carry "run": a REST API link (?model=atm710&a=trd/x.zip&cpm=b:x&xt=1); the file it mounts is the
  // entry's file, so "url" is not needed; "tag": labels drawn after the name (CPM HDD PRO SD TRD OS, several with spaces)
  const MOUNT_KEYS = ['a', 'hdd', 'sd', 'b', 'tape', 'snap'];
  function linkParse(q) { const o = {}; for (const [k, v] of new URLSearchParams(String(q).replace(/^[^?]*\?/, ''))) o[k.toLowerCase()] = v; return o; }
  const TAGS = ['CPM', 'HDD', 'PRO', 'SD', 'TRD', 'OS'];
  const tagList = (t) => String(t || '').split(/[\s,;]+/).filter(Boolean).map((x) => (/^cp\/?m$/i.test(x) ? 'CPM' : x.toUpperCase()).slice(0, 6));
  async function fetchList(json) {
    let list = [];
    try {
      const r = await fetch(json, { cache: 'no-cache' });
      if (r.ok) { const j = await r.json(); list = Array.isArray(j) ? j : (j && Array.isArray(j.files) ? j.files : []); }
    } catch (e) {}
    const dir = json.replace(/[^/]*$/, ''), out = [];
    for (const it of list) {
      let url = typeof it === 'string' ? it : it && (it.url || it.file);
      const run = typeof it === 'object' && it && typeof it.run === 'string' && it.run.trim() ? it.run.trim().replace(/^[^?]*\?/, '?') : '';
      const rp = run ? linkParse(run) : null;
      if (!url && rp) url = MOUNT_KEYS.map((k) => rp[k]).find(Boolean) || ''; // the file the link mounts (from the site root)
      if (!url && !run) continue;
      if (!url) { // a link that only picks a model (an OS on its own HDD / SD card)
        const tags = typeof it === 'object' && it.tag ? String(it.tag) : '';
        out.push({ url: '', run, rp, tag: tags, tags: tagList(tags), cpm: /cp\/?m/i.test(tags), name: (typeof it === 'object' && it.name) || (rp.model || 'link') });
        continue;
      }
      if (rp && !/^[a-z][a-z0-9+.-]*:|^\/\//i.test(url) && !url.startsWith('/')) url = '/' + url.replace(/^\.\//, ''); // run link paths are from the site root
      url = lowDir(String(url).trim().replace(/^\.\//, ''));
      if (!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(url)) url = url.replace(/%(?![0-9a-f]{2})/gi, '%25').replace(/#/g, '%23').replace(/\?/g, '%3F'); // a file name, not a URL: # ? % are part of it
      const base = url.toLowerCase().startsWith(dir) ? location.href : new URL(dir, location.href).href;
      const tag = typeof it === 'object' && it.tag ? String(it.tag) : '';
      const ub = rp && url.startsWith("/") && !url.startsWith("//") ? pageDir() + url.slice(1) : null; // a run link file: from the folder of index.html
      out.push({ url: ub ? new URL(ub).href : new URL(url, base).href, run, rp, tag, tags: tagList(tag), cpm: /cp\/?m/i.test(tag),
        name: (typeof it === 'object' && it.name) || (() => { const n = url.replace(/^.*\//, ''); try { return decodeURIComponent(n); } catch (e) { return n; } })() });
    }
    return out;
  }
  let hddList = [];
  // Load window, HDD / SD card: a "Select from server" list (hidden when the server has none)
  function srvSelect(sel, list) {
    sel.innerHTML = '<option value="" hidden disabled selected>Select from server</option>';
    list.forEach((it, i) => { const o = document.createElement('option'); o.value = i; o.textContent = it.name; sel.appendChild(o); });
    sel.hidden = !list.length;
  }
  // the "Select from server" lists show the server image that is mounted (default HDD, an OS, one chosen there); else the title
  function srvShow() {
    const abs = (u) => { try { return new URL(u, location.href).href; } catch (e) { return ''; } };
    const show = (sel, list, src, on) => { if (!sel) return; const i = on && src ? list.findIndex((x) => x.url === abs(src)) : -1; sel.value = i >= 0 ? String(i) : ''; };
    const hdOn = (d) => !!(hdds[d] && E && E.web_hdd_get(d, 5));
    show($('ldhddsrv'), hddList, hddSrc[+$('ldhddn').value], hdOn(+$('ldhddn').value));
    for (let d = 0; d < NHDD; d++) { const g = $('hddgeo' + d); if (g) show(g.querySelector('.srv'), hddList, hddSrc[d], hdOn(d)); }
    const sdIn = !!(sdName && fs.exists(sdName));
    show($('ldsdsrv'), sdList, sdSrc, sdIn); show($('sdgeo') && $('sdgeo').querySelector('.srv'), sdList, sdSrc, sdIn);
  }
  // Load window: HDD and SD card rows show what Options / Disk has mounted
  function ldStoreUI() {
    if (!$('ldhddname') || !E) return;
    const rdOpt = $('lddrive').querySelector('[value="9"]'); rdOpt.hidden = M() !== 'XBIOSXT'; // ROM disk: xBIOS XT only
    if (rdOpt.hidden && ldDrive() === ROM_TARGET) $('lddrive').value = '0';
    const dd = ldDrive(), dn = dd === ROM_TARGET ? (romDisk ? romDisk.name : '') : E.web_disk_present(dd) ? (drives[dd] ? drives[dd].name : cstr(E.web_disk_name(dd)).replace(/^.*[\\/]/, '')) + (E.web_disk_changed(dd) ? ' *' : '') : '';
    $('lddname').textContent = dn || '— empty —'; $('lddname').classList.toggle('off', !dn); $('lddej').hidden = !dn;
    const d = +$('ldhddn').value, on = !!(hdds[d] && E.web_hdd_get(d, 5));
    $('ldhddname').textContent = on ? hdds[d] + (hddDirty[d] ? ' *' : '') : (E.web_hdd_scheme(-1) ? '— empty —' : '— empty (interface off) —');
    $('ldhddname').classList.toggle('off', !on); $('ldhddej').hidden = !on;
    const sd = !!(sdName && fs.exists(sdName));
    $('ldsdname').textContent = sd ? sdName + (sdDirty ? ' *' : '') : sdOn() ? '— empty —' : '— empty (Z-Controller off) —';
    $('ldsdname').classList.toggle('off', !sd); $('ldsdej').hidden = !sd;
    srvShow();
  }
  function bindLdStore() {
    $('ldhddn').onchange = ldStoreUI;
    // ⏏: the same as the buttons in Options / Disk
    $('lddej').onclick = () => { const d = ldDrive(); if (d === ROM_TARGET) $('romdiskdel').click(); else $('drv' + d).querySelector('.eject').click(); ldStoreUI(); };
    $('ldhddej').onclick = () => { $('hdd' + $('ldhddn').value).querySelector('.eject').click(); ldStoreUI(); };
    $('ldsdej').onclick = () => { $('sdcard').querySelector('.eject').click(); ldStoreUI(); };
    $('lddrive').addEventListener('change', ldStoreUI);
    $('ldhddfile').onclick = () => hddPick(+$('ldhddn').value);
    $('ldsdfile').onclick = () => $('sdfile').click();
    $('ldhddsrv').onchange = async (e) => {
      const it = e.target.value === '' ? null : hddList[+e.target.value]; if (!it) return;
      const d = +$('ldhddn').value; ldMsg('Loading ' + it.name + '…');
      try { await hddFromBytes(d, it.url.replace(/^.*\//, ''), await fetchBytes(it.url)); hddSrc[d] = it.url; ldMsg(''); } catch (err) { ldMsg(err.message, true); }
      srvShow();
    };
    $('ldsdsrv').onchange = async (e) => {
      const it = e.target.value === '' ? null : sdList[+e.target.value]; if (!it) return;
      ldMsg('Loading ' + it.name + '…');
      try { await sdFromBytes(it.url.replace(/^.*\//, ''), await fetchBytes(it.url)); sdSrc = it.url; ldMsg(''); } catch (err) { ldMsg(err.message, true); }
      srvShow();
    };
  }
  async function loadHddList() {
    hddList = await fetchList('hdd/hdd.json');
    srvSelect($('ldhddsrv'), hddList);
    document.querySelectorAll('#hdds .srv').forEach((sel) => {
      sel.innerHTML = '<option value="" hidden disabled selected>Select from server</option>' + hddList.map((it, i) => `<option value="${i}"></option>`).join('');
      hddList.forEach((it, i) => { sel.options[i + 1].textContent = it.name; });
      sel.hidden = !hddList.length;
    });
    srvShow();
  }
  async function loadServerList() {
    srvList = await fetchList('trd/trd.json');
    const pop = $('ldpop'); pop.innerHTML = '';
    srvList.forEach((it, i) => {
      const d = document.createElement('div');
      d.className = 'dditem'; d.dataset.i = i;
      d.innerHTML = '<span class="ddname"></span>' + (it.tag ? tagIcon(it) : '');
      d.firstChild.textContent = it.name;
      d.onmousedown = (e) => { e.preventDefault(); srvPick(i); ddOpen(false); };
      pop.appendChild(d);
    });
    $('ldlistsec').hidden = !srvList.length;
    srvPick(-1);
  }
  // the tag of a list entry is drawn on the right as a small framed label (CP/M images: CPM)
  function tagIcon(it) {
    return (it.tags || []).map((t) => { t = t.replace(/[<>&"]/g, ''); return `<span class="tagic txt${TAGS.includes(t) ? ' tag-' + t.toLowerCase() : ''}" title="${t}">${t}</span>`; }).join('');
  }
  let srvList = [], srvSel = -1;
  function srvPick(i) {
    if (!srvList.length) return;
    const cur = $('ldlist').querySelector('.ddcur');
    if (i < 0) { // nothing chosen yet
      srvSel = -1; cur.innerHTML = '<span class="ddname ddph">Select from server</span>';
      $('ldpop').querySelectorAll('.dditem').forEach((d) => d.classList.remove('on')); $('ldlistgo').disabled = true; runRowUI(); return;
    }
    srvSel = Math.max(0, Math.min(srvList.length - 1, i)); $('ldlistgo').disabled = false;
    const it = srvList[srvSel];
    cur.innerHTML = '<span class="ddname"></span>' + (it.tag ? tagIcon(it) : '');
    cur.firstChild.textContent = it.name;
    $('ldpop').querySelectorAll('.dditem').forEach((d) => d.classList.toggle('on', +d.dataset.i === srvSel));
    runRowUI();
  }
  // an entry with a run link: "Autostart after load" (the link is started, on the machine chosen here) or just mount its file
  const linkModelKey = (v) => { if (!v) return null; const k = v.toLowerCase().replace(/[\s_-]/g, ''); return MODEL_ALIASES[k] || Object.keys(MODELS).find((x) => x.toLowerCase() === k) || null; };
  function runModels(rp) { // machines the link can start on
    const m = linkModelKey(rp.model) || 'ATM710';
    if (OS_MODELS[m]) return [m];
    if (rp.cpm) return ['ATM710', 'XBIOSXT', 'XBIOS136', 'EVO'];
    return Object.keys(LINK_NAME).filter((k) => !OS_MODELS[k] && !(k === 'PLUS3' && (rp.a || rp.b)));
  }
  function runRowUI() {
    const it = srvList[srvSel], row = $('ldrunrow');
    row.hidden = !(it && it.run);
    if (row.hidden) return;
    const on = load('ld.autostart') !== '0', sel = $('ldrunmodel'), ms = runModels(it.rp), def = linkModelKey(it.rp.model) || ms[0];
    $('ldrun').checked = on;
    sel.innerHTML = ms.map((k) => `<option value="${k}">${MODELS[k].name}</option>`).join('');
    sel.value = ms.includes(def) ? def : ms[0];
    sel.hidden = !on || ms.length < 2; $('ldrunone').hidden = !on || ms.length !== 1; $('ldrunone').textContent = 'on ' + MODELS[sel.value].name;
  }
  // start a REST API link on this page (the model is switched when it is another one), or mount its files only
  async function runLink(q, mk, mountOnly) {
    const p = linkParse(q);
    if (mountOnly) { // Autostart off: only the files go in, the machine stays (an OS entry: its HDD / SD card image)
      const os = OS_MODELS[linkModelKey(p.model)];
      for (const k of Object.keys(p)) if (!MOUNT_KEYS.includes(k)) delete p[k];
      if (os && !p.hdd && !p.sd) { if (os.sd) p.sd = os.sd; else if (os.hdd) p.hdd = os.hdd; }
      // HDD / SD card as in Load / Options: no interface switching, no reset
      for (const [k, put] of [['hdd', async (n, b, u) => { cpmDirNoReset = true; try { await hddFromBytes(0, n, b); } finally { cpmDirNoReset = false; } hddSrc[0] = u; hddUI(); }], ['sd', async (n, b, u) => { await sdFromBytes(n, b); sdSrc = u; sdUI(); }]]) {
        if (!p[k]) continue;
        const url = new URL(lowDir(p[k]), location.href).href, name = urlName(url); delete p[k];
        ldMsg('Loading ' + name + '…');
        try { await put(name, new Uint8Array(await (await fetchFile(url)).arrayBuffer()), url); ldMsg(''); toast((k === 'sd' ? 'SD card: ' : 'HDD 0: ') + name); }
        catch (err) { ldMsg(name + ': ' + err.message, true); return false; }
      }
      if (!Object.keys(p).length) { srvShow(); return true; }
    }
    else if (mk) p.model = LINK_NAME[mk] || mk;
    if (!mountOnly && p.cpm) p.xt = '1'; // CP/M programs: ATM mode (XT keyboard) always on
    if (!Object.keys(p).length) { ldMsg('Nothing to mount in this entry', true); return false; }
    const want = mountOnly ? null : linkModelKey(p.model);
    LINK = p;
    try {
      if (want && (want !== model || OS_MODELS[want])) await setModel(want, true);
      await linkApply();
    } finally { LINK = {}; }
    return true;
  }
  function ddOpen(v) {
    const pop = $('ldpop');
    pop.hidden = !v; $('ldlist').classList.toggle('open', v);
    if (v) { // fixed position, inside the visible screen and the Load window (as the other lists, usel.js)
      const r = $('ldlist').getBoundingClientRect(), vv = window.visualViewport, wr = $('loadwin').getBoundingClientRect();
      let lo = Math.max(4, vv ? vv.offsetTop + 4 : 4), hi = Math.min(window.innerHeight, vv ? vv.height + vv.offsetTop : 1e9) - 4;
      if (Math.max(wr.bottom - r.bottom, r.top - wr.top) >= 100) { hi = Math.min(hi, wr.bottom - 4); lo = Math.max(lo, wr.top + 4); }
      pop.style.left = r.left + 'px'; pop.style.width = r.width + 'px'; pop.style.maxHeight = ''; pop.style.bottom = '';
      const below = hi - r.bottom - 2, above = r.top - 2 - lo, want = Math.min(pop.scrollHeight, 320);
      if (below >= Math.min(want, 120) || below >= above) { pop.style.top = (r.bottom + 2) + 'px'; pop.style.maxHeight = Math.max(60, below) + 'px'; }
      else { pop.style.top = Math.max(lo, r.top - 2 - Math.min(pop.scrollHeight, above)) + 'px'; pop.style.maxHeight = Math.max(60, above) + 'px'; }
      const on = pop.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
    }
  }
  // local server: browse an HTTP directory listing (Apache / nginx / IIS autoindex, python -m http.server …)
  let brBase = '', brCur = '';
  function brStat(t, err) { $('brstat').textContent = t || ''; $('brstat').classList.toggle('err', !!err); }
  async function brOpen(u) {
    brCur = u;
    const pu = new URL(u); $('brpath').textContent = decodeURIComponent(pu.pathname); $('brpath').title = decodeURI(u);
    const list = $('brlist'); list.innerHTML = '';
    brStat('Reading…');
    let html;
    try { html = await (await fetchFile(u)).text(); }
    catch (err) { brStat(err.message, true); addUp(); return; }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const here = new URL(u), seen = new Set(), dirs = [], files = [];
    for (const a of doc.querySelectorAll('a[href]')) {
      const raw = a.getAttribute('href');
      if (!raw || raw.startsWith('?') || raw.startsWith('#') || /^(mailto|javascript):/i.test(raw)) continue;
      let t; try { t = new URL(raw, here); } catch (e) { continue; }
      if (t.origin !== here.origin || !t.pathname.startsWith(here.pathname) || t.pathname === here.pathname) continue; // only what is inside this folder
      const rest = decodeURIComponent(t.pathname.slice(here.pathname.length));
      const isDir = rest.endsWith('/');
      const name = isDir ? rest.slice(0, -1) : rest;
      if (!name || name.includes('/') || seen.has(t.href)) continue;
      seen.add(t.href);
      if (isDir) dirs.push({ name, href: t.href });
      else if (LOAD_EXT.test(name)) files.push({ name, href: t.href });
    }
    const cmp = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    dirs.sort(cmp); files.sort(cmp);
    addUp();
    for (const d of dirs) addItem('dir', d.name + '/', () => brOpen(d.href));
    for (const f of files) addItem('file', f.name, async () => {
      if (await loadUrl(f.href, ldDrive(), brStat)) brStat('Loaded: ' + f.name);
    });
    brStat(dirs.length + files.length ? `${dirs.length} folders, ${files.length} files` : 'No folders or loadable files here');
    const first = list.querySelector('button'); if (first) first.focus();
  }
  function addItem(cls, text, fn) {
    const b = document.createElement('button');
    b.className = cls;
    b.innerHTML = '<span class="ic">' + (cls === 'dir' ? '▸' : cls === 'up' ? '↰' : '·') + '</span><span></span>';
    b.lastChild.textContent = text;
    b.onclick = fn;
    $('brlist').appendChild(b);
  }
  function addUp() {
    const here = new URL(brCur);
    if (here.pathname === '/' ) return;
    const up = new URL('..', here).href;
    addItem('up', '..', () => brOpen(up));
  }
  function bindLoad() {
    const saved = load('ldsrv'); if (saved) $('ldsrv').value = saved;
    $('ldfile').onclick = () => { pendingDrive = ldDrive(); fromLoadWin = true; $('file').click(); };
    $('ldauto').checked = load('ldauto') === '1';
    $('ldauto').onchange = () => { store('ldauto', $('ldauto').checked ? '1' : '0'); $('ldpressrow').hidden = !$('ldauto').checked; };
    $('ldpressrow').hidden = !$('ldauto').checked;
    if (load('ldpress') !== null) $('ldpress').value = load('ldpress');
    $('ldpress').addEventListener('input', () => store('ldpress', $('ldpress').value));
    $('ldsrvgo').onclick = () => {
      const u = normUrl($('ldsrv').value, true);
      if (!u) { ldMsg('Enter the server folder, e.g. //192.168.1.1/trd/', true); return; }
      store('ldsrv', $('ldsrv').value.trim());
      ldMsg('');
      brBase = u; $('brtitle').textContent = new URL(u).host;
      fwinShow('browsewin', true);
      if (!fwins.browsewin.moved) { // first time: next to the Load window
        const r = $('loadwin').getBoundingClientRect();
        const bw = $('browsewin'), vw = document.documentElement.clientWidth, sp = snapRight(r, bw);
        sp.x = Math.max(4, Math.min(sp.x, vw - bw.offsetWidth - 4)); // no room on either side: overlap, but stay on screen
        fwins.browsewin.setPos(sp); fwins.browsewin.moved = true;
      }
      brOpen(u);
    };
    $('ldsrv').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('ldsrvgo').click(); });
    $('ldrun').onchange = () => { store('ld.autostart', $('ldrun').checked ? '1' : '0'); runRowUI(); };
    $('ldlistgo').onclick = async () => {
      const it = srvList[srvSel];
      if (!it) return;
      ddOpen(false);
      if (it.run) { const ok = await runLink(it.run, $('ldrunmodel').value, !$('ldrun').checked); if (ok) fwinShow('loadwin', false); return; }
      if (await loadUrl(it.url, ldDrive(), ldMsg)) fwinShow("loadwin", false);
    };
    const dd = $('ldlist');
    dd.onmousedown = (e) => { e.preventDefault(); dd.focus(); ddOpen($('ldpop').hidden); };
    dd.onblur = () => ddOpen(false);
    document.addEventListener('pointerdown', (e) => { if (!$('ldpop').hidden && !$('ldpop').contains(e.target) && !dd.contains(e.target)) ddOpen(false); }, true); // e.g. dragging the window
    dd.onkeydown = (e) => {
      const open = !$('ldpop').hidden;
      if (e.key === 'ArrowDown') { srvPick(srvSel + 1); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { srvPick(Math.max(0, srvSel - 1)); e.preventDefault(); }
      else if (e.key === 'Home') { srvPick(0); e.preventDefault(); }
      else if (e.key === 'End') { srvPick(srvList.length - 1); e.preventDefault(); }
      else if (e.key === 'Enter') { if (open) ddOpen(false); else $('ldlistgo').click(); e.preventDefault(); }
      else if (e.key === ' ') { ddOpen(!open); e.preventDefault(); }
      else if (e.key === 'Escape' && open) { ddOpen(false); e.preventDefault(); e.stopPropagation(); }
      if (open) { const on = $('ldpop').querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' }); }
    };
    for (const id of ['loadwin', 'browsewin', 'savedlg', 'zippick'])
      $(id).querySelector('[data-close]').onclick = () => fwinShow(id, false);
    loadServerList(); loadHddList(); loadSdList();
  }
  // ------------------------------------------------------------------ Save dialog: everything is downloaded to the PC
  function downloadBytes(name, data) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  // files the emulator itself wrote (debugger Alt+W blocks, quick saves): kept in page memory until downloaded
  const emuFiles = new Map(); // key -> display name
  fs.onChange = (path) => {
    const name = path.replace(/^.*[\\/]/, '');
    if (name.startsWith('__')) return;   // our own temporary files
    if (/^(cmos|nvram|web_model\.ini)$/i.test(name)) return; // CMOS / NVRAM live for the session only
    const hd = hdds.findIndex((h) => h && h.toLowerCase() === name.toLowerCase());
    if (hd >= 0) { if (!hddDirty[hd]) { hddDirty[hd] = true; hddUI(); } return; } // HDD images: written by the emulator → '*'
    if (sdName && sdName.toLowerCase() === name.toLowerCase()) { if (!sdDirty) { sdDirty = true; sdUI(); } return; }
    const isNew = !emuFiles.has(name.toLowerCase());
    emuFiles.set(name.toLowerCase(), name);
    if (isNew) toast('Written: ' + name + ' — Save to download');
  };
  const DISK_FMT = ['trd', 'fdi', 'udi', 'td0'];
  const hexv = (t) => { const v = parseInt(String(t).trim().replace(/^#|^0x|^\$/i, ''), 16); return isNaN(v) ? null : v; };
  const baseName = (n) => n.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
  function diskBase(d) {
    if (drives[d]) return baseName(drives[d].name);
    const n = E.web_disk_present(d) ? cstr(E.web_disk_name(d)) : '';
    return n ? baseName(n) : 'disk' + DRV[d];
  }
  const svExt = () => (['isd', 'pro', 'scl'].includes($('svfmt').value) ? $('svfmt').value : DISK_FMT[+$('svfmt').value]);
  function diskIsIsd(d) { // 1024-byte sectors (iS-DOS 800K)
    if (!E.web_disk_peek_isd) return false;
    setName('__chk.isd'); const ok = !!E.web_disk_peek_isd(d);
    try { fs.remove('__chk.isd'); } catch (e) {}
    return ok;
  }
  // Save / ROM: the ROMs of the models, the General Sound ROM and everything rom/roms.json lists — one entry per file
  function svRomList() {
    const sel = $('svrom'), was = sel.value, seen = new Map();
    const put = (f, t) => { if (!/\.rom$/i.test(f)) return; const k = f.toLowerCase(); if (!seen.has(k)) seen.set(k, [f, []]); if (!seen.get(k)[1].includes(t)) seen.get(k)[1].push(t); };
    for (const [k, v] of Object.entries(MODELS)) if (!OS_MODELS[k] && !v.custom) put(v.files[0], v.sysName || v.name);
    put(GS_ROM, 'General Sound');
    for (const r of romJson.length ? romJson : romParts) if (r.page === undefined || !seen.has(r.file.toLowerCase())) put(r.file, r.name); // pages of a model ROM: the model says it
    sel.innerHTML = '';
    for (const [f, t] of seen.values()) { const o = document.createElement('option'); o.value = f; o.textContent = f + ' · ' + t.join(', '); sel.appendChild(o); }
    sel.value = seen.has(was.toLowerCase()) ? was : sel.options.length ? sel.options[0].value : '';
  }
  function openSave(what) {
    if (!E) return;
    svRomList(); if (!romPartsLoaded) loadRomParts().then(() => { svRomList(); if ($('svtype').value === 'srvrom') svUpdate(true); });
    const sel = $('svtype'); sel.innerHTML = '';
    const add = (v, t, parent) => { const o = document.createElement('option'); o.value = v; o.textContent = t; (parent || sel).appendChild(o); };
    for (let i = 0; i < NDRIVES; i++) if (E.web_disk_present(i)) add('disk:' + i, `Disk ${DRV[i]}: ${diskBase(i)}${E.web_disk_changed(i) ? ' *' : ''}`);
    for (let d = 0; d < NHDD; d++) if (hdds[d] && fs.exists(hdds[d])) add('hdd:' + d, `HDD ${d}: ${hdds[d]}${hddDirty[d] ? ' *' : ''}`);
    if (sdName && fs.exists(sdName)) add('sd', `SD card: ${sdName}${sdDirty ? ' *' : ''}`);
    add('sna', 'Snapshot (SNA)');
    add('scr', 'Screen (SCR)');
    add('png', 'Screenshot (PNG)');
    add('mem', 'Memory block (BIN)');
    add('srvrom', 'ROM');
    add('rom', 'Custom ROM');
    if (emuFiles.size) {
      const g = document.createElement('optgroup'); g.label = 'Written by the emulator'; sel.appendChild(g);
      for (const n of emuFiles.values()) add('file:' + n, n, g);
    }
    if (what && [...sel.options].some((o) => o.value === what)) sel.value = what;
    releaseAll(); releaseMouse();
    svUpdate(true);
    fwinShow('savedlg', true);
  }
  let svExtCur = ''; // extension of the file to save (trd, scl, sna…): the name field may drop it, the file keeps it
  const svBase = (v, ext) => { let b = String(v).trim().replace(/\.zip$/i, ''); const e = ext === undefined ? svExtCur : ext; if (e && b.toLowerCase().endsWith('.' + e.toLowerCase())) b = b.slice(0, -(e.length + 1)); return b || 'file'; };
  const svName = (base, zip) => base + (zip ? '.zip' : svExtCur ? '.' + svExtCur : '');
  function svUpdate(resetName) {
    const t = $('svtype').value, disk = t.startsWith('disk:'), mem = t === 'mem';
    document.querySelectorAll('#savedlg .sv-disk').forEach((e) => { e.hidden = !disk; });
    document.querySelectorAll('#savedlg .sv-mem').forEach((e) => { e.hidden = !mem; });
    document.querySelectorAll('#savedlg .sv-rom').forEach((e) => { e.hidden = t !== 'srvrom'; });
    let name = '', note = '';
    if (disk) {
      const d = +t.slice(5);
      if (resetName) {
        // iS-DOS disks (5 × 1024-byte sectors, 800K): ISD instead of TRD; others: as loaded (TRD/FDI), otherwise UDI
        const isd = diskIsIsd(d);
        $('svfmt').querySelector('[value="0"]').hidden = isd; $('svfmt').querySelector('[value="scl"]').hidden = isd; $('svfmt').querySelector('[value="isd"]').hidden = !isd; $('svfmt').querySelector('[value="pro"]').hidden = !isd;
        const ext = drives[d] ? drives[d].ext : 'trd';
        $('svfmt').value = isd ? (ext === 'fdi' ? '1' : ext === 'udi' ? '2' : ext === 'td0' ? '3' : ext === 'pro' ? 'pro' : 'isd')
          : ext === 'fdi' ? '1' : ext === 'scl' ? 'scl' : ['trd', 'hob'].includes(ext) || ext.startsWith('$') ? '0' : ext === 'td0' ? '3' : '2';
      }
      name = diskBase(d) + '.' + svExt();
      note = $('svfmt').value === '0' ? 'TRD holds only standard 80 tracks (16×256 sectors). Suits for TR-DOS and CP/M. For iS-DOS and other formats use FDI or UDI.'
        : $('svfmt').value === 'scl' ? 'SCL: TR-DOS files only (no free space, deleted files dropped).'
        : $('svfmt').value === 'isd' || $('svfmt').value === 'pro' ? ($('svfmt').value === 'pro' ? 'PRO: raw Profi CP/M image (800K, 5 × 1024-byte sectors, boot sector 9).' : 'ISD: raw iS-DOS image (800K, 5 × 1024-byte sectors).') + (E.web_disk_changed(d) ? ' The disk was modified (*). Downloading clears the mark.' : '')
        : E.web_disk_changed(d) ? 'The disk was modified (*). Downloading clears the mark.' : '';
    } else if (t.startsWith('hdd:')) {
      const d = +t.slice(4);
      name = hdds[d];
      note = 'HDD image with its geometry.chs (Interface, CHS, drives).' + (hddDirty[d] ? ' The image was modified (*). Downloading clears the mark.' : '');
    } else if (t === 'sd') {
      name = sdName.replace(/\.[^.]*$/, '') + '.vhd';
      note = 'SD image as VHD (can be mounted on PC).' + (sdDirty ? ' It was modified (*). Downloading clears the mark.' : '');
    } else if (t === 'sna') {
      name = 'snapshot.sna';
      note = 'SNA holds 128K only. Memory above 128K and ATM ports will be lost.';
    } else if (t === 'png') {
      name = 'screen.png';
      note = 'Screenshot as on screen (any video mode, border included).';
    } else if (t === 'scr') {
      name = 'screen.scr';
      note = 'ZX screen (6912 bytes) of the active page 5 or 7. ATM EGA/text modes are not a ZX screen.';
    } else if (mem) {
      const st = hexv($('svstart').value) || 0;
      name = 'block_' + st.toString(16).toUpperCase().padStart(4, '0') + '.bin';
      note = 'Start and length in hex. RAM: linear address (page × #4000 + offset).';
    } else if (t === 'srvrom') {
      name = $('svrom').value || 'rom';
      note = 'The ROM file as it is on the server (rom/), not changed.';
    } else if (t === 'rom') {
      const z = romZip(); name = z ? z.name.replace(/\.zip$/i, '') : 'rom';
      note = 'ROM + json. Can be loaded as a custom ROM.';
    } else if (t.startsWith('file:')) {
      name = t.slice(5);
      note = 'Written by the emulator into page memory (e.g. debugger Alt+W, quick save).';
    }
    // the field: aaa.zip when packed (the file inside always gets the extension of the format), else aaa.<ext>
    const was = svExtCur; svExtCur = t === 'rom' ? '' : (/\.([^.]+)$/.exec(name) || ['', ''])[1];
    const base = resetName || !$('svname').value ? name.replace(/\.[^.]*$/, '') : svBase($('svname').value, was);
    $('svname').value = svName(base, $('svzip').checked || t === 'rom');
    $('svnote').textContent = note;
  }
  // the geometry.chs of HDD d: the one it came with (if the geometry is still the same) or made from the settings
  function hddChs(d) {
    const g = hddGeom(d), old = g.chs && parseChs(g.chs);
    if (old && old.c === g.c && old.h === g.h && old.s === g.s) return g.chs;
    return [`# ${hdds[d]}`, `CHS=${g.c}/${g.h}/${g.s}`, `Interface=${IF_NAMES[E.web_hdd_scheme(-1)] || 'ATM'}`, ...(g.dir ? [`DirEntries=${g.dir}`] : []), ...(g.parts || []).map((p) => `${p.fs === 'isdos' ? 'ISDOS' : 'CPM'}=${p.letter} ${p.c0}-${p.c1}` + (p.note ? '  # ' + p.note : '')), ''].join('\r\n');
  }
  // SCL: "SINCLAIR", file count, 14-byte headers (TR-DOS catalogue entries without the position), the files' sectors, a 32-bit sum
  function trdToScl(img) {
    if (img.length < 0x900 || img[0x8E7] !== 0x10) return null;
    const files = [];
    for (let i = 0; i < 128; i++) {
      const e = img.subarray(i * 16, i * 16 + 16);
      if (e[0] === 0) break;
      if (e[0] === 1) continue;
      files.push(e);
    }
    const size = 9 + files.length * 14 + files.reduce((n, e) => n + e[13] * 256, 0);
    const out = new Uint8Array(size + 4);
    out.set([...'SINCLAIR'].map((c) => c.charCodeAt(0))); out[8] = files.length;
    let o = 9;
    for (const e of files) { out.set(e.subarray(0, 14), o); o += 14; }
    for (const e of files) { const off = (e[15] * 16 + e[14]) * 256, n = e[13] * 256; out.set(img.subarray(off, off + n), o); o += n; }
    let sum = 0; for (let i = 0; i < size; i++) sum = (sum + out[i]) >>> 0;
    out[size] = sum & 255; out[size + 1] = (sum >>> 8) & 255; out[size + 2] = (sum >>> 16) & 255; out[size + 3] = sum >>> 24;
    return out;
  }
  async function doSave() {
    const t = $('svtype').value, zip = $('svzip').checked;
    store('sv.zip', zip ? '1' : '0');
    const sbase = svBase($('svname').value.replace(/[\\/:*?"<>|]/g, '_')), full = sbase + (svExtCur ? '.' + svExtCur : ''); // aaa.trd: the file itself
    let name = zip || t === 'rom' ? sbase + '.zip' : full;
    let data = null;
    if (t === 'rom') { // always a ZIP: the image and custom.json
      const z = romZip(); if (!z) { toast('No ROM to save', true); return; }
      const fn = /\.zip$/i.test(name) ? name : name + '.zip';
      downloadBytes(fn, await UnrealZip.create(z.files)); toast('Downloaded: ' + fn);
      fwinShow('savedlg', false); return;
    }
    if (t.startsWith('hdd:')) { // image + geometry.chs: one ZIP, or two files
      const d = +t.slice(4), img = hdds[d] && fs.read(hdds[d]);
      if (!img) { toast('Nothing to save', true); return; }
      const chs = new TextEncoder().encode(hddChs(d)), inner = full;
      if (zip) { toast('Packing ' + name + '…'); downloadBytes(/\.zip$/i.test(name) ? name : name + '.zip', await UnrealZip.create([{ name: inner, data: img }, { name: 'geometry.chs', data: chs }])); }
      else { downloadBytes(name, img); downloadBytes('geometry.chs', chs); }
      hddDirty[d] = false; hddUI();
      toast('Downloaded: ' + (zip && !/\.zip$/i.test(name) ? name + '.zip' : name) + (zip ? '' : ' + geometry.chs'));
      fwinShow('savedlg', false); updateUI(); return;
    }
    if (t.startsWith('disk:') && ($('svfmt').value === 'isd' || $('svfmt').value === 'pro')) { // raw 800K: the same bytes, the loader numbers the sectors by the extension
      const d = +t.slice(5);
      setName('__save.isd');
      if (!E.web_disk_peek_isd(d)) { toast('Drive ' + DRV[d] + ': not a disk of 1024-byte sectors', true); return; }
      data = fs.read('__save.isd').slice(); fs.remove('__save.isd'); E.web_disk_mark(d, 0);
    } else if (t.startsWith('disk:') && $('svfmt').value === 'scl') {
      const d = +t.slice(5);
      setName('__save.trd');
      if (!E.web_save_disk(d, 0)) { toast('Cannot save drive ' + DRV[d] + ' as SCL', true); return; }
      const trd = fs.read('__save.trd'); fs.remove('__save.trd');
      data = trdToScl(trd); if (!data) { toast('Drive ' + DRV[d] + ': not a TR-DOS disk', true); return; }
    } else if (t === 'png') {
      data = new Uint8Array(await (await new Promise((res) => canvas.toBlob(res, 'image/png'))).arrayBuffer());
    } else if (t.startsWith('disk:')) {
      const d = +t.slice(5), type = +$('svfmt').value, ext = DISK_FMT[type];
      setName('__save.' + ext);
      if (!E.web_save_disk(d, type)) { toast('Cannot save drive ' + DRV[d] + ' as ' + ext.toUpperCase(), true); return; }
      data = fs.read('__save.' + ext); fs.remove('__save.' + ext);
    } else if (t === 'sna') {
      setName('__save.sna');
      if (!E.web_save_sna()) { toast('Cannot save the snapshot', true); return; }
      data = fs.read('__save.sna'); fs.remove('__save.sna');
    } else if (t === 'scr') {
      const page = (E.web_p7ffd() & 8) ? 7 : 5;
      data = new Uint8Array(E.memory.buffer, E.web_gfx_mem(1, 0, 0) + page * 0x4000, 6912).slice();
    } else if (t === 'mem') {
      const src = +$('svsrc').value, size = E.web_gfx_size(src);
      const st = hexv($('svstart').value), len = hexv($('svlen').value);
      if (st === null || !len || st >= size) { toast('Check start and length', true); return; }
      const n = Math.min(len, size - st);
      const p = E.web_gfx_mem(src, st, n);
      data = new Uint8Array(E.memory.buffer, p + (src === 1 ? st : 0), src === 1 ? n : 0x10000).slice(src === 1 ? 0 : st, src === 1 ? n : st + n);
    } else if (t.startsWith('file:')) {
      data = fs.read(t.slice(5));
    } else if (t === 'srvrom') {
      const f = $('svrom').value; if (!f) { toast('Choose a ROM', true); return; }
      try { data = fs.exists(f) ? fs.read(f).slice() : await fetchSrv(f); } catch (e) { toast(f + ': ' + e.message, true); return; }
    } else if (t === 'sd') {
      data = sdName && fs.read(sdName); if (data) { data = vhdFixed(data); sdDirty = false; sdUI(); }
    }
    if (!data) { toast('Nothing to save', true); return; }
    if (zip) { // aaa.zip with aaa.trd inside
      downloadBytes(name, await UnrealZip.create([{ name: full, data }]));
    } else downloadBytes(name, data);
    toast('Downloaded: ' + name);
    fwinShow('savedlg', false); updateUI();
  }
  function bindSave() {
    $('savebtn').onclick = () => openSave();
    $('svtype').onchange = () => svUpdate(true);
    $('svrom').onchange = () => svUpdate(true);
    $('svfmt').onchange = () => svUpdate(false);
    $('svstart').addEventListener('input', () => { if ($('svtype').value === 'mem') svUpdate(true); });
    $('svgo').onclick = doSave;
    $('dbgdlg').querySelector('[data-close]').onclick = dlgClose;
    $('svzip').checked = load('sv.zip') !== '0';
    $('svzip').onchange = () => { $('svname').value = svName(svBase($('svname').value), $('svzip').checked || $('svtype').value === 'rom'); };
    $('savedlg').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); doSave(); } });
  }

  // ------------------------------------------------------------------ System Info: everything about the machine, the emulator and the browser in one window
  let siFW = null, siTimer = 0;
  const VMODES = { 0: 'EGA 320×200, 16 colors', 2: 'hi-res 640×200', 3: 'ZX 256×192', 6: 'text 80×25', 7: 'ZX 256×192' };
  function siData() {
    const kv = {};
    for (const ln of cstr(E.web_sysinfo()).split('\n')) { const i = ln.indexOf('\t'); if (i > 0) kv[ln.slice(0, i)] = ln.slice(i + 1); }
    return kv;
  }
  const optText = (id) => { const s = $(id); return s && s.selectedIndex >= 0 ? s.options[s.selectedIndex].textContent : ''; };
  const mb = (n) => n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + ' MB' : Math.round(n / 1024) + ' KB';
  function siSections() {
    const k = siData(), x = SPEEDS[speedIdx], m = MODELS[model], atm = /^ATM|XBIOS|EVO/.test(M());
    const secs = Math.floor(+k.frames / (+k.intfq || 50));
    const state = dbgOn ? 'debugger' : userPaused ? 'stopped' : hiddenPaused ? 'paused (tab hidden)' : turbo ? 'running, max speed' : 'running';
    const ff77 = parseInt(k.pff77, 16), vmode = atm ? (VMODES[ff77 & 7] || 'mode ' + (ff77 & 7)) : 'ZX 256×192';
    const out = [];
    out.push(['Machine', [
      ['Model', m.name], ['Core', k.model], ['RAM', k.ram + ' KB'],
      ['ROM', model === 'CUSTOM' ? MACHINES[customCfg.mach].name + ': ' + m.files.filter((f) => /\.rom$/i.test(f)).map((f) => (crFile(f) || { name: f }).name).join(', ') : m.files.filter((f) => /\.rom$/i.test(f)).join(', ') + (romDisk && M() === 'XBIOSXT' ? ' + ROM disk ' + romDisk.name : '')],
      ['CPU clock', hud.mhz + ' (' + x + 'x)' + (m.fixed ? ', fixed' : '')],
      ['Frame', k.frame + ' t-states, ' + k.intfq + ' Hz'],
      ['State', state + ' · ' + hud.fps],
      ['Emulated time', Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') + ' (' + k.frames + ' frames)'],
    ]]);
    out.push(['CPU', null, `<div class="regs">${[['PC', k.pc], ['SP', k.sp], ['AF', k.af], ['BC', k.bc], ['DE', k.de], ['HL', k.hl], ['IX', k.ix], ['IY', k.iy], ['IR', k.ir], ['IM', k.im], ['IFF', k.iff1], ['HALT', k.halted === '1' ? 'yes' : 'no']].map(([a, b]) => `<b>${a}</b><span>${b}</span>`).join('')}</div>`]);
    const mem = [['#7FFD', k.p7ffd + ' (RAM page ' + (parseInt(k.p7ffd, 16) & 7) + ', screen ' + ((parseInt(k.p7ffd, 16) & 8) ? 7 : 5) + ', ROM ' + ((parseInt(k.p7ffd, 16) >> 4) & 1) + ')']];
    if (atm) mem.push(['#FF77', k.pff77 + ' (video: ' + vmode + ')'], ['#xFF7 map', k.pfff7], ['#EFF7', k.peff7]);
    else if (M() === 'PENTAGON') mem.push(['#EFF7', k.peff7]);
    out.push(['Memory & video', mem.concat([
      ['Video mode', vmode], ['Picture', canvas.width + '×' + canvas.height + ' → ' + canvas.style.width + ' × ' + canvas.style.height],
      ['Border', k.border], ['Palette', $('palsel').value], ['Filter', optText('fxsel')],
    ])]);
    const dk = [];
    for (let i = 0; i < 4; i++) {
      const f = (k['fdd' + i] || '').split('|');
      if (f[0] !== '1') { if (i < NDRIVES) dk.push([DRV[i] + ':', '<span class="dim">empty</span>']); continue; }
      const nm = drives[i] ? drives[i].name : cstr(E.web_disk_name(i)).replace(/^.*[\\/]/, '');
      dk.push([DRV[i] + ':', esc(nm) + ` <span class="dim">· ${f[1]} cyl × ${f[2]} · track ${f[3]}${f[4] === '1' ? ' · modified' : ''}${E.web_get_wp(i) ? ' · WP' : ''}${f[5] === '1' ? ' · selected' : ''}${f[6] === '1' ? ' · motor' : ''}</span>`]);
    }
    dk.push(['TR-DOS', k.trdos === '1' ? 'present' : 'none']);
    const hsc = E.web_hdd_scheme(-1);
    dk.push(['FDD', E.web_fdd_accurate && E.web_fdd_accurate(-1) ? 'accurate (WD1793 timing, no traps)' : 'fast (TR-DOS traps)']);
    dk.push(['HDD', hsc ? optText('hddif') : '<span class="dim">off</span>']);
    if (hsc) for (let d = 0; d < NHDD; d++) {
      const on = !!E.web_hdd_get(d, 5), g = hddGeom(d);
      dk.push([d ? 'Slave' : 'Master', on ? esc(hdds[d]) + ` <span class="dim">· CHS ${g.c}/${g.h}/${g.s}${g.ro ? ' · RO' : ''}</span>` : '<span class="dim">empty</span>']);
    }
    const tp = (k.tape || '').split('|');
    dk.push(['Tape', tp[0] === '1' || +k.tapeblocks ? (tp[1] === '1' ? 'playing' : 'stopped') + ', block ' + (+tp[2] + 1) + ' of ' + k.tapeblocks : '<span class="dim">none</span>']);
    out.push(['Storage', dk]);
    out.push(['WD1793', wdRows(k.wdx)]);
    const ac = audio && audio.ctx;
    out.push(['Sound', [
      ['Output', ac ? ac.state + ', ' + ac.sampleRate + ' Hz' + (ac.baseLatency ? ', latency ' + Math.round(ac.baseLatency * 1000) + ' ms' : '') + (audio.sp ? ', ScriptProcessor' : ', AudioWorklet') : 'not started (needs a click or key)'],
      ['Volume', muted ? 'muted' : 'on'], ['Emulator rate', k.sndrate + ' Hz'],
      ['AY', optText('aysel') + ', ' + optText('aychip') + (+k.activeay ? ', active chip ' + (+k.activeay + 1) : '')],
      ['General Sound', optText('gssel') + ($('gssel').value === '2' ? (E.web_get_gs() ? ' — on now' : ' — off now') : '')], ['Visualizer', optText('vizsel')],
    ]]);
    out.push(['Input', [
      ['Keyboard', k.xt === '1' ? 'ATM mode: emulator hotkeys off' : 'ZX matrix, emulator hotkeys on'],
      ['Mouse', E.web_mouse_type() === 1 ? 'Kempston: ' + (mouseLocked ? 'on (captured)' : touchMouse ? 'on (touch taps)' : 'off') : 'none'],
      ['On-screen', $('vkbd').hidden ? 'hidden' : (vkbd ? vkbd.tab.toUpperCase() : '') + ' panel'],
      ['Joystick', ({ sinclair2: 'Sinclair 2', sinclair1: 'Sinclair 1', kempston: 'Kempston' })[load('vkjoy') || 'sinclair2']],
    ]]);
    const ua = navigator.userAgent, br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'browser';
    const ver = (ua.match(/(?:Edg|OPR|Firefox|CriOS|Chrome|Version)\/(\d+)/) || [])[1] || '';
    out.push(['Host', [
      ['Browser', br + (ver ? ' ' + ver : '') + ' · ' + (navigator.userAgentData && navigator.userAgentData.platform || navigator.platform || '')],
      ['Screen', screen.width + '×' + screen.height + ', DPR ' + (window.devicePixelRatio || 1) + ', window ' + innerWidth + '×' + innerHeight],
      ['CPU threads', navigator.hardwareConcurrency || '?'], ['Device memory', navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '?'],
      ['Touch', matchMedia('(pointer: coarse)').matches ? 'yes' : 'no'],
      ['WASM memory', mb(E.memory.buffer.byteLength)],
      ['Page', 'Web Unreal Speccy v.' + APP_VER],
    ]]);
    return out;
  }
  // WD1793 (Beta 128): registers, state machine and the selected drive, as the Windows debugger shows them
  const WD_STATES = ['S_IDLE', 'S_WAIT', 'S_DELAY_BEFORE_CMD', 'S_CMD_RW', 'S_FOUND_NEXT_ID', 'S_RDSEC', 'S_READ', 'S_WRSEC', 'S_WRITE', 'S_WRTRACK',
    'S_WR_TRACK_DATA', 'S_TYPE1_CMD', 'S_STEP', 'S_SEEKSTART', 'S_RESTORE', 'S_SEEK', 'S_VERIFY', 'S_VERIFY2', 'S_WAIT_HLT', 'S_WAIT_HLT_RW', 'S_EJECT1', 'S_EJECT2'];
  function wdRows(t) {
    const f = (t || '').split('|'); if (f.length < 20) return [['—', '<span class="dim">no data</span>']];
    const hx = (v) => '#' + v, cmd = parseInt(f[0], 16), st = parseInt(f[1], 16), rq = parseInt(f[5], 16);
    const type1 = !(cmd & 0x80) || (cmd & 0xF0) === 0xD0; // type I and IV: index / track 0 / head loaded / seek error
    const bits = type1 ? ['WDS_BUSY', 'WDS_INDEX', 'WDS_TRK00', 'WDS_CRCERR', 'WDS_SEEKERR', 'WDS_HEADL', 'WDS_WRITEP', 'WDS_NOTRDY']
      : ['WDS_BUSY', 'WDS_DRQ', 'WDS_LOST', 'WDS_CRCERR', 'WDS_NOTFOUND', (cmd & 0xE0) === 0xA0 || (cmd & 0xF0) === 0xF0 ? 'WDS_WRFAULT' : 'WDS_RECORDT', 'WDS_WRITEP', 'WDS_NOTRDY'];
    const flags = (v, names) => { const n = names.filter((x, i) => x && (v >> i) & 1); return n.length ? ' <span class="dim">[' + n.join(' ') + ']</span>' : ''; };
    const yn = (v) => (v === '1' ? 'True' : 'False');
    return [['CMD', hx(f[0])], ['STATUS', hx(f[1]) + flags(st, bits)], ['TRK', hx(f[2])], ['SEC', hx(f[3])], ['DATA', hx(f[4])],
      ['beta', hx(f[5]) + flags(rq, [0, 0, 0, 0, 0, 0, 'DRQ', 'INTRQ'])], ['system', hx(f[6])],
      ['state', WD_STATES[+f[7]] || f[7]], ['state2', WD_STATES[+f[8]] || f[8]], ['drive', f[9]], ['side', f[10]],
      ['time', f[11]], ['next', f[12]], ['tshift', f[13]], ['rwptr', f[14]], ['rwlen', f[15]],
      ['CYL COUNT', f[16]], ['HEAD POS', f[17]], ['READY', yn(f[18])], ['TR00', yn(f[19])]];
  }
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function siRender() {
    if (!E || $('sysinfo').hidden) return;
    const b = $('sibody'), top = b.scrollTop;
    b.innerHTML = siSections().map(([t, rows, raw]) => `<h4>${t}</h4>` + (raw || '<table>' + rows.map(([a, v]) => `<tr><td>${esc(a)}</td><td class="v">${typeof v === 'string' && /<span/.test(v) ? v : esc(v)}</td></tr>`).join('') + '</table>')).join('');
    b.scrollTop = top;
  }
  function siText() {
    return siSections().map(([t, rows, raw]) => '[' + t + ']\n' + (rows ? rows.map(([a, v]) => a.padEnd(16) + String(v).replace(/<[^>]+>/g, '')).join('\n') : $('sibody').querySelector('.regs').innerText.replace(/\n(\w+)\n/g, ' $1=').replace(/\n/g, ' '))).join('\n\n');
  }
  function showSysInfo(v) {
    const w = $('sysinfo');
    w.hidden = !v; $('sibtn').classList.toggle('on', v);
    clearInterval(siTimer);
    if (v) { siFW.place(); siRender(); siTimer = setInterval(siRender, 500); }
    else canvas.focus();
  }
  // ------------------------------------------------------------------ Performance (Tools): live graphs of the machine's load
  // Z80: the part of each frame before a HALT; Host: browser time spent emulating; Memory: RAM pages written;
  // Disk: frames with drive activity; I/O: port accesses per frame; Frames: emulated frames per second
  const PF_N = 60, PF_DT = 500; // 60 samples, 2 a second (30 s)
  const pf = { host: 0, frames: 0, disk: 0, diskW: 0, sums: null, t: 0, timer: null, tiles: {} };
  const PF_TILES = [
    { id: 'z80', name: 'Z80 code at', color: '#f0a050', max: 100 },
    { id: 'host', name: 'Host', color: '#5aa9ff', max: 100 },
    { id: 'mem', name: 'Memory', color: '#c084fc', max: 100 },
    { id: 'disk', name: 'Disk', color: '#4ade80', max: 100 },
    { id: 'io', name: 'I/O', color: '#22d3ee', max: 0 },
    { id: 'fps', name: 'Frames', color: '#facc15', max: 0, limit: 55 },
  ];
  function pfBuild() {
    const g = $('pfgrid'); g.innerHTML = '';
    for (const t of PF_TILES) {
      const el = document.createElement('div'); el.className = 'pft';
      el.innerHTML = `<div class="h"><span>${t.name}</span><b style="color:${t.color}">—</b></div><canvas></canvas><div class="s">&nbsp;</div>`;
      g.appendChild(el);
      pf.tiles[t.id] = { def: t, el, val: el.querySelector('b'), sub: el.querySelector('.s'), cv: el.querySelector('canvas'), data: [] };
    }
  }
  function pfCanvas(cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(cv.clientWidth * dpr)), h = Math.max(1, Math.round(cv.clientHeight * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const g = cv.getContext('2d'); g.clearRect(0, 0, w, h);
    return { g, w, h, dpr };
  }
  // memory: one cell per 16K page, lit when written (fades out over a few seconds), mapped pages outlined
  function pfMemMap(tile, heat, mapped) {
    const { g, w, h, dpr } = pfCanvas(tile.cv), n = heat.length;
    const cols = n <= 8 ? 8 : n <= 64 ? 16 : 32, rows = Math.ceil(n / cols), gap = Math.max(1, Math.round(dpr));
    const cw = (w - gap * (cols - 1)) / cols, ch = Math.min((h - gap * (rows - 1)) / rows, cw * 1.6);
    const y0 = (h - (ch * rows + gap * (rows - 1))) / 2;
    for (let p = 0; p < n; p++) {
      const x = (p % cols) * (cw + gap), y = y0 + Math.floor(p / cols) * (ch + gap), v = heat[p];
      g.fillStyle = v > 0.02 ? `rgba(192,132,252,${(0.18 + 0.82 * v).toFixed(3)})` : 'rgba(255,255,255,.06)';
      g.fillRect(x, y, cw, ch);
      if (mapped.has(p)) { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = gap; g.strokeRect(x + gap / 2, y + gap / 2, cw - gap, ch - gap); }
    }
  }
  // Z80: where the code runs in the 64K address space — 4 rows (16K banks) × 16 cells of 1K, brighter = more time there
  function pfZ80Map(tile, heat, banks) {
    const { g, w, h, dpr } = pfCanvas(tile.cv), lw = Math.round(26 * dpr), gap = Math.max(1, Math.round(dpr));
    const cw = (w - lw - gap * 15) / 16, ch = (h - gap * 3) / 4;
    g.font = `${Math.round(9 * dpr)}px ui-monospace, Consolas, monospace`; g.textBaseline = 'middle';
    for (let r = 0; r < 4; r++) {
      const y = r * (ch + gap);
      g.fillStyle = banks[r] < 0 ? 'rgba(240,160,80,.75)' : 'rgba(225,232,240,.55)';
      g.fillText(banks[r] < 0 ? 'ROM' : 'R' + banks[r], 0, y + ch / 2);
      for (let c = 0; c < 16; c++) {
        const v = heat[r * 16 + c], x = lw + c * (cw + gap);
        g.fillStyle = v > 0.02 ? `rgba(240,160,80,${(0.15 + 0.85 * v).toFixed(3)})` : 'rgba(255,255,255,.05)';
        g.fillRect(x, y, cw, ch);
      }
    }
  }
  function pfDraw(tile) {
    const { cv, data, def } = tile;
    const { g, w, h, dpr } = pfCanvas(cv);
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
    for (let i = 1; i < 4; i++) { const y = Math.round(h * i / 4) + .5; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const max = def.max || Math.max(def.limit ? def.limit * 1.25 : 8, ...data) * 1.15;
    if (data.length < 2) return;
    const x = (i) => w - (data.length - 1 - i) * (w / (PF_N - 1)), y = (v) => h - 1 - Math.min(1, v / max) * (h - 3);
    // a series drawn in its color; with a limit (Frames: real time), the part above it in red
    const paint = (color, clip) => {
      g.save();
      if (clip) { g.beginPath(); g.rect(0, clip[0], w, clip[1] - clip[0]); g.clip(); }
      g.beginPath(); g.moveTo(x(0), h); data.forEach((v, i) => g.lineTo(x(i), y(v))); g.lineTo(x(data.length - 1), h); g.closePath();
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, color + '55'); gr.addColorStop(1, color + '08');
      g.fillStyle = gr; g.fill();
      g.beginPath(); data.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
      g.strokeStyle = color; g.lineWidth = 1.5 * dpr; g.lineJoin = 'round'; g.stroke();
      g.restore();
    };
    if (def.limit) {
      const yl = y(def.limit);
      paint(def.color, [yl, h]); paint('#f05252', [0, yl]);
      g.strokeStyle = 'rgba(240,82,82,.35)'; g.setLineDash([3 * dpr, 3 * dpr]); g.lineWidth = dpr;
      g.beginPath(); g.moveTo(0, Math.round(yl) + .5); g.lineTo(w, Math.round(yl) + .5); g.stroke(); g.setLineDash([]);
    } else paint(def.color);
  }
  function pfPut(id, v, text, sub, over) {
    const t = pf.tiles[id]; t.data.push(v); if (t.data.length > PF_N) t.data.shift();
    t.over = !!over; t.val.style.color = over ? '#f05252' : t.def.color;
    t.val.textContent = text; t.sub.textContent = sub;
    if (id !== 'mem' && id !== 'z80') pfDraw(t);
  }
  function pfFrame(hostMs) { pf.host += hostMs; }
  function pfDisk() { // per frame: the drive LED (1 read, 2 / 3 write)
    const k = new Uint8Array(E.memory.buffer, E.web_led(), 1)[0];
    if (k >= 1 && k <= 3) { pf.disk++; if (k > 1) pf.diskW++; }
    pf.frames++;
  }
  function pfSample() {
    if (!E) return;
    const now = performance.now(), dt = pf.t ? now - pf.t : PF_DT; pf.t = now;
    const r = new Uint32Array(E.memory.buffer, E.web_perf(), 6 + 256 + 64);
    const busy = r[1] ? r[0] / r[1] / 10 : 0, frames = pf.frames;
    // where the Z80 runs its code (sampled every 256 t-states): ROM (BIOS, BASIC, TR-DOS) or the program in RAM
    const code = r[4] + r[5], rom = code ? r[4] * 100 / code : 0;
    let hot = -1; for (let p = 0; p < 256; p++) if (r[6 + p] && (hot < 0 || r[6 + p] > r[6 + hot])) hot = p;
    // address map: share of the samples per 1K block, kept glowing for a moment
    if (!pf.zheat) pf.zheat = new Float32Array(64);
    let hmax = 0, hk = -1; for (let k = 0; k < 64; k++) if (r[262 + k] > hmax) { hmax = r[262 + k]; hk = k; }
    for (let k = 0; k < 64; k++) pf.zheat[k] = Math.max(pf.zheat[k] * 0.55, hmax ? Math.sqrt(r[262 + k] / hmax) : 0);
    const banks = [0, 1, 2, 3].map((a) => (E.web_gfx_page ? E.web_gfx_page(a) : -1));
    pfPut('z80', rom, hk >= 0 ? '#' + (hk << 10).toString(16).toUpperCase().padStart(4, '0') : '—',
      !r[1] ? (isPaused() ? 'paused' : 'stopped') : 'ROM ' + Math.round(rom) + '% · RAM ' + Math.round(100 - rom) + '% · busy ' + Math.round(busy) + '%');
    pfZ80Map(pf.tiles.z80, pf.zheat, banks);
    const host = pf.host / dt * 100;
    pfPut('host', host, Math.round(host) + '%', frames ? (pf.host / frames).toFixed(2) + ' ms / frame' : 'idle');
    // RAM: pages (16K) whose contents changed since the last sample
    const n = E.web_gfx_size(1), ram = new Int32Array(E.memory.buffer, E.web_gfx_mem(1, 0, 0), n >> 2), pages = n >> 14;
    if (!pf.sums || pf.sums.length !== pages) { pf.sums = new Int32Array(pages); pf.heat = new Float32Array(pages); }
    let changed = 0;
    for (let p = 0; p < pages; p++) {
      let h = 0; const o = p << 12;
      for (let i = 0; i < 4096; i += 3) h = (h * 31 + ram[o + i]) | 0;
      pf.heat[p] *= 0.7;
      if (h !== pf.sums[p]) { changed++; pf.sums[p] = h; pf.heat[p] = 1; }
    }
    // RAM pages mapped into the Z80 address space right now (ATM / Pentagon paging): outlined in the map
    const mapped = new Set();
    for (let a = 0; a < 4; a++) { const pa = E.web_gfx_page ? E.web_gfx_page(a) : -1; if (pa >= 0) mapped.add(pa); }
    pfPut('mem', changed * 100 / pages, changed + ' / ' + pages, 'pages written · ' + (n >> 10) + ' KB');
    pfMemMap(pf.tiles.mem, pf.heat, mapped);
    const disk = frames ? pf.disk * 100 / frames : 0;
    pfPut('disk', disk, Math.round(disk) + '%', pf.disk ? (pf.diskW ? 'writing' : 'reading') + ' · ' + pf.disk + ' frames' : 'idle');
    const io = r[1] ? (r[2] + r[3]) / r[1] : 0;
    pfPut('io', io, Math.round(io) + '/f', r[1] ? 'in ' + Math.round(r[2] / r[1]) + ' · out ' + Math.round(r[3] / r[1]) + ' per frame' : 'idle');
    const fps = frames * 1000 / dt;
    pfPut('fps', fps, Math.round(fps), fps > 55 ? 'frames / s · faster than real time' : 'frames / s · target 50', fps > 55);
    pf.host = 0; pf.frames = 0; pf.disk = 0; pf.diskW = 0;
    $('pfstate').textContent = model === 'EVO' ? 'ZXEVO' : model;
  }
  let pfFW = null, pfHelpFW = null;
  // the help opens at the Performance window's side (right, or left when there is no room) with the same height; then it can be dragged
  function pfHelp(v) {
    const h = $('pfhelp'), w = $('perfwin');
    if (!pfHelpFW) pfHelpFW = floatWin(h, 'pfhelppos', () => ({ x: 0, y: 0 }));
    h.hidden = !v; $('pfhelpbtn').classList.toggle('on', v);
    if (!v) return;
    const r = w.getBoundingClientRect();
    h.style.height = r.height + 'px'; pfHelpFW.setPos(snapRight(r, h));
  }
  function showPerf(v) {
    $('perfwin').hidden = !v; $('pfbtn').classList.toggle('on', v);
    if (!v) pfHelp(false);
    clearInterval(pf.timer); pf.timer = null;
    if (v) {
      if (!pf.tiles.z80) pfBuild();
      pfFW.place(); E && E.web_perf(); pf.t = performance.now(); pf.host = pf.frames = pf.disk = pf.diskW = 0;
      pf.timer = setInterval(pfSample, PF_DT);
    } else canvas.focus();
  }
  function bindPerf() {
    pfFW = floatWin($('perfwin'), 'perfpos', () => {
      const r = $('screenwrap').getBoundingClientRect(), w = $('perfwin').offsetWidth, vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.right - w - 8, vw - w - 4)), y: Math.max(8, r.top + 8) };
    });
    $('pfbtn').onclick = () => { toolsMenu(false); showPerf($('perfwin').hidden); };
    $('pfclose').onclick = () => showPerf(false);
    $('pfhelpbtn').onclick = (e) => { e.stopPropagation(); pfHelp($('pfhelp').hidden); };
    $('pfhelpclose').onclick = () => pfHelp(false);
    $('perfwin').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); showPerf(false); } });
  }
  function bindSysInfo() {
    siFW = floatWin($('sysinfo'), 'sysinfopos', () => {
      const r = $('screenwrap').getBoundingClientRect(), w = $('sysinfo').offsetWidth, vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.right - w - 8, vw - w - 4)), y: Math.max(8, r.top + 8) };
    });
    $('sibtn').onclick = () => { toolsMenu(false); showSysInfo($('sysinfo').hidden); };
    $('siclose').onclick = () => showSysInfo(false);
    $('sicopy').onclick = async () => {
      const t = siText();
      try { await navigator.clipboard.writeText(t); toast('System info copied'); }
      catch (e) { downloadBytes('sysinfo.txt', new TextEncoder().encode(t)); }
    };
    $('sysinfo').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); showSysInfo(false); } });
  }

  // ------------------------------------------------------------------ REST API link builder (Tools): the link for the current machine, to copy
  const LINK_NAME = { ATM710: 'atm710', XBIOSXT: 'xbiosxt', XBIOS136: 'xbios136', ATM450: 'atm450', EVO: 'evo', PENTAGON: 'pentagon', SCORPION: 'scorpion', PROFI: 'profi', KAY: 'kay', PLUS3: 'plus3', QUORUM: 'quorum', TASIS: 'tasis', CHIC: 'chic', NEDOOS: 'nedoos' };
  let raFW = null;
  const pageDir = () => location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
  function relUrl(u) { // a file on this site → its path next to index.html
    try { const x = new URL(u, location.href), d = pageDir(); return x.href.startsWith(d) ? decodeURI(x.href.slice(d.length)) : x.href; } catch (e) { return u; }
  }
  const linkEnc = (v) => encodeURIComponent(v).replace(/%2F/gi, '/').replace(/%3A/gi, ':').replace(/%7C/gi, '|');
  function raBuild() {
    const on = (k) => $('ra_' + k).checked, q = [], rom = on('rom') && $('rav_rom').value.trim();
    if (rom) q.push('rom=' + linkEnc(rom)); // the Custom ROM ZIP brings its machine: no model=
    else if (on('model')) q.push('model=' + $('rav_model').value);
    $('rav_model').disabled = $('ra_model').disabled = !!rom;
    if (on('speed')) q.push('speed=' + $('rav_speed').value);
    if (on('a') && $('rav_a').value.trim()) q.push('a=' + linkEnc($('rav_a').value.trim()));
    if (on('hdd') && $('rav_hdd').value.trim()) q.push('hdd=' + linkEnc($('rav_hdd').value.trim()));
    if (on('sd') && $('rav_sd').value.trim()) q.push('sd=' + linkEnc($('rav_sd').value.trim()));
    const st = $('rav_start').value;
    $('ral_run').hidden = $('rar_run').hidden = st !== 'run'; $('ral_cpm').hidden = $('rav_cpm').hidden = st !== 'cpm';
    $('ral_press').hidden = $('rav_press').hidden = st !== 'autorun';
    if (st === 'autorun') { q.push('autorun=1'); if ($('rav_press').value.trim()) q.push('press=' + linkEnc($('rav_press').value.trim())); }
    if (st === 'run') { const f = ($('rav_run').hidden ? $('rav_runtxt').value : $('rav_run').value).trim(); if (f) q.push('run=' + linkEnc(f)); }
    if (st === 'cpm' && $('rav_cpm').value.trim()) q.push('cpm=' + linkEnc($('rav_cpm').value.trim()));
    if (on('xt')) q.push('xt=1');
    if (on('mute')) q.push('mute=1');
    if (on('swapmouse')) q.push('swapmouse=1');
    if (on('kbd')) q.push('kbd=' + $('rav_kbd').value);
    $('raout').value = location.href.replace(/[?#].*$/, '') + (q.length ? '?' + q.join('&') : '');
    let note = '';
    if (st === 'cpm' && !rom && !CPM_MODELS.includes($('rav_model').value.toUpperCase())) note = 'cpm= needs model atm710 / evo';
    if (on('rom') && !rom) note = 'rom=: put the path or URL of a Custom ROM ZIP';
    $('ranote').textContent = note;
  }
  function raFiles() {
    const dl = $('ra_files'); dl.innerHTML = '';
    for (const it of srvList) { if (!it.url || (it.rp && !it.rp.a)) continue; const o = document.createElement('option'); o.value = relUrl(it.url); o.label = it.name + (it.cpm ? ' [CP/M]' : ''); o.textContent = o.label; dl.appendChild(o); }
    const hl = $('ra_hdds'); hl.innerHTML = '';
    for (const it of hddList) { const o = document.createElement('option'); o.value = relUrl(it.url); o.label = it.name; o.textContent = it.name; hl.appendChild(o); }
    const sl = $('ra_sds'); sl.innerHTML = '';
    for (const it of sdList) { const o = document.createElement('option'); o.value = relUrl(it.url); o.label = it.name; o.textContent = it.name; sl.appendChild(o); }
  }
  function raPicked(d) { // a disk from files.json chosen: its tag decides the start (CP/M: atm710, ATM mode, cpm=)
    const v = $('rav_a').value.trim(); $('ra_a').checked = !!v;
    const it = srvList.find((x) => relUrl(x.url) === v);
    if (!it || !it.cpm) return;
    $('rav_model').value = 'atm710'; $('ra_model').checked = true; $('ra_xt').checked = true; $('rav_start').value = 'cpm';
    if (!$('rav_cpm').value.trim() && !d) $('rav_cpm').value = 'b:'; // drive A: of the emulator is B: in CP/M
  }
  function raFill() {
    raFiles();
    const ms = $('rav_model');
    if (!ms.options.length) for (const [k, v] of Object.entries(LINK_NAME)) { const o = document.createElement('option'); o.value = v; o.textContent = v + ' — ' + MODELS[k].name; ms.appendChild(o); }
    ms.value = LINK_NAME[model] || ms.value;
    $('rav_rom').value = model === 'CUSTOM' && romLinkUrl ? relUrl(romLinkUrl) : ''; $('ra_rom').checked = !!$('rav_rom').value; // a Custom ROM from a file of this computer has no URL: put the ZIP on a site
    const sp = $('rav_speed');
    if (!sp.options.length) SPEEDS.forEach((x) => { const o = document.createElement('option'); o.value = String(x); o.textContent = x + 'x (' + (3.5 * x).toFixed(2).replace(/\.?0+$/, '') + ' MHz)'; sp.appendChild(o); });
    sp.value = String(SPEEDS[speedIdx]); $('ra_speed').checked = SPEEDS[speedIdx] !== MODELS[model].speed;
    const u = drives[0] && drives[0].url && E.web_disk_present(0) ? relUrl(drives[0].url) : '';
    $('rav_a').value = u; $('ra_a').checked = !!u;
    const h = hdds[0] && hddSrc[0] && !OS_MODELS[model] ? relUrl(hddSrc[0]) : '';
    $('rav_hdd').value = h; $('ra_hdd').checked = !!h && !/(^|\/)cpm\.(zip|hdd)$/i.test(h); // the default cpm.zip needs no hdd=
    const sv = sdName && sdSrc && !(OS_MODELS[model] && OS_MODELS[model].sd) ? relUrl(sdSrc) : '';
    $('rav_sd').value = sv; $('ra_sd').checked = !!sv;
    // run=: BASIC and code files of the TR-DOS disk in A:
    const sel = $('rav_run'); sel.innerHTML = '';
    let names = [];
    if (E.web_disk_present(0)) {
      setName('__ra.trd');
      if (E.web_disk_peek_trd(0)) { const img = new Uint8Array(fs.read('__ra.trd')); if (img[0x8E7] === 0x10) names = UnrealFC._test.trdos(img).list().filter((x) => x.zx.type === 'B' || x.zx.type === 'C').map((x) => x.name.trim() + ' <' + x.zx.type + '>'); }
      try { fs.remove('__ra.trd'); } catch (e) {}
    }
    names.forEach((n) => { const o = document.createElement('option'); o.value = n.replace(/ <.>$/, ''); o.textContent = n; sel.appendChild(o); });
    sel.hidden = !names.length; $('rav_runtxt').hidden = !!names.length;
    $('ra_xt').checked = !!E.web_xt_kbd() && MODELS[model].xt; $('ra_mute').checked = muted; $('ra_swapmouse').checked = !!(E.web_mouse_swap && E.web_mouse_swap(-1));
    $('rav_kbd').value = $('vkbd').hidden ? 'off' : (vkbd && vkbd.tab) || 'zx';
    raBuild();
  }
  function showRest(v) {
    $('restwin').hidden = !v; $('rabtn').classList.toggle('on', v);
    if (!v) raHelp(false);
    if (v) { raFill(); raFW.place(); } else canvas.focus();
  }
  function bindRest() {
    raFW = floatWin($('restwin'), 'restpos', () => {
      const r = $('screenwrap').getBoundingClientRect(), w = $('restwin').offsetWidth, vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.left + (r.width - w) / 2, vw - w - 4)), y: Math.max(8, r.top + 40) };
    });
    $('rabtn').onclick = () => { toolsMenu(false); showRest($('restwin').hidden); };
    $('raclose').onclick = () => showRest(false);
    $('rav_a').addEventListener('change', () => raPicked(0)); $('rav_hdd').addEventListener('change', () => { $('ra_hdd').checked = !!$('rav_hdd').value.trim(); });
    $('rav_sd').addEventListener('change', () => { $('ra_sd').checked = !!$('rav_sd').value.trim(); });
    $('rav_kbd').addEventListener('change', () => { $('ra_kbd').checked = true; });
    $('restwin').addEventListener('input', raBuild); $('restwin').addEventListener('change', raBuild);
    $('restwin').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); showRest(false); } });
    $('racopy').onclick = async () => {
      try { await navigator.clipboard.writeText($('raout').value); toast('Link copied'); }
      catch (e) { $('raout').select(); document.execCommand && document.execCommand('copy'); toast('Link selected — copy it'); }
    };
    $('raopen').onclick = () => window.open($('raout').value, '_blank');
    $('rav_rom').addEventListener('input', () => { $('ra_rom').checked = !!$('rav_rom').value.trim(); });
    $('rahelpbtn').onclick = (e) => { e.stopPropagation(); raHelp($('rahelp').hidden); };
    $('rahelpclose').onclick = () => raHelp(false);
  }
  // help of the REST API window: at its side (right, or left when there is no room), the same height; then it can be dragged
  let raHelpFW = null;
  function raHelp(v) {
    const h = $('rahelp'), w = $('restwin');
    if (!raHelpFW) raHelpFW = floatWin(h, 'rahelppos', () => ({ x: 0, y: 0 }));
    h.hidden = !v; $('rahelpbtn').classList.toggle('on', v);
    if (!v) return;
    const r = w.getBoundingClientRect();
    h.style.height = Math.max(r.height, 360) + 'px'; raHelpFW.setPos(snapRight(r, h));
  }

  // ------------------------------------------------------------------ UI
  function updateUI() {
    if (!E) return;
    hddUI(); eff7UI();
    const xt = E.web_xt_kbd(), xtt = xt ? 'XT-Keyboard: on' : 'XT-Keyboard: off';
    $('xt').classList.toggle('on', !!xt);
    if ($('xt').title !== xtt) $('xt').title = xtt;
    for (let i = 0; i < NDRIVES; i++) {
      const present = E.web_disk_present(i);
      const el = $('drv' + i);
      el.querySelector('.dname').textContent = present ? (drives[i] ? drives[i].name : cstr(E.web_disk_name(i)).replace(/^.*[\\/]/, '')) : '— empty —';
      el.classList.toggle('changed', !!(present && E.web_disk_changed(i)));
      el.querySelector('.save').disabled = !present;
      el.querySelector('.eject').disabled = !present;
      el.querySelector('.wp').checked = !!E.web_get_wp(i);
    }
  }

  // ------------------------------------------------------------------ HDD: IDE images (interface and geometry from unreal.ini)
  const HDD_DEFAULT = { url: 'hdd/cpm.hdd', name: 'cpm.hdd' }; // mounted as master by default
  const NHDD = 2, HDN = ['0', '1'];
  const hdds = [null, null];  // name of the image in the in-memory FS (survives model switches)
  let hddIni = null, hddDefaultTried = false;
  const hddGeom = (d) => { try { return JSON.parse(load('hdd.geo' + d)) || hddIni[d]; } catch (e) { return hddIni[d]; } };
  function hddMount(d) {
    const g = hddGeom(d);
    setName(hdds[d] || '');
    const ok = E.web_hdd_mount(d, g.c, g.h, g.s, g.lba, g.ro ? 1 : 0);
    if (hdds[d] && !ok) { toast('HDD ' + d + ': cannot open ' + hdds[d], true); hdds[d] = null; }
    return ok;
  }
  // HDD interface per machine: ZX-Evolution defaults to NEMO-DIVIDE, the rest keep the old common choice
  // ZX-Evolution: the IDE is built in (NEMO-DIVIDE ports) — always on: software probes it (NedoOS hung at "Drive D mounted"
  // with no controller: the ports read #FF = busy forever)
  // by memory model: +3 has its µPD765 on #2FFD/#3FFD, which the ATM IDE ports would hide (the ROM hangs at start) — no IDE;
  // Profi / Scorpion / KAY: their usual interfaces (PROFI, SMUC, NEMO)
  const HDD_IF_DEF = { ATM3: '4', PLUS3: '0', QUORUM: '0', PROFI: '6', SCORPION: '5', PROFSCORP: '5', KAY: '2' }, HDD_IF_FIXED = { ATM3: '4', PLUS3: '0' };
  const himem = () => (MODELS[model].ini.MISC && MODELS[model].ini.MISC.HIMEM) || 'ATM710';
  const hddKey = () => (model === 'CUSTOM' ? 'CUSTOM.' + himem() : M());
  const hddIfPref = () => { const h = himem(); if (HDD_IF_FIXED[h]) return HDD_IF_FIXED[h];
    const xi = crX().hdd ? IF_NAMES.indexOf(String(crX().hdd).toUpperCase()) : -1; if (xi >= 0) return String(xi); // a Custom ROM ZIP's interface
    const v = load('hdd.if.' + hddKey()); return v !== null ? v : HDD_IF_DEF[h] !== undefined ? HDD_IF_DEF[h] : load('hdd.if'); };
  async function applyHdd() {
    if (!hddIni) hddIni = [0, 1].map((d) => ({ c: E.web_hdd_get(d, 0), h: E.web_hdd_get(d, 1), s: E.web_hdd_get(d, 2), lba: 0, ro: !!E.web_hdd_get(d, 4) })); // LBA 0 = size of the image (the ini LBA is a real drive's)
    const sc = hddIfPref();
    if (sc !== null) E.web_hdd_scheme(+sc);
    if (!hddDefaultTried && E.web_hdd_scheme(-1) !== 0 && !OS_MODELS[model] && /^(ATM710|PENTAGON)$/.test(himem())) { // the default image: fetched once, only when an interface is on (an OS model brings its own)
      hddDefaultTried = true;
      // hdd/cpm.zip (CPM.zip) first — image + geometry from the archive — then the plain hdd/cpm.hdd
      let ok = false;
      for (const u of ['hdd/cpm.zip', 'hdd/CPM.zip']) {
        try { await hddFromBytes(0, 'cpm.zip', await fetchBytes(u), true); ok = !!hdds[0]; if (ok) { hddSrc[0] = u; break; } } catch (e) {}
      }
      if (!ok) {
        try { fs.write(HDD_DEFAULT.name, await fetchBytes(HDD_DEFAULT.url)); hdds[0] = HDD_DEFAULT.name; hddSrc[0] = HDD_DEFAULT.url; }
        catch (e) { log('no default HDD image: hdd/cpm.zip, ' + HDD_DEFAULT.url); }
      }
    }
    for (let d = 0; d < NHDD; d++) hddMount(d);
    cpmDirApply();
    hddUI();
  }
  // ATM CP/M drive C: (HDD 0 in the BIOS 1.07 layout) with DirEntries= in its .chs: the HDD table in ROM gets that number
  // (CP/M builds the DPB from it at start), so the machine is reset when it changes. Other disks leave the ROM as it is.
  let cpmDirNoReset = false; // Load with Autostart off: the ROM is patched, the machine is not reset
  function cpmDirApply() {
    if (!E || !E.web_rom_dirents || !hdds[0] || !E.web_hdd_get(0, 5)) return '';
    const cur = E.web_rom_dirents(0), g = hddGeom(0);
    if (!cur || (g.parts && g.parts.length)) return '';
    const want = g.dir || 128;
    if (want === cur) return '';
    E.web_rom_dirents(want);
    if (cpmDirNoReset) return ` · CP/M C: directory ${want} entries from the next CP/M start (Reset)`;
    E.web_reset(0);
    return ` · CP/M C: directory ${want} entries (machine reset)`;
  }
  const hddDirty = [false, false]; // written since mounted / saved (by the emulator or File Commander)
  const hddSrc = [null, null];       // the server URL of the image (for the REST API link)
  function hddUI() {
    if (!E || !hddIni) return;
    $('hddif').value = String(E.web_hdd_scheme(-1));
    $('hddif').disabled = !!HDD_IF_FIXED[himem()]; $('hddif').title = himem() === 'ATM3' ? 'ZX-Evolution: the IDE is built in (NEMO-DIVIDE)' : himem() === 'PLUS3' ? 'Spectrum +3: no IDE (its floppy controller uses the same ports)' : '';
    for (let d = 0; d < NHDD; d++) {
      const el = $('hdd' + d), g = hddGeom(d), on = !!E.web_hdd_get(d, 5);
      el.querySelector('.dname').textContent = on ? hdds[d] + (hddDirty[d] ? ' *' : '') : '— empty —';
      el.querySelector('.save').disabled = !on; el.querySelector('.eject').disabled = !on;
      el.querySelector('.wp').checked = !!g.ro;
      const geo = $('hddgeo' + d);
      if (document.activeElement !== geo.querySelector('.chs')) geo.querySelector('.chs').value = g.c + '/' + g.h + '/' + g.s;
      if (document.activeElement !== geo.querySelector('.lba')) geo.querySelector('.lba').value = g.lba;
    }
    // master and slave share one interface: say when the images are for different ones (or not for the one chosen)
    const sc = E.web_hdd_scheme(-1), want = [0, 1].map((d) => (hdds[d] && E.web_hdd_get(d, 5) ? hddGeom(d).iface : undefined));
    const known = want.filter((x) => x !== undefined);
    let warn = '';
    if (known.length === 2 && known[0] !== known[1]) warn = `HDD images for different interfaces: HDD 0 ${IF_NAMES[known[0]]}, HDD 1 ${IF_NAMES[known[1]]} (one interface serves both)`;
    else if (known.length && sc && known.some((x) => x !== sc)) warn = want.map((x, d) => (x !== undefined && x !== sc ? `HDD ${d} is for ${IF_NAMES[x]}` : '')).filter(Boolean).join(', ') + `, interface is ${IF_NAMES[sc]}`;
    $('hddwarn').textContent = warn;
    ldStoreUI();
  }
  // HDD image from a file or a ZIP: the biggest file (or .hdd / .img / .hdf) is the image; a *.chs file next to it
  // in the archive describes the disk (no .chs: the geometry from the size, 16 heads × 63 sectors, or unreal.ini):
  //   # comment                       (also after a value)
  //   CHS=400/16/63                   cylinders / heads / sectors
  //   CPM=D 1-5                       a CP/M drive: letter, first-last cylinder
  //   ISDOS=C 103-135                 an iS-DOS / TASiS drive
  //   Interface=ATM                   the HDD interface it is for (NONE ATM NEMO NEMO-A8 NEMO-DIVIDE SMUC PROFI DIVIDE): switched on when mounted
  //   DirEntries=512                  ATM CP/M drive C: with a bigger directory (BIOS 1.07 has 128): the ROM table is changed while it is mounted
  // without CPM= / ISDOS= lines the disk is one CP/M drive in the ATM BIOS 1.07 layout
  const HDD_EXT = /\.(hdd|img|hdf|ima|raw|bin|vhd)$/i;
  const IF_NAMES = ['NONE', 'ATM', 'NEMO', 'NEMO-A8', 'NEMO-DIVIDE', 'SMUC', 'PROFI', 'DIVIDE']; // = Options / Disk / HDD / Interface
  function parseChs(t) {
    const out = { parts: [] };
    for (const raw of t.split(/\r?\n/)) {
      const ln = raw.replace(/#.*/, '').trim(), note = (/#\s*(.*)$/.exec(raw) || ['', ''])[1].trim(); if (!ln) continue;
      const m = /^(\w+)\s*=\s*(.*)$/.exec(ln); if (!m) continue;
      const k = m[1].toUpperCase(), v = m[2];
      let x;
      if (k === 'CHS' && (x = /^(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)$/.exec(v))) Object.assign(out, { c: +x[1], h: +x[2], s: +x[3] });
      else if (k === 'INTERFACE' && IF_NAMES.includes(v.trim().toUpperCase().replace(/[\s_]+/g, '-'))) out.iface = IF_NAMES.indexOf(v.trim().toUpperCase().replace(/[\s_]+/g, '-'));
      else if ((k === 'DIRENTRIES' || k === 'DIR') && [64, 128, 256, 512, 1024].includes(+v.trim())) out.dir = +v.trim();
      else if ((k === 'CPM' || k === 'ISDOS') && (x = /^([A-Z])\s+(\d+)\s*-\s*(\d+)$/i.exec(v)) && +x[3] >= +x[2])
        out.parts.push({ fs: k.toLowerCase(), letter: x[1].toUpperCase(), c0: +x[2], c1: +x[3], note });
    }
    return out.c ? { c: out.c, h: out.h, s: out.s, lba: 0, parts: out.parts, text: t, iface: out.iface, dir: out.dir } : null;
  }
  // a text file in any of the usual encodings: UTF-16 (Windows Notepad "Unicode"), UTF-8, 8-bit
  function textOf(b) {
    if (b[0] === 0xFF && b[1] === 0xFE) return new TextDecoder('utf-16le').decode(b.subarray(2));
    if (b[0] === 0xFE && b[1] === 0xFF) return new TextDecoder('utf-16be').decode(b.subarray(2));
    let z = 0; for (let i = 1; i < Math.min(b.length, 64); i += 2) if (!b[i]) z++;
    if (z > 8) return new TextDecoder('utf-16le').decode(b); // UTF-16 without a BOM
    return new TextDecoder('latin1').decode(b);
  }
  async function hddUnpack(name, buf) {
    if (!UnrealZip.isZip(buf)) return { name, img: buf, geo: null };
    const all = UnrealZip.list(buf).filter((e) => !/\/$/.test(e.name));
    const imgs = all.filter((e) => HDD_EXT.test(e.name));
    const e = (imgs.length ? imgs : all).reduce((a, b) => (b.size > a.size ? b : a), { size: -1 });
    if (!e.name) throw new Error('HDD: the archive is empty');
    let geo = null, geoFrom = '';
    const chs = all.find((x) => x !== e && /\.chs$/i.test(x.name));
    if (chs) {
      geoFrom = chs.name.replace(/^.*[\\/]/, '');
      geo = parseChs(textOf(await UnrealZip.extract(buf, chs)));
      if (!geo) throw new Error('HDD: no CHS= line in ' + geoFrom);
    }
    return { name: e.name.replace(/^.*[\\/]/, ''), img: await UnrealZip.extract(buf, e), geo, geoFrom };
  }
  async function hddFromBytes(d, name, buf, quiet) {
    try {
      const r = await hddUnpack(name.replace(/[:\\/]/g, '_'), buf);
      let geo = r.geo;
      if (!geo && r.img.length % (16 * 63 * 512) === 0) geo = { c: r.img.length / (16 * 63 * 512), h: 16, s: 63, lba: 0 };
      // nothing known: the unreal.ini geometry, not the one left from another image
      const base = geo || hddIni[d];
      store('hdd.geo' + d, JSON.stringify(Object.assign({}, hddGeom(d), { c: Math.min(16383, base.c), h: Math.min(16, base.h), s: Math.min(63, base.s), lba: base.lba || 0, parts: (geo && geo.parts) || [], chs: (geo && geo.text) || '', iface: geo ? geo.iface : undefined, dir: geo ? geo.dir : undefined })));
      const nm = r.name.replace(/[:\\/]/g, '_');
      fs.write(nm, r.img);
      hdds[d] = nm; hddDirty[d] = false; hddSrc[d] = null;
      const g = hddGeom(d);
      // Interface= of the .chs: switched on now (and kept for this machine); ZX-Evolution has its own built in
      let ifNote = '';
      const want = r.geo ? r.geo.iface : undefined;
      if (want !== undefined) {
        const own = HDD_IF_FIXED[himem()] || (himem() !== 'ATM710' && himem() !== 'PENTAGON' ? HDD_IF_DEF[himem()] : undefined); // a machine with its own IDE keeps it
        if (own !== undefined && +own !== want) ifNote = ` · the .chs says ${IF_NAMES[want]}, ${MODELS[model] ? MODELS[model].name : 'this machine'} keeps ${IF_NAMES[+own]} (its BIOS will not boot this disk)`;
        else if (own === undefined) {
          store('hdd.if.' + hddKey(), String(want)); E.web_hdd_scheme(want); hddMount(0); hddMount(1); ifNote = ' · interface ' + IF_NAMES[want];
          // master and slave hang on one interface: the other HDD may be for another one
          const o = 1 - d, og = hdds[o] ? hddGeom(o) : null;
        }
      } else if (!HDD_IF_FIXED[himem()] && !quiet) ifNote = ' · no Interface= in ' + (r.geo ? r.geoFrom : 'a .chs') + ': choose it in Options / Disk / HDD (now ' + IF_NAMES[E.web_hdd_scheme(-1)] + ')';
      const okm = hddMount(d); if (okm) ifNote += cpmDirApply();
      if (okm && !quiet) toast('HDD ' + d + ': ' + nm + ' · ' + g.c + '/' + g.h + '/' + g.s + (r.geo ? ' (from ' + r.geoFrom + ')' : geo ? ' (from the size)' : ' (unreal.ini: no .chs file)') + (g.parts && g.parts.length ? ', ' + g.parts.length + ' drives' : '') + ifNote, !!ifNote && /no Interface|built in|keeps/.test(ifNote));
    } catch (err) { if (!quiet) toast(err.message, true); else throw err; }
    hddUI();
  }
  // ------------------------------------------------------------------ SD card on the Z-Controller (ZX-Evolution has one built in)
  // the image lives in the page's file system; the core opens it through WASI (ZC=1, [ZC] SDCARD=name)
  let sdName = null, sdDirty = false, sdSrc = null, sdList = [];
  const SD_EXT = /\.(img|vhd|bin|sd|ima)$/i;
  const sdOn = () => M() === 'EVO' || (load('sd.if.' + M()) || '1') === '1'; // the Z-Controller, per machine (on by default; built into ZX-Evolution)
  function sdMount() { // after a (re)start of the emulator too
    if (!E || !E.web_sd_mount) return false;
    if (!sdName || !fs.exists(sdName) || !sdOn()) { E.web_sd_mount(0); return false; }
    setName(sdName); return !!E.web_sd_mount(load('sd.ro') === '1' ? 2 : 1);
  }
  async function sdFromBytes(name, buf, atStart) {
    try {
      let nm = name, img = buf;
      if (UnrealZip.isZip(buf)) { // the biggest file of the archive (or an .img / .vhd)
        const all = UnrealZip.list(buf).filter((e) => !/\/$/.test(e.name)), imgs = all.filter((e) => SD_EXT.test(e.name));
        const e = (imgs.length ? imgs : all).reduce((a, b) => (b.size > a.size ? b : a), { size: -1 });
        if (!e.name) throw new Error('SD: the archive is empty');
        nm = e.name.replace(/^.*[\\/]/, ''); img = await UnrealZip.extract(buf, e);
      }
      if (img.length < 524288) throw new Error('SD: the image is too small (at least 512 KB)');
      nm = nm.replace(/[:\\/]/g, '_');
      if (sdName && sdName !== nm) try { fs.remove(sdName); } catch (e) {}
      fs.write(nm, img); sdName = nm; sdDirty = false; sdSrc = null;
      if (sdMount()) toast('SD card: ' + nm + ' · ' + Math.round(img.length / 1048576) + ' MB' + (M() === 'EVO' && !atStart ? ' — press Reset: the EVO Reset Service looks for the card at start' : ''));
      else if (!sdOn()) toast('SD card: ' + nm + ' (the Z-Controller is off: Options / Disk / SD card)');
      else toast('SD card: cannot open ' + nm, true);
    } catch (err) { toast(err.message, true); }
    sdUI();
  }
  function sdUI() {
    const el = $('sdcard'); if (!el) return;
    const on = !!(sdName && fs.exists(sdName));
    el.querySelector('.dname').textContent = on ? sdName + (sdDirty ? ' *' : '') : '— empty —';
    el.querySelector('.save').disabled = !on; el.querySelector('.eject').disabled = !on;
    const n = on ? fs.read(sdName).length : 0;
    $('sdgeo').querySelector('.sz').textContent = on ? (n >= 1048576 ? Math.round(n / 1048576) + ' MB' : Math.round(n / 1024) + ' KB') : '';
    $('sdif').value = sdOn() ? '1' : '0'; $('sdif').disabled = M() === 'EVO'; $('sdif').title = M() === 'EVO' ? 'ZX-Evolution: the Z-Controller is built in' : ''; el.querySelector('.wp').checked = load('sd.ro') === '1';
    el.classList.toggle('off', !sdOn());
    ldStoreUI();
  }
  // a fixed VHD: the raw disk + a 512-byte footer ("conectix", big-endian); an image that has one already is left as it is
  function vhdFixed(a) {
    if (a.length >= 512 && String.fromCharCode(...a.subarray(a.length - 512, a.length - 504)) === 'conectix') return a;
    const n = a.length, f = new Uint8Array(512), v = new DataView(f.buffer);
    f.set([...'conectix'].map((c) => c.charCodeAt(0)));
    v.setUint32(8, 2); v.setUint32(12, 0x10000); v.setUint32(16, 0xFFFFFFFF); v.setUint32(20, 0xFFFFFFFF);
    v.setUint32(24, ((Date.now() / 1000) | 0) - 946684800); f.set([117, 110, 114, 108], 28); v.setUint32(32, 0x10000); f.set([87, 105, 50, 107], 36);
    v.setUint32(40, Math.floor(n / 4294967296)); v.setUint32(44, n >>> 0); v.setUint32(48, Math.floor(n / 4294967296)); v.setUint32(52, n >>> 0);
    const cyl = Math.min(65535, Math.ceil(n / 512 / (16 * 63))); v.setUint16(56, cyl); f[58] = 16; f[59] = 63; v.setUint32(60, 2);
    crypto.getRandomValues(f.subarray(68, 84));
    let sum = 0; for (let i = 0; i < 512; i++) sum += f[i]; v.setUint32(64, (~sum) >>> 0);
    const out = new Uint8Array(n + 512); out.set(a); out.set(f, n); return out;
  }
  async function loadSdList() {
    sdList = await fetchList('sd/sd.json');
    srvSelect($('ldsdsrv'), sdList);
    const sel = $('sdgeo').querySelector('.srv');
    sel.innerHTML = '<option value="" hidden disabled selected>Select from server</option>';
    sdList.forEach((it, i) => { const o = document.createElement('option'); o.value = i; o.textContent = it.name; sel.appendChild(o); });
    if (!sdList.length) { const o = document.createElement('option'); o.disabled = true; o.textContent = 'sd/sd.json: nothing there'; sel.appendChild(o); }
    sel.hidden = false;  srvShow();
  }
  function bindSd() {
    const el = $('sdcard'), pick = $('sdfile');
    pick.onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) await sdFromBytes(f.name, new Uint8Array(await f.arrayBuffer())); canvas.focus(); };
    el.querySelector('.ins').onclick = () => pick.click();
    el.querySelector('.save').onclick = () => openSave('sd');
    $('sdgeo').querySelector('.srv').addEventListener('pointerdown', () => { if (!sdList.length) loadSdList(); }); // sd.json put there later
    el.querySelector('.eject').onclick = () => { if (sdName) try { fs.remove(sdName); } catch (e) {} sdName = null; sdSrc = null; sdMount(); sdUI(); };
    el.querySelector('.wp').onchange = (e) => { store('sd.ro', e.target.checked ? '1' : '0'); sdMount(); sdUI(); };
    $('sdif').onchange = (e) => { store('sd.if.' + M(), e.target.value); sdMount(); sdUI(); };
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop'); });
    el.addEventListener('dragleave', () => el.classList.remove('drop'));
    el.addEventListener('drop', async (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('drop'); const f = e.dataTransfer.files[0]; if (f) await sdFromBytes(f.name, new Uint8Array(await f.arrayBuffer())); });
    $('sdgeo').querySelector('.srv').onchange = async (e) => {
      const it = e.target.value === '' ? null : sdList[+e.target.value]; if (!it) return;
      try { await sdFromBytes(it.url.replace(/^.*\//, ''), await fetchBytes(it.url)); sdSrc = it.url; } catch (err) { toast(err.message, true); }
      srvShow();
    };
    sdUI();
  }
  let hddPick = () => {};
  function buildHdds() {
    const box = $('hdds');
    let pending = 0;
    const pick = $('hddfile');
    hddPick = (d) => { pending = d; pick.click(); };
    pick.onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      await hddFromBytes(pending, f.name, new Uint8Array(await f.arrayBuffer()));
      canvas.focus();
    };
    for (let d = 0; d < NHDD; d++) {
      const el = document.createElement('div');
      el.className = 'drive'; el.id = 'hdd' + d;
      el.innerHTML = `<span class="dl" title="${d ? 'Slave' : 'Master'}">${HDN[d]}:</span><span class="dname">— empty —</span>
        <button class="ins" title="Mount an image file">Insert</button>
        <button class="save" title="Download the image (with the changes)">Save</button>
        <button class="eject" title="Unmount">⏏</button>
        <label title="Read only"><input type="checkbox" class="wp">RO</label>`;
      el.querySelector('.ins').onclick = () => hddPick(d);
      el.querySelector('.save').onclick = () => openSave('hdd:' + d);
      el.querySelector('.eject').onclick = () => { hdds[d] = null; hddMount(d); hddUI(); };
      el.querySelector('.wp').onchange = (e) => { const g = Object.assign({}, hddGeom(d), { ro: e.target.checked }); store('hdd.geo' + d, JSON.stringify(g)); hddMount(d); hddUI(); };
      el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop'); });
      el.addEventListener('dragleave', () => el.classList.remove('drop'));
      el.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('drop'); const f = e.dataTransfer.files[0]; if (f) { pending = d; pick.onchange({ target: { files: [f], value: '' } }); } });
      box.appendChild(el);
      const geo = document.createElement('div');
      geo.className = 'hddgeo'; geo.id = 'hddgeo' + d;
      geo.innerHTML = `CHS <input class="chs" title="cylinders/heads/sectors (max 16383/16/63)" spellcheck="false"> LBA <input class="lba" title="sectors, 0 = image size" spellcheck="false"> <select class="srv" title="Mount an image from the server (hdd/hdd.json)" hidden></select>`;
      geo.querySelector('.srv').onchange = async (e) => {
        const it = e.target.value === '' ? null : hddList[+e.target.value]; if (!it) return;
        try { await hddFromBytes(d, it.url.replace(/^.*\//, ''), await fetchBytes(it.url)); hddSrc[d] = it.url; } catch (err) { toast(err.message, true); }
        srvShow();
      };
      const apply = () => {
        const m = /^\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(geo.querySelector('.chs').value), l = parseInt(geo.querySelector('.lba').value, 10);
        const g = Object.assign({}, hddGeom(d));
        if (m) { g.c = Math.min(16383, +m[1]); g.h = Math.min(16, +m[2]); g.s = Math.min(63, +m[3]); }
        if (!isNaN(l) && l >= 0) g.lba = l;
        store('hdd.geo' + d, JSON.stringify(g));
        hddMount(d); hddUI();
      };
      geo.querySelectorAll('input').forEach((i) => { i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { apply(); i.blur(); } }); i.addEventListener('change', apply); });
      box.appendChild(geo);
    }
    $('hddif').onchange = () => { store('hdd.if.' + hddKey(), $('hddif').value); E.web_hdd_scheme(+$('hddif').value); applyHddDefault(); };
  }
  // interface switched on later: fetch the default image now
  async function applyHddDefault() {
    if (!hddDefaultTried && E.web_hdd_scheme(-1) !== 0) { await applyHdd(); return; }
    hddUI();
  }

  function buildDrives() {
    buildHdds(); bindSd(); bindLdStore();
    $('fddacc').onchange = (e) => { store('fdd.acc', e.target.checked ? '1' : '0'); applyFdd(true); canvas.focus(); };
    $('bordersel').onchange = (e) => { store('border', e.target.value); if (E && E.web_border) { e.target.value = String(E.web_border(+e.target.value)); render(); } };
    $('mclick').checked = load('mclick') === '1';
    $('mclick').onchange = (e) => store('mclick', e.target.checked ? '1' : '0');
    $('mswap').onchange = (e) => { store('mswap', e.target.checked ? '1' : '0'); if (E && E.web_mouse_swap) E.web_mouse_swap(e.target.checked || mswapLink ? 1 : 0); };
    const box = $('drives');
    for (let i = 0; i < NDRIVES; i++) {
      const el = document.createElement('div');
      el.className = 'drive'; el.id = 'drv' + i;
      el.innerHTML = `<span class="dl">${DRV[i]}:</span><span class="dname">— empty —</span>
        <button class="ins" title="Insert disk">Insert</button>
        <button class="save" title="Save the disk image">Save</button>
        <button class="eject" title="Eject">⏏</button>
        <label title="Write protect"><input type="checkbox" class="wp">WP</label>`;
      el.querySelector('.ins').onclick = () => openFile(i);
      el.querySelector('.save').onclick = () => openSave('disk:' + i);
      el.querySelector('.eject').onclick = async () => {
        if (E.web_disk_changed(i) && !await askBox('', 'Disk ' + DRV[i] + ' was modified. Eject without saving?')) return;
        E.web_eject(i); drives[i] = null; updateUI();
      };
      el.querySelector('.wp').onchange = (e) => E.web_set_wp(i, e.target.checked);
      el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop'); });
      el.addEventListener('dragleave', () => el.classList.remove('drop'));
      el.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('drop'); if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0], i); });
      box.appendChild(el);
    }
  }

  function modelUI() {
    $('modelsel').value = model;
    modelSelUI();
    $('xt').hidden = !MODELS[model].xt;
    $('romdiskrow').hidden = !(romDisk && M() === 'XBIOSXT');
    $('romdiskname').textContent = romDisk ? romDisk.name : '';
  }
  // the choice is applied with the Apply button (switching restarts the machine)
  let customDirty = false; // Custom ROM settings changed while it runs: Start applies them
  function modelSelUI() {
    const m = $('modelsel').value;
    $('customrom').hidden = m !== 'CUSTOM';
    if (m === 'CUSTOM') { customUI(); loadRomParts(); }
    $('modelnote').textContent = MODELS[m].note;
    if (MODELS[m].link) { const a = document.createElement('a'); a.href = MODELS[m].link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = ' · ' + MODELS[m].link.replace(/^https:\/\//, ''); $('modelnote').appendChild(a); }
    eff7UI(); nedoUI();
    $('modelapply').disabled = (m === model && !(m === 'CUSTOM' && customDirty)) || switching || (m === 'CUSTOM' && !customPlan().ini);
  }
  function customUI() {
    const c = MACHINES[customCfg.mach];
    $('crmach').value = customCfg.mach;
    const opt = (sel, v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); };
    const cur = crCur; // a whole ROM: the selected file (its name is next to the button)
    $('crname').textContent = cur ? cur.name + ' · ' + cur.kb + ' KB' + (!c.set && c.sizes && !c.sizes.includes(cur.kb) ? ' (size does not fit ' + c.name + ')' : '') : '';
    // ROM set: each slot from a page of a local file or a part on the server
    for (const [s] of SLOTS) {
      const sel = $('crs_' + s); sel.innerHTML = ''; opt(sel, '', '— none —');
      if (crCur) for (let i = 0, p = crCur; i < p.kb / 16; i++) { const pi = p.pages && p.pages[i];
        if (pi && (pi.label === 'empty' || (p.kb > 64 && !pi.slot))) continue; // a big file: the pages that look like a slot only
        opt(sel, 'f:' + p.fs + ':' + i, p.name + (p.kb > 16 ? ' · page ' + i : '') + (pi ? ' · ' + pi.label + (pi.slot && pi.slot !== s ? ' ⚠' : '') : '')); }
      for (const r of romParts.filter((x) => x.slot === s)) opt(sel, 's:' + r.file + (r.page !== undefined ? ':' + r.page : ''), r.name);
      sel.value = [...sel.querySelectorAll('option')].some((o) => o.value === customCfg.slots[s]) ? customCfg.slots[s] : '';
      $('crsrow_' + s).hidden = !c.set;
    }
    $('crresetrow').hidden = !c.set;
    $('crreset').value = customCfg.reset;
    customApply();
  }
  let romPartsLoaded = false;
  let romJson = []; // every entry of rom/roms.json (Save / ROM lists them all, also the ones that are no ROM set part)
  async function loadRomParts() { // rom/roms.json: [{ file, slot, name }] — the parts the server offers for ROM sets
    if (romPartsLoaded) return; romPartsLoaded = true;
    try { const j = JSON.parse(new TextDecoder().decode(await fetchBytes(ROM_DIR + 'roms.json'))); if (Array.isArray(j) && j.length) { romJson = j.filter((r) => r && r.file); romParts = romJson.filter((r) => SLOTS.some(([s]) => s === r.slot)); } } catch (e) {}
    if ($('modelsel').value === 'CUSTOM') customUI();
  }
  // What is in a 16K ROM page (by its texts and first bytes): slot it fits ('128', 'sos', 'dos', 'sys'), a label, or nothing
  function romPageInfo(pg) {
    let ff = 0, zz = 0; for (let i = 0; i < pg.length; i++) { if (pg[i] === 0xFF) ff++; else if (!pg[i]) zz++; }
    if (ff + zz > pg.length - 16) return { slot: null, label: 'empty' };
    let t = ''; for (let i = 0; i < pg.length; i++) { const c = pg[i] & 0x7F; t += c >= 32 && c < 127 ? String.fromCharCode(c) : ' '; }
    const has = (re) => re.test(t), m = (re) => { const x = re.exec(t); return x ? x[1].trim() : ''; };
    if (has(/DIGITAL RESEARCH/)) return { slot: null, label: 'ATM BIOS ' + (m(/BIOS\s+V?(\d[\d.]*\w*)/) || '') + ' + CP/M' };
    if (has(/PLUS3DOS/)) return { slot: null, label: '+3DOS' };
    if (has(/Amstrad/) && has(/128 \+3|SPECTRUM \+3/)) return { slot: null, label: '+3 ROM 0 (menu, test)' };
    if (has(/Cannot copy to\/from tap/)) return { slot: null, label: '+3 ROM 1 (128 BASIC)' };
    if ((pg[0] === 0xF3 && pg[1] === 0x11) || (has(/\* ?TR-DOS Ver/) && has(/BETA 128|Technology Research/))) { // TR-DOS: DI: LD DE,... (Scorpion's: DI: JP ...)
      const v = m(/(vTR-dos ver\.?\s*[\d.]+\w*)/i) || m(/(PereDOS v?\.?\s*[\d.]+\+?)/i) || m(/TR-DOS Ver\s*([\d.]+\w*)/i);
      if (v || has(/TR-?DOS|BETA 128/i)) return { slot: 'dos', label: /^\d/.test(v) ? 'TR-DOS ' + v : v || 'TR-DOS' };
    }
    if (has(/128 BASI/) || (has(/Tape Loade/) && has(/128/))) return { slot: '128', label: has(/Amstrad/) ? '+3 menu / 128 BASIC' : has(/Scorpion ZS/) ? 'Scorpion 128 BASIC + menu' : has(/NEMO KAY/) ? 'KAY 128 BASIC + menu' : has(/Quorum/i) ? 'Quorum 128 BASIC' : '128 BASIC + menu' };
    if (has(/Tape loading erro/) && !has(/Insert tape/)) return { slot: 'sos', label: ('48 BASIC ' + (m(/(\d{4}) (Sinclair|Amstrad)/) || '')).trim() + (has(/Amstrad/) ? ' (Amstrad)' : '') + (has(/XBIOS|xBIOS/) ? ' (xBIOS)' : '') };
    const sys = [[/GLUK|Mr Gluk/i, 'Gluk Reset Service'], [/Shadow Service Monito/, 'Shadow Service Monitor (ProfROM)'], [/Disk service|Himem menu|Rom boot/i, 'Service ROM'], [/Micco Software/, 'Profi BIOS menu'], [/ROM-MENU QUORUM/, 'Quorum ROM menu'], [/NEMO KAY/, 'KAY service menu'],
      [/Dual! TR-dos|EXTRA BIOS/i, 'xBIOS menu'], [/Reset Service/i, 'Reset Service'], [/DOS'WIN|Tr-dosN/, 'Quick Commander'], [/General\s+Sound/, 'General Sound ROM (not for Z80)'], [/INT RAM ROM SCR/, 'Scorpion service']];
    for (const [re, l] of sys) if (has(re)) return { slot: re.source.includes('General') ? null : l === 'Quick Commander' ? '128' : 'sys', label: l };
    return { slot: null, label: 'unknown code' };
  }
  // A whole ROM file: the machine it is made for (null: not sure)
  function romMachineGuess(b) {
    let t = ''; for (let i = 0; i < b.length; i++) { const c = b[i] & 0x7F; t += c >= 32 && c < 127 ? String.fromCharCode(c) : ' '; }
    const kb = b.length >> 10, has = (re) => re.test(t);
    if (has(/Micco Software/) && kb === 64) return ['PROFI', 'Profi BIOS'];
    if (has(/PLUS3DOS/) && kb === 64) return ['PLUS3', 'Spectrum +3 ROM'];
    if (has(/ROM-MENU QUORUM/) && kb === 64) return ['QUORUM', 'Quorum ROM'];
    if (has(/Scorpion ZS/) && has(/Shadow Service/) && [64, 128, 256, 512].includes(kb)) return ['PROFSCORP', 'Scorpion ProfROM'];
    if (has(/Scorpion ZS/) && kb === 64) return ['SCORPION', 'Scorpion ROM'];
    if (has(/NEMO KAY/) && kb === 64) return ['KAY', 'KAY ROM (as a ROM set)'];
    if (has(/BIOS\s+V1\.07\.\d+pe/) && kb >= 512) return ['EVO', 'ZX-Evolution ROM'];
    if (has(/XVR - PRO/) && has(/BIOS\s+V1\.0[34]/) && kb === 64) return ['ATM450', 'ATM Turbo 1 BIOS ' + (/BIOS\s+V(1\.0[34][\d.]*\w*)/.exec(t) || ['', ''])[1]];
    if (has(/XVR - PRO/) && [64, 128, 512, 1024].includes(kb)) return ['ATM710', has(/xBIOS|XBIOS/) ? 'ATM Turbo 2+ xBIOS' : 'ATM Turbo 2+ BIOS ' + (/BIOS\s+V(1\.07[\d.]*\w*)/.exec(t) || ['', ''])[1]];
    return null;
  }
  // a local file: a ROM image (16K pages) or a ZIP — with custom.json (saved Custom ROM) the settings come back too
  let crSeq = 0;
  async function crAdd(name, b) {
    let cfg = null;
    if (UnrealZip.isZip(b)) {
      const all = UnrealZip.list(b), cj = all.find((x) => /(^|\/)custom\.json$/i.test(x.name)) || all.find((x) => /\.json$/i.test(x.name));
      if (cj) try { cfg = JSON.parse(new TextDecoder().decode(await UnrealZip.extract(b, cj))); } catch (e) { toast(name + ': custom.json is not valid', true); }
      const ents = all.filter((x) => /\.(rom|bin)$/i.test(x.name) && x.size && !(x.size & 16383));
      const e = (cfg && cfg.rom && ents.find((x) => x.name.replace(/^.*\//, '').toLowerCase() === String(cfg.rom).toLowerCase())) || ents.sort((x, y) => y.size - x.size)[0];
      if (!e) { toast(name + ': no ROM image (.rom / .bin, 16K pages) inside', true); return; }
      b = await UnrealZip.extract(b, e); name = e.name.replace(/^.*\//, '');
    }
    if (!b.length || b.length & 16383 || b.length > 1 << 20) { toast(name + ': a ROM image is 16 KB pages, up to 1024 KB (' + b.length + ' bytes)', true); return; }
    // one ROM file at a time: the new one replaces the one selected before (its pages leave the slots too)
    if (crCur) try { fs.remove(crCur.fs); } catch (e) {}
    crCur = null; customCfg.whole = ''; customCfg.extra = null;
    for (const [s] of SLOTS) if (customCfg.slots[s].startsWith('f:')) customCfg.slots[s] = '';
    crSeq++;
    const p = { fs: 'cr' + crSeq + '.rom', name, kb: b.length >> 10 };
    p.pages = []; for (let i = 0; i < p.kb / 16; i++) p.pages.push(romPageInfo(b.subarray(i * 16384, (i + 1) * 16384)));
    p.guess = romMachineGuess(b);
    fs.write(p.fs, b); crCur = p;
    if (!cfg && p.guess && MACHINES[p.guess[0]]) { customCfg.mach = p.guess[0]; toast(name + ': ' + p.guess[1] + ' → ' + MACHINES[p.guess[0]].name); }
    const c = MACHINES[customCfg.mach];
    if (cfg && MACHINES[cfg.machine]) { // settings from the saved ZIP
      customCfg.mach = cfg.machine; customCfg.reset = cfg.reset && cfg.reset !== 'auto' ? cfg.reset : ''; customCfg.name = cfg.name || '';
      const x = {}; // machine settings of the ZIP (Save / Custom ROM writes them; may be edited by hand)
      if (cfg.speed !== undefined && +cfg.speed > 0) x.speed = +cfg.speed;
      if (/^(accurate|fast)$/i.test(cfg.fdd || '')) x.fdd = cfg.fdd.toLowerCase();
      if (cfg.hdd && IF_NAMES.includes(String(cfg.hdd).toUpperCase())) x.hdd = String(cfg.hdd).toUpperCase();
      if (cfg.ini && typeof cfg.ini === 'object') x.ini = cfg.ini;
      customCfg.extra = Object.keys(x).length ? x : null;
      const pg = (v) => (typeof v === 'number' ? v : v && typeof v.page === 'number' ? v.page : null);
      if (MACHINES[cfg.machine].set) for (const [s] of SLOTS) customCfg.slots[s] = cfg.pages && pg(cfg.pages[s]) !== null ? 'f:' + p.fs + ':' + pg(cfg.pages[s]) : '';
      else customCfg.whole = p.fs;
      toast('Custom ROM: ' + (cfg.name || name) + ' on ' + MACHINES[cfg.machine].name);
    } else if (cfg && cfg.slot && SLOTS.some(([s]) => s === cfg.slot)) { // a ROM set part (e.g. a server ZIP with its .json)
      if (c.set) customCfg.slots[cfg.slot] = 'f:' + p.fs + ':' + (+cfg.page || 0);
      if (cfg.name) p.name = cfg.name + ' (' + name + ')';
    } else if (!c.set) customCfg.whole = p.fs;
    else { // a ROM set: each slot gets the first page that looks like it (pages of unknown code: none)
      let any = false;
      for (const [s] of SLOTS) { const i = p.pages.findIndex((x) => x.slot === s); if (i >= 0) { customCfg.slots[s] = 'f:' + p.fs + ':' + i; any = true; } }
      if (!any && p.kb === 16 && !customCfg.slots.sos) customCfg.slots.sos = 'f:' + p.fs + ':0';
    }
  }
  function bindCustom() {
    const sel = $('crmach');
    for (const [k, v] of Object.entries(MACHINES)) { const o = document.createElement('option'); o.value = k; o.textContent = v.name; sel.appendChild(o); }
    const changed = () => { customDirty = model === 'CUSTOM'; customUI(); modelSelUI(); };
    sel.onchange = () => {
      customCfg.mach = sel.value;
      if (MACHINES[sel.value].set && SLOTS.every(([s]) => !customCfg.slots[s])) // a ROM set with nothing chosen yet: pages that fit, from the files added
        if (crCur) for (const [s] of SLOTS) { const i = (crCur.pages || []).findIndex((x) => x.slot === s); if (i >= 0 && !customCfg.slots[s]) customCfg.slots[s] = 'f:' + crCur.fs + ':' + i; }
      if (!MACHINES[sel.value].set && crCur) customCfg.whole = crCur.fs;
      changed();
    };
    for (const [s] of SLOTS) $('crs_' + s).onchange = () => { customCfg.slots[s] = $('crs_' + s).value; changed(); };
    $('crreset').onchange = () => { customCfg.reset = $('crreset').value; changed(); };
    $('crfile').onclick = () => $('crinput').click();
    $('crinput').onchange = async (e) => {
      const fl = [...e.target.files]; e.target.value = '';
      for (const f of fl) try { await crAdd(f.name, new Uint8Array(await f.arrayBuffer())); } catch (err) { toast(f.name + ': ' + err.message, true); }
      changed();
    };
  }
  // Save / Custom ROM: the ROM of the running model and its settings in one ZIP — a ROM set is joined into one 64K image
  // (128, 48, service, TR-DOS; missing pages #FF), a single-file ROM goes as it is; <name>.json next to <name>.rom
  function slotFrom(v) { // what a Custom ROM slot loads, for the .json
    if (v.startsWith('f:')) { const [, f, pg] = v.split(':'), x = crFile(f); return x ? x.name + (x.kb > 16 ? ' page ' + pg : '') : f; }
    const [, f, pg] = v.split(':'), r = romParts.find((q) => q.file === f && String(q.page === undefined ? '' : q.page) === (pg || ''));
    return (r ? r.name + ' · ' : '') + f + (pg ? ' page ' + pg : '');
  }
  const srcText = (src) => { const [f, n] = src.split(':'); const x = crFile(f); return (x ? x.name : f) + (n !== undefined ? ' page ' + n : ''); };
  // pre: the Custom ROM as chosen in Options / System (also before Start); its settings then come from its json only,
  // unless this very Custom ROM is running (then as it runs, like Save / Custom ROM)
  function romZip(pre) {
    const m = pre ? 'CUSTOM' : model, custom = m === 'CUSTOM', live = !pre || (model === 'CUSTOM' && !customDirty);
    if (custom && !customPlan().ini) return null;
    const ini = modelIniObj(m), misc = ini.MISC || {}, hm = misc.HIMEM || 'ATM710', ram = +(misc.RAMSize || (hm === 'ATM710' ? 1024 : 128));
    const mach = custom ? customCfg.mach : Object.keys(MACHINES).find((k) => MACHINES[k].himem === hm && MACHINES[k].ram === ram) || Object.keys(MACHINES).find((k) => MACHINES[k].himem === hm);
    if (!mach) return null;
    const c = MACHINES[mach], set = ini.ROM && ini.ROM.ROMSET ? ini['ROM.' + ini.ROM.ROMSET] : null;
    const romOf = (f) => f.replace(/\.[^.]*$/, ''), whole = !set && ((ini.ROM && ini.ROM[c.key]) || MODELS[m].files.find((f) => /\.rom$/i.test(f)));
    if (!set && !whole) return null;
    let base = custom ? customCfg.name || (set ? 'romset' : romOf(crFile(customCfg.whole).name)) : romOf(set ? MODELS[m].files[0] : whole.split(':')[0]);
    base = base.replace(/[\\/:*?"<>|]/g, '_');
    const cfg = { type: 'unreal-web-custom-rom', name: custom && customCfg.name ? customCfg.name : base, machine: mach, machineName: c.name, rom: base + '.rom' };
    // the machine as it runs now: clock, FDD mode, HDD interface (and the ini keys a loaded ZIP brought) — a link with rom= gets the same
    const x = (custom && customCfg.extra) || {};
    if (live) { cfg.speed = SPEEDS[speedIdx]; cfg.fdd = E && E.web_fdd_accurate && E.web_fdd_accurate(-1) ? 'accurate' : 'fast'; if (E) cfg.hdd = IF_NAMES[E.web_hdd_scheme(-1)] || 'NONE'; }
    else { if (x.speed) cfg.speed = x.speed; if (x.fdd) cfg.fdd = x.fdd; if (x.hdd) cfg.hdd = x.hdd; }
    if (custom && customCfg.extra && customCfg.extra.ini) cfg.ini = customCfg.extra.ini;
    let img;
    if (set) {
      img = new Uint8Array(65536).fill(0xFF); cfg.reset = custom ? customCfg.reset || 'auto' : misc.RESET || 'auto'; cfg.pages = {};
      SLOTS.forEach(([s, label], i) => {
        const src = set[s], pg = [0, 1, 3, 2][i]; // 128 → 0, 48 → 1, TR-DOS → 3, service → 2 (as a 64K Pentagon / Scorpion ROM)
        const [f, n] = src ? src.split(':') : [], b = f && fs.exists(f) ? fs.read(f) : null;
        if (!b) { cfg.pages[s] = null; return; }
        img.set(b.subarray((+n || 0) * 16384, (+n || 0) * 16384 + 16384), pg * 16384);
        cfg.pages[s] = { page: pg, rom: label, from: custom ? slotFrom(customCfg.slots[s]) : srcText(src) };
      });
    } else {
      const f = whole.split(':')[0]; if (!fs.exists(f)) return null;
      img = fs.read(f); cfg.from = (custom ? crFile(f).name : f) + ' (' + (img.length >> 10) + ' KB)';
    }
    return { name: base + '.zip', files: [{ name: cfg.rom, data: img }, { name: base + '.json', data: new TextEncoder().encode(JSON.stringify(cfg, null, 1)) }] };
  }

  let switching = false;
  let xtPref = null; // ATM mode (XT keyboard) chosen on an ATM machine: kept across model changes in this session
  async function setModel(m, force) {
    if (!MODELS[m] || (m === model && !force) || switching) { modelUI(); return; }
    const dirty = [];
    for (let i = 0; i < NDRIVES; i++) if (E && E.web_disk_present(i) && E.web_disk_changed(i)) dirty.push(DRV[i] + ':');
    if (dirty.length && !await askBox('', 'Unsaved changes on disk ' + dirty.join(' ') + ' will be lost.\nSwitch to ' + MODELS[m].name + '?')) { modelUI(); return; }
    switching = true; modelSelUI();
    releaseAll(); releaseMouse();
    if (dbgOn) debugShown(false);
    try { if (E) E.web_save_nv(); } catch (e) {} // keep CMOS changes for the session
    if (E && MODELS[model].xt) xtPref = !!E.web_xt_kbd(); // ATM mode stays as it was for this session
    model = m;
    try {
      await start(); toast(MODELS[m].name);
      if (MODELS[m].xt && xtPref !== null && !!E.web_xt_kbd() !== xtPref) { E.web_toggle_xt(); updateUI(); }
      await osBoot();
    }
    catch (err) { toast('Startup error: ' + err.message, true); }
    switching = false;
    if (audio) audio.flush();
    modelUI(); applyScale();
  }
  // ------------------------------------------------------------------ Offline (service worker sw.js): the page, scripts, wasm and the site's files kept in the browser
  const SW_OK = 'serviceWorker' in navigator && BUILD !== 'dev' && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname));
  let swErr = '';
  async function swStart() {
    if (!SW_OK) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (optOpen()) offUI(); }); // took over this page: the tab shows it
    try { await navigator.serviceWorker.register('sw.js?v=' + BUILD); swErr = ''; } catch (e) { swErr = /404|fetch|bad http|not found/i.test(e.message) ? 'sw.js not found on the server' : 'sw.js: ' + e.message; log('offline: ' + e.message); }
    if (optOpen()) offUI();
  }
  function swAsk(msg) { // → answer of the active service worker (null: none)
    return new Promise((res) => {
      const c = navigator.serviceWorker && navigator.serviceWorker.controller; if (!c) { res(null); return; }
      const ch = new MessageChannel(); ch.port1.onmessage = (e) => res(e.data); c.postMessage(msg, [ch.port2]); setTimeout(() => res(null), 3000);
    });
  }
  const offMsg = (t, err) => { $('offstat').textContent = t; $('offstat').hidden = !t; $('offstat').classList.toggle('err', !!err); };
  async function offUI() {
    if (!SW_OK) { offMsg('needs https', true); $('ofmake').disabled = $('ofclear').disabled = true; return; }
    const a = await swAsk({ cmd: 'list' });
    if (!a) { offMsg(swErr, !!swErr); return; } // not running yet: nothing to show
    const files = a.urls.filter((u) => /\/(rom|trd|hdd|sd)\//i.test(u)).length;
    let est = ''; try { const e = await navigator.storage.estimate(); if (e && e.usage) est = ', ' + (e.usage / 1048576).toFixed(1) + ' MB used'; } catch (e) {}
    offMsg('build ' + a.build + '\n' + files + ' files' + est);
  }
  async function makeOffline() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) { await offUI(); return; }
    $('ofmake').disabled = true;
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
    const jobs = [], seen = new Set(), add = (label, fn, key) => { if (seen.has(key)) return; seen.add(key); jobs.push([label, fn]); };
    for (const [k, m] of Object.entries(MODELS)) for (const f of m.files || []) if (/\.rom$/i.test(f)) add(f, () => fetchSrv(f), 'r:' + f);
    if ($('of_parts').checked) {
      await loadRomParts().catch(() => {});
      add(GS_ROM, () => fetchSrv(GS_ROM), 'r:' + GS_ROM); add(MOON_ROM, () => fetchSrv(MOON_ROM), 'r:' + MOON_ROM);
      for (const r of (romJson.length ? romJson : romParts)) add(r.file, () => fetchSrv(r.file), 'r:' + r.file);
    }
    const lists = [];
    if ($('of_trd').checked) lists.push(['trd/trd.json', (it) => [it.url, ...(it.rp ? MOUNT_KEYS.map((k) => it.rp[k]).filter(Boolean).map((u) => new URL(lowDir(u), location.href).href) : [])]]);
    if ($('of_hdd').checked) { lists.push(['hdd/hdd.json', (it) => [it.url]]); for (const o of Object.values(OS_MODELS)) if (o.hdd) add(o.hdd, () => fetchBytes(o.hdd), o.hdd); add('hdd/cpm.zip', () => fetchBytes('hdd/cpm.zip').catch(() => fetchBytes('hdd/cpm.hdd')), 'hdd/cpm'); }
    if ($('of_sd').checked) { lists.push(['sd/sd.json', (it) => [it.url]]); for (const o of Object.values(OS_MODELS)) if (o.sd) add(o.sd, () => fetchBytes(o.sd), o.sd); }
    for (const [j, urls] of lists) { const l = await fetchList(j); for (const it of l) for (const u of urls(it)) if (u) add(decodeURIComponent(u.replace(/^.*\//, '')), () => fetchBytes(u), u); }
    let ok = 0, bad = 0, bytes = 0;
    for (const [i, [label, fn]] of jobs.entries()) {
      offMsg(`Downloading ${i + 1} / ${jobs.length}: ${label}`);
      try { const b = await fn(); bytes += b.length || 0; ok++; } catch (e) { bad++; }
    }
    $('ofmake').disabled = false;
    await offUI();
  }
  function bindOffline() {
    $('ofmake').onclick = makeOffline;
    $('ofclear').onclick = async () => { if (!await askBox('Offline', 'Drop the downloaded files of the offline copy? The emulator itself stays.', 'Drop')) return; await swAsk({ cmd: 'clear' }); offUI(); };
  }
  function bindModels() {
    const sel = $('modelsel');
    for (const [k, v] of Object.entries(MODELS)) { const o = document.createElement('option'); o.value = k; o.textContent = (!OS_MODELS[k] && v.sysName) || v.name; sel.appendChild(o); }
    sel.onchange = modelSelUI;
    bindCustom();
    $('modelapply').onclick = () => { const f = sel.value === 'CUSTOM' && customDirty; customDirty = false; showNedo(false); showOptions(false); setModel(sel.value, f); }; // Start: Options (and its NedoOS window) close
    $('forcefetch').checked = load('fetch.reload') === '1';
    $('forcefetch').onchange = () => store('fetch.reload', $('forcefetch').checked ? '1' : '0');
    $('romdiskboot').onclick = () => { showOptions(false); romDiskMacro(true); };
    $('romdiskdel').onclick = async () => { romDisk = null; try { fs.remove(ROMDISK_FILE); } catch (e) {} await setModel(xbiosOf(model), true); toast('ROM disk removed'); };
    modelUI();
  }

  // all tabs share one height: the height of the Sound tab; longer tabs scroll
  let curPane = 'sys';
  function fixOptHeight() {
    const body = $('options').querySelector('.body');
    if (body.dataset.fixed) return;
    const cur = curPane;
    showPane('opt'); // the Disk tab sets the height (taller tabs scroll)
    const h = body.scrollHeight;
    if (h > 50) { body.style.height = h + 'px'; body.dataset.fixed = '1'; }
    showPane(cur);
  }
  // Keys and files: a separate floating window
  let mhFW = null;
  function showMainHelp(v) {
    const h = $('mainhelp');
    h.hidden = !v; $('mainhelpbtn').classList.toggle('on', v);
    if (v) { if (optOpen()) mhFW.setPos(snapRight($('options').getBoundingClientRect(), h)); else mhFW.place(); }
  }
  function showPane(id) {
    curPane = id; if ($('sysbtn')) $('sysbtn').classList.toggle('on', optOpen() && id === 'sys');
    // every tab has its own height; long ones (Help, About) scroll inside the window
    document.querySelectorAll('#options header [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
    document.querySelectorAll('#options .pane').forEach((p) => p.classList.toggle('gone', p.dataset.pane !== id));
    $('options').querySelector('.body').scrollTop = 0;
    if (optOpen()) optFW.place();
  }
  // Options: floating, draggable, non-blocking window
  let optFW = null;
  const optOpen = () => !$('options').hidden;
  function showOptions(v) {
    const w = $('options');
    if (v) { releaseMouse(); updateUI(); w.hidden = false; fixOptHeight(); optFW.place(); offUI(); }
    else { w.hidden = true; canvas.focus(); }
    $('optbtn').classList.toggle('on', v); sysBtnUI();
  }
  function sysBtnUI() { $('sysbtn').classList.toggle('on', optOpen() && curPane === 'sys'); }

  function applyScale() {
    const v = $('scale').value;
    const w = canvas.width || 640, h = canvas.height || 480;
    let k;
    if (document.fullscreenElement) k = Math.min(window.innerWidth / w, window.innerHeight / h);
    else {
      const vk = $('vkbd');
      const vkh = vk.hidden ? 0 : vkbd && vkbd.tab === 'joy' ? Math.min(vk.offsetHeight, kbdRoom(canvas.offsetWidth || 640)) : vk.offsetHeight; // the joystick may hang lower
      const reserved = $('toolbar').offsetHeight + 2 + (vk.hidden ? 0 : vkh + 2) + 8 + 24; // frame, gap + padding
      const vw = Math.max(360, Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth, (window.visualViewport && window.visualViewport.width) || 1e9)); // the page is never narrower than 360 px
      const vh = Math.min(window.innerHeight, (window.visualViewport && window.visualViewport.height) || 1e9);
      const fit = Math.max(0.25, Math.min((vw - 18) / w, (vh - reserved) / h));
      k = v === 'fit' ? fit : Math.min(parseFloat(v), fit); // selected zoom is the upper limit
    }
    const cw = Math.floor(w * k), ch = Math.floor(h * k);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.classList.toggle('smooth', Math.abs(k - Math.round(k)) > 0.01);
    placeFx();
    $('stage').style.width = document.fullscreenElement ? '' : cw + 2 + 'px'; // + the frame
    // vertical place: centred as if the on-screen keyboard (ZX / XT) were shown, so it appears below without moving the window
    if (document.fullscreenElement) { $('stage').style.margin = ''; return; }
    const vh = Math.min(window.innerHeight, (window.visualViewport && window.visualViewport.height) || 1e9);
    const total = 12 + $('toolbar').offsetHeight + ch + 2 + 8 + kbdRoom(cw) + 12;
    $('stage').style.margin = Math.max(0, Math.floor((vh - total) / 2)) + 'px auto 0';
  }
  // height kept for the on-screen keyboard: the ZX / XT keyboard as measured at this width (an estimate before it was shown)
  const kbdSeen = {};
  function kbdRoom(cw) {
    const vk = $('vkbd'), t = vkbd && vkbd.tab;
    if (!vk.hidden && t !== 'joy' && vk.offsetHeight) kbdSeen[cw] = Math.max(kbdSeen[cw] || 0, vk.offsetHeight);
    return Math.max(kbdSeen[cw] || 0, Math.min(Math.round(cw * 0.49), 314)); // the taller of ZX / XT
  }

  // ------------------------------------------------------------------ CPU clock (t-states per frame)
  const baseFrame = () => MODELS[model].base; // 3.5 MHz = 1x
  const SPEEDS = [0.1, 0.5, 1, 2, 2.5, 3, 5, 10, 15, 20];
  let speedIdx = SPEEDS.indexOf(2);
  function speedLabel(x) { return x + 'x'; }
  // the clock shown over the screen (the CPU clock setting only: the machine's own turbo bit is not emulated)
  function mhzLabel() { hudSet('mhz', $('speedmhz').textContent); }
  // MHz (top centre) and fps (top right) over the screen: drawn on a transparent canvas of its own, at the pixel density of the
  // display — no page text changes every second (ad blockers in Safari rescan the page on each change: 1/3 s stalls)
  const hud = { fps: '— fps', mhz: '' };
  let hudW = 0, hudH = 0, hudDpr = 0;
  function hudSet(k, v) { if (hud[k] === v) return; hud[k] = v; hudDraw(); }
  // redrawn whenever its size changes (window resize, zoom, fullscreen, another display): the drawing is not stretched
  if (window.ResizeObserver) new ResizeObserver(() => hudDraw()).observe($('hudc'));
  window.addEventListener('resize', () => hudDraw());
  function hudDraw() {
    const c = $('hudc'); if (!c) return;
    const r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width) return;
    const w = Math.round(r.width * dpr), h = Math.round(Math.min(r.height, 24) * dpr);
    if (w !== hudW || h !== hudH || dpr !== hudDpr) { c.width = hudW = w; c.height = hudH = h; hudDpr = dpr; c.style.height = (h / dpr) + 'px'; }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const fs = window.innerWidth <= 520 ? 9 : 11; // as the page text had it (narrow screens: 9px)
    g.font = fs + 'px ui-monospace, Consolas, Menlo, monospace'; g.textBaseline = 'top';
    const put = (t, x, align) => {
      if (!t) return; g.textAlign = align;
      g.fillStyle = '#000'; g.shadowColor = '#000'; g.shadowBlur = 3; g.fillText(t, x + 1, 5); // the shadow of the old page text
      g.shadowBlur = 0; g.fillStyle = 'rgba(225,232,240,.75)'; g.fillText(t, x, 4);
    };
    put(hud.mhz, r.width / 2, 'center'); put(hud.fps, r.width - 5, 'right');
  }
  function setSpeed(idx, save) {
    if (MODELS[model].fixed) { idx = SPEEDS.indexOf(MODELS[model].speed); save = false; }
    $('speedrange').closest('.speedbox').classList.toggle('off', !!MODELS[model].fixed);
    speedIdx = Math.max(0, Math.min(SPEEDS.length - 1, idx));
    const x = SPEEDS[speedIdx];
    if (E) E.web_set_frame(Math.round(baseFrame() * x));
    $('speedrange').value = speedIdx;
    $('speedmhz').textContent = (3.5 * x).toFixed(2).replace(/\.?0+$/, '') + ' MHz';
    mhzLabel();
    $('speedticks').querySelectorAll('span').forEach((t, i) => t.classList.toggle('on', i === speedIdx));
  }
  function bindSpeed() {
    const ticks = $('speedticks');
    $('speedrange').max = String(SPEEDS.length - 1);
    SPEEDS.forEach((x, i) => { const t = document.createElement('span'); t.textContent = speedLabel(x); t.onclick = () => setSpeed(i, true); ticks.appendChild(t); });
    $('speedrange').oninput = () => setSpeed(+$('speedrange').value, true);
    loadSpeed();
  }
  // ------------------------------------------------------------------ port #EFF7 (Pentagon: Options / System, as the EFF7 page of the Win32 settings)
  const EFF7_BITS = ['16 colors (4 bits per pixel)', 'Pentagon 512×192 monochrome', 'disable memory above 128K', 'RAM 0 at #0000', 'no turbo (always on)',
    'hardware multicolor (8×1 attributes at #6000)', '384×304 video mode', 'CMOS (#DFF7 / #BFF7)'];
  let eff7Built = false;
  const eff7Key = (m) => 'eff7.' + (m || model);
  function eff7Saved(m) { try { const o = JSON.parse(load(eff7Key(m)) || '{}'); return { m: (o.m | 0) & 0xEF, s: (o.s | 0) & 0xFF }; } catch (e) { return { m: 0, s: 0 }; } }
  const isPent = (m) => m === 'PENTAGON' || (m === 'CUSTOM' && MACHINES[customCfg.mach] && MACHINES[customCfg.mach].himem === 'PENTAGON');
  function eff7Apply() { // model start: the locked bits and their state as set before
    if (!E || !E.web_eff7 || E.web_mem_model() !== 0) return;
    const { m, s } = eff7Saved();
    E.web_eff7_mask(m); E.web_eff7((E.web_eff7(-1) & ~m) | (s & m));
  }
  // shown for the model chosen in the list: the running one live; another one (not started yet): its saved locked bits, used at its start
  const eff7Live = () => $('modelsel').value === model && !!(E && E.web_eff7 && E.web_mem_model() === 0);
  function eff7Get() { if (eff7Live()) return { v: E.web_eff7(-1), m: E.web_eff7_mask(-1) }; const o = eff7Saved($('modelsel').value); return { v: o.s | 0x10, m: o.m }; }
  function eff7Set(v, m) {
    const sel = $('modelsel').value;
    if (eff7Live()) { E.web_eff7_mask(m); E.web_eff7(v); eff7Store(); }
    else store(eff7Key(sel), JSON.stringify({ m: m & 0xEF, s: v & m & 0xEF }));
  }
  function eff7UI() {
    const card = $('eff7card'), on = isPent($('modelsel').value);
    card.hidden = !on; if (!on) return;
    const g = $('eff7grid');
    if (!eff7Built) {
      eff7Built = true;
      EFF7_BITS.forEach((t, i) => {
        const b = document.createElement('span'); b.textContent = 'D' + i;
        const s = document.createElement('input'); s.type = 'checkbox'; s.dataset.st = i;
        const l = document.createElement('input'); l.type = 'checkbox'; l.dataset.lk = i;
        const n = document.createElement('span'); n.textContent = t;
        if (i === 4) { s.disabled = l.disabled = true; n.className = 'dis'; }
        s.onchange = () => { const { v, m } = eff7Get(), b = 1 << i; eff7Set(s.checked ? v | b : v & ~b, eff7Live() || !s.checked ? m : m | b); eff7UI(); }; // not started: on = on + lock
        l.onchange = () => { const { v, m } = eff7Get(), b = 1 << i; eff7Set(v, l.checked ? m | b : m & ~b); eff7UI(); };
        g.append(b, s, l, n);
      });
    }
    const { v, m } = eff7Get();
    $('eff7later').hidden = eff7Live();
    g.querySelectorAll('[data-st]').forEach((x) => { x.checked = !!(v & (1 << x.dataset.st)); });
    g.querySelectorAll('[data-lk]').forEach((x) => { if (x.dataset.lk !== '4') x.checked = !!(m & (1 << x.dataset.lk)); });
    $('eff7val').textContent = '#' + v.toString(16).toUpperCase().padStart(2, '0') + (m & 0xEF ? ' · lock #' + (m & 0xEF).toString(16).toUpperCase().padStart(2, '0') : '');
  }
  function eff7Store() { const m = E.web_eff7_mask(-1) & 0xEF; store(eff7Key(), JSON.stringify({ m, s: E.web_eff7(-1) & m })); }
  setInterval(() => { if (optOpen() && curPane === 'sys') eff7UI(); }, 400); // programs change the port: shown while the page is open
  function loadSpeed() {
    speedIdx = SPEEDS.indexOf(MODELS[model].speed); // every start: the model's clock (2.5x = 8.75 MHz), not remembered
    setSpeed(speedIdx, false);
  }

  // ------------------------------------------------------------------ on-screen keyboard
  let vkbd = null;
  const KJ_BITS = { KJ_RIGHT: 1, KJ_LEFT: 2, KJ_DOWN: 4, KJ_UP: 8, KJ_FIRE: 16 };
  let kjBits = 0;
  // on-screen XT keys inside the debugger: KeyboardEvent.code -> Win32 virtual key + character
  const VK_SPECIAL = {
    Escape: [27, 27], Backspace: [8, 8], Tab: [9, 9], Enter: [13, 13], Space: [32, 32], CapsLock: [20, 0],
    ShiftLeft: [16, 0], ShiftRight: [16, 0], ControlLeft: [17, 0], ControlRight: [17, 0], AltLeft: [18, 0], AltRight: [18, 0],
    ArrowLeft: [37, 0], ArrowUp: [38, 0], ArrowRight: [39, 0], ArrowDown: [40, 0],
    Backquote: [192, '`~'], Minus: [189, '-_'], Equal: [187, '=+'], BracketLeft: [219, '[{'], BracketRight: [221, ']}'],
    Backslash: [220, '\\|'], Semicolon: [186, ';:'], Quote: [222, "'\""], Comma: [188, ',<'], Period: [190, '.>'], Slash: [191, '/?'],
  };
  const vkMods = new Set(), vkInDbg = new Set();
  function vkToDebug(code) {
    const shift = vkMods.has('ShiftLeft') || vkMods.has('ShiftRight');
    let vk = 0, ch = 0, m;
    if ((m = /^Key([A-Z])$/.exec(code))) { vk = m[1].charCodeAt(0); ch = shift ? vk : vk + 32; }
    else if ((m = /^Digit(\d)$/.exec(code))) { vk = 48 + +m[1]; ch = (shift ? ')!@#$%^&*('[+m[1]] : m[1]).charCodeAt(0); }
    else if ((m = /^F(\d+)$/.exec(code))) vk = 111 + +m[1];
    else if (VK_SPECIAL[code]) {
      const [v, c] = VK_SPECIAL[code]; vk = v;
      ch = typeof c === 'string' ? c.charCodeAt(shift && c.length > 1 ? 1 : 0) : c;
    }
    return [vk, ch];
  }

  function bindVKbd() {
    const panel = $('vkbd');
    // on-screen XT keys go to File Commander while it is the window in use (opened / last touched)
    const vkFc = new Set(), vkFcMods = new Set();
    const fcUsing = () => fc && fc.open && fcVk;
    const vkPress = (code) => {
      if (fcUsing() || vkFc.size) {
        vkFc.add(code);
        if (/^(Shift|Control|Alt)/.test(code)) { vkFcMods.add(code); return; }
        fc.vkey(code, vkFcMods);
        return;
      }
      if (dbgOn) { // the debugger gets the key (XT keyboard only)
        const sc = SCAN[code]; if (sc === undefined || !E.web_debug_active()) return;
        vkInDbg.add(code); if (/^(Shift|Control|Alt)/.test(code)) vkMods.add(code);
        E.web_key(sc, 1, 0);
        const [vk, ch] = vkToDebug(code);
        if (vk) { E.web_debug_key(vk, ch); debugResume(); }
        return;
      }
      if (!E || isPaused()) return;
      startAudio();
      if (code in KJ_BITS) { kjBits |= KJ_BITS[code]; E.web_kjoy(kjBits); return; }
      if (code.startsWith('ZX:')) { E.web_zxkey(+code.slice(3), 1); return; }
      const sc = SCAN[code]; if (sc !== undefined) E.web_key(sc, 1, 0);
    };
    const vkRelease = (code) => {
      if (vkFc.delete(code)) { vkFcMods.delete(code); return; }
      if (!E) return;
      vkMods.delete(code);
      if (vkInDbg.delete(code)) { // pressed inside the debugger: never reaches the machine
        const sc = SCAN[code]; if (sc !== undefined && E.web_debug_active()) E.web_key(sc, 0, 0);
        return;
      }
      if (code in KJ_BITS) { kjBits &= ~KJ_BITS[code]; E.web_kjoy(kjBits); return; }
      if (code.startsWith('ZX:')) { E.web_zxkey(+code.slice(3), 0); return; }
      const sc = SCAN[code]; if (sc !== undefined) E.web_key(sc, 0, 0);
    };
    const sticky = ['0', '1', '2'].includes(load('sticky')) ? +load('sticky') : 1;
    $('sticky').value = String(sticky);
    $('sticky').onchange = () => { store('sticky', $('sticky').value); vkbd.setSticky(+$('sticky').value); $('sticky').blur(); };
    vkbd = UnrealVKbd.create(panel, { press: vkPress, release: vkRelease, tab: load('vktab'), joy: load('vkjoy') || 'sinclair2', sticky,
      onTab: (t) => { if (!kbdNoStore) store('vktab', t); $('kbdtype').value = t; }, onJoy: (j) => store('vkjoy', j),
      overlayHost: $('screenwrap'), ovBarHost: $('sbjoy'), onLayout: () => applyScale(),
      joyOpts: (() => { try { return JSON.parse(load('vkjoyopt') || '{}'); } catch (e) { return {}; } })(), onJoyOpts: (o) => store('vkjoyopt', JSON.stringify(o)) });
    $('kbdtype').value = vkbd.tab;
    $('kbdtype').onchange = () => { vkbd.show($('kbdtype').value); $('kbdtype').blur(); applyScale(); };
    const showKbd = (v) => {
      panel.hidden = !v; $('kbdtype').hidden = !v; $('kbdbtn').classList.toggle('on', v);
      $('kbdbtn').title = v ? 'Hide keyboard' : 'On-screen keyboard';
      vkbd.visible(v);
      if (!kbdNoStore) store('vkbd', v ? '1' : '0');
      applyScale();
    };
    kbdLink = (t) => { // REST API kbd=: shown / hidden for this visit, the saved setting stays
      kbdNoStore = true;
      try { if (/^(zx|xt|joy)$/.test(t)) { vkbd.show(t); showKbd(true); } else if (/^(off|0|no|none|false)$/.test(t)) showKbd(false); }
      finally { kbdNoStore = false; }
    };
    $('kbdbtn').onclick = () => showKbd(panel.hidden);
    const saved = load('vkbd');
    showKbd(saved === null ? (matchMedia('(pointer: coarse)').matches) : saved === '1');
  }

  let kbdNoStore = false, kbdLink = () => {};
  function bindUI() {
    buildDrives();
    $('file').onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (f) { fwinShow('loadwin', false); autorunNext = fromLoadWin && $('ldauto').checked; await loadFile(f, pendingDrive); autorunNext = false; }
      fromLoadWin = false;
      pendingDrive = -1;
      canvas.focus();
    };
    const btn = (id, fn) => { $(id).onclick = () => { fn(); if (!modalOpen()) canvas.focus(); }; };
    $('load').onclick = () => { if ($('loadwin').hidden) showLoad(); else fwinShow('loadwin', false); };
    btn('pause', () => setUserPaused(!userPaused));
    btn('reset', () => E.web_reset(0));
    btn('xt', toggleXT);
    btn('turbo', toggleTurbo);
    bindSpeed();
    bindVKbd();
    bindNedo();
    bindDebugger();
    bindSysInfo();
    bindPerf();
    // About: version and author; the e-mail is a picture (not a mailto / text for address harvesters)
    $('aboutver').innerHTML = `v.${APP_VER} by ae485 (<img class="mailimg" alt="e-mail" src="data:image/png;base64,${MAIL_PNG}">). <a href="#" id="chlink">changes</a>.<br>Based on UnrealSpeccy 0.39.0.`;
    $('chlink').onclick = (e) => { e.preventDefault(); showChanges(true); };
    bindIosMix();
    bindRest();
    bindSave();
    bindSoundOpts();
    bindViz();
    bindMouse();
    $('fxsel').onchange = () => { store('fx', $('fxsel').value); setFx($('fxsel').value); };
    setFx(fxMode);
    optFW = floatWin($('options'), 'optpos', () => {
      const r = $('screenwrap').getBoundingClientRect(), w = $('options').offsetWidth, vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.left + (r.width - w) / 2, vw - w - 4)), y: Math.max(8, r.top + 16) };
    });
    $('optbtn').onclick = () => showOptions(!optOpen());
    $('sysbtn').onclick = () => { if (optOpen() && curPane === 'sys') showOptions(false); else { if (!optOpen()) showOptions(true); showPane('sys'); } sysBtnUI(); }; // Options / System (machine, ROM, clock)
    $('options').querySelector('[data-close]').onclick = () => showOptions(false);
    document.querySelectorAll('#options header [data-tab]').forEach((b) => b.onclick = () => showPane(b.dataset.tab));
    mhFW = floatWin($('mainhelp'), 'mainhelppos', () => {
      const r = $('screenwrap').getBoundingClientRect(), w = $('mainhelp').offsetWidth, vw = document.documentElement.clientWidth;
      return { x: Math.max(4, Math.min(r.right - w - 8, vw - w - 4)), y: Math.max(8, r.top + 8) };
    });
    $('mainhelpbtn').onclick = () => showMainHelp($('mainhelp').hidden);
    $('mainhelpclose').onclick = () => { showMainHelp(false); canvas.focus(); };
    showPane('sys');
    bindModels(); bindOffline();
    bindLoad();
    $('snd').onclick = toggleSound;
    $('sndhint').onclick = (e) => { e.stopPropagation(); unlockAudio(); $('sndhint').hidden = true; canvas.focus(); };
    $('scale').onchange = () => { store('scale', $('scale').value); applyScale(); canvas.focus(); };
    const sv = load('scale'); if (sv) $('scale').value = sv;
    // a text field in use on a touch device: the on-screen keyboard narrows the viewport — the emulator keeps its size
    // (File Commander editor, Go #, names…); it is fitted again when the field is left
    const typing = () => { const a = document.activeElement; return !!a && matchMedia('(pointer: coarse)').matches && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !/^(checkbox|radio|range|button|file|submit)$/i.test(a.type))); };
    const scaleNow = () => { if (!typing()) applyScale(); };
    document.addEventListener('focusout', () => setTimeout(scaleNow, 350));
    window.addEventListener('resize', scaleNow);
    // iOS (home-screen app, back-forward cache): the final viewport size arrives late, without a resize event
    const rescale = () => { applyScale(); setTimeout(applyScale, 150); setTimeout(applyScale, 600); setTimeout(applyScale, 1500); };
    window.addEventListener('pageshow', rescale); window.addEventListener('orientationchange', rescale);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) rescale(); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', scaleNow);
    rescale();
    document.addEventListener('fullscreenchange', () => { applyScale(); canvas.focus(); });
    const wrap = $('screenwrap');
    wrap.addEventListener('dragover', (e) => e.preventDefault());
    wrap.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0], 0); });
    canvas.addEventListener('mousedown', () => { startAudio(); canvas.focus(); });
    for (const ev of ['pointerdown', 'touchend', 'mousedown', 'keydown', 'click']) document.addEventListener(ev, unlockAudio, true);
    updateSoundBtn();
    applyScale();
  }
  function store(k, v) { try { localStorage.setItem('unreal.' + k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem('unreal.' + k); } catch (e) { return null; } }

  // ------------------------------------------------------------------ link API: index.html?model=pentagon&speed=1&a=trd/game.trd&autorun=1
  // Parameters may also follow '#'. Keys and values are case-insensitive (file paths keep their case, folders are lower case).
  const MODEL_ALIASES = {
    atm710: 'ATM710', atm2: 'ATM710', atm: 'ATM710', 'atm2+': 'ATM710',
    xbiosxt: 'XBIOSXT', xbios: 'XBIOSXT', xt132: 'XBIOSXT', xbios136: 'XBIOS136', xt136: 'XBIOS136',
    atm450: 'ATM450', atm1: 'ATM450',
    evo: 'EVO', zxevo: 'EVO', atm3: 'EVO',
    pentagon: 'PENTAGON', p128: 'PENTAGON', pentagon128: 'PENTAGON',
    scorpion: 'SCORPION', scorp: 'SCORPION', zs256: 'SCORPION', profi: 'PROFI', kay: 'KAY', kay1024: 'KAY',
    plus3: 'PLUS3', '+3': 'PLUS3', p3: 'PLUS3', quorum: 'QUORUM',
    tasis: 'TASIS', tasis540: 'TASIS', chic: 'CHIC', isdos: 'CHIC', isdos501: 'CHIC', nedoos: 'NEDOOS', nedo: 'NEDOOS',
  };
  function linkParams() {
    const out = {};
    const add = (q) => { for (const [k, v] of new URLSearchParams(q)) out[k.toLowerCase()] = v; };
    add(location.search);
    if (location.hash.length > 1 && location.hash.includes('=')) add(location.hash.slice(1));
    return out;
  }
  let LINK = linkParams();
  const LINK_USED = Object.keys(LINK).length > 0; // the sound hint is shown only for pages started from a REST API link
  const yes = (v) => v !== undefined && !/^(0|no|off|false)$/i.test(v);
  // before the first start: the model (so only its ROM is downloaded)
  function linkModel() {
    if (!LINK.model) return;
    const m = MODEL_ALIASES[LINK.model.toLowerCase().replace(/[\s_-]/g, '')] || Object.keys(MODELS).find((k) => k.toLowerCase() === LINK.model.toLowerCase());
    if (m) model = m; else toast('Link: unknown model "' + LINK.model + '" (' + Object.keys(MODEL_ALIASES).join(', ') + ')', true);
  }
  // rom=: a Custom ROM ZIP (Save / Custom ROM: ROM + json with the machine, slots, clock, FDD, HDD interface, ini keys)
  // or a plain ROM image — before the first start, so the machine starts as the ZIP says. Nothing of it is stored.
  let romLinkUrl = '';
  async function linkRom() {
    if (!LINK.rom) return;
    const url = new URL(lowDir(LINK.rom), location.href).href, name = urlName(url);
    try {
      await crAdd(name, new Uint8Array(await (await fetchFile(url)).arrayBuffer()));
      if (!crCur) return;
      const p = customApply();
      if (!p.ini) { toast('Link: ' + name + ': ' + p.why, true); return; }
      model = 'CUSTOM'; romLinkUrl = url;
    } catch (err) { toast('Link: ' + name + ': ' + err.message, true); }
  }
  // after the start: clock, keyboard, sound, files
  async function linkApply() {
    if (LINK.speed) { // 2, 2x or 7mhz; snapped to the nearest step of the clock slider, not saved
      const v = parseFloat(LINK.speed), x = /mhz/i.test(LINK.speed) ? v / 3.5 : v;
      if (isFinite(x) && x > 0) { let best = 0; SPEEDS.forEach((s, i) => { if (Math.abs(s - x) < Math.abs(SPEEDS[best] - x)) best = i; }); setSpeed(best, false); }
    }
    if (LINK.mute !== undefined && yes(LINK.mute)) { muted = true; updateSoundBtn(); }
    if (LINK.kbd !== undefined) kbdLink(String(LINK.kbd).toLowerCase()); // kbd=zx|xt|joy|off: for this visit only
    if (LINK.swapmouse !== undefined && yes(LINK.swapmouse)) { mswapLink = true; applyMouseSwap(); } // not stored
    if (LINK.xt !== undefined && MODELS[model].xt && !!E.web_xt_kbd() !== yes(LINK.xt)) toggleXT();
    const auto = (LINK.autorun !== undefined && yes(LINK.autorun)) && !LINK.run && !LINK.cpm;
    if (LINK.hdd) { // hdd=: an HDD image (zip with .chs, or .hdd) into HDD 0
      const url = new URL(lowDir(LINK.hdd), location.href).href, name = urlName(url);
      try {
        await hddFromBytes(0, name, new Uint8Array(await (await fetchFile(url)).arrayBuffer()), true); hddSrc[0] = url;
        if (!E.web_hdd_scheme(-1)) { E.web_hdd_scheme(+(HDD_IF_DEF[M()] || 1)); hddMount(0); }
        hddUI(); toast('HDD 0: ' + hdds[0]);
      } catch (err) { toast('Link: ' + name + ': ' + err.message, true); }
    }
    if (LINK.sd) { // sd=: an SD card image (.img / .vhd or a zip with it) on the Z-Controller
      const url = new URL(lowDir(LINK.sd), location.href).href, name = urlName(url);
      if (!sdOn()) store('sd.if.' + M(), '1'); // like hdd=: the interface goes on
      try { await sdFromBytes(name, new Uint8Array(await (await fetchFile(url)).arrayBuffer()), true); if (sdName) { sdSrc = url; if (M() === 'EVO') E.web_reset(0); } } // the card is there from power-on
      catch (err) { toast('Link: ' + name + ': ' + err.message, true); }
    }
    const jobs = [['b', 1, false], ['a', 0, auto], ['tape', -1, auto && !LINK.a], ['snap', -1, false]];
    for (const [key, drive, run] of jobs) {
      if (!LINK[key]) continue;
      const url = new URL(lowDir(LINK[key]), location.href).href, name = urlName(url);
      try {
        const buf = new Uint8Array(await (await fetchFile(url)).arrayBuffer());
        autorunNext = run;
        loadingUrl = LINK[key]; linkLoading = true; try { await loadBytes(name, buf, drive); } finally { loadingUrl = null; linkLoading = false; }
      } catch (err) { toast('Link: ' + name + ': ' + err.message, true); }
      autorunNext = false;
    }
    if (LINK.run) { if (runInject(0, LINK.run)) { autorun(); toast('Run: ' + LINK.run); } }
    else if (auto && LINK.press && macro) macro.steps.push({ wait: 60 }, ...zxPress(LINK.press)); // a key in the boot menu (usually 0 = the first program)
    else if (LINK.cpm) cpmRun(LINK.cpm);
  }

  // iOS / iPadOS: no pinch zoom (Safari ignores user-scalable=no; its gesture events can be cancelled)
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 && e.scale !== undefined && e.scale !== 1) e.preventDefault(); }, { passive: false });
  // a home-screen app (iOS) keeps its index.html for a long time: look for a newer build on the server; the 'reload' fetch
  // also refreshes the browser's cached copy, so one reload is enough
  async function checkUpdate() {
    if (BUILD === 'dev' || location.protocol === 'file:') return;
    try {
      const r = await fetch(location.pathname, { cache: 'reload' });
      if (!r.ok) return;
      const m = /<meta name="build" content="([^"]+)"/.exec(await r.text());
      if (!m || m[1] === BUILD) return;
      let tries = 0; try { tries = +sessionStorage.getItem('unreal.upd') || 0; sessionStorage.setItem('unreal.upd', String(tries + 1)); } catch (e) {}
      if (tries >= 2) return; // the server / a proxy keeps the old page: do not loop
      toast('A new version — reloading…');
      setTimeout(() => location.reload(), 600);
    } catch (e) {}
  }
  // touch devices: no context menu, and no page drag from the emulator window or the on-screen panels (older iOS ignores
  // overscroll-behavior); text fields and scrolling lists inside the floating windows keep working
  const isField = (t) => t && t.closest && t.closest('input, textarea, select, .usel, [contenteditable]');
  document.addEventListener('contextmenu', (e) => { if (!isField(e.target)) e.preventDefault(); });
  document.addEventListener('touchmove', (e) => {
    const t = e.target;
    if (t && t.closest && t.closest('#mainwin, #vkbd') && !isField(t) && e.cancelable) e.preventDefault();
  }, { passive: false });
  document.addEventListener('selectstart', (e) => { if (!isField(e.target)) e.preventDefault(); });
  window.UnrealDebug = { get E() { return E; }, cstr: (p) => cstr(p), get runRestore() { return runRestore; }, get macro() { return macro; }, get audio() { return audio; }, runMacro: (st) => runMacro(st), ZK, UP, DOWN }; // for tests and the console
  // ------------------------------------------------------------------ boot
  window.addEventListener('DOMContentLoaded', async () => {
    bindUI();
    try {
      linkModel();
      await linkRom(); // rom= (Custom ROM ZIP) wins over model=
      await start();
      modelUI();
      await osBoot();
      $('loading').remove();
      hiddenPaused = document.hidden;
      applyRunState();
      canvas.focus();
      requestAnimationFrame(tick);
      linkApply();
      checkUpdate();
      swStart(); // offline copy (sw.js)
    } catch (err) {
      let msg = 'Startup error: ' + err.message;
      if (location.protocol === 'file:') msg += '<br>Open page through a web server.';
      $('loading').innerHTML = msg;
      console.error(err);
    }
  });
})();
