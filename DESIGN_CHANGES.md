# Design changes

Every change to the rules, content and presentation, with a one-line reason. Newest phase last.

## Phase 1: fixing the design weaknesses

### Dice and targeting
- **Every roll is a d6.** Enemy tactics, hazards, events, contracts, Sky Dock mechanics, targeting and the Deck Cannon all use it. *Reason: six faces give room for varied outcomes instead of filler.*
- **Targeting is side d6 (1–3 stern, 4–6 bow) + layer d6 (1–2 → layer 1, 3–4 → layer 2, 5–6 → layer 3).** No miss face. *Reason: telegraphed attacks make random misses pointless; Evade replaces them with a decision.*
- **An attack on an empty layer hits the next module inward; only a completely bare side exposes the Core.** *Reason: the old rule punished small ships with direct Core hits for building outward.*
- **Outside armor takes every hit aimed at its side; buried armor soaks part of a hit on a module touching it.** Tokens follow the same rule. *Reason: keeps "outer cards protect inner cards" as the core positional idea.*

### Telegraphed enemies
- **The enemy's next move is rolled a turn early and shown with its exact target and predicted damage before you act.** *Reason: turns every enemy turn into a puzzle you can answer, Slay the Spire style.*
- **The ship view marks every module the intent will hit, with the damage it will take.** *Reason: the answer should be visible at a glance.*
- **Answers to any intent:** swap modules out of the line of fire, Evade, brace a Deflector, vent or clean tokens, or kill the enemy first. *Reason: the player should never be helpless against a telegraphed hit.*
- **Enemies have Block, Burn, Gummed (−1 damage) and Choking (+1 damage taken) states, and "Stoke Boilers" intents that charge their next attack.** *Reason: richer intents to read and counter.*

### Steam (ammo) vs Durability (health)
- **Durability is health only. Each Core has a Steam pool that refills every turn and pays for every action.** *Reason: weapons no longer destroy themselves by firing, so builds aren't self-eroding.*
- **Each module can act once per turn** (twice with an Autoloader). *Reason: steam limits volume, this limits spam.*
- **New basic actions:** Swap two adjacent modules (1 Steam), Vent a module's tokens (2 Steam), Evade (weight-based cost). *Reason: movement and cleansing are always available answers.*

### Less coin-flip swing
- **Removed all 50/50 misses.** The Deck Cannon rolls a d6 damage range (2–5) with an Aimed option (+1 Steam: best of two). The Sniper has a guaranteed shot or Steady Aim (+1 Steam: 4 piercing). Gas now makes a module cost +1 Steam instead of a coin flip. *Reason: keep gambling, but make it a choice you pay for.*

### Weight matters
- **Lighter than the enemy: +1 Steam on your first turn ("Outpace").** *Reason: lighter ships act first in spirit.*
- **Evade cost rises with weight (1 Steam at Weight 0–2, 2 at 3–5, 3 at 6–8, 4 above).** *Reason: nimble ships dodge, heavy ones tank.*
- **Rams deal 1 less per 2 Weight you have over the attacker; crosswinds can't touch ships of Weight 6+.** *Reason: heavy ships resist ram and wind.*
- **Each Core is a playstyle:**
  - Airship (Skirmisher): Evade always costs 1 and the first Swap each turn is free. Strafing Run scales with weapon count.
  - Battleship (Juggernaut): can't Evade, takes 2 less from rams, and its Ram scales with total Weight.
  - Zeppelin (Bombardier): banks unspent Steam as Pressure and dumps it in a piercing Bombard.
  - Clockwork (Engineer, unlockable later): repairs a module every turn and can Overclock a weapon to fire twice.
  *Reason: four genuinely different ways to read the same board.*

### No dead rolls
- **Every "nothing happens" result is replaced by a choice or tradeoff.** Storm Front: Downdraft (jettison a module or brace the Core), Eye of the Storm (repair or scavenge), Tailwind. Distress Beacon: every face changes the fight. Sky Dock: six real mechanic results. *Reason: every roll should matter.*
- **Contracts: roll two, sign one.** *Reason: a choice beats a random assignment.*
- **Trading Zeppelin: pick one of three deals** (buy from 3, full repair, trade in a module). *Reason: vendors offer a choice, not a random result.*
- **Loot: choose 1 of 3 parts, or take nothing.** *Reason: you shouldn't be forced to take a part that hurts your build.*

### Anti-stall
- **Back-to-back Evades cost +1 Steam each (crew fatigue), and enemies grow Enraged (+1 damage per hit per round) after round 10.** *Reason: simulation found a ship that could evade a boss forever.*

### Content and setting
- **Steampunk renames:** Barracks → Crew Quarters, Fire Extinguisher → Sprinkler Tank, Janitor/Hazmat → Air Scrubber, Storage Bay → Cargo Hold, Balloon → Gasbag, Drydock/Shipyard → Sky Dock, Attack Boat → Corsair Gunship, Wind Storm → Storm Front, Mobile Vendor → Trading Zeppelin, Derelict → Distress Beacon. *Reason: fit the skyship setting.*
- **New parts:** Mortar (arcs from any layer), Tesla Coil, Ironclad Bulwark, Deflector Vane, Auxiliary Boiler, Propeller, Autoloader, Gyro Stabilizer, Clockwork Heart, Overpressure Valve. *Reason: more positional synergies and build-defining choices.*
- **New enemies:** Pirate Cutter, Bomber Dirigible, Clockwork Sentinel, plus a Scavenger Skiff and Iron Leviathan rebuilt with d6 phase tables. *Reason: variety of intents to read.*
- **Each Core starts with its own two modules** instead of a shared kit. *Reason: different openings per Core.*
- **Saved runs:** the whole game state, including the dice generator, serialises to JSON and resumes with identical rolls. *Reason: groundwork for seeds and autosave.*
- **Look:** brass-on-iron panels and a Victorian display face instead of the blueprint style. *Reason: fit the steampunk setting.*

## Phase 2: run structure and replayability

### Sky map
- **A branching route of 12 columns: 11 columns of 2–4 nodes, then the boss.** Edges only run forward and never cross. *Reason: plan a route instead of picking blind from a list.*
- **Node types: Pirate Patrol (combat), Pirate Lair (elite, from column 4), Storm Front and Smog Bank (hazards), Trading Zeppelin (trade), Distress Beacon (ambush), Mercenary Island (quest), Sky Dock.** Each has its own icon and colour. *Reason: readable at a glance.*
- **Sight: you can identify nodes 2 columns ahead.** An outside Telescope adds 1 and sees through cloud cover (about 1 in 5 nodes hides its type until you're adjacent); Tailwinds, chimney updrafts and sky charts add 1 for a few legs. *Reason: Paths and Telescope now buy information about the route.*
- **A Sky Dock is guaranteed right before the boss, and a Trading Zeppelin or Sky Dock in column 6.** *Reason: a chance to prepare and to spend cogs.*
- **The map scrolls sideways with parallax layers (far islands, mid clouds, near wisps that pass over the route), the sky tints through the biome bands, and your airship flies along the route to each node.** *Reason: the route should feel like flying through the clouds.*
- **Pirates scale with distance: +6% Durability per column, +1 damage per hit from column 8.** Patrols draw from tiered pools (Cutter/Skiff/Bomber early, Gunship/Sentinel late). *Reason: steady difficulty curve across a longer run.*

### Bosses
- **Three bosses; one is picked at random per run and shown on the map from the start.** *Reason: replayability, and a target to build toward.*
  - **The Iron Leviathan**, Ironclad Hull: every hit deals 1 less unless it pierces. *Reason: rewards Tesla, Steady Aim, Bombard and Burn.*
  - **The Storm Queen**, Gale Force: after every move her winds swap your two outside modules on one side (alternating, telegraphed), and her lightning ignores outside plating. A Lightning Rod drinks the bolts for Steam. *Reason: a positional boss that fights your layout.*
  - **The Clockwork Colossus**, Wind-Up: its Mainspring adds +1 damage per hit every turn, until you deal 6+ damage in one turn to snap it, resetting the spring and cancelling its next move. *Reason: rewards saving up for burst turns.*
- **Two elites at Pirate Lairs: the Dread Corsair Flagship and the Armored Monitor.** *Reason: optional risk for better loot.*

### Economy and rarity
- **Cogs:** start with 20, earn 9–24 per fight (+20 from elites) plus events and contracts. *Reason: a currency gives trades real choices.*
- **Trading Zeppelin is a shop:** 2 common, 2 uncommon and 1 rare part priced 32 / 52 / 85, plus Hull Patch, Full Refit and Sky Charts, and you can sell up to 2 modules for half price. *Reason: vendors offer a choice, not a random result.*
- **Rarity tiers drive loot odds** (normal 62/30/8 common/uncommon/rare, elite 25/50/25). **Rares are build-defining:** Tesla Coil (scales with weapon count), Autoloader (double fire), Gyro Stabilizer (free Evades, ram resistance), Overpressure Valve (+2 Steam with a risk), Clockwork Heart (Core regeneration), Ironclad Bulwark. *Reason: rare finds should change how you build.*
- **New uncommon: Lightning Rod.** *Reason: a counter to storms and the Storm Queen.*
- **Smog Bank hazard** with six choice-driven outcomes (soot, fumes, smuggler's cache, scrap, foundry, updraft). *Reason: a second hazard for the industrial biome.*
- **Contracts updated:** The Bounty now means defeating a Pirate Lair, and The Survivor counts Smog Banks. *Reason: fit the map.*

### Meta-progression
- **Lifetime records in this browser unlock content:** Tesla Coil (reach a boss), Autoloader (defeat a Pirate Lair), Gyro Stabilizer (3 contracts), Clockwork Core (win a run), Overpressure Valve (defeat two different bosses). Locked items never appear in loot or shops. The title screen shows progress. *Reason: a reason to keep flying after a loss.*

## Phase 3: parallax world

- **A flight scene canvas sits above every screen and never stops scrolling.** *Reason: it should always feel like you're flying.*
- **Five layers in every flying biome:** sky gradient → far scenery → mid-distance airships, spires or chimneys → two depths of drifting cloud banks (the front bank passes between the ships and the camera) → fast foreground wisps over everything, plus weather particles. *Reason: depth from layered motion, as asked.*
- **Five flight biomes, each with its own palette, scenery and weather:**
  - Clear skies (columns 1–3): floating islands with spires, distant airships, passing flocks of birds.
  - Smog zone (columns 4–6 and every Smog Bank): the canyon-foundry painting as the far layer under a brown haze, factory chimneys with smoke plumes, falling soot.
  - Sunset route (columns 7–9): the sunset sky-city painting as the far layer, airship silhouettes, golden motes.
  - Storm front (columns 10–11 and every Storm Front): dark peaks, slate cloud towers, rain streaks, and lightning that flashes the whole far layer.
  - Boss's lair (every boss fight): black spires over a red glow, hanging wrecks on chains, rising embers.
  *Reason: each encounter type and region should look and feel different.*
- **Two docked scenes built from your paintings:** the Sky Dock uses the sky-deck painting and the Trading Zeppelin uses the engine-room painting, each with a slow drift, rising steam, and (in the engine room) a flickering lantern glow. *Reason: use the provided art where it fits; a hangar and a merchant's hold are places you dock, not fly through.*
- **The title screen flies over the sunset sky city.** *Reason: the strongest piece of art makes the first impression.*
- **Scroll speed follows the action:** fast while travelling between map nodes, cruising in events, slow during combat, stopped when docked, and a backward lurch plus camera shake on every Ram. *Reason: speed communicates what's happening.*
- **Biomes crossfade** when the scene changes. *Reason: no hard cuts.*
- **Painted far layers are mirror-tiled** so they scroll forever without a seam. *Reason: the paintings aren't tileable on their own.*

## Phase 4: the ship visual

- **Your ship is drawn side-on in the flight view and assembles from what you install.** The Core is the central gondola; stern modules bolt on to the left, bow modules to the right, joined by a brass keel. The gasbag envelope stretches to fit the ship's length, with rigging down to the hull. *Reason: the ship you build should look like a ship, not a row of cards.*
- **Every module has its own illustrated look:** cannons and harpoon guns poke out, Brass Plating rivets layered plates onto the outer face, Gasbags inflate above, Crew Quarters show lit portholes, the Telescope extends when it's outside, Propellers and the stern propeller spin, Tesla Coils crackle, Autoloaders run a shell belt, Gyros spin, the Clockwork Heart beats, boilers and valves twitch their gauges. *Reason: modules should be recognisable at a glance.*
- **Each Core has its own hull:** brass skiff (Airship), riveted ironclad with a funnel (Battleship), a slim gondola under a long silver envelope (Zeppelin), a copper hull with a turning gear (Clockwork). *Reason: the playstyle should show.*
- **Layers stack outward visibly,** so the outermost module (the one that protects the rest and fires) is always at the end of the ship. *Reason: positional rules need to be readable.*
- **Idle motion:** bobbing and gentle tilt, spinning propellers, steam puffs from the Core's vent, and a flickering furnace window. *Reason: the ship should feel alive.*
- **Damage shows:** dents below two thirds Durability, cracks and constant smoke below one third, Durability pips under each module, and a red-glowing furnace with an alarm lamp when the Core is low. Destroyed modules tear off and tumble away with scattered gears, and the rest of the ship closes the gap. *Reason: you should see trouble before you read it.*
- **Installing a part plays a bolt-on animation** (dropped into place, then sparks), and modules slide when others are inserted, swapped or lost. *Reason: building should feel physical.*
- **The telegraphed intent draws crosshair rings with the damage on every module it will hit.** *Reason: the answer to an intent should be on the ship itself.*
- **Tap a module in the flight view to see its card and actions** (fire, aimed shot, swap, vent, use, scrap or sell), in a popover on desktop or docked under the view on phones. Install markers are brass bolts on the ship itself. *Reason: play directly on the ship, at phone width too.*
- **The card view stays available as a toggle** (remembered between visits). *Reason: some players prefer the compact grid.*
- **Enemies are drawn per type:** patched pirate Cutters and Skiffs with skull flags, a twin-balloon Corsair Gunship, a cigar-shaped Bomber Dirigible with bomb racks, the propeller-borne Clockwork Sentinel, the galleon-hulled Dread Corsair Flagship and the turreted Armored Monitor. *Reason: sky pirates, gunships, dirigibles and clockwork war-machines, as asked.*
- **Bosses transform between phases:** the Iron Leviathan sheds armor plates and catches fire, the Storm Queen grows more tesla spires and her storm skirt spins faster, and the Clockwork Colossus's key and chest gear turn faster as it winds up, with its eyes going from amber to red. *Reason: phase changes should be visible.*

## Phase 5: visual effects

- **Turns play back as a timed sequence of effects.** The engine still resolves a turn instantly, but the UI plays its event stream in order (shots, hits, rolls, explosions), then updates the panels. Tap the flight view to skip ahead. *Reason: every effect is tied to a real game event, and the order of what happened is readable.*
- **Hits:** screen shake scaled to damage, a hit-stop freeze on big hits (4+ on you, 5+ on the enemy), a white flash on the struck module or enemy hull, floating damage numbers (blue for piercing hits), sparks, and flying bolts and gears. *Reason: hits should land with weight.*
- **Firing:** muzzle flash, a smoke puff, recoil kick on the module, and a projectile per weapon: Harpoons trail a chain, Deck Cannons lob smoking balls, Mortars arc high, Flamethrowers stream fire, Glue Gatlings spray goo, Gas Grenadiers lob canisters, Sniper Nests fire a fast tracer, Tesla Coils throw lightning. Strafing Run fires tracers from every weapon; Bombard drops a stick of bombs from above. Enemy fire uses shells, tracers, lightning, firepots, tar and gas shells to match the intent. *Reason: each weapon should feel different to fire.*
- **Tokens:** burning modules flicker with flames and throw embers and smoke, with a flare each time burn damage ticks; glued weapons drip green goo; gassed modules swirl with toxic clouds. The same effects show on the enemy for Burn, Gummed and Choking. *Reason: status should be visible on the ship.*
- **Armor:** a brass shield flare, deflect sparks and a "Deflected" or "Blocked" call-out for absorbed hits. *Reason: show the hit you prevented.*
- **Repairs:** a spinning wrench, rising cogs, a green pulse and a "+N". Cleansing splashes water. *Reason: feedback for support actions.*
- **Ram:** both ships lunge together, a heavy shake, a world jolt, and a burst of gears and bolts at the point of impact. *Reason: the biggest hit in the game should feel like it.*
- **Destruction:** an explosion ring, flames, scattered gears, and the module tumbling off-screen. *Reason: losing a module should hurt to watch.*
- **Boss phase change:** a full-screen flash, an expanding shockwave, a banner naming the new phase with flashing warning lights, and the boss's art transforming (from Phase 4). *Reason: phase changes are the boss's big moments.*
- **Dice:** every roll shows animated 2D d6s that spin in, bounce, settle and glow on the result, grouped per action (for example tactic, side and layer for an intent) and labelled. Settings: Normal, Fast or Off. *Reason: rolls should be seen, but never slow you down.*
- **Low hull:** below a third of Core Durability in combat, a pulsing red vignette, rotating alarm beacons, a sparking Core and a red furnace. *Reason: danger you can feel.*
- **Victory and defeat:** victory sinks the enemy in a chain of explosions with cogs bursting out; defeat blows every module off your ship and sends the hull tumbling through the clouds. *Reason: endings deserve a moment.*
- **Settings panel:** screen shake (Full / Reduced / Off), flashing effects (On / Off), dice animation (Normal / Fast / Off), plus the audio controls. Reduced-motion systems start with shake off and fast dice. Choices are remembered. *Reason: accessibility and comfort.*
- **Performance:** all effects are canvas particles with a hard cap, drawn in the same frame as the scene; the enemy renders through a cached offscreen buffer. *Reason: smooth on phones.*

## Phase 6: music and audio

- **Your three tracks were profiled for tempo, loudness and dynamics, then assigned by feel:**
  - *Pirate Battle 1* (about 83 BPM, the widest dynamics) is the roaming track: title screen (low-pass filtered, as if heard from the sky city), sky map, and Sky Dock and Trading Zeppelin (heavily muffled, as if through the hull).
  - *Pirate Battle 2* (about 99 BPM, the loudest and most even) is standard combat.
  - *Pirate Battle 3* (about 123 BPM, with a quiet breakdown at 80–100s and a climax from 170s) is the boss track; its breakdown also scores hazards and ambushes.
  - Victory plays Pirate Battle 1's loudest section (from 139s). Defeat plays its quiet passage (from 119s) slowed to 82% and muffled.
  *Reason: three battle tracks can still cover eight moods with sections, filters and speed.*
- **The boss fight steps up at each phase:** phase 1 plays the opening under a filter, phase 2 jumps to the second build with the filter opening, and phase 3 jumps to the climax at full brightness, each with a short crossfade. *Reason: music intensity should follow the fight.*
- **Scene changes crossfade over about 1.2 seconds.** Scenes that share a track (map, events, loot, docks) keep playing and only change level and filter. *Reason: no jarring restarts between screens.*
- **Seamless loops:** just before a track ends (trailing silence trimmed), a second player starts from the top and the two crossfade. *Reason: looping without a gap.*
- **Low hull:** below a third of Core Durability in combat, music ducks about 30% and is low-passed to 1.8 kHz. *Reason: tension without drowning the game.*
- **Sound effects:** no effect files were provided, so all effects are synthesised in WebAudio: cannon fire, big and small hits, armor clangs, bolt-on clanks, explosions, flamethrower roar, fire crackle, tesla zaps, gatling bursts, harpoon chains, whooshes, bomb whistles, dice rattles, repair ratchets, steam hiss, goo splats, coins, boss alarms, ram impacts and UI clicks. *Reason: full feedback now, real sounds later.*
- **Drop-in hook for real sound files:** list files in `SFX_FILES` in `js/audio.js` (or call `CardshipsAudio.registerSfx(name, url)`); each replaces the synthesised version of that name. *Reason: leave clean hooks, as asked.*
- **Settings:** separate Music and Sound effects volume sliders plus Mute, remembered in localStorage. *Reason: player control.*
- **Audio starts on the first tap or key press,** as browsers require. *Reason: autoplay rules.*
- **Safari support:** AAC copies of the tracks (`.aac.mp4`) sit next to your Opus originals and are used when the browser supports them. Opening `index.html` straight from disk falls back to plain volume control, because browsers block WebAudio filters on local files. *Reason: works everywhere it can.*

## Phase 7: clarity

- **The enemy's intent sits on a plate above the enemy:** an icon by type (attack, ram, block, repair, charge, token colour), the move's name and a one-line summary ("3 damage → stern layer 2"). Animated dashed arrows run from the enemy to every module it will hit, ending on crosshair rings that show the damage. The plate greys out while you're evading or when the Colossus is stunned. *Reason: the threat and its target should be readable at a glance, in the scene.*
- **Synergy outlines:** hover a module (desktop) or tap it (touch) and every linked module gets a dashed green outline and a labelled arc explaining the link (Chain Feed, Crew discount, Spotter, Adhesive, Autoloader, fireproofing, Repair Bay reach, bulkhead soak, outside armor cover, Powder Store, Grenadier rupture, boiler danger, Core attachments). The module's card lists the same links. *Reason: adjacency is the core of building; it should be visible, not memorised.*
- **Install preview:** hover a brass bolt (or tap it once on touch) and a translucent copy of the part appears in that slot, with the outer modules sliding aside. The panel lists what changes (weight, Steam, Evade cost, sight, whether it becomes the outside module, whether it buries a weapon so it can no longer fire, whether a weapon placed there can't fire) and every synergy it gains. Click, or tap again, to install. *Reason: see the consequences before you commit.*
- **Combat log:** the log panel becomes "Combat log · round N" during fights, with each round's Steam and every roll, hit and status written out. *Reason: a record you can check after a hectic turn.*
- **Seeded runs:** every run has a short code (base-36 of its seed), shown on the map and end screens. Enter any code or word on the title screen to fly the same route with the same dice. *Reason: share and replay runs.*
- **One seeded generator** drives every random event (map, loot, shop stock, enemy rolls, event rolls, the boss pick). Its state is saved with the run, so a resumed run continues with the same dice it would have had. *Reason: seeds must reproduce runs exactly.*
- **Autosave after every action** (so always after every node), with "Continue run" and "Abandon" on the title screen. The save is cleared when a run ends. *Reason: never lose a run to a closed tab.*

## Phase 8: balance by simulation

Full numbers, method and caveats are in `BALANCE_REPORT.md`. Summary of the changes:

- **Evade costs 2 + Weight/3 Steam (minimum 1); the Airship's Nimble and an outside Propeller each take 1 off; consecutive Evades cost +2 each.** *Reason: cheap, repeatable Evades made light ships nearly unbeatable (Zeppelin 98.5%, Airship 89.4%).*
- **Pirates gain 8% Durability per column (was 6%) and +1 damage per hit from columns 6 and 11 (was column 8 only).** *Reason: a steadier difficulty ramp to the boss.*
- **Bosses have 1.35× Durability; base Durability is Leviathan 26, Storm Queen 33, Colossus 37 (was 30 / 28 / 32).** *Reason: bosses fell 84–92% of the time; now 58–65%, and within 7 points of each other.*
- **Bombard deals 1½ per Pressure (rounded down), max 6 Pressure** (was 2 per Pressure, max 9). *Reason: a single banked bomb could skip a boss phase.*
- **Battleship: 15 Durability and 4 Steam** (was 12 and 3). *Reason: it can't Evade, so it has to out-tank and out-act.*
- **Clockwork: 10 Durability and a free Overclock (once a turn)** (was 9 Durability and a 1-Steam Overclock). *Reason: lands it mid-band between the 31% and 54% versions tested.*
- **Global knobs moved into one `BALANCE` block in `js/data.js`,** and the simulator takes a `TUNE` override for experiments. *Reason: make future tuning quick and visible.*
- **Result: Airship 47.9%, Battleship 39.8%, Zeppelin 41.0%, Clockwork 38.2% (1,000 runs each); the most common part is on 42.4% of winning ships.** *Reason: hits both targets with margin.*

## Ship layout redesign: stern, deck and bow

The first layout mirrored two identical sides around the Core. In the side-on view the enemy is always ahead, so the back three slots had no role: stern guns pointed away from the enemy yet still fired through the ship, and enemies hit the back exactly as often as the front.

- **Three sections, each with a job.** *Reason: every slot should make you think about what goes there.*
  - **Bow (3 slots, in front):** faces the enemy and takes most of the direct fire. Its outermost module is the **prow**. A prow weapon fires, and prow armor shields the whole bow.
  - **Deck (2 slots, a tower on top of the Core):** the top module is a **turret** that can fire. Direct fire reaches it less often, but it also takes plunging fire.
  - **Stern (3 slots, behind):** **sheltered**; direct fire can't reach it, only plunging fire. It is the engine room for Repair Bays, Boilers, Propellers and cargo. Guns there face away from the enemy, so only arcing weapons (Mortar, Tesla Coil) fire from the stern.
- **Two kinds of enemy fire.** Direct fire (guns, rams, broadsides) rolls a d6 for its section: 1–4 bow, 5–6 deck. Plunging fire (bombs, lobbed shells, lightning, tornadoes, shrapnel) rolls 1–3 deck, 4–6 stern. Each intent says which ("stern layer 2 (plunging)"). *Reason: the stern's safety has a price, and bombers and the Storm Queen threaten it.*
- **A shot at an empty section falls on the other section in its arc;** the Core is exposed only when the whole arc is bare. Rams always strike the prow. Broadsides hit the prow and the deck top. *Reason: keeps "only a bare side exposes the Core" fair with three sections.*
- **Part rules follow the sections:**
  - Propellers work at the stern tail.
  - Telescopes are lookouts from the deck top or the prow.
  - A Lightning Rod on top of the deck drinks every lightning bolt.
  - Armor and Deflectors protect their own section.
  - Chain Feed works within a section.
  *Reason: placement should matter for every part.*
- **Ship capacity goes from 6 to 8 modules.** *Reason: the deck adds a new place to build without crowding the hull.*
- **The Storm Queen's gale cycles bow → stern → deck.** *Reason: her positional gimmick covers the new layout.*
- **New starting loadouts:**
  - Airship: Harpoon turret on deck, Propeller at the tail.
  - Battleship: Plating prow, Deck Cannon turret.
  - Zeppelin: Gasbag on deck, Mortar sheltered in the stern.
  - Clockwork: Harpoon prow, Repair Bay in the stern.
  *Reason: each Core shows off a different use of the sections from turn one.*
- **The ship art grows a deck tower:** a brass mast rises from the Core with deck modules stacked on it, facing the enemy, and the envelope lifts to make room. Stern modules face backward and bow modules face forward. Install bolts appear between modules in all three sections, and the install preview says what each slot means ("Becomes the prow…", "sheltered from direct fire", "faces away: this weapon cannot fire here"). *Reason: the layout should be readable on the ship itself.*
- **The card view mirrors the ship:** the deck column stacks above the Core, the stern runs left and the bow right, with each section's role labelled. *Reason: the toggle view should match the picture.*
- **Saves from the old layout are not loaded** (new save key). *Reason: old saves use the two-sided layout.*
- **Re-tuned for the new layout** (details in `BALANCE_REPORT.md`): boss Durability ×1.5 (was ×1.35), Clockwork 11 Durability (was 10), Strafing Run 3 Steam (was 2). *Reason: the sheltered stern made ships sturdier.*

## Your ship-parts sprite sheet

- **The sheet is cut into 62 named sprites** (ships, hulls, balloons, propellers, engines, cannons and turrets, harpoon, cabins, flags, clouds, smoke and flame trails), with the Pixelcut watermark stripped, and packed into `assets/art/ship-parts.png`. `python3 tools/build_sprites.py` rebuilds the atlas from `assets/art/source/ship-parts-sheet.png`. *Reason: use the provided art, and keep it easy to extend.*
- **Enemies use the four finished ships as they are:**
  - pirate sailing ship → Pirate Cutter
  - galleon under a balloon → Dread Corsair Flagship
  - armoured ironclad → Armored Monitor
  - turreted dreadnought → Iron Leviathan, which burns harder and switches flags as its phases change
  *Reason: the sheet's ships already face left, toward the player.*
- **Other enemies are assembled from the parts:**
  - Corsair Gunship: iron hull, striped balloon, two turrets, a Jolly Roger.
  - Scavenger Skiff: wooden hull, net balloon, a cannon.
  - Bomber Dirigible: long red balloon over a trimmed hull with a bomb rack.
  - Storm Queen: blue emblem balloon over an iron hull, keeping her tesla spires and storm skirt.
  The two clockwork machines (Sentinel and Colossus) keep their drawn art. *Reason: one consistent look for the pirates.*
- **Your ship flies real balloons over a real hull.** Each Core has its own balloon (green-banded Airship, red-striped Battleship, blue emblem Zeppelin, net-wrapped Clockwork) and hull (wooden, iron, trimmed). Longer ships fly more balloons side by side, at their natural shape. The hull stretches under every module, and a flag flies from the tail. *Reason: the assembled ship should match the enemies and the sheet.*
- **Module sprites:** Deck Cannon, Mortar, Harpoon Gun, Auxiliary Boiler, Overpressure Valve, Autoloader, Crew Quarters, Cargo Hold, Gasbag and Propeller now use the sheet's cannons, turrets, harpoon, engines, cabins, balloon and propeller (which spins). The other modules keep their drawn art. *Reason: use the parts that match a module; draw the rest.*
- **The sky map marker is the little striped airship.** Your painted clouds drift in the far cloud bank of clear and sunset skies, and the smoke-trail sprite streams behind the ship while travelling. *Reason: carry the sheet's style through the whole game.*
- **On phones, combat keeps your ship to the lower 60% of the view and the enemy flies above it,** so the bigger balloons don't overlap. *Reason: readability at phone width.*

## Second asset drop: effects, steampunk parts and two paintings

- **The effects sheet is cut into 38 sprites** (`assets/art/fx.png`) and drives the combat effects:
  - Hits on the enemy play a painted explosion sequence; big hits (5+) use one of the four large blasts and leave black smoke.
  - Hits on your modules explode too, and a destroyed module goes up in a blast and a smoke column.
  - Every gun shot has a muzzle flash and a puff of white smoke; the Tesla Coil charges a blue orb and its hits crackle with lightning.
  - The Sniper Nest fires a painted bullet, the Gas Grenadiers loose a gas rocket that trails smoke, and fire (yours and the enemy's firepots) flies as a fireball.
  - Gas tokens raise a green cloud and glue a green blob. Cleansing with the Sprinkler or Air Scrubber splashes water. Rams flash a star burst. Boss phase changes, victory and defeat all get the large blasts.
  *Reason: the hand-painted effects read far better than plain particles; the particles stay underneath as texture.*
- **The steampunk parts sheet is cut into 62 sprites** (`assets/art/parts.png`), and modules use them:
  - Deck Cannon: wheeled carriage cannon. Mortar: angled brass gun. Sniper Nest: long steel gun. Glue Gatling: gatling. Gas Grenadiers: rocket rack.
  - Brass Plating: riveted iron panel. Ironclad Bulwark: tall armour plate. Repair Bay: gear train. Auxiliary Boiler: copper tank. Overpressure Valve: boiler with gauges. Autoloader: ammo box. Clockwork Heart: ornate engine. Gyro Stabilizer: compass wheel. Telescope: spyglass (longer when outermost). Cargo Hold: chest and crate. Supply Hatch: ornate chest. Propeller: motor with a spinning brass prop.
  - Flamethrower, Tesla Coil, Deflector, Sprinkler, Scrubber and Lightning Rod keep their drawn (and animated) art, since nothing on the sheet matches them.
  *Reason: use the parts that fit a module, and keep the animations that show a module's rules.*
- **Every part offer (loot, contracts, shop) shows a portrait of the part** as it looks on your ship. *Reason: you see what you are bolting on before you take it.*
- **Two new biomes on the route.** The red cloud-sea painting becomes a "dusk" biome (columns 8–9) and the title backdrop; the night-fleet painting becomes a "night" biome (columns 10–11), the last leg before the boss. The bands now run clear → smog → sunset → dusk → night → lair; the storm biome still appears wherever there is a Storm Front. The sprite clouds are tinted to each sky. *Reason: the paintings give the late route its own look, and the light darkens as you near the boss.*
- **Housekeeping:** the re-uploaded ship-parts sheet was identical to the one already in `assets/art/source/`, so the duplicate was removed. The new sheets were moved to `assets/art/source/` and the paintings were renamed. `tools/build_sprites.py` now builds all three atlases, and `js/sprites.js` loads them on demand, giving each frame its atlas. *Reason: one tidy pipeline for all the art.*


## The two-deck grid (replacing the deck tower)

The stern / deck tower / bow lanes are gone. The ship is now the grid the original rulebook describes: built horizontally out from the Core, with cards that can be "outside", "exposed from the top" or "directly on top" of each other. *Reason: the tower only added a tall stack on top of the Core, and the stern still didn't play like part of the ship.*

- **Layout.** The **hull** row runs through the Core: up to 3 modules in the bow and 3 in the stern, always packed against the Core. The **upper deck** sits on top. Any hull module can carry one more module, and so can the Core itself (the **bridge**). The cap stays at 8 modules, so you choose between a wide ship and a tall one. *Reason: one rule covers every slot, and every slot can be hit or used.*
- **Installing.** A hull bolt between two modules inserts the part and pushes that column (and whatever stands on it) one step out. Upper bolts sit on any free spot over a hull module or the Core. *Reason: keeps the "build outward" feel of the cards.*
- **Losing a hull module.** The module on top of it drops into its slot. With nothing on top, the columns outside close up toward the Core. *Reason: the grid never has holes or floating modules.*
- **Firing.**
  - Straight-firing weapons fire from the **front of a deck**: the prow (the outermost bow hull module) or the foremost upper module.
  - Arcing weapons (Mortar, Tesla Coil) fire from any slot with **open sky** above.
  - Stern hull weapons sit behind the Core and only fire if they arc.
  *Reason: position decides who fires, as before, but now in two dimensions.*
- **Direct fire.**
  - A d6 picks the deck: 1-4 the hull, 5-6 the upper deck.
  - A second d6 picks the depth from the front: 1-2 the 1st module, 3-4 the 2nd, 5-6 the 3rd. A roll deeper than the deck goes hits the front module.
  - Armor at the front of a deck catches every shot aimed deeper along it.
  - An empty upper deck lets the shot fall to the hull. A hull with nothing in the bow lets it hit the Core.
  *Reason: the rulebook's "outside-in" targeting, kept readable.*
- **Plunging fire** (bombs, lobbed shells, lightning, storm debris).
  - A d6 picks a column: 1-3 stern 1-3, 4-6 bow 1-3.
  - The shot hits the top of that column, so an upper module shelters the hull module under it.
  - Over an empty column it drifts in toward the Core, where the bridge or the Core takes it. A bare stern with no bridge lets bombs reach the Core.
  *Reason: gives the stern and the upper deck their jobs. The stern catches bombs; upper modules are both exposed and protective.*
- **Sweeps and the rest.**
  - A raking sweep hits up to three modules along a deck. A bombing sweep hits the top of every column on one side.
  - Broadsides hit the front of each deck. Rams hit the prow.
  - Storm Queen's gale shoves the prow pair, then the stern-end pair, then the upper deck's front pair past each other.
  - Downdrafts let you jettison a module at the prow, the stern end or the front of the upper deck.
  *Reason: every attack names an exact, previewable target on the grid.*
- **Positional parts.**
  - **Harpoon Gun:** Chain Feed now powers the weapon bolted directly **on top** of it, as in the original card.
  - **"Buried"** now means covered from above and not at the front. It drives the Bulkhead (armor) and the Powder Store (Deck Cannon).
  - **Telescope and Lightning Rod:** need open sky above them.
  - **Propeller:** works at the stern end of either deck.
  - **Repair Bay and Clockwork Heart:** count as attached to the Core in the hull slots beside it or on the bridge.
  - **Swaps:** work with any touching module, up and down included.
  *Reason: "on top" and "touching" now mean something visible.*
- **Deflector Vane.** Bracing now takes 3 off the next hit on the Vane or any module touching it, instead of negating a whole section. *Reason: the bot found a stalemate. Bracing every turn negated every hit forever, even from an Enraged boss.*
- **Starting ships.**

  | Core | Start |
  | --- | --- |
  | Airship | Propeller (stern 1), Harpoon Gun (bow 1) |
  | Battleship | Brass Plating (bow 1), Deck Cannon (bridge) |
  | Zeppelin | Mortar (stern 1), Gasbag (bow 1) |
  | Clockwork | Crew Quarters (stern 1), Harpoon Gun (bow 1) |

  *Reason: every Core starts with a bow, so direct fire doesn't go straight into the Core, and a weapon that can fire.*
- **Re-tune.** Zeppelin Durability 6 → 8 and Bombard 1½ → 1¾ damage per Pressure. The Clockwork starts with Crew Quarters instead of a Repair Bay. *Reason: under the grid the Zeppelin dropped to ~30% and the Clockwork's Repair Bay start pushed that part to 60% of winning ships. All Cores are now 35-49% over 3 seed sets, and no part is on more than 49% of winning ships (BALANCE_REPORT.md).*

## One pixel-art style for every sprite

- **Everything on screen shares one pixel grid.** Ships are painted at a low "art pixel" resolution and scaled up unsmoothed, at a pixel scale chosen per screen (in half steps, so pixels stay even). Both ships use the same scale, and the effects are painted on a matching low-resolution layer. *Reason: the painted ship sheet, the pixel parts and the pixel effects clashed at different sizes and softness.*
- **Every sprite is normalised.** It is shrunk in steps, its soft edges are hardened, and it gets the same one-pixel ink outline, whichever sheet it comes from. *Reason: pieces from three sheets read as one set.*
- **Your ship is a side-on cutaway.**
  - The hull is drawn as a true side-on profile: planked wood, riveted iron, trimmed or copper, depending on the Core. It has a raked transom, a prow with a ram spur, a rail, a rudder and a stern propeller.
  - Hull modules sit in open bays. Upper modules stand on the deck.
  - The Core is a riveted boiler with a glowing firebox and a live gauge in the middle bay. A funnel puffs steam when the bridge is empty.
  *Reason: the sheet's hull pieces are drawn at a top-down 3/4 angle and looked wrong stretched under side-on modules.*
- **Envelopes are drawn side-on**: one long cigar-shaped gasbag with tail fins and gore seams, in the Core's colours (green-banded Airship, red-striped Battleship, blue emblem Zeppelin, net-wrapped Clockwork). *Reason: the sheet's balloons are tilted ovals and looked crooked.*
- **Every module uses a steampunk-parts sprite** (only the Tesla Coil and Lightning Rod are hand-drawn pixel art). There are no more coloured mount blocks. Damage shows as cracks, and the Durability pips sit under hull bays and over upper modules. *Reason: no mix of drawn shapes and sprites on one ship.*
- **Pirate gunships, skiffs, bombers and the Storm Queen are assembled** from the same hulls, envelopes and parts, mirrored to face you. The four finished ships from the sheet (Cutter, Monitor, Flagship, Leviathan) are pixelated at the same scale. *Reason: the enemies match your ship.*
- **Markers stay sharp.** Selection, target brackets with the incoming damage, synergy outlines and the square brass install bolts are drawn at full screen resolution over the pixels. *Reason: the readable UI stays crisp.*
- **The card view is a 7 × 2 grid** that mirrors the ship. The upper deck is above the hull, stern columns S3–S1, the Core, then bow columns B1–B3. Insert tabs sit between hull cards and install buttons in free upper slots. *Reason: the cards and the flight view show the same layout.*

## Whole-ship sprites, and a Shipyard for building

The cutaway with parts-sheet modules on the hull didn't work, so the two jobs are now split. *Reason: you asked for the ship sprites and effects in the flight view, with building in its own section.*

- **The flight view shows whole ships from the ship sheet, plus the effects.** Your Core picks your ship, facing the enemy:

  | Core | Ship | Ensign |
  | --- | --- | --- |
  | Airship | Sailing airship | Red cross |
  | Battleship | Dreadnought | Blue |
  | Zeppelin | Galleon under its gasbag | Green |
  | Clockwork | Ironclad, copper-washed | Star |

  The ship grows a little with each module you install. It still flashes when hit, smokes and burns where damaged modules sit, and lunges, dodges and falls. *Reason: the sheet's finished ships look right; bolted-on part sprites didn't.*
- **Modules are mapped to points on the sprite.** Shots, hits, explosions and the intent's target brackets land at a module's place along the ship: its column, and its hull or upper deck. *Reason: positional play stays visible in the flight view without drawing the parts.*
- **Pirates fly the same four ships in their own liveries.** Each enemy has a colour wash, a size and a flag (Jolly Roger for the pirates). The Storm Queen crackles with lightning, and the Leviathan and Colossus burn harder each phase. *Reason: one consistent sprite set; the assembled ships used the parts sprites.*
- **The Shipyard panel is where you build.** It is always shown under the flight view: the 7 × 2 card grid, upper deck over the hull, stern to bow.
  - Install slots and + insert tabs show the preview on hover (or on the first tap on a phone) and install on click.
  - Tapping a card shows its rules and actions (fire, use, swap, vent, scrap, sell, detach). Cards with a synergy to the selected card get a green outline.
  - The old install bolts and module popovers in the flight view are gone; tapping your ship in the flight view selects the Core.
  *Reason: building needs room and clear slots, not a crowded hull.*
- **Part offers no longer show a part portrait**, and the steampunk-parts atlas only loads if something asks for it. *Reason: those were the parts sprites that weren't working.*

## Fire, lightning and glue effects

- **New sprites, cut from your latest uploads.** From the second effects sheet: three small and three large flames, and a lightning crack. From the effects board: three painted lightning bolts (forked, jagged, chain), a glob of glue, a glue spray, napalm and two sticky-fire splashes. The board is a JPEG on a navy grid, so `tools/build_sprites.py` keys its background out. Lightning keeps its glow; everything else drops the dark blue. All of them go into `assets/art/fx.png`. *Reason: use the provided art for the three status effects.* The board's sticky mesh lost its thin strands when keyed, so it is left out.
- **Fire.**
  - A burning module (or Core) carries a flickering flame for as long as it burns.
  - A Burning enemy carries one to three large flames, by its Burn stacks.
  - Fire landing on you splashes napalm, each burn tick flares, and your Flamethrower's hits leave napalm on the enemy.
  *Reason: you can see what is burning at a glance.*
- **Lightning.**
  - Tesla Coil shots and the Storm Queen's lightning are painted bolts stretched from gun to target, flickering between the three shapes.
  - Hits crack with lightning at the point of impact.
  *Reason: the hand-drawn line looked out of place next to the sprite effects.*
- **Glue.**
  - The Glue Gatling and the enemy's tar shots fire a tumbling glob of glue that drips as it flies, and splash on impact.
  - Glued modules carry a glob for as long as they stay glued, and a Gummed enemy carries glue splats until it wears off.
  *Reason: makes Glue and Gummed readable in the flight view.*
- **Housekeeping:** the new uploads are moved to `assets/art/source/` as `fx-sheet-2.png`, `effects-board.jpg` and `arsenal-board.jpg`. The arsenal board isn't used yet.

## The fleet, three new skies and the brass UI kit

- **Every Core and every enemy now flies its own ship.** The ships are cut from your fleet sheets (`assets/art/source/ships/`). In each panel the big ship is lifted off its dark backdrop by flood fill, including the pockets trapped between rigging lines, and packed into `assets/art/ships.png`. *Reason: the sheet's four ships had to be shared, so the Battleship and the Leviathan were the same dreadnought.*

  | Core | Ship |
  | --- | --- |
  | Airship | Zephyr Scout |
  | Battleship | Iron Nautilus |
  | Zeppelin | Sky Voyager |
  | Clockwork | Clockwork Caravan |

  | Enemy | Ship |
  | --- | --- |
  | Pirate Cutter | Crimson Comet |
  | Scavenger Skiff | Scarlet Drifter |
  | Corsair Gunship | Gilded Sparrow |
  | Bomber Dirigible | Scarlet Caravan |
  | Clockwork Sentinel | Aether Drill Platform |
  | Dread Corsair Flagship | Sky Goliath |
  | Armored Monitor | Celestial Harvester |
  | Iron Leviathan | Ironclad Leviathan |
  | Storm Queen | Voltaic Sky-Whale, tesla coils crackling |
  | Clockwork Colossus | Galleon of Gears |

  The sky-map marker is now your Core's ship.
- **Three new paintings are skies.** *Reason: the Storm Front and the Lair were still procedural.*
  - `storm-mesa.jpg`, the cloud-sea mesa with a crackling tesla tower, is now behind every Storm Front, under the rain and lightning flashes.
  - `canyon-city.jpg`, the fortress city in a canyon at dusk, is the backdrop for Pirate Lairs and the boss fight.
  - `rail-yard.jpg`, the smoking rail yard, joins the canyon foundry: the smog leg picks one of the two each time.
- **The brass UI kit** (`assets/art/source/ui-brass-kit.png`, cut to `assets/art/ui/`). *Reason: brings the page itself into the steampunk look.*
  - Ornate brass corners frame the flight view.
  - Shipyard cards sit on riveted plates: copper for weapons, iron for defenses and the Core, and a tall plate for the rest.
  - Rarity tags carry a gem: brown for common, blue for uncommon, red for rare.
  - The Core's Durability in the header is a brass gauge bar.
- **Not used yet:**
  - The six-ship side-view pack. Its painted style doesn't match the pixel fleet.
  - The black Obsidian ships. They can't be lifted cleanly off their dark panels.
  - The ships' small animation variants and the crew and item pieces on the fleet sheets.
  - The UI kit's header bar.
  - The three UI mock-up boards (`ui-mockup-*.jpg`), which are flattened screens rather than separate pieces.
- **Fixed: badly cut ships.** The first cut used a fixed box inside each panel's frame, but the big ships overhang their frames. The Ironclad Leviathan lost its tail fins, the Sky-Whale its tail and top, the Sky Goliath its top and side, and the Clockwork Caravan and Drill Platform their left ends. Specks of backdrop were also left around the drill.
  - Each ship is now cut from the whole quarter of its sheet, below the title and left of the small variants.
  - The panel's frame lines are removed only where they run (the same bands on every sheet), and only their dull grey pixels.
  - Bigger pockets of backdrop and leftover thin strips are dropped.
  - Tall enemies are also scaled to clear the top of the flight view.
  *Reason: the ships must be whole and clean.*
- **Riveted wall textures** (your three latest uploads, now `assets/art/ui/wall-*.jpg`). The plain plate wall sits behind the whole page, darkened so panels and text stay readable. The gear-work wall sits behind the header. The bright brass-and-copper wall is kept for later. *Reason: the page around the game now matches the steampunk art.*
- **Fixed again: ship cut-outs.** The recut was worse: a fixed colour tolerance of 22 treated the ships' near-black outlines as backdrop and stripped them, leaving ragged edges. The wider cut also picked up the faint silhouettes painted outside the frames.
  - The tolerance is now measured per panel from the backdrop's own noise (about 8–13), sampled from the flattest of several empty patches, so overhanging ships can't skew it.
  - Outlines are kept.
  - Separate pieces whose centre lies outside the frame, and the frame's corner marks, are dropped.
  *Reason: clean, whole ships with their pixel outlines.*

## Ships from the keyed sheets

- **Every ship now comes from your chroma-keyed sheets** (`assets/art/source/ships-keyed/`). They sit on flat magenta or green, so `tools/build_sprites.py` keys them with a soft key and pulls the backdrop's tint out of the edge pixels (despill), with no flood fills or frame lines. The old fleet-sheet cuts are gone from the atlas. *Reason: the dark-panel sheets could never be cut cleanly; these come out whole, with clean outlines and no fringes.*

  | Core | Ship |
  | --- | --- |
  | Airship | Small orange airship |
  | Zeppelin | Big striped zeppelin |
  | Battleship | Armoured gunship |
  | Clockwork | Clock-faced rotor ship |

  | Enemy | Ship |
  | --- | --- |
  | Pirate Cutter | Gold winged racer |
  | Scavenger Skiff | Bat-wing skiff |
  | Corsair Gunship | Cannon galleon |
  | Bomber Dirigible | Swirl-bag bomber |
  | Clockwork Sentinel | Wheel with its drone |
  | Dread Corsair Flagship | Striped flagship |
  | Armored Monitor | Ironclad |
  | Iron Leviathan | Spiked warship |
  | Storm Queen | Sky-whale |
  | Clockwork Colossus | Multi-rotor fortress |

  The other 70-odd ships on those sheets are spares, a one-line change in `KEYED_CUTS` each.

## Ship choice, two new classes, three weapons, two new locations

- **Pick your ship.** After choosing a Core, you pick one of eight ships from the keyed sheets. Any Core can fly any ship; each Core suggests its own, and every ship has one small trait. *Reason: you asked to choose the ship; the trait makes the choice matter without overshadowing the Core.*

  | Ship | Trait |
  | --- | --- |
  | Courier | −1 Weight |
  | Bulwark | +2 Core Durability |
  | Merchantman | +20 starting cogs |
  | Chronometer | repair 1 Core after every fight |
  | Corsair Rocket | +1 Steam on each fight's first turn |
  | Stormrider | lightning deals 1 less to you |
  | Salvage Barge | +4 cogs per win |
  | Survey Ship | +1 sight |

- **Privateer Core (Raider).** Weight 1, Durability 9, Steam 4. Starts with a Repair Bay and a Grapnel Launcher.
  - **Plunder:** every win pays 6 more cogs, and shop parts are 15% cheaper.
  - **Boarding Party** (2 Steam): strip all enemy Block, then deal 2 damage that ignores Block.
  *Reason: a class built around beating Block-heavy enemies and money.*
- **Tempest Core (Stormcaller).** Weight 2, Durability 10, Steam 5. Starts with a Sprinkler Tank and a Rocket Battery.
  - **Static Build-up:** every hit you take gains 1 Charge, and lightning gains 2 (max 8).
  - **Arc Discharge** (1 Steam): spend all Charge for 3 + Charge damage that ignores Block.
  *Reason: a class that turns taking hits into a big payoff, so it plays differently from the rest.*
- **New weapons.**
  - **Grapnel Launcher** (common, 1 Steam): strip all Block, then deal 1.
  - **Rocket Battery** (uncommon, 2 Steam): three 1-damage rockets. Block stops them one at a time, and Choking adds to each.
  - **Flak Cannon** (uncommon, 1 Steam, arcs): deal 1, and the enemy's next attack this round deals 2 less (stacks to 4).
  *Reason: answers to Block and to big telegraphed hits.*
- **New locations.**
  - **Derelict Hulk** (Salvage): board a dead warship. A booby trap; a collapsing deck (risk 3 Core for a rare part); survivors who repair you; a strongbox; an armory (pick 1 of 3); or an intact engine room.
  - **Aether Rift** (Hazard, under the night sky): a lash; a time slip (pay 10 cogs or take 2); an echo (+1 max Durability on a module); a bargain (2 max Core for a rare part); clear sight; or rare treasure.
  *Reason: more variety on the map, with risk-reward choices.*
- **Balance.** Pirates gain Durability a little faster along the route (+10.5% per column, was 8%), because the new events and weapons made runs easier. A heavier Bulwark hull let the Battleship ram far too hard, so it gives Durability instead. All six classes now win 36–48% over 3 seed sets (BALANCE_REPORT.md).

## Combat buttons by the flight view, and steadier map pacing

- **The round's action buttons sit directly under the flight view.** The enemy's card and next move follow below them. *Reason: you can watch the shots and hits while you click, instead of scrolling between them.*
- **Every route keeps fighting.** A route could chain traders, guilds and hazards and reach the boss with one or two fights (about 1 map in 5; non-fight runs of up to 10). Now no route has more than 2 non-fight stops in a row (`BALANCE.maxCalmRun`), or more than 5 in all (`BALANCE.maxCalm`). A stop that would break either becomes a Pirate Patrol. The guaranteed mid-route trader and the Sky Dock before the boss stay, so a 3-in-a-row run can still happen through one of them. Over 2,000 maps, every route now has 5–7 fights. *Reason: runs need their fights for cogs, parts and challenge.*
- **Pirates gain Durability a little slower again** (+8% per column, was 10.5%). The guaranteed fights made runs harder; all six Cores now win 37–49% over 3 seed sets. *Reason: keep the target win rate.*

## Three ships per class

- **Each class now has three ships of its own** instead of one shared list of eight. The picker after choosing a Core shows only that class's ships, with its classic ship marked. Every ship keeps one trait. The ships are new cuts from the keyed sheets, picked to suit the class; the Salvage Barge and Survey Ship are retired. *Reason: you asked for a different choice of ships for each class.*

  | Class | Ships (trait) |
  | --- | --- |
  | Airship | Courier (−1 Weight), Sky Kite (+1 sight), Copper Comet (+1 Steam on turn one) |
  | Battleship | Bulwark (+2 Core), Ironside (repair 1 Core after fights), Black Sail (+4 cogs per win) |
  | Zeppelin | Merchantman (+20 cogs), Crane Galleon (+4 cogs per win), Harlequin (−1 Weight) |
  | Clockwork | Chronometer (repair 1 Core after fights), Twin Clock (+1 sight), Gearwheel (+2 Core) |
  | Privateer | Corsair Rocket (+1 Steam on turn one), Patchwork (+4 cogs per win), Sail Raider (−1 Weight) |
  | Tempest | Stormrider (lightning −1), Crystal Pagoda (+1 Steam on turn one), Star Pagoda (+2 Core) |

## Painted card art, Core portraits and map icons

- **Part pictures** (`assets/art/source/ui/part-cards.png`, cut by `tools/build_ui_art.py` to `assets/art/cards/`).
  - Every Shipyard card shows its part's picture behind the name and Durability pips, and every loot, contract and shop offer shows it beside the name. *Reason: you see what each module is at a glance.*
  - Matched by picture where the label was off: the brass boiler labelled "Sprinkler Tank" is the Auxiliary Boiler; the red tanks labelled "Air Scrubber" are the Sprinkler Tank; the mesh filter labelled "Clockwork Heart" is the Air Scrubber; and the gold heart with a blue gem labelled "Ovekpressure Valve" is the Clockwork Heart.
  - **Still missing:** the Supply Hatch has no picture, and its cards stay plain.
- **Core portraits** (`core-portraits.png` → `assets/art/cores/`). The six paintings head the class cards on the title screen and fill the Core's card in the Shipyard.
- **Map icons** (`map-icons.png` → `assets/art/icons/`). Every sky-map node is its painted round icon, masked to the brass ring: the ten encounters, the boss, Uncharted and Cloud cover. The legend keeps the small line icons.
- **Fixed:** nodes in crowded map columns could overlap. Their random nudge is now small enough that they never do; the dice rolls are unchanged, so seeds give the same routes. The "Locked" note on the Clockwork card now sits over its painting.

## Status icons, event banners, skies, gulls, dice and debris

All cut from `assets/art/source/ui2/` and the full-size sky paintings by `batch2()` in `tools/build_ui_art.py`.

- **Status and stat icons** (`assets/art/status/`). The HUD (hull, cogs, steam, pressure, Charge), module tokens and enemy status chips use the painted icons instead of glyphs.
- **Event banners** (`assets/art/scenes/`). Events, the Sky Dock, the Trading Zeppelin and lair and boss fights open with a painted banner. The baked-in label at the bottom of each painting is cropped off, because the panel shows the name.
- **Skies** (`assets/art/skies/`). All eleven paintings are biome backdrops. The clear sky has its own painting. Smog, sunset, night and the lair pick from more paintings. The Derelict Hulk, Aether Rift and Sky Dock now have their own biomes. Victory and defeat end on their own skies.
- **Gulls.** Birds in the clear and sunset skies use the eight seagull frames.
- **Dice.** Rolled dice show the painted brass-cornered faces. The drawn pips stay as a fallback while the images load.
- **Debris and cogs.** Hits throw painted scrap (gears, bolts, shards, a wrench for repairs) instead of drawn shapes. Cog rewards spray spinning coins.
- **Unlock badges.** The title screen's unlocks show the badge art.
- **Still missing:** enemy portraits, enemy move icons and a full-size distant-airships layer. `bits-a.png` is an alternate copy of the bits sheet and is not used.

## More music, the Supply Hatch card, a painted sky chart and the second UI kit

- **Music.**
  - Fights take turns between Pirate Battle 2, 4 and 5, so back-to-back fights don't repeat the same track.
  - Winning a fight plays Victory at Sea while you choose spoils.
  - Winning the run plays Victor's Trumpet Call.
  - Defeat plays Pirate Defeat instead of a slowed, muffled cut of the roaming track.
  - Each track has an AAC copy for Safari, like the first three.
- **Supply Hatch** now has its card picture. (Grenadiers still has none; its cards and battle button show its short name.)
- **Sky map.**
  - The route is drawn on the painted sky chart, with each biome band's colour blended over it.
  - The chart's brass frame stays fixed while the route scrolls beneath it.
  - The frame's middle gears are painted out so its bars stretch cleanly.
- **Second UI kit.**
  - Part offers fly a pennant for the part's type (rocket for weapons, tower for defence, wrench for support, gear for utility) and a banner in the rarity colour (grey, blue, red, matching the gems).
  - Locked Cores show a padlock.
  - The Settings button has the brass gear.
- **Map icons, repainted.** The new sheet is in full colour and shows skyships, not sea ships. The ring centres moved on it, so the cutter now finds each brass ring by fitting a circle. Nodes are a little larger on desktop to show the detail.
- **Still missing:** enemy portraits, enemy move icons and a full-size distant-airships layer.

## Pop-up battle layout (test)

*Reason: in battle you had to scroll between the flight view, the turn panel, the enemy panel and the Shipyard, so the shots played out of sight.*

- **The flight view is the board.**
  - In battle it grows to fill most of the window. On phones it fills the screen and scrolls into place when a fight starts.
  - The whole battle fits in one window, with nothing below it to scroll to.
- **Module buttons.**
  - A round button sits on every module of your ship, showing its picture and Durability.
  - Modules you can use this turn glow gold. Modules the enemy's move will hit have a red ring.
  - Tapping one opens a menu right there with its rules and its actions: fire, aimed shot, use, swap, vent.
  - The menu closes when you act, so the animation plays in full view.
- **Ship and enemy menus.**
  - Tapping the hull opens the Core's menu: its ability and Evade.
  - Tapping the enemy, or its tag, opens its card: durability, statuses, the next move and the tactics table.
  - Tapping empty sky closes any menu.
- **Action bar** along the bottom of the view: Core durability, Steam (plus Pressure or Charge), the Core ability, Evade, **Ship** and **End turn**.
  - **Ship** opens the full Shipyard grid as a sheet. An action taken there closes the sheet.
- **Targeting** works on the buttons too. Using the Repair Bay highlights the modules it can reach, and a banner at the top offers Cancel.
- **Phones:** menus open as a panel just above the bar, and your ship is drawn larger so its buttons are easy to hit.
- **Settings → Battle layout** switches back to the old panels below the flight view.

## Single screen for the whole run

*Reason: the pop-up battle layout worked, so every other step now plays the same way, without scrolling.*

- **The page never scrolls during a run.** The flight view fills the window under the top bar.
- **Every step's panels float over the flight view** in a window: part picks and installs, the sky route, events, the Sky Dock, the Trading Zeppelin, and the end of the run.
  - The window keeps to the lower part of the view, and your ship is drawn in the space above it.
  - **Hide** folds the window down to its title bar so you can watch the scene. It opens again at each new step.
- **Top-bar buttons**, with icons from the second UI kit:
  - **Map** opens the sky route at any time. You can read every node but not set a course. On the route step itself it just reopens the window.
  - **Ship** opens the full Shipyard grid. Where the window already holds the Shipyard (picks, events, docks, trading), it scrolls to it instead.
  - **Log** opens the ship's log. A red count shows how many new lines there are since you last looked.
- **The log panel beside the view is gone** in this layout. On phones the top bar shrinks to a brand row with icon buttons and a row of stats.
- **Settings → Screen layout → Classic (scrolling)** brings back the old page.

## Three areas and the portals between them (expansion step 1)

- **A run now crosses three areas, each with its own route and boss:** the Open Skies (Area 1, unchanged: 11 columns and a boss), the Aurora Reaches (Area 2) and the Blood Moon (Area 3), each 10 columns and a boss. Each area rolls a different boss at the start of the run. *Reason: a longer run with a build that has to carry across very different skies.*
- **Beating an area's boss opens a portal.** First comes a boss bounty (30 cogs) and a pick from 3 elite-grade parts. Then the boss's wreck tears the sky open into a swirling vortex. *Reason: a clear, celebratory break between areas.*
- **Crossing the portal:**
  - Your ship is drawn into the vortex. It fills the screen and the view warps in wavering strips.
  - At its heart the next area takes over: its sky crossfades in and its map music starts.
  - The vortex then closes behind you.
  - Every installed module comes along, and the Core is fully repaired.
  - The portal's colours hint at what's on the other side: emerald and violet for the Aurora Reaches, crimson for the Blood Moon.
  *Reason: the transition you asked for, and a reward for clearing an area without undoing your build.*
- **Later areas are tougher:** pirates there have more Durability and hit harder, and bosses have more Durability. The header shows the area's numeral before its route, and the map names the area. *Reason: a carried-over ship needs bigger threats.*
- **For now Areas 2 and 3 borrow Area 1's pirates and its two other bosses,** scaled up. Steps 3 and 4 give them their own enemies, bosses, mechanics, places and looks.
- **Fixed:** the screen shake had no cap, so one huge hit could shake the view off its frame for half a minute. It now tops out at 32.
- **Saves from before the expansion are not loaded** (new save key). *Reason: they have no areas.*

## Legendaries (expansion step 2)

- **Every boss now drops a legendary.** After an area's boss goes down, its wreck offers a choice of the 2 legendaries in its own pool (or neither), then the usual spoils. *Reason: a boss kill should change your build.*
- **The first time you beat a boss, its legendaries are unlocked for good.** From then on they can turn up as very rare loot (0.6% of normal rolls, 3% of elite rolls). *Reason: a lasting reward that also makes later runs different.*
- **Area 1's pools:**

  | Boss | Legendary | What it does |
  | --- | --- | --- |
  | Iron Leviathan | Leviathan Plating | Armor that cuts 2 off every hit. Half of all the damage your ship blocks in an enemy attack (armor and Deflector braces) is flung back at the attacker. |
  | Iron Leviathan | Dreadnought Cannon | 5 damage that pierces 2 of the enemy's defence layers, then a 2-turn cooldown. |
  | Storm Queen | Gale Engine | Your first 3 Swaps each turn are free, and every Swap crackles at the enemy for 1 piercing damage. |
  | Storm Queen | Storm Heart | +1 Steam a turn, and lightning strikes the enemy for 2 piercing after every enemy turn. |
  | Clockwork Colossus | Grand Mainspring | Your weapons deal +1 per round of a fight (up to +4), but a round without firing lets it run down. |
  | Clockwork Colossus | Titan's Fist | Deals damage equal to your ship's Weight (at least 3), and rams against you deal 2 less. |

  *Reason: each is themed on its boss's gimmick (armor, gale and lightning, wind-up and weight), and each points a build in a new direction.* The Aurora Archon's and Crimson Sovereign's pools arrive with their areas.
- **The enemy's defences are now layers,** met outermost first: Wards (each stops one whole hit; these arrive with Area 2), Block, then Armor (a flat cut from every hit; the Leviathan's Ironclad Hull is Armor 1). "Pierce" still skips Block and Armor; "pierces N layers" skips the first N present, Wards included. *Reason: gives "pierces 2 layers" a precise meaning, and sets up Area 2's illusions and crystals.*
- **Legendaries look the part:**
  - A doubled gold frame that breathes with light, with a sheen sweeping across it, on cards and offers.
  - A gold ★ rarity tag and a gold banner.
  - A gold ring on its battle button.
  - In flight, a golden aura with circling motes where the module sits on your ship.
  *Reason: you asked for a unique frame and a glowing installed visual.*
- **Card art drawn in code.** None of the legendaries had card art, so each gets an illustration painted in code (`js/artgen.js`) in the cards' style: an outlined brass-and-iron emblem on a ray-lit backdrop. Gas Grenadiers, the one part that had no picture, now has one too. *Reason: build matching visuals in code where there's no art.*

## Area 2: the Aurora Reaches (expansion step 3)

- **The area.** Ten columns of emerald, teal and violet night sky:
  - Aurora curtains overhead, crystal islands, slowly turning rune circles and drifting star-dust.
  - The sky chart turns aurora-blue, and the UI accent turns teal.
  - The map and dock music shift to the menu theme, and the combat and boss music are tuned for the area.
  - Patrols are "Spell Patrols", lairs are "Arcane Bastions", and beacons are "Glimmering Lures".
  - Area 1 parts can still drop, but Area 2's own parts are weighted ×4 in its loot.

  *Reason: the brief's palette and presentation for each area.*
- **Resonance.**
  - Arcane modules (every Area 2 part, plus the Archon's legendaries) gain 1 Resonance when used or hit.
  - At the start of each of your turns, Resonance spreads: a module with 2 or more passes 1 to each arcane neighbour that has less.
  - When a module reaches 3, it casts its spell and drops back to 0:
    - Weapons cast **Arcane Bolt**: 2 damage that ignores Block and Armor.
    - Defense modules cast **Aegis**: repair 1 on itself and every module touching it.
    - Supports and utilities cast **Surge**: +1 Steam.
  - Pips above each module show its Resonance.

  *Reason: "builds when used or hit, flows to adjacent modules, a fully resonant module casts a bonus spell". Adjacency matters on a two-deck grid, so where you place arcane parts is the puzzle.*
- **The aurora.** In every Area 2 fight, the aurora rolls a colour at the start of your turn. The sky's curtains take that colour, and a chip on the battle bar says what it does:
  - **Emerald:** weapons deal +1.
  - **Teal:** defense modules take 1 less from every hit.
  - **Violet:** supports and utilities cost 1 less Steam, and each gains 1 Resonance.
- **Parts.**

  | Part | What it does |
  | --- | --- |
  | Rune Cannon | 2 Steam, arcs. Deals 1, plus all the Resonance on the modules touching it (up to 7). |
  | Crystal Ward | Armor that cuts every hit on it by 1. Every hit throws a 1-damage shard at the enemy, and its destruction throws 3. |
  | Star Sail | +1 Steam a turn for each neighbour with 2+ Resonance (up to +2). Weight −1. |
  | Mana Lens | Once a turn, doubles the next spell cast by a module touching it. |
  | Prism Array | 1 Steam. Your next shot this turn splits across every layer: it shatters all Wards and illusions, strips all Block and ignores Armor. |

- **Enemies.** Each has full d6 tables for every phase, and each has its own pixel ship and a glowing magical wash.

  | Enemy | What it does |
  | --- | --- |
  | Glimmer Wisp | Fragile (13). It shimmers behind a new Ward every turn (up to 2), and Siphon Light steals your Resonance. |
  | Arcane Corvette | Hex tokens invert a module until the end of your next turn: a hexed weapon heals the enemy, hexed armor takes +1, a hexed repair wounds, and a hexed boiler drains Steam. Venting clears a Hex. |
  | Crystal Barge | A tank. It starts with Armor 1 and grows 1 more each turn (up to 4), shown as crystal spikes. |
  | Mirage Galleon | Conjures illusion copies (ghost ships beside it). Each illusion takes one whole hit before the real ship can be struck. |

- **The Aurora Archon** (boss, 3 phases):
  1. **Runefall:** runes strike every module on a telegraphed deck, past armor.
  2. **Prismatic Shift:** the aurora turns twice a round. It rolls on your turn, then the Archon copies whatever is empowered on its own turn: Emerald gives its attack +2, Teal gives +5 Block, Violet heals 3 and adds a Ward. Its intent plate shows what it will copy.
  3. **Grand Convergence:** it charges for 2 turns behind 4 focus crystals. Breaking every crystal collapses the spell and stuns it. Otherwise the blast hits every module (Evade dodges it).

  Its pool:
  - **Aurora Crown:** an aurora follows you into every fight, and you choose its colour each turn.
  - **Archon's Lance:** deals all the Resonance on your ship (at least 3) as piercing damage, then spends it.
- **Points of interest:**
  - **Aurora Shrine:** offer a module to the aurora for a run-long blessing, by the module's type. A weapon gives +1 weapon damage, defense gives +4 max Core Durability, and anything else gives +1 Steam a turn.
  - **Enchanter's Spire:** enchant a module. It gains +1 max Durability and starts every fight with 2 Resonance, and it becomes arcane if it wasn't.
  - **Star Chart:** reveals the whole area's route and the Archon's tactics table. In later areas the boss's tactics stay hidden until charted.
- **Art in code.** The Area 2 parts, the Archon's legendaries, and the three new place icons and banners are painted in `js/artgen.js`. The Area 2 ships are cut from your keyed ship sheets.

## Area 3: the Blood Moon (expansion step 4)

- **The area.** A crimson night, ten columns long:
  - A vast red moon hangs low in the sky, with craters and a glow that swells as the moon gauge rises.
  - Gothic cathedral spires float in the clouds, alongside drifting wrecks.
  - Bat flocks pass overhead, ash falls, and red fog rolls low across the scene.
  - Enemy ships are rimmed in red moonlight.
  - The chart turns blood-red with falling ash, and the UI accent turns red.
  - Patrols are "Night Hunters", lairs are "Gothic Keeps" and beacons are "Bleeding Beacons".
  - The music shifts to the roaming theme slowed and darkened on the map, and to the demon riff in combat and the boss fight.

  *Reason: the brief's palette and presentation.*
- **The Blood Moon gauge** (0–6) rises 1 each round of an Area 3 fight and wanes 3 after each fight, so it builds across the area.
  - **2+:** enemies deal +1.
  - **4+:** enemies are aggressive: a rolled move that isn't an attack is rerolled once.
  - **6:** Frenzy. Enemies deal +2, and every hit leaves 1 Bleed.

  The gauge sits on the battle bar and in the top bar.

  *Reason: "fills each turn of combat; enemies grow stronger and more aggressive; frenzy at full". Carrying it between fights makes the Moon Well and fast kills matter.*
- **Bleed** is a stacking token. At the start of your turn it deals damage equal to its stacks, then loses 1. Venting clears it. Enemies can bleed too, ticking at the start of their turn.
- **Blood costs.** Blood parts take their Blood cost from your Core's Durability on top of any Steam, and can't be used if that would kill the Core.
- **Parts:**

  | Part | What it does |
  | --- | --- |
  | Blood Harpoon | 1 Steam, Blood 1: deals 3, and your Core heals half the damage that lands. |
  | Thorned Hull | Armor that cuts each hit by 1. Whatever hits it gains 2 Bleed. |
  | Sanguine Engine | Blood 1: +2 Steam, once a turn. |
  | Crimson Altar | 1 Steam, once a fight: sacrifice a touching module. Your weapons deal +1 for the rest of the run, and the Core heals what the module had left. |
  | Moon Mortar | Arcs. Deals 2, +1 per 2 points of the moon (up to 5). |

- **Enemies.** Each has d6 tables for every phase.

  | Enemy | What it does |
  | --- | --- |
  | Bat Swarm | Light and fast. Raking fang storms where every hit bleeds. |
  | Wraith Clipper | Phases out on odd rounds: your hits pass through, but Bleed and Burn still tick. Drawn translucent while phased. |
  | Bone Galleon | Bone plating (Armor 1). The first time it sinks, it rises again at half Durability. |
  | Blood Cultist Barge | Heavy Bleed, and it heals from every point of Bleed damage your ship takes. |

- **The Crimson Sovereign** (final boss):
  1. **Blood Tithe:** Bleed barrages, and swarms of bats that circle her. Each bat stops a whole hit, and each bites a random module for 1 and 1 Bleed at the start of her turn.
  2. **Crimson Tide:** the moon swells to full and locks there. She drains 1 from every module (past armor) and heals what she takes.
  3. **Eclipse:** the moon goes black, the screen runs dark red, and every other turn she fires a Blood Beam. It is telegraphed on a deck and deals 10 plus the moon's +2 to the front of that deck. Put armor there, brace it, Evade, or kill her first.

  Her pool:
  - **Sovereign's Chalice:** whenever the enemy takes damage, your Core heals 1 (up to 3 a turn).
  - **Eclipse Blade:** Blood 2. Deals 6 piercing, +1 per Bleed stack on your ship and the enemy.
- **Points of interest:**
  - **Blood Altar:** bleed 4 Core for a pick of 2 rare parts, or 8 for a pick of 2 legendaries.
  - **Crypt Wreck:** search it and roll a d6. On a 1–2 a Bone Galleon or a Bat Swarm ambushes you, with salvage if you win. A 3 bleeds a module but offers a pick of 3 parts; 4 gives cogs, 5 an armory pick, and 6 a rare part.
  - **Moon Well:** the moon wanes to 0, and its water mends the Core by 2.
- **Art in code.** Card art for the five parts and two legendaries, plus map icons and banners for the three places, are painted in `js/artgen.js`. The ships are cut from your keyed sheets.

## The Workshop (expansion step 5)

- **A hub between runs.** The title screen is now the Workshop:
  - The hangar deck painting, with your last ship berthed on it, gently bobbing.
  - A display bay shows the same ship, with how its run ended.
  - Your Blueprints and lifetime records.
  - Tabs: Hangar, Upgrades, Parts, Logbook, Legendary Vault, and Livery & honours.

  *Reason: "a hangar scene with your last ship on display".*
- **Blueprints** come from every run, win or lose:
  - 5 for flying.
  - +15 per area cleared.
  - +10 per boss sunk, and +10 more for a boss's first kill.
  - +4 per contract and +1 per elite.
  - +10 for a victory, and +5 more per Storm Tier.

  The end screen shows the ledger line by line.
- **Spending Blueprints:**
  - **Three new Cores** (60, 60 and 80), each with three ships cut from your keyed sheets:
    - **Arcanist** (Resonance). Every module is arcane. Harmonic Pulse adds 1 Resonance to every module.
    - **Sanguine** (Blood). Each weapon hit heals the Core 1 (up to 2 a turn). Bloodletting pays 2 Core for 3 Steam.
    - **Eclipse** (both). Every spell gives the enemy 2 Bleed. Umbral Strike deals 2 plus your Resonance plus the enemy's Bleed, piercing.

    The Clockwork Core is now bought too (40).
  - **Parts.** New captains start with a smaller pool. 16 parts must be drafted (12–30 each) before they appear in loot, shops and salvage: the old milestone unlocks, the stronger rares, and half of each later area's parts.
  - **Starting upgrades:**
    - Spare Crate: an extra common part at the start.
    - Pressurised Boilers: +1 Steam on the first turn of every fight.
    - Quartermaster's Ledger: reroll one loot offer per area.

    *Reason: we read "+1 starting steam" as first-turn Steam, because +1 every turn would dwarf the other upgrades.*
  - **The Logbook.** Every enemy and boss met gets an entry: area, stats, times sunk, and its gimmick. Every part seen gets its card. Lore is deciphered for 3 Blueprints an entry, for enemies, bosses and legendaries.
- **The Legendary Vault** shows each boss's pair. Sealed ones say which boss to sink. Unlocked ones show their card, and their lore can be deciphered.
- **Achievements → cosmetics.** Nine honours unlock:
  - Hull paints: Soot Black, Verdigris, Gilded.
  - Balloon colours: Crimson, Aurora, Stormcloud.
  - Core skins: Blood Moon, Sovereign Gold, Starlit.

  Paint washes the whole ship sprite, the balloon colour washes its upper part, and the Core skin recolours the Core's badge and glow. All of them show in flight, on the map marker and in the Workshop.
- **Storm Tiers.**
  - A first full clear opens Tier 1, and each victory at a tier opens the next.
  - Each tier adds one modifier on top of the ones before it: Squall (+10% enemy Durability), Lean Holds (−10 cogs, shops +15%), Hardened Crews (+1 enemy damage), Dread Captains (bosses +20%), Thin Hulls (−3 Core), Black Storm (enemies start behind 3 Block).
  - Each Core's card shows the best tier it has cleared.
- **Saving.** Meta progress is saved under `cardships.meta.v3`, separately from the run save. An old v2 record carries over: its runs, unlocks and legendaries, plus starting Blueprints for its runs and wins.
