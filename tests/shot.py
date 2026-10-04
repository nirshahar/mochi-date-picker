#!/usr/bin/env python3
"""Screenshot a page of this project in headless Chrome.

Usage: python3 tests/shot.py [page] [query] [ms] [WxH] [--live] [--act=...]
  e.g. python3 tests/shot.py index.html "?step=3" 1500 1280x800
       python3 tests/shot.py index.html "?demo" 2600 1280x800 --live
       python3 tests/shot.py index.html "" 1500 1280x800 --act=hover:no@800   (implies --live)
--act scripts input into the page; see tests/frame.html for the syntax.

Default mode lets `ms` of *virtual* time pass: fast, good for static layouts, but Web Animations
don't advance under virtual time. --live serves the project over HTTP and holds the page's load
event for `ms` *real* milliseconds, so animations run exactly as in a browser.
Prints the PNG path (saved under tests/screenshots/, which git ignores).
"""
import http.server
import os
import re
import socketserver
import subprocess
import sys
import threading
import time
import urllib.parse

CHROME = os.environ.get("CHROME", "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIN_WINDOW_WIDTH = 500  # headless Chrome won't make a window narrower than this


def wslpath(flag, path):
    return subprocess.run(["wslpath", flag, path], capture_output=True, text=True, check=True).stdout.strip()


class Handler(http.server.SimpleHTTPRequestHandler):
    """Static files from the project root, plus /__sleep?ms=N which answers after N ms."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path.startswith("/__sleep"):
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            time.sleep(int(query.get("ms", ["0"])[0]) / 1000)
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()


def start_server():
    server = socketserver.ThreadingTCPServer(("127.0.0.1", 0), Handler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    time.sleep(2)  # WSL needs a moment before it forwards a new port to Windows Chrome
    return server


def main():
    act = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--act=")), "")
    args = [a for a in sys.argv[1:] if a != "--live" and not a.startswith("--act=")]
    live = "--live" in sys.argv[1:] or bool(act)
    page = args[0] if len(args) > 0 else "index.html"
    query = args[1] if len(args) > 1 else ""
    ms = args[2] if len(args) > 2 else "1500"
    size = args[3] if len(args) > 3 else "1280x800"
    out_dir = os.path.join(ROOT, "tests", "screenshots")
    os.makedirs(out_dir, exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "-", f"{page}{query}-{act}-{ms}ms-{size}{'-live' if live else ''}".lower()).strip("-")
    out = os.path.join(out_dir, slug + ".png")
    if os.path.exists(out):
        os.remove(out)

    width, height = (int(n) for n in size.split("x"))
    flags = []
    server = None
    if live:
        server = start_server()
        base = f"http://127.0.0.1:{server.server_address[1]}"
        src = urllib.parse.quote(f"/{page}{query}", safe="")
        url = f"{base}/tests/frame.html?w={width}&h={height}&hold={ms}&src={src}&act={urllib.parse.quote(act)}"
    else:
        url = "file:///" + wslpath("-m", os.path.join(ROOT, page)) + query
        flags.append(f"--virtual-time-budget={ms}")
        if width < MIN_WINDOW_WIDTH:  # render phone widths inside an exactly-sized iframe
            frame = "file:///" + wslpath("-m", os.path.join(ROOT, "tests", "frame.html"))
            url = f"{frame}?w={width}&h={height}&src={urllib.parse.quote(url, safe='')}"
    window_width = max(width, MIN_WINDOW_WIDTH)

    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         f"--window-size={window_width},{height}", *flags,
         f"--screenshot={wslpath('-w', out)}", url],
        capture_output=True, timeout=120,
    )
    if server:
        server.shutdown()
    if not os.path.exists(out):
        print("Screenshot failed:", out)
        return 1
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
