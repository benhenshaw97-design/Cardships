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
