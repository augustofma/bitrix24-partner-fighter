"""Prepares Aislan's story ending art (the screen shown when his campaign is completed).

Input : scripts/story-ending-art/aislan/source.webp (1448x1086, 4:3: Aislan, from behind, at the
        Joinville lookout ("MIRANTE DE JOINVILLE"), watching the sunset over the city)
Output: public/story/endings/aislan.jpg, 1440x810 (16:9, 1.5x the 960x540 game so it stays
        sharp on big screens and has room for the slow zoom of the ending screen).

Unlike the other endings the source is 4:3, so a 16:9 cut loses ~270 px of height and he is
taller than what is kept: the cut starts CROP_TOP px down, keeping his head and some sky above
it (the title goes to the right of his head) and leaving out his lower legs, which would sit
behind the result panel and the buttons anyway.

A still illustration: no layers. Everything that depends on the campaign (title, route, buttons)
is drawn on top of it by CampaignCompleteScene.

Offline tool only (not part of the build). Requires Python 3 + Pillow:
    python scripts/story-ending-art/aislan/prepare_aislan_ending.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'scripts/story-ending-art/aislan/source.webp'
OUT = ROOT / 'public/story/endings/aislan.jpg'
SIZE = (1440, 810)
CROP_TOP = 100


def main() -> None:
    image = Image.open(SOURCE).convert('RGB')
    width, height = image.size
    crop_height = round(width * SIZE[1] / SIZE[0])
    box = (0, CROP_TOP, width, CROP_TOP + crop_height)
    assert box[3] <= height, 'CROP_TOP leaves the image'
    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.crop(box).resize(SIZE, Image.LANCZOS).save(OUT, quality=90, optimize=True)
    print(f'ending: {SIZE[0]}x{SIZE[1]} from {box}')


if __name__ == '__main__':
    main()
