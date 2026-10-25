#!/usr/bin/env node
// Headless balance simulator: plays N full runs per Core with the greedy bot and reports
// win rates, how far runs get, boss results, and how often each part is on a winning ship.
//   node tools/simulate.js [runsPerCore=1000] [--json out.json] [--seed 1]
const path = require('path');
const { Game } = require(path.join(__dirname, '../js/engine.js'));
const { playRun } = require(path.join(__dirname, '../js/bot.js'));
const D = require(path.join(__dirname, '../js/data.js'));

const args = process.argv.slice(2);
const runs = Number(args.find((a) => /^\d+$/.test(a)) || 1000);
const seedBase = Number((args[args.indexOf('--seed') + 1]) || 1) || 1;
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
// TUNE='{"BALANCE":{"hpPerColumn":0.08},"CORES":{"zeppelin":{"hp":5}}}' overrides data for experiments.
function merge(dst, src) { for (const [k, v] of Object.entries(src)) { if (v && typeof v === 'object' && !Array.isArray(v) && dst[k]) merge(dst[k], v); else dst[k] = v; } }
if (process.env.TUNE) merge(D, JSON.parse(process.env.TUNE));
const CORES = Object.keys(D.CORES);
const unlocked = D.UNLOCKS.map((u) => u.id);

function simulate() {
  const out = { runs, cores: {}, bosses: {}, parts: {}, winningRuns: 0 };
  for (const p of Object.keys(D.PARTS)) out.parts[p] = 0;
  for (const core of CORES) {
    const r = { wins: 0, reachedBoss: 0, cols: 0, deaths: {}, cogs: 0, turns: 0 };
    for (let i = 0; i < runs; i++) {
      const seed = (seedBase * 1000003 + i * 7919 + core.length * 104729) >>> 0;
      const g = playRun(new Game({ seed, unlocked }), core);
      r.cols += g.depth;
      r.cogs += g.stats.cogs;
      if (g.stats.reachedBoss) r.reachedBoss++;
      const b = (out.bosses[g.bossId] = out.bosses[g.bossId] || { reached: 0, won: 0 });
      if (g.stats.reachedBoss) b.reached++;
      if (g.phase === 'victory') {
        r.wins++;
        b.won++;
        out.winningRuns++;
        for (const id of new Set(g.cards().map((c) => c.id))) out.parts[id]++;
      } else {
        r.deaths[g.depth] = (r.deaths[g.depth] || 0) + 1;
      }
    }
    out.cores[core] = { winRate: r.wins / runs, bossReach: r.reachedBoss / runs, avgColumn: r.cols / runs, avgCogs: r.cogs / runs, deaths: r.deaths };
  }
  return out;
}

const t0 = Date.now();
const res = simulate();
const pct = (x) => (100 * x).toFixed(1) + '%';
if (process.env.BRIEF) { console.log(Object.entries(res.cores).map(([c, r]) => `${c} ${pct(r.winRate)}`).join('  '), '| top part', (() => { const [p, n] = Object.entries(res.parts).sort((a, b) => b[1] - a[1])[0]; return `${p} ${pct(n / Math.max(1, res.winningRuns))}`; })()); process.exit(0); }
console.log(`${runs} runs per Core, ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
console.log('Core        Win     Reach boss  Avg column');
for (const [c, r] of Object.entries(res.cores)) console.log(`${c.padEnd(11)} ${pct(r.winRate).padStart(6)}  ${pct(r.bossReach).padStart(9)}   ${r.avgColumn.toFixed(1)}`);
console.log('\nBoss        Reached  Won when reached');
for (const [b, r] of Object.entries(res.bosses)) console.log(`${b.padEnd(11)} ${String(r.reached).padStart(7)}  ${pct(r.won / Math.max(1, r.reached)).padStart(8)}`);
console.log('\nParts on winning ships (share of all winning runs)');
const parts = Object.entries(res.parts).sort((a, b) => b[1] - a[1]);
for (const [p, n] of parts) console.log(`${D.PARTS[p].name.padEnd(20)} ${pct(n / Math.max(1, res.winningRuns)).padStart(6)}`);
if (jsonOut) require('fs').writeFileSync(jsonOut, JSON.stringify(res, null, 2));
