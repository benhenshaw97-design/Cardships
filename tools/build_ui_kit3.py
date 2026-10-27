"""Cuts pieces from the third uploaded UI kit (painted on a fake checkerboard) for the game.

    python3 tools/build_ui_kit3.py

Writes the honour badges (assets/art/bits/honour-<id>.png) and the Bleed drop (assets/art/ui/tok-bleed.png).
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from unchecker import unchecker  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, 'assets/art/source/uploads/ui-kit-3.png')
TMP = os.path.join(ROOT, 'assets/art/source/uploads/.ui-kit-3-keyed.png')

# Achievement id -> the icon's box on the kit.
HONOURS = {
    'firstflight': (1339, 274, 1405, 340),  # framed anchor
    'giantslayer': (1474, 741, 1515, 789),  # skull
    'lights': (1356, 573, 1397, 619),       # blue gem
    'sovereign': (1267, 274, 1334, 340),    # framed star
    'veteran': (1278, 739, 1339, 802),      # ship's wheel
    'collector': (1174, 685, 1225, 728),    # treasure chest
    'admiral': (1050, 274, 1117, 340),      # framed shells
    'stormeye': (868, 796, 912, 849),       # tornado
    'starlit': (1419, 744, 1461, 785),      # gold star
}
DROP = (1418, 810, 1441, 842)


def keyed_rgba():
    unchecker(KIT, TMP)
    a = np.array(Image.open(TMP).convert('RGB'))
    os.remove(TMP)
    bg = (a[..., 0] == 0) & (a[..., 1] == 255) & (a[..., 2] == 0)
    return Image.fromarray(np.dstack([a, np.where(bg, 0, 255).astype(np.uint8)]), 'RGBA')


def fit(im, size):
    """Centres a piece in a square, scaled to fit with crisp (nearest) pixels."""
    k = size / max(im.width, im.height)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.NEAREST)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    return out


def main():
    kit = keyed_rgba()
    for hid, box in HONOURS.items():
        fit(kit.crop(box), 64).save(os.path.join(ROOT, f'assets/art/bits/honour-{hid}.png'), optimize=True)
    # The blue water drop, turned blood red for Bleed.
    drop = np.array(fit(kit.crop(DROP), 32)).astype(float)
    lum = drop[..., :3].mean(axis=2, keepdims=True) / 255
    red = np.concatenate([np.clip(lum * 330 + 30, 0, 255), lum * 40, lum * 50], axis=2)
    drop[..., :3] = red
    Image.fromarray(drop.astype(np.uint8), 'RGBA').save(os.path.join(ROOT, 'assets/art/ui/tok-bleed.png'), optimize=True)
    print('honours', len(HONOURS), 'and the Bleed drop')


if __name__ == '__main__':
    main()
