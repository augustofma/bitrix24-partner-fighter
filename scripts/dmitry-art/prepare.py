"""Prepare Dmitry's reviewed original art; offline Pillow/NumPy only."""
from pathlib import Path
import argparse
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import large_components, dilate

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[1] / 'public/fighters/dmitry'
CELL = (192, 224)
BASELINE = 216
MARGIN = 4
# Solid-component bounds reviewed against the original 1469x1071 source.
BOUNDS = [[17,8,163,219],[195,7,342,219],[383,9,532,219],[563,10,710,219],[743,9,903,220],[940,7,1082,220],[1120,7,1273,220],[1307,8,1460,220],[14,228,178,445],[195,232,360,447],[404,229,531,438],[585,226,712,385],[753,236,886,432],[935,304,1073,448],[1109,271,1273,448],[1293,281,1463,448],[22,466,169,673],[203,456,347,673],[389,465,569,672],[580,469,708,668],[761,514,906,673],[936,530,1104,673],[1127,537,1265,673],[1313,537,1459,671],[21,746,223,876],[237,752,361,876],[423,680,548,842],[595,697,748,845],[775,689,885,844],[957,681,1096,857],[1151,691,1306,850],[1329,689,1438,833],[18,869,177,1059],[221,921,350,1059],[393,885,529,1059],[573,879,707,1059],[745,884,928,1059],[922,936,1114,1053],[1121,1006,1310,1055],[1321,846,1452,1059]]
ROOTS = [90,267,459,636,817,1006,1185,1378,83,267,466,648,818,1002,1180,1354,89,267,441,638,823,998,1191,1367,72,290,482,651,828,1014,1199,1382,89,282,450,628,811,1011,1212,1380]
AIR_LIFT = {10:18,11:40,12:20,26:30,27:26,28:30,29:10,30:10,31:10}
# ALAIO STRIKE! pose (frame 40, on a sixth row): the extended punch (frame 15) with its arm cut
# along ARM and turned up around the shoulder, fist to the sky. The head goes back on top, so
# the arm never covers the face. Coordinates are inside the 192x224 cell of frame 15.
SOURCE_FRAMES = 40
SPECIAL_FRAME = 40
SPECIAL_ARM = [(124,116),(126,98),(132,86),(160,80),(191,75),(191,103),(160,107),(132,118)]
SPECIAL_HEAD = [(84,40),(140,40),(140,80),(131,86),(127,96),(112,98),(84,98)]
SPECIAL_PIVOT = (127,104)
SPECIAL_ANGLE = 56
SHEET = (1536,1344)


def isolate(image):
    data = np.array(image.convert('RGBA'))
    # Generated fringe has near-zero alpha and saturated stray colors; retain the solid
    # silhouette and its original antialiased edge, never synthesize new character pixels.
    solid = data[:,:,3] >= 240
    mask = large_components(solid, max(150, np.count_nonzero(solid)//2))
    keep = dilate(mask, 1) & (data[:,:,3] >= 128)
    data[~keep] = 0
    result = Image.fromarray(data)
    box = result.getbbox()
    if box is None:
        raise ValueError('Empty source pose')
    return result.crop(box), box


def prepare():
    source = Image.open(HERE / 'sheet-source.png').convert('RGBA')
    assert source.size == (1469,1071), 'Bounds belong to the reviewed source'
    atlas = Image.new('RGBA', SHEET)
    for frame, (left,top,right,bottom) in enumerate(BOUNDS):
        region = (max(0,left-3),max(0,top-3),min(source.width,right+3),min(source.height,bottom+3))
        pose, box = isolate(source.crop(region))
        scale = 0.82
        if frame <= 9 or frame in (14,15,16,17,18,19,32,34,35):
            scale = 172 / pose.height
        if frame == 39:
            scale = 172 / pose.height
        lift = AIR_LIFT.get(frame, 0)
        scale = min(scale, (CELL[0]-2*MARGIN)/pose.width, (BASELINE-MARGIN-lift)/pose.height)
        size = (round(pose.width*scale), round(pose.height*scale))
        anchor = ROOTS[frame]-region[0]-box[0]
        x = max(MARGIN, min(CELL[0]-MARGIN-size[0], round(CELL[0]/2-anchor*scale)))
        y = BASELINE-size[1]-lift
        atlas.paste(pose.resize(size, Image.Resampling.NEAREST), (frame%8*192+x,frame//8*224+y))
        print(f'{frame:02}: size={size}, position=({x},{y}), bottom={y+size[1]}')
    add_special_frame(atlas)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT / 'sprite.png')
    portrait, _ = isolate(Image.open(HERE / 'portrait-source.png'))
    scale = min(232/portrait.width,292/portrait.height)
    portrait = portrait.resize((round(portrait.width*scale),round(portrait.height*scale)),Image.Resampling.NEAREST)
    canvas = Image.new('RGBA',(240,300))
    canvas.paste(portrait,((240-portrait.width)//2,300-portrait.height))
    canvas.save(OUTPUT / 'portrait.png')


def cell(atlas, frame):
    x, y = frame%8*192, frame//8*224
    return atlas.crop((x, y, x+192, y+224))


def add_special_frame(atlas):
    """Frame 40: the fist raised to the sky, from frame 15's own pixels (nothing redrawn)."""
    base = cell(atlas, 15)
    def polygon(points):
        mask = Image.new('L', base.size, 0)
        ImageDraw.Draw(mask).polygon(points, fill=255)
        return mask
    arm = Image.new('RGBA', base.size)
    arm.paste(base, (0,0), polygon(SPECIAL_ARM))
    head = Image.new('RGBA', base.size)
    head.paste(base, (0,0), polygon(SPECIAL_HEAD))
    pose = base.copy()
    pose.paste((0,0,0,0), (0,0), polygon(SPECIAL_ARM))
    pose.paste((0,0,0,0), (134,60,192,116))  # outline left where the arm was
    pose.alpha_composite(arm.rotate(SPECIAL_ANGLE, resample=Image.Resampling.NEAREST, center=SPECIAL_PIVOT))
    pose.alpha_composite(head)
    # Drop the loose bits the cut leaves (a few outline pixels), keep the figure.
    data = np.array(pose)
    keep = large_components(data[:,:,3] > 0, 40)
    data[~keep] = 0
    atlas.paste(Image.fromarray(data), (SPECIAL_FRAME%8*192, SPECIAL_FRAME//8*224))


def validate():
    sheet = Image.open(OUTPUT / 'sprite.png')
    portrait = Image.open(OUTPUT / 'portrait.png')
    assert sheet.size == SHEET and sheet.mode == 'RGBA'
    assert portrait.size == (240,300) and portrait.mode == 'RGBA'
    for frame in range(SOURCE_FRAMES + 1):
        x,y = frame%8*192,frame//8*224
        alpha = sheet.crop((x,y,x+192,y+224)).getchannel('A')
        assert alpha.getbbox(), f'Empty frame {frame}'
        left,top,right,bottom = alpha.getbbox()
        assert left >= MARGIN and top >= MARGIN and right <= 192-MARGIN and bottom <= 224-MARGIN, frame
        assert bottom == BASELINE-AIR_LIFT.get(frame,0), frame
        assert np.count_nonzero(np.array(alpha)) > 500, frame
    assert portrait.getpixel((0,0))[3] == 0
    print('PASS: 1536x1344 RGBA, 41 isolated 192x224 cells (40 + ALAIO STRIKE!); portrait 240x300 RGBA.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--validate-only',action='store_true')
    args = parser.parse_args()
    if not args.validate_only:
        prepare()
    validate()
