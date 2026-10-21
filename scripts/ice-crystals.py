"""
Ice theme crystal patterns  ->  images/bg/ice-crystals-large.svg
                                images/bg/ice-crystals-small.svg
                                + the keep-out mask, written into css/backgrounds.css

HOW TO USE
  1. In a terminal in the project folder, start:
         python scripts/ice-crystals.py --watch
     (leave it running; stop with Ctrl+C)
  2. Edit the SETTINGS below and save. The files rebuild automatically.
  3. Reload the page (F5). The file links in css/backgrounds.css are updated
     on every build, so the browser always picks up the new version.
  Without --watch it builds once and exits.

LARGE crystals are placed ONCE on the screen (positions in % of the screen),
so what you list is exactly what you see. They sway slowly.
SMALL crystals sit on a square tile that repeats across the screen, so their
count is per tile: a bigger SMALL_TILE spreads them further apart. They are
still, and they are hidden around each large crystal (KEEP_OUT) so they never
sit on top of one.
"""
import math
import os
import random
import re
import subprocess
import sys
import time
from urllib.parse import quote

# =============================== SETTINGS ===============================

SEED = 11            # change to get a different random layout of the small crystals

# ---- Designs ----
#   'star'    : six-point star centre, glowing orbs on the arm tips
#   'fern'    : hexagon centre, broad V-shaped branches (like a fern leaf)
#   'feather' : hexagon centre, rows of short branches (dense, feathery)
#   'plate'   : double-hexagon plate centre, short branched arms (simplest)
#
# ---- Colours ('deep' / 'mid' / 'pale') ----
#   how light each crystal is:  deep = strongest blue, mid = medium,
#   pale = lightest (almost white, the brightest-looking on a blue background)
#   The values themselves are in PALETTE at the bottom of the settings.

# ---- Large + medium crystals: placed once on the screen, slowly swaying ----
# One line per crystal; delete a line (or put # in front) to remove it.
#   x, y  : position in % of the screen (0 = left/top, 100 = right/bottom;
#           below 0 or above 100 = partly off the edge)
#   size  : radius in px  (large ~110-150, medium ~70-95, small ~30-50)
#   turn  : rotation in degrees
LARGE_CRYSTALS = [
    # design     x%   y%  size turn colour
    ('star',     24,  32, 115, 15, 'mid'),      # large - single star
    ('fern',     14,  86,  85,  0, 'deep'),      # large - double star
    ('feather',   6,  18, 90, 25, 'pale'),     # medium
    ('feather',  77,  56, 125,  8, 'mid'),      # medium
    ('star',     94,  76,  80,  3, 'pale'),     # medium
]
LARGE_PHONE_SCALE = .65    # on phones these are drawn at this size (1 = same as PC)
LARGE_DUST_AROUND = .7     # sparkle dust around each of these crystals (0 = none)
LARGE_DUST_SCATTER = 35    # loose sparkle dots spread across the screen

# small crystals are hidden inside this circle around each large crystal:
# 1 = the large crystal's own radius (small ones may touch its branch tips),
# .7 = only the inner part, 1.2 = a clear gap around it
KEEP_OUT = 1.0

# ---- Small crystals: on a repeating tile, still ----
SMALL_TILE = 600                       # tile size in px (bigger = more spread out)
SMALL_COUNT = 10                        # small crystals per tile
SMALL_SIZE = (20, 50)                  # smallest and largest radius in px
SMALL_DESIGNS = ['feather', 'plate', 'fern']        # picked at random (repeat one to make it more common)
SMALL_COLOURS = ['mid', 'mid', 'pale', 'deep']      # picked at random
SMALL_BRIGHTNESS = 1                   # 1 = full; lower to dim ONLY the small crystals
SMALL_GAP = 40                         # minimum space between small crystals in px
SMALL_DUST_AROUND = 1.5
SMALL_DUST_SCATTER = 150

# ---- Colours: (crystal body, glow) ----
PALETTE = {
    'deep': ('#4fb2dd', '#7fd2f1'),
    'mid': ('#78c9ea', '#a4e1f6'),
    'pale': ('#a2daf1', '#c6ecf9'),
}
DUST_COLOURS = ['#e6f9ff', '#bfeffd', '#8fdbf4', '#ffffff']

# ========================================================================

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'images', 'bg')
CSS = os.path.join(ROOT, 'css', 'backgrounds.css')


def P(x, y):
    return f'{x:.1f} {y:.1f}'


def branch(t, length, ang_deg, R):
    """Two branches leaving the spine at height t*R, angled +/- ang from the spine."""
    y = -t * R
    s = []
    for side in (-1, 1):
        a = math.radians(ang_deg) * side
        s.append(f'M0 {y:.1f}L{P(length * R * math.sin(a), y - length * R * math.cos(a))}')
    return ''.join(s)


def arm_fern(R):
    d = f'M0 0L0 {-R:.1f}'
    for t, ln in ((.28, .3), (.48, .26), (.66, .2), (.82, .12)):
        d += branch(t, ln, 58, R)
    d += branch(.93, .07, 35, R)
    d += branch(.14, .13, 75, R)
    return d


def arm_star(R):
    return f'M0 0L0 {-R:.1f}' + branch(.42, .13, 55, R) + branch(.72, .19, 52, R)


def arm_feather(R):
    d = f'M0 0L0 {-R:.1f}'
    n = 6
    for k in range(n):
        t = .24 + k * (.66 / (n - 1))
        d += branch(t, .27 - .2 * (k / (n - 1)), 52, R)
    return d


def arm_plate(R):
    return f'M0 {-R * .3:.1f}L0 {-R:.1f}' + branch(.55, .2, 58, R) + branch(.8, .13, 55, R)


def hexagon(r, rot=30):
    pts = [P(r * math.sin(math.radians(k * 60 + rot)), -r * math.cos(math.radians(k * 60 + rot))) for k in range(6)]
    return 'M' + 'L'.join(pts) + 'Z'


def star6(r):
    pts = []
    for k in range(12):
        rr = r if k % 2 == 0 else r * .5
        a = math.radians(k * 30)
        pts.append(P(rr * math.sin(a), -rr * math.cos(a)))
    return 'M' + 'L'.join(pts) + 'Z'


ARMS = {'fern': arm_fern, 'star': arm_star, 'feather': arm_feather, 'plate': arm_plate}
CENTRES = {'fern': lambda R: hexagon(R * .16), 'star': lambda R: star6(R * .24),
           'feather': lambda R: hexagon(R * .13), 'plate': lambda R: hexagon(R * .3) + hexagon(R * .16)}

DEFS = ("<filter id='glow' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='{glow}'/></filter>"
        "<radialGradient id='orb'><stop offset='0' stop-color='#fff'/><stop offset='.45' stop-color='#d4f5ff'/>"
        "<stop offset='1' stop-color='#7fd2f1' stop-opacity='0'/></radialGradient>"
        "<radialGradient id='halo'><stop offset='0' stop-color='#bdeefc' stop-opacity='.45'/>"
        "<stop offset='.6' stop-color='#d4f5ff' stop-opacity='.16'/><stop offset='1' stop-color='#e6faff' stop-opacity='0'/></radialGradient>")

PHONE_STYLE = f"<style>@media (max-width: 720px) {{ .c {{ transform: scale({LARGE_PHONE_SCALE}); }} }}</style>"


def dust_dot(x, y, r, c, o):
    return f"<circle cx='{x:.1f}' cy='{y:.1f}' r='{r:.1f}' fill='{c}' opacity='{o:.2f}'/>"


def crystal(kind, R, rot, pal, dust_around):
    """One crystal drawn around (0, 0): halo, dust, glow, ice-blue body, white core, orbs, glints."""
    body, glow = PALETTE[pal]
    w = max(R * .034, 1.1)
    arm = ARMS[kind](R)
    shape = ''.join(f"<path transform='rotate({k * 60 + rot})' d='{arm}'/>" for k in range(6))
    shape += f"<path transform='rotate({rot})' d='{CENTRES[kind](R)}'/>"
    out = [f"<circle r='{R * 1.2:.1f}' fill='url(#halo)'/>"]
    for _ in range(int(R * dust_around)):
        ang, dist = random.uniform(0, 2 * math.pi), abs(random.gauss(0, R * .7))
        out.append(dust_dot(dist * math.cos(ang), dist * math.sin(ang), random.uniform(.5, 1.9),
                            random.choice(DUST_COLOURS), random.uniform(.45, 1)))
    out.append(f"<g fill='none' stroke-linecap='round' stroke-linejoin='round'>"
               f"<g filter='url(#glow)' opacity='.8' stroke='{glow}' stroke-width='{w * 3.2:.1f}'>{shape}</g>"
               f"<g stroke='{body}' stroke-width='{w:.1f}'>{shape}</g>"
               f"<g stroke='#fff' stroke-width='{w * .4:.1f}'>{shape}</g></g>")
    out.append(f"<circle r='{max(R * .07, 2.2):.1f}' fill='url(#orb)'/>")
    if kind == 'star':
        for k in range(6):
            a = math.radians(k * 60 + rot)
            out.append(f"<circle cx='{R * math.sin(a):.1f}' cy='{-R * math.cos(a):.1f}' "
                       f"r='{max(R * .055, 1.8):.1f}' fill='url(#orb)'/>")
    for k in random.sample(range(6), 2):          # four-point glints near two tips
        a = math.radians(k * 60 + rot)
        gx, gy, s = R * .95 * math.sin(a), -R * .95 * math.cos(a), max(R * .1, 4)
        out.append(f"<path d='M{P(gx, gy - s)}L{P(gx + s * .16, gy - s * .16)}L{P(gx + s, gy)}"
                   f"L{P(gx + s * .16, gy + s * .16)}L{P(gx, gy + s)}L{P(gx - s * .16, gy + s * .16)}"
                   f"L{P(gx - s, gy)}L{P(gx - s * .16, gy - s * .16)}Z' fill='#fff'/>")
    return ''.join(out)


def write(name, svg):
    path = os.path.join(OUT, name)
    with open(path, 'w') as f:
        f.write(svg)
    return path


def build_large():
    # No fixed size: the image takes the size of the screen layer, so x/y
    # percentages are screen percentages and nothing repeats.
    parts = []
    for kind, x, y, R, rot, pal in LARGE_CRYSTALS:
        parts.append(f"<svg x='{x}%' y='{y}%' width='1' height='1' overflow='visible'>"
                     f"<g class='c'>{crystal(kind, R, rot, pal, LARGE_DUST_AROUND)}</g></svg>")
    for _ in range(LARGE_DUST_SCATTER):
        parts.append(f"<circle cx='{random.uniform(0, 100):.1f}%' cy='{random.uniform(0, 100):.1f}%' "
                     f"r='{random.uniform(.5, 1.5):.1f}' fill='{random.choice(DUST_COLOURS)}' "
                     f"opacity='{random.uniform(.3, .85):.2f}'/>")
    svg = (f"<svg xmlns='http://www.w3.org/2000/svg'>{PHONE_STYLE}"
           f"<defs>{DEFS.format(glow=6)}</defs>{''.join(parts)}</svg>")
    return write('ice-crystals-large.svg', svg), len(LARGE_CRYSTALS)


def build_mask():
    """Same screen layout as the large crystals: opaque everywhere except a soft
    hole at each large crystal. It masks the small-crystal layer."""
    holes = ''.join(f"<svg x='{x}%' y='{y}%' width='1' height='1' overflow='visible'>"
                    f"<circle class='c' r='{R * KEEP_OUT:.1f}' fill='url(#hole)'/></svg>"
                    for kind, x, y, R, rot, pal in LARGE_CRYSTALS)
    svg = ("<svg xmlns='http://www.w3.org/2000/svg'>" + PHONE_STYLE +
           "<defs><radialGradient id='hole'><stop offset='0' stop-color='#000'/>"
           "<stop offset='.72' stop-color='#000'/><stop offset='1' stop-color='#fff'/></radialGradient>"
           f"<mask id='m'><rect width='100%' height='100%' fill='#fff'/>{holes}</mask></defs>"
           "<rect width='100%' height='100%' fill='#000' mask='url(#m)'/></svg>")
    # embedded in the CSS (not a separate file): browsers refuse mask files
    # when the page is opened straight from disk
    return 'data:image/svg+xml,' + quote(svg, safe='')


def build_small():
    T = SMALL_TILE
    small, tries = [], 0
    while len(small) < SMALL_COUNT and tries < 20000:
        tries += 1
        R = random.uniform(*SMALL_SIZE)
        x, y = random.uniform(R + 8, T - R - 8), random.uniform(R + 8, T - R - 8)
        if all(math.hypot(x - sx, y - sy) > R + sR + SMALL_GAP for sx, sy, sR in small):
            small.append((x, y, R))
    if len(small) < SMALL_COUNT:
        print(f'  note: only {len(small)} small crystals fit; lower SMALL_COUNT, SMALL_SIZE or SMALL_GAP')
    flakes = ''.join(
        f"<g transform='translate({x:.0f} {y:.0f})'>"
        f"{crystal(random.choice(SMALL_DESIGNS), R, random.randint(0, 59), random.choice(SMALL_COLOURS), SMALL_DUST_AROUND)}</g>"
        for x, y, R in small)
    scatter = ''.join(dust_dot(random.uniform(0, T), random.uniform(0, T), random.uniform(.5, 1.5),
                               random.choice(DUST_COLOURS), random.uniform(.3, .85)) for _ in range(SMALL_DUST_SCATTER))
    # everything drawn 9 times, offset by a tile, so anything crossing an edge continues on the next tile
    svg = (f"<svg xmlns='http://www.w3.org/2000/svg' width='{T}' height='{T}' viewBox='0 0 {T} {T}'>"
           f"<defs>{DEFS.format(glow=3.5)}<g id='t'>{scatter}{flakes}</g></defs>"
           f"<g opacity='{SMALL_BRIGHTNESS}'>"
           + ''.join(f"<use href='#t' x='{dx}' y='{dy}'/>" for dx in (-T, 0, T) for dy in (-T, 0, T))
           + "</g></svg>")
    return write('ice-crystals-small.svg', svg), len(small)


def bump_css_versions(mask_uri):
    """Point css/backgrounds.css at the new files (?v=...) so a normal reload shows
    them, and write the new keep-out mask into it."""
    v = str(int(time.time()))
    with open(CSS, encoding='utf-8') as f:
        css = f.read()
    new = re.sub(r"(images/bg/ice-crystals-(?:large|small)\.svg)(\?v=\d+)?", r"\1?v=" + v, css)
    new = re.sub(r"((?:-webkit-)?mask: )url\([^\n]*?\)( 0 0 / 100% 100% no-repeat;)",
                 lambda m: m.group(1) + f'url("{mask_uri}")' + m.group(2), new)
    if new != css:
        with open(CSS, 'w', encoding='utf-8') as f:
            f.write(new)


def build():
    random.seed(SEED)
    lp, ln = build_large()
    mask = build_mask()
    sp, sn = build_small()
    bump_css_versions(mask)
    print(f'  {os.path.basename(lp)}: {ln} crystals (placed once)   '
          f'{os.path.basename(sp)}: {sn} per {SMALL_TILE}px tile')


def watch():
    me = os.path.abspath(__file__)
    last = None
    print('Watching scripts/ice-crystals.py: save it to rebuild, Ctrl+C to stop.')
    while True:
        m = os.path.getmtime(me)
        if m != last:
            last = m
            print(time.strftime('%H:%M:%S'), 'building...')
            # run a fresh copy so the newly saved settings are used
            subprocess.run([sys.executable, me])
        time.sleep(1)


if __name__ == '__main__':
    if '--watch' in sys.argv:
        try:
            watch()
        except KeyboardInterrupt:
            pass
    else:
        build()
