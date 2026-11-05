#!/usr/bin/env python3
"""Render assets/social.jpg (link previews): the Source on the night, with the opening question.
Requires `npm i --no-save playwright` (local only) and Pillow. The README images: build_hero.py, build_strip.py."""
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from common import ROOT, load, typo
from figures import labels_for, render

W, H = 1200, 630
ui = load()['ui']
with tempfile.TemporaryDirectory() as folder:
    fig = Path(folder) / 'source.jpg'
    render([dict(scene='source', tone='night', size=760, file=fig, labels=labels_for(ui['fr'], 'fr'))])
    image = Image.new('RGB', (W, H), '#07080c')
    image.paste(Image.open(fig).crop((0, 65, 760, 695)), (W - 760 + 40, 0))
thin = ImageFont.truetype(str(ROOT / 'scripts/fonts/Spectral-ExtraLight.ttf'), 57)
italic = ImageFont.truetype(str(ROOT / 'scripts/fonts/Spectral-LightItalic.ttf'), 25)
small = ImageFont.truetype(str(ROOT / 'scripts/fonts/Spectral-LightItalic.ttf'), 21)
d = ImageDraw.Draw(image)
d.text((66, 92), 'La Source', font=italic, fill='#ece8dd')
for i, line in enumerate(['Et si exister', 'était la façon', 'dont le tout', 'se découvre ?']):
    d.text((64, 160 + i * 66), typo(line, 'fr'), font=thin, fill='#ece8dd')
d.text((66, 470), 'What if existing is how', font=small, fill='#b9b4aa')
d.text((66, 498), 'everything discovers itself?', font=small, fill='#b9b4aa')
image.save(ROOT / 'assets/social.jpg', quality=88)
print('assets/social.jpg')
