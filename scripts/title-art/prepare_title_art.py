"""Splits the approved title art into the layers used by MenuScene.

Inputs : scripts/title-art/source.webp (approved art, 1672x941, logo and button baked in)
Outputs: public/ui/title/background.jpg  960x540, logo and JOGAR button removed (inpainted)
         public/ui/title/logo.png        logo + flame burst with alpha
         public/ui/title/button.png      JOGAR button with alpha
Prints the layer placements (game pixels) to copy into src/scenes/MenuScene.ts.

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/title-art/prepare_title_art.py
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import dilate, erode, inpaint, large_components, layer  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'scripts/title-art/source.webp'
OUT = ROOT / 'public/ui/title'
GAME_SIZE = (960, 540)

# Logo: ellipse that contains the title and its flame burst (source pixels).
LOGO_REGION = (860, 300, 600, 215)  # cx, cy, rx, ry
# JOGAR button box including its dark outline (source pixels).
BUTTON_BOX = (593, 527, 1080, 657)
# Extra ring inpainted around each layer, larger than the logo float / button press travel
# (in source pixels), so moving a layer never uncovers the baked-in original behind it.
LOGO_CLEAR_RING = 12
BUTTON_CLEAR_RING = 10
# Fighter heads and gloves next to the flames are never blurred by the clearance ring
# (x0, y0, x1, y1 in source pixels). The logo mask itself does not reach them.
PROTECTED = (
    (170, 300, 300, 425),
    (300, 430, 405, 535),
    (1395, 320, 1515, 440),
    (1310, 410, 1400, 520),
)


def logo_mask(image):
    """Saturated warm (yellow/orange/pink/magenta) or bright cyan pixels near the title, closed
    and grown to take in the dark letter outline."""
    hsv = np.asarray(image.convert('HSV')).astype(np.float32)
    hue = hsv[..., 0] * 360 / 255
    sat = hsv[..., 1] / 255
    val = hsv[..., 2] / 255
    h, w = sat.shape
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy, rx, ry = LOGO_REGION
    region = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
    warm = (hue <= 62) | (hue >= 292)
    cyan = (hue >= 165) & (hue <= 205) & (val > 0.62)
    bright = region & (sat > 0.42) & (val > 0.5) & (warm | cyan)
    core = large_components(dilate(bright, 2), 4000)
    core = erode(dilate(core, 6), 6)
    return dilate(core, 5)


def button_mask(image):
    """The button's stepped silhouette: span between the gold edges on every row, plus outline."""
    rgb = np.asarray(image).astype(int)
    gold = (rgb[..., 0] > 200) & (rgb[..., 1] > 140) & (rgb[..., 2] < 90)
    x0, y0, x1, y1 = BUTTON_BOX
    mask = np.zeros(gold.shape, bool)
    for y in range(y0, y1):
        xs = np.nonzero(gold[y, x0:x1])[0]
        if len(xs):
            mask[y, x0 + xs.min() : x0 + xs.max() + 1] = True
    return dilate(mask, 4)


def main():
    image = Image.open(SOURCE).convert('RGB')
    sx, sy = GAME_SIZE[0] / image.width, GAME_SIZE[1] / image.height
    logo = logo_mask(image)
    button = button_mask(image)
    hole = dilate(logo, LOGO_CLEAR_RING) | dilate(button, BUTTON_CLEAR_RING)
    for x0, y0, x1, y1 in PROTECTED:
        hole[y0:y1, x0:x1] &= logo[y0:y1, x0:x1]

    OUT.mkdir(parents=True, exist_ok=True)
    background = inpaint(image, hole).resize(GAME_SIZE, Image.LANCZOS)
    background.save(OUT / 'background.jpg', quality=90, optimize=True)

    for name, mask, feather in (('logo', logo, 1.5), ('button', button, 0.6)):
        rgba, (x0, y0, x1, y1) = layer(image, mask, feather)
        size = (round(rgba.width * sx), round(rgba.height * sy))
        rgba.resize(size, Image.LANCZOS).save(OUT / f'{name}.png', optimize=True)
        print(f'{name}: center ({(x0 + x1) / 2 * sx:.1f}, {(y0 + y1) / 2 * sy:.1f}) size {size}')


if __name__ == '__main__':
    main()
