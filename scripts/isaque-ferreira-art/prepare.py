"""Prepare Isaque's reviewed original art; offline Pillow/NumPy only."""
from pathlib import Path
import argparse
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import large_components, dilate

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[1] / 'public/fighters/isaque-ferreira'
CELL = (192, 224)
BASELINE = 216
MARGIN = 4
# Solid-component bounds reviewed against the original 1469x1071 source.
BOUNDS = [
(32,40,156,216),(210,40,329,216),(393,40,514,216),(577,40,693,216),
(766,39,903,217),(951,39,1077,217),(1133,39,1265,217),(1312,39,1447,217),
(27,267,155,451),(205,267,337,453),(387,252,514,453),(568,252,692,397),
(749,252,879,437),(933,330,1053,454),(1113,274,1262,454),(1292,274,1460,454),
(24,490,162,669),(207,490,335,669),(370,488,559,669),(585,491,709,670),
(754,547,886,669),(937,545,1104,669),(1128,539,1261,669),(1322,543,1465,670),
(23,758,187,873),(221,762,333,868),(398,699,522,846),(588,713,738,852),
(770,698,881,845),(948,695,1097,846),(1124,703,1308,845),(1332,701,1444,846),
(27,893,161,1054),(215,937,331,1054),(387,896,538,1054),(556,892,730,1054),
(764,922,919,1054),(921,953,1089,1049),(1100,999,1292,1053),(1313,859,1448,1054),
]
ROOTS = [93,269,454,635,826,1010,1196,1378,84,269,450,630,815,991,1180,1352,
86,261,428,641,812,996,1190,1374,84,274,459,642,825,1006,1185,1386,
91,271,448,620,820,995,1197,1375]
AIR_LIFT = {10:18,11:40,12:20,26:10,27:6,28:10,29:10,30:10,31:10}


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
        region = (max(0,left-3),max(0,top-3),min(source.width,right+3),min(source.height,bottom+3))
        pose, box = isolate(source.crop(region))
        scale = 0.94
        if frame <= 9 or frame in (14,15,16,17,18,19,32,34,35):
            scale = 172 / pose.height
        if frame == 39:
            scale = 202 / pose.height
        if frame == 27:
            scale = 0.84
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
    portrait = portrait.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
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
