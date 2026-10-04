#!/usr/bin/env python3
"""Run tests/test.html in headless Chrome and print the results.

Usage: python3 tests/run.py      (exit code 0 = all passed)
Uses Windows Chrome through WSL; override with CHROME=/path/to/chrome.
"""
import html
import os
import re
import subprocess
import sys

CHROME = os.environ.get("CHROME", "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe")
HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    page = subprocess.run(["wslpath", "-m", os.path.join(HERE, "test.html")],
                          capture_output=True, text=True, check=True).stdout.strip()
    result = subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--virtual-time-budget=8000",
         "--dump-dom", "file:///" + page],
        capture_output=True, timeout=180,
    )
    dom = result.stdout.decode("utf-8", errors="replace")
    match = re.search(r'<pre id="results">(.*?)</pre>', dom, re.S)
    if not match:
        print("Could not find test results in the page output.")
        return 2
    text = html.unescape(match.group(1))
    print(text)
    return 0 if re.search(r"^ALL \d+ PASSED$", text, re.M) else 1


if __name__ == "__main__":
    sys.exit(main())
