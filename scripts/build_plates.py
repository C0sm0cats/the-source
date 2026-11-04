#!/usr/bin/env python3
"""Render assets/plates.webp (README): the 30 figures moving together, as a seamless animated loop.

The frames come from the real scenes (assets/scenes.mjs) drawn by a headless Chromium through playwright-core.
Requires Node with playwright-core resolvable (e.g. NODE_PATH) and CHROME=/path/to/chromium; Pillow with WebP.
"""
import functools
import http.server
import os
import subprocess
import tempfile
import threading
from pathlib import Path

from PIL import Image

from common import ROOT

FPS, SECONDS, FADE = 15, 6, 1  # the last second fades into the first, so the loop has no seam


def main():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    n, k = FPS * SECONDS, FPS * FADE
    with tempfile.TemporaryDirectory() as folder:
        try:
            subprocess.run(['node', str(ROOT / 'scripts/plates_frames.cjs'), folder, str(server.server_port), str(n + k), str(FPS)], check=True, env=os.environ)
        finally:
            server.shutdown()
        frames = [Image.open(f).convert('RGB') for f in sorted(Path(folder).glob('f*.png'))]
    loop = [Image.blend(frames[n + j], frames[j], j / k) if j < k else frames[j] for j in range(n)]
    out = ROOT / 'assets/plates.webp'
    loop[0].save(out, save_all=True, append_images=loop[1:], duration=round(1000 / FPS), loop=0, quality=60, method=4)
    print('assets/plates.webp', round(out.stat().st_size / 2**20, 1), 'MB')


if __name__ == '__main__':
    main()
