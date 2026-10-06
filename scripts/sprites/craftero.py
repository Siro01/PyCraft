"""Maestro Craftero — generador de sprites (jefe 5, funciones con parámetros).

Tres propuestas en 64×64 alrededor de la cabeza original
(public/bossicons/maestro-craftero.png: un bloque negro con ojos y boca
blancos), con cuerpo completamente oscuro, capucha y capa.

Para que un cuerpo negro se lea sobre la arena negra: rampas casi negras,
una luz de borde fría del lado izquierdo y el blanco de los ojos como único
brillo. El verde del jefe (#15803D) es lo que el Maestro fabrica: la función
recibe parámetros y devuelve un resultado.

Salida:  public/sprites/maestro-craftero/<variante>.png  y  <variante>-defeated.png
Uso:     python scripts/sprites/craftero.py [--preview DIR]
"""
from __future__ import annotations

import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from pixel import Canvas, ROOT, W, H, hx, hsh, export  # noqa: E402

HEAD_PATH = os.path.join(ROOT, 'public', 'bossicons', 'maestro-craftero.png')
OUT_DIR = os.path.join(ROOT, 'public', 'sprites', 'maestro-craftero')
FRAMES = 6

P = {
    'k': hx('000000'),
    'o': hx('34384a'),           # contorno exterior: un gris frío apenas más claro que la arena
    'd0': hx('050507'), 'd1': hx('0c0c11'), 'd2': hx('14141b'), 'd3': hx('1d1d26'),
    'd4': hx('282834'), 'd5': hx('363645'),
    'rim': hx('59607e'), 'rimL': hx('8b92b3'),
    'W': hx('ffffff'), 'w2': hx('c9cbd6'), 'w3': hx('6d7082'), 'w4': hx('3b3d4a'),
    'g0': hx('0b3d1f'), 'g1': hx('15803d'), 'g2': hx('22c55e'), 'g3': hx('86efac'), 'g4': hx('e3fdea'),
    'b1': hx('3b2a1c'), 'b2': hx('6b4a2b'),       # madera (palos de la receta)
    'e1': hx('ff9a4a'), 'e2': hx('ffe1a3'),       # chispas
}

HEAD = Image.open(HEAD_PATH).convert('RGBA')
HX0, HY0 = 16, 7   # la cabeza (contenido 28×29) queda en x 18..45, y 8..36


def head(cv: Canvas, dy=0, eyes='W', blink=False, halo=0):
    for y in range(32):
        for x in range(32):
            p = HEAD.getpixel((x, y))
            if p[3] < 128:
                continue
            if p[:3] == (255, 255, 255):
                is_eye = y < 15
                if is_eye and blink:
                    c = 'd0' if y != 9 else 'w3'
                else:
                    c = eyes if is_eye else ('w2' if eyes == 'W' else 'w4')
                cv.px(HX0 + x, HY0 + y + dy, c)
            else:
                cv.px(HX0 + x, HY0 + y + dy, 'k')
    if halo and not blink:
        # halo de los ojos: un anillo tenue alrededor de cada ojo de 4×4
        for ex in (6, 22):
            for (x, y) in [(i, -1) for i in range(4)] + [(i, 4) for i in range(4)] + [(-1, j) for j in range(4)] + [(4, j) for j in range(4)]:
                cv.px(HX0 + ex + x, HY0 + 7 + y + dy, 'w4' if halo == 1 else 'w3')
            for (x, y) in ((-1, -1), (4, -1), (-1, 4), (4, 4)):
                cv.px(HX0 + ex + x, HY0 + 7 + y + dy, 'd4')


def hood_back(cv: Canvas, dy=0):
    """Capucha (detrás de la cabeza): pico doblado arriba, cae a los lados."""
    cx = 31.5
    for y in range(0, 40):
        if y < 10:
            hw = 3 + y * 1.65
            ccx = cx + 4 * (1 - y / 10) ** 2     # el pico se dobla a la derecha
        else:
            hw, ccx = 19.5, cx
        for x in range(64):
            t = (x + 0.5 - ccx) / hw
            if abs(t) > 1:
                continue
            c = 'd3'
            if t < -0.86:
                c = 'rim'
            elif t < -0.66:
                c = 'd4'
            elif t > 0.8:
                c = 'd1'
            elif t > 0.55:
                c = 'd2'
            if y < 9 and 0.05 < t < 0.18:
                c = 'd2'   # pliegue del pico
            cv.px(x, y + dy, c)


def hood_brim(cv: Canvas, dy=0):
    """Ala de la capucha: tapa la frente (las 3 primeras filas de la cabeza) y la ensombrece."""
    for x in range(HX0 + 1, HX0 + 31):
        sag = 1 if 22 <= x <= 41 else 0
        for y in range(8, 11 + sag):
            cv.px(x, y + dy, 'd3' if x > HX0 + 4 else 'd4')
        cv.px(x, 11 + sag + dy, 'd5' if x < 40 else 'd4')
    for y in range(8, 37):  # sombra de la abertura a los lados de la cara
        cv.px(HX0 + 1, y + dy, 'd0'); cv.px(HX0 + 30, y + dy, 'd0')


def collar(cv: Canvas, dy=0):
    """Cuello alto de la capa: dos picos que enmarcan la capucha."""
    for side in (-1, 1):
        for k in range(14):
            hw = k * 0.45
            cxk = 31.5 + side * (24 - k * 0.5)
            for x in range(64):
                if abs(x + 0.5 - cxk) <= hw + 0.5:
                    c = 'rim' if (side < 0 and x + 0.5 < cxk - hw + 1) else ('d1' if side > 0 else 'd3')
                    cv.px(x, 22 + k + dy, c)


def hood(cv: Canvas, dy=0):
    collar(cv, dy)
    hood_back(cv, dy)


def cloak(cv: Canvas, f, top=29, cx=31.5, hw0=19.5, hw1=27.5, bottom=62, slit=True, dy=0, pooled=False):
    """Capa: se ensancha hacia abajo; ruedo deshilachado que ondula; pliegues verticales."""
    for y in range(top, bottom + 1):
        v = (y - top) / (bottom - top)
        hw = hw0 + (hw1 - hw0) * (v ** 0.8)
        if pooled:
            hw += max(0, (y - (bottom - 6))) * 1.2
        for x in range(64):
            t = (x + 0.5 - cx) / hw
            if abs(t) > 1:
                continue
            # ruedo deshilachado: cada columna corta en otra altura, y ondula con el cuadro
            ragged = int(hsh(x, 3) * 4 + math.sin(x * 0.7 + f * math.pi / 3) * 1.4)
            if y > bottom - max(0, ragged) and not pooled:
                continue
            c = 'd2'
            if t < -0.9:
                c = 'rim'
            elif t < -0.72:
                c = 'd4'
            elif t < -0.35:
                c = 'd3'
            elif t > 0.75:
                c = 'd1'
            # pliegues: líneas oscuras que se mecen
            for fo in (-0.55, -0.15, 0.32, 0.62):
                ff = fo + math.sin(y / 5 + f * math.pi / 3 + fo * 4) * 0.035 * v
                if abs(t - ff) * hw < 0.6 and v > 0.12:
                    c = 'd1' if t > -0.6 else 'd2'
                elif 0.6 <= (ff - t) * hw < 1.6 and v > 0.12 and t < 0.2:
                    c = 'd4' if t < -0.3 else 'd3'
            if slit and abs(x + 0.5 - cx) < 1.2 + v * 3.0 and y > top + 5:
                c = 'd0'
            cv.px(x, y + dy, c)


def claw(cv: Canvas, x0, y0, side=1, lit=False):
    """Mano: guante negro con garras largas y blancas que apuntan hacia abajo."""
    cv.sprite(x0, y0, [
        '.ddddd.',
        'ddddddd',
        'ddddddd',
        'w.w.w.w',
        'w.w.w.w',
        '..w...w' if side > 0 else 'w...w..',
    ], {'d': 'd3', 'w': 'W' if lit else 'w2'})
    for y in range(y0, y0 + 3):
        cv.px(x0 if side > 0 else x0 + 6, y, 'rim' if side > 0 else 'd1')


def finish(cv: Canvas):
    cv.outline('o')


def glow(cv: Canvas, cx, cy, r, c, k):
    """Luz que tiñe solo la tela oscura, en dos escalones (sin degradé suave)."""
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            d = math.hypot(x - cx, y - cy)
            px_ = cv.get(x, y)
            if d > r or px_[3] == 0 or sum(px_[:3]) > 200:
                continue
            cv.blend(x, y, c, k if d < r * 0.6 else k * 0.5)


# ═════════════════════════════════════════════════════════════════════════════
# 1 · SOMBRA DEL TALLER — una mesa de crafteo flota frente a él: los parámetros
#     entran en la grilla uno por uno y la función devuelve un pico verde.
# ═════════════════════════════════════════════════════════════════════════════
GEM = ['.g.', 'ggG', '.G.']
STICK = ['..b', '.b.', 'b..']
PICK = [
    '.ggggg.',
    'g.gGg.g',
    '...b...',
    '...b...',
    '...b...',
    '...b...',
]


def taller(f: int, defeated=False):
    cv = Canvas(P)
    dy = 4 if defeated else 0
    hood(cv, dy)
    cloak(cv, f if not defeated else 0, top=36 + dy, pooled=defeated)
    head(cv, dy, eyes='w4' if defeated else 'W', blink=(f == 5 and not defeated), halo=0 if defeated else (1, 1, 2, 2, 1, 0)[f])
    hood_brim(cv, dy)
    gx, gy = 22, 39
    if not defeated:
        # mesa de crafteo flotante 3×3 (celdas de 5px)
        bob = (0, 0, -1, -1, 0, 0)[f]
        gy += bob
        cv.rect(gx, gy, 19, 19, 'd5')
        for i in range(3):
            for j in range(3):
                cv.rect(gx + 1 + i * 6, gy + 1 + j * 6, 5, 5, 'd0')
        # receta: tres gemas arriba, dos palos en la columna del medio
        slots = [((0, 0), GEM), ((1, 0), GEM), ((2, 0), GEM), ((1, 1), STICK), ((1, 2), STICK)]
        n = (0, 3, 4, 5, 5, 5)[f]
        for (i, j), spr in slots[:n]:
            cv.sprite(gx + 2 + i * 6, gy + 2 + j * 6, spr, {'g': 'g2', 'G': 'g1', 'b': 'b2'})
        # garras sosteniendo la mesa
        claw(cv, gx - 8, gy + 4, 1, lit=f >= 4)
        claw(cv, gx + 20, gy + 4, -1, lit=f >= 4)
        # resultado: el pico aparece arriba a la derecha (return)
        if f >= 4:
            rx, ry = 53, 41 + (0 if f == 4 else -1)
            cv.sprite(rx, ry, PICK, {'g': 'g3' if f == 5 else 'g2', 'G': 'g4', 'b': 'b2'})
    else:
        # la mesa cae rota: celdas sueltas en el piso
        for k, (x, y) in enumerate(((14, 57), (22, 59), (40, 58), (47, 56), (31, 60))):
            cv.rect(x, y, 4, 3, 'd5'); cv.rect(x + 1, y + 1, 2, 1, 'd0')
        cv.sprite(52, 57, GEM, {'g': 'g1', 'G': 'g0'})
    finish(cv)
    if not defeated:
        glow(cv, gx + 9, gy + 9, 14, 'g1', 0.14 if f < 4 else 0.24)
        if f >= 4:
            glow(cv, 56, 44, 7, 'g1', 0.3)
            for (sx, sy) in ((52, 40), (61, 42), (57, 38)):
                cv.px(sx, sy - (f - 4), 'g3', solid=False)
    return cv.img


# ═════════════════════════════════════════════════════════════════════════════
# 2 · HERRERO OSCURO — martillo y yunque: cada golpe forja una hoja verde al
#     rojo. Las chispas son lo único que ilumina la capa.
# ═════════════════════════════════════════════════════════════════════════════
def hammer(cv: Canvas, hx_, hy_, tx, ty):
    cv.line(hx_, hy_, tx, ty, 'd4')
    cv.line(hx_ + 1, hy_, tx + 1, ty, 'd2')
    dx, dy = tx - hx_, ty - hy_
    L = math.hypot(dx, dy) or 1
    ux, uy = dx / L, dy / L
    px_, py_ = -uy, ux
    for s in range(-5, 6):
        for d in range(0, 6):
            x = round(tx + px_ * s + ux * d)
            y = round(ty + py_ * s + uy * d)
            c = 'd4' if d < 2 else 'd3'
            if s == -5 or d == 0:
                c = 'rim'
            if s == 5:
                c = 'd1'
            cv.px(x, y, c)


def herrero(f: int, defeated=False):
    cv = Canvas(P)
    dy = 4 if defeated else 0
    hood(cv, dy)
    cloak(cv, f if not defeated else 0, top=36 + dy, cx=30.5, hw0=20, hw1=27, pooled=defeated)
    head(cv, dy, eyes='w4' if defeated else 'W', blink=(f == 2 and not defeated), halo=0 if defeated else (1, 1, 0, 2, 2, 1)[f])
    hood_brim(cv, dy)
    # yunque
    ax, ay = 19, 49
    cv.sprite(ax, ay, [
        'rrrrrrrrrrrrrrrrrrrrrr',
        '.aaaaaaaaaaaaaaaaaaaa.',
        '...aaaaaaaaaaaaaaaa...',
        '.......aaaaaaaa.......',
        '.......aaaaaaaa.......',
        '......aaaaaaaaaa......',
        '....aaaaaaaaaaaaaa....',
        '....bbbbbbbbbbbbbb....',
    ], {'r': 'rim', 'a': 'd4', 'b': 'd2'})
    strike = f in (3, 4) and not defeated
    hot = 'g4' if f == 3 else ('g3' if f in (4, 5) else 'g2')
    if defeated:
        hot = 'g0'
    # hoja que se forja sobre el yunque
    for x in range(ax + 6, ax + 17):
        cv.px(x, ay - 1, hot)
    cv.px(ax + 17, ay - 1, 'g1' if not defeated else 'd3')
    cv.rect(ax + 3, ay - 2, 3, 2, 'b2')   # mango de la hoja
    if not defeated:
        # brazo izquierdo sostiene la hoja con pinzas
        claw(cv, ax - 4, ay - 6, 1)
        cv.line(ax - 1, ay - 3, ax + 4, ay - 2, 'd4')
        # martillo (brazo derecho)
        poses = {0: ((48, 34), (54, 12)), 1: ((48, 33), (55, 11)), 2: ((47, 37), (52, 26)),
                 3: ((46, 41), (37, 43)), 4: ((46, 41), (37, 43)), 5: ((48, 36), (53, 20))}
        (h1, h2) = poses[f]
        hammer(cv, h1[0], h1[1], h2[0], h2[1])
        claw(cv, h1[0] - 2, h1[1] - 1, -1)
    else:
        hammer(cv, 46, 60, 58, 58)
    finish(cv)
    if strike:
        sparks = [(30, 42), (33, 40), (40, 41), (27, 45), (44, 44), (35, 38), (24, 43)] if f == 3 else [(28, 39), (42, 37), (22, 41), (46, 40)]
        for i, (sx, sy) in enumerate(sparks):
            cv.px(sx, sy, ('W', 'e2', 'g3', 'e1')[i % 4], solid=False)
        glow(cv, ax + 12, ay - 2, 15, 'g1', 0.26 if f == 3 else 0.12)
    elif not defeated:
        glow(cv, ax + 12, ay - 1, 9, 'g1', 0.18)
    return cv.img


# ═════════════════════════════════════════════════════════════════════════════
# 3 · SEÑOR DE LAS RECETAS — la capa se abre como alas; en el pecho brilla
#     `def` y tres parámetros (cubos verdes) orbitan alrededor.
# ═════════════════════════════════════════════════════════════════════════════
_D = ['..#', '..#', '###', '#.#', '#.#', '###']
_E = ['...', '###', '#.#', '###', '#..', '###']
_F = ['.##', '#..', '###', '#..', '#..', '#..']
DEF = [d + '.' + e + '.' + f for d, e, f in zip(_D, _E, _F)]  # "def" en minúscula, 11×6
CUBE = ['.gg.', 'gGGg', 'gGGh', '.hh.']


def wings(cv: Canvas, f, dy=0, droop=0):
    """La capa abierta como alas de murciélago: borde de arriba que sube hacia la
    punta, borde de abajo en festones, costillas desde el hombro."""
    flap = (0, -1, -2, -1, 0, 1)[f]
    for side in (-1, 1):
        sx, sy = 31.5 + side * 12, 27          # hombro
        tip = (31.5 + side * 31, 16 + flap + droop)  # punta superior
        def top_y(u):
            return sy + (tip[1] - sy) * u - math.sin(u * math.pi) * 2
        for x in range(64):
            u = (x + 0.5 - sx) / (tip[0] - sx)
            if not 0 <= u <= 1:
                continue
            ty = top_y(u)
            # festones: tres arcos entre las costillas
            seg = u * 3
            scal = math.sin((seg - math.floor(seg)) * math.pi)
            by = 56 - u * 22 - scal * 5 + flap * u + droop * u
            for y in range(int(math.ceil(ty)), int(by) + 1):
                v = (y - ty) / max(1, by - ty)
                c = 'd3' if side < 0 else 'd2'
                if v < 0.15:
                    c = 'd4' if side < 0 else 'd3'
                if y - ty < 1:
                    c = 'rim' if side < 0 else 'd4'
                cv.px(x, y + dy, c)
        # costillas: del hombro a cada punta de festón
        for k in (1, 2, 3):
            u = k / 3
            ex = round(sx + (tip[0] - sx) * u)
            ey = round(top_y(u)) if k == 3 else round(56 - u * 22 + flap * u + droop * u)
            cv.line(round(sx), sy + dy, ex, ey + dy, 'd5' if side < 0 else 'd4')
        # garra en la punta del ala
        cv.px(round(tip[0]), tip[1] - 1 + dy, 'w3')


def senor(f: int, defeated=False):
    cv = Canvas(P)
    dy = 4 if defeated else 0
    rot = f * (2 * math.pi / 3) / FRAMES   # tres cubos iguales: un tercio de vuelta por ciclo
    cubes = []
    if not defeated:
        for k in range(3):
            a = rot + k * 2 * math.pi / 3
            cubes.append((round(31.5 + math.cos(a) * 26) - 2, round(52 + math.sin(a) * 5) - 2, math.sin(a)))
    key = {'g': 'g2', 'G': 'g3', 'h': 'g1'}
    for (x, y, z) in cubes:   # los de atrás, antes del cuerpo
        if z < 0:
            cv.sprite(x, y, CUBE, {'g': 'g1', 'G': 'g2', 'h': 'g0'})
    wings(cv, f if not defeated else 0, dy, droop=6 if defeated else 0)
    hood(cv, dy)
    cloak(cv, f if not defeated else 0, top=36 + dy, hw0=14, hw1=17, slit=False, pooled=defeated)
    head(cv, dy, eyes='w4' if defeated else 'W', blink=(f == 4 and not defeated), halo=0 if defeated else (1, 2, 2, 1, 0, 1)[f])
    hood_brim(cv, dy)
    # def en el pecho
    glow_c = 'w4' if defeated else ('g2', 'g3', 'g4', 'g3', 'g2', 'g2')[f]
    cv.rect(25, 40 + dy, 15, 10, 'd0')
    cv.sprite(27, 42 + dy, DEF, {'#': glow_c})
    # garras abiertas a los lados (lanzan los parámetros)
    if not defeated:
        claw(cv, 12, 47 + (0, 0, -1, -1, 0, 0)[f], 1)
        claw(cv, 45, 47 + (0, -1, -1, 0, 0, 0)[f], -1)
    for (x, y, z) in cubes:
        if z >= 0:
            cv.sprite(x, y, CUBE, key)
    finish(cv)
    if not defeated:
        glow(cv, 32, 45, 11, 'g1', 0.2 if f in (1, 2, 3) else 0.1)
        # estela de los cubos de adelante
        for (x, y, z) in cubes:
            if z >= 0:
                cv.px(x + 4, y + 1, 'g1', solid=False)
    return cv.img


VARIANTS = {'taller': taller, 'herrero': herrero, 'senor': senor}


def main():
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    export(OUT_DIR, VARIANTS, FRAMES, lambda name, fr: VARIANTS[name](0, defeated=True), preview, 'craftero-board.png')
    print('ok')


if __name__ == '__main__':
    main()
