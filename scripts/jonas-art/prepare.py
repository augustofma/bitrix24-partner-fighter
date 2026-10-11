"""Prepare Jonas's reviewed original art; offline Pillow/NumPy only."""
from pathlib import Path
import argparse
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import large_components, dilate

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[1] / 'public/fighters/jonas'
CELL = (192, 224)
BASELINE = 216
MARGIN = 4
# Solid-component bounds reviewed against the original 1469x1071 source.
BOUNDS = [
[20,10,156,216],[213,12,345,215],[403,14,530,215],[583,14,710,216],
[757,6,895,215],[941,9,1088,215],[1126,6,1270,215],[1314,6,1458,217],
[22,235,171,441],[210,234,361,441],[417,230,518,441],[603,232,700,367],
[759,239,886,440],[940,297,1069,441],[1108,247,1262,439],[1284,259,1460,440],
[16,457,160,655],[217,455,331,656],[368,461,569,656],[598,457,709,656],
[756,508,885,653],[929,511,1111,653],[1114,508,1249,653],[1314,513,1448,650],
[19,735,199,850],[221,736,338,850],[387,670,542,840],[582,674,740,830],
[782,672,881,841],[940,666,1079,847],[1114,666,1292,826],[1326,673,1419,844],
[15,870,159,1055],[210,907,328,1049],[395,876,526,1051],[566,874,727,1052],
[746,867,910,1052],[913,933,1107,1053],[1118,1007,1328,1056],[1350,851,1448,1055],
]
ROOTS = [85,274,464,644,820,1008,1192,1382,88,275,463,650,815,999,1175,1350,83,268,422,649,813,990,1175,1380,75,276,449,647,831,1002,1167,1372,81,266,449,639,817,1000,1223,1398]
AIR_LIFT = {10:18,11:35,12:18,26:20,27:23,28:20,29:20,30:3,31:20}


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
    atlas = Image.new('RGBA', (1536,1120))
    for frame, (left,top,right,bottom) in enumerate(BOUNDS):
        region = (left,top,right,bottom)
        pose, box = isolate(source.crop(region))
        scale = 0.83
        if frame <= 9 or frame in (14,15,16,17,18,19):
            scale = 172 / pose.height
        lift = AIR_LIFT.get(frame, 0)
        scale = min(scale, (CELL[0]-2*MARGIN)/pose.width, (BASELINE-MARGIN-lift)/pose.height)
        size = (round(pose.width*scale), round(pose.height*scale))
        anchor = ROOTS[frame]-region[0]-box[0]
        x = max(MARGIN, min(CELL[0]-MARGIN-size[0], round(CELL[0]/2-anchor*scale)))
        y = BASELINE-size[1]-lift
        atlas.paste(pose.resize(size, Image.Resampling.NEAREST), (frame%8*192+x,frame//8*224+y))
        print(f'{frame:02}: size={size}, position=({x},{y}), bottom={y+size[1]}')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT / 'sprite.png')
    portrait, _ = isolate(Image.open(HERE / 'portrait-source.png'))
    # Same framing as the other portraits: the bust fills the width (4 px margins), feet of the
    # canvas at the bottom, a little headroom on top. A shorter bust left an empty band above
    # the head and a smaller figure than the rest of the roster on the select screen.
    scale = min(232/portrait.width,290/portrait.height)
    portrait = portrait.resize((round(portrait.width*scale),round(portrait.height*scale)),Image.Resampling.NEAREST)
    canvas = Image.new('RGBA',(240,300))
    canvas.paste(portrait,((240-portrait.width)//2,300-portrait.height))
    canvas.save(OUTPUT / 'portrait.png')


def validate():
    sheet = Image.open(OUTPUT / 'sprite.png')
    portrait = Image.open(OUTPUT / 'portrait.png')
    assert sheet.size == (1536,1120) and sheet.mode == 'RGBA'
    assert portrait.size == (240,300) and portrait.mode == 'RGBA'
    for frame in range(40):
        x,y = frame%8*192,frame//8*224
        alpha = sheet.crop((x,y,x+192,y+224)).getchannel('A')
        assert alpha.getbbox(), f'Empty frame {frame}'
        left,top,right,bottom = alpha.getbbox()
        assert left >= MARGIN and top >= MARGIN and right <= 192-MARGIN and bottom <= 224-MARGIN, frame
        assert bottom == BASELINE-AIR_LIFT.get(frame,0), frame
        assert np.count_nonzero(np.array(alpha)) > 500, frame
    assert portrait.getpixel((0,0))[3] == 0
    print('PASS: 1536x1120 RGBA, 40 isolated 192x224 cells; portrait 240x300 RGBA.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--validate-only',action='store_true')
    args = parser.parse_args()
    if not args.validate_only:
        prepare()
    validate()
