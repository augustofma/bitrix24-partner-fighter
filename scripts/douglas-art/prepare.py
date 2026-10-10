"""Prepare Douglas's reviewed original art; offline Pillow/NumPy only."""
from pathlib import Path
import argparse
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import large_components, dilate

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[1] / 'public/fighters/douglas'
CELL = (192, 224)
BASELINE = 216
MARGIN = 4
# Solid-component bounds reviewed against the original 1468x1071 source.
BOUNDS = [
    [58, 14, 166, 232],
    [221, 14, 339, 232],
    [398, 12, 519, 232],
    [600, 11, 702, 233],
    [777, 15, 917, 232],
    [960, 14, 1098, 233],
    [1141, 13, 1273, 233],
    [1310, 12, 1454, 232],
    [27, 251, 174, 469],
    [213, 251, 349, 469],
    [402, 252, 523, 441],
    [592, 251, 700, 400],
    [765, 251, 875, 453],
    [933, 338, 1055, 470],
    [1103, 270, 1254, 469],
    [1267, 270, 1453, 470],
    [25, 484, 175, 685],
    [233, 483, 349, 685],
    [374, 483, 578, 682],
    [598, 483, 693, 683],
    [755, 545, 872, 678],
    [942, 545, 1092, 678],
    [1129, 540, 1240, 678],
    [1283, 550, 1446, 679],
    [19, 750, 239, 859],
    [245, 732, 352, 859],
    [397, 695, 551, 843],
    [577, 702, 749, 837],
    [776, 702, 885, 853],
    [963, 695, 1080, 879],
    [1119, 699, 1318, 859],
    [1338, 697, 1435, 844],
    [27, 871, 163, 1062],
    [231, 932, 344, 1061],
    [393, 886, 530, 1061],
    [559, 871, 703, 1061],
    [716, 899, 887, 1060],
    [888, 954, 1086, 1054],
    [1097, 1001, 1333, 1055],
    [1343, 863, 1439, 1061],
]
ROOTS = [110, 278, 455, 648, 842, 1024, 1203, 1380, 93, 274, 457, 646, 824, 991, 1177, 1330, 99, 280, 429, 647, 811, 987, 1183, 1380, 88, 298, 464, 632, 831, 1021, 1182, 1385, 95, 287, 448, 620, 785, 987, 1215, 1386]
AIR_LIFT = {10:18,11:35,12:18,26:20,27:28,28:20,29:20,30:3,31:20}


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
        region = (left,top,right,bottom)
        pose, box = isolate(source.crop(region))
        scale = 0.85
        if frame <= 9 or frame in (14,15,16,17,18,19):
            scale = 172 / pose.height
        lift = AIR_LIFT.get(frame, 0)
        scale = min(scale, (CELL[0]-2*MARGIN)/pose.width, (BASELINE-MARGIN-lift)/pose.height)
        size = (round(pose.width*scale), round(pose.height*scale))
        anchor = ROOTS[frame]-region[0]-box[0]
        # A separate quiet guard loop avoids the large gestures of the original idle row.
        if frame < 4:
            idle = Image.open(HERE / 'idle-source.png')
            ix, iy = frame%2*768, frame//2*512
            pose, _ = isolate(idle.crop((ix,iy,ix+768,iy+512)))
            scale = 172/pose.height
            size = (round(pose.width*scale), round(pose.height*scale))
            anchor = pose.width/2
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
