#!/usr/bin/env python3
"""Run the bundled core's interrupt regression under Node, without a browser.

Use --archive /path/to/original/unreal.zip to reproduce the upstream failure.
Only Python's standard library and Node are required; no downloads or npm.
"""

import argparse
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile


ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, default=ROOT / "unreal/unreal.zip")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix=".baseconf-test-", dir=ROOT) as tmp:
        dest = Path(tmp)
        for archive, members in (
            (args.archive, ("unreal.wasm",)),
            (ROOT / "js/js.zip", ("wasi_fs.js", "asyncify.js")),
            (ROOT / "rom/zxevo_fe.zip", ("zxevo_fe.rom",)),
            (ROOT / "rom/bios_1_07_13.zip", ("bios_1_07_13.rom",)),
        ):
            with zipfile.ZipFile(archive) as source:
                for member in members:
                    (dest / member).write_bytes(source.read(member))
        for name in ("unreal.ini", "CMOS"):
            shutil.copyfile(ROOT / "unreal" / name, dest / name)
        result = subprocess.run(["node", ROOT / "tests/baseconf_interrupts.cjs", dest])
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
