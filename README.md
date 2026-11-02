# Web Unreal Speccy

Z80 based emulator, with the Soviet and Russian machines compatible with it.
Core is **UnrealSpeccy 0.39.0**.

## Machines

| Model | Notes |
|---|---|
| Turbo 2+ (7.10) | 1024K, BIOS 1.07.13, CP/M, XT keyboard |
| Turbo 2+ xBIOS 1.36 | vTR-DOS, ROM disk |
| ATM Turbo 1 (4.50) | 512K, BIOS 1.04.1R |
| ZX Evo BaseConf | 4096K, Turbo 2+ compatible; EVO Reset Service, CMOS, SD card, NEMO IDE |
| Sprinter Sp2000 | 4096K, BIOS 3.06 (Sprinter Team; setup, startup sound, ROM disk with RECOVERY): text 80×32, graphics 320×256×256 and 640×256×16, 3.5 / 21 MHz; accelerator (block fills and copies), raster effects; IDE (2 channels), FDD (PC floppies 720K: .img), CMOS; AT keyboard, MS serial mouse, Sega pads; AY, Covox and Covox Blaster (stereo, 16-bit); boots Estex DSS 1.71 (start menu: FM, Flex Navigator, command prompt); Spectrum mode (C:\ZX\SPECTRUM.EXE, TR-DOS 7.03, TRD and SCL) |
| ZX Evo TS-Conf | 4096K, TS-BIOS; ZX / 16c / 256c / text modes up to 360×288, tiles and sprites (TSU), DMA, VDAC; VDAC2 (FT812); 3.5 / 7 / 14 MHz; SPG; Wild Commander on the SD card |
| Pentagon 128 | TR-DOS 5.04TM, port #EFF7 |
| Scorpion ZS 256 | ROM 2.95 |
| Scorpion ZS 256 GMX | GMX board: 2048K, 640×200 with hardware scroll, turbo, 512K flash of LW/PLM (GMX Loader 2.00, Shadow Service Monitor 6.44), runs OSZ |
| Profi 1024 | BIOS 2.2, CP/M from a .PRO disk |
| KAY 1024 | |
| Spectrum +3 | +3DOS, µPD765 |
| Quorum 1024 | |
| TaSiS v5.40, iS-DOS Chic v5.01 | xBIOS 1.36XT, boot from an HDD image |
| NedoOS (BaseConf) | boot from an SD card image |
| OSZ (Scorpion GMX) | the multitasking OS of izzx: SD card image (sd/osz.zip) + OS.TRD |
| Custom ROM | a whole ROM of your own, or a 128 / 48 / TR-DOS / Service set, on any of the machines |

The CMOS of each machine that has one (ZX Evo BaseConf and TS-Conf, Sprinter, GMX with its NVRAM) is kept in the browser
(localStorage) separately; Options / System / Reset CMOS puts the typical one back.

## Features

- **Media:** TRD, SCL, FDI, UDI, TD0, ISD, PRO, DSK, IPF, Hobeta disks; raw PC floppies (IMG 720K / 360K, Sprinter); TAP, TZX, CSW tapes; SNA, Z80 snapshots;
  SPG programs (TS-Conf); RZX input recordings; HDD images (ATM, NEMO, SMUC, Profi, DivIDE interfaces) and SD cards
  (Z-Controller).
  Everything can also be loaded from a ZIP.
- **Sound:** AY/YM, TurboSound, SAA1099, General Sound, Soundrive / Covox, beeper, tape sound; ZXBUS sound cards
  ZX-MultiSound (OPL3) and ZXM-MoonSound (OPL4) through [ymfm](https://github.com/aaronsgiles/ymfm).
- **Two debuggers:** the UnrealSpeccy debugger (ported without changing its logic, its modal loops run under Asyncify)
  and deBUGa, modelled on the [Xpeccy](https://github.com/samstyle/Xpeccy) debugger.
- **File Commander:** two panels over TR-DOS, CP/M, iS-DOS and FAT disks (FAT12 PC floppies too), HDD and SD images and a RAM disk with folders:
  copy, delete, view and edit files, make new disk images, exchange files with the computer.
  **Compile (F9)** assembles a project with [sjasmplus](https://github.com/z00m128/sjasmplus) built to WebAssembly;
  the output, listing and log go to the RAM disk.
- **Graf Search:** memory shown as a picture in ZX, ATM and TS-Conf graphics modes.
- **RZX:** playback with a seek bar over the screen and Take control (ZX Spectrum 48 / 128 / +2 on the Sinclair ROMs);
  recording from Save on 48 / 128K models.
- **On-screen keyboards** (ZX+, ZX-48, XT) and joystick, touch mouse, Kempston mouse.
- **Screen:** Hide Menu Bar (the top-left corner brings it back), Mix Frames for GMX gigascreen pictures,
  landscape layout for phones.
- **REST API:** a link can choose the machine and its speed, insert disks, tapes, HDD and SD images, and start a program.
- **Offline copy** through a service worker (https or localhost).

### Server folders

| Folder | Contents |
|---|---|
| `unreal/` | the emulator: `unreal.wasm` (or `unreal.zip` holding it), `unreal.ini`, `boot6.$b`, `CMOS`, `sos.l`; `sjasm.zip` (sjasmplus for File Commander) |
| `js/` | scripts: `js.zip` (the page unpacks it; the separate `.js` files also work) |
| `rom/` | ROM images, listed in `roms.json` |
| `trd/` | disk, tape and snapshot images for the Load window, listed in `trd.json` |
| `hdd/` | HDD images (ZIP with a `.chs` geometry file, or a VHD that has its geometry in its footer), listed in `hdd.json`; `dss.zip`: the Sprinter's Estex DSS disk |
| `sd/` | SD card images (`.img`, `.vhd` or ZIP), listed in `sd.json` |

### Hard disks and SD cards

- **Images:** a raw image (`.hdd`, `.img`, `.hdf`) with its geometry in a `.chs` file next to it in the ZIP
  (`CHS=C/H/S Interface=...`), or a **fixed VHD** that has the geometry in its footer (no `.chs` needed). A dynamic VHD
  is not read: convert it to a fixed one.
- **File systems:** File Commander reads and writes FAT12, FAT16 and FAT32, on a whole image (superfloppy) or in MBR
  partitions, for HDD and SD images alike.
- **New Disk** (File Commander): HDD FAT (ZX Evo, NEMO interface) and SD card (Z-Controller) as FAT16 or FAT32
  (Auto: FAT16 up to 256 MB, FAT32 above; FAT32 needs at least 35 MB); the SD card is made as a VHD.
  The SD images of NedoOS, Wild Commander and OSZ are made as FAT32 VHD.
- **Save:** an SD card goes out as a fixed VHD (it can be mounted on a PC); an HDD that is a VHD goes out alone, a raw one
  with its `.chs`.
- **Sprinter:** `hdd/dss.zip` holds `dss.vhd`, a 64 MB fixed VHD with one FAT16 partition (16 heads, 63 sectors),
  Estex DSS 1.71 and the system.zip of the Sprinter Team update 3.06, made by `test/sprinter/mkdss.js` (`test/sprinter/dss/`).
  `hdd/tmntf.zip`: a 16 MB disk with DSS 1.71, FM and TMNT Fighters 1.2 (starts in 2 s; `test/sprinter/tmnt/`).

### Server lists

`trd/trd.json`, `hdd/hdd.json` and `sd/sd.json` make the Server list of the Load window (in this order, each entry as
written); `hdd.json` and `sd.json` also fill Options / Disk. An entry has a `name`, a `tag` (ATM HDD PRO SD ZX OS TSC SPR; CPM, TRD, SPG of older lists read as ATM, ZX, TSC),

A file with no folder (`osz.zip`, `sd=osz.zip`) is in the list's folder; with a folder (`trd/x.zip`) it is from the
site root. An SD card ZIP may have a `.json` next to its image that names its machine and the disks of the ZIP for
the drives: `{ "model": "gmx", "a": "OS.TRD" }`.

## License

The code written for this port is released under the MIT license, see [LICENSE](LICENSE).
The UnrealSpeccy sources and the third-party components keep their own terms, which are listed in the same file.

## Credits

- **UnrealSpeccy** by SMT and its contributors.
- **Xpeccy** by SAM style: the model for the deBUGa debugger.
- **TS-Labs:** ZX Evolution and TS-Conf.
- **Peters Plus** (Ivan Mak and team): Sprinter Sp2000, its BIOS and Estex DSS; **Sprinter Team:** BIOS 3.06 and Estex DSS 1.71 (2009–2025, update of 25.06.2025)
  (2025) with their system software; **Anton Enin:** Flex Navigator, TASM, GFX Viewer; **Vasil Ivanov:** FM (the programs on
  `hdd/dss.zip`); **Andrei I. Holub:** the MAME Sprinter driver.
- **MOA:** the GMX board of Scorpion ZS 256 and the Shadow Service Monitor; **LW / PLM:** the GMX flash of 2022–2025
  (GMX Loader 2.00, Shadow Service Monitor 6.44su).
- **izzx:** [OSZ](https://github.com/izzx-git/OSZ), the multitasking OS of Scorpion GMX.
- **Alone Coder** and the NedoOS team: [NedoOS](https://nedoos.ru).
- **sjasmplus** by Aprisobal, z00m128 and contributors (BSD-3-Clause).
- **RZX** format by Ramsoft; Sinclair ROMs © Amstrad, distributed with its permission.
- **ymfm** by Aaron Giles; **stb_image** by Sean Barrett; the inflate code follows **puff** by Mark Adler.
- Web port: ae485.
