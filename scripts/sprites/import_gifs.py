"""Importa los jefes dibujados a mano como GIF animado (Acto III / IV).

A diferencia de los otros scripts de esta carpeta, que dibujan los sprites con
código, estos jefes vienen de un editor de pixel art. Los originales están en
scripts/sprites/originales/; algunos vienen agrandados (8× por píxel), así que
acá se reducen a su tamaño nativo para que el juego los escale parejo con el
resto, y se guarda un cuadro quieto para el estado "derrotado".

Salida:
  public/sprites/<id>.gif             animación idle a tamaño nativo
  public/sprites/<id>-defeated.png    primer cuadro, quieto
  public/bossicons/<id>.gif           (solo íconos de landing)

Uso:  python scripts/sprites/import_gifs.py
"""
from __future__ import annotations

import math
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC_DIR = os.path.join(os.path.dirname(__file__), 'originales')
SPRITES = os.path.join(ROOT, 'public', 'sprites')
ICONS = os.path.join(ROOT, 'public', 'bossicons')

# original → (carpeta de salida, id del jefe, ¿cuadro de derrotado?)
JOBS = [
    ('Constructor del vacio.gif', SPRITES, 'constructor-vacio', True),
    ('Contador de almas.gif', SPRITES, 'contador-almas', True),
    ('hydra_boss.gif', SPRITES, 'la-hydra', True),
    ('dragon_boss_pixel.gif', SPRITES, 'dragon-rojo', True),
    ('ojo_dragon.gif', ICONS, 'dragon-rojo', False),
]


def pixel_scale(img: Image.Image) -> int:
    """Lado del "píxel lógico": el MCD de todos los tramos de color iguales."""
    w, h = img.size
    px = img.load()
    g = 0
    for y in range(h):
        run = 1
        for x in range(1, w):
            if px[x, y] == px[x - 1, y]:
                run += 1
            else:
                g = math.gcd(g, run)
                run = 1
        g = math.gcd(g, run)
    for x in range(w):
        run = 1
        for y in range(1, h):
            if px[x, y] == px[x, y - 1]:
                run += 1
            else:
                g = math.gcd(g, run)
                run = 1
        g = math.gcd(g, run)
    return g or 1


def read_frames(path: str) -> tuple[list[Image.Image], list[int]]:
    im = Image.open(path)
    frames, durations = [], []
    for i in range(getattr(im, 'n_frames', 1)):
        im.seek(i)
        frames.append(im.convert('RGBA'))
        durations.append(im.info.get('duration', 100))
    return frames, durations


def to_palette(frames: list[Image.Image]) -> list[Image.Image]:
    """Paleta compartida exacta (sin cuantizar): índice 0 = transparente."""
    colors: dict[tuple[int, int, int], int] = {}
    for fr in frames:
        for r, g, b, a in fr.get_flattened_data():
            if a >= 128 and (r, g, b) not in colors:
                colors[(r, g, b)] = len(colors) + 1
    if len(colors) > 255:
        raise SystemExit('más de 255 colores: no entra en un GIF')
    palette = [0, 0, 0] + [c for rgb in colors for c in rgb]
    out = []
    for fr in frames:
        p = Image.new('P', fr.size, 0)
        p.putpalette(palette + [0] * (768 - len(palette)))
        p.putdata([colors[(r, g, b)] if a >= 128 else 0 for r, g, b, a in fr.get_flattened_data()])
        out.append(p)
    return out


def main() -> None:
    for name, out_dir, boss_id, defeated in JOBS:
        frames, durations = read_frames(os.path.join(SRC_DIR, name))
        k = min(pixel_scale(f) for f in frames)
        if k > 1:
            w, h = frames[0].size
            frames = [f.resize((w // k, h // k), Image.NEAREST) for f in frames]
        pal = to_palette(frames)
        gif = os.path.join(out_dir, f'{boss_id}.gif')
        pal[0].save(gif, save_all=True, append_images=pal[1:], duration=durations,
                    loop=0, disposal=2, transparency=0, optimize=False)
        if defeated:
            frames[0].save(os.path.join(out_dir, f'{boss_id}-defeated.png'))
        print(f'{boss_id:18} {frames[0].size[0]}x{frames[0].size[1]}  ({len(frames)} cuadros, era {k}x)  -> {os.path.relpath(gif, ROOT)}')


if __name__ == '__main__':
    main()
