"""Prepare Amanda Konrad's reviewed original art; offline Pillow/NumPy only."""
from pathlib import Path
import argparse
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import large_components, dilate

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[1] / 'public/fighters/amanda-konrad'
CELL = (192, 224)
BASELINE = 216
MARGIN = 4
# Solid-component bounds reviewed against the original 1468x1071 source.
BOUNDS = [[39, 22, 163, 215], [226, 19, 351, 215], [409, 18, 533, 214], [589, 22, 721, 213], [787, 16, 929, 216], [978, 17, 1108, 215], [1145, 17, 1275, 216], [1319, 18, 1447, 215], [27, 236, 161, 436], [210, 236, 346, 436], [423, 240, 534, 405], [612, 221, 713, 361], [771, 236, 888, 430], [955, 311, 1081, 439], [1113, 242, 1254, 439], [1285, 249, 1451, 439], [22, 457, 174, 661], [220, 451, 328, 660], [370, 452, 563, 659], [588, 455, 698, 659], [1128, 505, 1259, 659], [941, 516, 1098, 661], [757, 512, 900, 662], [1290, 532, 1458, 656], [27, 755, 232, 870], [233, 753, 356, 869], [414, 675, 542, 856], [584, 680, 770, 851], [770, 683, 891, 859], [960, 663, 1066, 870], [1123, 684, 1314, 798], [1337, 683, 1433, 854], [26, 879, 171, 1061], [212, 924, 319, 1059], [366, 897, 533, 1058], [543, 888, 737, 1058], [727, 903, 935, 1058], [913, 976, 1088, 1058], [1102, 1005, 1317, 1054], [1324, 869, 1456, 1063]]
ROOTS = [100, 286, 467, 650, 850, 1040, 1208, 1380, 90, 275, 475, 659, 820, 1006, 1170, 1335, 90, 267, 422, 640, 1190, 992, 808, 1335, 84, 281, 470, 640, 830, 1010, 1172, 1380, 95, 265, 440, 610, 807, 1002, 1200, 1375]
AIR_LIFT = {10:18,11:35,12:18,26:20,27:3,28:20,29:20,30:40,31:20}


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
        # The replacement puts the extended foot at waist height, matching the mid hitbox.
        if frame == 18:
            pose, _ = isolate(Image.open(HERE / 'kick-source.png'))
            scale = min(172/pose.height, (CELL[0]-2*MARGIN)/pose.width)
            size = (round(pose.width*scale), round(pose.height*scale))
            anchor = pose.width * 0.3
        # Dedicated KO strip replaces the two touching poses in the original generation.
        if frame in (36, 37, 38):
            ko = Image.open(HERE / 'ko-source.png')
            bounds = [(0,0,550,724), (550,0,1330,724), (1330,0,2172,724)]
            pose, _ = isolate(ko.crop(bounds[frame-36]))
            scale = min(172/pose.height, (CELL[0]-2*MARGIN)/pose.width)
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

