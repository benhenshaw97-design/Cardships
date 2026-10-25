// Cardships rules engine. Holds the whole run state and exposes one method per player decision.
// No DOM access: the UI reads the state, calls these methods, and plays back `events` as animation.
// Every random number comes from one seeded generator whose state is saved with the run.
(function (root, factory) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const api = factory(isNode ? require('./data.js') : root.CardshipsData);
  if (isNode) module.exports = api;
  else root.CardshipsEngine = api;
})(this, function (D) {
  const { CORES, PARTS, RARITY_ODDS, ENEMIES, ENCOUNTERS, ENCOUNTER_WEIGHTS, QUESTS, TOKENS, LAYER_TABLE } = D;

  const MAX_LAYERS = 3;
  const MAX_PATHS = 3;
  const STORAGE_SLOTS = 2;
  const MAX_PRESSURE = 9;
  const VENT_COST = 2;
  const ENRAGE_ROUND = 10;
  const SIDES = ['left', 'right'];
  const ARMOR = { plating: { soak: 1, reduce: 0 }, bulwark: { soak: 2, reduce: 1 } };

  function noTokens() { return { fire: false, glue: false, gas: false }; }
  function cap(s) { return s[0].toUpperCase() + s.slice(1); }
  function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

  class Game {
    constructor(opts = {}) {
      this.seed = opts.seed != null ? opts.seed >>> 0 : (Math.floor(Math.random() * 2 ** 32) >>> 0);
      this.rngState = this.seed;
      this.maxDepth = opts.maxDepth || 10;
      this.unlocked = opts.unlocked || null; // null = every part available
      this.nextUid = 1;
      this.log = [];
      this.logId = 0;
      this.events = [];
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
      this.combatBonusSteam = 0;

      this.combat = null;
      this.event = null;
      this.hangar = null;
      this.lootTitle = '';
      this.lootOffers = [];
      this.pendingLoot = [];
      this.swapAvailable = false;
      this.pendingChoice = null;
      this.won = false;
      this.stats = { encounters: 0, kills: 0, dmgDealt: 0, dmgTaken: 0, parts: 0, quests: 0 };
    }

    // ---------- save / load ----------
    toJSON() {
      const out = {};
      for (const [k, v] of Object.entries(this)) if (k !== 'events' && k !== 'flashes') out[k] = v;
      return out;
    }
    static fromJSON(obj) {
      const g = new Game({ seed: obj.seed });
      Object.assign(g, JSON.parse(JSON.stringify(obj)));
      g.events = [];
      g.flashes = new Set();
      return g;
    }

    // ---------- dice & log ----------
    rand() {
      let a = (this.rngState = (this.rngState + 0x6d2b79f5) >>> 0);
      a = Math.imul(a ^ (a >>> 15), a | 1);
      a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
      return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
    }
    d6(label) {
      const v = 1 + Math.floor(this.rand() * 6);
      if (label) this.emit('roll', { value: v, label });
      return v;
    }
    pick(arr) { return arr[Math.floor(this.rand() * arr.length)]; }
    weighted(weights) {
      const entries = Object.entries(weights).filter(([, w]) => w > 0);
      let r = this.rand() * entries.reduce((s, [, w]) => s + w, 0);
      for (const [k, w] of entries) if ((r -= w) < 0) return k;
      return entries[entries.length - 1][0];
    }
    say(text, cls = '') { this.log.push({ id: ++this.logId, text, cls }); }
    emit(type, data = {}) { this.events.push({ type, ...data }); }
    hit(uid) { this.flashes.add(uid); }

    // ---------- parts & ship queries ----------
    available(id) { return !this.unlocked || this.unlocked.includes(id) || PARTS[id].rarity !== 'rare'; }
    randomPart(tier = 'normal', filter = null) {
      const rarity = this.weighted(RARITY_ODDS[tier]);
      let pool = Object.keys(PARTS).filter((id) => PARTS[id].rarity === rarity && this.available(id) && (!filter || filter(PARTS[id])));
      if (!pool.length) pool = Object.keys(PARTS).filter((id) => this.available(id) && (!filter || filter(PARTS[id])));
      return this.pick(pool);
    }
    partOffer(n, tier = 'normal', filter = null) {
      const ids = [];
      let guard = 0;
      while (ids.length < n && guard++ < 60) {
        const id = this.randomPart(tier, filter);
        if (!ids.includes(id) || guard > 40) ids.push(id);
      }
      return ids;
    }
    makeCard(id) {
      return { uid: 'p' + this.nextUid++, id, hp: PARTS[id].hp, bonusMax: 0, tokens: noTokens(), fired: 0, reload: 0 };
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
    outer(side) { return this[side][this[side].length - 1] || null; }
    neighbors(side, idx) { const s = this[side]; return [s[idx - 1], s[idx + 1]].filter(Boolean); }
    touching(uid, id) { const l = this.locate(uid); return !!l && l.side && this.neighbors(l.side, l.idx).some((c) => c.id === id); }
    nameOf(card) { return card === this.core ? 'Core' : this.def(card).name; }
    maxHp(card) {
      if (card === this.core) return this.core.baseMax + this.core.bonusMax + (this.heartOnCore() ? 3 : 0);
      let m = this.def(card).hp + card.bonusMax;
      if (card.id === 'plating' && this.touching(card.uid, 'gatling')) m += 1;
      return m;
    }
    heartOnCore() { return SIDES.some((s) => this[s][0] && this[s][0].id === 'heart'); }
    clampAll() {
      for (const c of this.cards()) c.hp = Math.min(c.hp, this.maxHp(c));
      if (this.core) this.core.hp = Math.min(this.core.hp, this.maxHp(this.core));
    }
    storageCap() { return this.has('cargo') ? STORAGE_SLOTS : 0; }
    weight() {
      let w = this.core ? this.core.weight : 0;
      for (const c of this.cards()) w += this.def(c).weight;
      if (this.has('cargo')) w += this.storage.length;
      return w;
    }
    steamCap() {
      let s = CORES[this.core.id].steam;
      for (const c of this.cards()) s += this.def(c).steam || 0;
      return s;
    }
    sight() {
      return SIDES.some((s) => { const o = this.outer(s); return o && o.id === 'telescope'; }) ? 1 : 0;
    }
    pathCount() { return Math.max(1, Math.min(MAX_PATHS, this.nextPaths + this.sight() + this.pathBonus)); }
    isWeapon(card) { return this.def(card).type === 'weapon'; }
    weaponsInstalled() { return this.cards().filter((c) => this.isWeapon(c)).length; }

    // ---------- run setup ----------
    chooseCore(id) {
      if (this.phase !== 'coreSelect') return;
      const c = CORES[id];
      this.core = { uid: 'core', id, name: c.name, weight: c.weight, hp: c.hp, baseMax: c.hp, bonusMax: 0, tokens: noTokens(), pressure: 0 };
      this.left = c.start.left.map((p) => this.makeCard(p));
      this.right = c.start.right.map((p) => this.makeCard(p));
      this.say(`${c.name} selected. Starting modules: ${[...c.start.left, ...c.start.right].map((p) => PARTS[p].name).join(', ')}.`, 'sys');
      this.openLoot('Starter draft', { ids: this.partOffer(3, 'normal', (p) => p.rarity === 'common'), keep: 1 }, []);
    }

    // ---------- loot ----------
    get lootOffer() { return this.lootOffers[0] || null; }
    queueOffer(offer) {
      if (!offer || !offer.ids.length) return;
      if (offer.keep >= offer.ids.length) this.pendingLoot.push(...offer.ids);
      else this.lootOffers.push(offer);
    }
    openLoot(title, offer, parts) {
      this.lootTitle = title;
      this.queueOffer(offer);
      this.pendingLoot.push(...parts);
      this.phase = 'loot';
    }
    pickOffer(i) {
      const o = this.lootOffer;
      if (!o) return false;
      const id = o.ids.splice(i, 1)[0];
      if (!id) return false;
      this.pendingLoot.push(id);
      o.keep -= 1;
      if (o.keep <= 0 || !o.ids.length) this.lootOffers.shift();
      return true;
    }
    skipOffer() {
      if (!this.lootOffer) return false;
      this.say('You leave the rest of the salvage.', 'muted');
      this.lootOffers.shift();
      return true;
    }
    canInstall(side, pos) { return this[side].length < MAX_LAYERS && pos >= 0 && pos <= this[side].length; }
    installPending(side, pos) {
      if (!this.pendingLoot.length || !this.canInstall(side, pos)) return false;
      const id = this.pendingLoot.shift();
      const card = this.makeCard(id);
      this[side].splice(pos, 0, card);
      this.clampAll();
      this.stats.parts++;
      this.emit('install', { uid: card.uid, side, idx: pos });
      this.say(`Bolted ${PARTS[id].name} onto the ${side} side, layer ${pos + 1}.`);
      if (id === 'cargo') this.questEvent('installCargo');
      return true;
    }
    storePending() {
      if (!this.pendingLoot.length || this.storage.length >= this.storageCap()) return false;
      const id = this.pendingLoot.shift();
      this.storage.push(this.makeCard(id));
      this.say(`Stowed ${PARTS[id].name} in the Cargo Hold.`);
      return true;
    }
    jettisonPending() {
      if (!this.pendingLoot.length) return false;
      this.say(`Jettisoned ${PARTS[this.pendingLoot.shift()].name}.`, 'muted');
      return true;
    }
    scrap(uid) {
      if (!['loot', 'hangar'].includes(this.phase)) return false;
      const loc = this.locate(uid);
      if (!loc || loc.card === this.core) return false;
      this.say(`Scrapped ${this.def(loc.card).name}.`, 'muted');
      this.removeCard(loc.side, loc.idx, 'scrap');
      return true;
    }
    discardStored(i) {
      const c = this.storage.splice(i, 1)[0];
      if (c) this.say(`Dumped ${this.def(c).name} from the hold.`, 'muted');
      return !!c;
    }
    quickSwap(uid, storeIdx) {
      if (!this.swapAvailable) return false;
      const loc = this.locate(uid);
      const stored = this.storage[storeIdx];
      if (!loc || loc.card === this.core || !stored) return false;
      if (loc.card.id === 'cargo' && this.count('cargo') === 1) return false;
      this[loc.side][loc.idx] = stored;
      this.storage[storeIdx] = loc.card;
      this.swapAvailable = false;
      this.clampAll();
      this.emit('install', { uid: stored.uid, side: loc.side, idx: loc.idx });
      this.say(`Quick Swap: ${this.def(stored).name} in, ${this.def(loc.card).name} to the hold.`);
      if (stored.id === 'cargo') this.questEvent('installCargo');
      return true;
    }
    finishLoot() {
      if (this.phase !== 'loot' || this.lootOffer || this.pendingLoot.length || this.pendingChoice) return false;
      this.swapAvailable = false;
      this.enterMap();
      return true;
    }

    // Rewards that need a target module.
    offerChoice(kind, prompt, eligible) {
      if (!eligible.length) { this.say('No eligible module, so that reward is lost.', 'muted'); return; }
      this.pendingChoice = { kind, prompt, eligible };
    }
    resolveChoice(uid) {
      const pc = this.pendingChoice;
      if (!pc || !pc.eligible.includes(uid)) return false;
      const card = this.locate(uid).card;
      const name = this.nameOf(card);
      if (pc.kind === 'maintain') { card.hp = this.maxHp(card); this.say(`${name} fully repaired.`, 'good'); }
      if (pc.kind === 'reinforce') { card.bonusMax += 1; card.hp += 1; this.say(`${name} reinforced: +1 max Durability.`, 'good'); }
      if (pc.kind === 'master') { card.bonusMax += 1; card.hp = this.maxHp(card); this.say(`${name} reinforced and fully repaired.`, 'good'); }
      if (pc.kind === 'ironclad') { card.bonusMax += 2; card.hp += 2; this.say(`${name} gains +2 max Durability.`, 'good'); }
      this.emit('heal', { uid, amount: 1 });
      this.hit(uid);
      this.pendingChoice = null;
      return true;
    }

    // ---------- route ----------
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
      if (this.phase !== 'map' || !this.choices[i]) return false;
      this.startEncounter(this.choices[i]);
      return true;
    }
    startEncounter(encId) {
      const enc = ENCOUNTERS[encId];
      this.depth++;
      this.stats.encounters++;
      this.nextPaths = enc.paths;
      this.say(`— ${enc.name} —`, 'head');
      if (enc.kind === 'Combat' || enc.kind === 'Boss') return this.startCombat(enc.enemy, enc);
      if (enc.kind === 'Sky Dock') return this.enterHangar(enc);
      this.event = { enc: encId, rolls: [], options: null, stage: null, logStart: this.logId, next: null, hpBefore: this.totalHp() };
      this.phase = 'event';
      if (encId === 'storm') this.runStorm();
      else if (encId === 'beacon') this.runBeacon();
      else if (encId === 'trader') this.runTrader();
      else if (encId === 'guild') this.runGuild();
    }
    totalHp() { return this.core.hp + this.cards().reduce((s, c) => s + c.hp, 0); }
    setOptions(stage, options) { this.event.stage = stage; this.event.options = options; }
    randomSide(label) { return this.d6(label || 'Side') <= 3 ? 'left' : 'right'; }

    // ---------- events ----------
    runStorm() {
      const r = this.d6('Storm Front');
      this.event.rolls.push(r);
      if (r === 1) {
        const side = this.randomSide();
        this.say(`Rolled 1: lightning forks into your ${side} side!`, 'bad');
        this.applyPlan(this.planHit(side, 'outer', 2), 'storm');
      } else if (r === 2) {
        if (this.weight() >= 6) this.say(`Rolled 2: a crosswind howls, but your ${fmt(this.weight())}-Weight hull holds steady.`, 'good');
        else {
          this.say('Rolled 2: a crosswind batters both ends of the ship.', 'bad');
          for (const side of SIDES) if (!this.coreDead()) this.applyPlan(this.planHit(side, 'outer', 1), 'storm');
        }
      } else if (r === 3) {
        this.say('Rolled 3: a downdraft drags you toward the clouds below. Lighten the ship or brace.', 'warn');
        const opts = SIDES.filter((s) => this.outer(s)).map((s) => ({ id: 'drop-' + s, label: `Jettison ${this.def(this.outer(s)).name}`, desc: `Lose your outermost ${s} module.` }));
        opts.push({ id: 'brace', label: 'Brace for it', desc: 'Your Core takes 2 damage.' });
        this.setOptions('downdraft', opts);
      } else if (r === 4) {
        this.say('Rolled 4: the eye of the storm. A moment of calm.', 'good');
        this.setOptions('eye', [
          { id: 'core', label: 'Patch the Core', desc: 'Repair 3 Core Durability.' },
          { id: 'all', label: 'Tighten every bolt', desc: 'Repair 1 on every module.' },
          { id: 'scavenge', label: 'Scavenge the debris', desc: 'Gain a random part.' },
        ]);
      } else if (r === 5) {
        this.say('Rolled 5: wreckage drifts past in the gale.', 'good');
        this.event.loot = { ids: this.partOffer(2), keep: 1 };
      } else {
        this.say('Rolled 6: a roaring tailwind. +1 route choice next time and +2 Steam on your next first turn.', 'good');
        this.pathBonus += 1;
        this.combatBonusSteam += 2;
      }
      this.finishStormCheck();
    }
    finishStormCheck() {
      if (this.event && !this.event.options && this.totalHp() >= this.event.hpBefore) this.questEvent('cleanStorm');
    }
    runBeacon() {
      const r = this.d6('Distress Beacon');
      this.event.rolls.push(r);
      this.event.next = 'skiff';
      this.event.mods = {};
      if (r === 1) {
        const side = this.randomSide();
        this.say(`Rolled 1: debris from the wreck slams your ${side} side.`, 'bad');
        this.applyPlan(this.planHit(side, 'outer', 2), 'storm');
      } else if (r === 2) {
        const side = this.randomSide();
        this.say(`Rolled 2: burning wreckage sets your ${side} side alight.`, 'bad');
        this.placeToken('fire', side, 'outer');
      } else if (r === 3) {
        const weapons = this.cards().filter((c) => this.isWeapon(c));
        const target = weapons.length ? this.pick(weapons) : this.cards()[0];
        if (target) { const l = this.locate(target.uid); this.say('Rolled 3: a gas leak fouls one of your modules.', 'bad'); this.placeToken('gas', l.side, l.idx); }
        else this.say('Rolled 3: a gas leak, but nothing to foul.');
      } else if (r === 4) {
        this.say('Rolled 4: it was bait. The Skiff starts behind 4 Block.', 'warn');
        this.event.mods.block = 4;
      } else if (r === 5) {
        this.say('Rolled 5: you spot the trap. +2 Steam on your first turn.', 'good');
        this.combatBonusSteam += 2;
      } else {
        this.say('Rolled 6: you strip the wreck before the pirates arrive.', 'good');
        this.event.loot = { ids: this.partOffer(2), keep: 1 };
      }
      if (!this.coreDead()) this.say('A Scavenger Skiff drops out of the clouds!', 'warn');
    }
    runTrader() {
      this.say('The merchant offers three deals. You can take one.');
      this.setOptions('trader', [
        { id: 'buy', label: 'Buy a part', desc: 'Pick 1 of 3 parts.' },
        { id: 'repair', label: 'Full repair', desc: 'Restore every module and your Core.' },
        { id: 'refit', label: 'Trade in a module', desc: 'Give up a module for a pick of 3 better parts.' },
      ]);
    }
    runGuild() {
      const a = this.d6('Contract A');
      let b = this.d6('Contract B');
      if (b === a) b = (b % 6) + 1;
      this.event.rolls.push(a, b);
      const qa = QUESTS[a - 1], qb = QUESTS[b - 1];
      this.say(`Rolled ${a} and ${b}: ${qa.name} or ${qb.name}.`);
      const opts = [qa, qb].map((q) => ({ id: q.id, label: `Sign: ${q.name}`, desc: `${q.goal} Reward: ${q.reward}` }));
      opts.push({ id: 'none', label: this.quest ? 'Keep your current contract' : 'Sign nothing', desc: this.quest ? QUESTS.find((q) => q.id === this.quest).name : 'Leave empty-handed.' });
      this.setOptions('guild', opts);
    }
    chooseOption(id) {
      const ev = this.event;
      if (this.phase !== 'event' || !ev || !ev.options || !ev.options.some((o) => o.id === id)) return false;
      const stage = ev.stage;
      ev.options = null;
      ev.stage = null;
      if (stage === 'downdraft') {
        if (id === 'brace') { this.say('You brace. The Core groans.', 'bad'); this.damageCore(2, 'storm'); }
        else { const side = id.slice(5); const s = this[side]; this.say(`You cut the ${this.def(s[s.length - 1]).name} loose and climb clear.`, 'warn'); this.removeCard(side, s.length - 1, 'jettison'); }
        this.finishStormCheck();
      } else if (stage === 'eye') {
        if (id === 'core') this.healCore(3);
        if (id === 'all') for (const c of this.cards()) this.healCard(c, 1);
        if (id === 'scavenge') { const p = this.randomPart(); this.pendingLoot.push(p); this.say(`You fish a ${PARTS[p].name} out of the debris.`, 'good'); }
        this.finishStormCheck();
      } else if (stage === 'trader') {
        if (id === 'buy') ev.loot = { ids: this.partOffer(3), keep: 1 };
        if (id === 'repair') { this.healCore(99); for (const c of this.cards()) this.healCard(c, 99); this.say('The merchant\'s mechanics restore everything.', 'good'); }
        if (id === 'refit') {
          if (!this.cards().length) { this.say('You have nothing to trade.', 'muted'); return true; }
          this.setOptions('refit', this.cards().map((c) => ({ id: c.uid, label: `Trade ${this.def(c).name}`, desc: `${PARTS[c.id].rarity} ${this.def(c).type}` })));
        }
      } else if (stage === 'refit') {
        const loc = this.locate(id);
        this.say(`You hand over the ${this.def(loc.card).name}.`);
        this.removeCard(loc.side, loc.idx, 'trade');
        ev.loot = { ids: this.partOffer(3, 'elite'), keep: 1 };
      } else if (stage === 'guild') {
        if (id !== 'none') {
          if (this.quest) this.say(`You tear up ${QUESTS.find((q) => q.id === this.quest).name}.`, 'muted');
          this.quest = id;
          const q = QUESTS.find((x) => x.id === id);
          this.say(`Signed ${q.name}: ${q.goal}`, 'good');
          if (id === 'hoarder' && this.has('cargo')) this.say('You already carry a Cargo Hold: install another to complete it.', 'muted');
        }
      }
      return true;
    }
    continueEvent() {
      const ev = this.event;
      if (this.phase !== 'event' || !ev || ev.options || this.pendingChoice) return false;
      this.event = null;
      if (ev.next) {
        const mods = ev.mods || {};
        this.startCombat(ev.next, ENCOUNTERS.beacon, { block: mods.block || 0, loot: ev.loot || null });
        return true;
      }
      if (ev.loot) this.openLoot(ENCOUNTERS[ev.enc].name, ev.loot, []);
      else this.afterEncounter(ENCOUNTERS[ev.enc].name);
      return true;
    }
    afterEncounter(title) {
      if (this.phase === 'gameover') return;
      if (this.pendingLoot.length || this.lootOffer || this.swapAvailable || this.pendingChoice) this.openLoot(title, this.lootOffer, []);
      else this.enterMap();
    }

    // ---------- Sky Dock ----------
    enterHangar(enc) {
      this.hangar = { enc: enc.id, dock: [], roll: null };
      this.phase = 'hangar';
      this.say('Full reassembly: detach and reattach any module.');
    }
    detach(uid) {
      if (this.phase !== 'hangar') return false;
      const loc = this.locate(uid);
      if (!loc || loc.card === this.core) return false;
      this[loc.side].splice(loc.idx, 1);
      this.hangar.dock.push(loc.card);
      this.clampAll();
      return true;
    }
    attach(dockIdx, side, pos) {
      if (this.phase !== 'hangar' || !this.canInstall(side, pos)) return false;
      const card = this.hangar.dock.splice(dockIdx, 1)[0];
      if (!card) return false;
      this[side].splice(pos, 0, card);
      this.clampAll();
      this.emit('install', { uid: card.uid, side, idx: pos });
      return true;
    }
    salvage() {
      if (this.phase !== 'hangar' || this.hangar.roll) return false;
      const r = this.d6('Mechanics');
      this.hangar.roll = r;
      const all = this.cards().map((c) => c.uid);
      if (r === 1) { this.say('Rolled 1: Core Patch.', 'good'); this.healCore(3); }
      if (r === 2) { this.say('Rolled 2: Part Maintenance. Choose a module to fully repair.', 'good'); this.offerChoice('maintain', 'Choose a module to fully repair', this.cards().filter((c) => c.hp < this.maxHp(c)).map((c) => c.uid)); }
      if (r === 3) { this.say('Rolled 3: Reinforcement. Choose a module for +1 max Durability.', 'good'); this.offerChoice('reinforce', 'Choose a module to reinforce', all); }
      if (r === 4) { this.say('Rolled 4: Overhaul. Every module repairs 2.', 'good'); for (const c of this.cards()) this.healCard(c, 2); }
      if (r === 5) { this.say('Rolled 5: a spare part from the racks.', 'good'); this.hangar.loot = { ids: this.partOffer(2), keep: 1 }; }
      if (r === 6) { this.say('Rolled 6: the Master Mechanic. Choose a module to reinforce and fully repair.', 'good'); this.offerChoice('master', 'Choose a module for the Master Mechanic', all); }
      return true;
    }
    leaveHangar() {
      if (this.phase !== 'hangar' || !this.hangar.roll || this.pendingChoice) return false;
      for (const c of this.hangar.dock) {
        if (this.storage.length < this.storageCap()) { this.storage.push(c); this.say(`Stowed ${this.def(c).name}.`); }
        else this.say(`Left ${this.def(c).name} on the dock.`, 'muted');
      }
      if (!this.has('cargo') && this.storage.length) { this.say('No Cargo Hold installed: stored parts are lost.', 'bad'); this.storage = []; }
      const loot = this.hangar.loot;
      this.hangar = null;
      this.clampAll();
      if (loot) this.openLoot('Sky Dock', loot, []);
      else this.enterMap();
      return true;
    }

    // ---------- contracts ----------
    questEvent(ev) {
      const q = this.quest;
      if (!q) return;
      const done =
        (q === 'survivor' && ev === 'cleanStorm') ||
        (q === 'hoarder' && ev === 'installCargo') ||
        (q === 'bounty' && ev === 'bigKill') ||
        (q === 'ironclad' && ev === 'fireWin') ||
        (q === 'marksman' && ev === 'quickWin') ||
        (q === 'rammer' && ev === 'ramKill');
      if (!done) return;
      const quest = QUESTS.find((x) => x.id === q);
      this.quest = null;
      this.stats.quests++;
      this.emit('quest', { id: q });
      this.say(`Contract complete: ${quest.name}! ${quest.reward}`, 'good');
      if (q === 'bounty') this.queueOffer({ ids: this.partOffer(3, 'normal', (p) => p.rarity === 'rare'), keep: 1 });
      if (q === 'survivor') { this.pendingLoot.push('plating'); this.healCore(99); for (const c of this.cards()) this.healCard(c, 99); }
      if (q === 'hoarder') this.pendingLoot.push('hatch');
      if (q === 'ironclad') this.offerChoice('ironclad', 'Choose a module for +2 max Durability', this.cards().map((c) => c.uid));
      if (q === 'marksman') this.queueOffer({ ids: this.partOffer(3, 'normal', (p) => p.type === 'weapon' && p.rarity === 'uncommon'), keep: 1 });
      if (q === 'rammer') { this.core.bonusMax += 2; this.core.hp += 2; }
    }

    // ---------- damage to the player ----------
    coreDead() { return this.core.hp <= 0; }
    healCore(n) {
      const before = this.core.hp;
      this.core.hp = Math.min(this.maxHp(this.core), this.core.hp + n);
      if (this.core.hp > before) { this.emit('heal', { uid: 'core', amount: this.core.hp - before }); this.say(`Core repaired to ${this.core.hp}/${this.maxHp(this.core)}.`, 'good'); }
    }
    healCard(card, n) {
      const before = card.hp;
      card.hp = Math.min(this.maxHp(card), card.hp + n);
      if (card.hp > before) { this.emit('heal', { uid: card.uid, amount: card.hp - before }); this.hit(card.uid); }
      return card.hp - before;
    }
    damageCore(n, src) {
      if (n <= 0) return;
      this.core.hp -= n;
      this.stats.dmgTaken += n;
      this.hit('core');
      this.emit('hit', { uid: 'core', dmg: n, src });
      this.say(`Your Core takes ${n} (${Math.max(0, this.core.hp)}/${this.maxHp(this.core)}).`, 'bad');
      if (this.coreDead()) this.gameOver();
    }
    damageModule(uid, n, src) {
      if (n <= 0) return;
      if (uid === 'core') return this.damageCore(n, src);
      const loc = this.locate(uid);
      if (!loc) return;
      loc.card.hp -= n;
      this.stats.dmgTaken += n;
      this.hit(uid);
      this.emit('hit', { uid, dmg: n, src });
      this.say(`${this.def(loc.card).name} takes ${n} (${Math.max(0, loc.card.hp)}/${this.maxHp(loc.card)}).`, 'bad');
      if (loc.card.hp <= 0) this.removeCard(loc.side, loc.idx, src);
    }
    removeCard(side, idx, src) {
      const s = this[side];
      const card = s[idx];
      if (!card) return;
      const nbs = this.neighbors(side, idx).map((c) => ({ card: c, buried: this.locate(c.uid).idx < s.length - 1 }));
      s.splice(idx, 1);
      const violent = !['scrap', 'jettison', 'trade'].includes(src);
      this.emit('destroyed', { uid: card.uid, id: card.id, side, idx, src, violent });
      if (violent) this.say(`${this.def(card).name} is destroyed!`, 'bad');
      if (card.id === 'cargo' && !this.has('cargo') && this.storage.length) {
        this.say(`The Cargo Hold's contents are lost: ${this.storage.map((c) => this.def(c).name).join(', ')}.`, 'bad');
        this.storage = [];
      }
      if (this.combat && !this.combat.over && violent) {
        for (const nb of nbs) {
          if (nb.card.id === 'grenadiers') { this.say('The Gas Grenadiers rupture: the enemy is Choking.', 'good'); this.combat.enemy.vuln += 2; }
          if (nb.card.id === 'cannon' && nb.buried) { this.say('Powder Store! The buried Deck Cannon cooks off at the enemy.', 'good'); this.damageEnemy(3, { source: 'explosion' }); }
        }
      }
      if (card.id === 'boiler' && violent) {
        this.say('The Auxiliary Boiler bursts, scalding its neighbours.', 'bad');
        for (const nb of nbs) this.damageModule(nb.card.uid, 2, 'explosion');
      }
      this.clampAll();
    }

    // Works out who takes how much from a hit, without changing anything. Used for both
    // resolving attacks and previewing the enemy's telegraphed intent.
    planHit(side, layer, dmg) {
      const s = this[side];
      if (!s.length) return [{ uid: 'core', dmg, exposed: true }];
      const last = s.length - 1;
      const i = layer === 'outer' ? last : Math.min(layer, last);
      if (this.combat && this.combat.braced[side]) return [{ uid: s[last].uid, dmg: 0, braced: true }];
      const out = s[last];
      if (i !== last && ARMOR[out.id]) return [{ uid: out.uid, dmg: Math.max(0, dmg - ARMOR[out.id].reduce), intercept: true }];
      const target = s[i];
      if (i === last && ARMOR[target.id]) return [{ uid: target.uid, dmg: Math.max(0, dmg - ARMOR[target.id].reduce) }];
      const plan = [];
      let rest = dmg;
      const guard = this.neighbors(side, i).find((c) => ARMOR[c.id] && c !== out);
      if (guard && rest > 0 && !ARMOR[target.id]) {
        const soak = Math.min(rest, ARMOR[guard.id].soak);
        plan.push({ uid: guard.uid, dmg: soak, soak: true });
        rest -= soak;
      }
      plan.unshift({ uid: target.uid, dmg: rest });
      return plan;
    }
    applyPlan(plan, src) {
      for (const p of plan) {
        if (this.coreDead()) return;
        if (p.braced) { this.say('The Deflector Vane turns the hit aside.', 'good'); this.emit('block', { uid: p.uid }); this.combat.braced = { left: false, right: false }; continue; }
        if (p.intercept) this.say('Outside plating takes the hit.');
        if (p.soak) this.say('A buried bulkhead soaks some of the blow.');
        if (p.dmg <= 0) { this.emit('block', { uid: p.uid }); this.say(`${this.nameOf(this.locate(p.uid).card)} shrugs it off.`); continue; }
        this.damageModule(p.uid, p.dmg, src);
      }
    }
    // Where a token aimed at side/layer lands (outside armor catches it too).
    tokenTarget(side, layer) {
      const s = this[side];
      if (!s.length) return 'core';
      return this.planHit(side, layer, 1)[0].uid;
    }
    tokenImmune(card, token) {
      if (card === this.core) return false;
      const l = this.locate(card.uid);
      if (!l) return true;
      const nbs = this.neighbors(l.side, l.idx);
      if (token === 'fire') return nbs.some((c) => c.id === 'sprinkler');
      return nbs.some((c) => c.id === 'scrubber');
    }
    placeToken(token, side, layer) {
      const uid = this.tokenTarget(side, layer);
      const card = this.locate(uid).card;
      if (this.tokenImmune(card, token)) { this.say(`${this.nameOf(card)} is protected from ${TOKENS[token].name}.`, 'good'); return; }
      card.tokens[token] = true;
      this.hit(uid);
      this.emit('token', { uid, token });
      this.say(`${TOKENS[token].name} on your ${this.nameOf(card)}!`, 'bad');
      if (token === 'fire' && this.combat) this.combat.fireAfflicted = true;
    }

    // ---------- combat ----------
    startCombat(enemyId, enc, opts = {}) {
      const e = ENEMIES[enemyId];
      this.event = null;
      this.combat = {
        enc: enc.id, enemyId,
        enemy: { id: enemyId, name: e.name, weight: e.weight, hp: e.hp, max: e.hp, block: opts.block || 0, burn: 0, weak: 0, vuln: 0, charge: 0, phase: 0, intent: null },
        round: 0, steam: 0, active: null, over: false,
        evading: false, evadeUsed: false, evadeStreak: 0, freeSwapUsed: false, gyroUsed: false, overclock: false, abilityUsed: false,
        braced: { left: false, right: false },
        fireAfflicted: this.cards().some((c) => c.tokens.fire) || this.core.tokens.fire,
        lastSource: null, loot: opts.loot || null,
      };
      for (const c of this.cards()) { c.fired = 0; c.reload = 0; }
      this.phase = 'combat';
      this.emit('combatStart', { enemyId });
      this.say(`${e.name} engages! Weight ${e.weight}, Durability ${e.hp}.`, 'warn');
      if (this.combat.enemy.block) this.say(`It starts behind ${this.combat.enemy.block} Block.`, 'warn');
      const lighter = this.weight() < e.weight;
      if (lighter) { this.combatBonusSteam += 1; this.say(`Your ship is lighter (${fmt(this.weight())} vs ${e.weight}): you outpace it for +1 Steam on your first turn.`, 'good'); }
      this.rollIntent();
      this.beginPlayerTurn();
    }
    enemyDef() { return ENEMIES[this.combat.enemyId]; }
    phaseIndex(hp) {
      const phases = this.enemyDef().phases;
      const i = phases.findIndex((p) => hp >= p.min);
      return i < 0 ? phases.length - 1 : i;
    }
    // The enemy's next move is rolled a turn early and shown to the player.
    rollIntent() {
      const en = this.combat.enemy;
      const pi = this.phaseIndex(en.hp);
      if (pi !== en.phase) {
        en.phase = pi;
        const p = this.enemyDef().phases[pi];
        this.emit('phase', { index: pi, name: p.name });
        this.say(`${en.name} shifts tactics: ${p.name}!`, 'warn');
      }
      const p = this.enemyDef().phases[pi];
      const r = this.d6(`${en.name}: ${p.name}`);
      const intent = { ...p.table[r - 1], roll: r };
      if (['shot', 'token'].includes(intent.kind)) {
        const s = this.d6('Side');
        const l = this.d6('Layer');
        intent.side = s <= 3 ? 'left' : 'right';
        intent.layer = LAYER_TABLE[l - 1] - 1;
      } else if (['rake', 'ram'].includes(intent.kind)) {
        intent.side = this.d6('Side') <= 3 ? 'left' : 'right';
      }
      en.intent = intent;
      this.emit('intent', { intent });
    }
    isAttack(intent) { return ['shot', 'rake', 'broadside', 'ram'].includes(intent.kind) || (intent.kind === 'token' && intent.dmg > 0); }
    ramResist() {
      let r = Math.max(0, Math.floor((this.weight() - this.combat.enemy.weight) / 2));
      if (this.core.id === 'battleship') r += 2;
      if (this.has('gyro')) r += 2;
      return r;
    }
    // After round 10 the enemy grows Enraged: +1 damage per hit for every round past 10.
    enrage() { return this.combat ? Math.max(0, this.combat.round - ENRAGE_ROUND) : 0; }
    intentDamage(intent) {
      const en = this.combat.enemy;
      let d = (intent.dmg || 0) + en.charge - (en.weak > 0 ? 1 : 0) + (intent.dmg ? this.enrage() : 0);
      if (intent.kind === 'ram') d -= this.ramResist();
      return Math.max(intent.kind === 'ram' ? 1 : 0, d);
    }
    // What the telegraphed intent would do to the ship as it stands now.
    previewIntent() {
      const c = this.combat;
      if (!c || !c.enemy.intent) return null;
      const it = c.enemy.intent;
      const dmg = this.intentDamage(it);
      let plan = [];
      if (it.kind === 'shot') plan = this.planHit(it.side, it.layer, dmg);
      if (it.kind === 'ram') plan = this.planHit(it.side, 'outer', dmg);
      if (it.kind === 'broadside') plan = [...this.planHit('left', 'outer', dmg), ...this.planHit('right', 'outer', dmg)];
      if (it.kind === 'rake') plan = this.rakePlan(it.side, dmg);
      if (it.kind === 'token') plan = [{ uid: this.tokenTarget(it.side, it.layer), dmg: dmg > 0 ? this.planHit(it.side, it.layer, dmg)[0].dmg : 0, token: it.token }];
      if (c.evading && this.isAttack(it)) plan = plan.map((p) => ({ ...p, dmg: 0, evaded: true }));
      return { intent: it, dmg, plan };
    }
    rakePlan(side, dmg) {
      const s = this[side];
      if (!s.length) return [{ uid: 'core', dmg, exposed: true }];
      const plan = [];
      for (let i = 0; i < s.length; i++) plan.push(...this.planHit(side, i, dmg));
      return plan;
    }
    beginPlayerTurn() {
      const c = this.combat;
      c.round++;
      c.active = 'player';
      for (const x of [this.core, ...this.cards()].filter((x) => x.tokens.fire)) {
        if (this.coreDead()) break;
        c.fireAfflicted = true;
        this.emit('burn', { uid: x.uid });
        this.say(`Fire burns your ${this.nameOf(x)}.`, 'bad');
        this.damageModule(x.uid, 1, 'fire');
      }
      if (this.checkEnd()) return;
      if (this.heartOnCore() && this.core.hp < this.maxHp(this.core)) { this.say('The Clockwork Heart ticks: +1 Core.', 'good'); this.healCore(1); }
      if (this.core.id === 'clockwork') {
        const hurt = this.cards().filter((x) => x.hp < this.maxHp(x)).sort((a, b) => (a.hp - this.maxHp(a)) - (b.hp - this.maxHp(b)))[0];
        if (hurt) { this.healCard(hurt, 1); this.say(`Self-Winding repairs the ${this.def(hurt).name}.`, 'good'); }
      }
      c.steam = this.steamCap() + (c.round === 1 ? this.combatBonusSteam : 0);
      if (c.round === 1) this.combatBonusSteam = 0;
      for (const x of this.cards()) { x.fired = 0; if (x.reload > 0) x.reload--; }
      c.evadeUsed = false; c.freeSwapUsed = false; c.gyroUsed = false; c.overclock = false; c.abilityUsed = false;
      this.emit('steam', { steam: c.steam });
      this.say(`Round ${c.round}: ${c.steam} Steam.`, 'sys');
    }
    endTurn() {
      const c = this.combat;
      if (!this.canAct()) return false;
      if (this.core.id === 'zeppelin' && c.steam > 0) {
        const before = this.core.pressure;
        this.core.pressure = Math.min(MAX_PRESSURE, this.core.pressure + c.steam);
        if (this.core.pressure > before) this.say(`${this.core.pressure - before} Steam banked as Pressure (${this.core.pressure}).`, 'sys');
      }
      if (c.steam > 0) for (const v of this.cards().filter((x) => x.id === 'overpressure')) { this.say('The Overpressure Valve strains with unspent Steam.', 'warn'); this.damageModule(v.uid, 1, 'strain'); }
      if (this.checkEnd()) return true;
      c.steam = 0;
      this.enemyTurn();
      return true;
    }
    enemyTurn() {
      const c = this.combat;
      const en = c.enemy;
      c.active = 'enemy';
      en.block = 0;
      if (en.burn > 0) {
        this.emit('enemyBurn', { dmg: en.burn });
        this.say(`The ${en.name} burns for ${en.burn}.`, 'good');
        this.damageEnemy(en.burn, { pierce: true, source: 'burn', noVuln: true });
        en.burn--;
        if (this.checkEnd()) return;
      }
      this.executeIntent(en.intent);
      if (this.checkEnd()) return;
      if (en.weak > 0) en.weak--;
      if (en.vuln > 0) en.vuln--;
      c.braced = { left: false, right: false };
      c.evadeStreak = c.evading ? c.evadeStreak + 1 : 0;
      c.evading = false;
      if (this.enrage() === 1) this.say(`The ${en.name} is Enraged: its hits grow stronger every round.`, 'warn');
      this.rollIntent();
      this.beginPlayerTurn();
    }
    executeIntent(it) {
      const c = this.combat;
      const en = c.enemy;
      this.emit('enemyAct', { intent: it });
      this.say(`${en.name}: ${it.name}.`, 'enemy');
      if (it.kind === 'block') { en.block += it.amount; this.emit('enemyBlock', { amount: it.amount }); this.say(`It gains ${it.amount} Block.`); return; }
      if (it.kind === 'repair') { const b = en.hp; en.hp = Math.min(en.max, en.hp + it.amount); this.emit('enemyHeal', { amount: en.hp - b }); this.say(`It repairs ${en.hp - b}.`); return; }
      if (it.kind === 'charge') { en.charge += it.amount; this.say(`Its next attack deals +${en.charge}.`, 'warn'); return; }
      if (c.evading && this.isAttack(it)) {
        this.emit('evade', {});
        this.say('You bank hard and the attack sails past!', 'good');
        en.charge = 0;
        return;
      }
      const dmg = this.intentDamage(it);
      if (en.weak > 0) this.say('Gummed: its weapons are clogged (-1).');
      if (it.kind === 'ram') {
        this.emit('ram', { side: it.side });
        this.say(`It rams your ${it.side} side and takes ${it.self} itself.`, 'warn');
        this.applyPlan(this.planHit(it.side, 'outer', dmg), 'ram');
        if (this.coreDead()) return;
        this.damageEnemy(it.self, { pierce: true, source: 'recoil', noVuln: true });
      } else if (it.kind === 'shot') {
        this.emit('enemyShot', { side: it.side, layer: it.layer, dmg });
        this.applyPlan(this.planHit(it.side, it.layer, dmg), 'attack');
      } else if (it.kind === 'broadside') {
        this.emit('enemyShot', { side: 'both', dmg });
        for (const side of SIDES) if (!this.coreDead()) this.applyPlan(this.planHit(side, 'outer', dmg), 'attack');
      } else if (it.kind === 'rake') {
        this.emit('enemyShot', { side: it.side, rake: true, dmg });
        this.applyPlan(this.rakePlan(it.side, dmg), 'attack');
      } else if (it.kind === 'token') {
        this.emit('enemyShot', { side: it.side, layer: it.layer, dmg, token: it.token });
        if (dmg > 0) this.applyPlan(this.planHit(it.side, it.layer, dmg), 'attack');
        if (!this.coreDead()) this.placeToken(it.token, it.side, it.layer);
      }
      en.charge = 0;
    }
    damageEnemy(n, opts = {}) {
      const c = this.combat;
      const en = c.enemy;
      if (n <= 0 || c.over) return 0;
      if (en.vuln > 0 && !opts.noVuln) n += 1;
      if (en.block > 0 && !opts.pierce) {
        const absorbed = Math.min(en.block, n);
        en.block -= absorbed;
        n -= absorbed;
        this.emit('enemyBlocked', { amount: absorbed });
        this.say(`Its Block absorbs ${absorbed}.`, 'warn');
      }
      if (n <= 0) return 0;
      en.hp -= n;
      this.stats.dmgDealt += n;
      c.lastSource = opts.source || 'weapon';
      this.emit('enemyHit', { dmg: n, source: opts.source || 'weapon' });
      this.say(`${en.name} takes ${n} (${Math.max(0, en.hp)}/${en.max}).`, 'good');
      return n;
    }
    checkEnd() {
      const c = this.combat;
      if (!c || c.over) return true;
      if (this.coreDead()) { if (this.phase !== 'gameover') this.gameOver(); return true; }
      if (c.enemy.hp <= 0) { this.winCombat(); return true; }
      return false;
    }
    gameOver() {
      if (this.combat) this.combat.over = true;
      this.phase = 'gameover';
      this.emit('defeat', {});
      this.say('Your Core ruptures. The ship falls through the clouds.', 'bad');
    }
    winCombat() {
      const c = this.combat;
      c.over = true;
      this.stats.kills++;
      this.emit('victory', { enemyId: c.enemyId });
      this.say(`The ${c.enemy.name} goes down in flames!`, 'good');
      for (const x of [this.core, ...this.cards()]) { x.tokens = noTokens(); x.fired = 0; x.reload = 0; }
      this.core.pressure = 0;
      for (const b of this.cards().filter((x) => x.id === 'repair')) if (b.hp < this.maxHp(b)) { b.hp++; this.say('The Repair Bay patches itself (+1).'); }
      if (c.enemy.max >= 14) this.questEvent('bigKill');
      if (c.fireAfflicted) this.questEvent('fireWin');
      if (c.round <= 3) this.questEvent('quickWin');
      if (['ram', 'bombard'].includes(c.lastSource)) this.questEvent('ramKill');
      if (this.enemyDef().boss) {
        this.won = true;
        this.phase = 'victory';
        this.say('The Iron Leviathan breaks apart beneath the clouds. Victory!', 'good');
        return;
      }
      const extra = this.has('hatch') ? 1 : 0;
      const keep = this.has('hatch') && this.has('cargo') ? 2 : 1;
      const ids = this.partOffer(3 + extra);
      this.swapAvailable = this.has('cargo') && this.storage.length > 0;
      this.openLoot('Victory spoils', { ids, keep }, []);
      if (c.loot) this.queueOffer(c.loot);
    }

    // ---------- player actions ----------
    canAct() { return this.phase === 'combat' && this.combat && this.combat.active === 'player' && !this.combat.over && !this.pendingChoice; }
    spendable(cost) { return this.canAct() && this.combat.steam >= cost; }
    pay(cost) { this.combat.steam -= cost; this.emit('steam', { steam: this.combat.steam, spent: cost }); }
    shotsAllowed(card) { return this.touching(card.uid, 'autoloader') ? 2 : 1; }
    useCost(card) {
      const d = this.def(card);
      let cost = d.cost || 0;
      if (this.isWeapon(card) && this.touching(card.uid, 'quarters')) cost = Math.max(1, cost - 1);
      if (card.tokens.gas) cost += 1;
      return cost;
    }
    // Describes firing a weapon (mode: 'normal' | 'aimed' | 'steady'), for the UI, the bot and the tests.
    fireInfo(uid, mode = 'normal') {
      const loc = this.locate(uid);
      if (!loc || loc.card === this.core || !this.isWeapon(loc.card)) return null;
      const { card, side, idx } = loc;
      const d = this.def(card);
      let cost = this.useCost(card) + (mode !== 'normal' ? 1 : 0);
      let blocked = null;
      if (!d.arc && !this.isOuter(side, idx)) blocked = 'Buried: only outside weapons fire';
      else if (card.reload > 0) blocked = 'Reloading';
      else if (card.fired >= this.shotsAllowed(card)) blocked = 'Already fired';
      else if (this.combat && this.combat.steam < cost) blocked = 'Not enough Steam';
      const bonus = (this[side][idx - 1] && this[side][idx - 1].id === 'harpoon' ? 1 : 0)
        + (card.id === 'sniper' && this.touching(uid, 'telescope') ? 1 : 0)
        - (card.tokens.glue ? 1 : 0);
      let summary;
      if (card.id === 'cannon') summary = mode === 'aimed' ? `best of 2d6 → ${2 + bonus}–${5 + bonus}` : `d6 → ${2 + bonus}–${5 + bonus}`;
      else if (card.id === 'sniper') summary = mode === 'steady' ? `${4 + bonus} piercing` : `${d.dmg + bonus}`;
      else if (card.id === 'tesla') summary = `${this.weaponsInstalled() + bonus} piercing`;
      else summary = `${Math.max(0, d.dmg + bonus)}`;
      if (d.burn) summary += ` +${d.burn} Burn`;
      if (d.weak) summary += ` +${d.weak} Gummed`;
      if (d.vuln) summary += ` +${d.vuln} Choking`;
      return { card, side, idx, cost, blocked, bonus, summary, modes: card.id === 'cannon' ? ['normal', 'aimed'] : card.id === 'sniper' ? ['normal', 'steady'] : ['normal'] };
    }
    fire(uid, mode = 'normal') {
      if (!this.canAct()) return false;
      const w = this.fireInfo(uid, mode);
      if (!w || w.blocked) return false;
      const { card, side, idx } = w;
      const d = this.def(card);
      this.pay(w.cost);
      card.fired++;
      const times = this.combat.overclock ? 2 : 1;
      this.combat.overclock = false;
      for (let t = 0; t < times && !this.combat.over; t++) {
        this.emit('fire', { uid, id: card.id, side, idx, mode });
        this.say(`${t ? 'Overclocked! ' : ''}Your ${d.name} fires${mode === 'aimed' ? ' an aimed shot' : mode === 'steady' ? ' a steadied shot' : ''}.`, 'you');
        let dmg = d.dmg || 0;
        let pierce = false;
        if (card.id === 'cannon') {
          const a = this.d6('Deck Cannon');
          let r = a;
          if (mode === 'aimed') { const b = this.d6('Deck Cannon (aimed)'); r = Math.max(a, b); }
          dmg = d.table[r - 1];
          this.say(`Cannon roll ${r}: ${dmg} damage.`, 'dice');
        }
        if (card.id === 'sniper' && mode === 'steady') { dmg = 4; pierce = true; }
        if (card.id === 'tesla') { dmg = this.weaponsInstalled(); pierce = true; }
        dmg = Math.max(0, dmg + w.bonus);
        if (dmg > 0) this.damageEnemy(dmg, { pierce, source: card.id });
        const en = this.combat.enemy;
        if (d.burn) { en.burn += d.burn; this.say(`It catches fire: Burn ${en.burn}.`, 'good'); }
        if (d.weak) { en.weak += d.weak; this.say(`Its guns are gummed up for ${en.weak} turns.`, 'good'); }
        if (d.vuln) { en.vuln += d.vuln; this.say(`It is Choking for ${en.vuln} turns.`, 'good'); }
      }
      if (card.id === 'mortar' && !this.touching(uid, 'telescope')) card.reload = 2;
      this.checkEnd();
      return true;
    }
    coreAbilityInfo() {
      const a = CORES[this.core.id].ability;
      let blocked = null;
      if (this.combat && this.combat.abilityUsed) blocked = 'Used this turn';
      else if (this.combat && this.combat.steam < a.cost) blocked = 'Not enough Steam';
      else if (a.id === 'bombard' && this.core.pressure < 1) blocked = 'No Pressure';
      let summary = '';
      if (a.id === 'strafe') summary = `${this.weaponsInstalled()} dmg`;
      if (a.id === 'ram') summary = `${this.ramDamage()} dmg · bow takes 1`;
      if (a.id === 'bombard') summary = `${2 * this.core.pressure} piercing`;
      if (a.id === 'overclock') summary = 'next weapon fires twice';
      return { ability: a, blocked, summary, cost: a.cost };
    }
    ramDamage() { return 2 + Math.floor(Math.max(0, this.weight()) / 2); }
    useCore() {
      if (!this.canAct()) return false;
      const info = this.coreAbilityInfo();
      if (info.blocked) return false;
      const a = info.ability;
      this.pay(a.cost);
      this.combat.abilityUsed = true;
      this.emit('coreAbility', { id: a.id });
      this.say(`Core ability: ${a.name}!`, 'you');
      if (a.id === 'strafe') this.damageEnemy(this.weaponsInstalled(), { source: 'strafe' });
      if (a.id === 'ram') {
        this.emit('ram', { player: true });
        this.damageEnemy(this.ramDamage(), { source: 'ram' });
        if (!this.combat.over) {
          const bow = this.outer('right');
          this.say('The impact jars your bow.', 'bad');
          this.damageModule(bow ? bow.uid : 'core', 1, 'recoil');
        }
      }
      if (a.id === 'bombard') { const p = this.core.pressure; this.core.pressure = 0; this.damageEnemy(2 * p, { pierce: true, source: 'bombard' }); }
      if (a.id === 'overclock') { this.combat.overclock = true; this.say('Gears whir: your next weapon fires twice.', 'good'); }
      this.checkEnd();
      return true;
    }
    // Lighter ships dodge cheaply. Each Evade in consecutive turns costs 1 more (crew fatigue).
    evadeCost() {
      if (this.core.id === 'battleship') return null;
      const fatigue = this.combat ? this.combat.evadeStreak : 0;
      if (this.has('gyro') && this.combat && !this.combat.gyroUsed && !fatigue) return 0;
      let cost = this.core.id === 'airship' ? 1 : Math.min(4, 1 + Math.floor(Math.max(0, this.weight()) / 3));
      if (this.core.id !== 'airship' && SIDES.some((s) => { const o = this.outer(s); return o && o.id === 'propeller'; })) cost = Math.max(1, cost - 1);
      return cost + fatigue;
    }
    canEvade() {
      const cost = this.evadeCost();
      const it = this.combat && this.combat.enemy.intent;
      return cost != null && this.spendable(cost) && !this.combat.evadeUsed && !this.combat.evading && it && this.isAttack(it);
    }
    evade() {
      if (!this.canEvade()) return false;
      const cost = this.evadeCost();
      if (cost === 0 && this.has('gyro')) this.combat.gyroUsed = true;
      this.pay(cost);
      this.combat.evadeUsed = true;
      this.combat.evading = true;
      this.emit('evadeReady', {});
      this.say('Evasive manoeuvres: the telegraphed attack will miss.', 'you');
      return true;
    }
    swapCost() { return this.core.id === 'airship' && this.combat && !this.combat.freeSwapUsed ? 0 : 1; }
    canSwap(uidA, uidB) {
      const a = this.locate(uidA), b = this.locate(uidB);
      if (!a || !b || !a.side || a.side !== b.side || Math.abs(a.idx - b.idx) !== 1) return false;
      if (a.card.tokens.glue || b.card.tokens.glue) return false;
      return this.spendable(this.swapCost());
    }
    swapTargets(uid) {
      const l = this.locate(uid);
      if (!l || !l.side) return [];
      return this.neighbors(l.side, l.idx).filter((c) => this.canSwap(uid, c.uid)).map((c) => c.uid);
    }
    swap(uidA, uidB) {
      if (!this.canSwap(uidA, uidB)) return false;
      const a = this.locate(uidA), b = this.locate(uidB);
      const cost = this.swapCost();
      if (cost === 0) this.combat.freeSwapUsed = true;
      this.pay(cost);
      const s = this[a.side];
      [s[a.idx], s[b.idx]] = [s[b.idx], s[a.idx]];
      this.clampAll();
      this.emit('swap', { side: a.side, a: uidA, b: uidB });
      this.say(`Swapped ${this.def(a.card).name} and ${this.def(b.card).name}.`, 'you');
      return true;
    }
    ventTargets() { return [this.core, ...this.cards()].filter((c) => c.tokens.fire || c.tokens.gas || c.tokens.glue).map((c) => c.uid); }
    vent(uid) {
      if (!this.spendable(VENT_COST) || !this.ventTargets().includes(uid)) return false;
      this.pay(VENT_COST);
      const card = this.locate(uid).card;
      card.tokens = noTokens();
      this.emit('cleanse', { uid });
      this.say(`Crew vent the ${this.nameOf(card)}: tokens cleared.`, 'you');
      return true;
    }
    // Support modules with an active use.
    supportTargets(uid) {
      const loc = this.locate(uid);
      if (!loc || loc.card === this.core) return [];
      const id = loc.card.id;
      if (id === 'repair') {
        const t = this.neighbors(loc.side, loc.idx).filter((c) => c.hp < this.maxHp(c)).map((c) => c.uid);
        if (loc.idx === 0 && this.core.hp < this.maxHp(this.core)) t.unshift('core');
        return t;
      }
      if (id === 'sprinkler') return [this.core, ...this.cards()].filter((c) => c.tokens.fire).map((c) => c.uid);
      if (id === 'scrubber') return [this.core, ...this.cards()].filter((c) => c.tokens.gas || c.tokens.glue).map((c) => c.uid);
      if (id === 'deflector') return this.combat && !this.combat.braced[loc.side] ? [uid] : [];
      return [];
    }
    canUseSupport(uid) {
      const loc = this.locate(uid);
      if (!loc || loc.card === this.core) return false;
      const d = this.def(loc.card);
      if (d.type === 'weapon' || d.cost == null) return false;
      return this.spendable(this.useCost(loc.card)) && loc.card.fired < 1;
    }
    useSupport(uid, targetUid) {
      if (!this.canUseSupport(uid) || !this.supportTargets(uid).includes(targetUid)) return false;
      const card = this.locate(uid).card;
      const target = this.locate(targetUid).card;
      this.pay(this.useCost(card));
      card.fired++;
      if (card.id === 'repair') {
        if (target === this.core) this.healCore(this.def(card).heal);
        else this.healCard(target, this.def(card).heal);
        this.say(`The Repair Bay patches your ${this.nameOf(target)}.`, 'you');
      }
      if (card.id === 'sprinkler') { target.tokens.fire = false; this.emit('cleanse', { uid: targetUid }); this.say(`Sprinklers douse your ${this.nameOf(target)}.`, 'you'); }
      if (card.id === 'scrubber') { target.tokens.gas = false; target.tokens.glue = false; this.emit('cleanse', { uid: targetUid }); this.say(`The Air Scrubber clears your ${this.nameOf(target)}.`, 'you'); }
      if (card.id === 'deflector') { this.combat.braced[this.locate(uid).side] = true; this.emit('brace', { uid }); this.say('The Deflector Vane swings into place.', 'you'); }
      return true;
    }
  }

  return { Game, fmt, cap, MAX_LAYERS, SIDES, VENT_COST, MAX_PRESSURE };
});
