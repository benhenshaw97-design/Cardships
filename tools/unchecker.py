"""Turns a ship sheet painted on a fake-transparency checkerboard into a green-keyed sheet that
tools/build_sprites.py can cut.

The checker is two near-white greys. Background is every patch of near-neutral, bright pixels that
touches the sheet's edge, plus any enclosed patch big enough to be a gap in the rigging that still
shows the checker's two-tone pattern. Ships keep their dark ink outline, which stops the fill.

    python3 tools/unchecker.py <in.png> <out.png>
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def unchecker(src, dst):
    a = np.array(Image.open(src).convert('RGB')).astype(int)
    lo, hi = a.min(axis=2), a.max(axis=2)
    cand = (hi - lo <= 10) & (lo >= 196)
    lab, n = ndimage.label(cand)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # Enclosed gaps: big enough, and two-toned like the checker (not a flat white highlight).
    lum = a.mean(axis=2)
    for i, sl in enumerate(ndimage.find_objects(lab)):
        k = i + 1
        if k in edge or sl is None:
            continue
        m = lab[sl] == k
        if m.sum() < 220:
            continue
        v = lum[sl][m]
        if v.std() > 6:
            bg[sl] |= m
    # Grow the background one pixel into the pale fringe left by the checker's anti-aliasing.
    fringe = ndimage.binary_dilation(bg, iterations=1) & (lo >= 170) & (hi - lo <= 18)
    bg |= fringe
    out = a.copy()
    out[bg] = (0, 255, 0)
    Image.fromarray(out.astype(np.uint8)).save(dst)
    print(dst, f'{bg.mean() * 100:.1f}% background')


if __name__ == '__main__':
    unchecker(sys.argv[1], sys.argv[2])
