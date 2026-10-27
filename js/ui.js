// Cardships browser UI. Renders the engine state as panels and the card view, and turns
// clicks into engine calls.
(function () {
  const D = window.CardshipsData;
  const { Game, fmt, COLS, MAX_MODULES, VENT_COST } = window.CardshipsEngine;
  const Meta = window.CardshipsMeta;
  const SkyMap = window.CardshipsSkyMap;
  const Scene = window.CardshipsScene;
  const scene = new Scene(document.getElementById('scene'));
  const Actors = window.CardshipsActors;
  const FX = window.CardshipsFX;
  const Audio = window.CardshipsAudio;
  Audio.applyPrefs(FX.prefs);
  // A soft click for every button press.
  document.addEventListener('click', (ev) => { if (ev.target.closest('button')) Audio.sfx('ui'); }, true);
  Scene.actors = (g, v) => Actors.draw(g, v);
  Scene.fx = FX.drawFx;
  Scene.pixelScale = () => Actors.P || 2;
  Scene.auroraColor = () => (game && game.combat && !game.combat.over && game.combat.aurora ? D.AURORA[game.combat.aurora].color : null);
  Scene.overlay = FX.drawOverlay;
  // Taps on the flight view: your ship selects the Core; animations skip.
  const touchFirst = window.matchMedia('(hover: none)').matches;
  document.getElementById('scene').addEventListener('click', (ev) => {
    if (FX.isPlaying()) { FX.skip(); return; }
    const r = ev.currentTarget.getBoundingClientRect();
    ui.lastTouch = ev.pointerType ? ev.pointerType !== 'mouse' : touchFirst;
    Actors.tap(ev.clientX - r.left, ev.clientY - r.top);
  });
  Actors.onSelect = (uid) => {
    if (!game) return;
    if (ui.targeting) {
      if (uid && ui.targeting.eligible.includes(uid)) { ui.targeting.onPick(uid); ui.targeting = null; }
      render();
      return;
    }
    if (inBattle()) {
      ui.pop = uid && !(ui.pop && ui.pop.uid === uid) ? { uid } : null;
      ui.selected = ui.pop && uid !== 'enemy' ? uid : null;
      render();
      return;
    }
    if (uid === 'enemy') uid = null;
    ui.selected = uid && uid !== ui.selected ? uid : null;
    ui.confirmScrap = null;
    render();
  };
  // Slots are { row, col }: row 0 the hull, row 1 the upper deck; col <0 stern, 0 Core, >0 bow.
  const posKey = (pos) => (pos ? `${pos.row}:${pos.col}` : null);
  function setPreview(pos) {
    ui.previewKey = posKey(pos);
    ui.preview = pos && ui.previewId ? { id: ui.previewId, pos: { row: pos.row, col: pos.col } } : null;
    render();
  }
  function commitInsert(pos) {
    const fn = ui.insertFn;
    ui.preview = null; ui.previewKey = null;
    if (fn) { fn({ row: pos.row, col: pos.col }); ui.insertFn = null; Audio.sfx('clank'); render(); }
  }
  // A slot in words: "Hull, bow 2" / "Upper deck over stern 1" / "Bridge".
  function slotName(pos) {
    if (pos.row === 1 && pos.col === 0) return 'Bridge, over the Core';
    const where = `${pos.col < 0 ? 'stern' : 'bow'} ${Math.abs(pos.col)}`;
    return pos.row === 1 ? `Upper deck over ${where}` : `Hull, ${where}`;
  }

  let game = null;
  let meta = Meta.load();
  const ui = { insertFn: null, previewId: null, preview: null, previewKey: null, seedCode: '', selected: null, targeting: null, dockSel: null, swapSel: null, confirmScrap: null, logCount: 0, mapSel: null, flying: false, recorded: null, newUnlocks: [] };
  const SAVE_KEY = 'cardships.run.v5'; // v5: three-area runs // v4: two-deck grid
  function loadSave() { try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage unavailable */ } }
  // Autosave: the whole run, dice generator included, after every change.
  function autosave() {
    if (!game || !game.core) return;
    if (['gameover', 'victory'].includes(game.phase)) { clearSave(); return; }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch (e) { /* storage unavailable */ }
  }
  function continueRun(saved) {
    game = Game.fromJSON(saved);
    Actors.reset();
    ui.selected = null; ui.mapSel = null; ui.recorded = null; ui.newUnlocks = [];
    ui.logSeen = game.log.length; ui.sheet = null; ui.stageKey = null;
    render();
  }
  function newRun(coreId, shipId) {
    const seed = Game.seedFromCode(ui.seedCode);
    game = new Game({ unlocked: meta.unlocked, legendaries: meta.legendaries, seed: seed == null ? undefined : seed });
    Actors.reset();
    game.chooseCore(coreId, shipId);
    ui.pickCore = null; ui.pickShip = null;
    game.events = [];
    ui.selected = null; ui.mapSel = null; ui.recorded = null; ui.newUnlocks = [];
    ui.logSeen = game.log.length; ui.sheet = null; ui.stageKey = null;
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
  // Like el.append, but skips null/false (which append would print as text).
  const appendAll = (el, ...kids) => el.append(...kids.flat(Infinity).filter((k) => k != null && k !== false));
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
  // Which music cue each moment of the run calls for.
  function syncMusic() {
    if (!game) { Audio.setScene('title'); return; }
    const node = game.map && game.currentNode();
    const enc = game.phase === 'event' && game.event ? game.event.enc : null;
    const cue = {
      combat: node && node.enc === 'boss' ? 'boss' : 'combat',
      event: ['storm', 'smog', 'beacon'].includes(enc) ? 'hazard' : 'map',
      hangar: 'dock', shop: 'dock', loot: 'spoils', portal: 'spoils', gameover: 'defeat', victory: 'victory',
    }[game.phase] || 'map';
    // Each area has its own map, dock, fight and boss music where it has any (map2, combat3, ...).
    const areaCue = game.area > 0 ? `${cue}${game.area + 1}` : null;
    Audio.setScene(areaCue && Audio.CUES[areaCue] ? areaCue : cue);
    Audio.setTension(game.phase === 'combat' && game.core.hp / game.maxHp(game.core) <= 0.34);
  }
  // Which parallax biome and scroll speed each moment of the run calls for.
  function syncScene() {
    const wrap = $('scene-wrap');
    const overlay = $('scene-overlay');
    wrap.classList.toggle('tall', !game);
    wrap.classList.toggle('battle', !!game && game.phase === 'combat' && FX.prefs.battle !== 'classic');
    syncMusic();
    if (!game) {
      scene.setBiome('dusk'); scene.setMode('title');
      overlay.replaceChildren(h('div', { class: 'title-hero' },
        h('span', { class: 'eyebrow' }, 'A steampunk skyship roguelike'),
        h('h1', {}, 'Cardships'),
        h('p', {}, 'Bolt modules onto a Core, read the enemy\'s next move, and fly the cloud routes to the boss.')));
      return;
    }
    overlay.replaceChildren();
    const node = game.map && game.currentNode();
    const here = node && (node.enc !== 'start' || game.area > 0) ? node.biome : 'clear';
    const phase = game.phase;
    if (phase === 'victory' || phase === 'gameover') { scene.setBiome(phase === 'victory' ? 'victory' : 'defeat'); scene.setMode('docked'); }
    else if (phase === 'hangar') { scene.setBiome('dock'); scene.setMode('docked'); }
    else if (phase === 'shop') { scene.setBiome('interior'); scene.setMode('docked'); }
    else if (phase === 'combat') { scene.setBiome(here); scene.setMode('combat'); }
    else { scene.setBiome(here); scene.setMode(ui.flying || ui.portaling ? 'travel' : 'flight'); }
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
    ui.previewId = null;
    document.body.classList.toggle('single', single());
    for (let a = 1; a <= 3; a++) document.body.classList.toggle(`area-${a}`, !!game && game.core && game.area === a - 1);
    const content = stageContent().filter(Boolean);
    const stage = $('stage');
    if (single() && content.length) {
      // The phase's panels float in a window over the flight view; Hide folds it to its title.
      const key = game.phase + ':' + game.depth;
      if (ui.stageKey !== key) { ui.stageKey = key; ui.stageHidden = false; stage.scrollTop = 0; }
      stage.replaceChildren(h('div', { class: 'win-head' },
        h('span', { class: 'win-title' }, windowTitle()),
        h('button', { class: 'btn small', 'aria-expanded': String(!ui.stageHidden), onclick: () => { ui.stageHidden = !ui.stageHidden; render(); } }, ui.stageHidden ? 'Show ▴' : 'Hide ▾')), ...content);
    } else stage.replaceChildren(...content);
    stage.classList.toggle('collapsed', single() && !!ui.stageHidden);
    renderTools();
    renderLog();
    if (game) {
      for (const ev of game.events) {
        if (ev.type === 'ram') scene.jolt(ev.player ? 0.8 : 1.2);
        Actors.react(ev);
      }
      game.flashes.clear();
      game.events = [];
    }
    ui.intentSummary = game && game.phase === 'combat' && game.combat.enemy.intent ? intentText(game.combat.enemy.intent) : '';
    Actors.sync(game, ui);
    renderBattle();
    renderSheet();
    autosave();
    const lh = $('log-head');
    if (lh) lh.textContent = game && game.phase === 'combat' ? `Combat log · round ${game.combat.round}` : "Ship's log";
  }
  function stageContent() {
    if (!game) return titleScreen();
    if (ui.portaling) return []; // nothing in the way of the crossing
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
      case 'portal': return ui.portaling ? [] : portalScreen();
      case 'gameover':
      case 'victory': return endScreen();
      default: return titleScreen();
    }
  }

  // A part's card picture: painted art where it exists, otherwise an illustration drawn in code.
  const ArtGen = window.CardshipsArtGen;
  const cardSrc = (id) => (ArtGen && ArtGen.has(id) ? ArtGen.cardArt(id) : `assets/art/cards/${id}.jpg`);

  // ---------- painted icons ----------
  // Status and stat icons (assets/art/status), event banners (assets/art/scenes), unlock badges.
  const ico = (name, cls = 'ico') => h('img', { class: cls, src: `assets/art/status/${name}.png`, alt: '', 'aria-hidden': 'true', onerror: (e) => e.target.remove() });
  const banner = (enc) => h('img', { class: 'scene-banner', src: ArtGen && ArtGen.hasBanner(enc) ? ArtGen.banner(enc) : `assets/art/scenes/${enc}.jpg`, alt: '', onerror: (e) => e.target.remove() });
  const BADGES = { tesla: 0, overpressure: 1, gyro: 3, autoloader: 4, clockwork: 7 };
  const TOKEN_KINDS = ['fire', 'glue', 'gas', 'hex'];
  const tokIco = (k, cls = 'tok-ico') => (k === 'hex' ? h('span', { class: `${cls} tok-rune`, 'aria-hidden': 'true' }, '✶') : ico(k, cls));
  // Resonance as three pips (filled up to the module's Resonance).
  const resPips = (card) => (card.res > 0 || card.enchanted || game.isArcane(card) ? h('span', { class: 'res-pips', title: `Resonance ${card.res || 0}/3` }, [0, 1, 2].map((i) => h('i', { class: i < (card.res || 0) ? 'on' : '' }))) : null);

  // ---------- HUD ----------
  // A brass gauge bar (from the UI kit) with the number beside it.
  function meterEl(frac, kind, text) {
    const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100);
    return h('span', { class: 'hud-meter' }, h('span', { class: `meter ${kind}`, style: `--fill:${pct}%`, 'aria-hidden': 'true' }, h('i')), text);
  }
  function renderHud() {
    const hud = $('hud');
    if (!game || !game.core) { hud.replaceChildren(); return; }
    const A = game.areaDef();
    const route = h('div', { class: 'route', title: `${A.name}: column ${game.depth} of ${game.maxDepth}` }, h('span', { class: 'route-area' }, A.numeral));
    for (let i = 1; i <= game.maxDepth; i++) {
      const cls = [i < game.depth || (i === game.depth && game.phase === 'map') ? 'done' : '', i === game.depth && game.phase !== 'map' ? 'here' : '', i === game.maxDepth ? 'boss' : ''].join(' ');
      route.append(h('i', { class: cls }));
    }
    const HUD_ICONS = { Core: 'durability', Weight: 'weight', Steam: 'steam', Cogs: 'cogs' };
    const item = (label, value, title) => h('div', { class: 'hud-item', title }, HUD_ICONS[label] ? ico(HUD_ICONS[label], 'ico hud-ico') : null, h('span', { class: 'hud-label' }, label), h('span', { class: 'hud-value' }, value));
    const quest = game.quest && D.QUESTS.find((q) => q.id === game.quest);
    hud.replaceChildren(...[
      item('Route', route),
      item('Core', meterEl(Math.max(0, game.core.hp) / game.maxHp(game.core), 'hp', `${Math.max(0, game.core.hp)}/${game.maxHp(game.core)}`)),
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
  // After choosing a Core: which ship to fly it in. Each Core suggests its own.
  function shipPicker() {
    if (!ui.pickCore) return null;
    const core = D.CORES[ui.pickCore];
    const ships = Game.shipsFor(ui.pickCore).map((sh) => h('button', { class: `ship-pick${ui.pickShip === sh.id ? ' picked' : ''}`, onclick: () => { ui.pickShip = sh.id; render(); } },
      window.CardshipsShipArt.thumb(sh.sprite, 150, 96),
      h('span', { class: 'name' }, sh.name),
      sh.id === Game.defaultShip(ui.pickCore) ? h('span', { class: 'eyebrow' }, 'Classic') : null,
      h('span', {}, sh.trait)));
    return h('section', { class: 'panel stack', id: 'ship-picker' },
      h('span', { class: 'eyebrow' }, core.name),
      h('h2', {}, 'Choose your ship'),
      h('p', { class: 'muted' }, `Three ships fly the ${core.name.replace(' Core', '')} Core. Each has one trait.`),
      h('div', { class: 'ships' }, ships),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: () => newRun(ui.pickCore, ui.pickShip) }, `Launch the ${D.SHIPS[ui.pickShip].name}`),
        h('button', { class: 'btn', onclick: () => { ui.pickCore = null; render(); } }, 'Back')));
  }
  function titleScreen() {
    const cores = Object.values(D.CORES).map((c) => {
      const open = Meta.coreUnlocked(meta, c.id);
      const how = D.UNLOCKS.find((u) => u.id === c.id);
      return h('button', { class: `core-pick${ui.pickCore === c.id ? ' picked' : ''}`, disabled: open ? null : true, onclick: () => { ui.pickCore = c.id; ui.pickShip = Game.defaultShip(c.id); render(); requestAnimationFrame(() => { const el = document.getElementById('ship-picker'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); } },
        !open ? h('span', { class: 'lock' }, h('img', { src: 'assets/art/ui/padlock.png', alt: '' }), `Locked · ${how.how}`) : null,
        h('img', { class: 'core-art', src: `assets/art/cores/${c.id}.jpg`, alt: '', onerror: (e) => e.target.remove() }),
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
      return h('div', { class: `unlock ${got ? 'got' : ''}` }, h('img', { class: 'badge', src: `assets/art/bits/badge${BADGES[u.id] ?? 7}.png`, alt: '' }), h('div', { class: 'stack', style: 'gap:2px' }, h('b', {}, u.name), h('span', {}, got ? `Unlocked ${u.kind}` : u.how)));
    }));
    const saved = loadSave();
    const seedBox = h('div', { class: 'row seed-row' },
      h('label', { for: 'seed-input', class: 'hud-label' }, 'Seed'),
      h('input', { id: 'seed-input', class: 'seed-input', placeholder: 'Random', value: ui.seedCode, maxlength: '16', autocomplete: 'off', oninput: (e) => { ui.seedCode = e.target.value; } }),
      h('span', { class: 'muted' }, 'Enter a code (letters or numbers) to replay or share a run.'));
    return [
      saved && saved.core ? h('div', { class: 'panel row', style: 'justify-content:space-between' },
        h('div', { class: 'stack', style: 'gap:2px' }, h('span', { class: 'eyebrow' }, 'Autosaved run'),
          h('b', {}, `${D.CORES[saved.core.id].name} · Area ${D.AREAS[saved.area || 0].numeral}, column ${saved.depth} of ${saved.maxDepth} · seed ${Game.seedCode(saved.seed)}`)),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => continueRun(saved) }, 'Continue run'), h('button', { class: 'btn', onclick: () => { clearSave(); render(); } }, 'Abandon'))) : null,
      h('div', { class: 'cores' }, cores),
      shipPicker(),
      seedBox,
      h('div', { class: 'panel stack' },
        h('h3', {}, 'How it flies'),
        h('div', { class: 'primer' },
          h('div', {}, h('b', {}, 'Two decks'), h('span', {}, 'Build out from the Core along the hull: up to 3 modules in the bow (facing the enemy) and 3 in the stern. An upper deck sits on top: any hull module, or the Core itself (the bridge), can carry one more. 8 modules in all.')),
          h('div', {}, h('b', {}, 'Firing'), h('span', {}, 'Straight guns fire from the front of a deck: the prow of the hull, or the foremost upper module. Mortars and Tesla Coils arc from any slot with open sky above.')),
          h('div', {}, h('b', {}, 'Intents'), h('span', {}, 'The enemy\'s next move and target are shown before you act. Answer it: swap modules, Evade, cleanse, or kill it first.')),
          h('div', {}, h('b', {}, 'Steam'), h('span', {}, 'Refills every turn and pays for everything. Durability is only health.')),
          h('div', {}, h('b', {}, 'Targeting'), h('span', {}, 'Direct fire comes in along a deck from the bow and meets the front module first; armor at the front catches it. Bombs and lightning drop onto a column and hit whatever is on top. A bare bow, or a bare side with no bridge, exposes the Core.')),
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
    const linked = ui.selected && !t && ui.selected !== card.uid && game.locate(ui.selected) && game.synergies(ui.selected).some((l) => l.uid === card.uid);
    const cls = ['card', info.type, info.rarity, card.enchanted ? 'enchanted' : '', linked ? 'linked' : '', ui.selected === card.uid && !t ? 'selected' : '', eligible ? 'eligible' : '', t && !eligible ? 'dim' : '', game.flashes.has(card.uid) ? 'hit' : '', incoming != null ? 'targeted' : ''].join(' ');
    const pips = h('div', { class: 'pips' });
    for (let i = 0; i < info.max; i++) pips.append(h('i', { class: i < card.hp ? 'on' : '' }));
    const toks = h('div', { class: 'tokens' });
    for (const k of TOKEN_KINDS) if (card.tokens[k]) toks.append(h('span', { class: `tok ${k}`, title: D.TOKENS[k].name }, tokIco(k), h('span', { class: 'tok-txt' }, k)));
    if (card !== game.core && game.phase === 'combat' && game.isArcane(card)) toks.append(resPips(card));
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
    h('img', { class: 'card-art', src: card === game.core ? `assets/art/cores/${card.id}.jpg` : cardSrc(card.id), alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }),
    h('div', { class: 'card-body' },
      h('span', { class: 'card-name' }, info.name),
      h('span', { class: 'card-abbr' }, info.abbr),
      h('span', { class: 'card-meta' }, h('span', { class: 'card-w' }, `W${fmt(info.weight)} · `), `${Math.max(0, card.hp)}/${info.max}`),
      pips,
    ),
    toks,
    incoming != null ? h('span', { class: 'incoming' }, incoming > 0 ? `−${incoming}` : '0') : null);
  }

  // The Shipyard: your ship as a grid of cards, where every module is built, inspected and used.
  function shipView({ insert = null, title = 'Shipyard', previewId = null } = {}) {
    if (insert) { ui.insertFn = insert; ui.previewId = previewId; }
    if (!insert || (ui.preview && ui.preview.id !== previewId)) { ui.preview = null; ui.previewKey = null; }
    const hits = predictedHits();
    // The card grid mirrors the ship side-on: upper deck above the hull, stern left, bow right.
    const grid = h('div', { class: 'ship' });
    const slots = insert ? game.installSlots() : [];
    const slotAt = (row, col) => slots.find((p) => p.row === row && p.col === col);
    // Mouse: hover previews, click installs. Touch: the first tap previews, the second installs.
    const pick = (pos) => { if (touchFirst && ui.previewKey !== posKey(pos)) setPreview(pos); else commitInsert(pos); };
    const peek = (pos) => { if (!touchFirst && ui.previewKey !== posKey(pos)) setPreview(pos); };
    const installBtn = (pos, label) => h('button', { class: `slot-attach${ui.previewKey === posKey(pos) ? ' previewing' : ''}`, onmouseenter: () => peek(pos), onclick: () => pick(pos) }, label);
    COLS.forEach((col, i) => {
      const gc = i + 1;
      // Upper deck.
      const up = game.at(col, 1);
      const upSlot = h('div', { class: 'slot upper', style: `grid-column: ${gc}; grid-row: 1` });
      if (up) upSlot.append(cardEl(up, hits));
      else if (slotAt(1, col)) upSlot.append(installBtn(slotAt(1, col), col === 0 ? 'Bridge' : 'Upper deck'));
      else upSlot.append(h('div', { class: 'slot-empty sky' }, col === 0 ? 'Bridge' : ''));
      grid.append(upSlot);
      // Hull.
      const slot = h('div', { class: 'slot', style: `grid-column: ${gc}; grid-row: 2` });
      if (col === 0) slot.append(cardEl(game.core, hits));
      else {
        const card = game.at(col, 0);
        const ins = slotAt(0, col);
        if (card) {
          slot.append(cardEl(card, hits));
          if (ins) slot.append(h('button', { class: `insert-tab ${col < 0 ? 'at-right' : 'at-left'}`, title: `Insert at ${slotName(ins)}`, 'aria-label': `Insert at ${slotName(ins)}`, onmouseenter: () => peek(ins), onclick: () => pick(ins) }, '+'));
        } else if (ins) slot.append(installBtn(ins, `Hull, ${col < 0 ? 'stern' : 'bow'}`));
        else slot.append(h('div', { class: 'slot-empty' }, Math.abs(col) === 1 ? `Bare ${col < 0 ? 'stern' : 'bow'}` : ''));
      }
      grid.append(slot);
      const tag = col === 0 ? 'Core' : `${col < 0 ? 'S' : 'B'}${Math.abs(col)}${game.at(col, 0) && game.front(0) === game.at(col, 0) ? ' · prow' : ''}`;
      grid.append(h('div', { class: 'layer-tag', style: `grid-column: ${gc}; grid-row: 3` }, tag));
    });
    grid.append(
      h('div', { class: 'side-label', style: 'grid-column: 1 / 4; grid-row: 4' }, '◂ Stern · out of direct fire'),
      h('div', { class: 'side-label', style: 'grid-column: 5 / 8; grid-row: 4' }, 'Bow · faces the enemy ▸'),
    );

    const hint = insert ? 'Hover or tap a slot to preview the part there, then install it. A + tab between hull cards inserts it and pushes the outer column out.' : ui.targeting ? 'Choose a highlighted module.' : game.phase === 'combat' ? 'Tap a card to fire, use, swap or vent it.' : 'Tap a card to read its rules and synergies.';
    const parts = [h('div', { class: 'ship-head' }, h('h3', {}, title), h('span', { class: 'muted' }, `Weight ${fmt(game.weight())} · ${game.cards().length}/${MAX_MODULES} modules`)), h('p', { class: 'muted ship-hint' }, hint), grid];
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
    const loc = uid && (game.locate(uid) || (stored && { card: stored, side: null, stored: true }));
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
    if (card !== game.core) box.append(h('p', { class: 'muted' }, loc.stored ? 'In the Cargo Hold.' : `${game.placeName(loc)}: ${[game.isFront(loc) ? (loc.row === 0 ? 'the prow, first in line for direct fire' : 'heads the upper deck') : null, game.openSky(loc) ? 'open sky above' : 'sheltered from bombs', game.isTail(loc) ? 'stern end' : null].filter(Boolean).join(', ')}.`));
    box.append(rulesBlock(card));
    if (!loc.stored) {
      const links = game.synergies(uid);
      if (links.length) box.append(h('ul', { class: 'notes links' }, links.map((l) => h('li', {}, l.text))));
    }
    if (card.bonusMax) box.append(h('p', { class: 'muted' }, `Reinforced: +${card.bonusMax} max Durability.`));
    for (const k of TOKEN_KINDS) if (card.tokens[k]) box.append(h('p', {}, h('b', {}, D.TOKENS[k].name + ': '), D.TOKENS[k].text));
    if (card.enchanted) box.append(h('p', { class: 'muted' }, 'Enchanted: arcane, +1 max Durability, starts each fight with 2 Resonance' + (D.PARTS[card.id].type === 'weapon' ? ', +1 damage.' : '.')));

    const buttons = h('div', { class: 'row' });
    if (game.phase === 'combat' && !loc.stored) buttons.append(...combatButtons(uid, loc, ui.inSheet ? () => { ui.sheet = null; ui.selected = null; } : undefined));
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

  // What a module can do this turn: fire (each mode), use, swap with a neighbour, vent tokens.
  // done runs before the action, so a pop-up menu can close itself.
  function combatButtons(uid, loc, done = () => {}) {
    const card = loc.card;
    const out = [];
    const go = (fn) => act(() => { done(); fn(); });
    const fi = card !== game.core && game.fireInfo(uid);
    if (fi) for (const mode of fi.modes) {
      const w = game.fireInfo(uid, mode);
      out.push(h('button', { class: 'btn small', disabled: w.blocked ? true : null, onclick: go(() => game.fire(uid, mode)) },
        mode === 'aimed' ? 'Aimed shot' : mode === 'steady' ? 'Steady aim' : 'Fire', h('span', { class: 'sub' }, `${w.cost} Steam · ${w.blocked || w.summary}`)));
    }
    if (card !== game.core && game.canUseSupport(uid) && game.supportTargets(uid).length) {
      out.push(h('button', { class: 'btn small', onclick: () => { done(); startSupport(uid); } }, `Use ${partName(card.id)}`, h('span', { class: 'sub' }, `${game.useCost(card)} Steam`)));
    }
    for (const other of game.swapTargets(uid)) {
      const ol = game.locate(other);
      const dir = ol.row !== loc.row ? (ol.row > loc.row ? 'up' : 'down') : Math.abs(ol.col) > Math.abs(loc.col) ? 'outward' : 'inward';
      out.push(h('button', { class: 'btn small', onclick: go(() => game.swap(uid, other)) }, `Swap ${dir}`, h('span', { class: 'sub' }, `${game.swapCost()} Steam · with ${partName(ol.card.id)}`)));
    }
    if (game.ventTargets().includes(uid)) out.push(h('button', { class: 'btn small', disabled: !game.spendable(VENT_COST) || null, onclick: go(() => game.vent(uid)) }, 'Vent tokens', h('span', { class: 'sub' }, `${VENT_COST} Steam`)));
    return out;
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

  // Offers fly two flags: a pennant for the part's type and a banner in its rarity's colour.
  const TYPE_PENNANT = { weapon: 'rocket', defense: 'tower', support: 'wrench', utility: 'gear' };
  const RARITY_BANNER = { common: 'grey', uncommon: 'blue', rare: 'red', legendary: 'gold' };
  function partSheet(id, extra) {
    const d = D.PARTS[id];
    return h('div', { class: `enc part ${d.rarity}` },
      h('div', { class: 'flags', 'aria-hidden': 'true' },
        h('img', { src: `assets/art/ui/pennant-${TYPE_PENNANT[d.type]}.png`, alt: '' }),
        h('img', { src: `assets/art/ui/banner-${RARITY_BANNER[d.rarity]}.png`, alt: '' })),
      h('div', { class: 'row' }, h('span', { class: `type-chip ${d.type}` }, d.type), h('span', { class: `rarity-chip ${d.rarity}` }, d.rarity)),
      h('div', { class: 'part-head' }, h('img', { class: 'part-art', src: cardSrc(id), alt: '', loading: 'lazy', onerror: (e) => e.target.remove() }), h('h3', {}, d.name)),
      statline(`Weight ${fmt(d.weight)}`, `Durability ${d.hp}`, d.cost != null ? `${d.cost} Steam` : 'Passive'),
      h('div', { class: 'rules stack' }, d.rules.map(([k, v]) => h('div', {}, h('b', {}, k + ': '), v))),
      extra ? h('div', { class: 'enc-foot' }, extra) : null,
    );
  }

  // ---------- loot ----------
  function lootScreen() {
    const panel = h('section', { class: 'panel stack' }, h('span', { class: 'eyebrow' }, game.lootTitle));
    let insert = null;
    let previewFor = null;
    if (game.lootOffer) {
      const o = game.lootOffer;
      appendAll(panel, h('h2', {}, o.legendary ? 'Choose a legendary' : o.keep > 1 ? `Keep ${o.keep}` : 'Choose a part'),
        h('p', { class: 'muted' }, o.legendary ? 'Torn from the boss\'s wreck. Each one can define a build: take one, or leave both.' : 'Take one, or leave them all if none fit your ship.'),
        h('div', { class: 'choices' }, o.ids.map((id, i) => partSheet(id, h('button', { class: 'btn primary', onclick: act(() => game.pickOffer(i)) }, 'Take')))),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: act(() => game.skipOffer()) }, 'Take nothing')));
    } else if (game.pendingLoot.length) {
      const id = game.pendingLoot[0];
      const full = !game.installSlots().length;
      const canStore = game.storage.length < game.storageCap();
      insert = (pos) => game.installPending(pos);
      appendAll(panel, 
        h('h2', {}, `Install: ${partName(id)}`),
        h('p', {}, full ? `Your ship holds ${MAX_MODULES} modules. Scrap one to make room (tap it, then Scrap), stow it or jettison it.` : 'Pick a slot in the Shipyard below. A + tab between hull cards inserts it and pushes the outer column out; upper-deck slots add a module on top.'),
        game.pendingLoot.length > 1 ? h('p', { class: 'muted' }, `${game.pendingLoot.length - 1} more part${game.pendingLoot.length > 2 ? 's' : ''} waiting.`) : null,
        h('div', { class: 'choices' }, partSheet(id, h('div', { class: 'row' },
          game.has('cargo') ? h('button', { class: 'btn', disabled: !canStore || null, onclick: act(() => game.storePending()) }, 'Stow', h('span', { class: 'sub' }, `${game.storage.length}/2`)) : null,
          h('button', { class: 'btn', onclick: act(() => game.jettisonPending()) }, 'Jettison'))),
        previewPanel(id)),
      );
      previewFor = id;
    } else if (game.swapAvailable) {
      appendAll(panel, h('h2', {}, 'Quick Swap'),
        h('p', {}, 'You may swap one installed module with one in the Cargo Hold. Choose the stored part first.'),
        h('div', { class: 'row' },
          game.storage.map((c, i) => h('button', { class: `btn ${ui.swapSel === i ? 'primary' : ''}`, onclick: () => { ui.swapSel = i; startSwap(i); } }, partName(c.id))),
          h('button', { class: 'btn', onclick: act(() => { game.swapAvailable = false; ui.swapSel = null; }) }, 'Skip swap')));
    } else {
      appendAll(panel, h('h2', {}, 'Ready to sail'), h('p', { class: 'muted' }, 'Check your layout, then chart the next leg.'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', disabled: game.pendingChoice ? true : null, onclick: act(() => game.finishLoot()) }, 'Chart a course')));
    }
    return [targetBanner(), panel, shipView({ insert, previewId: previewFor })];
  }
  // What happens to the ship if the part goes in the previewed slot.
  function previewPanel(id) {
    const pv = ui.preview && ui.preview.id === id ? ui.preview : null;
    if (!pv) return h('div', { class: 'enc preview' }, h('span', { class: 'eyebrow' }, 'Preview'), h('p', { class: 'muted' }, touchFirst ? 'Tap a slot in the Shipyard to preview the part there; tap it again to install.' : 'Hover a slot in the Shipyard to preview the part there; click to install.'));
    const res = game.previewInstall(id, pv.pos);
    if (!res) return null;
    return h('div', { class: 'enc preview' },
      h('span', { class: 'eyebrow' }, `Preview · ${slotName(pv.pos)}`),
      h('ul', { class: 'notes' }, res.notes.map((n) => h('li', {}, n))),
      res.links.length ? h('ul', { class: 'notes links' }, res.links.map((n) => h('li', {}, n))) : h('p', { class: 'muted' }, 'No synergies with its neighbours here.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => commitInsert(pv.pos) }, 'Install here'), h('button', { class: 'btn', onclick: () => setPreview(null) }, 'Cancel')));
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
    if (!known) return { kind: '?', name: n.cloud ? 'Cloud cover' : 'Uncharted', text: n.cloud ? 'Thick cloud hides this route. A Telescope lookout on the deck or prow sees through it.' : 'Too far to make out. Fly closer, mount a Telescope or buy sky charts.' };
    const enc = D.ENCOUNTERS[n.enc];
    const enemy = n.enemy && D.ENEMIES[n.enemy];
    const name = game.encName(n.enc);
    return { kind: enc.kind, name: enemy && n.enc !== 'beacon' ? `${name}: ${n.enc === 'lair' && !enemy.elite ? 'Elite ' : ''}${enemy.name}` : name, text: enc.text, enemy, table: enc.table };
  }
  function mapScreen() {
    const panel = mapPanel();
    return single() ? [targetBanner(), panel] : [targetBanner(), panel, shipView()];
  }
  // The sky route. readOnly: looked at from the Map button mid-run, with no course to set.
  function mapPanel({ readOnly = false } = {}) {
    const cur = game.currentNode();
    const choices = readOnly ? [] : game.mapChoices();
    const key = readOnly ? 'mapPeek' : 'mapSel';
    if (!readOnly && (!ui.mapSel || !choices.some((n) => n.id === ui.mapSel))) ui.mapSel = choices.length === 1 ? choices[0].id : ui.mapSel && game.node(ui.mapSel) ? ui.mapSel : null;
    const mapEl = SkyMap.render(game, {
      selected: ui[key],
      onSelect: (id) => { if (ui.flying) return; ui[key] = id; render(); },
    });
    const sel = ui[key] && game.node(ui[key]);
    const reachable = !readOnly && sel && cur.edges.includes(sel.id);
    let detail;
    if (sel) {
      const info = nodeInfo(sel);
      detail = h('div', { class: 'enc map-detail' },
        h('div', { class: 'row' }, h('span', { class: `kind k-${info.kind.replace(' ', '')}` }, info.kind), h('span', { class: 'muted' }, `Column ${sel.col} of ${game.maxDepth}`)),
        h('h3', {}, info.name),
        h('p', {}, info.text),
        info.enemy ? statline(`Weight ${info.enemy.weight}`, `Durability ~${Math.round(info.enemy.hp * (info.enemy.boss ? D.BALANCE.bossHp : 1 + D.BALANCE.hpPerColumn * (sel.col - 1)))}`) : null,
        info.table ? d6List(info.table) : null,
        h('div', { class: 'enc-foot' },
          h('span', { class: 'muted' }, reachable ? 'Reachable from here.' : sel.id === cur.id ? 'You are here.' : readOnly && cur.edges.includes(sel.id) ? 'Reachable after this encounter.' : 'Not reachable from here yet.'),
          reachable ? h('button', { class: 'btn primary', disabled: ui.flying ? true : null, onclick: () => travel(sel.id, mapEl) }, 'Set course') : null));
    } else {
      detail = h('p', { class: 'muted' }, readOnly ? 'Tap a node to read about it.' : 'Tap a glowing node to plot your next leg.');
    }
    const legend = h('div', { class: 'legend' }, Object.keys(game.areaDef().nodeWeights).map((id) =>
      h('span', { class: `k-${D.ENCOUNTERS[id].kind.replace(' ', '')}` }, SkyMap.icon(id, 16), game.encName(id))));
    const panel = h('section', { class: 'panel stack map-panel' },
      h('div', { class: 'row', style: 'justify-content:space-between' },
        h('div', { class: 'stack', style: 'gap:2px' }, h('span', { class: 'eyebrow' }, `Area ${game.areaDef().numeral} · column ${game.depth} of ${game.maxDepth} · sight ${game.sight()} · seed ${Game.seedCode(game.seed)}`), h('h2', {}, game.areaDef().name)),
        h('span', { class: 'muted' }, `Ahead: ${D.ENEMIES[game.bossId].name}`)),
      mapEl, detail, legend);
    return panel;
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
      banner(ev.enc),
      h('span', { class: `kind k-${e.kind.replace(' ', '')}`, style: 'align-self:flex-start' }, e.kind),
      h('h2', {}, game.encName(ev.enc)),
      h('p', {}, e.text),
      e.table ? d6List(e.table, ev.rolls) : null,
      h('ol', { class: 'log inline' }, lines.map((l) => h('li', { class: l.cls }, l.text))),
    );
    if (ev.options) {
      appendAll(panel, h('div', { class: 'options' }, ev.options.map((o) => h('button', { class: 'option', onclick: act(() => game.chooseOption(o.id)) }, h('b', {}, o.label), h('span', {}, o.desc)))));
    } else {
      appendAll(panel, h('div', { class: 'row' }, h('button', { class: 'btn primary', disabled: game.pendingChoice ? true : null, onclick: act(() => game.continueEvent()) }, ev.next ? 'Battle stations' : ev.loot ? 'Collect' : 'Continue')));
    }
    return [targetBanner(), panel, shipView()];
  }

  // ---------- Sky Dock ----------
  function hangarScreen() {
    const y = game.hangar;
    const e = D.ENCOUNTERS[y.enc];
    const insert = ui.dockSel != null && y.dock[ui.dockSel] ? (pos) => { game.attach(ui.dockSel, pos); ui.dockSel = null; } : null;
    const dock = h('div', { class: 'storage' }, h('span', { class: 'eyebrow', style: 'align-self:center' }, 'Dock'),
      y.dock.length ? y.dock.map((c, i) => h('button', { class: `btn ${ui.dockSel === i ? 'primary' : ''}`, onclick: () => { ui.dockSel = ui.dockSel === i ? null : i; render(); } }, partName(c.id), h('span', { class: 'sub' }, `${c.hp}/${D.PARTS[c.id].hp + c.bonusMax}`)))
        : h('span', { class: 'muted' }, 'Tap a module, then Detach, to lift it onto the dock.'));
    const panel = h('section', { class: 'panel stack' },
      banner('hangar'),
      h('span', { class: 'kind k-SkyDock', style: 'align-self:flex-start' }, e.kind),
      h('h2', {}, e.name),
      h('p', {}, 'Full reassembly: detach any modules and reattach them anywhere. Choose a docked part, then a slot in the Shipyard.'),
      dock,
      h('h3', {}, 'Mechanics'),
      d6List(e.table, y.roll ? [y.roll] : []),
      h('div', { class: 'row' },
        h('button', { class: 'btn', disabled: y.roll ? true : null, onclick: act(() => game.salvage()) }, 'Roll for the mechanics'),
        h('button', { class: 'btn primary', disabled: !y.roll || game.pendingChoice ? true : null, onclick: act(() => { game.leaveHangar(); ui.dockSel = null; }) }, 'Cast off')),
      y.dock.length ? h('p', { class: 'muted' }, 'Parts left on the dock go into the Cargo Hold if there is room, otherwise they stay behind.') : null,
    );
    if (insert) appendAll(panel, previewPanel(y.dock[ui.dockSel].id));
    return [targetBanner(), panel, shipView({ insert, previewId: insert ? y.dock[ui.dockSel].id : null })];
  }

  // ---------- Trading Zeppelin ----------
  function shopScreen() {
    const sh = game.shop;
    const P = D.PRICES;
    const service = (kind, label, desc, price) => h('button', { class: 'option', disabled: sh[kind] || game.cogs < price ? true : null, onclick: act(() => game.buyService(kind)) },
      h('b', {}, `${label} · ${price} cogs`), h('span', {}, sh[kind] ? 'Bought.' : desc));
    const panel = h('section', { class: 'panel stack' },
      banner('trader'),
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
    const t = it.target;
    const where = !t ? '' : t.kind === 'plunge' && !t.zone ? `bombs ${game.aimName(t)}` : t.zone ? `bombs the ${t.zone} columns` : `along the ${t.row ? 'upper deck' : 'hull'}${t.depth ? ` (module ${t.depth + 1})` : ''}`;
    switch (it.kind) {
      case 'shot': return `${game.intentDamage(it)} damage, ${where}`;
      case 'rake': return `${game.intentDamage(it)} each, ${where}`;
      case 'broadside': return `${game.intentDamage(it)} to the front of each deck`;
      case 'ram': return `Ram for ${game.intentDamage(it)} → the prow`;
      case 'token': return `${D.TOKENS[it.token].name}${it.dmg ? ` + ${game.intentDamage(it)} damage` : ''}, ${where}`;
      case 'block': return `Gains ${it.amount} Block`;
      case 'repair': return `Repairs ${it.amount}`;
      case 'charge': return `Next attack +${it.amount}`;
      case 'ward': return it.illusion ? `${it.amount} illusions: each takes a whole hit` : `+${it.amount} Wards: each stops a whole hit`;
      case 'siphon': return `Steals up to ${it.amount * 2} Resonance and heals on it`;
      case 'rune': return `${game.intentDamage(it)} to every module on the ${it.target.row ? 'upper deck' : 'hull'}, past armor`;
      case 'channel': return it.broken ? 'Collapsed: loses its move' : `Grand Convergence in ${it.left} turn${it.left > 1 ? 's' : ''}: break all ${game.combat.enemy.ward} crystals!`;
      case 'grand': return `${game.intentDamage(it)} to every module and the Core: Evade it!`;
      default: return '';
    }
  }
  // The enemy: durability, statuses, its telegraphed move and its tactics table.
  function enemyPanel({ art = true } = {}) {
    const c = game.combat;
    const en = c.enemy;
    const def = D.ENEMIES[c.enemyId];
    const bar = h('div', { class: 'durbar', 'aria-label': `${en.hp} of ${en.max} durability` });
    const marks = def.phases.map((p) => p.min).filter((m) => m > 1);
    for (let i = 1; i <= en.max; i++) bar.append(h('i', { class: `${i <= en.hp ? 'on' : ''} ${marks.includes(i + 1) ? 'mark' : ''}` }));
    const chips = h('div', { class: 'chips' },
      en.ward ? h('span', { class: 'chip ward' }, `${{ illusion: 'Illusions', crystal: 'Focus crystals', glimmer: 'Shimmer' }[game.wardKind()] || 'Wards'} ${en.ward}`) : null,
      en.block ? h('span', { class: 'chip shield' }, ico('block'), `Block ${en.block}`) : null,
      en.armor ? h('span', { class: 'chip shield' }, `Armor ${en.armor}`) : null,
      c.grand ? h('span', { class: 'chip ward' }, `Convergence in ${c.grand.left}`) : null,
      c.enemyAurora ? h('span', { class: 'chip aurora', style: `--au:${D.AURORA[c.enemyAurora].color}` }, `Copies ${D.AURORA[c.enemyAurora].name} next`) : null,
      en.burn ? h('span', { class: 'chip fire' }, ico('burn'), `Burn ${en.burn}`) : null,
      en.weak ? h('span', { class: 'chip glue' }, ico('gummed'), `Gummed ${en.weak}`) : null,
      en.vuln ? h('span', { class: 'chip gas' }, ico('choking'), `Choking ${en.vuln}`) : null,
      en.charge ? h('span', { class: 'chip fire' }, `Charged +${en.charge}`) : null,
      game.enrage() ? h('span', { class: 'chip fire' }, `Enraged +${game.enrage()}`) : null,
      en.dmgBonus ? h('span', { class: 'chip fire' }, `Veteran +${en.dmgBonus}`) : null,
      c.enemyId === 'leviathan' ? h('span', { class: 'chip shield' }, 'Ironclad Hull −1') : null,
      c.enemyId === 'stormqueen' ? h('span', { class: 'chip gas' }, `Gale next: ${c.galeSide}`) : null,
      c.enemyId === 'colossus' ? h('span', { class: 'chip glue' }, `Mainspring +${en.wound} · snap ${c.turnDamage}/6`) : null,
      en.stunned ? h('span', { class: 'chip shield' }, 'Stunned') : null);
    const preview = game.previewIntent();
    const it = en.intent;
    const intentBox = h('div', { class: `intent ${game.isAttack(it) ? 'attack' : ''} ${c.evading ? 'evaded' : ''}` },
      h('span', { class: 'eyebrow' }, en.stunned ? 'Next move · cancelled by the snap' : (it.roll ? `Next move · rolled ${it.roll}` : 'Next move')),
      h('b', {}, it.name),
      h('span', {}, intentText(it)),
      preview && preview.plan.length ? h('span', { class: 'muted' }, c.evading ? 'You will evade it.' : 'Hits: ' + preview.plan.map((p) => `${p.uid === 'core' ? 'Core' : partName(game.locate(p.uid).card.id)} ${p.braced ? 'braced' : p.dmg > 0 ? '−' + p.dmg : p.token ? '+' + p.token : '0'}`).join(', ')) : null);
    const enemy = h('section', { class: 'panel enemy' },
      !art ? null : def.boss ? banner('boss') : c.enc === 'lair' ? banner('lair') : null,
      h('div', { class: 'enemy-head' },
        h('div', { class: 'stack', style: 'gap:4px' }, h('span', { class: `kind k-${def.boss ? 'Boss' : def.elite ? 'Elite' : 'Combat'}`, style: 'align-self:flex-start' }, def.boss ? 'Boss' : def.elite ? 'Elite' : 'Enemy'), h('h2', {}, en.name),
          def.gimmick ? h('p', { class: 'muted' }, def.gimmick) : null),
        statline(`Weight ${fmt(en.weight)}`, h('span', {}, 'Dur ', h('b', {}, `${Math.max(0, en.hp)}/${en.max}`)))),
      bar, chips, intentBox,
      // Later areas' bosses keep their tactics secret until a Star Chart reveals them.
      def.boss && game.area > 0 && !game.bossCharted
        ? h('p', { class: 'muted' }, `Tactics unknown: now in ${def.phases[en.phase].name}. A Star Chart in this area would reveal them.`)
        : h('details', { class: 'phases-wrap' }, h('summary', {}, 'Tactics table'),
          h('div', { class: 'phases' }, def.phases.map((p, pi) => {
            const sc = en.hpScale || 1;
            const top = pi === 0 ? en.max : Math.round(def.phases[pi - 1].min * sc) - 1;
            return h('div', { class: `phase ${pi === en.phase ? 'current' : ''}` },
              h('span', { class: 'eyebrow' }, p.name, ' ', h('span', {}, `${top}–${Math.round(p.min * sc)}`)),
              d6List(p.table.map((a) => a.name), pi === en.phase ? [it.roll] : []));
          }))),
    );
    return enemy;
  }
  function combatScreen() {
    const c = game.combat;
    const it = c.enemy.intent;
    if (popupMode()) return [];
    const enemy = enemyPanel();
    const steam = h('div', { class: 'steam', 'aria-label': `${c.steam} steam` });
    for (let i = 0; i < Math.max(c.steam, game.steamCap()); i++) steam.append(h('i', { class: i < c.steam ? 'on' : '' }));
    const turn = h('section', { class: 'panel stack turn-panel' },
      h('div', { class: 'turnbar' },
        h('span', { class: 'turn-state' }, `Round ${c.round}`),
        h('div', { class: 'row' }, ico('steam'), h('span', { class: 'hud-label' }, 'Steam'), steam,
          game.core.id === 'zeppelin' ? h('span', { class: 'hud-label' }, ico('pressure'), `Pressure ${game.core.pressure}`) : null,
          game.core.id === 'tempest' ? h('span', { class: 'hud-label' }, ico('charge'), `Charge ${game.core.charge || 0}`) : null)));
    const bar2 = h('div', { class: 'actionbar' });
    for (const card of game.cards()) {
      const fi = game.fireInfo(card.uid);
      if (!fi || (fi.blocked && /^(Buried|Faces away)/.test(fi.blocked))) continue;
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
    // The actions sit right under the flight view, so the shots stay in sight as you click.
    return [targetBanner(), turn, enemy, shipView()];
  }

  // ---------- single screen ----------
  // With the pop-up layout on, a run never scrolls the page: the flight view fills the window, the
  // phase's panels float over it, and the map, Shipyard and log open from buttons in the top bar.
  const single = () => !!game && FX.prefs.battle !== 'classic';
  function windowTitle() {
    switch (game.phase) {
      case 'loot': return game.lootTitle || 'Spoils';
      case 'map': return 'Sky route';
      case 'event': return game.event ? game.encName(game.event.enc) : 'Encounter';
      case 'hangar': return 'Sky Dock';
      case 'shop': return 'Trading Zeppelin';
      case 'portal': return 'The portal';
      case 'victory': return 'Victory';
      case 'gameover': return 'Defeat';
      default: return '';
    }
  }
  function renderTools() {
    const tools = $('tools');
    if (!single()) { tools.replaceChildren(); return; }
    const fresh = Math.max(0, game.log.length - (ui.logSeen || 0));
    const tool = (icon, label, onclick, extra) => h('button', { class: 'icon-btn tool', onclick, 'aria-label': label }, h('img', { src: `assets/art/ui/${icon}.png`, alt: '' }), h('span', { class: 'tool-txt' }, label), extra || null);
    // Where the open window already shows the Shipyard, Ship scrolls to it instead of opening a sheet.
    const shipInWindow = ['loot', 'event', 'hangar', 'shop'].includes(game.phase);
    tools.replaceChildren(
      tool('compass', 'Map', () => { if (game.phase === 'map') { ui.stageHidden = false; render(); } else openSheet('map'); }),
      tool('btn-hammer', 'Ship', () => {
        if (!shipInWindow) { openSheet('ship'); return; }
        ui.stageHidden = false; render();
        requestAnimationFrame(() => { const el = $('stage').querySelector('.ship-wrap'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
      }),
      tool('btn-flag', 'Log', () => openSheet('log'), fresh && ui.sheet !== 'log' ? h('span', { class: 'tool-badge' }, fresh > 99 ? '99+' : String(fresh)) : null));
  }

  // ---------- pop-up battle layout ----------
  // The flight view becomes the board: a button sits on every module of your ship, and tapping
  // one (or the ship, or the enemy) opens a small menu right there. A bar along the bottom holds
  // Steam, the Core's ability and End turn; the full Shipyard grid opens as a sheet.
  const popupMode = () => FX.prefs.battle !== 'classic';
  const inBattle = () => game && game.phase === 'combat' && popupMode();
  const close = () => { ui.pop = null; };

  function renderBattle() {
    const root = $('battle-ui');
    if (!inBattle()) { root.replaceChildren(); ui.pop = null; return; }
    const c = game.combat;
    const hits = predictedHits();
    const t = ui.targeting;
    // Module buttons, placed by the position loop.
    const marks = [];
    for (const card of game.cards()) {
      const uid = card.uid;
      const info = cardInfo(card);
      const fi = game.fireInfo(uid);
      const ready = !t && ((fi && !fi.blocked) || (game.canUseSupport(uid) && game.supportTargets(uid).length > 0));
      const eligible = t && t.eligible.includes(uid);
      const cls = ['mod-mark', info.type, info.rarity === 'legendary' ? 'legendary' : '', card.enchanted ? 'enchanted' : '', card.tokens.hex ? 'hexed' : '', ready ? 'ready' : '', eligible ? 'eligible' : '', t && !eligible ? 'dim' : '', ui.pop && ui.pop.uid === uid ? 'open' : '', hits.has(uid) ? 'targeted' : ''].join(' ');
      const toks = TOKEN_KINDS.filter((k) => card.tokens[k]);
      marks.push(h('button', {
        class: cls, 'data-uid': uid, 'aria-label': `${info.name}, ${card.hp} of ${info.max} durability`,
        onclick: (ev) => {
          ev.stopPropagation();
          if (t) { if (eligible) { t.onPick(uid); ui.targeting = null; } render(); return; }
          ui.pop = ui.pop && ui.pop.uid === uid ? null : { uid };
          ui.selected = ui.pop ? uid : null;
          render();
        },
      },
      h('span', { class: 'mod-abbr' }, info.abbr), // shows if the part has no picture
      h('img', { src: cardSrc(card.id), alt: '', onerror: (e) => e.target.remove() }),
      h('span', { class: 'mod-hp' }, `${Math.max(0, card.hp)}/${info.max}`),
      resPips(card),
      toks.length ? h('span', { class: 'mod-toks' }, toks.map((k) => tokIco(k))) : null));
    }
    // Steam, the Core's ability, Evade, the Shipyard and End turn.
    const steam = h('div', { class: 'steam', 'aria-label': `${c.steam} steam` });
    for (let i = 0; i < Math.max(c.steam, game.steamCap()); i++) steam.append(h('i', { class: i < c.steam ? 'on' : '' }));
    const core = game.coreAbilityInfo();
    const ec = game.evadeCost();
    const bar = h('div', { class: 'battle-bar' },
      h('div', { class: 'bb-steam' },
        h('span', { class: 'bb-note', title: 'Core durability' }, ico('durability'), `${Math.max(0, game.core.hp)}/${game.maxHp(game.core)}`),
        ico('steam'), steam,
        game.core.id === 'zeppelin' ? h('span', { class: 'bb-note' }, ico('pressure'), game.core.pressure) : null,
        game.core.id === 'tempest' ? h('span', { class: 'bb-note' }, ico('charge'), game.core.charge || 0) : null,
        c.aurora ? h('span', { class: 'bb-aurora', style: `--au:${D.AURORA[c.aurora].color}`, title: D.AURORA[c.aurora].text }, h('i'), `${D.AURORA[c.aurora].name}: ${D.AURORA[c.aurora].text.replace(/\.$/, '')}`) : null,
        game.has('auroracrown') && !c.auroraChosen && game.canAct()
          ? h('span', { class: 'bb-crown' }, 'Crown:', Object.entries(D.AURORA).map(([k, a]) => h('button', { class: 'btn small au-pick', style: `--au:${a.color}`, title: a.text, onclick: act(() => game.chooseAurora(k)) }, a.name)))
          : null),
      h('div', { class: 'bb-acts' },
        h('button', { class: 'btn small', disabled: core.blocked ? true : null, title: core.blocked || core.summary, onclick: act(() => { close(); game.useCore(); }) }, core.ability.name, h('span', { class: 'sub' }, ` ${core.cost}⚙`)),
        ec != null ? h('button', { class: 'btn small', disabled: !game.canEvade() || null, onclick: act(() => { close(); game.evade(); }) }, c.evading ? 'Evading' : 'Evade', h('span', { class: 'sub' }, ` ${ec}⚙`)) : null,
        h('button', { class: 'btn small', onclick: () => { close(); openSheet('ship'); } }, 'Ship'),
        h('button', { class: `btn small ${c.steam > 0 ? '' : 'primary'}`, onclick: act(() => { close(); game.endTurn(); }) }, 'End turn')));
    // The enemy's durability, top right, under its move plate.
    const en = c.enemy;
    const etag = h('button', { class: 'enemy-tag', onclick: (ev) => { ev.stopPropagation(); ui.pop = ui.pop && ui.pop.uid === 'enemy' ? null : { uid: 'enemy' }; render(); } },
      h('span', { class: 'et-name' }, en.name),
      h('span', { class: 'et-bar', style: `--fill:${Math.round(Math.max(0, en.hp) / en.max * 100)}%` }, h('i')),
      h('span', { class: 'et-num' }, `${Math.max(0, en.hp)}/${en.max}${en.ward ? ` · ${{ illusion: 'Illusions', crystal: 'Crystals', glimmer: 'Shimmer' }[game.wardKind()] || 'Wards'} ${en.ward}` : ''}${en.block ? ` · Block ${en.block}` : ''}${en.armor ? ` · Armor ${en.armor}` : ''}${en.burn ? ` · Burn ${en.burn}` : ''}`));
    root.replaceChildren(...[...marks, etag, bar,
      t ? h('div', { class: 'battle-banner' }, h('span', {}, t.prompt), t.cancelable ? h('button', { class: 'btn small', onclick: () => { ui.targeting = null; render(); } }, 'Cancel') : null) : null,
      ui.pop ? popupEl() : null].filter(Boolean));
    placeBattle();
  }
  // The menu for whatever was tapped: a module, the Core, or the enemy.
  function popupEl() {
    const uid = ui.pop.uid;
    const box = h('div', { class: 'pop', role: 'dialog', onclick: (ev) => ev.stopPropagation() });
    const x = h('button', { class: 'pop-x', 'aria-label': 'Close', onclick: () => { close(); ui.selected = null; render(); } }, '×');
    if (uid === 'enemy') {
      box.classList.add('pop-enemy');
      box.append(x, enemyPanel({ art: false }));
      return box;
    }
    const loc = uid === 'core' ? { card: game.core, row: 0, col: 0 } : game.locate(uid);
    if (!loc) { ui.pop = null; return null; }
    const card = loc.card;
    const info = cardInfo(card);
    box.append(x,
      h('div', { class: 'pop-head' },
        h('img', { src: card === game.core ? `assets/art/cores/${card.id}.jpg` : cardSrc(card.id), alt: '', onerror: (e) => e.target.remove() }),
        h('div', { class: 'stack', style: 'gap:2px' },
          h('b', {}, info.name),
          h('span', { class: 'muted' }, `${info.type === 'core' ? 'Core' : info.type} · Dur ${Math.max(0, card.hp)}/${info.max}${card !== game.core ? ` · ${game.placeName(loc)}` : ''}`))),
      rulesBlock(card));
    for (const k of TOKEN_KINDS) if (card.tokens[k]) box.append(h('p', { class: 'pop-tok' }, tokIco(k), h('b', {}, D.TOKENS[k].name + ': '), D.TOKENS[k].text));
    if (card !== game.core && (card.res || card.enchanted || game.isArcane(card))) box.append(h('p', { class: 'pop-tok' }, resPips(card), h('b', {}, ` Resonance ${card.res || 0}/3: `), `at 3 it casts ${D.RESONANCE.spells[D.PARTS[card.id].type].name} (${D.RESONANCE.spells[D.PARTS[card.id].type].text})${card.enchanted ? '. Enchanted.' : '.'}`));
    const btns = uid === 'core' ? [] : combatButtons(uid, loc, close);
    if (uid === 'core') {
      const core = game.coreAbilityInfo();
      btns.push(h('button', { class: 'btn small', disabled: core.blocked ? true : null, onclick: act(() => { close(); game.useCore(); }) }, core.ability.name, h('span', { class: 'sub' }, `${core.cost} Steam · ${core.blocked || core.summary}`)));
      const ec = game.evadeCost();
      if (ec != null) btns.push(h('button', { class: 'btn small', disabled: !game.canEvade() || null, onclick: act(() => { close(); game.evade(); }) }, 'Evade', h('span', { class: 'sub' }, `${ec} Steam`)));
    }
    if (btns.length) box.append(h('div', { class: 'pop-btns' }, btns));
    else box.append(h('p', { class: 'muted' }, 'Nothing to do with it this turn.'));
    return box;
  }
  // Sheets over the page: the full Shipyard grid, the sky map, the ship's log.
  function openSheet(kind) { ui.sheet = kind; if (kind === 'log') ui.logSeen = game.log.length; render(); }
  function closeSheet() { ui.sheet = null; ui.selected = null; render(); }
  function renderSheet() {
    const sheet = $('sheet');
    if (!game || !ui.sheet) { sheet.hidden = true; sheet.replaceChildren(); ui.sheet = null; return; }
    const back = game.phase === 'combat' ? 'Back to battle' : 'Close';
    let body;
    if (ui.sheet === 'ship') {
      ui.inSheet = true; // actions taken in the sheet close it, so the shot plays in view
      body = shipView();
      ui.inSheet = false;
    } else if (ui.sheet === 'map') {
      body = mapPanel({ readOnly: true });
    } else {
      ui.logSeen = game.log.length;
      const list = h('ol', { class: 'log sheet-log' }, game.log.slice(-200).map((e) => h('li', { class: e.cls }, e.text)));
      body = h('section', { class: 'panel stack' }, h('h3', {}, game.phase === 'combat' ? `Combat log · round ${game.combat.round}` : "Ship's log"), list);
      requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
    }
    sheet.replaceChildren(h('div', { class: `sheet sheet-${ui.sheet}`, onclick: (ev) => ev.stopPropagation() },
      h('button', { class: 'btn small sheet-close', onclick: closeSheet }, back), body));
    sheet.hidden = false;
  }
  $('sheet').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !game) return;
    if (ui.sheet) ui.sheet = null;
    else if (!inBattle()) return;
    else if (ui.targeting && ui.targeting.cancelable) ui.targeting = null;
    else if (ui.pop) close();
    else return;
    ui.selected = null;
    render();
  });
  // Keeps the module buttons and the open menu on the ship as it bobs and the view resizes.
  function placeBattle() {
    const root = $('battle-ui');
    if (!inBattle()) {
      // Single screen: draw the ship above the open window rather than behind it.
      const st = $('stage');
      Actors.reserve = single() && st.childElementCount ? Math.min(st.offsetHeight + 12, root.clientHeight * 0.62) : 0;
      return;
    }
    const W = root.clientWidth, H = root.clientHeight;
    const P = Actors.player;
    const bar = root.querySelector('.battle-bar');
    const barH = bar ? bar.offsetHeight + 16 : 0;
    Actors.reserve = barH + (W < 560 ? 26 : 10);
    for (const el of root.querySelectorAll('.mod-mark')) {
      const p = P.pointOf(el.dataset.uid);
      if (!p) { el.style.display = 'none'; continue; }
      el.style.display = '';
      el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -50%)`;
    }
    const pop = root.querySelector('.pop');
    if (pop && ui.pop) {
      const anchor = ui.pop.uid === 'enemy' ? (Actors.enemy && Actors.enemy.pointOf()) : P.pointOf(ui.pop.uid === 'core' ? 'core' : ui.pop.uid);
      if (W < 560) {
        // Phones: a panel just above the action bar.
        pop.style.transform = `translate(6px, ${Math.round(Math.max(6, H - barH - pop.offsetHeight))}px)`;
      } else if (anchor) {
        const pw = pop.offsetWidth, ph = pop.offsetHeight;
        // Beside the anchor, toward the middle of the view, kept inside it.
        let x = ui.pop.uid === 'enemy' ? anchor.x - pw - 30 : anchor.x + 30;
        if (x + pw > W - 6) x = anchor.x - pw - 30;
        x = Math.max(6, Math.min(W - pw - 6, x));
        const y = Math.max(6, Math.min(H - ph - 56, anchor.y - ph / 2));
        pop.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      }
    }
  }
  (function follow() { placeBattle(); requestAnimationFrame(follow); })();

  // ---------- the portal ----------
  // The boss is down and its spoils are in: a portal swirls where it fell.
  function portalScreen() {
    const next = D.AREAS[game.area + 1];
    const beaten = D.ENEMIES[game.bossId];
    const missing = game.maxHp(game.core) - game.core.hp;
    return [h('section', { class: 'panel stack portal-panel' },
      h('span', { class: 'eyebrow' }, `Area ${game.areaDef().numeral} cleared`),
      h('h2', {}, `Into ${next.name}`),
      h('p', {}, `${beaten.name} is down, and the sky has torn open where it fell. Beyond the vortex: ${next.blurb.charAt(0).toLowerCase() + next.blurb.slice(1)}`),
      h('ul', { class: 'notes' },
        h('li', {}, 'Every installed module flies through with you.'),
        h('li', {}, missing > 0 ? `The crossing fully repairs your Core (+${missing}).` : 'The crossing fully repairs your Core.'),
        h('li', {}, `Its master: ${D.ENEMIES[game.bossIds[game.area + 1]].name}.`)),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: enterPortal }, 'Fly into the portal')))];
  }
  function enterPortal() {
    if (ui.portaling || game.phase !== 'portal') return;
    ui.portaling = true;
    ui.selected = null;
    render();
    FX.portal({
      to: game.area + 1,
      // At the heart of the vortex the next area takes over: new route, new sky, new music.
      onMid: () => { game.crossPortal(); render(); },
      onDone: () => { ui.portaling = false; render(); },
    });
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
        h('p', {}, won ? `Your ${D.CORES[game.core.id].name} crossed all three areas and brought down ${boss.name}.` : `Your ${D.CORES[game.core.id].name} went down in ${game.areaDef().name}, at column ${game.depth} of ${game.maxDepth}.`),
        h('div', { class: 'stats' }, stat('Areas cleared', `${s.areasCleared}/${D.AREAS.length}`), stat('Bosses', s.bossesKilled.length), stat('Encounters', s.encounters), stat('Enemies downed', s.kills), stat('Damage dealt', s.dmgDealt), stat('Damage taken', s.dmgTaken), stat('Cogs earned', s.cogs), stat('Contracts', s.quests)),
        h('p', { class: 'muted' }, `Seed ${Game.seedCode(game.seed)}. Enter it on the title screen to fly the same route again.`),
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
        h('input', { type: 'radio', name: key, id: `set-${key}-${val}`, value: String(val), checked: P[key] === val || null, onchange: () => { P[key] = val; FX.savePrefs(); applyPrefs(); renderSettings(); if (key === 'battle') render(); } }), text))));
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
      radio('battle', 'Screen layout', [['popup', 'Single screen'], ['classic', 'Classic (scrolling)']]),
      h('p', { class: 'muted' }, 'Tap the flight view during an animation to skip ahead.'));
  }
  function applyPrefs() { if (window.CardshipsAudio) window.CardshipsAudio.applyPrefs(FX.prefs); }
  $('settings-btn').addEventListener('click', () => { const el = $('settings'); el.hidden = !el.hidden; if (!el.hidden) renderSettings(); });

  $('brand').addEventListener('click', () => { if (!game || ['gameover', 'victory'].includes(game.phase)) { game = null; render(); } });
  render();

  window.cardships = { get game() { return game; }, scene, render, actors: Actors };
})();
