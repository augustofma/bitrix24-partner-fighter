"""Prepares the CASTELO BRANCO stage art (Rômulo's city, Portugal) from the official illustration.

Input : scripts/stage-art/castelo-branco/source.webp (1672x941: a terrace of the castle walls
        over Castelo Branco, the town's red roofs and the hills behind, a stone tower with
        Arrecife Digital banners, the crowd behind the Arrecife Digital barrier, and a small
        plane towing the white "Arrecife Digital" banner)
Output: public/stages/castelo-branco/ background.jpg, skyline.png, plane.png, propeller.png,
        banner.png (see scripts/stage-art/flyover_art.py), and the placements for
        src/stages/casteloBranco.ts.

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/stage-art/castelo-branco/prepare_castelo_branco.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from flyover_art import FlyoverStage, hsv, prepare  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]


def clouds(image):
    """The cream and the pale blue clouds: coloured, unlike the banner's neutral white (and its
    navy lettering), so they stay in the sky instead of joining the banner."""
    hue, sat, val = hsv(image)
    cream = (hue > 30) & (hue < 70) & (sat > 0.12) & (val > 0.55)
    pale_blue = (hue > 185) & (hue < 235) & (sat > 0.12) & (val > 0.55)
    return cream | pale_blue


CASTELO_BRANCO = FlyoverStage(
    source=ROOT / 'scripts/stage-art/castelo-branco/source.webp',
    out=ROOT / 'public/stages/castelo-branco',
    # Plane, tow lines and banner (with its pole); the clouds inside count as sky (extra_sky).
    sky_box=(255, 80, 862, 214),
    plane_max_x=447,
    propeller_max_x=283,
    # Under the wheels: a cream cloud, not the plane.
    plane_max_y=162,
    banner_min_x=464,
    # The two tow lines, dark blue like the sky's darkest pixels: cleared by box.
    clear_boxes=((448, 110, 464, 166),),
    # Down to the town: the tree on the left, the tower, the flags and their poles cover the
    # flight.
    skyline_rows=250,
    extra_sky=clouds,
    crowd_boxes=(
        ('crowd', (0, 590, 1340, 672)),
        ('barrier', (0, 666, 1340, 750)),
    ),
)

if __name__ == '__main__':
    prepare(CASTELO_BRANCO)
