const test = require('node:test');
const assert = require('node:assert/strict');
const { Game } = require('../js/engine.js');

// Starts a run with a fixed ship and drops straight into a fight.
function fight(coreId, left, right, enemy = 'attackBoat', seed = 1) {
  const g = new Game({ seed });
  g.chooseCore(coreId);
  g.lootOffer = null;
  g.pendingLoot = [];
  g.left = left.map((id) => g.makeCard(id));
  g.right = right.map((id) => g.makeCard(id));
  g.enterMap();
  g.startCombat(enemy, { id: 'test' });
  return g;
}
// Replaces the dice with a fixed sequence of d4 rolls and coin flips (true = heads).
function rig(g, d4s = [], coins = []) {
  g.d4 = () => { assert.ok(d4s.length, 'ran out of rigged d4 rolls'); return d4s.shift(); };
  g.coin = () => { assert.ok(coins.length, 'ran out of rigged coins'); return coins.shift(); };
}

test('weight sets initiative, lowest acts first', () => {
  const g = fight('zeppelin', ['harpoon'], ['armor']);
  assert.equal(g.weight(), 0.5);
  assert.equal(g.combat.playerFirst, true);
  assert.equal(g.combat.active, 'player');
});

test('enemy rolls on an empty layer hit the Core directly', () => {
  const g = fight('battleship', ['harpoon'], []);
  rig(g, [1, 2], [true]); // Phase 1 roll 1 = Harpoon, coin Heads = left, layer 2 (empty)
  g.enemyTurn();
  assert.equal(g.core.dur, 4);
  assert.equal(g.left[0].dur, 3);
});

test('a d4 of 4 on targeting always misses', () => {
  const g = fight('battleship', ['harpoon'], ['armor']);
  rig(g, [1, 4], [false]);
  g.enemyTurn();
  assert.equal(g.core.dur, 5);
  assert.equal(g.right[0].dur, 3);
});

test('outer Armor intercepts hits meant for cards behind it', () => {
  const g = fight('battleship', ['harpoon', 'armor'], []);
  rig(g, [1, 1], [true]); // harpoon at left layer 1
  g.enemyTurn();
  assert.equal(g.left[0].dur, 3);
  assert.equal(g.left[1].dur, 2);
});

test('buried Armor soaks 1 damage for a neighbour', () => {
  const g = fight('battleship', ['armor', 'harpoon', 'telescope'], []);
  g.combat.enemy.dur = 4; // Phase 3: rolls 2-4 are Ram
  rig(g, [2, 2], [true]); // Ram hits left layer 2 (harpoon) for 3
  g.enemyTurn();
  assert.equal(g.left[0].id, 'armor');
  assert.equal(g.left[0].dur, 2);
  assert.equal(g.left[1].dur, 1);
  assert.equal(g.combat.enemy.dur, 1);
});

test('weapons fire only from the outside, and a Harpoon battery adds damage', () => {
  const g = fight('zeppelin', ['harpoon', 'artillery'], ['harpoon']);
  assert.equal(g.weaponInfo('left').card.id, 'artillery');
  assert.equal(g.weaponInfo('left').battery, 1);
  g.fire('left');
  assert.equal(g.combat.enemy.dur, 9);
  assert.equal(g.left[1].cd, 2);
});

test('artillery cools down for one turn unless a Telescope sits beneath it', () => {
  const g = fight('battleship', ['telescope', 'artillery'], []);
  g.combat.actions = 2;
  assert.ok(g.fire('left'));
  assert.ok(g.fire('left'));
  assert.equal(g.combat.enemy.dur, 8);
});

test('Barracks gives an extra action and pays the Durability of the gun on top of it', () => {
  const g = fight('battleship', ['barracks', 'cannon'], []);
  assert.equal(g.combat.actions, 2);
  rig(g, [], [true]);
  g.fire('left');
  assert.equal(g.combat.enemy.dur, 9);
  assert.equal(g.left[1].dur, 3);
  assert.equal(g.left[0].dur, 1);
});

test('strict mode makes every shot cost Durability', () => {
  const g = new Game({ seed: 3, strict: true });
  g.chooseCore('airship');
  g.lootOffer = null; g.pendingLoot = [];
  g.enterMap();
  g.startCombat('scavengerSkiff', { id: 't' });
  g.fire('left');
  assert.equal(g.left[0].dur, 2);
});

test('enemy armor blocks the next hit, a sniper crit pierces it', () => {
  const g = fight('battleship', ['sniper'], []);
  g.combat.enemy.shield = true;
  rig(g, [], [true]);
  g.fire('left');
  assert.equal(g.combat.enemy.dur, 10);
});

test('fire ticks at the start of the turn and an Extinguisher clears it', () => {
  const g = fight('battleship', ['fireExtinguisher', 'harpoon'], []);
  g.left[1].tokens.fire = true;
  g.combat.active = 'enemy';
  g.beginPlayerTurn();
  assert.equal(g.left[1].dur, 2);
  assert.ok(g.useSupport(g.left[0].uid, g.left[1].uid));
  assert.equal(g.left[1].tokens.fire, false);
  assert.equal(g.left[0].dur, 1);
});

test('Repair Bay can mend the Core only when attached to it', () => {
  const g = fight('battleship', ['repairBay'], ['harpoon', 'repairBay']);
  g.core.dur = 3;
  assert.ok(g.supportTargets(g.left[0].uid).includes('core'));
  assert.ok(!g.supportTargets(g.right[1].uid).includes('core'));
});

test('a Ram destroying a card next to a buried Cannon sets it off', () => {
  const g = fight('battleship', ['cannon', 'telescope'], []);
  g.combat.enemy.dur = 4;
  rig(g, [2, 2], [true]); // Ram on left layer 2 (telescope)
  g.enemyTurn();
  g.checkEnd();
  assert.equal(g.left.length, 1);
  assert.equal(g.combat.enemy.dur, 0);
  assert.equal(g.phase, 'loot');
});

test('Airship ram costs Core durability', () => {
  const g = fight('airship', ['harpoon'], []);
  g.useCore();
  assert.equal(g.combat.enemy.dur, 9);
  assert.equal(g.core.dur, 2);
});

test('enemy phases change with durability', () => {
  const g = fight('battleship', [], []);
  assert.equal(g.enemyPhase().name, 'Phase 1');
  g.combat.enemy.dur = 8;
  assert.equal(g.enemyPhase().name, 'Phase 2');
  g.combat.enemy.dur = 4;
  assert.equal(g.enemyPhase().name, 'Phase 3');
});

test('Supply Hatch offers 2 and keeps 1; with Storage Bay it keeps both', () => {
  let g = fight('battleship', ['supplyHatch'], []);
  g.combat.enemy.dur = 1;
  g.fire('left'); // hatch is not a weapon
  g.damageEnemy(1); g.checkEnd();
  assert.equal(g.lootOffer.ids.length, 2);
  assert.equal(g.lootOffer.keep, 1);
  g = fight('battleship', ['supplyHatch'], ['storageBay']);
  g.damageEnemy(12); g.checkEnd();
  assert.equal(g.lootOffer, null);
  assert.equal(g.pendingLoot.length, 2);
});

test('Hoarder contract pays out a Supply Hatch when a Storage Bay is installed', () => {
  const g = fight('battleship', ['harpoon'], []);
  g.damageEnemy(12); g.checkEnd();
  g.lootOffer = null;
  g.quest = 'hoarder';
  g.pendingLoot = ['storageBay'];
  g.installPending('right', 0);
  assert.equal(g.quest, null);
  assert.deepEqual(g.pendingLoot, ['supplyHatch']);
});

test('the boss is the last encounter and beating it wins the run', () => {
  const g = new Game({ seed: 9, maxDepth: 2 });
  g.chooseCore('battleship');
  g.pickOffer(0);
  g.jettisonPending();
  g.finishLoot();
  assert.notDeepEqual(g.choices, ['boss']);
  g.depth = 1;
  g.enterMap();
  assert.deepEqual(g.choices, ['boss']);
  g.chooseEncounter(0);
  assert.equal(g.combat.enemy.max, 20);
  g.combat.enemy.dur = 0;
  g.checkEnd();
  assert.equal(g.phase, 'victory');
});

// A simple bot plays many full runs. It is not trying to win, only to touch every rule path.
function playRun(seed, strict) {
  const g = new Game({ seed, strict });
  const r = g.rng;
  const pick = (n) => Math.floor(r() * n);
  g.chooseCore(['airship', 'battleship', 'zeppelin'][seed % 3]);
  for (let step = 0; step < 5000; step++) {
    check(g);
    if (g.phase === 'gameover' || g.phase === 'victory') return g;
    if (g.pendingChoice) { g.resolveChoice(g.pendingChoice.eligible[0]); continue; }
    switch (g.phase) {
      case 'loot': {
        if (g.lootOffer) { g.pickOffer(pick(g.lootOffer.ids.length)); break; }
        if (g.swapAvailable && g.cards().length && r() < 0.5) {
          const c = g.cards().find((x) => x.id !== 'storageBay');
          if (c) g.quickSwap(c.uid, 0);
          g.swapAvailable = false;
          break;
        }
        if (g.pendingLoot.length) {
          const side = r() < 0.5 ? 'left' : 'right';
          if (g.canInstall(side, g[side].length)) g.installPending(side, pick(g[side].length + 1));
          else if (!g.storePending()) {
            if (r() < 0.3 && g.cards().length) g.scrap(g.cards()[0].uid);
            else g.jettisonPending();
          }
          break;
        }
        assert.ok(g.finishLoot(), 'loot should finish');
        break;
      }
      case 'map': {
        const bay = g.cards().find((c) => c.id === 'repairBay');
        if (bay && r() < 0.2) { const t = g.supportTargets(bay.uid); if (t.length) g.useSupport(bay.uid, t[0]); }
        g.chooseEncounter(pick(g.choices.length));
        break;
      }
      case 'event': g.continueEvent(); break;
      case 'shipyard': {
        if (g.cards().length && r() < 0.5) {
          const c = g.cards()[pick(g.cards().length)];
          g.detach(c.uid);
          const side = r() < 0.5 ? 'left' : 'right';
          g.attach(0, side, 0) || g.attach(0, side === 'left' ? 'right' : 'left', 0);
        }
        if (!g.shipyard.roll) g.salvage();
        else assert.ok(g.leaveShipyard());
        break;
      }
      case 'combat': {
        if (!g.canAct()) { g.endTurn(); break; }
        const opts = [];
        for (const s of ['left', 'right']) { const w = g.weaponInfo(s); if (w && !w.blocked) opts.push(() => g.fire(s)); }
        if (!g.coreAbilityInfo().blocked) opts.push(() => g.useCore());
        for (const c of g.cards()) {
          const t = g.supportTargets(c.uid);
          if (g.canUseSupport(c.uid) && t.length) opts.push(() => g.useSupport(c.uid, t[0]));
        }
        opts.push(() => g.endTurn());
        opts[pick(opts.length)]();
        break;
      }
      default: assert.fail('unexpected phase ' + g.phase);
    }
  }
  assert.fail(`run ${seed} did not finish`);
}
function check(g) {
  for (const s of ['left', 'right']) {
    assert.ok(g[s].length <= 3, 'side overflow');
    for (const c of g[s]) {
      assert.ok(c.dur > 0, `dead card left on ship: ${c.id}`);
      assert.ok(c.dur <= g.maxDur(c), `over max: ${c.id}`);
    }
  }
  assert.ok(g.storage.length <= 2);
  if (g.phase !== 'gameover') assert.ok(g.core.dur > 0 && g.core.dur <= g.core.max);
  if (g.phase === 'combat') assert.ok(g.combat.enemy.dur > 0 && g.combat.enemy.dur <= g.combat.enemy.max);
}

test('bot plays 600 seeded runs without breaking an invariant', () => {
  const outcomes = { gameover: 0, victory: 0 };
  for (let seed = 1; seed <= 600; seed++) outcomes[playRun(seed, seed % 4 === 0).phase]++;
  assert.equal(outcomes.gameover + outcomes.victory, 600);
});
