"""El Archivista — generador de sprites (jefe 6, de listas a tablas).

Tres propuestas en 64×64 alrededor de la cabeza original
(public/bossicons/archivista.png: una melena naranja con ojos marrones), con
las manos ocupadas por libros y el efecto de la mesa de encantamientos de
Minecraft: runas que vuelan en arco hacia el libro, blancas al salir y
violetas al llegar, y el brillo violeta que barre los libros encantados.

Salida:  public/sprites/archivista/<variante>.png  y  <variante>-defeated.png
Uso:     python scripts/sprites/archivista.py [--preview DIR]
"""
from __future__ import annotations

import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from pixel import Canvas, ROOT, hx, hsh, export  # noqa: E402

HEAD_PATH = os.path.join(ROOT, 'public', 'bossicons', 'archivista.png')
OUT_DIR = os.path.join(ROOT, 'public', 'sprites', 'archivista')
FRAMES = 6

P = {
    'k': hx('0d0714'),
    # túnica violeta oscura
    'v0': hx('140a24'), 'v1': hx('1e1033'), 'v2': hx('2d1a4d'), 'v3': hx('43286e'), 'v4': hx('5e3a96'), 'vr': hx('8a63c9'),
    'au': hx('c9a227'), 'auL': hx('f2d45c'),             # ribete dorado
    # melena (de la cabeza) para las manos
    'h1': hx('a24807'), 'h2': hx('de610b'), 'h3': hx('f47825'), 'h4': hx('f68a43'),
    # libros
    'pg': hx('f1e4c3'), 'pg2': hx('d6c39a'), 'pg3': hx('a8946a'),
    'rd': hx('8b1e1e'), 'rdL': hx('c43a3a'), 'bl': hx('1f3d8b'), 'blL': hx('3a63c4'),
    'gr': hx('1f6b3a'), 'grL': hx('35a35c'), 'br': hx('5a3418'), 'brL': hx('8a5a2e'),
    # encantamiento
    'e0': hx('ffffff'), 'e1': hx('e6d6ff'), 'e2': hx('c09cff'), 'e3': hx('8a5cf0'), 'e4': hx('5b33b8'),
    # mesa de encantamientos
    't1': hx('9c1d1d'), 't2': hx('c43030'), 'ob0': hx('120c1c'), 'ob1': hx('1f1630'), 'ob2': hx('2e2247'),
    'dm': hx('5ce1e6'), 'dmL': hx('c4fdff'),
    'sh': (8, 4, 14, 150),
}

HEAD = Image.open(HEAD_PATH).convert('RGBA').crop((1, 2, 31, 32))   # 30×30, con 1px de contorno negro
HX0, HY0 = 17, 1


def head(cv: Canvas, dy=0, dead=False):
    for y in range(30):
        for x in range(30):
            p = HEAD.getpixel((x, y))
            if p[3] < 128:
                continue
            if dead and p[:3] != (0, 0, 0):
                g = int(sum(p[:3]) / 3 * 0.55)
                p = (g + 6, g, int(g * 0.9), 255)
            cv.px(HX0 + x, HY0 + y + dy, p)


# ── Runas de encantamiento (alfabeto galáctico, simplificado a 3×3) ────────────
GLYPHS = [
    ['#.#', '.#.', '#..'], ['##.', '..#', '##.'], ['#..', '###', '..#'], ['.#.', '#.#', '.#.'],
    ['#.#', '#.#', '.#.'], ['###', '.#.', '.#.'], ['#..', '#.#', '###'], ['.##', '#..', '.##'],
]


def runes(cv: Canvas, f, target, n=8, spread=30, seed=0):
    """Runas que vuelan en arco desde los costados hasta `target`, en bucle
    perfecto: cada una avanza 1/6 de su recorrido por cuadro."""
    tx, ty = target
    for i in range(n):
        side = -1 if i % 2 == 0 else 1
        sx = tx + side * (spread - hsh(i, seed) * 8)
        sy = ty - 6 - hsh(seed, i) * 26
        p = ((f + i * 0.5 + hsh(i, 7) * 3) / FRAMES) % 1.0
        # control: del lado de salida, así entran por el costado y no cruzan la cara
        cx_, cy_ = sx * 0.75 + tx * 0.25, max(sy, ty) + 2
        x = (1 - p) ** 2 * sx + 2 * (1 - p) * p * cx_ + p * p * tx
        y = (1 - p) ** 2 * sy + 2 * (1 - p) * p * cy_ + p * p * ty
        c = 'e0' if p < 0.3 else ('e1' if p < 0.55 else ('e2' if p < 0.8 else 'e3'))
        g = GLYPHS[(i + seed) % len(GLYPHS)]
        if p > 0.9:
            g = ['#']   # al llegar se achica a un punto
        # estela: un punto violeta donde estaba el cuadro anterior
        p0 = max(0.0, p - 1 / FRAMES)
        x0 = (1 - p0) ** 2 * sx + 2 * (1 - p0) * p0 * cx_ + p0 * p0 * tx
        y0 = (1 - p0) ** 2 * sy + 2 * (1 - p0) * p0 * cy_ + p0 * p0 * ty
        if p > 0.12:
            cv.px(round(x0), round(y0), 'e4', solid=False)
        cv.sprite(round(x) - 1, round(y) - 1, g, {'#': c}, solid=False)


def glint(cv: Canvas, x0, y0, w, h, f, strength=0.45):
    """Brillo de encantado: una banda diagonal violeta que barre el objeto."""
    pos = (f / FRAMES) * (w + h + 6) - 3
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            d = (x - x0) + (y - y0) - pos
            if -1.5 <= d <= 1.5 and cv.get(x, y)[3]:
                cv.blend(x, y, 'e2', strength if abs(d) < 0.8 else strength * 0.5)


# ── Libros ────────────────────────────────────────────────────────────────────
def closed_book(cv: Canvas, x0, y0, w, h, cover, light, spine_right=True):
    cv.rect(x0, y0, w, h, cover)
    for x in range(x0, x0 + w):
        cv.px(x, y0, light)
    sx = x0 + w - 2 if spine_right else x0
    for y in range(y0, y0 + h):
        cv.px(sx, y, 'k' if spine_right else light)
        cv.px(sx + (1 if spine_right else 1), y, 'pg' if spine_right else cover)
    # adorno dorado
    cv.px(x0 + w // 2 - 1, y0 + h // 2, 'au'); cv.px(x0 + w // 2, y0 + h // 2, 'auL')


def open_book(cv: Canvas, cx, y0, f, cover='rd', flip=True):
    """Libro abierto visto de frente (16×8) con una hoja que pasa."""
    for x in range(cx - 8, cx + 8):
        d = abs(x + 0.5 - cx)
        lift = 1 if d > 6 else 0
        for y in range(y0 + lift, y0 + 7):
            c = 'pg' if y < y0 + 6 else 'pg2'
            if x in (cx - 1, cx):
                c = 'pg3'
            cv.px(x, y, c)
        cv.px(x, y0 + 7, cover)
    # renglones
    for row in (2, 4):
        for x in list(range(cx - 6, cx - 2)) + list(range(cx + 2, cx + 6)):
            if hsh(x, row) > 0.25:
                cv.px(x, y0 + row, 'pg3')
    if flip:
        # la hoja que pasa: sube por la derecha, cruza y cae a la izquierda
        ph = f % FRAMES
        shapes = {
            1: [(cx + 1, y0 + 1, 5, 4)], 2: [(cx, y0 - 2, 2, 7)], 3: [(cx - 5, y0 - 1, 5, 5)],
        }
        for (x, y, w, h) in shapes.get(ph, []):
            cv.rect(x, y, w, h, 'pg')
            for xx in range(x, x + w):
                cv.px(xx, y, 'e1')


def robe(cv: Canvas, f, top=29, cx=31.5, hw0=13, hw1=19, bottom=61, dy=0, pooled=False):
    for y in range(top, bottom + 1):
        v = (y - top) / (bottom - top)
        hw = hw0 + (hw1 - hw0) * v + (max(0, y - bottom + 5) * 1.5 if pooled else 0)
        for x in range(64):
            t = (x + 0.5 - cx) / hw
            if abs(t) > 1:
                continue
            c = 'v2'
            if t < -0.85:
                c = 'vr'
            elif t < -0.55:
                c = 'v3'
            elif t > 0.7:
                c = 'v1'
            for fo in (-0.4, 0.35):
                ff = fo + math.sin(y / 4 + f * math.pi / 3) * 0.04 * v
                if abs(t - ff) * hw < 0.6 and v > 0.2:
                    c = 'v1'
            if abs(x + 0.5 - cx) < 1.0:
                c = 'au' if y % 4 else 'auL'      # ribete central
            if y == bottom and not pooled:
                c = 'au' if x % 2 else 'v1'        # ruedo bordado
            cv.px(x, y + dy, c)
    # estrellitas bordadas
    for (x, y) in ((24, 46), (39, 52), (27, 56), (36, 41)):
        cv.px(x, y + dy, 'v4')


def paw(cv: Canvas, x0, y0):
    """Mano peluda (como la melena)."""
    cv.sprite(x0, y0, ['.hhh.', 'hHHHh', 'hHHHh', '.h.h.'], {'h': 'h2', 'H': 'h3'})


def sleeve(cv: Canvas, x0, y0, x1, y1):
    """Manga ancha de la túnica, del hombro (x0,y0) a la muñeca (x1,y1)."""
    for t in range(0, 21):
        u = t / 20
        x = round(x0 + (x1 - x0) * u)
        y = round(y0 + (y1 - y0) * u)
        r = 2 + u * 1.6
        for yy in range(int(y - r), int(y + r) + 1):
            for xx in range(int(x - r), int(x + r) + 1):
                if (xx - x) ** 2 + (yy - y) ** 2 <= r * r:
                    cv.px(xx, yy, 'vr' if (yy < y - r * 0.5 and xx < x) else ('v4' if yy < y - r * 0.2 else 'v3'))
    cv.px(x1, y1 + 2, 'au'); cv.px(x1 - 1, y1 + 2, 'au'); cv.px(x1 + 1, y1 + 2, 'au')


def shadow(cv: Canvas, cx, y, hw):
    for x in range(cx - hw, cx + hw + 1):
        cv.px(x, y, 'sh', solid=False)


def scattered_books(cv: Canvas):
    closed_book(cv, 6, 56, 10, 4, 'rd', 'rdL')
    closed_book(cv, 46, 57, 11, 4, 'bl', 'blL', spine_right=False)
    closed_book(cv, 18, 58, 8, 3, 'gr', 'grL')
    open_book(cv, 40, 53, 0, cover='br', flip=False)


# ═════════════════════════════════════════════════════════════════════════════
# 1 · BIBLIOTECARIO — sostiene un libro abierto con las dos manos; las hojas
#     pasan solas y las runas vuelan hacia él.
# ═════════════════════════════════════════════════════════════════════════════
def bibliotecario(f: int, defeated=False):
    cv = Canvas(P)
    dy = 4 if defeated else 0
    robe(cv, f, dy=dy, pooled=defeated)
    head(cv, dy, dead=defeated)
    if defeated:
        scattered_books(cv)
        cv.outline('k')
        shadow(cv, 32, 62, 22)
        return cv.img
    bob = (0, 0, -1, -1, 0, 0)[f]
    sleeve(cv, 19, 32, 21, 42 + bob)
    sleeve(cv, 44, 32, 42, 42 + bob)
    open_book(cv, 32, 40 + bob, f)
    paw(cv, 18, 44 + bob); paw(cv, 41, 44 + bob)
    cv.outline('k')
    glint(cv, 24, 40 + bob, 16, 8, f, 0.3)
    runes(cv, f, (32, 42 + bob), n=12, spread=30, seed=1)
    shadow(cv, 32, 62, 20)
    return cv.img


# ═════════════════════════════════════════════════════════════════════════════
# 2 · TORRE DE LIBROS — abraza una pila de libros que se tambalea; arriba, un
#     libro encantado flota abierto y aletea como el de la mesa.
# ═════════════════════════════════════════════════════════════════════════════
def torre(f: int, defeated=False):
    cv = Canvas(P)
    dy = 4 if defeated else 0
    robe(cv, f, dy=dy, pooled=defeated)
    head(cv, dy, dead=defeated)
    if defeated:
        scattered_books(cv)
        closed_book(cv, 26, 57, 12, 4, 'br', 'brL')
        cv.outline('k')
        shadow(cv, 32, 62, 24)
        return cv.img
    sway = (0, 1, 1, 0, -1, -1)[f]
    books = [('br', 'brL', 18, 4), ('bl', 'blL', 16, 4), ('rd', 'rdL', 17, 3), ('gr', 'grL', 15, 4), ('bl', 'blL', 16, 3), ('rd', 'rdL', 14, 4)]
    y = 59
    stack = []
    for i, (c, l, w, h) in enumerate(books):
        y -= h
        off = round(sway * i / 5) + (1 if i % 2 else -1) * (i % 3 == 0)
        x0 = 32 - w // 2 + off
        closed_book(cv, x0, y, w, h, c, l, spine_right=bool(i % 2))
        stack.append((x0, y, w, h))
    sleeve(cv, 18, 32, 21, 44)
    sleeve(cv, 45, 32, 43, 44)
    paw(cv, 19, 44); paw(cv, 40, 44)
    # libro encantado flotando sobre la cabeza
    fy = 2 + (0, -1, -1, 0, 1, 1)[f]
    open_book(cv, 55, fy + 6, f, cover='rd')
    cv.outline('k')
    glint(cv, 47, fy + 6, 16, 8, f, 0.4)
    for (x0, y0, w, h) in stack[-3:]:
        glint(cv, x0, y0, w, h, f, 0.35)
    runes(cv, f, (55, fy + 8), n=8, spread=14, seed=4)
    shadow(cv, 32, 62, 18)
    return cv.img


# ═════════════════════════════════════════════════════════════════════════════
# 3 · ENCANTADOR — detrás de una mesa de encantamientos; un libro flota abierto
#     sobre ella y las runas salen de los libros que sostiene en cada mano.
# ═════════════════════════════════════════════════════════════════════════════
def table(cv: Canvas, x0, y0, w, h, lit=True):
    # tapa de tela roja
    cv.rect(x0, y0, w, 3, 't2')
    for x in range(x0, x0 + w):
        cv.px(x, y0 + 2, 't1')
    # cuerpo de obsidiana
    for y in range(y0 + 3, y0 + h):
        for x in range(x0, x0 + w):
            c = 'ob1' if hsh(x, y, 3) > 0.25 else 'ob2'
            if x == x0 or x == x0 + w - 1:
                c = 'ob0'
            cv.px(x, y, c)
    # diamantes en las esquinas
    for x in (x0, x0 + w - 3):
        cv.rect(x, y0, 3, 2, 'dm')
        cv.px(x + 1, y0, 'dmL' if lit else 'dm')


def encantador(f: int, defeated=False):
    cv = Canvas(P)
    dy = 4 if defeated else 0
    robe(cv, f, dy=dy, hw1=17, bottom=50 + dy, pooled=False)
    head(cv, dy, dead=defeated)
    table(cv, 16, 48, 32, 14, lit=not defeated)
    if defeated:
        open_book(cv, 32, 41, 0, cover='br', flip=False)
        closed_book(cv, 4, 57, 10, 4, 'bl', 'blL')
        closed_book(cv, 51, 57, 10, 4, 'gr', 'grL', spine_right=False)
        cv.outline('k')
        shadow(cv, 32, 62, 22)
        return cv.img
    # brazos en alto, un libro cerrado en cada mano
    lift = (0, -1, -1, 0, 0, 0)[f]
    sleeve(cv, 18, 32, 9, 30 + lift)
    sleeve(cv, 45, 32, 54, 30 - lift)
    closed_book(cv, 3, 21 + lift, 11, 7, 'bl', 'blL')
    closed_book(cv, 50, 21 - lift, 11, 7, 'gr', 'grL', spine_right=False)
    paw(cv, 6, 27 + lift); paw(cv, 52, 27 - lift)
    # libro flotando sobre la mesa
    by = 38 + (0, -1, -2, -1, 0, 1)[f]
    open_book(cv, 32, by, f, cover='rd')
    cv.outline('k')
    glint(cv, 3, 21 + lift, 11, 7, f, 0.45)
    glint(cv, 50, 21 - lift, 11, 7, (f + 3) % FRAMES, 0.45)
    glint(cv, 24, by, 16, 8, f, 0.3)
    # runas: de cada libro de la mano hacia el libro que flota
    runes(cv, f, (32, by + 2), n=12, spread=25, seed=2)
    shadow(cv, 32, 62, 18)
    return cv.img


VARIANTS = {'bibliotecario': bibliotecario, 'torre': torre, 'encantador': encantador}


def main():
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    export(OUT_DIR, VARIANTS, FRAMES, lambda name, fr: VARIANTS[name](0, defeated=True), preview, 'archivista-board.png')
    print('ok')


if __name__ == '__main__':
    main()
