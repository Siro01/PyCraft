"""Utilidades compartidas para los generadores de sprites de jefes (64×64)."""
from __future__ import annotations

import math
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W = H = 64


def hx(s: str, a: int = 255):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def hsh(x, y, s=0):
    v = math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453
    return v - math.floor(v)


class Canvas:
    """Lienzo 64×64 con paleta por nombre y máscara de silueta para el contorno."""

    def __init__(self, palette: dict):
        self.P = palette
        self.img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        self.mask = [[False] * W for _ in range(H)]

    def px(self, x, y, c, solid=True):
        if 0 <= x < W and 0 <= y < H:
            self.img.putpixel((x, y), self.P[c] if isinstance(c, str) else c)
            if solid:
                self.mask[y][x] = True

    def get(self, x, y):
        return self.img.getpixel((x, y)) if 0 <= x < W and 0 <= y < H else (0, 0, 0, 0)

    def rect(self, x0, y0, w, h, c, solid=True):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                self.px(x, y, c, solid)

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

    def sprite(self, x0, y0, rows: list[str], key: dict, solid=True):
        """Dibuja un mini-sprite de texto ('.' = vacío)."""
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != '.':
                    self.px(x0 + x, y0 + y, key[ch], solid)

    def outline(self, c):
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

    def blend(self, x, y, c, k):
        """Mezcla el color c sobre un píxel ya pintado (para halos en pasos)."""
        cur = self.get(x, y)
        if cur[3] == 0:
            return
        col = self.P[c] if isinstance(c, str) else c
        self.img.putpixel((x, y), tuple(int(cur[i] * (1 - k) + col[i] * k) for i in range(3)) + (255,))


def strip(frames):
    out = Image.new('RGBA', (W * len(frames), H), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        out.paste(fr, (i * W, 0))
    return out


def export(out_dir: str, variants: dict, frames: int, defeated, preview: str | None, board_name: str):
    """Guarda <variante>.png (tira) y <variante>-defeated.png; opcionalmente un tablero de revisión."""
    os.makedirs(out_dir, exist_ok=True)
    sheets = []
    for name, fn in variants.items():
        fr = [fn(i) for i in range(frames)]
        dead = defeated(name, fr)
        strip(fr).save(os.path.join(out_dir, f'{name}.png'), optimize=True)
        dead.save(os.path.join(out_dir, f'{name}-defeated.png'), optimize=True)
        sheets.append(strip(fr + [dead]))
    if preview:
        os.makedirs(preview, exist_ok=True)
        sw = max(s.width for s in sheets)
        board = Image.new('RGBA', (sw, H * len(sheets)), (13, 13, 13, 255))
        for i, s in enumerate(sheets):
            board.alpha_composite(s, (0, i * H))
        board.resize((board.width * 3, board.height * 3), Image.NEAREST).save(os.path.join(preview, board_name))
