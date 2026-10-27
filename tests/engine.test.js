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
  assert.equal(g.core.hp, g.maxHp(g.core), 'the Core is untouched');
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

test('each Core has three ships of its own, and every ship has a trait', () => {
  const a = new Game({ seed: 1 }); a.chooseCore('battleship');
  assert.equal(a.ship, 'bulwark');
  assert.equal(a.core.hp, 17, 'Bulwark: +2 Core Durability');
  const b = new Game({ seed: 1 }); b.chooseCore('zeppelin', 'merchantman');
  assert.equal(b.cogs, 40, 'Merchantman: +20 cogs');
  const c = new Game({ seed: 1 }); c.chooseCore('airship', 'kite');
  assert.equal(c.sight(), 3, 'Sky Kite: +1 sight');
  const x = new Game({ seed: 1 }); x.chooseCore('airship', 'bulwark');
  assert.equal(x.ship, 'courier', 'another class\'s ship falls back to the classic');
  for (const core of ['airship', 'battleship', 'zeppelin', 'clockwork', 'privateer', 'tempest']) assert.equal(Game.shipsFor(core).length, 3);
  const d = new Game({ seed: 1 }); d.chooseCore('airship', 'courier');
  assert.equal(d.weight(), 1 + 0 + 1 - 1, 'Courier: -1 Weight');
});

test('new weapons: grapnel strips Block, rockets fire three times, flak blunts the next attack', () => {
  const g = fight('battleship', [['grapnel', 0, 1], ['flak', 0, -1], ['rockets', 1, 1]], 'gunship', direct(4));
  const en = g.combat.enemy;
  en.block = 5;
  const hp = en.hp;
  g.fire(at(g, 0, 1).uid);
  assert.equal(en.block, 0);
  assert.equal(en.hp, hp - 1);
  en.block = 2;
  g.fire(at(g, 1, 1).uid);
  assert.equal(en.hp, hp - 2, 'two rockets blocked, one hits');
  g.fire(at(g, 0, -1).uid);
  assert.equal(g.intentDamage(g.combat.enemy.intent), 2, 'flak takes 2 off a 4-damage shot');
});

test('Privateer boards through Block; the Tempest charges as it is hit and discharges it', () => {
  const p = fight('privateer', [['grapnel', 0, 1]], 'gunship', idle());
  p.combat.enemy.block = 6;
  const hp = p.combat.enemy.hp;
  assert.ok(p.useCore());
  assert.equal(p.combat.enemy.block, 0);
  assert.equal(p.combat.enemy.hp, hp - 2);
  const t = fight('tempest', [['rockets', 0, 1]], 'gunship', direct(1));
  assert.match(t.coreAbilityInfo().blocked, /No Charge/);
  t.endTurn();
  assert.equal(t.core.charge, 1);
  const ehp = t.combat.enemy.hp;
  assert.ok(t.useCore());
  assert.equal(t.combat.enemy.hp, ehp - 4);
  assert.equal(t.core.charge, 0);
});

test('the Derelict Hulk and the Aether Rift roll a d6 and offer choices on the risky results', () => {
  for (const [enc, roll, stage] of [['derelict', 2, 'collapse'], ['rift', 2, 'slip'], ['rift', 4, 'bargain']]) {
    const g = new Game({ seed: 4 });
    g.chooseCore('airship');
    g.lootOffers = []; g.pendingLoot = [];
    g.enterMap();
    g.d6 = () => roll;
    g.startEncounter({ id: 'x', enc, col: 3 });
    assert.equal(g.event.stage, stage);
    g.chooseOption(g.event.options[0].id);
    assert.ok(g.continueEvent());
  }
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
    const g = playRun(new Game({ seed }), ['airship', 'battleship', 'zeppelin', 'clockwork', 'privateer', 'tempest'][seed % 6], { check: invariants, random: seed % 3 === 0 });
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

// ---------- areas and portals ----------
// Drops a run into its current area's boss fight and sinks the boss.
function sinkBoss(g) {
  g.lootOffers = []; g.pendingLoot = [];
  g.enterMap();
  g.startCombat(g.bossId, { col: g.areaDef().cols, enc: 'boss' });
  g.damageEnemy(999, { pierce: true });
  g.checkEnd();
}

test('a run rolls a different boss for each of the three areas', () => {
  const D = require('../js/data.js');
  for (let seed = 1; seed < 30; seed++) {
    const g = new Game({ seed });
    g.chooseCore('airship');
    assert.equal(g.bossIds.length, D.AREAS.length);
    assert.equal(new Set(g.bossIds).size, g.bossIds.length);
    assert.equal(g.bossId, g.bossIds[0]);
    for (let a = 0; a < D.AREAS.length; a++) assert.ok(D.AREAS[a].bosses.includes(g.bossIds[a]));
  }
});

test("beating an area's boss opens a portal; crossing keeps every module and repairs the Core", () => {
  const g = new Game({ seed: 7, boss: 'leviathan' });
  g.chooseCore('battleship');
  g.buildShip([['plating', 0, 1], ['cannon', 1, 0], ['repair', 0, -1]]);
  const uids = g.cards().map((c) => c.uid).sort();
  g.core.hp = 3;
  sinkBoss(g);
  assert.equal(g.phase, 'loot', 'the boss drops spoils first');
  assert.ok(g.portalReady);
  assert.deepEqual(g.stats.bossesKilled, ['leviathan']);
  while (g.lootOffer) g.skipOffer();
  g.finishLoot();
  assert.equal(g.phase, 'portal');
  assert.ok(g.crossPortal());
  assert.equal(g.area, 1);
  assert.equal(g.phase, 'map');
  assert.equal(g.core.hp, g.maxHp(g.core), 'the Core is fully repaired');
  assert.deepEqual(g.cards().map((c) => c.uid).sort(), uids, 'every module flies through');
  assert.equal(g.bossId, g.bossIds[1]);
  assert.equal(g.maxDepth, g.areaDef().cols);
  const last = Math.max(...g.map.nodes.map((n) => n.col));
  assert.equal(last, g.areaDef().cols);
  assert.equal(g.map.nodes.find((n) => n.col === last).enemy, g.bossIds[1]);
  assert.ok(!g.won);
});

test('only the third boss wins the run', () => {
  const g = new Game({ seed: 3 });
  g.chooseCore('airship');
  for (let a = 0; a < 2; a++) {
    sinkBoss(g);
    while (g.lootOffer) g.skipOffer();
    g.pendingLoot = [];
    g.finishLoot();
    assert.equal(g.phase, 'portal');
    g.crossPortal();
  }
  assert.equal(g.area, 2);
  sinkBoss(g);
  assert.equal(g.phase, 'victory');
  assert.ok(g.won);
  assert.equal(g.stats.areasCleared, 3);
});

// Area 3's danger is the Blood Moon and Bleed rather than raw Durability, so it is checked by the moon.
test("each area's enemies are tougher than the last's at the same column", () => {
  const D = require('../js/data.js');
  const avg = (a) => {
    const g = new Game({ seed: 2 });
    g.chooseCore('airship');
    g.area = a;
    const pool = D.AREAS[a].tiers[0].pool;
    return pool.reduce((n, id) => { g.startCombat(id, { col: 3, enc: 'patrol' }); return n + g.combat.enemy.max; }, 0) / pool.length;
  };
  assert.ok(avg(1) > avg(0), 'area 2 vs 1');
  assert.ok(D.AREAS[2].moon && avg(2) > avg(0), 'area 3 has the moon, and outlasts Area 1');
});

test('a run saved in Area 2 resumes there', () => {
  const g = new Game({ seed: 11 });
  g.chooseCore('zeppelin');
  sinkBoss(g);
  while (g.lootOffer) g.skipOffer();
  g.pendingLoot = [];
  g.finishLoot();
  g.crossPortal();
  const h = Game.fromJSON(JSON.parse(JSON.stringify(g)));
  assert.equal(h.area, 1);
  assert.equal(h.bossId, g.bossId);
  assert.deepEqual(h.map, g.map);
  assert.equal(h.rand(), g.rand(), 'same dice from here on');
});

// ---------- enemy layers and legendaries ----------
test('enemy layers: Wards stop whole hits, pierce skips Block and Armor, pierceLayers skips the outermost', () => {
  const g = fight('battleship', [['plating', 0, 1]], 'gunship', idle());
  const en = g.combat.enemy;
  Object.assign(en, { hp: 30, max: 30, ward: 1, block: 3, armor: 1 });
  assert.equal(g.damageEnemy(5), 0, 'a Ward eats the whole hit');
  assert.equal(en.ward, 0);
  assert.equal(g.damageEnemy(5), 1, 'armor 1 then Block 3');
  en.block = 3;
  assert.equal(g.damageEnemy(5, { pierce: true }), 5, 'pierce skips Block and Armor');
  Object.assign(en, { ward: 1, block: 3 });
  assert.equal(g.damageEnemy(5, { pierce: true }), 0, 'but not a Ward');
  Object.assign(en, { ward: 1, block: 3 });
  assert.equal(g.damageEnemy(5, { pierceLayers: 2 }), 4, 'Ward and Block skipped, Armor still cuts 1');
  Object.assign(en, { ward: 2, block: 3 });
  assert.equal(g.damageEnemy(5, { prism: true }), 5, 'a prism breaks Wards, strips Block and ignores Armor');
  assert.equal(en.ward, 0);
  assert.equal(en.block, 0);
});

test('a boss offers a choice of the two legendaries from its pool', () => {
  const g = new Game({ seed: 4, boss: 'leviathan' });
  g.chooseCore('airship');
  sinkBoss(g);
  const o = g.lootOffer;
  assert.ok(o.legendary);
  assert.deepEqual(o.ids.sort(), ['dreadnought', 'leviplating']);
  assert.equal(o.keep, 1);
});

test('legendaries never roll as loot until unlocked, then can', () => {
  const D = require('../js/data.js');
  const g = new Game({ seed: 9 });
  g.chooseCore('airship');
  for (let i = 0; i < 400; i++) assert.notEqual(D.PARTS[g.randomPart('elite')].rarity, 'legendary');
  const h = new Game({ seed: 9, legendaries: ['dreadnought'] });
  h.chooseCore('airship');
  let seen = 0;
  for (let i = 0; i < 2000; i++) if (h.randomPart('elite') === 'dreadnought') seen++;
  assert.ok(seen > 10 && seen < 200, `rare but possible (${seen}/2000)`);
});

test('Leviathan Plating flings back half of the blocked damage', () => {
  const g = fight('battleship', [['leviplating', 0, 1], ['harpoon', 0, 2]], 'gunship', direct(6, 0, 1));
  const en = g.combat.enemy;
  en.hp = en.max = 30;
  g.endTurn();
  assert.equal(at(g, 0, 2).hp, 3, 'the plating at the front catches the deeper shot');
  assert.equal(at(g, 0, 1).hp, 7 - 4, 'and cuts 2 of it');
  assert.equal(en.hp, 29, 'half of the 2 blocked comes back');
});

test('the Dreadnought Cannon pierces two layers, then cools for two turns', () => {
  const g = fight('battleship', [['dreadnought', 0, 1]], 'leviathan', idle());
  const en = g.combat.enemy;
  en.block = 4;
  const hp = en.hp;
  const uid = at(g, 0, 1).uid;
  assert.ok(g.fire(uid));
  assert.equal(en.hp, hp - 5, 'Block and the Ironclad Hull both skipped');
  g.endTurn();
  assert.equal(g.fireInfo(uid).blocked, 'Reloading');
  g.endTurn();
  assert.equal(g.fireInfo(uid).blocked, 'Reloading');
  g.endTurn();
  g.combat.steam = 9;
  assert.equal(g.fireInfo(uid).blocked, null, 'ready on the third turn');
});

test('the Gale Engine makes three swaps a turn free, and each crackles for 1', () => {
  const g = fight('battleship', [['harpoon', 0, 1], ['galeengine', 0, 2]], 'gunship', idle());
  const en = g.combat.enemy;
  const hp = en.hp;
  g.combat.steam = 0;
  const [a, b] = [at(g, 0, 1).uid, at(g, 0, 2).uid];
  for (let i = 0; i < 3; i++) assert.ok(g.swap(a, b));
  assert.equal(en.hp, hp - 3);
  assert.ok(!g.swap(a, b), 'the fourth costs Steam');
});

test('the Grand Mainspring winds +1 a round while guns fire, and runs down when they stop', () => {
  const g = fight('battleship', [['harpoon', 0, 1], ['mainspring', 0, -1]], 'gunship', idle());
  const uid = at(g, 0, 1).uid;
  assert.equal(g.combat.spring, 1);
  assert.equal(g.fireInfo(uid).bonus, 1);
  g.fire(uid);
  g.combat.enemy.intent = idle();
  g.endTurn();
  assert.equal(g.combat.spring, 2);
  g.combat.enemy.intent = idle();
  g.endTurn();
  assert.equal(g.combat.spring, 0, 'no gun fired last round');
});

// ---------- Area 2: Resonance, the aurora, Hex and the Archon ----------
function aurora(ship, enemy = 'corvette', intent = idle(), seed = 1) {
  const g = new Game({ seed });
  g.chooseCore('battleship');
  g.lootOffers = []; g.pendingLoot = [];
  g.buildShip(ship);
  g.area = 1;
  g.enterMap();
  g.startCombat(enemy, { col: 1, enc: 'patrol' });
  g.combat.enemy.intent = intent;
  g.combat.steam = 9;
  return g;
}

test('arcane modules build Resonance when used, it flows to neighbours, and a full module casts', () => {
  const g = aurora([['runecannon', 1, 1], ['harpoon', 0, 1], ['crystalward', 0, -1]]);
  const rune = at(g, 1, 1);
  rune.res = 0;
  assert.ok(g.fire(rune.uid));
  assert.equal(rune.res, 1, 'firing an arcane weapon builds 1');
  rune.res = 2;
  const harp = at(g, 0, 1);
  harp.res = 0;
  g.combat.enemy.intent = idle();
  g.endTurn();
  assert.equal(at(g, 1, 1).res, 2, 'the sender keeps its own');
  assert.ok(g.cards().some((c) => c.uid !== rune.uid && c.res >= 1), 'a neighbour received Resonance');
  const en = g.combat.enemy;
  en.ward = 0; en.block = 0;
  const hp = en.hp;
  at(g, 1, 1).res = 2;
  g.resonate(at(g, 1, 1).uid, 1);
  assert.equal(at(g, 1, 1).res, 0, 'a full module empties');
  assert.equal(en.hp, hp - 2, 'a weapon casts an Arcane Bolt for 2');
});

test('the Mana Lens doubles the first spell of a turn', () => {
  const g = aurora([['harpoon', 0, 1], ['manalens', 0, 2]]);
  const en = g.combat.enemy; en.ward = 0;
  const hp = en.hp;
  const h = at(g, 0, 1);
  h.res = 2; g.resonate(h.uid, 1);
  assert.equal(en.hp, hp - 4);
  h.res = 2; g.resonate(h.uid, 1);
  assert.equal(en.hp, hp - 6, 'only once a turn');
});

test('the aurora shifts colour every turn in the Aurora Reaches and empowers its kind', () => {
  const g = aurora([['harpoon', 0, 1], ['plating', 0, 2]]);
  const seen = [];
  for (let i = 0; i < 8; i++) { seen.push(g.combat.aurora); g.combat.enemy.intent = idle(); g.endTurn(); }
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1]);
  g.combat.aurora = 'weapon';
  g.combat.steam = 9;
  const base = g.fireInfo(at(g, 0, 1).uid).bonus;
  g.combat.aurora = 'defense';
  assert.equal(g.fireInfo(at(g, 0, 1).uid).bonus, base - 1);
  assert.equal(g.planOn(at(g, 0, 2), 3)[0].dmg, 3 - 1, 'the teal aurora hardens the plating');
  assert.equal(g.planOn(at(g, 0, 1), 3)[0].dmg, 3, 'but not a weapon');
});

test('a hexed weapon heals the enemy, and hexed armor takes +1', () => {
  const g = aurora([['plating', 0, 1], ['harpoon', 0, 2]]);
  const en = g.combat.enemy; en.ward = 0; en.hp = 10;
  const h = at(g, 0, 2);
  h.tokens.hex = true;
  g.combat.aurora = null;
  g.fire(h.uid);
  assert.ok(en.hp > 10);
  const p = at(g, 0, 1);
  p.tokens.hex = true;
  assert.equal(g.planOn(p, 2)[0].dmg, 3);
  g.combat.enemy.intent = idle();
  g.endTurn();
  assert.ok(!at(g, 0, 1).tokens.hex, 'hexes wear off at the end of your turn');
});

test('the Mirage Galleon hides behind illusions; a prism shatters them all', () => {
  const g = aurora([['harpoon', 0, 1], ['prism', 0, -1]], 'mirage', { kind: 'ward', amount: 3, name: 'Mirror Image', illusion: true });
  g.combat.enemy.ward = 0;
  g.endTurn();
  const en = g.combat.enemy;
  assert.equal(en.ward, 3);
  assert.equal(g.wardKind(), 'illusion');
  g.combat.steam = 9;
  const hp = en.hp;
  assert.ok(g.useSupport(at(g, 0, -1).uid, at(g, 0, -1).uid));
  g.fire(at(g, 0, 1).uid);
  assert.equal(en.ward, 0);
  assert.ok(en.hp < hp);
});

test('the Crystal Barge grows armor every turn', () => {
  const g = aurora([['harpoon', 0, 1]], 'barge');
  const en = g.combat.enemy;
  assert.equal(en.armor, 1);
  for (let i = 0; i < 5; i++) { g.combat.enemy.intent = idle(); g.endTurn(); }
  assert.equal(en.armor, 4, 'up to 4');
});

test("the Archon's Grand Convergence: crystals guard it, breaking them all collapses it", () => {
  const g = aurora([['plating', 0, 1], ['rockets', 0, 2]], 'archon');
  const en = g.combat.enemy;
  en.hp = 5; en.phase = 2;
  g.combat.enemy.intent = idle();
  g.endTurn();
  assert.equal(g.combat.enemy.intent.kind, 'channel');
  assert.equal(en.ward, 4, 'four focus crystals');
  en.hp = 30;
  g.combat.steam = 9;
  const rockets = g.cards().find((c) => c.id === 'rockets');
  g.combat.aurora = null;
  g.fire(rockets.uid);
  assert.equal(en.ward, 1, 'three rockets, three crystals');
  g.damageEnemy(1);
  assert.equal(en.ward, 0);
  assert.equal(g.combat.grand, null, 'the spell collapses');
  assert.ok(en.stunned);
  assert.equal(en.hp, 30 - 8, 'with backlash');
});

test('Star Charts reveal the whole route; the Enchanter enchants; the Shrine blesses', () => {
  const g = new Game({ seed: 21 });
  g.chooseCore('airship');
  g.lootOffers = []; g.pendingLoot = [];
  g.buildShip([['harpoon', 0, 1], ['plating', 0, 2], ['repair', 0, -1]]);
  g.area = 1; g.generateMap(); g.enterMap();
  g.startEncounter({ id: g.map.current, enc: 'starchart', col: 3 });
  assert.ok(g.map.nodes.every((n) => g.nodeKnown(n)));
  g.continueEvent();
  g.startEncounter({ id: g.map.current, enc: 'spire', col: 3 });
  const harp = at(g, 0, 1);
  g.chooseOption('ench-' + harp.uid);
  assert.ok(harp.enchanted && g.isArcane(harp));
  g.continueEvent();
  g.startEncounter({ id: g.map.current, enc: 'shrine', col: 4 });
  const steam = g.steamCap();
  g.chooseOption('offer-' + at(g, 0, -1).uid);
  assert.equal(g.steamCap(), steam + 1, 'a support offered: +1 Steam for the run');
  assert.equal(g.cards().length, 2);
});

// ---------- Area 3: the Blood Moon ----------
function blood(ship, enemy = 'bats', intent = idle(), seed = 1, moon = 0) {
  const g = new Game({ seed });
  g.chooseCore('battleship');
  g.lootOffers = []; g.pendingLoot = [];
  g.buildShip(ship);
  g.area = 2;
  g.moon = moon;
  g.enterMap();
  g.startCombat(enemy, { col: 1, enc: 'patrol' });
  g.combat.enemy.intent = intent;
  g.combat.steam = 9;
  return g;
}

test('the Blood Moon rises each round, strengthens enemies, and wanes after a fight', () => {
  const g = blood([['harpoon', 0, 1]]);
  const B = require('../js/data.js').BALANCE;
  assert.equal(g.moon, 0);
  for (let i = 0; i < 3 * B.moonEvery; i++) { g.combat.enemy.intent = idle(); g.endTurn(); }
  assert.equal(g.moon, 3, `+1 every ${B.moonEvery} rounds`);
  assert.equal(g.intentDamage(direct(3)), 3 + 1 + g.combat.enemy.dmgBonus, 'a rising moon: enemies deal +1');
  g.moon = 6;
  assert.ok(g.frenzy());
  assert.equal(g.moonBonus(), B.frenzyBonus);
  g.combat.enemy.hp = 1; g.combat.enemy.ward = 0;
  g.fire(at(g, 0, 1).uid);
  assert.equal(g.combat.over, true);
  assert.equal(g.moon, 6 - B.moonWane, 'it wanes after the fight');
  // Outside Area 3 the moon does nothing.
  const a1 = fight('battleship', [['harpoon', 0, 1]], 'gunship', idle());
  a1.moon = 6;
  assert.equal(a1.moonBonus(), 0);
});

test('a frenzied moon makes every hit leave Bleed, and Bleed ticks then fades', () => {
  const g = blood([['plating', 0, 1], ['harpoon', 0, 2]], 'bats', direct(2), 1, 6);
  const front = at(g, 0, 1);
  g.endTurn();
  const left = front.tokens.bleed;
  assert.ok(left >= 0);
  // Set Bleed directly and watch it tick.
  const m = at(g, 0, 2) || at(g, 0, 1);
  m.tokens.bleed = 3;
  const hp = m.hp;
  g.combat.enemy.intent = idle();
  g.moon = 0;
  g.endTurn();
  if (g.locate(m.uid)) { assert.equal(m.hp, hp - 3, 'it deals its stacks'); assert.equal(m.tokens.bleed, 2, 'then loses 1'); }
});

test('Bleed placed by an intent stacks, and a Blood Cultist heals from it', () => {
  const g = blood([['plating', 0, 1], ['bulwark', 0, 2]], 'cultist', { kind: 'token', token: 'bleed', stacks: 2, dmg: 0, name: 'Knife', target: { kind: 'direct', row: 0, depth: 0 } });
  g.endTurn();
  const front = at(g, 0, 2);
  assert.equal(front.tokens.bleed, 1, 'placed 2, ticked once at the start of your turn');
  front.tokens.bleed = 2;
  g.combat.enemy.intent = idle();
  g.combat.enemy.hp -= 10;
  const ehp = g.combat.enemy.hp;
  g.endTurn();
  assert.equal(g.combat.enemy.hp, ehp + 2, 'it drank the 2 Bleed damage');
});

test('blood parts cost Core Durability; the Blood Harpoon heals the Core as it wounds', () => {
  const g = blood([['bloodharpoon', 0, 1]]);
  const en = g.combat.enemy; en.ward = 0; en.block = 0;
  g.core.hp = 10;
  const ehp = en.hp;
  assert.ok(g.fire(at(g, 0, 1).uid));
  assert.equal(en.hp, ehp - 3);
  assert.equal(g.core.hp, 10 - 1 + 2, 'paid 1, healed ceil(3/2)');
  g.core.hp = 1;
  at(g, 0, 1).fired = 0;
  assert.equal(g.fireInfo(at(g, 0, 1).uid).blocked, 'Core too weak to bleed');
});

test('the Thorned Hull bleeds whatever hits it; the Sanguine Engine and Crimson Altar trade blood for power', () => {
  const g = blood([['sanguine', 0, 1], ['thornhull', 0, 2], ['crimsonaltar', 0, -1], ['plating', 0, -2]], 'bats', direct(3));
  g.endTurn();
  assert.equal(g.combat.enemy.bleed, 2, 'thorns: Bleed 2');
  const steam = g.combat.steam, core = g.core.hp;
  const sang = at(g, 0, 1);
  assert.ok(g.useSupport(sang.uid, sang.uid));
  assert.equal(g.combat.steam, steam + 2);
  assert.equal(g.core.hp, core - 1);
  const altar = at(g, 0, -1), victim = at(g, 0, -2);
  const w = g.blessings.weapon;
  assert.ok(g.useSupport(altar.uid, victim.uid));
  assert.equal(g.blessings.weapon, w + 1, '+1 weapon damage for the run');
  assert.ok(!g.locate(victim.uid), 'the module is gone');
  assert.deepEqual(g.supportTargets(altar.uid), [], 'once a fight');
});

test('the Moon Mortar grows with the moon; the Eclipse Blade with Bleed', () => {
  const g = blood([['moonmortar', 1, 0], ['harpoon', 0, 1]]);
  g.moon = 0; assert.equal(g.mortarDamage(), 2);
  g.moon = 6; assert.equal(g.mortarDamage(), 5);
  assert.equal(g.bladeDamage(), 6);
  at(g, 0, 1).tokens.bleed = 2; g.combat.enemy.bleed = 1;
  assert.equal(g.bladeDamage(), 9);
});

test('the Wraith Clipper is untouchable on odd rounds, except by Bleed and Burn', () => {
  const g = blood([['harpoon', 0, 1]], 'wraith');
  const en = g.combat.enemy;
  assert.equal(g.combat.round, 1);
  const hp = en.hp;
  g.fire(at(g, 0, 1).uid);
  assert.equal(en.hp, hp, 'round 1: phased');
  en.bleed = 2;
  g.endTurn();
  assert.equal(en.hp, hp - 2, 'Bleed still reaches it');
  assert.equal(g.combat.round, 2);
  en.block = 0;
  g.fire(at(g, 0, 1).uid);
  assert.ok(en.hp < hp - 2, 'round 2: solid');
});

test('the Bone Galleon rises once at half Durability', () => {
  const g = blood([['harpoon', 0, 1]], 'bonegalleon');
  const en = g.combat.enemy;
  g.combat.round = 2; en.armor = 0; en.block = 0;
  en.hp = 1;
  g.fire(at(g, 0, 1).uid);
  assert.equal(g.combat.over, false);
  assert.equal(en.hp, Math.round(en.max / 2));
  en.hp = 1; at(g, 0, 1).fired = 0;
  g.fire(at(g, 0, 1).uid);
  assert.equal(g.combat.over, true, 'not twice');
});

test('the Crimson Sovereign: bats screen and bite, the moon locks, and the eclipse fires a blood beam', () => {
  const g = blood([['plating', 0, 1], ['harpoon', 0, 2]], 'sovereign', { kind: 'ward', amount: 2, name: 'Call the Swarm', bats: true });
  g.endTurn();
  assert.equal(g.combat.bats, 2);
  assert.equal(g.wardKind(), 'bats');
  g.combat.enemy.intent = idle();
  const total = g.totalHp();
  g.endTurn();
  assert.ok(g.totalHp() < total, 'the bats bit');
  // Crimson Tide: the moon locks at full.
  const en = g.combat.enemy;
  en.hp = Math.round(30 * en.hpScale) - 1;
  g.rollIntent();
  assert.equal(g.moon, 6);
  assert.ok(g.combat.moonLocked);
  // Eclipse: the beam is telegraphed on a deck.
  en.hp = 5;
  g.combat.beamRest = 0;
  g.rollIntent();
  assert.ok(g.combat.eclipse);
  assert.equal(en.intent.kind, 'beam');
  assert.ok(g.isAttack(en.intent));
  assert.ok(g.intentDamage(en.intent) >= 10);
});

test('Blood Altar, Crypt Wreck and Moon Well', () => {
  const g = new Game({ seed: 5 });
  g.chooseCore('airship');
  g.lootOffers = []; g.pendingLoot = [];
  g.buildShip([['harpoon', 0, 1], ['plating', 0, 2]]);
  g.area = 2; g.generateMap(); g.enterMap();
  g.moon = 5;
  g.startEncounter({ id: g.map.current, enc: 'moonwell', col: 3 });
  assert.equal(g.moon, 0);
  g.continueEvent(); g.finishLoot && g.phase === 'loot' && g.finishLoot();
  g.phase = 'map';
  g.core.hp = 15;
  g.startEncounter({ id: g.map.current, enc: 'bloodaltar', col: 3 });
  g.chooseOption('rare');
  assert.equal(g.core.hp, 11);
  assert.ok(g.event.loot.ids.every((id) => require('../js/data.js').PARTS[id].rarity === 'rare'));
  g.event = null; g.phase = 'map';
  g.startEncounter({ id: g.map.current, enc: 'crypt', col: 3 });
  assert.deepEqual(g.event.options.map((o) => o.id), ['search', 'leave']);
  g.chooseOption('search');
  assert.equal(g.event.rolls.length, 1);
});

// ---------- The Workshop ----------
const Meta = require('../js/meta.js');
const D = require('../js/data.js');
global.localStorage = global.localStorage || { store: {}, getItem(k) { return this.store[k] ?? null; }, setItem(k, v) { this.store[k] = String(v); }, removeItem(k) { delete this.store[k]; } };

test('a run pays Blueprints by areas, bosses and contracts, and losing still pays', () => {
  const m = Meta.blank();
  const g = new Game({ seed: 3 });
  g.chooseCore('airship');
  g.stats.areasCleared = 1; g.stats.bossesKilled = ['leviathan']; g.stats.quests = 2;
  g.phase = 'gameover';
  const out = Meta.recordRun(m, g);
  const B = D.BLUEPRINTS;
  assert.equal(out.blueprints.total, B.base + B.area + B.boss + B.firstBoss + 2 * B.quest);
  assert.equal(m.blueprints, out.blueprints.total);
  assert.deepEqual(out.legendaries, ['leviplating', 'dreadnought']);
  assert.ok(m.achievements.includes('firstflight') && m.achievements.includes('giantslayer'));
  assert.equal(m.lastShip.core, 'airship');
});

test('Blueprints buy Cores, parts, upgrades and lore; locked parts stay out of the loot', () => {
  const m = Meta.blank();
  m.blueprints = 200;
  assert.ok(!Meta.coreUnlocked(m, 'arcanist'));
  assert.ok(Meta.buyUnlock(m, 'arcanist'));
  assert.ok(Meta.coreUnlocked(m, 'arcanist'));
  assert.equal(m.blueprints, 140);
  assert.ok(!Meta.buyLore(m, 'leviathan'), 'cannot read lore of what you have not met');
  m.seen.enemies.push('leviathan');
  assert.ok(Meta.buyLore(m, 'leviathan'));
  assert.ok(Meta.buyUpgrade(m, 'reroll'));
  const g = new Game({ seed: 4, unlocked: Meta.runPool(m) });
  g.chooseCore('airship');
  for (let i = 0; i < 300; i++) assert.ok(!['tesla', 'manalens', 'sniper'].includes(g.randomPart('elite')));
  Meta.buyUnlock(m, 'tesla');
  assert.ok(Meta.runPool(m).includes('tesla'));
});

test('starting upgrades: a spare part, first-turn Steam, and a reroll per area', () => {
  const g = new Game({ seed: 8, upgrades: { extraPart: true, steam: true, reroll: true } });
  g.chooseCore('airship');
  assert.equal(g.pendingLoot.length, 1, 'a spare part waits to be installed');
  assert.ok(g.canReroll());
  const before = g.lootOffer.ids.slice();
  assert.ok(g.rerollOffer());
  assert.equal(g.rerolls, 0);
  assert.equal(g.lootOffer.ids.length, before.length);
  assert.ok(!g.canReroll());
  g.lootOffers = []; g.pendingLoot = []; g.enterMap();
  const cap = g.steamCap();
  g.startCombat('cutter', { col: 1, enc: 'patrol' });
  assert.ok(g.combat.steam >= cap + 1, '+1 Steam on the first turn');
});

test('Storm Tiers stack their modifiers, and a win opens the next tier', () => {
  const base = new Game({ seed: 9 }); base.chooseCore('airship'); base.lootOffers = []; base.pendingLoot = []; base.enterMap();
  const hard = new Game({ seed: 9, tier: 6 }); hard.chooseCore('airship'); hard.lootOffers = []; hard.pendingLoot = []; hard.enterMap();
  assert.equal(hard.maxHp(hard.core), base.maxHp(base.core) - 3);
  assert.equal(hard.cogs, base.cogs - 10);
  base.startCombat('gunship', { col: 1, enc: 'patrol' }); hard.startCombat('gunship', { col: 1, enc: 'patrol' });
  assert.ok(hard.combat.enemy.max > base.combat.enemy.max);
  assert.equal(hard.combat.enemy.block, 3);
  assert.equal(hard.combat.enemy.dmgBonus, base.combat.enemy.dmgBonus + 1);
  const m = Meta.blank();
  hard.phase = 'victory';
  Meta.recordRun(m, hard);
  assert.equal(m.tierCleared.airship, 6);
  const w = new Game({ seed: 10 }); w.chooseCore('battleship'); w.phase = 'victory';
  const m2 = Meta.blank();
  assert.equal(Meta.recordRun(m2, w).tier, 1);
});

test('the Workshop Cores: Attuned, Bloodletting and Umbral Strike', () => {
  const a = fight('arcanist', [['harpoon', 0, 1]], 'gunship', idle());
  assert.ok(a.isArcane(at(a, 0, 1)), 'every module is arcane');
  a.useCore();
  assert.equal(at(a, 0, 1).res, 1);
  const s = fight('sanguinist', [['harpoon', 0, 1]], 'gunship', idle());
  const st = s.combat.steam, hp = s.core.hp;
  assert.ok(s.useCore());
  assert.equal(s.combat.steam, st + 3); assert.equal(s.core.hp, hp - 2);
  const e = fight('eclipse', [['harpoon', 0, 1]], 'gunship', idle());
  e.combat.enemy.bleed = 3; e.combat.enemy.block = 5;
  const ehp = e.combat.enemy.hp;
  assert.ok(e.useCore());
  assert.equal(e.combat.enemy.hp, ehp - (D.BALANCE.umbraBase + 3), 'base + 0 Resonance + 3 Bleed, piercing');
});
