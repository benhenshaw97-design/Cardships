// Visual effects. Plays the engine's event stream back as a timed sequence (projectiles, hits,
// explosions, dice), keeps ambient effects running (fire, goo, gas, low-hull alarms), and owns
// the player's effect settings. All effects are 2D canvas particles or CSS transforms.
(function () {
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------- settings ----------
  const PREF_KEY = 'cardships.prefs';
  const prefs = Object.assign({ shake: 'full', flash: true, dice: 'normal', music: 0.6, sfx: 0.8, mute: false, battle: 'popup' }, (() => {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch (e) { return {}; }
  })());
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !localStorage.getItem?.(PREF_KEY)) { prefs.shake = 'off'; prefs.dice = 'fast'; }
  function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* storage unavailable */ } }
  const shakeScale = () => ({ full: 1, reduced: 0.4, off: 0 }[prefs.shake] ?? 1);

  // ---------- particles ----------
  const parts = [];
  const texts = [];
  const shots = [];
  const rings = [];
  let screenFlash = 0;
  let phaseBanner = null;
  let lowHull = 0;

  function burst(x, y, n, kind, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = opts.dir != null ? opts.dir + rand(-opts.spread || -0.8, opts.spread || 0.8) : rand(0, TAU);
      const sp = rand(opts.min || 60, opts.max || 260);
      parts.push({ kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 0), g: opts.g ?? 420, life: rand(0.4, opts.life || 0.9), max: opts.life || 0.9, r: rand(opts.rmin || 1.5, opts.rmax || 3.5), rot: rand(0, TAU), vr: rand(-10, 10), color: opts.color });
    }
  }
  function smokePuff(x, y, n = 6, color = 'rgba(70,62,56,') {
    for (let i = 0; i < n; i++) parts.push({ kind: 'smoke', x: x + rand(-8, 8), y: y + rand(-6, 6), vx: rand(-30, 30), vy: rand(-40, -10), g: -10, life: rand(0.6, 1.2), max: 1.2, r: rand(5, 11), color });
  }
  // Painted effects from the effects sheet: a sprite (or a sequence of frames played across its
  // life) that drifts, grows and fades. Falls back to nothing if the atlas has not loaded.
  const SP = () => window.CardshipsSprites;
  const BOOM = ['boom_3', 'boom_4', 'boom_7', 'boom_8', 'boom_6', 'boom_5'];
  const BLASTS = ['blast_1', 'blast_3', 'blast_4', 'blast_2'];
  const SMOKES = { white: 'smoke_white', grey: 'smoke_grey', black: 'smoke_black', green: 'smoke_green', light: 'smoke_light' };
  function sprite(x, y, names, w, life, opts = {}) {
    parts.push({ kind: 'sprite', names: [].concat(names), x, y, vx: opts.vx || 0, vy: opts.vy || 0, g: opts.g || 0, life, max: life, w, grow: opts.grow ?? 0.25, rot: opts.rot || 0, vr: opts.vr || 0, flip: !!opts.flip, alpha: opts.alpha ?? 1, add: !!opts.add });
  }
  // Frame strips cut from your FX sheet (tools/build_fx_strips.py): explosions, magic bursts, shields.
  const STRIPS = {};
  for (const [name, m] of Object.entries(window.CardshipsFxStrips || {})) { const im = new Image(); im.src = `assets/art/fx/${name}.png`; STRIPS[name] = { img: im, ...m }; }
  const SWIRL = new Image(); SWIRL.src = 'assets/art/fx/blood-swirl.png';
  // A single painted image that spins and fades (the blood swirl of a Bleed tick).
  function spin(x, y, img, w, life) { if (img.complete && img.naturalWidth) parts.push({ kind: 'image', img, x, y, vx: 0, vy: 0, g: 0, life, max: life, w, rot: 0, vr: 3 }); }
  const stripReady = (name) => STRIPS[name] && STRIPS[name].img.complete && STRIPS[name].img.naturalWidth > 0;
  function strip(x, y, name, w, life, opts = {}) {
    if (!stripReady(name)) return false;
    parts.push({ kind: 'strip', name, x, y, vx: 0, vy: opts.vy || 0, g: 0, life, max: life, w, rot: opts.rot || 0, vr: 0, add: !!opts.add, alpha: opts.alpha ?? 1 });
    return true;
  }
  // An explosion sized by damage: the small sequence for chip hits, a painted blast for big ones,
  // and now and then the explosion from your FX sheet.
  function explosion(x, y, size, big = false) {
    if (Math.random() < 0.4 && strip(x, y, 'explosion', size * (big ? 1.5 : 1.2), big ? 0.6 : 0.48, { rot: rand(-0.3, 0.3) })) return;
    if (big) sprite(x, y, BLASTS[Math.floor(Math.random() * BLASTS.length)], size, 0.5, { grow: 0.35, rot: rand(-0.3, 0.3) });
    else sprite(x, y, BOOM, size, 0.42, { grow: 0.2 });
  }
  function smokeCloud(x, y, w, tone = 'grey', opts = {}) {
    sprite(x + rand(-6, 6), y, SMOKES[tone], w, opts.life || 1.3, { vx: rand(-14, 14), vy: opts.vy ?? -22, grow: 0.5, alpha: opts.alpha ?? 0.75, flip: Math.random() < 0.5 });
  }
  function numberAt(x, y, text, color = '#ffe2c4', size = 20) { texts.push({ x, y, text, color, size, life: 1.1, max: 1.1, vy: -46 }); }
  function ring(x, y, color, r0 = 6, r1 = 46, life = 0.4, width = 4) { rings.push({ x, y, color, r0, r1, life, max: life, width }); }
  function shake(amount) { if (Scene()) Scene().kick(amount * shakeScale()); }
  function hitStop(ms) { const s = Scene(); if (s && prefs.shake !== 'off') s.freezeUntil = performance.now() + ms; }
  function flash(alpha) { if (prefs.flash) screenFlash = Math.max(screenFlash, alpha); }
  const Scene = () => window.cardships && window.cardships.scene;
  const A = () => window.CardshipsActors;
  const playerPt = (uid) => { const p = A().player.pointOf(uid || 'core'); return p || A().player.pointOf('core'); };
  const enemyPt = () => (A().enemy ? A().enemy.pointOf() : { x: (Scene() ? Scene().w : 800) * 0.76, y: (Scene() ? Scene().h : 300) * 0.5, r: 60 });

  // ---------- projectiles ----------
  // A projectile flies from a to b over `dur` seconds; `style` picks its look.
  function shoot(from, to, style, dur = 0.32, arc = 0) {
    shots.push({ from, to, style, t: 0, dur, arc, trail: [] });
  }
  function drawShot(g, s) {
    const k = Math.min(1, s.t / s.dur);
    const x = s.from.x + (s.to.x - s.from.x) * k;
    const y = s.from.y + (s.to.y - s.from.y) * k - Math.sin(k * Math.PI) * s.arc;
    s.trail.push([x, y]);
    if (s.trail.length > 10) s.trail.shift();
    switch (s.style) {
      case 'harpoon': {
        g.strokeStyle = '#3a3f44'; g.lineWidth = 2; g.setLineDash([4, 3]);
        g.beginPath(); g.moveTo(s.from.x, s.from.y); g.lineTo(x, y); g.stroke(); g.setLineDash([]);
        const ang = Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x);
        g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = '#c9ced3'; g.strokeStyle = '#24170f'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(10, 0); g.lineTo(-4, -5); g.lineTo(-1, 0); g.lineTo(-4, 5); g.closePath(); g.fill(); g.stroke(); g.restore();
        break;
      }
      case 'flame': case 'firepot':
        if (SP().draw(g, 'fireball', x, y, 46, null, s.to.x < s.from.x)) { if (Math.random() < 0.5) parts.push({ kind: 'flame', x: x - 10 * Math.sign(s.to.x - s.from.x), y, vx: 0, vy: rand(-20, 0), g: -40, life: 0.3, max: 0.3, r: rand(4, 7) }); break; }
        if (s.style === 'firepot') { g.fillStyle = '#ff8a3a'; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); break; }
        for (let i = 0; i < 3; i++) parts.push({ kind: 'flame', x: x + rand(-5, 5), y: y + rand(-5, 5), vx: rand(-20, 20), vy: rand(-30, 0), g: -40, life: rand(0.25, 0.45), max: 0.45, r: rand(5, 10) });
        break;
      case 'goo': case 'tar': {
        // A tumbling glob of glue that leaves sticky drips behind it.
        g.save(); g.translate(x, y); g.rotate(s.t * 14);
        const ok = SP().draw(g, 'glue_glob', 0, 0, s.style === 'tar' ? 26 : 22);
        g.restore();
        if (Math.random() < 0.5) parts.push({ kind: 'drip', x, y, vx: 0, vy: 20, g: 200, life: 0.5, max: 0.5, r: 2 });
        if (!ok) { g.fillStyle = '#c9b37a'; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
        break;
      }
      case 'rocket': {
        // Point along the flight path, using the last trail point for the heading.
        const prev = s.trail.length > 1 ? s.trail[s.trail.length - 2] : [s.from.x, s.from.y];
        const ang = Math.atan2(y - prev[1], x - prev[0]);
        g.save(); g.translate(x, y); g.rotate(ang);
        const ok = SP().draw(g, 'rocket_flat', -18, 0, 56);
        g.restore();
        if (Math.random() < 0.8) parts.push({ kind: 'smoke', x, y, vx: rand(-10, 10), vy: rand(-12, 0), g: 0, life: 0.6, max: 0.6, r: rand(3, 5), color: 'rgba(225,225,225,' });
        if (ok) break;
        g.fillStyle = '#c9ced3'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
        break;
      }
      case 'tracer': case 'enemyTracer': {
        const ang = Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x);
        g.save(); g.translate(x, y); g.rotate(ang);
        const ok = SP().draw(g, s.style === 'tracer' ? 'bullet_long' : 'bullet', -30, 0, 64);
        g.restore();
        if (ok) break;
        const c = s.style === 'tracer' ? '#fff0b0' : '#ffb27a';
        g.strokeStyle = c; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); s.trail.forEach(([tx, ty], i) => (i ? g.lineTo(tx, ty) : g.moveTo(tx, ty))); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill();
        break;
      }
      case 'lightning': {
        // A painted bolt stretched from gun to target, flickering between three shapes.
        const dx = s.to.x - s.from.x, dy = s.to.y - s.from.y, len = Math.hypot(dx, dy);
        const bolt = BOLTS[Math.floor(s.t * 30) % BOLTS.length];
        g.save(); g.translate((s.from.x + s.to.x) / 2, (s.from.y + s.to.y) / 2); g.rotate(Math.atan2(dy, dx));
        g.globalCompositeOperation = 'lighter';
        const ok = SP().draw(g, bolt, 0, 0, len * 1.05, Math.min(40, len * 0.22));
        g.restore();
        if (ok) break;
        g.save(); g.strokeStyle = '#e6f3ff'; g.lineWidth = 2.5; g.shadowColor = '#8fc8ff'; g.shadowBlur = 14;
        g.beginPath(); g.moveTo(s.from.x, s.from.y);
        const n = 8;
        for (let i = 1; i <= n; i++) { const q = (i / n) * k; g.lineTo(s.from.x + (s.to.x - s.from.x) * q + (i < n ? rand(-12, 12) : 0), s.from.y + (s.to.y - s.from.y) * q + (i < n ? rand(-12, 12) : 0)); }
        g.stroke(); g.restore();
        break;
      }
      case 'gas': {
        const col = '#a98ad6';
        g.fillStyle = col; g.strokeStyle = '#24170f'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); g.stroke();
        if (Math.random() < 0.6) parts.push({ kind: 'smoke', x, y, vx: rand(-10, 10), vy: rand(-10, 10), g: 0, life: 0.4, max: 0.4, r: 4, color: 'rgba(170,140,220,' });
        break;
      }
      case 'bomb':
        g.fillStyle = '#2b2622'; g.beginPath(); g.ellipse(x, y, 5, 8, 0, 0, TAU); g.fill();
        g.fillStyle = '#c0693a'; g.fillRect(x - 4, y - 11, 8, 3);
        break;
      default: { // cannonball / shell
        g.fillStyle = '#2b2622'; g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, s.style === 'shell' ? 4 : 5.5, 0, TAU); g.fill(); g.stroke();
        if (Math.random() < 0.7) parts.push({ kind: 'smoke', x, y, vx: 0, vy: -8, g: 0, life: 0.5, max: 0.5, r: 3, color: 'rgba(200,200,200,' });
      }
    }
  }
  const BOLTS = ['bolt_forked', 'bolt_jagged', 'bolt_chain'];
  const FLAMES = ['fire_1', 'fire_2', 'fire_3'];
  const BIG_FLAMES = ['fire_big_1', 'fire_big_2', 'fire_big_1', 'fire_big_2', 'fire_big_3'];
  const WEAPON_SHOT = { harpoon: ['harpoon', 0.3, 0], grapnel: ['harpoon', 0.3, 0], rockets: ['rocket', 0.4, 30], flak: ['shell', 0.45, 70], cannon: ['ball', 0.32, 18], dreadnought: ['ball', 0.26, 8], titanfist: ['ball', 0.22, 0], mortar: ['shell', 0.55, 90], flamethrower: ['flame', 0.35, 0], gatling: ['goo', 0.3, 0], grenadiers: ['rocket', 0.45, 40], sniper: ['tracer', 0.14, 0], tesla: ['lightning', 0.18, 0] };

  // ---------- ambient effects ----------
  function ambient(dt, t) {
    const P = A().player;
    for (const m of P.mods.values()) {
      const pt = P.pointOf(m.uid);
      if (!pt) continue;
      if (m.tokens.fire && Math.random() < dt * 22) parts.push({ kind: 'ember', x: pt.x + rand(-10, 10), y: pt.y - 8, vx: rand(-20, 10), vy: rand(-70, -30), g: -20, life: rand(0.5, 1), max: 1, r: rand(1, 2.2) });
      if (m.tokens.gas && Math.random() < dt * 4) parts.push({ kind: 'gas', x: pt.x + rand(-20, 20), y: pt.y + rand(-14, 10), vx: rand(-8, 8), vy: rand(-6, 4), g: 0, life: 1.6, max: 1.6, r: rand(8, 14) });
      if (m.tokens.bleed > 0 && Math.random() < dt * (2 + m.tokens.bleed * 1.5)) parts.push({ kind: 'drip', x: pt.x + rand(-12, 12), y: pt.y + 6, vx: 0, vy: 12, g: 220, life: 0.8, max: 0.8, r: 2.2, color: '#c8101e' });
      if (m.tokens.glue && Math.random() < dt * 2.5) parts.push({ kind: 'drip', x: pt.x + rand(-12, 12), y: pt.y + 10, vx: 0, vy: 10, g: 160, life: 0.9, max: 0.9, r: 2.4 });
    }
    const en = window.cardships.game && window.cardships.game.combat;
    if (A().enemy && en && !en.over) {
      const ep = enemyPt();
      if (en.enemy.burn > 0 && Math.random() < dt * 18) parts.push({ kind: 'flame', x: ep.x + rand(-ep.r * 0.6, ep.r * 0.6), y: ep.y + rand(-10, 20), vx: rand(-10, 10), vy: rand(-60, -30), g: -30, life: rand(0.3, 0.6), max: 0.6, r: rand(5, 9) });
      if (en.enemy.vuln > 0 && Math.random() < dt * 5) parts.push({ kind: 'gas', x: ep.x + rand(-ep.r, ep.r), y: ep.y + rand(-20, 20), vx: rand(-8, 8), vy: rand(-6, 6), g: 0, life: 1.8, max: 1.8, r: rand(10, 16) });
      if (en.enemy.weak > 0 && Math.random() < dt * 3) parts.push({ kind: 'drip', x: ep.x + rand(-ep.r * 0.5, ep.r * 0.5), y: ep.y + 10, vx: 0, vy: 10, g: 160, life: 0.9, max: 0.9, r: 2.6 });
    }
    // Low hull: sparks from the Core and an alarm.
    const g = window.cardships.game;
    const low = g && g.core && g.phase === 'combat' && g.core.hp / g.maxHp(g.core) <= 0.34;
    lowHull += ((low ? 1 : 0) - lowHull) * Math.min(1, dt * 3);
    if (low && Math.random() < dt * 6) { const c = playerPt('core'); burst(c.x + rand(-15, 15), c.y - 6, 3, 'spark', { min: 40, max: 140, life: 0.5 }); }
  }

  // Lasting status effects, painted every frame: flames on burning modules and on a burning enemy,
  // globs of glue on glued modules and on a Gummed enemy.
  function drawStatus(g, t) {
    const game = window.cardships.game;
    if (!game || !game.core || !A().player) return;
    const P = A().player;
    const flame = (x, y, w, seed, big) => { const set = big ? BIG_FLAMES : FLAMES; SP().draw(g, set[Math.floor(t * 9 + seed * 7) % set.length], x, y, w); };
    const spots = [...[...P.mods.values()].map((m) => [m.uid, m.tokens]), ['core', game.core.tokens]];
    for (const [uid, tok] of spots) {
      if (!tok || (!tok.fire && !tok.glue)) continue;
      const pt = P.pointOf(uid);
      if (!pt) continue;
      const seed = (uid.charCodeAt(uid.length - 1) || 0) % 5;
      if (tok.glue) SP().draw(g, 'glue_glob', pt.x + 4, pt.y + 2, 20 + seed);
      if (tok.fire) flame(pt.x - 2, pt.y - 10, 22, seed, false);
    }
    const c = game.combat;
    if (A().enemy && c && !c.over) {
      const ep = enemyPt();
      if (c.enemy.weak > 0) for (const [k, dx] of [[0, -0.35], [1, 0.25]]) SP().draw(g, k ? 'glue_spray' : 'glue_glob', ep.x + dx * ep.r, ep.y + 8 + k * 6, 30);
      if (c.enemy.burn > 0) for (let i = 0; i < Math.min(3, c.enemy.burn); i++) flame(ep.x + (i - 1) * ep.r * 0.45, ep.y - 6 + (i % 2) * 10, 30 + c.enemy.burn * 3, i, true);
    }
  }

  // Painted bits: coin spin frames and scrap pieces (gears, bolts, wrench, shards).
  const bitImg = (n) => { const im = new Image(); im.src = `assets/art/bits/${n}.png`; return im; };
  const BITS = {
    coin: Array.from({ length: 11 }, (_, i) => bitImg('coin' + i)),
    gear: [0, 3, 23, 29, 30].map((i) => bitImg('debris' + i)),
    bolt: [6, 18, 25, 31, 4, 19].map((i) => bitImg('debris' + i)),
    scrap: [1, 2, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 22, 24, 26, 27, 28].map((i) => bitImg('debris' + i)),
    wrench: [bitImg('debris20')],
  };
  function bitFor(p) {
    if (p.seed == null) p.seed = Math.floor(Math.random() * 64);
    const set = p.kind === 'wrench' ? BITS.wrench : p.kind === 'bolt' ? (p.seed % 3 ? BITS.scrap : BITS.bolt) : BITS.gear;
    return set[p.seed % set.length];
  }
  function drawOldBit(g, p, a) {
    switch (p.kind) {
      case 'bolt': g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = a; g.fillStyle = '#8d9399'; g.fillRect(-1.5, -4, 3, 8); g.fillStyle = '#c9ced3'; g.fillRect(-3, -5, 6, 2.5); g.restore(); break;
      case 'cog': {
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = a;
        g.fillStyle = '#f0c24e'; g.strokeStyle = '#7a5313'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 16; i++) { const ang = (i / 16) * TAU; const rr = i % 2 ? p.r : p.r * 1.25; g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#7a5313'; g.beginPath(); g.arc(0, 0, p.r * 0.4, 0, TAU); g.fill(); g.restore(); break;
      }
      case 'wrench': g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = a; g.strokeStyle = '#d6dde2'; g.lineWidth = 3; g.beginPath(); g.moveTo(-8, 0); g.lineTo(6, 0); g.stroke(); g.beginPath(); g.arc(8, 0, 4, 0.6, TAU - 0.6); g.stroke(); g.restore(); break;
    }
  }

  // ---------- drawing hooks ----------
  function drawFx(g, v) {
    const dt = v.dt;
    ambient(dt, v.t);
    drawStatus(g, v.t);
    for (const s of shots) { s.t += dt; drawShot(g, s); }
    for (let i = shots.length - 1; i >= 0; i--) if (shots[i].t >= shots[i].dur) shots.splice(i, 1);
    for (const p of parts) {
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.rot += p.vr * dt || 0;
      const a = Math.max(0, p.life / p.max);
      switch (p.kind) {
        case 'spark':
          if (p.color && p.color[0] === '#') { g.globalAlpha = a; g.fillStyle = p.color; g.fillRect(p.x, p.y, p.r, p.r); g.globalAlpha = 1; }
          else { g.fillStyle = `rgba(255,${180 + Math.floor(a * 60)},80,${a})`; g.fillRect(p.x, p.y, p.r, p.r); }
          break;
        case 'smoke': g.fillStyle = (p.color || 'rgba(70,62,56,') + (a * 0.6) + ')'; g.beginPath(); g.arc(p.x, p.y, p.r * (1.6 - a * 0.6), 0, TAU); g.fill(); break;
        case 'flame': { const r = p.r * (0.5 + a * 0.6); g.fillStyle = `rgba(255,${Math.floor(120 + a * 110)},50,${a})`; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill(); break; }
        case 'ember': g.fillStyle = `rgba(255,${150 + Math.floor(a * 80)},60,${a})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); break;
        case 'gas': g.fillStyle = `rgba(160,130,215,${a * 0.35})`; g.beginPath(); g.arc(p.x + Math.sin(v.t * 2 + p.r) * 4, p.y, p.r * (1.4 - a * 0.4), 0, TAU); g.fill(); break;
        case 'drip': g.fillStyle = p.color ? p.color : `rgba(150,210,80,${a})`; if (p.color) g.globalAlpha = a; g.beginPath(); g.ellipse(p.x, p.y, p.r * 0.8, p.r * 1.3, 0, 0, TAU); g.fill(); g.globalAlpha = 1; break;
        case 'gear': case 'bolt': case 'wrench': case 'cog': {
          // Painted debris and coin sprites; the drawn shapes below stand in until they load.
          const im = p.kind === 'cog' ? BITS.coin[Math.floor((p.max - p.life) * 14 + (p.seed || 0)) % BITS.coin.length] : bitFor(p);
          if (im && im.complete && im.naturalWidth) {
            const s = (p.r || 4) * (p.kind === 'cog' ? 3.2 : 3.6) / Math.max(im.naturalWidth, im.naturalHeight);
            g.save(); g.translate(p.x, p.y); if (p.kind !== 'cog') g.rotate(p.rot); g.globalAlpha = a; g.imageSmoothingEnabled = false;
            g.drawImage(im, -im.naturalWidth * s / 2, -im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); g.restore(); break;
          }
          if (p.kind !== 'gear') { drawOldBit(g, p, a); break; }
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = a; g.fillStyle = p.color || '#d4a24c'; g.strokeStyle = '#24170f'; g.lineWidth = 1;
          g.beginPath(); for (let i = 0; i < 12; i++) { const ang = (i / 12) * TAU; const rr = i % 2 ? p.r : p.r * 1.35; g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } g.closePath(); g.fill(); g.stroke();
          g.fillStyle = '#24170f'; g.beginPath(); g.arc(0, 0, p.r * 0.35, 0, TAU); g.fill(); g.restore(); break;
        }
        case 'water': g.fillStyle = `rgba(150,200,255,${a})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); break;
        case 'sprite': {
          const k = 1 - a;
          const name = p.names[Math.min(p.names.length - 1, Math.floor(k * p.names.length))];
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
          // Hold full strength, then fade over the last 40% of life.
          g.globalAlpha = p.alpha * Math.min(1, a / 0.4);
          if (p.add) g.globalCompositeOperation = 'lighter';
          SP().draw(g, name, 0, 0, p.w * (1 + p.grow * k), null, p.flip);
          g.restore(); break;
        }
        case 'image': {
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, a * 1.6);
          const k = 0.6 + 0.4 * (1 - a), hh = p.w * p.img.naturalHeight / p.img.naturalWidth;
          g.drawImage(p.img, -p.w * k / 2, -hh * k / 2, p.w * k, hh * k);
          g.restore(); break;
        }
        case 'strip': {
          const S = STRIPS[p.name];
          const f = Math.min(S.frames - 1, Math.floor((1 - a) * S.frames));
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
          g.globalAlpha = p.alpha * Math.min(1, a / 0.25);
          if (p.add) g.globalCompositeOperation = 'lighter';
          g.drawImage(S.img, f * S.cell, 0, S.cell, S.cell, -p.w / 2, -p.w / 2, p.w, p.w);
          g.restore(); break;
        }
        default: break;
      }
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
    if (parts.length > 900) parts.splice(0, parts.length - 900);
    for (const r of rings) {
      r.life -= dt; const k = Math.min(1, 1 - r.life / r.max); // shrinking rings must not overshoot below zero
      g.strokeStyle = r.color; g.globalAlpha = Math.max(0, r.life / r.max); g.lineWidth = r.width;
      g.beginPath(); g.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * k, 0, TAU); g.stroke();
    }
    g.globalAlpha = 1;
    for (let i = rings.length - 1; i >= 0; i--) if (rings[i].life <= 0) rings.splice(i, 1);
  }
  function drawOverlay(g, v) {
    const dt = v.dt;
    // Floating numbers sit above everything.
    for (const t of texts) {
      t.life -= dt; t.y += t.vy * dt; t.vy *= 0.94;
      const a = Math.max(0, Math.min(1, t.life / t.max * 2));
      g.font = `400 ${t.size}px "IM Fell English SC", Georgia, serif`; g.textAlign = 'center';
      g.globalAlpha = a; g.lineWidth = 4; g.strokeStyle = '#1b120c'; g.strokeText(t.text, t.x, t.y); g.fillStyle = t.color; g.fillText(t.text, t.x, t.y);
    }
    g.globalAlpha = 1;
    for (let i = texts.length - 1; i >= 0; i--) if (texts[i].life <= 0) texts.splice(i, 1);
    // Low hull: red vignette pulse and alarm beacons.
    if (lowHull > 0.02) {
      const pulse = prefs.flash ? 0.5 + Math.sin(v.t * 5) * 0.5 : 0.6;
      const grd = g.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.35, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.75);
      grd.addColorStop(0, 'rgba(200,20,10,0)'); grd.addColorStop(1, `rgba(200,20,10,${0.38 * lowHull * pulse})`);
      g.fillStyle = grd; g.fillRect(0, 0, v.w, v.h);
      for (const x of [14, v.w - 14]) {
        g.fillStyle = `rgba(255,60,30,${(0.5 + 0.5 * Math.sin(v.t * 8)) * lowHull})`; g.beginPath(); g.arc(x, 14, 6, 0, TAU); g.fill();
        if (prefs.flash) { g.save(); g.translate(x, 14); g.rotate(v.t * 4); const beam = g.createLinearGradient(0, 0, 70, 0); beam.addColorStop(0, `rgba(255,70,40,${0.35 * lowHull})`); beam.addColorStop(1, 'rgba(255,70,40,0)'); g.fillStyle = beam; g.beginPath(); g.moveTo(0, 0); g.lineTo(70, -14); g.lineTo(70, 14); g.closePath(); g.fill(); g.restore(); }
      }
    }
    if (phaseBanner) {
      phaseBanner.life -= dt;
      const k = phaseBanner.life / phaseBanner.max;
      const a = Math.min(1, k * 3, (1 - k) * 6);
      g.fillStyle = `rgba(20,8,6,${0.55 * a})`; g.fillRect(0, v.h * 0.4, v.w, 48);
      g.font = '400 26px "IM Fell English SC", Georgia, serif'; g.textAlign = 'center'; g.globalAlpha = a;
      g.fillStyle = '#ff9a6a'; g.fillText(phaseBanner.text, v.w / 2, v.h * 0.4 + 32); g.globalAlpha = 1;
      if (prefs.flash) { for (const x of [v.w * 0.08, v.w * 0.92]) { g.fillStyle = `rgba(255,40,20,${a * (0.5 + 0.5 * Math.sin(v.t * 14))})`; g.beginPath(); g.arc(x, v.h * 0.4 + 24, 9, 0, TAU); g.fill(); } }
      if (phaseBanner.life <= 0) phaseBanner = null;
    }
    if (screenFlash > 0) { g.fillStyle = `rgba(255,250,235,${screenFlash})`; g.fillRect(0, 0, v.w, v.h); screenFlash = Math.max(0, screenFlash - dt * 3); }
    drawWarp(g, v);
  }

  // ---------- dice ----------
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function dieEl(value, label) {
    const d = document.createElement('div');
    d.className = 'die';
    const face = document.createElement('div');
    face.className = 'die-face';
    for (let i = 0; i < 9; i++) { const p = document.createElement('i'); if (PIPS[value].includes(i)) p.className = 'on'; face.append(p); }
    // The painted die face covers the drawn pips once it loads.
    const art = new Image(); art.className = 'die-art'; art.alt = ''; art.src = `assets/art/bits/die${value}.png`;
    art.onload = () => face.classList.add('painted');
    face.append(art);
    d.append(face);
    const l = document.createElement('span');
    l.className = 'die-label';
    l.textContent = label;
    d.append(l);
    return d;
  }
  // Shows a tray of rolled dice: they spin and bounce, then settle with a glow on the result.
  function showDice(rolls, dur) {
    const overlay = document.getElementById('scene-overlay');
    let tray = overlay.querySelector('.dice-tray');
    if (tray) tray.remove();
    tray = document.createElement('div');
    tray.className = `dice-tray ${prefs.dice === 'fast' ? 'fast' : ''}`;
    rolls.forEach((r, i) => { const d = dieEl(r.value, r.label.includes(': ') ? r.label.split(': ').pop() : r.label); d.style.animationDelay = `${i * 60}ms`; tray.append(d); });
    overlay.append(tray);
    clearTimeout(showDice.timer);
    showDice.timer = setTimeout(() => tray.classList.add('fade'), dur + 900);
    setTimeout(() => tray.remove(), dur + 1400);
    if (window.CardshipsAudio) window.CardshipsAudio.sfx('dice');
  }

  // ---------- event timeline ----------
  // Each handler starts the effect for one event and returns how long to wait before the next.
  const sfx = (name, opts) => { if (window.CardshipsAudio) window.CardshipsAudio.sfx(name, opts); };
  let lookahead = [];
  let lastFire = null;
  let lastBolt = false; // the enemy's last shot was lightning
  function nextTarget() {
    const ev = lookahead.find((e) => ['hit', 'block', 'destroyed'].includes(e.type));
    return ev ? ev.uid : null;
  }
  const HANDLERS = {
    roll(ev, ctx) {
      // Consecutive rolls are grouped into one tray.
      const rolls = [ev];
      while (lookahead[0] && lookahead[0].type === 'roll') rolls.push(lookahead.shift());
      if (prefs.dice === 'off' || ctx.skip) return 0;
      const dur = prefs.dice === 'fast' ? 260 : 650;
      showDice(rolls, dur);
      return dur + 120;
    },
    fire(ev) {
      lastFire = ev.id;
      const from = playerPt(ev.uid);
      const to = enemyPt();
      const [style, dur, arc] = WEAPON_SHOT[ev.id] || ['ball', 0.3, 10];
      A().player.recoil(ev.uid);
      burst(from.x + 16, from.y - 4, 8, 'spark', { dir: 0, spread: 0.5, min: 80, max: 220, life: 0.3 });
      smokePuff(from.x + 18, from.y - 4, 4, 'rgba(220,215,205,');
      ring(from.x + 18, from.y - 4, 'rgba(255,230,160,0.9)', 2, 18, 0.18, 3);
      if (ev.id === 'tesla') sprite(from.x + 6, from.y - 20, 'orb_blue', 34, 0.3, { add: true });
      else if (ev.id !== 'harpoon') { sprite(from.x + 24, from.y - 5, 'spark_orange', 30, 0.16, { grow: 0.6, add: true }); smokeCloud(from.x + 26, from.y - 8, 26, 'white', { life: 0.8, alpha: 0.6 }); }
      const volley = ev.id === 'rockets' ? 3 : 1;
      for (let i = 0; i < volley; i++) setTimeout(() => shoot({ x: from.x + 16, y: from.y - 6 }, { x: to.x + rand(-to.r * 0.3, to.r * 0.2), y: to.y + rand(-14, 14) }, style, dur, arc + rand(-10, 10) * i), i * 90);
      if (ev.id === 'flak') setTimeout(() => { for (let i = 0; i < 6; i++) sprite(from.x + 40 + rand(0, (to.x - from.x) * 0.6), from.y - 60 + rand(-30, 20), 'smoke_grey', 30, 1.2, { grow: 0.6, alpha: 0.55 }); }, dur * 600);
      sfx(ev.id === 'flamethrower' ? 'flame' : ev.id === 'tesla' ? 'zap' : ev.id === 'gatling' ? 'gatling' : ev.id === 'harpoon' ? 'harpoon' : 'cannon');
      return dur * 1000;
    },
    strafe(ev) {
      const to = enemyPt();
      ev.uids.forEach((uid, i) => { const f = playerPt(uid); setTimeout(() => shoot({ x: f.x, y: f.y - 6 }, { x: to.x + rand(-20, 20), y: to.y + rand(-14, 14) }, 'tracer', 0.18), i * 70); });
      sfx('gatling');
      return 260 + ev.uids.length * 70;
    },
    bombard() {
      const to = enemyPt();
      for (let i = 0; i < 5; i++) setTimeout(() => shoot({ x: to.x + rand(-60, 60), y: -20 }, { x: to.x + rand(-30, 30), y: to.y }, 'bomb', 0.4), i * 80);
      sfx('whistle');
      return 760;
    },
    // Tempest: the stored charge leaps from the Core to the enemy as a painted bolt.
    // ---------- Area 2 ----------
    resonance(ev) {
      const p = playerPt(ev.uid);
      if (ev.drained) { for (let i = 0; i < 6; i++) setTimeout(() => shoot({ x: p.x, y: p.y }, enemyPt(), 'tracer', 0.25), i * 40); return 120; }
      burst(p.x, p.y, 6, 'spark', { min: 20, max: 80, life: 0.5, g: -40, color: '#9fffe8' });
      ring(p.x, p.y, 'rgba(140,255,220,0.8)', 4, 22, 0.35, 2);
      return 60;
    },
    spell(ev) {
      const p = playerPt(ev.uid);
      ring(p.x, p.y, ev.kind === 'weapon' ? 'rgba(160,255,230,0.95)' : ev.kind === 'defense' ? 'rgba(120,255,160,0.95)' : 'rgba(200,170,255,0.95)', 6, 46 * ev.mult, 0.5, 5);
      strip(p.x, p.y, ev.kind === 'weapon' ? 'magic-blue' : ev.kind === 'defense' ? 'magic-green' : 'magic-purple', 70 * ev.mult, 0.5, { add: true });
      if (ev.kind === 'weapon') { shoot({ x: p.x, y: p.y }, enemyPt(), 'lightning', 0.2); lastFire = 'tesla'; const e = enemyPt(); setTimeout(() => strip(e.x, e.y, 'magic-blue', 110, 0.5, { add: true }), 200); }
      numberAt(p.x, p.y - 34, { weapon: 'Arcane Bolt', defense: 'Aegis', support: 'Surge', utility: 'Surge' }[ev.kind] + (ev.mult > 1 ? ' ×2' : ''), '#aef7e4', 16);
      sfx('spell');
      return 300;
    },
    aurora() { flash(0.06); return 0; },
    prism(ev) { const p = playerPt(ev.uid); for (const [c, r] of [['rgba(255,110,110,0.9)', 26], ['rgba(110,255,150,0.9)', 34], ['rgba(110,170,255,0.9)', 42]]) ring(p.x, p.y, c, 6, r, 0.5, 3); sfx('spell'); return 220; },
    enemyWard(ev) { const p = enemyPt(); if (!ev.bats && !ev.illusion) strip(p.x, p.y, 'shield-up', p.r * 2.4, 0.7, { add: true, alpha: 0.85 }); ring(p.x, p.y, ev.bats ? 'rgba(255,50,60,0.8)' : ev.illusion ? 'rgba(220,200,255,0.8)' : ev.crystal ? 'rgba(170,255,230,0.95)' : 'rgba(170,255,230,0.75)', p.r * 0.3, p.r * 1.2, 0.6, 4); sfx('clang'); return 240; },
    enemyArmor() { const p = enemyPt(); burst(p.x, p.y, 14, 'spark', { min: 30, max: 120, life: 0.5, color: '#bff6ff' }); sfx('clank'); return 160; },
    channel() { const p = enemyPt(); ring(p.x, p.y, 'rgba(200,160,255,0.9)', p.r * 1.4, p.r * 0.2, 0.7, 5); sfx('spell'); return 260; },
    grandBroken() { const p = enemyPt(); flash(0.5); shake(14); for (let i = 0; i < 3; i++) ring(p.x, p.y, 'rgba(200,255,240,0.95)', 8, 90 + i * 30, 0.6, 6); explosion(p.x, p.y, 140, true); phaseBanner = { text: 'Convergence broken!', life: 1.3, max: 1.3 }; sfx('bigHit'); return 500; },
    shards(ev) { const from = playerPt(ev.uid), to = enemyPt(); for (let i = 0; i < 2 + ev.dmg; i++) setTimeout(() => shoot({ x: from.x, y: from.y }, { x: to.x + rand(-20, 20), y: to.y + rand(-14, 14) }, 'tracer', 0.2), i * 50); sfx('clang'); return 180; },
    // ---------- Area 3 ----------
    moon(ev) { if (ev.locked || ev.well) flash(0.18); numberAt(enemyPt().x, 60, ev.well ? 'The moon wanes' : ev.locked ? 'FULL MOON' : `Moon ${ev.moon}`, '#ff6a6a', ev.locked ? 22 : 15); return ev.locked ? 400 : 120; },
    eclipse() { flash(0.7); shake(16); phaseBanner = { text: 'Eclipse', life: 1.6, max: 1.6 }; sfx('bigHit'); return 700; },
    bleed(ev) { const p = playerPt(ev.uid); burst(p.x, p.y - 4, 8 + ev.dmg * 2, 'drip', { min: 30, max: 120, g: 300, life: 0.7, rmin: 2, rmax: 4, color: '#c8101e' }); ring(p.x, p.y, 'rgba(220,20,40,0.9)', 6, 28, 0.3, 4); sfx('splat'); return 140; },
    enemyBleed() { const p = enemyPt(); spin(p.x, p.y, SWIRL, p.r * 1.6, 0.8); burst(p.x, p.y, 16, 'drip', { min: 40, max: 160, g: 300, life: 0.8, rmin: 2, rmax: 5, color: '#c8101e' }); sfx('splat'); return 180; },
    batBite(ev) { const from = enemyPt(), p = playerPt(ev.uid); shoot({ x: from.x, y: from.y - 20 }, { x: p.x, y: p.y }, 'enemyTracer', 0.25); return 120; },
    thorns(ev) { const p = playerPt(ev.uid), to = enemyPt(); burst(p.x, p.y, 10, 'spark', { min: 60, max: 200, life: 0.4, color: '#ff4a5a' }); shoot({ x: p.x, y: p.y }, to, 'tracer', 0.2); return 160; },
    chalice() { const c = playerPt('core'); ring(c.x, c.y, 'rgba(255,60,80,0.85)', 4, 26, 0.4, 3); return 40; },
    bloodburn(ev) { const p = playerPt(ev.uid); ring(p.x, p.y, 'rgba(255,40,60,0.95)', 4, 40, 0.5, 5); burst(p.x, p.y, 12, 'flame', { up: 60, min: 10, max: 60, g: -60, life: 0.5, rmin: 3, rmax: 7 }); sfx('crackle'); return 220; },
    altar(ev) { const p = ev.uid ? playerPt(ev.uid) : playerPt('core'); for (let i = 0; i < 3; i++) ring(p.x, p.y, 'rgba(200,0,30,0.9)', 8, 50 + i * 20, 0.7, 5); burst(p.x, p.y, 24, 'drip', { min: 40, max: 200, g: 200, life: 0.9, rmin: 2, rmax: 5, color: '#c8101e' }); sfx('bigHit'); return 420; },
    rise() { const p = enemyPt(); flash(0.3); for (let i = 0; i < 3; i++) ring(p.x, p.y, 'rgba(230,220,190,0.9)', p.r * 1.2, 10, 0.7, 5); phaseBanner = { text: 'It rises again!', life: 1.3, max: 1.3 }; sfx('bigHit'); return 600; },
    phasedMiss() { const p = enemyPt(); numberAt(p.x, p.y - 30, 'PHASED', '#cfe8ff', 16); ring(p.x, p.y, 'rgba(200,230,255,0.6)', p.r * 0.5, p.r * 1.1, 0.4, 3); return 160; },
    blessing() { const c = playerPt('core'); for (let i = 0; i < 3; i++) ring(c.x, c.y, ['rgba(93,255,168,0.9)', 'rgba(79,216,255,0.9)', 'rgba(192,140,255,0.9)'][i], 10, 70 + i * 20, 0.8, 4); sfx('ratchet'); return 400; },
    enchant(ev) { const p = playerPt(ev.uid); ring(p.x, p.y, 'rgba(160,255,230,0.95)', 4, 50, 0.7, 4); burst(p.x, p.y, 16, 'spark', { min: 30, max: 120, life: 0.8, g: -30, color: '#9fffe8' }); sfx('spell'); return 400; },
    // Leviathan Plating: a golden flare at the bow, then the blocked force flung back.
    reflect(ev) {
      const from = playerPt(A().player.mods.size ? [...A().player.mods.values()].find((m) => m.legendary)?.uid : 'core'), to = enemyPt();
      ring(from.x, from.y, 'rgba(255,214,110,0.95)', 8, 60, 0.45, 6);
      shoot({ x: from.x, y: from.y }, { x: to.x, y: to.y }, 'tracer', 0.18);
      sfx('clang');
      return 220;
    },
    // Storm Heart: a bolt from the clouds onto the enemy.
    stormheart() {
      const to = enemyPt();
      shoot({ x: to.x + rand(-40, 40), y: -10 }, { x: to.x + rand(-16, 16), y: to.y }, 'lightning', 0.16);
      lastFire = 'tesla';
      flash(0.15);
      sfx('zap');
      return 260;
    },
    galeShift() { const to = enemyPt(); sprite(to.x + rand(-20, 20), to.y + rand(-14, 14), ['zap_crack', 'zap_blue'], 46, 0.3, { add: true }); lastFire = 'tesla'; sfx('zap'); return 120; },
    // A Ward shatters in a ring of light; a prism shot breaks every layer at once.
    wardPop(ev) { const p = enemyPt(); if (!ev || !['illusion', 'bats'].includes(ev.kind)) strip(p.x, p.y, 'shield-break', p.r * 2.4, 0.55, { add: true }); ring(p.x, p.y, 'rgba(170,255,230,0.95)', p.r * 0.5, p.r * 1.3, 0.45, 5); burst(p.x, p.y, 18, 'spark', { min: 120, max: 320, life: 0.5 }); numberAt(p.x, p.y - p.r * 0.7, 'Ward!', '#aef7e4', 18); sfx('clang'); return 260; },
    enemyLayers() { const p = enemyPt(); for (let i = 0; i < 3; i++) ring(p.x, p.y, ['rgba(255,120,120,0.9)', 'rgba(140,255,170,0.9)', 'rgba(150,180,255,0.9)'][i], p.r * 0.4, p.r * (1.1 + i * 0.25), 0.5, 4); sfx('spell'); return 280; },
    discharge(ev) {
      const c = playerPt('core'), to = enemyPt();
      for (let i = 0; i < 1 + Math.min(3, Math.floor(ev.charge / 2)); i++) setTimeout(() => shoot({ x: c.x, y: c.y - 10 }, { x: to.x + rand(-20, 20), y: to.y + rand(-14, 14) }, 'lightning', 0.2), i * 80);
      lastFire = 'tesla';
      sfx('zap');
      return 320;
    },
    coreAbility(ev) {
      if (ev.id === 'overclock') { const c = playerPt('core'); for (let i = 0; i < 8; i++) parts.push({ kind: 'cog', x: c.x, y: c.y, vx: rand(-80, 80), vy: rand(-140, -60), g: 200, life: 0.8, max: 0.8, r: 4, rot: 0, vr: rand(-8, 8) }); sfx('clank'); return 300; }
      return 0;
    },
    enemyHit(ev) {
      const p = enemyPt();
      const big = ev.dmg >= 5;
      const combat = window.cardships.game && window.cardships.game.combat;
      if (A().enemy) { A().enemy.flash = 1; if (combat) A().enemy.hpFrac = Math.max(0, ev.hp) / combat.enemy.max; }
      burst(p.x - p.r * 0.2, p.y, 10 + ev.dmg * 3, 'spark', { min: 80, max: 300, life: 0.6 });
      for (let i = 0; i < Math.min(8, 2 + ev.dmg); i++) parts.push({ kind: Math.random() < 0.5 ? 'bolt' : 'gear', x: p.x, y: p.y, vx: rand(-160, 160), vy: rand(-200, -60), g: 500, life: 1, max: 1, r: rand(2.5, 4.5), rot: 0, vr: rand(-12, 12), color: '#8d9399' });
      smokePuff(p.x, p.y, 4);
      const ex = p.x - p.r * 0.2 + rand(-14, 14), ey = p.y + rand(-12, 12);
      if (lastFire === 'tesla') { sprite(ex, ey, ['zap_crack', 'zap_blue', 'zap_white'], 64, 0.4, { add: true }); sprite(ex, ey, 'bolt_chain', 90, 0.2, { add: true, rot: rand(-0.6, 0.6) }); }
      if (lastFire === 'flamethrower') sprite(ex, ey + 6, ['napalm', 'fire_sticky'], 46, 0.7, { grow: 0.1 });
      if (lastFire === 'gatling') { sprite(ex, ey, 'glue_spray', 44, 0.6, { grow: 0.2 }); sprite(ex + 6, ey + 4, 'glue_glob', 30, 0.8, { vy: 18, grow: 0 }); }
      explosion(ex, ey, 46 + ev.dmg * 8, big);
      if (big) smokeCloud(ex, ey - 10, 70, 'black');
      lastFire = null;
      numberAt(p.x + rand(-20, 20), p.y - p.r * 0.6, `-${ev.dmg}`, ev.pierce ? '#bfe6ff' : '#ffd6a0', 18 + Math.min(16, ev.dmg * 3));
      shake(3 + ev.dmg * 1.6);
      if (big) { hitStop(110); flash(0.25); }
      sfx(big ? 'bigHit' : 'hit');
      return big ? 340 : 220;
    },
    enemyBlocked(ev) {
      const p = enemyPt();
      ring(p.x - p.r * 0.4, p.y, 'rgba(240,207,132,0.95)', 10, p.r * 0.9, 0.4, 5);
      burst(p.x - p.r * 0.4, p.y, 10, 'spark', { dir: Math.PI, spread: 1.2, min: 120, max: 320, life: 0.4 });
      numberAt(p.x - p.r * 0.4, p.y - p.r * 0.5, 'BLOCKED', '#f0cf84', 16);
      sfx('clang');
      return 240;
    },
    enemyAct(ev) {
      if (A().enemy) A().enemy.recoil = 1;
      return ['block', 'repair', 'charge'].includes(ev.intent.kind) ? 120 : 60;
    },
    enemyBlock() { const p = enemyPt(); ring(p.x, p.y, 'rgba(147,166,179,0.9)', p.r * 0.4, p.r * 1.1, 0.5, 6); sfx('clang'); return 320; },
    enemyHeal() { const p = enemyPt(); for (let i = 0; i < 6; i++) parts.push({ kind: 'wrench', x: p.x + rand(-p.r * 0.5, p.r * 0.5), y: p.y, vx: rand(-30, 30), vy: rand(-90, -40), g: 60, life: 0.9, max: 0.9, rot: 0, vr: rand(-12, 12) }); ring(p.x, p.y, 'rgba(120,220,140,0.9)', 10, p.r, 0.5, 5); sfx('ratchet'); return 300; },
    enemyShot(ev) {
      // The eclipse blood beam: a thick red lance from her prow to its deck.
      if (ev.beam) {
        const from = enemyPt();
        const t = [];
        for (const e of lookahead) { if (e.type === 'enemyShot' || e.type === 'intent') break; if (['hit', 'block'].includes(e.type) && !t.includes(e.uid)) t.push(e.uid); }
        const to = playerPt(t[0] || 'core');
        for (let i = 0; i < 5; i++) setTimeout(() => shoot({ x: from.x - from.r * 0.6, y: from.y }, { x: to.x + rand(-6, 6), y: to.y + rand(-6, 6) }, 'lightning', 0.14), i * 30);
        ring(from.x, from.y, 'rgba(255,40,50,0.95)', 10, from.r * 1.3, 0.5, 8);
        flash(0.5); shake(22); hitStop(160);
        sfx('bigHit', { enemy: true });
        return 520;
      }
      // Crimson Tide: blood threads drawn out of every module and into her.
      if (ev.drain) {
        const to = enemyPt();
        A().player.mods.forEach((m, uid) => { const p = playerPt(uid); for (let i = 0; i < 3; i++) setTimeout(() => burst(p.x, p.y, 4, 'drip', { min: 20, max: 60, g: 0, life: 0.5, rmin: 2, rmax: 3, color: '#d0101e' }), i * 60); setTimeout(() => shoot({ x: p.x, y: p.y }, to, 'enemyTracer', 0.4), 200); });
        sfx('splat', { enemy: true });
        return 520;
      }
      // Runes flare over every module they strike; the Grand Convergence floods the whole ship.
      if (ev.rune || ev.grand) {
        const targets = [];
        for (const e of lookahead) { if (e.type === 'enemyShot' || e.type === 'intent') break; if (['hit', 'block'].includes(e.type) && !targets.includes(e.uid)) targets.push(e.uid); }
        for (const uid of targets) { const p = playerPt(uid); ring(p.x, p.y, ev.grand ? 'rgba(200,160,255,0.95)' : 'rgba(160,255,230,0.95)', 30, 6, 0.5, 4); strip(p.x, p.y, 'magic-purple', ev.grand ? 90 : 64, 0.5, { add: true }); }
        if (ev.grand) { flash(0.6); shake(18); hitStop(140); }
        lastBolt = true;
        sfx(ev.grand ? 'bigHit' : 'spell', { enemy: true });
        return ev.grand ? 520 : 360;
      }
      lastBolt = !!ev.lightning;
      const from = enemyPt();
      const targets = [];
      for (const e of lookahead) { if (e.type === 'enemyShot' || e.type === 'roll' || e.type === 'intent') break; if (['hit', 'block', 'token'].includes(e.type) && !targets.includes(e.uid)) targets.push(e.uid); }
      if (!targets.length) targets.push(nextTarget() || 'core');
      const style = ev.lightning ? 'lightning' : ev.token === 'fire' ? 'firepot' : ev.token === 'glue' ? 'tar' : ev.token === 'gas' ? 'gas' : ev.rake ? 'enemyTracer' : 'shell';
      targets.forEach((uid, i) => { const to = playerPt(uid); setTimeout(() => shoot({ x: from.x - from.r * 0.7, y: from.y + 6 }, { x: to.x, y: to.y - 4 }, style, ev.lightning ? 0.16 : 0.32, style === 'shell' ? 24 : 0), i * 70); });
      burst(from.x - from.r * 0.7, from.y + 6, 6, 'spark', { dir: Math.PI, spread: 0.5, life: 0.3 });
      sfx(ev.lightning ? 'zap' : 'cannon', { enemy: true });
      return (ev.lightning ? 160 : 320) + (targets.length - 1) * 70;
    },
    hit(ev) {
      const p = playerPt(ev.uid);
      A().player.flash(ev.uid);
      const m = A().player.mods.get(ev.uid);
      if (m) m.hp = ev.hp;
      if (ev.uid === 'core') A().player.coreHp = ev.hp;
      burst(p.x, p.y, 8 + ev.dmg * 3, 'spark', { min: 60, max: 240, life: 0.5 });
      if (lastBolt) { sprite(p.x, p.y, ['zap_crack', 'zap_white'], 52, 0.4, { add: true }); lastBolt = false; }
      for (let i = 0; i < Math.min(6, ev.dmg + 1); i++) parts.push({ kind: 'bolt', x: p.x, y: p.y, vx: rand(-140, 140), vy: rand(-180, -40), g: 520, life: 0.9, max: 0.9, rot: 0, vr: rand(-14, 14) });
      if (ev.src !== 'fire') explosion(p.x + rand(-8, 8), p.y + rand(-8, 4), 34 + ev.dmg * 7, ev.dmg >= 4);
      numberAt(p.x, p.y - 30, `-${ev.dmg}`, ev.uid === 'core' ? '#ff8f7a' : '#ffd6a0', 17 + Math.min(14, ev.dmg * 3));
      shake(3 + ev.dmg * 2);
      if (ev.src === 'fire') { burst(p.x, p.y - 6, 10, 'flame', { up: 60, min: 10, max: 60, g: -60, life: 0.5, rmin: 4, rmax: 8 }); sfx('crackle'); }
      else sfx(ev.dmg >= 4 ? 'bigHit' : 'hit');
      if (ev.dmg >= 4) { hitStop(100); flash(0.2); }
      return ev.src === 'fire' ? 200 : 230;
    },
    block(ev) {
      const p = playerPt(ev.uid);
      ring(p.x, p.y, 'rgba(240,207,132,0.95)', 8, 40, 0.4, 5);
      burst(p.x + 10, p.y - 6, 12, 'spark', { dir: -Math.PI / 4, spread: 0.8, min: 140, max: 320, life: 0.4 });
      numberAt(p.x, p.y - 30, 'DEFLECTED', '#f0cf84', 14);
      sfx('clang');
      return 240;
    },
    destroyed(ev) {
      if (!ev.violent) { A().player.breakOff(ev.uid, false); return 0; }
      const p = playerPt(ev.uid);
      A().player.breakOff(ev.uid, true);
      ring(p.x, p.y, 'rgba(255,200,90,0.95)', 6, 70, 0.45, 8);
      burst(p.x, p.y, 30, 'spark', { min: 100, max: 380, life: 0.8 });
      burst(p.x, p.y, 16, 'flame', { min: 20, max: 140, g: -40, life: 0.6, rmin: 6, rmax: 12 });
      for (let i = 0; i < 8; i++) parts.push({ kind: 'gear', x: p.x, y: p.y, vx: rand(-220, 220), vy: rand(-260, -60), g: 480, life: 1.6, max: 1.6, r: rand(3, 7), rot: 0, vr: rand(-12, 12), color: Math.random() < 0.5 ? '#d4a24c' : '#8d9399' });
      smokePuff(p.x, p.y, 10);
      explosion(p.x, p.y, 110, true);
      smokeCloud(p.x, p.y - 20, 90, 'black', { life: 1.8 });
      shake(14); hitStop(130); flash(0.3);
      sfx('explode');
      return 420;
    },
    token(ev) {
      const p = playerPt(ev.uid);
      if (ev.token === 'fire') { sprite(p.x, p.y - 8, ['napalm', 'sticky_fire', 'fire_sticky'], 44, 0.7, { grow: 0.15 }); burst(p.x, p.y - 4, 10, 'flame', { min: 20, max: 120, g: -60, life: 0.6, rmin: 4, rmax: 9 }); }
      if (ev.token === 'glue') { sprite(p.x, p.y - 4, 'glue_spray', 40, 0.6, { grow: 0.2 }); burst(p.x, p.y, 10, 'drip', { min: 40, max: 160, g: 300, life: 0.7, rmin: 2, rmax: 4 }); }
      if (ev.token === 'bleed') { burst(p.x, p.y, 10, 'drip', { min: 40, max: 140, g: 300, life: 0.7, rmin: 2, rmax: 4, color: '#c8101e' }); ring(p.x, p.y, 'rgba(220,20,40,0.9)', 6, 26, 0.3, 4); }
      if (ev.token === 'gas') smokeCloud(p.x, p.y - 6, 60, 'green', { life: 1.4, vy: -8 });
      if (ev.token === 'gas') for (let i = 0; i < 8; i++) parts.push({ kind: 'gas', x: p.x + rand(-20, 20), y: p.y + rand(-12, 12), vx: rand(-30, 30), vy: rand(-20, 10), g: 0, life: 1.4, max: 1.4, r: rand(10, 16) });
      sfx(ev.token === 'fire' ? 'crackle' : 'splat');
      return 220;
    },
    burn(ev) { const p = playerPt(ev.uid); sprite(p.x, p.y - 10, 'sticky_fire', 34, 0.6, { grow: 0.2 }); burst(p.x, p.y - 8, 12, 'flame', { up: 80, min: 10, max: 60, g: -80, life: 0.5, rmin: 4, rmax: 9 }); ring(p.x, p.y, 'rgba(255,140,60,0.9)', 6, 30, 0.3, 4); return 120; },
    enemyBurn() { const p = enemyPt(); sprite(p.x, p.y - 4, ['fire_big_3', 'fire_big_1'], 70, 0.6, { grow: 0.2 }); burst(p.x, p.y, 18, 'flame', { up: 90, min: 10, max: 80, g: -80, life: 0.6, rmin: 6, rmax: 11 }); sfx('crackle'); return 200; },
    heal(ev) {
      const p = playerPt(ev.uid);
      const m = A().player.mods.get(ev.uid);
      if (m) m.hp = ev.hp;
      ring(p.x, p.y, 'rgba(120,230,150,0.9)', 6, 40, 0.5, 5);
      parts.push({ kind: 'wrench', x: p.x, y: p.y - 20, vx: 0, vy: -30, g: 0, life: 0.8, max: 0.8, rot: 0, vr: 10 });
      for (let i = 0; i < 4; i++) parts.push({ kind: 'cog', x: p.x + rand(-14, 14), y: p.y, vx: rand(-30, 30), vy: rand(-80, -40), g: 60, life: 0.8, max: 0.8, r: 3, rot: 0, vr: rand(-8, 8) });
      numberAt(p.x, p.y - 30, `+${ev.amount}`, '#9ff0b4', 17);
      sfx('ratchet');
      return 220;
    },
    cleanse(ev) { const p = playerPt(ev.uid); sprite(p.x, p.y - 14, 'splash', 60, 0.6, { grow: 0.15 }); burst(p.x, p.y - 10, 18, 'water', { up: 60, min: 40, max: 160, g: 400, life: 0.6, rmin: 1.5, rmax: 3 }); sfx('hiss'); return 200; },
    brace(ev) { const p = playerPt(ev.uid); strip(p.x, p.y, 'shield-up', 110, 0.6, { add: true, alpha: 0.8 }); ring(p.x, p.y, 'rgba(240,207,132,0.9)', 10, 46, 0.5, 4); sfx('clank'); return 200; },
    evadeReady() { A().player.dodge = 1; sfx('whoosh'); return 200; },
    evade() {
      const from = enemyPt(); const c = playerPt('core');
      shoot({ x: from.x - from.r * 0.7, y: from.y }, { x: -40, y: c.y - 70 }, 'shell', 0.5, 10);
      numberAt(c.x, c.y - 70, 'MISS', '#d7ecff', 22);
      sfx('whoosh');
      return 380;
    },
    ram(ev) {
      const P = A().player, E = A().enemy;
      P.lunge = 1; if (E) E.lunge = 1;
      if (Scene()) Scene().jolt(ev.player ? 0.8 : 1.3);
      const mid = { x: (playerPt('core').x + enemyPt().x) / 2, y: (playerPt('core').y + enemyPt().y) / 2 };
      setTimeout(() => {
        burst(mid.x, mid.y, 40, 'spark', { min: 120, max: 420, life: 0.8 });
        sprite(mid.x, mid.y, 'spark_star', 110, 0.4, { grow: 0.6, add: true });
        for (let i = 0; i < 12; i++) parts.push({ kind: Math.random() < 0.5 ? 'gear' : 'bolt', x: mid.x, y: mid.y, vx: rand(-260, 260), vy: rand(-280, -40), g: 520, life: 1.4, max: 1.4, r: rand(3, 6), rot: 0, vr: rand(-14, 14), color: '#8d9399' });
        shake(22); hitStop(150); flash(0.35);
        sfx('ram');
      }, 180);
      return 520;
    },
    swap(ev) { sfx(ev.gale ? 'whoosh' : 'clank'); if (ev.gale) { const c = playerPt('core'); for (let i = 0; i < 20; i++) parts.push({ kind: 'smoke', x: c.x + rand(-200, 200), y: c.y + rand(-60, 30), vx: ev.zone === 'stern' ? -300 : 300, vy: rand(-20, 20), g: 0, life: 0.6, max: 0.6, r: rand(4, 9), color: 'rgba(220,230,240,' }); } return ev.gale ? 300 : 120; },
    phase(ev) {
      if (A().enemy) { A().enemy.phaseFlash = 1; A().enemy.phase = ev.index; }
      const p = enemyPt();
      flash(0.55); shake(16); hitStop(160);
      ring(p.x, p.y, 'rgba(255,90,50,0.95)', p.r * 0.5, p.r * 2.2, 0.8, 10);
      burst(p.x, p.y, 40, 'spark', { min: 100, max: 360, life: 1 });
      explosion(p.x, p.y, p.r * 2.2, true);
      phaseBanner = { text: ev.name, life: 1.8, max: 1.8 };
      sfx('alarm');
      if (window.CardshipsAudio) window.CardshipsAudio.bossPhase(ev.index);
      return 900;
    },
    snap() { const p = enemyPt(); burst(p.x, p.y, 30, 'spark', { min: 120, max: 360 }); for (let i = 0; i < 10; i++) parts.push({ kind: 'gear', x: p.x, y: p.y, vx: rand(-200, 200), vy: rand(-240, -60), g: 480, life: 1.4, max: 1.4, r: rand(3, 7), rot: 0, vr: rand(-12, 12), color: '#d4a24c' }); phaseBanner = { text: 'Mainspring snapped!', life: 1.4, max: 1.4 }; sfx('bigHit'); return 500; },
    install(ev) { return 0; },
    cogs(ev) {
      if (ev.amount <= 0) return 0;
      const from = A().enemy && A().enemy.sinking ? enemyPt() : playerPt('core');
      for (let i = 0; i < Math.min(24, ev.amount); i++) parts.push({ kind: 'cog', x: from.x, y: from.y, vx: rand(-160, 160), vy: rand(-320, -120), g: 420, life: 1.4, max: 1.4, r: rand(3.5, 6), rot: 0, vr: rand(-10, 10) });
      numberAt(from.x, from.y - 50, `+${ev.amount} cogs`, '#f0c24e', 18);
      sfx('coins');
      return 300;
    },
    victory() {
      const p = enemyPt();
      if (A().enemy) A().enemy.sinking = 0.001;
      for (let i = 0; i < 3; i++) setTimeout(() => { explosion(p.x + rand(-50, 50), p.y + rand(-30, 30), 120 + i * 30, true); smokeCloud(p.x + rand(-40, 40), p.y - 20, 110, 'black', { life: 2 }); ring(p.x + rand(-30, 30), p.y + rand(-20, 20), 'rgba(255,200,90,0.95)', 6, 80, 0.5, 8); burst(p.x + rand(-40, 40), p.y, 30, 'flame', { min: 40, max: 200, g: -30, life: 0.8, rmin: 6, rmax: 14 }); burst(p.x, p.y, 20, 'spark', { min: 100, max: 400 }); shake(12); sfx('explode'); }, i * 220);
      for (let i = 0; i < 30; i++) parts.push({ kind: 'cog', x: p.x, y: p.y, vx: rand(-220, 220), vy: rand(-380, -140), g: 420, life: 1.8, max: 1.8, r: rand(4, 7), rot: 0, vr: rand(-10, 10) });
      phaseBanner = { text: 'Victory!', life: 1.6, max: 1.6 };
      if (window.CardshipsAudio) window.CardshipsAudio.sting(window.cardships && window.cardships.game && window.cardships.game.phase === 'victory' ? 'victory' : 'spoils');
      return 1100;
    },
    defeat() {
      const P = A().player;
      const c = playerPt('core');
      for (const uid of [...P.mods.keys()]) P.breakOff(uid, true);
      P.dying = 0.001;
      ring(c.x, c.y, 'rgba(255,160,60,0.95)', 10, 120, 0.7, 10);
      burst(c.x, c.y, 60, 'spark', { min: 120, max: 460, life: 1.2 });
      explosion(c.x, c.y, 180, true);
      smokeCloud(c.x, c.y - 30, 150, 'black', { life: 2.2 });
      burst(c.x, c.y, 30, 'flame', { min: 40, max: 200, g: -30, life: 1, rmin: 8, rmax: 16 });
      shake(26); flash(0.5); hitStop(200);
      if (Scene()) Scene().jolt(1.5);
      phaseBanner = { text: 'Your ship is going down', life: 2, max: 2 };
      sfx('explode');
      if (window.CardshipsAudio) window.CardshipsAudio.sting('defeat');
      return 1600;
    },
  };

  let playing = null;
  // Plays events in order; calls done() when the sequence ends. Tap the flight view to skip ahead.
  function play(events, done) {
    lookahead = events.slice();
    const ctx = { skip: false };
    playing = ctx;
    document.body.classList.add('fx-busy');
    const step = () => {
      if (!lookahead.length || ctx.cancel) { playing = null; document.body.classList.remove('fx-busy'); done(); return; }
      const ev = lookahead.shift();
      const h = HANDLERS[ev.type];
      let wait = 0;
      try { wait = h ? h(ev, ctx) || 0 : 0; } catch (e) { console.error(e); }
      if (ctx.skip) wait = Math.min(wait, 30);
      setTimeout(step, wait);
    };
    step();
  }
  // ---------- the portal ----------
  // Beating an area's boss tears open a vortex where it fell. Flying in plays a short transit: the
  // ship is drawn into the swirl, the screen warps, and at the heart of it the next area takes over
  // (its sky crossfades in and its music with it), then the vortex closes behind the ship.
  // Colours by the area the portal leads to: arms, heart.
  const PORTAL_INK = {
    1: { arms: ['#7dffd8', '#b48cff', '#4fe0ff', '#ffe9a8'], heart: '#12062a', glow: '#9c7bff' },
    2: { arms: ['#ff5a4a', '#c0182a', '#ffb3a0', '#f0e2c8'], heart: '#1a0206', glow: '#ff3030' },
  };
  const PORTAL_T = 2.9, PORTAL_MID = 1.35;
  let portal = null; // the transit in progress: { to, t, onMid, onDone, midDone, sparks }
  let portalIdleT = 0;
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  // Your painted vortices, by destination (Area II aurora blue, Area III blood red).
  const PORTAL_ART = {};
  for (const [k, n] of [[1, 'aurora'], [2, 'blood']]) { if (typeof Image === 'undefined') break; const im = new Image(); im.src = `assets/art/fx/portal-${n}.png`; PORTAL_ART[k] = im; }
  function portalTo() { const g = window.cardships && window.cardships.game; return portal ? portal.to : g ? g.area + 1 : 1; }
  // Where the vortex sits: off the bow where the boss fell, then (after the crossing) mid-screen.
  function portalSpot(v) { return portal && portal.midDone ? { x: v.w * 0.5, y: v.h * 0.44 } : { x: v.w * 0.78, y: v.h * 0.42 }; }
  function vortex(g, x, y, r, spin, ink, alpha) {
    if (r < 2 || alpha <= 0) return;
    g.save();
    g.globalAlpha = alpha;
    const heart = g.createRadialGradient(x, y, 0, x, y, r);
    heart.addColorStop(0, ink.heart); heart.addColorStop(0.55, ink.heart + 'cc'); heart.addColorStop(1, ink.heart + '00');
    g.fillStyle = heart; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.globalCompositeOperation = 'lighter';
    g.shadowColor = ink.glow; g.shadowBlur = Math.min(30, r * 0.25);
    for (let a = 0; a < 7; a++) {
      g.strokeStyle = ink.arms[a % ink.arms.length];
      g.lineWidth = Math.max(1.5, r * (a % 2 ? 0.035 : 0.06));
      g.beginPath();
      for (let i = 0; i <= 48; i++) {
        const f = i / 48;
        const rr = r * (0.06 + 0.94 * f);
        const ang = spin * (a % 2 ? 1.15 : 1) + (a * TAU) / 7 + f * 3.6;
        const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * 0.86;
        if (i) g.lineTo(px, py); else g.moveTo(px, py);
      }
      g.stroke();
    }
    g.shadowBlur = 0;
    const core = g.createRadialGradient(x, y, 0, x, y, r * 0.22);
    core.addColorStop(0, '#ffffff'); core.addColorStop(1, ink.glow + '00');
    g.fillStyle = core; g.beginPath(); g.arc(x, y, r * 0.22, 0, TAU); g.fill();
    g.restore();
  }
  // Drawn behind the ships, so the ship flies into it.
  function drawPortal(g, v) {
    const game = window.cardships && window.cardships.game;
    const idle = !portal && game && game.phase === 'portal';
    if (!idle && !portal) { portalIdleT = 0; return; }
    const ink = PORTAL_INK[portalTo()] || PORTAL_INK[1];
    const at = portalSpot(v);
    const base = Math.min(v.w, v.h) * 0.2;
    let r = base, alpha = 1;
    if (idle) { portalIdleT += v.dt; r = base * ease(portalIdleT / 1.2) * (1 + Math.sin(v.t * 2) * 0.04); }
    else {
      const t = portal.t, big = Math.hypot(v.w, v.h) * 0.75;
      if (!portal.midDone) r = base + (big - base) * ease((t - 0.55) / (PORTAL_MID - 0.55));
      else { const k = (t - PORTAL_MID) / (PORTAL_T - PORTAL_MID); r = big * (1 - ease(k * 1.25)); alpha = 1 - ease((k - 0.6) / 0.4); }
    }
    vortex(g, at.x, at.y, r, v.t * (portal ? 5 : 2.2), ink, alpha);
    const art = PORTAL_ART[portalTo()];
    if (art && art.complete && art.naturalWidth && r > 4) {
      g.save(); g.globalAlpha = alpha * 0.92; g.translate(at.x, at.y); g.scale(1, 0.86); g.rotate(-v.t * (portal ? 3.2 : 1.1));
      g.drawImage(art, -r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
      g.restore();
    }
    // Sparks spiralling in.
    const S = portal ? portal.sparks : (drawPortal.sparks = drawPortal.sparks || []);
    while (S.length < (portal ? 60 : 26)) S.push({ a: rand(0, TAU), d: rand(0.8, 1.6), s: rand(0.5, 1.2), c: ink.arms[Math.floor(rand(0, ink.arms.length))] });
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of S) {
      p.a += v.dt * (3 + 2 / p.d) * p.s; p.d -= v.dt * 0.45 * p.s * (portal ? 2 : 1);
      if (p.d < 0.08) { p.d = rand(1, 1.6); p.a = rand(0, TAU); }
      const rr = Math.max(base, r) * p.d;
      g.fillStyle = p.c; g.globalAlpha = Math.min(1, p.d) * alpha;
      g.fillRect(at.x + Math.cos(p.a) * rr - 1.5, at.y + Math.sin(p.a) * rr * 0.86 - 1.5, 3, 3);
    }
    g.restore();
  }
  // Plays the transit; onMid is called at the heart of the vortex, onDone when it closes.
  function portalTransit(opts) {
    portal = { to: opts.to, t: 0, onMid: opts.onMid, onDone: opts.onDone, midDone: false, sparks: [] };
    sfx('whoosh');
    const s = Scene(); if (s) s.setMode('travel');
    let last = performance.now();
    const tick = (now) => {
      if (!portal) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      portal.t += dt;
      const sc = Scene();
      const v = sc ? { w: sc.w, h: sc.h } : { w: 800, h: 400 };
      const P = A();
      if (!portal.midDone) {
        const k = ease(portal.t / PORTAL_MID);
        if (P) P.portal = { k, at: portalSpot(v) };
        if (portal.t >= PORTAL_MID) {
          portal.midDone = true;
          flash(0.8); shake(8); sfx('bigHit');
          try { portal.onMid && portal.onMid(); } catch (e) { console.error(e); }
          if (sc) sc.setMode('travel');
        }
      } else {
        const k = (portal.t - PORTAL_MID) / (PORTAL_T - PORTAL_MID);
        if (P) P.portal = { k: 1 - ease(k * 1.1), at: portalSpot(v) };
        if (k >= 1) {
          if (P) P.portal = null;
          const done = portal.onDone;
          portal = null;
          drawPortal.sparks = [];
          try { done && done(); } catch (e) { console.error(e); }
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  // How hard the screen warps right now (0 to 1), peaking at the heart of the crossing.
  function portalWarp() {
    if (!portal) return 0;
    const t = portal.t;
    return t < PORTAL_MID ? ease((t - 0.3) / (PORTAL_MID - 0.3)) : 1 - ease((t - PORTAL_MID) / (PORTAL_T - PORTAL_MID - 0.4));
  }
  // The warp: the finished frame redrawn in wavering horizontal strips.
  let warpCanvas = null;
  function drawWarp(g, v) {
    const k = portalWarp() * (prefs.shake === 'off' ? 0.35 : 1);
    if (k < 0.02) return;
    const c = g.canvas;
    warpCanvas = warpCanvas || document.createElement('canvas');
    if (warpCanvas.width !== c.width || warpCanvas.height !== c.height) { warpCanvas.width = c.width; warpCanvas.height = c.height; }
    const wg = warpCanvas.getContext('2d');
    wg.clearRect(0, 0, c.width, c.height);
    wg.drawImage(c, 0, 0);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    const strips = 48, sh = Math.ceil(c.height / strips), amp = 26 * k * (c.width / Math.max(1, v.w));
    for (let i = 0; i < strips; i++) {
      const y = i * sh;
      const off = Math.sin(i * 0.45 + v.t * 9) * amp + Math.sin(i * 0.13 - v.t * 5) * amp * 0.5;
      g.drawImage(warpCanvas, 0, y, c.width, sh, off, y, c.width, sh);
    }
    const ink = PORTAL_INK[portalTo()] || PORTAL_INK[1];
    g.globalAlpha = 0.25 * k; g.fillStyle = ink.glow; g.fillRect(0, 0, c.width, c.height);
    g.restore();
  }

  function skip() { if (playing) playing.skip = true; }
  const ANIMATED = new Set(Object.keys(HANDLERS));
  function worthPlaying(events) { return events.some((e) => ANIMATED.has(e.type) && e.type !== 'install' && !(e.type === 'roll' && prefs.dice === 'off' && events.every((x) => x.type === 'roll'))); }

  window.CardshipsFX = { drawFx, drawOverlay, play, skip, worthPlaying, isPlaying: () => !!playing, prefs, savePrefs, burst, numberAt, portal: portalTransit, drawPortal, portalActive: () => !!portal };
})();
