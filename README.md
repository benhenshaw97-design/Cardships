# Cardships

A steampunk skyship roguelike played with cards. Bolt modules onto the left (stern) and right (bow) of a Core, read each enemy's telegraphed move, and fly a branching cloud route to one of three bosses. Strictly 2D: a side-on, flat illustrated ship that assembles as you build it, over parallax skies.

## Play

Serve the folder and open it in a browser, for example:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` straight from disk also works, but browsers block WebAudio filters on local files, so the music loses its muffling and boss-phase filtering.

**Controls:** tap modules on the ship to see their card and act (fire, aimed shot, swap with a neighbour, vent tokens, use). Hover or tap a module to see its synergy links. When installing a part, hover a brass bolt (or tap once) to preview it, then click (or tap again) to bolt it on. Tap the flight view during an animation to skip. **Card view** shows the classic card grid. **Settings** has screen shake, flashing, dice speed, music and sound volume, and mute.

## How it plays

- **d6 everything.** Enemy tactics, targeting (side d6, layer d6), hazards, events, contracts and Sky Dock mechanics.
- **Telegraphed enemies.** The next move and its exact target are shown before you act. Answer it by swapping modules, Evading, bracing, cleansing, or killing it first.
- **Steam pays for actions; Durability is only health.** Steam refills every turn.
- **Position matters.** Only outside weapons fire (Mortars and Tesla Coils arc over), outside armor takes every hit on its side, buried armor soaks hits for neighbours, and many parts power up the modules they touch.
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
| `js/shipart.js` | Side-on ship, module and enemy art |
| `js/actors.js` | Places the ships, intent plate, arrows, synergy links, taps |
| `js/fx.js` | Event playback, particles, dice, effect settings |
| `js/audio.js` | Music cues, crossfades, boss intensity, synthesised sound effects |
| `js/meta.js` | Lifetime records and unlocks |

## Assets

| File | Used for |
| --- | --- |
| `assets/art/sunset-sky-city.jpg` | Title screen and the far layer of the sunset biome |
| `assets/art/canyon-foundry.jpg` | Far layer of the industrial smog biome |
| `assets/art/sky-deck.jpg` | Sky Dock backdrop |
| `assets/art/engine-room.jpg` | Trading Zeppelin backdrop (the merchant's engine room) |
| `assets/music/pirate-battle-1` | Title, sky map, docks, victory, defeat |
| `assets/music/pirate-battle-2` | Standard combat |
| `assets/music/pirate-battle-3` | Boss (stepping up per phase) and hazards |

Each track ships as the original Opus file and an AAC copy for Safari. To use real sound effects, add them to `SFX_FILES` in `js/audio.js`; each replaces the synthesised sound of the same name.
