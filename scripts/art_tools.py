"""Shared offline image helpers for the art preparation scripts (Pillow + NumPy only)."""

from collections import deque

import numpy as np
from PIL import Image, ImageFilter


def dilate(mask, radius):
    img = Image.fromarray((mask * 255).astype(np.uint8))
    for _ in range(radius):
        img = img.filter(ImageFilter.MaxFilter(3))
    return np.asarray(img) > 127


def erode(mask, radius):
    img = Image.fromarray((mask * 255).astype(np.uint8))
    for _ in range(radius):
        img = img.filter(ImageFilter.MinFilter(3))
    return np.asarray(img) > 127


def large_components(mask, min_size):
    """Keeps 4-connected blobs of at least min_size pixels (drops lit windows, sparks)."""
    h, w = mask.shape
    seen = np.zeros(mask.shape, bool)
    keep = np.zeros(mask.shape, bool)
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        seen[y0, x0] = True
        queue, pixels = deque([(y0, x0)]), []
        while queue:
            y, x = queue.popleft()
            pixels.append((y, x))
            for yn, xn in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yn < h and 0 <= xn < w and mask[yn, xn] and not seen[yn, xn]:
                    seen[yn, xn] = True
                    queue.append((yn, xn))
        if len(pixels) >= min_size:
            ys, xs = zip(*pixels)
            keep[list(ys), list(xs)] = True
    return keep


def inpaint(image, hole):
    """Multi-scale diffusion fill: coarse averages seed the hole, Jacobi smoothing refines it."""
    rgb = np.asarray(image).astype(np.float32)

    def solve(img, mask):
        h, w = mask.shape
        if min(h, w) <= 8:
            known = ~mask
            fill = img[known].mean(axis=0) if known.any() else np.zeros(3, np.float32)
            out = img.copy()
            out[mask] = fill
            return out
        # Downsample with known-only weights.
        h2, w2 = (h + 1) // 2, (w + 1) // 2
        pad_img = np.zeros((h2 * 2, w2 * 2, 3), np.float32)
        pad_w = np.zeros((h2 * 2, w2 * 2), np.float32)
        pad_img[:h, :w] = img * (~mask)[..., None]
        pad_w[:h, :w] = ~mask
        sums = pad_img.reshape(h2, 2, w2, 2, 3).sum(axis=(1, 3))
        weights = pad_w.reshape(h2, 2, w2, 2).sum(axis=(1, 3))
        small_mask = weights == 0
        small = sums / np.maximum(weights, 1)[..., None]
        small = solve(small, small_mask)
        up = small.repeat(2, axis=0).repeat(2, axis=1)[:h, :w]
        out = img.copy()
        out[mask] = up[mask]
        for _ in range(30):
            avg = (
                np.roll(out, 1, 0) + np.roll(out, -1, 0) + np.roll(out, 1, 1) + np.roll(out, -1, 1)
            ) / 4
            out[mask] = avg[mask]
        return out

    filled = solve(rgb, hole)
    # A little ordered grain so the fill reads as part of the pixel art, not as a smooth blur.
    yy, xx = np.mgrid[0 : rgb.shape[0], 0 : rgb.shape[1]]
    grain = (((xx // 2 + yy // 2) % 2) * 2 - 1)[..., None] * 3.0
    filled[hole] = np.clip(filled[hole] + grain[hole], 0, 255)
    return Image.fromarray(filled.astype(np.uint8))


def layer(image, mask, feather):
    """RGBA crop of `mask`'s bounding box with a softly feathered alpha."""
    ys, xs = np.nonzero(mask)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    alpha = Image.fromarray((mask * 255).astype(np.uint8))
    if feather:
        alpha = alpha.filter(ImageFilter.GaussianBlur(feather))
    rgba = image.convert('RGBA')
    rgba.putalpha(alpha)
    return rgba.crop(box), box
