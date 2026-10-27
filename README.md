# Cardships

A steampunk skyship roguelike played with cards. Build a two-deck airship out from a Core, read each enemy's telegraphed move, and fly three skies to the final boss: the Open Skies, the Aurora Reaches and the Blood Moon. Between runs, spend Blueprints in the Workshop. Strictly 2D: pixel-art ships over painted parallax skies.

## Play

Serve the folder and open it in a browser, for example:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` straight from disk also works, but browsers block WebAudio filters on local files, so the music loses its muffling and boss-phase filtering.

The game opens on the **main menu**:

- **Continue** resumes the autosaved run.
- **New run** picks a Core and a ship.
- **Workshop** spends Blueprints.
- **How to play** replays the guided first flight.
- **Settings** has screen shake, flashing, dice speed, volumes and the screen layout.

**During a run** the page never scrolls. The flight view fills the window, and each step's panel (part picks, the sky route, events, the Sky Dock, the Trading Zeppelin) floats over it in a window you can fold away with **Hide**. The top bar has **Map**, **Ship** (the full Shipyard grid) and **Log**. Setting a course flies the leg on the chart, then the ship sails through the sky for a moment before the place opens.

**In battle** the flight view is the board:

- Every module on your ship has a round button: tap it for what it can do this turn (fire, aimed shot, use, swap, vent). Usable modules glow gold, and modules the enemy will hit have a red ring.
- Tap your hull for the Core's ability and Evade, or tap the enemy for its move, statuses and tactics table.
- The bar along the bottom holds your Core's Durability, Steam, the area's aurora or Blood Moon gauge, the Core ability, **Ship** and **End turn**.

## How it plays

- **Three areas.** Each has about ten map columns and ends in a boss. Sinking a boss opens a portal: the ship flies through with every module intact, the Core is fully repaired, and the next sky begins.
  - **The Open Skies:** pirates, storms and smog. Its boss is the Iron Leviathan, the Storm Queen or the Clockwork Colossus.
  - **The Aurora Reaches:** Resonance builds in magical modules and flows to their neighbours until they cast a spell. The aurora empowers weapons, armor or utility each turn. Its boss is the Aurora Archon.
  - **The Blood Moon:** a moon gauge makes enemies stronger, then frenzied. Bleed stacks, and Blood parts are paid in Durability. Its final boss is the Crimson Sovereign.
- **Legendaries.** Every boss offers 1 of 2 legendaries themed on it. Its first defeat unlocks them as very rare loot in later runs.
- **d6 everything.** Enemy tactics, targeting, hazards, events, contracts and Sky Dock mechanics all roll a d6.
- **Telegraphed enemies.** The next move and its exact target show before you act. Answer it by swapping modules, Evading, bracing, cleansing, or killing the enemy first.
- **Steam pays for actions; Durability is only health.** Steam refills every turn.
- **A two-deck grid.** The hull runs through the Core: up to 3 modules in the bow (facing the enemy) and 3 in the stern. Any hull module, or the Core itself (the bridge), can carry one more on the upper deck: 8 modules in all.
  - Straight guns fire from the front of a deck; arcing weapons need open sky.
  - Direct fire meets the front module first. Bombs and lightning drop onto a column.
- **The Workshop.** Blueprints come from every run, more for areas cleared, bosses sunk and contracts. Spend them on:
  - Three more Cores: Arcanist, Sanguine and Eclipse.
  - Drafting locked parts into your loot pool.
  - Starting upgrades.
  - Logbook lore.

  It also holds the Legendary Vault, honours that unlock hull paint, balloon colours and Core skins, and Storm Tiers (harder runs) after a first full clear.
- **Content.**
  - 9 Cores, each with 3 or 4 ships (every ship has a trait).
  - 39 parts plus 10 legendaries.
  - 15 enemy ships (with grander Elite versions guarding lairs) and 5 bosses.
  - Every run has a shareable seed and autosaves.

See `DESIGN_CHANGES.md` for every rule change and why, `BALANCE_REPORT.md` for the tuning data, and `NEXT_STEPS.md` for where everything lives in the code.

## Develop

```
npm test                          # rules tests + bot-played runs checking invariants
node tools/simulate.js 300        # balance: 300 full three-area runs per Core
BRIEF=1 node tools/simulate.js 200 --tier 3   # one line per Core, at Storm Tier 3
TUNE='{"AREAS":{"2":{"hp":0.9}}}' BRIEF=1 node tools/simulate.js 200   # try a change
```

| File | What it holds |
| --- | --- |
| `js/data.js` | Cores, ships, parts, enemies, areas, encounters, contracts, Workshop data and the `BALANCE` knobs |
| `js/engine.js` | The rules: areas and portals, map, combat, events, loot, shop, saves. No DOM; one seeded RNG |
| `js/meta.js` | The Workshop: Blueprints, unlocks, upgrades, Logbook, honours, Storm Tiers (saved apart from runs) |
| `js/bot.js` | Greedy bot used by the tests and the simulator |
| `js/ui.js` | Main menu, Workshop, tutorial, panels, input, settings, autosave |
| `js/skymap.js` | The scrolling sky map |
| `js/scene.js` | Parallax flight scene: painted skies, weather, aurora, blood mist, bats |
| `js/shipart.js` | Pixel-art ships, enemy looks, wards, livery |
| `js/actors.js` | Places the ships, intent plate and arrows; the portal pull |
| `js/fx.js` | Event playback, particles, effect strips, dice, portals |
| `js/audio.js` | Music cues per area, crossfades, boss phases, synthesised sound effects |
| `js/artgen.js` | Code-drawn fallbacks: place icons and banners, and card art for any part without a picture |
| `js/sprites.js`, `js/fxstrips.js` | Generated atlas frames and effect-strip sizes |

## Assets and tools

Your original uploads are kept in `assets/art/source/` (the later ones in `assets/art/source/uploads/` under descriptive names). The game uses pieces cut from them by these scripts:

| Tool | What it makes |
| --- | --- |
| `tools/build_sprites.py` | `assets/art/ships.png` and the other atlases + `js/sprites.js`: every ship, cut from the keyed sheets in `assets/art/source/ships-keyed/` |
| `tools/unchecker.py` | Turns a sheet painted on a fake checkerboard into a green-keyed sheet the cutter can read |
| `tools/build_ui_art.py` | UI pieces, map icons, banners and map charts from the UI kits |
| `tools/build_ui_kit3.py` | Honour badges and the Bleed icon from the third UI kit |
| `tools/build_card_art.py` | Card art and Workshop Core art from the painted card sheets |
| `tools/build_fx_strips.py` | Explosion, magic and shield frame strips (`assets/art/fx/`) + `js/fxstrips.js` |

Each music track ships as the original Opus file (`.opus.m4a`) and an AAC copy (`.aac.mp4`) for Safari. To use real sound effects, add them to `SFX_FILES` in `js/audio.js`; each replaces the synthesised sound of the same name.
