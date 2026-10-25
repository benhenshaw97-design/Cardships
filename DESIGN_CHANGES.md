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
