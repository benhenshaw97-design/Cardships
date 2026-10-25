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
