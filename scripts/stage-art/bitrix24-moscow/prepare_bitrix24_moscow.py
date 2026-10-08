"""Prepares the BITRIX24 MOSCOU stage art (the Bitrix24 office in Moscow, Dmitry's stage and the
story's final fight) from the official illustration.

Input : scripts/stage-art/bitrix24-moscow/source.png (1672x941: the Bitrix24 hall with the
        Kremlin and Moscow City behind the glass wall, the bear statue, the trophy shelf, the
        open-plan desks and the Bitrix24 logo on the floor)
Output: public/stages/bitrix24-moscow/background.jpg, scaled to the stage's display size.

A still scene, so there are no separate layers: the stage is the background alone.

Offline tool only (not part of the build). Requires Python 3 + Pillow:
    python scripts/stage-art/bitrix24-moscow/prepare_bitrix24_moscow.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'scripts/stage-art/bitrix24-moscow/source.png'
OUT = ROOT / 'public/stages/bitrix24-moscow'
# Same display scale as the other stages: the art is a bit wider than the 960 px screen so the
# camera can scroll over it with parallax.
DISPLAY_SCALE = 960 * 1.12 / 1672


def main() -> None:
    image = Image.open(SOURCE).convert('RGB')
    size = (round(image.width * DISPLAY_SCALE), round(image.height * DISPLAY_SCALE))
    OUT.mkdir(parents=True, exist_ok=True)
    image.resize(size, Image.LANCZOS).save(OUT / 'background.jpg', quality=92, optimize=True)
    print(f'background: {size[0]}x{size[1]}')


if __name__ == '__main__':
    main()
