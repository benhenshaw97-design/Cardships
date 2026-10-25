const test = require('node:test');
const assert = require('node:assert/strict');
const { Game } = require('../js/engine.js');

// A run with a fixed ship, dropped straight into a fight. The rolled intent is replaced when given.
// The ship is a list of [part, row, col]: row 0 is the hull (col -1..-3 stern, 1..3 bow), row 1 the
// upper deck on top of it (col 0 is the bridge, over the Core).
function fight(coreId, ship, enemy = 'gunship', intent = null, seed = 1) {
  const g = new Game({ seed });
  g.chooseCore(coreId);
  g.lootOffers = [];
  g.pendingLoot = [];
  g.buildShip(ship);
  g.enterMap();
  g.startCombat(enemy, { col: 1, enc: 'patrol' });
  if (intent) g.combat.enemy.intent = intent;
  g.combat.steam = g.steamCap(); // ignore first-turn bonuses
  return g;
}
const at = (g, row, col) => g.at(col, row);
const direct = (dmg, row = 0, depth = 0) => ({ kind: 'shot', name: 'Test Shot', dmg, target: { kind: 'direct', row, depth } });
const plunge = (dmg, col) => ({ kind: 'shot', name: 'Test Bomb', dmg, target: { kind: 'plunge', col }, aim: 'plunge' });
const idle = () => direct(0);

test('direct fire meets the front of a deck; a bare bow exposes the Core', () => {
  const g = fight('battleship', [['harpoon', 0, 1], ['repair', 0, -1]], 'gunship', direct(2, 0, 2));
  assert.equal(g.previewIntent().plan[0].uid, at(g, 0, 1).uid, 'too deep: hits the front');
  g.endTurn();
  assert.equal(at(g, 0, 1).hp, 1);
  assert.equal(g.core.hp, 15);
  const h = fight('battleship', [['repair', 0, -1]], 'gunship', direct(2, 0, 0));
  assert.equal(h.previewIntent().plan[0].uid, 'core');
});

test('a shot at an empty upper deck drops to the hull', () => {
  const g = fight('battleship', [['harpoon', 0, 1]], 'gunship', direct(2, 1, 0));
  assert.equal(g.previewIntent().plan[0].uid, at(g, 0, 1).uid);
});

test('front plating intercepts deeper shots; buried plating soaks 1 for a neighbour', () => {
  let g = fight('battleship', [['harpoon', 0, 1], ['plating', 0, 2]], 'gunship', direct(3, 0, 1));
  g.endTurn();
  assert.equal(at(g, 0, 1).hp, 3, 'harpoon untouched');
  assert.equal(at(g, 0, 2).hp, 1, 'plating took it');
  // Plating buried under a telescope, beside the harpoon it guards.
  g = fight('battleship', [['plating', 0, 1], ['harpoon', 0, 2], ['telescope', 1, 1]], 'gunship', direct(3, 0, 0));
  g.endTurn();
  assert.equal(at(g, 0, 2).hp, 1, 'harpoon took 2');
  assert.equal(at(g, 0, 1).hp, 3, 'plating soaked 1');
});

test('plunging fire hits the top of its column and drifts in over empty columns', () => {
  const g = fight('battleship', [['repair', 0, -1], ['telescope', 1, -1], ['harpoon', 0, 1]], 'gunship', plunge(2, -3));
  assert.equal(g.previewIntent().plan[0].uid, at(g, 1, -1).uid, 'telescope on top shelters the repair bay');
  assert.equal(g.planPlunge(2, 2)[0].uid, at(g, 0, 1).uid);
  const h = fight('battleship', [['harpoon', 0, 1]], 'gunship', plunge(2, -2));
  assert.equal(h.previewIntent().plan[0].uid, 'core', 'bare stern: bombs reach the Core');
  h.buildShip([['harpoon', 0, 1], ['gasbag', 1, 0]]);
  assert.equal(h.previewIntent().plan[0].uid, at(h, 1, 0).uid, 'the bridge shelters the Core');
});

test('the enemy intent is rolled before you act, and the preview matches what happens', () => {
  for (let seed = 1; seed < 60; seed++) {
    const g = fight('battleship', [['plating', 0, 1], ['harpoon', 0, 2], ['repair', 0, -1], ['cannon', 1, 0], ['telescope', 1, -1]], 'gunship', null, seed);
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

test('Steam refills every turn and pays for actions; weapons fire once per turn', () => {
  const g = fight('battleship', [['harpoon', 0, -1], ['harpoon', 0, 1]], 'gunship', idle());
  assert.equal(g.combat.steam, 4);
  assert.match(g.fireInfo(at(g, 0, -1).uid).blocked, /Behind the Core/);
  assert.ok(g.fire(at(g, 0, 1).uid));
  assert.equal(g.combat.steam, 3);
  assert.equal(g.fireInfo(at(g, 0, 1).uid).blocked, 'Already fired');
  g.endTurn();
  assert.equal(g.combat.steam, 4);
});

test('straight guns fire from the front of a deck; arcing guns need open sky', () => {
  const g = fight('battleship', [['plating', 0, 1], ['cannon', 0, 2], ['mortar', 0, -1], ['sniper', 1, 1], ['harpoon', 1, -1], ['tesla', 0, -2], ['gasbag', 1, -2]]);
  assert.equal(g.fireInfo(at(g, 0, 2).uid).blocked, null, 'the prow fires');
  assert.equal(g.fireInfo(at(g, 1, 1).uid).blocked, null, 'the head of the upper deck fires');
  assert.match(g.fireInfo(at(g, 1, -1).uid).blocked, /front of a deck/, 'upper deck, but not in front');
  assert.match(g.fireInfo(at(g, 0, -1).uid).blocked, /open sky/, 'mortar under a harpoon');
  assert.match(g.fireInfo(at(g, 0, -2).uid).blocked, /open sky/, 'tesla under a gasbag');
  g.buildShip([['mortar', 0, -1]]);
  assert.equal(g.fireInfo(at(g, 0, -1).uid).blocked, null, 'mortar with open sky fires from the stern');
});

test('Durability is health only: firing never costs Durability', () => {
  const g = fight('battleship', [['harpoon', 0, 1]], 'gunship', idle());
  g.fire(at(g, 0, 1).uid);
  assert.equal(at(g, 0, 1).hp, 3);
});

test('a Mortar reloads unless a Telescope is touching it', () => {
  const g = fight('zeppelin', [['mortar', 0, -1], ['gasbag', 0, 1]], 'gunship', idle());
  assert.ok(g.fire(at(g, 0, -1).uid));
  g.endTurn();
  g.combat.enemy.intent = idle();
  assert.equal(g.fireInfo(at(g, 0, -1).uid).blocked, 'Reloading');
  const h = fight('zeppelin', [['mortar', 0, -1], ['telescope', 0, -2], ['gasbag', 0, 1]], 'gunship', idle());
  h.fire(at(h, 0, -1).uid);
  h.endTurn();
  assert.equal(h.fireInfo(at(h, 0, -1).uid).blocked, null);
});

test('a Harpoon feeds the weapon bolted on top of it', () => {
  const g = fight('battleship', [['harpoon', 0, 1], ['sniper', 1, 1]], 'gunship', idle());
  assert.equal(g.fireInfo(at(g, 1, 1).uid).bonus, 1);
  assert.match(g.synergies(at(g, 0, 1).uid)[0].text, /Chain Feed/);
});

test('Evade makes the telegraphed attack miss; the Battleship cannot evade', () => {
  const g = fight('airship', [['propeller', 0, -1], ['harpoon', 0, 1]], 'gunship', direct(3));
  assert.equal(g.evadeCost(), 1);
  assert.ok(g.evade());
  g.endTurn();
  assert.equal(at(g, 0, 1).hp, 3);
  const b = fight('battleship', [['cannon', 0, 1]], 'gunship', direct(3));
  assert.equal(b.canEvade(), false);
});

test('back-to-back Evades get more expensive, and long fights Enrage the enemy', () => {
  const g = fight('airship', [['propeller', 0, -1], ['harpoon', 0, 1]], 'gunship', direct(1));
  g.evade(); g.endTurn();
  g.combat.enemy.intent = direct(1);
  assert.equal(g.evadeCost(), 3);
  g.combat.round = 13;
  assert.equal(g.intentDamage(direct(1)), 4);
});

test('touching modules swap for Steam (Airship: first one free), even up and down; glue pins a module', () => {
  const g = fight('battleship', [['harpoon', 0, 1], ['plating', 1, 1]], 'gunship', idle());
  const h = at(g, 0, 1).uid;
  assert.ok(g.swap(h, at(g, 1, 1).uid));
  assert.equal(at(g, 1, 1).uid, h);
  assert.equal(g.combat.steam, 3);
  const a = fight('airship', [['harpoon', 0, 1], ['plating', 0, 2]], 'gunship', idle());
  a.swap(at(a, 0, 1).uid, at(a, 0, 2).uid);
  assert.equal(a.combat.steam, 4);
  at(a, 0, 1).tokens.glue = true;
  assert.equal(a.canSwap(at(a, 0, 1).uid, at(a, 0, 2).uid), false);
});

test('venting clears tokens for 2 Steam; gas makes a module cost 1 more', () => {
  const g = fight('airship', [['harpoon', 0, 1]], 'gunship', idle());
  const hp = at(g, 0, 1);
  hp.tokens.gas = true;
  assert.equal(g.fireInfo(hp.uid).cost, 2);
  assert.ok(g.vent(hp.uid));
  assert.equal(hp.tokens.gas, false);
  assert.equal(g.combat.steam, 2);
});

test('weight resists rams', () => {
  const g = fight('battleship', [['plating', 0, -1], ['plating', 0, -2], ['cannon', 0, 1], ['plating', 0, 2]], 'cutter');
  const ram = { kind: 'ram', name: 'Ram', dmg: 3, self: 2 };
  assert.equal(g.intentDamage(ram), 1); // weight 8 vs 2 → -3, Ironsides -2, min 1
  const z = fight('zeppelin', [['harpoon', 0, 1]], 'cutter');
  assert.equal(z.intentDamage(ram), 3);
});

test('the Zeppelin banks unspent Steam as Pressure and Bombards with it', () => {
  const g = fight('zeppelin', [['harpoon', 0, 1]], 'gunship', idle());
  g.endTurn();
  assert.equal(g.core.pressure, 3);
  g.combat.enemy.intent = idle();
  const hp = g.combat.enemy.hp;
  g.combat.enemy.block = 5;
  assert.ok(g.useCore());
  assert.equal(g.combat.enemy.hp, hp - 5); // floor(1.75 x 3)
  assert.equal(g.core.pressure, 0);
});

test('an aimed Deck Cannon keeps the higher of two d6', () => {
  const g = fight('battleship', [['cannon', 0, 1]], 'gunship', idle());
  const rolls = [2, 5];
  g.d6 = () => rolls.shift();
  const hp = g.combat.enemy.hp;
  g.fire(at(g, 0, 1).uid, 'aimed');
  assert.equal(g.combat.enemy.hp, hp - 4);
});

test('Block absorbs damage; Choking adds 1 per hit; Burn ticks and fades', () => {
  const g = fight('battleship', [['grenadiers', 0, 1]], 'gunship', idle());
  const en = g.combat.enemy;
  g.fire(at(g, 0, 1).uid);
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

test('a destroyed hull module lets the one on top drop into its slot, or the side closes up', () => {
  const g = fight('battleship', [['plating', 0, 1], ['harpoon', 0, 2], ['sniper', 1, 1]], 'gunship', idle());
  const sniper = at(g, 1, 1).uid, harpoon = at(g, 0, 2).uid;
  g.damageModule(at(g, 0, 1).uid, 9, 'attack');
  assert.equal(at(g, 0, 1).uid, sniper, 'sniper dropped into the hull');
  assert.equal(at(g, 1, 1), null);
  g.damageModule(sniper, 9, 'attack');
  assert.equal(at(g, 0, 1).uid, harpoon, 'harpoon closed up toward the Core');
  assert.equal(g.hullCount('bow'), 1);
});

test('installing between modules pushes the outer column (and its upper module) out', () => {
  const g = fight('battleship', [['plating', 0, 1], ['sniper', 1, 1]]);
  g.pendingLoot = ['harpoon'];
  assert.ok(g.canInstall({ row: 0, col: 1 }));
  assert.ok(g.installPending({ row: 0, col: 1 }));
  assert.equal(at(g, 0, 1).id, 'harpoon');
  assert.equal(at(g, 0, 2).id, 'plating');
  assert.equal(at(g, 1, 2).id, 'sniper');
  assert.equal(g.canInstall({ row: 1, col: -1 }), false, 'nothing to stand on');
  assert.equal(g.canInstall({ row: 1, col: 0 }), true, 'the bridge, over the Core');
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
  assert.ok(g.event.options.some((o) => o.id.startsWith('drop-')));
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
  let g = fight('battleship', [['harpoon', 0, 1]], 'leviathan', idle());
  const hp = g.combat.enemy.hp;
  g.fire(at(g, 0, 1).uid);
  assert.equal(g.combat.enemy.hp, hp - 1);

  g = fight('battleship', [['harpoon', 0, 1], ['cannon', 0, 2], ['plating', 1, -1], ['repair', 0, -1]], 'stormqueen', { kind: 'shot', dmg: 2, target: { kind: 'plunge', col: -1 }, lightning: true, name: 'Lightning', aim: 'plunge' });
  g.combat.galeSide = 'bow';
  g.endTurn();
  assert.equal(at(g, 0, 1).id, 'cannon', 'gale swapped the prow pair');
  assert.equal(at(g, 0, -1).hp, 1, 'lightning arced past the plating');
  assert.equal(at(g, 1, -1).hp, 4);

  g = fight('battleship', [['cannon', 0, 1]], 'colossus', direct(1));
  g.endTurn();
  assert.equal(g.combat.enemy.wound, 1);
  g.combat.enemy.intent = direct(1);
  assert.equal(g.intentDamage(g.combat.enemy.intent), 2);
  g.damageEnemy(6);
  g.endTurn();
  assert.equal(g.combat.enemy.wound, 1, 'snapped to 0, then wound again');
  assert.equal(at(g, 0, 1).hp, 3, 'stunned: no attack');
});

test('a Lightning Rod with open sky drinks every bolt', () => {
  const g = fight('battleship', [['repair', 0, -1], ['plating', 0, 1], ['lightningrod', 1, 0]], 'stormqueen');
  assert.ok(g.planPlunge(-1, 3, true)[0].rod);
  g.buildShip([['repair', 0, -1], ['lightningrod', 0, 1], ['plating', 1, 1]]);
  assert.ok(!g.planPlunge(-1, 3, true)[0].rod, 'covered rod does nothing');
});

test('a braced Deflector Vane takes 3 off the next hit on itself or a neighbour', () => {
  const g = fight('battleship', [['harpoon', 0, 1], ['deflector', 0, -1], ['repair', 0, -2]], 'gunship', direct(2));
  const vane = at(g, 0, -1).uid;
  assert.ok(g.useSupport(vane, vane));
  assert.equal(g.planPlunge(-2, 2)[0].braced, true);
  assert.equal(g.planPlunge(-2, 5)[0].dmg, 2);
  assert.equal(g.planDirect(0, 0, 2)[0].braced, undefined, 'the prow is out of its reach');
});

test('synergies explain links, and install previews predict the change', () => {
  const g = fight('battleship', [['telescope', 0, -1], ['mortar', 0, -2], ['harpoon', 0, 1], ['cannon', 1, 1]], 'gunship', idle());
  assert.match(g.synergies(at(g, 0, -2).uid)[0].text, /never reloads/);
  const pv = g.previewInstall('plating', { row: 1, col: 2 });
  assert.equal(pv, null, 'no hull under col 2');
  const pv2 = g.previewInstall('plating', { row: 0, col: 2 });
  assert.ok(pv2.notes.some((n) => /prow/.test(n)));
  assert.ok(pv2.notes.some((n) => /Harpoon Gun can no longer fire/.test(n)));
  assert.ok(pv2.links.some((n) => /Shields the Harpoon Gun/.test(n)));
  assert.equal(g.hullCount('bow'), 1, 'preview leaves the ship unchanged');
  assert.ok(g.previewInstall('cannon', { row: 0, col: -3 }).notes.some((n) => /cannot fire/.test(n)));
  assert.ok(g.previewInstall('gasbag', { row: 1, col: -1 }).notes.some((n) => /Telescope below is now sheltered/.test(n)));
});

test('seed codes round-trip and any text works as a seed', () => {
  assert.equal(Game.seedFromCode(Game.seedCode(987654321)), 987654321);
  assert.equal(Game.seedFromCode('Sky Ship'), Game.seedFromCode('sky ship'));
  const a = new Game({ seed: Game.seedFromCode('ABC') }); a.chooseCore('airship');
  const b = new Game({ seed: Game.seedFromCode('abc') }); b.chooseCore('airship');
  assert.deepEqual(a.map.nodes.map((n) => n.enc), b.map.nodes.map((n) => n.enc));
});

test('direct fire rolls a deck, plunging fire rolls a column on either side', () => {
  const rows = new Set(), cols = new Set();
  for (let seed = 1; seed < 300; seed++) {
    const g = new Game({ seed });
    rows.add(g.rollAim('direct').row);
    cols.add(g.rollAim('plunge').col);
  }
  assert.deepEqual([...rows].sort(), [0, 1]);
  assert.deepEqual([...cols].sort((a, b) => a - b), [-3, -2, -1, 1, 2, 3]);
});

test('a saved run resumes with identical dice', () => {
  const a = fight('airship', [['plating', 0, -1], ['harpoon', 0, 1]], 'gunship', null, 77);
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
  assert.ok(g.cards().length <= 8, 'too many modules');
  assert.equal(g.hull[3], null, 'nothing in the Core slot');
  for (const side of ['stern', 'bow']) {
    const d = side === 'stern' ? -1 : 1, n = g.hullCount(side);
    for (let k = n + 1; k <= 3; k++) assert.equal(g.at(d * k, 0), null, 'gap in the hull');
  }
  for (let col = -3; col <= 3; col++) if (g.at(col, 1)) assert.ok(col === 0 || g.at(col, 0), 'upper module with nothing under it');
  for (const c of g.cards()) {
    assert.ok(c.hp > 0, `dead module left on ship: ${c.id}`);
    assert.ok(c.hp <= g.maxHp(c), `over max: ${c.id}`);
  }
  assert.ok(g.storage.length <= 2);
  if (g.phase !== 'gameover') assert.ok(g.core.hp > 0 && g.core.hp <= g.maxHp(g.core), 'core hp');
  if (g.phase === 'combat') {
    assert.ok(g.combat.enemy.hp > 0 && g.combat.enemy.hp <= g.combat.enemy.max, 'enemy hp');
    assert.ok(g.combat.steam >= 0, 'steam');
  }
}
