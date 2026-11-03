#!/usr/bin/env python3
"""Generate index.html (French) and en/index.html (English) from content/chapters.json."""
import json
import re
from html import escape

from common import ROOT, load, typo
from figures import LABELS

BASE_URL = 'https://c0sm0cats.github.io/the-source/'
FONTS = ['ExtraLight', 'ExtraLightItalic', 'Light', 'LightItalic', 'Regular', 'Italic']


def e(text, lang):
    return escape(typo(text, lang), quote=False)


def block(item, lang):
    if item.startswith('> '):
        return f'<blockquote>{e(item[2:], lang)}</blockquote>'
    return f'<p>{e(item, lang)}</p>'


def echoes(t, ui, lang):
    items = []
    for who, work, text in t['echoes']:
        work = re.sub(r'\*(.+?)\*', r'<cite>\1</cite>', e(work, lang))
        items.append(f'<li><b>{e(who, lang)}</b>, {work}. {e(text, lang)}</li>')
    return f'<aside class="echoes"><p>{ui["echoes"]}</p><ul>{"".join(items)}</ul></aside>'


def limit_control(ui):
    return f'''<div class="limit" data-limit data-lives="{ui['lifeCount']}" data-infinity="{ui['infinity']}" hidden>
        <label for="limit-range">{ui['limitLabel']}</label>
        <output id="limit-value" for="limit-range">25 {ui['lifeCount']}</output>
        <input id="limit-range" type="range" min="0" max="5" step="1" value="0">
      </div>'''


def live(name, label, ui, lang):
    labels = escape(json.dumps({key: typo(ui[key], lang) for key in LABELS}, ensure_ascii=False))
    return f'<canvas data-scene="{name}" data-labels="{labels}" role="img" aria-label="{escape(label)}" hidden></canvas>'


def chapter(ch, i, lang, ui):
    t = ch[lang]
    title = typo(t['title'], lang)
    prefix = '' if lang == 'fr' else '../'
    image = f'<noscript><img src="{prefix}assets/figures/{lang}-{ch["id"]}.jpg" alt="{escape(title)}" loading="lazy"></noscript>'
    figure = live(ch['figure'], title, ui, lang) + image
    extra = limit_control(ui) if ch['figure'] == 'lives' else ''
    wide = ' fig-wide' if ch['figure'] == 'fractal' else ''
    side = 'even' if i % 2 else 'odd'
    body = '\n        '.join(block(item, lang) for item in t['body'])
    part = ui['parts'][ch['part']]
    return f'''
  <section class="chapter {side}{wide}" id="{ch['id']}" data-tone="{ch['tone']}" aria-labelledby="ask-{ch['id']}">
    <header class="chapter-head">
      <p class="count">{i + 1:02d}<span> · {e(part, lang)} · {e(t['title'], lang)}</span></p>
      <h2 class="ask" id="ask-{ch['id']}">{e(t['thesis'], lang)}</h2>
    </header>
    <figure class="fig">{figure}{extra}</figure>
    <div class="text">
        {body}
      <p class="caveat"><span>{ui['unknown']}</span> {e(t['open'], lang)}</p>
      {echoes(t, ui, lang)}
    </div>
  </section>'''


def page(data, lang):
    ui = data['ui'][lang]
    chapters = data['chapters']
    prefix = '' if lang == 'fr' else '../'
    other_href = 'en/' if lang == 'fr' else '../'
    other_lang = 'en' if lang == 'fr' else 'fr'
    first = chapters[0]['id']
    thread = '\n'.join(
        f'<li><a href="#{c["id"]}"><span>{i + 1:02d}</span>{e(c[lang]["title"], lang)}</a></li>'
        for i, c in enumerate(chapters)
    )
    body = ''.join(chapter(c, i, lang, ui) for i, c in enumerate(chapters))
    firsts = {}
    for i, c in enumerate(chapters):
        firsts.setdefault(c['part'], []).append((i, c))
    parts = ''.join(
        f'<li><a href="#{items[0][1]["id"]}"><span>{key}</span>{e(ui["parts"][key], lang)}'
        f'<small>{items[0][0] + 1:02d}{"–" + format(items[-1][0] + 1, "02d") if len(items) > 1 else ""}</small></a></li>'
        for key, items in firsts.items()
    )
    terms = ''.join(f'<div><dt>{e(term, lang)}</dt><dd>{e(meaning, lang)}</dd></div>' for term, meaning in ui['lexicon'])
    opens = ''.join(f'<li>{e(q, lang)}</li>' for q in ui['open'])
    canonical = BASE_URL if lang == 'fr' else BASE_URL + 'en/'
    description = escape(typo(ui['description'], lang))
    opening = typo(ui['opening'], lang)
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{ui['name']} · {e(ui['subtitle'], lang)}</title>
<meta name="description" content="{description}">
<meta name="theme-color" content="#eeece5">
<link rel="canonical" href="{canonical}">
<link rel="alternate" hreflang="fr" href="{BASE_URL}">
<link rel="alternate" hreflang="en" href="{BASE_URL}en/">
<meta property="og:title" content="{ui['name']}">
<meta property="og:description" content="{description}">
<meta property="og:type" content="website">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{BASE_URL}assets/social.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="{prefix}assets/favicon.svg">
<link rel="preload" href="{prefix}assets/fonts/Spectral-Light.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{prefix}assets/style.css">
<script type="module" src="{prefix}assets/app.mjs"></script>
</head>
<body data-tone="paper">
<a class="skip" href="#{first}">{ui['skip']}</a>
<header class="bar">
  <a class="wordmark" href="#top">{ui['name']}</a>
  <nav aria-label="{ui['contents']}">
    <button type="button" class="motion" data-motion data-pause="{ui['pause']}" data-resume="{ui['resume']}" hidden>{ui['pause']}</button>
    <details class="thread-menu">
      <summary>{ui['thread']}</summary>
      <div class="thread-panel"><p class="thread-title">{ui['contents']}</p><ol>{thread}<li><a href="#lexique"><span></span>{ui['lexiconTitle']}</a></li><li><a href="#livre"><span></span>{ui['bookTitle']}</a></li></ol></div>
    </details>
    <a href="#lexique" class="nav-lexicon">{ui['lexiconTitle']}</a>
    <a href="#livre">{ui['book']}</a>
    <a href="{other_href}" lang="{other_lang}" hreflang="{other_lang}" aria-label="{ui['otherName']}">{ui['other']}</a>
  </nav>
</header>
<div class="progress" aria-hidden="true"><i></i></div>
<main id="top">
  <section class="opening" data-tone="paper">
    <h1 class="sr">{ui['name']}</h1>
    <p class="opening-ask">{escape(opening, quote=False)}</p>
    <div class="opening-grid fig">{live('source', ui['name'], ui, lang)}</div>
    <ol class="parts">{parts}</ol>
    <div class="opening-foot"><p>{e(ui['intro'], lang)}</p><a href="#{first}">{ui['read']} <span aria-hidden="true">↓</span></a></div>
  </section>
{body}
  <section class="ending" data-tone="blank" aria-labelledby="open-title">
    <h2 id="open-title">{e(ui['openTitle'], lang)}</h2>
    <ol>{opens}</ol>
    <p class="last-note">{e(ui['last'], lang)}</p>
    <p class="last">{e(ui['question'], lang)}</p>
    <i class="point" aria-hidden="true"></i>
  </section>
  <section class="lexicon" id="lexique" data-tone="paper" aria-labelledby="lexicon-title">
    <div class="lexicon-head"><h2 id="lexicon-title">{ui['lexiconTitle']}</h2><p>{e(ui['lexiconNote'], lang)}</p></div>
    <dl>{terms}</dl>
    <p class="lexicon-note">{e(ui['echoesNote'], lang)}</p>
  </section>
  <section class="book" id="livre" data-tone="paper" aria-labelledby="book-title">
    <a class="cover" href="{prefix}{ui['pdf']}" aria-hidden="true" tabindex="-1"><img src="{prefix}assets/cover-{lang}.jpg" alt="" width="280" height="420" loading="lazy"></a>
    <div><h2 id="book-title">{ui['bookTitle']}</h2><p>{e(ui['bookLine'], lang)}</p></div>
    <div class="book-links"><a class="primary" href="{prefix}{ui['pdf']}">{ui['download']} <span aria-hidden="true">↓</span></a><a href="{prefix}{ui['otherPdf']}" lang="{other_lang}">{ui['downloadOther']}</a></div>
  </section>
</main>
<footer class="foot" data-tone="paper"><a href="https://github.com/C0sm0cats/the-source">{ui['source_code']}</a></footer>
</body>
</html>
'''


def fonts():
    from fontTools.ttLib import TTFont
    target = ROOT / 'assets/fonts'
    target.mkdir(exist_ok=True)
    for name in FONTS:
        out = target / f'Spectral-{name}.woff2'
        if not out.exists():
            font = TTFont(ROOT / f'scripts/fonts/Spectral-{name}.ttf')
            font.flavor = 'woff2'
            font.save(out)


def main():
    fonts()
    data = load()
    (ROOT / 'index.html').write_text(page(data, 'fr'), encoding='utf-8')
    (ROOT / 'en').mkdir(exist_ok=True)
    (ROOT / 'en/index.html').write_text(page(data, 'en'), encoding='utf-8')
    print('index.html, en/index.html')


if __name__ == '__main__':
    main()
