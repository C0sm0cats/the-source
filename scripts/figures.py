"""Draw the figures recorded from assets/scenes.mjs on a ReportLab canvas."""
import json
import subprocess
import tempfile
from pathlib import Path

from reportlab.lib import colors

from common import ROOT, typo

LABELS = ['you', 'past', 'future', 'large', 'small', 'everything', 'nothing', 'knowing', 'living']


def labels_for(ui, lang):
    return {key: typo(ui[key], lang) for key in LABELS}


def record(labels):
    with tempfile.TemporaryDirectory() as folder:
        source, out = Path(folder) / 'labels.json', Path(folder) / 'figures.json'
        source.write_text(json.dumps(labels), encoding='utf-8')
        subprocess.run(['node', str(ROOT / 'scripts/export_figures.mjs'), str(source), str(out)], check=True)
        return json.loads(out.read_text(encoding='utf-8'))


def draw(canvas, ops, x, top, size, ink, mark, font, labels=True):
    """Draw recorded operations in a square whose top-left corner is (x, top), y up, clipped to it."""
    k = size / 600
    px = lambda v: x + v * k
    py = lambda v: top - v * k

    def colour(name):
        if name == 'ink':
            return ink
        if name == 'mark':
            return mark
        return colors.linearlyInterpolatedColor(mark, ink, 0, 1, float(name[4:]))

    canvas.saveState()
    clip = canvas.beginPath()
    clip.rect(x, top - size, size, size)
    canvas.clipPath(clip, stroke=0, fill=0)
    canvas.setLineCap(1)
    canvas.setLineJoin(1)
    for op in ops:
        if op['k'] == 't':
            if labels:
                canvas.setFillColor(ink)
                canvas.setFillAlpha(1)
                canvas.setFont(font, max(7.5, op['s'] * k))
                write = {'left': canvas.drawString, 'right': canvas.drawRightString, 'center': canvas.drawCentredString}[op['al']]
                write(px(op['x']), py(op['y']), op['t'])
            continue
        path = canvas.beginPath()
        for item in op['d']:
            if item[0] == 'M':
                path.moveTo(px(item[1]), py(item[2]))
            elif item[0] == 'L':
                path.lineTo(px(item[1]), py(item[2]))
            elif item[0] == 'C':
                path.circle(px(item[1]), py(item[2]), item[3] * k)
            else:
                path.close()
        if op['k'] == 'f':
            canvas.setFillColor(colour(op['c']))
            canvas.setFillAlpha(op['a'])
            canvas.drawPath(path, stroke=0, fill=1)
        else:
            canvas.setStrokeColor(colour(op['c']))
            canvas.setStrokeAlpha(op['a'])
            canvas.setLineWidth(op['w'] * k)
            canvas.drawPath(path, stroke=1, fill=0)
    canvas.restoreState()
