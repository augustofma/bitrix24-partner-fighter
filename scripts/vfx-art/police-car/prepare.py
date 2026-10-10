"""
Game copy of Gabriele's patrol car (CHAMA O 190!): the 1448x1086 source at half resolution.

The car is drawn at about 0.28 world px per source px (~400 px long on a 960 px screen), so the
full-size PNG (~750 KB, loaded at boot) only cost download time. Half resolution keeps it
sharper than it is ever drawn; policeTheme.ts keeps its anchors in source pixels and draws the
image at twice the scale.

    python3 scripts/vfx-art/police-car/prepare.py
"""

from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "source.png"
OUT = HERE.parents[2] / "public" / "vfx" / "police-car.png"
FACTOR = 2

image = Image.open(SOURCE).convert("RGBA")
half = image.resize((image.width // FACTOR, image.height // FACTOR), Image.LANCZOS)
half.save(OUT, optimize=True)
print(f"{OUT.name}: {half.size[0]}x{half.size[1]}, {OUT.stat().st_size // 1024} KB")
