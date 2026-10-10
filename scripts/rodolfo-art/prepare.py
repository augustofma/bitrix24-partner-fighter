"""Prepare Rodolfo's reviewed original art; offline Pillow/NumPy only."""
from pathlib import Path
import argparse
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import large_components, dilate

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[1] / 'public/fighters/rodolfo'
CELL = (192, 224)
BASELINE = 216
MARGIN = 4
# Solid-component bounds reviewed against the original 1468x1071 source.
BOUNDS = [
[39,14,176,222],[223,14,359,222],[401,16,532,222],[581,14,709,222],
[763,13,904,220],[938,12,1088,220],[1124,13,1254,220],[1291,13,1438,220],
[20,237,161,443],[196,237,333,443],[372,239,505,443],[759,243,882,403],
[534,233,717,439],[902,304,1056,444],[1082,248,1238,443],[1256,255,1456,443],
[1082,248,1238,443],[222,457,337,652],[361,476,571,651],[574,460,733,650],
[774,491,914,649],[940,493,1112,648],[1114,494,1264,648],[1293,497,1459,649],
[20,734,222,854],[1293,497,1459,649],[404,659,532,856],[566,669,769,837],
[789,671,901,857],[947,667,1162,823],[947,667,1162,823],[1307,671,1434,815],
[26,865,177,1051],[214,911,340,1050],[387,887,547,1051],[571,877,729,1051],
[571,877,729,1051],[731,889,927,1052],[951,993,1255,1055],[1277,820,1451,1051],
]
ROOTS = [105,287,465,645,830,1008,1192,1362,89,262,440,822,625,973,1151,1324,1151,276,414,645,837,1000,1179,1355,77,1355,466,634,839,1010,1010,1364,100,275,464,645,645,817,1103,1370]
AIR_BOUNDS = [[97,86,338,482],[456,95,705,512],[806,120,1080,458],[1159,141,1502,470],[84,553,340,911],[440,549,678,936],[755,581,1194,893],[1232,581,1479,930]]
AIR_FRAMES = [10,12,26,27,28,29,30,31]
AIR_LIFT = {10:18,11:35,12:18,26:20,27:10,28:20,29:20,30:3,31:20}


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
        scale = 0.83
        if frame <= 9 or frame in (14,15,16,17,18,19):
            scale = 172 / pose.height
        lift = AIR_LIFT.get(frame, 0)
        scale = min(scale, (CELL[0]-2*MARGIN)/pose.width, (BASELINE-MARGIN-lift)/pose.height)
        size = (round(pose.width*scale), round(pose.height*scale))
        anchor = ROOTS[frame]-region[0]-box[0]
        if frame in AIR_FRAMES:
            air = Image.open(HERE / 'air-source.png')
            index = AIR_FRAMES.index(frame)
            pose, _ = isolate(air.crop(AIR_BOUNDS[index]))
            scale = 0.43
            scale = min(scale, (CELL[0]-2*MARGIN)/pose.width)
            size = (round(pose.width*scale), round(pose.height*scale))
            # Active strikes anchor at the torso, keeping the extended limb ahead.
            anchor = pose.width * (0.48 if frame == 27 else 0.34 if frame == 30 else 0.5)
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
