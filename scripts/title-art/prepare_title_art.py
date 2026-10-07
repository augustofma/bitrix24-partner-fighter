"""Splits the approved title art into the layers used by MenuScene.

Input : scripts/title-art/source.webp (approved art, 1672x941: João Guiotti on the left,
        Isaque Ferreira on the right, neon arena, logo and START button baked in)
Output: public/ui/title/background.jpg  960x540: logo, START button, hint text and João's hair
                                         removed (inpainted)
        public/ui/title/logo.png        BITRIX24 / PARTNER FIGHTER logo with alpha
        public/ui/title/button.png      START button with alpha
        public/ui/title/glow.png        soft round glow (arena light pulses)
        public/ui/title/wind-*.png      the parts the wind moves (hair, collars, backs, hems,
                                         sleeves), each with alpha
        src/ui/title/titleArtLayout.ts  where every layer sits (generated, game pixels)

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/title-art/prepare_title_art.py
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import dilate, erode, inpaint, large_components, layer  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'scripts/title-art/source.webp'
OUT = ROOT / 'public/ui/title'
LAYOUT = ROOT / 'src/ui/title/titleArtLayout.ts'
GAME_SIZE = (960, 540)

# Logo: title letters with their flames and spikes (source pixels).
LOGO_BOX = (405, 70, 1275, 505)
# The trophy under the logo is not part of it.
TROPHY_BOX = (780, 480, 900, 941)
# START button box including its dark outline (source pixels).
BUTTON_BOX = (560, 670, 1112, 818)
# "— PRESSIONE START OU TOQUE —" (redrawn in code, so it can pulse).
HINT_BOX = (570, 824, 1102, 870)
# Rings inpainted around the logo and the button, larger than their float / press travel
# (source pixels), so moving them never uncovers the baked-in original.
LOGO_CLEAR_RING = 16
BUTTON_CLEAR_RING = 10

# João's hair: the box holds the hair above the glasses line (the frames are left out).
HAIR_BOXES = ((160, 278, 380, 372), (160, 372, 256, 398))
HAIR_RING = 4

# Cloth patches moved by the wind: soft ellipses (cx, cy, rx, ry in source pixels), kept clear
# of faces, hands and printed logos. `anchor` is the edge sewn to the body (it barely moves);
# `strips` the direction the patch is cut in (rows sway sideways, columns flutter up/down).
CLOTH = {
    'joao-back': dict(ellipse=(105, 410, 112, 48), anchor='bottom', strips='rows'),
    'joao-collar': dict(ellipse=(185, 438, 40, 30), anchor='bottom', strips='rows'),
    'joao-hem': dict(ellipse=(105, 646, 108, 40), anchor='top', strips='rows'),
    'joao-sleeve': dict(ellipse=(282, 545, 48, 55), anchor='left', strips='columns'),
    'isaque-collar': dict(ellipse=(1510, 470, 46, 28), anchor='bottom', strips='rows'),
    'isaque-back': dict(ellipse=(1618, 505, 54, 98), anchor='left', strips='columns'),
    'isaque-hem': dict(ellipse=(1535, 656, 118, 40), anchor='top', strips='rows'),
    'isaque-sleeve': dict(ellipse=(1372, 596, 48, 58), anchor='right', strips='columns'),
}


def hsv(image):
    values = np.asarray(image.convert('HSV')).astype(np.float32)
    return values[..., 0] * 360 / 255, values[..., 1] / 255, values[..., 2] / 255


def box(shape, b):
    mask = np.zeros(shape, bool)
    x0, y0, x1, y1 = b
    mask[y0:y1, x0:x1] = True
    return mask


def logo_mask(image):
    """Warm/pink/purple saturated or near-white pixels (letters and flames) and the bright cyan
    of BITRIX24, closed and grown to take in the dark letter outlines."""
    hue, sat, val = hsv(image)
    yy = np.mgrid[0 : sat.shape[0], 0 : sat.shape[1]][0]
    warm = (hue <= 62) | (hue >= 262)
    cyan = (hue >= 160) & (hue <= 210) & (val > 0.72) & (yy <= 270)
    bright = ((sat > 0.45) & (val > 0.55) & warm) | ((val > 0.82) & (sat < 0.45)) | cyan
    bright &= box(sat.shape, LOGO_BOX) & ~box(sat.shape, TROPHY_BOX)
    core = large_components(dilate(bright, 2), 3000)
    core = erode(dilate(core, 7), 7)
    return dilate(core, 4)


def button_mask(image):
    """The button's stepped silhouette: span between the gold edges on every row, plus outline."""
    rgb = np.asarray(image).astype(int)
    gold = (rgb[..., 0] > 200) & (rgb[..., 1] > 140) & (rgb[..., 2] < 90)
    x0, y0, x1, y1 = BUTTON_BOX
    mask = np.zeros(gold.shape, bool)
    for y in range(y0, y1):
        xs = np.nonzero(gold[y, x0:x1])[0]
        if len(xs):
            mask[y, x0 + xs.min() : x0 + xs.max() + 1] = True
    return dilate(mask, 4)


def hint_mask(image):
    """Only the hint's bright letters and dashes (thin holes: the arena around stays intact)."""
    _, _, val = hsv(image)
    return dilate(box(val.shape, HINT_BOX) & (val > 0.62), 2)


def hair_mask(image):
    """Dark brown / maroon strands (and the darkest shadows) inside the hair boxes."""
    hue, sat, val = hsv(image)
    hair = (((hue < 50) | (hue > 300)) & (val < 0.62) & (sat > 0.25)) | (val < 0.18)
    area = np.zeros(sat.shape, bool)
    for b in HAIR_BOXES:
        area |= box(sat.shape, b)
    return erode(dilate(large_components(hair & area, 150), 2), 2)


def soft_ellipse(image, ellipse):
    """RGBA patch of the art inside an ellipse whose alpha fades over its outer third."""
    cx, cy, rx, ry = ellipse
    x0, y0 = cx - rx, cy - ry
    patch = image.crop((x0, y0, cx + rx, cy + ry)).convert('RGBA')
    yy, xx = np.mgrid[0 : patch.height, 0 : patch.width]
    d = np.sqrt(((xx + 0.5 - rx) / rx) ** 2 + ((yy + 0.5 - ry) / ry) ** 2)
    alpha = np.clip((1 - d) / 0.33, 0, 1)
    # Nothing from outside the art (a patch may cross the image edge).
    inside = (xx + x0 >= 0) & (xx + x0 < image.width) & (yy + y0 >= 0) & (yy + y0 < image.height)
    alpha[~inside] = 0
    patch.putalpha(Image.fromarray((alpha * 255).astype(np.uint8)))
    return patch, (x0, y0)


def glow_texture(size=64):
    """Soft round glow, white center fading to transparent (tinted and pulsed in code)."""
    img = Image.new('L', (size, size), 0)
    ImageDraw.Draw(img).ellipse((size * 0.3, size * 0.3, size * 0.7, size * 0.7), fill=255)
    img = img.filter(ImageFilter.GaussianBlur(size / 7))
    rgba = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    rgba.putalpha(img)
    return rgba


def main():
    image = Image.open(SOURCE).convert('RGB')
    sx, sy = GAME_SIZE[0] / image.width, GAME_SIZE[1] / image.height
    shape = (image.height, image.width)

    logo = logo_mask(image)
    button = button_mask(image)
    hair = hair_mask(image)
    # The hair layer carries a thin ring of its surroundings, so at rest it is identical to the
    # art; behind it the art is inpainted, so moving tips never show a second, static hair.
    hair_layer = dilate(hair, HAIR_RING)
    hole = (
        dilate(logo, LOGO_CLEAR_RING)
        | dilate(button, BUTTON_CLEAR_RING)
        | hint_mask(image)
        | hair_layer
    )

    OUT.mkdir(parents=True, exist_ok=True)
    background = inpaint(image, hole).resize(GAME_SIZE, Image.LANCZOS)
    background.save(OUT / 'background.jpg', quality=90, optimize=True)
    glow_texture().save(OUT / 'glow.png', optimize=True)

    placements = {}

    def save(name, rgba, x0, y0):
        size = (max(1, round(rgba.width * sx)), max(1, round(rgba.height * sy)))
        rgba.resize(size, Image.LANCZOS).save(OUT / f'{name}.png', optimize=True)
        return {'x': round(x0 * sx, 1), 'y': round(y0 * sy, 1), 'width': size[0], 'height': size[1]}

    for name, mask, feather in (('logo', logo, 1.5), ('button', button, 0.6)):
        rgba, (x0, y0, _, _) = layer(image, mask, feather)
        placements[name] = save(name, rgba, x0, y0)

    rgba, (x0, y0, _, _) = layer(image, hair_layer, 0)
    placements['wind'] = {
        'joao-hair': {**save('wind-joao-hair', rgba, x0, y0), 'anchor': 'bottom', 'strips': 'rows'}
    }
    for name, part in CLOTH.items():
        rgba, (x0, y0) = soft_ellipse(image, part['ellipse'])
        placements['wind'][name] = {
            **save(f'wind-{name}', rgba, x0, y0),
            'anchor': part['anchor'],
            'strips': part['strips'],
        }

    hx0, hy0, hx1, hy1 = HINT_BOX
    placements['hint'] = {'x': round((hx0 + hx1) / 2 * sx, 1), 'y': round((hy0 + hy1) / 2 * sy, 1)}

    LAYOUT.parent.mkdir(parents=True, exist_ok=True)
    LAYOUT.write_text(
        '// Generated by scripts/title-art/prepare_title_art.py: do not edit by hand.\n'
        '// Top-left corners and sizes of the title art layers, in game pixels (960x540).\n\n'
        'export const TITLE_ART_LAYOUT = '
        + json.dumps(placements, indent=2)
        + ' as const;\n'
    )
    print(json.dumps(placements, indent=2))


if __name__ == '__main__':
    main()
