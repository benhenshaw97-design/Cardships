// Cardships content: Cores, Part Cards, enemies, encounters and contracts. All dice are d6.
(function (root) {
  // ---------- Cores ----------
  // steam: the pressure pool that refills at the start of every turn and pays for every action.
  const CORES = {
    airship: {
      id: 'airship', name: 'Airship Core', weight: 1, hp: 8, steam: 4,
      style: 'Skirmisher',
      blurb: 'Light and slippery. Dodges telegraphed shots and reshuffles its modules on the fly.',
      passive: { name: 'Nimble', text: 'Your first Swap each turn is free. Evade costs 1 less Steam.' },
      ability: { id: 'strafe', name: 'Strafing Run', cost: 3, text: 'Deal 1 damage for every weapon installed, at any layer.' },
      start: { stern: ['propeller'], deck: ['harpoon'], bow: [] },
    },
    battleship: {
      id: 'battleship', name: 'Battleship Core', weight: 4, hp: 15, steam: 4,
      style: 'Juggernaut',
      blurb: 'A flying fortress. Never dodges; shrugs off rams and rams back harder the heavier it gets.',
      passive: { name: 'Ironsides', text: 'Rams against you deal 2 less damage. You cannot Evade.' },
      ability: { id: 'ram', name: 'Ram', cost: 2, text: 'Deal 2 damage plus half your ship\'s Weight. Your bow (outermost right module, or Core) takes 1.' },
      start: { stern: [], deck: ['cannon'], bow: ['plating'] },
    },
    zeppelin: {
      id: 'zeppelin', name: 'Zeppelin Core', weight: -1, hp: 6, steam: 3,
      style: 'Bombardier',
      blurb: 'A fragile gasbag that banks pressure across turns for a devastating payload.',
      passive: { name: 'Pressure Vessel', text: 'Steam left over at the end of your turn is stored as Pressure (max 6).' },
      ability: { id: 'bombard', name: 'Bombard', cost: 1, text: 'Spend all Pressure: deal 1½ damage per Pressure (rounded down), ignoring Block.' },
      start: { stern: ['mortar'], deck: ['gasbag'], bow: [] },
    },
    clockwork: {
      id: 'clockwork', name: 'Clockwork Core', weight: 2, hp: 11, steam: 4,
      style: 'Engineer', locked: true,
      blurb: 'A self-winding engine that keeps its modules ticking and fires its guns twice.',
      passive: { name: 'Self-Winding', text: 'At the start of each turn, repair 1 on your most damaged module.' },
      ability: { id: 'overclock', name: 'Overclock', cost: 0, text: 'Once a turn: the next weapon you fire this turn fires twice.' },
      start: { stern: ['repair'], deck: [], bow: ['harpoon'] },
    },
  };

  // ---------- Parts ----------
  // type: weapon | defense | support | utility.  rarity: common | uncommon | rare.
  // cost: Steam to use (null = passive only).  arc: fires from any layer, not just the outside.
  const PARTS = {
    harpoon: {
      name: 'Harpoon Gun', abbr: 'HRP', type: 'weapon', rarity: 'common', weight: 1, hp: 3, cost: 1, dmg: 2,
      rules: [['Fire · 1 Steam', 'Deal 2 damage.'], ['Buried · Chain Feed', 'The weapon directly outside it (in the same section) deals +1 damage.']],
    },
    cannon: {
      name: 'Deck Cannon', abbr: 'CAN', type: 'weapon', rarity: 'common', weight: 1, hp: 4, cost: 2,
      table: [2, 2, 3, 3, 4, 5],
      rules: [['Fire · 2 Steam', 'Roll a d6 for damage: 1-2 → 2, 3-4 → 3, 5 → 4, 6 → 5.'], ['Aimed · +1 Steam', 'Roll twice, keep the higher.'], ['Buried · Powder Store', 'If a module touching it is destroyed, deal 3 damage to the enemy.']],
    },
    mortar: {
      name: 'Mortar', abbr: 'MOR', type: 'weapon', rarity: 'uncommon', weight: 1, hp: 3, cost: 2, dmg: 3, arc: true,
      rules: [['Fire · 2 Steam · Arcs', 'Deal 3 damage. Lobs shells from any slot, even the stern. Then reloads for a turn.'], ['Synergy', 'A Telescope touching it removes the reload.']],
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
      rules: [['Fire · 2 Steam · Arcs', 'Deal 1 damage plus 1 for every other weapon installed. Ignores Block. Fires from any slot, even the stern.']],
    },
    plating: {
      name: 'Brass Plating', abbr: 'PLT', type: 'defense', rarity: 'common', weight: 1, hp: 4,
      rules: [['Outermost', 'Takes every hit aimed at its section.'], ['Buried · Bulkhead', 'Soaks 1 damage of any hit on a module touching it.']],
    },
    bulwark: {
      name: 'Ironclad Bulwark', abbr: 'BLW', type: 'defense', rarity: 'rare', weight: 2, hp: 6,
      rules: [['Outermost', 'Takes every hit aimed at its section, 1 less damage each.'], ['Buried', 'Soaks 2 damage of any hit on a module touching it.']],
    },
    deflector: {
      name: 'Deflector Vane', abbr: 'DFL', type: 'defense', rarity: 'uncommon', weight: 1, hp: 3, cost: 1,
      rules: [['Brace · 1 Steam', 'Negate the next hit on this section this round.']],
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
      rules: [['Lookout · top of the deck or prow', '+1 sight on the sky map, and reveals routes hidden by cloud.'], ['Spotter', 'A Mortar touching it never reloads; a Sniper touching it deals +1.']],
    },
    gasbag: {
      name: 'Gasbag', abbr: 'BAG', type: 'utility', rarity: 'common', weight: -2, hp: 2,
      rules: [['Passive', 'Weight -2. Fragile.']],
    },
    propeller: {
      name: 'Propeller', abbr: 'PRP', type: 'utility', rarity: 'common', weight: 0, hp: 2,
      rules: [['Stern tail', 'At the very back of the stern: Evade costs 1 less Steam (minimum 1).']],
    },
    lightningrod: {
      name: 'Lightning Rod', abbr: 'ROD', type: 'utility', rarity: 'uncommon', weight: 1, hp: 3,
      rules: [['Top of the deck', 'Every lightning bolt strikes it for no damage and charges your boilers: +1 Steam next turn.']],
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
  //   (a shot with lightning: true ignores outside plating and strikes the rolled layer directly)
  const I = {
    shot: (dmg, name = 'Broadside Gun') => ({ kind: 'shot', dmg, name }),
    rake: (dmg, name = 'Raking Fire') => ({ kind: 'rake', dmg, name }),
    broadside: (dmg, name = 'Twin Volley') => ({ kind: 'broadside', dmg, name }),
    ram: (dmg, self = 2, name = 'Ram') => ({ kind: 'ram', dmg, self, name }),
    token: (token, dmg, name) => ({ kind: 'token', token, dmg, name }),
    block: (amount, name = 'Raise Plating') => ({ kind: 'block', amount, name }),
    repair: (amount, name = 'Patch Hull') => ({ kind: 'repair', amount, name }),
    charge: (amount, name = 'Stoke Boilers') => ({ kind: 'charge', amount, name }),
    lightning: (dmg, name = 'Lightning Lance') => ({ kind: 'shot', dmg, name, lightning: true, aim: 'plunge' }),
  };
  // Bombs, lobbed shells, lightning and storms come down from above ("plunging fire"): they aim at the
  // deck or the sheltered stern instead of the bow. Everything else is direct fire at the bow or deck.
  const PLUNGING = new Set(['Firepot', 'Stink Bomb', 'Incendiary Drop', 'Carpet Bomb', 'Heavy Bomb', 'Toxic Shell', 'Flak Barrage', 'Tornado', 'Static Charge', 'Ball Lightning', 'Shrapnel Burst', 'Incendiary Round']);

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
    flagship: {
      name: 'Dread Corsair Flagship', weight: 6, hp: 22, look: 'flagship', elite: true,
      phases: [
        { name: 'Full Sail', min: 12, table: [I.shot(3, 'Long Gun'), I.broadside(2), I.token('fire', 1, 'Boarding Torches'), I.block(5), I.charge(3, 'Run Out the Guns'), I.shot(3, 'Long Gun')] },
        { name: 'Boarding Action', min: 1, table: [I.ram(5, 3), I.broadside(3), I.shot(4, 'Chaser Gun'), I.shot(3, 'Long Gun'), I.rake(2, 'Grapeshot'), I.repair(3)] },
      ],
    },
    monitor: {
      name: 'Armored Monitor', weight: 9, hp: 20, look: 'monitor', elite: true,
      phases: [
        { name: 'Buttoned Up', min: 11, table: [I.block(6, 'Close Hatches'), I.shot(3, 'Turret Gun'), I.shot(3, 'Turret Gun'), I.ram(5, 2, 'Iron Ram'), I.broadside(2), I.charge(3, 'Train Turret')] },
        { name: 'Turret Jammed', min: 1, table: [I.shot(4, 'Turret Gun'), I.ram(5, 2, 'Iron Ram'), I.ram(5, 2, 'Iron Ram'), I.block(4, 'Close Hatches'), I.broadside(3), I.shot(4, 'Turret Gun')] },
      ],
    },
    stormqueen: {
      name: 'The Storm Queen', weight: 3, hp: 33, look: 'stormqueen', boss: true,
      gimmick: 'Gale Force: after every move, her winds shove the two outermost modules of one section past each other (bow, then stern, then deck). Her lightning plunges past plating.',
      phases: [
        { name: 'Gathering Clouds', min: 19, table: [I.lightning(2), I.lightning(2), I.rake(1, 'Tornado'), I.token('gas', 0, 'Static Charge'), I.block(5, 'Eye Wall'), I.charge(3, 'Build Charge')] },
        { name: 'Tempest', min: 10, table: [I.lightning(3), I.lightning(3), I.rake(2, 'Tornado'), I.broadside(2, 'Thunderclap'), I.token('fire', 1, 'Ball Lightning'), I.repair(3, 'Draw the Storm')] },
        { name: 'Eye of the Hurricane', min: 1, table: [I.lightning(4), I.rake(2, 'Tornado'), I.rake(2, 'Tornado'), I.broadside(3, 'Thunderclap'), I.lightning(3), I.charge(4, 'Build Charge')] },
      ],
    },
    colossus: {
      name: 'The Clockwork Colossus', weight: 12, hp: 37, look: 'colossus', boss: true,
      gimmick: 'Wind-Up: its Mainspring tightens every turn, adding +1 damage per hit. Deal 6+ damage in one turn to snap it: the spring resets and it loses its next move.',
      phases: [
        { name: 'Ticking', min: 22, table: [I.shot(2, 'Gear Fist'), I.shot(2, 'Gear Fist'), I.block(5, 'Brass Carapace'), I.broadside(2, 'Cog Spray'), I.ram(4, 2, 'Stomp'), I.charge(2, 'Turn the Key')] },
        { name: 'Grinding', min: 11, table: [I.shot(3, 'Gear Fist'), I.ram(4, 2, 'Piston Charge'), I.broadside(2, 'Cog Spray'), I.block(4, 'Brass Carapace'), I.token('glue', 1, 'Oil Slick'), I.shot(3, 'Gear Fist')] },
        { name: 'Overwound', min: 1, table: [I.ram(5, 2, 'Piston Charge'), I.shot(4, 'Gear Fist'), I.shot(4, 'Gear Fist'), I.rake(2, 'Shrapnel Burst'), I.broadside(3, 'Cog Spray'), I.ram(5, 2, 'Piston Charge')] },
      ],
    },
    leviathan: {
      name: 'The Iron Leviathan', weight: 10, hp: 26, look: 'leviathan', boss: true,
      gimmick: 'Ironclad Hull: every hit deals 1 less unless it pierces (Tesla, Steady Aim, Bombard, Burn). Rearms at each phase.',
      phases: [
        { name: 'Artillery & Disruption', min: 21, table: [I.shot(3, 'Heavy Cannon'), I.shot(3, 'Heavy Cannon'), I.token('gas', 1, 'Toxic Shell'), I.block(6, 'Armor Plating'), I.broadside(2), I.charge(3, 'Load Main Battery')] },
        { name: 'Hazard Protocol', min: 11, table: [I.token('glue', 1, 'Suppressing Fire'), I.token('fire', 2, 'Incendiary Round'), I.shot(3, 'Heavy Cannon'), I.repair(3, 'Repair Crews'), I.rake(1, 'Flak Barrage'), I.broadside(2)] },
        { name: 'Desperation', min: 1, table: [I.ram(5, 2, 'Iron Ram'), I.ram(5, 2, 'Iron Ram'), I.shot(3, 'Heavy Cannon'), I.shot(4, 'Heavy Cannon'), I.broadside(3), I.shot(4, 'Main Battery')] },
      ],
    },
  };
  for (const [id, e] of Object.entries(ENEMIES)) {
    e.id = id;
    for (const p of e.phases) p.table = p.table.map((it) => (PLUNGING.has(it.name) ? { ...it, aim: 'plunge' } : it));
  }

  // ---------- Encounters (sky map node types) ----------
  const ENCOUNTERS = {
    patrol: { name: 'Pirate Patrol', kind: 'Combat', text: 'Sky pirates on the hunt. Win for cogs and a pick of parts.' },
    lair: { name: 'Pirate Lair', kind: 'Elite', text: 'A fortified hideout guarded by a heavy warship. Better loot: uncommon and rare parts.' },
    storm: {
      name: 'Storm Front', kind: 'Hazard', biome: 'storm',
      text: 'Fly through the squall. Roll a d6.',
      table: ['Lightning: 2 damage to the deck or stern', 'Crosswind: 1 damage to the prow and stern tail (Weight 6+ ignores it)', 'Downdraft: jettison an outside module or the Core takes 2', 'Eye of the storm: repair or scavenge', 'Drifting salvage: pick 1 of 2 parts', 'Tailwind: +1 sight and +2 Steam next fight'],
    },
    smog: {
      name: 'Smog Bank', kind: 'Hazard', biome: 'smog',
      text: 'Choking factory smoke over the foundries. Roll a d6.',
      table: ['Soot in the works: Gas on a weapon', 'Choking fumes: pay 10 cogs or the Core takes 2', "Smuggler's cache: cogs or a part", 'Scrap heaps: repair or cogs', 'Abandoned foundry: pick 1 of 2 parts', 'Chimney updraft: +1 sight and +2 Steam next fight'],
    },
    trader: { name: 'Trading Zeppelin', kind: 'Trade', text: 'A merchant zeppelin. Spend cogs on parts, repairs and sky charts, or sell modules.' },
    beacon: {
      name: 'Distress Beacon', kind: 'Ambush',
      text: 'A wreck calls for help. Roll a d6, then pirates spring the trap.',
      table: ['Debris rains on the deck or stern: 2 damage', 'Burning wreckage lands on the deck or stern', 'Gas leaks into a weapon', 'Trap sprung: the pirates start with 4 Block', 'You spot the trap: +2 Steam on your first turn', 'Strip the wreck first: pick 1 of 2 parts'],
    },
    guild: { name: 'Mercenary Island', kind: 'Quest', text: 'A guild outpost on a floating island. Roll two contracts and sign one.' },
    hangar: {
      name: 'Sky Dock', kind: 'Sky Dock',
      text: "A hangar in the clouds. Rearrange your modules freely, then roll for the mechanics' help.",
      table: ['Core Patch: repair 3 Core', 'Part Maintenance: fully repair a module', 'Reinforcement: +1 max Durability to a module', 'Overhaul: repair 2 on every module', 'Spare Part: pick 1 of 2 parts', 'Master Mechanic: reinforce a module and fully repair it'],
    },
    boss: { name: 'Boss', kind: 'Boss', text: 'The final gate.' },
  };
  for (const [id, e] of Object.entries(ENCOUNTERS)) e.id = id;

  // Odds for regular map nodes (Pirate Lairs only from column 4).
  const NODE_WEIGHTS = { patrol: 34, lair: 11, storm: 9, smog: 8, trader: 11, beacon: 11, guild: 7, hangar: 9 };
  // Which pirates fly in each band of the map.
  const ENEMY_TIERS = [
    { upTo: 3, pool: ['cutter', 'skiff', 'bomber'] },
    { upTo: 7, pool: ['gunship', 'bomber', 'cutter', 'sentinel'] },
    { upTo: 11, pool: ['gunship', 'sentinel', 'bomber'] },
  ];
  const ELITES = ['flagship', 'monitor'];
  const BOSSES = ['leviathan', 'stormqueen', 'colossus'];
  // Biome bands across the route; Storm Fronts and Smog Banks override with their own.
  const BIOME_BANDS = [{ upTo: 3, biome: 'clear' }, { upTo: 5, biome: 'smog' }, { upTo: 7, biome: 'sunset' }, { upTo: 9, biome: 'dusk' }, { upTo: 11, biome: 'night' }, { upTo: 99, biome: 'lair' }];
  const PRICES = { common: 32, uncommon: 52, rare: 85, coreRepair: 12, fullRepair: 20, charts: 16 };

  // Unlocks earned across runs (meta-progression). Rares not listed here start unlocked.
  const UNLOCKS = [
    { id: 'tesla', kind: 'part', name: 'Tesla Coil', how: 'Reach the boss.' },
    { id: 'autoloader', kind: 'part', name: 'Autoloader', how: 'Defeat a Pirate Lair.' },
    { id: 'gyro', kind: 'part', name: 'Gyro Stabilizer', how: 'Complete 3 contracts (across runs).' },
    { id: 'clockwork', kind: 'core', name: 'Clockwork Core', how: 'Win a run.' },
    { id: 'overpressure', kind: 'part', name: 'Overpressure Valve', how: 'Defeat two different bosses.' },
  ];

  // ---------- Contracts (rolled on a d6; you sign one of two) ----------
  const QUESTS = [
    { id: 'bounty', name: 'The Bounty', goal: 'Defeat a Pirate Lair.', reward: 'Pick a rare part and 25 cogs.' },
    { id: 'survivor', name: 'The Survivor', goal: 'Clear a Storm Front or Smog Bank without taking damage.', reward: 'A free Brass Plating and a full repair.' },
    { id: 'hoarder', name: 'The Hoarder', goal: 'Install a Cargo Hold.', reward: 'A free Supply Hatch.' },
    { id: 'ironclad', name: 'The Ironclad', goal: 'Win a fight while one of your modules is on fire.', reward: '+2 max Durability to a module of your choice.' },
    { id: 'marksman', name: 'The Marksman', goal: 'Win a fight within 3 rounds.', reward: 'Pick an uncommon weapon and 15 cogs.' },
    { id: 'rammer', name: 'The Rammer', goal: 'Finish an enemy with a Ram or Bombard.', reward: '+2 max Durability to your Core.' },
  ];

  const TOKENS = {
    fire: { name: 'Fire', text: 'Deals 1 damage to this module at the start of your turn.' },
    glue: { name: 'Glue', text: 'A glued weapon deals 1 less damage, and a glued module cannot be swapped.' },
    gas: { name: 'Gas', text: 'Using this module costs 1 more Steam.' },
  };

  // Targeting. Section d6: direct fire 1-4 bow, 5-6 deck; plunging fire 1-3 deck, 4-6 stern.
  // Layer d6 by section size: 3 layers 1-2 → 1, 3-4 → 2, 5-6 → 3; 2 layers 1-3 → 1, 4-6 → 2.
  const LANE_TABLE = {
    direct: ['bow', 'bow', 'bow', 'bow', 'deck', 'deck'],
    plunge: ['deck', 'deck', 'deck', 'stern', 'stern', 'stern'],
  };
  const LAYER_TABLE = { 3: [1, 1, 2, 2, 3, 3], 2: [1, 1, 1, 2, 2, 2] };

  // Global difficulty knobs, tuned by simulation (see BALANCE_REPORT.md).
  const BALANCE = {
    hpPerColumn: 0.08,       // pirate Durability +8% per map column
    veteranColumns: [6, 11], // +1 damage per hit from each listed column onward
    bossHp: 1.5,             // boss Durability multiplier
    startCogs: 20,
    bombardPerPressure: 1.5, // Zeppelin Bombard damage per point of Pressure (rounded down)
    maxPressure: 6,
    enrageRound: 10,
    evadeBase: 2,            // Evade costs evadeBase + Weight/3 Steam (minimum 1)
    nimbleDiscount: 1,       // Airship Evade discount
    evadeFatigue: 2,         // extra Steam per consecutive Evade
  };

  const data = { BALANCE, CORES, PARTS, RARITY_ODDS, ENEMIES, ENCOUNTERS, NODE_WEIGHTS, ENEMY_TIERS, ELITES, BOSSES, BIOME_BANDS, PRICES, UNLOCKS, QUESTS, TOKENS, LAYER_TABLE, LANE_TABLE };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.CardshipsData = data;
})(this);
