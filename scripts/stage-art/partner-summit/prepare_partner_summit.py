"""Prepares the Partner Summit stage art from the approved illustration.

Input : scripts/stage-art/partner-summit/source.webp (1672x941)
Output: public/stages/partner-summit/background.jpg  scaled to the stage's display size, with
                                                      the president's head and raised hand
                                                      removed (inpainted)
        public/stages/partner-summit/president-head.png  head + neck with alpha
        public/stages/partner-summit/president-hand.png  raised hand + wrist with alpha
Prints the layer placements (stage image pixels) to copy into src/stages/partnerSummit.ts.

The crowd needs no extra file: StageView animates crops of the background itself.

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/stage-art/partner-summit/prepare_partner_summit.py
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from art_tools import dilate, inpaint, large_components, layer  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'scripts/stage-art/partner-summit/source.webp'
OUT = ROOT / 'public/stages/partner-summit'

# The stage is wider than the screen (the camera scrolls 480 px), so the art is drawn a bit
# larger than the 960x540 screen and scrolls with parallax: display width = 960 * 1.12.
DISPLAY_SCALE = 960 * 1.12 / 1672

# Search boxes (source pixels): x0, y0, x1, y1.
HEAD_BOX = (810, 368, 858, 411)
HAND_BOX = (842, 405, 861, 437)
# Inpainted ring around each moving part, larger than its motion (head turn/tilt, hand wave).
HEAD_CLEAR_RING = 4
HAND_CLEAR_RING = 5


def person_mask(image):
    """The president against the LED wall: skin/hair (warm hues), dark clothes or grey hair,
    while the wall behind him is bright blue/violet."""
    hsv = np.asarray(image.convert('HSV')).astype(np.float32)
    hue = hsv[..., 0] * 360 / 255
    sat = hsv[..., 1] / 255
    val = hsv[..., 2] / 255
    skin = ((hue <= 45) | (hue >= 340)) & (sat > 0.25) & (val > 0.5)
    person = (hue <= 45) | (hue >= 340) | (val < 0.55) | (sat < 0.25)
    return person, skin


def in_box(mask, box):
    x0, y0, x1, y1 = box
    out = np.zeros(mask.shape, bool)
    out[y0:y1, x0:x1] = mask[y0:y1, x0:x1]
    return out


def main():
    image = Image.open(SOURCE).convert('RGB')
    person, skin = person_mask(image)
    head = large_components(in_box(person, HEAD_BOX), 150)
    hand = dilate(large_components(in_box(skin, HAND_BOX), 40), 1) & in_box(person, HAND_BOX)
    hole = dilate(head, HEAD_CLEAR_RING) | dilate(hand, HAND_CLEAR_RING)

    size = (round(image.width * DISPLAY_SCALE), round(image.height * DISPLAY_SCALE))
    OUT.mkdir(parents=True, exist_ok=True)
    inpaint(image, hole).resize(size, Image.LANCZOS).save(
        OUT / 'background.jpg', quality=92, optimize=True
    )
    print(f'background: {size[0]}x{size[1]}')

    # Pivots (source pixels): bottom of the neck, and the wrist.
    pivots = {}
    ys, xs = np.nonzero(head)
    pivots['head'] = ((xs.min() + xs.max()) / 2, ys.max())
    ys, xs = np.nonzero(hand)
    pivots['hand'] = ((xs.min() + xs.max()) / 2, ys.max())

    for name, mask in (('head', head), ('hand', hand)):
        rgba, (x0, y0, x1, y1) = layer(image, mask, 0.6)
        scaled = rgba.resize(
            (round(rgba.width * DISPLAY_SCALE), round(rgba.height * DISPLAY_SCALE)), Image.LANCZOS
        )
        scaled.save(OUT / f'president-{name}.png', optimize=True)
        px, py = pivots[name]
        origin = ((px - x0) / (x1 - x0), (py - y0) / (y1 - y0))
        print(
            f'{name}: pivot ({px * DISPLAY_SCALE:.1f}, {py * DISPLAY_SCALE:.1f}) '
            f'origin ({origin[0]:.2f}, {origin[1]:.2f}) size {scaled.size}'
        )

    # Bands of the crowd and the barrier in front of it, for the crowd animation (display px).
    for label, (x0, y0, x1, y1) in (
        ('crowd left', (0, 405, 575, 566)),
        ('crowd right', (1100, 405, 1672, 566)),
        ('barrier', (0, 560, 1672, 634)),
    ):
        box = [round(v * DISPLAY_SCALE) for v in (x0, y0, x1, y1)]
        print(f'{label}: x {box[0]}..{box[2]}, y {box[1]}..{box[3]}')


if __name__ == '__main__':
    main()
