"""Prepares the CURITIBA BRASIL LEADS stage art (Rodolfo's stage, Brasil Leads) from the official
illustration.

Input : scripts/stage-art/curitiba-brasil-leads/source.webp (1672x941: a petit-pavé plaza in front of
        the Jardim Botânico greenhouse, fountains, flower beds, an araucaria, the skyline,
        Brazilian flags, the crowd behind Brasil Leads barriers, pennants and banners)
Output: public/stages/curitiba-brasil-leads/background.jpg, scaled to the stage's display size.

A still scene with no flyover; the crowd bands are animated from the background itself
(StageConfig.art.crowd), so there are no separate layers.

Offline tool only (not part of the build). Requires Python 3 + Pillow:
    python scripts/stage-art/curitiba-brasil-leads/prepare_curitiba_brasil_leads.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'scripts/stage-art/curitiba-brasil-leads/source.webp'
OUT = ROOT / 'public/stages/curitiba-brasil-leads'
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
