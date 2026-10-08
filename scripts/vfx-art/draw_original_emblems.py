"""
Original pixel-art emblems for specials that have no supplied logo: ALAIO VIBECODE! (João
Guiotti, Isaque Ferreira), GPTMAKER! (Romualdo) and FLUIDZ! (Aislan). Drawn here shape by shape (no source
image, no third-party logo): a neon "</>" code tile and an AI-agent robot tile, with the same
size and 1 px dark outline as the other effect emblems.

    python3 scripts/vfx-art/draw_original_emblems.py

Writes public/vfx/vibecode-emblem.png, gptmaker-emblem.png and fluidz-emblem.png.
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "vfx"
SIZE = 48
OUTLINE = (6, 10, 26, 255)
WHITE = (255, 255, 255, 255)


def gradient_tile(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    """Rounded square (notched pixel corners) with a stepped vertical gradient."""
    tile = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tile)
    steps = 6
    for i in range(steps):
        k = i / (steps - 1)
        color = tuple(round(a + (b - a) * k) for a, b in zip(top, bottom)) + (255,)
        y0 = 2 + i * (SIZE - 4) // steps
        y1 = 2 + (i + 1) * (SIZE - 4) // steps
        draw.rectangle((2, y0, SIZE - 3, y1), fill=color)
    # Pixel-rounded corners.
    for x, y in ((2, 2), (SIZE - 3, 2), (2, SIZE - 3), (SIZE - 3, SIZE - 3)):
        for dx, dy in ((0, 0), (1 if x == 2 else -1, 0), (0, 1 if y == 2 else -1)):
            tile.putpixel((x + dx, y + dy), (0, 0, 0, 0))
    # Top highlight line.
    draw.line((5, 4, SIZE - 6, 4), fill=(255, 255, 255, 110))
    return tile


def sparkle(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, color) -> None:
    draw.line((cx - r, cy, cx + r, cy), fill=color)
    draw.line((cx, cy - r, cx, cy + r), fill=color)
    draw.rectangle((cx - 1, cy - 1, cx + 1, cy + 1), fill=color)


def outline(image: Image.Image, color=OUTLINE) -> Image.Image:
    """1 px dark border around the opaque shape (4-neighbourhood), on a 2 px larger canvas."""
    w, h = image.size
    out = Image.new("RGBA", (w + 2, h + 2), (0, 0, 0, 0))
    src, dst = image.load(), out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    dst[x + 1 + dx, y + 1 + dy] = color
    out.alpha_composite(image, (1, 1))
    return out


def vibecode_emblem() -> Image.Image:
    tile = gradient_tile((123, 44, 191), (255, 47, 180))
    draw = ImageDraw.Draw(tile)
    shadow = (40, 8, 70, 255)
    for ox, oy, color in ((1, 2, shadow), (0, 0, WHITE)):
        # "<"
        draw.line((19 + ox, 15 + oy, 9 + ox, 24 + oy, 19 + ox, 33 + oy), fill=color, width=4)
        # "/"
        draw.line((26 + ox, 14 + oy, 22 + ox, 34 + oy), fill=color, width=3)
        # ">"
        draw.line((29 + ox, 15 + oy, 39 + ox, 24 + oy, 29 + ox, 33 + oy), fill=color, width=4)
    sparkle(draw, 39, 9, 3, (47, 224, 255, 255))
    # Blinking-cursor bar under the code.
    draw.rectangle((14, 39, 22, 41), fill=(47, 224, 255, 255))
    return outline(tile)


def gptmaker_emblem() -> Image.Image:
    tile = gradient_tile((255, 196, 52), (255, 110, 30))
    draw = ImageDraw.Draw(tile)
    navy = (16, 24, 60, 255)
    cyan = (47, 224, 255, 255)
    # Antenna and its light.
    draw.rectangle((23, 9, 24, 14), fill=navy)
    draw.rectangle((21, 6, 26, 10), fill=cyan)
    draw.rectangle((21, 6, 26, 10), outline=navy)
    # Head, ears, face plate.
    draw.rectangle((10, 14, 37, 36), fill=navy)
    draw.rectangle((7, 20, 9, 29), fill=navy)
    draw.rectangle((38, 20, 40, 29), fill=navy)
    draw.rectangle((13, 17, 34, 33), fill=(36, 52, 110, 255))
    # Eyes and a smiling speaker grille.
    draw.rectangle((16, 21, 21, 26), fill=cyan)
    draw.rectangle((26, 21, 31, 26), fill=cyan)
    draw.rectangle((17, 22, 18, 23), fill=WHITE)
    draw.rectangle((27, 22, 28, 23), fill=WHITE)
    draw.line((18, 29, 29, 29), fill=WHITE, width=2)
    # Body plate with a "maker" bolt.
    draw.rectangle((14, 37, 33, 43), fill=navy)
    draw.polygon([(25, 37), (20, 41), (24, 41), (22, 44), (28, 39), (24, 39)], fill=(255, 230, 90, 255))
    sparkle(draw, 40, 9, 3, WHITE)
    return outline(tile)


def fluidz_emblem() -> Image.Image:
    """Pink tile with a glossy liquid drop and two splash droplets."""
    tile = gradient_tile((255, 120, 190), (214, 24, 120))
    draw = ImageDraw.Draw(tile)
    deep = (120, 8, 64, 255)
    pink = (255, 79, 163, 255)
    light = (255, 190, 225, 255)
    # The drop: a pointed top over a round belly (outline first, then fill).
    for grow, color in ((2, deep), (0, WHITE)):
        draw.polygon([(24, 8 - grow), (13 - grow, 26), (35 + grow, 26)], fill=color)
        draw.ellipse((12 - grow, 18 - grow, 36 + grow, 42 + grow), fill=color)
    draw.ellipse((15, 21, 33, 39), fill=light)
    draw.ellipse((18, 26, 32, 40), fill=pink)
    # Gloss.
    draw.rectangle((16, 24, 18, 30), fill=WHITE)
    # Splash droplets.
    for x, y, r in ((40, 30, 3), (8, 34, 2)):
        draw.ellipse((x - r - 1, y - r - 1, x + r + 1, y + r + 1), fill=deep)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=WHITE)
    sparkle(draw, 39, 9, 3, WHITE)
    return outline(tile)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    vibecode_emblem().save(OUT / "vibecode-emblem.png")
    gptmaker_emblem().save(OUT / "gptmaker-emblem.png")
    fluidz_emblem().save(OUT / "fluidz-emblem.png")
    print("wrote vibecode-emblem.png, gptmaker-emblem.png, fluidz-emblem.png")


if __name__ == "__main__":
    main()
