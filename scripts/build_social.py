#!/usr/bin/env python3
"""Render assets/hero.png and assets/plates.jpg (README) and assets/social.png (link previews). Requires Poppler and Node."""
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
    for name, width in [('hero', 2400), ('social', 1200)]:
        subprocess.run(['pdftoppm', '-scale-to-x', str(width), '-scale-to-y', str(width * H // W), '-singlefile', '-png', str(pdf), str(ROOT / 'assets' / name)], check=True)
print('assets/hero.png, assets/social.png')

TONES = {'paper': ('#eeece5', '#17171b', '#e03c1f'), 'dusk': ('#3c4256', '#f0ede4', '#ff6b4d'),
         'night': ('#0b0c12', '#ece8dd', '#ff5a3a'), 'blank': ('#ffffff', '#111114', '#e03c1f')}
CELL, COLS, PAD = 340, 7, 26
chapters = data['chapters']
rows = (len(chapters) + COLS - 1) // COLS
PW, PH = CELL * COLS, (CELL + 64) * rows
with tempfile.TemporaryDirectory() as folder:
    pdf = Path(folder) / 'plates.pdf'
    c = canvas.Canvas(str(pdf), pagesize=(PW, PH), invariant=1)
    for i, ch in enumerate(chapters):
        bg, fg, mk = (colors.HexColor(v) for v in TONES[ch['tone']])
        x, top = (i % COLS) * CELL, PH - (i // COLS) * (CELL + 64)
        c.setFillColor(bg)
        c.rect(x, top - CELL - 64, CELL, CELL + 64, stroke=0, fill=1)
        draw(c, figures[ch['figure']], x + PAD, top - PAD, CELL - 2 * PAD, fg, mk, 'LightI', labels=False)
        c.setFillColor(fg)
        c.setFont('LightI', 15)
        c.drawString(x + PAD, top - CELL - 30, f"{i + 1:02d}  " + typo(ch['fr']['title'], 'fr'))
    c.save()
    subprocess.run(['pdftoppm', '-scale-to-x', '2380', '-scale-to-y', str(2380 * PH // PW), '-singlefile', '-jpeg', '-jpegopt', 'quality=86', str(pdf), str(ROOT / 'assets/plates')], check=True)
print('assets/plates.jpg')
