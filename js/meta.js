// Meta-progression, the Workshop: Blueprints, unlocks, upgrades, the Logbook, achievements,
// cosmetics and Storm Tiers. Kept in this browser's localStorage under its own key, apart from the
// run save.
(function (root, factory) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const api = factory(isNode ? require('./data.js') : root.CardshipsData);
  if (isNode) module.exports = api;
  else root.CardshipsMeta = api;
})(this, function (D) {
  const KEY = 'cardships.meta.v3';
  const OLD_KEY = 'cardships.meta.v2';
  const blank = () => ({
    runs: 0, wins: 0, elites: 0, contracts: 0, reachedBoss: 0, bossesBeaten: [], coresWon: [],
    blueprints: 0, earnedTotal: 0,
    unlocked: [],            // Cores and parts bought (data UNLOCKS)
    upgrades: {},            // starting upgrades bought (data UPGRADES)
    legendaries: [],         // unlocked by a boss's first kill: the Legendary Vault
    seen: { enemies: [], parts: [] }, killed: {}, lore: [],
    achievements: [], cosmetics: { paint: 'standard', balloon: 'standard', skin: 'standard' },
    tierUnlocked: 0, tierCleared: {}, // Storm Tiers: the highest open, and the best cleared per Core
    tier: 0,                 // the tier picked for the next run
    lastShip: null,          // the last ship flown, for the hangar display
  });

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* storage unavailable */ }
    if (raw) { try { return normalise(JSON.parse(raw)); } catch (e) { return blank(); } }
    // Carry an older record forward: its runs, bosses and unlocks stand, and earn starting Blueprints.
    let old = null;
    try { old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); } catch (e) { old = null; }
    const m = blank();
    if (old) {
      for (const k of ['runs', 'wins', 'elites', 'contracts', 'reachedBoss', 'bossesBeaten', 'coresWon', 'unlocked', 'legendaries']) if (old[k] != null) m[k] = old[k];
      m.blueprints = 10 * (m.runs || 0) + 30 * (m.wins || 0);
      m.earnedTotal = m.blueprints;
    }
    return m;
  }
  function normalise(m) {
    const b = blank();
    const out = Object.assign(b, m);
    out.seen = Object.assign(blank().seen, m.seen || {});
    out.cosmetics = Object.assign(blank().cosmetics, m.cosmetics || {});
    return out;
  }
  function save(meta) {
    try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch (e) { /* storage unavailable: progress lasts this session */ }
  }

  // ---------- Blueprints ----------
  // What a finished run pays, line by line.
  function blueprintsFor(meta, game) {
    const B = D.BLUEPRINTS, s = game.stats;
    const lines = [['Run flown', B.base]];
    if (s.areasCleared) lines.push([`Areas cleared × ${s.areasCleared}`, B.area * s.areasCleared]);
    const kills = s.bossesKilled || [];
    if (kills.length) lines.push([`Bosses sunk × ${kills.length}`, B.boss * kills.length]);
    const first = kills.filter((b) => !meta.bossesBeaten.includes(b)).length;
    if (first) lines.push([`First kills × ${first}`, B.firstBoss * first]);
    if (s.quests) lines.push([`Contracts × ${s.quests}`, B.quest * s.quests]);
    if (s.elites) lines.push([`Elites × ${s.elites}`, B.elite * s.elites]);
    if (game.phase === 'victory') lines.push([game.tier ? `Victory at Storm Tier ${game.tier}` : 'Victory', B.win + 5 * (game.tier || 0)]);
    return { lines, total: lines.reduce((n, l) => n + l[1], 0) };
  }

  // ---------- recording a run ----------
  // Folds a finished run into the record. Returns what it earned: Blueprints, legendaries,
  // achievements and Storm Tiers.
  function recordRun(meta, game) {
    const bp = blueprintsFor(meta, game);
    const out = { blueprints: bp, legendaries: [], achievements: [], tier: null };
    meta.runs++;
    meta.elites += game.stats.elites;
    meta.contracts += game.stats.quests;
    if (game.stats.reachedBoss) meta.reachedBoss++;
    meta.blueprints += bp.total;
    meta.earnedTotal += bp.total;
    // Every boss sunk counts, in any area; the first kill unlocks its legendaries as rare loot.
    for (const b of game.stats.bossesKilled || []) {
      if (!meta.bossesBeaten.includes(b)) meta.bossesBeaten.push(b);
      for (const id of D.LEGENDARY_POOLS[b] || []) if (!meta.legendaries.includes(id)) { meta.legendaries.push(id); out.legendaries.push(id); }
    }
    // The Logbook.
    for (const id of game.stats.seenEnemies || []) if (!meta.seen.enemies.includes(id)) meta.seen.enemies.push(id);
    for (const id of game.stats.seenParts || []) if (!meta.seen.parts.includes(id)) meta.seen.parts.push(id);
    for (const [id, n] of Object.entries(game.stats.killed || {})) meta.killed[id] = (meta.killed[id] || 0) + n;
    const won = game.phase === 'victory';
    if (won) {
      meta.wins++;
      if (!meta.coresWon.includes(game.core.id)) meta.coresWon.push(game.core.id);
      const tier = game.tier || 0;
      if (tier >= (meta.tierCleared[game.core.id] ?? -1)) meta.tierCleared[game.core.id] = tier;
      // A clear opens the next Storm Tier.
      const next = Math.min(D.STORM_TIERS.length, tier + 1);
      if (next > meta.tierUnlocked) { meta.tierUnlocked = next; out.tier = next; }
    }
    meta.lastShip = { core: game.core.id, ship: game.ship, modules: game.cards().map((c) => c.id), won, area: game.area };
    for (const a of D.ACHIEVEMENTS) if (!meta.achievements.includes(a.id) && achieved(meta, a.id, game)) { meta.achievements.push(a.id); out.achievements.push(a); }
    save(meta);
    return out;
  }
  function achieved(m, id, game) {
    const won = game.phase === 'victory';
    switch (id) {
      case 'firstflight': return m.runs >= 1;
      case 'giantslayer': return m.bossesBeaten.length >= 1;
      case 'lights': return (game.stats.areasCleared || 0) >= 2 || m.bossesBeaten.includes('archon');
      case 'sovereign': return m.wins >= 1;
      case 'veteran': return m.runs >= 10;
      case 'collector': return m.legendaries.length >= 5;
      case 'admiral': return m.coresWon.length >= 3;
      case 'stormeye': return won && (game.tier || 0) >= 3;
      case 'starlit': return won && ['arcanist', 'eclipse'].includes(game.core.id);
      default: return false;
    }
  }

  // ---------- spending ----------
  function unlockCost(id) { const u = D.UNLOCKS.find((x) => x.id === id); return u ? u.cost : null; }
  function buyUnlock(meta, id) {
    const cost = unlockCost(id);
    if (cost == null || meta.unlocked.includes(id) || meta.blueprints < cost) return false;
    meta.blueprints -= cost; meta.unlocked.push(id); save(meta); return true;
  }
  function buyUpgrade(meta, id) {
    const u = D.UPGRADES.find((x) => x.id === id);
    if (!u || meta.upgrades[id] || meta.blueprints < u.cost) return false;
    meta.blueprints -= u.cost; meta.upgrades[id] = true; save(meta); return true;
  }
  // Deciphers a Logbook entry's lore (only for something you have met).
  function buyLore(meta, id) {
    const met = meta.seen.enemies.includes(id) || meta.legendaries.includes(id);
    if (!D.LORE[id] || !met || meta.lore.includes(id) || meta.blueprints < D.BLUEPRINTS.lore) return false;
    meta.blueprints -= D.BLUEPRINTS.lore; meta.lore.push(id); save(meta); return true;
  }
  // Which cosmetics an achievement record has opened.
  function cosmeticOpen(meta, slot, id) {
    if (id === 'standard') return true;
    return D.ACHIEVEMENTS.some((a) => meta.achievements.includes(a.id) && a.reward[0] === slot && a.reward[1] === id);
  }
  function wear(meta, slot, id) {
    if (!D.COSMETICS[slot] || !D.COSMETICS[slot][id] || !cosmeticOpen(meta, slot, id)) return false;
    meta.cosmetics[slot] = id; save(meta); return true;
  }
  function setTier(meta, n) { meta.tier = Math.max(0, Math.min(meta.tierUnlocked, n)); save(meta); }

  function coreUnlocked(meta, id) { return !D.CORES[id].locked || meta.unlocked.includes(id); }
  // The ids a run may roll as loot: everything but the parts still locked in the Workshop.
  function runPool(meta) { return D.UNLOCKS.filter((u) => u.kind === 'part' && meta.unlocked.includes(u.id)).map((u) => u.id); }

  return { load, save, recordRun, blueprintsFor, buyUnlock, buyUpgrade, buyLore, wear, cosmeticOpen, setTier, coreUnlocked, runPool, unlockCost, blank, KEY };
});
