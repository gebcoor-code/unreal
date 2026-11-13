#!/usr/bin/env python3
"""Reproduce the three-byte BaseConf interrupt fix in the distributed WASM.

The repository contains the compiled core, not its C++ sources. Refuse any
other input build: these offsets and instruction contexts are build-specific.
See docs/baseconf-interrupts.md for the corresponding source-level correction.
"""

import argparse
import hashlib
import io
from pathlib import Path
import zipfile


ORIGINAL = "8754e9f268b53063ca3c75936b61a80664732ca8c7a115ce87260a7a9c9245ae"
FIXED = "3cfdd042c7e015557e27bd6d40a262f1fd9d8480f35cd3c3b6f973c077b84554"
# (context offset, immediate offset within context, original instructions)
SITES = (
    (0x96242, 6, "20 00 41 05 6b 41 01 4d 04 40 41 d7 d1 db 00 2d 00 00 41 20 71 45"),
    (0x987BA, 6, "20 00 41 05 6b 41 01 4d 04 40 41 d7 d1 db 00 2d 00 00 41 20 71 45"),
    (0x9E6B4, 4, "41 05 6b 41 01 4b 0d 01 41 d7 d1 db 00 2d 00 00 41 20 71 0d 01"),
)


def patch(data):
    digest = hashlib.sha256(data).hexdigest()
    if digest == FIXED:
        return data
    if digest != ORIGINAL:
        raise ValueError(f"Unsupported WASM SHA-256: {digest}; refusing to patch")
    result = bytearray(data)
    for start, immediate, context in SITES:
        expected = bytes.fromhex(context)
        if data[start:start + len(expected)] != expected:
            raise ValueError(f"Unexpected instructions at 0x{start:x}")
        # unsigned(model - ATM710) <= 1 -> <= 0 (and > 1 -> > 0).
        # ATM710 == 5, ATM3/BaseConf == 6. Keep the gate only on ATM710.
        result[start + immediate] = 0
    result = bytes(result)
    if hashlib.sha256(result).hexdigest() != FIXED:
        raise ValueError("Unexpected patched WASM hash")
    return result


def patch_archive(path):
    output = io.BytesIO()
    with zipfile.ZipFile(path) as source:
        if source.namelist().count("unreal.wasm") != 1:
            raise ValueError("Expected exactly one unreal.wasm in the archive")
        before = source.read("unreal.wasm")
        after = patch(before)
        if before == after:
            return False
        with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED,
                             compresslevel=9) as target:
            target.comment = source.comment
            for info in source.infolist():
                target.writestr(info, after if info.filename == "unreal.wasm"
                                else source.read(info), compresslevel=9)
    path.write_bytes(output.getvalue())
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", nargs="?", type=Path,
                        default=Path(__file__).resolve().parents[1] / "unreal/unreal.zip")
    args = parser.parse_args()
    try:
        changed = patch_archive(args.archive)
    except (ValueError, OSError, zipfile.BadZipFile) as error:
        parser.exit(1, f"{error}\n")
    print(f"{'Patched' if changed else 'Already fixed'}: {args.archive}")
    print(f"unreal.wasm SHA-256: {FIXED}")


if __name__ == "__main__":
    main()
