"""Prepare Aislan's reviewed original art; offline Pillow/NumPy only."""
from pathlib import Path
import argparse
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import large_components, dilate

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[1] / 'public/fighters/aislan'
CELL = (192, 224)
BASELINE = 216
MARGIN = 4
# Solid-component bounds reviewed against the original 1467x1072 source.
BOUNDS = [[47,17,159,247],[211,27,350,247],[389,27,536,247],[578,25,713,247],[751,16,912,248],[950,18,1089,247],[1128,17,1303,247],[1325,16,1460,248],[29,265,193,491],[227,265,338,491],[406,260,529,491],[575,259,719,413],[748,267,912,472],[923,348,1051,491],[1075,281,1266,491],[1264,285,1458,491],[22,502,171,717],[233,501,344,717],[382,500,590,717],[612,500,712,717],[762,559,893,716],[924,567,1098,717],[1119,561,1254,717],[1314,565,1434,717],[17,775,214,888],[235,754,369,887],[418,719,534,873],[585,724,761,872],[780,723,888,875],[936,727,1045,883],[1063,727,1275,894],[1321,727,1429,869],[23,892,168,1063],[221,938,342,1062],[403,892,537,1062],[566,898,716,1062],[726,896,895,1062],[886,927,1105,1061],[1115,992,1363,1062],[1366,863,1458,1062]]
ROOTS = [100,280,463,647,823,1014,1198,1384,102,277,466,646,820,985,1150,1331,86,274,436,654,822,982,1183,1367,73,289,474,647,832,987,1125,1374,91,276,464,628,796,971,1235,1407]
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
    assert source.size == (1467,1072), 'Bounds belong to the reviewed source'
    atlas = Image.new('RGBA', (1536,1120))
    for frame, (left,top,right,bottom) in enumerate(BOUNDS):
        region = (max(0,left-3),max(0,top-3),min(source.width,right+3),min(source.height,bottom+3))
        pose, box = isolate(source.crop(region))
        scale = 0.78
        if frame <= 9 or frame in (14,15,16,17,18,19,32,34,35):
            scale = 172 / pose.height
        if frame == 39:
            scale = 202 / pose.height
        lift = AIR_LIFT.get(frame, 0)
        scale = min(scale, (CELL[0]-2*MARGIN)/pose.width, (BASELINE-MARGIN-lift)/pose.height)
        size = (round(pose.width*scale), round(pose.height*scale))
        anchor = ROOTS[frame]-region[0]-box[0]
        x = max(MARGIN, min(CELL[0]-MARGIN-size[0], round(CELL[0]/2-anchor*scale)))
        y = BASELINE-size[1]-lift
        atlas.paste(pose.resize(size, Image.Resampling.NEAREST), (frame%8*192+x,frame//8*224+y))
        print(f'{frame:02}: size={size}, position=({x},{y}), bottom={y+size[1]}')
    # The dedicated strip replaces the source sheet's inconsistent idle stances.
    idle = Image.open(HERE / 'idle-source.png').convert('RGBA')
    for frame in range(4):
        pose, _ = isolate(idle.crop((round(frame*idle.width/4),0,round((frame+1)*idle.width/4),idle.height)))
        scale = 172 / pose.height
        size = (round(pose.width*scale),172)
        atlas.paste((0,0,0,0),(frame*192,0,(frame+1)*192,224))
        atlas.paste(pose.resize(size,Image.Resampling.NEAREST),(frame*192+(192-size[0])//2,44))
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
