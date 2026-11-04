#!/usr/bin/env python3
"""Check bilingual parity, that generated pages are current, local links, and PDF freshness."""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
data = json.loads((ROOT / 'content/chapters.json').read_text(encoding='utf-8'))
chapters = data['chapters']
ui = data['ui']
assert len({c['id'] for c in chapters}) == len(chapters) >= 14
assert set(ui['fr']) == set(ui['en'])
required = {'title', 'thesis', 'body', 'open', 'echoes'}
for chapter in chapters:
    fr, en = chapter['fr'], chapter['en']
    assert set(fr) == set(en) == required, chapter['id']
    assert [p.startswith('> ') for p in fr['body']] == [p.startswith('> ') for p in en['body']], chapter['id']
    assert len(fr['echoes']) == len(en['echoes']) and all(len(x) == 3 for x in fr['echoes'] + en['echoes']), chapter['id']
    assert bool(fr['open']) == bool(en['open']) and (fr['open'] or not fr['echoes']), chapter['id']  # echoes only under an open question
assert len(ui['fr']['lexicon']) == len(ui['en']['lexicon'])


class Page(HTMLParser):
    def __init__(self, folder):
        super().__init__()
        self.folder, self.ids, self.anchors = folder, set(), set()

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name == 'id':
                self.ids.add(value)
            if tag in ('link', 'script', 'a', 'img') and name in ('href', 'src') and value and tag + name != 'linkcanonical':
                if value.startswith('#'):
                    self.anchors.add(value[1:])
                elif not value.startswith(('http:', 'https:')):
                    target = (self.folder / value.split('?')[0]).resolve()
                    assert target.exists(), f'Missing local link: {value}'


for lang, page in [('fr', ROOT / 'index.html'), ('en', ROOT / 'en/index.html')]:
    html = page.read_text(encoding='utf-8')
    parser = Page(page.parent)
    parser.feed(html)
    assert parser.anchors <= parser.ids, parser.anchors - parser.ids
    assert f'<html lang="{lang}">' in html
    for chapter in chapters:
        assert f'id="{chapter["id"]}"' in html, f'Stale page, run scripts/build_site.py: {page}'
        first = chapter[lang]['body'][0].replace("'", '’').replace(' ?', ' ?').replace(' :', ' :').replace(' ;', ' ;').replace('« ', '« ').replace(' »', ' »').replace('&', '&amp;')
        assert first in html, f'Stale page, run scripts/build_site.py: {page}: {chapter["id"]}'

for lang, filename in [('fr', 'la-source-fr.pdf'), ('en', 'the-source-en.pdf')]:
    pdf = (ROOT / 'books' / filename).read_bytes()
    assert pdf.startswith(b'%PDF-'), filename
    pages = len(re.findall(rb'/Type\s*/Page\b', pdf))
    assert pages >= 4 + 2 * len(chapters) + 4 and pages % 2 == 0, f'Wrong page count: {filename}: {pages}'
    payload = json.dumps([[c[lang] for c in chapters], ui[lang]], ensure_ascii=False, sort_keys=True)
    digest = hashlib.sha256(payload.encode()).hexdigest()
    assert f'content-sha256:{digest}'.encode() in pdf, f'Stale PDF, run scripts/build_books.py: {filename}'
print(f'PASS: {len(chapters)} bilingual chapters, 2 current pages, local links, 2 current PDFs.')
