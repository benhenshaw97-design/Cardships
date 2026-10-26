# Next steps: the three-area expansion

The current brief, so a fresh session can pick up mid-way. Build in this order and commit after each step:

1. Run structure and portals: **done**
2. Legendaries
3. Area 2: The Aurora Reaches
4. Area 3: The Blood Moon
5. The Workshop (meta-progression)
6. Balance pass

Update this file after each step: mark the step done and note anything left for later steps.

## The brief, in short

- **A run** is Area 1, its boss, Area 2, its boss, Area 3, then the final boss. Each area is about 10 nodes. Area 1 stays as it was (11 columns plus a boss picked from Leviathan, Storm Queen or Colossus).
- **Portals.** Killing a boss opens a portal. Crossing it plays a vortex transition with a screen warp, then the new area's parallax and music fade in. The ship keeps every module and the Core is fully repaired.
- **Legendaries.** Every boss drops a choice of 1 of 2 legendaries from its own pool, each with a unique card frame and a glowing installed visual. The first kill of each boss unlocks its pool in the Workshop, after which those legendaries can appear as very rare loot.
  - Leviathan pool, as specified: Leviathan Plating (reflects half of all blocked damage back at the attacker) and Dreadnought Cannon (5 damage, pierces 2 layers, 2-turn cooldown).
  - The Storm Queen, Colossus, Archon and Sovereign pools are ours to design, 2 each, themed on the boss and area.
- **Area 2, the Aurora Reaches.**
  - Resonance mechanic: magical modules build it when used or hit, and it flows into adjacent modules. A fully resonant module casts a bonus spell.
  - The aurora colour empowers weapons, armor or utility each turn, and shows in the sky.
  - Parts: Rune Cannon, Crystal Ward, Star Sail, Mana Lens, Prism Array.
  - Enemies: Glimmer Wisp, Arcane Corvette (Hex tokens invert a module for a turn), Crystal Barge, Mirage Galleon.
  - Points of interest: Aurora Shrine, Enchanter's Spire, Star Chart.
  - Boss: the Aurora Archon, in 3 phases (runes on telegraphed layers; rotating aurora that copies your empowered type; a 2-turn grand spell broken by focus crystals or blocked).
- **Area 3, the Blood Moon.**
  - Moon gauge: it fills each combat turn and makes enemies stronger, then frenzied at full moon.
  - Blood costs: some parts are paid for with durability, and heal by dealing damage.
  - Bleed token: it stacks, deals its stacks each turn, then loses 1.
  - Parts: Blood Harpoon, Thorned Hull, Sanguine Engine, Crimson Altar, Moon Mortar.
  - Enemies: Bat Swarm, Wraith Clipper (phased on odd turns), Bone Galleon (rises once), Blood Cultist Barge (heals from your Bleed).
  - Points of interest: Blood Altar, Crypt Wreck, Moon Well.
  - Final boss: the Crimson Sovereign, in 3 phases (Bleed barrages and Bat Swarms; the moon locked full with a durability drain; an eclipse and a telegraphed blood beam).
- **Per area:** a parallax set, a map chart style, a UI accent, an enemy visual language, status visuals, and music for map, combat and boss. Each area's loot is weighted toward its own parts.
- **The Workshop.**
  - A hangar hub showing your last ship.
  - Blueprints come from every run, more for areas cleared, bosses killed and quests done.
  - Spend Blueprints on: 3 new Cores (Resonance / Blood), part unlocks (new players start with a smaller pool), starting upgrades (an extra part, +1 Steam, one reroll per area), and Logbook lore.
  - Also: a Legendary Vault, achievements that unlock cosmetics (hull paint, balloon colour, Core skins), and Storm Tiers after the first full clear, with the best tier shown per Core.
  - Meta is saved separately from run saves.
- **Balance targets** at the base tier, all Cores: Area 1 clear about 60%, Area 2 clear about 35%, full win 15–25%. Update BALANCE_REPORT.md.

## How it is built (read before changing)

- `js/data.js` `AREAS`: one entry per area. Fields:
  - `cols`: map columns, including the boss column.
  - `midCol`: column with the guaranteed trader.
  - `lairFrom`: first column an elite lair can appear.
  - `bosses`, `tiers`, `elites`, `beacon`, `nodeWeights`, `bands`: what appears where.
  - `hp`, `dmg`, `bossHp`, `veteranColumns`: enemy scaling.
  - `bossBiome`, `blurb`.
  - Areas 2 and 3 currently reuse Area 1's enemies, scaled up, as placeholders. Steps 3 and 4 replace their `bosses`, `tiers`, `elites`, `beacon`, `nodeWeights` and `bands`.
- `js/engine.js`:
  - `game.area` is the area index, and `game.bossIds` holds one boss per area, rolled at the start (`rollBosses`). `game.bossId` is the current area's boss.
  - `areaDef()` returns the area's data. `progress()` is the total columns cleared.
  - `generateMap()` and `paceFights()` read the area.
  - A boss kill (`winCombat`) gives `BALANCE.bossCogs` and opens 'Boss spoils' loot, then sets `portalReady`. `enterMap()` then goes to phase `'portal'`, and `crossPortal()` moves into the next area: new map, full Core repair.
  - Only the last area's boss sets `won`.
  - New stats: `areasCleared`, `bossesFought`, `bossesKilled`.
- `js/ui.js`: `portalScreen()` and `enterPortal()`. The run save key is `cardships.run.v5`.
- `js/fx.js`: `FX.portal({to, onMid, onDone})` plays the transit. `drawPortal()` is called from `Actors.draw` and `drawWarp()` from `drawOverlay`. Portal colours by destination are in `PORTAL_INK`.
- `js/actors.js`: `Actors.portal = {k, at}` pulls the player's ship into the vortex.
- `js/bot.js` handles phase `'portal'`.
- `tools/simulate.js` plays full three-area runs and reports Area 1 clear, Area 2 clear and full win per Core. Useful flags:
  - `BRIEF=1` for a one-line summary.
  - `CORES=a,b` to simulate only some Cores.
  - `--tier N` once Storm Tiers exist.

## Interpretations we chose (keep consistent)

- **"Layers" on the enemy.** The enemy is one Durability pool, so its defences count as its layers, outermost first:
  1. Wards: magic screens such as illusions, focus crystals and bat screens. Each stops one whole hit.
  2. Block.
  3. Armor: a flat cut per hit, like the Leviathan's Ironclad Hull or the Crystal Barge's crystals.

  "Pierces N layers" skips the first N layers present. Existing "pierce" (Tesla, Steady Aim, Bombard, Burn) skips Block and Armor but not Wards. Prism Array splits an attack across all layers: it breaks every Ward, strips Block and ignores Armor.
- **"Layers" on your ship** are your decks and columns, the existing targeting zones. A rune or blood beam on a telegraphed layer is a telegraphed deck or column.

## Status

- Step 1 is done: run structure, portals, the simulator, and tests (40 passing).
- Placeholder content means three-area runs currently win about 1% of the time. Steps 3 and 4 replace the placeholders and step 6 tunes.
