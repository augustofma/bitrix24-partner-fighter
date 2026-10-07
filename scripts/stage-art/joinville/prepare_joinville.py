"""Prepares the Joinville stage art (Romualdo's city) from the official illustration.

Input : scripts/stage-art/joinville/source.png (1672x941: the Joinville gate, crowd behind
        the fences, CRMThink flags and a plane towing the orange "CRMThink" banner)
Output: public/stages/joinville/ background.jpg, skyline.png, plane.png, propeller.png,
        banner.png (see scripts/stage-art/flyover_art.py), and the placements for
        src/stages/joinville.ts.

The crowd needs no extra file: the stage view animates crops of the background itself.

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/stage-art/joinville/prepare_joinville.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from flyover_art import FlyoverStage, orange_mask, prepare  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]

JOINVILLE = FlyoverStage(
    source=ROOT / 'scripts/stage-art/joinville/source.png',
    out=ROOT / 'public/stages/joinville',
    # Above the palms on the right; the clouds that touch the banner are removed below.
    sky_box=(965, 55, 1612, 176),
    plane_max_x=1150,
    propeller_max_x=988,
    banner_min_x=1183,
    # Down to the "Joinville" lettering: the gate roof and every palm cover the flight band.
    skyline_rows=250,
    # The whole banner is kept by its orange (clouds touch it above, below and at the tail);
    # its white lettering and logo are enclosed, so they come back with the refill.
    tail_min_x=1189,
    tail_mask=orange_mask,
    refill_after_tail=True,
    crowd_boxes=(
        # Left of the gate (after the lamp post) and right of it (before the lamp post).
        ('crowd left', (50, 590, 258, 680)),
        ('barrier left', (50, 675, 258, 708)),
        ('crowd right', (1300, 600, 1640, 686)),
        ('barrier right', (1300, 682, 1640, 714)),
    ),
)

if __name__ == '__main__':
    prepare(JOINVILLE)
