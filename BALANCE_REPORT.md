# Balance report: three-area runs

Tuned with the headless simulator and the greedy bot, across full runs: Area 1 and its boss, Area 2 and its boss, then Area 3 and the Crimson Sovereign.

**Targets, averaged over every Core at the base tier (Storm Tier 0):**

- Area 1 clear: about 60%
- Area 2 clear: about 35%
- Full win: 15–25%

## Method

- `node tools/simulate.js 300` plays 300 complete runs per Core: all 9 Cores, so 2,700 runs, in about a minute.
  - It uses the real rules engine, with every part unlocked.
  - A run's Area *n* is "cleared" when its boss is sunk.
- `BRIEF=1` prints one line per Core: Area 1 / Area 2 / full win.
- `CORES=a,b` limits the Cores. `--tier N` plays at a Storm Tier. `--seed N` picks a different seed set.
- `TUNE='{...}'` overrides any data value without editing files. Arrays are addressed by index, e.g. `{"AREAS":{"2":{"hp":0.9}}}`.
- The bot is greedy, not random. In combat it scores every legal action (expected damage through Wards, Block and Armor; threat avoided; Steam value; Blood cost against Core health) and takes the best.
  - It understands Resonance adjacency, Hex, prisms, the phased Wraith, Bleed (it vents it), and the new Core abilities.
  - It is a reasonable but imperfect player: it never rearranges at the Sky Dock, and it plays the Archon's and Sovereign's telegraphs only as well as its threat estimate allows.
- The final numbers were confirmed on three seed sets (`--seed 1/2/3`).

## Results (Storm Tier 0, 300 runs per Core, seed set 1)

| Core | Area 1 | Area 2 | Full win |
| --- | --- | --- | --- |
| Airship | 62.3% | 31.0% | 17.3% |
| Battleship | 74.3% | 31.3% | 9.3% |
| Zeppelin | 67.7% | 44.3% | 14.3% |
| Clockwork | 54.3% | 37.3% | 22.3% |
| Privateer | 62.3% | 34.7% | 16.3% |
| Tempest | 61.7% | 38.7% | 27.7% |
| Arcanist | 52.0% | 30.7% | 19.7% |
| Sanguine | 52.7% | 25.3% | 14.0% |
| Eclipse | 54.0% | 51.0% | 20.7% |
| **Average** | **60.1%** | **36.0%** | **18.0%** |

On the other seed sets, the averages were 58.6% / 35.7% / 17.3% (seed 2) and 57.4% / 33.7% / 17.1% (seed 3). All three are on target.

**Before the pass** (step 5 code, 200 runs per Core), the averages were about 45% / 23% / 2.6%:

- Area 1 had drifted below target.
- Area 3 converted only about 11% of the runs that reached it.
- The Sanguine Core cleared Area 1 just 20% of the time.

### Boss fights (share won by the player once the boss is reached)

| Boss | Area | Won when fought |
| --- | --- | --- |
| Iron Leviathan | 1 | 76.7% |
| Storm Queen | 1 | 87.8% |
| Clockwork Colossus | 1 | 73.9% |
| Aurora Archon | 2 | 82.7% |
| Crimson Sovereign | 3 | 70.2% |

### Storm Tiers (150 runs per Core: Airship / Tempest / Clockwork, full win)

| Tier | Modifier added | Airship | Tempest | Clockwork |
| --- | --- | --- | --- | --- |
| 0 | none | 17.3% | 27.7% | 22.3% |
| 1 | Squall: enemies +10% Durability | 7.3% | 23.3% | 16.7% |
| 2 | Lean Holds: −10 cogs, shops +15% | 9.3% | 22.0% | 19.3% |
| 3 | Hardened Crews: enemies +1 damage | 4.0% | 10.0% | 7.3% |
| 4 | Dread Captains: bosses +20% | 3.3% | 6.0% | 9.3% |
| 5 | Thin Hulls: Core −3 | 3.3% | 5.3% | 8.0% |
| 6 | Black Storm: enemies start behind 3 Block | 4.0% | 6.7% | 4.7% |

Difficulty rises steeply at Tier 3, then grinds down toward the floor. Tier 2 is within noise of Tier 1: its cog penalty matters less to the bot than to a human shopper. Tiers 4–6 sit within a few points of each other at this sample size, but each still removes something real.

### Most common parts on winning ships

The most common part is the Repair Bay, on 43.5% of winning ships, well under a 60% ceiling. Archon's Lance (42.9%) and Tesla Coil (42.7%) follow. Every Area 2 and Area 3 part appears on winning ships.

## What changed, and why

- **Area 1 (target 60%):**
  - Enemy Durability per column went from +8% to +4%.
  - Boss Durability went from ×1.5 to ×1.25.

  Area 1 had become harder than intended once runs continued past its boss. A boss there is now a checkpoint, not the finale.
- **Area 2 (target 35%):**
  - Area 2's enemies got +20% Durability.
  - The Aurora Archon went from 40 to 54 Durability.

  The Archon had been sunk 90% of the time.
- **Area 3 (the main fix).** Runs were dying with the Blood Moon at 6 every time, because it rose every round and waned only 3 after each fight. Now:
  - The moon rises every 2 rounds and wanes 4 after a fight. It still carries over, so the Moon Well matters.
  - Enemies are +1 from moon 3 and +1 in Frenzy (was +2). Frenzy still makes every hit leave Bleed, and an aggressive moon (4+) still rerolls non-attacks.
  - Area 3's enemy Durability multiplier went from 1.1 to 0.85. Its danger is Bleed and the moon rather than bulk.
  - Bone Galleon 22 → 17 (it rises again at half). Blood Cultist 26 → 22. Wraith Clipper 18 → 16 (it is immune half the rounds).
  - The Crimson Sovereign:
    - Durability 46 → 34.
    - Crimson Tide heals half of what it drains, not all of it.
    - The Blood Beam comes every third move, not every other.
    - She summons bats once in her first phase table, not twice.

    Fights had dragged to 12 rounds and ended with her near half health.
- **Cores:**
  - **Battleship:** its Ram now smashes through Armor, and breaks a Ward and still lands. It had no answer to the Crystal Barge's growing armor or the Glimmer Wisp's wards (Area 2 clear 6% → 31%).
  - **Zeppelin:** Bombard likewise crashes through a Ward. One Ward used to swallow a whole stored payload.
  - **Sanguine:** +1 Steam (3 → 4). It couldn't pay both Steam and Blood in Area 1.
  - **Eclipse:** Umbral Strike's base damage 2 → 3, and +1 Core Durability. Its strike was weak before it had Resonance or Bleed to draw on.

## Known soft spots

- The **Battleship** wins least (9–11% on seeds 1–2, 3.5% on seed 3). It clears Area 1 often, but Evade-free play is hard against the Grand Convergence and the Blood Beam. A human player answers these with front armor and Deflector braces better than the bot does.
- The **Eclipse** clears Area 2 almost every time it clears Area 1. It snowballs once Resonance and Bleed start feeding Umbral Strike.
- **Tempest** is the strongest Core (25–28% wins).
- Storm Tiers 4–6 are close together at this sample size.

New knobs in `BALANCE` for further tuning: `moonRising`, `frenzyBonus`, `moonEvery`, `moonWane`, `beamDamage`, `beamRest`, `drainHeal`, `bitePerBat`, `chaliceCap`, `umbraBase`.
