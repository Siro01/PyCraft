"""Guardián de la Puerta — generador de sprites (jefe 2, condicionales).

Dibuja tres propuestas de cuerpo completo en 64×64 alrededor de la cabeza
original (public/bossicons/guardian-puerta.png, 16×16, pegada tal cual) y con
su misma paleta: piedra verde-gris, esquineros naranja, ojo único menta con
pupila roja.

Salida (tiras horizontales de cuadros de 64×64, fondo transparente):
  public/sprites/guardian-puerta/<variante>.png
  public/sprites/guardian-puerta/<variante>-defeated.png   (1 cuadro)

Uso:  python scripts/sprites/guardian.py [--preview DIR]
"""
from __future__ import annotations

import math
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HEAD_PATH = os.path.join(ROOT, 'public', 'bossicons', 'guardian-puerta.png')
OUT_DIR = os.path.join(ROOT, 'public', 'sprites', 'guardian-puerta')
W = H = 64


def hx(s: str):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


# ── Paleta (tomada de la cabeza; se agregan solo rampas que faltaban) ─────────
P = {
    'k': hx('0b100f'),   # contorno
    's0': hx('0e1313'), 's1': hx('151c1b'), 's2': hx('1b2523'), 's3': hx('293733'),
    's4': hx('30403b'), 's5': hx('394d4a'), 's6': hx('405652'), 's7': hx('4d6862'),
    's8': hx('5b7a72'), 's9': hx('698c82'), 'sA': hx('7d9f94'), 'sB': hx('9cbcb0'),
    'o': hx('f27830'), 'oD': hx('a8461c'), 'oDD': hx('6b2a12'), 'oL': hx('ffb36b'), 'oW': hx('ffe2b8'),
    'm': hx('d1fbef'), 'l': hx('b5f9e5'), 'q': hx('a7f8e0'), 't': hx('5fd9b8'), 'T': hx('2f8f7c'), 'TT': hx('1a4d45'),
    'r': hx('982c21'), 'R': hx('e0533a'),
    # derrotado
    'x1': hx('2a302f'), 'x2': hx('3a4442'), 'x3': hx('55605d'),
    'sh': (6, 10, 9, 150),  # sombra en el piso (semi-transparente)
}


def hsh(x, y, s=0):
    v = math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453
    return v - math.floor(v)


class Canvas:
    def __init__(self):
        self.img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.mask = [[False] * W for _ in range(H)]  # silueta (para el contorno)

    def px(self, x, y, c, solid=True):
        if 0 <= x < W and 0 <= y < H:
            self.img.putpixel((x, y), P[c] if isinstance(c, str) else c)
            if solid:
                self.mask[y][x] = True

    def get(self, x, y):
        if 0 <= x < W and 0 <= y < H:
            return self.img.getpixel((x, y))
        return (0, 0, 0, 0)

    def rect(self, x0, y0, w, h, c):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                self.px(x, y, c)

    def outline(self, c='k'):
        add = []
        for y in range(H):
            for x in range(W):
                if self.mask[y][x]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and self.mask[ny][nx]:
                        add.append((x, y))
                        break
        for x, y in add:
            self.px(x, y, c)


# ── Piezas ────────────────────────────────────────────────────────────────────
def stone(cv: Canvas, x0, y0, w, h, seed=0, light=0, cracks=False):
    """Bloque de piedra biselado: luz arriba-izquierda, sombra abajo-derecha,
    textura de motas como la cabeza. `light` sube/baja toda la rampa."""
    ramp = ['s3', 's4', 's5', 's6', 's7', 's8', 's9', 'sA', 'sB']
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            u = (x - x0) / max(1, w - 1)
            v = (y - y0) / max(1, h - 1)
            base = 6 - (u * 0.9 + v * 1.4)  # degradé suave
            n = hsh(x, y, seed)
            if n < 0.16:
                base -= 1.4
            elif n > 0.9:
                base += 0.8
            i = int(round(base)) + light
            # bisel
            if y == y0 or x == x0:
                i = 7 + light
            if y == y0 and x == x0:
                i = 8 + light
            if y == y0 + h - 1 or x == x0 + w - 1:
                i = 2 + light
            if y == y0 + h - 2 and x0 < x < x0 + w - 1 and h > 4:
                i = min(i, 4 + light)
            cv.px(x, y, ramp[max(0, min(len(ramp) - 1, i))])
    if cracks and w > 6 and h > 6:
        # una grieta corta en diagonal, determinística
        cx = x0 + 2 + int(hsh(x0, y0, seed + 3) * (w - 5))
        cy = y0 + 2 + int(hsh(y0, x0, seed + 5) * (h - 5))
        dirx = 1 if hsh(seed, x0) > 0.5 else -1
        n = 3 + int(hsh(seed, y0) * 3)
        x = cx
        for k in range(n):
            cv.px(x, cy + k, 's2')
            if hsh(k, seed) > 0.5:
                x += dirx
                cv.px(x, cy + k, 's1')


def brackets(cv: Canvas, x0, y0, w, h, c='o', size=2):
    """Esquineros naranja, el gesto de la cabeza."""
    for (ax, ay, sx, sy) in ((x0, y0, 1, 1), (x0 + w - 1, y0, -1, 1), (x0, y0 + h - 1, 1, -1), (x0 + w - 1, y0 + h - 1, -1, -1)):
        for i in range(size):
            cv.px(ax + sx * i, ay, c)
            cv.px(ax, ay + sy * i, c)
        cv.px(ax + sx, ay + sy, 'oD')


def notch(cv: Canvas, x, y, horizontal=True, c='o'):
    """Muesca naranja al centro de un borde (como arriba/abajo de la cabeza)."""
    if horizontal:
        cv.px(x, y, c); cv.px(x + 1, y, c)
    else:
        cv.px(x, y, c); cv.px(x, y + 1, c)


HEAD = Image.open(HEAD_PATH).convert('RGBA')


def head(cv: Canvas, x0, y0, eye=1.0, defeated=False, blink=False):
    """Pega la cabeza original. eye>1 aviva el ojo, blink lo cierra a una línea."""
    eye_cols = {(0xd1, 0xfb, 0xef), (0xb5, 0xf9, 0xe5), (0xa7, 0xf8, 0xe0)}
    for y in range(16):
        for x in range(16):
            p = HEAD.getpixel((x, y))
            if p[3] < 128:
                continue
            rgb = p[:3]
            c = p
            if defeated:
                if rgb in eye_cols:
                    c = P['x2']
                elif rgb == (0x98, 0x2c, 0x21):
                    c = P['x1']
                elif rgb == (0xf2, 0x78, 0x30):
                    c = P['oDD']
                else:
                    g = int(sum(rgb) / 3 * 0.85)
                    c = (g, int(g * 1.04), int(g * 1.02), 255)
            elif blink and (rgb in eye_cols or rgb == (0x98, 0x2c, 0x21)) and y != 8:
                c = P['s4']
            elif blink and y == 8 and (rgb in eye_cols or rgb == (0x98, 0x2c, 0x21)):
                c = P['q']
            elif eye > 1 and rgb == (0x98, 0x2c, 0x21):
                c = P['R']
            elif eye > 1 and rgb in eye_cols:
                c = P['m'] if rgb != (0xd1, 0xfb, 0xef) else (240, 255, 250, 255)
            cv.px(x0 + x, y0 + y, c)


def glow(cv: Canvas, cx, cy, r, c, a=0.35):
    """Halo suave pero en pasos (2 anillos), sin antialias."""
    col = P[c]
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            d = math.hypot(x - cx, y - cy)
            if d > r or not (0 <= x < W and 0 <= y < H):
                continue
            cur = cv.get(x, y)
            if cur[3] == 0:
                continue
            k = a if d > r * 0.55 else a * 1.8
            mix = tuple(int(cur[i] * (1 - k) + col[i] * k) for i in range(3)) + (255,)
            cv.img.putpixel((x, y), mix)


def shadow(cv: Canvas, cx, y, hw):
    for x in range(cx - hw, cx + hw + 1):
        cv.px(x, y, 'sh', solid=False)
    for x in range(cx - hw + 3, cx + hw - 2):
        cv.px(x, y + 1, 'sh', solid=False)


# ═════════════════════════════════════════════════════════════════════════════
# 1 · CENTINELA — golem de bloques con alabarda y escudo-cerradura
# ═════════════════════════════════════════════════════════════════════════════
def centinela(frame: int, defeated=False):
    cv = Canvas()
    f = frame % 6
    by = 0 if defeated else (0, 0, 1, 1, 1, 0)[f]       # respira: el tronco baja 1px
    pulse = 0 if defeated else (0, 1, 2, 2, 1, 0)[f]
    sink = 3 if defeated else 0                         # derrotado: se desploma

    # piernas y pies (no respiran)
    stone(cv, 20, 42, 10, 15, seed=11, light=-1)
    stone(cv, 34, 42, 10, 15, seed=12, light=-2, cracks=True)
    stone(cv, 18, 55, 13, 6, seed=13, light=-1)
    stone(cv, 33, 55, 13, 6, seed=14, light=-2)
    notch(cv, 23, 55); notch(cv, 38, 55)

    # alabarda (por fuera del brazo derecho; el puño la aferra)
    sx = 60
    if not defeated:
        top = 2 + by
        for y in range(top + 3, 62):
            cv.px(sx, y, 'oD'); cv.px(sx + 1, y, 'oDD')
        for y in range(top + 14, 62, 6):
            cv.px(sx, y, 'o')
        # hoja de hacha hacia adentro
        lo = {0: 3, 1: 2, 2: 1, 3: 0, 4: 0, 5: 1}
        hi = {0: 7, 1: 8, 2: 9, 3: 10, 4: 10, 5: 9}
        for dxx in range(6):
            for dyy in range(lo[dxx], hi[dxx] + 1):
                if dxx == 5:
                    c = 'oL'
                elif dyy in (lo[dxx], hi[dxx]):
                    c = 's8'
                else:
                    c = 'sB' if dyy < 5 else 'sA'
                cv.px(sx - 1 - dxx, top + 1 + dyy, c)
        for k in range(4):  # pico
            cv.px(sx, top + k, 'sB' if k < 2 else 'sA'); cv.px(sx + 1, top + k + 1, 's8')
        cv.px(sx, top - 1, 'oW')
        cv.rect(sx - 1, top + 4, 4, 1, 'o')
    # cadera
    stone(cv, 19, 37 + by + sink, 26, 6, seed=15, light=-1)
    # torso: pecho ancho que se angosta
    T = 17 + by + sink
    stone(cv, 14, T, 36, 14, seed=16, light=0, cracks=True)
    stone(cv, 18, T + 13, 28, 9, seed=26, light=-1)
    brackets(cv, 14, T, 36, 14)
    # cerradura del pecho — el guardián ES la puerta
    kx, ky = 31, T + 4
    lock_c = 'x2' if defeated else ('q', 'l', 'm')[pulse]
    hole = ((0, 0), (1, 0), (-1, 1), (0, 1), (1, 1), (2, 1), (-1, 2), (2, 2), (0, 3), (1, 3),
            (0, 4), (1, 4), (-1, 5), (0, 5), (1, 5), (2, 5), (-1, 6), (0, 6), (1, 6), (2, 6))
    cv.rect(kx - 3, ky - 2, 8, 11, 's2')
    cv.rect(kx - 2, ky - 1, 6, 9, 's1')
    for (x, y) in hole:
        cv.px(kx + x, ky + y, lock_c)
    pc = 'x1' if defeated else ('r', 'r', 'R')[pulse]
    cv.px(kx, ky + 2, pc); cv.px(kx + 1, ky + 2, pc)
    notch(cv, kx, ky - 3); notch(cv, kx, ky + 9)
    # despiece del pecho
    for x in range(19, 45):
        if not (kx - 4 <= x <= kx + 5):
            cv.px(x, T + 13, 's3')
    # brazos colgando
    stone(cv, 6, T + 7, 9, 14, seed=19)
    stone(cv, 49, T + 7, 9, 14, seed=20, light=-1)
    # puños (el derecho aferra la alabarda)
    stone(cv, 4, T + 20, 12, 8, seed=21, light=-1)
    stone(cv, 48, T + 20, 14, 8, seed=22, light=-2)
    for k in range(3):
        cv.px(51 + k * 3, T + 21, 's3')
    if not defeated:
        cv.px(sx, T + 19, 'o')
    # hombreras macizas con esquineros
    stone(cv, 3, T - 3, 14, 11, seed=17, light=1)
    stone(cv, 47, T - 3, 14, 11, seed=18, light=0)
    brackets(cv, 3, T - 3, 14, 11)
    brackets(cv, 47, T - 3, 14, 11)

    # escudo-losa en la mano izquierda con la runa de la bifurcación (if / else)
    sx0, sy0 = 0, T + 15 + (5 if defeated else 0)
    stone(cv, sx0, sy0, 14, 19, seed=23, light=1)
    brackets(cv, sx0, sy0, 14, 19)
    rc = 'oDD' if defeated else ('o', 'o', 'oL')[pulse]
    cxs = sx0 + 6
    for y in range(sy0 + 9, sy0 + 16):
        cv.px(cxs, y, rc); cv.px(cxs + 1, y, 'oD' if not defeated else 'oDD')
    for i in range(5):
        cv.px(cxs - 1 - i, sy0 + 8 - i, rc)
        cv.px(cxs + 2 + i, sy0 + 8 - i, rc)
    cv.rect(cxs - 6, sy0 + 2, 2, 2, 'x2' if defeated else ('l', 'l', 'm')[pulse])   # rama verdadera: encendida
    cv.rect(cxs + 6, sy0 + 2, 2, 2, 's3')                                            # rama falsa: apagada

    if defeated:
        # alabarda caída
        for x in range(30, 63):
            cv.px(x, 60, 'oDD'); cv.px(x, 59, 'oD' if x % 6 else 'o')
        for k in range(5):
            for j in range(k + 1):
                cv.px(58 + j, 58 - k, 'x3')

    # cabeza hundida entre los hombros
    hy = T - 13 + (3 if defeated else 0)
    hx0 = 24 + (1 if defeated else 0)
    head(cv, hx0, hy, eye=2 if pulse == 2 else 1, defeated=defeated, blink=(f == 5 and not defeated))
    cv.outline()
    if not defeated and pulse:
        glow(cv, hx0 + 8, hy + 8, 5, 't', 0.1 * pulse)
        glow(cv, kx + 1, ky + 3, 6, 't', 0.1 * pulse)
    shadow(cv, 32, 61, 20)
    return cv.img


# ═════════════════════════════════════════════════════════════════════════════
# 2 · LA PUERTA — el guardián ES el portal: cabeza en la clave del arco,
#      puños de piedra que flotan a los lados, portal menta que gira.
# ═════════════════════════════════════════════════════════════════════════════
def puerta(frame: int, defeated=False):
    cv = Canvas()
    f = frame % 6
    bob_l = 0 if defeated else (0, -1, -1, 0, 1, 1)[f]
    bob_r = 0 if defeated else (1, 1, 0, -1, -1, 0)[f]

    # pilares
    stone(cv, 9, 26, 12, 33, seed=31)
    stone(cv, 43, 26, 12, 33, seed=32, light=-1, cracks=True)
    for py in (36, 47):
        for x in range(10, 20):
            cv.px(x, py, 's3')
        for x in range(44, 54):
            cv.px(x, py, 's3')
    # basas
    stone(cv, 7, 56, 16, 5, seed=33, light=-1, cracks=False)
    stone(cv, 41, 56, 16, 5, seed=34, light=-2, cracks=False)
    # dintel
    stone(cv, 7, 20, 50, 8, seed=35, light=1, cracks=False)
    brackets(cv, 7, 20, 50, 8)
    # dovelas sobre el dintel
    stone(cv, 13, 16, 10, 5, seed=36, cracks=False)
    stone(cv, 41, 16, 10, 5, seed=37, light=-1, cracks=False)

    # portal (hueco del arco)
    x0, x1, y0, y1 = 21, 42, 28, 58
    cxp, cyp = (x0 + x1) / 2, (y0 + y1) / 2 + 2
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if defeated:
                c = 's1' if hsh(x, y, 9) > 0.15 else 's2'
            else:
                d = math.hypot((x - cxp) / 10.5, (y - cyp) / 15.5)
                a = math.atan2(y - cyp, x - cxp)
                v = d * 5 - f * 0.55 + math.sin(a * 2 + d * 3) * 0.6
                band = int(math.floor(v)) % 4
                c = ('TT', 'T', 't', 'T')[band]
                if d < 0.28:
                    c = 'q'
                if d < 0.14:
                    c = 'm'
                if hsh(x, y, f) > 0.985:
                    c = 'm'
            cv.px(x, y, c)
    # marco interior del arco (sombra) — arco de medio punto arriba
    for x in range(x0, x1 + 1):
        cv.px(x, y0, 's1')
        if x in (x0, x0 + 1, x1 - 1, x1):
            cv.px(x, y0 + 1, 's1')
        if x in (x0, x1):
            cv.px(x, y0 + 2, 's1')
    for y in range(y0, y1 + 1):
        cv.px(x0, y, 's2'); cv.px(x1, y, 's2')

    # runas en los pilares: if / elif / else  (3 marcas; la de arriba encendida)
    lit = 'x2' if defeated else ('m', 'l', 'q', 'l', 'm', 'm')[f]
    for i, (ry, on) in enumerate(((30, True), (40, False), (51, False))):
        for side, rx in enumerate((14, 48)):
            c = (lit if on else 'o') if not defeated else 'oDD'
            # marca en forma de bifurcación chica
            cv.px(rx, ry + 2, c); cv.px(rx + 1, ry + 2, c)
            cv.px(rx - 1, ry, c); cv.px(rx + 2, ry, c)
            cv.px(rx, ry + 1, c); cv.px(rx + 1, ry + 1, c)
            cv.px(rx, ry + 3, c); cv.px(rx + 1, ry + 3, c)

    # antorchas: llamas naranja sobre las dovelas
    if not defeated:
        for fx, ph in ((16, 0), (46, 3)):
            h = (3, 4, 3, 2, 3, 4)[(f + ph) % 6]
            for k in range(h):
                cv.px(fx + 1, 15 - k, 'o' if k < h - 1 else 'oL')
                if k < h - 2:
                    cv.px(fx + 2, 15 - k, 'oD')
                    cv.px(fx, 15 - k, 'oD')
            cv.px(fx + 1, 15, 'oW')

    # cabeza en la clave
    hy = 5 if not defeated else 7
    head(cv, 24, hy, eye=2 if f in (2, 3) else 1, defeated=defeated, blink=(f == 5 and not defeated))
    stone(cv, 27, hy + 15, 10, 2, seed=38, light=-2, cracks=False)

    # puños flotantes
    if not defeated:
        for bx, by, s, sd in ((0, 37 + bob_l, 1, 41), (55, 37 + bob_r, -1, 42)):
            stone(cv, bx, by, 9, 12, seed=sd, light=0 if s > 0 else -1)
            for k in range(4):  # nudillos
                cv.px(bx + 1 + k * 2, by + 1, 's3')
            notch(cv, bx + 3, by + 11)
    else:
        stone(cv, 0, 51, 9, 9, seed=41, light=-2, cracks=True)
        stone(cv, 55, 52, 9, 8, seed=42, light=-2, cracks=True)

    cv.outline()
    # luz del portal sobre los pilares
    if not defeated:
        for y in range(30, 58):
            for x in (x0 - 1, x1 + 1):
                c = cv.get(x, y)
                if c[3]:
                    cv.img.putpixel((x, y), tuple(int(c[i] * 0.55 + P['t'][i] * 0.45) for i in range(3)) + (255,))
        glow(cv, 32, 13, 6, 't', 0.10 if f not in (2, 3) else 0.22)
    shadow(cv, 32, 61, 26)
    return cv.img


# ═════════════════════════════════════════════════════════════════════════════
# 3 · CENTINELA DE LAS RAMAS — coloso flotante de bloques sueltos; bajo él,
#      una energía naranja que se bifurca en tres caminos (if/elif/else).
# ═════════════════════════════════════════════════════════════════════════════
def ramas(frame: int, defeated=False):
    cv = Canvas()
    f = frame % 6
    wav = lambda ph: 0 if defeated else (0, -1, -1, 0, 1, 1)[(f + ph) % 6]

    # glifo de la bifurcación en el piso: tronco + tres caminos (if / elif / else)
    pc, pd = ('oDD', 'oDD') if defeated else ('o', 'oD')
    for y in range(53, 57):
        cv.px(31, y, pd, solid=False); cv.px(32, y, pc, solid=False)
    for i in range(14):
        y = 57 + i // 5
        cv.px(31 - i, y, pc, solid=False); cv.px(32 + i, y, pc, solid=False)
    for y in range(57, 61):
        cv.px(32, y, pc, solid=False)
    sel = -1 if defeated else (f // 2) % 3        # la condición "evalúa": la luz recorre las ramas
    for i, (ex, ey) in enumerate(((16, 58), (31, 60), (45, 58))):
        on = i == sel
        cv.rect(ex, ey, 3, 3, 'm' if on else 's3')
        cv.px(ex + 1, ey + 1, 'q' if on else 's1')
        if on:
            cv.px(ex + 1, ey - 1, 'l'); cv.px(ex + 1, ey - 2, 'q')
    if not defeated:
        cv.px(32, 53 + f % 4, 'oW', solid=False)

    if defeated:
        stone(cv, 19, 44, 26, 13, seed=51, light=-2, cracks=True)
        stone(cv, 3, 48, 13, 11, seed=52, light=-2, cracks=True)
        stone(cv, 49, 49, 13, 10, seed=53, light=-2)
        stone(cv, 13, 53, 7, 5, seed=54, light=-2)
        stone(cv, 45, 53, 6, 4, seed=55, light=-2)
        head(cv, 27, 30, defeated=True)
        cv.outline()
        shadow(cv, 32, 61, 26)
        return cv.img

    # cola: bloques que se achican hacia abajo, cada uno con su fase
    stone(cv, 24, 41 + wav(2), 16, 5, seed=61, light=-1)
    stone(cv, 27, 46 + wav(3), 10, 4, seed=62, light=-2)
    stone(cv, 30, 50 + wav(4), 4, 3, seed=63, light=-2)
    # torso
    ty = 21 + wav(0)
    stone(cv, 18, ty, 28, 19, seed=55, cracks=True)
    brackets(cv, 18, ty, 28, 19)
    # runa del pecho: la bifurcación, encendida
    gc = ('q', 'l', 'm', 'l', 'q', 'q')[f]
    for y in range(ty + 9, ty + 16):
        cv.px(31, y, gc); cv.px(32, y, gc)
    for i in range(6):
        cv.px(30 - i, ty + 8 - i, gc)
        cv.px(33 + i, ty + 8 - i, gc)
    cv.rect(31, ty + 4, 2, 2, 'R' if f in (2, 3) else 'r')
    # hombros
    sl, sr = wav(1), wav(4)
    stone(cv, 7, 19 + sl, 11, 10, seed=57, light=1)
    stone(cv, 46, 19 + sr, 11, 10, seed=58)
    brackets(cv, 7, 19 + sl, 11, 10)
    brackets(cv, 46, 19 + sr, 11, 10)
    # puños grandes, sueltos
    fl, fr = wav(3), wav(5)
    stone(cv, 0, 31 + fl, 13, 13, seed=59, cracks=True)
    stone(cv, 51, 31 + fr, 13, 13, seed=60, light=-1)
    for k in range(4):
        cv.px(2 + k * 3, 32 + fl, 's3'); cv.px(53 + k * 3, 32 + fr, 's3')
    notch(cv, 5, 43 + fl); notch(cv, 56, 43 + fr)
    # cabeza flotante
    hy = 3 + wav(1)
    head(cv, 24, hy, eye=2 if f in (2, 3) else 1, blink=(f == 5))
    cv.outline()
    glow(cv, 32, hy + 8, 5, 't', 0.08 if f not in (2, 3) else 0.2)
    glow(cv, 32, ty + 10, 7, 't', 0.14)
    # chispas entre las piezas
    for i, (px_, base) in enumerate(((19, 30), (45, 30), (14, 46), (50, 46))):
        cv.px(px_, base - ((f * 2 + i * 5) % 10), 'oL' if i % 2 else 'l', solid=False)
    shadow(cv, 32, 62, 12)
    return cv.img


VARIANTS = {
    'centinela': (centinela, 6),
    'puerta': (puerta, 6),
    'ramas': (ramas, 6),
}


def strip(frames):
    out = Image.new('RGBA', (W * len(frames), H), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        out.paste(fr, (i * W, 0))
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    preview = None
    if '--preview' in sys.argv:
        preview = sys.argv[sys.argv.index('--preview') + 1]
        os.makedirs(preview, exist_ok=True)
    sheets = []
    for name, (fn, n) in VARIANTS.items():
        frames = [fn(i) for i in range(n)]
        dead = fn(0, defeated=True)
        strip(frames).save(os.path.join(OUT_DIR, f'{name}.png'), optimize=True)
        dead.save(os.path.join(OUT_DIR, f'{name}-defeated.png'), optimize=True)
        sheets.append(strip(frames + [dead]))
        if preview:
            bg = Image.new('RGBA', (W, H), (14, 16, 18, 255))
            gif = [Image.alpha_composite(bg, fr).resize((W * 4, H * 4), Image.NEAREST).convert('P') for fr in frames]
            gif[0].save(os.path.join(preview, f'{name}.gif'), save_all=True, append_images=gif[1:], duration=200, loop=0)
    if preview:
        sw = max(s.width for s in sheets)
        board = Image.new('RGBA', (sw, H * len(sheets)), (14, 16, 18, 255))
        for i, s in enumerate(sheets):
            board.alpha_composite(s, (0, i * H))
        board.resize((board.width * 3, board.height * 3), Image.NEAREST).save(os.path.join(preview, 'board.png'))
    print('ok')


if __name__ == '__main__':
    main()
