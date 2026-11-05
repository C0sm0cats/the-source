"""Render the figures of assets/scenes/*.mjs as images, exactly as the site draws them, through a headless Chromium.

Used by the books (each figure on its chapter's night) and for the site's images when JavaScript is off.
Requires `npm install` (playwright) and optionally CHROME=/path/to/chromium.
"""
import json
import subprocess
import tempfile
from pathlib import Path

from common import ROOT, typo

LABELS = ['you', 'past', 'future', 'large', 'small', 'everything', 'nothing', 'knowing', 'living']
# The four nights of assets/style.css: background, ink, mark.
TONES = {
    'paper': ('#0f0b10', '#ede6dc', '#ff5a3a'),
    'dusk': ('#090d1c', '#e6e9f3', '#ff6b4d'),
    'night': ('#07080c', '#ece8dd', '#ff5a3a'),
    'blank': ('#030305', '#f2efe8', '#ff5a3a'),
}


def labels_for(ui, lang):
    return {key: typo(ui[key], lang) for key in LABELS}


def render(jobs):
    """jobs: [{scene, labels, tone, size, file, later?, t?}] → writes each JPEG."""
    for job in jobs:
        job['bg'] = TONES[job.pop('tone')][0]
        job['file'] = str(job['file'])
        job.setdefault('later', False)
        job.setdefault('t', None)
    with tempfile.TemporaryDirectory() as folder:
        source = Path(folder) / 'jobs.json'
        source.write_text(json.dumps(jobs), encoding='utf-8')
        subprocess.run(['node', str(ROOT / 'scripts/render_figures.cjs'), str(source)], check=True)
