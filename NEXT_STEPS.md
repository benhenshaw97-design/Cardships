# Next steps: the three-area expansion

The current brief, so a fresh session can pick up mid-way. Build in this order and commit after each step:

1. Run structure and portals: **done**
2. Legendaries: **done** (Area 1 pools; the Archon's and Sovereign's come in steps 3 and 4)
3. Area 2: The Aurora Reaches: **done**
4. Area 3: The Blood Moon: **done**
5. The Workshop (meta-progression): **done**
6. Balance pass: **done**

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
  - Area 3 also has `moon: true`.
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
- **Still to add.** The Legendary Vault comes in step 5.

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

## Area 3 (step 4): where things are

- **Data** (`js/data.js`):
  - `AREAS[2]`, with `moon: true`.
  - Parts with `area: 2`. The `blood` field is a Core-Durability cost; `lifesteal` heals the Core for that share of the damage landed.
  - `LEGENDARY_POOLS.sovereign`.
  - Enemies `bats`, `wraith` (`phased`), `bonegalleon` (`rises`), `cultist` (`bleedFeeds`) and `sovereign`.
  - Intent helpers `I.bleed(dmg, stacks)`, `I.bleedRake`, `I.summon` (a ward with `bats: true`) and `I.drain`.
  - `ENCOUNTERS.bloodaltar/crypt/moonwell`. `TOKENS.bleed` is numeric: `tokens.bleed` counts stacks.
  - `BALANCE`: `moonMax`, `moonWane`, `beamDamage`, `bitePerBat`, `chaliceCap`.
- **Engine** (`js/engine.js`):
  - The moon is `game.moon`, which lasts across fights and resets at a portal. Helpers: `moonActive`, `moonBonus`, `moonAggressive`, `frenzy`, `moonName`.
    - It rises in `beginPlayerTurn` from round 2 and wanes in `winCombat`.
    - `intentDamage` adds `moonBonus`.
    - `rollIntent` handles the aggression reroll, the Sovereign's moon lock (`combat.moonLocked`), the eclipse (`combat.eclipse`), and the Blood Beam (`kind: 'beam'`, alternating via `combat.beamRest`).
  - Bleed:
    - `placeTokenOn(uid, 'bleed', stacks)`.
    - `tickBleed` runs at the start of your turn, and Cultists heal from it.
    - The enemy's `en.bleed` ticks in `enemyTurn`, with `dot: true` so it reaches a phased Wraith.
    - `executeIntent` leaves Bleed on every hit of a `bleed` rake or under Frenzy (via `this.lastPlan`, recorded by `applyPlan`).
  - Blood:
    - `payBlood`, `bloodBlocked` (checked in `fireInfo` and `canUseSupport`).
    - Lifesteal is handled in `fire`. The Chalice is in `damageEnemy` (`combat.chalice`).
    - `bladeDamage`, `mortarDamage`, `totalBleed`.
  - Enemies:
    - `phasedOut()` is checked in `damageEnemy`.
    - The Bone Galleon rises in `checkEnd` (`en.risen`).
    - Bats: `combat.bats` and `batBites()`, and `wardKind` returns 'bats'.
    - The `drain` intent heals the enemy by what it took.
  - Thorned Hull is in `applyPlan`. Sanguine Engine and Crimson Altar are in `supportTargets` / `useSupport`.
  - Events: `runBloodAltar` (`altarLegends`), `runCrypt`, `runMoonWell`.
- **Visuals:**
  - `scene.js`:
    - Biomes bloodmoon, bloodFog, bloodSpires and eclipse.
    - `cathedralSprite`, `drawBat`, `drawMoon` (`Scene.moonLevel`, `Scene.eclipse`), `drawFog`, ash weather, and bat flocks.
  - `shipart.js`: `rim` moonlight, `ghost` (Wraith phase), `flutter`, bats ward, `drawBleed`.
  - `fx.js` handlers: moon, eclipse, bleed, enemyBleed, batBite, thorns, chalice, bloodburn, altar, rise, phasedMiss; enemyShot handles `beam` and `drain`. Drips take a colour.
  - `ui.js`:
    - `moonGauge()` on the battle bar and the HUD.
    - Bleed tokens with counts (`tok-blood`).
    - Enemy chips: bleed, phased, rises, feeds, moon.
    - The `eclipse` body class.
  - `skymap.js` labels now use `game.encName` (area names).
- **Tests:** 65 pass, including 10 for Area 3.

## The Workshop (step 5): where things are

- **Data** (`js/data.js`):
  - `CORES.arcanist/sanguinist/eclipse`, all `locked`, and their ships in `SHIPS`.
  - `UNLOCKS`: Cores and parts with a Blueprint `cost`. Anything not listed is in the starting pool.
  - `UPGRADES`, `BLUEPRINTS` (the payout and the lore price), `STORM_TIERS`, `COSMETICS`, `ACHIEVEMENTS` (with a `reward: [slot, id]`), and `LORE`.
- **Meta** (`js/meta.js`):
  - Key `cardships.meta.v3`, migrated from v2.
  - `recordRun` returns `{blueprints: {lines, total}, legendaries, achievements, tier}`.
  - Also: `buyUnlock`, `buyUpgrade`, `buyLore`, `wear`, `cosmeticOpen`, `setTier`, `runPool` (the drafted part ids passed as `unlocked`), and `unlockCost`.
- **Engine** (`js/engine.js`):
  - Options: `upgrades` and `tier`. `storm(n)` applies the cumulative modifiers in `chooseCore` (Core hp, cogs), `startCombat` (hp, boss hp, damage, Block) and `price`.
  - `rerolls`, `canReroll`, `rerollOffer`.
  - Stats: `seenEnemies`, `seenParts` (`seePart` in `makeCard` and `partOffer`) and `killed`.
  - Core abilities `pulse`, `bloodlet` and `umbra` (`umbraDamage`). The Arcanist passive is in `isArcane`, the Sanguine passive in `fire` (`combat.pact`), and the Eclipse passive in `castSpell`.
- **UI:**
  - `ui.js`: `titleScreen` is the Workshop, with `workshopHeader` and the tabs `hangarTab`, `upgradesTab`, `partsTab`, `logbookTab`, `vaultTab` and `liveryTab`.
  - `ui.js`: `applyLivery` sets `CardshipsShipArt.livery` and `--core-skin`. `endScreen` shows the Blueprints ledger. The loot screen has a Reroll button.
  - `shipart.js`: `pixelSprite` takes `balloon`; `thumb(name, w, h, livery)`.
  - CSS lives under "The Workshop".
- **Bot:** scores the new Core abilities.
- **Tests:** 70 pass.

## Balance pass (step 6): done

- Results and method are in BALANCE_REPORT.md. Averages over 9 Cores at tier 0 (seed 1): Area 1 60.1%, Area 2 36.0%, full win 18.0%. Seeds 2 and 3 agree within 3 points.
- Possible follow-ups (none are required by the brief):
  - The Battleship's win rate is low (about 10%).
  - Tempest is the strongest Core (about 27%).
  - Storm Tiers 4–6 sit close together; give them sharper modifiers if wanted.
  - The bot never rearranges at the Sky Dock.
- To retune: `BRIEF=1 node tools/simulate.js 200`, with `TUNE='{"AREAS":{"2":{"hp":0.9}}}'`-style overrides (arrays by index).

## Status

- **The expansion brief is complete:** all six steps, each committed. 70 tests pass, and the bot-played fuzz through all three areas holds its invariants.
- **Added after the brief:**
  - The main menu, separate Workshop and launch screens, and the guided first flight (`Tutorial` in `ui.js`).
  - The sailing leg between places (`travel` and `enrouteScreen` in `ui.js`).
- **Art.** Every sky, part, Core and enemy now uses your painted art; the code-drawn versions remain only as fallbacks (`js/artgen.js`, listed in `DRAWN_ONLY`).
  - Every biome's far layer is a painting (`BIOMES` in `scene.js`).
  - Unused uploads are filed in `assets/art/source/uploads/`.
- **Painted place art:** the six later-area places have painted map icons (`tools/build_place_icons.py`) and banners, and Areas 2 and 3 have their own Distress Beacon, Pirate Lair and boss banners, plus an Area 2 Aether Rift (`tools/build_scene_banners.py`; `PAINTED_BANNERS` in `js/ui.js` picks `<place>-a2`/`-a3` when it exists). `scene-blood-battlefield.png` is filed as a spare.
- **Later-area places and endings:** Trading Zeppelin, Sky Dock and Mercenary Island have their own Area 2/3 banners and flight skies (`AREAS[].placeBiomes`); Areas 2 and 3 have painted map charts; the final victory shows the broken Blood Moon and a defeat shows the sky the ship fell in. The code-drawn `js/artgen.js` icons and banners remain as fallbacks.
- **Balance:** see "Balance pass (step 6)" above and BALANCE_REPORT.md.
