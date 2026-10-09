"""Prepare Gabriele's reviewed original art; offline Pillow/NumPy only."""
from pathlib import Path
import argparse
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import large_components, dilate

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[1] / 'public/fighters/gabriele'
CELL = (192, 224)
BASELINE = 216
MARGIN = 4
# Solid-component bounds reviewed against the original 1468x1071 source.
BOUNDS = [
    [25, 28, 183, 224],
    [213, 28, 363, 224],
    [392, 28, 546, 224],
    [573, 28, 733, 224],
    [769, 25, 909, 224],
    [934, 25, 1101, 224],
    [1126, 25, 1279, 224],
    [1300, 25, 1455, 224],
    [22, 251, 176, 450],
    [202, 251, 373, 450],
    [403, 249, 524, 439],
    [584, 241, 703, 393],
    [762, 252, 900, 446],
    [947, 307, 1076, 450],
    [1108, 263, 1268, 450],
    [1282, 267, 1458, 450],
    [21, 482, 207, 666],
    [205, 474, 332, 669],
    [350, 481, 559, 669],
    [585, 476, 707, 656],
    [748, 527, 901, 669],
    [934, 534, 1104, 669],
    [1134, 523, 1276, 669],
    [1317, 527, 1446, 668],
    [28, 740, 214, 871],
    [227, 738, 354, 873],
    [773, 691, 898, 848],
    [582, 683, 731, 835],
    [773, 691, 898, 848],
    [961, 683, 1076, 845],
    [1128, 683, 1319, 838],
    [1318, 688, 1445, 846],
    [23, 883, 186, 1055],
    [222, 919, 353, 1055],
    [409, 883, 559, 1055],
    [576, 875, 764, 1055],
    [735, 894, 925, 1052],
    [917, 953, 1085, 1037],
    [1097, 991, 1310, 1050],
    [1317, 857, 1460, 1060],
]
ROOTS = [103, 282, 465, 651, 838, 1014, 1197, 1378, 96, 283, 469, 649, 829, 1010, 1185, 1350, 108, 264, 414, 649, 823, 993, 1205, 1380, 82, 287, 835, 636, 835, 1017, 1199, 1380, 99, 287, 479, 650, 810, 985, 1200, 1380]
AIR_LIFT = {10:18,11:35,12:18,26:20,27:20,28:20,29:20,30:40,31:20}


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

