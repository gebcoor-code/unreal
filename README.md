ZX Spectrum emulator (https://gebcoor-code.github.io/unreal/) based on UnrealSpeccy 0.39.0


## Machines

| Model | Notes |
|---|---|
| Turbo 2+ (7.10) | 1024K, BIOS 1.07.13, CP/M, XT keyboard |
| Turbo 2+ xBIOS 1.36 | vTR-DOS, ROM disk |
| ATM Turbo 1 (4.50) | 512K, BIOS 1.04.1R |
| ZX Evo BaseConf | 4096K, Turbo 2+ compatible; EVO Reset Service, CMOS, SD card, NEMO IDE |
| SAM Coupé | 512K + 1 MB external, ROM 3.0, Z80B 6 MHz: modes 1–4 (up to 512×192, 16 of 128 colors), line interrupts, memory contention; SAA1099, SAMVox, printer port DAC; SAM mouse, SAMBUS clock; two WD1772 floppy drives (MGT, SAD, DSK, also gzip / ZIP packed; SAMDOS boots from disk, autorun); SAMDOS files in File Commander; SAM keyboard (keypad = F0–F9) |
| Sprinter Sp2000 | 4096K, BIOS 3.06 (Sprinter Team; setup, startup sound, ROM disk with RECOVERY): text 80×32, graphics 320×256×256 and 640×256×16, 3.5 / 21 MHz; accelerator (block fills and copies), raster effects; IDE (2 channels), FDD (PC floppies 720K: .img), CMOS; AT keyboard, MS serial mouse, Sega pads; AY, Covox and Covox Blaster (stereo, 16-bit); boots Estex DSS 1.71 from hdd/dss.zip (start menu: FM, Flex Navigator, command prompt); Spectrum mode (C:\ZX\SPECTRUM.EXE, TR-DOS 7.03, TRD and SCL) |
| ZX Evo TS-Conf | 4096K, TS-BIOS; ZX / 16c / 256c / text modes up to 360×288, tiles and sprites (TSU), DMA, VDAC; VDAC2 (FT812); 3.5 / 7 / 14 MHz; SPG; Wild Commander on the SD card |
| ZX Spectrum Next | 2048K (1792K for programs), Z80N at 3.5 / 7 / 14 / 28 MHz: ULA (Timex, ULANext, ULA+), LoRes, Layer 2 (256×192, 320×256, 640×256), 128 sprites (collision, 100 a line), tilemap 40×32 / 80×32, 9-bit palettes, blending, copper (changes in the middle of a line too), zxnDMA, line and CTC interrupts; AY, DACs; DivMMC (esxDOS) and SD card: NextZXOS and SymbOS boot from sd/next.zip; Multiface and DivMMC NMI buttons; NEX and DOT files also start on their own |
| Pentagon 128 / 512 / 1024 | TR-DOS 5.04TM, port #EFF7; RAM in Options / System or ram=; ZX ULAX (see below); DivMMC, Gotek (see below) |
| ZX Spectrum 128 | the Sinclair ROMs (128 / 48) with a Beta 128 (TR-DOS 5.04TM); the ULA timings of the 128K (228 T × 311 lines, PRESET.SPECTRUM_128 in unreal.ini; memory contention of the 128K ULA; the +3 has PRESET.SPECTRUM_PLUS3); DivMMC, Gotek |
| Scorpion ZS 256 | ROM 2.95; DivMMC, Gotek |
| Scorpion ZS 256 GMX | GMX board: 2048K, 640×200 with hardware scroll, turbo, 512K flash of LW/PLM (GMX Loader 2.00, Shadow Service Monitor 6.44), runs OSZ |
| Profi 1024 | BIOS 2.2, CP/M from a .PRO disk |
| KAY 1024 | |
| Spectrum +3 | +3DOS, µPD765; ZX ULAX |
| Quorum 1024 | |
| TaSiS v5.40, iS-DOS Chic v5.01 | xBIOS 1.36XT, boot from an HDD image |
| NedoOS (BaseConf) | boot from an SD card image |
| OSZ (Scorpion GMX) | the multitasking OS of izzx: SD card image (sd/osz.zip) + OS.TRD |
| Custom ROM | a whole ROM of your own, or a 128 / 48 / TR-DOS / Service set, on any of the machines |

## Features

- Media: TRD (640K, and up to 1 MB: 128 cylinders, 256 TR-DOS tracks, as esxDOS takes them), SCL, FDI, UDI, TD0, ISD, PRO, DSK, IPF, Hobeta disks; raw PC floppies (IMG 720K / 360K, Sprinter); SAM Coupé MGT and SAD; TAP, TZX, CSW tapes; SNA, Z80 snapshots; SPG programs (TS-Conf); NEX and DOT programs (Spectrum Next); RZX input recordings; HDD images (ATM, NEMO, SMUC, Profi, DivIDE interfaces) and SD cards (Z-Controller, DivMMC); USB stick images (Gotek); DUX colorizations (ZX ULAX). Everything can also be loaded from a ZIP.
- Sound: AY/YM, TurboSound, SAA1099, General Sound, Soundrive / Covox, beeper, tape sound; ZXBUS sound cards ZX-MultiSound (OPL3) and ZXM-MoonSound (OPL4) through ymfm. A sound indicator over the screen: channel levels (AY, General Sound, the Sprinter's Covox L / R), spectrum, oscilloscope, spectrogram, goniometer.
- ZX ULAX: the colorization board of its authors on Pentagon 128 and Spectrum +3: a .dux (the colors of one program) is applied to the program in memory; a snapshot or RZX with its .dux (one ZIP, or snap= and dux= in a link) starts colored at once, a tape or disk with its .dux is switched on by hand once the program has loaded. ULAX at the top of the screen while a dux is loaded: white on, gray off, a click / tap or Ctrl+Alt+U switches it. A snapshot saved with a dux is a ZIP with the .sna, its .dux and the board's state (.ulx); an RZX seek keeps the colors of the frame. Not yet: the full-screen mappers and LowRes of the board.
- DivMMC and Gotek on Pentagon, ZX Spectrum 128 and Scorpion ZS 256 (Options / Disk):
    - DivMMC with esxDOS (rom/esxmmc.zip: ESXMMC.BIN of esxDOS 0.8.9) and a card of its own (MMC) next to the Z-Controller's: two cards at once. esxDOS boots from the card (sd/esxdos.zip: its SYS and BIN; mmc= in a link): dot commands, its TR-DOS (.vdisk), its NMI menu (Ctrl+F11). While it is on, #3Dxx is esxDOS's: a TR-DOS disk asks to switch it off;
    - Gotek with FlashFloppy 3.42 in drive A: or B: (gotek=b:stick.img): its USB stick is an image (FAT16 / FAT32), a Gotek with no display: the slots are the images of its root (no folders), sorted as 3.42 or 3.44m1 do it, IMAGE_A.CFG keeps the one chosen; Direct Access (cylinders 254–255, while an image is mounted) for drivers that read and write the stick through the drive; leaving it mounts the slot selected; a bad image stops it until a button (◀ ● ▶);
    - SD card timing for both cards: Ideal, Realistic (random, sdseed= repeats it), Slow (the worst case of the specification).
- Two debuggers: the UnrealSpeccy debugger (ported without changing its logic, its modal loops run under Asyncify) and deBUGa, modelled on the Xpeccy debugger; both know the Z80N commands of the Next. deBUGa also shows the devices of every machine (memory and video ports, µPD765, sound cards, IDE, SD, DivMMC, Gotek, CMOS), steps the General Sound Z80 (CPU: GS), and for ZX ULAX: the PPU opcode of each instruction in the listing, a ULAX tab (opcodes and pixels of the Z80 addresses, palette, tables, the dux text; editable), PPU step and a stop at a PPU opcode.
- File Commander: two panels over TR-DOS, CP/M, iS-DOS and FAT disks (FAT12 PC floppies too), HDD and SD images (the MMC card and the Gotek's USB stick too), a RAM disk and the browser storage, with folders:
    - copy and move files and whole folders (onto TR-DOS / CP/M their files go into one place); the free space is checked first, the files that do not fit are named;
    - a ZIP is a folder: Enter opens it, its files are copied out (that unpacks it) and in, MkDir and Delete work in it, the new archive replaces the old file; Upload puts a ZIP in as it is;
    - Enter mounts images from any panel (a ZIP too): disks into A: / B: (or Mount and Run), hard disk and SD card images into HDD 0 / HDD 1 / the SD card, with their .chs from the same folder, without a reset;
    - delete, view and edit files, exchange files with the computer; New Disk: TR-DOS (640K or 1 MB), CP/M, iS-DOS, Profi CP/M, PC floppy, HDD (CP/M, iS-DOS, FAT as a VHD) and SD card images;
    - Zero Free Space makes a FAT image pack smaller (FC's own Delete zeroes it already); Sprinter Boot puts the DSS boot loader on a FAT hard disk (as SYS C:), so a new disk with the DSS files boots. Compile (F9) assembles a project with sjasmplus built to WebAssembly; the output, listing and log go to the RAM disk.
- Graf Search: memory shown as a picture in ZX, ATM and TS-Conf graphics modes.
- RZX: playback with a seek bar over the screen and Take control (ZX Spectrum 48 / 128 / +2 on the Sinclair ROMs), with its ZX ULAX .dux too; recording from Save on 48 / 128K models.
- On-screen keyboards: ZX+, ZX48, XT (short, the arrows in the main block) and XTf (the full PC keyboard without the number pad); joystick, touch mouse, Kempston mouse. A phone in landscape: the keyboard is split to both sides of the screen.
- Screen: F6 saves a screenshot (PNG as shown, or the ZX screen as SCR); MMC / GOTEK over the screen (gray) while the DivMMC / the Gotek is on, a click switches it off; Hide Menu Bar (the top-left corner brings it back), Mix Frames for GMX gigascreen pictures, landscape layout for phones.
- Load: the server lists, a local server folder, files of this computer and the browser storage (files kept as they were opened, a ZIP as a ZIP: Mount / Run asks which image).
- REST API: a link can choose the machine and its speed, insert disks, tapes, HDD, SD, MMC and USB stick images, and start a program; Tools / REST API link builds one (a file from the server list brings its own run link into the fields).
- Offline copy through a service worker (https or localhost).

## Hard disks and SD cards

- Images: a raw image (.hdd, .img, .hdf) with its geometry in a .chs file next to it in the ZIP (CHS=C/H/S Interface=...), or a fixed VHD that has the geometry in its footer (no .chs needed). A dynamic VHD is not read: convert it to a fixed one.
- TR-DOS files outside TR-DOS (any other disk: CP/M, iS-DOS, FAT, Browser, RAM, ZIP, the PC): plain files, copied byte for byte under their own names. Copy / Download show two check boxes when one side is a TR-DOS disk: *as Hobeta* (TR-DOS -> other writes Hobeta `NAME.$t`, CP/M `NAME.<TYPE>TR`; Hobeta files are always restored to TR-DOS) and *Ext in start* (on: the 3-letter extension lives in the start field, `guide_ru.txt` is type `t`, start `xt`; capital type letters give `NAME.<type>`; off: the extension is the type letter only, `CURT.COM` -> `CURT.C`).
- File systems: File Commander reads and writes FAT12, FAT16 and FAT32, on a whole image (superfloppy) or in MBR partitions, for HDD and SD images alike.
- New Disk (File Commander): HDD FAT and SD card as FAT16 or FAT32 (Auto: FAT16 up to 256 MB, FAT32 above; FAT32 needs at least 35 MB), both made as a fixed VHD (no .chs). The SD images of NedoOS, Wild Commander and OSZ are made as FAT32 VHD.
- Save: an SD, MMC or USB (Gotek) card image goes out as a fixed VHD (it can be mounted on a PC) or a raw IMG, by default as the card was put in (the last choice is kept); an HDD that is a VHD goes out alone, a raw one with its .chs.
- Sprinter: a 64 MB fixed VHD with one FAT16 partition (16 heads, 63 sectors), Estex DSS 1.71 and the system.zip of the Sprinter Team update 3.06. a 16 MB disk with DSS 1.71, FM and TMNT Fighters 1.2. A disk of your own: File Commander / New Disk / HDD FAT, copy the DSS files onto it, then Files / Sprinter Boot.

## ZX Spectrum Next

-- Terms: the distribution is under the Next License (LICENSE.md in it): no sale, no duplication fee; a copy without the source code must have a link to it. The full distribution: https://www.specnext.com/latestdistro/ , sources: https://gitlab.com/thesmog358/tbblue

## License

The code written for this port is released under the MIT license, see LICENSE. The UnrealSpeccy sources and the third-party components keep their own terms, which are listed in the same file.

## Credits

- UnrealSpeccy by SMT and its contributors.
- Xpeccy by SAM style: the model for the deBUGa debugger.
- TS-Labs: ZX Evolution and TS-Conf.
- Peters Plus (Ivan Mak and team): Sprinter Sp2000, its BIOS and Estex DSS; Sprinter Team: BIOS 3.06, Estex DSS 1.71 and their system software (2009–2025, update of 25.06.2025); Anton Enin: Flex Navigator, TASM, GFX Viewer; Vasil Ivanov: FM (the programs on hdd/dss.zip); Andrei I. Holub: the MAME Sprinter driver.
- MOA: the GMX board of Scorpion ZS 256 and the Shadow Service Monitor; LW / PLM: the GMX flash of 2022–2025 (GMX Loader 2.00, Shadow Service Monitor 6.44su).
- SpecNext Ltd: ZX Spectrum Next and the System/Next distribution; Garry Lancaster: NextZXOS; Andrei I. Holub: the MAME Spectrum Next driver.
- The authors of ZX ULAX: the board, its documentation, the dux format, the emuL emulator and the game pack of dux colorizations.
- Mario Prato: the DivMMC; Papaya Dezign (lordcoxis, UB880D and contributors): esxDOS.
- Keir Fraser: FlashFloppy (Direct Access); Jean-François Del Nero: the HxC Floppy Emulator's Direct Access; the SD card timing profiles of Unreal-NG (alfishe).
- izzx: OSZ, the multitasking OS of Scorpion GMX.
- Alone Coder and the NedoOS team: NedoOS.
- sjasmplus by Aprisobal, z00m128 and contributors (BSD-3-Clause).
- RZX format by Ramsoft; Sinclair ROMs © Amstrad, distributed with its permission.
- ymfm by Aaron Giles; stb_image by Sean Barrett; the inflate code follows puff by Mark Adler.
