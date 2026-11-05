#!/usr/bin/env python3
"""Render assets/strip.webp (README): one figure per part, large on the night with its thesis, fading into the next.

The frames come from the real scenes (assets/scenes.mjs) drawn by a headless Chromium through playwright.
Requires `npm i --no-save playwright` (local only) and optionally CHROME=/path/to/chromium. Pillow with WebP.
"""
import functools
import http.server
import os
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

from PIL import Image

from common import ROOT

CHAPTERS = sys.argv[1:] or ['fractales', 'reve', 'joie', 'retour', 'pourquoi']
FPS, SECONDS, FADE = 12, 4, 1  # each figure holds four seconds; the last second fades into the next, the last into the first


def main():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    with tempfile.TemporaryDirectory() as folder:
        try:
            subprocess.run(['node', str(ROOT / 'scripts/strip_frames.cjs'), folder, str(server.server_port), str(FPS * SECONDS), str(FPS), str(FPS * FADE), *CHAPTERS],
                           check=True, env=os.environ)
        finally:
            server.shutdown()
        frames = [Image.open(f).convert('RGB').resize((1200, 480), Image.LANCZOS) for f in sorted(Path(folder).glob('f*.png'))]
    out = ROOT / 'assets/strip.webp'
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=round(1000 / FPS), loop=0, quality=72, method=5)
    print('assets/strip.webp', round(out.stat().st_size / 2**20, 1), 'MB')


if __name__ == '__main__':
    main()
