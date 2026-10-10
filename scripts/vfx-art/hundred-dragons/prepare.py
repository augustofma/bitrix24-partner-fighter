"""
Game copies of the CÓLERA DOS 100 DRAGÕES art (Douglas): the energy dragons on black supplied
by the user (source.jpg), cut into the two images the special uses, with the black turned into
transparency.

- dragon-flood.png: the whole band of dragons (the avalanche). The theme scrolls several copies
  of it at different scales, heights and alphas, so a handful of images reads as a hundred.
- dragon-hero.png: the largest dragon with its pack: the lead dragon (small) and the final
  dragon (large).

Alpha comes from brightness (the art is light on black): dark pixels and JPEG noise become
transparent, the glow fades out softly, and the colors are un-premultiplied so the dragons keep
their gold and teal over any stage with normal blending. The ends are faded so copies never
show a hard edge.

    python3 scripts/vfx-art/hundred-dragons/prepare.py
"""

from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "source.jpg"
OUT_DIR = HERE.parents[2] / "public" / "vfx"
# The band of dragons in the source (the rows above and below are other, cut-off art).
BAND = (0, 18, 1220, 180)
HERO = (600, 18, 1010, 180)
# Brightness below FLOOR is background; at FLOOR + RANGE the art is fully opaque.
FLOOR = 14
RANGE = 130


def to_rgba(rgb: np.ndarray, fade_left: int, fade_right: int, fade_y: int) -> Image.Image:
    rgb = rgb.astype(np.float64)
    peak = rgb.max(axis=2)
    alpha = np.clip((peak - FLOOR) / RANGE, 0, 1) ** 0.85
    h, w = alpha.shape
    ramp_x = np.ones(w)
    if fade_left:
        ramp_x[:fade_left] = np.linspace(0, 1, fade_left)
    if fade_right:
        ramp_x[w - fade_right :] = np.linspace(1, 0, fade_right)
    ramp_y = np.ones(h)
    ramp_y[:fade_y] = np.linspace(0, 1, fade_y)
    ramp_y[h - fade_y :] = np.linspace(1, 0, fade_y)
    alpha *= ramp_x[None, :] * ramp_y[:, None]
    # Un-premultiply: the art was composited on black, so color = rgb / coverage.
    coverage = np.clip((peak - FLOOR) / RANGE, 1e-3, 1)[..., None]
    color = np.clip(rgb / np.maximum(coverage, 0.35), 0, 255)
    # Posterized (5 bits per color, 16 alpha levels) so the PNG compresses well: these load at
    # boot with the other emblems, and pixel art takes it without visible banding.
    color = np.floor(color / 8) * 8 + 4
    alpha = np.round(alpha * 15) / 15
    alpha[alpha < 0.07] = 0
    out = np.dstack([color, alpha * 255]).round().clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


source = np.asarray(Image.open(SOURCE).convert("RGB"))
for name, box, fades in [
    ("dragon-flood.png", BAND, (60, 60, 10)),
    ("dragon-hero.png", HERO, (90, 6, 8)),
]:
    left, top, right, bottom = box
    image = to_rgba(source[top:bottom, left:right], *fades)
    path = OUT_DIR / name
    image.save(path, optimize=True)
    print(f"{name}: {image.size[0]}x{image.size[1]}, {path.stat().st_size // 1024} KB")
