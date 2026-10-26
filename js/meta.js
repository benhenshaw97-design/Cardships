// Meta-progression: lifetime records and unlocks, kept in this browser's localStorage.
(function (root, factory) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const api = factory(isNode ? require('./data.js') : root.CardshipsData);
  if (isNode) module.exports = api;
  else root.CardshipsMeta = api;
})(this, function (D) {
  const KEY = 'cardships.meta.v2';
  const blank = () => ({ runs: 0, wins: 0, elites: 0, contracts: 0, reachedBoss: 0, bossesBeaten: [], coresWon: [], unlocked: [], legendaries: [] });

  function load() {
    try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return blank(); }
  }
  function save(meta) {
    try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch (e) { /* storage unavailable: progress lasts this session */ }
  }
  // Which unlock conditions a record satisfies.
  function earned(m) {
    const out = [];
    if (m.reachedBoss > 0) out.push('tesla');
    if (m.elites > 0) out.push('autoloader');
    if (m.contracts >= 3) out.push('gyro');
    if (m.wins > 0) out.push('clockwork');
    if (m.bossesBeaten.length >= 2) out.push('overpressure');
    return out;
  }
  // Folds a finished run into the record. Returns the unlocks it newly earned.
  function recordRun(meta, game) {
    const freshLegends = [];
    meta.runs++;
    meta.elites += game.stats.elites;
    meta.contracts += game.stats.quests;
    if (game.stats.reachedBoss) meta.reachedBoss++;
    // Every boss sunk counts, in any area; the first kill unlocks its legendaries as rare loot.
    for (const b of game.stats.bossesKilled || []) {
      if (!meta.bossesBeaten.includes(b)) meta.bossesBeaten.push(b);
      for (const id of D.LEGENDARY_POOLS[b] || []) if (!meta.legendaries.includes(id)) { meta.legendaries.push(id); freshLegends.push(id); }
    }
    if (game.phase === 'victory') {
      meta.wins++;
      if (!meta.coresWon.includes(game.core.id)) meta.coresWon.push(game.core.id);
    }
    const fresh = earned(meta).filter((id) => !meta.unlocked.includes(id));
    meta.unlocked.push(...fresh);
    save(meta);
    return [...fresh.map((id) => D.UNLOCKS.find((u) => u.id === id)), ...freshLegends.map((id) => ({ id, kind: 'legendary', name: D.PARTS[id].name }))];
  }
  function coreUnlocked(meta, id) { return !D.CORES[id].locked || meta.unlocked.includes(id); }

  return { load, save, recordRun, coreUnlocked, earned, blank };
});
