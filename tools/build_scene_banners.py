"""Crop the painted Area 2/3 scenes into the 6:1 banners at the top of event
and boss panels (assets/art/scenes/), and the Area 2/3 map charts (assets/art/ui/).

Place banners are named after the encounter (shrine.jpg). Later-area versions
of shared places carry the area: beacon-a2.jpg is the Distress Beacon in the
Aurora Reaches. js/ui.js PAINTED_BANNERS lists what exists.

    python3 tools/build_scene_banners.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/art/source/uploads')
OUT = os.path.join(ROOT, 'assets/art/scenes')
W, H = 960, 160
# banner: (source painting, vertical centre of the crop as a fraction of its height)
BANNERS = {
    'shrine': ('scene-aurora-shrine.png', 0.47),
    'spire': ('scene-aurora-spire.png', 0.42),
    'starchart': ('scene-aurora-starchart.png', 0.45),
    'rift-a2': ('scene-aurora-rift.png', 0.42),
    'beacon-a2': ('scene-aurora-wrecks.png', 0.45),
    'lair-a2': ('scene-aurora-cavern.png', 0.48),
    'boss-a2': ('scene-aurora-battlefield.png', 0.45),
    'moonwell': ('scene-moonwell.png', 0.52),
    'bloodaltar': ('scene-blood-altar.png', 0.42),
    'crypt': ('scene-blood-crypt.png', 0.40),
    'beacon-a3': ('scene-blood-ruins.png', 0.45),
    'lair-a3': ('scene-blood-horns.png', 0.45),
    'boss-a3': ('scene-blood-cathedral.png', 0.45),
    'trader-a2': ('sky-aurora-trader.png', 0.45),
    'hangar-a2': ('sky-aurora-dock.png', 0.5),
    'guild-a2': ('sky-aurora-port.png', 0.42),
    'trader-a3': ('sky-blood-trader.png', 0.42),
    'hangar-a3': ('sky-blood-dock.png', 0.5),
    'guild-a3': ('sky-blood-port.png', 0.45),
}
# Map charts behind the Area 2/3 sky route: (source, vertical centre).
MAPS = {
    'map-sky-aurora': ('sky-aurora-night.png', 0.5),
    'map-sky-blood': ('sky-blood-calm.png', 0.5),
}
MAP_W, MAP_H = 1600, 430


def main():
    for name, (src, fy) in BANNERS.items():
        im = Image.open(os.path.join(SRC, src)).convert('RGB')
        w, h = im.size
        ch = round(w * H / W)
        top = min(max(0, round(h * fy - ch / 2)), h - ch)
        im.crop((0, top, w, top + ch)).resize((W, H), Image.LANCZOS).save(
            os.path.join(OUT, name + '.jpg'), quality=80, optimize=True, progressive=True)
        print('wrote', name)
    for name, (src, fy) in MAPS.items():
        im = Image.open(os.path.join(SRC, src)).convert('RGB')
        w, h = im.size
        ch = round(w * MAP_H / MAP_W)
        top = min(max(0, round(h * fy - ch / 2)), h - ch)
        im.crop((0, top, w, top + ch)).resize((MAP_W, MAP_H), Image.LANCZOS).save(
            os.path.join(ROOT, 'assets/art/ui', name + '.jpg'), quality=80, optimize=True, progressive=True)
        print('wrote', name)


if __name__ == '__main__':
    main()
