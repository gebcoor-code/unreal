'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dir = process.argv[2];
const {MemFS, WASI} = require(path.join(dir, 'wasi_fs.js'));
const asyncify = require(path.join(dir, 'asyncify.js'));
const wasm = new WebAssembly.Module(fs.readFileSync(path.join(dir, 'unreal.wasm')));

function run(model, bit5, debug, video, loop) {
  const files = new MemFS();
  for (const name of ['unreal.ini', 'CMOS', 'zxevo_fe.rom', 'bios_1_07_13.rom']) {
    files.write(name, fs.readFileSync(path.join(dir, name)));
  }
  files.write('web_model.ini', Buffer.from(`[MISC]\nHIMEM=${model}\n`
    + `RAMSize=${model === 'ATM3' ? 4096 : 1024}\nCMOS=none\nRESET=SYS\n`
    + '[ROM]\nROMSET=\nATM3=zxevo_fe.rom\nATM2=bios_1_07_13.rom\n'
    + '[SOUND]\nGSType=NONE\n'));
  const wasi = new WASI(files, {stdout: () => {}});
  const as = asyncify.create();
  const fail = () => { throw Error('Unexpected emulator dialog/fatal error'); };
  const E = new WebAssembly.Instance(wasm, {
    wasi_snapshot_preview1: wasi.imports,
    env: {web_tz_offset: () => 0, web_ui: () => {}, web_message: fail,
      web_fatal: fail, web_sleep: as.web_sleep, web_debug_notify: () => {}},
  }).exports;
  wasi.setMemory(E.memory);
  E._initialize(); as.init(E); E.web_init();
  E.web_true_clock(69888); // BaseConf/ATM True-clock setting used by the UI.
  function frames(count) {
    for (let i = 0; i < count; i++) {
      assert(as.call('web_frame').done, 'Unexpected debugger stop');
    }
  }
  frames(300); // Let the bundled firmware initialize the memory manager.

  // A small Z80 program at 8000h. It writes the real ports, installs an IM 1
  // handler, then counts frame interrupts at 9000h. No core state is patched.
  const mode = video | 8 | (bit5 ? 32 : 0);
  const code = [
    0xf3,                         // DI
    0x31, 0xf0, 0xbf,             // LD SP,BFF0h
    0x3e, 1, 0xd3, 0xbf,          // LD A,1 / OUT (BFh),A: shadow ports on
    0x01, 0x77, 0x83,             // LD BC,8377h: manager on, CP/M off
    0x3e, mode, 0xed, 0x79,        // LD A,mode / OUT (C),A
    0x01, 0xfd, 0x7f,             // LD BC,7FFDh
    0x3e, 0x10, 0xed, 0x79,       // LD A,10h / OUT (C),A
    0x01, 0xf7, 0x3f,             // LD BC,3FF7h: map RAM into window 0
    0x3e, 0x77, 0xed, 0x79,       // LD A,77h / OUT (C),A
    0x21, 0, 0, 0x22, 0, 0x90,   // LD HL,0 / LD (9000h),HL
  ];
  const handlerLoad = code.length;
  code.push(0x21, 0, 0,            // LD HL,handler (resolved below)
    0x11, 0x38, 0,                // LD DE,0038h
    0x01, 12, 0, 0xed, 0xb0,     // LD BC,12 / LDIR
    0xaf, 0xed, 0x47,             // XOR A / LD I,A
    0xed, 0x56, 0xfb, 0x00);     // IM 1 / EI / NOP
  const start = 0x8000 + code.length;
  if (loop === 'halt') code.push(0x76); // HALT / JP loop
  if (loop === 'busy') code.push(0x00); // NOP / JP loop
  // 'self' is JP to itself, exercising the stopped-CPU diagnostic.
  code.push(0xc3, start & 255, start >> 8);
  const handler = 0x8000 + code.length;
  code[handlerLoad + 1] = handler & 255;
  code[handlerLoad + 2] = handler >> 8;
  code.push(0xe5,                  // PUSH HL
    0x2a, 0, 0x90, 0x23,          // LD HL,(9000h) / INC HL
    0x22, 0, 0x90, 0xe1,          // LD (9000h),HL / POP HL
    0xfb, 0xed, 0x4d);            // EI / RETI
  assert.equal(E.web_dga_phys(0x8000), 0x8000, 'Firmware must map RAM page 2');
  const ram = new Uint8Array(E.memory.buffer, E.web_gfx_mem(1, 0, 0), E.web_gfx_size(1));
  ram.set(code, 0x8000);
  E.web_dga_setreg(11, 0x8000); // PC: start the fixture.
  if (debug) {
    // An unreachable execute breakpoint selects the debug execution path.
    assert.equal(E.web_dga_bp(0xdead, 1), 64);
  }
  frames(20);
  assert.equal(E.web_ff77(), mode, 'The fixture must write xx77');
  assert.equal(E.web_peek(0x38), 0xe5, 'The IM 1 handler must be mapped');
  const regs = new Uint32Array(E.memory.buffer, E.web_dga_regs(), 20);
  assert.equal(regs[13], 1, 'IM 1');
  assert.equal(regs[14], 1, 'IFF1 enabled');
  assert(regs[11] >= start && regs[11] < start + 4, 'CPU must stay in its test loop');
  const count = ram[0x9000] | ram[0x9001] << 8;
  const status = Buffer.from(new Uint8Array(E.memory.buffer, E.web_statusline(), 128))
    .toString().split('\0')[0];
  if (model === 'ATM3' || bit5) {
    assert(count >= 18 && count <= 20, `Expected frame interrupts, received ${count}`);
    assert(!/CPU (HALTED|STOPPED)/.test(status), `False stopped-CPU diagnostic: ${status}`);
  } else {
    assert.equal(count, 0, 'ATM710 must still honor its interrupt-disable bit');
    if (loop === 'halt') assert.equal(status, 'CPU HALTED');
    if (loop === 'self') assert.equal(status, 'CPU STOPPED');
  }
}

let passed = 0, failed = 0;
for (const model of ['ATM3', 'ATM710']) {
  for (const bit5 of [false, true]) for (const debug of [false, true]) {
    for (const video of [0, 3]) for (const loop of ['halt', 'busy', 'self']) {
      const name = `${model} bit5=${+bit5} ${debug ? 'debug' : 'normal'} `
        + `${video === 0 ? 'EGA' : 'ZX'} ${loop}`;
      try {
        run(model, bit5, debug, video, loop);
        passed++;
      } catch (error) {
        console.error(`FAIL ${name}: ${error.message}`);
        failed++;
      }
    }
  }
}
console.log(`${passed} passed, ${failed} failed (BaseConf / ATM710 frame interrupts)`);
process.exitCode = failed ? 1 : 0;
