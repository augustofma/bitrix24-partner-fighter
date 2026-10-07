"""Normalize reviewed ImageGen poses without redrawing; Pillow/NumPy, offline only."""
from pathlib import Path
import argparse
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from art_tools import large_components, dilate

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parents[1] / 'public/fighters/joao-guiotti'
CELL = (192, 224)
BASELINE = 216
MARGIN = 4
# Reviewed visual regions, not a mathematical division of the irregular source grid.
REGIONS = [
    (0,0,185,229),(185,0,370,229),(370,0,553,229),(553,0,738,229),
    (738,0,923,229),(923,0,1105,229),(1105,0,1295,229),(1295,0,1468,229),
    (0,230,185,459),(185,230,370,459),(370,229,550,459),(550,230,738,459),
    (738,230,920,459),(920,280,1100,459),(1100,230,1280,459),(1280,230,1468,459),
    (0,460,185,674),(185,460,350,674),(350,460,574,674),(574,460,738,674),
    (738,490,912,674),(912,490,1105,674),(1105,490,1285,674),(1285,490,1468,674),
    (0,680,207,854),(207,680,369,854),(369,674,550,854),(550,674,747,854),
    (747,674,924,854),(924,674,1105,854),(1105,674,1328,854),(1328,674,1468,854),
    (0,854,185,1071),(185,854,369,1071),(369,854,542,1071),(542,854,730,1071),
    (730,854,917,1071),(900,915,1115,1071),(1112,976,1335,1071),(1330,848,1468,1071),
]
# Hip/support-foot anchors keep limbs extending forward without recentering the torso.
ROOTS = [80,265,451,639,830,1015,1200,1386,86,270,461,637,825,997,1183,1365,
         83,270,425,638,811,985,1186,1368,80,272,461,630,815,994,1193,1380,
         80,268,441,631,823,998,1223,1396]
AIR_LIFT = {10:18,11:40,12:20,26:10,27:6,28:10,29:10,30:10,31:10}


def isolate(image, threshold=16):
    data = np.array(image)
    foreground = data[:,:,3] >= threshold
    # A reviewed region may include a disconnected sliver of the adjacent pose.
    mask = large_components(foreground, max(150, np.count_nonzero(foreground)//2))
    keep = dilate(mask, 1)
    data[~keep] = 0
    result = Image.fromarray(data)
    box = result.getbbox()
    if box is None:
        raise ValueError('Empty source pose')
    return result.crop(box), box


def prepare():
    source = Image.open(HERE / 'sheet-source.png').convert('RGBA')
    assert source.size == (1468,1071), 'Crop map is specific to the reviewed source'
    atlas = Image.new('RGBA', (1536,1120))
    for frame, region in enumerate(REGIONS):
        pose, box = isolate(source.crop(region))
        if frame == 18:
            # The isolated replacement contains a low-alpha generation glow: keep its solid
            # pixel-art silhouette and one original edge pixel, not the unwanted glow.
            pose, box = isolate(Image.open(HERE / 'kick-active.png').convert('RGBA'), 240)
        scale = 0.86
        if frame <= 9 or frame in (14,15,16,17,18,19,32,34,35):
            scale = 172 / pose.height
        if frame == 39:
            scale = 202 / pose.height
        if frame == 27:
            scale = 0.79
        lift = AIR_LIFT.get(frame, 0)
        scale = min(scale, (CELL[0]-2*MARGIN)/pose.width, (BASELINE-MARGIN-lift)/pose.height)
        size = (round(pose.width*scale), round(pose.height*scale))
        root = ROOTS[frame]-region[0]-box[0]
        if frame == 18:
            sole = np.array(pose.getchannel('A'))[-max(1,pose.height//40):]
            root = np.nonzero(sole)[1].mean()
        x = max(MARGIN, min(CELL[0]-MARGIN-size[0], round(CELL[0]/2-root*scale)))
        y = BASELINE-size[1]-lift
        pose = pose.resize(size, Image.Resampling.NEAREST)
        atlas.paste(pose, (frame%8*CELL[0]+x, frame//8*CELL[1]+y))
        print(f'{frame:02}: size={size}, position=({x},{y}), bottom={y+size[1]}')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT / 'sprite.png')
    portrait, _ = isolate(Image.open(HERE / 'portrait-source.png').convert('RGBA'))
    scale = min(232/portrait.width, 292/portrait.height)
    portrait = portrait.resize((round(portrait.width*scale), round(portrait.height*scale)), Image.Resampling.NEAREST)
    canvas = Image.new('RGBA', (240,300))
    canvas.paste(portrait, ((240-portrait.width)//2,300-portrait.height))
    canvas.save(OUTPUT / 'portrait.png')


def validate():
    sheet = Image.open(OUTPUT / 'sprite.png')
    portrait = Image.open(OUTPUT / 'portrait.png')
    assert sheet.size == (1536,1120) and sheet.mode == 'RGBA'
    assert portrait.size == (240,300) and portrait.mode == 'RGBA'
    for frame in range(40):
        x,y = frame%8*192,frame//8*224
        alpha = sheet.crop((x,y,x+192,y+224)).getchannel('A')
        left,top,right,bottom = alpha.getbbox()
        assert left >= MARGIN and top >= MARGIN and right <= 192-MARGIN and bottom <= 224-MARGIN, frame
        assert bottom == BASELINE-AIR_LIFT.get(frame,0), frame
        assert np.count_nonzero(np.array(alpha)) > 500, frame
    assert portrait.getpixel((0,0))[3] == 0
    print('PASS: 1536x1120 RGBA; 40 isolated 192x224 cells; portrait 240x300 RGBA.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--validate-only', action='store_true')
    args = parser.parse_args()
    if not args.validate_only:
        prepare()
    validate()
