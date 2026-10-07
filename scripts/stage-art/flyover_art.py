"""Shared preparation of an illustrated stage with a towed-banner plane (Recife, Joinville).

From the stage's source illustration (1672x941):
- background.jpg: scaled to the display size, with the plane, its tow lines and the banner
  removed from the sky (inpainted);
- plane.png, propeller.png, banner.png: those parts with alpha (animated in code);
- skyline.png: the top rows of the background with the open sky and clouds made transparent,
  drawn OVER the plane so it flies behind buildings, roofs and trees.
Prints the placements (stage image pixels) for src/stages/<id>.ts.

Each stage script (scripts/stage-art/<id>/prepare_<id>.py) only describes where things are in
its own art (a FlyoverStage) and calls prepare(). Offline tool, not part of the build.
"""

import sys
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import dilate, inpaint, large_components, layer  # noqa: E402

# Same framing as the Partner Summit: the arena is wider than the screen (the camera scrolls
# 480 px), so the art is drawn a bit larger than 960x540 and scrolls with parallax.
DISPLAY_SCALE = 960 * 1.12 / 1672
# Sky removed around the flying group, larger than its anti-aliased edge.
CLEAR_RING = 3


@dataclass
class FlyoverStage:
    source: Path
    out: Path
    # Search box of the flying group (source px): x0, y0, x1, y1.
    sky_box: tuple
    # Plane | tow lines | banner, split by x (source px); the propeller is left of the nose.
    plane_max_x: int
    propeller_max_x: int
    banner_min_x: int
    # Rows of the display-size background covered by the skyline occluder.
    skyline_rows: int
    # Past this x only `tail_mask` pixels of the banner are kept (clouds/palms touching it).
    tail_min_x: Optional[int] = None
    tail_mask: Optional[Callable] = None
    # Fill the enclosed holes again after `tail_mask` (a banner kept by colour loses its
    # lettering otherwise).
    refill_after_tail: bool = False
    # Extra pixels (besides the clear blue) that count as sky, e.g. sunset clouds. Called with
    # the source image (flying-group separation) or the display-size background (skyline).
    extra_sky: Optional[Callable] = None
    # Lowest source row of the plane (clouds right under its wheels are left in the sky).
    plane_max_y: Optional[int] = None
    # (label, (x0, y0, x1, y1)) source boxes printed at display scale for the crowd config.
    crowd_boxes: tuple = field(default_factory=tuple)


def hsv(image):
    values = np.asarray(image.convert('HSV')).astype(np.float32)
    return values[..., 0] * 360 / 255, values[..., 1] / 255, values[..., 2] / 255


def red_mask(image):
    hue, sat, _ = hsv(image)
    return ((hue < 25) | (hue > 330)) & (sat > 0.35)


def orange_mask(image):
    hue, sat, _ = hsv(image)
    return (hue > 8) & (hue < 45) & (sat > 0.45)


def sky_mask(image):
    """Clear, bright blue sky (the plane, banner and lines are anything else; their dark-blue
    outlines and lettering are blue too, but dark)."""
    hue, sat, val = hsv(image)
    return (hue > 190) & (hue < 235) & (sat > 0.45) & (val > 0.6)


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


def skyline(background, rows, extra_sky=None):
    """The architecture against the sky: open sky and clouds are reached from the top edge;
    what is left and grows from the bottom of the band (buildings, domes, palms, poles) is
    opaque. Floating clouds stay transparent, so they never hide the banner."""
    hue, sat, val = hsv(background)
    open_sky = ((hue > 185) & (hue < 240) & (sat > 0.3) & (val > 0.55)) | (
        (val > 0.78) & (sat < 0.38)
    )
    if extra_sky is not None:
        open_sky |= extra_sky(background)
    width = open_sky.shape[1]
    sky = flood(open_sky, [(0, x) for x in range(width)], rows)
    solid = ~sky
    solid[rows:] = False
    occluder = flood(solid, [(rows - 1, x) for x in range(width)], rows)
    rgba = np.dstack([np.asarray(background), (occluder * 255).astype(np.uint8)])
    # Hard alpha: its pixels are the background's own, so its edges never show.
    return Image.fromarray(rgba, 'RGBA').crop((0, 0, width, rows))


def split(mask, min_x, max_x):
    out = np.zeros(mask.shape, bool)
    out[:, min_x:max_x] = mask[:, min_x:max_x]
    return out


def scaled(value):
    return round(value * DISPLAY_SCALE, 1)


def prepare(stage):
    """Writes background.jpg, skyline.png, plane.png, propeller.png and banner.png for one stage
    and prints the placements. `stage` is a FlyoverStage."""
    SOURCE, OUT, SKY_BOX = stage.source, stage.out, stage.sky_box
    PLANE_MAX_X, PROPELLER_MAX_X = stage.plane_max_x, stage.propeller_max_x
    BANNER_MIN_X, SKYLINE_ROWS = stage.banner_min_x, stage.skyline_rows
    image = Image.open(SOURCE).convert('RGB')
    x0, y0, x1, y1 = SKY_BOX
    group = np.zeros(image.size[::-1], bool)
    sky = sky_mask(image)
    if stage.extra_sky is not None:
        sky |= stage.extra_sky(image)
    group[y0:y1, x0:x1] = ~sky[y0:y1, x0:x1]
    group = fill_holes(group, SKY_BOX)
    if stage.tail_min_x is not None:
        tail = stage.tail_min_x
        group[:, tail:] &= stage.tail_mask(image)[:, tail:]
        if stage.refill_after_tail:
            group = fill_holes(group, SKY_BOX)

    if stage.plane_max_y is not None:
        group[stage.plane_max_y :, x0:PLANE_MAX_X] = False
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
    skyline(Image.open(OUT / 'background.jpg').convert('RGB'), SKYLINE_ROWS, stage.extra_sky).save(
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

    # Crowd bands (people above the barrier) and the barriers in front of them (display px).
    for label, (cx0, cy0, cx1, cy1) in stage.crowd_boxes:
        box = [round(v * DISPLAY_SCALE) for v in (cx0, cy0, cx1, cy1)]
        print(f'{label}: x {box[0]}..{box[2]}, y {box[1]}..{box[3]}')
