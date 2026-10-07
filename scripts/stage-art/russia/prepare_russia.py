"""Prepares the Russia (Moscow, Red Square) stage art from the official illustration.

Input : scripts/stage-art/russia/source.png (1672x941: the Kremlin's Spasskaya tower, Saint
        Basil's Cathedral at sunset, crowd behind Bitrix24 barriers, a biplane towing the
        "Bitrix24" banner)
Output: public/stages/russia/ background.jpg, skyline.png, plane.png, propeller.png,
        banner.png (see scripts/stage-art/flyover_art.py), and the placements for
        src/stages/russia.ts.

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/stage-art/russia/prepare_russia.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from flyover_art import FlyoverStage, hsv, prepare  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]


def sunset_clouds(image):
    """The pink, orange and violet sunset clouds: bright and soft, unlike the domes' strong
    reds and greens or the Kremlin's dark brick."""
    hue, sat, val = hsv(image)
    warm = (hue < 50) | (hue > 260)
    # Some colour (the white banner and the white of the plane are not clouds).
    return warm & (val > 0.72) & (sat > 0.2) & (sat < 0.75)


RUSSIA = FlyoverStage(
    source=ROOT / 'scripts/stage-art/russia/source.png',
    out=ROOT / 'public/stages/russia',
    # Plane, tow lines and banner; the clouds inside count as sky (extra_sky).
    sky_box=(560, 88, 1052, 224),
    plane_max_x=720,
    propeller_max_x=578,
    # Under the wheels: a violet cloud, not the plane.
    plane_max_y=176,
    banner_min_x=760,
    # Down to the Kremlin wall: the Spasskaya tower and the cathedral's domes cover the flight.
    skyline_rows=250,
    extra_sky=sunset_clouds,
    crowd_boxes=(
        # Left of the lamp post and right of it (before the right lamp post).
        ('crowd left', (0, 626, 515, 692)),
        ('crowd right', (590, 626, 1590, 692)),
        ('barrier', (0, 686, 1672, 752)),
    ),
)

if __name__ == '__main__':
    prepare(RUSSIA)
