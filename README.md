# Web Unreal Speccy

A ZX Spectrum emulator, together with the Soviet and Russian machines compatible with it, that runs in a web browser.
The core is **UnrealSpeccy 0.39.0** (C++, originally for Windows) compiled to WebAssembly. The Windows layer
(DirectX, WinAPI dialogs, DirectInput) is replaced with a thin web layer in C++ and JavaScript.

It runs on desktop browsers, Mac, iPad and iPhone without installation: all it needs is the page on a web server.

## Machines

| Model | Notes |
|---|---|
| Turbo 2+ (7.10) | 1024K, BIOS 1.07.13, CP/M, XT keyboard |
| Turbo 2+ xBIOS 1.36 | vTR-DOS, ROM disk |
| ATM Turbo 1 (4.50) | 512K, BIOS 1.04.1R |
| ZX Evo BaseConf | 4096K, Turbo 2+ compatible; EVO Reset Service, CMOS, SD card, NEMO IDE |
| ZX Evo TS-Conf | 4096K, TS-BIOS; ZX / 16c / 256c / text modes up to 360×288, tiles and sprites (TSU), DMA, VDAC; VDAC2 (FT812); 3.5 / 7 / 14 MHz; SPG; Wild Commander on the SD card |
| Pentagon 128 | TR-DOS 5.04TM, port #EFF7 |
| Scorpion ZS 256 | ROM 2.95 |
| Profi 1024 | BIOS 2.2, CP/M from a .PRO disk |
| KAY 1024 | |
| Spectrum +3 | +3DOS, µPD765 |
| Quorum 1024 | |
| TaSiS v5.40, iS-DOS Chic v5.01 | xBIOS 1.36XT, boot from an HDD image |
| NedoOS (BaseConf) | boot from an SD card image |
| Custom ROM | a whole ROM of your own, or a 128 / 48 / TR-DOS / Service set, on any of the machines |

ZX Evo TS-Conf is not part of UnrealSpeccy 0.39: it was written for this port (`web/web_ts.cpp`, `web/web_ft.cpp`)
after the TS-Conf Verilog sources and documentation (TS-Labs) and the FT81X Programmers Guide.

## Features

- **Media:** TRD, SCL, FDI, UDI, TD0, ISD, PRO, DSK, IPF, Hobeta disks; TAP, TZX, CSW tapes; SNA, Z80 snapshots;
  SPG programs (TS-Conf); HDD images (ATM, NEMO, SMUC, Profi, DivIDE interfaces) and SD cards (Z-Controller).
  Everything can also be loaded from a ZIP.
- **Sound:** AY/YM, TurboSound, SAA1099, General Sound, Soundrive / Covox, beeper, tape sound; ZXBUS sound cards
  ZX-MultiSound (OPL3) and ZXM-MoonSound (OPL4) through [ymfm](https://github.com/aaronsgiles/ymfm).
- **Two debuggers:** the UnrealSpeccy debugger (ported without changing its logic, its modal loops run under Asyncify)
  and deBUGa, modelled on the [Xpeccy](https://github.com/samstyle/Xpeccy) debugger.
- **File Commander:** two panels over TR-DOS, CP/M, iS-DOS and FAT disks, HDD and SD images and a RAM disk with folders:
  copy, delete, view and edit files, make new disk images, exchange files with the computer.
  **Compile (F9)** assembles a project with [sjasmplus](https://github.com/z00m128/sjasmplus) built to WebAssembly;
  the output, listing and log go to the RAM disk.
- **Graf Search:** memory shown as a picture in ZX, ATM and TS-Conf graphics modes.
- **On-screen keyboards** (ZX, XT) and joystick, touch mouse, Kempston mouse.
- **REST API:** a link can choose the machine and its speed, insert disks, tapes, HDD and SD images, and start a program.
- **Offline copy** through a service worker (https or localhost).

## Running

The `dist/` folder is the whole site. Put it on any static web server;

### Server folders

| Folder | Contents |
|---|---|
| `unreal/` | the emulator: `unreal.wasm` (or `unreal.zip` holding it), `unreal.ini`, `boot6.$b`, `CMOS`, `sos.l`; `sjasm.zip` (sjasmplus for File Commander) |
| `js/` | scripts |
| `rom/` | ROM images, listed in `roms.json` |
| `trd/` | disk, tape and snapshot images for the Load window, listed in `trd.json` |
| `hdd/` | HDD images (ZIP with a `.chs` geometry file), listed in `hdd.json` |
| `sd/` | SD card images (`.img`, `.vhd` or ZIP), listed in `sd.json` |

## License

The code written for this port is released under the MIT license, see [LICENSE](LICENSE).
The UnrealSpeccy sources and the third-party components keep their own terms, which are listed in the same file.

## Credits

- **UnrealSpeccy** by SMT and its contributors.
- **Xpeccy** by SAM style: the model for the deBUGa debugger.
- **TS-Labs:** ZX Evolution and TS-Conf.
- **sjasmplus** by Aprisobal, z00m128 and contributors (BSD-3-Clause).
- **ymfm** by Aaron Giles; **stb_image** by Sean Barrett; the inflate code follows **puff** by Mark Adler.
- Web port: ae485.
