# Next steps: the three-area expansion

The current brief, so a fresh session can pick up mid-way. Build in this order and commit after each step:

1. Run structure and portals: **done**
2. Legendaries: **done** (Area 1 pools; the Archon's and Sovereign's come in steps 3 and 4)
3. Area 2: The Aurora Reaches: **done**
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
  - Optional: `names` (encounter renames per area), `aurora: true` (aurora in every fight), `accent`.
  - Area 3 still reuses Area 1's enemies, scaled up, as a placeholder. Step 4 replaces its `bosses`, `tiers`, `elites`, `beacon`, `nodeWeights` and `bands`.
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

## Legendaries (step 2)

- **Data.**
  - The legendaries are in `PARTS` with `rarity: 'legendary'` and `boss`.
  - `LEGENDARY_POOLS[bossId]` lists each boss's two.
  - `RARITY_ODDS` gives them 0.6% (normal) and 3% (elite) once unlocked.
- **Engine.**
  - `game.legendaries` holds the ids unlocked by meta. `available()` allows a legendary only if it is unlocked. Boss drops ignore that.
  - The boss drop is queued first in `winCombat`, as an offer with `legendary: true`.
  - Effects:
    - `leviplating`: in `ARMOR`, plus `reflect()` after `applyPlan`, counting each plan entry's `prevented`.
    - `dreadnought`: `pierceLayers: 2` and `cooldown: 2` (reload is set to cooldown + 1).
    - `galeengine`: `swapCost` gives 3 free swaps per turn, tracked in `combat.galeSwaps`, and each swap does 1 piercing damage.
    - `stormheart`: deals its damage after the enemy acts in `enemyTurn`.
    - `mainspring`: `combat.spring` winds in `beginPlayerTurn` and is added to `fireInfo().bonus`.
    - `titanfist`: `fistDamage()`, and `ramResist` +2.
- **Enemy layers.** `damageEnemy` handles `ward`, `block` and `armor` (in that order) with the `pierce`, `pierceLayers` and `prism` options. The Leviathan's Ironclad Hull is now `armor: 1`.
- **Meta.** `meta.legendaries`: `recordRun` unlocks a boss's pool on its first kill, and `newRun` passes them to the Game.
- **Visuals.**
  - `js/artgen.js` (`CardshipsArtGen.cardArt(id)`) paints card art in code for parts in its `PAINT` table, which also covers the missing Grenadiers art. Add a painter there for every new part. `cardSrc(id)` in ui.js picks the generated art over the jpg.
  - The legendary frame is `.card.legendary` / `.enc.part.legendary` in style.css.
  - The flight-view glow is `legendGlow()` in shipart.js.
  - Effect handlers: `reflect`, `stormheart`, `galeShift`, `wardPop`, `enemyLayers`.
- **Still to add.** Sovereign pool (step 4): Sovereign's Chalice (heal the Core when the enemy takes damage, max 3 a turn) and Eclipse Blade (Blood 2: 6 piercing, +1 per Bleed stack on your ship). The Legendary Vault comes in step 5.

## Area 2 (step 3): where things are

- **Data** (`js/data.js`):
  - `AREAS[1]`, plus `RESONANCE` (max 3; the spells) and `AURORA` (the 3 colours).
  - Parts with `area: 1, arcane: true`. `LEGENDARY_POOLS.archon`.
  - Enemies `wisp`, `corvette`, `barge`, `mirage`, `archon`. Enemy fields: `wardEachTurn`, `wardKind` ('glimmer', 'illusion', 'crystal'), `armor`, `armorGrowth`, `armorMax`.
  - Intent helpers `I.ward`, `I.illusion`, `I.siphon`, `I.rune`. `ENCOUNTERS.shrine/spire/starchart`. The `hex` token.
  - `BALANCE`: `areaLootBias`, `eliteHp`, `grandCrystals`, `grandDamage`, `grandBacklash`.
- **Engine** (`js/engine.js`):
  - Resonance: `isArcane`, `resonate`, `castSpell` (Mana Lens doubling), `flowResonance`, `totalResonance`, `runeDamage`, `lanceDamage`.
  - Aurora: `auroraActive`, `rollAurora`, `setAurora`, `chooseAurora` (Crown), `empowered`.
  - Hex: `hexed()`, checked in `fireInfo`, repair, `steamCap`, weight and armor.
  - Enemy kinds in `rollIntent` and `executeIntent`: ward, siphon, rune, channel, grand. Also `grandIntent`, `endGrand`, `shatterGrand`, `copyBonus`.
  - The enemy layers pipeline in `damageEnemy` handles illusions and the `prism` option.
  - Events: `runShrine`, `runSpire`, `runStarChart`. `map.charted` and `game.bossCharted` record what the Star Chart revealed.
  - `game.blessings` is `{weapon, core, steam}`.
- **Visuals:**
  - `scene.js`: biomes aurora, auroraRift, auroraDeep and archon; `crystalIsland`; `drawRunes`; `drawAurora`, tinted by `Scene.auroraColor`.
  - `shipart.js`: washes, light, illusion ghosts, `drawWards`, barge crystals.
  - `fx.js` handlers: resonance, spell, aurora, prism, enemyWard, enemyArmor, channel, grandBroken, shards, blessing, enchant.
  - `ui.js`: `resPips`, aurora chip and Crown picker on the battle bar, hexed and enchanted marks.

## Area 3 plan (step 4, agreed design)

- **Moon gauge.**
  - `game.moon` lasts through Area 3's fights. It rises 1 each round (max 6) and wanes 3 after each fight.
  - Moon 2–3: enemies deal +1. Moon 4–5: also aggressive (a non-attack intent rerolls once). Moon 6: Frenzy (+2, and attacks apply Bleed 1).
  - The Moon Well sets the moon to 0.
- **Bleed** is a numeric token on modules, and on the enemy too. At the start of the owner's turn, each stack deals 1, then the token loses 1.
- **Blood costs** are paid from Core durability. Lifesteal heals the Core.
- **Parts:**
  - Blood Harpoon: Blood 1. Deals 3 and heals the Core for half.
  - Thorned Hull: armor that bleeds the attacker.
  - Sanguine Engine: support. Drains 2 from a touching module for +2 Steam.
  - Crimson Altar: once a fight, sacrifice a touching module for +1 damage on all weapons for the rest of the run.
  - Moon Mortar: arcs. Deals 2 + moon/2.
- **Enemies:**
  - Bat Swarm: rakes that bleed.
  - Wraith Clipper: phased on odd rounds; Bleed still ticks.
  - Bone Galleon: rises once at 50%.
  - Blood Cultist Barge: heals from your Bleed.
- **Points of interest:**
  - Blood Altar: pay Core durability for a rare or legendary.
  - Crypt Wreck: salvage with an ambush chance.
  - Moon Well: empties the moon.
- **The Crimson Sovereign:**
  - P1: Bleed barrages and summoned bats, as a 'bats' ward that also bites.
  - P2: the moon is locked full, and it drains your modules to heal.
  - P3: an eclipse turns the screen dark red, then a blood beam hits a telegraphed deck for about 12. Front armor catches it, and Evade dodges it.
  - Pool: Sovereign's Chalice and Eclipse Blade (see above).
- **Already in place:**
  - The music cues map3, combat3 and boss3 in `audio.js`.
  - The Area 3 ships k_bats, k_wraith, k_bonegalleon, k_cultist and k_sovereign, in the atlas and in `shipart.js` HULLS.
  - The CSS accent `body.area-3`.
  - `map-sky-blood.jpg`.

## Status

- Step 1 is done: run structure, portals, the simulator, and tests.
- Step 2 is done: legendaries for the Area 1 bosses, enemy defence layers, generated card art. 47 tests pass.
- Step 3 is done: the Aurora Reaches, the Archon and its pool. 55 tests pass, and a 300-run fuzz through all areas holds its invariants.
- Sim at step 3 (60 runs per Core, Area 1 clear / Area 2 clear / win): airship 58/33/20, battleship 52/5/0, zeppelin 45/27/2, clockwork 43/35/15, privateer 45/32/8, tempest 58/35/20. Area 3 is still a scaled placeholder. Step 6 tunes; the battleship needs help in Area 2.
