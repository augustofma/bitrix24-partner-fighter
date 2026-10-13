"""Prepare Juliana's reviewed original art; offline Pillow/NumPy only."""
from pathlib import Path
import argparse
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import large_components, dilate

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[1] / 'public/fighters/juliana'
CELL = (192, 224)
BASELINE = 216
MARGIN = 4
# Solid-component bounds reviewed against the original 1469x1071 source.
BOUNDS = [
[28,9,160,225],[203,9,340,225],[388,8,516,226],[556,9,680,225],
[730,8,888,224],[911,8,1052,225],[1085,8,1238,223],[1274,8,1430,224],
[30,239,178,453],[210,240,365,453],[410,236,529,458],[587,235,704,381],
[762,239,877,443],[938,308,1044,451],[1080,250,1243,452],[1281,251,1456,451],
[28,466,194,669],[225,462,336,673],[368,469,564,667],[578,467,685,669],
[754,503,878,655],[947,514,1097,653],[1135,504,1243,649],[1302,508,1464,651],
[20,728,232,854],[259,738,365,853],[390,681,550,851],[588,682,727,827],
[766,682,880,847],[967,677,1071,819],[1104,684,1322,824],[1338,679,1451,842],
[28,861,179,1057],[217,924,325,1050],[377,877,522,1052],[513,878,696,1051],
[704,867,897,1055],[877,933,1111,1051],[1107,1001,1323,1044],[1325,855,1454,1058],
]
ROOTS = [88,266,451,616,801,974,1152,1347,96,278,464,644,813,989,1150,1342,100,278,421,630,813,1002,1187,1360,79,310,448,645,818,1017,1166,1390,97,269,440,603,795,987,1215,1388]
AIR_LIFT = {10:18,11:35,12:18,26:20,27:18,28:20,29:20,30:3,31:20}


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
        scale = 0.80
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
