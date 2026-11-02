#!/usr/bin/env python3
"""Typeset both books (14 x 21 cm) from content/chapters.json. Each chapter is a spread:
the thesis and its figure on the left page, the text on the right. No network needed."""
import hashlib
import re
import json
import subprocess

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from xml.sax.saxutils import escape

from common import ROOT, load, typo
from figures import draw as draw_figure, labels_for, record

W, H = 14 * cm, 21 * cm
MX, TOP, BOTTOM = 1.75 * cm, 1.9 * cm, 1.9 * cm
TEXT_W = W - 2 * MX
TONES = {
    'paper': ('#eeece5', '#17171b', '#e03c1f'),
    'dusk': ('#3c4256', '#f0ede4', '#ff6b4d'),
    'night': ('#0b0c12', '#ece8dd', '#ff5a3a'),
    'blank': ('#ffffff', '#111114', '#e03c1f'),
}
HYPHEN = {'fr': 'fr_FR', 'en': 'en_GB'}
BODY = (10.7, 14.7)
FIGURES, CROPS = {}, {}
FILES = {'fr': 'la-source-fr.pdf', 'en': 'the-source-en.pdf'}
FONTS = {'Thin': 'ExtraLight', 'ThinI': 'ExtraLightItalic', 'Light': 'Light', 'LightI': 'LightItalic', 'Reg': 'Regular', 'Ital': 'Italic'}


def tone(name):
    bg, ink, mark = TONES[name]
    ink_c, bg_c = colors.HexColor(ink), colors.HexColor(bg)
    faint = colors.linearlyInterpolatedColor(bg_c, ink_c, 0, 1, .45)
    return bg_c, ink_c, colors.HexColor(mark), faint


def flow(c, text, y, size=10.2, leading=14.2, font='Light', color=None, lang=None, x=MX, width=TEXT_W, justify=False, after=0, tracking=0):
    kwargs = {}
    if justify and lang:
        kwargs = dict(hyphenationLang=HYPHEN[lang], uriWasteReduce=.3)
    style = ParagraphStyle('p', fontName=font, fontSize=size, leading=leading, textColor=color, alignment=TA_JUSTIFY if justify else TA_LEFT, splitLongWords=0, **kwargs)
    p = Paragraph(escape(text), style)
    _, h = p.wrap(width, H)
    p.drawOn(c, x, y - h)
    return y - h - after


def background(c, name):
    bg, ink, mark, faint = tone(name)
    c.setFillColor(bg)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    return ink, mark, faint


def folio(c, ink, title=None):
    n = c.getPageNumber()
    c.setFillColor(ink)
    c.setFont('Reg', 8.2)
    if n % 2:
        c.drawRightString(W - MX, 1 * cm, str(n))
        if title:
            c.setFont('LightI', 8.2)
            c.drawString(MX, 1 * cm, title)
    else:
        c.drawString(MX, 1 * cm, str(n))


def cover(c, data, lang):
    ui = data['ui'][lang]
    ink, mark, faint = background(c, 'night')
    draw_figure(c, FIGURES['fractal'], 0, H - 3.9 * cm, W, ink, mark, 'LightI', labels=False)
    c.setFillColor(ink)
    c.setFont('Thin', 39)
    c.drawString(MX, H - 3.25 * cm, ui['name'])
    flow(c, typo(ui['subtitle'], lang), 2.35 * cm, size=11, leading=14, font='LightI', color=ink)
    c.showPage()


def inner_title(c, data, lang, chapters):
    ui = data['ui'][lang]
    background(c, 'night')
    c.showPage()  # inside cover
    ink, mark, faint = background(c, 'paper')
    y = flow(c, ui['name'], H - TOP - .4 * cm, size=30, leading=34, font='Thin', color=ink, after=8)
    y = flow(c, typo(ui['subtitle'], lang), y, size=11.5, leading=15, font='LightI', color=ink, after=28)
    y = flow(c, typo(ui['intro'], lang), y, size=10.4, leading=14.7, color=ink, lang=lang, justify=True)
    c.showPage()

    ink, mark, faint = background(c, 'paper')
    y = flow(c, ui['contents'], H - TOP, size=10.5, leading=14, font='LightI', color=ink, after=8)
    current = None
    for i, chapter in enumerate(chapters):
        if chapter['part'] != current:
            current = chapter['part']
            y = flow(c, typo(ui['parts'][current], lang), y - 9, size=9.4, leading=12, font='LightI', color=mark, after=5)
        c.setStrokeColor(faint)
        c.setLineWidth(.35)
        c.line(MX, y, W - MX, y)
        top = y
        c.setFillColor(ink)
        c.setFont('Reg', 8)
        c.drawString(MX, y - 13, f'{i + 1:02d}')
        c.drawRightString(W - MX, y - 13, str(6 + i * 2))
        c.setFont('Light', 10.2)
        c.drawString(MX + 21, y - 13, typo(chapter[lang]['title'], lang))
        y -= 20
        c.linkRect('', chapter['id'], (MX, y, W - MX, top), relative=0, thickness=0)
    if y < 1.2 * cm:
        raise ValueError(f'Contents overflow {lang}: {y}')
    folio(c, ink)
    c.showPage()
    lexicon(c, ui, lang)


def lexicon(c, ui, lang):
    ink, mark, faint = background(c, 'paper')
    y = flow(c, ui['lexiconTitle'], H - TOP, size=10.5, leading=14, font='LightI', color=ink, after=4)
    y = flow(c, typo(ui['lexiconNote'], lang), y, size=8.8, leading=11.8, font='LightI', color=ink, after=10)
    for term, meaning in ui['lexicon']:
        c.setStrokeColor(faint)
        c.setLineWidth(.35)
        c.line(MX, y, W - MX, y)
        top = y - 5
        flow(c, typo(term, lang), top, size=9.6, leading=12.6, font='Reg', color=ink, width=2.6 * cm)
        y = flow(c, typo(meaning, lang), top, size=9.6, leading=12.6, color=ink, x=MX + 2.75 * cm, width=TEXT_W - 2.75 * cm, after=7)
    y = flow(c, typo(ui['echoesNote'], lang), y - 14, size=8.8, leading=11.8, font='LightI', color=ink)
    if y < 1.6 * cm:
        raise ValueError(f'Lexicon overflow {lang}: {y}')
    folio(c, ink)
    c.showPage()


def opener(c, chapter, i, data, lang):
    ui = data['ui'][lang]
    t = chapter[lang]
    ink, mark, faint = background(c, chapter['tone'])
    c.bookmarkPage(chapter['id'])
    c.addOutlineEntry(typo(t['title'], lang), chapter['id'], level=0)
    c.setFillColor(ink)
    c.setFont('Reg', 8.6)
    c.drawString(MX, H - TOP + .1 * cm, f'{i + 1:02d}')
    c.setFont('LightI', 8.6)
    c.drawString(MX + 17, H - TOP + .1 * cm, typo(ui['parts'][chapter['part']], lang) + ' · ' + typo(t['title'], lang))
    ask = typo(t['thesis'], lang)
    size = 27 if len(ask) < 48 else 23 if len(ask) < 66 else 20
    y = flow(c, ask, H - TOP - .75 * cm, size=size, leading=size * 1.06, font='Thin', color=ink, after=10)
    fig = min(W, y - 1.25 * cm)
    x, top = (W - fig) / 2, 1.2 * cm + fig
    draw_figure(c, FIGURES[chapter['figure']], x, top, fig, ink, mark, 'LightI')
    CROPS[chapter['id']] = (c.getPageNumber(), x, H - top, fig)
    folio(c, ink)
    c.showPage()


def text_page(c, chapter, data, lang):
    ui = data['ui'][lang]
    t = chapter[lang]
    ink, mark, faint = background(c, chapter['tone'])
    y = H - TOP
    for item in t['body']:
        if item.startswith('> '):
            y = flow(c, typo(item[2:], lang), y - 3, size=15, leading=17.8, font='LightI', color=mark, after=11)
        else:
            y = flow(c, typo(item, lang), y, size=BODY[0], leading=BODY[1], color=ink, lang=lang, justify=True, after=8)
    lay_foot(c, t, ui, lang, ink, mark, faint, y)
    folio(c, ink, typo(t['title'], lang))
    c.showPage()


def flow_height(text, size, leading, font='LightI', width=TEXT_W):
    p = Paragraph(escape(text), ParagraphStyle('m', fontName=font, fontSize=size, leading=leading))
    return p.wrap(width, H)[1]


def echo_text(echo, lang):
    who, work, text = (escape(typo(s, lang)) for s in echo)
    work = re.sub(r'\*(.+?)\*', r'<i>\1</i>', work)
    return f'<font name="Reg">{who}</font>, {work}. {text}'


def lay_foot(c, t, ui, lang, ink, mark, faint, y):
    question = typo(t['open'], lang)
    height = flow_height(question, 11.8, 14.6)
    start = 1.75 * cm + height + 28
    style = ParagraphStyle('e', fontName='Light', fontSize=8.5, leading=11.2, textColor=ink)
    echoes = [Paragraph(echo_text(echo, lang), style) for echo in t['echoes']]
    heights = [p.wrap(TEXT_W, H)[1] for p in echoes]
    top = start + 16 + sum(heights) + 5 * (len(echoes) - 1) + 14
    if y - 8 < top:
        raise ValueError(f'Chapter overflow: {lang} {t["title"]}: {y - top:.0f}pt')
    c.setFillColor(mark)
    c.setFont('LightI', 8.4)
    c.drawString(MX, top - 9, typo(ui['echoes'], lang))
    ey = top - 14
    for p, h in zip(echoes, heights):
        p.drawOn(c, MX, ey - h)
        ey -= h + 5
    c.setStrokeColor(faint)
    c.setLineWidth(.4)
    c.line(MX, start, W - MX, start)
    c.setFillColor(ink)
    c.setFont('LightI', 8.4)
    c.drawString(MX, start - 12, typo(ui['unknown'], lang))
    flow(c, question, start - 18, size=11.8, leading=14.6, font='LightI', color=ink)


def ending(c, data, lang):
    ui = data['ui'][lang]
    last = ui['question']
    ink, mark, faint = background(c, 'blank')
    y = flow(c, typo(ui['openTitle'], lang), H - TOP, size=10.5, leading=14, font='LightI', color=ink, after=12)
    for q in ui['open']:
        c.setStrokeColor(ink)
        c.setLineWidth(.35)
        c.line(MX, y, W - MX, y)
        y = flow(c, typo(q, lang), y - 6, size=11.2, leading=14.6, color=ink, after=8)
    folio(c, ink)
    c.showPage()

    ink, mark, faint = background(c, 'blank')
    flow(c, typo(ui['last'], lang), H - TOP, size=9.8, leading=13, font='LightI', color=ink)
    size = 28 if lang == 'fr' else 30
    y = flow(c, typo(last, lang), H - TOP - 2.2 * cm, size=size, leading=size * 1.05, font='Thin', color=ink, after=30)
    c.setFillColor(mark)
    c.circle(MX + 5, y, 5, stroke=0, fill=1)
    c.showPage()

    if c.getPageNumber() % 2:  # the back cover falls on an even page
        background(c, 'blank')
        c.showPage()
    ink, mark, faint = background(c, 'night')
    y = 5.3 * cm
    url = 'https://c0sm0cats.github.io/the-source/'
    flow(c, url, y, size=8.6, leading=11.6, font='LightI', color=ink)
    c.linkURL(url, (MX, y - 12, W - MX, y + 2), relative=0)
    c.setFillColor(mark)
    c.circle(W / 2, H / 2 + 1.3 * cm, 5, stroke=0, fill=1)
    c.showPage()


def fallback_images(pdf, lang):
    """Figures as images for the site when JavaScript is off."""
    out = ROOT / 'assets/figures'
    out.mkdir(exist_ok=True)
    scale = 150 / 72
    for chapter, (page, x, y, size) in CROPS.items():
        args = ['pdftoppm', '-r', '150', '-f', str(page), '-l', str(page), '-x', str(round(x * scale)), '-y', str(round(y * scale)), '-W', str(round(size * scale)), '-H', str(round(size * scale)), '-jpeg', '-jpegopt', 'quality=82', '-singlefile', str(pdf), str(out / f'{lang}-{chapter}')]
        subprocess.run(args, check=True)


def digest(chapters, ui, lang):
    payload = json.dumps([[ch[lang] for ch in chapters], ui[lang]], ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def main():
    for name, filename in FONTS.items():
        pdfmetrics.registerFont(TTFont(name, str(ROOT / f'scripts/fonts/Spectral-{filename}.ttf')))
    for bold in (0, 1):
        for italic in (0, 1):
            addMapping('Light', bold, italic, [['Light', 'LightI'], ['Reg', 'Ital']][bold][italic])
    data = load()
    chapters = data['chapters']
    (ROOT / 'books').mkdir(exist_ok=True)
    for lang, filename in FILES.items():
        path = ROOT / 'books' / filename
        FIGURES.clear()
        FIGURES.update(record(labels_for(data['ui'][lang], lang)))
        c = canvas.Canvas(str(path), pagesize=(W, H), invariant=1, pageCompression=1, lang=lang)
        c.setTitle(data['ui'][lang]['name'])
        c.setSubject(data['ui'][lang]['subtitle'])
        c.setAuthor('C0sm0cats')
        c.setKeywords(f'content-sha256:{digest(chapters, data["ui"], lang)}')
        c.showOutline()
        cover(c, data, lang)
        inner_title(c, data, lang, chapters)
        for i, chapter in enumerate(chapters):
            opener(c, chapter, i, data, lang)
            text_page(c, chapter, data, lang)
        ending(c, data, lang)
        c.save()
        print(path.relative_to(ROOT), f'{path.stat().st_size:,} bytes')
        fallback_images(path, lang)
        subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-scale-to-x', '560', '-scale-to-y', '840', '-jpeg', '-jpegopt', 'quality=84', '-singlefile', str(path), str(ROOT / f'assets/cover-{lang}')], check=True)


if __name__ == '__main__':
    main()
