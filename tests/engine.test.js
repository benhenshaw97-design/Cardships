const test = require('node:test');
const assert = require('node:assert/strict');
const { Game } = require('../js/engine.js');

// A run with a fixed ship, dropped straight into a fight. The rolled intent is replaced when given.
function fight(coreId, left, right, enemy = 'gunship', intent = null, seed = 1) {
  const g = new Game({ seed });
  g.chooseCore(coreId);
  g.lootOffers = [];
  g.pendingLoot = [];
  g.left = left.map((id) => g.makeCard(id));
  g.right = right.map((id) => g.makeCard(id));
  g.enterMap();
  g.startCombat(enemy, { col: 1, enc: 'patrol' });
  if (intent) g.combat.enemy.intent = intent;
  g.combat.steam = g.steamCap(); // ignore first-turn bonuses
  return g;
}
const shot = (dmg, side, layer) => ({ kind: 'shot', name: 'Test Shot', dmg, side, layer });

test('an attack on an empty layer hits the next module inward', () => {
  const g = fight('battleship', ['harpoon'], ['cannon'], 'gunship', shot(2, 'left', 2));
  const plan = g.previewIntent().plan;
  assert.equal(plan[0].uid, g.left[0].uid);
  g.endTurn();
  assert.equal(g.left[0].hp, 1);
  assert.equal(g.core.hp, 12);
});

test('only a completely empty side exposes the Core', () => {
  const g = fight('battleship', [], ['cannon'], 'gunship', shot(2, 'left', 0));
  assert.equal(g.previewIntent().plan[0].uid, 'core');
  g.endTurn();
  assert.equal(g.core.hp, 10);
});

test('outside plating intercepts, buried plating soaks 1 for a neighbour', () => {
  let g = fight('battleship', ['harpoon', 'plating'], ['cannon'], 'gunship', shot(3, 'left', 0));
  g.endTurn();
  assert.equal(g.left[0].hp, 3);
  assert.equal(g.left[1].hp, 1);
  g = fight('battleship', ['plating', 'harpoon', 'telescope'], ['cannon'], 'gunship', shot(3, 'left', 1));
  g.endTurn();
  assert.equal(g.left[0].hp, 3);
  assert.equal(g.left[1].hp, 1);
});

test('the enemy intent is rolled before you act, and the preview matches what happens', () => {
  for (let seed = 1; seed < 40; seed++) {
    const g = fight('battleship', ['plating', 'harpoon'], ['repair', 'cannon'], 'gunship', null, seed);
    const it = g.combat.enemy.intent;
    assert.ok(it && it.name);
    const preview = g.previewIntent();
    const before = Object.fromEntries([g.core, ...g.cards()].map((c) => [c.uid, c.hp]));
    g.combat.steam = 0;
    g.endTurn();
    if (!['shot', 'broadside', 'rake', 'ram'].includes(it.kind) || g.phase !== 'combat') continue;
    for (const p of preview.plan) {
      const c = g.locate(p.uid);
      const after = c ? c.card.hp : 0;
      assert.equal(Math.max(0, before[p.uid] - after) >= Math.min(p.dmg, before[p.uid]), true, `seed ${seed}`);
    }
  }
});

test('Steam refills every turn and pays for actions; weapons fire once per turn from outside', () => {
  const g = fight('battleship', ['harpoon', 'cannon'], ['harpoon'], 'gunship', shot(0, 'left', 0));
  assert.equal(g.combat.steam, 3);
  assert.ok(g.fireInfo(g.left[0].uid).blocked);
  assert.ok(g.fire(g.right[0].uid));
  assert.equal(g.combat.steam, 2);
  assert.equal(g.fireInfo(g.right[0].uid).blocked, 'Already fired');
  g.endTurn();
  assert.equal(g.combat.steam, 3);
});

test('Durability is health only: firing never costs Durability', () => {
  const g = fight('battleship', [], ['harpoon'], 'gunship', shot(0, 'left', 0));
  g.fire(g.right[0].uid);
  assert.equal(g.right[0].hp, 3);
});

test('a Mortar fires from a buried layer, then reloads unless a Telescope is touching it', () => {
  const g = fight('zeppelin', ['mortar', 'plating'], [], 'gunship', shot(0, 'left', 0));
  assert.ok(g.fire(g.left[0].uid));
  g.endTurn();
  g.combat.enemy.intent = shot(0, 'left', 0);
  assert.equal(g.fireInfo(g.left[0].uid).blocked, 'Reloading');
  const h = fight('zeppelin', ['telescope', 'mortar'], [], 'gunship', shot(0, 'left', 0));
  h.fire(h.left[1].uid);
  h.endTurn();
  assert.equal(h.fireInfo(h.left[1].uid).blocked, null);
});

test('Evade makes the telegraphed attack miss; the Battleship cannot evade', () => {
  const g = fight('airship', ['propeller'], ['harpoon'], 'gunship', shot(3, 'right', 0));
  assert.equal(g.evadeCost(), 1);
  assert.ok(g.evade());
  g.endTurn();
  assert.equal(g.right[0].hp, 3);
  const b = fight('battleship', [], ['cannon'], 'gunship', shot(3, 'right', 0));
  assert.equal(b.canEvade(), false);
});

test('back-to-back Evades get more expensive, and long fights Enrage the enemy', () => {
  const g = fight('airship', ['propeller'], ['harpoon'], 'gunship', shot(1, 'right', 0));
  g.evade(); g.endTurn();
  g.combat.enemy.intent = shot(1, 'right', 0);
  assert.equal(g.evadeCost(), 2);
  g.combat.round = 13;
  assert.equal(g.intentDamage(shot(1, 'right', 0)), 4);
});

test('swapping adjacent modules costs Steam (Airship: first one free); glue pins a module', () => {
  const g = fight('battleship', ['harpoon', 'plating'], [], 'gunship', shot(0, 'left', 0));
  assert.ok(g.swap(g.left[0].uid, g.left[1].uid));
  assert.equal(g.left[0].id, 'plating');
  assert.equal(g.combat.steam, 2);
  const a = fight('airship', ['harpoon', 'plating'], [], 'gunship', shot(0, 'left', 0));
  a.swap(a.left[0].uid, a.left[1].uid);
  assert.equal(a.combat.steam, 4);
  a.left[0].tokens.glue = true;
  assert.equal(a.canSwap(a.left[0].uid, a.left[1].uid), false);
});

test('venting clears tokens for 2 Steam; gas makes a module cost 1 more', () => {
  const g = fight('airship', [], ['harpoon'], 'gunship', shot(0, 'left', 0));
  g.right[0].tokens.gas = true;
  assert.equal(g.fireInfo(g.right[0].uid).cost, 2);
  assert.ok(g.vent(g.right[0].uid));
  assert.equal(g.right[0].tokens.gas, false);
  assert.equal(g.combat.steam, 2);
});

test('weight resists rams', () => {
  const g = fight('battleship', ['plating', 'plating'], ['cannon', 'plating'], 'cutter');
  const ram = { kind: 'ram', name: 'Ram', dmg: 3, self: 2, side: 'right' };
  assert.equal(g.intentDamage(ram), 1); // weight 8 vs 2 → -3, Ironsides -2, min 1
  const z = fight('zeppelin', [], ['harpoon'], 'cutter');
  assert.equal(z.intentDamage(ram), 3);
});

test('the Zeppelin banks unspent Steam as Pressure and Bombards with it', () => {
  const g = fight('zeppelin', [], ['harpoon'], 'gunship', shot(0, 'left', 0));
  g.endTurn();
  assert.equal(g.core.pressure, 3);
  g.combat.enemy.intent = shot(0, 'left', 0);
  const hp = g.combat.enemy.hp;
  g.combat.enemy.block = 5;
  assert.ok(g.useCore());
  assert.equal(g.combat.enemy.hp, hp - 6);
  assert.equal(g.core.pressure, 0);
});

test('an aimed Deck Cannon keeps the higher of two d6', () => {
  const g = fight('battleship', [], ['cannon'], 'gunship', shot(0, 'left', 0));
  const rolls = [2, 5];
  g.d6 = () => rolls.shift();
  const hp = g.combat.enemy.hp;
  g.fire(g.right[0].uid, 'aimed');
  assert.equal(g.combat.enemy.hp, hp - 4);
});

test('Block absorbs damage; Choking adds 1 per hit; Burn ticks and fades', () => {
  const g = fight('battleship', [], ['grenadiers'], 'gunship', shot(0, 'left', 0));
  const en = g.combat.enemy;
  g.fire(g.right[0].uid);
  assert.equal(en.vuln, 2);
  en.block = 1;
  g.damageEnemy(2);
  assert.equal(en.block, 0);
  en.burn = 2;
  const hp = en.hp;
  g.endTurn();
  assert.equal(en.hp, hp - 2);
  assert.equal(en.burn, 1);
});

test('storm results with a downside offer a choice instead of nothing happening', () => {
  const g = new Game({ seed: 5 });
  g.chooseCore('airship');
  g.lootOffers = []; g.pendingLoot = [];
  g.enterMap();
  g.d6 = () => 3;
  g.startEncounter({ id: 'x', enc: 'storm', col: 2 });
  assert.equal(g.event.stage, 'downdraft');
  assert.ok(g.event.options.some((o) => o.id === 'brace'));
  g.chooseOption('brace');
  assert.equal(g.core.hp, 6);
  assert.ok(g.continueEvent());
});

test('the sky map runs 11 columns to a boss that is known from the start', () => {
  for (let seed = 1; seed < 60; seed++) {
    const g = new Game({ seed });
    g.chooseCore('airship');
    const nodes = g.map.nodes;
    const boss = nodes.filter((n) => n.enc === 'boss');
    assert.equal(boss.length, 1);
    assert.equal(boss[0].col, 12);
    assert.ok(g.nodeKnown(boss[0]));
    assert.ok(['leviathan', 'stormqueen', 'colossus'].includes(boss[0].enemy));
    for (const n of nodes) {
      if (n.col < 12) assert.ok(n.edges.length >= 1, 'dead end');
      if (n.col > 0) assert.ok(nodes.some((m) => m.edges.includes(n.id)), 'unreachable node');
      for (const e of n.edges) assert.equal(g.node(e).col, n.col + 1);
    }
    assert.ok(nodes.filter((n) => n.col === 11).some((n) => n.enc === 'hangar'));
    const far = nodes.find((n) => n.col === 6);
    assert.equal(g.nodeKnown(far), false);
  }
});

test('the Trading Zeppelin sells parts and services for cogs', () => {
  const g = new Game({ seed: 3 });
  g.chooseCore('battleship');
  g.lootOffers = []; g.pendingLoot = [];
  g.cogs = 100;
  g.enterShop({ id: 'x' });
  const item = g.shop.stock[0];
  assert.ok(g.buy(0));
  assert.equal(g.cogs, 100 - item.price);
  assert.deepEqual(g.pendingLoot, [item.id]);
  assert.equal(g.buy(0), false);
  g.core.hp = 5;
  assert.ok(g.buyService('core'));
  assert.equal(g.core.hp, 9);
  assert.ok(g.leaveShop());
  assert.equal(g.phase, 'loot');
});

test('boss gimmicks: Leviathan hull, Storm Queen gale and lightning, Colossus mainspring', () => {
  let g = fight('battleship', [], ['harpoon'], 'leviathan', shot(0, 'left', 0));
  const hp = g.combat.enemy.hp;
  g.fire(g.right[0].uid);
  assert.equal(g.combat.enemy.hp, hp - 1);

  g = fight('battleship', ['harpoon', 'plating'], ['cannon'], 'stormqueen', { kind: 'shot', dmg: 2, side: 'left', layer: 0, lightning: true, name: 'Lightning' });
  g.combat.galeSide = 'left';
  g.endTurn();
  assert.equal(g.left[1].id, 'harpoon', 'gale swapped the outer two');
  assert.equal(g.left[1].hp, 1, 'lightning skipped the plating');

  g = fight('battleship', [], ['cannon'], 'colossus', shot(1, 'right', 0));
  g.endTurn();
  assert.equal(g.combat.enemy.wound, 1);
  g.combat.enemy.intent = shot(1, 'right', 0);
  assert.equal(g.intentDamage(g.combat.enemy.intent), 2);
  g.damageEnemy(6);
  g.endTurn();
  assert.equal(g.combat.enemy.wound, 1, 'snapped to 0, then wound again');
  assert.equal(g.right[0].hp, 3, 'stunned: no attack');
});

test('a saved run resumes with identical dice', () => {
  const a = fight('airship', ['plating'], ['harpoon'], 'gunship', null, 77);
  const b = Game.fromJSON(JSON.parse(JSON.stringify(a)));
  a.endTurn(); b.endTurn();
  assert.deepEqual(a.combat.enemy.intent, b.combat.enemy.intent);
  assert.equal(a.rngState, b.rngState);
});

test('the bot plays 400 seeded runs without breaking an invariant', () => {
  const { playRun } = require('../js/bot.js');
  const outcomes = { gameover: 0, victory: 0 };
  for (let seed = 1; seed <= 400; seed++) {
    const g = playRun(new Game({ seed }), ['airship', 'battleship', 'zeppelin', 'clockwork'][seed % 4], { check: invariants, random: seed % 3 === 0 });
    outcomes[g.phase]++;
  }
  assert.equal(outcomes.gameover + outcomes.victory, 400);
});

function invariants(g) {
  for (const s of ['left', 'right']) {
    assert.ok(g[s].length <= 3, 'side overflow');
    for (const c of g[s]) {
      assert.ok(c.hp > 0, `dead module left on ship: ${c.id}`);
      assert.ok(c.hp <= g.maxHp(c), `over max: ${c.id}`);
    }
  }
  assert.ok(g.storage.length <= 2);
  if (g.phase !== 'gameover') assert.ok(g.core.hp > 0 && g.core.hp <= g.maxHp(g.core), 'core hp');
  if (g.phase === 'combat') {
    assert.ok(g.combat.enemy.hp > 0 && g.combat.enemy.hp <= g.combat.enemy.max, 'enemy hp');
    assert.ok(g.combat.steam >= 0, 'steam');
  }
}
