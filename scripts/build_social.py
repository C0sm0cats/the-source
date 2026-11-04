#!/usr/bin/env python3
"""Render assets/social.jpg (link previews). Requires Poppler and Node. The README images: build_hero.py, build_plates.py."""
import subprocess
import tempfile
from pathlib import Path

from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from common import ROOT, load, typo
from figures import draw, labels_for, record

W, H = 1200, 630
for name, file in [('Thin', 'ExtraLight'), ('LightI', 'LightItalic')]:
    pdfmetrics.registerFont(TTFont(name, str(ROOT / f'scripts/fonts/Spectral-{file}.ttf')))
night, ink, mark = colors.HexColor('#0b0c12'), colors.HexColor('#ece8dd'), colors.HexColor('#ff5a3a')
data = load()
ui = data['ui']
figures = record(labels_for(ui['fr'], 'fr'))

with tempfile.TemporaryDirectory() as folder:
    pdf = Path(folder) / 'social.pdf'
    c = canvas.Canvas(str(pdf), pagesize=(W, H), invariant=1)
    c.setFillColor(night)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    size = 880
    draw(c, figures['useful'], 905 - size / 2, H / 2 + size / 2, size, ink, mark, 'LightI', labels=False)
    c.setFillColor(ink)
    c.setFont('LightI', 25)
    c.drawString(66, H - 118, 'La Source')
    c.setFont('Thin', 57)
    for i, line in enumerate(['Et si exister', 'était la façon', 'dont le tout', 'se découvre ?']):
        c.drawString(64, H - 212 - i * 63, typo(line, 'fr'))
    c.setFont('LightI', 20)
    c.drawString(66, H - 480, 'What if existing is how')
    c.drawString(66, H - 506, 'everything discovers itself?')
    c.save()
    for name, width in [('social', 1200)]:
        subprocess.run(['pdftoppm', '-scale-to-x', str(width), '-scale-to-y', str(width * H // W), '-singlefile', '-jpeg', '-jpegopt', 'quality=86', str(pdf), str(ROOT / 'assets' / name)], check=True)
print('assets/social.jpg')
