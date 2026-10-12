"""Oráculo Oscuro — generador de sprites (jefe 8, SELECT · WHERE · ORDER BY).

Tres propuestas en 64×64 a partir de la referencia del docente: una sombra
hecha de bloques negros que flota, con ojos concéntricos (anillo rosa, aro
turquesa, iris rojo), muchas manos de dedos abiertos y pedacitos de oscuridad
que se le desprenden. "Yo veo todo lo que hay en la base de datos": los ojos
recorren las filas como un SELECT.

La arena de combate es oscura, así que la sombra es un negro violáceo (un poco
más claro que el fondo) con contorno negro y luz de borde a la izquierda.

Salida:  public/sprites/oraculo-oscuro/<variante>.png  y  <variante>-defeated.png
Uso:     python scripts/sprites/oraculo.py [--preview DIR]
"""
from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from pixel import Canvas, ROOT, hx, hsh, export  # noqa: E402

OUT_DIR = os.path.join(ROOT, 'public', 'sprites', 'oraculo-oscuro')
FRAMES = 8

P = {
    # sombra: casi negro con un dejo violeta, de lo más hondo a la luz de borde
    'b0': hx('221e30'), 'b1': hx('2c2740'), 'b2': hx('3b3554'), 'b3': hx('524a72'), 'b4': hx('6e6496'),
    'o': hx('07060c'),                                   # contorno negro: recorta en tema claro y oscuro
    # ojo: anillo rosa → aro turquesa → iris rojo → pupila
    'm0': hx('5c0f2e'), 'm1': hx('b3245a'), 'm2': hx('ef3f7a'), 'm3': hx('ff8db0'),
    't1': hx('1f9e86'), 't2': hx('4fe3c1'), 't3': hx('b8fff0'),
    'r1': hx('8f1230'), 'r2': hx('d9283f'), 'p': hx('2a0410'), 'w': hx('ffffff'),
    # derrotado: el ojo se apaga
    'g1': hx('3a3746'), 'g2': hx('5a566a'), 'g3': hx('7d7891'),
    # filas de datos (variantes 2 y 3)
    'd1': hx('2b6f66'), 'd2': hx('4fe3c1'), 'd3': hx('d7fff5'),
    'sh': (6, 4, 12, 120),
}

TAU = math.pi * 2


def bob(f, amp=1.6, phase=0.0):
    return round(math.sin(TAU * (f / FRAMES) + phase) * amp)


# ── Sombra en el piso: se achica cuando el oráculo sube ──────────────────────
def shadow(cv: Canvas, cx, cy, rx, ry=2):
    for y in range(cy - ry, cy + ry + 1):
        for x in range(cx - rx, cx + rx + 1):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / (ry + 0.5)) ** 2
            if d <= 1 and cv.get(x, y)[3] == 0:
                cv.px(x, y, 'sh', solid=False)


# ── Cuerpo de bloques ────────────────────────────────────────────────────────
def body(cv: Canvas, cx, top, bottom, hw_at, seed=0):
    """Columna irregular: cada 3 filas el borde salta un píxel (aspecto de
    bloques), textura de motas y luz de borde a la izquierda."""
    for y in range(top, bottom + 1):
        hw = hw_at(y)
        if hw <= 0:
            continue
        band = (y - top) // 3
        jl = 1 if hsh(band, 1, seed) > 0.62 else 0
        jr = 1 if hsh(band, 2, seed) > 0.62 else 0
        x0, x1 = cx - hw - jl, cx + hw + jr
        for x in range(x0, x1 + 1):
            c = 'b0'
            r = hsh(x // 2, y // 2, seed + 5)
            if r > 0.86:
                c = 'b1'
            if x == x0:
                c = 'b3' if y % 4 else 'b2'
            elif x == x0 + 1 and r > 0.5:
                c = 'b2'
            if x == x1:
                c = 'b1'
            cv.px(x, y, c)


def crown(cv: Canvas, cx, top, seed=0):
    """Puntas irregulares arriba del cuerpo (la cabeza de la referencia)."""
    for i, (dx, h) in enumerate(((-2, 3), (0, 5), (1, 4), (3, 2), (-3, 1))):
        hh = h + (1 if hsh(i, seed) > 0.6 else 0)
        for y in range(top - hh, top):
            cv.px(cx + dx, y, 'b0')
            cv.px(cx + dx + 1, y, 'b1' if y > top - hh else 'b0')
    cv.px(cx - 2, top - 3, 'b3')


# ── Manos ────────────────────────────────────────────────────────────────────
HAND_UP = [
    '#.#.#..',
    '#.#.#..',
    '#.#.#.#',
    '######.',
    '#####..',
    '.###...',
    '..#....',
]


def hand(cv: Canvas, x0, y0, up=True, mirror=False):
    rows = HAND_UP if up else HAND_UP[::-1]
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == '#':
                xx = x0 + (len(row) - 1 - x if mirror else x)
                light = (y == (0 if up else len(rows) - 1)) or (x == 0 and not mirror) or (x == len(row) - 1 and mirror)
                cv.px(xx, y0 + y, 'b2' if light else 'b0')


def arm(cv: Canvas, pts, thick=2):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        cv.line(x0, y0, x1, y1, 'b0')
        if thick > 1:
            cv.line(x0, y0 + 1, x1, y1 + 1, 'b1')


def limb(cv: Canvas, start, elbow, wrist, up=True, mirror=False):
    """Brazo de tres puntos con la mano al final (la muñeca = centro de abajo/arriba de la mano)."""
    arm(cv, [start, elbow, wrist])
    wx, wy = wrist
    hx0 = wx - (4 if mirror else 2)
    if up:
        hand(cv, hx0, wy - 6, up=True, mirror=mirror)
    else:
        hand(cv, hx0, wy, up=False, mirror=mirror)


# ── Ojo concéntrico ──────────────────────────────────────────────────────────
def eye(cv: Canvas, cx, cy, R, look=0.0, lid=0.0, dead=False, glow=True):
    """Anillo rosa (con luz arriba a la derecha), aro turquesa, iris rojo y
    pupila. `look` corre los anillos de adentro (-1..1): el ojo recorre filas.
    `lid` 0..1 baja el párpado."""
    mo, mr, ml, tr, tl, ir, pu = ('m1', 'm2', 'm3', 't2', 't3', 'r2', 'p') if not dead else ('g1', 'g2', 'g3', 'g2', 'g3', 'g1', 'b0')
    ix, iy = cx + look * (R * 0.35), cy
    if glow and not dead:
        for y in range(cy - R - 2, cy + R + 3):
            for x in range(cx - R - 2, cx + R + 3):
                d = math.hypot(x - cx, y - cy)
                if R < d <= R + 1.6 and cv.get(x, y)[3]:
                    cv.blend(x, y, 'm0', 0.55 if d < R + 0.8 else 0.3)
    for y in range(cy - R, cy + R + 1):
        for x in range(cx - R, cx + R + 1):
            d = math.hypot(x - cx, y - cy)
            if d > R + 0.3:
                continue
            di = math.hypot(x - ix, y - iy)
            if d > R - 1.1:
                c = ml if (x - cx) > 0 and (y - cy) < 0 else (mo if (x - cx) < 0 and (y - cy) > 0 else mr)
            elif di <= R * 0.36:
                c = pu if di <= max(0.8, R * 0.16) else ir
            elif di <= R * 0.58:
                c = tl if (x - ix) > 0 and (y - iy) < 0 else tr
            else:
                c = mr
            cv.px(x, y, c)
    if not dead:
        cv.px(round(ix + R * 0.25), cy - round(R * 0.3), 'w')
    # párpado: cubre desde arriba con piel de sombra y una línea de pestaña
    if lid > 0:
        cover = round((2 * R + 1) * lid)
        for y in range(cy - R, cy - R + cover):
            for x in range(cx - R, cx + R + 1):
                if math.hypot(x - cx, y - cy) <= R + 0.3:
                    cv.px(x, y, 'b1')
        ly = cy - R + cover
        for x in range(cx - R, cx + R + 1):
            if math.hypot(x - cx, ly - cy) <= R + 0.3:
                cv.px(x, ly, 'b4' if not dead else 'g2')


# ── Pedacitos de oscuridad que se desprenden y suben ─────────────────────────
def debris(cv: Canvas, f, cx, cy, spread, n=10, seed=0, rise=26):
    for i in range(n):
        side = -1 if i % 2 else 1
        bx = cx + side * (4 + hsh(i, seed) * spread)
        by = cy + 14 - hsh(seed, i) * 10
        p = ((f / FRAMES) + hsh(i, seed + 3)) % 1.0
        x = round(bx + math.sin(TAU * p + i) * 1.2)
        y = round(by - p * rise)
        size = 2 if hsh(i, 9, seed) > 0.55 and p < 0.6 else 1
        c = 'b3' if p < 0.5 else 'b2'
        for yy in range(size):
            for xx in range(size):
                if cv.get(x + xx, y + yy)[3] == 0:
                    cv.px(x + xx, y + yy, c, solid=False)


def scan(f, phase=0.0):
    """Barrido de un SELECT: va y viene de izquierda a derecha."""
    return math.sin(TAU * (f / FRAMES) + phase)


def blink_at(f, frame):
    """Párpado para un parpadeo que dura 3 cuadros centrado en `frame`."""
    d = (f - frame) % FRAMES
    return {0: 0.55, 1: 1.0, 2: 0.45}.get(d, 0.0)


# ═════════════════════════════════════════════════════════════════════════════
# 1 · VIGÍA — fiel a la referencia: columna de dos ojos, seis manos (dos
#     arriba, dos al costado, dos colgando como patas). Los ojos barren en
#     direcciones opuestas y se turnan para parpadear.
# ═════════════════════════════════════════════════════════════════════════════
def vigia(f: int, defeated=False):
    cv = Canvas(P)
    dy = 6 if defeated else bob(f)
    cx = 32

    def hw(y):
        y0 = y - dy
        if y0 < 12: return 0
        if y0 < 16: return 3
        if y0 < 30: return 7
        if y0 < 32: return 5
        if y0 < 45: return 7
        if y0 < 48: return 4
        return 0

    wave = 0 if defeated else bob(f, 1.2, 1.3)
    wave2 = 0 if defeated else bob(f, 1.2, 3.0)
    if defeated:
        # brazos caídos, manos abiertas en el piso
        limb(cv, (27, 16 + dy), (21, 22 + dy), (18, 30 + dy), up=False)
        limb(cv, (37, 16 + dy), (43, 22 + dy), (46, 30 + dy), up=False, mirror=True)
        limb(cv, (26, 31 + dy), (16, 36 + dy), (11, 44 + dy), up=False)
        limb(cv, (38, 31 + dy), (48, 36 + dy), (53, 44 + dy), up=False, mirror=True)
        limb(cv, (28, 47 + dy), (24, 50 + dy), (20, 52 + dy), up=False)
        limb(cv, (36, 47 + dy), (40, 50 + dy), (44, 52 + dy), up=False, mirror=True)
    else:
        limb(cv, (28, 15 + dy), (22, 13 + dy), (20, 8 + dy + wave), up=True)
        limb(cv, (36, 15 + dy), (42, 13 + dy), (44, 8 + dy - wave), up=True, mirror=True)
        limb(cv, (27, 30 + dy), (17, 31 + dy), (12, 24 + dy + wave2), up=True)
        limb(cv, (37, 30 + dy), (47, 31 + dy), (52, 24 + dy - wave2), up=True, mirror=True)
        limb(cv, (28, 46 + dy), (25, 50 + dy), (23, 53 + dy - wave), up=False)
        limb(cv, (36, 46 + dy), (39, 50 + dy), (41, 53 + dy + wave), up=False, mirror=True)
    body(cv, cx, 12 + dy, 47 + dy, hw, seed=1)
    crown(cv, cx, 12 + dy, seed=1)
    cv.outline('o')
    if defeated:
        eye(cv, cx, 23 + dy, 6, lid=1.0, dead=True)
        eye(cv, cx, 38 + dy, 6, lid=1.0, dead=True)
        for i, x in enumerate((14, 19, 45, 50, 27, 38)):
            cv.px(x, 60 - (i % 2), 'b3')
        shadow(cv, 32, 61, 18)
        return cv.img
    eye(cv, cx, 23 + dy, 6, look=scan(f), lid=blink_at(f, 5))
    eye(cv, cx, 38 + dy, 6, look=-scan(f), lid=blink_at(f, 1))
    debris(cv, f, cx, 30 + dy, 14, n=12, seed=1)
    shadow(cv, 32, 61, 13 - dy)
    return cv.img


# ═════════════════════════════════════════════════════════════════════════════
# 2 · CONSULTA — tres ojos en columna (SELECT, WHERE, ORDER BY) y filas de
#     datos que orbitan a su alrededor; la que pasa por delante se ilumina.
# ═════════════════════════════════════════════════════════════════════════════
ROW = ['#########', '#d#ddd#d#', '#########']


def data_row(cv: Canvas, x, y, lit, flash=False):
    frame = 'd3' if flash else ('d2' if lit else 'b3')
    cell = 'd3' if flash else ('d1' if lit else 'b2')
    cv.sprite(x - 4, y - 1, ROW, {'#': frame, 'd': cell}, solid=False)


def orbit(f, k, n, cx, cy, rx, ry):
    a = TAU * (f / FRAMES + k / n)
    return round(cx + rx * math.cos(a)), round(cy + ry * math.sin(a)), math.sin(a) > 0


def consulta(f: int, defeated=False):
    cv = Canvas(P)
    dy = 6 if defeated else bob(f, 1.4)
    cx = 32
    rows = [] if defeated else [orbit(f, k, 3, cx, 30 + dy, 23, 6) for k in range(3)]
    for x, y, front in rows:
        if not front:
            data_row(cv, x, y, lit=False)

    def hw(y):
        y0 = y - dy
        if y0 < 9: return 0
        if y0 < 13: return 3
        if y0 < 45: return 5 + (1 if 23 <= y0 <= 35 else 0)
        if y0 < 49: return 3
        return 0

    wave = 0 if defeated else bob(f, 1.2, 2.0)
    if defeated:
        limb(cv, (28, 13 + dy), (22, 20 + dy), (19, 29 + dy), up=False)
        limb(cv, (36, 13 + dy), (42, 20 + dy), (45, 29 + dy), up=False, mirror=True)
        limb(cv, (28, 47 + dy), (23, 51 + dy), (19, 52 + dy), up=False)
        limb(cv, (36, 47 + dy), (41, 51 + dy), (45, 52 + dy), up=False, mirror=True)
    else:
        limb(cv, (28, 13 + dy), (21, 12 + dy), (18, 7 + dy + wave), up=True)
        limb(cv, (36, 13 + dy), (43, 12 + dy), (46, 7 + dy - wave), up=True, mirror=True)
        limb(cv, (28, 47 + dy), (24, 51 + dy), (22, 54 + dy - wave), up=False)
        limb(cv, (36, 47 + dy), (40, 51 + dy), (42, 54 + dy + wave), up=False, mirror=True)
    body(cv, cx, 9 + dy, 48 + dy, hw, seed=4)
    crown(cv, cx, 9 + dy, seed=4)
    cv.outline('o')
    ys = (18, 29, 40)
    if defeated:
        for y in ys:
            eye(cv, cx, y + dy, 4, lid=1.0, dead=True)
        for i, x in enumerate((10, 16, 24, 41, 49, 55)):
            data_row(cv, x, 59 + (i % 2), lit=False) if i in (0, 5) else cv.px(x, 60, 'b3')
        shadow(cv, 32, 61, 18)
        return cv.img
    # cada ojo mira hacia la fila de adelante más cercana
    front_rows = [(x, y) for x, y, fr in rows if fr]
    for i, y in enumerate(ys):
        target = min(front_rows, key=lambda r: abs(r[1] - (y + dy)))[0] if front_rows else cx
        look = max(-1.0, min(1.0, (target - cx) / 14))
        eye(cv, cx, y + dy, 4, look=look, lid=blink_at(f, (2 + i * 3) % FRAMES))
    for x, y, front in rows:
        if front:
            data_row(cv, x, y, lit=True, flash=abs(x - cx) <= 3)
    debris(cv, f, cx, 30 + dy, 12, n=8, seed=4)
    shadow(cv, 32, 61, 12 - dy)
    return cv.img


# ═════════════════════════════════════════════════════════════════════════════
# 3 · GRAN OJO — un solo ojo enorme en un cuerpo ancho, coronado de manos. Su
#     mirada es un haz turquesa que barre una tabla flotante (un WHERE): la
#     fila que toca se enciende.
# ═════════════════════════════════════════════════════════════════════════════
TABLE_ROWS = 3


def gran_ojo(f: int, defeated=False):
    cv = Canvas(P)
    dy = 5 if defeated else bob(f, 1.2)
    cx = 32

    def hw(y):
        y0 = y - dy
        if y0 < 8: return 0
        if y0 < 11: return 6
        if y0 < 13: return 9
        if y0 < 31: return 12 - (1 if y0 in (13, 30) else 0)
        if y0 < 35: return 9
        if y0 < 37: return 5
        return 0

    w1 = 0 if defeated else bob(f, 1.2, 0.8)
    w2 = 0 if defeated else bob(f, 1.2, 2.4)
    if defeated:
        limb(cv, (24, 12 + dy), (16, 14 + dy), (11, 22 + dy), up=False)
        limb(cv, (40, 12 + dy), (48, 14 + dy), (53, 22 + dy), up=False, mirror=True)
        limb(cv, (21, 24 + dy), (12, 28 + dy), (7, 34 + dy), up=False)
        limb(cv, (43, 24 + dy), (52, 28 + dy), (57, 34 + dy), up=False, mirror=True)
    else:
        limb(cv, (26, 10 + dy), (21, 6 + dy), (20, 5 + dy + w1), up=True)
        limb(cv, (38, 10 + dy), (43, 6 + dy), (44, 5 + dy - w1), up=True, mirror=True)
        limb(cv, (21, 16 + dy), (13, 15 + dy), (9, 12 + dy + w2), up=True)
        limb(cv, (43, 16 + dy), (51, 15 + dy), (55, 12 + dy - w2), up=True, mirror=True)
        limb(cv, (22, 30 + dy), (15, 34 + dy), (11, 36 + dy - w1), up=False)
        limb(cv, (42, 30 + dy), (49, 34 + dy), (53, 36 + dy + w1), up=False, mirror=True)
    body(cv, cx, 8 + dy, 36 + dy, hw, seed=7)
    crown(cv, cx, 8 + dy, seed=7)

    # tabla flotante (3 filas × 2 columnas)
    tx0, ty0, tw = 21, 47, 23
    tdy = 0 if defeated else bob(f, 0.8, 1.6)
    beam_x = cx + round(scan(f) * 9)
    lit_row = None if defeated else (f // 2) % TABLE_ROWS
    for r in range(TABLE_ROWS):
        y = ty0 + tdy + r * 4
        on = r == lit_row
        for x in range(tx0, tx0 + tw):
            edge = x in (tx0, tx0 + tw - 1, tx0 + 8)
            c = ('d3' if edge else 'd2') if on else ('b4' if edge else 'b2')
            cv.px(x, y, c)
            cv.px(x, y + 1, c if edge else ('d1' if on else 'b1'))
            cv.px(x, y + 2, 'd3' if (on and edge) else ('b4' if edge else ('d2' if on else 'b3')))
    cv.outline('o')

    ey = 21 + dy
    if defeated:
        eye(cv, cx, ey, 8, lid=1.0, dead=True)
        shadow(cv, 32, 61, 16)
        return cv.img
    eye(cv, cx, ey, 8, look=scan(f), lid=blink_at(f, 6))
    # haz: cono tramado desde la pupila hasta la fila encendida
    sx, sy = cx + round(scan(f) * 3), ey + 4
    ty = ty0 + tdy + (lit_row or 0) * 4
    for y in range(sy + 5, ty):
        k = (y - sy) / max(1, ty - sy)
        half = 1 + round(k * 4)
        mx = round(sx + (beam_x - sx) * k)
        for x in range(mx - half, mx + half + 1):
            if (x + y) % 2 == 0 and cv.get(x, y)[3] == 0:
                cv.px(x, y, 't1' if abs(x - mx) > half - 1 else 't2', solid=False)
    debris(cv, f, cx, 18 + dy, 16, n=10, seed=7, rise=20)
    shadow(cv, 32, 61, 13)
    return cv.img


VARIANTS = {'vigia': vigia, 'consulta': consulta, 'gran-ojo': gran_ojo}


def main():
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    export(OUT_DIR, VARIANTS, FRAMES, lambda name, fr: VARIANTS[name](0, defeated=True), preview, 'oraculo-board.png')
    print('ok')


if __name__ == '__main__':
    main()
