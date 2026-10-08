"""Prepares the ESPANHA stage art (Isaque Ferreira's fight in the story) from the official art.

Input : scripts/stage-art/spain/source.webp (1672x941: Madrid's Puerta de Alcalá with Bitrix24
        banners, fountains and flowers, the Metropolis dome and palaces behind, a LED screen,
        Spanish flags, the crowd behind the Bitrix24 barriers and a small jet towing the
        "Bitrix24" banner)
Output: public/stages/spain/ background.jpg, skyline.png, plane.png, banner.png (a jet: no
        propeller layer; see scripts/stage-art/flyover_art.py), and the placements for
        src/stages/spain.ts.

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/stage-art/spain/prepare_spain.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from flyover_art import FlyoverStage, prepare  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]

SPAIN = FlyoverStage(
    source=ROOT / 'scripts/stage-art/spain/source.webp',
    out=ROOT / 'public/stages/spain',
    # Jet, tow lines and banner, in clear sky (the cloud at the banner's right end stays sky).
    sky_box=(1018, 32, 1496, 120),
    plane_max_x=1145,
    propeller_max_x=None,
    banner_min_x=1196,
    # The banner is royal blue, the sky a lighter blue: separate by brightness and hue.
    sky_min_value=0.86,
    clear_ring=6,
    skyline_rows=250,
    crowd_boxes=(
        ('crowd left', (0, 560, 560, 620)),
        ('crowd right', (1105, 560, 1672, 620)),
        ('barrier left', (0, 608, 560, 690)),
        ('barrier right', (1105, 608, 1672, 690)),
    ),
)

if __name__ == '__main__':
    prepare(SPAIN)
