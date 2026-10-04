#!/usr/bin/env python3
"""Screenshot a page of this project in headless Chrome.

Usage: python3 tests/shot.py [page] [query] [ms] [WxH]
  e.g. python3 tests/shot.py index.html "?step=3" 1500 1280x800
`ms` is virtual time to let pass before the shot (animations included).
Prints the PNG path (saved under tests/screenshots/, which git ignores).
"""
import os
import re
import subprocess
import sys

CHROME = os.environ.get("CHROME", "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def wslpath(flag, path):
    return subprocess.run(["wslpath", flag, path], capture_output=True, text=True, check=True).stdout.strip()


def main():
    page = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    query = sys.argv[2] if len(sys.argv) > 2 else ""
    ms = sys.argv[3] if len(sys.argv) > 3 else "1500"
    size = sys.argv[4] if len(sys.argv) > 4 else "1280x800"
    out_dir = os.path.join(ROOT, "tests", "screenshots")
    os.makedirs(out_dir, exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "-", f"{page}{query}-{ms}ms-{size}".lower()).strip("-")
    out = os.path.join(out_dir, slug + ".png")
    if os.path.exists(out):
        os.remove(out)
    url = "file:///" + wslpath("-m", os.path.join(ROOT, page)) + query
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         f"--window-size={size.replace('x', ',')}", f"--virtual-time-budget={ms}",
         f"--screenshot={wslpath('-w', out)}", url],
        capture_output=True, timeout=120,
    )
    if not os.path.exists(out):
        print("Screenshot failed:", out)
        return 1
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
