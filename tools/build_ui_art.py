#!/usr/bin/env python3
"""Cuts the card art, Core portraits and map icons from the sheets in assets/art/source/ui/.

    python3 tools/build_ui_art.py

- part-cards.png: one illustration per part (the picture between the card's header and its label)
  -> assets/art/cards/<part>.jpg
- core-portraits.png: one painting per Core (above its name plate) -> assets/art/cores/<core>.jpg
- map-icons.png: one round icon per map node, masked to its brass ring -> assets/art/icons/<node>.png
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/art/source/ui')

# Cards in sheet order (left to right, top to bottom). Some support cards on the sheet carry the
# wrong name for what they show, so they are matched by their pictures. Supply Hatch has its own
# sheet; the misspelt second Overpressure Valve is the Clockwork Heart's picture.
CARD_ORDER = [
    'harpoon', 'grapnel', 'cannon', 'mortar', 'flamethrower', 'gatling', 'sniper', 'rockets', 'flak', 'tesla',
    'plating', 'bulwark', 'deflector', 'repair', 'quarters', 'boiler', 'sprinkler', 'scrubber', 'heart', 'overpressure',
    'telescope', 'gasbag', 'propeller', 'lightningrod', 'cargo', 'autoloader', 'gyro',
]
CORE_ORDER = ['airship', 'battleship', 'zeppelin', 'clockwork', 'privateer', 'tempest']
# Map icons: ring centres on the sheet (found by fitting the brass ring).
ICON_CENTRES = {
    'patrol': (166, 164), 'lair': (474, 164), 'storm': (770, 166), 'smog': (1066, 164), 'trader': (1370, 166),
    'beacon': (168, 482), 'guild': (472, 484), 'hangar': (768, 486), 'derelict': (1065, 486), 'rift': (1372, 486),
    'boss': (474, 798), 'unknown': (768, 800), 'cloud': (1062, 800),
}
ICON_R = 119  # the brass ring's outer radius (the compass spikes beyond it are dropped)


def boxes(img, min_area):
    A = np.array(img.convert('RGB')).astype(int)
    bg = np.median(A[:6, :6].reshape(-1, 3), axis=0)
    fg = np.abs(A - bg).max(axis=2) > 28
    lab, _ = ndimage.label(ndimage.binary_closing(fg, iterations=3))
    out = []
    for o in ndimage.find_objects(lab):
        b = (o[1].start, o[0].start, o[1].stop, o[0].stop)
        if (b[2] - b[0]) * (b[3] - b[1]) >= min_area:
            out.append(b)
    out.sort(key=lambda b: (b[1] // 60, b[0]))
    return out


def main():
    os.makedirs(os.path.join(ROOT, 'assets/art/cards'), exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'assets/art/cores'), exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'assets/art/icons'), exist_ok=True)
    sheet = Image.open(os.path.join(SRC, 'part-cards.png')).convert('RGB')
    cards = boxes(sheet, 20000)
    assert len(cards) == len(CARD_ORDER), len(cards)
    for pid, (x0, y0, x1, y1) in zip(CARD_ORDER, cards):
        w, h = x1 - x0, y1 - y0
        art = sheet.crop((x0 + round(w * 0.07), y0 + round(h * 0.13), x1 - round(w * 0.07), y0 + round(h * 0.77)))
        art.thumbnail((240, 240), Image.LANCZOS)
        art.save(os.path.join(ROOT, 'assets/art/cards', pid + '.jpg'), quality=86)
    # The Supply Hatch came later, on a sheet of its own.
    sheet = Image.open(os.path.join(SRC, 'supply-hatch.png')).convert('RGB')
    (x0, y0, x1, y1), = boxes(sheet, 100000)
    w, h = x1 - x0, y1 - y0
    art = sheet.crop((x0 + round(w * 0.04), y0 + round(h * 0.15), x1 - round(w * 0.04), y0 + round(h * 0.78)))
    art.thumbnail((240, 240), Image.LANCZOS)
    art.save(os.path.join(ROOT, 'assets/art/cards', 'hatch.jpg'), quality=86)
    sheet = Image.open(os.path.join(SRC, 'core-portraits.png')).convert('RGB')
    cores = boxes(sheet, 100000)
    assert len(cores) == len(CORE_ORDER), len(cores)
    for cid, (x0, y0, x1, y1) in zip(CORE_ORDER, cores):
        w, h = x1 - x0, y1 - y0
        art = sheet.crop((x0 + round(w * 0.045), y0 + round(h * 0.045), x1 - round(w * 0.045), y0 + round(h * 0.8)))
        art.thumbnail((420, 420), Image.LANCZOS)
        art.save(os.path.join(ROOT, 'assets/art/cores', cid + '.jpg'), quality=86)
    sheet = Image.open(os.path.join(SRC, 'map-icons.png')).convert('RGBA')
    for nid, (cx, cy) in ICON_CENTRES.items():
        icon = sheet.crop((cx - ICON_R, cy - ICON_R, cx + ICON_R, cy + ICON_R))
        k = 4  # supersampled round mask for a smooth edge
        mask = Image.new('L', (ICON_R * 2 * k, ICON_R * 2 * k), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, ICON_R * 2 * k - 1, ICON_R * 2 * k - 1), fill=255)
        icon.putalpha(mask.resize(icon.size, Image.LANCZOS))
        icon.resize((96, 96), Image.LANCZOS).save(os.path.join(ROOT, 'assets/art/icons', nid + '.png'), optimize=True)
    print(f'{len(cards)} cards, {len(cores)} cores, {len(ICON_CENTRES)} icons')


# ---------- second batch: status icons, dice, debris, coins, badges, event scenes, gulls, skies ----------
SRC2 = os.path.join(ROOT, 'assets/art/source/ui2')
STATUS_ROWS = [  # (names, centre xs, top, bottom) of each row of icons on status-icons.png
    (['fire', 'glue', 'gas', 'burn', 'choking', 'gummed', 'block'], [118, 330, 549, 754, 969, 1195, 1411], 92, 405),
    (['steam', 'pressure', 'charge', 'cogs', 'weight', 'durability'], [144, 395, 653, 915, 1159, 1411], 495, 845),
]
DICE = [(88, 78, 240, 220), (333, 78, 485, 220), (577, 77, 729, 219), (815, 77, 966, 219), (1054, 75, 1207, 219), (1295, 70, 1450, 217)]
COINS = [(63, 586, 172, 697), (226, 596, 320, 694), (369, 596, 459, 697), (511, 591, 566, 701), (641, 601, 742, 700), (782, 596, 887, 701),
         (921, 604, 992, 710), (1053, 586, 1112, 705), (1165, 596, 1208, 712), (1255, 598, 1342, 705), (1383, 604, 1489, 710)]
BADGES = [(34, 783, 208, 977), (225, 781, 389, 976), (415, 781, 567, 976), (594, 781, 746, 976), (775, 781, 929, 976), (953, 777, 1110, 976), (1137, 777, 1294, 976), (1321, 777, 1495, 977)]
DEBRIS_BAND = (290, 500)  # the hit-debris row; every piece in it is cut
EVENT_ORDER = ['storm', 'smog', 'beacon', 'guild', 'derelict', 'rift', 'lair', 'trader', 'hangar', 'boss']
EVENT_ROWS = [(8, 169), (186, 347), (364, 525), (541, 703), (719, 878)]
EVENT_COLS = [(10, 877), (893, 1764)]
GULL_FLAP = [(50, 231, 177, 365), (218, 254, 400, 367), (436, 250, 604, 367), (643, 244, 764, 367), (813, 231, 956, 360), (1022, 241, 1163, 373), (1220, 244, 1387, 365), (1451, 219, 1566, 372)]
# Full-size paintings in assets/art (by upload name) -> sky backdrops.
SKIES = {
    '4929161B-87F1-4FE8-A71E-F7B340E2ACB7': 'sky-clear', '04D0371F-EDA8-4509-8DFF-F8FFE3A84BE0': 'sky-sunset-isles',
    '3EDAD1C4-069A-412A-B603-6D8A6A1B45DF': 'sky-chimneys', 'BFF973EC-908B-40EF-A802-7DA5442D16B9': 'sky-smoke-wrecks',
    '6546AEA0-120B-4659-9379-DE04A578571F': 'sky-night-city', 'E8375B07-10C1-4B00-898E-A618D6C206CD': 'sky-pirate-lair',
    'FF8AEA10-B4F7-4B0E-9C0A-A3895639A2F7': 'sky-derelicts', '34A4A4A7-775A-491D-9639-7F38BE60B49E': 'sky-rift',
    '105D406F-5F89-4BAF-AFAA-E25490C5425D': 'sky-port', '9C054B03-B0B9-471F-9738-95C0F94CB446': 'sky-victory',
    'EF46F0FF-0413-4EDB-A223-A55B54C2CE96': 'sky-defeat',
}


def lift(img, soft=(12, 40)):
    """Lifts art off a flat dark backdrop: alpha rises with distance from the backdrop colour."""
    A = np.array(img.convert('RGB')).astype(int)
    bg = np.median(np.concatenate([A[0], A[-1], A[:, 0], A[:, -1]]), axis=0)
    d = np.abs(A - bg).max(axis=2)
    a = np.clip((d - soft[0]) / (soft[1] - soft[0]), 0, 1)
    lab, n = ndimage.label(a > 0.5)
    if n:  # keep the main shape and anything sizeable, drop specks
        sizes = ndimage.sum(a > 0.5, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= max(30, sizes.max() * 0.02)])
        a = a * ndimage.binary_dilation(keep, iterations=2)
    out = Image.fromarray(np.dstack([A.astype(np.uint8), (a * 255).astype(np.uint8)]), 'RGBA')
    bb = out.getbbox()
    return out.crop(bb) if bb else out


def save_small(im, path, size):
    im = im.copy()
    im.thumbnail((size, size), Image.LANCZOS)
    im.save(path, optimize=True)


def batch2():
    for d in ['status', 'bits', 'scenes', 'skies']:
        os.makedirs(os.path.join(ROOT, 'assets/art', d), exist_ok=True)
    sheet = Image.open(os.path.join(SRC2, 'status-icons.png')).convert('RGB')
    for names, xs, top, bottom in STATUS_ROWS:
        for nm, cx in zip(names, xs):
            save_small(lift(sheet.crop((cx - 110, top, cx + 110, bottom))), os.path.join(ROOT, 'assets/art/status', nm + '.png'), 72)
    sheet = Image.open(os.path.join(SRC2, 'bits.png')).convert('RGB')
    for i, b in enumerate(DICE):
        save_small(lift(sheet.crop((b[0] - 4, b[1] - 4, b[2] + 4, b[3] + 4))), os.path.join(ROOT, f'assets/art/bits/die{i + 1}.png'), 64)
    for i, b in enumerate(COINS):
        save_small(lift(sheet.crop((b[0] - 4, b[1] - 4, b[2] + 4, b[3] + 4))), os.path.join(ROOT, f'assets/art/bits/coin{i}.png'), 32)
    for i, b in enumerate(BADGES):
        save_small(lift(sheet.crop((b[0] - 4, b[1] - 4, b[2] + 4, b[3] + 4))), os.path.join(ROOT, f'assets/art/bits/badge{i}.png'), 72)
    band = sheet.crop((0, DEBRIS_BAND[0], sheet.width, DEBRIS_BAND[1]))
    A = np.array(band).astype(int)
    bg = np.median(A[:4, :4].reshape(-1, 3), axis=0)
    lab, n = ndimage.label(ndimage.binary_dilation(np.abs(A - bg).max(axis=2) > 28, iterations=2))
    k = 0
    for o in sorted(ndimage.find_objects(lab), key=lambda o: o[1].start):
        if (o[0].stop - o[0].start) * (o[1].stop - o[1].start) < 900:
            continue
        piece = lift(band.crop((max(0, o[1].start - 3), max(0, o[0].start - 3), o[1].stop + 3, o[0].stop + 3)))
        save_small(piece, os.path.join(ROOT, f'assets/art/bits/debris{k}.png'), 40)
        k += 1
    sheet = Image.open(os.path.join(SRC2, 'event-scenes.png')).convert('RGB')
    i = 0
    for r0, r1 in EVENT_ROWS:
        for c0, c1 in EVENT_COLS:
            h = r1 - r0
            sc = sheet.crop((c0 + 6, r0 + 6, c1 - 6, r1 - round(h * 0.25)))
            sc.thumbnail((900, 900), Image.LANCZOS)
            sc.save(os.path.join(ROOT, 'assets/art/scenes', EVENT_ORDER[i] + '.jpg'), quality=84)
            i += 1
    sheet = Image.open(os.path.join(SRC2, 'seagulls.png')).convert('RGB')
    for i, b in enumerate(GULL_FLAP):
        save_small(lift(sheet.crop((b[0] - 4, b[1] - 4, b[2] + 4, b[3] + 4))), os.path.join(ROOT, f'assets/art/bits/gull{i}.png'), 40)
    for src, name in SKIES.items():
        path = os.path.join(ROOT, 'assets/art/source/skies', src + '.png')
        if os.path.exists(path):
            im = Image.open(path).convert('RGB')
            im.thumbnail((1600, 1600), Image.LANCZOS)
            im.save(os.path.join(ROOT, 'assets/art/skies', name + '.jpg'), quality=82)
    print(f'status, dice, {len(COINS)} coins, {len(BADGES)} badges, {k} debris, {i} scenes, gulls, skies')


def map_chart():
    """The sky chart: its sky (behind the map) and its brass frame (around it), gears removed so
    the frame's edges stretch cleanly as a border image."""
    im = Image.open(os.path.join(SRC2, 'map-chart.png')).convert('RGB')
    W, H = im.size
    sky = im.crop((30, 64, W - 30, H - 92))  # clear of the gears that hang off the middle of each bar
    sky.thumbnail((1600, 1600), Image.LANCZOS)
    sky.save(os.path.join(ROOT, 'assets/art/ui/map-sky.jpg'), quality=80)
    fr = im.convert('RGBA')
    # Cover the middle gears on the top and bottom bars with a plain stretch of bar.
    for y0, y1 in ((0, 72), (H - 72, H)):
        fr.paste(fr.crop((880, y0, 1000, y1)), (1026, y0))
        fr.paste(fr.crop((880, y0, 940, y1)), (1146, y0))
    # Keep only metal: the bars along each edge, plus the brass and dark ink of the corner plates
    # and side brackets. Sky and cloud inside the frame become transparent.
    A = np.array(fr).astype(int)
    r, g, b = A[..., 0], A[..., 1], A[..., 2]
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    metal = (lum < 80) | ((r - b) > 0.42 * np.maximum(r, 1))
    yy, xx = np.mgrid[:H, :W]
    edge = np.minimum(np.minimum(xx, W - 1 - xx), np.minimum(yy, H - 1 - yy))
    bars = (np.minimum(xx, W - 1 - xx) < 22) | (yy < 31) | ((H - 1 - yy) < 40)
    plates = (edge < 72) & ~bars & ndimage.binary_opening(metal, iterations=2)
    lab, n = ndimage.label(plates)
    # Corner plates and brackets are chunky; rust flecks and the thin lip along the bars are not.
    chunky = [i + 1 for i, o in enumerate(ndimage.find_objects(lab)) if min(o[0].stop - o[0].start, o[1].stop - o[1].start) >= 24]
    plates = np.isin(lab, chunky)
    keep = bars | plates
    A[..., 3] = np.where(keep, 255, 0)
    fr = Image.fromarray(A.astype(np.uint8), 'RGBA')
    fr = fr.resize((W // 2, H // 2), Image.LANCZOS)
    fr.save(os.path.join(ROOT, 'assets/art/ui/map-frame.png'), optimize=True)


# Pieces of the second UI kit (ui-kit-2.png), by their boxes on the sheet.
KIT2 = {
    'pennant-gear': (15, 831, 70, 969), 'pennant-crate': (79, 831, 133, 969), 'pennant-wrench': (141, 831, 196, 968),
    'pennant-rocket': (204, 831, 259, 969), 'pennant-ladder': (267, 831, 322, 969), 'pennant-balloon': (329, 831, 384, 968),
    'pennant-tower': (392, 831, 447, 969), 'pennant-compass': (455, 831, 510, 969),
    'banner-red': (1225, 381, 1283, 499), 'banner-blue': (1286, 381, 1345, 505), 'banner-green': (1348, 380, 1408, 500),
    'banner-grey': (1409, 381, 1468, 499),
    'padlock': (1394, 690, 1436, 761), 'btn-gear': (200, 701, 265, 768), 'btn-home': (124, 701, 189, 768),
    'btn-hammer': (276, 701, 341, 768), 'btn-crate': (353, 701, 418, 768), 'btn-flag': (429, 701, 494, 768),
    'compass': (5, 699, 115, 812),
}


def kit2():
    sheet = Image.open(os.path.join(SRC2, 'ui-kit-2.png')).convert('RGB')
    for name, (x0, y0, x1, y1) in KIT2.items():
        save_small(lift(sheet.crop((x0 - 6, y0 - 6, x1 + 6, y1 + 6))), os.path.join(ROOT, 'assets/art/ui', name + '.png'), 96)


if __name__ == '__main__':
    main()
    batch2()
    map_chart()
    kit2()
