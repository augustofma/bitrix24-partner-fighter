"""
Pixel-art emblems for the app-themed special VFX, made from the app logos supplied by the
project owner (scripts/vfx-art/source/): 24zap (green chat bubble with a handset), Mindhub
(brain-circuit symbol on a black disc) and Fluidz (purple tile cut by a dark diagonal). The logos are downscaled to a small pixel grid, their
colors reduced to a short palette and given a dark 1 px outline, so they sit in the game's
arcade pixel style instead of being pasted as smooth images.

    python3 scripts/vfx-art/prepare_app_emblems.py

Writes public/vfx/24zap-emblem.png, mindhub-emblem.png, mindhub-sigil.png and fluidz-emblem.png.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "scripts" / "vfx-art" / "source"
OUT = ROOT / "public" / "vfx"
SIZE = 48
OUTLINE = (6, 10, 26, 255)
# Fluidz logo colours (sampled from scripts/vfx-art/source/fluidz-logo.jpg).
FLUIDZ_PURPLE = (99, 91, 254, 255)
FLUIDZ_DARK = (8, 8, 16, 255)


def crop_to_content(image: Image.Image, pad: int = 4) -> Image.Image:
    box = image.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox()
    left, top, right, bottom = box
    side = max(right - left, bottom - top) + pad * 2
    cx, cy = (left + right) // 2, (top + bottom) // 2
    return image.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2))


def pixelate(image: Image.Image, size: int, colors: int) -> Image.Image:
    """Downscale smoothly, then snap alpha and quantize colors: crisp pixel art."""
    small = image.resize((size, size), Image.LANCZOS)
    alpha = small.getchannel("A").point(lambda a: 255 if a >= 110 else 0)
    rgb = small.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGB")
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def outline(image: Image.Image, color=OUTLINE) -> Image.Image:
    """1 px dark border around the opaque shape (4-neighbourhood), on a 2 px larger canvas."""
    w, h = image.size
    out = Image.new("RGBA", (w + 2, h + 2), (0, 0, 0, 0))
    src = image.load()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + 1 + dx, y + 1 + dy
                    if 0 <= nx < w + 2 and 0 <= ny < h + 2:
                        dst[nx, ny] = color
    out.alpha_composite(image, (1, 1))
    return out


def zap_emblem() -> None:
    logo = crop_to_content(Image.open(SOURCE / "24zap-logo.png").convert("RGBA"))
    outline(pixelate(logo, SIZE, 24)).save(OUT / "24zap-emblem.png")


def mindhub_images() -> None:
    logo = crop_to_content(Image.open(SOURCE / "mindhub-logo.png").convert("RGBA"), pad=2)
    w, h = logo.size
    # The white glyph inside the black disc (outside the disc everything is transparent).
    glyph = Image.new("RGBA", logo.size, (0, 0, 0, 0))
    disc = Image.new("RGBA", logo.size, (0, 0, 0, 0))
    src = logo.load()
    gpx = glyph.load()
    dpx = disc.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a < 128:
                continue
            if r > 160 and g > 160 and b > 160:
                gpx[x, y] = (255, 255, 255, 255)
            else:
                dpx[x, y] = (255, 255, 255, 255)
    # Emblem: the game's deep navy disc with a neon cyan rim and a bold white glyph. The glyph
    # mask is shrunk on its own with a low threshold, so its thin strokes survive the grid.
    disc_small = disc.getchannel("A").resize((SIZE, SIZE), Image.LANCZOS).point(lambda a: 255 if a >= 110 else 0)
    glyph_small = glyph.getchannel("A").resize((SIZE, SIZE), Image.LANCZOS).point(lambda a: 255 if a >= 60 else 0)
    small = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    small.paste(Image.new("RGBA", (SIZE, SIZE), (7, 8, 44, 255)), (0, 0), disc_small)
    small.paste(Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255)), (0, 0), glyph_small)
    # Neon rim: the outermost ring of disc pixels turns cyan.
    px = small.load()
    rim = []
    for y in range(SIZE):
        for x in range(SIZE):
            if px[x, y][3] and any(
                not (0 <= x + dx < SIZE and 0 <= y + dy < SIZE) or not px[x + dx, y + dy][3]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            ):
                rim.append((x, y))
    for x, y in rim:
        px[x, y] = (47, 224, 255, 255)
    outline(small).save(OUT / "mindhub-emblem.png")
    # Sigil: the glyph alone, white (tinted and glowed in game), a bit larger.
    sigil_box = glyph.getchannel("A").getbbox()
    glyph_only = crop_to_content(glyph.crop(sigil_box), pad=6) if sigil_box else glyph
    pixelate(glyph_only, 40, 2).save(OUT / "mindhub-sigil.png")


def fluidz_emblem() -> None:
    """Fluidz: the purple tile of the logo cut by its dark curved diagonal (the wordmark is left
    out). Purple stays purple, the cut becomes the logo's near-black, the tile keeps rounded
    (stepped) corners and the game's dark outline."""
    source = Image.open(SOURCE / "fluidz-logo.jpg").convert("RGB")
    px = source.load()
    purple = [(x, y) for y in range(source.height) for x in range(source.width // 3)
              if px[x, y][2] > 200 and px[x, y][0] < 160 and px[x, y][1] < 150]
    left = min(x for x, _ in purple)
    top = min(y for _, y in purple)
    right = max(x for x, _ in purple) + 1
    bottom = max(y for _, y in purple) + 1
    side = max(right - left, bottom - top)
    tile = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    tpx = tile.load()
    for y in range(side):
        for x in range(side):
            sx, sy = left + x, top + y
            if sx >= source.width or sy >= source.height:
                continue
            r, g, b = px[sx, sy]
            is_purple = b > 160 and b > r + 60
            tpx[x, y] = FLUIDZ_PURPLE if is_purple else FLUIDZ_DARK
    small = tile.resize((SIZE, SIZE), Image.LANCZOS)
    # Snap to the two logo colours (crisp pixel art).
    spx = small.load()
    for y in range(SIZE):
        for x in range(SIZE):
            r, g, b, a = spx[x, y]
            spx[x, y] = FLUIDZ_PURPLE if b > 120 and b > r + 40 else FLUIDZ_DARK
    # Rounded tile: stepped transparent corners.
    for y in range(SIZE):
        for x in range(SIZE):
            dx = min(x, SIZE - 1 - x)
            dy = min(y, SIZE - 1 - y)
            if dx + dy < 4:
                spx[x, y] = (0, 0, 0, 0)
    outline(small).save(OUT / "fluidz-emblem.png")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    zap_emblem()
    mindhub_images()
    fluidz_emblem()
    for name in ("24zap-emblem.png", "mindhub-emblem.png", "mindhub-sigil.png", "fluidz-emblem.png"):
        image = Image.open(OUT / name)
        print(name, image.size)
