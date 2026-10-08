"""Prepares the PORTUGAL stage art (Filipe's fight in the story) from the official illustration.

Input : scripts/stage-art/portugal/source.webp (1448x1086, 4:3: a mosaic promenade over the
        Portuguese coast, cliffs and terraced hills, a white town with a bell tower, sailboats,
        Arrecife Digital banners, the crowd behind the Arrecife Digital barrier, seagulls and a
        small plane flying RIGHT, towing the "Arrecife Digital / Sua empresa conectada" banner)
Output: public/stages/portugal/ background.jpg, skyline.png, plane.png, propeller.png,
        banner.png (see scripts/stage-art/flyover_art.py), and the placements for
        src/stages/portugal.ts.

Two differences from the other stages:
- The source is 4:3: it is first cut to 16:9 (CROP: the sky with the plane down to the middle
  of the floor) and scaled to the 1672x941 the shared preparation expects.
- The plane flies to the RIGHT (plane on the right, banner trailing on the left). The shared
  preparation expects the opposite, so it runs on a mirrored copy and every output is mirrored
  back; the placements are converted to the plane's own (unmirrored) frame. The stage uses
  `direction: 'right'`.
All coordinates below (FlyoverStage) are in that MIRRORED 16:9 image (x' = 1671 - x).

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/stage-art/portugal/prepare_portugal.py
"""

import contextlib
import io
import re
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from flyover_art import FlyoverStage, hsv, prepare  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'scripts/stage-art/portugal/source.webp'
OUT = ROOT / 'public/stages/portugal'
# 16:9 cut of the 4:3 source (source px): the plane at the top, the floor below the fighters.
CROP = (0, 60, 1448, 874)
SIZE = (1672, 941)


def clouds(image):
    """The white and pale-blue clouds: bright and barely saturated. Only around the banner and
    the lines (x >= 404) and in front of the propeller (x < 226), never on the white plane."""
    hue, sat, val = hsv(image)
    pale = (val > 0.82) & (sat < 0.5) & (((hue > 180) & (hue < 240)) | (sat < 0.12))
    pale[:, 226:404] = False
    # The cloud above the nose, left of the cockpit (the fuselage starts below y 90), and the
    # one under the nose and the belly (the fuselage ends above y 126; the wheel is dark).
    pale[40:90, 226:262] = True
    pale[126:, 226:274] = True
    return pale


def stage(source):
    return FlyoverStage(
        source=source,
        out=OUT,
        # Plane (right in the art), tow lines and banner; left out: the seagulls (below-left of
        # the banner) and the cloud over the plane (plane_min_y).
        sky_box=(200, 12, 1075, 186),
        plane_max_x=404,
        propeller_max_x=236,
        plane_min_y=64,
        # Clouds right under the wheels stay in the sky.
        plane_max_y=150,
        # The banner is royal blue: like the sky, but darker (sky ~0.95+, banner ~0.75).
        sky_min_value=0.9,
        # ...and a purer blue (hue ~219-223 against the sky's ~206-210).
        sky_max_hue=215,
        extra_sky=clouds,
        # The two tow lines (pale, like the clouds): cleared from the sky by box.
        clear_boxes=((404, 60, 466, 162),),
        # The banner's dark edge would stain the sky filled in around it.
        clear_ring=7,
        banner_min_x=462,
        # Down to the town: the lamp posts and their tall banners, the palms and the hills
        # cover the flight.
        skyline_rows=250,
        crowd_boxes=(
            # Mirrored back below (source x); between the flower planters.
            ('crowd (mirrored)', (172, 615, 1547, 700)),
            ('barrier (mirrored)', (232, 690, 1512, 792)),
        ),
    )


def main() -> None:
    image = Image.open(SOURCE).convert('RGB').crop(CROP).resize(SIZE, Image.LANCZOS)
    with tempfile.TemporaryDirectory() as tmp:
        mirrored = Path(tmp) / 'mirrored.png'
        image.transpose(Image.FLIP_LEFT_RIGHT).save(mirrored)
        log = io.StringIO()
        with contextlib.redirect_stdout(log):
            prepare(stage(mirrored))
    # Every output back to the art's own orientation.
    for name in ('background.jpg', 'skyline.png', 'plane.png', 'propeller.png', 'banner.png'):
        path = OUT / name
        out = Image.open(path)
        flipped = out.transpose(Image.FLIP_LEFT_RIGHT)
        if name.endswith('.jpg'):
            flipped.convert('RGB').save(path, quality=92, optimize=True)
        else:
            flipped.save(path, optimize=True)
    text = log.getvalue()
    plane_w = Image.open(OUT / 'plane.png').width
    prop = re.search(r'propeller center: \(([-\d.]+), ([-\d.]+)\)', text)
    hook = re.search(r'tow hook: \(([-\d.]+), ([-\d.]+)\)', text)
    gap = re.search(r'banner: gap ([-\d.]+), offsetY ([-\d.]+)', text)
    print(text, end='')
    print('--- unmirrored placements (plane frame: x from its top-left, facing right) ---')
    print(f'propeller: x {plane_w - float(prop[1]):.1f}, y {prop[2]}')
    print(f'hook (tail): x {plane_w - float(hook[1]):.1f}, y {hook[2]}')
    print(f'banner gap (banner right edge to the tail): {gap[1]}, offsetY {gap[2]}')
    for label, x0, x1 in re.findall(r'(crowd \(mirrored\)|barrier \(mirrored\)): x (\d+)\.\.(\d+)', text):
        width = 1075
        print(f'{label}: x {width - int(x1)}..{width - int(x0)}')


if __name__ == '__main__':
    main()
