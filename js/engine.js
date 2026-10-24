// Cardships rules engine. Holds the whole run state and exposes one method per player decision.
// No DOM access: the UI reads the state and calls these methods, and the tests drive it directly.
(function (root, factory) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const api = factory(isNode ? require('./data.js') : root.CardshipsData);
  if (isNode) module.exports = api;
  else root.CardshipsEngine = api;
})(this, function (D) {
  const { CORES, PARTS, LOOT_WEIGHTS, ENEMIES, ENCOUNTERS, ENCOUNTER_WEIGHTS, QUESTS, QUEST_ORDER } = D;

  const MAX_LAYERS = 3;
  const MAX_PATHS = 3;
  const STORAGE_SLOTS = 2;
  const SIDES = ['left', 'right'];

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function noTokens() { return { fire: false, glue: false, gas: false }; }
  function sideLabel(side) { return side === 'left' ? 'Left' : 'Right'; }

  class Game {
    constructor(opts = {}) {
      this.seed = opts.seed != null ? opts.seed >>> 0 : (Math.floor(Math.random() * 2 ** 32) >>> 0);
      this.rng = mulberry32(this.seed);
      this.strict = !!opts.strict;          // every weapon shot costs 1 Durability
      this.maxDepth = opts.maxDepth || 10;  // the boss is encounter number maxDepth
      this.nextUid = 1;
      this.log = [];
      this.logId = 0;
      this.flashes = new Set();

      this.phase = 'coreSelect';
      this.core = null;
      this.left = [];
      this.right = [];
      this.storage = [];
      this.depth = 0;
      this.nextPaths = 2;
      this.pathBonus = 0;
      this.choices = [];
      this.quest = null;

      this.combat = null;
      this.event = null;
      this.shipyard = null;
      this.lootTitle = '';
      this.lootOffer = null;   // { ids, keep } awaiting picks
      this.pendingLoot = [];   // part cards waiting to be installed, stored or jettisoned
      this.swapAvailable = false;
      this.pendingChoice = null; // { kind, prompt, eligible: [uid] }
      this.won = false;
      this.stats = { encounters: 0, kills: 0, dmgDealt: 0, dmgTaken: 0, parts: 0, quests: 0 };
    }

    // ---------- dice & log ----------
    d4() { return 1 + Math.floor(this.rng() * 4); }
    coin() { return this.rng() < 0.5; }
    pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }
    weighted(weights) {
      const entries = Object.entries(weights);
      let r = this.rng() * entries.reduce((s, [, w]) => s + w, 0);
      for (const [k, w] of entries) { if ((r -= w) < 0) return k; }
      return entries[entries.length - 1][0];
    }
    randomPart() { return this.weighted(LOOT_WEIGHTS); }
    say(text, cls = '') { this.log.push({ id: ++this.logId, text, cls }); }

    // ---------- ship queries ----------
    makeCard(id) {
      return { uid: 'p' + this.nextUid++, id, dur: PARTS[id].dur, bonusMax: 0, tokens: noTokens(), cd: 0 };
    }
    def(card) { return PARTS[card.id]; }
    cards() { return [...this.left, ...this.right]; }
    has(id) { return this.cards().some((c) => c.id === id); }
    count(id) { return this.cards().filter((c) => c.id === id).length; }
    locate(uid) {
      if (uid === 'core') return { side: null, idx: -1, card: this.core };
      for (const side of SIDES) {
        const idx = this[side].findIndex((c) => c.uid === uid);
        if (idx >= 0) return { side, idx, card: this[side][idx] };
      }
      return null;
    }
    isOuter(side, idx) { return idx === this[side].length - 1; }
    neighbors(side, idx) {
      const s = this[side];
      return [s[idx - 1], s[idx + 1]].filter(Boolean);
    }
    maxDur(card) {
      if (card === this.core) return this.core.max;
      let m = this.def(card).dur + card.bonusMax;
      if (card.id === 'armor') {
        const loc = this.locate(card.uid);
        if (loc && this.neighbors(loc.side, loc.idx).some((n) => n.id === 'glueGatling')) m += 1;
      }
      return m;
    }
    clampAll() { for (const c of this.cards()) c.dur = Math.min(c.dur, this.maxDur(c)); }
    storageCap() { return this.has('storageBay') ? STORAGE_SLOTS : 0; }
    weight() {
      let w = this.core ? this.core.weight : 0;
      for (const c of this.cards()) w += this.def(c).weight;
      if (this.has('storageBay')) w += this.storage.length;
      return w;
    }
    actionsPerTurn() { return 1 + this.count('barracks'); }
    telescopeBonus() { return SIDES.some((s) => { const o = this[s][this[s].length - 1]; return o && o.id === 'telescope'; }) ? 1 : 0; }
    pathCount() { return Math.max(1, Math.min(MAX_PATHS, this.nextPaths + this.telescopeBonus() + this.pathBonus)); }
    hit(uid) { this.flashes.add(uid); }

    // ---------- run setup ----------
    chooseCore(id) {
      if (this.phase !== 'coreSelect') return;
      const c = CORES[id];
      this.core = { uid: 'core', id, name: c.name, weight: c.weight, dur: c.dur, max: c.dur, tokens: noTokens(), cd: 0, charge: 0 };
      this.left = [this.makeCard('harpoon')];
      this.right = [this.makeCard('armor')];
      this.say(`${c.name} selected. Starter kit: Harpoon on the left, Armor on the right.`, 'sys');
      const ids = [];
      while (ids.length < 3) { const p = this.randomPart(); if (!ids.includes(p)) ids.push(p); }
      this.openLoot('Starter draft', { ids, keep: 1 }, []);
    }

    // ---------- loot ----------
    openLoot(title, offer, parts) {
      this.lootTitle = title;
      if (offer && offer.keep >= offer.ids.length) { parts = parts.concat(offer.ids); offer = null; }
      this.lootOffer = offer;
      this.pendingLoot.push(...parts);
      this.phase = 'loot';
    }
    pickOffer(i) {
      if (!this.lootOffer) return;
      const id = this.lootOffer.ids.splice(i, 1)[0];
      if (!id) return;
      this.pendingLoot.push(id);
      this.lootOffer.keep -= 1;
      if (this.lootOffer.keep <= 0) {
        if (this.lootOffer.ids.length) this.say(`Discarded ${this.lootOffer.ids.map((x) => PARTS[x].name).join(', ')}.`, 'muted');
        this.lootOffer = null;
      }
    }
    canInstall(side, pos) { return this[side].length < MAX_LAYERS && pos >= 0 && pos <= this[side].length; }
    installPending(side, pos) {
      if (!this.pendingLoot.length || !this.canInstall(side, pos)) return false;
      const id = this.pendingLoot.shift();
      const card = this.makeCard(id);
      this[side].splice(pos, 0, card);
      this.clampAll();
      this.stats.parts++;
      this.say(`Installed ${PARTS[id].name} on the ${side} side, layer ${pos + 1}.`);
      if (id === 'storageBay') this.questEvent('installStorage');
      this.clampAll();
      return true;
    }
    storePending() {
      if (!this.pendingLoot.length || this.storage.length >= this.storageCap()) return false;
      const id = this.pendingLoot.shift();
      this.storage.push(this.makeCard(id));
      this.say(`Stowed ${PARTS[id].name} in the Storage Bay.`);
      return true;
    }
    jettisonPending() {
      if (!this.pendingLoot.length) return false;
      const id = this.pendingLoot.shift();
      this.say(`Jettisoned ${PARTS[id].name}.`, 'muted');
      return true;
    }
    scrap(uid) {
      if (!['loot', 'shipyard', 'map'].includes(this.phase)) return false;
      const loc = this.locate(uid);
      if (!loc || loc.card === this.core) return false;
      this.say(`Scrapped ${this.def(loc.card).name}.`, 'muted');
      this.removeCard(loc.side, loc.idx, 'scrap');
      return true;
    }
    discardStored(i) {
      const c = this.storage.splice(i, 1)[0];
      if (c) this.say(`Dumped ${this.def(c).name} from storage.`, 'muted');
    }
    quickSwap(uid, storeIdx) {
      if (!this.swapAvailable) return false;
      const loc = this.locate(uid);
      const stored = this.storage[storeIdx];
      if (!loc || loc.card === this.core || !stored) return false;
      // Swapping the bay itself out would leave nowhere to hold the swapped part.
      if (loc.card.id === 'storageBay' && this.count('storageBay') === 1) return false;
      this[loc.side][loc.idx] = stored;
      this.storage[storeIdx] = loc.card;
      this.swapAvailable = false;
      this.clampAll();
      this.say(`Quick Swap: ${this.def(stored).name} in, ${this.def(loc.card).name} to storage.`);
      if (stored.id === 'storageBay') this.questEvent('installStorage');
      this.clampAll();
      return true;
    }
    finishLoot() {
      if (this.phase !== 'loot' || this.lootOffer || this.pendingLoot.length || this.pendingChoice) return false;
      this.swapAvailable = false;
      this.enterMap();
      return true;
    }

    // Pending rewards that need a target card are resolved here, in any phase.
    resolveChoice(uid) {
      const pc = this.pendingChoice;
      if (!pc || !pc.eligible.includes(uid)) return false;
      const card = this.locate(uid).card;
      if (pc.kind === 'maintain') {
        card.dur = this.maxDur(card);
        this.say(`Part Maintenance: ${this.def(card).name} fully repaired.`, 'good');
      } else if (pc.kind === 'reinforce' || pc.kind === 'ironclad') {
        card.bonusMax += 1;
        card.dur += 1;
        this.say(`${this.def(card).name} permanently gains +1 max Durability.`, 'good');
      }
      this.hit(uid);
      this.pendingChoice = null;
      return true;
    }
    offerChoice(kind, prompt, eligible) {
      if (!eligible.length) { this.say('No eligible part, so the reward is lost.', 'muted'); return; }
      this.pendingChoice = { kind, prompt, eligible };
    }

    // ---------- map ----------
    enterMap() {
      if (this.won) { this.phase = 'victory'; return; }
      this.phase = 'map';
      if (this.depth >= this.maxDepth - 1) {
        this.choices = ['boss'];
        this.say('The Iron Leviathan blocks the only way forward.', 'warn');
        return;
      }
      const n = this.pathCount();
      this.pathBonus = 0;
      const out = [];
      let guard = 0;
      while (out.length < n && guard++ < 50) {
        const e = this.weighted(ENCOUNTER_WEIGHTS);
        if (!out.includes(e) || guard > 30) out.push(e);
      }
      this.choices = out;
    }
    chooseEncounter(i) {
      if (this.phase !== 'map' || !this.choices[i]) return;
      const enc = ENCOUNTERS[this.choices[i]];
      this.depth++;
      this.stats.encounters++;
      this.nextPaths = enc.paths;
      this.say(`— Encounter ${this.depth}: ${enc.name} —`, 'head');
      if (enc.enemy && enc.id !== 'derelict') return this.startCombat(enc.enemy, enc);
      this.event = { enc, rolls: [], next: null, logStart: this.logId };
      if (enc.id === 'windStorm') this.runWindStorm();
      else if (enc.id === 'mobileVendor') this.runVendor();
      else if (enc.id === 'derelict') this.runDerelict();
      else if (enc.id === 'mercenary') this.runMercenary();
      else if (enc.id === 'shipyard') return this.enterShipyard(enc);
      if (this.phase !== 'gameover') this.phase = 'event';
    }
    eventLine(text, cls) { this.say(text, cls); }

    runWindStorm() {
      const before = this.stats.dmgTaken;
      let rolls = 1, total = 0;
      while (rolls > 0 && total < 8) {
        rolls--; total++;
        const r = this.d4();
        this.event.rolls.push(r);
        if (r === 1) { this.eventLine(`Rolled ${r}: the gale batters your outer layers.`, 'bad'); this.hitOuterLayers(1); }
        else if (r === 2) this.eventLine(`Rolled ${r}: the storm passes you by.`);
        else if (r === 3) { const p = this.randomPart(); this.pendingLoot.push(p); this.eventLine(`Rolled ${r}: you snag drifting salvage: ${PARTS[p].name}.`, 'good'); }
        else { rolls += 2; this.eventLine(`Rolled ${r}: the storm rages on. Roll 2 more times.`, 'warn'); }
        if (this.coreDead()) return;
      }
      if (this.stats.dmgTaken === before) this.questEvent('cleanStorm');
    }
    runVendor() {
      const r = this.d4();
      this.event.rolls.push(r);
      if (r === 1) { const p = this.randomPart(); this.pendingLoot.push(p); this.eventLine(`Rolled 1: the vendor throws in a ${PARTS[p].name}.`, 'good'); }
      else if (r === 2) {
        this.core.dur = this.core.max;
        for (const c of this.cards()) c.dur = this.maxDur(c);
        this.eventLine('Rolled 2: full repair. Every part and your Core are restored.', 'good');
      } else if (r === 3) {
        const all = this.cards();
        if (!all.length) this.eventLine('Rolled 3: the vendor wants a part, but you have none to give.');
        else {
          const victim = this.pick(all);
          const loc = this.locate(victim.uid);
          this.eventLine(`Rolled 3: a bad deal. You lose your ${this.def(victim).name}.`, 'bad');
          this.removeCard(loc.side, loc.idx, 'trade');
        }
      } else { this.pathBonus += 1; this.eventLine('Rolled 4: the vendor sells you a chart. +1 path on your next choice.', 'good'); }
    }
    runDerelict() {
      const r = this.d4();
      this.event.rolls.push(r);
      if (r === 1) { this.eventLine('Rolled 1: debris clips your outer layers.', 'bad'); this.hitOuterLayers(1); }
      else if (r === 2) {
        const side = this.coin() ? 'left' : 'right';
        this.eventLine(`Rolled 2: a fire breaks out on your ${side} side.`, 'bad');
        this.placeTokenOnPlayer('fire', side, false);
      } else if (r === 3) {
        const sides = SIDES.filter((s) => { const o = this[s][this[s].length - 1]; return o && this.def(o).type === 'weapon'; });
        if (!sides.length) this.eventLine('Rolled 3: a gas leak, but no outer weapon to foul.');
        else {
          const side = this.pick(sides);
          this.eventLine(`Rolled 3: gas seeps into your ${side} weapon.`, 'bad');
          this.placeTokenOnPlayer('gas', side, true);
        }
      } else this.eventLine('Rolled 4: you board safely.');
      if (!this.coreDead()) {
        this.eventLine('It was a trap. A Scavenger Skiff closes in!', 'warn');
        this.event.next = 'scavengerSkiff';
      }
    }
    runMercenary() {
      const r = this.d4();
      this.event.rolls.push(r);
      const q = QUESTS[QUEST_ORDER[r - 1]];
      if (this.quest) this.eventLine(`You tear up your old contract (${QUESTS[this.quest].name}).`, 'muted');
      this.quest = q.id;
      this.eventLine(`Rolled ${r}: ${q.name}. ${q.goal} Reward: ${q.reward}`, 'good');
      if (q.id === 'hoarder' && this.has('storageBay')) this.eventLine('You already have a Storage Bay; install another to complete it.', 'muted');
    }
    continueEvent() {
      if (this.phase !== 'event' || this.pendingChoice) return;
      const next = this.event.next;
      this.event = null;
      if (next) return this.startCombat(next, ENCOUNTERS.derelict);
      this.afterEncounter('Spoils');
    }
    // Route to the loot screen when there is anything to decide, otherwise straight to the map.
    afterEncounter(title) {
      if (this.phase === 'gameover') return;
      if (this.pendingLoot.length || this.lootOffer || this.swapAvailable || this.pendingChoice) this.openLoot(title, this.lootOffer, []);
      else this.enterMap();
    }

    // ---------- shipyard ----------
    enterShipyard(enc) {
      this.shipyard = { enc, dock: [], roll: null };
      this.phase = 'shipyard';
      this.say('Full Reassembly: detach and reattach any installed parts.');
    }
    detach(uid) {
      if (this.phase !== 'shipyard') return false;
      const loc = this.locate(uid);
      if (!loc || loc.card === this.core) return false;
      this[loc.side].splice(loc.idx, 1);
      for (const c of this.cards()) c.tokens = noTokens();
      this.shipyard.dock.push(loc.card);
      this.clampAll();
      return true;
    }
    attach(dockIdx, side, pos) {
      if (this.phase !== 'shipyard' || !this.canInstall(side, pos)) return false;
      const card = this.shipyard.dock.splice(dockIdx, 1)[0];
      if (!card) return false;
      this[side].splice(pos, 0, card);
      card.dur = Math.min(card.dur, this.maxDur(card));
      return true;
    }
    salvage() {
      if (this.phase !== 'shipyard' || this.shipyard.roll) return;
      const r = this.d4();
      this.shipyard.roll = r;
      if (r === 1) {
        this.core.dur = Math.min(this.core.max, this.core.dur + 1);
        this.hit('core');
        this.say('Salvage 1: Core Patch. +1 Core Durability.', 'good');
      } else if (r === 2) {
        this.say('Salvage 2: Part Maintenance. Choose a part to fully repair.', 'good');
        this.offerChoice('maintain', 'Choose a part to fully repair', this.cards().filter((c) => c.dur < this.maxDur(c)).map((c) => c.uid));
      } else if (r === 3) {
        this.say('Salvage 3: Structural Reinforcement. Choose a weapon or Armor.', 'good');
        this.offerChoice('reinforce', 'Choose a weapon or Armor for +1 max Durability', this.cards().filter((c) => this.def(c).type === 'weapon' || c.id === 'armor').map((c) => c.uid));
      } else this.say('Salvage 4: nothing worth taking.', 'muted');
    }
    leaveShipyard() {
      if (this.phase !== 'shipyard' || !this.shipyard.roll || this.pendingChoice) return false;
      for (const c of this.shipyard.dock) {
        if (this.storage.length < this.storageCap()) { this.storage.push(c); this.say(`Stowed ${this.def(c).name}.`); }
        else this.say(`Left ${this.def(c).name} behind in the shipyard.`, 'muted');
      }
      if (!this.has('storageBay') && this.storage.length) { this.say('No Storage Bay installed: stored parts are lost.', 'bad'); this.storage = []; }
      this.shipyard = null;
      this.clampAll();
      this.enterMap();
      return true;
    }

    // ---------- quests ----------
    questEvent(ev) {
      const q = this.quest;
      if (!q) return;
      const done =
        (q === 'survivor' && ev === 'cleanStorm') ||
        (q === 'hoarder' && ev === 'installStorage') ||
        (q === 'bounty' && ev === 'bigKill') ||
        (q === 'ironclad' && ev === 'fireWin');
      if (!done) return;
      this.quest = null;
      this.stats.quests++;
      this.say(`Contract complete: ${QUESTS[q].name}! ${QUESTS[q].reward}`, 'good');
      if (q === 'bounty') this.pendingLoot.push(this.randomPart(), this.randomPart());
      if (q === 'survivor') this.pendingLoot.push('armor');
      if (q === 'hoarder') this.pendingLoot.push('supplyHatch');
      if (q === 'ironclad') {
        const weapons = this.cards().filter((c) => this.def(c).type === 'weapon').map((c) => c.uid);
        this.offerChoice('ironclad', 'Choose a weapon for +1 max Durability', weapons);
      }
    }

    // ---------- damage to the player ----------
    coreDead() { return this.core.dur <= 0; }
    damageCore(n, src) {
      this.core.dur -= n;
      this.stats.dmgTaken += n;
      this.hit('core');
      this.say(`Your Core takes ${n} damage (${Math.max(0, this.core.dur)}/${this.core.max}).`, 'bad');
      if (this.coreDead()) this.gameOver(src);
    }
    damageCard(uid, n, src) {
      const loc = this.locate(uid);
      if (!loc || n <= 0) return;
      if (loc.card === this.core) return this.damageCore(n, src);
      loc.card.dur -= n;
      this.stats.dmgTaken += n;
      this.hit(uid);
      this.say(`${this.def(loc.card).name} takes ${n} damage (${Math.max(0, loc.card.dur)}/${this.maxDur(loc.card)}).`, 'bad');
      if (loc.card.dur <= 0) this.removeCard(loc.side, loc.idx, src);
    }
    // Paying a card's Durability to use it. Not damage, so it doesn't break the Survivor contract.
    spend(uid) {
      const loc = this.locate(uid);
      if (!loc) return;
      loc.card.dur -= 1;
      this.hit(uid);
      if (loc.card.dur <= 0) {
        this.say(`${this.def(loc.card).name} is spent and falls away.`, 'warn');
        this.removeCard(loc.side, loc.idx, 'spent');
      }
    }
    removeCard(side, idx, src) {
      const s = this[side];
      const card = s[idx];
      const wasOuter = idx === s.length - 1;
      const nbs = [];
      if (s[idx - 1]) nbs.push({ card: s[idx - 1], buried: true });
      if (s[idx + 1]) nbs.push({ card: s[idx + 1], buried: idx + 1 < s.length - 1 });
      s.splice(idx, 1);
      if (['ram', 'fire', 'attack', 'storm', 'spent'].includes(src)) this.say(`${this.def(card).name} is destroyed!`, 'bad');
      if (card.id === 'storageBay' && !this.has('storageBay') && this.storage.length) {
        this.say(`The Storage Bay's contents are lost: ${this.storage.map((c) => this.def(c).name).join(', ')}.`, 'bad');
        this.storage = [];
      }
      if (!wasOuter && s.length > idx) this.say('The outer layers slide inward to close the gap.', 'muted');
      if (this.combat && !this.combat.over) {
        for (const nb of nbs) {
          if (nb.card.id === 'gasGrenadiers') {
            this.say('Gas Grenadiers rupture: a Gas token drifts onto the enemy.', 'good');
            this.combat.enemy.tokens.gas = true;
          }
          if (nb.card.id === 'cannon' && nb.buried && src === 'ram') {
            this.say('Volatile Casing! The buried Cannon explodes for 1 damage to the enemy.', 'good');
            this.damageEnemy(1, { source: 'explosion' });
          }
        }
      }
      this.clampAll();
    }
    hitOuterLayers(n) {
      for (const side of SIDES) {
        if (this.coreDead()) return;
        if (!this[side].length) { this.say(`Nothing on the ${side} side: the Core is exposed.`, 'bad'); this.damageCore(n, 'storm'); }
        else this.damageCard(this[side][this[side].length - 1].uid, n, 'storm');
      }
    }
    // A hit on one layer of one side. Outside Armor intercepts; buried Armor soaks 1 for its neighbours.
    hitPlayer(side, layerIdx, n, src) {
      const s = this[side];
      if (layerIdx >= s.length) {
        this.say(`Layer ${layerIdx + 1} on the ${side} is empty: the shot hits your Core directly!`, 'bad');
        return this.damageCore(n, src);
      }
      const target = s[layerIdx];
      const outer = s[s.length - 1];
      if (outer !== target && outer.id === 'armor') {
        this.say(`Outer Armor intercepts the hit meant for ${this.def(target).name}.`);
        return this.damageCard(outer.uid, n, src);
      }
      let rest = n;
      if (target.id !== 'armor') {
        const guard = this.neighbors(side, layerIdx).find((c) => c.id === 'armor' && c !== outer);
        if (guard && rest > 0) {
          this.say('Buried Armor absorbs 1 damage.');
          this.damageCard(guard.uid, 1, src);
          rest -= 1;
        }
      }
      if (rest > 0 && !this.coreDead()) this.damageCard(target.uid, rest, src);
      else if (rest <= 0) this.say(`${this.def(target).name} is unharmed.`);
    }
    fireImmune(side, idx) { return this.neighbors(side, idx).some((c) => c.id === 'fireExtinguisher'); }
    gasImmune(side, idx) { return this.neighbors(side, idx).some((c) => c.id === 'hazmat'); }
    placeTokenOnPlayer(token, side, weaponOnly) {
      const s = this[side];
      if (!s.length) {
        if (weaponOnly) return this.say(`No weapon on the ${side} side. The ${D.TOKENS[token].name} token misses.`);
        this.core.tokens[token] = true;
        this.hit('core');
        this.say(`A ${D.TOKENS[token].name} token lands on your Core!`, 'bad');
        if (token === 'fire' && this.combat) this.combat.fireAfflicted = true;
        return;
      }
      const idx = s.length - 1;
      const card = s[idx];
      if (weaponOnly && this.def(card).type !== 'weapon') return this.say(`Your outer ${side} card is not a weapon. The ${D.TOKENS[token].name} token has no effect.`);
      if (token === 'fire' && this.fireImmune(side, idx)) return this.say(`The Fire Extinguisher keeps ${this.def(card).name} from catching fire.`, 'good');
      if (token === 'gas' && this.gasImmune(side, idx)) return this.say(`Hazmat filtration keeps ${this.def(card).name} clear of gas.`, 'good');
      card.tokens[token] = true;
      this.hit(card.uid);
      this.say(`A ${D.TOKENS[token].name} token lands on your ${this.def(card).name}.`, 'bad');
      if (token === 'fire' && this.combat) this.combat.fireAfflicted = true;
    }

    // ---------- combat ----------
    startCombat(enemyId, enc) {
      const e = ENEMIES[enemyId];
      this.event = null;
      this.combat = {
        enc, def: e,
        enemy: { id: e.id, name: e.name, weight: e.weight, dur: e.dur, max: e.dur, tokens: noTokens(), shield: false },
        round: 0, turn: 0, actions: 0, active: null, playerFirst: true, over: false,
        lastRoll: null, lastAbility: null,
        fireAfflicted: this.core.tokens.fire || this.cards().some((c) => c.tokens.fire),
      };
      this.core.cd = 0;
      this.core.charge = 0;
      for (const c of this.cards()) c.cd = 0;
      this.phase = 'combat';
      this.say(`${e.name} engages! Weight ${e.weight}, Durability ${e.dur}.`, 'warn');
      this.nextRound();
    }
    enemyPhase() {
      const en = this.combat.enemy;
      const phases = this.combat.def.phases;
      return phases.find((p) => en.dur >= p.min) || phases[phases.length - 1];
    }
    nextRound() {
      const c = this.combat;
      c.round++;
      const pw = this.weight();
      c.playerFirst = pw <= c.enemy.weight;
      this.say(`Round ${c.round}. Weight ${fmt(pw)} vs ${fmt(c.enemy.weight)}: ${c.playerFirst ? 'you act first' : 'the enemy acts first'}.`, 'sys');
      if (c.playerFirst) this.beginPlayerTurn();
      else {
        this.enemyTurn();
        if (!this.checkEnd()) this.beginPlayerTurn();
      }
    }
    beginPlayerTurn() {
      const c = this.combat;
      c.active = 'player';
      c.turn++;
      const burning = [this.core, ...this.cards()].filter((x) => x.tokens.fire);
      for (const b of burning) {
        if (this.coreDead()) break;
        c.fireAfflicted = true;
        this.say(`Fire burns your ${b === this.core ? 'Core' : this.def(b).name}.`, 'bad');
        this.damageCard(b.uid, 1, 'fire');
      }
      if (this.checkEnd()) return;
      c.actions = this.actionsPerTurn();
      for (const x of this.cards()) if (x.cd > 0) x.cd--;
      if (this.core.cd > 0) this.core.cd--;
      this.core.charge++;
    }
    endTurn() {
      const c = this.combat;
      if (this.phase !== 'combat' || c.active !== 'player') return;
      if (c.playerFirst) {
        this.enemyTurn();
        if (this.checkEnd()) return;
      }
      this.nextRound();
    }
    enemyTurn() {
      const c = this.combat;
      const en = c.enemy;
      c.active = 'enemy';
      if (en.tokens.fire) {
        this.say(`Fire burns the ${en.name}.`, 'good');
        this.damageEnemy(1, { source: 'fire', unblockable: true });
        if (this.checkEnd()) return;
      }
      const phase = this.enemyPhase();
      const r = this.d4();
      const ab = phase.table[r - 1];
      c.lastRoll = r;
      c.lastAbility = { phase: phase.name, roll: r };
      this.say(`${en.name} rolls ${r} (${phase.name}): ${ab.name}.`, 'enemy');
      this.resolveEnemyAbility(ab);
    }
    rollTarget() {
      const side = this.coin() ? 'left' : 'right';
      const layer = this.d4();
      this.say(`Targeting: coin ${side === 'left' ? 'Heads → Left' : 'Tails → Right'}, d4 ${layer}${layer === 4 ? ' → miss' : ` → layer ${layer}`}.`, 'dice');
      return { side, layer };
    }
    resolveEnemyAbility(ab) {
      const en = this.combat.enemy;
      if (ab.kind === 'shield') { en.shield = true; this.say(`${en.name} raises its armor.`); return; }
      if (ab.kind === 'repair') {
        const before = en.dur;
        en.dur = Math.min(en.max, en.dur + ab.amount);
        this.say(`${en.name} repairs ${en.dur - before} Durability.`);
        return;
      }
      if (ab.kind === 'token') {
        const side = this.coin() ? 'left' : 'right';
        this.say(`Coin: ${side === 'left' ? 'Heads → Left' : 'Tails → Right'}.`, 'dice');
        this.placeTokenOnPlayer(ab.token, side, ab.target === 'outerWeapon');
        return;
      }
      // attack or ram
      if (ab.kind === 'ram') {
        this.say(`${en.name} rams you and takes ${ab.self} damage itself.`);
        en.dur -= ab.self;
        this.combat.flashEnemy = true;
      }
      if (en.tokens.gas) {
        const heads = this.coin();
        this.say(`Gas: coin ${heads ? 'Heads, it lands' : 'Tails, it goes wide'}.`, 'dice');
        if (!heads) return;
      }
      const dmg = Math.max(0, ab.dmg - (en.tokens.glue ? 1 : 0));
      if (en.tokens.glue) this.say('Glue clogs its weapons: -1 damage.');
      if (dmg <= 0) return this.say('The attack does no damage.');
      const src = ab.kind === 'ram' ? 'ram' : 'attack';
      if (ab.target === 'outer') {
        const side = this.coin() ? 'left' : 'right';
        this.say(`Coin: ${side === 'left' ? 'Heads → Left' : 'Tails → Right'}. It targets your outermost card.`, 'dice');
        const s = this[side];
        if (!s.length) { this.say(`Your ${side} side is bare.`, 'bad'); this.damageCore(dmg, src); }
        else this.damageCard(s[s.length - 1].uid, dmg, src);
        return;
      }
      const { side, layer } = this.rollTarget();
      if (layer === 4) return this.say('The shot misses.', 'good');
      this.hitPlayer(side, layer - 1, dmg, src);
    }
    damageEnemy(n, opts = {}) {
      const en = this.combat.enemy;
      if (n <= 0) return;
      if (en.shield && !opts.unblockable && !opts.pierce) {
        en.shield = false;
        this.say(`The ${en.name}'s armor blocks ${n} damage.`, 'warn');
        return;
      }
      if (en.shield && opts.pierce) this.say('The shot pierces its armor!', 'good');
      en.dur -= n;
      this.stats.dmgDealt += n;
      this.combat.flashEnemy = true;
      this.say(`${en.name} takes ${n} damage (${Math.max(0, en.dur)}/${en.max}).`, 'good');
    }
    // Returns true once the fight is decided (and moves the run on).
    checkEnd() {
      const c = this.combat;
      if (!c || c.over) return true;
      if (this.coreDead()) { if (this.phase !== 'gameover') this.gameOver('combat'); return true; }
      if (c.enemy.dur <= 0) { this.winCombat(); return true; }
      return false;
    }
    gameOver() {
      if (this.combat) this.combat.over = true;
      this.phase = 'gameover';
      this.say('Your Core breaks apart. The run is over.', 'bad');
    }
    winCombat() {
      const c = this.combat;
      c.over = true;
      this.stats.kills++;
      this.say(`The ${c.enemy.name} goes down!`, 'good');
      for (const x of [this.core, ...this.cards()]) { x.tokens = noTokens(); x.cd = 0; }
      for (const b of this.cards().filter((x) => x.id === 'repairBay')) {
        const cap = Math.min(3, this.maxDur(b));
        if (b.dur < cap) { b.dur += 1; this.say('Repair Bay patches itself (+1).'); }
      }
      if (c.enemy.max > 10) this.questEvent('bigKill');
      if (c.fireAfflicted) this.questEvent('fireWin');
      if (c.def.boss) {
        this.won = true;
        this.phase = 'victory';
        this.say('The Iron Leviathan sinks beneath the clouds. You win!', 'good');
        return;
      }
      const hatch = this.has('supplyHatch');
      const ids = [this.randomPart()];
      if (hatch) ids.push(this.randomPart());
      const keep = hatch && this.has('storageBay') ? 2 : 1;
      this.swapAvailable = this.has('storageBay') && this.storage.length > 0;
      this.openLoot('Victory spoils', { ids, keep }, []);
    }

    // ---------- player combat actions ----------
    canAct() { return this.phase === 'combat' && this.combat.active === 'player' && this.combat.actions > 0 && !this.combat.over; }
    // Describes what firing the outer card of a side would do, for the UI and the tests.
    weaponInfo(side) {
      const s = this[side];
      const idx = s.length - 1;
      const card = s[idx];
      if (!card || this.def(card).type !== 'weapon') return null;
      const d = this.def(card);
      const battery = s[idx - 1] && s[idx - 1].id === 'harpoon' ? 1 : 0;
      const glue = card.tokens.glue ? 1 : 0;
      let summary;
      if (d.token) summary = `${D.TOKENS[d.token].name} token`;
      else if (card.id === 'cannon') summary = `Coin: ${Math.max(0, 3 + battery - glue)} or miss`;
      else if (card.id === 'sniper') summary = `Coin: ${Math.max(0, 2 + battery - glue)} piercing or ${Math.max(0, 1 + battery - glue)}`;
      else summary = `${Math.max(0, d.dmg + battery - glue)} damage`;
      const costs = d.costsDur || this.strict;
      const payer = costs ? (s[idx - 1] && s[idx - 1].id === 'barracks' ? s[idx - 1] : card) : null;
      const gassed = card.tokens.gas && !this.gasImmune(side, idx);
      let blocked = null;
      if (card.cd > 0) blocked = 'Cooling down';
      return { card, side, idx, summary, battery, glue, payer, gassed, blocked };
    }
    fire(side) {
      if (!this.canAct()) return false;
      const w = this.weaponInfo(side);
      if (!w || w.blocked) return false;
      const { card, idx } = w;
      const d = this.def(card);
      this.combat.actions--;
      this.say(`You fire the ${sideLabel(side).toLowerCase()} ${d.name}.`, 'you');
      let miss = false;
      if (w.gassed) {
        const heads = this.coin();
        this.say(`Gas: coin ${heads ? 'Heads, clean shot' : 'Tails, the shot goes wide'}.`, 'dice');
        miss = !heads;
      }
      if (!miss) {
        if (d.token) {
          this.combat.enemy.tokens[d.token] = true;
          this.say(`A ${D.TOKENS[d.token].name} token sticks to the ${this.combat.enemy.name}.`, 'good');
        } else {
          let base = d.dmg, pierce = false;
          if (card.id === 'cannon') {
            const heads = this.coin();
            this.say(`Wild Shot: coin ${heads ? 'Heads' : 'Tails, miss'}.`, 'dice');
            if (!heads) base = 0;
          } else if (card.id === 'sniper') {
            const heads = this.coin();
            this.say(`Crit: coin ${heads ? 'Heads, armor-piercing hit' : 'Tails, standard shot'}.`, 'dice');
            if (heads) { base = 2; pierce = true; }
          }
          if (base > 0) {
            if (w.battery) this.say('Harpoon Battery: +1 damage.');
            if (w.glue) this.say('Glue: -1 damage.');
            this.damageEnemy(Math.max(0, base + w.battery - w.glue), { pierce });
          }
        }
        if (card.id === 'artillery') {
          const sight = this[side][idx - 1] && this[side][idx - 1].id === 'telescope';
          if (sight) this.say('Telescope sight: no cooldown.');
          else card.cd = 2; // blocks the next turn, clears the one after
        }
      }
      if (w.payer) {
        if (w.payer !== card) this.say('The Barracks crew mans the gun and pays the Durability.');
        this.spend(w.payer.uid);
      }
      this.checkEnd();
      return true;
    }
    coreAbilityInfo() {
      const c = CORES[this.core.id].ability;
      let blocked = null;
      if (c.id === 'heavyCannon' && this.core.cd > 0) blocked = `Ready in ${this.core.cd} turn${this.core.cd > 1 ? 's' : ''}`;
      if (c.id === 'bomber' && this.core.charge < c.charge) blocked = `Charging ${this.core.charge}/${c.charge}`;
      return { ability: c, blocked };
    }
    useCore() {
      if (!this.canAct()) return false;
      const { ability, blocked } = this.coreAbilityInfo();
      if (blocked) return false;
      this.combat.actions--;
      this.say(`Core ability: ${ability.name}!`, 'you');
      if (ability.id === 'ram') {
        this.damageEnemy(3);
        this.core.dur -= 1;
        this.hit('core');
        this.say(`The impact costs your Core 1 Durability (${Math.max(0, this.core.dur)}/${this.core.max}).`, 'bad');
      } else if (ability.id === 'heavyCannon') {
        this.damageEnemy(3);
        this.core.cd = ability.cooldown + 1;
      } else if (ability.id === 'bomber') {
        this.damageEnemy(5);
        this.core.charge = 0;
      }
      this.checkEnd();
      return true;
    }
    // Support cards with an active: which cards they can be used on right now.
    supportTargets(uid) {
      const loc = this.locate(uid);
      if (!loc || loc.card === this.core) return [];
      const d = this.def(loc.card);
      if (d.active === 'repair') {
        const t = this.cards().filter((c) => c !== loc.card && c.dur < this.maxDur(c)).map((c) => c.uid);
        if (loc.idx === 0 && this.core.dur < this.core.max) t.unshift('core');
        return t;
      }
      if (d.active) return [this.core, ...this.cards()].filter((c) => c.tokens[d.active]).map((c) => c.uid);
      return [];
    }
    canUseSupport(uid) {
      const loc = this.locate(uid);
      if (!loc || loc.card === this.core || !this.def(loc.card).active) return false;
      if (this.phase === 'combat') return this.canAct();
      // Out of combat only the Repair Bay is useful (tokens are cleared after combat).
      return this.phase === 'map' && this.def(loc.card).active === 'repair';
    }
    useSupport(uid, targetUid) {
      if (!this.canUseSupport(uid) || !this.supportTargets(uid).includes(targetUid)) return false;
      const card = this.locate(uid).card;
      const d = this.def(card);
      const target = this.locate(targetUid).card;
      const tName = target === this.core ? 'Core' : this.def(target).name;
      if (this.phase === 'combat') this.combat.actions--;
      if (d.active === 'repair') {
        target.dur += 1;
        this.say(`Repair Bay moves 1 Durability to your ${tName}.`, 'you');
      } else {
        target.tokens[d.active] = false;
        this.say(`${d.name} clears the ${D.TOKENS[d.active].name} token from your ${tName}.`, 'you');
      }
      this.hit(targetUid);
      this.spend(uid);
      if (this.phase === 'combat') this.checkEnd();
      return true;
    }
  }

  function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

  return { Game, mulberry32, fmt, MAX_LAYERS, SIDES };
});
