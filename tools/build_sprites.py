#!/usr/bin/env python3
"""Builds the sprite atlases from the provided sheets.

    python3 tools/build_sprites.py

Reads assets/art/source/{ship-parts,fx,parts}-sheet.png, cuts out every named piece (by connected
shape, with explicit rectangles for pieces that touch), strips the Pixelcut watermark, packs each
sheet's pieces into its own atlas (assets/art/{ship-parts,fx,parts}.png) and writes their frames
into js/sprites.js. To add a piece, give it a name and a centre in NAMES or an area in AREAS
(or a rectangle in CUTS for pieces that touch a neighbour).
"""
import json, os, re
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, 'assets/art/source/ship-parts-sheet.png')
ATLAS = os.path.join(ROOT, 'assets/art/ship-parts.png')
SRC = os.path.join(ROOT, 'assets/art/source')
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


def ship_pieces():
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
    return pieces


# The effects and steampunk-parts sheets are laid out on a loose grid, so each piece is claimed by
# an area: every shape whose centre falls inside it (x0, y0, x1, y1).
FX_AREAS = {
 'smoke_white': (20, 10, 150, 112), 'smoke_black': (25, 118, 148, 218), 'smoke_grey': (318, 118, 442, 218),
 'smoke_green': (950, 10, 1058, 112), 'smoke_olive': (1062, 10, 1168, 112), 'smoke_light': (1172, 10, 1278, 112), 'smoke_pink': (1282, 10, 1379, 112),
 'muzzle_trail': (455, 178, 612, 220),
 'boom_1': (25, 250, 75, 325), 'boom_2': (78, 250, 135, 325), 'boom_3': (138, 250, 205, 325), 'boom_4': (210, 250, 300, 325),
 'boom_5': (305, 248, 392, 340), 'boom_6': (395, 248, 492, 340), 'boom_7': (495, 245, 595, 342), 'boom_8': (598, 245, 700, 342),
 'blast_1': (712, 225, 885, 362), 'blast_2': (892, 225, 1045, 362), 'blast_3': (1050, 225, 1215, 364), 'blast_4': (1222, 222, 1379, 366),
 'rocket': (335, 372, 448, 512), 'rocket_flat': (478, 368, 695, 403), 'flame_trail': (460, 405, 662, 442), 'fireball': (540, 445, 695, 510),
 'smoke_trail': (1230, 376, 1379, 512),
 'zap_blue': (20, 535, 92, 620), 'zap_yellow': (102, 535, 182, 620), 'spark_star': (188, 535, 276, 620), 'spark_orange': (284, 535, 366, 620),
 'spark_gold': (14, 640, 96, 726), 'zap_white': (98, 642, 186, 728), 'spark_green': (188, 640, 276, 728), 'spark_ring': (280, 640, 366, 728),
 'orb_blue': (388, 642, 464, 720), 'orb_green': (486, 642, 556, 714),
 'bullet': (745, 540, 940, 566), 'bullet_long': (712, 698, 940, 727), 'splash': (965, 536, 1090, 632),
}
PARTS_AREAS = {
 'cannon_ornate': (18, 22, 232, 120), 'cannon_carriage': (236, 22, 418, 120), 'gun_brass': (422, 18, 560, 120), 'gun_steel': (560, 16, 706, 120),
 'gun_twin': (710, 14, 866, 120), 'gun_heavy': (868, 16, 1066, 120), 'gun_copper': (1068, 16, 1233, 120), 'gatling_heavy': (1234, 16, 1379, 120),
 'gatling_a': (16, 124, 164, 224), 'gatling_b': (166, 124, 316, 224), 'autogun_shield': (318, 124, 472, 234), 'autogun_a': (478, 124, 596, 234),
 'autogun_b': (598, 124, 706, 234), 'rocket_rack': (712, 124, 848, 234), 'rocket_bundle': (856, 124, 974, 234), 'rockets_small': (986, 124, 1066, 176),
 'bombs': (1082, 126, 1220, 230), 'torpedo': (1232, 116, 1379, 230),
 'tube_a': (18, 246, 160, 292), 'tube_mesh': (164, 246, 320, 292), 'tube_b': (18, 296, 162, 356), 'spyglass': (164, 296, 320, 364),
 'ring_brass': (328, 254, 460, 352), 'ring_steel': (472, 254, 594, 352), 'ammo_box': (602, 248, 704, 354), 'chest_ornate': (714, 254, 848, 352),
 'chest_wood': (868, 254, 994, 352), 'shell_a': (1012, 248, 1060, 364), 'shell_b': (1088, 246, 1132, 364), 'shell_c': (1162, 246, 1210, 364),
 'shell_d': (1236, 246, 1298, 364), 'shell_e': (1318, 246, 1379, 364),
 'boiler_cart': (18, 370, 182, 526), 'boiler_tank': (186, 370, 348, 526), 'boiler_gauges': (352, 370, 538, 526), 'engine_ornate': (538, 370, 702, 526),
 'coal_iron': (712, 382, 850, 514), 'coal_wood': (862, 382, 1000, 514), 'gears_a': (1004, 376, 1218, 522), 'gears_b': (1228, 372, 1379, 522),
 'beacon_green': (14, 530, 102, 642), 'beacon_steel': (103, 530, 184, 642), 'wheel': (185, 530, 287, 642), 'compass': (288, 530, 383, 642),
 'compass_wheel': (384, 530, 485, 642), 'lever_a': (487, 538, 532, 634), 'lever_b': (536, 538, 582, 634), 'gauge': (585, 536, 690, 634),
 'plate_a': (716, 532, 832, 640), 'plate_b': (840, 532, 960, 640),
 'prop_3a': (10, 640, 103, 738), 'prop_3b': (104, 640, 186, 738), 'prop_4': (190, 640, 280, 738), 'prop_6': (288, 640, 380, 738),
 'motor_a': (384, 642, 485, 732), 'motor_b': (486, 642, 586, 732), 'rudder': (587, 634, 684, 738),
 'fin_a': (706, 638, 784, 740), 'fin_b': (788, 638, 882, 740), 'fin_c': (884, 638, 960, 740),
}
# The second effects sheet (transparent): flames and a lightning crack.
FX2_AREAS = {
 'fire_1': (15, 604, 48, 642), 'fire_2': (55, 604, 98, 642), 'fire_3': (100, 604, 146, 642),
 'fire_big_1': (18, 648, 96, 746), 'fire_big_2': (106, 648, 184, 746), 'fire_big_3': (200, 648, 288, 746),
 'zap_crack': (995, 220, 1060, 292),
}
# The effects board is a JPEG on a navy grid, so its pieces are cut by rectangle and keyed (see keyed()).
BOARD_CUTS = {
 'bolt_jagged': (412, 470, 610, 516), 'bolt_chain': (412, 545, 610, 602), 'bolt_forked': (412, 625, 610, 676),
 'glue_glob': (650, 468, 708, 522), 'glue_mesh': (728, 468, 792, 522), 'glue_spray': (815, 468, 878, 522),
 'napalm': (650, 545, 708, 604), 'fire_sticky': (732, 545, 790, 604), 'sticky_fire': (650, 625, 708, 682),
}
PARTS_CUTS = {'panel_iron': (986, 536, 1124, 638), 'crate_wood': (1132, 536, 1238, 638)}


def area_pieces(path, areas, cuts={}):
    A = np.array(Image.open(path).convert('RGBA'))
    mask = A[:, :, 3] > 24
    lab, comps = components(mask)
    pieces = {}
    for nm, (x0, y0, x1, y1) in areas.items():
        ks = [k for k, cx, cy, n in comps if n >= 6 and x0 <= cx <= x1 and y0 <= cy <= y1]
        m = np.isin(lab, ks)
        ys, xs = np.where(m)
        crop = A[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
        crop[~m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]] = 0
        pieces[nm] = Image.fromarray(crop)
    for nm, (x0, y0, x1, y1) in cuts.items():
        crop = A[y0:y1, x0:x1].copy()
        crop[crop[:, :, 3] < 90] = 0  # the watermark's faint backing box reaches up under these
        ys, xs = np.where(crop[:, :, 3] > 24)
        pieces[nm] = Image.fromarray(crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    return pieces


def keyed(path, cuts):
    """Cuts pieces off a dark navy background: lightning keeps its bright glow, everything else
    drops the bluish-dark backdrop and grid lines."""
    A = np.array(Image.open(path).convert('RGB')).astype(float)
    pieces = {}
    for nm, (x0, y0, x1, y1) in cuts.items():
        c = A[y0:y1, x0:x1]
        r, g, b = c[:, :, 0], c[:, :, 1], c[:, :, 2]
        lum = 0.3 * r + 0.59 * g + 0.11 * b
        if nm.startswith('bolt_'):
            alpha = np.clip((lum - 95) / 110, 0, 1)
        else:
            blue = (b > r + 18) & (b >= g - 4) & (lum < 170)
            alpha = np.where(blue, 0.0, 1.0)
            alpha = np.where(lum < 40, 0.0, alpha)
        rgba = np.dstack([c, alpha * 255]).astype(np.uint8)
        ys, xs = np.where(rgba[:, :, 3] > 40)
        rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        pieces[nm] = Image.fromarray(rgba, 'RGBA')
    return pieces


def pack(pieces, path):
    """Shelf-packs pieces into a 1024-wide atlas and returns their frames."""
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
    atlas.save(path, optimize=True)
    return frames


def main():
    frames = {}
    sheets = [(ship_pieces(), ATLAS),
              ({**area_pieces(os.path.join(SRC, 'fx-sheet.png'), FX_AREAS), **area_pieces(os.path.join(SRC, 'fx-sheet-2.png'), FX2_AREAS),
                **keyed(os.path.join(SRC, 'effects-board.jpg'), BOARD_CUTS)}, os.path.join(ROOT, 'assets/art/fx.png')),
              (area_pieces(os.path.join(SRC, 'parts-sheet.png'), PARTS_AREAS, PARTS_CUTS), os.path.join(ROOT, 'assets/art/parts.png'))]
    for i, (pieces, path) in enumerate(sheets):
        for k, f in pack(pieces, path).items():
            frames[k] = f + ((i,) if i else ())
    rows = ',\n'.join(f"    {k}: [{','.join(str(v) for v in frames[k])}]" for k in sorted(frames))
    js = open(SPRITES_JS).read()
    js = re.sub(r"const FRAMES = \{\n.*?\n  \};", "const FRAMES = {\n" + rows + ",\n  };", js, flags=re.S)
    open(SPRITES_JS, 'w').write(js)
    print(f'{len(frames)} sprites in {len(sheets)} atlases')


if __name__ == '__main__':
    main()
