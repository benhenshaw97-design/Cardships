// Side-on 2D pixel-art ships. Every ship is one whole ship from the ship sheet, painted at a low
// "art pixel" resolution and scaled up with crisp, unsmoothed pixels, so the ships and the effects
// share one pixel grid. Your modules are built in the Shipyard panel, not drawn on the hull: the
// flight view maps them to points along the ship so shots, hits and arrows land in the right place.
(function () {
  const SPR = () => window.CardshipsSprites;
  const TAU = Math.PI * 2;
  const INK = '#1d140e'; // the one outline colour every pixel sprite shares

  // ---------- pixel sprites ----------
  // ---------- pixel sprites ----------
  // A sheet frame shrunk to fit w x h art pixels: stepped down for clean detail, alpha hardened to
  // on/off, and ringed with a 1px ink outline, so pieces from every sheet look like one set. Cached.
  const cache = new Map();
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function pixelSprite(name, maxW, maxH, opts = {}) {
    const key = `${name}|${maxW}|${maxH}|${opts.flip ? 1 : 0}|${opts.tint || ''}|${opts.wash || ''}|${opts.balloon || ''}|${opts.outline === false ? 0 : 1}`;
    if (cache.has(key)) return cache.get(key);
    const sp = SPR();
    if (!sp || !sp.ready(name) || !sp.FRAMES[name]) return null;
    const [sx, sy, sw, sh, sheet] = sp.FRAMES[name];
    const img = sp.sheet(sheet || 0);
    const k = Math.min(maxW / sw, maxH / sh);
    const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
    // Halve in steps, then the last step to size: far cleaner than one big jump.
    let src = canvas(sw, sh);
    src.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    while (src.width / 2 > w * 1.3) {
      const nx = canvas(src.width / 2, src.height / 2);
      const ng = nx.getContext('2d'); ng.imageSmoothingQuality = 'high'; ng.drawImage(src, 0, 0, nx.width, nx.height);
      src = nx;
    }
    const pad = opts.outline === false ? 0 : 1;
    const base = canvas(w, h);
    const bg = base.getContext('2d');
    bg.imageSmoothingQuality = 'high';
    if (opts.flip) { bg.translate(w, 0); bg.scale(-1, 1); }
    bg.drawImage(src, 0, 0, w, h);
    // Harden soft edges by stacking the sprite on itself (no pixel reads, so it works from file://).
    const hard = canvas(w, h);
    const hg = hard.getContext('2d');
    for (let i = 0; i < 3; i++) hg.drawImage(base, 0, 0);
    if (opts.tint) { hg.globalCompositeOperation = 'source-in'; hg.fillStyle = opts.tint; hg.fillRect(0, 0, w, h); }
    // A colour wash over the sprite: the same ship in another livery.
    if (opts.wash) { hg.globalCompositeOperation = 'source-atop'; hg.fillStyle = opts.wash; hg.fillRect(0, 0, w, h); }
    // A balloon colour: the same wash over the top of the ship (the gasbag), fading out below it.
    if (opts.balloon) {
      const gr = hg.createLinearGradient(0, 0, 0, h * 0.62);
      gr.addColorStop(0, opts.balloon); gr.addColorStop(0.75, opts.balloon); gr.addColorStop(1, 'rgba(0,0,0,0)');
      hg.globalCompositeOperation = 'source-atop'; hg.fillStyle = gr; hg.fillRect(0, 0, w, h * 0.62);
    }
    const out = canvas(w + pad * 2, h + pad * 2);
    const og = out.getContext('2d');
    if (pad) {
      // The ink outline: the silhouette, nudged one pixel each way, under the sprite.
      const sil = canvas(w, h);
      const sg = sil.getContext('2d');
      sg.drawImage(hard, 0, 0); sg.drawImage(hard, 0, 0);
      sg.globalCompositeOperation = 'source-in'; sg.fillStyle = opts.tint || INK; sg.fillRect(0, 0, w, h);
      for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) og.drawImage(sil, dx, dy);
    }
    og.drawImage(hard, pad, pad);
    cache.set(key, out);
    return out;
  }
  // Draws a pixel sprite with its bottom centre at (x, bottom). Returns the sprite (or null).
  function stand(g, name, x, bottom, maxW, maxH, opts) {
    const c = pixelSprite(name, maxW, maxH, opts);
    if (c) g.drawImage(c, Math.round(x - c.width / 2), Math.round(bottom - c.height + 1));
    return c;
  }
  function px(g, x, y, w, h, color) { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  // A 1px line on the pixel grid.
  function pline(g, x0, y0, x1, y1, color) {
    g.fillStyle = color;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 600; n++) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // Blits an art canvas onto the screen at pixel scale P, unsmoothed.
  function blit(g, art, x, y, P) {
    g.save();
    g.imageSmoothingEnabled = false;
    g.drawImage(art, Math.round(x), Math.round(y), art.width * P, art.height * P);
    g.restore();
  }


  // ---------- the ships ----------
  // Ships from the keyed sheets (all drawn bow to the right): art width, and where the decks sit
  // as fractions of the sprite's height from the top (hull: the gondola's lower deck, where hull
  // modules and the Core are; upper: its upper deck).
  const HULLS = {
    k_airship: { w: 124, faces: 'R', hull: 0.82, upper: 0.66, span: 0.36 },
    k_zeppelin: { w: 150, faces: 'R', hull: 0.82, upper: 0.66, span: 0.4 },
    k_battleship: { w: 150, faces: 'R', hull: 0.82, upper: 0.62, span: 0.4 },
    k_clockwork: { w: 128, faces: 'R', hull: 0.84, upper: 0.7, span: 0.36 },
    k_cutter: { w: 120, faces: 'R', hull: 0.6, upper: 0.45, span: 0.36 },
    k_skiff: { w: 112, faces: 'R', hull: 0.75, upper: 0.6, span: 0.34 },
    k_gunship: { w: 140, faces: 'R', hull: 0.82, upper: 0.64, span: 0.38 },
    k_bomber: { w: 136, faces: 'R', hull: 0.8, upper: 0.66, span: 0.36 },
    k_sentinel: { w: 112, faces: 'R', hull: 0.7, upper: 0.4, span: 0.36 },
    k_flagship: { w: 166, faces: 'R', hull: 0.82, upper: 0.66, span: 0.4 },
    k_monitor: { w: 160, faces: 'R', hull: 0.78, upper: 0.5, span: 0.4 },
    k_leviathan: { w: 196, faces: 'R', hull: 0.7, upper: 0.45, span: 0.4 },
    k_stormqueen: { w: 196, faces: 'R', hull: 0.74, upper: 0.58, span: 0.38 },
    k_colossus: { w: 186, faces: 'R', hull: 0.72, upper: 0.42, span: 0.4 },
    k_privateer: { w: 128, faces: 'R', hull: 0.8, upper: 0.62, span: 0.36 },
    k_tempest: { w: 132, faces: 'R', hull: 0.8, upper: 0.62, span: 0.36 },
    k_kite: { w: 104, faces: 'R', hull: 0.86, upper: 0.74, span: 0.32 },
    k_comet: { w: 128, faces: 'R', hull: 0.62, upper: 0.46, span: 0.36 },
    k_ironside: { w: 146, faces: 'R', hull: 0.78, upper: 0.48, span: 0.4 },
    k_blacksail: { w: 150, faces: 'R', hull: 0.82, upper: 0.62, span: 0.4 },
    k_cranegalleon: { w: 150, faces: 'R', hull: 0.84, upper: 0.66, span: 0.4 },
    k_harlequin: { w: 136, faces: 'R', hull: 0.82, upper: 0.66, span: 0.36 },
    k_twinclock: { w: 128, faces: 'R', hull: 0.82, upper: 0.68, span: 0.36 },
    k_gearwheel: { w: 140, faces: 'R', hull: 0.8, upper: 0.64, span: 0.38 },
    k_patchwork: { w: 146, faces: 'R', hull: 0.84, upper: 0.66, span: 0.4 },
    k_sailraider: { w: 140, faces: 'R', hull: 0.82, upper: 0.64, span: 0.38 },
    k_crystal: { w: 128, faces: 'R', hull: 0.84, upper: 0.62, span: 0.36 },
    k_starpagoda: { w: 132, faces: 'R', hull: 0.82, upper: 0.6, span: 0.36 },
    // Area 2.
    k_wisp: { w: 104, faces: 'R', hull: 0.86, upper: 0.7, span: 0.32 },
    k_corvette: { w: 140, faces: 'R', hull: 0.82, upper: 0.62, span: 0.36 },
    k_barge: { w: 170, faces: 'R', hull: 0.8, upper: 0.6, span: 0.4 },
    k_mirage: { w: 150, faces: 'R', hull: 0.8, upper: 0.6, span: 0.38 },
    k_archon: { w: 210, faces: 'R', hull: 0.8, upper: 0.6, span: 0.4 },
    // Area 3.
    k_bats: { w: 170, faces: 'R', hull: 0.74, upper: 0.52, span: 0.38 },
    k_wraith: { w: 140, faces: 'R', hull: 0.84, upper: 0.66, span: 0.36 },
    k_bonegalleon: { w: 160, faces: 'R', hull: 0.82, upper: 0.62, span: 0.4 },
    k_cultist: { w: 160, faces: 'R', hull: 0.82, upper: 0.62, span: 0.4 },
    k_sovereign: { w: 220, faces: 'R', hull: 0.8, upper: 0.55, span: 0.4 },
    // The Workshop's Cores.
    k_arcanist: { w: 136, faces: 'R', hull: 0.82, upper: 0.66, span: 0.36 },
    k_arcanist2: { w: 140, faces: 'R', hull: 0.8, upper: 0.62, span: 0.38 },
    k_arcanist3: { w: 140, faces: 'R', hull: 0.82, upper: 0.62, span: 0.38 },
    k_sanguine: { w: 136, faces: 'R', hull: 0.82, upper: 0.66, span: 0.36 },
    k_sanguine2: { w: 140, faces: 'R', hull: 0.82, upper: 0.66, span: 0.38 },
    k_sanguine3: { w: 140, faces: 'R', hull: 0.82, upper: 0.66, span: 0.38 },
    k_eclipse: { w: 136, faces: 'R', hull: 0.8, upper: 0.6, span: 0.36 },
    k_eclipse2: { w: 140, faces: 'R', hull: 0.8, upper: 0.6, span: 0.36 },
    k_eclipse3: { w: 140, faces: 'R', hull: 0.82, upper: 0.62, span: 0.38 },
    // Elite hulls.
    k_e_cutter: { w: 150, faces: 'R', hull: 0.82, upper: 0.6, span: 0.38 },
    k_e_skiff: { w: 150, faces: 'R', hull: 0.82, upper: 0.6, span: 0.38 },
    k_e_gunship: { w: 160, faces: 'R', hull: 0.82, upper: 0.6, span: 0.38 },
    k_e_bomber: { w: 150, faces: 'R', hull: 0.82, upper: 0.6, span: 0.38 },
    k_e_sentinel: { w: 160, faces: 'R', hull: 0.82, upper: 0.6, span: 0.38 },
    k_e_bonegalleon: { w: 170, faces: 'R', hull: 0.82, upper: 0.6, span: 0.4 },
    k_e_cultist: { w: 170, faces: 'R', hull: 0.82, upper: 0.6, span: 0.4 },
    // The fourth ship of each first-six Core.
    k_skylark: { w: 136, faces: 'R', hull: 0.82, upper: 0.62, span: 0.36 },
    k_cargodread: { w: 150, faces: 'R', hull: 0.8, upper: 0.58, span: 0.4 },
    k_greywhale: { w: 150, faces: 'R', hull: 0.82, upper: 0.62, span: 0.38 },
    k_steamcrane: { w: 140, faces: 'R', hull: 0.82, upper: 0.6, span: 0.38 },
    k_scrapper: { w: 140, faces: 'R', hull: 0.82, upper: 0.6, span: 0.38 },
    k_tealswift: { w: 136, faces: 'R', hull: 0.82, upper: 0.62, span: 0.36 },
  };
  // Your ship is the one you picked (data SHIPS); it grows a little with every module you bolt on.
  const shipSprite = (game) => { const D = window.CardshipsData; const sh = D.SHIPS[game.ship] || D.SHIPS[window.CardshipsEngine.Game.defaultShip(game.core.id)]; return sh.sprite; };
  // Every pirate and boss has a ship of its own.
  const ENEMIES = {
    cutter: { hull: 'k_cutter' },
    skiff: { hull: 'k_skiff' },
    gunship: { hull: 'k_gunship' },
    bomber: { hull: 'k_bomber' },
    sentinel: { hull: 'k_sentinel' },
    flagship: { hull: 'k_flagship' },
    monitor: { hull: 'k_monitor' },
    leviathan: { hull: 'k_leviathan' },
    stormqueen: { hull: 'k_stormqueen', storm: true },
    colossus: { hull: 'k_colossus' },
    // Area 2: ships of living light, washed in the aurora.
    wisp: { hull: 'k_wisp', wash: 'rgba(120,255,220,0.22)', light: '#8fffe0', flicker: true },
    corvette: { hull: 'k_corvette', wash: 'rgba(170,120,255,0.2)', light: '#c9a2ff' },
    barge: { hull: 'k_barge', wash: 'rgba(90,230,255,0.18)', light: '#9ff0ff', crystals: true },
    mirage: { hull: 'k_mirage', wash: 'rgba(200,180,255,0.24)', light: '#e2d4ff' },
    archon: { hull: 'k_archon', wash: 'rgba(110,255,210,0.26)', light: '#a8ffe8', ribbons: true },
    // Area 3: gothic hulks under the Blood Moon, rimmed in red moonlight.
    bats: { hull: 'k_bats', rim: '#ffe2d0', flutter: true },
    wraith: { hull: 'k_wraith', wash: 'rgba(160,190,200,0.3)', rim: '#cfe8ff', ghost: true },
    bonegalleon: { hull: 'k_bonegalleon', wash: 'rgba(230,215,180,0.22)', rim: '#ff5a4a' },
    cultist: { hull: 'k_cultist', wash: 'rgba(150,0,20,0.3)', rim: '#ff2a3a', light: '#ff3040' },
    sovereign: { hull: 'k_sovereign', wash: 'rgba(110,0,16,0.3)', rim: '#ff2a2a', light: '#ff2030' },
    // Elite versions (a lair's guardian): grander hulls from your pirate sheet.
    cutter_elite: { hull: 'k_e_cutter' }, skiff_elite: { hull: 'k_e_skiff' }, gunship_elite: { hull: 'k_e_gunship' },
    bomber_elite: { hull: 'k_e_bomber' }, sentinel_elite: { hull: 'k_e_sentinel' },
    bonegalleon_elite: { hull: 'k_e_bonegalleon', wash: 'rgba(230,215,180,0.18)', rim: '#ff5a4a' },
    cultist_elite: { hull: 'k_e_cultist', wash: 'rgba(150,0,20,0.25)', rim: '#ff2a3a', light: '#ff3040' },
  };

  // Draws a ship sprite with its bottom centre at (0, 0) into an art context, its bow to the right
  // (player) or the left (enemy); returns its size.
  function paintShip(a, spec, w, bowRight, extra = {}) {
    const H = HULLS[spec.hull];
    const flip = (H.faces === 'R') !== bowRight;
    const c = pixelSprite(spec.hull, w, w, { flip, wash: spec.wash || extra.wash, balloon: spec.balloon });
    if (!c) return null;
    a.drawImage(c, Math.round(-c.width / 2), -c.height);
    if (extra.tint && extra.tintAlpha > 0) {
      const t = pixelSprite(spec.hull, w, w, { flip, tint: extra.tint });
      a.save(); a.globalAlpha = extra.tintAlpha; a.drawImage(t, Math.round(-t.width / 2), -t.height); a.restore();
    }
    return { w: c.width, h: c.height };
  }
  // Fire and smoke puffs, as pixel squares.
  function paintPuffs(a, list) {
    for (const p of list) {
      const r = Math.max(1, Math.round(p.r));
      const al = Math.min(1, p.life / p.max);
      px(a, p.x - r, p.y - r, r * 2, r * 2, p.fire ? `rgba(255,130,50,${al * 0.75})` : p.steam ? `rgba(255,255,255,${al * 0.5})` : `rgba(40,34,30,${al * 0.6})`);
    }
  }

  // ---------- the player's ship ----------
  class PlayerShip {
    constructor() {
      this.mods = new Map();
      this.smoke = [];
      this.bits = [];
      this.core = { flash: 0 };
      this.highlight = new Set();
      this.targets = new Map();
      this.inserts = [];
      this.hits = [];
      this.x = 0; this.y = 0; this.P = 2;
      this.art = canvas(1, 1);
      this.size = { w: 120, h: 90 };
      this.count = 0;
    }
    // The Workshop's livery: hull paint and balloon colour (window.CardshipsShipArt.livery).
    spec() { const L = api.livery || {}; return { hull: HULLS[this.sprite] ? this.sprite : 'k_airship', wash: L.paint || undefined, balloon: L.balloon || undefined }; }
    artWidth() { return HULLS[this.spec().hull].w + Math.min(8, this.count) * 5; }
    sync(game) {
      this.coreId = game.core.id;
      this.sprite = shipSprite(game);
      this.coreHp = game.core.hp; this.coreMax = game.maxHp(game.core);
      const seen = new Set();
      for (const card of game.cards()) {
        const loc = game.locate(card.uid);
        seen.add(card.uid);
        const m = this.mods.get(card.uid) || { uid: card.uid, flash: 0, smokeT: Math.random() };
        Object.assign(m, { id: card.id, row: loc.row, col: loc.col, hp: card.hp, max: game.maxHp(card), tokens: { ...card.tokens }, fire: card.tokens.fire, legendary: (window.CardshipsData.PARTS[card.id] || {}).rarity === 'legendary' });
        this.mods.set(card.uid, m);
      }
      for (const uid of [...this.mods.keys()]) if (!seen.has(uid)) this.mods.delete(uid);
      this.count = this.mods.size;
    }
    // Where a module sits on the sprite, in art pixels from the bottom centre: its column along
    // the ship, its deck up the side.
    spot(row, col) {
      const H = HULLS[this.spec().hull];
      const { w, h } = this.size;
      return { x: (col / 3.4) * w * H.span * 1.15, y: -h * (1 - (row ? H.upper : H.hull)) };
    }
    breakOff(uid, violent = true) {
      const m = this.mods.get(uid);
      if (!m) return;
      this.mods.delete(uid);
      if (!violent) return;
      const s = this.spot(m.row, m.col);
      for (let i = 0; i < 10; i++) this.bits.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 120, vy: -30 - Math.random() * 80, life: 1.8, color: Math.random() < 0.5 ? '#d4a24c' : '#8d9399' });
    }
    flash(uid) { if (uid === 'core') this.core.flash = 1; else { const m = this.mods.get(uid); if (m) m.flash = 1; this.core.flash = Math.max(this.core.flash, 0.6); } }
    recoil() {}
    extent() { const w = this.artWidth(); return { left: w / 2 + 6, right: w / 2 + 6 }; }
    width() { return this.artWidth() + 12; }
    bounds() { return { top: this.size.h + 18, bottom: 8 }; }
    // Screen position of a module (or the Core), for effects and arrows.
    pointOf(uid) {
      const P = this.P;
      let s;
      if (uid === 'core') s = this.spot(0, 0);
      else { const m = this.mods.get(uid); if (!m) return null; s = this.spot(m.row, m.col); }
      return { x: this.x + s.x * P, y: this.y + s.y * P, r: 12 * P };
    }
    update(dt) {
      for (const m of this.mods.values()) {
        m.flash = Math.max(0, m.flash - dt * 4);
        if (m.hp / m.max <= 0.34 || m.fire) {
          m.smokeT -= dt;
          if (m.smokeT <= 0) {
            m.smokeT = m.fire ? 0.1 : 0.3;
            const s = this.spot(m.row, m.col);
            this.smoke.push({ x: s.x + (Math.random() - 0.5) * 8, y: s.y - 4, vx: -8 - Math.random() * 10, vy: -14 - Math.random() * 10, r: 1.5, life: 1.5, max: 1.5, fire: m.fire && Math.random() < 0.6 });
          }
        }
      }
      if (this.coreHp / this.coreMax <= 0.34) {
        this.coreSmokeT = (this.coreSmokeT || 0) - dt;
        if (this.coreSmokeT <= 0) { this.coreSmokeT = 0.15; const s = this.spot(0, 0); this.smoke.push({ x: s.x, y: s.y - 6, vx: -10, vy: -18, r: 2, life: 1.8, max: 1.8, fire: Math.random() < 0.3 }); }
      }
      this.core.flash = Math.max(0, this.core.flash - dt * 4);
      this.lunge = Math.max(0, (this.lunge || 0) - dt * 2.2);
      this.dodge = Math.max(0, (this.dodge || 0) - dt * 1.8);
      if (this.dying > 0) this.dying += dt;
      for (const p of this.smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 2.5; p.life -= dt; }
      this.smoke = this.smoke.filter((p) => p.life > 0);
      for (const b of this.bits) { b.vy += 220 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
      this.bits = this.bits.filter((b) => b.life > 0);
    }
    // Draws the ship with the bottom of its hull at (x, y), at P screen pixels per art pixel.
    draw(g, x, y, P, t, opts = {}) {
      if (this.lunge > 0) x += Math.sin((1 - this.lunge) * Math.PI) * 18 * P;
      if (this.dodge > 0) y -= Math.sin((1 - this.dodge) * Math.PI) * 14 * P;
      let fall = 0;
      if (this.dying > 0) { y += this.dying * this.dying * 160; x -= this.dying * 20; fall = this.dying * 0.35; }
      this.x = x; this.y = y; this.P = P;
      const w = this.artWidth();
      const W = w + 60, H = Math.ceil(w * 1.1) + 40;
      if (this.art.width !== W || this.art.height !== H) { this.art.width = W; this.art.height = H; }
      const a = this.art.getContext('2d');
      a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, W, H);
      a.imageSmoothingEnabled = false;
      a.translate(W / 2, H - 10);
      const size = paintShip(a, this.spec(), w, true, { tint: '#ffffff', tintAlpha: this.core.flash * 0.75 });
      if (size) this.size = size;
      paintPuffs(a, this.smoke);
      for (const b of this.bits) px(a, b.x, b.y, 2, 2, b.color);
      g.save();
      if (fall) { g.translate(x, y); g.rotate(fall); g.translate(-x, -y); }
      blit(g, this.art, x - (W / 2) * P, y - (H - 10) * P, P);
      g.restore();
      this.hits = [{ uid: 'core', x, y: y - (this.size.h / 2) * P, r: (this.size.w / 2) * P }];
      // Legendaries glow where they sit: a breathing golden aura with motes circling it.
      for (const m of this.mods.values()) if (m.legendary) { const p = this.pointOf(m.uid); if (p) legendGlow(g, p.x, p.y, 15 * P, t, m.uid); }
      // Targets the telegraphed intent will hit: pulsing brackets with the damage.
      for (const [uid, dmg] of this.targets) {
        const p = this.pointOf(uid);
        if (p) drawTarget(g, p.x, p.y, 11 * P, t, dmg);
      }
      for (const uid of this.highlight) {
        const p = this.pointOf(uid);
        if (p) { g.strokeStyle = '#f0cf84'; g.lineWidth = 2.5; g.strokeRect(p.x - 10 * P, p.y - 10 * P, 20 * P, 20 * P); }
      }
    }
    hitTest(px0, py0) {
      const h = this.hits[0];
      return h && Math.hypot(px0 - h.x, py0 - h.y) < h.r ? { uid: 'core' } : null;
    }
  }
  // '#rrggbb' with an alpha, as rgba().
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, a)})`; }
  function legendGlow(g, x, y, r, t, seed) {
    const k = 0.75 + Math.sin(t * 2.4) * 0.25;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const rg = g.createRadialGradient(x, y, 0, x, y, r * 1.6);
    rg.addColorStop(0, `rgba(255,214,110,${0.55 * k})`); rg.addColorStop(0.5, `rgba(255,170,50,${0.22 * k})`); rg.addColorStop(1, 'rgba(255,150,40,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, r * 1.6, 0, TAU); g.fill();
    const off = seed ? seed.length * 1.7 : 0;
    for (let i = 0; i < 4; i++) {
      const a = t * 1.8 + off + (i * TAU) / 4;
      const sx = x + Math.cos(a) * r * 1.15, sy = y + Math.sin(a) * r * 0.55;
      g.fillStyle = `rgba(255,236,170,${0.6 + 0.4 * Math.sin(t * 5 + i)})`;
      g.fillRect(Math.round(sx) - 2, Math.round(sy) - 2, 4, 4);
    }
    g.restore();
  }
  function drawTarget(g, x, y, r, t, dmg) {
    const p = r + 2 + Math.sin(t * 6) * 2;
    const L = r * 0.6;
    g.save();
    g.strokeStyle = '#ff5b3a'; g.lineWidth = 2.5;
    g.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.moveTo(x + sx * p, y + sy * (p - L)); g.lineTo(x + sx * p, y + sy * p); g.lineTo(x + sx * (p - L), y + sy * p); }
    g.stroke();
    if (dmg !== true) {
      const label = dmg > 0 ? `-${dmg}` : String(dmg);
      g.font = '700 12px "IBM Plex Mono", monospace'; g.textAlign = 'center';
      g.lineWidth = 3; g.strokeStyle = INK; g.strokeText(label, x, y - p - 4); g.fillStyle = '#ffd0c4'; g.fillText(label, x, y - p - 4);
    }
    g.restore();
  }

  // ---------- enemy ships ----------
  class EnemyShip {
    constructor(look) {
      this.look = look; this.flash = 0; this.recoil = 0; this.phase = 0; this.phaseFlash = 0; this.smoke = []; this.wound = 0;
      this.x = 0; this.y = 0; this.P = 2; this.sinking = 0;
      this.spec = ENEMIES[look] || ENEMIES[String(look).replace(/_elite$/, '')] || ENEMIES.cutter;
      this.artW = HULLS[this.spec.hull].w;
      this.halfW = this.artW / 2;
      this.size = { w: this.artW, h: this.artW * 0.7 };
      this.art = canvas(1, 1);
    }
    update(dt) {
      this.flash = Math.max(0, this.flash - dt * 4);
      this.recoil = Math.max(0, this.recoil - dt * 3);
      this.lunge = Math.max(0, (this.lunge || 0) - dt * 2.2);
      this.phaseFlash = Math.max(0, this.phaseFlash - dt * 1.2);
      if (this.sinking > 0) this.sinking += dt;
      const frac = this.hpFrac ?? 1;
      this.smokeT = (this.smokeT || 0) - dt;
      if (frac < 0.5 && this.smokeT <= 0) { this.smokeT = frac < 0.25 ? 0.08 : 0.2; this.smoke.push({ x: (Math.random() - 0.5) * this.size.w * 0.6, y: -this.size.h * 0.35, vx: 12 + Math.random() * 12, vy: -18, r: 2, life: 1.6, max: 1.6, fire: frac < 0.25 && Math.random() < 0.4 }); }
      for (const p of this.smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 3; p.life -= dt; }
      this.smoke = this.smoke.filter((p) => p.life > 0);
    }
    // Draws the ship with the bottom of its hull at (x, y), at P screen pixels per art pixel.
    draw(g, x, y, P, t) {
      this.x = x; this.y = y; this.P = P;
      const W = this.artW + 60, H = Math.ceil(this.artW * 1.1) + 40;
      if (this.art.width !== W || this.art.height !== H) { this.art.width = W; this.art.height = H; }
      const a = this.art.getContext('2d');
      a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, W, H);
      a.imageSmoothingEnabled = false;
      a.translate(W / 2, H - 10);
      if (this.phaseFlash > 0) { a.fillStyle = `rgba(255,80,40,${this.phaseFlash * 0.35})`; a.beginPath(); a.arc(0, -this.size.h / 2, this.size.w * 0.55, 0, TAU); a.fill(); }
      const size = paintShip(a, this.spec, this.artW, false, { tint: '#ffffff', tintAlpha: this.flash * 0.85 });
      if (size) { this.size = size; this.halfW = size.w / 2; }
      // Boss dressing: fires as it breaks up, the Storm Queen's crackling lightning.
      const fires = this.look === 'leviathan' || this.look === 'colossus' ? this.phase : this.hpFrac < 0.3 ? 1 : 0;
      for (const [fx, fy] of [[-0.2, 0.3], [0.15, 0.25], [0.3, 0.45]].slice(0, fires ? fires + 1 : 0)) {
        const f = Math.round(Math.sin(t * 12 + fx * 9) * 2), X = fx * this.size.w, Y = -fy * this.size.h;
        px(a, X - 3, Y - 7 + f, 6, 8 - f, this.phase >= 2 ? '#ff4a2a' : '#ff9a3a'); px(a, X - 1, Y - 3, 3, 4, '#ffd25e');
      }
      // Area 2's spell-ships: crystal spikes grow on the Barge with its Armor.
      if (this.spec.crystals) for (let i = 0; i < Math.min(4, this.armor || 0); i++) {
        const X = Math.round((-0.3 + i * 0.2) * this.size.w), Y = Math.round(-this.size.h * (0.18 + (i % 2) * 0.12));
        px(a, X - 2, Y - 9, 4, 9, '#bff6ff'); px(a, X - 1, Y - 12, 2, 3, '#ffffff'); px(a, X + 2, Y - 6, 3, 6, '#7fd8f0');
      }
      if (this.spec.storm && Math.sin(t * (6 + this.phase * 3)) > 0.2) {
        let xx = -this.size.w * 0.3, yy = -this.size.h * 0.95;
        for (let i = 0; i < 10; i++) { const nx = xx + this.size.w * 0.06, ny = yy + (i % 2 ? 4 : -3); pline(a, xx, yy, nx, ny, '#bfe6ff'); xx = nx; yy = ny; }
      }
      paintPuffs(a, this.smoke);
      const sink = this.sinking;
      g.save();
      if (this.lunge > 0) x -= Math.sin((1 - this.lunge) * Math.PI) * 18 * P;
      g.translate(x + sink * 30, y + sink * sink * 80);
      g.rotate(-sink * 0.4);
      let alpha = Math.max(0, 1 - sink * 0.35) * (this.spec.flicker ? 0.8 + Math.sin(t * 9) * 0.15 : 1);
      // The Wraith Clipper is barely there while it is out of phase.
      if (this.spec.ghost) alpha *= this.phased ? 0.32 + Math.sin(t * 5) * 0.08 : 0.85;
      if (this.spec.flutter && !sink) g.translate(0, Math.sin(t * 7) * 2 * P);
      // Illusions: ghost copies of the ship hover around it, and only one is real.
      if (this.wardKind === 'illusion' && this.ward > 0 && !sink) {
        for (let i = 0; i < Math.min(3, this.ward); i++) {
          const dx = (i % 2 ? 1 : -1) * (40 + i * 26) * P * 0.5, dy = (i === 1 ? -1 : 1) * (22 + i * 10) * P * 0.5;
          g.globalAlpha = 0.28 + Math.sin(t * 3 + i * 2) * 0.08;
          blit(g, this.art, -(W / 2) * P + dx + Math.sin(t * 1.3 + i) * 6, -(H - 10) * P + dy, P);
        }
      }
      // Spell-ships glow with their own light.
      if (this.spec.light && !sink) {
        g.save(); g.globalCompositeOperation = 'lighter';
        const r = this.size.w * 0.6 * P, cy = -this.size.h * 0.5 * P;
        const rg = g.createRadialGradient(0, cy, 0, 0, cy, r);
        rg.addColorStop(0, hexA(this.spec.light, 0.22 + Math.sin(t * 2) * 0.05)); rg.addColorStop(1, hexA(this.spec.light, 0));
        g.fillStyle = rg; g.beginPath(); g.ellipse(0, cy, r, r * 0.7, 0, 0, TAU); g.fill();
        g.restore();
      }
      // Blood Moon ships are rimmed in red moonlight from behind.
      if (this.spec.rim && !sink) {
        g.save(); g.globalAlpha = alpha * 0.55; g.filter = 'blur(3px)';
        g.globalCompositeOperation = 'lighter';
        blit(g, this.rimArt(), -(W / 2) * P + 3 * P, -(H - 10) * P - 2 * P, P);
        g.restore();
      }
      g.globalAlpha = alpha;
      blit(g, this.art, -(W / 2) * P, -(H - 10) * P, P);
      g.globalAlpha = 1;
      if (!sink) this.drawWards(g, P, t);
      if (!sink && this.bleed > 0) this.drawBleed(g, P, t);
      g.restore();
    }
    // A red silhouette of the ship, used as its moonlit rim.
    rimArt() {
      if (!this.rimC || this.rimC.width !== this.art.width) { this.rimC = canvas(this.art.width, this.art.height); this.rimC.getContext('2d').imageSmoothingEnabled = false; }
      const r = this.rimC.getContext('2d');
      r.globalCompositeOperation = 'source-over'; r.clearRect(0, 0, this.rimC.width, this.rimC.height);
      r.drawImage(this.art, 0, 0);
      r.globalCompositeOperation = 'source-in'; r.fillStyle = this.spec.rim; r.fillRect(0, 0, this.rimC.width, this.rimC.height);
      return this.rimC;
    }
    // Bleed on the enemy: red drops falling from its hull.
    drawBleed(g, P, t) {
      const n = Math.min(6, this.bleed);
      for (let i = 0; i < n; i++) {
        const k = (t * 0.8 + i / n) % 1;
        const x = (-0.3 + (i / Math.max(1, n - 1)) * 0.6) * this.size.w * P, y = -this.size.h * 0.2 * P + k * 40 * P;
        g.fillStyle = `rgba(200,10,24,${1 - k})`;
        g.beginPath(); g.ellipse(x, y, 2 * P * 0.6, 3.5 * P * 0.6, 0, 0, TAU); g.fill();
      }
    }
    // Wards as a shimmering hex shell (one ring per Ward); the Archon's focus crystals orbit it.
    drawWards(g, P, t) {
      const n = this.ward || 0;
      if (!n || this.wardKind === 'illusion') return;
      const cx = 0, cy = -this.size.h * 0.5 * P, rx = this.size.w * 0.58 * P, ry = this.size.h * 0.62 * P;
      g.save();
      if (this.wardKind === 'bats') {
        // Summoned bats wheel around her: each one takes a hit.
        for (let i = 0; i < n; i++) {
          const a = -t * 1.6 + (i * TAU) / n;
          const x = cx + Math.cos(a) * rx * 0.95, y = cy + Math.sin(a) * ry * 0.55;
          const s = 3.2 * P * 0.6, up = Math.sin(t * 16 + i) * 5 * s;
          g.fillStyle = '#12060a'; g.strokeStyle = 'rgba(255,60,60,0.7)'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - 6 * s, y - 2 * s - up, x - 12 * s, y - up); g.lineTo(x - 6 * s, y + 2 * s); g.lineTo(x, y + 3 * s);
          g.lineTo(x + 6 * s, y + 2 * s); g.lineTo(x + 12 * s, y - up); g.quadraticCurveTo(x + 6 * s, y - 2 * s - up, x, y); g.fill(); g.stroke();
          g.fillStyle = '#ff3030'; g.fillRect(x - 1.5, y, 1.2, 1.2); g.fillRect(x + 0.5, y, 1.2, 1.2);
        }
        g.restore();
        return;
      }
      if (this.wardKind === 'crystal') {
        for (let i = 0; i < n; i++) {
          const a = t * 0.9 + (i * TAU) / n;
          const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry * 0.6;
          const s = 7 * P * 0.6 + Math.sin(t * 4 + i) * 1.5;
          g.fillStyle = 'rgba(190,255,240,0.9)'; g.strokeStyle = INK; g.lineWidth = 2;
          g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x + s, y); g.lineTo(x, y + s * 1.6); g.lineTo(x - s, y); g.closePath(); g.fill(); g.stroke();
          g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(120,255,220,0.35)'; g.beginPath(); g.arc(x, y, s * 2.4, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over';
        }
      } else {
        const col = this.wardKind === 'glimmer' ? '170,255,230' : '200,170,255';
        for (let i = 0; i < n; i++) {
          const k = 1 + i * 0.09;
          g.strokeStyle = `rgba(${col},${0.55 - i * 0.12 + Math.sin(t * 4 + i) * 0.1})`; g.lineWidth = 2.5;
          g.beginPath();
          for (let j = 0; j <= 6; j++) { const a = (j * TAU) / 6 + t * 0.3 * (i % 2 ? -1 : 1); const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k; if (j) g.lineTo(x, y); else g.moveTo(x, y); }
          g.stroke();
        }
        g.fillStyle = `rgba(${col},0.07)`; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fill();
      }
      g.restore();
    }
    pointOf() { return { x: this.x, y: this.y - this.size.h * 0.45 * this.P, r: this.halfW * this.P }; }
    hitTest(x, y) { return Math.abs(x - this.x) < this.halfW * this.P && y < this.y && y > this.y - this.size.h * this.P; }
  }

  // Your ship's sprite, and whether it must be mirrored to point its bow right (for the map marker).
  const playerSprite = (game) => { const name = shipSprite(game); return { name, flip: HULLS[name].faces !== 'R' }; };
  // A ship picture for the ship picker, fitted into w x h, crisp.
  function thumb(name, w, h, livery = null) {
    const c = canvas(w, h);
    c.className = 'ship-thumb';
    c.setAttribute('aria-hidden', 'true');
    const paint = (tries) => {
      const sp = SPR();
      const f = sp && sp.FRAMES[name];
      if (f && sp.ready(name)) {
        const k = Math.min(w / f[2], h / f[3]);
        const g = c.getContext('2d');
        g.clearRect(0, 0, w, h);
        const dx = (w - f[2] * k) / 2, dy = (h - f[3] * k) / 2;
        g.drawImage(sp.sheet(f[4] || 0), f[0], f[1], f[2], f[3], dx, dy, f[2] * k, f[3] * k);
        if (livery && (livery.paint || livery.balloon)) {
          g.save(); g.globalCompositeOperation = 'source-atop';
          if (livery.paint) { g.fillStyle = livery.paint; g.fillRect(0, 0, w, h); }
          if (livery.balloon) { const gr = g.createLinearGradient(0, dy, 0, dy + f[3] * k * 0.62); gr.addColorStop(0, livery.balloon); gr.addColorStop(0.75, livery.balloon); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, dy, w, f[3] * k * 0.62); }
          g.restore();
        }
      } else if (tries > 0) setTimeout(() => paint(tries - 1), 250);
    };
    paint(20);
    return c;
  }

  const api = { PlayerShip, EnemyShip, playerSprite, thumb, livery: null };
  window.CardshipsShipArt = api;
})();
