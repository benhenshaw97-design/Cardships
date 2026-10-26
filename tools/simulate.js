#!/usr/bin/env node
// Headless balance simulator: plays N full three-area runs per Core with the greedy bot and
// reports how many clear each area, boss results, and how often each part is on a winning ship.
//   node tools/simulate.js [runsPerCore=1000] [--json out.json] [--seed 1] [--tier 0]
//   BRIEF=1 prints one line: each Core's Area 1 clear / Area 2 clear / full win.
//   TUNE='{"BALANCE":{"hpPerColumn":0.08},"CORES":{"zeppelin":{"hp":5}}}' overrides data for experiments.
const path = require('path');
const { Game } = require(path.join(__dirname, '../js/engine.js'));
const { playRun } = require(path.join(__dirname, '../js/bot.js'));
const D = require(path.join(__dirname, '../js/data.js'));

const args = process.argv.slice(2);
const runs = Number(args.find((a) => /^\d+$/.test(a)) || 1000);
const flag = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const seedBase = Number(flag('--seed', 1)) || 1;
const jsonOut = flag('--json', null);
const tier = Number(flag('--tier', 0)) || 0;
function merge(dst, src) { for (const [k, v] of Object.entries(src)) { if (v && typeof v === 'object' && !Array.isArray(v) && dst[k]) merge(dst[k], v); else dst[k] = v; } }
if (process.env.TUNE) merge(D, JSON.parse(process.env.TUNE));
const CORES = (process.env.CORES ? process.env.CORES.split(',') : Object.keys(D.CORES));

function simulate() {
  const out = { runs, tier, cores: {}, bosses: {}, parts: {}, winningRuns: 0, areas: D.AREAS.map(() => ({ reached: 0, cleared: 0 })) };
  for (const p of Object.keys(D.PARTS)) out.parts[p] = 0;
  for (const core of CORES) {
    const r = { cleared: D.AREAS.map(() => 0), progress: 0, deaths: {}, cogs: 0 };
    for (let i = 0; i < runs; i++) {
      const seed = (seedBase * 1000003 + i * 7919 + core.length * 104729) >>> 0;
      const g = playRun(new Game({ seed, tier }), core);
      r.progress += g.progress();
      r.cogs += g.stats.cogs;
      for (let a = 0; a < D.AREAS.length; a++) {
        if (g.area >= a) out.areas[a].reached++;
        if (g.stats.areasCleared > a) { r.cleared[a]++; out.areas[a].cleared++; }
      }
      for (const b of g.stats.bossesFought) {
        const row = (out.bosses[b] = out.bosses[b] || { reached: 0, won: 0 });
        row.reached++;
        if (g.stats.bossesKilled.includes(b)) row.won++;
      }
      if (g.phase === 'victory') {
        out.winningRuns++;
        for (const id of new Set(g.cards().map((c) => c.id))) out.parts[id]++;
      } else {
        const key = `A${g.area + 1}:${g.depth}`;
        r.deaths[key] = (r.deaths[key] || 0) + 1;
      }
    }
    out.cores[core] = {
      area1: r.cleared[0] / runs, area2: r.cleared[1] / runs, winRate: r.cleared[D.AREAS.length - 1] / runs,
      avgProgress: r.progress / runs, avgCogs: r.cogs / runs, deaths: r.deaths,
    };
  }
  return out;
}

const t0 = Date.now();
const res = simulate();
const pct = (x) => (100 * x).toFixed(1) + '%';
if (process.env.BRIEF) {
  console.log(Object.entries(res.cores).map(([c, r]) => `${c} ${pct(r.area1)}/${pct(r.area2)}/${pct(r.winRate)}`).join('  '), '| top part', (() => { const [p, n] = Object.entries(res.parts).sort((a, b) => b[1] - a[1])[0]; return `${p} ${pct(n / Math.max(1, res.winningRuns))}`; })());
  process.exit(0);
}
console.log(`${runs} runs per Core at Storm Tier ${tier}, ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
console.log('Core        Area 1   Area 2   Full win  Avg progress');
for (const [c, r] of Object.entries(res.cores)) console.log(`${c.padEnd(11)} ${pct(r.area1).padStart(6)}   ${pct(r.area2).padStart(6)}   ${pct(r.winRate).padStart(6)}    ${r.avgProgress.toFixed(1)}`);
console.log('\nBoss          Fought  Won when fought');
for (const [b, r] of Object.entries(res.bosses)) console.log(`${b.padEnd(13)} ${String(r.reached).padStart(6)}  ${pct(r.won / Math.max(1, r.reached)).padStart(8)}`);
console.log('\nParts on winning ships (share of all winning runs)');
const parts = Object.entries(res.parts).sort((a, b) => b[1] - a[1]);
for (const [p, n] of parts) console.log(`${D.PARTS[p].name.padEnd(22)} ${pct(n / Math.max(1, res.winningRuns)).padStart(6)}`);
if (jsonOut) require('fs').writeFileSync(jsonOut, JSON.stringify(res, null, 2));
