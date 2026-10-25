#!/usr/bin/env python3
"""Builds the sprite atlas from the provided ship-parts sheet.

    python3 tools/build_sprites.py

Reads assets/art/source/ship-parts-sheet.png, cuts out every named piece (by connected shape,
with explicit rectangles for pieces that touch), strips the Pixelcut watermark, packs the pieces
into assets/art/ship-parts.png and writes their frames into js/sprites.js.
To add a piece, give it a name and an approximate centre in NAMES (or a rectangle in CUTS).
"""
import json, os, re
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, 'assets/art/source/ship-parts-sheet.png')
ATLAS = os.path.join(ROOT, 'assets/art/ship-parts.png')
SPRITES_JS = os.path.join(ROOT, 'js/sprites.js')

# Approximate centre of each piece on the sheet.
NAMES={
 'ship_ironclad':(205,140),'ship_pirate':(545,145),'ship_dreadnought':(890,150),'ship_galleon':(1215,155),
 'hull_wood':(118,400),'hull_trim':(130,487),'hull_iron':(128,585),
 'balloon_red':(304,405),'balloon_stripe_red':(444,405),'balloon_green':(304,480),'balloon_net':(444,480),
 'balloon_blue':(304,553),'balloon_stripe_blue':(444,575),'net':(304,622),
 'prop_a':(574,413),'prop_b':(624,415),'engine_small':(682,410),'engine_box':(753,410),'engine_turbine':(831,411),
 'mast':(578,552),'rigging':(652,548),'sail_square':(753,557),'sail_jib':(829,555),
 'cart':(924,402),'grapple':(995,397),'lamp':(1059,402),
 'turret_a':(915,454),'turret_b':(962,453),'turret_c':(1012,451),'turret_d':(1057,451),'turret_e':(915,496),
 'cannon_a':(962,497),'cannon_b':(1012,497),'turret_f':(1057,497),
 'harpoon':(956,537),'hook':(1059,536),'plank':(917,572),'rail':(964,571),'bench':(1012,570),'frame':(1057,569),
 'anchor_a':(917,622),'anchor_b':(963,623),'gate':(1004,621),'cabin_small':(1056,621),'cabin_big':(1120,620),
 'ladder':(1101,542),'pole':(1125,567),'pipe':(1113,485),'bolt':(1099,447),'ram_prow':(1189,475),
 'flag_red':(1278,470),'flag_star':(1333,470),'flag_jolly':(1177,530),'flag_green':(1232,530),'flag_blue':(1283,530),'flag_cross':(1336,530),
 'cloud_small':(1190,575),'cloud_big':(1265,570),'cloud_puff':(1325,572),'trail_smoke':(1255,603),'trail_flame':(1255,632),'steam_puff':(1345,603),
 'watermark':(1245,685),
}
# Pieces whose centres sit close to a neighbour are claimed by an explicit area instead.
RECTS = {'flag_blue': (1256, 500, 1308, 562), 'cloud_big': (1215, 550, 1302, 592), 'cabin_big': (1086, 586, 1152, 652), 'trail_flame': (1150, 612, 1345, 650), 'watermark': (1120, 652, 1370, 730)}
# Touching pieces: cut straight from the sheet by rectangle.
CUTS = {'flag_blue': (1256, 500, 1308, 557), 'cloud_big': (1215, 557, 1302, 592), 'cabin_big': (1086, 586, 1150, 647), 'trail_flame': (1150, 617, 1345, 639)}


def components(alpha):
    H, W = alpha.shape
    lab = np.zeros((H, W), int)
    comps = []
    for y in range(H):
        for x in range(W):
            if alpha[y, x] and not lab[y, x]:
                k = len(comps) + 1
                q = deque([(y, x)]); lab[y, x] = k; pts = []
                while q:
                    cy, cx = q.popleft(); pts.append((cy, cx))
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1), (cy + 1, cx + 1), (cy - 1, cx - 1), (cy + 1, cx - 1), (cy - 1, cx + 1)):
                        if 0 <= ny < H and 0 <= nx < W and alpha[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = k; q.append((ny, nx))
                p = np.array(pts)
                comps.append((k, p[:, 1].mean(), p[:, 0].mean(), len(p)))
    return lab, comps


def main():
    A = np.array(Image.open(SHEET).convert('RGBA'))
    H, W = A.shape[:2]
    lab, comps = components(A[:, :, 3] > 24)
    groups = {n: [] for n in list(NAMES) + list(RECTS)}
    for k, cx, cy, n in comps:
        if n < 12:
            continue
        inrect = [nm for nm, (x0, y0, x1, y1) in RECTS.items() if x0 <= cx <= x1 and y0 <= cy <= y1]
        if inrect:
            groups[inrect[0]].append(k); continue
        best = min(NAMES, key=lambda nm: (NAMES[nm][0] - cx) ** 2 + (NAMES[nm][1] - cy) ** 2)
        if ((NAMES[best][0] - cx) ** 2 + (NAMES[best][1] - cy) ** 2) ** 0.5 <= 170:
            groups[best].append(k)
    pieces = {}
    for nm, ks in groups.items():
        if nm == 'watermark' or nm in CUTS or not ks:
            continue
        mask = np.isin(lab, ks)
        ys, xs = np.where(mask)
        crop = A[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
        crop[~mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]] = 0
        pieces[nm] = Image.fromarray(crop)
    # The watermark is a 25%-opacity black box with a dark navy border; strip it before rectangle cuts.
    clean = A.copy()
    yy, xx = np.mgrid[0:H, 0:W]
    dark = (clean[:, :, 0] < 30) & (clean[:, :, 1] < 30) & (clean[:, :, 2] < 50)
    clean[(xx >= 1126) & (yy >= 634) & ((clean[:, :, 3] < 110) | dark)] = 0
    for nm, (x0, y0, x1, y1) in CUTS.items():
        crop = clean[y0:y1, x0:x1]
        ys, xs = np.where(crop[:, :, 3] > 24)
        pieces[nm] = Image.fromarray(crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    # Shelf-pack into a 1024-wide atlas.
    order = sorted(pieces, key=lambda n: -pieces[n].size[1])
    x = y = row = 0; frames = {}
    for n in order:
        w, h = pieces[n].size
        if x + w + 2 > 1024:
            x = 0; y += row + 2; row = 0
        frames[n] = (x, y, w, h); x += w + 2; row = max(row, h)
    atlas = Image.new('RGBA', (1024, y + row), (0, 0, 0, 0))
    for n, (fx, fy, fw, fh) in frames.items():
        atlas.paste(pieces[n], (fx, fy))
    atlas.save(ATLAS, optimize=True)
    rows = ',\n'.join(f"    {k}: [{','.join(str(v) for v in frames[k])}]" for k in sorted(frames))
    js = open(SPRITES_JS).read()
    js = re.sub(r"const FRAMES = \{\n.*?\n  \};", "const FRAMES = {\n" + rows + ",\n  };", js, flags=re.S)
    open(SPRITES_JS, 'w').write(js)
    print(f'{len(frames)} sprites -> {os.path.relpath(ATLAS, ROOT)}')


if __name__ == '__main__':
    main()
