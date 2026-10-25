// Puts the ships into the flight scene: positions and scales them for each phase, keeps the
// visuals in step with the game, turns game events into ship animation, and handles taps.
(function () {
  const { PlayerShip, EnemyShip } = window.CardshipsShipArt;
  const D = window.CardshipsData;

  const Actors = {
    player: new PlayerShip(),
    enemy: null,
    enemyKey: null,
    game: null,
    phase: null,
    insertFn: null,
    hoverUid: null,
    selectedUid: null,
    intent: null,
    onHoverInsert: null,
    onSelect: null,
    onInsert: null,
    synergy: null,

    reset() { this.player = new PlayerShip(); this.enemy = null; this.enemyKey = null; },
    // Before an event sequence plays: switch layout and make sure the enemy is on screen,
    // without snapping the ship to its final state.
    prepare(game) {
      this.game = game;
      if (!game || !game.core) return;
      this.phase = game.phase;
      const c = game.combat;
      if (c && game.phase === 'combat') {
        const key = c.enemyId + ':' + game.depth;
        if (this.enemyKey !== key) { this.enemy = new EnemyShip(D.ENEMIES[c.enemyId].look); this.enemyKey = key; this.enemy.phase = c.enemy.phase; this.enemy.hpFrac = 1; }
      }
    },
    // Called after every UI render with the latest game state.
    sync(game, ui) {
      this.game = game;
      if (!game || !game.core) { this.phase = null; return; }
      this.phase = game.phase;
      if (game.phase !== 'gameover') this.player.sync(game);
      const c = game.combat;
      if (c && game.phase === 'combat') {
        const key = c.enemyId + ':' + game.depth;
        if (this.enemyKey !== key) { this.enemy = new EnemyShip(D.ENEMIES[c.enemyId].look); this.enemyKey = key; this.enemy.phase = c.enemy.phase; }
        this.enemy.hpFrac = c.enemy.hp / c.enemy.max;
        this.enemy.phase = c.enemy.phase;
        this.enemy.wound = c.enemy.wound;
      }
      // Highlights: selection and the modules the telegraphed intent will hit.
      this.selectedUid = ui.selected;
      this.player.highlight = new Set(ui.selected ? [ui.selected] : []);
      this.player.targets = new Map();
      this.intent = null;
      if (game.phase === 'combat' && c.enemy.intent && !c.over) {
        const p = game.previewIntent();
        for (const hit of p.plan) this.player.targets.set(hit.uid, (this.player.targets.get(hit.uid) || 0) + hit.dmg);
        this.intent = { it: c.enemy.intent, plan: p.plan, text: ui.intentSummary || '', evading: c.evading, stunned: c.enemy.stunned };
      }
      this.player.ghost = ui.preview ? { id: ui.preview.id, side: ui.preview.side, pos: ui.preview.pos, outer: ui.preview.pos === game[ui.preview.side].length } : null;
      this.insertFn = ui.insertFn || null;
      this.player.inserts = [];
      if (this.insertFn) {
        for (const side of ['left', 'right']) {
          const n = game[side].length;
          if (n >= 3) continue;
          for (let pos = 0; pos <= n; pos++) this.player.inserts.push({ side, pos, end: pos === n });
        }
      }
    },

    // Plays game events on the ship visuals. Returns nothing; effects layers may add more.
    react(ev) {
      const P = this.player;
      switch (ev.type) {
        case 'destroyed': P.breakOff(ev.uid, ev.violent); break;
        case 'hit': P.flash(ev.uid); break;
        case 'fire': P.recoil(ev.uid); break;
        case 'enemyHit': if (this.enemy) this.enemy.flash = 1; break;
        case 'enemyAct': if (this.enemy) this.enemy.recoil = 1; break;
        case 'phase': if (this.enemy) this.enemy.phaseFlash = 1; break;
        case 'victory': if (this.enemy) this.enemy.sinking = 0.001; break;
        default: break;
      }
    },

    // Where each ship sits for the current phase.
    layout(v) {
      const phone = v.w < 560;
      const ext = this.player.width();
      if (this.phase === 'combat' || (this.enemy && this.enemy.sinking > 0 && this.enemy.sinking < 3)) {
        const room = phone ? v.w * 0.82 : v.w * 0.52;
        const ps = Math.min(1.35, room / ext, v.h / 190);
        const px = phone ? v.w * 0.42 : v.w * 0.3;
        const py = phone ? v.h * 0.74 : v.h * 0.64;
        const half = this.enemy ? Math.max(60, this.enemy.halfW) : 80;
        const es = Math.min(phone ? 0.85 : 1.4, (phone ? v.w * 0.46 : v.w * 0.42) / (half * 2), v.h / (half * (phone ? 2.8 : 2.3)));
        return { player: { x: px, y: py, s: ps }, enemy: { x: phone ? v.w * 0.76 : v.w * 0.76, y: phone ? v.h * 0.34 : v.h * 0.5, s: es } };
      }
      const s = Math.min(1.6, (v.w * 0.86) / ext, v.h / 165);
      return { player: { x: v.w * 0.5, y: v.h * (this.phase === 'hangar' ? 0.66 : 0.64), s } };
    },

    draw(g, v) {
      if (!this.phase || this.phase === 'shop' || this.phase === 'coreSelect') return;
      this.player.update(v.dt);
      if (this.enemy) this.enemy.update(v.dt);
      const L = this.layout(v);
      const bob = Math.sin(v.t * 1.6) * 4;
      // Centre the whole ship, not just the Core, when it's alone on screen.
      const e = this.player.extent(false);
      const shift = L.enemy ? 0 : ((e.left - e.right) / 2) * L.player.s;
      if (this.phase !== 'gameover' || this.player.dying > 0) this.player.draw(g, L.player.x + shift, L.player.y + bob, L.player.s, v.t, { synergy: this.synergy });
      for (const ins of this.player.inserts) ins.hover = this.previewKey === `${ins.side}:${ins.pos}`;
      if (L.enemy && this.enemy) this.enemy.draw(g, L.enemy.x, L.enemy.y - bob * 0.8, L.enemy.s, v.t);
      if (this.phase === 'combat' && this.enemy && this.intent && !window.CardshipsFX.isPlaying()) this.drawIntent(g, v);
      if (this.game && this.game.core && this.phase !== 'gameover') this.drawLinks(g, v);
      if (this.enemy && this.enemy.sinking > 3) { this.enemy = null; this.enemyKey = null; }
    },

    // The enemy's next move on a brass plate above it, with animated arrows to every target.
    drawIntent(g, v) {
      const { it, plan, text, evading, stunned } = this.intent;
      const ep = this.enemy.pointOf();
      const attack = ['shot', 'rake', 'broadside', 'ram'].includes(it.kind) || (it.kind === 'token');
      g.font = '400 15px "IM Fell English SC", Georgia, serif';
      const title = stunned ? 'Stunned' : evading && attack ? `${it.name} (evading)` : it.name;
      g.font = '600 11px "IBM Plex Mono", monospace';
      const sub = stunned ? 'loses this move' : text;
      const w = Math.max(110, Math.min(v.w * 0.46, Math.max(measure(g, '400 15px "IM Fell English SC", Georgia, serif', title), measure(g, '600 11px "IBM Plex Mono", monospace', sub)) + 40));
      const px = Math.max(w / 2 + 6, Math.min(v.w - w / 2 - 6, ep.x));
      const py = Math.max(8, ep.y - ep.r * 0.95 - 50);
      const color = stunned || (evading && attack) ? '#93a6b3' : attack ? '#ec5f3f' : it.kind === 'block' ? '#93a6b3' : it.kind === 'repair' ? '#5db394' : '#f0b85c';
      // Arrows first, so the plate sits on top.
      if (attack && !evading && !stunned) {
        const seen = new Set();
        const dash = -(v.t * 40) % 14;
        for (const hit of plan) {
          if (seen.has(hit.uid)) continue;
          seen.add(hit.uid);
          const tp = this.player.pointOf(hit.uid);
          if (!tp) continue;
          const sx = ep.x - ep.r * 0.5, sy = ep.y;
          const tx = tp.x, ty = tp.y - tp.r * 0.9;
          const cx = (sx + tx) / 2, cy = Math.min(sy, ty) - 60;
          g.save();
          g.strokeStyle = color; g.lineWidth = 3; g.setLineDash([8, 6]); g.lineDashOffset = dash;
          g.globalAlpha = 0.85;
          g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke();
          g.setLineDash([]);
          const ang = Math.atan2(ty - cy, tx - cx);
          g.fillStyle = color; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - Math.cos(ang - 0.45) * 12, ty - Math.sin(ang - 0.45) * 12); g.lineTo(tx - Math.cos(ang + 0.45) * 12, ty - Math.sin(ang + 0.45) * 12); g.closePath(); g.fill();
          g.restore();
        }
      }
      g.save();
      g.fillStyle = 'rgba(28,20,15,0.9)'; g.strokeStyle = color; g.lineWidth = 2;
      g.beginPath(); g.roundRect(px - w / 2, py, w, 40, 6); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(px - 7, py + 40); g.lineTo(px, py + 48); g.lineTo(px + 7, py + 40); g.closePath(); g.fill(); g.stroke();
      intentIcon(g, px - w / 2 + 16, py + 20, it, color, v.t);
      g.textAlign = 'left';
      g.fillStyle = '#f2e6cc'; g.font = '400 15px "IM Fell English SC", Georgia, serif'; g.fillText(title, px - w / 2 + 30, py + 17, w - 36);
      g.fillStyle = color; g.font = '600 11px "IBM Plex Mono", monospace'; g.fillText(sub, px - w / 2 + 30, py + 32, w - 36);
      g.restore();
    },
    // Synergy links for the hovered or selected module: dashed outlines and labelled arcs.
    drawLinks(g, v) {
      const focus = this.hoverUid || this.selectedUid;
      this.synergy = null;
      if (!focus || !this.game.locate(focus)) return;
      const links = this.game.synergies(focus);
      if (!links.length) return;
      this.synergy = new Set(links.map((l) => l.uid));
      const a = this.player.pointOf(focus);
      if (!a) return;
      g.save();
      g.font = '600 10.5px "Barlow Semi Condensed", sans-serif'; g.textAlign = 'center';
      links.slice(0, 4).forEach((l, i) => {
        const b = this.player.pointOf(l.uid);
        if (!b) return;
        const cy = Math.min(a.y, b.y) - 34 - i * 10;
        g.strokeStyle = '#7ff0c0'; g.lineWidth = 2; g.setLineDash([4, 4]); g.lineDashOffset = -(v.t * 20) % 8;
        g.beginPath(); g.moveTo(a.x, a.y - 10); g.quadraticCurveTo((a.x + b.x) / 2, cy, b.x, b.y - 10); g.stroke();
        g.setLineDash([]);
        const label = l.text.length > 42 ? l.text.slice(0, 40) + '…' : l.text;
        const tw = g.measureText(label).width + 10;
        const lx = Math.max(tw / 2 + 4, Math.min(v.w - tw / 2 - 4, (a.x + b.x) / 2)), ly = cy - 4 - i * 2;
        g.fillStyle = 'rgba(20,40,32,0.88)'; g.beginPath(); g.roundRect(lx - tw / 2, ly - 11, tw, 15, 3); g.fill();
        g.fillStyle = '#bff7dd'; g.fillText(label, lx, ly);
      });
      g.restore();
    },

    // Desktop hover: synergy links for modules, install previews for bolts.
    hover(x, y) {
      const hit = x == null ? null : this.player.hitTest(x, y);
      const uid = hit && hit.uid ? hit.uid : null;
      this.hoverUid = uid;
      if (this.onHoverInsert) this.onHoverInsert(hit && hit.insert ? hit.insert : null);
    },

    // Taps on the canvas: a module, an install bolt or the enemy.
    tap(x, y) {
      const hit = this.player.hitTest(x, y);
      if (hit && hit.insert && this.insertFn) return this.onInsert && this.onInsert(hit.insert.side, hit.insert.pos);
      if (hit && hit.uid) return this.onSelect && this.onSelect(hit.uid);
      if (this.enemy && this.enemy.hitTest(x, y)) return this.onSelect && this.onSelect('enemy');
      return this.onSelect && this.onSelect(null);
    },
  };

  function measure(g, font, text) { g.save(); g.font = font; const w = g.measureText(text).width; g.restore(); return w; }
  // Small glyphs for the intent plate.
  function intentIcon(g, x, y, it, color, t) {
    g.save(); g.translate(x, y); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 2;
    if (it.kind === 'block') { g.beginPath(); g.moveTo(0, -9); g.lineTo(8, -5); g.lineTo(6, 6); g.lineTo(0, 10); g.lineTo(-6, 6); g.lineTo(-8, -5); g.closePath(); g.stroke(); }
    else if (it.kind === 'repair') { g.beginPath(); g.moveTo(-7, 7); g.lineTo(4, -4); g.stroke(); g.beginPath(); g.arc(5, -5, 4, 0.8, Math.PI * 2 - 0.8); g.stroke(); }
    else if (it.kind === 'charge') { g.beginPath(); g.moveTo(0, -9); g.lineTo(-7, 0); g.lineTo(-2, 0); g.lineTo(-4, 9); g.lineTo(7, -2); g.lineTo(2, -2); g.closePath(); g.fill(); }
    else if (it.kind === 'token') { g.fillStyle = { fire: '#ff8a3a', glue: '#9fd05a', gas: '#b6a7d8' }[it.token]; g.beginPath(); g.arc(0, 0, 7 + Math.sin(t * 5), 0, Math.PI * 2); g.fill(); }
    else if (it.kind === 'ram') { g.beginPath(); g.moveTo(8, -7); g.lineTo(-6, 0); g.lineTo(8, 7); g.stroke(); g.beginPath(); g.moveTo(2, -7); g.lineTo(-12, 0); g.lineTo(2, 7); g.stroke(); }
    else { g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.moveTo(0, -10); g.lineTo(0, 10); g.stroke(); }
    g.restore();
  }

  window.CardshipsActors = Actors;
})();
