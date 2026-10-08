"""Prepares the Joinville stage art of Aislan's encounter (ZOPU edition) from the official
illustration. Romualdo's Joinville (scripts/stage-art/joinville/) is unchanged.

Input : scripts/stage-art/joinville-zopu/source.png (1672x941: the same Joinville gate, now
        with ZOPU flags and banners and a plane towing the white "zopu" banner)
Output: public/stages/joinville-zopu/ background.jpg, skyline.png, plane.png, propeller.png,
        banner.png (see scripts/stage-art/flyover_art.py), and the placements for
        src/stages/joinvilleZopu.ts.

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/stage-art/joinville-zopu/prepare_joinville_zopu.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from flyover_art import FlyoverStage, hsv, prepare  # noqa: E402
from art_tools import dilate, erode  # noqa: E402  (on the path once flyover_art is imported)

ROOT = Path(__file__).resolve().parents[3]


# Source columns of the banner's green logo tile.
LOGO_COLUMNS = (1240, 1370)


def cream_banner(image):
    """The banner's warm off-white cloth and its shaded edges. The clouds touching it are white
    with a blue cast, so a warm hue (or no hue at all) keeps the cloth and drops the clouds; the
    dark lettering is enclosed and comes back with the refill (a small closing seals the shaded
    edge first). The green logo tile reaches the bottom edge, so it is kept by its own colour,
    only in its columns (the palms under the tail are green too)."""
    hue, sat, val = hsv(image)
    cloth = (val > 0.55) & (sat < 0.32) & ((hue < 75) | (sat < 0.03))
    logo = (hue > 110) & (hue < 175) & (sat > 0.35) & (val > 0.25)
    logo[:, :LOGO_COLUMNS[0]] = False
    logo[:, LOGO_COLUMNS[1] :] = False
    return erode(dilate(cloth, 3), 3) | dilate(logo, 1)


JOINVILLE_ZOPU = FlyoverStage(
    source=ROOT / 'scripts/stage-art/joinville-zopu/source.png',
    out=ROOT / 'public/stages/joinville-zopu',
    # Same composition as Romualdo's Joinville: above the palms on the right.
    sky_box=(965, 55, 1612, 176),
    plane_max_x=1150,
    propeller_max_x=988,
    banner_min_x=1183,
    # Down to the "Joinville" lettering: the gate roof and every palm cover the flight band.
    skyline_rows=250,
    # The rope knots on the banner's left edge stay in the group (cleared from the sky).
    tail_min_x=1192,
    tail_mask=cream_banner,
    refill_after_tail=True,
    crowd_boxes=(
        ('crowd left', (50, 590, 258, 680)),
        ('barrier left', (50, 675, 258, 708)),
        ('crowd right', (1300, 600, 1640, 686)),
        ('barrier right', (1300, 682, 1640, 714)),
    ),
)

if __name__ == '__main__':
    prepare(JOINVILLE_ZOPU)
