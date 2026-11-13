# BaseConf frame interrupts and port xx77

On ZX Evolution BaseConf, writing an EGA mode value such as `08h` to
`8377h` must not disable frame interrupts. The core distributed in build
`20261113140714` applies the ATM710 interrupt-enable bit (`xx77` data bit 5)
to both ATM710 and ATM3, the model used for BaseConf. A program that clears
that unused BaseConf bit and then executes `EI` / `HALT` can wait forever.

The BaseConf FPGA is the reference:

- [`zports.v`, lines 861–882](https://github.com/tslabs/zx-evo/blob/f0eebed4edb4f36d0e6368363376b317f5a83083/pentevo/fpga/base/z80/zports.v#L861-L882)
  latches data bits 0–2 as the video mode and bit 3 as turbo. The other
  control bits come from the port address. Data bit 5 is not latched.
- [`zint.v`](https://github.com/tslabs/zx-evo/blob/f0eebed4edb4f36d0e6368363376b317f5a83083/pentevo/fpga/base/z80/zint.v)
  generates frame INT without an xx77 bit-5 gate.

## Correction

The public repository contains the distributed WASM, without the C++
sources that produced it. This patch changes three immediates in that
binary, with a reproducible, hash-checked script.

The source-level equivalent is to restrict the ATM710 interrupt gate to
ATM710 alone, in **both interrupt-acceptance paths and the stopped-CPU
diagnostic**. In the original binary, the model values are 5 for ATM710 and
6 for ATM3. The conditions compile as follows (pseudocode, not recovered
C++ source):

```c
/* Both interrupt-acceptance paths: */
if ((unsigned)(model - 5) <= 1) { /* change 1 to 0 */
    if (!(pFF77 & 0x20)) { /* suppress INT */ }
}

/* Skip the stopped-CPU diagnostic when interrupts can wake the CPU: */
if (iff1 && ((unsigned)(model - 5) > 1 || (pFF77 & 0x20))) { /* 1 -> 0 */
    /* do not report CPU HALTED / CPU STOPPED while IFF1 is set */
}
```

All three instructions are in WASM function 1485. Each change is the
single immediate byte `01` → `00`; instruction sizes, section sizes and
all other bytes are unchanged:

| File offset | Original operation | Fixed operation |
|---|---|---|
| `0x96248` | `i32.const 1` before `i32.le_u` | `i32.const 0` |
| `0x987c0` | `i32.const 1` before `i32.le_u` | `i32.const 0` |
| `0x9e6b8` | `i32.const 1` before `i32.gt_u` | `i32.const 0` |

SHA-256 of the **unpacked** `unreal.wasm`:

```
original  8754e9f268b53063ca3c75936b61a80664732ca8c7a115ce87260a7a9c9245ae
fixed     3cfdd042c7e015557e27bd6d40a262f1fd9d8480f35cd3c3b6f973c077b84554
```

`tools/fix_baseconf_interrupts.py` verifies the original hash and the full
instruction context at each site, then verifies the result hash. It
refuses other builds and is a no-op on the fixed build. Run it on the
original distribution archive to reproduce the binary change:

```sh
python3 tools/fix_baseconf_interrupts.py /path/to/original/unreal.zip
```

The page and `app.js` build stamp also change to `20261113193421`, so the
service worker and WASM fetch URLs do not retain the old core. These are
the only changes to the JavaScript payload. When rebuilding from C++,
apply the source-level correction and use the normal release build stamp;
the binary script deliberately will not patch a different build.

## Regression test

Python 3 and Node are sufficient; no package installation, browser or
network access is needed:

```sh
python3 tests/baseconf_interrupts.py
python3 tests/baseconf_interrupts.py --archive /path/to/original/unreal.zip
```

The test uses the shipped WASI/Asyncify adapters, WASM and ROMs. After the
firmware initializes memory, it loads a small Z80 program into RAM. That
program writes the real configuration ports, installs an IM 1 handler,
enables interrupts and counts them for 20 frames. The test does not alter
core internals to force the result.

There are 48 cases: BaseConf and ATM710, bit 5 clear and set, normal and
breakpoint-enabled execution, EGA and ZX video, and three loops (`HALT`,
`NOP` / `JP`, and `JP` to itself). BaseConf must receive interrupts with
either bit value. ATM710 must still stop receiving them when bit 5 is
clear. The test also rejects false `CPU HALTED` / `CPU STOPPED` status
messages when interrupts can wake the program, while retaining these
diagnostics for ATM710 with interrupts disabled. The original archive
fails the 12 BaseConf/bit-clear cases; the fixed archive passes all 48.
Reverting either acceptance-path change causes six cases to fail; reverting
the diagnostic change causes eight cases to fail.

## Dune reproduction

This was found while booting the
[Dune II BaseConf port](https://github.com/lordamot/retro-game-zxevo-dune).
Its original build sets EGA mode with xx77 bit 5 clear, which is valid on
BaseConf. After the loader finishes, the original emulator stalls at the
game's first interrupt-synchronized palette update.

The loader's earlier **ERROR 01** is a separate missing-media condition:
`dune.trd` contains the loader and requires an SD image with `DUNE.DAT` in
its root. Mount that SD image, then use the BaseConf firmware's file
browser: **F**, Enter on `DUNE.TRD`, **5** (Mount A), **Z** (TR-DOS boot),
Enter. Set General Sound explicitly **On** for the sound check; its Auto
detection is a separate issue.

With the corrected core, the game can keep bit 5 clear. The integration
check builds Dune commit `596f238ced095bb3a0330aa565b38dd4a0a30852`, before
its emulator compatibility workaround, and boots through that firmware
route. It verifies the intro, frame interrupts, General Sound audio,
Atreides mission 1 and 600 further battle frames, including the integrity
of all 17 code banks' shared stubs. The standalone regression above is
self-contained and does not require Dune.
