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
    onSelect: null,
    onInsert: null,
    synergy: null,

    // Called after every UI render with the latest game state.
    sync(game, ui) {
      this.game = game;
      if (!game || !game.core) { this.phase = null; return; }
      this.phase = game.phase;
      this.player.sync(game);
      const c = game.combat;
      if (c && game.phase === 'combat') {
        const key = c.enemyId + ':' + game.depth;
        if (this.enemyKey !== key) { this.enemy = new EnemyShip(D.ENEMIES[c.enemyId].look); this.enemyKey = key; this.enemy.phase = c.enemy.phase; }
        this.enemy.hpFrac = c.enemy.hp / c.enemy.max;
        this.enemy.phase = c.enemy.phase;
        this.enemy.wound = c.enemy.wound;
      }
      // Highlights: selection and the modules the telegraphed intent will hit.
      this.player.highlight = new Set(ui.selected ? [ui.selected] : []);
      this.player.targets = new Map();
      if (game.phase === 'combat' && c.enemy.intent && !c.over) {
        const p = game.previewIntent();
        for (const hit of p.plan) this.player.targets.set(hit.uid, (this.player.targets.get(hit.uid) || 0) + hit.dmg);
      }
      this.insertFn = ui.insertFn || null;
      this.player.inserts = [];
      if (this.insertFn) {
        for (const side of ['left', 'right']) {
          const n = game[side].length;
          if (n >= 3) continue;
          for (let pos = 0; pos <= n; pos++) this.player.inserts.push({ side, pos, end: pos === n });
        }
      }
      this.synergy = ui.synergy || null;
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
      const e = this.player.extent();
      const shift = L.enemy ? 0 : ((e.left - e.right) / 2) * L.player.s;
      if (this.phase !== 'gameover') this.player.draw(g, L.player.x + shift, L.player.y + bob, L.player.s, v.t, { synergy: this.synergy });
      if (L.enemy && this.enemy) this.enemy.draw(g, L.enemy.x, L.enemy.y - bob * 0.8, L.enemy.s, v.t);
      if (this.enemy && this.enemy.sinking > 3) { this.enemy = null; this.enemyKey = null; }
      if (this.phase === 'gameover' && Actors.drawWreck) Actors.drawWreck(g, v, L.player);
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

  window.CardshipsActors = Actors;
})();
