# Web BK-0010

A web port of **BK Emulator for Windows 3.7** — an emulator of the Soviet home computers
BK-0010-01, BK-0011 and BK-0011M (Elektronika, 1985–1990). The original emulation core is
compiled to WebAssembly (wasm32-wasi) with almost no changes; Windows parts (MFC window,
DirectDraw, waveOut) are replaced by a thin web layer. Runs in any modern browser on PC,
Mac, iPad and iPhone (also as a home-screen app).

## Features

- **Models**: 13 configurations of the original — BK-0010-01 (+ MSTD, + 32K RAM, + KNGMD,
  + A16M, + SMK-512), BK-0011 (+ KNGMD, + SMK-512), BK-0011M (+ KNGMD, + A16M, + SMK-512)
- **Hardware**: K1801VM1 CPU (clock 0.25x–10x, max speed), 512×256 b&w / 256×256 color screen,
  speaker, AY-3-8910, Covox, tape port 177716, joystick port 177714, floppy controllers
  KNGMD / A16M / SMK-512 (drives A:–D:), SMK-512 IDE HDD (master / slave)
- **Video**: color, black & white, green phosphor; filters (smooth, scanlines, CRT)
- **Input**: PC keyboard with the original BK key logic; on-screen BK-0010-01 keyboard,
  XT keyboard and joystick panel; NumPad joystick
- **Files**:
  - `.bin` — run through the monitor's tape routine (EMT 36), overlays from the same set
  - `.tap` / `.wav` — played as a real cassette
  - `.img` / `.bkd` / `.dsk` / `.hdi` — Boot (the model for the image is chosen) or insert into a drive
  - `.msf` — machine state (BK Emulator format 1.2), load and save
  - `.bkscript` — keyboard scripts
- **File Commander**: two panels over zip sets, mounted drives (ANDOS, FAT12 / DX-DOS,
  MKDOS, RT-11 file systems), RAM; viewer (text, hex, octal, PDP-11 disassembler)
- **Load / Save**: server list (`img/list.json`), files from the computer; state and changed
  disk images as `.zip`
- **Tools**: debugger (breakpoints, steps, registers, memory), memory map, Graph Search

## Repository

The repository holds the page and the compiled emulator, ready to put on a web server:

| File | Contents |
|---|---|
| `index.html`, `usel.js`, `app.js`, `fcmd.js`, `vkbd.js`, `diskfs.js`, `dbg.js`, `unzip.js`, `wasi_fs.js` | the page: main loop, Web Audio, windows, File Commander, debugger, on-screen keyboards, drop-down lists, WASI file system in memory |
| `bk.wasm` | the BK Emulator 3.7 core and its thin C++ web layer, compiled to wasm32-wasi |
| `bk.ini` | settings of the original emulator (ROM file names of the models) |
| `.htaccess`, `web.config` | MIME types and caching for Apache / IIS |
| `changes.txt` | version history |

The C++ sources of the core are not published: their authors do not allow redistribution
of the source code without written consent (see [LICENSE](LICENSE)). `bk.wasm` was built
from BK Emulator for Windows 3.7 with wasi-sdk 25 and binaryen 123.

## Server layout

The repository files, and next to them:

```
icon.png  apple-touch-icon.png
rom/        ROM images named as in bk.ini (lower or upper case)
img/        list.json and the sets it lists (games.zip, disks.zip, bkscript.zip ...)
```

Any static web server works; `.wasm` must be served as `application/wasm`.

`img/list.json` — the Load menu and the File Commander sets:

```json
{
  "files":   [ { "name": "games",    "url": "img/games.zip",    "desc": "BK-0010 games" } ],
  "disks":   [ { "name": "disks",    "url": "img/disks.zip" } ],
  "scripts": [ { "name": "bkscript", "url": "img/bkscript.zip" } ],
  "states":  []
}
```

A `.zip` item opens as a set in File Commander; any other file (image, `.msf`, `.bkscript`, `.bin`)
opens as if dropped on the screen.

ROM images are not included: take them from the original BK Emulator distribution.

## Credits

- BK Emulator for Windows — Yuriy Kalmykov (2002–2004), gid and contributors
- BkSound, FDDController — from BKBTL (LGPL-3.0)
- emu2149 (AY-3-8910) — Mitsutaka Okazaki
- Web port — ae485

## License

See [LICENSE](LICENSE). The page code is MIT; `bk.wasm` is the original emulator core in
compiled form, under its authors' terms (use in compiled form is allowed).
