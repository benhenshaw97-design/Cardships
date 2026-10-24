// Cardships card data, transcribed from the Master Rule Sheet, Parts list and Encounter sheet.
(function (root) {
  const CORES = {
    airship: {
      id: 'airship', name: 'Airship Core', weight: 0.5, dur: 3,
      blurb: 'Light and fast. Rams hard, but every ram costs hull.',
      ability: { id: 'ram', name: 'Ram', text: 'Deal 3 damage to the enemy and 1 damage to your Core.' },
    },
    battleship: {
      id: 'battleship', name: 'Battleship Core', weight: 2.5, dur: 5,
      blurb: 'Heavy and tough. Usually acts second, hits hard on a timer.',
      ability: { id: 'heavyCannon', name: 'Heavy Cannon', text: 'Deal 3 damage. 3-turn cooldown.', cooldown: 3 },
    },
    zeppelin: {
      id: 'zeppelin', name: 'Zeppelin Core', weight: -1.5, dur: 2,
      blurb: 'Almost weightless and fragile. Charges a devastating bombing run.',
      ability: { id: 'bomber', name: 'Bomber Payload', text: 'Charges over 5 turns of combat. When charged, spend an Action to deal 5 damage.', charge: 5 },
    },
  };

  // type: weapon | defense | support | utility
  // costsDur: firing explicitly spends the weapon's own Durability (per the card text)
  // rules: lines shown on the card, as [label, text]
  const PARTS = {
    harpoon: {
      id: 'harpoon', name: 'Harpoon', abbr: 'HRP', type: 'weapon', weight: 1, dur: 3, dmg: 1,
      rules: [['Outside', 'Deal 1 damage.'], ['Buried · Battery', 'The weapon directly on top of this card deals +1 damage.']],
    },
    artillery: {
      id: 'artillery', name: 'Artillery', abbr: 'ART', type: 'weapon', weight: 1, dur: 3, dmg: 2,
      rules: [['Outside', 'Deal 2 damage. 1-turn cooldown.'], ['Synergy', 'A Telescope directly beneath it removes the cooldown.']],
    },
    cannon: {
      id: 'cannon', name: 'Cannon', abbr: 'CAN', type: 'weapon', weight: 1, dur: 3, dmg: 3, costsDur: true,
      rules: [['Outside · Wild Shot', 'Spend 1 Action and 1 Durability, flip a coin. Heads: 3 damage. Tails: miss.'], ['Buried · Volatile Casing', 'If a card next to it is destroyed by a Ram, it explodes for 1 damage to the enemy.']],
    },
    flamethrower: {
      id: 'flamethrower', name: 'Flamethrower', abbr: 'FLM', type: 'weapon', weight: 1, dur: 3, token: 'fire',
      rules: [['Outside', 'Place a Fire token on the enemy (1 damage at the start of each of its turns).']],
    },
    glueGatling: {
      id: 'glueGatling', name: 'Glue Gatling', abbr: 'GLU', type: 'weapon', weight: 1, dur: 3, token: 'glue',
      rules: [['Outside · Suppressing Fire', 'Place a Glue token on the enemy (its attacks deal -1 damage).'], ['Passive · Adhesive Reinforcement', 'An Armor card touching this one gains +1 max Durability.']],
    },
    gasGrenadiers: {
      id: 'gasGrenadiers', name: 'Gas Grenadiers', abbr: 'GAS', type: 'weapon', weight: 1, dur: 3, token: 'gas',
      rules: [['Outside · Toxic Cloud', 'Place a Gas token on the enemy (it flips a coin to land each attack).'], ['Passive', 'If a card touching this one is destroyed, place a Gas token on the enemy.']],
    },
    sniper: {
      id: 'sniper', name: 'Sniper', abbr: 'SNP', type: 'weapon', weight: 1, dur: 3, dmg: 1, costsDur: true,
      rules: [['Outside', 'Spend 1 Action and 1 Durability, flip for a crit. Heads: 2 damage that pierces enemy Armor. Tails: 1 damage.']],
    },
    armor: {
      id: 'armor', name: 'Armor', abbr: 'ARM', type: 'defense', weight: 1, dur: 3,
      rules: [['Outside', 'Takes every hit aimed at its side, at the cost of its own Durability.'], ['Buried', 'Takes 1 damage of any hit on a card touching it.']],
    },
    repairBay: {
      id: 'repairBay', name: 'Repair Bay', abbr: 'REP', type: 'support', weight: 1, dur: 3, active: 'repair',
      rules: [['Active', 'Spend 1 Durability from this card to add 1 Durability to another card.'], ['Passive', 'After combat, repairs 1 Durability to itself (max 3).'], ['Synergy', 'Attached directly to the Core, it can repair the Core.']],
    },
    barracks: {
      id: 'barracks', name: 'Barracks', abbr: 'BRK', type: 'support', weight: 1, dur: 2,
      rules: [['Passive', 'Take one additional Action per turn.'], ['Synergy · Manning the Guns', 'Directly behind a weapon, it pays that weapon\'s firing Durability instead.']],
    },
    fireExtinguisher: {
      id: 'fireExtinguisher', name: 'Fire Extinguisher', abbr: 'EXT', type: 'support', weight: 1, dur: 2, active: 'fire',
      rules: [['Active', 'Spend 1 Durability to remove a Fire token.'], ['Passive', 'Parts touching this one cannot catch fire.']],
    },
    janitor: {
      id: 'janitor', name: 'Janitor Station', abbr: 'JAN', type: 'support', weight: 1, dur: 2, active: 'glue',
      rules: [['Outside / Buried · Power Wash', 'Spend 1 Durability to remove a Glue token.']],
    },
    hazmat: {
      id: 'hazmat', name: 'Hazmat Station', abbr: 'HAZ', type: 'support', weight: 1, dur: 3, active: 'gas',
      rules: [['Active · Issue Masks', 'Spend 1 Durability to remove a Gas token from any card.'], ['Passive · Filtration', 'A weapon touching this one is immune to Gas tokens.']],
    },
    telescope: {
      id: 'telescope', name: 'Telescope', abbr: 'TEL', type: 'utility', weight: 1, dur: 1,
      rules: [['Outside', '+1 path choice for upcoming encounters.'], ['Synergy', 'Directly beneath an outside Artillery, removes its cooldown.']],
    },
    balloon: {
      id: 'balloon', name: 'Balloon', abbr: 'BLN', type: 'utility', weight: -1, dur: 1,
      rules: [['Passive', 'Reduces total weight by 1. Extremely fragile.']],
    },
    storageBay: {
      id: 'storageBay', name: 'Storage Bay', abbr: 'STO', type: 'utility', weight: 1, dur: 3,
      rules: [['Passive', 'Holds up to 2 spare parts. +1 weight per stored part. Destroyed: the stored parts are lost.'], ['Quick Swap', 'After a combat win, swap 1 installed part with 1 stored part.']],
    },
    supplyHatch: {
      id: 'supplyHatch', name: 'Supply Hatch', abbr: 'SUP', type: 'utility', weight: 1, dur: 2,
      rules: [['Scavenger\'s Choice', 'When you win a combat, draw 2 Part Cards and keep 1.'], ['Logistics Combo', 'With a Storage Bay installed, keep both.']],
    },
  };

  // Relative odds of each part turning up as loot.
  const LOOT_WEIGHTS = {
    harpoon: 6, artillery: 5, cannon: 5, flamethrower: 4, glueGatling: 4, gasGrenadiers: 4, sniper: 4,
    armor: 6, repairBay: 4, barracks: 3, fireExtinguisher: 3, janitor: 2, hazmat: 2,
    telescope: 3, balloon: 3, storageBay: 2, supplyHatch: 2,
  };

  // Enemy ability kinds:
  //   attack  {dmg, target: 'roll' | 'outer'}   roll = coin for side + d4 for layer (4 = miss)
  //   ram     {dmg, self, target}               hits you and itself
  //   shield                                    blocks the next damage it takes
  //   repair  {amount}
  //   token   {token, target: 'outerLayer' | 'outerWeapon'}
  const A = {
    harpoon: { name: 'Harpoon', kind: 'attack', dmg: 1, target: 'roll', text: '1 damage to a rolled layer.' },
    armor: { name: 'Armor', kind: 'shield', text: 'Blocks the next damage it takes.' },
    repair: { name: 'Repair Bay', kind: 'repair', amount: 1, text: 'Repairs 1 Durability.' },
    ram: { name: 'Ram', kind: 'ram', dmg: 3, self: 3, target: 'roll', text: '3 damage to a rolled layer and 3 to itself.' },
    ramOuter: { name: 'Ram', kind: 'ram', dmg: 3, self: 3, target: 'outer', text: '3 damage to your outermost card on a side, 3 to itself.' },
    heavyCannon: { name: 'Heavy Cannon', kind: 'attack', dmg: 2, target: 'outer', text: '2 damage to your outermost card on a side.' },
    toxicShell: { name: 'Toxic Shell', kind: 'token', token: 'gas', target: 'outerWeapon', text: 'Gas token on your outermost weapon on a side.' },
    suppressingFire: { name: 'Suppressing Fire', kind: 'token', token: 'glue', target: 'outerWeapon', text: 'Glue token on your outermost weapon on a side.' },
    incendiary: { name: 'Incendiary Round', kind: 'token', token: 'fire', target: 'outerLayer', text: 'Fire token on your outermost card on a side.' },
  };

  // Phases are listed from full health down; each table maps a d4 roll (1-4) to an ability.
  const ENEMIES = {
    attackBoat: {
      id: 'attackBoat', name: 'Attack Boat', weight: 5, dur: 12,
      phases: [
        { name: 'Phase 1', min: 9, table: [A.harpoon, A.harpoon, A.armor, A.repair] },
        { name: 'Phase 2', min: 5, table: [A.harpoon, A.armor, A.repair, A.ram] },
        { name: 'Phase 3', min: 1, table: [A.harpoon, A.ram, A.ram, A.ram] },
      ],
    },
    scavengerSkiff: {
      id: 'scavengerSkiff', name: 'Scavenger Skiff', weight: 3, dur: 6,
      phases: [{ name: 'Tactics', min: 1, table: [A.harpoon, A.harpoon, A.armor, A.ram] }],
    },
    ironLeviathan: {
      id: 'ironLeviathan', name: 'The Iron Leviathan', weight: 10, dur: 20, boss: true,
      phases: [
        { name: 'Artillery & Disruption', min: 14, table: [A.heavyCannon, A.heavyCannon, A.toxicShell, A.armor] },
        { name: 'Hazard Protocol', min: 7, table: [A.suppressingFire, A.incendiary, A.harpoon, A.repair] },
        { name: 'Desperation', min: 1, table: [A.ramOuter, A.ramOuter, A.heavyCannon, A.heavyCannon] },
      ],
    },
  };

  // paths: how many encounter cards you choose between after this one (before Telescope bonuses).
  const ENCOUNTERS = {
    attackBoat: {
      id: 'attackBoat', name: 'Attack Boat', kind: 'Combat', paths: 2, enemy: 'attackBoat',
      text: 'A 12-Durability gunboat. Its tactics turn desperate as it takes damage. Win to draw a part.',
      table: null,
    },
    windStorm: {
      id: 'windStorm', name: 'Wind Storm', kind: 'Hazard', paths: 3,
      text: 'Ride out the storm. Roll 1d4.',
      table: ['Outer layers take 1 damage', 'Nothing happens', 'Find an extra part', 'Roll 2 more times'],
    },
    mobileVendor: {
      id: 'mobileVendor', name: 'Mobile Vendor', kind: 'Trade', paths: 1,
      text: 'A trader flags you down. Roll 1d4.',
      table: ['Gain an extra part', 'Full repair', 'Lose a part', 'Draw an extra path'],
    },
    derelict: {
      id: 'derelict', name: 'Derelict Distress Signal', kind: 'Ambush', paths: 3, enemy: 'scavengerSkiff',
      text: 'A hazard that turns into a fight with a Scavenger Skiff. Rich routes onward.',
      table: ['Outer layers take 1 damage', 'Fire token on a random outer layer', 'Gas token on an outer weapon', 'Nothing happens'],
    },
    mercenary: {
      id: 'mercenary', name: 'Mercenary Contract', kind: 'Quest', paths: 2,
      text: 'Take on a contract. Roll 1d4 for your mission.',
      table: ['The Bounty', 'The Survivor', 'The Hoarder', 'The Ironclad'],
    },
    shipyard: {
      id: 'shipyard', name: 'Abandoned Shipyard', kind: 'Drydock', paths: 1,
      text: 'Freely rearrange your installed parts, then roll for salvage.',
      table: ['Core Patch: repair 1 Core Durability', 'Part Maintenance: fully repair a part', 'Structural Reinforcement: +1 max Durability to a weapon or Armor', 'Nothing happens'],
    },
    boss: {
      id: 'boss', name: 'The Iron Leviathan', kind: 'Boss', paths: 0, enemy: 'ironLeviathan',
      text: 'The final gate. 20 Durability across three phases.',
      table: null,
    },
  };

  const ENCOUNTER_WEIGHTS = { attackBoat: 30, windStorm: 18, mobileVendor: 12, derelict: 16, mercenary: 10, shipyard: 12 };

  const QUESTS = {
    bounty: { id: 'bounty', name: 'The Bounty', goal: 'Defeat an enemy with more than 10 max Durability.', reward: 'Draw 2 Part Cards and keep both.' },
    survivor: { id: 'survivor', name: 'The Survivor', goal: 'Get through a Wind Storm taking 0 damage.', reward: 'A free Armor card.' },
    hoarder: { id: 'hoarder', name: 'The Hoarder', goal: 'Find and install a Storage Bay.', reward: 'A free Supply Hatch.' },
    ironclad: { id: 'ironclad', name: 'The Ironclad', goal: 'Catch fire during a combat and win it.', reward: 'Permanently +1 max Durability to a weapon.' },
  };
  const QUEST_ORDER = ['bounty', 'survivor', 'hoarder', 'ironclad'];

  const TOKENS = {
    fire: { name: 'Fire', text: '1 damage to the burning card at the start of every turn. Cleared by a Fire Extinguisher.' },
    glue: { name: 'Glue', text: '-1 damage on the glued weapon. Cleared by a Janitor Station.' },
    gas: { name: 'Gas', text: 'Coin flip to fire: tails is a miss. Cleared by a Hazmat Station.' },
  };

  const data = { CORES, PARTS, LOOT_WEIGHTS, ENEMIES, ENCOUNTERS, ENCOUNTER_WEIGHTS, QUESTS, QUEST_ORDER, TOKENS };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.CardshipsData = data;
})(this);
