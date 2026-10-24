// Cardships browser UI. Renders the engine state and turns clicks into engine calls.
(function () {
  const D = window.CardshipsData;
  const { Game, fmt, SIDES } = window.CardshipsEngine;

  let game = null;
  const ui = { selected: null, targeting: null, dockSel: null, swapSel: null, confirmScrap: null, logCount: 0 };

  const prefs = { strict: false };
  try { prefs.strict = localStorage.getItem('cardships.strict') === '1'; } catch (e) { /* storage unavailable */ }
  function saveStrict(v) {
    prefs.strict = v;
    try { localStorage.setItem('cardships.strict', v ? '1' : '0'); } catch (e) { /* storage unavailable */ }
  }

  // ---------- tiny DOM helper ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
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

  function act(fn) {
    return (ev) => {
      if (ev) ev.stopPropagation();
      fn();
      ui.targeting = null;
      ui.confirmScrap = null;
      if (ui.selected && game && !game.locate(ui.selected)) ui.selected = null;
      render();
    };
  }

  // ---------- render root ----------
  function render() {
    renderHud();
    const stage = $('stage');
    stage.replaceChildren(...stageContent().filter(Boolean));
    renderLog();
    if (game) game.flashes.clear();
    if (game && game.combat) game.combat.flashEnemy = false;
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
      case 'shipyard': return shipyardScreen();
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
    const route = h('div', { class: 'route', title: `Encounter ${game.depth} of ${game.maxDepth}` });
    for (let i = 1; i <= game.maxDepth; i++) {
      const cls = [i < game.depth || (i === game.depth && game.phase === 'map') ? 'done' : '', i === game.depth && game.phase !== 'map' ? 'here' : '', i === game.maxDepth ? 'boss' : ''].join(' ');
      route.append(h('i', { class: cls }));
    }
    const item = (label, value, title) => h('div', { class: 'hud-item', title }, h('span', { class: 'hud-label' }, label), h('span', { class: 'hud-value' }, value));
    hud.replaceChildren(...[
      item('Route', route),
      item('Core', `${Math.max(0, game.core.dur)}/${game.core.max}`),
      item('Weight', fmt(game.weight()), 'Lower weight acts first in combat'),
      item('Actions', String(game.actionsPerTurn()), 'Actions per combat turn'),
      game.quest ? item('Contract', D.QUESTS[game.quest].name, D.QUESTS[game.quest].goal) : null,
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
    const cores = Object.values(D.CORES).map((c) =>
      h('button', { class: 'core-pick', onclick: () => { game = new Game({ strict: prefs.strict }); game.chooseCore(c.id); ui.selected = null; render(); } },
        h('span', { class: 'eyebrow' }, 'Core'),
        h('span', { class: 'name' }, c.name.replace(' Core', '')),
        statline(h('span', {}, 'Weight ', h('b', {}, fmt(c.weight))), h('span', {}, 'Durability ', h('b', {}, c.dur))),
        h('span', {}, h('b', {}, c.ability.name + '. '), c.ability.text),
        h('span', { class: 'muted' }, c.blurb),
      ));
    const strictBox = h('input', { type: 'checkbox', id: 'strict-toggle', checked: prefs.strict || null, onchange: (e) => saveStrict(e.target.checked) });
    return [
      h('div', { class: 'title-hero' },
        h('span', { class: 'eyebrow' }, 'A roguelike of bolted-together sky ships'),
        h('h1', {}, 'Cardships'),
        h('p', {}, 'Pick a Core, bolt parts to its left and right, and fly through ten encounters to face the Iron Leviathan. If your Core breaks, the run is over.'),
      ),
      h('div', { class: 'cores' }, cores),
      h('div', { class: 'panel stack' },
        h('h3', {}, 'How the ship works'),
        h('div', { class: 'primer' },
          h('div', {}, h('b', {}, 'Layers'), h('span', {}, 'Up to 3 cards per side. Layer 1 touches the Core. Only the outside card of a side can fire.')),
          h('div', {}, h('b', {}, 'Enemy targeting'), h('span', {}, 'Enemies flip a coin for the side and roll a d4 for the layer. A 4 misses. An empty layer means a direct hit on your Core.')),
          h('div', {}, h('b', {}, 'Weight'), h('span', {}, 'Core weight plus 1 per card. The lighter ship acts first each round.')),
          h('div', {}, h('b', {}, 'Actions'), h('span', {}, '1 per turn, +1 per Barracks. Support cards spend their own Durability to work.')),
          h('div', {}, h('b', {}, 'Paths'), h('span', {}, 'Each encounter says how many routes you choose from next, up to 3. An outside Telescope adds one.')),
          h('div', {}, h('b', {}, 'Loot'), h('span', {}, 'Win a fight to draw a Part Card. Install it, stow it or jettison it.')),
        ),
        h('label', { class: 'toggle', for: 'strict-toggle' }, strictBox,
          h('span', {}, h('b', {}, 'Strict durability. '), h('span', { class: 'muted' }, 'Every weapon spends 1 Durability per shot, as the rule sheet\'s action economy reads. Off: only the Cannon and Sniper do, as their card text says.'))),
      ),
    ];
  }

  // ---------- cards ----------
  function cardInfo(card) {
    if (card === game.core) {
      const c = D.CORES[card.id];
      return { name: c.name, abbr: 'CORE', type: 'core', weight: c.weight, max: card.max };
    }
    const d = D.PARTS[card.id];
    return { name: d.name, abbr: d.abbr, type: d.type, weight: d.weight, max: game.maxDur(card) };
  }
  function cardEl(card) {
    const info = cardInfo(card);
    const t = ui.targeting;
    const eligible = t && t.eligible.includes(card.uid);
    const cls = ['card', info.type, ui.selected === card.uid && !t ? 'selected' : '', eligible ? 'eligible' : '', t && !eligible ? 'dim' : '', game.flashes.has(card.uid) ? 'hit' : ''].join(' ');
    const pips = h('div', { class: 'pips' });
    for (let i = 0; i < info.max; i++) pips.append(h('i', { class: i < card.dur ? 'on' : '' }));
    const toks = h('div', { class: 'tokens' });
    for (const k of ['fire', 'glue', 'gas']) if (card.tokens[k]) toks.append(h('span', { class: `tok ${k}` }, k));
    if (card.cd > 0) toks.append(h('span', { class: 'tok cd' }, 'cd'));
    return h('button', {
      class: cls, 'aria-label': `${info.name}, ${card.dur} of ${info.max} durability`,
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
      h('span', { class: 'card-meta' }, h('span', { class: 'card-w' }, `W${fmt(info.weight)} · `), `${Math.max(0, card.dur)}/${info.max}`),
      pips,
    ),
    toks);
  }

  // insert: null or (side, pos) => void — shows install markers on the ship
  function shipView({ insert = null, title = 'Your ship' } = {}) {
    const grid = h('div', { class: 'ship' });
    grid.append(
      h('div', { class: 'side-label', style: 'grid-column: 1 / 4' }, '◂ Left'),
      h('div', { class: 'side-label', style: 'grid-column: 4' }, 'Core'),
      h('div', { class: 'side-label', style: 'grid-column: 5 / 8' }, 'Right ▸'),
    );
    for (const side of SIDES) {
      const s = game[side];
      const full = s.length >= 3;
      for (let i = 0; i < 3; i++) {
        const col = side === 'left' ? 3 - i : 5 + i;
        const slot = h('div', { class: 'slot', style: `grid-column: ${col}; grid-row: 2` });
        if (s[i]) {
          slot.append(cardEl(s[i]));
          if (insert && !full) {
            slot.append(h('button', { class: `insert-tab ${side === 'left' ? 'at-right' : 'at-left'}`, title: `Insert at ${side} layer ${i + 1}`, 'aria-label': `Insert at ${side} layer ${i + 1}`, onclick: act(() => insert(side, i)) }, '+'));
          }
        } else if (insert && i === s.length) {
          slot.append(h('button', { class: 'slot-attach', onclick: act(() => insert(side, i)) }, `Attach at layer ${i + 1}`));
        } else {
          slot.append(h('div', { class: 'slot-empty' }, i === s.length ? 'Open: Core exposed' : 'Open'));
        }
        grid.append(slot);
        grid.append(h('div', { class: 'layer-tag', style: `grid-column: ${col}; grid-row: 3` }, `L${i + 1}${s[i] && i === s.length - 1 ? ' · out' : ''}`));
      }
    }
    grid.append(h('div', { class: 'slot', style: 'grid-column: 4; grid-row: 2' }, cardEl(game.core)));
    grid.append(h('div', { class: 'layer-tag', style: 'grid-column: 4; grid-row: 3' }, D.CORES[game.core.id].name.split(' ')[0]));

    const parts = [h('div', { class: 'ship-head' }, h('h3', {}, title), h('span', { class: 'muted' }, `Weight ${fmt(game.weight())} · ${game.cards().length}/6 parts`)), grid];
    if (game.has('storageBay')) {
      const store = h('div', { class: 'storage' }, h('span', { class: 'eyebrow', style: 'align-self:center' }, `Storage ${game.storage.length}/2`));
      for (const c of game.storage) store.append(h('div', { class: 'slot' }, cardEl(c)));
      parts.push(store);
    }
    return h('section', { class: 'panel ship-wrap' }, parts, inspector());
  }

  function inspector() {
    const box = h('div', { class: 'inspector' });
    const uid = ui.selected;
    const inStorage = uid && game.storage.find((c) => c.uid === uid);
    const loc = uid && (game.locate(uid) || (inStorage && { card: inStorage, side: null, idx: -1, stored: true }));
    if (!loc || ui.targeting) {
      box.append(h('p', { class: 'muted' }, ui.targeting ? '' : 'Tap any card to read its rules.'));
      return box;
    }
    const card = loc.card;
    const info = cardInfo(card);
    const head = h('div', { class: 'row' }, h('span', { class: `type-chip ${info.type}` }, info.type), h('h3', {}, info.name), statline(`W${fmt(info.weight)}`, `Dur ${Math.max(0, card.dur)}/${info.max}`));
    box.append(head);
    if (card === game.core) {
      const c = D.CORES[card.id];
      box.append(h('div', { class: 'rules' }, h('div', {}, h('b', {}, c.ability.name + ': '), c.ability.text), h('div', { class: 'muted' }, c.blurb)));
    } else {
      const d = D.PARTS[card.id];
      if (loc.stored) box.append(h('p', { class: 'muted' }, 'In storage.'));
      else box.append(h('p', { class: 'muted' }, `${loc.side === 'left' ? 'Left' : 'Right'} side, layer ${loc.idx + 1}: ${game.isOuter(loc.side, loc.idx) ? 'outside' : 'buried'}.`));
      box.append(h('div', { class: 'rules' }, d.rules.map(([k, v]) => h('div', {}, h('b', {}, k + ': '), v))));
      if (card.bonusMax) box.append(h('p', { class: 'muted' }, `Reinforced: +${card.bonusMax} max Durability.`));
    }
    for (const k of ['fire', 'glue', 'gas']) if (card.tokens[k]) box.append(h('p', {}, h('b', {}, D.TOKENS[k].name + ' token: '), D.TOKENS[k].text));

    const buttons = h('div', { class: 'row' });
    if (!loc.stored && card !== game.core) {
      if (game.canUseSupport(uid)) {
        const targets = game.supportTargets(uid);
        buttons.append(h('button', { class: 'btn small', disabled: !targets.length || null, onclick: () => startSupport(uid) }, `Use ${D.PARTS[card.id].name}`, h('span', { class: 'sub' }, targets.length ? '−1 Dur' : 'no target')));
      }
      if (game.phase === 'shipyard') buttons.append(h('button', { class: 'btn small', onclick: act(() => { game.detach(uid); ui.selected = null; }) }, 'Detach'));
      if (game.phase === 'loot' || game.phase === 'map') {
        if (ui.confirmScrap === uid) buttons.append(h('button', { class: 'btn small primary', onclick: act(() => { game.scrap(uid); ui.selected = null; }) }, 'Confirm: scrap it'));
        else buttons.append(h('button', { class: 'btn small', onclick: () => { ui.confirmScrap = uid; render(); } }, 'Scrap'));
      }
    }
    if (loc.stored && game.phase === 'loot') buttons.append(h('button', { class: 'btn small', onclick: act(() => { game.discardStored(game.storage.indexOf(card)); ui.selected = null; }) }, 'Dump from storage'));
    if (buttons.childNodes.length) box.append(buttons);
    return box;
  }

  function startSupport(uid) {
    const name = D.PARTS[game.locate(uid).card.id].name;
    ui.targeting = {
      prompt: game.locate(uid).card.id === 'repairBay' ? `${name}: choose a damaged card to repair` : `${name}: choose a card to clear`,
      eligible: game.supportTargets(uid),
      onPick: (t) => game.useSupport(uid, t),
      cancelable: true,
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
    return h('div', { class: 'enc' },
      h('span', { class: `type-chip ${d.type}`, style: 'align-self:flex-start' }, d.type),
      h('h3', {}, d.name),
      statline(`Weight ${fmt(d.weight)}`, `Durability ${d.dur}`),
      h('div', { class: 'rules stack' }, d.rules.map(([k, v]) => h('div', {}, h('b', {}, k + ': '), v))),
      extra ? h('div', { class: 'enc-foot' }, extra) : null,
    );
  }

  // ---------- loot ----------
  function lootScreen() {
    const out = [];
    const panel = h('section', { class: 'panel stack' }, h('span', { class: 'eyebrow' }, game.lootTitle));
    let insert = null;
    if (game.lootOffer) {
      const o = game.lootOffer;
      panel.append(h('h2', {}, o.keep > 1 ? `Keep ${o.keep}` : 'Choose a part'),
        h('p', { class: 'muted' }, o.ids.length > 1 ? 'Take one. The rest are discarded.' : 'Take it.'),
        h('div', { class: 'choices' }, o.ids.map((id, i) => partSheet(id, h('button', { class: 'btn primary', onclick: act(() => game.pickOffer(i)) }, 'Take')))));
    } else if (game.pendingLoot.length) {
      const id = game.pendingLoot[0];
      const full = game.left.length >= 3 && game.right.length >= 3;
      const canStore = game.storage.length < game.storageCap();
      insert = (side, pos) => game.installPending(side, pos);
      panel.append(
        h('h2', {}, `Place: ${D.PARTS[id].name}`),
        h('p', {}, full ? 'Both sides are full. Scrap an installed part to make room (tap it, then Scrap), stow it or jettison it.' : 'Use an orange marker on your ship below to install it. A + tab inserts it at that layer and pushes the outer cards out.'),
        game.pendingLoot.length > 1 ? h('p', { class: 'muted' }, `${game.pendingLoot.length - 1} more part${game.pendingLoot.length > 2 ? 's' : ''} waiting after this one.`) : null,
        h('div', { class: 'choices' }, partSheet(id, h('div', { class: 'row' },
          game.has('storageBay') ? h('button', { class: 'btn', disabled: !canStore || null, onclick: act(() => game.storePending()) }, 'Stow', h('span', { class: 'sub' }, `${game.storage.length}/2`)) : null,
          h('button', { class: 'btn', onclick: act(() => game.jettisonPending()) }, 'Jettison')))),
      );
    } else if (game.swapAvailable) {
      panel.append(h('h2', {}, 'Quick Swap'),
        h('p', {}, ui.swapSel == null ? 'You may swap one installed part with one in storage. Choose the stored part first.' : 'Now tap the installed part to swap out.'),
        h('div', { class: 'row' },
          game.storage.map((c, i) => h('button', { class: `btn ${ui.swapSel === i ? 'primary' : ''}`, onclick: () => { ui.swapSel = i; startSwap(i); } }, D.PARTS[c.id].name)),
          h('button', { class: 'btn', onclick: act(() => { game.swapAvailable = false; ui.swapSel = null; }) }, 'Skip swap')));
    } else {
      panel.append(h('h2', {}, 'Ready to sail'), h('p', { class: 'muted' }, 'Check your layout, then chart the next leg.'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', disabled: game.pendingChoice ? true : null, onclick: act(() => game.finishLoot()) }, 'Chart a course')));
    }
    out.push(targetBanner(), panel, shipView({ insert }));
    return out;
  }
  function startSwap(i) {
    ui.targeting = {
      prompt: `Swap ${D.PARTS[game.storage[i].id].name} in for which installed part?`,
      eligible: game.cards().filter((c) => !(c.id === 'storageBay' && game.count('storageBay') === 1)).map((c) => c.uid),
      onPick: (uid) => { game.quickSwap(uid, i); ui.swapSel = null; },
      cancelable: true,
    };
    render();
  }

  // ---------- map ----------
  function d4List(table, rolled = []) {
    return h('ol', { class: 'd4' }, table.map((t, i) => h('li', { class: rolled.includes(i + 1) ? 'rolled' : '' }, h('span', {}, i + 1), h('span', {}, t))));
  }
  function encCard(id, button) {
    const e = D.ENCOUNTERS[id];
    const enemy = e.enemy && D.ENEMIES[e.enemy];
    return h('div', { class: 'enc' },
      h('span', { class: `kind ${e.kind}` }, e.kind),
      h('h3', {}, e.name),
      h('p', {}, e.text),
      enemy ? statline(`Weight ${enemy.weight}`, `Durability ${enemy.dur}`) : null,
      e.table ? d4List(e.table) : null,
      h('div', { class: 'enc-foot' }, h('span', { class: 'muted' }, e.paths ? `Then ${e.paths} path${e.paths > 1 ? 's' : ''}` : 'Final battle'), button),
    );
  }
  function mapScreen() {
    const tele = game.telescopeBonus();
    const n = game.choices.length;
    const panel = h('section', { class: 'panel stack' },
      h('span', { class: 'eyebrow' }, `Encounter ${game.depth + 1} of ${game.maxDepth}`),
      h('h2', {}, n === 1 && game.choices[0] === 'boss' ? 'The last leg' : 'Chart a course'),
      h('p', { class: 'muted' }, game.choices[0] === 'boss' ? 'Only one way forward now.' : `${n} route${n > 1 ? 's' : ''} ahead${tele ? ', including +1 from your Telescope' : ''}. You only take one.`),
      h('div', { class: 'choices' }, game.choices.map((id, i) => encCard(id, h('button', { class: 'btn primary', onclick: act(() => game.chooseEncounter(i)) }, 'Set course')))),
    );
    return [targetBanner(), panel, shipView()];
  }

  // ---------- event ----------
  function eventScreen() {
    const ev = game.event;
    const e = ev.enc;
    const lines = game.log.filter((l) => l.id > ev.logStart);
    const panel = h('section', { class: 'panel stack' },
      h('span', { class: `kind ${e.kind}`, style: 'align-self:flex-start' }, e.kind),
      h('h2', {}, e.name),
      h('p', {}, e.text),
      e.table ? d4List(e.table, ev.rolls) : null,
      h('ol', { class: 'log', style: 'padding:0' }, lines.map((l) => h('li', { class: l.cls }, l.text))),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', disabled: game.pendingChoice ? true : null, onclick: act(() => game.continueEvent()) }, ev.next ? 'Battle stations' : 'Continue')),
    );
    return [panel, shipView()];
  }

  // ---------- shipyard ----------
  function shipyardScreen() {
    const y = game.shipyard;
    const insert = ui.dockSel != null && y.dock[ui.dockSel] ? (side, pos) => { game.attach(ui.dockSel, side, pos); ui.dockSel = null; } : null;
    const dock = h('div', { class: 'storage' }, h('span', { class: 'eyebrow', style: 'align-self:center' }, 'Dock'),
      y.dock.length ? y.dock.map((c, i) => h('button', { class: `btn ${ui.dockSel === i ? 'primary' : ''}`, onclick: () => { ui.dockSel = ui.dockSel === i ? null : i; render(); } }, D.PARTS[c.id].name, h('span', { class: 'sub' }, `${c.dur}/${D.PARTS[c.id].dur + c.bonusMax}`)))
        : h('span', { class: 'muted' }, 'Tap an installed part, then Detach, to lift it onto the dock.'));
    const panel = h('section', { class: 'panel stack' },
      h('span', { class: `kind ${y.enc.kind}`, style: 'align-self:flex-start' }, y.enc.kind),
      h('h2', {}, y.enc.name),
      h('p', {}, 'Full Reassembly: detach any parts and reattach them anywhere. Choose a docked part, then an orange marker on your ship.'),
      dock,
      h('h3', {}, 'Salvage'),
      d4List(y.enc.table, y.roll ? [y.roll] : []),
      h('div', { class: 'row' },
        h('button', { class: 'btn', disabled: y.roll ? true : null, onclick: act(() => game.salvage()) }, 'Roll salvage'),
        h('button', { class: 'btn primary', disabled: !y.roll || game.pendingChoice ? true : null, onclick: act(() => { game.leaveShipyard(); ui.dockSel = null; }) }, 'Leave shipyard')),
      y.dock.length ? h('p', { class: 'muted' }, 'Parts still on the dock when you leave go into storage if there is room, otherwise they stay behind.') : null,
    );
    return [targetBanner(), panel, shipView({ insert })];
  }

  // ---------- combat ----------
  function combatScreen() {
    const c = game.combat;
    const en = c.enemy;
    const cur = game.enemyPhase();
    const bar = h('div', { class: 'durbar', 'aria-label': `${en.dur} of ${en.max} durability` });
    const marks = c.def.phases.map((p) => p.min).filter((m) => m > 1);
    for (let i = 1; i <= en.max; i++) bar.append(h('i', { class: `${i <= en.dur ? 'on' : ''} ${marks.includes(i + 1) ? 'mark' : ''}` }));
    const chips = h('div', { class: 'chips' },
      en.shield ? h('span', { class: 'chip shield' }, 'Armor up') : null,
      ['fire', 'glue', 'gas'].map((k) => (en.tokens[k] ? h('span', { class: `chip ${k}`, title: D.TOKENS[k].text }, k) : null)));
    const enemy = h('section', { class: `panel enemy ${c.flashEnemy ? 'hit' : ''}` },
      h('div', { class: 'enemy-head' },
        h('div', { class: 'stack', style: 'gap:4px' }, h('span', { class: `kind ${c.enc.kind || 'Combat'}`, style: 'align-self:flex-start' }, c.def.boss ? 'Boss' : 'Enemy'), h('h2', {}, en.name)),
        statline(`Weight ${fmt(en.weight)}`, h('span', {}, 'Dur ', h('b', {}, `${Math.max(0, en.dur)}/${en.max}`)))),
      bar, chips,
      h('div', { class: 'phases' }, c.def.phases.map((p, pi) => {
        const top = pi === 0 ? en.max : c.def.phases[pi - 1].min - 1;
        const rolled = c.lastAbility && c.lastAbility.phase === p.name ? [c.lastAbility.roll] : [];
        return h('div', { class: `phase ${p === cur ? 'current' : ''}` },
          h('span', { class: 'eyebrow' }, p.name, ' ', h('span', {}, `${top}–${p.min}`)),
          d4List(p.table.map((a) => a.name), rolled));
      })),
    );

    const turn = h('section', { class: 'panel stack' });
    const diamonds = h('div', { class: 'actions-left', 'aria-label': `${c.actions} actions left` });
    for (let i = 0; i < game.actionsPerTurn(); i++) diamonds.append(h('i', { class: i < c.actions ? 'on' : '' }));
    turn.append(h('div', { class: 'turnbar' },
      h('span', { class: 'turn-state' }, `Round ${c.round} · Your turn`),
      h('div', { class: 'row' }, h('span', { class: 'hud-label' }, 'Actions'), diamonds)));

    const bar2 = h('div', { class: 'actionbar' });
    for (const side of SIDES) {
      const w = game.weaponInfo(side);
      if (!w) continue;
      const notes = [w.summary];
      if (w.payer) notes.push(w.payer === w.card ? '−1 Dur' : '−1 Barracks');
      if (w.gassed) notes.push('gas: coin');
      if (w.blocked) notes.push(w.blocked);
      bar2.append(h('button', { class: 'btn', disabled: !game.canAct() || w.blocked ? true : null, onclick: act(() => game.fire(side)) },
        `Fire ${side} ${D.PARTS[w.card.id].name}`, h('span', { class: 'sub' }, notes.join(' · '))));
    }
    const core = game.coreAbilityInfo();
    bar2.append(h('button', { class: 'btn', disabled: !game.canAct() || core.blocked ? true : null, onclick: act(() => game.useCore()) },
      core.ability.name, h('span', { class: 'sub' }, core.blocked || (core.ability.id === 'ram' ? '3 dmg · −1 Core' : `${core.ability.id === 'bomber' ? 5 : 3} dmg`))));
    for (const card of game.cards()) {
      if (!game.canUseSupport(card.uid)) continue;
      const targets = game.supportTargets(card.uid);
      if (!targets.length) continue;
      bar2.append(h('button', { class: 'btn', onclick: () => startSupport(card.uid) }, `Use ${D.PARTS[card.id].name}`, h('span', { class: 'sub' }, '−1 Dur')));
    }
    bar2.append(h('button', { class: `btn ${game.canAct() ? '' : 'primary'}`, onclick: act(() => game.endTurn()) }, 'End turn'));
    if (!game.weaponInfo('left') && !game.weaponInfo('right')) turn.append(h('p', { class: 'muted' }, 'No weapon on the outside of either side. Only outside weapons can fire.'));
    turn.append(bar2);
    return [enemy, targetBanner(), turn, shipView()];
  }

  // ---------- end ----------
  function endScreen() {
    const won = game.phase === 'victory';
    const s = game.stats;
    const stat = (label, v) => h('div', { class: 'stat' }, h('b', {}, v), h('span', { class: 'hud-label' }, label));
    return [
      h('section', { class: 'panel stack' },
        h('span', { class: 'eyebrow' }, won ? 'Victory' : 'Run over'),
        h('h2', { style: 'font-size: clamp(40px, 9vw, 72px)' }, won ? 'Leviathan sunk' : 'Core lost'),
        h('p', {}, won ? `Your ${D.CORES[game.core.id].name} brought down the Iron Leviathan.` : `Your ${D.CORES[game.core.id].name} broke apart on encounter ${game.depth} of ${game.maxDepth}.`),
        h('div', { class: 'stats' }, stat('Encounters', s.encounters), stat('Enemies sunk', s.kills), stat('Damage dealt', s.dmgDealt), stat('Damage taken', s.dmgTaken), stat('Parts installed', s.parts), stat('Contracts', s.quests)),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { game = null; ui.selected = null; render(); } }, 'New run')),
      ),
      shipView({ title: 'Final ship' }),
    ];
  }

  $('brand').addEventListener('click', () => { if (!game || ['gameover', 'victory'].includes(game.phase)) { game = null; render(); } });
  render();

  // Exposed for debugging in the console.
  window.cardships = { get game() { return game; } };
})();
