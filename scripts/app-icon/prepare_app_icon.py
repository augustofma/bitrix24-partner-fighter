"""Builds the installable app icons (web manifest) from the title logo.

Input : public/ui/title/logo.png (the title screen logo layer, transparent background)
Output: public/icons/icon-{180,192,512}.png (180 is the iOS home screen icon): the logo
        centred on the game's night navy, square, with a safe margin so maskable crops never
        cut it.

Offline tool only (not part of the build). Requires Python 3 + Pillow:
    python scripts/app-icon/prepare_app_icon.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
LOGO = ROOT / 'public/ui/title/logo.png'
OUT = ROOT / 'public/icons'
BACKGROUND = (11, 8, 32, 255)
SAFE = 0.8  # Share of the side the logo may use (maskable icons keep the central 80%).


def main() -> None:
    logo = Image.open(LOGO).convert('RGBA')
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (180, 192, 512):
        icon = Image.new('RGBA', (size, size), BACKGROUND)
        scale = size * SAFE / max(logo.size)
        art = logo.resize((round(logo.width * scale), round(logo.height * scale)), Image.LANCZOS)
        icon.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
        icon.convert('RGB').save(OUT / f'icon-{size}.png', optimize=True)
        print(f'icon-{size}.png')


if __name__ == '__main__':
    main()
