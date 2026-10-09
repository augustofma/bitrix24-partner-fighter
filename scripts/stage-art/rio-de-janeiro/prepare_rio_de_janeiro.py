"""Prepares the RIO DE JANEIRO stage art (Gabriele's city, Inovar Consulting) from the official
illustration.

Input : scripts/stage-art/rio-de-janeiro/source.webp (1672x941: Copacabana's wave-pattern
        promenade in front of Guanabara Bay, the Sugarloaf with its cable car, Christ the
        Redeemer, Brazilian flags, the crowd behind Inovar Consulting barriers and banners)
Output: public/stages/rio-de-janeiro/background.jpg, scaled to the stage's display size.

A still scene with no flyover; the crowd bands are animated from the background itself
(StageConfig.art.crowd), so there are no separate layers.

Offline tool only (not part of the build). Requires Python 3 + Pillow:
    python scripts/stage-art/rio-de-janeiro/prepare_rio_de_janeiro.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'scripts/stage-art/rio-de-janeiro/source.webp'
OUT = ROOT / 'public/stages/rio-de-janeiro'
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
