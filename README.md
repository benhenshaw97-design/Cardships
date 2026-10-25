# Cardships

A steampunk skyship roguelike played with cards. Build a two-deck airship out from a Core, read each enemy's telegraphed move, and fly a branching cloud route to one of three bosses. Strictly 2D: a side-on pixel-art ship, shown as a cutaway that assembles as you build it, over parallax skies.

## Play

Serve the folder and open it in a browser, for example:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` straight from disk also works, but browsers block WebAudio filters on local files, so the music loses its muffling and boss-phase filtering.

**Controls:** tap modules on the ship to see their card and act (fire, aimed shot, swap with a neighbour, vent tokens, use). Hover or tap a module to see its synergy links. When installing a part, hover a brass bolt (or tap once) to preview it, then click (or tap again) to bolt it on. Tap the flight view during an animation to skip. **Card view** shows the classic card grid. **Settings** has screen shake, flashing, dice speed, music and sound volume, and mute.

## How it plays

- **d6 everything.** Enemy tactics, targeting (deck and depth d6s for direct fire, a column d6 for bombs), hazards, events, contracts and Sky Dock mechanics.
- **Telegraphed enemies.** The next move and its exact target are shown before you act. Answer it by swapping modules, Evading, bracing, cleansing, or killing it first.
- **Steam pays for actions; Durability is only health.** Steam refills every turn.
- **A two-deck grid.** The **hull** row runs through the Core: up to 3 modules in the **bow** (facing the enemy) and 3 in the **stern**, packed against the Core. The **upper deck** sits on top: any hull module, or the Core itself (the **bridge**), can carry one more. 8 modules in all.
  - Straight guns fire from the **front of a deck** (the prow, or the foremost upper module); Mortars and Tesla Coils need **open sky** above them.
  - **Direct fire** comes in along a deck from the bow and meets the front module first; armor at the front catches it. **Bombs and lightning** drop onto a column and hit whatever is on top, so upper modules shelter the ones below.
  - A bare bow, or a bare side with no bridge, exposes the Core. Buried armor soaks hits for its neighbours, and many parts power up the modules they touch (a Harpoon feeds the weapon bolted on top of it).
- **Weight matters.** Light ships outpace enemies and dodge cheaply; heavy ships shrug off rams and crosswinds.
- **Four Cores** (Airship, Battleship, Zeppelin, and the unlockable Clockwork), **26 parts** in three rarities, **7 pirate ships**, and **3 bosses** with their own gimmicks (Iron Leviathan, Storm Queen, Clockwork Colossus).
- **Runs** cross a 12-column sky map with sight, cloud cover, cogs, a Trading Zeppelin shop, contracts and Sky Docks. Lifetime milestones unlock new Cores and rare parts. Every run has a shareable seed and autosaves.

See `DESIGN_CHANGES.md` for every rule change and why, and `BALANCE_REPORT.md` for the tuning data.

## Develop

```
npm test                          # rules tests + 400 bot-played runs checking invariants
node tools/simulate.js 1000       # balance simulation: 1,000 runs per Core
TUNE='{"BALANCE":{"bossHp":1.5}}' BRIEF=1 node tools/simulate.js 500   # try a change
```

| File | What it holds |
| --- | --- |
| `js/data.js` | Cores, parts, enemies, encounters, contracts, unlocks and the `BALANCE` knobs |
| `js/engine.js` | The rules: map, combat, events, loot, shop, contracts, saves. No DOM; one seeded RNG |
| `js/bot.js` | Greedy bot used by the tests and the simulator |
| `js/ui.js` | Panels, input, settings, autosave |
| `js/skymap.js` | The scrolling, parallax sky map |
| `js/scene.js` | Parallax flight scene and biomes |
| `js/sprites.js` | Sprite atlas frames and drawing helpers |
| `js/shipart.js` | Pixel-art ships: the cutaway hull, envelopes, module sprites and enemies |
| `js/actors.js` | Places the ships, intent plate, arrows, synergy links, taps |
| `js/fx.js` | Event playback, particles, dice, effect settings |
| `js/audio.js` | Music cues, crossfades, boss intensity, synthesised sound effects |
| `js/meta.js` | Lifetime records and unlocks |

## Assets

| File | Used for |
| --- | --- |
| `assets/art/cloud-sea-sunset.jpg` | Title screen and the far layer of the red dusk biome |
| `assets/art/sunset-sky-city.jpg` | Far layer of the golden sunset biome |
| `assets/art/night-fleet.jpg` | Far layer of the night biome, the last leg before the boss |
| `assets/art/canyon-foundry.jpg` | Far layer of the industrial smog biome |
| `assets/art/sky-deck.jpg` | Sky Dock backdrop |
| `assets/art/engine-room.jpg` | Trading Zeppelin backdrop (the merchant's engine room) |
| `assets/art/ship-parts.png` | Sprite atlas cut from `assets/art/source/ship-parts-sheet.png` (rebuild with `python3 tools/build_sprites.py`): the four full enemy ships, flags, map marker, clouds, smoke trail |
| `assets/art/fx.png` | Effects atlas cut from `assets/art/source/fx-sheet.png`: explosions, blasts, smoke clouds, muzzle flashes, rockets, bullets, fireballs, lightning, splashes |
| `assets/art/parts.png` | Steampunk parts atlas cut from `assets/art/source/parts-sheet.png`: guns, gatlings, rocket racks, boilers, engines, gears, armour plates, chests, spyglass, compass, propellers: every module on your ship and on assembled pirate ships, and the part portraits on offers |
| `assets/music/pirate-battle-1` | Title, sky map, docks, victory, defeat |
| `assets/music/pirate-battle-2` | Standard combat |
| `assets/music/pirate-battle-3` | Boss (stepping up per phase) and hazards |

All ship art is drawn at a low "art pixel" resolution and scaled up unsmoothed. Every sprite is hardened and given a one-pixel ink outline, so the pieces from different sheets, the drawn hulls and envelopes, and the effects (painted on a matching low-resolution layer) share one pixel grid.

Each track ships as the original Opus file (`.opus.m4a`) and an AAC copy (`.aac.mp4`) for Safari and wider support. To use real sound effects, add them to `SFX_FILES` in `js/audio.js`; each replaces the synthesised sound of the same name.
