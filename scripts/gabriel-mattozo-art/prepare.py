"""Prepare Gabriel Mattozo's reviewed original art; offline Pillow/NumPy only."""
from pathlib import Path
import argparse
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import large_components, dilate

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[1] / 'public/fighters/gabriel-mattozo'
CELL = (192, 224)
BASELINE = 216
MARGIN = 4
# Solid-component bounds reviewed against the original 1467x1072 source.
BOUNDS = [[42, 8, 153, 213], [211, 8, 324, 213], [395, 10, 511, 213], [579, 8, 694, 213], [757, 8, 892, 213], [928, 9, 1071, 213], [1113, 8, 1248, 212], [1311, 6, 1411, 213], [21, 235, 169, 443], [207, 235, 352, 443], [419, 231, 515, 432], [587, 232, 691, 381], [772, 236, 871, 446], [946, 321, 1049, 446], [1113, 253, 1254, 446], [1284, 256, 1452, 446], [28, 464, 162, 666], [210, 459, 326, 666], [368, 463, 580, 666], [597, 459, 689, 665], [766, 509, 895, 660], [945, 525, 1084, 660], [1130, 521, 1231, 661], [1311, 531, 1405, 661], [23, 752, 216, 870], [240, 754, 341, 870], [409, 676, 518, 837], [582, 683, 742, 842], [773, 680, 873, 842], [953, 678, 1068, 849], [1105, 682, 1306, 836], [1321, 681, 1416, 834], [29, 882, 150, 1058], [194, 928, 294, 1058], [352, 886, 466, 1058], [515, 910, 622, 1058], [660, 884, 831, 1058], [849, 942, 1033, 1058], [1062, 1002, 1311, 1053], [1331, 849, 1452, 1058]]
ROOTS = [94, 265, 451, 635, 817, 995, 1180, 1371, 89, 271, 465, 638, 822, 995, 1182, 1347, 93, 263, 422, 638, 818, 989, 1178, 1358, 72, 284, 465, 638, 822, 1009, 1172, 1368, 89, 241, 410, 566, 733, 905, 1185, 1385]
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
    assert source.size == (1467,1072), 'Bounds belong to the reviewed source'
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

