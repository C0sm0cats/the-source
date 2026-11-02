"""Shared loading and French/English typography."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NBSP = ' '


def load():
    return json.loads((ROOT / 'content/chapters.json').read_text(encoding='utf-8'))


def typo(text, lang):
    text = text.replace("'", '’')
    if lang == 'fr':
        text = re.sub(r' ([?!;:»])', NBSP + r'\1', text)
        text = text.replace('« ', '«' + NBSP)
    return text
