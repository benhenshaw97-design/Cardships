"""Cuts the uploaded card sheets into the game's card and Core art.

The game draws its own frame, type tag and name, so each card's painted header and name plate
are trimmed and the picture inside is cropped to the card-art shape (126 x 196). Core cards are
cropped to their ship (420 x 346, shown with object-fit: cover).

    python3 tools/build_card_art.py
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UP = os.path.join(ROOT, 'assets/art/source/uploads')
CARD = (126, 196)
CORE = (420, 346)

# Sheet -> (row tops, card height, column lefts, card width, ids row by row).
SHEETS = {
    'cards-legendary.png': ((3, 501), 483, (9, 315, 621, 927, 1232), 298,
                            ['leviplating', 'dreadnought', 'galeengine', 'stormheart', 'mainspring',
                             'titanfist', 'auroracrown', 'archonlance', 'chalice', 'eclipseblade']),
    'cards-area2-area3.png': ((14, 501), 462, (10, 314, 621, 929, 1237), 291,
                              ['runecannon', 'crystalward', 'starsail', 'manalens', 'prism',
                               'bloodharpoon', 'thornhull', 'sanguine', 'crimsonaltar', 'moonmortar']),
}


def card_art(card, out):
    """The picture between a card's header ribbon and its name plate, cropped to the card shape."""
    w, h = card.size
    inner = card.crop((round(w * 0.05), round(h * 0.13), round(w * 0.95), round(h * 0.80)))
    iw, ih = inner.size
    tw = round(ih * CARD[0] / CARD[1])
    if tw <= iw:
        x0 = (iw - tw) // 2
        inner = inner.crop((x0, 0, x0 + tw, ih))
    inner.convert('RGB').resize(CARD, Image.LANCZOS).save(out, quality=90)


def main():
    for name, (tops, ch, lefts, cw, ids) in SHEETS.items():
        sheet = Image.open(os.path.join(UP, name)).convert('RGB')
        for i, pid in enumerate(ids):
            x, y = lefts[i % 5], tops[i // 5]
            card_art(sheet.crop((x, y, x + cw, y + ch)), os.path.join(ROOT, f'assets/art/cards/{pid}.jpg'))
    # Gas Grenadiers: one wide card with a title bar; keep the picture inside its frame.
    g = Image.open(os.path.join(UP, 'card-grenadiers.png')).convert('RGB').crop((229, 15, 1305, 1007))
    w, h = g.size
    pic = g.crop((round(w * 0.05), round(h * 0.17), round(w * 0.95), round(h * 0.95)))
    pw, ph = pic.size
    tw = round(ph * CARD[0] / CARD[1])
    x0 = (pw - tw) // 2
    pic.crop((x0, 0, x0 + tw, ph)).resize(CARD, Image.LANCZOS).save(os.path.join(ROOT, 'assets/art/cards/grenadiers.jpg'), quality=90)
    # Workshop Cores: three cards in a row, cropped to the ship.
    cores = Image.open(os.path.join(UP, 'cards-workshop-cores.png')).convert('RGB')
    for i, cid in enumerate(['arcanist', 'sanguinist', 'eclipse']):
        x0 = (10, 515, 1034)[i]  # measured card edges
        card = cores.crop((x0, 89, x0 + 496, 924))
        card.crop((16, 120, 480, 502)).resize(CORE, Image.LANCZOS).save(os.path.join(ROOT, f'assets/art/cores/{cid}.jpg'), quality=88)
    print('cards and cores written')


if __name__ == '__main__':
    main()
