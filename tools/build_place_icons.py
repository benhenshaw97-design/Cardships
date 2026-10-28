"""Cut the six Area 2/3 place medallions (shrine, spire, starchart, bloodaltar,
crypt, moonwell) from the painted icon sheet into 96px map icons.

The sheet labels each medallion with a plate over the ring's bottom, so the
lower ring and point are mirrored from the top, and the bit of painting the
plate covered is filled with a dimmed reflection of the rows above it.

    python3 tools/build_place_icons.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/art/source/uploads/place-icons.png')
OUT = os.path.join(ROOT, 'assets/art/icons')
NAMES = [['shrine', 'spire', 'starchart'], ['bloodaltar', 'crypt', 'moonwell']]
CENTRES_X = [254, 766, 1278]
CENTRES_Y = [231, 726]
HALF = 238      # crop half-size: just past the compass points
RING = 209      # outer radius of the brass ring
PLATE = 150     # the label plate starts this far below the centre
SIZE = 96


def main():
    sheet = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int32)
    bg = sheet[5, 5]
    sheet = np.pad(sheet, ((HALF, HALF), (0, 0), (0, 0)), mode='edge')
    for r, cy in enumerate(CENTRES_Y):
        for c, cx in enumerate(CENTRES_X):
            cy2 = cy + HALF
            crop = sheet[cy2 - HALF:cy2 + HALF, cx - HALF:cx + HALF].copy()
            n = crop.shape[0]
            yy, xx = np.mgrid[0:n, 0:n] - HALF + 0.5
            dist = np.hypot(xx, yy)
            # Fill the painting under the plate with a reflection of the rows above.
            inner = dist <= RING - 16
            cut = HALF + PLATE
            for y in range(cut, n):
                row = inner[y]
                crop[y, row] = (crop[2 * cut - 1 - y, row] * 0.8).astype(np.int32)
            alpha = np.clip((np.abs(crop - bg).sum(2) - 30) * 6, 0, 255).astype(np.float32)
            alpha[dist <= RING - 3] = 255
            rgba = np.dstack([crop, alpha]).astype(np.uint8)
            # The lower ring and compass point: the upper ones, mirrored.
            flip = rgba[::-1]
            lower = (yy > PLATE - 10) & ~inner
            rgba[lower] = flip[lower]
            img = Image.fromarray(rgba, 'RGBA').resize((SIZE, SIZE), Image.LANCZOS)
            img.save(os.path.join(OUT, NAMES[r][c] + '.png'), optimize=True)
            print('wrote', NAMES[r][c])


if __name__ == '__main__':
    main()
