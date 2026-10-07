"""Prepares the Recife (Marco Zero) stage art from the official illustration.

Input : scripts/stage-art/recife/source.png (1672x941, the approved pixel-art scene)
Output: public/stages/recife/background.jpg  scaled to the stage's display size, with the plane,
                                              its tow lines and the "Arrecife Digital" banner
                                              removed from the sky (inpainted)
        public/stages/recife/plane.png       the plane's body with alpha
        public/stages/recife/propeller.png   its propeller blade (spun in code)
        public/stages/recife/banner.png      the banner with alpha (animated in strips)
        public/stages/recife/skyline.png     the top of the background with the sky (and clouds)
                                              made transparent: buildings, domes and palms drawn
                                              OVER the plane so it flies behind them
Prints the placements (stage image pixels) to copy into src/stages/recife.ts.

The crowd needs no extra file: the stage view animates crops of the background itself.

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/stage-art/recife/prepare_recife.py
"""

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from art_tools import dilate, inpaint, large_components, layer  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'scripts/stage-art/recife/source.png'
OUT = ROOT / 'public/stages/recife'

# Same framing as the Partner Summit: the arena is wider than the screen (the camera scrolls
# 480 px), so the art is drawn a bit larger than 960x540 and scrolls with parallax.
DISPLAY_SCALE = 960 * 1.12 / 1672

# Search box of the flying group (source pixels): x0, y0, x1, y1. Clouds and palms below it
# are left out on purpose.
SKY_BOX = (745, 40, 1622, 190)
# Plane | tow lines | banner, split by x (source pixels).
PLANE_MAX_X = 912
# The propeller blade and hub, left of the nose (source pixels).
PROPELLER_MAX_X = 775
BANNER_MIN_X = 948
# Past this x only the banner's red swallowtail is kept: clouds touch its notch.
TAIL_MIN_X = 1583
# Rows of the (display-size) background the skyline occluder covers: below the plane's path.
SKYLINE_ROWS = 200
# Sky removed around the group, larger than its anti-aliased edge.
CLEAR_RING = 3


def sky_mask(image):
    """Clear, bright blue sky (the plane, banner and lines are anything else; their dark-blue
    outlines and lettering are blue too, but dark)."""
    hue, sat, val = hsv(image)
    return (hue > 190) & (hue < 235) & (sat > 0.45) & (val > 0.6)


def hsv(image):
    values = np.asarray(image.convert('HSV')).astype(np.float32)
    return values[..., 0] * 360 / 255, values[..., 1] / 255, values[..., 2] / 255


def red_mask(image):
    hue, sat, _ = hsv(image)
    return ((hue < 25) | (hue > 330)) & (sat > 0.35)


def fill_holes(mask, box):
    """Inside `box`, sky pixels not reachable from its border belong to the object (the banner's
    blue lettering, the cockpit windows)."""
    x0, y0, x1, y1 = box
    inside = ~mask[y0:y1, x0:x1]
    h, w = inside.shape
    outside = np.zeros(inside.shape, bool)
    queue = deque()
    for y in range(h):
        for x in (0, w - 1):
            if inside[y, x]:
                outside[y, x] = True
                queue.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if inside[y, x] and not outside[y, x]:
                outside[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for yn, xn in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yn < h and 0 <= xn < w and inside[yn, xn] and not outside[yn, xn]:
                outside[yn, xn] = True
                queue.append((yn, xn))
    filled = mask.copy()
    filled[y0:y1, x0:x1] = mask[y0:y1, x0:x1] | ~outside
    return filled


def flood(mask, seeds, rows):
    """Pixels of `mask` 4-connected to `seeds`, within the first `rows` rows."""
    reach = np.zeros(mask.shape, bool)
    queue = deque()
    for seed in seeds:
        if mask[seed]:
            reach[seed] = True
            queue.append(seed)
    while queue:
        y, x = queue.popleft()
        for yn, xn in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yn < rows and 0 <= xn < mask.shape[1] and mask[yn, xn] and not reach[yn, xn]:
                reach[yn, xn] = True
                queue.append((yn, xn))
    return reach


def skyline(background):
    """The architecture against the sky: open sky and clouds are reached from the top edge;
    what is left and grows from the bottom of the band (buildings, domes, palms, poles) is
    opaque. Floating clouds stay transparent, so they never hide the banner."""
    hue, sat, val = hsv(background)
    open_sky = ((hue > 185) & (hue < 240) & (sat > 0.3) & (val > 0.55)) | (
        (val > 0.78) & (sat < 0.38)
    )
    width = open_sky.shape[1]
    sky = flood(open_sky, [(0, x) for x in range(width)], SKYLINE_ROWS)
    solid = ~sky
    solid[SKYLINE_ROWS:] = False
    occluder = flood(solid, [(SKYLINE_ROWS - 1, x) for x in range(width)], SKYLINE_ROWS)
    rgba = np.dstack([np.asarray(background), (occluder * 255).astype(np.uint8)])
    # Hard alpha: its pixels are the background's own, so its edges never show.
    return Image.fromarray(rgba, 'RGBA').crop((0, 0, width, SKYLINE_ROWS))


def split(mask, min_x, max_x):
    out = np.zeros(mask.shape, bool)
    out[:, min_x:max_x] = mask[:, min_x:max_x]
    return out


def scaled(value):
    return round(value * DISPLAY_SCALE, 1)


def main():
    image = Image.open(SOURCE).convert('RGB')
    x0, y0, x1, y1 = SKY_BOX
    group = np.zeros(image.size[::-1], bool)
    group[y0:y1, x0:x1] = ~sky_mask(image)[y0:y1, x0:x1]
    group = fill_holes(group, SKY_BOX)
    group[:, TAIL_MIN_X:] &= red_mask(image)[:, TAIL_MIN_X:]

    whole_plane = large_components(split(group, x0, PLANE_MAX_X), 200)
    propeller = split(whole_plane, x0, PROPELLER_MAX_X)
    plane = split(whole_plane, PROPELLER_MAX_X, PLANE_MAX_X)
    banner = large_components(split(group, BANNER_MIN_X, x1), 2000)
    # Everything else in the box: the two tow lines (redrawn in code so the banner can trail).
    lines = group & ~dilate(plane | banner, 1)

    size = (round(image.width * DISPLAY_SCALE), round(image.height * DISPLAY_SCALE))
    OUT.mkdir(parents=True, exist_ok=True)
    hole = dilate(group, CLEAR_RING)
    inpaint(image, hole).resize(size, Image.LANCZOS).save(
        OUT / 'background.jpg', quality=92, optimize=True
    )
    print(f'background: {size[0]}x{size[1]}')
    # From the saved JPEG itself, so the occluder's pixels are exactly what is on screen.
    skyline(Image.open(OUT / 'background.jpg').convert('RGB')).save(
        OUT / 'skyline.png', optimize=True
    )
    print(f'skyline occluder: {size[0]}x{SKYLINE_ROWS}')

    boxes = {}
    for name, mask in (('plane', plane), ('propeller', propeller), ('banner', banner)):
        rgba, (bx0, by0, bx1, by1) = layer(image, mask, 0.5)
        boxes[name] = (bx0, by0, bx1, by1)
        out = rgba.resize(
            (round(rgba.width * DISPLAY_SCALE), round(rgba.height * DISPLAY_SCALE)), Image.LANCZOS
        )
        out.save(OUT / f'{name}.png', optimize=True)
        print(
            f'{name}: left {scaled(bx0)} top {scaled(by0)} '
            f'size {out.size[0]}x{out.size[1]} (source {bx0},{by0}..{bx1},{by1})'
        )

    # Placements relative to the plane body's top-left (display px).
    px0, py0 = boxes['plane'][:2]
    rx0, ry0, rx1, ry1 = boxes['propeller']
    print(f'propeller center: ({scaled((rx0 + rx1) / 2 - px0)}, {scaled((ry0 + ry1) / 2 - py0)})')
    bx0, by0 = boxes['banner'][:2]
    print(f'banner: gap {scaled(bx0 - boxes["plane"][2])}, offsetY {scaled(by0 - py0)}')
    # Tow lines: where they leave the plane's tail.
    tail_lines = split(lines, PLANE_MAX_X - 12, BANNER_MIN_X)
    ty, tx = np.nonzero(tail_lines)
    if len(tx):
        print(f'tow hook: ({scaled(tx.min() - px0)}, {scaled(ty.mean() - py0)})')

    # Crowd band (people above the barrier) and the barrier in front of it (display px).
    for label, (cx0, cy0, cx1, cy1) in (
        ('crowd', (0, 566, 1672, 652)),
        ('barrier', (0, 646, 1672, 706)),
    ):
        box = [round(v * DISPLAY_SCALE) for v in (cx0, cy0, cx1, cy1)]
        print(f'{label}: x {box[0]}..{box[2]}, y {box[1]}..{box[3]}')


if __name__ == '__main__':
    main()
