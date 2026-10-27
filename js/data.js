// Cardships content: Cores, Part Cards, enemies, encounters and contracts. All dice are d6.
(function (root) {
  // ---------- Cores ----------
  // steam: the pressure pool that refills at the start of every turn and pays for every action.
  // start: starting modules as [part, row, col] (row 0 the hull, 1 the upper deck; col <0 stern, >0 bow).
  const CORES = {
    airship: {
      id: 'airship', name: 'Airship Core', weight: 1, hp: 8, steam: 4,
      style: 'Skirmisher',
      blurb: 'Light and slippery. Dodges telegraphed shots and reshuffles its modules on the fly.',
      passive: { name: 'Nimble', text: 'Your first Swap each turn is free. Evade costs 1 less Steam.' },
      ability: { id: 'strafe', name: 'Strafing Run', cost: 3, text: 'Deal 1 damage for every weapon installed, anywhere on the ship.' },
      start: [['propeller', 0, -1], ['harpoon', 0, 1]],
    },
    battleship: {
      id: 'battleship', name: 'Battleship Core', weight: 4, hp: 15, steam: 4,
      style: 'Juggernaut',
      blurb: 'A flying fortress. Never dodges; shrugs off rams and rams back harder the heavier it gets.',
      passive: { name: 'Ironsides', text: 'Rams against you deal 2 less damage. You cannot Evade.' },
      ability: { id: 'ram', name: 'Ram', cost: 2, text: 'Deal 2 damage plus half your ship\'s Weight, smashing through Armor (it breaks a Ward and still lands). Your prow (front of the hull, or the Core) takes 1.' },
      start: [['plating', 0, 1], ['cannon', 1, 0]],
    },
    zeppelin: {
      id: 'zeppelin', name: 'Zeppelin Core', weight: -1, hp: 8, steam: 3,
      style: 'Bombardier',
      blurb: 'A fragile gasbag that banks pressure across turns for a devastating payload.',
      passive: { name: 'Pressure Vessel', text: 'Steam left over at the end of your turn is stored as Pressure (max 6).' },
      ability: { id: 'bombard', name: 'Bombard', cost: 1, text: 'Spend all Pressure: deal 1¾ damage per Pressure (rounded down), ignoring Block.' },
      start: [['mortar', 0, -1], ['gasbag', 0, 1]],
    },
    clockwork: {
      id: 'clockwork', name: 'Clockwork Core', weight: 2, hp: 11, steam: 4,
      style: 'Engineer', locked: true,
      blurb: 'A self-winding engine that keeps its modules ticking and fires its guns twice.',
      passive: { name: 'Self-Winding', text: 'At the start of each turn, repair 1 on your most damaged module.' },
      ability: { id: 'overclock', name: 'Overclock', cost: 0, text: 'Once a turn: the next weapon you fire this turn fires twice.' },
      start: [['quarters', 0, -1], ['harpoon', 0, 1]],
    },
    privateer: {
      id: 'privateer', name: 'Privateer Core', weight: 1, hp: 9, steam: 4,
      style: 'Raider',
      blurb: 'A licensed pirate. Tears through enemy armor and gets paid handsomely for it.',
      passive: { name: 'Plunder', text: 'Every win pays 6 more cogs. The Trading Zeppelin sells you parts 15% cheaper.' },
      ability: { id: 'board', name: 'Boarding Party', cost: 2, text: 'Strip all of the enemy\'s Block, then deal 2 damage that ignores Block.' },
      start: [['repair', 0, -1], ['grapnel', 0, 1]],
    },
    tempest: {
      id: 'tempest', name: 'Tempest Core', weight: 2, hp: 10, steam: 5,
      style: 'Stormcaller',
      blurb: 'A caged storm. Every blow it takes winds it tighter, until it lets the lightning out.',
      passive: { name: 'Static Build-up', text: 'Every time your ship takes damage, gain 1 Charge (max 8). Lightning that hits you gives 2.' },
      ability: { id: 'discharge', name: 'Arc Discharge', cost: 1, text: 'Spend all Charge: deal 3 damage plus 1 per Charge, ignoring Block.' },
      start: [['sprinkler', 0, -1], ['rockets', 0, 1]],
    },
    // The Workshop's Cores, built around the later areas' mechanics (bought with Blueprints).
    arcanist: {
      id: 'arcanist', name: 'Arcanist Core', weight: 1, hp: 9, steam: 4,
      style: 'Spellwright', locked: true,
      blurb: 'A humming crystal heart. Every module it touches sings with Resonance.',
      passive: { name: 'Attuned', text: 'All of your modules are arcane: they build Resonance when used or hit, and cast spells when full.' },
      ability: { id: 'pulse', name: 'Harmonic Pulse', cost: 2, text: 'Every module gains 1 Resonance.' },
      start: [['manalens', 0, -1], ['runecannon', 0, 1]],
    },
    sanguinist: {
      id: 'sanguinist', name: 'Sanguine Core', weight: 2, hp: 12, steam: 4,
      style: 'Bloodletter', locked: true,
      blurb: 'A beating iron heart that runs on its own blood, and drinks the enemy\'s.',
      passive: { name: 'Blood Pact', text: 'Each time one of your weapons deals damage, your Core heals 1 (up to 2 a turn).' },
      ability: { id: 'bloodlet', name: 'Bloodletting', cost: 0, text: 'Pay 2 Core Durability: +3 Steam.' },
      start: [['thornhull', 0, -1], ['bloodharpoon', 0, 1]],
    },
    eclipse: {
      id: 'eclipse', name: 'Eclipse Core', weight: 1, hp: 11, steam: 4,
      style: 'Twilight', locked: true,
      blurb: 'Starlight and blood in one black sphere. Its spells open wounds.',
      passive: { name: 'Twilight', text: 'Whenever one of your modules casts a spell, the enemy gains 2 Bleed.' },
      ability: { id: 'umbra', name: 'Umbral Strike', cost: 2, text: 'Deal 3 damage, plus all the Resonance on your ship and the enemy\'s Bleed, ignoring Block and Armor.' },
      start: [['crystalward', 0, -1], ['runecannon', 0, 1]],
    },
  };

  // ---------- Ships ----------
  // The hull you fly. Each Core has three ships of its own (the first is its classic), and every
  // ship has one trait.
  const SHIPS = {
    courier: { name: 'Courier', sprite: 'k_airship', core: 'airship', trait: 'Light frame: −1 Weight.', weight: -1 },
    kite: { name: 'Sky Kite', sprite: 'k_kite', core: 'airship', trait: 'High lookout: +1 sight on the sky map.', sight: 1 },
    comet: { name: 'Copper Comet', sprite: 'k_comet', core: 'airship', trait: 'Rocket engines: +1 Steam on the first turn of every fight.', jump: 1 },
    bulwark: { name: 'Bulwark', sprite: 'k_battleship', core: 'battleship', trait: 'Armored gondola: +2 Core Durability.', hp: 2 },
    ironside: { name: 'Ironside', sprite: 'k_ironside', core: 'battleship', trait: 'Damage crews: repair 1 Core after every fight.', mendAfter: 1 },
    blacksail: { name: 'Black Sail', sprite: 'k_blacksail', core: 'battleship', trait: 'Prize crew: every win pays 4 more cogs.', salvage: 4 },
    merchantman: { name: 'Merchantman', sprite: 'k_zeppelin', core: 'zeppelin', trait: 'Deep hold: start with 20 more cogs.', cogs: 20 },
    cranegalleon: { name: 'Crane Galleon', sprite: 'k_cranegalleon', core: 'zeppelin', trait: 'Salvage crane: every win pays 4 more cogs.', salvage: 4 },
    harlequin: { name: 'Harlequin', sprite: 'k_harlequin', core: 'zeppelin', trait: 'Big gasbag: −1 Weight.', weight: -1 },
    chronometer: { name: 'Chronometer', sprite: 'k_clockwork', core: 'clockwork', trait: 'Clock-wound crew: repair 1 Core after every fight.', mendAfter: 1 },
    twinclock: { name: 'Twin Clock', sprite: 'k_twinclock', core: 'clockwork', trait: 'Spyglass mast: +1 sight on the sky map.', sight: 1 },
    gearwheel: { name: 'Gearwheel', sprite: 'k_gearwheel', core: 'clockwork', trait: 'Geared hull: +2 Core Durability.', hp: 2 },
    corsair: { name: 'Corsair Rocket', sprite: 'k_privateer', core: 'privateer', trait: 'Rocket gondola: +1 Steam on the first turn of every fight.', jump: 1 },
    patchwork: { name: 'Patchwork', sprite: 'k_patchwork', core: 'privateer', trait: 'Salvage nets: every win pays 4 more cogs.', salvage: 4 },
    sailraider: { name: 'Sail Raider', sprite: 'k_sailraider', core: 'privateer', trait: 'Sails and props: −1 Weight.', weight: -1 },
    stormrider: { name: 'Stormrider', sprite: 'k_tempest', core: 'tempest', trait: 'Insulated: lightning deals 1 less damage to you.', insulated: true },
    crystal: { name: 'Crystal Pagoda', sprite: 'k_crystal', core: 'tempest', trait: 'Aether crystal: +1 Steam on the first turn of every fight.', jump: 1 },
    starpagoda: { name: 'Star Pagoda', sprite: 'k_starpagoda', core: 'tempest', trait: 'Star globe: +2 Core Durability.', hp: 2 },
    runeweaver: { name: 'Runeweaver', sprite: 'k_arcanist', core: 'arcanist', trait: 'Star-glass lookout: +1 sight on the sky map.', sight: 1 },
    prismara: { name: 'Prismara', sprite: 'k_arcanist2', core: 'arcanist', trait: 'Prism sails: +1 Steam on the first turn of every fight.', jump: 1 },
    starloom: { name: 'Starloom', sprite: 'k_arcanist3', core: 'arcanist', trait: 'Woven hull: +2 Core Durability.', hp: 2 },
    bloodbarque: { name: 'Blood Barque', sprite: 'k_sanguine', core: 'sanguinist', trait: 'Leech crew: repair 1 Core after every fight.', mendAfter: 1 },
    vampyre: { name: 'Vampyre', sprite: 'k_sanguine2', core: 'sanguinist', trait: 'Bat-wing sails: −1 Weight.', weight: -1 },
    redwake: { name: 'Red Wake', sprite: 'k_sanguine3', core: 'sanguinist', trait: 'Grave robbers: every win pays 4 more cogs.', salvage: 4 },
    duskblade: { name: 'Duskblade', sprite: 'k_eclipse', core: 'eclipse', trait: 'Night engines: +1 Steam on the first turn of every fight.', jump: 1 },
    nightglass: { name: 'Nightglass', sprite: 'k_eclipse2', core: 'eclipse', trait: 'Obsidian plating: +2 Core Durability.', hp: 2 },
    umbra: { name: 'Umbra', sprite: 'k_eclipse3', core: 'eclipse', trait: 'Moon-glass lens: +1 sight on the sky map.', sight: 1 },
  };
  for (const [id, sh] of Object.entries(SHIPS)) sh.id = id;

  // ---------- Parts ----------
  // type: weapon | defense | support | utility.  rarity: common | uncommon | rare.
  // cost: Steam to use (null = passive only).
  // Straight-firing weapons fire from the front of a deck (the prow, or the foremost upper module);
  // arc: fires from any slot with open sky above it instead.
  const PARTS = {
    harpoon: {
      name: 'Harpoon Gun', abbr: 'HRP', type: 'weapon', rarity: 'common', weight: 1, hp: 3, cost: 1, dmg: 2,
      rules: [['Fire · 1 Steam', 'Deal 2 damage.'], ['Chain Feed', 'A weapon bolted directly on top of it deals +1 damage.']],
    },
    cannon: {
      name: 'Deck Cannon', abbr: 'CAN', type: 'weapon', rarity: 'common', weight: 1, hp: 4, cost: 2,
      table: [2, 2, 3, 3, 4, 5],
      rules: [['Fire · 2 Steam', 'Roll a d6 for damage: 1-2 → 2, 3-4 → 3, 5 → 4, 6 → 5.'], ['Aimed · +1 Steam', 'Roll twice, keep the higher.'], ['Buried · Powder Store', 'Covered from above and not at the front: if a module touching it is destroyed, deal 3 damage to the enemy.']],
    },
    mortar: {
      name: 'Mortar', abbr: 'MOR', type: 'weapon', rarity: 'uncommon', weight: 1, hp: 3, cost: 2, dmg: 3, arc: true,
      rules: [['Fire · 2 Steam · Arcs', 'Deal 3 damage. Lobs shells from any slot with open sky above it, even the stern. Then reloads for a turn.'], ['Synergy', 'A Telescope touching it removes the reload.']],
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
      rules: [['Fire · 2 Steam · Arcs', 'Deal 1 damage plus 1 for every other weapon installed. Ignores Block. Fires from any slot with open sky above it.']],
    },
    grapnel: {
      name: 'Grapnel Launcher', abbr: 'GRP', type: 'weapon', rarity: 'common', weight: 1, hp: 3, cost: 1, dmg: 1, strip: true,
      rules: [['Fire · 1 Steam', 'Strip all of the enemy\'s Block, then deal 1 damage.']],
    },
    rockets: {
      name: 'Rocket Battery', abbr: 'RKT', type: 'weapon', rarity: 'uncommon', weight: 1, hp: 3, cost: 2, dmg: 1, volley: 3,
      rules: [['Fire · 2 Steam', 'Launch 3 rockets of 1 damage each. Block stops them one by one; Choking adds 1 to every rocket.']],
    },
    flak: {
      name: 'Flak Cannon', abbr: 'FLK', type: 'weapon', rarity: 'uncommon', weight: 1, hp: 3, cost: 1, dmg: 1, arc: true, flak: 2,
      rules: [['Fire · 1 Steam · Arcs', 'Deal 1 damage. The flak screen makes the enemy\'s next attack this round deal 2 less.']],
    },
    plating: {
      name: 'Brass Plating', abbr: 'PLT', type: 'defense', rarity: 'common', weight: 1, hp: 4,
      rules: [['Front of a deck', 'Catches every direct shot aimed along its deck.'], ['On top', 'Takes the bombs meant for the module under it.'], ['Buried · Bulkhead', 'Soaks 1 damage of any hit on a module touching it.']],
    },
    bulwark: {
      name: 'Ironclad Bulwark', abbr: 'BLW', type: 'defense', rarity: 'rare', weight: 2, hp: 6,
      rules: [['Front of a deck', 'Catches every direct shot aimed along its deck, 1 less damage each.'], ['Armored', 'Every hit on it deals 1 less.'], ['Buried · Bulkhead', 'Soaks 2 damage of any hit on a module touching it.']],
    },
    deflector: {
      name: 'Deflector Vane', abbr: 'DFL', type: 'defense', rarity: 'uncommon', weight: 1, hp: 3, cost: 1,
      rules: [['Brace · 1 Steam', 'The next hit this round on the Vane or a module touching it deals 3 less.']],
    },
    repair: {
      name: 'Repair Bay', abbr: 'REP', type: 'support', rarity: 'common', weight: 1, hp: 3, cost: 1, heal: 2,
      rules: [['Mend · 1 Steam', 'Repair 2 on a module touching it, or the Core if it touches the Core.'], ['Passive', 'After each combat, repair 1 on itself.']],
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
      rules: [['Lookout · open sky above', '+1 sight on the sky map, and reveals routes hidden by cloud.'], ['Spotter', 'A Mortar touching it never reloads; a Sniper touching it deals +1.']],
    },
    gasbag: {
      name: 'Gasbag', abbr: 'BAG', type: 'utility', rarity: 'common', weight: -2, hp: 2,
      rules: [['Passive', 'Weight -2. Fragile.']],
    },
    propeller: {
      name: 'Propeller', abbr: 'PRP', type: 'utility', rarity: 'common', weight: 0, hp: 2,
      rules: [['Stern end', 'At the back end of either deck: Evade costs 1 less Steam (minimum 1).']],
    },
    lightningrod: {
      name: 'Lightning Rod', abbr: 'ROD', type: 'utility', rarity: 'uncommon', weight: 1, hp: 3,
      rules: [['Open sky above', 'Every lightning bolt strikes it for no damage and charges your boilers: +1 Steam next turn.']],
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
      rules: [['Touching the Core', 'Core gains +3 max Durability and repairs 1 at the start of each turn.']],
    },
    overpressure: {
      name: 'Overpressure Valve', abbr: 'OVP', type: 'support', rarity: 'rare', weight: 1, hp: 3, steam: 2,
      rules: [['Passive', '+2 Steam every turn.'], ['Strain', 'If you end a turn with Steam unspent, this module takes 1 damage.']],
    },
  };
  // ---------- Legendaries ----------
  // Build-defining parts from the bosses. Beating a boss offers a choice of the two in its pool;
  // beating it for the first time also unlocks them as very rare loot in later runs.
  // pierceLayers: skips that many of the enemy's defence layers (Wards, Block, Armor, outermost first).
  // cooldown: turns it must wait after firing.
  Object.assign(PARTS, {
    leviplating: {
      name: 'Leviathan Plating', abbr: 'LVP', type: 'defense', rarity: 'legendary', boss: 'leviathan', weight: 2, hp: 7,
      rules: [['Armored', 'Every hit on it deals 2 less. At the front of a deck it catches every direct shot along it; buried, it soaks 2 of hits on its neighbours.'], ['Retribution', 'Half of all the damage your ship blocks in an enemy attack (armor and Deflector braces) is flung back at the attacker, ignoring Block.']],
    },
    dreadnought: {
      name: 'Dreadnought Cannon', abbr: 'DRD', type: 'weapon', rarity: 'legendary', boss: 'leviathan', weight: 2, hp: 5, cost: 2, dmg: 5, pierceLayers: 2, cooldown: 2,
      rules: [['Fire · 2 Steam', 'Deal 5 damage that pierces 2 of the enemy\'s defence layers (Wards, Block, Armor, outermost first).'], ['Cooldown', 'Then cools for 2 turns before it can fire again.']],
    },
    galeengine: {
      name: 'Gale Engine', abbr: 'GAL', type: 'utility', rarity: 'legendary', boss: 'stormqueen', weight: 1, hp: 4,
      rules: [['Passive · Tailwinds', 'Your first 3 Swaps each turn cost 0 Steam.'], ['Static Shift', 'Every Swap crackles at the enemy: 1 damage that ignores Block.']],
    },
    stormheart: {
      name: 'Storm Heart', abbr: 'STH', type: 'support', rarity: 'legendary', boss: 'stormqueen', weight: 1, hp: 4, steam: 1,
      rules: [['Passive', '+1 Steam every turn.'], ['Caged Storm', 'At the end of every enemy turn, lightning strikes the enemy for 2 damage that ignores Block.']],
    },
    mainspring: {
      name: 'Grand Mainspring', abbr: 'MSP', type: 'utility', rarity: 'legendary', boss: 'colossus', weight: 2, hp: 5,
      rules: [['Wind-Up', 'Every round of a fight, your weapons deal +1 damage (up to +4).'], ['Unwind', 'A round in which no weapon fires lets the spring run down to +0.']],
    },
    titanfist: {
      name: "Titan's Fist", abbr: 'TTN', type: 'weapon', rarity: 'legendary', boss: 'colossus', weight: 3, hp: 6, cost: 2,
      rules: [['Fire · 2 Steam', 'Deal damage equal to your ship\'s Weight (at least 3).'], ['Braced Frame', 'Rams against you deal 2 less.']],
    },
  });
  // ---------- Area 2: the Aurora Reaches ----------
  // arcane: builds Resonance when used or hit (see RESONANCE). area: the area whose loot favours it
  // (and the first area it can drop in).
  Object.assign(PARTS, {
    runecannon: {
      name: 'Rune Cannon', abbr: 'RUN', type: 'weapon', rarity: 'uncommon', area: 1, arcane: true, weight: 1, hp: 3, cost: 2, dmg: 1, arc: true,
      rules: [['Fire · 2 Steam · Arcs', 'Deal 1 damage plus all the Resonance on modules touching it (up to 7). Fires from any slot with open sky above it.'], ['Arcane', 'Builds Resonance when fired or hit.']],
    },
    crystalward: {
      name: 'Crystal Ward', abbr: 'CRY', type: 'defense', rarity: 'uncommon', area: 1, arcane: true, weight: 1, hp: 4,
      rules: [['Crystal Armor', 'Every hit on it deals 1 less. At the front of a deck it catches every direct shot along it.'], ['Shatter', 'Every hit on it throws shards: 1 damage to the enemy, ignoring Block. When destroyed, 3.'], ['Arcane', 'Builds Resonance when hit.']],
    },
    starsail: {
      name: 'Star Sail', abbr: 'SAL', type: 'utility', rarity: 'uncommon', area: 1, arcane: true, weight: -1, hp: 2,
      rules: [['Starlight', 'At the start of your turn, +1 Steam for each module touching it with 2+ Resonance (up to +2).'], ['Light', 'Weight −1.'], ['Arcane', 'Builds Resonance when hit.']],
    },
    manalens: {
      name: 'Mana Lens', abbr: 'LNS', type: 'utility', rarity: 'rare', area: 1, arcane: true, weight: 1, hp: 2,
      rules: [['Focus', 'Once a turn, the next spell cast by a module touching it is doubled.'], ['Arcane', 'Builds Resonance when hit.']],
    },
    prism: {
      name: 'Prism Array', abbr: 'PRS', type: 'support', rarity: 'uncommon', area: 1, arcane: true, weight: 1, hp: 3, cost: 1,
      rules: [['Refract · 1 Steam', 'Your next weapon shot this turn splits across every enemy layer: it shatters all Wards and illusions, strips all Block and ignores Armor.'], ['Arcane', 'Builds Resonance when used or hit.']],
    },
    auroracrown: {
      name: 'Aurora Crown', abbr: 'CRN', type: 'utility', rarity: 'legendary', boss: 'archon', arcane: true, weight: 1, hp: 4,
      rules: [['Living Sky', 'An aurora follows your ship into every fight, and at the start of each of your turns you choose its colour.'], ['Arcane', 'Builds Resonance when hit.']],
    },
    archonlance: {
      name: "Archon's Lance", abbr: 'LNC', type: 'weapon', rarity: 'legendary', boss: 'archon', arcane: true, weight: 1, hp: 4, cost: 2, arc: true,
      rules: [['Fire · 2 Steam · Arcs', 'Deal damage equal to all the Resonance on your ship (at least 3), ignoring Block and Armor. Then every module\'s Resonance is spent.'], ['Arcane', 'Builds Resonance when hit.']],
    },
  });
  // ---------- Area 3: the Blood Moon ----------
  // blood: paid in Core Durability each use (on top of any Steam). Blood parts heal as they wound.
  Object.assign(PARTS, {
    bloodharpoon: {
      name: 'Blood Harpoon', abbr: 'BLH', type: 'weapon', rarity: 'uncommon', area: 2, blood: 1, weight: 1, hp: 3, cost: 1, dmg: 3, lifesteal: 0.5,
      rules: [['Fire · 1 Steam · Blood 1', 'Deal 3. Your Core heals half the damage that lands (rounded up).']],
    },
    thornhull: {
      name: 'Thorned Hull', abbr: 'THN', type: 'defense', rarity: 'uncommon', area: 2, weight: 2, hp: 5,
      rules: [['Thorned Armor', 'Every hit on it deals 1 less. At the front of a deck it catches every direct shot along it.'], ['Thorns', 'Whatever hits it with an attack or a ram gains 2 Bleed.']],
    },
    sanguine: {
      name: 'Sanguine Engine', abbr: 'SNG', type: 'support', rarity: 'uncommon', area: 2, blood: 1, weight: 1, hp: 3, cost: 0,
      rules: [['Bloodburn · Blood 1', '+2 Steam this turn. Once a turn.']],
    },
    crimsonaltar: {
      name: 'Crimson Altar', abbr: 'ALT', type: 'support', rarity: 'rare', area: 2, weight: 1, hp: 3, cost: 1,
      rules: [['Blood Rite · 1 Steam', 'Sacrifice a module touching it: your weapons deal +1 damage for the rest of the run, and your Core heals what the module had left. Once a fight.']],
    },
    moonmortar: {
      name: 'Moon Mortar', abbr: 'MMT', type: 'weapon', rarity: 'uncommon', area: 2, weight: 2, hp: 3, cost: 2, dmg: 2, arc: true,
      rules: [['Fire · 2 Steam · Arcs', 'Deal 2, +1 for every 2 points of the Blood Moon (up to 5). Fires from any slot with open sky above it.']],
    },
    chalice: {
      name: "Sovereign's Chalice", abbr: 'CHL', type: 'utility', rarity: 'legendary', boss: 'sovereign', weight: 1, hp: 4,
      rules: [['Blood Toll', 'Whenever the enemy takes damage, your Core heals 1 (up to 3 a turn).']],
    },
    eclipseblade: {
      name: 'Eclipse Blade', abbr: 'ECL', type: 'weapon', rarity: 'legendary', boss: 'sovereign', blood: 2, weight: 2, hp: 5, cost: 1,
      rules: [['Fire · 1 Steam · Blood 2', 'Deal 6 piercing damage, +1 for every Bleed stack on your ship and the enemy.']],
    },
  });
  for (const [id, p] of Object.entries(PARTS)) p.id = id;
  // Each boss's legendaries.
  const LEGENDARY_POOLS = { leviathan: ['leviplating', 'dreadnought'], stormqueen: ['galeengine', 'stormheart'], colossus: ['mainspring', 'titanfist'], archon: ['auroracrown', 'archonlance'], sovereign: ['chalice', 'eclipseblade'] };

  // ---------- Resonance and the aurora (Area 2) ----------
  // Arcane modules gain 1 Resonance when used or hit. At the start of your turn, every module with
  // 2+ Resonance sends 1 into each touching module that has less. A module that reaches 3 casts its
  // bonus spell and drops to 0: weapons an Arcane Bolt, defenses an Aegis, the rest a Surge.
  const RESONANCE = {
    max: 3,
    spells: {
      weapon: { name: 'Arcane Bolt', text: '2 damage to the enemy, ignoring Block and Armor' },
      defense: { name: 'Aegis', text: 'repair 1 on it and every module touching it' },
      support: { name: 'Surge', text: '+1 Steam' },
      utility: { name: 'Surge', text: '+1 Steam' },
    },
  };
  // The aurora over the Aurora Reaches shifts colour every turn, empowering one kind of module.
  const AURORA = {
    weapon: { name: 'Emerald', color: '#5dffa8', text: 'Weapons deal +1 damage.' },
    defense: { name: 'Teal', color: '#4fd8ff', text: 'Defense modules take 1 less from every hit.' },
    utility: { name: 'Violet', color: '#c08cff', text: 'Supports and utilities cost 1 less Steam to use, and each gains 1 Resonance.' },
  };

  // Rarity odds for rolled parts. Legendaries only roll once unlocked (see Game.available).
  const RARITY_ODDS = {
    normal: { common: 62, uncommon: 30, rare: 8, legendary: 0.6 },
    elite: { common: 25, uncommon: 50, rare: 25, legendary: 3 },
  };

  // ---------- Enemies ----------
  // Intent kinds:
  //   shot   {dmg}           direct: a rolled deck and depth; plunging: a rolled column
  //   rake   {dmg}           direct: up to 3 modules along a rolled deck; plunging: every column on a rolled side
  //   broadside {dmg}        the front of the hull and the front of the upper deck
  //   ram    {dmg, self}     the prow; weight resists it
  //   token  {token, dmg}    like a shot, but leaves a status token (and optional damage)
  //   block  {amount}        Block absorbs your damage until the start of its next turn
  //   repair {amount}
  //   charge {amount}        its next attack deals +amount
  //   (a shot with lightning: true arcs past armor to the first module in its column that isn't)
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
    // Area 2: magic.
    ward: (amount, name = 'Spell Ward') => ({ kind: 'ward', amount, name }),                 // +Wards (each stops a whole hit)
    illusion: (amount, name = 'Mirror Image') => ({ kind: 'ward', amount, name, illusion: true }),
    siphon: (amount, name = 'Siphon Light') => ({ kind: 'siphon', amount, name }),            // steals Resonance, heals on it
    rune: (dmg, name = 'Rune of Ruin') => ({ kind: 'rune', dmg, name }),                      // every module on a rolled deck, past armor
    plungeShot: (dmg, name) => ({ kind: 'shot', dmg, name, aim: 'plunge' }),
    // Area 3: blood.
    bleed: (dmg, stacks, name) => ({ kind: 'token', token: 'bleed', dmg, stacks, name }),  // a shot that leaves Bleed stacks
    bleedRake: (dmg, name) => ({ kind: 'rake', dmg, name, bleed: 1 }),                    // a rake whose every hit leaves 1 Bleed
    summon: (amount, name = 'Call the Swarm') => ({ kind: 'ward', amount, name, bats: true }), // bats screen it, and bite
    drain: (dmg, name = 'Sanguine Tide') => ({ kind: 'drain', dmg, name }),               // every module, past armor; it heals the total
  };
  // Bombs, lobbed shells, lightning and storms come down from above ("plunging fire"): they drop onto a
  // column, stern or bow, and hit whatever is on top. Everything else is direct fire along a deck from the bow.
  const PLUNGING = new Set(['Glitter Storm', 'Aurora Lash', 'Firepot', 'Stink Bomb', 'Incendiary Drop', 'Carpet Bomb', 'Heavy Bomb', 'Toxic Shell', 'Flak Barrage', 'Tornado', 'Static Charge', 'Ball Lightning', 'Shrapnel Burst', 'Incendiary Round']);

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
      gimmick: 'Gale Force: after every move, her winds shove two modules past each other: the two at the prow, then the two at the stern end, then the two at the front of the upper deck. Her lightning plunges past plating.',
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
      name: 'The Iron Leviathan', weight: 10, hp: 26, look: 'leviathan', boss: true, armor: 1,
      gimmick: 'Ironclad Hull: every hit deals 1 less unless it pierces (Tesla, Steady Aim, Bombard, Burn). Rearms at each phase.',
      phases: [
        { name: 'Artillery & Disruption', min: 21, table: [I.shot(3, 'Heavy Cannon'), I.shot(3, 'Heavy Cannon'), I.token('gas', 1, 'Toxic Shell'), I.block(6, 'Armor Plating'), I.broadside(2), I.charge(3, 'Load Main Battery')] },
        { name: 'Hazard Protocol', min: 11, table: [I.token('glue', 1, 'Suppressing Fire'), I.token('fire', 2, 'Incendiary Round'), I.shot(3, 'Heavy Cannon'), I.repair(3, 'Repair Crews'), I.rake(1, 'Flak Barrage'), I.broadside(2)] },
        { name: 'Desperation', min: 1, table: [I.ram(5, 2, 'Iron Ram'), I.ram(5, 2, 'Iron Ram'), I.shot(3, 'Heavy Cannon'), I.shot(4, 'Heavy Cannon'), I.broadside(3), I.shot(4, 'Main Battery')] },
      ],
    },
  };
  // ---------- Area 2 enemies ----------
  Object.assign(ENEMIES, {
    wisp: {
      name: 'Glimmer Wisp', weight: 1, hp: 13, look: 'wisp', area: 1, wardEachTurn: 1, wardKind: 'glimmer',
      gimmick: 'Evasive: it shimmers behind a Ward at the start of each of its turns (up to 2). Each Ward stops one whole hit. Siphon Light steals your Resonance.',
      phases: [
        { name: 'Flicker', min: 7, table: [I.shot(3, 'Glimmer Dart'), I.shot(3, 'Glimmer Dart'), I.siphon(2), I.token('hex', 1, 'Hex Spark'), I.ward(1, 'Shimmer'), I.charge(2, 'Gather Light')] },
        { name: 'Fading', min: 1, table: [I.shot(3, 'Glimmer Dart'), I.plungeShot(4, 'Starfall'), I.siphon(3), I.rake(2, 'Glitter Storm'), I.token('hex', 1, 'Hex Spark'), I.shot(3, 'Glimmer Dart')] },
      ],
    },
    corvette: {
      name: 'Arcane Corvette', weight: 3, hp: 20, look: 'corvette', area: 1, wardKind: 'ward',
      gimmick: 'Hexcraft: a Hex inverts a module until the end of your next turn. A hexed weapon heals the enemy, hexed armor takes +1 instead of blocking, a hexed repair wounds, and a hexed boiler drains Steam.',
      phases: [
        { name: 'Spellweave', min: 11, table: [I.token('hex', 1, 'Hex Bolt'), I.token('hex', 1, 'Hex Bolt'), I.shot(4, 'Arcane Bolt'), I.ward(2), I.rake(2, 'Rune Volley'), I.charge(3, 'Gather Mana')] },
        { name: 'Unbound', min: 1, table: [I.shot(4, 'Arcane Bolt'), I.token('hex', 2, 'Hex Blast'), I.broadside(3, 'Twin Spell'), I.rake(2, 'Rune Volley'), I.shot(5, 'Arcane Lance'), I.repair(3, 'Mend Rune')] },
      ],
    },
    barge: {
      name: 'Crystal Barge', weight: 8, hp: 28, look: 'barge', area: 1, armor: 1, armorGrowth: 1, armorMax: 4,
      gimmick: 'Crystal Growth: it starts with 1 Armor and grows 1 more at the end of each of its turns (up to 4). Armor cuts every hit; piercing hits and prisms ignore it.',
      phases: [
        { name: 'Calcifying', min: 14, table: [I.ram(5, 2, 'Crystal Ram'), I.shot(3, 'Shard Cannon'), I.block(5, 'Crystal Wall'), I.repair(3, 'Regrow'), I.shot(4, 'Shard Cannon'), I.rake(1, 'Shard Spray')] },
        { name: 'Fractured', min: 1, table: [I.ram(6, 2, 'Crystal Ram'), I.shot(4, 'Shard Cannon'), I.rake(2, 'Shard Spray'), I.broadside(3, 'Splinter Volley'), I.shot(5, 'Geode Shot'), I.block(4, 'Crystal Wall')] },
      ],
    },
    mirage: {
      name: 'Mirage Galleon', weight: 5, hp: 24, look: 'mirage', area: 1, wardKind: 'illusion',
      gimmick: 'Mirror Image: it conjures illusions of itself, and only one ship is real. Each illusion takes one whole hit before the real ship can be struck.',
      phases: [
        { name: 'Mirage', min: 12, table: [I.illusion(2), I.shot(4, 'Phantom Cannon'), I.broadside(2, 'Phantom Volley'), I.token('hex', 1, 'Bewitch'), I.shot(3, 'Phantom Cannon'), I.charge(3, 'Gather Mist')] },
        { name: 'Unmasked', min: 1, table: [I.shot(5, 'Phantom Cannon'), I.illusion(2), I.broadside(3, 'Phantom Volley'), I.rake(2, 'Glass Shards'), I.shot(4, 'Phantom Cannon'), I.ram(5, 2, 'Ghost Ram')] },
      ],
    },
    archon: {
      name: 'The Aurora Archon', weight: 6, hp: 54, look: 'archon', boss: true, area: 1, wardKind: 'crystal',
      gimmick: 'Living Light. Runefall: its runes strike every module on a telegraphed deck, past armor. Prismatic Shift: the aurora turns every half-turn and the Archon copies its power. Grand Convergence: it charges a spell for 2 turns behind 4 focus crystals. Break every crystal or Evade the blast.',
      phases: [
        { name: 'Runefall', min: 27, table: [I.rune(2), I.rune(2), I.shot(4, 'Light Lance'), I.ward(2, 'Prism Ward'), I.token('hex', 1, 'Hex Sigil'), I.charge(3, 'Gather Light')] },
        { name: 'Prismatic Shift', min: 14, table: [I.shot(5, 'Light Lance'), I.rune(3), I.rake(2, 'Aurora Lash'), I.broadside(3, 'Twin Beams'), I.ward(2, 'Prism Ward'), I.token('hex', 2, 'Hex Sigil')] },
        { name: 'Grand Convergence', min: 1, table: [I.shot(5, 'Light Lance'), I.rune(3), I.rake(3, 'Aurora Lash'), I.broadside(3, 'Twin Beams'), I.shot(6, 'Starlance'), I.repair(4, 'Mend Light')] },
      ],
    },
  });
  // ---------- Area 3 enemies ----------
  Object.assign(ENEMIES, {
    bats: {
      name: 'Bat Swarm', weight: 1, hp: 15, look: 'bats', area: 2,
      gimmick: 'A cloud of iron-winged bats: fast, many-fanged raking strikes that leave Bleed.',
      phases: [
        { name: 'Swarming', min: 8, table: [I.bleedRake(1, 'Fang Storm'), I.bleedRake(1, 'Fang Storm'), I.bleed(2, 1, 'Bite'), I.bleed(2, 1, 'Bite'), I.rake(2, 'Wing Slash'), I.charge(2, 'Shriek')] },
        { name: 'Frenzied', min: 1, table: [I.bleedRake(2, 'Fang Storm'), I.bleedRake(1, 'Fang Storm'), I.bleed(3, 2, 'Deep Bite'), I.rake(2, 'Wing Slash'), I.bleedRake(2, 'Fang Storm'), I.bleed(2, 1, 'Bite')] },
      ],
    },
    wraith: {
      name: 'Wraith Clipper', weight: 3, hp: 16, look: 'wraith', area: 2, phased: true,
      gimmick: 'Ghostly: on odd rounds it phases out of the world and your shots pass through it. Bleed and Burn still tick.',
      phases: [
        { name: 'Haunting', min: 11, table: [I.shot(4, 'Spectral Cannon'), I.shot(4, 'Spectral Cannon'), I.bleed(2, 2, 'Soul Hook'), I.rake(2, 'Wailing Volley'), I.charge(3, 'Gather Dread'), I.block(4, 'Ectoplasm')] },
        { name: 'Unbound', min: 1, table: [I.shot(5, 'Spectral Cannon'), I.bleed(3, 2, 'Soul Hook'), I.broadside(3, 'Grave Volley'), I.rake(2, 'Wailing Volley'), I.shot(4, 'Spectral Cannon'), I.ram(5, 2, 'Ghost Ram')] },
      ],
    },
    bonegalleon: {
      name: 'Bone Galleon', weight: 7, hp: 17, look: 'bonegalleon', area: 2, rises: true, armor: 1,
      gimmick: 'Deathless: the first time it sinks it rises again at half Durability. Bone plating: Armor 1.',
      phases: [
        { name: 'Grave March', min: 13, table: [I.shot(4, 'Bone Cannon'), I.ram(5, 2, 'Ossuary Ram'), I.broadside(2, 'Rib Volley'), I.block(5, 'Bone Wall'), I.shot(4, 'Bone Cannon'), I.bleed(2, 1, 'Splinter Shot')] },
        { name: 'Splintering', min: 1, table: [I.shot(5, 'Bone Cannon'), I.ram(6, 2, 'Ossuary Ram'), I.broadside(3, 'Rib Volley'), I.bleedRake(2, 'Splinter Hail'), I.repair(3, 'Knit Bones'), I.shot(4, 'Bone Cannon')] },
      ],
    },
    cultist: {
      name: 'Blood Cultist Barge', weight: 6, hp: 22, look: 'cultist', area: 2, bleedFeeds: true,
      gimmick: 'Blood Rites: every point of Bleed damage your ship takes heals it.',
      phases: [
        { name: 'Bloodletting', min: 13, table: [I.bleed(2, 2, 'Ritual Knife'), I.bleed(2, 2, 'Ritual Knife'), I.bleedRake(1, 'Thorn Rain'), I.shot(4, 'Sacrificial Gun'), I.block(4, 'Blood Ward'), I.repair(3, 'Transfusion')] },
        { name: 'Exsanguinate', min: 1, table: [I.bleed(3, 3, 'Ritual Knife'), I.bleedRake(2, 'Thorn Rain'), I.shot(5, 'Sacrificial Gun'), I.bleed(2, 2, 'Ritual Knife'), I.broadside(3, 'Red Volley'), I.charge(3, 'Dark Chant')] },
      ],
    },
    sovereign: {
      name: 'The Crimson Sovereign', weight: 8, hp: 34, look: 'sovereign', boss: true, area: 2,
      gimmick: 'Queen of the Blood Moon. Blood Tithe: Bleed barrages, and bat swarms that screen her and bite. Crimson Tide: the moon locks full and she drains your modules to heal. Eclipse: the sky goes dark and she fires a blood beam down a telegraphed deck. Block it with front armor, Evade it, or kill her first.',
      phases: [
        { name: 'Blood Tithe', min: 31, table: [I.bleedRake(1, 'Crimson Barrage'), I.bleedRake(2, 'Crimson Barrage'), I.summon(2), I.bleed(3, 2, 'Thorned Lance'), I.shot(5, 'Royal Cannon'), I.bleedRake(1, 'Crimson Barrage')] },
        { name: 'Crimson Tide', min: 16, table: [I.drain(1), I.drain(1), I.bleedRake(2, 'Crimson Barrage'), I.shot(5, 'Royal Cannon'), I.bleed(3, 2, 'Thorned Lance'), I.broadside(3, 'Twin Fangs')] },
        { name: 'Eclipse', min: 1, table: [I.shot(5, 'Royal Cannon'), I.bleedRake(2, 'Crimson Barrage'), I.bleed(3, 3, 'Thorned Lance'), I.drain(1), I.broadside(3, 'Twin Fangs'), I.summon(2)] },
      ],
    },
  });
  for (const [id, e] of Object.entries(ENEMIES)) {
    e.id = id;
    for (const p of e.phases) p.table = p.table.map((it) => (PLUNGING.has(it.name) ? { ...it, aim: 'plunge' } : it));
  }

  // ---------- Encounters (sky map node types) ----------
  const ENCOUNTERS = {
    patrol: { name: 'Pirate Patrol', kind: 'Combat', text: 'Sky pirates on the hunt. Win for cogs and a pick of parts.' },
    lair: { name: 'Pirate Lair', kind: 'Elite', biome: 'lair', text: 'A fortified hideout guarded by a heavy warship. Better loot: uncommon and rare parts.' },
    storm: {
      name: 'Storm Front', kind: 'Hazard', biome: 'storm',
      text: 'Fly through the squall. Roll a d6.',
      table: ['Lightning: 2 damage to the top of a rolled column', 'Crosswind: 1 damage to the prow and stern tail (Weight 6+ ignores it)', 'Downdraft: jettison a module at the edge of the ship or the Core takes 2', 'Eye of the storm: repair or scavenge', 'Drifting salvage: pick 1 of 2 parts', 'Tailwind: +1 sight and +2 Steam next fight'],
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
      table: ['Debris rains on a rolled column: 2 damage', 'Burning wreckage sets a rolled column alight', 'Gas leaks into a weapon', 'Trap sprung: the pirates start with 4 Block', 'You spot the trap: +2 Steam on your first turn', 'Strip the wreck first: pick 1 of 2 parts'],
    },
    guild: { name: 'Mercenary Island', kind: 'Quest', biome: 'port', text: 'A guild outpost on a floating island. Roll two contracts and sign one.' },
    hangar: {
      name: 'Sky Dock', kind: 'Sky Dock',
      text: "A hangar in the clouds. Rearrange your modules freely, then roll for the mechanics' help.",
      table: ['Core Patch: repair 3 Core', 'Part Maintenance: fully repair a module', 'Reinforcement: +1 max Durability to a module', 'Overhaul: repair 2 on every module', 'Spare Part: pick 1 of 2 parts', 'Master Mechanic: reinforce a module and fully repair it'],
    },
    derelict: {
      name: 'Derelict Hulk', kind: 'Salvage', biome: 'derelict',
      text: 'A dead warship drifts in the clouds, still full of parts. Roll a d6 as you board.',
      table: ['Booby trap: a rolled column catches fire', 'Collapsing deck: risk the Core for a rare part, or leave', 'Survivors: they repair 2 on every module', 'Strongbox: +18 cogs', 'Armory: pick 1 of 3 parts', 'Intact engine room: a free uncommon part and 10 cogs'],
    },
    rift: {
      name: 'Aether Rift', kind: 'Hazard', biome: 'rift',
      text: 'A tear in the sky, glowing with strange light. Roll a d6 and fly through.',
      table: ['Rift lash: 2 damage to a random module and 1 to the Core', 'Time slip: pay 10 cogs or the Core takes 2', 'Echo: a random module gains +1 max Durability', 'A bargain: trade 2 max Core Durability for a rare part, or refuse', 'Clear sight: +1 sight for three legs and repair 2 Core', 'Aether treasure: pick 1 of 2 rare parts'],
    },
    // Area 2: the Aurora Reaches.
    shrine: {
      name: 'Aurora Shrine', kind: 'Shrine', biome: 'aurora',
      text: 'A crystal altar under the dancing lights. Offer a module to the aurora for a blessing that lasts the whole run.',
    },
    spire: {
      name: "Enchanter's Spire", kind: 'Enchant', biome: 'aurora',
      text: 'A tower of floating runes where an enchanter works for passing captains. Enchant one module.',
    },
    starchart: {
      name: 'Star Chart', kind: 'Chart', biome: 'aurora',
      text: "An astronomer's island. Its charts reveal the whole area's route, and the movements of the Archon itself.",
    },
    // Area 3: the Blood Moon.
    bloodaltar: {
      name: 'Blood Altar', kind: 'Altar', biome: 'bloodmoon',
      text: 'A black altar slick with old blood. It trades in Durability: bleed your Core into it for a rare part, or a legendary.',
    },
    crypt: {
      name: 'Crypt Wreck', kind: 'Salvage', biome: 'bloodmoon',
      text: 'A sunken cathedral-ship full of tombs and treasure. Search it, and roll a d6: something may still be guarding it.',
      table: ['Ambush! A Bone Galleon rises from the crypt', 'Ambush! A Bat Swarm bursts from the bell tower', 'Cursed reliquary: a module gains 2 Bleed, but pick 1 of 3 parts', 'Offering plates: +22 cogs', 'The armory: pick 1 of 3 parts', 'The bishop\'s hoard: a rare part'],
    },
    moonwell: {
      name: 'Moon Well', kind: 'Well', biome: 'bloodmoon',
      text: 'A still pool that holds the moon\'s reflection. Draw its light down and the Blood Moon wanes to nothing.',
    },
    boss: { name: 'Boss', kind: 'Boss', text: 'The final gate.' },
  };
  for (const [id, e] of Object.entries(ENCOUNTERS)) e.id = id;

  // Odds for regular map nodes (Pirate Lairs only from column 4).
  const NODE_WEIGHTS = { patrol: 32, lair: 11, storm: 8, smog: 7, trader: 10, beacon: 10, guild: 6, hangar: 8, derelict: 8, rift: 6 };
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

  // ---------- Areas ----------
  // A run crosses three areas, each with its own route and boss. Beating an area's boss tears open
  // a portal to the next. cols: map columns including the boss column. midCol: a Trading Zeppelin
  // or Sky Dock is guaranteed there. hp / dmg: how much tougher its pirates are than Area 1's
  // (Durability multiplier, and + damage per hit); bossHp scales its boss the same way.
  // tiers / elites / beacon: which enemies fly there. bands: biome bands across its route.
  const AREAS = [
    {
      id: 'skies', name: 'The Open Skies', numeral: 'I', blurb: 'Pirate-held trade lanes over the cloud sea.', cols: 12, midCol: 6, lairFrom: 4,
      bosses: BOSSES, tiers: ENEMY_TIERS, elites: ELITES, beacon: ['skiff', 'cutter'], nodeWeights: NODE_WEIGHTS, bands: BIOME_BANDS,
      hp: 1, dmg: 0, bossHp: 1, veteranColumns: [6, 11], bossBiome: 'lair',
    },
    {
      id: 'aurora', name: 'The Aurora Reaches', numeral: 'II', blurb: 'A magical sky of shifting auroras, crystal islands and spell-powered ships.', cols: 11, midCol: 5, lairFrom: 3,
      bosses: ['archon'], tiers: [{ upTo: 4, pool: ['wisp', 'corvette', 'mirage'] }, { upTo: 99, pool: ['corvette', 'mirage', 'barge', 'wisp'] }],
      elites: ['mirage', 'barge'], beacon: ['wisp', 'corvette'],
      nodeWeights: { patrol: 32, lair: 10, shrine: 8, spire: 8, starchart: 6, trader: 10, beacon: 8, guild: 6, hangar: 8, rift: 6 },
      names: { patrol: 'Spell Patrol', lair: 'Arcane Bastion', beacon: 'Glimmering Lure' },
      bands: [{ upTo: 3, biome: 'aurora' }, { upTo: 7, biome: 'auroraRift' }, { upTo: 99, biome: 'auroraDeep' }],
      hp: 1.2, dmg: 0, bossHp: 1, veteranColumns: [6], bossBiome: 'archon', aurora: true, accent: '#6ff0d0',
    },
    {
      id: 'bloodmoon', name: 'The Blood Moon', numeral: 'III', blurb: 'A crimson night under a vast red moon, haunted by gothic wrecks.', cols: 11, midCol: 5, lairFrom: 3,
      bosses: ['sovereign'], tiers: [{ upTo: 4, pool: ['bats', 'wraith', 'cultist'] }, { upTo: 99, pool: ['wraith', 'cultist', 'bonegalleon', 'bats'] }],
      elites: ['bonegalleon', 'cultist'], beacon: ['bats', 'wraith'],
      nodeWeights: { patrol: 32, lair: 10, bloodaltar: 7, crypt: 8, moonwell: 7, trader: 10, beacon: 8, guild: 6, hangar: 8 },
      names: { patrol: 'Night Hunters', lair: 'Gothic Keep', beacon: 'Bleeding Beacon' },
      bands: [{ upTo: 3, biome: 'bloodmoon' }, { upTo: 7, biome: 'bloodFog' }, { upTo: 99, biome: 'bloodSpires' }],
      hp: 0.85, dmg: 0, bossHp: 1, veteranColumns: [6], bossBiome: 'eclipse', moon: true, accent: '#ff5a5a',
    },
  ];
  AREAS.forEach((a, i) => { a.index = i; });

  // ---------- The Workshop (meta-progression) ----------
  // Parts and Cores a new captain must buy with Blueprints before they appear. Everything not
  // listed is in the starting pool.
  const UNLOCKS = [
    { id: 'clockwork', kind: 'core', name: 'Clockwork Core', cost: 40 },
    { id: 'arcanist', kind: 'core', name: 'Arcanist Core', cost: 60 },
    { id: 'sanguinist', kind: 'core', name: 'Sanguine Core', cost: 60 },
    { id: 'eclipse', kind: 'core', name: 'Eclipse Core', cost: 80 },
    { id: 'sniper', kind: 'part', name: 'Sniper Rifle', cost: 15 },
    { id: 'gatling', kind: 'part', name: 'Gatling Gun', cost: 15 },
    { id: 'lightningrod', kind: 'part', name: 'Lightning Rod', cost: 12 },
    { id: 'boiler', kind: 'part', name: 'Auxiliary Boiler', cost: 15 },
    { id: 'hatch', kind: 'part', name: 'Supply Hatch', cost: 12 },
    { id: 'heart', kind: 'part', name: 'Clockwork Heart', cost: 20 },
    { id: 'tesla', kind: 'part', name: 'Tesla Coil', cost: 30 },
    { id: 'autoloader', kind: 'part', name: 'Autoloader', cost: 25 },
    { id: 'gyro', kind: 'part', name: 'Gyro Stabilizer', cost: 25 },
    { id: 'overpressure', kind: 'part', name: 'Overpressure Valve', cost: 30 },
    { id: 'starsail', kind: 'part', name: 'Star Sail', cost: 15 },
    { id: 'prism', kind: 'part', name: 'Prism Array', cost: 18 },
    { id: 'manalens', kind: 'part', name: 'Mana Lens', cost: 25 },
    { id: 'sanguine', kind: 'part', name: 'Sanguine Engine', cost: 15 },
    { id: 'moonmortar', kind: 'part', name: 'Moon Mortar', cost: 18 },
    { id: 'crimsonaltar', kind: 'part', name: 'Crimson Altar', cost: 25 },
  ];
  // Starting upgrades, bought once and active on every run.
  const UPGRADES = [
    { id: 'extraPart', name: 'Spare Crate', cost: 30, text: 'Start every run with one extra common part to install.' },
    { id: 'steam', name: 'Pressurised Boilers', cost: 40, text: '+1 Steam on the first turn of every fight.' },
    { id: 'reroll', name: "Quartermaster's Ledger", cost: 35, text: 'Once in each area, reroll a loot offer.' },
  ];
  // Blueprints earned from a run (losing still pays the base and what you cleared).
  const BLUEPRINTS = { base: 5, area: 15, boss: 10, firstBoss: 10, quest: 4, elite: 1, win: 10, lore: 3 };
  // Storm Tiers: unlocked by a first full clear. Each tier adds one modifier on top of the ones before.
  const STORM_TIERS = [
    { tier: 1, name: 'Squall', text: 'Enemies have 10% more Durability.' },
    { tier: 2, name: 'Lean Holds', text: 'Start with 10 fewer cogs; Trading Zeppelins charge 15% more.' },
    { tier: 3, name: 'Hardened Crews', text: 'Every enemy deals +1 damage.' },
    { tier: 4, name: 'Dread Captains', text: 'Bosses have 20% more Durability.' },
    { tier: 5, name: 'Thin Hulls', text: 'Your Core has 3 less max Durability.' },
    { tier: 6, name: 'Black Storm', text: 'Every enemy starts each fight behind 3 Block.' },
  ];
  // Cosmetics, unlocked by achievements. Paint tints the hull, balloon tints the gasbag, a Core
  // skin recolours the Core's glow and badge.
  const COSMETICS = {
    paint: { standard: { name: 'Shipwright Brass', color: null }, soot: { name: 'Soot Black', color: 'rgba(20,16,22,0.42)' }, verdigris: { name: 'Verdigris', color: 'rgba(60,170,140,0.32)' }, gilded: { name: 'Gilded', color: 'rgba(255,200,80,0.34)' } },
    balloon: { standard: { name: 'Canvas', color: null }, crimson: { name: 'Crimson', color: 'rgba(200,30,40,0.42)' }, aurora: { name: 'Aurora', color: 'rgba(90,240,200,0.38)' }, storm: { name: 'Stormcloud', color: 'rgba(70,90,150,0.45)' } },
    skin: { standard: { name: 'Brass Heart', color: '#f0cf84' }, bloodmoon: { name: 'Blood Moon', color: '#ff3a4a' }, starlit: { name: 'Starlit', color: '#9fe8ff' }, gold: { name: 'Sovereign Gold', color: '#ffd84a' } },
  };
  const ACHIEVEMENTS = [
    { id: 'firstflight', name: 'First Flight', how: 'Finish a run.', reward: ['paint', 'soot'] },
    { id: 'giantslayer', name: 'Giant Slayer', how: 'Sink a boss.', reward: ['balloon', 'crimson'] },
    { id: 'lights', name: 'Through the Lights', how: 'Clear the Aurora Reaches.', reward: ['balloon', 'aurora'] },
    { id: 'sovereign', name: 'Moonfall', how: 'Win a run.', reward: ['skin', 'bloodmoon'] },
    { id: 'veteran', name: 'Veteran Captain', how: 'Fly 10 runs.', reward: ['paint', 'verdigris'] },
    { id: 'collector', name: 'Collector', how: 'Unlock 5 legendaries.', reward: ['skin', 'gold'] },
    { id: 'admiral', name: 'Fleet Admiral', how: 'Win with 3 different Cores.', reward: ['paint', 'gilded'] },
    { id: 'stormeye', name: 'Eye of the Storm', how: 'Win at Storm Tier 3 or higher.', reward: ['balloon', 'storm'] },
    { id: 'starlit', name: 'Starlit', how: 'Win with the Arcanist or Eclipse Core.', reward: ['skin', 'starlit'] },
  ];
  // Logbook lore: deciphered with Blueprints once the entry has been met.
  const LORE = {
    cutter: 'Cheap, quick and everywhere: the cutter is how most pirates start, and how most of them end.',
    skiff: 'A rowboat with a balloon and a grudge. Skiff crews bait wrecks and wait.',
    gunship: 'The pirate fleets\' workhorse, bought second-hand from navies that pretend not to notice.',
    bomber: 'Its holds are packed with firepots. Its captains are rarely the cautious sort.',
    sentinel: 'Once a customs cutter. Its plating outlived the honest crew that bolted it on.',
    flagship: 'A pirate lord\'s pride. Every gun on it was taken from someone who had a bad day.',
    monitor: 'A floating battery that never moves far from its lair, and never needs to.',
    leviathan: 'Riveted together from forty sunk warships. Its engine room is said to have its own weather.',
    stormqueen: 'She was a weather-witch for the trade guild, until she learned what the storms were worth.',
    colossus: 'The Colossus was built to wind the clocks of a city. The city is gone; the winding never stopped.',
    wisp: 'Not a ship so much as a lantern that learned to hunt. It drinks light, and Resonance is light.',
    corvette: 'Hexcraft is cheaper than cannon shot, and the corvette captains are nothing if not thrifty.',
    barge: 'The barge mines the crystal islands and wears its spoils: every turn the crystals grow back thicker.',
    mirage: 'Only one of the galleons is there. Sailors argue for hours about which one it was.',
    archon: 'The aurora itself, taught to steer. Its convergence has unmade whole flotillas in one bright breath.',
    bats: 'Iron-winged bats, bred in the bell towers of drowned cathedrals. They hunt by the smell of rust and blood.',
    wraith: 'A clipper that sank in the first eclipse and refused to stay sunk. It is only half here.',
    bonegalleon: 'Built from the ribs of something vast. Sink it, and its bones remember how to float.',
    cultist: 'The cult sails to the moon and feeds it. What it bleeds out of you, it keeps.',
    sovereign: 'Queen of a night that never ends. Her flagship eclipses the moon itself, and drinks the sky red.',
    leviplating: 'Plate stripped from the Leviathan\'s own hull. It still hates being struck, and strikes back.',
    dreadnought: 'The Leviathan\'s main gun. Its shells were cast to punch through a fortress, or two.',
    galeengine: 'The Storm Queen\'s heart-wind, caged in brass. It wants to move, and it hates to wait.',
    stormheart: 'A shard of the storm she ruled. It answers every blow with lightning.',
    mainspring: 'The Colossus\'s great spring. It never forgot how to wind tighter.',
    titanfist: 'The Colossus\'s fist, which ground cities to rubble. Heavier ships hit harder with it.',
    auroracrown: 'The Archon\'s crown of living light. Whoever wears it tells the sky what colour to be.',
    archonlance: 'A lance of gathered starlight. It drinks every note of Resonance and spends it at once.',
    chalice: 'The Sovereign drank from this every night of her reign. It still thirsts.',
    eclipseblade: 'Forged in the moment the moon went black. Every wound near it opens a little wider.',
  };

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
    bleed: { name: 'Bleed', text: 'Stacks. At the start of your turn it deals damage equal to its stacks, then loses 1.' },
    hex: { name: 'Hex', text: 'Inverted until the end of your next turn: a hexed weapon heals the enemy, hexed armor takes +1 instead of blocking, a hexed repair wounds, and a hexed Steam module drains Steam.' },
  };

  // Targeting. Direct fire: a deck d6 (1-4 the hull, 5-6 the upper deck), then a depth d6 (1-2 the
  // front module, 3-4 the second, 5-6 the third; deeper than the deck goes hits the front).
  // Plunging fire: a column d6 (1-3 stern columns 1-3, 4-6 bow columns 1-3); an empty column lets it
  // drift in toward the Core.
  const ROW_TABLE = [0, 0, 0, 0, 1, 1];
  const DEPTH_TABLE = [0, 0, 1, 1, 2, 2];
  const PLUNGE_TABLE = [-1, -2, -3, 1, 2, 3];

  // Global difficulty knobs, tuned by simulation (see BALANCE_REPORT.md).
  const BALANCE = {
    hpPerColumn: 0.04,       // pirate Durability +4% per map column
    veteranColumns: [6, 11], // +1 damage per hit from each listed column onward
    bossHp: 1.25,            // boss Durability multiplier
    startCogs: 20,
    bombardPerPressure: 1.75, // Zeppelin Bombard damage per point of Pressure (rounded down)
    maxPressure: 6,
    enrageRound: 10,
    evadeBase: 2,            // Evade costs evadeBase + Weight/3 Steam (minimum 1)
    nimbleDiscount: 1,       // Airship Evade discount
    evadeFatigue: 2,         // extra Steam per consecutive Evade
    boardDamage: 2,          // Privateer Boarding Party damage (after stripping Block)
    dischargeBase: 3,        // Tempest Arc Discharge: base + Charge, piercing
    chargeCap: 8,            // Tempest's most Charge
    maxCalmRun: 2,           // most non-fight map stops in a row on any route
    maxCalm: 5,              // most non-fight map stops on any route (columns 1-11)
    bossCogs: 30,            // cogs for beating an area's boss (before its portal)
    areaLootBias: 4,         // an area's own parts are this many times likelier in its loot
    eliteHp: 1.35,           // an elite (lair) version of a regular enemy: Durability multiplier
    eliteDmg: 1,             //   and + damage per hit
    grandCrystals: 4,        // Aurora Archon: focus crystals guarding its Grand Convergence
    grandDamage: 4,          //   the spell's damage to every module (the Core takes 1 less)
    grandBacklash: 8,        //   damage it takes if every crystal breaks first
    moonMax: 6,              // Blood Moon gauge: +1 each round of an Area 3 fight
    moonRising: 3,           //   enemies deal +1 from this level
    frenzyBonus: 1,          //   and this much at full moon (Frenzy)
    moonEvery: 2,            //   rising 1 every this many rounds
    moonWane: 4,             //   and it wanes this much after each fight
    beamDamage: 10,          // Crimson Sovereign: the eclipse blood beam
    beamRest: 2,             //   with this many other moves between beams
    drainHeal: 0.5,            //   Crimson Tide heals this share of what it drains
    bitePerBat: 1,           //   each summoned bat bites for this (and 1 Bleed) at the start of her turn
    chaliceCap: 3,           // Sovereign's Chalice: most Core healed per turn
    umbraBase: 3,            // Eclipse Core: Umbral Strike's base damage
  };

  const data = { BALANCE, CORES, SHIPS, PARTS, LEGENDARY_POOLS, RESONANCE, AURORA, RARITY_ODDS, ENEMIES, ENCOUNTERS, NODE_WEIGHTS, ENEMY_TIERS, ELITES, BOSSES, BIOME_BANDS, AREAS, PRICES, UNLOCKS, UPGRADES, BLUEPRINTS, STORM_TIERS, COSMETICS, ACHIEVEMENTS, LORE, QUESTS, TOKENS, ROW_TABLE, DEPTH_TABLE, PLUNGE_TABLE };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.CardshipsData = data;
})(this);
