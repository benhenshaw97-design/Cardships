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
    hoverUid: null,
    selectedUid: null,
    intent: null,
    onSelect: null,
    reserve: 0,
    portal: null, // a portal crossing in progress: { k: 0..1 drawn into the vortex, at: {x, y} }

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
        this.enemy.ward = c.enemy.ward || 0;
        this.enemy.wardKind = game.wardKind();
        this.enemy.armor = c.enemy.armor || 0;
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

    // Where each ship sits for the current phase, and the shared pixel scale P (screen pixels per
    // art pixel, in half steps so pixels stay even). Ships are anchored at the bottom of the hull.
    layout(v) {
      const phone = v.w < 560;
      // Room kept clear along the bottom: the battle bar, or the single-screen window.
      if (this.reserve) v = { ...v, h: v.h - this.reserve };
      const snap = (k) => Math.max(1, Math.floor(k * 2) / 2);
      const pw = this.player.width();
      const bd = this.player.bounds();
      if (this.phase === 'combat' || (this.enemy && this.enemy.sinking > 0 && this.enemy.sinking < 3)) {
        const ew = this.enemy ? this.enemy.artW : 140;
        const eh = this.enemy ? this.enemy.size.h + 10 : 120; // tall ships must clear the top of the view
        if (phone) {
          // The enemy flies in the upper band, your ship in the lower one.
          // The pop-up layout's tall view leaves room for a bigger ship to tap on.
          const wide = this.reserve ? 0.86 : 0.62;
          const P = snap(Math.min(3, (v.w * wide) / pw, (v.h * 0.42) / bd.top));
          const eP = snap(Math.min(P, (v.w * 0.62) / ew, (v.h * 0.47) / eh));
          return { P, player: { x: v.w * (this.reserve ? 0.46 : 0.36), y: v.h * 0.93 }, enemy: { x: v.w * 0.66, y: v.h * 0.5, P: eP } };
        }
        const P = snap(Math.min(4, (v.w * 0.42) / pw, (v.h * 0.72) / bd.top));
        const eP = snap(Math.min(P, (v.w * 0.4) / ew, (v.h * 0.76) / eh));
        return { P, player: { x: v.w * 0.27, y: v.h * 0.84 }, enemy: { x: v.w * 0.74, y: v.h * 0.8, P: eP } };
      }
      const P = snap(Math.min(4, (v.w * 0.6) / pw, (v.h * 0.74) / bd.top));
      return { P, player: { x: v.w / 2, y: v.h * 0.84 } };
    },

    draw(g, v) {
      if (!this.phase || this.phase === 'shop' || this.phase === 'coreSelect') return;
      this.player.update(v.dt);
      if (this.enemy) this.enemy.update(v.dt);
      const L = this.layout(v);
      this.P = L.P;
      const bob = Math.round(Math.sin(v.t * 1.6) * 2) * L.P;
      // A smoke trail streams behind the ship while it travels between nodes.
      if (v.mode === 'travel' && window.CardshipsSprites.ready()) {
        const e = this.player.extent();
        const tw = 90 * L.P;
        g.save(); g.globalAlpha = Math.min(0.85, v.speed / 600); g.imageSmoothingEnabled = false;
        window.CardshipsSprites.draw(g, 'trail_smoke', L.player.x - e.left * L.P - tw / 2 + 6, L.player.y - this.player.size.h * 0.35 * L.P + bob, tw, null, true);
        g.restore();
      }
      // A portal swirls behind the ships; crossing it draws your ship in, shrinking, then back out.
      if (window.CardshipsFX.drawPortal) window.CardshipsFX.drawPortal(g, v);
      let px = L.player.x, py = L.player.y + bob, pP = L.P;
      if (this.portal && this.portal.k > 0) {
        const k = this.portal.k, at = this.portal.at;
        px += (at.x - px) * k;
        py += (at.y + this.player.size.h * L.P * 0.4 - py) * k;
        pP = L.P * (1 - 0.85 * k);
      }
      if (this.phase !== 'gameover' || this.player.dying > 0) this.player.draw(g, px, py, pP, v.t);
      if (L.enemy && this.enemy) this.enemy.draw(g, L.enemy.x, L.enemy.y - bob, L.enemy.P, v.t);
      if (this.phase === 'combat' && this.enemy && this.intent && !window.CardshipsFX.isPlaying()) this.drawIntent(g, v);
      if (this.enemy && this.enemy.sinking > 3) { this.enemy = null; this.enemyKey = null; }
    },

    // The enemy's next move on a brass plate above it, with animated arrows to every target.
    drawIntent(g, v) {
      const { it, plan, text, evading, stunned } = this.intent;
      const ep = this.enemy.pointOf();
      const attack = ['shot', 'rake', 'broadside', 'ram', 'rune', 'grand'].includes(it.kind) || (it.kind === 'token');
      g.font = '400 15px "IM Fell English SC", Georgia, serif';
      const title = stunned ? 'Stunned' : evading && attack ? `${it.name} (evading)` : it.name;
      g.font = '600 11px "IBM Plex Mono", monospace';
      const copy = this.game.combat && this.game.combat.enemyAurora;
      const sub = stunned ? 'loses this move' : copy ? `${text} · copies ${D.AURORA[copy].name}` : text;
      const w = Math.max(110, Math.min(v.w * 0.46, Math.max(measure(g, '400 15px "IM Fell English SC", Georgia, serif', title), measure(g, '600 11px "IBM Plex Mono", monospace', sub)) + 40));
      const px = Math.max(w / 2 + 6, Math.min(v.w - w / 2 - 6, ep.x));
      const py = Math.max(8, ep.y - ep.r * 0.95 - 50);
      const color = stunned || (evading && attack) ? '#93a6b3' : it.kind === 'grand' || it.kind === 'channel' ? '#b98cff' : attack ? '#ec5f3f' : it.kind === 'block' ? '#93a6b3' : it.kind === 'ward' || it.kind === 'siphon' ? '#6ff0d0' : it.kind === 'repair' ? '#5db394' : '#f0b85c';
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
    // Taps on the flight view: your ship selects the Core, the enemy shows its card.
    hover() {},
    tap(x, y) {
      if (this.player.hitTest(x, y)) return this.onSelect && this.onSelect('core');
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
    else if (it.kind === 'ward') { g.beginPath(); for (let i = 0; i <= 6; i++) { const a = (i * Math.PI) / 3; g.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); } g.stroke(); }
    else if (it.kind === 'siphon') { g.beginPath(); g.arc(0, 0, 8, 0.4, Math.PI * 2 - 0.4); g.stroke(); g.beginPath(); g.arc(0, 0, 3 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2); g.fill(); }
    else if (it.kind === 'rune' || it.kind === 'channel' || it.kind === 'grand') { g.save(); g.rotate(t * 1.5); g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 3; i++) { const a = (i * Math.PI * 2) / 3; g.beginPath(); g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a + 2.1) * 4, Math.sin(a + 2.1) * 4); g.stroke(); } g.restore(); }
    else if (it.kind === 'ram') { g.beginPath(); g.moveTo(8, -7); g.lineTo(-6, 0); g.lineTo(8, 7); g.stroke(); g.beginPath(); g.moveTo(2, -7); g.lineTo(-12, 0); g.lineTo(2, 7); g.stroke(); }
    else { g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.moveTo(0, -10); g.lineTo(0, 10); g.stroke(); }
    g.restore();
  }

  window.CardshipsActors = Actors;
})();
