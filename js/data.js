// Cardships content: Cores, Part Cards, enemies, encounters and contracts. All dice are d6.
(function (root) {
  // ---------- Cores ----------
  // steam: the pressure pool that refills at the start of every turn and pays for every action.
  const CORES = {
    airship: {
      id: 'airship', name: 'Airship Core', weight: 1, hp: 8, steam: 4,
      style: 'Skirmisher',
      blurb: 'Light and slippery. Dodges telegraphed shots and reshuffles its modules on the fly.',
      passive: { name: 'Nimble', text: 'Your first Swap each turn is free. Evade costs 1 Steam.' },
      ability: { id: 'strafe', name: 'Strafing Run', cost: 2, text: 'Deal 1 damage for every weapon installed, at any layer.' },
      start: { left: ['propeller'], right: ['harpoon'] },
    },
    battleship: {
      id: 'battleship', name: 'Battleship Core', weight: 4, hp: 12, steam: 3,
      style: 'Juggernaut',
      blurb: 'A flying fortress. Never dodges; shrugs off rams and rams back harder the heavier it gets.',
      passive: { name: 'Ironsides', text: 'Rams against you deal 2 less damage. You cannot Evade.' },
      ability: { id: 'ram', name: 'Ram', cost: 2, text: 'Deal 2 damage plus half your ship\'s Weight. Your bow (outermost right module, or Core) takes 1.' },
      start: { left: ['plating'], right: ['cannon'] },
    },
    zeppelin: {
      id: 'zeppelin', name: 'Zeppelin Core', weight: -1, hp: 6, steam: 3,
      style: 'Bombardier',
      blurb: 'A fragile gasbag that banks pressure across turns for a devastating payload.',
      passive: { name: 'Pressure Vessel', text: 'Steam left over at the end of your turn is stored as Pressure (max 9).' },
      ability: { id: 'bombard', name: 'Bombard', cost: 1, text: 'Spend all Pressure: deal 2 damage per Pressure, ignoring Block.' },
      start: { left: ['gasbag'], right: ['mortar'] },
    },
    clockwork: {
      id: 'clockwork', name: 'Clockwork Core', weight: 2, hp: 9, steam: 4,
      style: 'Engineer', locked: true,
      blurb: 'A self-winding engine that keeps its modules ticking and fires its guns twice.',
      passive: { name: 'Self-Winding', text: 'At the start of each turn, repair 1 on your most damaged module.' },
      ability: { id: 'overclock', name: 'Overclock', cost: 1, text: 'The next weapon you fire this turn fires twice.' },
      start: { left: ['repair'], right: ['harpoon'] },
    },
  };

  // ---------- Parts ----------
  // type: weapon | defense | support | utility.  rarity: common | uncommon | rare.
  // cost: Steam to use (null = passive only).  arc: fires from any layer, not just the outside.
  const PARTS = {
    harpoon: {
      name: 'Harpoon Gun', abbr: 'HRP', type: 'weapon', rarity: 'common', weight: 1, hp: 3, cost: 1, dmg: 2,
      rules: [['Fire · 1 Steam', 'Deal 2 damage.'], ['Buried · Chain Feed', 'The weapon directly outside it deals +1 damage.']],
    },
    cannon: {
      name: 'Deck Cannon', abbr: 'CAN', type: 'weapon', rarity: 'common', weight: 1, hp: 4, cost: 2,
      table: [2, 2, 3, 3, 4, 5],
      rules: [['Fire · 2 Steam', 'Roll a d6 for damage: 1-2 → 2, 3-4 → 3, 5 → 4, 6 → 5.'], ['Aimed · +1 Steam', 'Roll twice, keep the higher.'], ['Buried · Powder Store', 'If a module touching it is destroyed, deal 3 damage to the enemy.']],
    },
    mortar: {
      name: 'Mortar', abbr: 'MOR', type: 'weapon', rarity: 'uncommon', weight: 1, hp: 3, cost: 2, dmg: 3, arc: true,
      rules: [['Fire · 2 Steam · Arcs', 'Deal 3 damage. Fires from any layer. Then reloads for a turn.'], ['Synergy', 'A Telescope touching it removes the reload.']],
    },
    flamethrower: {
      name: 'Flamethrower', abbr: 'FLM', type: 'weapon', rarity: 'common', weight: 1, hp: 3, cost: 1, dmg: 1, burn: 2,
      rules: [['Fire · 1 Steam', 'Deal 1 damage and apply 2 Burn (Burn deals its stacks at the start of the enemy\'s turn, then drops by 1).']],
    },
    gatling: {
      name: 'Glue Gatling', abbr: 'GLU', type: 'weapon', rarity: 'uncommon', weight: 1, hp: 3, cost: 1, dmg: 1, weak: 2,
      rules: [['Fire · 1 Steam', 'Deal 1 damage and apply 2 Gummed (the enemy deals 1 less damage per hit for 2 turns).'], ['Passive · Adhesive', 'Plating touching it gains +1 max Durability.']],
    },
    grenadiers: {
      name: 'Gas Grenadiers', abbr: 'GAS', type: 'weapon', rarity: 'uncommon', weight: 1, hp: 3, cost: 1, dmg: 1, vuln: 2,
      rules: [['Fire · 1 Steam', 'Deal 1 damage and apply 2 Choking (the enemy takes 1 more damage per hit for 2 turns).'], ['Passive', 'If a module touching it is destroyed, apply 2 Choking.']],
    },
    sniper: {
      name: 'Sniper Nest', abbr: 'SNP', type: 'weapon', rarity: 'uncommon', weight: 1, hp: 2, cost: 1, dmg: 2,
      rules: [['Fire · 1 Steam', 'Deal 2 damage.'], ['Steady Aim · +1 Steam', 'Deal 4 damage instead, ignoring Block.']],
    },
    tesla: {
      name: 'Tesla Coil', abbr: 'TES', type: 'weapon', rarity: 'rare', weight: 1, hp: 3, cost: 2, arc: true,
      rules: [['Fire · 2 Steam · Arcs', 'Deal 1 damage plus 1 for every other weapon installed. Ignores Block.']],
    },
    plating: {
      name: 'Brass Plating', abbr: 'PLT', type: 'defense', rarity: 'common', weight: 1, hp: 4,
      rules: [['Outside', 'Takes every hit aimed at its side.'], ['Buried · Bulkhead', 'Soaks 1 damage of any hit on a module touching it.']],
    },
    bulwark: {
      name: 'Ironclad Bulwark', abbr: 'BLW', type: 'defense', rarity: 'rare', weight: 2, hp: 6,
      rules: [['Outside', 'Takes every hit aimed at its side, 1 less damage each.'], ['Buried', 'Soaks 2 damage of any hit on a module touching it.']],
    },
    deflector: {
      name: 'Deflector Vane', abbr: 'DFL', type: 'defense', rarity: 'uncommon', weight: 1, hp: 3, cost: 1,
      rules: [['Brace · 1 Steam', 'Negate the next hit on this side this round.']],
    },
    repair: {
      name: 'Repair Bay', abbr: 'REP', type: 'support', rarity: 'common', weight: 1, hp: 3, cost: 1, heal: 2,
      rules: [['Mend · 1 Steam', 'Repair 2 on a module touching it, or the Core if attached to it.'], ['Passive', 'After each combat, repair 1 on itself.']],
    },
    quarters: {
      name: 'Crew Quarters', abbr: 'CRW', type: 'support', rarity: 'uncommon', weight: 1, hp: 3,
      rules: [['Passive · Manning the Guns', 'Weapons touching it cost 1 less Steam (minimum 1).']],
    },
    boiler: {
      name: 'Auxiliary Boiler', abbr: 'BOI', type: 'support', rarity: 'uncommon', weight: 1, hp: 3, steam: 1,
      rules: [['Passive', '+1 Steam every turn.'], ['Volatile', 'When destroyed, deals 2 damage to each module touching it.']],
    },
    sprinkler: {
      name: 'Sprinkler Tank', abbr: 'SPR', type: 'support', rarity: 'common', weight: 1, hp: 2, cost: 1, cleans: ['fire'],
      rules: [['Douse · 1 Steam', 'Remove Fire from any module.'], ['Passive', 'Modules touching it cannot catch Fire.']],
    },
    scrubber: {
      name: 'Air Scrubber', abbr: 'SCR', type: 'support', rarity: 'common', weight: 1, hp: 2, cost: 1, cleans: ['gas', 'glue'],
      rules: [['Scrub · 1 Steam', 'Remove Gas or Glue from any module.'], ['Passive', 'Modules touching it are immune to Gas and Glue.']],
    },
    telescope: {
      name: 'Telescope', abbr: 'TEL', type: 'utility', rarity: 'common', weight: 1, hp: 2,
      rules: [['Outside', 'See further ahead: +1 route choice.'], ['Spotter', 'A Mortar touching it never reloads; a Sniper touching it deals +1.']],
    },
    gasbag: {
      name: 'Gasbag', abbr: 'BAG', type: 'utility', rarity: 'common', weight: -2, hp: 2,
      rules: [['Passive', 'Weight -2. Fragile.']],
    },
    propeller: {
      name: 'Propeller', abbr: 'PRP', type: 'utility', rarity: 'common', weight: 0, hp: 2,
      rules: [['Outside', 'Evade costs 1 less Steam (minimum 1).']],
    },
    cargo: {
      name: 'Cargo Hold', abbr: 'CRG', type: 'utility', rarity: 'uncommon', weight: 1, hp: 3,
      rules: [['Passive', 'Holds up to 2 spare parts (+1 Weight each). Lost if destroyed.'], ['Quick Swap', 'After combat, swap a stored part with an installed one.']],
    },
    hatch: {
      name: 'Supply Hatch', abbr: 'SUP', type: 'utility', rarity: 'uncommon', weight: 1, hp: 2,
      rules: [['Scavenger\'s Choice', 'Loot offers 1 extra part.'], ['Logistics', 'With a Cargo Hold installed, keep 2 parts from each loot.']],
    },
    autoloader: {
      name: 'Autoloader', abbr: 'AUT', type: 'utility', rarity: 'rare', weight: 1, hp: 3,
      rules: [['Passive', 'Weapons touching it can fire twice per turn.']],
    },
    gyro: {
      name: 'Gyro Stabilizer', abbr: 'GYR', type: 'utility', rarity: 'rare', weight: 1, hp: 3,
      rules: [['Passive', 'Your first Evade each turn costs 0 Steam. Rams against you deal 2 less.']],
    },
    heart: {
      name: 'Clockwork Heart', abbr: 'HRT', type: 'support', rarity: 'rare', weight: 1, hp: 4,
      rules: [['Attached to Core', 'Core gains +3 max Durability and repairs 1 at the start of each turn.']],
    },
    overpressure: {
      name: 'Overpressure Valve', abbr: 'OVP', type: 'support', rarity: 'rare', weight: 1, hp: 3, steam: 2,
      rules: [['Passive', '+2 Steam every turn.'], ['Strain', 'If you end a turn with Steam unspent, this module takes 1 damage.']],
    },
  };
  for (const [id, p] of Object.entries(PARTS)) p.id = id;

  const RARITY_ODDS = {
    normal: { common: 62, uncommon: 30, rare: 8 },
    elite: { common: 25, uncommon: 50, rare: 25 },
  };

  // ---------- Enemies ----------
  // Intent kinds:
  //   shot   {dmg}           aimed at a rolled side + layer
  //   rake   {dmg}           every module on a rolled side
  //   broadside {dmg}        the outermost module on both sides
  //   ram    {dmg, self}     the outermost module on a rolled side; weight resists it
  //   token  {token, dmg}    a rolled side + layer gets a status token (and optional damage)
  //   block  {amount}        Block absorbs your damage until the start of its next turn
  //   repair {amount}
  //   charge {amount}        its next attack deals +amount
  const I = {
    shot: (dmg, name = 'Broadside Gun') => ({ kind: 'shot', dmg, name }),
    rake: (dmg, name = 'Raking Fire') => ({ kind: 'rake', dmg, name }),
    broadside: (dmg, name = 'Twin Volley') => ({ kind: 'broadside', dmg, name }),
    ram: (dmg, self = 2, name = 'Ram') => ({ kind: 'ram', dmg, self, name }),
    token: (token, dmg, name) => ({ kind: 'token', token, dmg, name }),
    block: (amount, name = 'Raise Plating') => ({ kind: 'block', amount, name }),
    repair: (amount, name = 'Patch Hull') => ({ kind: 'repair', amount, name }),
    charge: (amount, name = 'Stoke Boilers') => ({ kind: 'charge', amount, name }),
  };

  // Phase tables map d6 → intent, listed from full health down. `min` is the lowest Durability of the phase.
  const ENEMIES = {
    cutter: {
      name: 'Pirate Cutter', weight: 2, hp: 9, look: 'cutter',
      phases: [
        { name: 'Boarding Run', min: 5, table: [I.shot(2), I.shot(2), I.shot(3, 'Swivel Gun'), I.block(3), I.token('fire', 1, 'Firepot'), I.charge(2)] },
        { name: 'Cornered', min: 1, table: [I.shot(2), I.shot(3, 'Swivel Gun'), I.ram(3), I.ram(3), I.broadside(1), I.repair(2)] },
      ],
    },
    skiff: {
      name: 'Scavenger Skiff', weight: 2, hp: 8, look: 'skiff',
      phases: [
        { name: 'Scavenging', min: 1, table: [I.shot(2, 'Rivet Gun'), I.shot(2, 'Rivet Gun'), I.block(3), I.ram(3), I.token('gas', 0, 'Stink Bomb'), I.shot(3, 'Rivet Gun')] },
      ],
    },
    gunship: {
      name: 'Corsair Gunship', weight: 5, hp: 14, look: 'gunship',
      phases: [
        { name: 'Patrol', min: 10, table: [I.shot(2), I.shot(2), I.broadside(2), I.block(4), I.repair(2), I.shot(3, 'Long Gun')] },
        { name: 'Engaged', min: 5, table: [I.shot(3, 'Long Gun'), I.broadside(2), I.block(3), I.ram(4), I.token('glue', 1, 'Tar Shot'), I.shot(2)] },
        { name: 'Desperate', min: 1, table: [I.ram(4), I.ram(4), I.shot(3, 'Long Gun'), I.broadside(2), I.ram(5, 3), I.shot(4, 'Long Gun')] },
      ],
    },
    bomber: {
      name: 'Bomber Dirigible', weight: 1, hp: 11, look: 'bomber',
      phases: [
        { name: 'Bombing Run', min: 6, table: [I.token('fire', 1, 'Incendiary Drop'), I.token('fire', 1, 'Incendiary Drop'), I.rake(1, 'Carpet Bomb'), I.shot(2, 'Belly Gun'), I.block(3, 'Ballast Shield'), I.shot(3, 'Heavy Bomb')] },
        { name: 'Ditching Ballast', min: 1, table: [I.rake(1, 'Carpet Bomb'), I.rake(2, 'Carpet Bomb'), I.token('fire', 2, 'Incendiary Drop'), I.shot(3, 'Heavy Bomb'), I.repair(3, 'Seal Gasbag'), I.charge(3, 'Arm Payload')] },
      ],
    },
    sentinel: {
      name: 'Clockwork Sentinel', weight: 7, hp: 16, look: 'sentinel',
      phases: [
        { name: 'Wound Tight', min: 9, table: [I.block(5, 'Gear Shield'), I.shot(3, 'Piston Gun'), I.shot(3, 'Piston Gun'), I.charge(3, 'Wind Spring'), I.block(4, 'Gear Shield'), I.broadside(2, 'Gear Spray')] },
        { name: 'Unwinding', min: 1, table: [I.shot(4, 'Piston Gun'), I.ram(5, 2, 'Piston Ram'), I.ram(5, 2, 'Piston Ram'), I.broadside(3, 'Gear Spray'), I.block(3, 'Gear Shield'), I.shot(3, 'Piston Gun')] },
      ],
    },
    leviathan: {
      name: 'The Iron Leviathan', weight: 10, hp: 30, look: 'leviathan', boss: true,
      gimmick: 'Armored dreadnought. Changes armament at 20 and 10 Durability.',
      phases: [
        { name: 'Artillery & Disruption', min: 21, table: [I.shot(3, 'Heavy Cannon'), I.shot(3, 'Heavy Cannon'), I.token('gas', 1, 'Toxic Shell'), I.block(6, 'Armor Plating'), I.broadside(2), I.charge(3, 'Load Main Battery')] },
        { name: 'Hazard Protocol', min: 11, table: [I.token('glue', 1, 'Suppressing Fire'), I.token('fire', 2, 'Incendiary Round'), I.shot(3, 'Heavy Cannon'), I.repair(3, 'Repair Crews'), I.rake(1, 'Flak Barrage'), I.broadside(2)] },
        { name: 'Desperation', min: 1, table: [I.ram(5, 2, 'Iron Ram'), I.ram(5, 2, 'Iron Ram'), I.shot(3, 'Heavy Cannon'), I.shot(4, 'Heavy Cannon'), I.broadside(3), I.shot(4, 'Main Battery')] },
      ],
    },
  };
  for (const [id, e] of Object.entries(ENEMIES)) e.id = id;

  // ---------- Encounters ----------
  // paths: how many routes you choose from after it.
  const ENCOUNTERS = {
    cutter: { name: 'Sky Pirate Cutter', kind: 'Combat', paths: 2, enemy: 'cutter', text: 'A lightly armed raider. Its crew grows reckless when hurt.' },
    gunship: { name: 'Corsair Gunship', kind: 'Combat', paths: 2, enemy: 'gunship', text: 'A heavy patrol ship. Three phases, each nastier than the last.' },
    bomber: { name: 'Bomber Dirigible', kind: 'Combat', paths: 2, enemy: 'bomber', text: 'Drops fire on your modules. Light, so it rams poorly.' },
    sentinel: { name: 'Clockwork Sentinel', kind: 'Combat', paths: 2, enemy: 'sentinel', text: 'A wound-up war machine behind thick gear shields. Hits harder as it unwinds.' },
    storm: {
      name: 'Storm Front', kind: 'Hazard', paths: 3,
      text: 'Fly through the squall. Roll a d6.',
      table: ['Lightning: 2 damage to an outside module', 'Crosswind: 1 damage to both outside modules (Weight 6+ ignores it)', 'Downdraft: jettison an outside module or the Core takes 2', 'Eye of the storm: repair or scavenge', 'Drifting salvage: pick 1 of 2 parts', 'Tailwind: +1 route and +2 Steam next fight'],
    },
    trader: {
      name: 'Trading Zeppelin', kind: 'Trade', paths: 2,
      text: 'A merchant zeppelin hails you. Choose one deal.',
      table: null,
    },
    beacon: {
      name: 'Distress Beacon', kind: 'Ambush', paths: 3, enemy: 'skiff',
      text: 'A wreck calls for help. Roll a d6, then a Scavenger Skiff springs the trap.',
      table: ['Debris: 2 damage to an outside module', 'Fire spreads to an outside module', 'Gas leaks into a weapon', 'Trap sprung: the Skiff starts with 4 Block', 'You spot the trap: +2 Steam on your first turn', 'Salvage the wreck first: pick 1 of 2 parts'],
    },
    guild: {
      name: 'Mercenary Guild', kind: 'Quest', paths: 2,
      text: 'A guild outpost on a floating rock. Roll two contracts and sign one.',
      table: null,
    },
    hangar: {
      name: 'Sky Dock', kind: 'Sky Dock', paths: 1,
      text: 'A hangar in the clouds. Rearrange your modules freely, then roll for the mechanics\' help.',
      table: ['Core Patch: repair 3 Core', 'Part Maintenance: fully repair a module', 'Reinforcement: +1 max Durability to a module', 'Overhaul: repair 2 on every module', 'Spare Part: pick 1 of 2 parts', 'Master Mechanic: reinforce a module and fully repair it'],
    },
    boss: { name: 'The Iron Leviathan', kind: 'Boss', paths: 0, enemy: 'leviathan', text: 'The final gate.' },
  };
  for (const [id, e] of Object.entries(ENCOUNTERS)) e.id = id;

  const ENCOUNTER_WEIGHTS = { cutter: 14, gunship: 10, bomber: 9, sentinel: 6, storm: 14, trader: 12, beacon: 12, guild: 9, hangar: 10 };

  // ---------- Contracts (rolled on a d6; you sign one of two) ----------
  const QUESTS = [
    { id: 'bounty', name: 'The Bounty', goal: 'Defeat an enemy with 14+ max Durability.', reward: 'Pick a rare part.' },
    { id: 'survivor', name: 'The Survivor', goal: 'Clear a Storm Front without taking damage.', reward: 'A free Brass Plating and a full repair.' },
    { id: 'hoarder', name: 'The Hoarder', goal: 'Install a Cargo Hold.', reward: 'A free Supply Hatch.' },
    { id: 'ironclad', name: 'The Ironclad', goal: 'Win a fight while one of your modules is on fire.', reward: '+2 max Durability to a module of your choice.' },
    { id: 'marksman', name: 'The Marksman', goal: 'Win a fight within 3 rounds.', reward: 'Pick an uncommon weapon.' },
    { id: 'rammer', name: 'The Rammer', goal: 'Finish an enemy with a Ram or Bombard.', reward: '+2 max Durability to your Core.' },
  ];

  const TOKENS = {
    fire: { name: 'Fire', text: 'Deals 1 damage to this module at the start of your turn.' },
    glue: { name: 'Glue', text: 'A glued weapon deals 1 less damage, and a glued module cannot be swapped.' },
    gas: { name: 'Gas', text: 'Using this module costs 1 more Steam.' },
  };

  // Targeting: side d6 (1-3 left, 4-6 right); layer d6 (1-2 → 1, 3-4 → 2, 5-6 → 3).
  const LAYER_TABLE = [1, 1, 2, 2, 3, 3];

  const data = { CORES, PARTS, RARITY_ODDS, ENEMIES, ENCOUNTERS, ENCOUNTER_WEIGHTS, QUESTS, TOKENS, LAYER_TABLE };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.CardshipsData = data;
})(this);
