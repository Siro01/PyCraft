"""Mercader del Abismo — El Farolero (jefe 4 y dueño de la tienda).

Diseño propio con la atmósfera tenebrosa del Mercader: capucha alta en punta,
cara de vacío con tres ojos-estrella que titilan, manos de hueso y el farol
colgando de un bastón por encima de la cabeza. Píxel a píxel, 64×64, 8 cuadros.

Tres variantes (ver STYLES):
  clasico  — manto gris verdoso, bastón recto, farol-jaula, frascos y llavero.
  abisal   — azul petróleo, cayado curvo con un farol-boya, cadena con llaves,
             jirones largos que ondulan como algas y burbujas que suben.
  ermitano — ciruela ceniza, bastón nudoso de raíz, una jaula con tres
             luciérnagas cian por farol, parches cosidos y una campanita.

Salida:  public/sprites/mercader-abismo/<variante>.png  y  <variante>-defeated.png
Uso:     python scripts/sprites/mercader.py [--preview DIR]
"""
from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from pixel import Canvas, ROOT, hx, hsh, export  # noqa: E402

OUT_DIR = os.path.join(ROOT, 'public', 'sprites', 'mercader-abismo')
FRAMES = 8
TAU = math.pi * 2

P = {
    'k': hx('07080c'),
    'v': hx('020203'),                                            # el vacío
    # manto gris verdoso (clásico)
    'a0': hx('141a1c'), 'a1': hx('1f2a2c'), 'a2': hx('2c3b3c'), 'a3': hx('3e5150'), 'a4': hx('587069'),
    # manto ciruela ceniza (ermitaño)
    'p0': hx('170f1f'), 'p1': hx('24172f'), 'p2': hx('342243'), 'p3': hx('4a3260'), 'p4': hx('664883'),
    # manto azul petróleo (abisal)
    'm0': hx('0b1420'), 'm1': hx('122033'), 'm2': hx('1a3049'), 'm3': hx('284766'), 'm4': hx('3c668c'),
    # luz cian del Abismo
    'c0': hx('16708c'), 'c1': hx('3fcfe8'), 'c2': hx('aef3ff'), 'c3': hx('ffffff'),
    # hueso
    'bo0': hx('6e6a5e'), 'bo1': hx('a39d8a'), 'bo2': hx('d8d2bd'),
    # oro viejo
    'au0': hx('5e4517'), 'au1': hx('9a7426'), 'au2': hx('d2a63f'),
    # madera y metal
    'wd0': hx('2a1d14'), 'wd1': hx('4a3322'), 'mt0': hx('2a2d34'), 'mt1': hx('555a66'), 'mt2': hx('8a909e'),
    # frascos, soga, parches
    'vi0': hx('5b2a7a'), 'vi1': hx('9d55c9'), 'gn0': hx('2a6b4a'), 'gn1': hx('4fbf7f'),
    'bd0': hx('3a3530'), 'bd1': hx('5e5850'),
    'g1': hx('2c2e36'), 'g2': hx('4a4d58'), 'g3': hx('6c707c'),    # apagado
    'sh': (4, 5, 10, 140),
}


def bob(f, amp=1.0, ph=0.0):
    return round(math.sin(TAU * f / FRAMES + ph) * amp)


def shadow(cv: Canvas, cx, cy, rx, ry=2):
    for y in range(cy - ry, cy + ry + 1):
        for x in range(cx - rx, cx + rx + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1 and cv.get(x, y)[3] == 0:
                cv.px(x, y, 'sh', solid=False)


def light(cv: Canvas, cx, cy, r, k=0.5, color='c1'):
    """La luz cian tiñe lo que ya está pintado (en dos pasos, sin degradé)."""
    for y in range(int(cy - r), int(cy + r) + 1):
        for x in range(int(cx - r), int(cx + r) + 1):
            d = math.hypot(x - cx, y - cy)
            if d <= r and cv.get(x, y)[3]:
                cv.blend(x, y, color, k * (0.55 if d < r * 0.5 else 0.25))


def cloak(cv: Canvas, cx, top, bottom, hw, ramp, f=0, tatter=0, seed=0, fold=0.9):
    """Manto: medio ancho por fila (`hw(y)`), luz desde la izquierda y pliegues
    verticales; `tatter` = largo máximo de los jirones del ruedo (se mecen)."""
    n = len(ramp)
    for y in range(top, bottom + 1):
        w = hw(y)
        if w <= 0:
            continue
        for x in range(round(cx - w), round(cx + w) + 1):
            if tatter and y > bottom - tatter:
                cut = hsh(x // 2, 1, seed) * tatter * 0.9 + math.sin(TAU * f / FRAMES + x * 0.7) * 1.2
                if y > bottom - cut:
                    continue
            rel = (x - cx) / (w + 0.01)
            s = 0.62 - rel * 0.34 + math.sin(x * fold + y * 0.08 + seed) * 0.16
            if abs(rel) > 0.9:
                s -= 0.22
            cv.px(x, y, ramp[max(0, min(n - 1, int(s * n)))])


def void_face(cv: Canvas, cx, cy, rx, ry):
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                cv.px(x, y, 'v')


# ── Ojos-estrella: tres estrellas que titilan dentro del vacío ──────────────
STAR = {
    0: [(0, 0, 'c1')],
    1: [(0, 0, 'c3'), (-1, 0, 'c1'), (1, 0, 'c1'), (0, -1, 'c1'), (0, 1, 'c1')],
    2: [(0, 0, 'c3'), (-1, 0, 'c2'), (1, 0, 'c2'), (0, -1, 'c2'), (0, 1, 'c2'),
        (-2, 0, 'c1'), (2, 0, 'c1'), (0, -2, 'c1'), (0, 2, 'c1')],
}
TWINKLE = (0, 1, 2, 1, 0, 0, 1, 0)


def star_eyes(cv: Canvas, cx, cy, f, dead=False):
    """Dos estrellas arriba y una abajo, desfasadas: punto → cruz chica → cruz
    grande con destellos en diagonal. Derrotado: tres puntos apagados."""
    for ex, ey, ph in ((cx - 2, cy - 1, 0), (cx + 2, cy - 2, 3), (cx + 1, cy + 2, 5)):
        if dead:
            cv.px(ex, ey, 'g2')
            continue
        size = TWINKLE[(f + ph) % FRAMES]
        for dx, dy, c in STAR[size]:
            cv.px(ex + dx, ey + dy, c)
        if size == 2:
            for dx, dy in ((-1, -1), (1, 1), (1, -1), (-1, 1)):
                cv.px(ex + dx, ey + dy, 'c0')
    if not dead:
        light(cv, cx, cy, 6, 0.18)


# ── Faroles ──────────────────────────────────────────────────────────────────
def cage_lantern(cv: Canvas, lx, top, f):
    cv.rect(lx - 3, top, 7, 1, 'mt1')
    cv.rect(lx - 3, top + 1, 7, 7, 'mt0')
    flick = (0, 1, 0, 1, 1, 0, 1, 0)[f]
    cv.rect(lx - 2, top + 2, 5, 5, 'c0')
    cv.rect(lx - 1, top + 3 - flick, 3, 4 + flick, 'c1')
    cv.px(lx, top + 4, 'c3'); cv.px(lx, top + 3 - flick, 'c2')
    for y in range(top + 1, top + 8):
        cv.px(lx - 3, y, 'mt1'); cv.px(lx + 3, y, 'mt1')
    cv.rect(lx - 2, top + 8, 5, 1, 'mt1')
    light(cv, lx, top + 4, 13, 0.45)


def buoy_lantern(cv: Canvas, lx, top, f):
    """Farol-boya: globo de vidrio redondo con un aro de metal, que late."""
    pulse = (0, 1, 1, 2, 2, 1, 1, 0)[f]
    cv.rect(lx - 1, top, 3, 1, 'mt1')
    for y in range(top + 1, top + 10):
        for x in range(lx - 4, lx + 5):
            d = math.hypot(x - lx, (y - top - 5) * 1.1)
            if d <= 4:
                cv.px(x, y, 'c3' if d < 1 + pulse * 0.4 else ('c2' if d < 2.2 else ('c1' if d < 3.3 else 'c0')))
    cv.rect(lx - 4, top + 5, 9, 1, 'mt1')
    light(cv, lx, top + 5, 13 + pulse, 0.45)


def firefly_cage(cv: Canvas, lx, top, f):
    """Jaula de pájaro con tres luciérnagas cian que revolotean adentro."""
    for y in range(top, top + 10):
        half = 1 if y == top else (3 if y < top + 3 else 4)
        cv.px(lx - half, y, 'mt2'); cv.px(lx + half, y, 'mt2')
    for x in range(lx - 4, lx + 5):
        cv.px(x, top + 10, 'mt1')
    for i in range(3):
        a = TAU * (f / FRAMES + i / 3)
        fx = round(lx + math.cos(a) * 2.2)
        fy = round(top + 6 + math.sin(a * 2) * 2)
        cv.px(fx, fy, 'c3' if (f + i) % 3 else 'c2')
        light(cv, fx, fy, 5, 0.5)
    light(cv, lx, top + 6, 12, 0.45)


# ═════════════════════════════════════════════════════════════════════════════
# EL FAROLERO
# ═════════════════════════════════════════════════════════════════════════════
STYLES = {
    'clasico': {'ramp': ['a0', 'a1', 'a2', 'a3', 'a4'], 'tatter': 6, 'seed': 1},
    'abisal': {'ramp': ['m0', 'm1', 'm2', 'm3', 'm4'], 'tatter': 10, 'seed': 4},
    'ermitano': {'ramp': ['p0', 'p1', 'p2', 'p3', 'p4'], 'tatter': 5, 'seed': 2},
}


def farolero(style: str, f: int, defeated=False):
    st = STYLES[style]
    ramp = st['ramp']
    cv = Canvas(P)
    cx, sx = 27, 45

    if defeated:
        # el manto vacío caído, el bastón atravesado y el farol apagado
        cloak(cv, 28, 46, 60, lambda y: 6 + (y - 46) * 1.1, ramp, seed=st['seed'])
        void_face(cv, 22, 51, 5, 2.5)
        cv.line(4, 58, 58, 50, 'wd1' if style != 'abisal' else 'mt1'); cv.line(4, 59, 58, 51, 'wd0' if style != 'abisal' else 'mt0')
        cv.rect(52, 53, 6, 7, 'mt0'); cv.rect(53, 55, 4, 3, 'g2')
        for x in (16, 20, 38):
            cv.rect(x, 59, 2, 1, 'bo1')
        cv.outline('k')
        star_eyes(cv, 22, 51, 0, dead=True)
        shadow(cv, 30, 61, 24)
        return cv.img

    dy = bob(f, 0.8)                                   # respira

    def hw(y):
        yy = y - dy
        if yy < 6: return 0
        if yy < 11: return (yy - 5) * 0.55             # punta derecha
        if yy < 22: return 3 + (yy - 11) * 0.65
        if yy < 28: return 10.2 + (yy - 22) * 0.4
        return 12.6 + (yy - 28) * 0.13

    # ── bastón (detrás de la mano)
    if style == 'ermitano':
        pts = [(sx, 60), (sx + 1, 48), (sx - 1, 36), (sx + 1, 24), (sx, 12), (sx + 1, 8)]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            cv.line(x0, y0, x1, y1, 'wd1'); cv.line(x0 + 1, y0, x1 + 1, y1, 'wd0')
        for (x0, y0, x1, y1) in ((sx + 1, 30, sx + 4, 27), (sx - 1, 42, sx - 3, 40), (sx + 1, 16, sx + 4, 14)):
            cv.line(x0, y0, x1, y1, 'wd1')
    else:
        wood = style == 'clasico'
        cv.rect(sx, 8, 2, 53, 'wd1' if wood else 'mt0')
        for y in range(8, 61):
            cv.px(sx + 1, y, 'wd0' if wood else 'mt1')

    cloak(cv, cx, 6 + dy, 59, hw, ramp, f, tatter=st['tatter'], seed=st['seed'])
    void_face(cv, cx, 18 + dy, 5, 6)

    # ── lo que lleva encima, según la variante
    sw = bob(f, 1, 1.2)
    if style == 'clasico':
        for x in range(cx - 11, cx + 12):
            cv.px(x, 35 + dy + (1 if abs(x - cx) < 4 else 0), 'bd1')
        for i, (vx, a, b) in enumerate(((cx - 8, 'vi0', 'vi1'), (cx - 3, 'gn0', 'gn1'), (cx + 6, 'vi0', 'vi1'))):
            o = sw if i % 2 == 0 else -sw
            cv.px(vx + o, 36 + dy, 'bd1'); cv.px(vx + o, 37 + dy, 'mt1')
            cv.rect(vx - 1 + o, 38 + dy, 3, 4, a); cv.px(vx + o, 39 + dy, b)
    elif style == 'abisal':
        for x in range(cx - 11, cx + 12):              # cadena cruzada
            cv.px(x, 33 + dy + round((x - cx + 11) * 0.18), 'mt2' if x % 2 else 'mt1')
        for i, kx in enumerate((cx - 6, cx + 1, cx + 7)):
            o = sw if i % 2 else -sw
            ky = 34 + dy + round((kx - cx + 11) * 0.18)
            cv.line(kx, ky, kx + o, ky + 3, 'mt1')
            cv.rect(kx - 1 + o, ky + 4, 3, 2, 'au1')
            cv.line(kx + o, ky + 6, kx + o, ky + 8, 'au1'); cv.px(kx + 1 + o, ky + 8, 'au1')
    else:
        for (px_, py_, c) in ((cx - 9, 40, 'a2'), (cx + 4, 46, 'm3'), (cx - 3, 27, 'bd1')):
            cv.rect(px_, py_ + dy, 5, 4, c)            # parches cosidos
            for k in range(0, 5, 2):
                cv.px(px_ + k, py_ + dy, 'bo1'); cv.px(px_ + k, py_ + 3 + dy, 'bo1')
        for x in range(cx - 11, cx + 12):
            cv.px(x, 36 + dy, 'bd0')

    # mano izquierda de hueso
    for y in range(30, 36):
        cv.px(cx - 13, y + dy, 'bo1')
    cv.sprite(cx - 15, 36 + dy, ['b.b.b', 'bbbbb', '.bbb.'], {'b': 'bo1'})
    if style == 'clasico':                              # llavero
        ky = 40 + dy
        cv.px(cx - 13, ky - 1, 'mt1')
        for (kx, kyy) in ((-15, 0), (-13, 1), (-11, 0)):
            cv.line(cx + kx, ky + kyy, cx + kx, ky + kyy + 3, 'au1'); cv.px(cx + kx + 1, ky + kyy + 3, 'au1')
    # mano derecha de hueso, aferrada al bastón
    cv.sprite(sx - 2, 27 + dy, ['bbbbbb', 'b.bb.b', 'bbbbbb'], {'b': 'bo2'})
    for y in range(24, 27):
        cv.px(sx - 3, y + dy, ramp[2])
    if style == 'ermitano':                             # campanita en la punta
        bx = cx + bob(f, 1, 0.5)
        cv.line(cx, 6 + dy, bx, 3 + dy, 'mt1')
        cv.rect(bx - 1, 1 + dy, 3, 2, 'au2'); cv.px(bx, 3 + dy, 'au0')

    cv.outline('k')

    if style == 'abisal':
        # jirones-alga que ondulan bajo el ruedo, y burbujas
        for i, x in enumerate(range(cx - 10, cx + 11, 4)):
            for y in range(56, 61):
                cv.px(x + round(math.sin(TAU * f / FRAMES + y * 0.6 + i) * 1.2), y, ramp[1], solid=False)
        for i in range(3):
            p = ((f / FRAMES) + i / 3) % 1
            cv.px(round(sx + 9 + math.sin(p * TAU + i) * 1.5), round(30 - p * 24), 'c2', solid=False)

    star_eyes(cv, cx, 18 + dy, f)

    # ── el farol, colgando en lo alto
    if style == 'abisal':
        hook = [(sx + 1, 8), (sx + 2, 5), (sx + 5, 3), (sx + 8, 4), (sx + 9, 7)]
        for a, b in zip(hook, hook[1:]):
            cv.line(*a, *b, 'mt1')
        lx = sx + 9 + bob(f, 1.2, 0.3)
        cv.line(sx + 9, 7, lx, 9, 'mt1')
        buoy_lantern(cv, lx, 9, f)
    else:
        cv.line(sx + 1, 8, sx + 4, 6, 'mt1'); cv.line(sx + 4, 6, sx + 6, 7, 'mt1')
        lx = sx + 6 + bob(f, 1.4, 0.3)
        cv.line(sx + 6, 7, lx, 10, 'mt1')
        (cage_lantern if style == 'clasico' else firefly_cage)(cv, lx, 10, f)

    shadow(cv, 30, 61, 17)
    return cv.img


def _variant(name):
    return lambda f, defeated=False: farolero(name, f, defeated)


VARIANTS = {name: _variant(name) for name in STYLES}


def main():
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    export(OUT_DIR, VARIANTS, FRAMES, lambda name, fr: VARIANTS[name](0, defeated=True), preview, 'mercader-board.png')
    print('ok')


if __name__ == '__main__':
    main()
