// Cardships rules engine. Holds the whole run state and exposes one method per player decision.
// No DOM access: the UI reads the state, calls these methods, and plays back `events` as animation.
// Every random number comes from one seeded generator whose state is saved with the run.
(function (root, factory) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const api = factory(isNode ? require('./data.js') : root.CardshipsData);
  if (isNode) module.exports = api;
  else root.CardshipsEngine = api;
})(this, function (D) {
  const { BALANCE, CORES, SHIPS, PARTS, LEGENDARY_POOLS, RARITY_ODDS, ENEMIES, ENCOUNTERS, AREAS, PRICES, UNLOCKS, QUESTS, TOKENS, ROW_TABLE, DEPTH_TABLE, PLUNGE_TABLE } = D;

  const BASE_SIGHT = 2;
  const SNAP_DAMAGE = 6;
  const STORAGE_SLOTS = 2;
  const MAX_PRESSURE = BALANCE.maxPressure;
  const VENT_COST = 2;
  const ENRAGE_ROUND = BALANCE.enrageRound;
  // The ship is a side-on grid of two decks, built out from the Core. The hull row runs through the
  // Core: up to 3 columns behind it (the stern, col -1..-3) and 3 in front (the bow, col 1..3), always
  // packed against the Core. The upper deck sits on top: a module there needs a hull module (or, at
  // col 0, the Core itself: the bridge) underneath. The enemy is off the bow.
  const COLS = [-3, -2, -1, 0, 1, 2, 3];
  const SIDE_COLS = 3;
  const MAX_MODULES = 8;
  const HULL = 0, UPPER = 1;
  const ix = (col) => col + SIDE_COLS;
  const ROW_NAME = ['hull', 'upper deck'];
  const BRACE = 3; // damage a braced Deflector Vane turns aside
  const ARMOR = { plating: { soak: 1, reduce: 0 }, bulwark: { soak: 2, reduce: 1 }, leviplating: { soak: 2, reduce: 2 } };

  function noTokens() { return { fire: false, glue: false, gas: false }; }
  function cap(s) { return s[0].toUpperCase() + s.slice(1); }
  function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }
  // 'The Pirate Cutter', but never 'The The Iron Leviathan'.
  function theName(name) { return name.startsWith('The ') ? name : 'The ' + name; }

  class Game {
    constructor(opts = {}) {
      this.seed = opts.seed != null ? opts.seed >>> 0 : (Math.floor(Math.random() * 2 ** 32) >>> 0);
      this.rngState = this.seed;
      this.area = 0; // which of the three areas the run is in (AREAS)
      this.maxDepth = AREAS[0].cols;
      this.unlocked = opts.unlocked || null; // ids unlocked by meta-progression; null = everything
      this.legendaries = opts.legendaries || []; // legendaries unlocked by beating their boss before: very rare loot
      this.nextUid = 1;
      this.log = [];
      this.logId = 0;
      this.events = [];
      this.flashes = new Set();

      this.phase = 'coreSelect';
      this.core = null;
      this.ship = null;
      this.hull = COLS.map(() => null);
      this.top = COLS.map(() => null);
      this.storage = [];
      this.depth = 0;
      this.map = null;
      this.bossIds = opts.bosses || (opts.boss ? [opts.boss] : null); // one boss per area, rolled at the start
      this.bossId = null; // the current area's boss
      this.portalReady = false; // the area's boss is down: a portal opens once the spoils are in
      this.sightMoves = 0;
      this.cogs = BALANCE.startCogs;
      this.shop = null;
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
      this.stats = { encounters: 0, kills: 0, dmgDealt: 0, dmgTaken: 0, parts: 0, quests: 0, cogs: 0, elites: 0, reachedBoss: false, areasCleared: 0, bossesFought: [], bossesKilled: [] };
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

    // Seeds as short shareable codes, e.g. "K3V9QX".
    static seedCode(seed) { return (seed >>> 0).toString(36).toUpperCase(); }
    static seedFromCode(code) {
      const clean = String(code || '').trim().toUpperCase();
      if (!clean) return null;
      if (/^[0-9A-Z]{1,7}$/.test(clean)) { const n = parseInt(clean, 36); if (n <= 0xffffffff) return n >>> 0; }
      let h = 2166136261; for (const ch of clean) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
      return h >>> 0;
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
    available(id) {
      if (PARTS[id].rarity === 'legendary') return this.legendaries.includes(id);
      return !this.unlocked || this.unlocked.includes(id) || !UNLOCKS.some((u) => u.id === id);
    }
    randomPart(tier = 'normal', filter = null) {
      const ok = (id) => this.available(id) && (!filter || filter(PARTS[id]));
      const pools = {};
      for (const id of Object.keys(PARTS)) if (ok(id)) (pools[PARTS[id].rarity] = pools[PARTS[id].rarity] || []).push(id);
      // Only rarities that have something to give are rolled.
      const odds = {};
      for (const [r, w] of Object.entries(RARITY_ODDS[tier])) if (pools[r]) odds[r] = w;
      if (!Object.keys(odds).length) return this.pick(Object.keys(PARTS).filter((id) => PARTS[id].rarity === 'common'));
      return this.pick(pools[this.weighted(odds)]);
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

    // ---------- the grid ----------
    row(r) { return r === UPPER ? this.top : this.hull; }
    at(col, r) { return Math.abs(col) > SIDE_COLS ? null : this.row(r)[ix(col)] || null; }
    set(col, r, card) { this.row(r)[ix(col)] = card; }
    cards() { return [...this.hull, ...this.top].filter(Boolean); }
    has(id) { return this.cards().some((c) => c.id === id); }
    count(id) { return this.cards().filter((c) => c.id === id).length; }
    // { card, col, row, side } — side is 'stern', 'bow' or 'bridge' (over the Core).
    locate(uid) {
      if (uid === 'core') return { side: null, col: 0, row: HULL, card: this.core };
      for (const r of [HULL, UPPER]) {
        const i = this.row(r).findIndex((c) => c && c.uid === uid);
        if (i >= 0) { const col = i - SIDE_COLS; return { card: this.row(r)[i], col, row: r, side: col < 0 ? 'stern' : col > 0 ? 'bow' : 'bridge' }; }
      }
      return null;
    }
    // Hull modules on one side, packed against the Core (1..3).
    hullCount(side) { const d = side === 'stern' ? -1 : 1; let n = 0; while (n < SIDE_COLS && this.at(d * (n + 1), HULL)) n++; return n; }
    // The module that meets direct fire first on a deck: the prow of the hull, or the foremost upper module.
    front(r) {
      if (r === HULL) { const n = this.hullCount('bow'); return n ? this.at(n, HULL) : null; }
      for (let col = SIDE_COLS; col >= -SIDE_COLS; col--) if (this.at(col, UPPER)) return this.at(col, UPPER);
      return null;
    }
    // The hindmost module on a deck (stern side only).
    tail(r) {
      for (let col = -SIDE_COLS; col < 0; col++) if (this.at(col, r)) return this.at(col, r);
      return null;
    }
    // Direct fire meets a deck's modules front to back. The hull row stops at the Core.
    lineOfFire(r) {
      const out = [];
      if (r === HULL) for (let col = this.hullCount('bow'); col >= 1; col--) out.push(this.at(col, HULL));
      else for (let col = SIDE_COLS; col >= -SIDE_COLS; col--) if (this.at(col, UPPER)) out.push(this.at(col, UPPER));
      return out;
    }
    isFront(loc) { return !!loc && loc.card !== this.core && this.front(loc.row) === loc.card; }
    isTail(loc) { return !!loc && loc.col < 0 && this.tail(loc.row) === loc.card; }
    // Nothing bolted on top: upper-deck modules, and hull modules with an empty slot above.
    openSky(loc) { return !!loc && loc.card !== this.core && (loc.row === UPPER || !this.at(loc.col, UPPER)); }
    // Covered from above and not at the front of its deck.
    isBuried(loc) { return !!loc && loc.card !== this.core && !this.isFront(loc) && !this.openSky(loc); }
    touchesCore(loc) { return !!loc && ((loc.row === HULL && Math.abs(loc.col) === 1) || (loc.row === UPPER && loc.col === 0)); }
    // Modules sharing an edge (left, right, above, below). The Core is not a module.
    neighborsOf(loc) {
      if (!loc || loc.card === this.core) return [];
      const out = [this.at(loc.col - 1, loc.row), this.at(loc.col + 1, loc.row), this.at(loc.col, 1 - loc.row)];
      return out.filter(Boolean);
    }
    neighbors(uid) { return this.neighborsOf(this.locate(uid)); }
    touching(uid, id) { return this.neighbors(uid).some((c) => c.id === id); }
    // Where a module sits, in words.
    placeName(loc) {
      if (!loc || loc.card === this.core) return 'Core';
      if (loc.row === UPPER && loc.col === 0) return 'Bridge (on top of the Core)';
      const n = Math.abs(loc.col);
      const where = `${loc.col < 0 ? 'Stern' : 'Bow'} ${n}`;
      return loc.row === UPPER ? `Upper deck, over ${where}` : `Hull, ${where}`;
    }
    nameOf(card) { return card === this.core ? 'Core' : this.def(card).name; }
    maxHp(card) {
      if (card === this.core) return this.core.baseMax + this.core.bonusMax + (this.heartOnCore() ? 3 : 0);
      let m = this.def(card).hp + card.bonusMax;
      if (card.id === 'plating' && this.touching(card.uid, 'gatling')) m += 1;
      return m;
    }
    coreMates() { return [this.at(-1, HULL), this.at(1, HULL), this.at(0, UPPER)].filter(Boolean); }
    heartOnCore() { return this.coreMates().some((c) => c.id === 'heart'); }
    clampAll() {
      for (const c of this.cards()) c.hp = Math.min(c.hp, this.maxHp(c));
      if (this.core) this.core.hp = Math.min(this.core.hp, this.maxHp(this.core));
    }
    storageCap() { return this.has('cargo') ? STORAGE_SLOTS : 0; }
    weight() {
      let w = (this.core ? this.core.weight : 0) + (this.shipDef().weight || 0);
      for (const c of this.cards()) w += this.def(c).weight;
      if (this.has('cargo')) w += this.storage.length;
      return w;
    }
    steamCap() {
      let s = CORES[this.core.id].steam;
      for (const c of this.cards()) s += this.def(c).steam || 0;
      return s;
    }
    // Modules that need open sky (Telescope, Lightning Rod) or the stern end (Propeller) to work.
    working(id) {
      return this.cards().some((c) => {
        if (c.id !== id) return false;
        const l = this.locate(c.uid);
        return id === 'propeller' ? this.isTail(l) : this.openSky(l);
      });
    }
    telescopeOut() { return this.working('telescope'); }
    // Whether a weapon can fire from where it sits: straight-firing weapons need the front of a deck,
    // arcing weapons need open sky above them.
    canFireFrom(card, loc = this.locate(card.uid)) {
      if (!this.isWeapon(card) || !loc) return false;
      return PARTS[card.id].arc ? this.openSky(loc) : this.isFront(loc);
    }
    whyNotFire(card, loc = this.locate(card.uid)) {
      if (PARTS[card.id].arc) return 'Covered: an arcing weapon needs open sky above it';
      if (loc.row === HULL && loc.col < 0) return 'Behind the Core: only the front of a deck fires straight';
      return 'Blocked: only the front of a deck fires straight';
    }
    // How many columns ahead on the sky map you can identify.
    sight() { return BASE_SIGHT + (this.telescopeOut() ? 1 : 0) + (this.sightMoves > 0 ? 1 : 0) + (this.shipDef().sight || 0); }
    // The hull you fly (older saves have none: the Core's own ship).
    shipDef() { return SHIPS[this.ship] || {}; }
    static defaultShip(coreId) { return (Object.values(SHIPS).find((s) => s.core === coreId) || SHIPS.courier).id; }
    static shipsFor(coreId) { return Object.values(SHIPS).filter((s) => s.core === coreId); }
    gainCogs(n, why) { if (n <= 0) return; this.cogs += n; this.stats.cogs += n; this.emit('cogs', { amount: n }); this.say(`+${n} cogs${why ? ` (${why})` : ''}.`, 'good'); }
    isWeapon(card) { return this.def(card).type === 'weapon'; }
    weaponsInstalled() { return this.cards().filter((c) => this.isWeapon(c)).length; }

    // ---------- building ----------
    // Every empty slot a part could go into: a hull slot at either end of (or between) a side's
    // modules, which pushes the outer ones out, or an upper slot over a hull module or the Core.
    installSlots() {
      if (this.cards().length >= MAX_MODULES) return [];
      const out = [];
      for (const side of ['stern', 'bow']) {
        const n = this.hullCount(side), d = side === 'stern' ? -1 : 1;
        if (n < SIDE_COLS) for (let k = 1; k <= n + 1; k++) out.push({ row: HULL, col: d * k, insert: k <= n });
      }
      for (const col of COLS) if (!this.at(col, UPPER) && (col === 0 || this.at(col, HULL))) out.push({ row: UPPER, col });
      return out;
    }
    canInstall(pos) { return !!pos && this.installSlots().some((p) => p.row === pos.row && p.col === pos.col); }
    // Puts a card into a slot; a hull insert moves the columns outside it out by one.
    place(card, pos) {
      if (pos.row === HULL) {
        const d = Math.sign(pos.col);
        for (let k = this.hullCount(d < 0 ? 'stern' : 'bow'); k >= Math.abs(pos.col); k--) {
          this.set(d * (k + 1), HULL, this.at(d * k, HULL)); this.set(d * (k + 1), UPPER, this.at(d * k, UPPER));
          this.set(d * k, HULL, null); this.set(d * k, UPPER, null);
        }
      }
      this.set(pos.col, pos.row, card);
    }
    // Takes a module off the grid. A hull module's upper neighbour drops into its slot; with nothing
    // above, the columns outside it close up toward the Core.
    unplace(loc) {
      this.set(loc.col, loc.row, null);
      if (loc.row !== HULL) return;
      const above = this.at(loc.col, UPPER);
      if (above) { this.set(loc.col, UPPER, null); this.set(loc.col, HULL, above); return; }
      const d = Math.sign(loc.col);
      for (let k = Math.abs(loc.col); k < SIDE_COLS; k++) {
        this.set(d * k, HULL, this.at(d * (k + 1), HULL)); this.set(d * k, UPPER, this.at(d * (k + 1), UPPER));
        this.set(d * (k + 1), HULL, null); this.set(d * (k + 1), UPPER, null);
      }
    }
    snapshot() { return [this.hull.slice(), this.top.slice()]; }
    restore([h, t]) { this.hull = h; this.top = t; }

    // ---------- synergies ----------
    // Why two touching modules matter to each other, read from a's point of view (or null).
    pairSynergy(a, b) {
      const la = this.locate(a.uid), lb = this.locate(b.uid);
      const w = (c) => this.isWeapon(c);
      const name = (c) => this.def(c).name;
      const above = lb.row === UPPER && la.row === HULL && la.col === lb.col;
      const below = la.row === UPPER && lb.row === HULL && la.col === lb.col;
      if (a.id === 'harpoon' && above && w(b)) return `Chain Feed: ${name(b)} on top deals +1 damage`;
      if (b.id === 'harpoon' && below && w(a)) return 'Chain Feed from the Harpoon below: +1 damage';
      if (a.id === 'quarters' && w(b)) return `Crew: ${name(b)} costs 1 less Steam`;
      if (b.id === 'quarters' && w(a)) return 'Crewed: costs 1 less Steam';
      if (a.id === 'telescope' && (b.id === 'mortar' || b.id === 'sniper')) return b.id === 'mortar' ? 'Spotter: Mortar never reloads' : 'Spotter: Sniper +1 damage';
      if (b.id === 'telescope' && (a.id === 'mortar' || a.id === 'sniper')) return a.id === 'mortar' ? 'Spotted: never reloads' : 'Spotted: +1 damage';
      if (a.id === 'gatling' && b.id === 'plating') return 'Adhesive: Plating +1 max Durability';
      if (b.id === 'gatling' && a.id === 'plating') return 'Glued down: +1 max Durability';
      if (a.id === 'autoloader' && w(b)) return `Autoloader: ${name(b)} fires twice`;
      if (b.id === 'autoloader' && w(a)) return 'Autoloaded: fires twice a turn';
      if (a.id === 'sprinkler') return `Sprinklers: ${name(b)} can't catch fire`;
      if (b.id === 'sprinkler') return 'Fireproofed by the Sprinkler Tank';
      if (a.id === 'scrubber') return `Scrubbed: ${name(b)} immune to Gas and Glue`;
      if (b.id === 'scrubber') return 'Immune to Gas and Glue';
      if (a.id === 'repair') return `Repair Bay can mend the ${name(b)}`;
      if (b.id === 'repair') return 'Within reach of the Repair Bay';
      if (a.id === 'deflector') return `Deflector Vane can shield the ${name(b)}`;
      if (b.id === 'deflector') return 'The Deflector Vane can brace to shield it';
      if (ARMOR[a.id] && this.isBuried(la) && !ARMOR[b.id]) return `Bulkhead: soaks ${ARMOR[a.id].soak} of hits on the ${name(b)}`;
      if (ARMOR[b.id] && this.isBuried(lb) && !ARMOR[a.id]) return 'Bulkhead next door soaks part of each hit';
      if (a.id === 'grenadiers') return `If the ${name(b)} is destroyed, the enemy starts Choking`;
      if (b.id === 'grenadiers') return 'If this is destroyed, the Grenadiers gas the enemy';
      if (a.id === 'cannon' && this.isBuried(la)) return `Powder Store: if the ${name(b)} is destroyed, 3 damage to the enemy`;
      if (b.id === 'cannon' && this.isBuried(lb)) return 'If this is destroyed, the buried Cannon cooks off';
      if (a.id === 'boiler') return `Danger: the ${name(b)} gets scalded if the boiler bursts`;
      if (b.id === 'boiler') return 'Danger: scalded if the boiler bursts';
      return null;
    }
    // Every module linked to this one, with the reason. Front armor also covers its whole deck,
    // and anything on top shelters the module under it from plunging fire.
    synergies(uid) {
      const out = [];
      const add = (u, text) => { if (!out.some((o) => o.uid === u)) out.push({ uid: u, text }); };
      if (uid === 'core') {
        for (const c of this.coreMates()) if (c.id === 'repair' || c.id === 'heart') add(c.uid, c.id === 'repair' ? 'Repair Bay can mend the Core' : 'Clockwork Heart: +3 max Durability, repairs 1 a turn');
        return out;
      }
      const loc = this.locate(uid);
      if (!loc || !loc.side) return out;
      for (const n of this.neighborsOf(loc)) { const t = this.pairSynergy(loc.card, n); if (t) add(n.uid, t); }
      if (this.touchesCore(loc) && (loc.card.id === 'repair' || loc.card.id === 'heart')) add('core', loc.card.id === 'repair' ? 'Attached to the Core: can mend it' : 'Attached to the Core: +3 max Durability, repairs 1 a turn');
      const line = this.lineOfFire(loc.row);
      if (ARMOR[loc.card.id] && this.isFront(loc)) for (const c of line) if (c !== loc.card) add(c.uid, `Shields the ${this.def(c).name} from direct fire`);
      const head = line[0];
      if (head && ARMOR[head.id] && head !== loc.card && line.includes(loc.card)) add(head.uid, 'Front armor takes the direct hits meant for this');
      return out;
    }
    // What installing a part at pos would change, without changing anything.
    previewInstall(id, pos) {
      if (!this.canInstall(pos)) return null;
      const firing = () => new Set(this.cards().filter((c) => this.isWeapon(c) && this.canFireFrom(c)).map((c) => c.uid));
      const before = { weight: this.weight(), steam: this.steamCap(), evade: this.evadeCost(), sight: this.sight(), fires: firing(), sky: new Set(this.cards().filter((c) => this.openSky(this.locate(c.uid))).map((c) => c.uid)) };
      const snap = this.snapshot();
      const card = this.makeCard(id);
      this.nextUid--;
      this.place(card, pos);
      const loc = this.locate(card.uid);
      const after = { weight: this.weight(), steam: this.steamCap(), evade: this.evadeCost(), sight: this.sight(), fires: firing() };
      const links = this.synergies(card.uid).map((x) => x.text);
      const fires = !this.isWeapon(card) || this.canFireFrom(card, loc);
      const why = fires ? null : this.whyNotFire(card, loc);
      const front = this.isFront(loc), sky = this.openSky(loc);
      const covered = this.cards().filter((c) => c !== card && before.sky.has(c.uid) && !this.openSky(this.locate(c.uid)));
      const silenced = this.cards().filter((c) => before.fires.has(c.uid) && !after.fires.has(c.uid));
      this.restore(snap);
      const notes = [];
      notes.push(`Weight ${fmt(before.weight)} → ${fmt(after.weight)}`);
      if (after.steam !== before.steam) notes.push(`Steam ${before.steam} → ${after.steam}`);
      if (after.evade !== before.evade && after.evade != null) notes.push(`Evade cost ${before.evade} → ${after.evade}`);
      if (after.sight !== before.sight) notes.push(`Sight ${before.sight} → ${after.sight}`);
      if (pos.row === HULL && front) notes.push('Becomes the prow: first in line for direct fire along the hull');
      else if (pos.row === UPPER && front) notes.push('Heads the upper deck: first in line for direct fire along it');
      else if (pos.row === HULL && pos.col < 0) notes.push('Stern hull: behind the Core, out of direct fire; only bombs reach it');
      if (pos.row === UPPER) notes.push(pos.col === 0 ? 'The bridge: shelters the Core from bombs' : 'Open sky: bombs hit it before the module below');
      for (const c of covered) notes.push(`The ${this.def(c).name} below is now sheltered from bombs`);
      for (const c of silenced) notes.push(`The ${this.def(c).name} can no longer fire`);
      if (why) notes.push(`${why}: this weapon cannot fire here`);
      else if (this.isWeapon(card)) notes.push(PARTS[id].arc ? 'Open sky above: it can fire from here' : 'At the front of its deck: it can fire from here');
      return { notes, links, fires, sky };
    }

    // Replaces the ship with modules at fixed slots: [[id, row, col], ...].
    buildShip(spec) {
      this.hull = COLS.map(() => null);
      this.top = COLS.map(() => null);
      for (const [id, r, col] of spec) this.set(col, r, this.makeCard(id));
      this.clampAll();
    }

    // ---------- run setup ----------
    chooseCore(id, shipId = null) {
      if (this.phase !== 'coreSelect') return;
      const c = CORES[id];
      this.ship = SHIPS[shipId] && SHIPS[shipId].core === id ? shipId : Game.defaultShip(id);
      const sh = this.shipDef();
      const hp = c.hp + (sh.hp || 0);
      this.core = { uid: 'core', id, name: c.name, weight: c.weight, hp, baseMax: hp, bonusMax: 0, tokens: noTokens(), pressure: 0, charge: 0 };
      this.cogs += sh.cogs || 0;
      this.buildShip(c.start);
      this.say(`${c.name} aboard the ${sh.name}. Starting modules: ${c.start.map(([p]) => PARTS[p].name).join(', ')}.`, 'sys');
      this.rollBosses();
      this.bossId = this.bossIds[0];
      this.generateMap();
      this.say(`${AREAS[0].name}. Your charts mark the first threat: ${ENEMIES[this.bossId].name}.`, 'warn');
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
    installPending(pos) {
      if (!this.pendingLoot.length || !this.canInstall(pos)) return false;
      const id = this.pendingLoot.shift();
      const card = this.makeCard(id);
      this.place(card, pos);
      this.clampAll();
      this.stats.parts++;
      this.emit('install', { uid: card.uid, row: pos.row, col: pos.col });
      this.say(`Bolted the ${PARTS[id].name} on: ${this.placeName(this.locate(card.uid)).toLowerCase()}.`);
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
      this.removeCard(uid, 'scrap');
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
      this.set(loc.col, loc.row, stored);
      this.storage[storeIdx] = loc.card;
      this.swapAvailable = false;
      this.clampAll();
      this.emit('install', { uid: stored.uid, row: loc.row, col: loc.col });
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

    // ---------- areas and portals ----------
    areaDef() { return AREAS[this.area] || AREAS[0]; }
    // One boss per area, each different (given ones, e.g. from tests, are kept).
    rollBosses() {
      const ids = (this.bossIds || []).slice(0, AREAS.length);
      for (let i = ids.length; i < AREAS.length; i++) {
        const pool = AREAS[i].bosses.filter((b) => !ids.includes(b));
        ids.push(this.pick(pool.length ? pool : AREAS[i].bosses));
      }
      this.bossIds = ids;
    }
    // How far the run has come: columns cleared across every area so far.
    progress() { return AREAS.slice(0, this.area).reduce((s, a) => s + a.cols, 0) + this.depth; }
    // Through the portal into the next area: the ship and every module carry over, the Core is
    // fully repaired, and a new route is charted.
    crossPortal() {
      if (this.phase !== 'portal') return false;
      this.area++;
      this.portalReady = false;
      this.bossId = this.bossIds[this.area];
      this.depth = 0;
      this.sightMoves = 0;
      this.maxDepth = this.areaDef().cols;
      this.generateMap();
      this.emit('portal', { area: this.area });
      this.say(`— ${this.areaDef().name} —`, 'head');
      this.say(`You burst out of the portal into ${this.areaDef().name}. Its master: ${ENEMIES[this.bossId].name}.`, 'warn');
      const missing = this.maxHp(this.core) - this.core.hp;
      if (missing > 0) this.healCore(missing);
      this.phase = 'map';
      return true;
    }

    // ---------- sky map ----------
    // Columns 1 to cols-1 hold 2-4 nodes each; the last column is the boss. Edges only run to the next column.
    generateMap() {
      const A = this.areaDef(), BOSS_COL = A.cols;
      const nodes = [{ id: 'n0', col: 0, y: 0.5, enc: 'start', edges: [], biome: A.bands[0].biome }];
      let prev = [nodes[0]];
      for (let col = 1; col <= BOSS_COL; col++) {
        const count = col === BOSS_COL ? 1 : col === 1 ? 2 + Math.floor(this.rand() * 2) : 2 + Math.floor(this.rand() * 3);
        const colNodes = [];
        for (let i = 0; i < count; i++) {
          const y = count === 1 ? 0.5 : 0.14 + (0.72 * i) / (count - 1) + (this.rand() - 0.5) * 0.03; // small jitter: crowded columns never overlap
          colNodes.push({ id: `n${nodes.length + colNodes.length}`, col, y, edges: [] });
        }
        for (const n of colNodes) {
          if (col === BOSS_COL) { n.enc = 'boss'; n.enemy = this.bossId; }
          else n.enc = this.rollNodeType(col);
          if (n.enc === 'patrol') n.enemy = this.pick(A.tiers.find((t) => col <= t.upTo).pool);
          if (n.enc === 'lair') n.enemy = this.pick(A.elites);
          if (n.enc === 'beacon') n.enemy = A.beacon[col <= 4 ? 0 : 1];
          n.biome = n.enc === 'boss' ? A.bossBiome : (this.area === 0 && ENCOUNTERS[n.enc].biome) || A.bands.find((b) => col <= b.upTo).biome;
          n.cloud = col > 1 && col < BOSS_COL && this.rand() < 0.22; // type hidden until close or spotted
        }
        // Connect without crossings: each previous node links to the proportionally nearest node(s).
        prev.forEach((p, i) => {
          const t = prev.length === 1 ? null : i / (prev.length - 1);
          const targets = t == null ? colNodes : [colNodes[Math.round(t * (colNodes.length - 1))]];
          for (const c of targets) if (!p.edges.includes(c.id)) p.edges.push(c.id);
          if (t != null && this.rand() < 0.45) {
            const j = Math.round(t * (colNodes.length - 1)) + (this.rand() < 0.5 ? -1 : 1);
            if (colNodes[j] && !p.edges.includes(colNodes[j].id)) p.edges.push(colNodes[j].id);
          }
        });
        colNodes.forEach((c, j) => {
          if (prev.some((p) => p.edges.includes(c.id))) return;
          const t = colNodes.length === 1 ? 0 : j / (colNodes.length - 1);
          prev[Math.round(t * (prev.length - 1))].edges.push(c.id);
        });
        nodes.push(...colNodes);
        prev = colNodes;
      }
      // Guarantee a Sky Dock right before the boss and a place to spend cogs midway.
      const pre = nodes.filter((n) => n.col === BOSS_COL - 1);
      if (!pre.some((n) => n.enc === 'hangar')) Object.assign(this.pick(pre), { enc: 'hangar', enemy: undefined, cloud: false });
      const mid = nodes.filter((n) => n.col === A.midCol);
      if (!mid.some((n) => n.enc === 'trader' || n.enc === 'hangar')) Object.assign(this.pick(mid), { enc: 'trader', enemy: undefined });
      this.paceFights(nodes);
      for (const n of nodes) if (!n.enemy) delete n.enemy;
      this.map = { nodes, current: 'n0', visited: ['n0'] };
    }
    // Every route must keep fighting: along any path, at most BALANCE.maxCalmRun non-fight stops in
    // a row and BALANCE.maxCalm in all. A stop that would break either becomes a Pirate Patrol (the
    // guaranteed Sky Dock and mid-route trader stay as they are).
    paceFights(nodes) {
      const A = this.areaDef(), BOSS_COL = A.cols;
      const fight = (n) => ['patrol', 'lair', 'beacon', 'start'].includes(n.enc);
      const run = { n0: 0 }, calm = { n0: 0 };
      for (let col = 1; col < BOSS_COL; col++) {
        for (const n of nodes.filter((x) => x.col === col)) {
          const parents = nodes.filter((p) => p.edges.includes(n.id));
          const pr = Math.max(...parents.map((p) => run[p.id])), pc = Math.max(...parents.map((p) => calm[p.id]));
          const forced = (col === BOSS_COL - 1 && n.enc === 'hangar') || (col === A.midCol && n.enc === 'trader');
          if (!fight(n) && !forced && (pr >= BALANCE.maxCalmRun || pc >= BALANCE.maxCalm)) {
            n.enc = 'patrol';
            n.enemy = this.pick(A.tiers.find((t) => col <= t.upTo).pool);
            n.biome = A.bands.find((b) => col <= b.upTo).biome;
          }
          run[n.id] = fight(n) ? 0 : pr + 1;
          calm[n.id] = pc + (fight(n) ? 0 : 1);
        }
      }
    }
    rollNodeType(col) {
      if (col === 1) return this.rand() < 0.75 ? 'patrol' : 'beacon';
      const w = { ...this.areaDef().nodeWeights };
      if (col < this.areaDef().lairFrom) w.lair = 0;
      if (col < 3) w.hangar = 0;
      return this.weighted(w);
    }
    node(id) { return this.map.nodes.find((n) => n.id === id); }
    currentNode() { return this.node(this.map.current); }
    // Whether the player can see what a node is.
    nodeKnown(n) {
      if (this.map.visited.includes(n.id) || n.enc === 'boss') return true;
      const ahead = n.col - this.currentNode().col;
      if (ahead > this.sight()) return false;
      if (n.cloud && ahead > 1 && !this.telescopeOut()) return false;
      return true;
    }
    mapChoices() { return this.currentNode().edges.map((id) => this.node(id)); }
    enterMap() {
      if (this.won) { this.phase = 'victory'; return; }
      this.phase = this.portalReady ? 'portal' : 'map';
    }
    travel(id) {
      if (this.phase !== 'map' || !this.currentNode().edges.includes(id)) return false;
      const n = this.node(id);
      this.map.current = id;
      this.map.visited.push(id);
      if (this.sightMoves > 0) this.sightMoves--;
      this.depth = n.col;
      this.emit('travel', { id });
      this.startEncounter(n);
      return true;
    }
    startEncounter(node) {
      const enc = ENCOUNTERS[node.enc];
      this.stats.encounters++;
      this.say(`— ${node.enc === 'boss' ? ENEMIES[node.enemy].name : enc.name} —`, 'head');
      if (node.enc === 'boss') { this.stats.reachedBoss = true; this.stats.bossesFought.push(node.enemy); }
      if (['patrol', 'lair', 'boss'].includes(node.enc)) return this.startCombat(node.enemy, node);
      if (node.enc === 'hangar') return this.enterHangar(node);
      if (node.enc === 'trader') return this.enterShop(node);
      this.event = { enc: node.enc, node: node.id, rolls: [], options: null, stage: null, logStart: this.logId, next: null, hpBefore: this.totalHp() };
      this.phase = 'event';
      if (node.enc === 'storm') this.runStorm();
      else if (node.enc === 'smog') this.runSmog();
      else if (node.enc === 'beacon') this.runBeacon(node);
      else if (node.enc === 'guild') this.runGuild();
      else if (node.enc === 'derelict') this.runDerelict();
      else if (node.enc === 'rift') this.runRift();
    }
    totalHp() { return this.core.hp + this.cards().reduce((s, c) => s + c.hp, 0); }
    setOptions(stage, options) { this.event.stage = stage; this.event.options = options; }
    // Rolls where an attack aims. Direct fire comes in level from the bow: a deck (d6 1-4 the hull,
    // 5-6 the upper deck) and how far along it (1-2 the front module, 3-4 the second, 5-6 the third).
    // Plunging fire (bombs, lightning, lobbed shells) drops onto a column: 1-3 stern 1-3, 4-6 bow 1-3.
    rollAim(kind = 'direct', label = null) {
      if (kind === 'plunge') return { kind, col: PLUNGE_TABLE[this.d6(label || 'Column') - 1] };
      return { kind, row: ROW_TABLE[this.d6(label || 'Deck') - 1], depth: DEPTH_TABLE[this.d6('Depth') - 1] };
    }
    aimName(aim) {
      if (!aim) return '';
      if (aim.kind === 'plunge') return aim.col < 0 ? `stern column ${-aim.col}` : aim.col > 0 ? `bow column ${aim.col}` : 'the bridge';
      if (aim.zone) return `${aim.zone} columns`;
      return `${ROW_NAME[aim.row]}${aim.depth != null ? `, module ${aim.depth + 1} from the front` : ''}`;
    }

    // ---------- events ----------
    runStorm() {
      const r = this.d6('Storm Front');
      this.event.rolls.push(r);
      if (r === 1) {
        const aim = this.rollAim('plunge');
        this.say(`Rolled 1: lightning forks down onto your ${this.aimName(aim)}!`, 'bad');
        this.applyPlan(this.planAim(aim, 2, true), 'storm');
      } else if (r === 2) {
        if (this.weight() >= 6) this.say(`Rolled 2: a crosswind howls, but your ${fmt(this.weight())}-Weight hull holds steady.`, 'good');
        else {
          this.say('Rolled 2: a crosswind batters both ends of the ship.', 'bad');
          for (const c of [this.front(HULL), this.tail(HULL)]) if (c && !this.coreDead() && this.locate(c.uid)) this.applyPlan(this.planOn(c, 1), 'storm');
        }
      } else if (r === 3) {
        this.say('Rolled 3: a downdraft drags you toward the clouds below. Lighten the ship or brace.', 'warn');
        const edges = [...new Set([this.front(HULL), this.tail(HULL), this.front(UPPER)].filter(Boolean))];
        const opts = edges.map((c) => ({ id: 'drop-' + c.uid, label: `Jettison the ${this.def(c).name}`, desc: `Cut it loose from the ${this.placeName(this.locate(c.uid)).toLowerCase()}.` }));
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
        this.say('Rolled 6: a roaring tailwind. +1 sight for two legs and +2 Steam on your next first turn.', 'good');
        this.sightMoves = 2;
        this.combatBonusSteam += 2;
      }
      this.finishStormCheck();
    }
    runSmog() {
      const r = this.d6('Smog Bank');
      this.event.rolls.push(r);
      if (r === 1) {
        const weapons = this.cards().filter((c) => this.isWeapon(c));
        if (weapons.length) { const w = this.pick(weapons); this.say('Rolled 1: soot clogs a weapon. It stays fouled until your next fight ends.', 'bad'); this.placeTokenOn(w.uid, 'gas'); }
        else this.say('Rolled 1: soot drifts through an empty gun deck. No harm done.', 'muted');
      } else if (r === 2) {
        this.say('Rolled 2: choking fumes pour into the gondola.', 'warn');
        this.setOptions('fumes', [
          { id: 'pay', label: 'Buy filter masks', desc: this.cogs >= 10 ? 'Pay 10 cogs.' : `You only have ${this.cogs} cogs.`, disabled: this.cogs < 10 },
          { id: 'endure', label: 'Endure it', desc: 'Your Core takes 2 damage.' },
        ].filter((o) => !o.disabled));
      } else if (r === 3) {
        this.say("Rolled 3: a smuggler's cache hidden in the smoke.", 'good');
        this.setOptions('cache', [{ id: 'cogs', label: 'Take the coin', desc: '+22 cogs.' }, { id: 'part', label: 'Take the crate', desc: 'A random uncommon part.' }]);
      } else if (r === 4) {
        this.say('Rolled 4: scrap heaps on a factory roof.', 'good');
        this.setOptions('scrap', [{ id: 'repair', label: 'Patch the hull', desc: 'Repair 2 on every module and 1 on the Core.' }, { id: 'cogs', label: 'Sell the scrap', desc: '+14 cogs.' }]);
      } else if (r === 5) {
        this.say('Rolled 5: an abandoned foundry with parts still on the racks.', 'good');
        this.event.loot = { ids: this.partOffer(2), keep: 1 };
      } else {
        this.say('Rolled 6: hot air from the chimneys lifts you high. +1 sight for two legs and +2 Steam next fight.', 'good');
        this.sightMoves = 2;
        this.combatBonusSteam += 2;
      }
      this.finishStormCheck();
    }
    finishStormCheck() {
      if (this.event && !this.event.options && this.totalHp() >= this.event.hpBefore) this.questEvent('cleanStorm');
    }
    runBeacon(node) {
      const r = this.d6('Distress Beacon');
      this.event.rolls.push(r);
      this.event.next = node.enemy;
      this.event.mods = {};
      if (r === 1) {
        const aim = this.rollAim('plunge');
        this.say(`Rolled 1: debris from the wreck rains onto your ${this.aimName(aim)}.`, 'bad');
        this.applyPlan(this.planAim(aim, 2), 'storm');
      } else if (r === 2) {
        const aim = this.rollAim('plunge');
        this.say(`Rolled 2: burning wreckage falls onto your ${this.aimName(aim)}.`, 'bad');
        this.placeToken('fire', aim);
      } else if (r === 3) {
        const weapons = this.cards().filter((c) => this.isWeapon(c));
        const target = weapons.length ? this.pick(weapons) : this.cards()[0];
        if (target) { this.say('Rolled 3: a gas leak fouls one of your modules.', 'bad'); this.placeTokenOn(target.uid, 'gas'); }
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
      if (!this.coreDead()) this.say(`A ${ENEMIES[node.enemy].name} drops out of the clouds!`, 'warn');
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
    runDerelict() {
      const r = this.d6('Derelict Hulk');
      this.event.rolls.push(r);
      if (r === 1) {
        const aim = this.rollAim('plunge');
        this.say(`Rolled 1: a booby trap! Your ${this.aimName(aim)} catches fire.`, 'bad');
        this.placeToken('fire', aim);
      } else if (r === 2) {
        this.say('Rolled 2: the deck groans under you. Something glints in the hold below.', 'warn');
        this.setOptions('collapse', [
          { id: 'dive', label: 'Go down for it', desc: 'Your Core takes 3; take a rare part.' },
          { id: 'leave', label: 'Leave it', desc: 'Fly on safely.' },
        ]);
      } else if (r === 3) {
        this.say('Rolled 3: survivors! They patch your ship in thanks.', 'good');
        for (const c of this.cards()) this.healCard(c, 2);
      } else if (r === 4) {
        this.say('Rolled 4: the captain\'s strongbox.', 'good');
        this.gainCogs(18, 'strongbox');
      } else if (r === 5) {
        this.say('Rolled 5: the armory is still stocked.', 'good');
        this.event.loot = { ids: this.partOffer(3), keep: 1 };
      } else {
        const p = this.randomPart('normal', (x) => x.rarity === 'uncommon');
        this.say(`Rolled 6: an intact engine room. You haul out a ${PARTS[p].name}.`, 'good');
        this.pendingLoot.push(p);
        this.gainCogs(10, 'scrap');
      }
    }
    runRift() {
      const r = this.d6('Aether Rift');
      this.event.rolls.push(r);
      if (r === 1) {
        const cards = this.cards();
        this.say('Rolled 1: the rift lashes out.', 'bad');
        if (cards.length) this.damageModule(this.pick(cards).uid, 2, 'storm');
        if (!this.coreDead()) this.damageCore(1, 'storm');
      } else if (r === 2) {
        this.say('Rolled 2: a time slip. Pay the toll or feel the years.', 'warn');
        this.setOptions('slip', [
          { id: 'pay', label: 'Pay 10 cogs', desc: this.cogs >= 10 ? 'The rift takes its due.' : `You only have ${this.cogs} cogs.`, disabled: this.cogs < 10 },
          { id: 'age', label: 'Fly through', desc: 'Your Core takes 2.' },
        ].filter((o) => !o.disabled));
      } else if (r === 3) {
        const cards = this.cards();
        if (cards.length) { const c = this.pick(cards); c.bonusMax += 1; c.hp += 1; this.hit(c.uid); this.say(`Rolled 3: an echo of your ship. The ${this.def(c).name} gains +1 max Durability.`, 'good'); }
        else this.say('Rolled 3: an echo of an empty ship. Nothing happens.', 'muted');
      } else if (r === 4) {
        this.say('Rolled 4: a voice in the light offers a bargain.', 'warn');
        this.setOptions('bargain', [
          { id: 'accept', label: 'Accept', desc: 'Lose 2 max Core Durability; take a rare part.', disabled: this.maxHp(this.core) <= 4 },
          { id: 'refuse', label: 'Refuse', desc: 'Fly on.' },
        ].filter((o) => !o.disabled));
      } else if (r === 5) {
        this.say('Rolled 5: the light clears your eyes. +1 sight for three legs.', 'good');
        this.sightMoves = Math.max(this.sightMoves, 3);
        this.healCore(2);
      } else {
        this.say('Rolled 6: treasure from another sky.', 'good');
        this.event.loot = { ids: this.partOffer(2, 'normal', (x) => x.rarity === 'rare'), keep: 1 };
      }
    }
    chooseOption(id) {
      const ev = this.event;
      if (this.phase !== 'event' || !ev || !ev.options || !ev.options.some((o) => o.id === id)) return false;
      const stage = ev.stage;
      ev.options = null;
      ev.stage = null;
      if (stage === 'downdraft') {
        if (id === 'brace') { this.say('You brace. The Core groans.', 'bad'); this.damageCore(2, 'storm'); }
        else { const uid = id.slice(5); this.say(`You cut the ${this.def(this.locate(uid).card).name} loose and climb clear.`, 'warn'); this.removeCard(uid, 'jettison'); }
        this.finishStormCheck();
      } else if (stage === 'eye') {
        if (id === 'core') this.healCore(3);
        if (id === 'all') for (const c of this.cards()) this.healCard(c, 1);
        if (id === 'scavenge') { const p = this.randomPart(); this.pendingLoot.push(p); this.say(`You fish a ${PARTS[p].name} out of the debris.`, 'good'); }
        this.finishStormCheck();
      } else if (stage === 'fumes') {
        if (id === 'pay') { this.cogs -= 10; this.say('Masks on. You breathe easy.', 'good'); }
        else { this.say('You cough through it.', 'bad'); this.damageCore(2, 'storm'); }
        this.finishStormCheck();
      } else if (stage === 'cache') {
        if (id === 'cogs') this.gainCogs(22, 'cache');
        else { const p = this.randomPart('normal', (x) => x.rarity === 'uncommon'); this.pendingLoot.push(p); this.say(`The crate holds a ${PARTS[p].name}.`, 'good'); }
        this.finishStormCheck();
      } else if (stage === 'scrap') {
        if (id === 'repair') { for (const c of this.cards()) this.healCard(c, 2); this.healCore(1); }
        else this.gainCogs(14, 'scrap');
        this.finishStormCheck();
      } else if (stage === 'collapse') {
        if (id === 'dive') { this.damageCore(3, 'storm'); if (!this.coreDead()) { const p = this.randomPart('normal', (x) => x.rarity === 'rare'); this.pendingLoot.push(p); this.say(`You climb out with a ${PARTS[p].name}.`, 'good'); } }
        else this.say('You leave the hulk to the clouds.', 'muted');
      } else if (stage === 'slip') {
        if (id === 'pay') { this.cogs -= 10; this.say('The rift takes its toll.', 'muted'); }
        else this.damageCore(2, 'storm');
      } else if (stage === 'bargain') {
        if (id === 'accept') { this.core.baseMax -= 2; this.clampAll(); const p = this.randomPart('normal', (x) => x.rarity === 'rare'); this.pendingLoot.push(p); this.say(`The bargain is struck: a ${PARTS[p].name}.`, 'good'); }
        else this.say('You refuse, and the light fades.', 'muted');
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
        this.startCombat(ev.next, this.node(ev.node), { block: mods.block || 0, loot: ev.loot || null });
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
    enterHangar(node) {
      this.hangar = { enc: 'hangar', dock: [], roll: null };
      this.phase = 'hangar';
      this.say('Full reassembly: detach and reattach any module.');
    }
    detach(uid) {
      if (this.phase !== 'hangar') return false;
      const loc = this.locate(uid);
      if (!loc || loc.card === this.core) return false;
      this.unplace(loc);
      this.hangar.dock.push(loc.card);
      this.clampAll();
      return true;
    }
    attach(dockIdx, pos) {
      if (this.phase !== 'hangar' || !this.canInstall(pos)) return false;
      const card = this.hangar.dock.splice(dockIdx, 1)[0];
      if (!card) return false;
      this.place(card, pos);
      this.clampAll();
      this.emit('install', { uid: card.uid, row: pos.row, col: pos.col });
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

    // ---------- Trading Zeppelin ----------
    price(id) { return Math.round(PRICES[PARTS[id].rarity] * (this.core && this.core.id === 'privateer' ? 0.85 : 1)); }
    enterShop(node) {
      const stock = [
        ...this.partOffer(2, 'normal', (p) => p.rarity === 'common'),
        ...this.partOffer(2, 'normal', (p) => p.rarity === 'uncommon'),
        ...this.partOffer(1, 'normal', (p) => p.rarity === 'rare'),
      ];
      this.shop = { node: node.id, stock: [...new Set(stock)].map((id) => ({ id, price: this.price(id), sold: false })), core: false, full: false, charts: false, sold: 0 };
      this.phase = 'shop';
      this.say(`The merchant opens the hold. You carry ${this.cogs} cogs.`);
    }
    buy(i) {
      const item = this.shop && this.shop.stock[i];
      if (!item || item.sold || this.cogs < item.price) return false;
      this.cogs -= item.price;
      item.sold = true;
      this.pendingLoot.push(item.id);
      this.emit('cogs', { amount: -item.price });
      this.say(`Bought a ${PARTS[item.id].name} for ${item.price} cogs.`, 'you');
      return true;
    }
    buyService(kind) {
      const sh = this.shop;
      const cost = { core: PRICES.coreRepair, full: PRICES.fullRepair, charts: PRICES.charts }[kind];
      if (!sh || sh[kind] || cost == null || this.cogs < cost) return false;
      this.cogs -= cost;
      sh[kind] = true;
      this.emit('cogs', { amount: -cost });
      if (kind === 'core') this.healCore(4);
      if (kind === 'full') { for (const c of this.cards()) this.healCard(c, 99); this.say('Every module restored.', 'good'); }
      if (kind === 'charts') { this.sightMoves = Math.max(this.sightMoves, 3); this.say('Sky charts: +1 sight for three legs.', 'good'); }
      return true;
    }
    sellValue(card) { return Math.floor(this.price(card.id) / 2); }
    sell(uid) {
      if (this.phase !== 'shop' || this.shop.sold >= 2) return false;
      const loc = this.locate(uid);
      if (!loc || loc.card === this.core) return false;
      const v = this.sellValue(loc.card);
      this.say(`Sold the ${this.def(loc.card).name}.`, 'muted');
      this.removeCard(uid, 'trade');
      this.shop.sold++;
      this.gainCogs(v, 'sale');
      return true;
    }
    leaveShop() {
      if (this.phase !== 'shop') return false;
      this.shop = null;
      this.afterEncounter('Trading Zeppelin');
      return true;
    }

    // ---------- contracts ----------
    questEvent(ev) {
      const q = this.quest;
      if (!q) return;
      const done =
        (q === 'survivor' && ev === 'cleanStorm') ||
        (q === 'hoarder' && ev === 'installCargo') ||
        (q === 'bounty' && ev === 'eliteKill') ||
        (q === 'ironclad' && ev === 'fireWin') ||
        (q === 'marksman' && ev === 'quickWin') ||
        (q === 'rammer' && ev === 'ramKill');
      if (!done) return;
      const quest = QUESTS.find((x) => x.id === q);
      this.quest = null;
      this.stats.quests++;
      this.emit('quest', { id: q });
      this.say(`Contract complete: ${quest.name}! ${quest.reward}`, 'good');
      if (q === 'bounty') { this.queueOffer({ ids: this.partOffer(3, 'normal', (p) => p.rarity === 'rare'), keep: 1 }); this.gainCogs(25, 'bounty'); }
      if (q === 'survivor') { this.pendingLoot.push('plating'); this.healCore(99); for (const c of this.cards()) this.healCard(c, 99); }
      if (q === 'hoarder') this.pendingLoot.push('hatch');
      if (q === 'ironclad') this.offerChoice('ironclad', 'Choose a module for +2 max Durability', this.cards().map((c) => c.uid));
      if (q === 'marksman') { this.queueOffer({ ids: this.partOffer(3, 'normal', (p) => p.type === 'weapon' && p.rarity === 'uncommon'), keep: 1 }); this.gainCogs(15, 'contract'); }
      if (q === 'rammer') { this.core.bonusMax += 2; this.core.hp += 2; }
    }

    // ---------- damage to the player ----------
    coreDead() { return this.core.hp <= 0; }
    healCore(n) {
      const before = this.core.hp;
      this.core.hp = Math.min(this.maxHp(this.core), this.core.hp + n);
      if (this.core.hp > before) { this.emit('heal', { uid: 'core', amount: this.core.hp - before, hp: this.core.hp }); this.say(`Core repaired to ${this.core.hp}/${this.maxHp(this.core)}.`, 'good'); }
    }
    healCard(card, n) {
      const before = card.hp;
      card.hp = Math.min(this.maxHp(card), card.hp + n);
      if (card.hp > before) { this.emit('heal', { uid: card.uid, amount: card.hp - before, hp: card.hp }); this.hit(card.uid); }
      return card.hp - before;
    }
    damageCore(n, src) {
      if (n <= 0) return;
      this.core.hp -= n;
      this.stats.dmgTaken += n;
      this.hit('core');
      this.emit('hit', { uid: 'core', dmg: n, src, hp: this.core.hp });
      this.say(`Your Core takes ${n} (${Math.max(0, this.core.hp)}/${this.maxHp(this.core)}).`, 'bad');
      this.buildCharge(src);
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
      this.emit('hit', { uid, dmg: n, src, hp: loc.card.hp });
      this.say(`${this.def(loc.card).name} takes ${n} (${Math.max(0, loc.card.hp)}/${this.maxHp(loc.card)}).`, 'bad');
      this.buildCharge(src);
      if (loc.card.hp <= 0) this.removeCard(uid, src);
    }
    // Tempest Core: every hit in a fight winds up Charge; lightning winds it twice as fast.
    buildCharge(src) {
      if (this.core.id !== 'tempest' || !this.combat || this.combat.over) return;
      this.core.charge = Math.min(BALANCE.chargeCap, (this.core.charge || 0) + (src === 'lightning' ? 2 : 1));
    }
    removeCard(uid, src) {
      const loc = this.locate(uid);
      if (!loc || loc.card === this.core) return;
      const card = loc.card;
      const nbs = this.neighborsOf(loc).map((c) => ({ card: c, buried: this.isBuried(this.locate(c.uid)) }));
      this.unplace(loc);
      const violent = !['scrap', 'jettison', 'trade'].includes(src);
      this.emit('destroyed', { uid: card.uid, id: card.id, row: loc.row, col: loc.col, src, violent });
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
        for (const nb of nbs) if (this.locate(nb.card.uid)) this.damageModule(nb.card.uid, 2, 'explosion');
      }
      this.clampAll();
    }

    // Works out who takes how much from a hit, without changing anything. Used for both
    // resolving attacks and previewing the enemy's telegraphed intent.
    // A hit on one module: armor shrugs off part of it, a buried armor neighbour soaks some,
    // and a braced Deflector Vane turns it aside.
    planOn(target, dmg, extra = {}) {
      if (target === this.core || target === 'core') return [{ uid: 'core', dmg, exposed: true, ...extra }];
      let prevented = 0;
      if (this.combat && this.combat.braced && this.combat.braced.includes(target.uid)) {
        extra = { ...extra, braced: true };
        prevented += Math.min(dmg, BRACE);
        dmg = Math.max(0, dmg - BRACE);
      }
      if (ARMOR[target.id]) {
        const cut = Math.min(dmg, ARMOR[target.id].reduce);
        return [{ uid: target.uid, dmg: dmg - cut, ...extra, prevented: prevented + cut }];
      }
      if (prevented) extra = { ...extra, prevented };
      const loc = this.locate(target.uid);
      const guard = this.neighborsOf(loc).find((c) => ARMOR[c.id] && this.isBuried(this.locate(c.uid)));
      const plan = [{ uid: target.uid, dmg, ...extra }];
      if (guard && dmg > 0) {
        const soak = Math.min(dmg, ARMOR[guard.id].soak);
        plan[0].dmg -= soak;
        plan.push({ uid: guard.uid, dmg: soak, soak: true });
      }
      return plan;
    }
    // Direct fire along a deck: it meets the front module first; armor at the front catches shots
    // aimed deeper. An empty upper deck lets the shot fall to the hull; an empty bow hull exposes the Core.
    planDirect(r, depth, dmg) {
      let line = this.lineOfFire(r);
      if (!line.length && r === UPPER) line = this.lineOfFire(HULL);
      if (!line.length) return this.planOn(this.core, dmg);
      const i = depth < line.length ? depth : 0;
      const head = line[0];
      if (i > 0 && ARMOR[head.id]) return this.planOn(head, dmg, { intercept: true });
      return this.planOn(line[i], dmg);
    }
    // The column plunging fire actually lands on: an empty one lets it drift in toward the Core.
    landColumn(col) {
      while (col !== 0 && !this.at(col, HULL) && !this.at(col, UPPER)) col -= Math.sign(col);
      return col;
    }
    // Plunging fire hits the top of its column: the upper module, else the hull module, else (over
    // the Core) the bridge or the Core. Lightning arcs past armor to the first thing that isn't.
    planPlunge(col, dmg, lightning = false) {
      if (lightning) {
        const rod = this.cards().find((c) => c.id === 'lightningrod' && this.openSky(this.locate(c.uid)));
        if (rod) return [{ uid: rod.uid, dmg: 0, rod: true }];
      }
      col = this.landColumn(col);
      const stack = [this.at(col, UPPER), col === 0 ? this.core : this.at(col, HULL)].filter(Boolean);
      if (lightning) {
        const t = stack.find((c) => c === this.core || !ARMOR[c.id]) || stack[0];
        if (this.shipDef().insulated) dmg = Math.max(0, dmg - 1);
        return this.planOn(t, dmg, { lightning: t !== stack[0], bolt: true });
      }
      return this.planOn(stack[0], dmg);
    }
    planAim(aim, dmg, lightning = false) {
      if (aim.kind === 'plunge') return this.planPlunge(aim.col, dmg, lightning);
      return this.planDirect(aim.row, aim.depth || 0, dmg);
    }
    applyPlan(plan, src) {
      for (const p of plan) {
        if (this.coreDead()) return;
        if (p.uid !== 'core' && !this.locate(p.uid)) continue;
        if (p.braced) { this.say(p.dmg > 0 ? 'The Deflector Vane takes the worst of the hit.' : 'The Deflector Vane turns the hit aside.', 'good'); this.combat.braced = []; if (p.dmg <= 0) { this.emit('block', { uid: p.uid }); continue; } }
        if (p.rod) { this.say('The Lightning Rod drinks the bolt: +1 Steam next turn.', 'good'); this.emit('block', { uid: p.uid }); if (this.combat) this.combat.rodCharge += 1; continue; }
        if (p.lightning) this.say('Lightning arcs straight past the plating!', 'warn');
        if (p.intercept) this.say('The armor at the front takes the hit.');
        if (p.soak) this.say('A buried bulkhead soaks some of the blow.');
        if (p.dmg <= 0) { this.emit('block', { uid: p.uid }); this.say(`${this.nameOf(this.locate(p.uid).card)} shrugs it off.`); continue; }
        this.damageModule(p.uid, p.dmg, p.bolt ? 'lightning' : src);
      }
      this.reflect(plan, src);
    }
    // Leviathan Plating: half of everything the ship blocked in an enemy attack is flung back.
    reflect(plan, src) {
      if (!this.combat || this.combat.over || !['attack', 'ram'].includes(src) || !this.has('leviplating') || this.coreDead()) return;
      const blocked = plan.reduce((n, p) => n + (p.prevented || 0), 0);
      const back = Math.floor(blocked / 2);
      if (back <= 0) return;
      this.emit('reflect', { dmg: back });
      this.say(`The Leviathan Plating flings ${back} back at the attacker!`, 'good');
      this.damageEnemy(back, { pierce: true, source: 'reflect', noVuln: true });
    }
    // Where a token aimed this way lands (front armor catches it too).
    tokenTarget(aim) { return this.planAim(aim, 1)[0].uid; }
    tokenImmune(card, token) {
      if (card === this.core) return false;
      const nbs = this.neighbors(card.uid);
      if (token === 'fire') return nbs.some((c) => c.id === 'sprinkler');
      return nbs.some((c) => c.id === 'scrubber');
    }
    placeToken(token, aim) { this.placeTokenOn(this.tokenTarget(aim), token); }
    placeTokenOn(uid, token) {
      const card = this.locate(uid).card;
      if (this.tokenImmune(card, token)) { this.say(`${this.nameOf(card)} is protected from ${TOKENS[token].name}.`, 'good'); return; }
      card.tokens[token] = true;
      this.hit(uid);
      this.emit('token', { uid, token });
      this.say(`${TOKENS[token].name} on your ${this.nameOf(card)}!`, 'bad');
      if (token === 'fire' && this.combat) this.combat.fireAfflicted = true;
    }

    // ---------- combat ----------
    // Pirates further along the route are tougher (BALANCE.hpPerColumn, BALANCE.veteranColumns).
    startCombat(enemyId, node, opts = {}) {
      const e = ENEMIES[enemyId];
      const col = node.col || 1;
      const A = this.areaDef();
      const hpScale = e.boss ? BALANCE.bossHp * A.bossHp : (1 + BALANCE.hpPerColumn * (col - 1)) * A.hp;
      const hp = Math.round(e.hp * hpScale);
      const dmgBonus = e.boss ? (this.area ? A.dmg : 0) : A.dmg + A.veteranColumns.filter((c) => col >= c).length;
      this.event = null;
      this.combat = {
        enc: node.enc || 'patrol', enemyId, col,
        enemy: { id: enemyId, name: e.name, weight: e.weight, hp, max: hp, hpScale, dmgBonus, block: opts.block || 0, ward: 0, armor: e.armor || 0, burn: 0, weak: 0, vuln: 0, charge: 0, phase: 0, intent: null, wound: 0, stunned: false },
        galeSide: 'bow', turnDamage: 0, rodCharge: 0, spring: 0, firedThisRound: false,
        round: 0, steam: 0, active: null, over: false,
        evading: false, evadeUsed: false, evadeStreak: 0, freeSwapUsed: false, gyroUsed: false, overclock: false, abilityUsed: false,
        braced: [],
        fireAfflicted: this.cards().some((c) => c.tokens.fire) || this.core.tokens.fire,
        lastSource: null, loot: opts.loot || null,
      };
      for (const c of this.cards()) { c.fired = 0; c.reload = 0; }
      this.phase = 'combat';
      this.emit('combatStart', { enemyId });
      this.say(`${e.name} engages! Weight ${e.weight}, Durability ${hp}.`, 'warn');
      if (e.gimmick) this.say(e.gimmick, 'warn');
      if (this.combat.enemy.block) this.say(`It starts behind ${this.combat.enemy.block} Block.`, 'warn');
      const lighter = this.weight() < e.weight;
      if (lighter) { this.combatBonusSteam += 1; this.say(`Your ship is lighter (${fmt(this.weight())} vs ${e.weight}): you outpace it for +1 Steam on your first turn.`, 'good'); }
      this.rollIntent();
      this.beginPlayerTurn();
    }
    enemyDef() { return ENEMIES[this.combat.enemyId]; }
    phaseIndex(hp) {
      const phases = this.enemyDef().phases;
      const scale = this.combat.enemy.hpScale || 1;
      const i = phases.findIndex((p) => hp >= Math.round(p.min * scale));
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
      // Direct fire comes in along a deck; plunging fire (bombs, lightning, lobbed shells) drops onto a column.
      const kind = intent.aim || 'direct';
      if (['shot', 'token'].includes(intent.kind)) intent.target = this.rollAim(kind);
      else if (intent.kind === 'rake') {
        // A rake sweeps a whole deck, or bombs every column on one side.
        const r = this.d6('Sweep');
        intent.target = kind === 'plunge' ? { kind, zone: r <= 3 ? 'stern' : 'bow' } : { kind, row: ROW_TABLE[r - 1] };
      }
      en.intent = intent;
      this.emit('intent', { intent });
    }
    isAttack(intent) { return ['shot', 'rake', 'broadside', 'ram'].includes(intent.kind) || (intent.kind === 'token' && intent.dmg > 0); }
    ramResist() {
      let r = Math.max(0, Math.floor((this.weight() - this.combat.enemy.weight) / 2));
      if (this.core.id === 'battleship') r += 2;
      if (this.has('gyro')) r += 2;
      if (this.has('titanfist')) r += 2;
      return r;
    }
    // After round 10 the enemy grows Enraged: +1 damage per hit for every round past 10.
    enrage() { return this.combat ? Math.max(0, this.combat.round - ENRAGE_ROUND) : 0; }
    intentDamage(intent) {
      const en = this.combat.enemy;
      let d = (intent.dmg || 0) + en.charge - (en.weak > 0 ? 1 : 0);
      if (intent.dmg) d += this.enrage() + en.dmgBonus + en.wound;
      if (this.isAttack(intent)) d -= this.combat.flak || 0;
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
      plan = this.intentPlan(it, dmg);
      if (it.kind === 'token') plan = [{ uid: this.tokenTarget(it.target), dmg: dmg > 0 ? plan[0].dmg : 0, token: it.token }];
      if (c.evading && this.isAttack(it)) plan = plan.map((p) => ({ ...p, dmg: 0, evaded: true }));
      return { intent: it, dmg, plan };
    }
    // Who an attacking intent hits, as a plan (a token intent's plan is for its damage).
    intentPlan(it, dmg) {
      if (it.kind === 'shot' || it.kind === 'token') return this.planAim(it.target, dmg, !!it.lightning);
      if (it.kind === 'ram') return this.planDirect(HULL, 0, dmg);
      if (it.kind === 'broadside') return this.broadsidePlan(dmg);
      if (it.kind === 'rake') return this.rakePlan(it.target, dmg);
      return [];
    }
    // A broadside hits the front of the hull (or the Core) and the front of the upper deck.
    broadsidePlan(dmg) {
      const plan = this.planDirect(HULL, 0, dmg);
      if (this.front(UPPER)) plan.push(...this.planDirect(UPPER, 0, dmg));
      return plan;
    }
    // A raking sweep hits up to three modules along a deck, front armor catching each shot;
    // a bombing sweep hits the top of every column on one side (the bridge or Core if it is bare).
    rakePlan(target, dmg) {
      if (target.zone) {
        const d = target.zone === 'stern' ? -1 : 1;
        const cols = [1, 2, 3].map((k) => d * k).filter((col) => this.at(col, HULL));
        return (cols.length ? cols : [0]).flatMap((col) => this.planPlunge(col, dmg));
      }
      let r = target.row;
      if (r === UPPER && !this.front(UPPER)) r = HULL;
      const n = Math.max(1, Math.min(3, this.lineOfFire(r).length));
      const plan = [];
      for (let i = 0; i < n; i++) plan.push(...this.planDirect(r, i, dmg));
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
      c.steam = this.steamCap() + (c.round === 1 ? this.combatBonusSteam + (this.shipDef().jump || 0) : 0) + c.rodCharge;
      if (c.round === 1) this.combatBonusSteam = 0;
      c.rodCharge = 0;
      c.turnDamage = 0;
      if (this.has('mainspring')) {
        const before = c.spring || 0;
        c.spring = c.round === 1 || c.firedThisRound ? Math.min(4, before + 1) : 0;
        if (c.spring < before) this.say('No gun fired: the Grand Mainspring runs down.', 'warn');
        else if (c.spring > before) this.say(`The Grand Mainspring winds tighter: weapons +${c.spring}.`, 'good');
      }
      c.firedThisRound = false;
      for (const x of this.cards()) { x.fired = 0; if (x.reload > 0) x.reload--; }
      c.evadeUsed = false; c.freeSwapUsed = false; c.galeSwaps = 0; c.gyroUsed = false; c.overclock = false; c.abilityUsed = false;
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
      if (c.enemyId === 'colossus' && c.turnDamage >= SNAP_DAMAGE) {
        c.enemy.wound = 0;
        c.enemy.stunned = true;
        this.emit('snap', {});
        this.say(`You dealt ${c.turnDamage} this turn: the Mainspring snaps! The Colossus loses its next move.`, 'good');
      }
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
        this.say(`${theName(en.name)} burns for ${en.burn}.`, 'good');
        this.damageEnemy(en.burn, { pierce: true, source: 'burn', noVuln: true });
        en.burn--;
        if (this.checkEnd()) return;
      }
      if (en.stunned) { en.stunned = false; this.say(`${theName(en.name)} shudders, its spring unwound. It does nothing.`, 'good'); }
      else this.executeIntent(en.intent);
      if (this.checkEnd()) return;
      if (c.enemyId === 'stormqueen') this.gale();
      if (c.enemyId === 'colossus') { en.wound++; this.say(`The Mainspring tightens: +${en.wound} damage per hit.`, 'warn'); }
      if (this.has('stormheart')) {
        this.emit('stormheart', {});
        this.say('The Storm Heart lashes out with lightning.', 'good');
        this.damageEnemy(2, { pierce: true, source: 'lightning' });
        if (this.checkEnd()) return;
      }
      if (en.weak > 0) en.weak--;
      if (en.vuln > 0) en.vuln--;
      c.braced = [];
      c.flak = 0;
      c.evadeStreak = c.evading ? c.evadeStreak + 1 : 0;
      c.evading = false;
      if (this.enrage() === 1) this.say(`${theName(en.name)} is Enraged: its hits grow stronger every round.`, 'warn');
      this.rollIntent();
      this.beginPlayerTurn();
    }
    // Storm Queen: her winds shove two modules past each other, in turn the two at the prow, the
    // two at the stern tail, and the two at the front of the upper deck.
    galeTargets(zone) {
      let pair;
      if (zone === 'bow') { const n = this.hullCount('bow'); pair = [this.at(n, HULL), this.at(n - 1, HULL)]; }
      else if (zone === 'stern') { const n = this.hullCount('stern'); pair = [this.at(-n, HULL), this.at(-n + 1, HULL)]; }
      else pair = this.lineOfFire(UPPER).slice(0, 2);
      if (pair.length < 2 || !pair[0] || !pair[1] || pair.some((c) => c.tokens.glue)) return null;
      return pair;
    }
    gale() {
      const c = this.combat;
      const zone = c.galeSide;
      c.galeSide = { bow: 'stern', stern: 'deck', deck: 'bow' }[zone];
      const pair = this.galeTargets(zone);
      const where = { bow: 'prow', stern: 'stern', deck: 'upper deck' }[zone];
      if (!pair) { this.say(`The gale howls past your ${where}.`); return; }
      this.exchange(pair[0], pair[1]);
      this.emit('swap', { a: pair[0].uid, b: pair[1].uid, gale: true, zone });
      this.say(`Gale Force! Your ${this.def(pair[0]).name} and ${this.def(pair[1]).name} are shoved past each other.`, 'warn');
    }
    // Two modules trade slots.
    exchange(a, b) {
      const la = this.locate(a.uid), lb = this.locate(b.uid);
      this.set(la.col, la.row, b); this.set(lb.col, lb.row, a);
      this.clampAll();
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
        this.emit('ram', { enemy: true });
        this.say(`It rams your prow and takes ${it.self} itself.`, 'warn');
        this.applyPlan(this.intentPlan(it, dmg), 'ram');
        if (this.coreDead()) return;
        this.damageEnemy(it.self, { pierce: true, source: 'recoil', noVuln: true });
      } else if (it.kind === 'shot') {
        this.emit('enemyShot', { target: it.target, dmg, lightning: !!it.lightning });
        this.applyPlan(this.intentPlan(it, dmg), 'attack');
      } else if (it.kind === 'broadside') {
        this.emit('enemyShot', { broadside: true, dmg });
        this.applyPlan(this.broadsidePlan(dmg), 'attack');
      } else if (it.kind === 'rake') {
        this.emit('enemyShot', { target: it.target, rake: true, dmg });
        this.applyPlan(this.intentPlan(it, dmg), 'attack');
      } else if (it.kind === 'token') {
        this.emit('enemyShot', { target: it.target, dmg, token: it.token });
        if (dmg > 0) this.applyPlan(this.intentPlan(it, dmg), 'attack');
        if (!this.coreDead()) this.placeToken(it.token, it.target);
      }
      en.charge = 0;
    }
    // The enemy's defences are layers a hit meets in turn, outermost first: Wards (each stops one
    // whole hit), Block (absorbs damage until its next turn) and Armor (takes a flat amount off
    // every hit). opts.pierce skips Block and Armor; opts.pierceLayers skips that many of the
    // layers present, outermost first; opts.prism breaks every Ward, strips Block and ignores Armor.
    enemyLayers() {
      const en = this.combat.enemy;
      return ['ward', 'block', 'armor'].filter((k) => en[k] > 0);
    }
    damageEnemy(n, opts = {}) {
      const c = this.combat;
      const en = c.enemy;
      if (n <= 0 || c.over) return 0;
      if (en.vuln > 0 && !opts.noVuln) n += 1;
      const present = this.enemyLayers();
      const skip = new Set(opts.prism ? present : opts.pierce ? ['block', 'armor'] : present.slice(0, opts.pierceLayers || 0));
      if (opts.prism && (en.ward > 0 || en.block > 0)) {
        this.say(`The prism splits the shot: ${[en.ward ? `${en.ward} Ward${en.ward > 1 ? 's' : ''} shattered` : '', en.block ? `${en.block} Block stripped` : ''].filter(Boolean).join(', ')}.`, 'good');
        this.emit('enemyLayers', { prism: true, ward: en.ward, block: en.block });
        en.ward = 0; en.block = 0;
      }
      if (en.ward > 0 && !skip.has('ward')) {
        en.ward--;
        this.emit('wardPop', { left: en.ward });
        this.say(`A Ward takes the whole hit (${en.ward} left).`, 'warn');
        return 0;
      }
      if (en.armor > 0 && !skip.has('armor')) {
        n -= en.armor;
        if (n <= 0) { this.say(`The shot glances off its armor (${en.armor}).`, 'warn'); this.emit('enemyBlocked', { amount: en.armor }); return 0; }
      }
      if (en.block > 0 && !skip.has('block')) {
        const absorbed = Math.min(en.block, n);
        en.block -= absorbed;
        n -= absorbed;
        this.emit('enemyBlocked', { amount: absorbed });
        this.say(`Its Block absorbs ${absorbed}.`, 'warn');
      }
      if (n <= 0) return 0;
      en.hp -= n;
      this.stats.dmgDealt += n;
      if (c.active === 'player') c.turnDamage += n;
      c.lastSource = opts.source || 'weapon';
      this.emit('enemyHit', { dmg: n, source: opts.source || 'weapon', hp: en.hp, pierce: !!(opts.pierce || opts.pierceLayers || opts.prism) });
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
      this.say(`${theName(c.enemy.name)} goes down in flames!`, 'good');
      for (const x of [this.core, ...this.cards()]) { x.tokens = noTokens(); x.fired = 0; x.reload = 0; }
      this.core.pressure = 0;
      this.core.charge = 0;
      if (this.shipDef().mendAfter && this.core.hp < this.maxHp(this.core)) { this.core.hp = Math.min(this.maxHp(this.core), this.core.hp + this.shipDef().mendAfter); this.say(`The ${this.shipDef().name}'s crew wind the Core back up (+1).`); }
      for (const b of this.cards().filter((x) => x.id === 'repair')) if (b.hp < this.maxHp(b)) { b.hp++; this.say('The Repair Bay patches itself (+1).'); }
      const def = this.enemyDef();
      if (def.elite) { this.stats.elites++; this.questEvent('eliteKill'); }
      if (c.fireAfflicted) this.questEvent('fireWin');
      if (c.round <= 3) this.questEvent('quickWin');
      if (['ram', 'bombard'].includes(c.lastSource)) this.questEvent('ramKill');
      if (def.boss) {
        this.stats.bossesKilled.push(c.enemyId);
        this.stats.areasCleared++;
        if (this.area >= AREAS.length - 1) {
          this.won = true;
          this.phase = 'victory';
          this.say(`${def.name} breaks apart and falls through the clouds. Victory!`, 'good');
          return;
        }
        this.say(`${def.name} breaks apart. Where it fell, the sky tears open into a swirling portal.`, 'good');
        this.portalReady = true;
        this.gainCogs(BALANCE.bossCogs, 'boss bounty');
        const pool = (LEGENDARY_POOLS[c.enemyId] || []).filter((id) => PARTS[id]);
        if (pool.length) { this.say(`In the wreck: ${pool.map((id) => PARTS[id].name).join(' and ')}. Take one.`, 'good'); this.lootOffers.push({ ids: pool.slice(), keep: 1, legendary: true }); }
        this.openLoot('Boss spoils', { ids: this.partOffer(3, 'elite'), keep: 1 }, []);
        return;
      }
      const tier = c.col <= 3 ? 1 : c.col <= 7 ? 2 : 3;
      this.gainCogs(6 + 3 * tier + this.d6() + (def.elite ? 20 : 0) + (this.shipDef().salvage || 0) + (this.core.id === 'privateer' ? 6 : 0), 'salvage');
      const extra = this.has('hatch') ? 1 : 0;
      const keep = this.has('hatch') && this.has('cargo') ? 2 : 1;
      const ids = this.partOffer(3 + extra, def.elite ? 'elite' : 'normal');
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
      const { card } = loc;
      const d = this.def(card);
      let cost = this.useCost(card) + (mode !== 'normal' ? 1 : 0);
      let blocked = null;
      if (!this.canFireFrom(card, loc)) blocked = this.whyNotFire(card, loc);
      else if (card.reload > 0) blocked = 'Reloading';
      else if (card.fired >= this.shotsAllowed(card)) blocked = 'Already fired';
      else if (this.combat && this.combat.steam < cost) blocked = 'Not enough Steam';
      const under = loc.row === UPPER ? this.at(loc.col, HULL) : null;
      const bonus = (under && under.id === 'harpoon' ? 1 : 0)
        + (card.id === 'sniper' && this.touching(uid, 'telescope') ? 1 : 0)
        + (this.combat && this.has('mainspring') ? this.combat.spring || 0 : 0)
        - (card.tokens.glue ? 1 : 0);
      let summary;
      if (card.id === 'cannon') summary = mode === 'aimed' ? `best of 2d6 → ${2 + bonus}–${5 + bonus}` : `d6 → ${2 + bonus}–${5 + bonus}`;
      else if (card.id === 'sniper') summary = mode === 'steady' ? `${4 + bonus} piercing` : `${d.dmg + bonus}`;
      else if (card.id === 'tesla') summary = `${this.weaponsInstalled() + bonus} piercing`;
      else if (card.id === 'titanfist') summary = `${this.fistDamage() + bonus}`;
      else summary = `${Math.max(0, d.dmg + bonus)}`;
      if (d.burn) summary += ` +${d.burn} Burn`;
      if (d.weak) summary += ` +${d.weak} Gummed`;
      if (d.volley) summary = `${d.volley} × ${Math.max(0, d.dmg + bonus)}`;
      if (d.strip) summary += ', strips Block';
      if (d.flak) summary += `, next attack −${d.flak}`;
      if (d.vuln) summary += ` +${d.vuln} Choking`;
      if (d.pierceLayers) summary += `, pierces ${d.pierceLayers} layers`;
      return { card, loc, cost, blocked, bonus, summary, modes: card.id === 'cannon' ? ['normal', 'aimed'] : card.id === 'sniper' ? ['normal', 'steady'] : ['normal'] };
    }
    fistDamage() { return Math.max(3, Math.floor(this.weight())); }
    fire(uid, mode = 'normal') {
      if (!this.canAct()) return false;
      const w = this.fireInfo(uid, mode);
      if (!w || w.blocked) return false;
      const { card, loc } = w;
      const d = this.def(card);
      this.pay(w.cost);
      card.fired++;
      const times = this.combat.overclock ? 2 : 1;
      this.combat.overclock = false;
      for (let t = 0; t < times && !this.combat.over; t++) {
        this.emit('fire', { uid, id: card.id, row: loc.row, col: loc.col, mode });
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
        if (card.id === 'titanfist') dmg = this.fistDamage();
        dmg = Math.max(0, dmg + w.bonus);
        const en = this.combat.enemy;
        if (d.strip && en.block > 0) { this.say(`The grapnel tears away ${en.block} Block.`, 'good'); en.block = 0; }
        for (let k = 0; k < (d.volley || 1) && !this.combat.over; k++) if (dmg > 0) this.damageEnemy(dmg, { pierce, pierceLayers: d.pierceLayers || 0, source: card.id });
        if (d.flak) { this.combat.flak = Math.min(4, (this.combat.flak || 0) + d.flak); this.say(`Flak fills the sky: its next attack deals ${this.combat.flak} less.`, 'good'); }
        if (d.burn) { en.burn += d.burn; this.say(`It catches fire: Burn ${en.burn}.`, 'good'); }
        if (d.weak) { en.weak += d.weak; this.say(`Its guns are gummed up for ${en.weak} turns.`, 'good'); }
        if (d.vuln) { en.vuln += d.vuln; this.say(`It is Choking for ${en.vuln} turns.`, 'good'); }
      }
      if (card.id === 'mortar' && !this.touching(uid, 'telescope')) card.reload = 2;
      if (d.cooldown) card.reload = d.cooldown + 1; // counts down at the start of each turn
      if (this.combat) this.combat.firedThisRound = true;
      this.checkEnd();
      return true;
    }
    coreAbilityInfo() {
      const a = CORES[this.core.id].ability;
      let blocked = null;
      if (this.combat && this.combat.abilityUsed) blocked = 'Used this turn';
      else if (this.combat && this.combat.steam < a.cost) blocked = 'Not enough Steam';
      else if (a.id === 'bombard' && this.core.pressure < 1) blocked = 'No Pressure';
      else if (a.id === 'discharge' && !(this.core.charge > 0)) blocked = 'No Charge';
      let summary = '';
      if (a.id === 'strafe') summary = `${this.weaponsInstalled()} dmg`;
      if (a.id === 'ram') summary = `${this.ramDamage()} dmg · bow takes 1`;
      if (a.id === 'bombard') summary = `${Math.floor(BALANCE.bombardPerPressure * this.core.pressure)} piercing`;
      if (a.id === 'overclock') summary = 'next weapon fires twice';
      if (a.id === 'board') summary = `strip Block · ${BALANCE.boardDamage} piercing`;
      if (a.id === 'discharge') summary = `${BALANCE.dischargeBase + (this.core.charge || 0)} piercing · Charge ${this.core.charge || 0}`;
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
      if (a.id === 'strafe') this.emit('strafe', { uids: this.cards().filter((x) => this.isWeapon(x)).map((x) => x.uid) });
      if (a.id === 'strafe') this.damageEnemy(this.weaponsInstalled(), { source: 'strafe' });
      if (a.id === 'bombard') this.emit('bombard', {});
      if (a.id === 'ram') {
        this.emit('ram', { player: true });
        this.damageEnemy(this.ramDamage(), { source: 'ram' });
        if (!this.combat.over) {
          const prow = this.front(HULL);
          this.say('The impact jars your prow.', 'bad');
          this.damageModule(prow ? prow.uid : 'core', 1, 'recoil');
        }
      }
      if (a.id === 'bombard') { const p = this.core.pressure; this.core.pressure = 0; this.damageEnemy(Math.floor(BALANCE.bombardPerPressure * p), { pierce: true, source: 'bombard' }); }
      if (a.id === 'overclock') { this.combat.overclock = true; this.say('Gears whir: your next weapon fires twice.', 'good'); }
      if (a.id === 'board') { const en = this.combat.enemy; if (en.block > 0) this.say(`Your boarders tear away ${en.block} Block.`, 'good'); en.block = 0; this.emit('ram', { player: true }); this.damageEnemy(BALANCE.boardDamage, { pierce: true, source: 'board' }); }
      if (a.id === 'discharge') { const q = this.core.charge; this.core.charge = 0; this.emit('discharge', { charge: q }); this.damageEnemy(BALANCE.dischargeBase + q, { pierce: true, source: 'discharge' }); }
      this.checkEnd();
      return true;
    }
    // Lighter ships dodge cheaply. Each Evade in consecutive turns costs 1 more (crew fatigue).
    evadeCost() {
      if (this.core.id === 'battleship') return null;
      const fatigue = this.combat ? this.combat.evadeStreak : 0;
      if (this.has('gyro') && this.combat && !this.combat.gyroUsed && !fatigue) return 0;
      let cost = Math.min(5, BALANCE.evadeBase + Math.floor(Math.max(0, this.weight()) / 3));
      if (this.core.id === 'airship') cost -= BALANCE.nimbleDiscount;
      if (this.working('propeller')) cost -= 1;
      return Math.max(1, cost) + fatigue * BALANCE.evadeFatigue;
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
    swapCost() {
      if (this.has('galeengine') && this.combat && (this.combat.galeSwaps || 0) < 3) return 0;
      return this.core.id === 'airship' && this.combat && !this.combat.freeSwapUsed ? 0 : 1;
    }
    // Two touching modules (side by side, or one on top of the other) can trade places.
    canSwap(uidA, uidB) {
      const a = this.locate(uidA), b = this.locate(uidB);
      if (!a || !b || !a.side || !b.side || !this.neighborsOf(a).includes(b.card)) return false;
      if (a.card.tokens.glue || b.card.tokens.glue) return false;
      return this.spendable(this.swapCost());
    }
    swapTargets(uid) {
      const l = this.locate(uid);
      if (!l || !l.side) return [];
      return this.neighborsOf(l).filter((c) => this.canSwap(uid, c.uid)).map((c) => c.uid);
    }
    swap(uidA, uidB) {
      if (!this.canSwap(uidA, uidB)) return false;
      const a = this.locate(uidA), b = this.locate(uidB);
      const cost = this.swapCost();
      if (cost === 0 && this.has('galeengine') && (this.combat.galeSwaps || 0) < 3) this.combat.galeSwaps = (this.combat.galeSwaps || 0) + 1;
      else if (cost === 0) this.combat.freeSwapUsed = true;
      this.pay(cost);
      this.exchange(a.card, b.card);
      this.emit('swap', { a: uidA, b: uidB });
      this.say(`Swapped ${this.def(a.card).name} and ${this.def(b.card).name}.`, 'you');
      if (this.has('galeengine')) { this.emit('galeShift', {}); this.damageEnemy(1, { pierce: true, source: 'lightning' }); this.checkEnd(); }
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
        const t = this.neighborsOf(loc).filter((c) => c.hp < this.maxHp(c)).map((c) => c.uid);
        if (this.touchesCore(loc) && this.core.hp < this.maxHp(this.core)) t.unshift('core');
        return t;
      }
      if (id === 'sprinkler') return [this.core, ...this.cards()].filter((c) => c.tokens.fire).map((c) => c.uid);
      if (id === 'scrubber') return [this.core, ...this.cards()].filter((c) => c.tokens.gas || c.tokens.glue).map((c) => c.uid);
      if (id === 'deflector') return this.combat && !this.combat.braced.includes(uid) ? [uid] : [];
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
      if (card.id === 'deflector') { this.combat.braced = [uid, ...this.neighbors(uid).map((c) => c.uid)]; this.emit('brace', { uid }); this.say('The Deflector Vane swings into place.', 'you'); }
      return true;
    }
  }

  return { Game, fmt, cap, COLS, SIDE_COLS, MAX_MODULES, HULL, UPPER, VENT_COST, MAX_PRESSURE };
});
