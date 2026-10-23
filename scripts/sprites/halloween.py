"""Sprites de la semana de Halloween.

1. Importa los 3 disfraces de Rodolfo (dibujados a mano, vienen a 10× por
   píxel) y los baja a su tamaño nativo, igual que import_gifs.py.
2. Dibuja con código la decoración: telaraña de esquina, araña colgante,
   murciélago y rayo. Todo a tamaño nativo; el CSS los escala con
   image-rendering: pixelated.

Salida:
  public/rodolfo/halloween/{bruja,fantasma,vampiro}.gif
  public/halloween/{web,spider,bat,bolt}.png   (spider y bat: 2 cuadros en fila)

Uso:  python scripts/sprites/halloween.py
"""
from __future__ import annotations

import math
import os
import random

from PIL import Image

from import_gifs import SRC_DIR, ROOT, pixel_scale, read_frames, to_palette

RODOLFO_OUT = os.path.join(ROOT, 'public', 'rodolfo', 'halloween')
DECO_OUT = os.path.join(ROOT, 'public', 'halloween')

COSTUMES = ['bruja', 'fantasma', 'vampiro']

# Paleta fija de la semana (la misma que los tokens de globals.css)
WEB = (226, 218, 238, 215)       # hilo hueso-lavanda
WEB_DIM = (226, 218, 238, 120)   # hilos de afuera, más gastados
DEW = (255, 255, 255, 255)       # gotita de rocío en los cruces
SPIDER = (59, 42, 82, 255)
SPIDER_HI = (96, 72, 128, 255)
LEG = (150, 136, 172, 255)
EYE = (255, 122, 26, 255)        # naranja calabaza
BAT = (58, 41, 80, 255)
BAT_HI = (88, 66, 118, 255)
BOLT = (255, 251, 232, 255)
BOLT_GLOW = (201, 182, 255, 150)


def import_costumes() -> None:
    os.makedirs(RODOLFO_OUT, exist_ok=True)
    for name in COSTUMES:
        frames, durations = read_frames(os.path.join(SRC_DIR, f'rodolfo-{name}.gif'))
        k = min(pixel_scale(f) for f in frames)
        if k > 1:
            w, h = frames[0].size
            frames = [f.resize((w // k, h // k), Image.NEAREST) for f in frames]
        pal = to_palette(frames)
        out = os.path.join(RODOLFO_OUT, f'{name}.gif')
        pal[0].save(out, save_all=True, append_images=pal[1:], duration=durations,
                    loop=0, disposal=2, transparency=0, optimize=False)
        print(f'rodolfo {name:9} {frames[0].size[0]}x{frames[0].size[1]}  ({len(frames)} cuadros, era {k}x)')


def put(img: Image.Image, x: int, y: int, c) -> None:
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), c)


def line(img, x0, y0, x1, y1, c) -> None:
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        put(img, x0, y0, c)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy; x0 += sx
        if e2 <= dx:
            err += dx; y0 += sy


def sprite(img, x0, y0, rows: list[str], key: dict) -> None:
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in key:
                put(img, x0 + x, y0 + y, key[ch])


def draw_web() -> Image.Image:
    """Telaraña de la esquina superior izquierda (40×40). La derecha es la misma espejada."""
    S = 40
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    rnd = random.Random(31)
    angles = [8, 27, 46, 65, 83]
    radii = [6, 12, 19, 27, 35]

    def at(a, r):
        t = math.radians(a)
        return r * math.cos(t), r * math.sin(t)

    for a in angles:
        x, y = at(a, 44)
        line(img, 0, 0, round(x), round(y), WEB)
    for ri, r in enumerate(radii):
        color = WEB if ri < 3 else WEB_DIM
        for a0, a1 in zip(angles, angles[1:]):
            # la vuelta de afuera está rota en un tramo: telaraña vieja
            if ri == len(radii) - 1 and a0 == angles[1]:
                continue
            p0, p1 = at(a0, r), at(a1, r)
            mid = at((a0 + a1) / 2, r * 0.86)  # cuelga un poco hacia el centro
            line(img, round(p0[0]), round(p0[1]), round(mid[0]), round(mid[1]), color)
            line(img, round(mid[0]), round(mid[1]), round(p1[0]), round(p1[1]), color)
    # hilo suelto colgando del tramo roto
    x, y = at(angles[1], radii[-1])
    line(img, round(x), round(y), round(x) + 1, round(y) + 5, WEB_DIM)
    # gotitas de rocío en algunos cruces
    for a, r in [(46, 12), (27, 19), (65, 27), (8, 12)]:
        x, y = at(a, r)
        put(img, round(x), round(y), DEW)
    rnd.random()
    return img


SPIDER_FRAMES = [
    [
        'l..l.l..l',
        '.l.l.l.l.',
        '..lbbbl..',
        'lllbHbbll',
        '..bbbbb..',
        '.lbEbEbl.',
        'l..bbb..l',
        '..l...l..',
    ],
    [
        '.l.l.l.l.',
        '..ll.ll..',
        'l..bbb..l',
        '.llbHbbl.',
        'l.bbbbb.l',
        '..bEbEb..',
        '.l.bbb.l.',
        'l.......l',
    ],
]

BAT_FRAMES = [
    [
        'B...........B',
        'BB...B.B...BB',
        'BBB..BBB..BBB',
        'BBBBBEBEBBBBB',
        '.BB.BHBBB.BB.',
        '......B......',
    ],
    [
        '.....B.B.....',
        '.....BBB.....',
        '..BBBEBEBBB..',
        '.BBBBHBBBBBB.',
        'BB...BBB...BB',
        'B.....B.....B',
    ],
]


def draw_strip(frames, key) -> Image.Image:
    w, h = len(frames[0][0]), len(frames[0])
    img = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, rows in enumerate(frames):
        sprite(img, i * w, 0, rows, key)
    return img


def draw_bolt() -> Image.Image:
    """Rayo dentado de 14×48 con halo lavanda y una rama."""
    img = Image.new('RGBA', (14, 48), (0, 0, 0, 0))
    main = [(9, 0), (6, 11), (10, 13), (5, 26), (9, 28), (3, 47)]
    branch = [(6, 11), (2, 18), (3, 22)]
    for path in (main, branch):
        for (x0, y0), (x1, y1) in zip(path, path[1:]):
            for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                line(img, x0 + ox, y0 + oy, x1 + ox, y1 + oy, BOLT_GLOW)
    for path in (main, branch):
        for (x0, y0), (x1, y1) in zip(path, path[1:]):
            line(img, x0, y0, x1, y1, BOLT)
    return img


def main() -> None:
    import_costumes()
    os.makedirs(DECO_OUT, exist_ok=True)
    outs = {
        'web': draw_web(),
        'spider': draw_strip(SPIDER_FRAMES, {'l': LEG, 'b': SPIDER, 'H': SPIDER_HI, 'E': EYE}),
        'bat': draw_strip(BAT_FRAMES, {'B': BAT, 'H': BAT_HI, 'E': EYE}),
        'bolt': draw_bolt(),
    }
    for name, img in outs.items():
        path = os.path.join(DECO_OUT, f'{name}.png')
        img.save(path, optimize=True)
        print(f'{name:7} {img.width}x{img.height}  -> {os.path.relpath(path, ROOT)}')


if __name__ == '__main__':
    main()
