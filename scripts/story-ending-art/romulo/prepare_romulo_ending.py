"""Prepares Romulo's story ending art (the screen shown when his campaign is completed).

Input : scripts/story-ending-art/romulo/source.webp (1672x941: Romulo, from behind, on a seaside promenade, looking at
        the sunset over the beach and the skyline)
Output: public/story/endings/romulo.jpg, 1440x810 (16:9, 1.5x the 960x540 game so it stays
        sharp on big screens and has room for the slow zoom of the ending screen).

A still illustration: no layers. Everything that depends on the campaign (title, route, buttons)
is drawn on top of it by CampaignCompleteScene.

Offline tool only (not part of the build). Requires Python 3 + Pillow:
    python scripts/story-ending-art/romulo/prepare_romulo_ending.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'scripts/story-ending-art/romulo/source.webp'
OUT = ROOT / 'public/story/endings/romulo.jpg'
SIZE = (1440, 810)


def main() -> None:
    image = Image.open(SOURCE).convert('RGB')
    # Cover-crop to exactly 16:9 (the source is 1672x941, a hair taller), centred.
    target = SIZE[0] / SIZE[1]
    width, height = image.size
    if width / height > target:
        crop = round(height * target)
        box = ((width - crop) // 2, 0, (width - crop) // 2 + crop, height)
    else:
        crop = round(width / target)
        box = (0, (height - crop) // 2, width, (height - crop) // 2 + crop)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.crop(box).resize(SIZE, Image.LANCZOS).save(OUT, quality=90, optimize=True)
    print(f'ending: {SIZE[0]}x{SIZE[1]} from {box}')


if __name__ == '__main__':
    main()
