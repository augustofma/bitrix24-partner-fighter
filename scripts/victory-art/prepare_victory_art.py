"""Splits the approved victory screen art into the layers used by VictoryScene.

Input : scripts/victory-art/source.png (1672x941; title, portrait card, result line and button
        baked in for an "AUGUSTO VENCEU!" example)
Output: public/ui/victory/background.jpg    960x540 arena, with the title, card, result panel
                                            and button removed (inpainted)
        public/ui/victory/card-frame.png    portrait card frame: transparent window, empty
                                            name plate
        public/ui/victory/result-panel.png  result panel with its text removed
        public/ui/victory/button.png        VOLTAR AO MENU button (its label is fixed text)
Prints the placements (game pixels) to copy into src/ui/victory/victoryLayout.ts.

Everything that depends on the match (winner name, portrait, verdict, reason, score) is drawn
by the game on top of these layers.

Offline tool only (not part of the build). Requires Python 3 + Pillow + NumPy:
    python scripts/victory-art/prepare_victory_art.py
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import dilate, inpaint, large_components, layer  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'scripts/victory-art/source.png'
OUT = ROOT / 'public/ui/victory'
GAME_SIZE = (960, 540)

# Boxes in source pixels: x0, y0, x1, y1 (x1/y1 exclusive).
TITLE_BAND = (300, 70, 1400, 228)
# Element boxes reach a bit beyond the frames to take in their small side decorations.
CARD_BOX = (590, 214, 1090, 666)
CARD_WINDOW = (648, 241, 1025, 580)  # inside the gold frame, above the name plate
NAME_PLATE = (650, 586, 1023, 639)  # interior of the plate (text only)
PANEL_BOX = (340, 667, 1335, 758)
PANEL_TEXT = (394, 682, 1279, 743)
BUTTON_BOX = (460, 769, 1215, 879)
# Ring cleared around every layer: more than the card float and entrance travel at rest.
CLEAR_RING = 6


def rgb(image):
    return np.asarray(image).astype(int)


def box_mask(shape, box):
    x0, y0, x1, y1 = box
    mask = np.zeros(shape, bool)
    mask[y0:y1, x0:x1] = True
    return mask


def row_span(color_mask, box, grow):
    """Silhouette of a framed element: on every row, from its first to its last frame pixel."""
    x0, y0, x1, y1 = box
    mask = np.zeros(color_mask.shape, bool)
    for y in range(y0, y1):
        xs = np.nonzero(color_mask[y, x0:x1])[0]
        if len(xs):
            mask[y, x0 + xs.min() : x0 + xs.max() + 1] = True
    return dilate(mask, grow)


def clear_text(image, boxes):
    """Erases example text from flat navy panels: every row of the interior takes the median
    color of that row's dark (non-text) pixels, keeping the panel's vertical gradient."""
    pixels = rgb(image)
    out = pixels.copy()
    value = pixels.max(axis=2)
    for x0, y0, x1, y1 in boxes:
        for y in range(y0, y1):
            row = pixels[y, x0:x1]
            dark = row[value[y, x0:x1] <= 90]
            out[y, x0:x1] = np.median(dark if len(dark) else row, axis=0)
    return Image.fromarray(out.astype(np.uint8))


def title_mask(image):
    """Big yellow / pink title letters, grown to cover their dark outline and shadow."""
    hsv = np.asarray(image.convert('HSV')).astype(np.float32)
    hue = hsv[..., 0] * 360 / 255
    sat = hsv[..., 1] / 255
    val = hsv[..., 2] / 255
    warm = ((hue <= 60) | (hue >= 300)) & (sat > 0.4) & (val > 0.5)
    letters = large_components(warm & box_mask(sat.shape, TITLE_BAND), 400)
    return dilate(letters, 7)


def main():
    image = Image.open(SOURCE).convert('RGB')
    pixels = rgb(image)
    red, green, blue = pixels[..., 0], pixels[..., 1], pixels[..., 2]
    gold = (red > 200) & (green > 150) & (blue < 110)
    cyan = (red < 140) & (green > 170) & (blue > 200)
    shape = gold.shape

    card = row_span(cyan | gold, CARD_BOX, 3) & ~box_mask(shape, CARD_WINDOW)
    panel = row_span(cyan, PANEL_BOX, 3)
    button = row_span(gold | cyan, BUTTON_BOX, 4)

    # Layers: erase the example texts (name, result line) from the frames first.
    blank = clear_text(image, (NAME_PLATE, PANEL_TEXT))
    hole = dilate(title_mask(image) | card | panel | button, CLEAR_RING)
    hole |= box_mask(shape, CARD_WINDOW)
    background = inpaint(image, hole)

    OUT.mkdir(parents=True, exist_ok=True)
    background.resize(GAME_SIZE, Image.LANCZOS).save(OUT / 'background.jpg', quality=90, optimize=True)

    sx, sy = GAME_SIZE[0] / image.width, GAME_SIZE[1] / image.height
    for name, mask in (('card-frame', card), ('result-panel', panel), ('button', button)):
        rgba, (x0, y0, x1, y1) = layer(blank, mask, 0.6)
        size = (round(rgba.width * sx), round(rgba.height * sy))
        rgba.resize(size, Image.LANCZOS).save(OUT / f'{name}.png', optimize=True)
        print(f'{name}: center ({(x0 + x1) / 2 * sx:.1f}, {(y0 + y1) / 2 * sy:.1f}) size {size}')

    for name, (x0, y0, x1, y1) in (('card window', CARD_WINDOW), ('name plate', NAME_PLATE)):
        print(
            f'{name}: center ({(x0 + x1) / 2 * sx:.1f}, {(y0 + y1) / 2 * sy:.1f}) '
            f'size ({(x1 - x0) * sx:.1f}, {(y1 - y0) * sy:.1f})'
        )
    ys, xs = np.nonzero(title_mask(image))
    print(f'title: center ({(xs.min() + xs.max()) / 2 * sx:.1f}, {(ys.min() + ys.max()) / 2 * sy:.1f})')


if __name__ == '__main__':
    main()
