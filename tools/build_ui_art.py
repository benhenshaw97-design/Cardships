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
# wrong name for what they show, so they are matched by their pictures. Auxiliary Boiler and Supply
# Hatch have no card yet; the misspelt second Overpressure Valve is the Clockwork Heart's picture.
CARD_ORDER = [
    'harpoon', 'grapnel', 'cannon', 'mortar', 'flamethrower', 'gatling', 'sniper', 'rockets', 'flak', 'tesla',
    'plating', 'bulwark', 'deflector', 'repair', 'quarters', 'boiler', 'sprinkler', 'scrubber', 'heart', 'overpressure',
    'telescope', 'gasbag', 'propeller', 'lightningrod', 'cargo', 'autoloader', 'gyro',
]
CORE_ORDER = ['airship', 'battleship', 'zeppelin', 'clockwork', 'privateer', 'tempest']
# Map icons: ring centres on the sheet.
ICON_CENTRES = {
    'patrol': (172, 178), 'lair': (478, 178), 'storm': (768, 178), 'smog': (1060, 178), 'trader': (1366, 178),
    'beacon': (172, 492), 'guild': (478, 492), 'hangar': (768, 492), 'derelict': (1063, 492), 'rift': (1366, 492),
    'boss': (446, 808), 'unknown': (768, 808), 'cloud': (1090, 808),
}
ICON_R = 104  # the brass ring's outer radius (the compass spikes beyond it are dropped)


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


if __name__ == '__main__':
    main()
