"""Prepares the CURITIBA stage art (Gabriel Mattozo's city) from the official illustration.

Input : scripts/stage-art/curitiba/source.webp (1672x941: the Jardim Botânico greenhouse with
        its fountain and French gardens, the city's towers behind, GMC / Gabriel Mattozo banners
        and tents, the crowd behind the purple barrier, and a small purple plane towing the
        "GMC" banner)
Output: public/stages/curitiba/ background.jpg, skyline.png, plane.png, propeller.png,
        banner.png (see scripts/stage-art/flyover_art.py), and the placements for
        src/stages/curitiba.ts.

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/stage-art/curitiba/prepare_curitiba.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from flyover_art import FlyoverStage, prepare  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]

CURITIBA = FlyoverStage(
    source=ROOT / 'scripts/stage-art/curitiba/source.webp',
    out=ROOT / 'public/stages/curitiba',
    # Plane, tow lines and the GMC banner, in clear blue sky (above the clouds on the right).
    sky_box=(924, 48, 1446, 123),
    plane_max_x=1090,
    propeller_max_x=946,
    banner_min_x=1100,
    # Down past the towers: the lamp posts, the tall banners and the trees cover the flight.
    skyline_rows=250,
    # The pale towers behind the greenhouse (from ~118 down) cover the plane; the clouds above stay sky.
    pale_solid_from=118,
    crowd_boxes=(
        # Left of the left lamp post, between the posts, right of the right lamp post.
        ('crowd left', (0, 528, 150, 600)),
        ('crowd middle', (210, 528, 1468, 600)),
        ('crowd right', (1530, 528, 1672, 600)),
        ('barrier', (0, 596, 1672, 692)),
    ),
)

if __name__ == '__main__':
    prepare(CURITIBA)
