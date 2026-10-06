"""Golem Infinito — generador de sprites (jefe 3, bucles for / while).

Tres propuestas de cuerpo completo en 64×64 alrededor de la cabeza original
(public/bossicons/golem-infinito.png, 32×32, pegada tal cual): un golem de
cobre con pararrayos, ventanas negras por ojos y mentón remachado.

Paleta: las rampas de cobre de la cabeza + pátina verde (el cobre oxidado,
que coincide con el color guía del jefe #86EFAC). Derrotado, el golem se
oxida entero y queda estatua.

Salida (tiras horizontales de cuadros de 64×64, fondo transparente):
  public/sprites/golem-infinito/<variante>.png
  public/sprites/golem-infinito/<variante>-defeated.png   (1 cuadro)

Uso:  python scripts/sprites/golem.py [--preview DIR]
"""
from __future__ import annotations

import math
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HEAD_PATH = os.path.join(ROOT, 'public', 'bossicons', 'golem-infinito.png')
OUT_DIR = os.path.join(ROOT, 'public', 'sprites', 'golem-infinito')
W = H = 64
FRAMES = 6


def hx(s: str):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


P = {
    'k': hx('000000'),                                   # contorno (como la cabeza)
    # cobre, de sombra a luz (tomado de la cabeza)
    'c0': hx('3a1a04'), 'c1': hx('7e3a06'), 'c2': hx('ac4f00'), 'c3': hx('c06205'),
    'c4': hx('d5750a'), 'c5': hx('f3850c'), 'c6': hx('f69a39'), 'c7': hx('ffa252'),
    'c8': hx('fbc084'), 'c9': hx('ffd9b0'),
    # pátina (cobre oxidado)
    'p0': hx('1d4a3f'), 'p1': hx('2f7d68'), 'p2': hx('4fb393'), 'p3': hx('86efac'), 'p4': hx('c8f7da'),
    # chispa / brillo del bucle
    'g1': hx('ffe08a'), 'g2': hx('fff6d8'),
    # piedra (para el bloque que pica el minero)
    'r1': hx('2c2f33'), 'r2': hx('4a4f55'), 'r3': hx('6b7178'), 'r4': hx('8e959c'), 'r5': hx('b4bac0'),
    'sh': (8, 6, 4, 150),
    'smk1': (190, 180, 168, 200), 'smk2': (140, 132, 124, 170),
}


def hsh(x, y, s=0):
    v = math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453
    return v - math.floor(v)


class Canvas:
    def __init__(self):
        self.img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.mask = [[False] * W for _ in range(H)]

    def px(self, x, y, c, solid=True):
        if 0 <= x < W and 0 <= y < H:
            self.img.putpixel((x, y), P[c] if isinstance(c, str) else c)
            if solid:
                self.mask[y][x] = True

    def get(self, x, y):
        return self.img.getpixel((x, y)) if 0 <= x < W and 0 <= y < H else (0, 0, 0, 0)

    def rect(self, x0, y0, w, h, c):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                self.px(x, y, c)

    def line(self, x0, y0, x1, y1, c, solid=True):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.px(x0, y0, c, solid)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy; x0 += sx
            if e2 <= dx:
                err += dx; y0 += sy

    def outline(self, c='k'):
        add = []
        for y in range(H):
            for x in range(W):
                if self.mask[y][x]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and self.mask[ny][nx]:
                        add.append((x, y)); break
        for x, y in add:
            self.px(x, y, c)


RAMP = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']


def copper(cv: Canvas, x0, y0, w, h, seed=0, light=0, rivets=False, patina=0.0):
    """Placa de cobre: luz arriba-izquierda, vetas horizontales como la cabeza,
    remaches opcionales y manchas de pátina."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            u = (x - x0) / max(1, w - 1)
            v = (y - y0) / max(1, h - 1)
            base = 4.6 - (u * 1.1 + v * 1.0)
            n = hsh(x // 2, y, seed)  # vetas: motas estiradas en horizontal
            if n < 0.08:
                base -= 1.2
            elif n > 0.94:
                base += 1.3
            i = int(round(base)) + light
            if y == y0 or x == x0:
                i = 6 + light
            if y == y0 + h - 1 or x == x0 + w - 1:
                i = 2 + light
            c = RAMP[max(0, min(9, i))]
            if patina and hsh(x, y, seed + 9) < patina and x0 < x < x0 + w - 1 and y0 < y < y0 + h - 1:
                c = 'p1' if hsh(y, x, seed) < 0.5 else 'p2'
            cv.px(x, y, c)
    if rivets and w >= 6 and h >= 6:
        for (rx, ry) in ((x0 + 2, y0 + 2), (x0 + w - 3, y0 + 2), (x0 + 2, y0 + h - 3), (x0 + w - 3, y0 + h - 3)):
            cv.px(rx, ry, 'c8'); cv.px(rx + 1, ry + 1, 'c2')


HEAD = Image.open(HEAD_PATH).convert('RGBA')


def head(cv: Canvas, x0, y0, look=0, glow=0):
    """Cabeza original. `look` mueve las pupilas-brasa (-1, 0, 1) dentro de las
    ventanas negras; glow>0 las enciende más."""
    for y in range(32):
        for x in range(32):
            p = HEAD.getpixel((x, y))
            if p[3] >= 128:
                cv.px(x0 + x, y0 + y, p)
    if glow >= 0:
        # ventanas de los ojos: x 4..12 y 19..27, filas 13..22 de la cabeza
        for ex in (8, 23):
            px_ = x0 + ex + look
            py_ = y0 + 17
            c1, c2 = ('g2', 'g1') if glow else ('g1', 'c5')
            cv.px(px_, py_, c1); cv.px(px_ + 1, py_, c2)
            cv.px(px_, py_ + 1, c2); cv.px(px_ + 1, py_ + 1, 'c3')


INF = [  # ∞ de 11×5, en orden de recorrido para que la chispa lo siga
    (5, 2), (6, 1), (7, 0), (8, 0), (9, 0), (10, 1), (10, 2), (10, 3), (9, 4), (8, 4), (7, 4), (6, 3),
    (5, 2), (4, 1), (3, 0), (2, 0), (1, 0), (0, 1), (0, 2), (0, 3), (1, 4), (2, 4), (3, 4), (4, 3),
]


def infinity(cv: Canvas, x0, y0, f, base='p2', spark=True):
    for (x, y) in INF:
        cv.px(x0 + x, y0 + y, base)
    if spark:
        n = len(INF)
        i = int(f * n / FRAMES)
        for k, c in ((0, 'g2'), (1, 'g1'), (2, 'p4'), (3, 'p3')):
            x, y = INF[(i - k) % n]
            cv.px(x0 + x, y0 + y, c)


def shadow(cv: Canvas, cx, y, hw):
    for x in range(cx - hw, cx + hw + 1):
        cv.px(x, y, 'sh', solid=False)
    for x in range(cx - hw + 3, cx + hw - 2):
        cv.px(x, y + 1, 'sh', solid=False)


def body(cv: Canvas, ox, f, la=0, ra=0, ll=0, rl=0, chest=None, arms=True):
    """Cuerpo base del golem de cobre (bajito, cabezón). ox: corrimiento en x.
    la/ra: desplazamiento vertical de cada brazo; ll/rl: de cada pierna."""
    # piernas
    copper(cv, ox + 23, 48 - ll, 7, 11, seed=1, light=-1)
    copper(cv, ox + 34, 48 - rl, 7, 11, seed=2, light=-2)
    copper(cv, ox + 22, 58 - ll, 9, 3, seed=3, light=-1)
    copper(cv, ox + 33, 58 - rl, 9, 3, seed=4, light=-2)
    # torso
    copper(cv, ox + 20, 32, 24, 17, seed=5, rivets=True)
    for x in range(ox + 21, ox + 43):  # cinturón
        cv.px(x, 45, 'c1'); cv.px(x, 46, 'c2')
    cv.px(ox + 31, 45, 'c7'); cv.px(ox + 32, 45, 'c7')
    if chest:
        chest()
    if arms:
        # brazos separados del torso por 1px (el contorno los recorta)
        copper(cv, ox + 12, 33 + la, 7, 12, seed=6, light=1)
        copper(cv, ox + 45, 33 + ra, 7, 12, seed=7, light=-1)
        copper(cv, ox + 11, 44 + la, 9, 6, seed=8, light=0)   # manos
        copper(cv, ox + 44, 44 + ra, 9, 6, seed=9, light=-2)
        for k in range(3):
            cv.px(ox + 13 + k * 2, 49 + la, 'c1'); cv.px(ox + 46 + k * 2, 49 + ra, 'c0')


def oxidize(img: Image.Image) -> Image.Image:
    """Derrota: el cobre se oxida entero (pátina) y el golem queda estatua."""
    out = img.copy()
    pat = [P['p0'], P['p1'], P['p2'], P['p3']]
    for y in range(H):
        for x in range(W):
            r, g, b, a = out.getpixel((x, y))
            if a == 0 or (r, g, b) == (0, 0, 0):
                continue
            if a < 255 or max(r, g, b) - min(r, g, b) < 24:  # sombra y piedra no se oxidan
                continue
            lum = (r * 0.5 + g * 0.4 + b * 0.1) / 255
            i = min(3, int(lum * 4.2))
            c = pat[i]
            if hsh(x, y, 77) < 0.12:
                c = pat[max(0, i - 1)]
            out.putpixel((x, y), c)
    return out


# ═════════════════════════════════════════════════════════════════════════════
# 1 · MARCHA INFINITA — camina en el lugar para siempre: no llega a ningún lado.
#     Un ∞ en el pecho con una chispa que lo recorre.
# ═════════════════════════════════════════════════════════════════════════════
def marcha(f: int):
    cv = Canvas()
    step = (0, 2, 3, 0, 0, 0)[f], (0, 0, 0, 0, 2, 3)[f]   # piernas alternadas
    arm = (0, -1, -2, 0, 1, 2)[f]
    bob = 1 if f in (0, 3) else 0
    body(cv, 0, f, la=arm, ra=-arm, ll=step[0], rl=step[1],
         chest=lambda: (cv.rect(26, 35, 13, 7, 'c1'), cv.rect(27, 36, 11, 5, 'c0'), infinity(cv, 27, 36, f)))
    head(cv, 16, 1 + bob, look=(0, 0, 1, 1, 0, -1)[f], glow=1 if f in (1, 2) else 0)
    cv.outline()
    # polvo del paso
    for side, s in ((0, step[0]), (1, step[1])):
        if s == 0 and (f == 3 and side == 0 or f == 0 and side == 1):
            bx = 21 if side == 0 else 42
            for k, c in ((0, 'smk1'), (2, 'smk2'), (-2, 'smk2')):
                cv.px(bx + k, 59, c, solid=False)
            cv.px(bx + (3 if side else -3), 58, 'smk2', solid=False)
    shadow(cv, 32, 61, 16)
    return cv.img


# ═════════════════════════════════════════════════════════════════════════════
# 2 · A CUERDA — juguete de cuerda: la llave de la espalda gira y una ventana en
#     el pecho deja ver el engranaje. El pararrayos chisporrotea.
# ═════════════════════════════════════════════════════════════════════════════
def gear(cv: Canvas, cx, cy, r, f, teeth=6):
    rot = f * (2 * math.pi / teeth) / FRAMES
    for y in range(cy - r - 2, cy + r + 3):
        for x in range(cx - r - 2, cx + r + 3):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            a = math.atan2(dy, dx) - rot
            tooth = (math.cos(a * teeth) > 0.35)
            if d <= r - 1 or (tooth and d <= r + 1.2):
                if d < 2.2:
                    c = 'c0'
                elif d < 3.4:
                    c = 'p3'
                else:
                    shade = dx * -0.6 + dy * -0.8
                    c = 'p3' if shade > r * 0.45 else ('p2' if shade > -r * 0.3 else 'p1')
                    # rayos del engranaje
                    if d < r - 2.5 and abs(math.sin((a) * 3)) < 0.18:
                        c = 'p0'
                cv.px(x, y, c)


def cuerda(f: int):
    cv = Canvas()
    # llave de cuerda en la espalda (detrás del torso, asoma a la derecha)
    kw = (9, 6, 1, 6, 9, 6)[f]           # ancho visible del ala que gira
    for y in range(37, 41):
        for x in range(44, 53):
            cv.px(x, y, 'c3' if y < 39 else 'c2')
    kx = 54
    for dy in range(-8, 9):
        if abs(dy) <= 1:
            continue
        hw = max(0, round(kw / 2 * (1 - (abs(dy) - 5) ** 2 / 16))) if abs(dy) > 1 else 0
        for dx in range(-hw, hw + 1):
            cv.px(kx + dx, 39 + dy, 'c6' if dx < 0 else ('c4' if dx == 0 else 'c2'))
        cv.px(kx, 39 + dy, 'c7' if kw > 1 else 'c3')
    cv.rect(kx - 1, 38, 3, 3, 'c5')

    bob = (0, 0, 1, 1, 0, 0)[f]
    body(cv, -2, f, la=bob, ra=bob, chest=None)
    cv.rect(22, 34, 16, 11, 'c1'); cv.rect(23, 35, 14, 9, 'c0')
    gear(cv, 30, 39, 5, f, teeth=6)
    head(cv, 14, 1 + bob, look=(-1, -1, 0, 1, 1, 0)[f], glow=1 if f in (3, 4) else 0)
    cv.outline()
    # chispas del pararrayos (punta en x 25..36 de la cabeza, y=1)
    spark = [((20, -3), (22, -1)), ((44, -2), (42, 0)), (), ((18, 0), (21, 1)), ((46, 1), (43, 2)), ()][f]
    for (a, b) in zip(spark[::2], spark[1::2]):
        cv.line(a[0], max(0, a[1] + 2), b[0], max(0, b[1] + 2), 'g1', solid=False)
    if f in (0, 1, 3, 4):
        cv.px(30, 0, 'g2', solid=False); cv.px(31, 0, 'g2', solid=False)
    shadow(cv, 30, 61, 16)
    return cv.img


# ═════════════════════════════════════════════════════════════════════════════
# 3 · MINERO DEL BUCLE — for golpe in range(3): pica un bloque tres veces, el
#     bloque se agrieta, el contador marca 1, 2, 3… y vuelve a empezar.
# ═════════════════════════════════════════════════════════════════════════════
def pick(cv: Canvas, hx_, hy_, tx, ty):
    """Pico: mango desde la mano (hx,hy) hasta la cabeza del pico (tx,ty)."""
    cv.line(hx_, hy_, tx, ty, 'c1')
    cv.line(hx_ + 1, hy_, tx + 1, ty, 'c2')
    # cabeza perpendicular al mango
    dx, dy = tx - hx_, ty - hy_
    L = math.hypot(dx, dy) or 1
    px_, py_ = -dy / L, dx / L
    for s in range(-6, 7):
        x = round(tx + px_ * s)
        y = round(ty + py_ * s + abs(s) * 0.25 * (dy / L))
        c = 'r5' if abs(s) < 2 else ('r4' if abs(s) < 5 else 'r3')
        cv.px(x, y, c)
        cv.px(x + round(dx / L), y + round(dy / L), 'r2' if abs(s) < 5 else 'r1')


def minero(f: int):
    cv = Canvas()
    hit = f in (1, 3, 5)
    count = (0, 1, 1, 2, 2, 3)[f]
    # bloque de piedra a la derecha, con grietas según los golpes
    bx, by = 47, 46
    for y in range(by, by + 14):
        for x in range(bx, bx + 16):
            u, v = (x - bx) / 15, (y - by) / 13
            i = 3 - (u + v) * 0.9
            n = hsh(x, y, 5)
            if n < 0.18:
                i -= 1
            if (x - bx) % 8 == 0 and y > by or (y - by) % 7 == 0 and x > bx:
                i = 1
            c = ('r1', 'r2', 'r3', 'r4', 'r5')[max(0, min(4, int(round(i))))]
            if y == by:
                c = 'r5'
            cv.px(x, y, c)
    cracks = [[(55, 47), (54, 49), (56, 51)], [(51, 50), (53, 52), (52, 55), (55, 57)], [(58, 49), (60, 52), (58, 55), (61, 58)]]
    for k in range(count):
        pts = cracks[k]
        for a, b in zip(pts, pts[1:]):
            cv.line(a[0], a[1], b[0], b[1], 'k')

    # golem corrido a la izquierda
    ox = -9
    if hit:
        arm_y = 2
    else:
        arm_y = -3
    body(cv, ox, f, la=0, ra=arm_y, chest=lambda: infinity(cv, ox + 27, 37, f, base='c2', spark=False))
    # contador del bucle en el pecho: golpe 1, 2, 3
    for k in range(3):
        on = k < count
        cv.rect(ox + 27 + k * 4, 37, 3, 3, 'p3' if on else 'c1')
        if on:
            cv.px(ox + 28 + k * 4, 38, 'p4')
    # pico en la mano derecha
    hxp, hyp = ox + 47, 44 + arm_y + 2
    if hit:
        pick(cv, hxp, hyp, 54, 43)
    else:
        pick(cv, hxp, hyp, 50, 22)
    head(cv, 16 + ox, 1 + (1 if hit else 0), look=1, glow=1 if hit else 0)
    cv.outline()
    if hit:
        for (sx, sy) in ((52, 41), (57, 40), (60, 43), (49, 40)):
            cv.px(sx, sy, 'g2', solid=False)
        cv.px(55, 39, 'g1', solid=False); cv.px(62, 41, 'g1', solid=False)
        # el número de la vuelta del bucle salta sobre el bloque
        digit = {1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.']}[count]
        for yy, row in enumerate(digit):
            for xx, ch in enumerate(row):
                if ch == '#':
                    cv.px(57 + xx, 30 + yy, 'p3', solid=False)
    shadow(cv, 30, 61, 18)
    return cv.img


VARIANTS = {'marcha': marcha, 'cuerda': cuerda, 'minero': minero}


def strip(frames):
    out = Image.new('RGBA', (W * len(frames), H), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        out.paste(fr, (i * W, 0))
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    if preview:
        os.makedirs(preview, exist_ok=True)
    sheets = []
    for name, fn in VARIANTS.items():
        frames = [fn(i) for i in range(FRAMES)]
        dead = oxidize(frames[0])
        strip(frames).save(os.path.join(OUT_DIR, f'{name}.png'), optimize=True)
        dead.save(os.path.join(OUT_DIR, f'{name}-defeated.png'), optimize=True)
        sheets.append(strip(frames + [dead]))
    if preview:
        sw = max(s.width for s in sheets)
        board = Image.new('RGBA', (sw, H * len(sheets)), (14, 16, 18, 255))
        for i, s in enumerate(sheets):
            board.alpha_composite(s, (0, i * H))
        board.resize((board.width * 3, board.height * 3), Image.NEAREST).save(os.path.join(preview, 'golem-board.png'))
    print('ok')


if __name__ == '__main__':
    main()
