# Balance report

Tuned with a headless simulator and a greedy bot. Targets: **every Core wins 35–50% of runs**, and **no single part appears on more than 60% of winning ships**.

## Method

- `node tools/simulate.js 1000` plays 1,000 complete runs per Core (4,000 runs, about 5 seconds) through the real rules engine, with every unlockable part available.
- The bot is greedy, not random. In combat it scores every legal action each step (expected damage after Block and status, Steam value, how much an Evade or a Swap reduces the telegraphed threat, kill bonuses) and takes the best until nothing scores above zero. For loot it simulates each slot and installs where its layout score rises most. On the map it picks nodes by Core health and repair needs. It is a reasonable but imperfect player: it never rearranges at the Sky Dock and it undervalues utility parts.
- "Parts on winning ships" counts each part type present on the ship at the moment of victory, as a share of all winning runs across all Cores.
- `TUNE='{...}'` overrides any data value for an experiment without editing files; `BRIEF=1` prints one line. The final numbers were confirmed on three different seed sets (`--seed 1/2/3`); results moved by under 3 points.

## Results

### Win rate by Core

| Core | Before | After | Reached the boss | Average column reached (boss = 12) |
| --- | --- | --- | --- | --- |
| Airship | 89.4% | **47.9%** | 94.7% → 65.9% | 11.6 → 10.1 |
| Battleship | 35.7% | **39.8%** | 56.1% → 67.3% | 10.5 → 11.1 |
| Zeppelin | 98.5% | **41.0%** | 99.6% → 75.1% | 12.0 → 11.3 |
| Clockwork | 67.9% | **38.2%** | 80.5% → 59.7% | 11.2 → 10.4 |

Before tuning, the Zeppelin and Airship won almost every run while the Battleship sat at the bottom of the band. After tuning all four sit between 38.2% and 47.9%. Across seed sets 1–3 the ranges were: Airship 46.7–47.9%, Battleship 38.2–41.6%, Zeppelin 37.7–41.0%, Clockwork 38.2–41.7%.

### Boss fights (share won by the player once the boss is reached)

| Boss | Before | After |
| --- | --- | --- |
| Iron Leviathan | 84.3% | **58.4%** |
| Storm Queen | 91.7% | **63.2%** |
| Clockwork Colossus | 88.5% | **65.4%** |

### Most common parts on winning ships

The most common part is now on 42.4% of winning ships (before: 54.6%), well under the 60% ceiling.

| Part | Before | After |
| --- | --- | --- |
| Repair Bay | 54.6% | 42.4% |
| Brass Plating | 51.7% | 40.7% |
| Mortar | 53.1% | 35.2% |
| Deck Cannon | 42.7% | 30.7% |
| Flamethrower | 24.2% | 30.7% |
| Harpoon Gun | 22.2% | 21.6% |
| Tesla Coil | 27.9% | 21.0% |
| Ironclad Bulwark | 24.4% | 17.9% |
| Auxiliary Boiler | 19.4% | 17.0% |
| Clockwork Heart | 13.3% | 11.6% |
| Gasbag | 13.5% | 11.0% |
| Sniper Nest | 10.5% | 8.4% |
| Gyro Stabilizer | 6.2% | 6.6% |
| Gas Grenadiers | 6.3% | 6.4% |
| Overpressure Valve | 7.3% | 6.2% |
| Glue Gatling | 7.0% | 6.2% |
| Deflector Vane | 3.4% | 6.2% |
| Crew Quarters | 6.6% | 5.4% |
| Autoloader | 6.4% | 4.4% |
| Telescope | 7.2% | 3.5% |
| Sprinkler Tank | 1.3% | 1.9% |
| Supply Hatch | 1.4% | 1.1% |
| Air Scrubber | 0.3% | 0.7% |
| Lightning Rod | 0.7% | 0.7% |
| Propeller | 0.2% | 0.4% |
| Cargo Hold | 0.0% | 0.0% |

## What changed and why

| Change | Before | After | Why |
| --- | --- | --- | --- |
| Evade cost | 1 + Weight/3 (Airship always 1) | 2 + Weight/3, Airship −1, Propeller −1, minimum 1 | Cheap Evades let light ships dodge almost every telegraphed hit; this was the single biggest lever (Zeppelin 96% → 61% on its own). |
| Evade fatigue | +1 Steam per consecutive Evade | +2 | Chain-dodging every turn should be a real cost. |
| Pirate Durability per column | +6% | +8% | Keep late fights threatening once Evade got pricier. |
| Veteran damage | +1 from column 8 | +1 from column 6, +2 from column 11 | A steadier difficulty ramp into the boss. |
| Boss Durability | ×1 | ×1.35 | Bosses were won 84–92% of the time once reached. |
| Iron Leviathan base Durability | 30 | 26 | It was the hardest boss (its Ironclad Hull already blunts every hit). |
| Storm Queen base Durability | 28 | 33 | It was the easiest boss. |
| Clockwork Colossus base Durability | 32 | 37 | Second easiest. |
| Bombard | 2 per Pressure, max 9 | 1½ per Pressure (rounded down), max 6 | One saved-up bomb could delete a boss phase. |
| Battleship | 12 Durability, 3 Steam | 15 Durability, 4 Steam | It can't Evade, so it needs to out-tank and out-act. |
| Zeppelin | 6 Durability | 6 (tested 5, settled back on 6) | 5 left it at the band's floor once Bombard was trimmed. |
| Clockwork | 9 Durability, Overclock 1 Steam | 10 Durability, Overclock free (once a turn) | With Steam 4 it fell to 31%, with Steam 5 it rose to 54%; a free Overclock landed it at 40%. |

All global knobs live in the `BALANCE` block at the top of `js/data.js`.

## Caveats

- These are bot numbers. A human who reads intents, rearranges at Sky Docks and values utility parts will win more often; expect real win rates above these, especially for the Airship and Clockwork, which reward clever play the bot doesn't attempt.
- The bot almost never takes Cargo Hold, Propeller, Lightning Rod or Air Scrubber because its layout score undervalues them. Their low numbers say more about the bot than the parts.
- The Airship dies early more often than the others (light hull, few starting modules) but wins the most once established; it is the high-variance Core by design.

## Update: re-tuned for the stern / deck / bow layout

The sheltered stern made ships sturdier (Airship and Zeppelin rose to about 50%), so three numbers changed:

| Change | Before | After | Why |
| --- | --- | --- | --- |
| Boss Durability | ×1.35 | ×1.5 | Bosses became easier once supports could hide in the stern. |
| Clockwork Durability | 10 | 11 | It dipped toward the 35% floor; extra Durability alone moved it by about 1 point, but it kept it safely in band. |
| Strafing Run | 2 Steam | 3 Steam | The Airship was touching 50%. Durability didn't matter (it survives by dodging); its burst damage did. |

Results with 1,000 runs per Core on three seed sets (`--seed 1`, `2`, `3`):

| Core | Seed 1 | Seed 2 | Seed 3 |
| --- | --- | --- | --- |
| Airship | 43.2% | 40.6% | 45.8% |
| Battleship | 44.5% | 45.3% | 46.0% |
| Zeppelin | 39.8% | 38.3% | 41.0% |
| Clockwork | 40.9% | 38.5% | 41.1% |

Bosses once reached (seed 1): Iron Leviathan 58.1%, Storm Queen 65.4%, Clockwork Colossus 65.6%.

The most common part on winning ships is the **Repair Bay at 54–57%**, under the 60% ceiling but higher than before, because the stern now keeps it safe. That is the intended role of the stern. If it climbs further, the first lever to try is its repair amount (2) or making it uncommon. Making it uncommon was tested; it raised overall win rates, because the bot filled the slot with stronger parts. Next is Mortar at 43.5%, which now has a natural home firing from the sheltered stern.

Note: the simulator previously read the run count as its seed base when no `--seed` was given. That is fixed. The earlier before/after tables were both produced the same way, so their comparison still stands.

## Re-tune for the two-deck grid

The ship moved from stern / deck tower / bow lanes to a hull row plus an upper deck (see DESIGN_CHANGES.md). The greedy bot learned the grid: it scores slots by front, open sky, buried and sheltered positions. Then the simulator ran 1,000 runs per Core on 3 seed sets.

First pass, with no tuning:

| Core | Win |
| --- | --- |
| Airship | 44.5% |
| Battleship | 45.7% |
| Zeppelin | 29.3–33.9% |
| Clockwork | 33.4–34.4% |

Repair Bay was on 58–61% of winning ships.

Changes:
- **Zeppelin:** Durability 6 → 8, and Bombard 1½ → 1¾ damage per Pressure.
- **Clockwork:** starts with Crew Quarters instead of a Repair Bay. With a Repair Bay it was redundant with Self-Winding, and it inflated that part's share.
- **Deflector Vane:** bracing takes 3 off a hit instead of negating it. This fixes an endless stalemate the bot found.

After, at 1,000 runs per Core:

| Core | Seed set 1 | Seed set 2 | Seed set 3 |
| --- | --- | --- | --- |
| Airship | 44.5% | 40.3% | 40.6% |
| Battleship | 45.7% | 48.5% | 44.2% |
| Zeppelin | 44.9% | 42.3% | 45.3% |
| Clockwork | 38.8% | 38.0% | 35.3% |

The most common part on winning ships is the Repair Bay, at 47.6–48.9%. Next come the Mortar (44.0–47.2%) and Brass Plating (40.3–41.8%). Bosses won when reached: Colossus 62.8%, Leviathan 56.2%, Storm Queen 70.1% (seed set 1).


## Six classes, ships, new weapons and events

With the ship choice, the Privateer and Tempest Cores, the Grapnel / Rocket / Flak weapons, and the Derelict Hulk and Aether Rift events added, the first pass ran:

| Core | Win |
| --- | --- |
| Battleship | 72% |
| Privateer | 67–72% |
| Tempest | 22–30% |
| Others | 39–50% |

Changes:
- **Bulwark hull:** Durability only, no extra Weight. Weight feeds the Battleship's ram.
- **Boarding Party:** 3 → 2 damage.
- **Tempest:** Arc Discharge 1 → 3 base damage, Charge cap 6 → 8, Steam 4 → 5.
- **Bulwark hull:** +3 → +2 Durability.
- **Pirate Durability per column:** 8% → 10.5%.

After, at 1,000 runs per Core (the bot flies each Core's suggested ship):

| Core | Seed set 1 | Seed set 2 | Seed set 3 |
| --- | --- | --- | --- |
| Airship | 47.6% | 46.6% | 45.7% |
| Battleship | 45.6% | 47.4% | 46.6% |
| Zeppelin | 37.7% | 35.9% | 38.9% |
| Clockwork | 43.2% | 41.8% | 45.0% |
| Privateer | 41.0% | 38.4% | 40.8% |
| Tempest | 44.7% | 43.9% | 47.7% |

The most common part on winning ships is the Repair Bay, at 51–53%. The new Flak Cannon is on 31.5%.
