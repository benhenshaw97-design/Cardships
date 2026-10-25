// Cardships browser UI. Renders the engine state as panels and the card view, and turns
// clicks into engine calls.
(function () {
  const D = window.CardshipsData;
  const { Game, fmt, SIDES, VENT_COST } = window.CardshipsEngine;
  const Meta = window.CardshipsMeta;
  const SkyMap = window.CardshipsSkyMap;
  const Scene = window.CardshipsScene;
  const scene = new Scene(document.getElementById('scene'));
  const Actors = window.CardshipsActors;
  const FX = window.CardshipsFX;
  Scene.actors = (g, v) => Actors.draw(g, v);
  Scene.fx = FX.drawFx;
  Scene.overlay = FX.drawOverlay;
  // Taps on the flight view select modules or hit install bolts.
  document.getElementById('scene').addEventListener('click', (ev) => {
    if (FX.isPlaying()) { FX.skip(); return; }
    const r = ev.currentTarget.getBoundingClientRect();
    Actors.tap(ev.clientX - r.left, ev.clientY - r.top);
  });
  Actors.onSelect = (uid) => {
    if (!game) return;
    if (ui.targeting) {
      if (uid && ui.targeting.eligible.includes(uid)) { ui.targeting.onPick(uid); ui.targeting = null; }
      render();
      return;
    }
    if (uid === 'enemy') uid = null;
    ui.selected = uid && uid !== ui.selected ? uid : null;
    ui.confirmScrap = null;
    render();
  };
  Actors.onInsert = (side, pos) => { if (ui.insertFn) { ui.insertFn(side, pos); ui.insertFn = null; render(); } };

  let game = null;
  let meta = Meta.load();
  const ui = { cardView: false, insertFn: null, selected: null, targeting: null, dockSel: null, swapSel: null, confirmScrap: null, logCount: 0, mapSel: null, flying: false, recorded: null, newUnlocks: [] };
  try { ui.cardView = localStorage.getItem('cardships.cardView') === '1'; } catch (e) { /* storage unavailable */ }
  function newRun(coreId) {
    game = new Game({ unlocked: meta.unlocked });
    Actors.reset();
    game.chooseCore(coreId);
    game.events = [];
    ui.selected = null; ui.mapSel = null; ui.recorded = null; ui.newUnlocks = [];
    render();
  }

  // ---------- tiny DOM helper ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const $ = (id) => document.getElementById(id);
  const statline = (...items) => h('span', { class: 'statline' }, items.map((x) => (typeof x === 'string' ? h('span', {}, x) : x)));
  const partName = (id) => D.PARTS[id].name;

  function act(fn) {
    return (ev) => {
      if (ev) ev.stopPropagation();
      fn();
      ui.targeting = null;
      ui.confirmScrap = null;
      if (ui.selected && game && !game.locate(ui.selected) && !game.storage.some((c) => c.uid === ui.selected)) ui.selected = null;
      render();
    };
  }

  // ---------- render root ----------
  // Which parallax biome and scroll speed each moment of the run calls for.
  function syncScene() {
    const wrap = $('scene-wrap');
    const overlay = $('scene-overlay');
    wrap.classList.toggle('tall', !game);
    if (!game) {
      scene.setBiome('sunset'); scene.setMode('title');
      overlay.replaceChildren(h('div', { class: 'title-hero' },
        h('span', { class: 'eyebrow' }, 'A steampunk skyship roguelike'),
        h('h1', {}, 'Cardships'),
        h('p', {}, 'Bolt modules onto a Core, read the enemy\'s next move, and fly the cloud routes to the boss.')));
      return;
    }
    overlay.replaceChildren();
    const node = game.map && game.currentNode();
    const here = node && node.enc !== 'start' ? node.biome : 'clear';
    const phase = game.phase;
    if (phase === 'hangar') { scene.setBiome('dock'); scene.setMode('docked'); }
    else if (phase === 'shop') { scene.setBiome('interior'); scene.setMode('docked'); }
    else if (phase === 'combat') { scene.setBiome(node && node.enc === 'boss' ? 'lair' : here); scene.setMode('combat'); }
    else { scene.setBiome(here); scene.setMode(ui.flying ? 'travel' : 'flight'); }
  }
  // Animates whatever just happened in the game, then redraws the panels.
  function render() {
    if (game && game.events.length && !FX.isPlaying() && FX.worthPlaying(game.events)) {
      const evs = game.events;
      game.events = [];
      syncScene();
      Actors.prepare(game);
      FX.play(evs, () => renderNow());
      return;
    }
    if (FX.isPlaying()) return;
    renderNow();
  }
  function renderNow() {
    syncScene();
    renderHud();
    ui.insertFn = null;
    $('stage').replaceChildren(...stageContent().filter(Boolean));
    renderLog();
    if (game) {
      for (const ev of game.events) {
        if (ev.type === 'ram') scene.jolt(ev.player ? 0.8 : 1.2);
        Actors.react(ev);
      }
      game.flashes.clear();
      game.events = [];
    }
    Actors.sync(game, ui);
    renderPopover();
  }
  // A small card over the flight view for the module you tapped, with its actions.
  function renderPopover() {
    const overlay = $('scene-overlay');
    const dock = $('scene-dock');
    const old = overlay.querySelector('.popover');
    if (old) old.remove();
    dock.replaceChildren();
    if (!game || !ui.selected || ui.cardView || ui.targeting || !['combat', 'loot', 'map', 'event', 'hangar', 'shop'].includes(game.phase)) return;
    const box = inspector();
    if (!box.querySelector('h3')) return;
    const pop = h('div', { class: 'popover' }, h('button', { class: 'popover-close', 'aria-label': 'Close', onclick: () => { ui.selected = null; render(); } }, '×'), box);
    // On narrow screens the card docks under the flight view so it doesn't cover the ship.
    if (window.innerWidth < 640) dock.append(pop); else overlay.append(pop);
  }
  function stageContent() {
    if (!game) return titleScreen();
    if (game.pendingChoice) {
      const pc = game.pendingChoice;
      ui.targeting = { prompt: pc.prompt, eligible: pc.eligible, onPick: (uid) => game.resolveChoice(uid), cancelable: false };
    }
    switch (game.phase) {
      case 'loot': return lootScreen();
      case 'map': return mapScreen();
      case 'event': return eventScreen();
      case 'hangar': return hangarScreen();
      case 'shop': return shopScreen();
      case 'combat': return combatScreen();
      case 'gameover':
      case 'victory': return endScreen();
      default: return titleScreen();
    }
  }

  // ---------- HUD ----------
  function renderHud() {
    const hud = $('hud');
    if (!game || !game.core) { hud.replaceChildren(); return; }
    const route = h('div', { class: 'route', title: `Column ${game.depth} of ${game.maxDepth}` });
    for (let i = 1; i <= game.maxDepth; i++) {
      const cls = [i < game.depth || (i === game.depth && game.phase === 'map') ? 'done' : '', i === game.depth && game.phase !== 'map' ? 'here' : '', i === game.maxDepth ? 'boss' : ''].join(' ');
      route.append(h('i', { class: cls }));
    }
    const item = (label, value, title) => h('div', { class: 'hud-item', title }, h('span', { class: 'hud-label' }, label), h('span', { class: 'hud-value' }, value));
    const quest = game.quest && D.QUESTS.find((q) => q.id === game.quest);
    hud.replaceChildren(...[
      item('Route', route),
      item('Core', `${Math.max(0, game.core.hp)}/${game.maxHp(game.core)}`),
      item('Weight', fmt(game.weight()), 'Lighter ships outpace enemies and dodge cheaply; heavier ships shrug off rams and wind'),
      item('Steam', String(game.steamCap()), 'Steam per turn'),
      item('Cogs', String(game.cogs), 'Spend cogs at Trading Zeppelins'),
      quest ? item('Contract', quest.name, quest.goal) : null,
    ].filter(Boolean));
  }

  // ---------- log ----------
  function renderLog() {
    const log = $('log');
    if (!game) { log.replaceChildren(h('li', { class: 'sys' }, 'Choose a Core to begin a run.')); ui.logCount = 0; return; }
    if (ui.logCount > game.log.length || ui.logCount === 0) { log.replaceChildren(); ui.logCount = 0; }
    for (const li of log.querySelectorAll('li.new')) li.classList.remove('new');
    for (const e of game.log.slice(ui.logCount)) log.append(h('li', { class: `${e.cls} new` }, e.text));
    ui.logCount = game.log.length;
    log.scrollTop = log.scrollHeight;
  }

  // ---------- title ----------
  function titleScreen() {
    const cores = Object.values(D.CORES).map((c) => {
      const open = Meta.coreUnlocked(meta, c.id);
      const how = D.UNLOCKS.find((u) => u.id === c.id);
      return h('button', { class: 'core-pick', disabled: open ? null : true, onclick: () => newRun(c.id) },
        !open ? h('span', { class: 'lock' }, `Locked · ${how.how}`) : null,
        h('span', { class: 'eyebrow' }, c.style),
        h('span', { class: 'name' }, c.name.replace(' Core', '')),
        statline(`Weight ${fmt(c.weight)}`, `Durability ${c.hp}`, `Steam ${c.steam}`),
        h('span', {}, h('b', {}, c.passive.name + '. '), c.passive.text),
        h('span', {}, h('b', {}, `${c.ability.name} (${c.ability.cost} Steam). `), c.ability.text),
        h('span', { class: 'muted' }, c.blurb),
      );
    });
    const unlocks = h('div', { class: 'unlocks' }, D.UNLOCKS.map((u) => {
      const got = meta.unlocked.includes(u.id);
      return h('div', { class: `unlock ${got ? 'got' : ''}` }, h('b', {}, u.name), h('span', {}, got ? `Unlocked ${u.kind}` : u.how));
    }));
    return [
      h('div', { class: 'cores' }, cores),
      h('div', { class: 'panel stack' },
        h('h3', {}, 'How it flies'),
        h('div', { class: 'primer' },
          h('div', {}, h('b', {}, 'Layers'), h('span', {}, 'Up to 3 modules per side. Layer 1 touches the Core. Most weapons fire only from the outside; Mortars and Tesla Coils arc over.')),
          h('div', {}, h('b', {}, 'Intents'), h('span', {}, 'The enemy\'s next move and target are shown before you act. Answer it: swap modules, Evade, cleanse, or kill it first.')),
          h('div', {}, h('b', {}, 'Steam'), h('span', {}, 'Refills every turn and pays for everything. Durability is only health.')),
          h('div', {}, h('b', {}, 'Targeting'), h('span', {}, 'A hit on an empty layer strikes the next module inward. Only a bare side exposes the Core. Outside plating takes every hit on its side.')),
          h('div', {}, h('b', {}, 'Weight'), h('span', {}, 'Lighter than the enemy: +1 Steam on turn one and cheap Evades. Heavier: rams and crosswinds hurt less.')),
          h('div', {}, h('b', {}, 'Dice'), h('span', {}, 'Everything rolls a d6. Results with a downside give you a choice.')),
        ),
      ),
      h('div', { class: 'panel stack' },
        h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', {}, 'Hangar records'),
          h('span', { class: 'statline' }, `Runs ${meta.runs}`, `Wins ${meta.wins}`, `Bosses sunk ${meta.bossesBeaten.length}/3`)),
        h('p', { class: 'muted' }, 'Reach milestones to unlock new Cores and rare parts for future runs.'),
        unlocks),
    ];
  }

  // ---------- cards ----------
  function cardInfo(card) {
    if (card === game.core) return { name: D.CORES[card.id].name, abbr: 'CORE', type: 'core', weight: card.weight, max: game.maxHp(card), rarity: '' };
    const d = D.PARTS[card.id];
    return { name: d.name, abbr: d.abbr, type: d.type, weight: d.weight, max: game.maxHp(card), rarity: d.rarity };
  }
  function predictedHits() {
    const out = new Map();
    if (game.phase !== 'combat' || !game.combat.enemy.intent) return out;
    const p = game.previewIntent();
    for (const hit of p.plan) out.set(hit.uid, (out.get(hit.uid) || 0) + hit.dmg);
    return out;
  }
  function cardEl(card, hits) {
    const info = cardInfo(card);
    const t = ui.targeting;
    const eligible = t && t.eligible.includes(card.uid);
    const incoming = hits && hits.has(card.uid) ? hits.get(card.uid) : null;
    const cls = ['card', info.type, info.rarity, ui.selected === card.uid && !t ? 'selected' : '', eligible ? 'eligible' : '', t && !eligible ? 'dim' : '', game.flashes.has(card.uid) ? 'hit' : '', incoming != null ? 'targeted' : ''].join(' ');
    const pips = h('div', { class: 'pips' });
    for (let i = 0; i < info.max; i++) pips.append(h('i', { class: i < card.hp ? 'on' : '' }));
    const toks = h('div', { class: 'tokens' });
    for (const k of ['fire', 'glue', 'gas']) if (card.tokens[k]) toks.append(h('span', { class: `tok ${k}` }, k));
    if (card.reload > 0) toks.append(h('span', { class: 'tok cd' }, 'rld'));
    return h('button', {
      class: cls, 'aria-label': `${info.name}, ${card.hp} of ${info.max} durability`,
      onclick: (ev) => {
        ev.stopPropagation();
        if (t) { if (eligible) { t.onPick(card.uid); ui.targeting = null; } render(); return; }
        ui.selected = ui.selected === card.uid ? null : card.uid;
        ui.confirmScrap = null;
        render();
      },
    },
    h('div', { class: 'card-body' },
      h('span', { class: 'card-name' }, info.name),
      h('span', { class: 'card-abbr' }, info.abbr),
      h('span', { class: 'card-meta' }, h('span', { class: 'card-w' }, `W${fmt(info.weight)} · `), `${Math.max(0, card.hp)}/${info.max}`),
      pips,
    ),
    toks,
    incoming != null ? h('span', { class: 'incoming' }, incoming > 0 ? `−${incoming}` : '0') : null);
  }

  function shipView({ insert = null, title = 'Your ship' } = {}) {
    if (insert) ui.insertFn = insert;
    const toggle = h('button', { class: 'btn small', onclick: () => { ui.cardView = !ui.cardView; try { localStorage.setItem('cardships.cardView', ui.cardView ? '1' : '0'); } catch (e) { /* storage unavailable */ } render(); } }, ui.cardView ? 'Hide cards' : 'Card view');
    if (!ui.cardView) {
      const parts = [h('div', { class: 'ship-head' }, h('h3', {}, title), h('span', { class: 'muted' }, `Weight ${fmt(game.weight())} · ${game.cards().length}/6 modules`), toggle),
        h('p', { class: 'muted' }, insert ? 'Tap a brass bolt on your ship in the flight view to install the part there, or open the card view.' : 'Tap a module on your ship in the flight view to see its card and actions.')];
      if (game.has('cargo')) parts.push(h('div', { class: 'storage' }, h('span', { class: 'eyebrow', style: 'align-self:center' }, `Cargo ${game.storage.length}/2`), game.storage.map((c) => h('div', { class: 'slot' }, cardEl(c)))));
      if (ui.targeting) parts.push(h('p', { class: 'muted' }, 'Choose a highlighted module on your ship.'));
      return h('section', { class: 'panel ship-wrap compact' }, parts);
    }
    const hits = predictedHits();
    const grid = h('div', { class: 'ship' });
    grid.append(
      h('div', { class: 'side-label', style: 'grid-column: 1 / 4' }, '◂ Stern (left)'),
      h('div', { class: 'side-label', style: 'grid-column: 4' }, 'Core'),
      h('div', { class: 'side-label', style: 'grid-column: 5 / 8' }, 'Bow (right) ▸'),
    );
    for (const side of SIDES) {
      const s = game[side];
      const full = s.length >= 3;
      for (let i = 0; i < 3; i++) {
        const col = side === 'left' ? 3 - i : 5 + i;
        const slot = h('div', { class: 'slot', style: `grid-column: ${col}; grid-row: 2` });
        if (s[i]) {
          slot.append(cardEl(s[i], hits));
          if (insert && !full) slot.append(h('button', { class: `insert-tab ${side === 'left' ? 'at-right' : 'at-left'}`, title: `Insert at ${side} layer ${i + 1}`, 'aria-label': `Insert at ${side} layer ${i + 1}`, onclick: act(() => insert(side, i)) }, '+'));
        } else if (insert && i === s.length) {
          slot.append(h('button', { class: 'slot-attach', onclick: act(() => insert(side, i)) }, `Attach at layer ${i + 1}`));
        } else {
          slot.append(h('div', { class: 'slot-empty' }, s.length === 0 && i === 0 ? 'Bare: Core exposed' : 'Open'));
        }
        grid.append(slot);
        grid.append(h('div', { class: 'layer-tag', style: `grid-column: ${col}; grid-row: 3` }, `L${i + 1}${s[i] && i === s.length - 1 ? ' · out' : ''}`));
      }
    }
    grid.append(h('div', { class: 'slot', style: 'grid-column: 4; grid-row: 2' }, cardEl(game.core, hits)));
    grid.append(h('div', { class: 'layer-tag', style: 'grid-column: 4; grid-row: 3' }, D.CORES[game.core.id].name.split(' ')[0]));

    const parts = [h('div', { class: 'ship-head' }, h('h3', {}, title), h('span', { class: 'muted' }, `Weight ${fmt(game.weight())} · ${game.cards().length}/6 modules`), toggle), grid];
    if (game.has('cargo')) {
      const store = h('div', { class: 'storage' }, h('span', { class: 'eyebrow', style: 'align-self:center' }, `Cargo ${game.storage.length}/2`));
      for (const c of game.storage) store.append(h('div', { class: 'slot' }, cardEl(c)));
      parts.push(store);
    }
    return h('section', { class: 'panel ship-wrap' }, parts, inspector());
  }

  function rulesBlock(card) {
    if (card === game.core) {
      const c = D.CORES[card.id];
      return h('div', { class: 'rules' },
        h('div', {}, h('b', {}, `${c.passive.name}: `), c.passive.text),
        h('div', {}, h('b', {}, `${c.ability.name} (${c.ability.cost} Steam): `), c.ability.text));
    }
    return h('div', { class: 'rules' }, D.PARTS[card.id].rules.map(([k, v]) => h('div', {}, h('b', {}, k + ': '), v)));
  }

  function inspector() {
    const box = h('div', { class: 'inspector' });
    const uid = ui.selected;
    const stored = uid && game.storage.find((c) => c.uid === uid);
    const loc = uid && (game.locate(uid) || (stored && { card: stored, side: null, idx: -1, stored: true }));
    if (!loc || ui.targeting) {
      if (!ui.targeting) box.append(h('p', { class: 'muted' }, game.phase === 'combat' ? 'Tap a module to fire, swap or vent it.' : 'Tap any module to read its rules.'));
      return box;
    }
    const card = loc.card;
    const info = cardInfo(card);
    box.append(h('div', { class: 'row' },
      h('span', { class: `type-chip ${info.type}` }, info.type),
      info.rarity ? h('span', { class: `rarity-chip ${info.rarity}` }, info.rarity) : null,
      h('h3', {}, info.name),
      statline(`W${fmt(info.weight)}`, `Dur ${Math.max(0, card.hp)}/${info.max}`)));
    if (card !== game.core) box.append(h('p', { class: 'muted' }, loc.stored ? 'In the Cargo Hold.' : `${loc.side === 'left' ? 'Stern' : 'Bow'} side, layer ${loc.idx + 1}: ${game.isOuter(loc.side, loc.idx) ? 'outside' : 'buried'}.`));
    box.append(rulesBlock(card));
    if (card.bonusMax) box.append(h('p', { class: 'muted' }, `Reinforced: +${card.bonusMax} max Durability.`));
    for (const k of ['fire', 'glue', 'gas']) if (card.tokens[k]) box.append(h('p', {}, h('b', {}, D.TOKENS[k].name + ': '), D.TOKENS[k].text));

    const buttons = h('div', { class: 'row' });
    if (game.phase === 'combat' && !loc.stored) {
      const fi = card !== game.core && game.fireInfo(uid);
      if (fi) for (const mode of fi.modes) {
        const w = game.fireInfo(uid, mode);
        buttons.append(h('button', { class: 'btn small', disabled: w.blocked ? true : null, onclick: act(() => game.fire(uid, mode)) },
          mode === 'aimed' ? 'Aimed shot' : mode === 'steady' ? 'Steady aim' : 'Fire', h('span', { class: 'sub' }, `${w.cost} Steam · ${w.blocked || w.summary}`)));
      }
      if (card !== game.core && game.canUseSupport(uid) && game.supportTargets(uid).length) {
        buttons.append(h('button', { class: 'btn small', onclick: () => startSupport(uid) }, `Use ${partName(card.id)}`, h('span', { class: 'sub' }, `${game.useCost(card)} Steam`)));
      }
      for (const other of game.swapTargets(uid)) {
        const ol = game.locate(other);
        buttons.append(h('button', { class: 'btn small', onclick: act(() => game.swap(uid, other)) }, `Swap ${ol.idx > loc.idx ? 'outward' : 'inward'}`, h('span', { class: 'sub' }, `${game.swapCost()} Steam · with ${partName(ol.card.id)}`)));
      }
      if (game.ventTargets().includes(uid)) buttons.append(h('button', { class: 'btn small', disabled: !game.spendable(VENT_COST) || null, onclick: act(() => game.vent(uid)) }, 'Vent tokens', h('span', { class: 'sub' }, `${VENT_COST} Steam`)));
    }
    if (!loc.stored && card !== game.core) {
      if (game.phase === 'shop') buttons.append(h('button', { class: 'btn small', disabled: game.shop.sold >= 2 || null, onclick: act(() => { game.sell(uid); ui.selected = null; }) }, `Sell for ${game.sellValue(card)} cogs`));
      if (game.phase === 'hangar') buttons.append(h('button', { class: 'btn small', onclick: act(() => { game.detach(uid); ui.selected = null; }) }, 'Detach'));
      if (game.phase === 'loot' || game.phase === 'hangar') {
        if (ui.confirmScrap === uid) buttons.append(h('button', { class: 'btn small primary', onclick: act(() => { game.scrap(uid); ui.selected = null; }) }, 'Confirm: scrap it'));
        else buttons.append(h('button', { class: 'btn small', onclick: () => { ui.confirmScrap = uid; render(); } }, 'Scrap'));
      }
    }
    if (loc.stored && game.phase === 'loot') buttons.append(h('button', { class: 'btn small', onclick: act(() => { game.discardStored(game.storage.indexOf(card)); ui.selected = null; }) }, 'Dump from hold'));
    if (buttons.childNodes.length) box.append(buttons);
    return box;
  }

  function startSupport(uid) {
    const card = game.locate(uid).card;
    const targets = game.supportTargets(uid);
    if (targets.length === 1) { game.useSupport(uid, targets[0]); render(); return; }
    ui.targeting = {
      prompt: card.id === 'repair' ? 'Repair Bay: choose a damaged module touching it' : `${partName(card.id)}: choose a module to clear`,
      eligible: targets, onPick: (t) => game.useSupport(uid, t), cancelable: true,
    };
    render();
  }
  function targetBanner() {
    const t = ui.targeting;
    if (!t) return null;
    return h('div', { class: 'banner' }, h('span', {}, t.prompt),
      t.cancelable ? h('button', { class: 'btn small', onclick: () => { ui.targeting = null; render(); } }, 'Cancel') : null);
  }

  function partSheet(id, extra) {
    const d = D.PARTS[id];
    return h('div', { class: `enc part ${d.rarity}` },
      h('div', { class: 'row' }, h('span', { class: `type-chip ${d.type}` }, d.type), h('span', { class: `rarity-chip ${d.rarity}` }, d.rarity)),
      h('h3', {}, d.name),
      statline(`Weight ${fmt(d.weight)}`, `Durability ${d.hp}`, d.cost != null ? `${d.cost} Steam` : 'Passive'),
      h('div', { class: 'rules stack' }, d.rules.map(([k, v]) => h('div', {}, h('b', {}, k + ': '), v))),
      extra ? h('div', { class: 'enc-foot' }, extra) : null,
    );
  }

  // ---------- loot ----------
  function lootScreen() {
    const panel = h('section', { class: 'panel stack' }, h('span', { class: 'eyebrow' }, game.lootTitle));
    let insert = null;
    if (game.lootOffer) {
      const o = game.lootOffer;
      panel.append(h('h2', {}, o.keep > 1 ? `Keep ${o.keep}` : 'Choose a part'),
        h('p', { class: 'muted' }, 'Take one, or leave them all if none fit your ship.'),
        h('div', { class: 'choices' }, o.ids.map((id, i) => partSheet(id, h('button', { class: 'btn primary', onclick: act(() => game.pickOffer(i)) }, 'Take')))),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: act(() => game.skipOffer()) }, 'Take nothing')));
    } else if (game.pendingLoot.length) {
      const id = game.pendingLoot[0];
      const full = game.left.length >= 3 && game.right.length >= 3;
      const canStore = game.storage.length < game.storageCap();
      insert = (side, pos) => game.installPending(side, pos);
      panel.append(
        h('h2', {}, `Install: ${partName(id)}`),
        h('p', {}, full ? 'Both sides are full. Scrap a module to make room (tap it, then Scrap), stow it or jettison it.' : 'Use an orange marker on your ship to bolt it on. A + tab inserts it at that layer and pushes outer modules out.'),
        game.pendingLoot.length > 1 ? h('p', { class: 'muted' }, `${game.pendingLoot.length - 1} more part${game.pendingLoot.length > 2 ? 's' : ''} waiting.`) : null,
        h('div', { class: 'choices' }, partSheet(id, h('div', { class: 'row' },
          game.has('cargo') ? h('button', { class: 'btn', disabled: !canStore || null, onclick: act(() => game.storePending()) }, 'Stow', h('span', { class: 'sub' }, `${game.storage.length}/2`)) : null,
          h('button', { class: 'btn', onclick: act(() => game.jettisonPending()) }, 'Jettison')))),
      );
    } else if (game.swapAvailable) {
      panel.append(h('h2', {}, 'Quick Swap'),
        h('p', {}, 'You may swap one installed module with one in the Cargo Hold. Choose the stored part first.'),
        h('div', { class: 'row' },
          game.storage.map((c, i) => h('button', { class: `btn ${ui.swapSel === i ? 'primary' : ''}`, onclick: () => { ui.swapSel = i; startSwap(i); } }, partName(c.id))),
          h('button', { class: 'btn', onclick: act(() => { game.swapAvailable = false; ui.swapSel = null; }) }, 'Skip swap')));
    } else {
      panel.append(h('h2', {}, 'Ready to sail'), h('p', { class: 'muted' }, 'Check your layout, then chart the next leg.'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', disabled: game.pendingChoice ? true : null, onclick: act(() => game.finishLoot()) }, 'Chart a course')));
    }
    return [targetBanner(), panel, shipView({ insert })];
  }
  function startSwap(i) {
    ui.targeting = {
      prompt: `Swap ${partName(game.storage[i].id)} in for which module?`,
      eligible: game.cards().filter((c) => !(c.id === 'cargo' && game.count('cargo') === 1)).map((c) => c.uid),
      onPick: (uid) => { game.quickSwap(uid, i); ui.swapSel = null; },
      cancelable: true,
    };
    render();
  }

  // ---------- map ----------
  function d6List(table, rolled = []) {
    return h('ol', { class: 'd6' }, table.map((t, i) => h('li', { class: rolled.includes(i + 1) ? 'rolled' : '' }, h('span', {}, i + 1), h('span', {}, t))));
  }
  function encCard(id, button) {
    const e = D.ENCOUNTERS[id];
    const enemy = e.enemy && D.ENEMIES[e.enemy];
    return h('div', { class: 'enc' },
      h('span', { class: `kind k-${e.kind.replace(' ', '')}` }, e.kind),
      h('h3', {}, e.name),
      h('p', {}, e.text),
      enemy ? statline(`Weight ${enemy.weight}`, `Durability ${enemy.hp}`) : null,
      e.table ? d6List(e.table) : null,
      h('div', { class: 'enc-foot' }, h('span', { class: 'muted' }, e.paths ? `Then ${e.paths} route${e.paths > 1 ? 's' : ''}` : 'Final battle'), button),
    );
  }
  function nodeInfo(n) {
    const known = game.nodeKnown(n);
    if (n.enc === 'boss') {
      const e = D.ENEMIES[n.enemy];
      return { kind: 'Boss', name: e.name, text: e.gimmick, enemy: e };
    }
    if (!known) return { kind: '?', name: n.cloud ? 'Cloud cover' : 'Uncharted', text: n.cloud ? 'Thick cloud hides this route. An outside Telescope sees through it.' : 'Too far to make out. Fly closer, mount a Telescope or buy sky charts.' };
    const enc = D.ENCOUNTERS[n.enc];
    const enemy = n.enemy && D.ENEMIES[n.enemy];
    return { kind: enc.kind, name: enemy && n.enc !== 'beacon' ? `${enc.name}: ${enemy.name}` : enc.name, text: enc.text, enemy, table: enc.table };
  }
  function mapScreen() {
    const cur = game.currentNode();
    const choices = game.mapChoices();
    if (!ui.mapSel || !choices.some((n) => n.id === ui.mapSel)) ui.mapSel = choices.length === 1 ? choices[0].id : ui.mapSel && game.node(ui.mapSel) ? ui.mapSel : null;
    const mapEl = SkyMap.render(game, {
      selected: ui.mapSel,
      onSelect: (id) => { if (ui.flying) return; ui.mapSel = id; render(); },
    });
    const sel = ui.mapSel && game.node(ui.mapSel);
    const reachable = sel && cur.edges.includes(sel.id);
    let detail;
    if (sel) {
      const info = nodeInfo(sel);
      detail = h('div', { class: 'enc map-detail' },
        h('div', { class: 'row' }, h('span', { class: `kind k-${info.kind.replace(' ', '')}` }, info.kind), h('span', { class: 'muted' }, `Column ${sel.col} of ${game.maxDepth}`)),
        h('h3', {}, info.name),
        h('p', {}, info.text),
        info.enemy ? statline(`Weight ${info.enemy.weight}`, `Durability ~${Math.round(info.enemy.hp * (info.enemy.boss ? 1 : 1 + 0.06 * (sel.col - 1)))}`) : null,
        info.table ? d6List(info.table) : null,
        h('div', { class: 'enc-foot' },
          h('span', { class: 'muted' }, reachable ? 'Reachable from here.' : sel.id === cur.id ? 'You are here.' : 'Not reachable from here yet.'),
          reachable ? h('button', { class: 'btn primary', disabled: ui.flying ? true : null, onclick: () => travel(sel.id, mapEl) }, 'Set course') : null));
    } else {
      detail = h('p', { class: 'muted' }, 'Tap a glowing node to plot your next leg.');
    }
    const legend = h('div', { class: 'legend' }, ['patrol', 'lair', 'storm', 'smog', 'trader', 'beacon', 'guild', 'hangar'].map((id) =>
      h('span', { class: `k-${D.ENCOUNTERS[id].kind.replace(' ', '')}` }, SkyMap.icon(id, 16), D.ENCOUNTERS[id].name)));
    const panel = h('section', { class: 'panel stack map-panel' },
      h('div', { class: 'row', style: 'justify-content:space-between' },
        h('div', { class: 'stack', style: 'gap:2px' }, h('span', { class: 'eyebrow' }, `Column ${game.depth} of ${game.maxDepth} · sight ${game.sight()}`), h('h2', {}, 'Sky route')),
        h('span', { class: 'muted' }, `Ahead: ${D.ENEMIES[game.bossId].name}`)),
      mapEl, detail, legend);
    return [targetBanner(), panel, shipView()];
  }
  function travel(id, mapEl) {
    ui.flying = true;
    scene.setMode('travel');
    scene.setBiome(game.node(id).biome);
    mapEl.flyTo(id, () => {
      ui.flying = false;
      ui.mapSel = null;
      game.travel(id);
      render();
    });
  }

  // ---------- event ----------
  function eventScreen() {
    const ev = game.event;
    const e = D.ENCOUNTERS[ev.enc];
    const lines = game.log.filter((l) => l.id > ev.logStart);
    const panel = h('section', { class: 'panel stack' },
      h('span', { class: `kind k-${e.kind.replace(' ', '')}`, style: 'align-self:flex-start' }, e.kind),
      h('h2', {}, e.name),
      h('p', {}, e.text),
      e.table ? d6List(e.table, ev.rolls) : null,
      h('ol', { class: 'log inline' }, lines.map((l) => h('li', { class: l.cls }, l.text))),
    );
    if (ev.options) {
      panel.append(h('div', { class: 'options' }, ev.options.map((o) => h('button', { class: 'option', onclick: act(() => game.chooseOption(o.id)) }, h('b', {}, o.label), h('span', {}, o.desc)))));
    } else {
      panel.append(h('div', { class: 'row' }, h('button', { class: 'btn primary', disabled: game.pendingChoice ? true : null, onclick: act(() => game.continueEvent()) }, ev.next ? 'Battle stations' : ev.loot ? 'Collect' : 'Continue')));
    }
    return [targetBanner(), panel, shipView()];
  }

  // ---------- Sky Dock ----------
  function hangarScreen() {
    const y = game.hangar;
    const e = D.ENCOUNTERS[y.enc];
    const insert = ui.dockSel != null && y.dock[ui.dockSel] ? (side, pos) => { game.attach(ui.dockSel, side, pos); ui.dockSel = null; } : null;
    const dock = h('div', { class: 'storage' }, h('span', { class: 'eyebrow', style: 'align-self:center' }, 'Dock'),
      y.dock.length ? y.dock.map((c, i) => h('button', { class: `btn ${ui.dockSel === i ? 'primary' : ''}`, onclick: () => { ui.dockSel = ui.dockSel === i ? null : i; render(); } }, partName(c.id), h('span', { class: 'sub' }, `${c.hp}/${D.PARTS[c.id].hp + c.bonusMax}`)))
        : h('span', { class: 'muted' }, 'Tap a module, then Detach, to lift it onto the dock.'));
    const panel = h('section', { class: 'panel stack' },
      h('span', { class: 'kind k-SkyDock', style: 'align-self:flex-start' }, e.kind),
      h('h2', {}, e.name),
      h('p', {}, 'Full reassembly: detach any modules and reattach them anywhere. Choose a docked part, then an orange marker on your ship.'),
      dock,
      h('h3', {}, 'Mechanics'),
      d6List(e.table, y.roll ? [y.roll] : []),
      h('div', { class: 'row' },
        h('button', { class: 'btn', disabled: y.roll ? true : null, onclick: act(() => game.salvage()) }, 'Roll for the mechanics'),
        h('button', { class: 'btn primary', disabled: !y.roll || game.pendingChoice ? true : null, onclick: act(() => { game.leaveHangar(); ui.dockSel = null; }) }, 'Cast off')),
      y.dock.length ? h('p', { class: 'muted' }, 'Parts left on the dock go into the Cargo Hold if there is room, otherwise they stay behind.') : null,
    );
    return [targetBanner(), panel, shipView({ insert })];
  }

  // ---------- Trading Zeppelin ----------
  function shopScreen() {
    const sh = game.shop;
    const P = D.PRICES;
    const service = (kind, label, desc, price) => h('button', { class: 'option', disabled: sh[kind] || game.cogs < price ? true : null, onclick: act(() => game.buyService(kind)) },
      h('b', {}, `${label} · ${price} cogs`), h('span', {}, sh[kind] ? 'Bought.' : desc));
    const panel = h('section', { class: 'panel stack' },
      h('span', { class: 'kind k-Trade', style: 'align-self:flex-start' }, 'Trade'),
      h('div', { class: 'row', style: 'justify-content:space-between' }, h('h2', {}, 'Trading Zeppelin'), h('span', { class: 'cogs' }, `${game.cogs} cogs`)),
      h('p', { class: 'muted' }, 'Bought parts are installed when you cast off. Tap one of your modules to sell it (up to 2).'),
      h('div', { class: 'choices' }, sh.stock.map((item, i) => partSheet(item.id, item.sold ? h('span', { class: 'muted' }, 'Sold') :
        h('button', { class: 'btn primary', disabled: game.cogs < item.price ? true : null, onclick: act(() => game.buy(i)) }, `Buy · ${item.price} cogs`)))),
      h('h3', {}, 'Services'),
      h('div', { class: 'options' },
        service('core', 'Hull patch', 'Repair 4 Core.', P.coreRepair),
        service('full', 'Full refit', 'Fully repair every module.', P.fullRepair),
        service('charts', 'Sky charts', '+1 sight on the map for three legs.', P.charts)),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: act(() => game.leaveShop()) }, game.pendingLoot.length ? `Cast off and install ${game.pendingLoot.length} part${game.pendingLoot.length > 1 ? 's' : ''}` : 'Cast off')),
    );
    return [panel, shipView()];
  }

  // ---------- combat ----------
  function intentText(it) {
    if (!it) return '';
    const where = it.side ? `${it.side === 'left' ? 'stern' : 'bow'}${it.layer != null ? ` layer ${it.layer + 1}` : ''}` : '';
    switch (it.kind) {
      case 'shot': return `${game.intentDamage(it)} damage → ${where}`;
      case 'rake': return `${game.intentDamage(it)} to every module on the ${where}`;
      case 'broadside': return `${game.intentDamage(it)} to the outside module on both sides`;
      case 'ram': return `Ram for ${game.intentDamage(it)} → outside of the ${where}`;
      case 'token': return `${D.TOKENS[it.token].name}${it.dmg ? ` + ${game.intentDamage(it)} damage` : ''} → ${where}`;
      case 'block': return `Gains ${it.amount} Block`;
      case 'repair': return `Repairs ${it.amount}`;
      case 'charge': return `Next attack +${it.amount}`;
      default: return '';
    }
  }
  function combatScreen() {
    const c = game.combat;
    const en = c.enemy;
    const def = D.ENEMIES[c.enemyId];
    const bar = h('div', { class: 'durbar', 'aria-label': `${en.hp} of ${en.max} durability` });
    const marks = def.phases.map((p) => p.min).filter((m) => m > 1);
    for (let i = 1; i <= en.max; i++) bar.append(h('i', { class: `${i <= en.hp ? 'on' : ''} ${marks.includes(i + 1) ? 'mark' : ''}` }));
    const chips = h('div', { class: 'chips' },
      en.block ? h('span', { class: 'chip shield' }, `Block ${en.block}`) : null,
      en.burn ? h('span', { class: 'chip fire' }, `Burn ${en.burn}`) : null,
      en.weak ? h('span', { class: 'chip glue' }, `Gummed ${en.weak}`) : null,
      en.vuln ? h('span', { class: 'chip gas' }, `Choking ${en.vuln}`) : null,
      en.charge ? h('span', { class: 'chip fire' }, `Charged +${en.charge}`) : null,
      game.enrage() ? h('span', { class: 'chip fire' }, `Enraged +${game.enrage()}`) : null,
      en.dmgBonus ? h('span', { class: 'chip fire' }, `Veteran +${en.dmgBonus}`) : null,
      c.enemyId === 'leviathan' ? h('span', { class: 'chip shield' }, 'Ironclad Hull −1') : null,
      c.enemyId === 'stormqueen' ? h('span', { class: 'chip gas' }, `Gale next: ${c.galeSide === 'left' ? 'stern' : 'bow'}`) : null,
      c.enemyId === 'colossus' ? h('span', { class: 'chip glue' }, `Mainspring +${en.wound} · snap ${c.turnDamage}/6`) : null,
      en.stunned ? h('span', { class: 'chip shield' }, 'Stunned') : null);
    const preview = game.previewIntent();
    const it = en.intent;
    const intentBox = h('div', { class: `intent ${game.isAttack(it) ? 'attack' : ''} ${c.evading ? 'evaded' : ''}` },
      h('span', { class: 'eyebrow' }, en.stunned ? 'Next move · cancelled by the snap' : `Next move · rolled ${it.roll}`),
      h('b', {}, it.name),
      h('span', {}, intentText(it)),
      preview && preview.plan.length ? h('span', { class: 'muted' }, c.evading ? 'You will evade it.' : 'Hits: ' + preview.plan.map((p) => `${p.uid === 'core' ? 'Core' : partName(game.locate(p.uid).card.id)} ${p.braced ? 'braced' : p.dmg > 0 ? '−' + p.dmg : p.token ? '+' + p.token : '0'}`).join(', ')) : null);
    const enemy = h('section', { class: 'panel enemy' },
      h('div', { class: 'enemy-head' },
        h('div', { class: 'stack', style: 'gap:4px' }, h('span', { class: `kind k-${def.boss ? 'Boss' : def.elite ? 'Elite' : 'Combat'}`, style: 'align-self:flex-start' }, def.boss ? 'Boss' : def.elite ? 'Elite' : 'Enemy'), h('h2', {}, en.name),
          def.gimmick ? h('p', { class: 'muted' }, def.gimmick) : null),
        statline(`Weight ${fmt(en.weight)}`, h('span', {}, 'Dur ', h('b', {}, `${Math.max(0, en.hp)}/${en.max}`)))),
      bar, chips, intentBox,
      h('details', { class: 'phases-wrap' }, h('summary', {}, 'Tactics table'),
        h('div', { class: 'phases' }, def.phases.map((p, pi) => {
          const top = pi === 0 ? en.max : def.phases[pi - 1].min - 1;
          return h('div', { class: `phase ${pi === en.phase ? 'current' : ''}` },
            h('span', { class: 'eyebrow' }, p.name, ' ', h('span', {}, `${top}–${p.min}`)),
            d6List(p.table.map((a) => a.name), pi === en.phase ? [it.roll] : []));
        }))),
    );

    const steam = h('div', { class: 'steam', 'aria-label': `${c.steam} steam` });
    for (let i = 0; i < Math.max(c.steam, game.steamCap()); i++) steam.append(h('i', { class: i < c.steam ? 'on' : '' }));
    const turn = h('section', { class: 'panel stack' },
      h('div', { class: 'turnbar' },
        h('span', { class: 'turn-state' }, `Round ${c.round}`),
        h('div', { class: 'row' }, h('span', { class: 'hud-label' }, 'Steam'), steam,
          game.core.id === 'zeppelin' ? h('span', { class: 'hud-label' }, `Pressure ${game.core.pressure}`) : null)));
    const bar2 = h('div', { class: 'actionbar' });
    for (const card of game.cards()) {
      const fi = game.fireInfo(card.uid);
      if (!fi || fi.blocked === 'Buried: only outside weapons fire') continue;
      for (const mode of fi.modes) {
        const w = game.fireInfo(card.uid, mode);
        bar2.append(h('button', { class: 'btn', disabled: w.blocked ? true : null, onclick: act(() => game.fire(card.uid, mode)) },
          `${mode === 'aimed' ? 'Aim' : mode === 'steady' ? 'Steady' : 'Fire'} ${partName(card.id)}`, h('span', { class: 'sub' }, `${w.cost}⚙ · ${w.blocked || w.summary}`)));
      }
    }
    const core = game.coreAbilityInfo();
    bar2.append(h('button', { class: 'btn', disabled: core.blocked ? true : null, onclick: act(() => game.useCore()) }, core.ability.name, h('span', { class: 'sub' }, `${core.cost}⚙ · ${core.blocked || core.summary}`)));
    const ec = game.evadeCost();
    if (ec != null) bar2.append(h('button', { class: 'btn', disabled: !game.canEvade() || null, onclick: act(() => game.evade()) }, 'Evade', h('span', { class: 'sub' }, `${ec}⚙ · ${c.evading ? 'ready' : game.isAttack(it) ? 'dodge the attack' : 'nothing to dodge'}`)));
    for (const card of game.cards()) {
      if (!game.canUseSupport(card.uid) || !game.supportTargets(card.uid).length) continue;
      bar2.append(h('button', { class: 'btn', onclick: () => startSupport(card.uid) }, `Use ${partName(card.id)}`, h('span', { class: 'sub' }, `${game.useCost(card)}⚙`)));
    }
    bar2.append(h('button', { class: `btn ${c.steam > 0 ? '' : 'primary'}`, onclick: act(() => game.endTurn()) }, 'End turn'));
    turn.append(bar2, h('p', { class: 'muted' }, 'Tap a module to swap it with a neighbour (1⚙) or vent its tokens (2⚙).'));
    return [enemy, targetBanner(), turn, shipView()];
  }

  // ---------- end ----------
  function endScreen() {
    const won = game.phase === 'victory';
    const s = game.stats;
    if (ui.recorded !== game) { ui.recorded = game; ui.newUnlocks = Meta.recordRun(meta, game); }
    const boss = D.ENEMIES[game.bossId];
    const stat = (label, v) => h('div', { class: 'stat' }, h('b', {}, v), h('span', { class: 'hud-label' }, label));
    return [
      h('section', { class: 'panel stack' },
        h('span', { class: 'eyebrow' }, won ? 'Victory' : 'Run over'),
        h('h2', { style: 'font-size: clamp(40px, 9vw, 72px)' }, won ? `${boss.name.replace('The ', '')} sunk` : 'Core ruptured'),
        h('p', {}, won ? `Your ${D.CORES[game.core.id].name} brought down ${boss.name}.` : `Your ${D.CORES[game.core.id].name} went down at column ${game.depth} of ${game.maxDepth}.`),
        h('div', { class: 'stats' }, stat('Encounters', s.encounters), stat('Enemies downed', s.kills), stat('Damage dealt', s.dmgDealt), stat('Damage taken', s.dmgTaken), stat('Cogs earned', s.cogs), stat('Contracts', s.quests)),
        ui.newUnlocks.length ? h('div', { class: 'banner unlock-banner' }, h('span', {}, 'Unlocked: ' + ui.newUnlocks.map((u) => `${u.name} (${u.kind})`).join(', '))) : null,
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { game = null; ui.selected = null; meta = Meta.load(); render(); } }, 'New run')),
      ),
      shipView({ title: 'Final ship' }),
    ];
  }

  // ---------- settings ----------
  function renderSettings() {
    const P = FX.prefs;
    const radio = (key, label, options) => h('fieldset', { class: 'set-group' }, h('legend', {}, label),
      h('div', { class: 'seg' }, options.map(([val, text]) => h('label', { class: `seg-opt ${P[key] === val ? 'on' : ''}` },
        h('input', { type: 'radio', name: key, id: `set-${key}-${val}`, value: String(val), checked: P[key] === val || null, onchange: () => { P[key] = val; FX.savePrefs(); applyPrefs(); renderSettings(); } }), text))));
    const slider = (key, label) => h('label', { class: 'set-slider', for: `set-${key}` }, h('span', {}, label),
      h('input', { type: 'range', id: `set-${key}`, min: '0', max: '1', step: '0.05', value: String(P[key]), oninput: (e) => { P[key] = Number(e.target.value); FX.savePrefs(); applyPrefs(); } }));
    $('settings').replaceChildren(
      h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', {}, 'Settings'), h('button', { class: 'btn small', onclick: () => { $('settings').hidden = true; } }, 'Done')),
      radio('shake', 'Screen shake', [['full', 'Full'], ['reduced', 'Reduced'], ['off', 'Off']]),
      radio('flash', 'Flashing effects', [[true, 'On'], [false, 'Off']]),
      radio('dice', 'Dice animation', [['normal', 'Normal'], ['fast', 'Fast'], ['off', 'Off']]),
      slider('music', 'Music volume'),
      slider('sfx', 'Sound effects volume'),
      radio('mute', 'Sound', [[false, 'On'], [true, 'Muted']]),
      h('p', { class: 'muted' }, 'Tap the flight view during an animation to skip ahead.'));
  }
  function applyPrefs() { if (window.CardshipsAudio) window.CardshipsAudio.applyPrefs(FX.prefs); }
  $('settings-btn').addEventListener('click', () => { const el = $('settings'); el.hidden = !el.hidden; if (!el.hidden) renderSettings(); });

  $('brand').addEventListener('click', () => { if (!game || ['gameover', 'victory'].includes(game.phase)) { game = null; render(); } });
  render();

  window.cardships = { get game() { return game; }, scene, render, actors: Actors };
})();
