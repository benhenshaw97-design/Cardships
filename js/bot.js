// A greedy Cardships bot. It plays whole runs through the engine's public methods, for the
// test suite (invariant checks) and the balance simulator. With `random: true` it plays
// random legal moves instead, to reach odd corners of the rules.
(function (root, factory) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const api = factory(isNode ? require('./data.js') : root.CardshipsData);
  if (isNode) module.exports = api;
  else root.CardshipsBot = api;
})(this, function (D) {
  const SIDES = ['stern', 'deck', 'bow'];
  const SUPPORT = new Set(['repair', 'boiler', 'overpressure', 'quarters', 'cargo', 'hatch', 'heart', 'sprinkler', 'scrubber', 'gyro', 'autoloader']);

  // Rough worth of a module in place, used to judge layouts and losses.
  const BASE = {
    harpoon: 2.2, cannon: 3, mortar: 3.2, flamethrower: 2.6, gatling: 2.6, grenadiers: 2.6, sniper: 2.8, tesla: 3.5,
    plating: 2.5, bulwark: 4, deflector: 1.6, repair: 2.2, quarters: 1.2, boiler: 2.6, sprinkler: 1.1, scrubber: 1,
    telescope: 1, gasbag: 1, propeller: 0.8, cargo: 0.6, hatch: 1.6, autoloader: 1, gyro: 2.4, heart: 0.6, overpressure: 3,
  };

  function moduleValue(g, card, side, idx) {
    const d = D.PARTS[card.id];
    const s = g[side];
    const outer = idx === s.length - 1;
    const nbs = [s[idx - 1], s[idx + 1]].filter(Boolean);
    let v = BASE[card.id] || 1;
    if (d.type === 'weapon' && !g.canFireFrom(card, side, idx)) v *= card.id === 'harpoon' && side !== 'stern' && s[idx + 1] && D.PARTS[s[idx + 1].id].type === 'weapon' ? 0.7 : 0.2;
    if (card.id === 'plating' || card.id === 'bulwark') v += outer ? (side === 'bow' ? 1 + idx * 1.2 : side === 'deck' ? 0.4 + idx : idx * 0.3) : nbs.length * 0.6;
    // Supports are safest in the sheltered stern and most exposed at the bow.
    if (SUPPORT.has(card.id)) v += side === 'stern' ? 0.6 : side === 'bow' ? -0.4 : 0;
    if (card.id === 'quarters' || card.id === 'autoloader') v += nbs.filter((n) => D.PARTS[n.id].type === 'weapon').length * (card.id === 'autoloader' ? 2 : 1);
    if (card.id === 'repair' && idx === 0) v += 1;
    if (card.id === 'heart' && idx === 0) v += 4;
    if (card.id === 'telescope') v += (outer && side !== 'stern' ? 0.6 : 0) + nbs.filter((n) => n.id === 'mortar' || n.id === 'sniper').length * 1.5;
    if (card.id === 'propeller' && !(outer && side === 'stern')) v *= 0.3;
    if (card.id === 'lightningrod') v += outer && side === 'deck' ? 0.8 : -0.5;
    if (card.id === 'gasbag' && ['zeppelin', 'airship'].includes(g.core.id)) v += 1;
    if (card.id === 'tesla') v += g.weaponsInstalled() * 0.5;
    return v + card.hp * 0.15;
  }
  function layoutScore(g) {
    let v = 0;
    for (const side of SIDES) {
      const s = g[side];
      if (!s.length) v -= side === 'bow' ? 2.5 : 1;
      s.forEach((c, i) => { v += moduleValue(g, c, side, i); });
    }
    // A bare front exposes the Core to direct fire; a ship with nothing that can shoot is helpless.
    if (!g.bow.length && !g.deck.length) v -= 5;
    if (!g.cards().some((c, i) => { const l = g.locate(c.uid); return g.canFireFrom(c, l.side, l.idx); })) v -= 3;
    if (g.core.id === 'battleship') v += g.weight() * 0.25;
    if (g.core.id === 'zeppelin' || g.core.id === 'airship') v -= Math.max(0, g.weight() - 2) * 0.2;
    return v;
  }

  // Tries every legal slot for a new part and returns the best, without changing the ship.
  function bestPlacement(g, id) {
    let best = null;
    const base = layoutScore(g);
    for (const side of SIDES) {
      for (let pos = 0; pos <= g[side].length; pos++) {
        if (!g.canInstall(side, pos)) continue;
        const card = g.makeCard(id);
        g[side].splice(pos, 0, card);
        const score = layoutScore(g) - base;
        g[side].splice(pos, 1);
        g.nextUid--;
        if (!best || score > best.score) best = { side, pos, score };
      }
    }
    return best;
  }
  function weakestModule(g) {
    let worst = null;
    for (const side of SIDES) g[side].forEach((c, i) => { const v = moduleValue(g, c, side, i); if (!worst || v < worst.v) worst = { uid: c.uid, v }; });
    return worst;
  }

  // How bad the telegraphed intent looks against the ship as it stands.
  function threat(g) {
    const p = g.previewIntent();
    if (!p) return 0;
    let t = 0;
    for (const h of p.plan) {
      if (h.evaded) continue;
      if (h.uid === 'core') { t += h.dmg * 3 + (h.dmg >= g.core.hp ? 100 : 0); continue; }
      const loc = g.locate(h.uid);
      if (!loc) continue;
      t += h.dmg;
      if (h.dmg >= loc.card.hp) t += 1.5 + moduleValue(g, loc.card, loc.side, loc.idx);
      if (h.token) t += h.token === 'fire' ? 2 : 1;
    }
    return t;
  }
  function firepower(g) {
    let f = 0;
    for (const c of g.cards()) {
      const info = g.fireInfo(c.uid);
      if (info && (!info.blocked || info.blocked === 'Already fired' || info.blocked === 'Not enough Steam')) f += BASE[c.id] || 1;
    }
    return f;
  }
  function expectedDamage(g, card, mode) {
    const d = D.PARTS[card.id];
    const info = g.fireInfo(card.uid, mode);
    let dmg = d.dmg || 0;
    if (card.id === 'cannon') dmg = mode === 'aimed' ? 3.9 : 3.2;
    if (card.id === 'sniper' && mode === 'steady') dmg = 4;
    if (card.id === 'tesla') dmg = g.weaponsInstalled();
    dmg = Math.max(0, dmg + info.bonus);
    const en = g.combat.enemy;
    const pierce = card.id === 'tesla' || mode === 'steady';
    let real = dmg + (en.vuln > 0 && dmg > 0 ? 1 : 0) - (pierce ? 0 : Math.min(en.block, dmg));
    real = Math.max(0, real);
    let extra = 0;
    if (d.burn) extra += en.hp > 4 ? 2.5 : 1;
    if (d.weak) extra += en.weak > 0 ? 0.6 : 1.6;
    if (d.vuln) extra += en.vuln > 0 ? 0.6 : 1.8;
    return { real, extra };
  }

  function candidateActions(g) {
    const acts = [];
    const c = g.combat;
    const en = c.enemy;
    const steamWorth = g.core.id === 'zeppelin' ? 1.5 : 0.6;
    const t0 = threat(g);
    const killBonus = (dmg) => (dmg >= en.hp ? 60 : 0);
    for (const card of g.cards()) {
      const info = g.fireInfo(card.uid);
      if (info) {
        for (const mode of info.modes) {
          const w = g.fireInfo(card.uid, mode);
          if (w.blocked) continue;
          const { real, extra } = expectedDamage(g, card, mode);
          acts.push({ score: real * 2 + extra + killBonus(real) - w.cost * steamWorth, run: () => g.fire(card.uid, mode) });
        }
      }
      if (g.canUseSupport(card.uid)) {
        for (const tgt of g.supportTargets(card.uid)) {
          const target = g.locate(tgt).card;
          let s = 0;
          if (card.id === 'repair') s = Math.min(2, g.maxHp(target) - target.hp) * (tgt === 'core' ? 2.5 : 1.2);
          if (card.id === 'sprinkler') s = 2.5;
          if (card.id === 'scrubber') s = D.PARTS[target.id] && D.PARTS[target.id].type === 'weapon' ? 1.8 : 0.8;
          if (card.id === 'deflector') { const p = g.previewIntent(); s = p && p.intent.side === g.locate(card.uid).side ? t0 : 0; }
          acts.push({ score: s - g.useCost(card) * steamWorth, run: () => g.useSupport(card.uid, tgt) });
        }
      }
    }
    const core = g.coreAbilityInfo();
    if (!core.blocked) {
      const a = core.ability.id;
      let s = 0;
      if (a === 'strafe') s = g.weaponsInstalled() * 2 + killBonus(g.weaponsInstalled());
      if (a === 'ram') s = g.ramDamage() * 2 - 1.5 + killBonus(g.ramDamage());
      if (a === 'bombard') { const dmg = Math.floor(D.BALANCE.bombardPerPressure * g.core.pressure); s = (g.core.pressure >= 5 || dmg >= en.hp) ? dmg * 2 + killBonus(dmg) : -1; }
      if (a === 'overclock') s = g.cards().some((x) => { const i = g.fireInfo(x.uid); return i && !i.blocked && g.combat.steam - 1 >= i.cost; }) ? 4 : -1;
      acts.push({ score: s - core.cost * steamWorth, run: () => g.useCore() });
    }
    if (g.canEvade()) {
      const cost = g.evadeCost();
      if (t0 >= 2) acts.push({ score: t0 * 1.1 - cost * steamWorth - 0.5, run: () => g.evade() });
    }
    // Swaps that move a fragile or valuable module out of the line of fire.
    if (t0 > 0 && g.spendable(g.swapCost())) {
      const fp0 = firepower(g);
      for (const side of SIDES) {
        const s = g[side];
        for (let i = 0; i + 1 < s.length; i++) {
          if (!g.canSwap(s[i].uid, s[i + 1].uid)) continue;
          [s[i], s[i + 1]] = [s[i + 1], s[i]];
          const t1 = threat(g), fp1 = firepower(g);
          [s[i], s[i + 1]] = [s[i + 1], s[i]];
          const a = s[i].uid, b = s[i + 1].uid;
          acts.push({ score: (t0 - t1) - (fp0 - fp1) * 1.2 - g.swapCost() * steamWorth - 0.2, run: () => g.swap(a, b) });
        }
      }
    }
    for (const uid of g.ventTargets()) {
      if (!g.spendable(2)) break;
      const card = g.locate(uid).card;
      const s = (card.tokens.fire ? (uid === 'core' ? 5 : 2.2) : 0) + (card.tokens.gas ? 1 : 0) + (card.tokens.glue ? 0.8 : 0);
      acts.push({ score: s - 2 * steamWorth - 0.4, run: () => g.vent(uid) });
    }
    return acts;
  }

  function combatTurn(g, rnd) {
    for (let n = 0; n < 40 && g.canAct(); n++) {
      const acts = candidateActions(g);
      if (rnd) {
        const pool = acts.filter(() => rnd() < 0.7);
        if (!pool.length || rnd() < 0.15) break;
        pool[Math.floor(rnd() * pool.length)].run();
        continue;
      }
      acts.sort((a, b) => b.score - a.score);
      if (!acts.length || acts[0].score <= 0) break;
      acts[0].run();
    }
    if (g.canAct()) g.endTurn();
  }

  function handleLoot(g, rnd) {
    if (g.lootOffer) {
      const o = g.lootOffer;
      if (rnd) { if (rnd() < 0.1) g.skipOffer(); else g.pickOffer(Math.floor(rnd() * o.ids.length)); return; }
      let best = -1, bi = -1;
      o.ids.forEach((id, i) => {
        const p = bestPlacement(g, id);
        let s = p ? p.score : -1;
        if (!p) { const w = weakestModule(g); s = w ? (BASE[id] || 1) - w.v - 0.5 : -1; }
        if (s > best) { best = s; bi = i; }
      });
      if (bi < 0 || best <= 0.2) g.skipOffer(); else g.pickOffer(bi);
      return;
    }
    if (g.pendingLoot.length) {
      const id = g.pendingLoot[0];
      if (rnd) {
        const side = SIDES[Math.floor(rnd() * SIDES.length)];
        if (g.canInstall(side, g[side].length)) g.installPending(side, Math.floor(rnd() * (g[side].length + 1)));
        else if (!g.storePending()) { if (rnd() < 0.4 && g.cards().length) g.scrap(g.cards()[0].uid); else g.jettisonPending(); }
        return;
      }
      const p = bestPlacement(g, id);
      if (p && p.score > 0) { g.installPending(p.side, p.pos); return; }
      if (!p) {
        const w = weakestModule(g);
        if (w && (BASE[id] || 1) > w.v + 0.5) { g.scrap(w.uid); return; }
      }
      if (!g.storePending()) g.jettisonPending();
      return;
    }
    if (g.swapAvailable) g.swapAvailable = false;
    g.finishLoot();
  }

  function needRepair(g) {
    let missing = (g.maxHp(g.core) - g.core.hp) * 2;
    for (const c of g.cards()) missing += g.maxHp(c) - c.hp;
    return missing;
  }

  // Scores a destination for the map. Works with plain encounter ids.
  function encounterScore(g, id) {
    const e = D.ENCOUNTERS[id];
    if (!e) return 0;
    const hpFrac = g.core.hp / g.maxHp(g.core);
    const rep = needRepair(g);
    switch (e.kind) {
      case 'Combat': return (hpFrac > 0.5 ? 3 : -1) - (id === 'sentinel' ? 1 : 0);
      case 'Elite': return hpFrac > 0.75 ? 2 : -4;
      case 'Ambush': return hpFrac > 0.5 ? 2.5 : -1;
      case 'Hazard': return hpFrac > 0.4 ? 1 : -2;
      case 'Trade': return 1.5 + rep * 0.4;
      case 'Sky Dock': return 1 + rep * 0.35;
      case 'Quest': return g.quest ? 0.5 : 1.8;
      default: return 0;
    }
  }

  function handleEvent(g, rnd) {
    const ev = g.event;
    if (ev.options) {
      if (rnd) { g.chooseOption(ev.options[Math.floor(rnd() * ev.options.length)].id); return; }
      const ids = ev.options.map((o) => o.id);
      const pickId = (() => {
        switch (ev.stage) {
          case 'downdraft': {
            if (g.core.hp > 4) return 'brace';
            let worst = null;
            for (const side of SIDES) { const s = g[side]; if (s.length) { const v = moduleValue(g, s[s.length - 1], side, s.length - 1); if (!worst || v < worst.v) worst = { id: 'drop-' + side, v }; } }
            return worst ? worst.id : 'brace';
          }
          case 'eye': return g.core.hp <= g.maxHp(g.core) - 3 ? 'core' : needRepair(g) > 6 ? 'all' : 'scavenge';
          case 'trader': return needRepair(g) >= 8 ? 'repair' : 'buy';
          case 'refit': { const w = weakestModule(g); return w ? w.uid : ids[0]; }
          case 'guild': return g.quest ? 'none' : ['bounty', 'marksman', 'rammer', 'ironclad', 'survivor', 'hoarder'].find((q) => ids.includes(q)) || 'none';
          default: return ids[0];
        }
      })();
      g.chooseOption(ids.includes(pickId) ? pickId : ids[0]);
      return;
    }
    g.continueEvent();
  }

  function handleChoice(g) {
    const pc = g.pendingChoice;
    let best = pc.eligible[0], bv = -Infinity;
    for (const uid of pc.eligible) {
      const loc = g.locate(uid);
      let v = loc.side ? moduleValue(g, loc.card, loc.side, loc.idx) : 0;
      if (pc.kind === 'maintain') v = g.maxHp(loc.card) - loc.card.hp;
      if (loc.side && loc.idx === g[loc.side].length - 1 && D.PARTS[loc.card.id].type === 'defense') v += 2;
      if (v > bv) { bv = v; best = uid; }
    }
    g.resolveChoice(best);
  }

  function shop(g, rnd) {
    const rep = needRepair(g);
    if (g.maxHp(g.core) - g.core.hp >= 3 && g.buyService('core')) return;
    if (rep >= 8 && g.buyService('full')) return;
    let best = null;
    g.shop.stock.forEach((item, i) => {
      if (item.sold || item.price > g.cogs) return;
      const p = bestPlacement(g, item.id);
      const gain = p ? p.score : (BASE[item.id] || 1) - ((weakestModule(g) || { v: 9 }).v + 0.5);
      const s = rnd ? rnd() * 3 - 1 : gain - item.price / 40;
      if (gain > 0.4 && (!best || s > best.s)) best = { i, s };
    });
    if (best && g.buy(best.i)) return;
    g.leaveShop();
  }

  function playRun(g, coreId, opts = {}) {
    const rnd = opts.random ? () => g.rand() : null;
    g.chooseCore(coreId);
    for (let step = 0; step < 20000; step++) {
      if (opts.check) opts.check(g);
      if (g.phase === 'gameover' || g.phase === 'victory') return g;
      if (g.pendingChoice) { handleChoice(g); continue; }
      switch (g.phase) {
        case 'loot': handleLoot(g, rnd); break;
        case 'map': {
          const choices = g.mapChoices();
          let best = choices[0], bs = -Infinity;
          for (const n of choices) {
            const s = (rnd ? rnd() * 3 : g.rand() * 0.5) + (g.nodeKnown(n) ? encounterScore(g, n.enc) : 1);
            if (s > bs) { bs = s; best = n; }
          }
          g.travel(best.id);
          break;
        }
        case 'event': handleEvent(g, rnd); break;
        case 'hangar': if (!g.hangar.roll) g.salvage(); else g.leaveHangar(); break;
        case 'shop': shop(g, rnd); break;
        case 'combat': combatTurn(g, rnd); break;
        default: throw new Error('unexpected phase ' + g.phase);
      }
    }
    throw new Error(`run ${g.seed} did not finish`);
  }

  return { playRun, layoutScore, bestPlacement, moduleValue, threat, encounterScore };
});
