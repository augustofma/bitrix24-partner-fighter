"""Prepare Romulo's reviewed original art; offline Pillow/NumPy only."""
from pathlib import Path
import argparse
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import large_components, dilate

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[1] / 'public/fighters/romulo'
CELL = (192, 224)
BASELINE = 216
MARGIN = 4
# Solid-component bounds reviewed against the original 1468x1071 source.
BOUNDS = [
    [33,15,165,218],
    [198,15,329,218],
    [373,15,500,218],
    [548,15,689,218],
    [748,14,893,218],
    [918,16,1069,218],
    [1096,15,1260,218],
    [1291,14,1442,218],
    [17,235,174,437],
    [203,240,352,437],
    [405,231,544,421],
    [581,225,722,376],
    [736,241,910,419],
    [928,304,1080,438],
    [1105,243,1257,437],
    [1270,254,1462,437],
    [23,454,171,641],
    [197,448,326,641],
    [350,474,551,641],
    [563,453,697,640],
    [733,484,885,638],
    [914,502,1101,638],
    [1116,496,1260,642],
    [218,702,352,831],  # Reuse the tucked recovery pose for startup; the generated start was extended.
    [14,713,209,831],
    [218,702,352,831],
    [394,649,533,823],
    [559,648,734,815],
    [746,648,879,809],
    [938,651,1079,813],
    [1128,671,1314,786],
    [1310,657,1450,815],
    [20,850,163,1044],
    [202,895,341,1041],
    [385,860,540,1042],
    [560,857,730,1042],
    [754,856,930,1045],
    [921,922,1112,1046],
    [1110,993,1321,1046],
    [1322,824,1451,1050],
]
ROOTS = [96,269,443,615,816,993,1165,1364,89,270,470,654,820,1004,1177,1350,94,260,412,617,807,987,1190,283,75,283,465,633,809,1007,1203,1375,89,270,453,640,826,1014,1216,1388]
AIR_LIFT = {10:18,11:35,12:18,26:20,27:20,28:20,29:10,30:55,31:10}


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
    assert source.size == (1468,1071), 'Bounds belong to the reviewed source'
    atlas = Image.new('RGBA', (1536,1120))
    for frame, (left,top,right,bottom) in enumerate(BOUNDS):
        region = (max(0,left-3),max(0,top-3),min(source.width,right+3),min(source.height,bottom+3))
        pose, box = isolate(source.crop(region))
        scale = 0.85
        if frame <= 9 or frame in (14,15,16,17,18,19,32,34,35):
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
    scale = min(232/portrait.width,292/portrait.height)
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
