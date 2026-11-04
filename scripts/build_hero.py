"""Render assets/hero.svg: the README banner. An animated fibre-optic ball around the Source, with the opening question.

Light leaves the Source, runs along every fibre and makes its tip flare; a slow wave of colour crosses the ball, and
two layers of fibres turn against each other for depth. Pure SVG + CSS with the Spectral subset embedded, so GitHub
plays it in an <img>, with no script and no external request. Requires fontTools (+ brotli).
"""
import base64
import io
import math
import random

from fontTools import subset
from fontTools.ttLib import TTFont

from common import ROOT, load, typo

W, H = 1600, 840
CX, CY, R = 1190, 420, 340
N = 520
COLOR_PERIOD, PULSE = 18, 5.2
COLORS = ['#ff5a3a', '#ff9440', '#ffd35a', '#7be08f', '#45cfff', '#5d7cff', '#b46bff', '#ff5fae']


def font(file, text):
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['kern', 'liga']
    f = TTFont(ROOT / f'scripts/fonts/Spectral-{file}.ttf')
    s = subset.Subsetter(options)
    s.populate(text=text)
    s.subset(f)
    buf = io.BytesIO()
    f.flavor = 'woff2'
    f.save(buf)
    return base64.b64encode(buf.getvalue()).decode()


def fibres():
    rnd = random.Random(11)
    tilt = math.radians(20)
    golden = math.pi * (3 - math.sqrt(5))
    out = []
    for i in range(N):
        z = 1 - 2 * (i + .5) / N
        r = math.sqrt(1 - z * z)
        phi = i * golden + rnd.uniform(-.05, .05)
        x, y = math.cos(phi) * r, math.sin(phi) * r
        y, z = y * math.cos(tilt) - z * math.sin(tilt), y * math.sin(tilt) + z * math.cos(tilt)
        length = R * (.78 + .22 * rnd.random())
        tx, ty = CX + x * length, CY + y * length
        # real fibres sag: the control point drops a little, more for the ones that leave sideways
        droop = 34 * (1 - abs(y)) * (.6 + .4 * rnd.random())
        qx, qy = CX + x * length * .5, CY + y * length * .45 + droop
        depth = (z + 1) / 2
        theta = math.atan2(y, x)
        color_delay = -COLOR_PERIOD * ((.25 * (y + 1) / 2 + .08 * theta / math.tau + .04 * rnd.random()) % 1)
        pulse_delay = -PULSE * rnd.random() - PULSE * 3 * rnd.random()
        out.append((depth, tx, ty, qx, qy, color_delay, pulse_delay))
    return sorted(out)


def fibre(depth, tx, ty, qx, qy, color_delay, pulse_delay):
    d = f'M{CX} {CY}Q{qx:.1f} {qy:.1f} {tx:.1f} {ty:.1f}'
    w = .45 + 1.0 * depth
    return (f'<g class="f" style="animation-delay:{color_delay:.2f}s">'
            f'<path d="{d}" stroke-width="{w:.2f}" opacity="{.07 + .2 * depth:.2f}"/>'
            f'<path class="p" d="{d}" pathLength="1" stroke-width="{w + .6:.2f}" style="animation-delay:{pulse_delay:.2f}s"/>'
            f'<circle cx="{tx:.1f}" cy="{ty:.1f}" r="{9 + 11 * depth:.1f}" opacity="{.05 + .08 * depth:.2f}"/>'
            f'<circle cx="{tx:.1f}" cy="{ty:.1f}" r="{3 + 3.5 * depth:.1f}" opacity="{.18 + .3 * depth:.2f}"/>'
            f'<circle class="t" cx="{tx:.1f}" cy="{ty:.1f}" r="{1.1 + 1.6 * depth:.1f}" style="animation-delay:{pulse_delay:.2f}s"/></g>')


def main():
    ui = load()['ui']
    title = 'The Source'
    question = ['What if existing', 'is how everything', 'discovers itself?']
    french = [typo('Et si exister était la façon', 'fr'), typo('dont le tout se découvre ?', 'fr')]
    assert ui['en']['opening'] == ' '.join(question), 'opening question changed: update the banner'
    thin = font('ExtraLight', ''.join(question))
    italic = font('LightItalic', title + ''.join(french))
    rnd = random.Random(3)
    stars = ''.join(
        f'<circle class="s" cx="{rnd.uniform(0, W):.0f}" cy="{rnd.uniform(0, H):.0f}" r="{rnd.uniform(.4, 1.3):.1f}" '
        f'style="animation-delay:{-rnd.uniform(0, 7):.1f}s;animation-duration:{rnd.uniform(4, 9):.1f}s"/>'
        for _ in range(140))
    layers = {0: [], 1: []}
    for item in fibres():
        layers[item[0] > .5].append(fibre(*item))
    keys = ' '.join(f'{round(100 * k / len(COLORS), 2)}% {{ color: {c}; }}' for k, c in enumerate(COLORS + COLORS[:1]))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="The Source: {' '.join(question)} A ball of light fibres leaving one point.">
<title>The Source</title>
<defs>
<radialGradient id="room" cx="74%" cy="50%" r="75%"><stop offset="0" stop-color="#1a1420"/><stop offset=".55" stop-color="#0b0c12"/><stop offset="1" stop-color="#07080c"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#ff6a45" stop-opacity=".7"/><stop offset=".25" stop-color="#ff5a3a" stop-opacity=".22"/><stop offset="1" stop-color="#ff5a3a" stop-opacity="0"/></radialGradient>
<radialGradient id="aura"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset=".7" stop-color="#fff" stop-opacity=".015"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>
<style>
@font-face {{ font-family: SpectralThin; src: url(data:font/woff2;base64,{thin}) format('woff2'); }}
@font-face {{ font-family: SpectralItalic; src: url(data:font/woff2;base64,{italic}) format('woff2'); }}
text {{ fill: #ece8dd; }}
.name {{ font: italic 300 30px SpectralItalic, Georgia, serif; }}
.q {{ font: 200 70px SpectralThin, Georgia, serif; }}
.en {{ font: italic 300 25px SpectralItalic, Georgia, serif; fill: #b9b4aa; }}
.f {{ animation: hue {COLOR_PERIOD}s linear infinite; }}
.f path {{ stroke: currentColor; fill: none; stroke-linecap: round; }}
.f circle {{ fill: currentColor; }}
.f .p {{ stroke: #fff; stroke-dasharray: .05 1.2; stroke-dashoffset: .05; opacity: .0; animation: run {PULSE}s cubic-bezier(.45,.1,.6,1) infinite; }}
.f .t {{ fill: #fff; animation: flare {PULSE}s ease-out infinite; }}
.back {{ transform-origin: {CX}px {CY}px; animation: turn 160s linear infinite; }}
.front {{ transform-origin: {CX}px {CY}px; animation: turn 110s linear infinite reverse; }}
.ball {{ transform-origin: {CX}px {CY}px; animation: breathe 10s ease-in-out infinite; }}
.core {{ transform-origin: {CX}px {CY}px; animation: beat 3.4s ease-in-out infinite; }}
.s {{ fill: #fff; animation: twinkle 6s ease-in-out infinite; }}
@keyframes hue {{ {keys} }}
@keyframes run {{ 0% {{ stroke-dashoffset: .05; opacity: .7; }} 62% {{ stroke-dashoffset: -1; opacity: .7; }} 63%, 100% {{ stroke-dashoffset: -1; opacity: 0; }} }}
@keyframes flare {{ 0%, 55% {{ opacity: .55; transform: none; }} 64% {{ opacity: 1; }} 100% {{ opacity: .55; }} }}
@keyframes turn {{ to {{ transform: rotate(360deg); }} }}
@keyframes breathe {{ 0%, 100% {{ transform: scale(.98); }} 50% {{ transform: scale(1.02); }} }}
@keyframes beat {{ 0%, 100% {{ transform: scale(.85); opacity: .8; }} 14% {{ transform: scale(1.15); opacity: 1; }} 28% {{ transform: scale(.92); }} 40% {{ transform: scale(1.06); }} 60% {{ transform: scale(.88); }} }}
@keyframes twinkle {{ 0%, 100% {{ opacity: .08; }} 50% {{ opacity: .55; }} }}
@media (prefers-reduced-motion: reduce) {{ * {{ animation: none !important; }} .f .p {{ opacity: 0; }} }}
</style>
<rect width="{W}" height="{H}" fill="url(#room)"/>
{stars}
<circle cx="{CX}" cy="{CY}" r="{R * 1.25:.0f}" fill="url(#aura)"/>
<g class="ball"><g class="back">{''.join(layers[0])}</g><g class="front">{''.join(layers[1])}</g></g>
<g class="core"><circle cx="{CX}" cy="{CY}" r="150" fill="url(#halo)"/><circle cx="{CX}" cy="{CY}" r="10" fill="#ff5a3a"/><circle cx="{CX}" cy="{CY}" r="4.5" fill="#fff6ee"/></g>
<text class="name" x="88" y="158">{title}</text>
{''.join(f'<text class="q" x="86" y="{318 + i * 86}">{line}</text>' for i, line in enumerate(question))}
{''.join(f'<text class="en" x="88" y="{640 + i * 34}">{line}</text>' for i, line in enumerate(french))}
</svg>
'''
    (ROOT / 'assets/hero.svg').write_text(svg)
    print('assets/hero.svg', round(len(svg.encode()) / 1024), 'KB')


if __name__ == '__main__':
    main()
