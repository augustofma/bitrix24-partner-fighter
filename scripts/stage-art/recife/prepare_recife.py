"""Prepares the Recife (Marco Zero) stage art from the official illustration.

Input : scripts/stage-art/recife/source.png (1672x941, the approved pixel-art scene)
Output: public/stages/recife/ background.jpg, skyline.png, plane.png, propeller.png, banner.png
        (see scripts/stage-art/flyover_art.py), and the placements for src/stages/recife.ts.

The crowd needs no extra file: the stage view animates crops of the background itself.

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/stage-art/recife/prepare_recife.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from flyover_art import FlyoverStage, prepare, red_mask  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]

RECIFE = FlyoverStage(
    source=ROOT / 'scripts/stage-art/recife/source.png',
    out=ROOT / 'public/stages/recife',
    # Clouds and palms below the box are left out on purpose.
    sky_box=(745, 40, 1622, 190),
    plane_max_x=912,
    propeller_max_x=775,
    banner_min_x=948,
    skyline_rows=200,
    # Past this x only the banner's red swallowtail is kept: clouds touch its notch.
    tail_min_x=1583,
    tail_mask=red_mask,
    crowd_boxes=(
        ('crowd', (0, 566, 1672, 652)),
        ('barrier', (0, 646, 1672, 706)),
    ),
)

if __name__ == '__main__':
    prepare(RECIFE)
