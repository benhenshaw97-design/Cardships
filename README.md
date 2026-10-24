# Cardships

A roguelike where you bolt Part Cards to the left and right of a Core and fly through ten encounters to face the Iron Leviathan. This repo is a playable browser version of the Cardships rule sheet, parts list and encounter sheet.

## Play

Open `index.html` in a browser. No build step or server needed.

## Test

```
npm test
```

Runs the rules tests in `tests/engine.test.js` (Node 18+), including a bot that plays 600 seeded runs and checks the ship's invariants after every move.

## Layout

| File | What it holds |
| --- | --- |
| `js/data.js` | Every Core, Part, enemy, encounter and contract, transcribed from the design sheets |
| `js/engine.js` | The rules: ship layout, combat, events, loot, quests. No DOM, seedable dice |
| `js/ui.js` | Browser rendering and input |
| `css/style.css` | Styles, light and dark |

## Rules calls

The sheets leave some things open. This is how the game reads them; each is a small change in `js/engine.js` if you want it played differently.

**Ship and targeting**
- Layer 1 is the card touching the Core, layer 3 the outermost. The enemy's d4 picks the layer, a 4 misses, and an empty layer hits the Core.
- Only the outside card of a side can fire or use an "Outside" ability. "Buried" means any card under it. "Directly on top" means the next card out.
- Outside Armor takes every rolled hit aimed at a card behind it on that side. Buried Armor takes 1 point of a hit on a card touching it.
- Abilities that say "targeted outermost card" (Heavy Cannon, boss Ram, token shots) flip for a side and hit the outermost card there, or the Core if that side is bare.
- When a middle card is destroyed, the cards outside it slide in to close the gap.

**Actions and durability**
- By default only cards whose text says so (Cannon, Sniper, and the support cards) spend Durability when used. The title screen has a **Strict durability** switch that makes every weapon shot cost 1 Durability, as the rule sheet's action economy reads.
- Barracks "directly behind" a weapon means one layer closer to the Core.
- Core abilities cost an Action. Airship Ram also costs 1 Core Durability; Battleship Heavy Cannon then waits 3 turns; Zeppelin Bomber charges for 5 turns.
- Artillery can't fire on the turn after it fires, unless a Telescope sits directly beneath it.

**Combat**
- Each round the lighter ship acts first; ties go to the player. Weight is recalculated every round.
- Tokens on the enemy: Fire deals 1 at the start of its turn, Glue gives its attacks -1 damage, Gas makes it flip a coin to land each attack (Ram still damages itself on a miss).
- Enemy Armor blocks the next hit from your weapons or Core. A Sniper crit pierces it. Fire ignores it.
- Volatile Casing only goes off when the destroyed neighbour was hit by an enemy Ram.

**Run structure**
- A run is 10 encounters; the 10th is always the Iron Leviathan.
- Each encounter's Paths number is how many routes you choose from next. An outside Telescope and the Mobile Vendor's chart each add 1, up to 3.
- The run starts with a Harpoon on the left, Armor on the right, and a pick of 1 from 3 random parts.
- New parts can be inserted at any layer; cards outside it move out. When a side is full you can scrap a part to make room.
- A Mercenary Contract replaces any contract you already hold. The Survivor counts only Wind Storms.
- Parts still on the shipyard dock when you leave go into storage if there is room, otherwise they are left behind.
