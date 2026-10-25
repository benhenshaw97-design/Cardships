// Side-on 2D pixel-art ships. Every ship is painted at a low "art pixel" resolution and scaled up
// with crisp, unsmoothed pixels, so the sprite sheets, the drawn hulls and the effects all share one
// pixel grid. The player's ship is a cutaway on the two-deck grid: hull bays run out from the Core
// toward the stern (left) and the bow (right), and upper-deck modules stand on top. Enemies use the
// full ships from the ship sheet, or are assembled from the same hulls and parts.
(function () {
  const SPR = () => window.CardshipsSprites;
  const TAU = Math.PI * 2;
  const C = {
    out: '#24170f', brass: '#d4a24c', brassD: '#9c7230', brassL: '#f0cf84', copper: '#c0693a', copperD: '#8a4526',
    iron: '#666b70', ironD: '#43474c', ironL: '#8d9399', wood: '#8a5a35', woodD: '#5e3b22', canvas: '#eadfc4', canvasD: '#c3b08b',
    glass: '#ffe7a6', red: '#b8402c', redD: '#7c2619', green: '#62ad74', teal: '#4f9a8f', blue: '#5d8fb8', violet: '#8c6bb5', soot: '#2c241f',
  };
  const INK = '#1d140e'; // the one outline colour every pixel sprite shares

  // ---------- grid geometry, in art pixels ----------
  // y = 0 is the deck line. Hull bays hang below it, upper modules stand on it.
  const CELL = 32;      // width of one column
  const CORE_CELL = 36; // the Core's column
  const HULL_H = 30;    // hull row (the bays)
  const KEEL = 10;      // hull below the bays
  const UPPER_H = 28;   // upper-deck module height
  const BOW_X = 16, STERN_X = 8; // how far the prow and the transom reach past the last column
  function colX(col) { return col ? Math.sign(col) * (CORE_CELL / 2 + (Math.abs(col) - 0.5) * CELL) : 0; }
  // Centre of a slot.
  function slotXY(row, col) { return { x: colX(col), y: row ? -UPPER_H / 2 - 1 : HULL_H / 2 }; }
  // Where an install bolt sits: on the seam it would open (hull inserts), or in the empty slot.
  function boltXY(p) {
    if (p.row === 0 && p.insert) return { x: colX(p.col) - Math.sign(p.col) * CELL / 2, y: HULL_H / 2 };
    return slotXY(p.row, p.col);
  }

  // ---------- pixel sprites ----------
  // A sheet frame shrunk to fit w x h art pixels: stepped down for clean detail, alpha hardened to
  // on/off, and ringed with a 1px ink outline, so pieces from every sheet look like one set. Cached.
  const cache = new Map();
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function pixelSprite(name, maxW, maxH, opts = {}) {
    const key = `${name}|${maxW}|${maxH}|${opts.flip ? 1 : 0}|${opts.tint || ''}|${opts.outline === false ? 0 : 1}`;
    if (cache.has(key)) return cache.get(key);
    const sp = SPR();
    if (!sp || !sp.ready(name) || !sp.FRAMES[name]) return null;
    const [sx, sy, sw, sh, sheet] = sp.FRAMES[name];
    const img = sp.sheets[sheet || 0];
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

  // ---------- hulls ----------
  // Palettes: plank base, dark, light, deck trim, bay interior.
  const HULLS = {
    wood: { base: '#8a5a35', dark: '#5e3b22', light: '#b07a48', trim: '#d4a24c', bay: '#2a1c12', keel: '#4a2e1b' },
    iron: { base: '#5f666d', dark: '#3c4147', light: '#8a9299', trim: '#b8402c', bay: '#1f2226', keel: '#7c2619' },
    trim: { base: '#c9b48a', dark: '#8f7a55', light: '#e6d6ae', trim: '#4f7fae', bay: '#2b2418', keel: '#3d5f86' },
    copper: { base: '#a8603a', dark: '#6e3a20', light: '#d08a58', trim: '#f0cf84', bay: '#26160e', keel: '#5a2e18' },
    dark: { base: '#3a3f55', dark: '#262a3a', light: '#5f6d9a', trim: '#9fe0ff', bay: '#14161f', keel: '#1c1f2c' },
  };
  // The hull profile, scanline by scanline, from the transom (L) to the prow (R) at the deck line.
  // bays: column centres that get an open cutaway bay. Facing right; mirror the context for enemies.
  function paintHull(g, L, R, pal, bays = [], opts = {}) {
    const bottom = HULL_H + KEEL;
    const edges = [];
    for (let y = 0; y <= bottom; y++) {
      const k = Math.max(0, y - HULL_H) / KEEL;
      const left = L + y * 0.18 + k * k * 10;
      const right = R + BOW_X - 2 - y * 0.32 - k * k * 14;
      edges.push([Math.round(left), Math.round(right)]);
      const plank = y > 2 && y % 5 === 0;
      const color = y <= 1 ? pal.trim : y >= bottom - 2 ? pal.keel : plank ? pal.dark : y === 2 ? pal.light : pal.base;
      px(g, left, y, right - left + 1, 1, color);
    }
    // Ink outline down both ends and along the keel.
    for (let y = 0; y <= bottom; y++) { const [l, r] = edges[y]; px(g, l - 1, y, 1, 1, INK); px(g, r + 1, y, 1, 1, INK); }
    { const [l, r] = edges[bottom]; px(g, l - 1, bottom + 1, r - l + 3, 1, INK); }
    px(g, edges[0][0] - 1, -1, edges[0][1] - edges[0][0] + 3, 1, INK);
    // Rivets along the waterline.
    for (let x = L + 4; x < R + BOW_X - 10; x += 6) px(g, x, HULL_H + 3, 1, 1, pal.light);
    // Bays: dark cutaway compartments with a lit back wall and a beam.
    for (const cx of bays) {
      const w = (opts.core === cx ? CORE_CELL : CELL) - 4;
      px(g, cx - w / 2 - 1, 3, w + 2, HULL_H - 4, INK);
      px(g, cx - w / 2, 4, w, HULL_H - 6, pal.bay);
      px(g, cx - w / 2, 4, w, 1, pal.dark);
      px(g, cx - w / 2, HULL_H - 4, w, 2, pal.dark);
    }
    // A ram spur at the prow.
    px(g, R + BOW_X - 6, HULL_H - 5, 9, 3, C.ironD);
    px(g, R + BOW_X + 3, HULL_H - 4, 2, 1, C.ironL);
    return edges;
  }
  // A rail along the deck line.
  function paintRail(g, L, R, color) {
    px(g, L, -6, R - L, 1, color);
    for (let x = L; x <= R; x += 6) px(g, x, -6, 1, 6, color);
  }
  // A spinning propeller seen from the side: the blade sweeps up and down.
  function paintProp(g, x, y, len, t, speed = 18) {
    const k = Math.abs(Math.sin(t * speed));
    px(g, x - 1, y - len * k, 2, Math.max(1, len * 2 * k), '#4a4e54');
    px(g, x - 1, y - len, 2, len * 2, 'rgba(140,146,152,0.25)');
    px(g, x - 2, y - 2, 4, 4, C.brass);
    px(g, x - 2, y - 2, 4, 1, C.brassL);
  }
  // Side-on gas envelopes, painted column by column: a cigar with a blunt nose (+x), a tapered
  // tail with fins, gore seams, a shaded belly and a pattern of its own.
  const ENVELOPES = {
    cream: { base: '#e2d6ae', shade: '#ad9f78', light: '#f6edd0', seam: '#c4b48a' },
    stripes: { base: '#e2d6ae', shade: '#ad9f78', light: '#f6edd0', seam: '#c4b48a', band: '#b0402e', bandShade: '#7c2a1f', every: 16 },
    green: { base: '#e2d6ae', shade: '#ad9f78', light: '#f6edd0', seam: '#c4b48a', band: '#3f8a58', bandShade: '#2b6340', rings: [0.3, 0.62] },
    blue: { base: '#5d82b6', shade: '#3c5a88', light: '#8fb0de', seam: '#4c6d9e', emblem: '#f2ead6' },
    net: { base: '#d39a62', shade: '#97653a', light: '#f0c08a', seam: '#b07c48', net: '#6e4220' },
    patched: { base: '#b3a27e', shade: '#7f714f', light: '#d6c7a0', seam: '#94845f', patches: true },
    olive: { base: '#7b8c74', shade: '#56654f', light: '#a3b39a', seam: '#66765e' },
    storm: { base: '#2d3346', shade: '#1d2130', light: '#5f6d9a', seam: '#3a4260', bolt: '#9fe0ff' },
  };
  function paintEnvelope(g, cx, cy, w, h, style, t) {
    const S = ENVELOPES[style] || ENVELOPES.cream;
    cx = Math.round(cx); cy = Math.round(cy);
    const x0 = Math.round(cx - w / 2), x1 = Math.round(cx + w / 2);
    const half = (x) => { const k = (x - cx) / (w / 2); const e = k < 0 ? 1.6 : 2.6; return (h / 2) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(k)), e))); };
    // Tail fins, behind the bag.
    // Tail fins, behind the bag: they rise from its tapering skin.
    if (w > 40) {
      const fx = x0 + Math.round(w * 0.04), fl = Math.round(w * 0.12), fh = Math.round(h * 0.32);
      for (let i = 0; i <= fl; i++) {
        const x = fx + i, hh = Math.round(half(x)), len = Math.round(fh * (1 - i / fl)) + 1;
        px(g, x, cy - hh - len, 1, len + 1, S.shade); px(g, x, cy - hh - len - 1, 1, 1, INK);
        px(g, x, cy + hh, 1, len, S.shade); px(g, x, cy + hh + len, 1, 1, INK);
      }
      px(g, fx - 1, cy - Math.round(half(fx)) - fh - 2, 1, fh * 2 + Math.round(half(fx)) * 2 + 3, INK);
    }
    for (let x = x0; x <= x1; x++) {
      const hh = Math.round(half(x));
      if (hh <= 0) continue;
      const top = cy - hh, bot = cy + hh;
      const span = bot - top;
      const rel = x - x0;
      const band = (S.every && rel % S.every >= S.every - 5) || (S.rings && S.rings.some((r) => Math.abs(rel / w - r) < 0.035));
      px(g, x, top, 1, span, band ? S.band : S.base);
      px(g, x, top + Math.round(span * 0.64), 1, Math.ceil(span * 0.36), band ? S.bandShade : S.shade);
      if (span > 4) px(g, x, top + 1, 1, 2, S.light);
      if (rel % 11 === 0 && span > 6) px(g, x, top + 3, 1, span - 5, S.seam);
      px(g, x, top - 1, 1, 1, INK); px(g, x, bot, 1, 1, INK);
    }
    for (const [x, edge] of [[x0 - 1, x0], [x1 + 1, x1]]) { const hh = Math.round(half(edge)); if (hh > 0) px(g, x, cy - hh, 1, hh * 2, INK); }
    if (S.net) for (let x = x0 + 4; x < x1 - 3; x += 5) { const hh = Math.round(half(x)); for (let d = -hh + 2; d < hh - 1; d += 3) px(g, x + (Math.abs(d / 3) % 2 ? 2 : 0), cy + d, 1, 1, S.net); }
    if (S.patches) { px(g, cx - w * 0.22, cy - 3, 6, 5, '#7d6046'); px(g, cx + w * 0.15, cy + 1, 5, 4, '#6a5a44'); }
    if (S.emblem) { px(g, cx - 1, cy - 5, 3, 10, S.emblem); px(g, cx - 5, cy - 1, 11, 3, S.emblem); }
    if (S.bolt && Math.sin(t * 5) > 0) { let xx = cx - w * 0.3, yy = cy - 2; for (let i = 0; i < 8; i++) { const nx = xx + 5, ny = cy - 2 + (i % 2 ? 3 : -2); pline(g, xx, yy, nx, ny, S.bolt); xx = nx; yy = ny; } }
  }
  // One long envelope over a span, on rigging lines down to the rail. Returns where it sits.
  function paintBalloons(g, L, R, style, bottomY, t) {
    const span = R - L;
    const w = Math.max(70, Math.round(span * 0.96)), h = Math.round(Math.max(24, Math.min(42, w * 0.21)));
    const cx = Math.round((L + R) / 2), cy = Math.round(bottomY - h / 2);
    const n = Math.max(2, Math.round(span / 34));
    for (let i = 0; i <= n; i++) { const x = L + 8 + ((span - 14) * i) / n; pline(g, x, -6, x + (cx - x) * 0.14, cy + h * 0.36, 'rgba(36,23,15,0.85)'); }
    paintEnvelope(g, cx, cy, w, h, style, t);
    return { top: cy - h / 2, x0: cx - w / 2, cx, w, h };
  }

  // ---------- modules ----------
  // Which sheet piece stands in for each module. Tesla Coil and Lightning Rod are painted by hand.
  const MODULE_ART = {
    harpoon: 'gun_steel', cannon: 'cannon_carriage', mortar: 'gun_brass', flamethrower: 'gun_copper', gatling: 'gatling_a',
    grenadiers: 'rocket_rack', sniper: 'autogun_shield', plating: 'panel_iron', bulwark: 'plate_b', deflector: 'fin_a',
    repair: 'gears_a', quarters: 'wheel', boiler: 'boiler_tank', sprinkler: 'boiler_cart', scrubber: 'motor_a', telescope: 'spyglass',
    gasbag: 'balloon_red', propeller: 'motor_b', cargo: 'crate_wood', hatch: 'chest_ornate', autoloader: 'ammo_box', gyro: 'compass',
    heart: 'engine_ornate', overpressure: 'boiler_gauges',
  };
  const WEAPONS = new Set(['harpoon', 'cannon', 'mortar', 'flamethrower', 'gatling', 'grenadiers', 'sniper', 'tesla']);
  // Paints a module standing on (x, bottom) inside a box of w x h art pixels.
  function paintModule(g, m, x, bottom, w, h, t, opts = {}) {
    const kick = WEAPONS.has(m.id) ? -Math.round((m.recoil || 0) * 3) : 0;
    const tint = opts.tint;
    if (m.id === 'tesla') return paintTesla(g, x, bottom, h, t, m, tint);
    if (m.id === 'lightningrod') return paintRod(g, x, bottom, h, tint);
    let sp;
    if (m.id === 'plating' || m.id === 'bulwark') sp = stand(g, MODULE_ART[m.id], x, bottom, w + 2, m.id === 'bulwark' ? h + 2 : h - 2, { tint });
    else if (m.id === 'gasbag') {
      const bob = Math.round(Math.sin(t * 1.3 + hash(m.uid) * 6));
      pline(g, x - 4, bottom, x - 6, bottom - h * 0.45, INK); pline(g, x + 4, bottom, x + 6, bottom - h * 0.45, INK);
      if (tint) { px(g, x - w / 2 + 2, bottom - h + bob, w - 4, h * 0.55, tint); return true; }
      paintEnvelope(g, x, bottom - h * 0.72 + bob, w - 2, h * 0.5, 'patched', t);
      return true;
    } else if (m.id === 'propeller') {
      sp = stand(g, 'motor_b', x + 3, bottom, w * 0.7, h * 0.6, { tint });
      if (!tint) paintProp(g, x - w / 2 + 1, bottom - h * 0.3, h * 0.38, t);
    } else if (m.id === 'cargo') {
      stand(g, 'chest_wood', x - 4, bottom, w * 0.7, h * 0.7, { tint });
      sp = stand(g, 'crate_wood', x + 7, bottom, w * 0.45, h * 0.5, { tint });
    } else if (m.id === 'scrubber') {
      sp = stand(g, 'motor_a', x, bottom, w, h * 0.8, { tint });
      if (sp && !tint) { const a = t * 6; px(g, x + Math.cos(a) * 3, bottom - h * 0.4 + Math.sin(a) * 3, 2, 2, C.ironL); }
    } else sp = stand(g, MODULE_ART[m.id], x + kick, bottom, w, h, { tint });
    return sp;
  }
  function paintTesla(g, x, bottom, h, t, m, tint) {
    const col = (c) => tint || c;
    px(g, x - 7, bottom - 3, 14, 4, col(C.ironD)); px(g, x - 7, bottom - 3, 14, 1, col(C.ironL));
    const top = bottom - h + 6;
    px(g, x - 2, top, 4, bottom - top - 3, col(C.ironD));
    for (let y = bottom - 6; y > top + 2; y -= 3) { px(g, x - 5, y, 10, 2, col(C.copper)); px(g, x - 5, y, 10, 1, col('#e08a50')); }
    px(g, x - 4, top - 5, 8, 6, col(INK)); px(g, x - 3, top - 4, 6, 4, col(C.brassL));
    if (!tint && (Math.sin(t * 9) > 0.3 || (m && m.recoil > 0.1))) {
      let yy = top - 2, xx = x;
      for (let i = 0; i < 4; i++) { const nx = xx + Math.round((Math.random() - 0.5) * 8), ny = yy - 3; pline(g, xx, yy, nx, ny, '#bfe6ff'); xx = nx; yy = ny; }
    }
    return true;
  }
  function paintRod(g, x, bottom, h, tint) {
    const col = (c) => tint || c;
    px(g, x - 6, bottom - 3, 12, 4, col(C.ironD)); px(g, x - 6, bottom - 3, 12, 1, col(C.ironL));
    const top = bottom - h - 4;
    px(g, x - 1, top, 3, bottom - top - 3, col(INK)); px(g, x, top, 1, bottom - top - 3, col(C.copper));
    for (const y of [bottom - 9, bottom - 16]) { px(g, x - 3, y, 7, 2, col(C.copper)); px(g, x - 3, y, 7, 1, col('#e08a50')); }
    px(g, x - 2, top - 3, 5, 4, col(C.brassL));
    return true;
  }
  // Damage shows as cracks and scorch pixels over the module.
  function paintWear(g, m, x, bottom, w, h) {
    const frac = m.hp / m.max;
    if (frac > 0.67) return;
    const h0 = hash(m.uid);
    const pts = frac <= 0.34 ? 7 : 3;
    for (let i = 0; i < pts; i++) {
      const a = hash(m.uid + i);
      px(g, x - w / 2 + 3 + a * (w - 6), bottom - 3 - ((h0 * 7 + i * 5) % (h - 5)), 2, 1, 'rgba(20,12,8,0.85)');
    }
    if (frac <= 0.34) pline(g, x - 3 + h0 * 6, bottom - h + 4, x + 2, bottom - 4, 'rgba(20,12,8,0.8)');
  }
  // Token badges in pixels; the effects layer adds the flames, goo and gas clouds.
  function paintTokens(g, tok, x, top, t) {
    if (!tok) return;
    if (tok.fire) { const f = Math.round(Math.sin(t * 18) * 1.5); px(g, x - 7, top - 5 + f, 4, 6 - f, '#ff7a2f'); px(g, x - 6, top - 2, 2, 3, '#ffd25e'); }
    if (tok.glue) { px(g, x - 6, top, 12, 2, '#9fd05a'); px(g, x + 3, top + 2 + ((t * 12) % 6), 2, 2, '#9fd05a'); }
    if (tok.gas) for (let i = 0; i < 3; i++) px(g, x + Math.cos(t * 1.5 + i * 2) * 8 - 2, top - 4 + Math.sin(t * 1.5 + i * 2) * 3, 4, 3, 'rgba(170,140,220,0.7)');
  }

  // ---------- the Core ----------
  const CORE_LOOK = {
    airship: { hull: 'wood', balloon: 'green', accent: C.green },
    battleship: { hull: 'iron', balloon: 'stripes', accent: C.red },
    zeppelin: { hull: 'trim', balloon: 'blue', accent: C.blue },
    clockwork: { hull: 'copper', balloon: 'net', accent: C.brass },
  };
  // A riveted boiler with a glowing firebox and a pressure gauge, filling the Core's bay.
  function paintCore(g, id, t, low, tint) {
    const look = CORE_LOOK[id] || CORE_LOOK.airship;
    const col = (c) => tint || c;
    const w = CORE_CELL - 8, top = 6, bot = HULL_H - 4;
    px(g, -w / 2 - 1, top - 1, w + 2, bot - top + 2, col(INK));
    px(g, -w / 2, top, w, bot - top, col(id === 'battleship' ? C.ironD : id === 'clockwork' ? C.copperD : C.iron));
    px(g, -w / 2, top, w, 2, col(id === 'battleship' ? C.ironL : id === 'clockwork' ? C.copper : C.ironL));
    px(g, -w / 2, bot - 3, w, 3, col(look.accent));
    for (let x = -w / 2 + 2; x < w / 2 - 1; x += 4) { px(g, x, top + 3, 1, 1, col(C.brassL)); px(g, x, bot - 5, 1, 1, col(C.brassL)); }
    // Firebox.
    const flick = 0.5 + Math.sin(t * 9) * 0.25 + Math.sin(t * 23) * 0.15;
    px(g, -w / 2 + 3, top + 6, 10, 8, col(INK));
    px(g, -w / 2 + 4, top + 7, 8, 6, col(low ? `rgb(255,${Math.round(60 + flick * 40)},40)` : `rgb(255,${Math.round(130 + flick * 70)},50)`));
    px(g, -w / 2 + 5, top + 9, 6, 1, col('#ffe7a6'));
    // Gauge.
    px(g, w / 2 - 11, top + 5, 8, 8, col(INK)); px(g, w / 2 - 10, top + 6, 6, 6, col('#f4ead2'));
    const a = -1.2 + Math.sin(t * 3) * 0.4;
    px(g, w / 2 - 7 + Math.round(Math.cos(a) * 2), top + 9 + Math.round(Math.sin(a) * 2), 1, 1, col(C.red));
    if (id === 'clockwork') { const k = Math.floor(t * 4) % 2; px(g, w / 2 - 9, top + 15 - k, 4, 4, col(C.brass)); }
    if (low && Math.sin(t * 8) > 0) px(g, w / 2 - 4, top + 1, 3, 3, col('#ff4a2a'));
  }

  // ---------- drawn helpers (the clockwork enemies) ----------
  function hash(s) { let x = 2166136261; for (const ch of String(s)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return (x >>> 0) / 4294967296; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function shape(g, fill, lw = 2) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = C.out; g.stroke(); }
  // A flat panel: fill, a darker lower band, outline.
  function panel(g, x, y, w, h, fill, dark, r = 4) {
    rr(g, x, y, w, h, r); g.fillStyle = fill; g.fill();
    g.save(); rr(g, x, y, w, h, r); g.clip(); g.fillStyle = dark; g.fillRect(x, y + h * 0.66, w, h * 0.34); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y + 2, w, 3); g.restore();
    rr(g, x, y, w, h, r); g.lineWidth = 2; g.strokeStyle = C.out; g.stroke();
  }
  function rivets(g, x1, x2, y, n, color = C.brassL) {
    g.fillStyle = color;
    for (let i = 0; i < n; i++) { const x = x1 + ((x2 - x1) * (i + 0.5)) / n; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
  }
  function circle(g, x, y, r, fill, lw = 2) { g.beginPath(); g.arc(x, y, r, 0, TAU); shape(g, fill, lw); }
  function porthole(g, x, y, r, lit = 1) {
    circle(g, x, y, r + 2, C.brass);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = lit > 0.5 ? C.glass : '#6d7f8c'; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, TAU); g.fill();
  }
  function prop(g, x, y, len, t, speed = 22) {
    const k = Math.abs(Math.sin(t * speed));
    g.fillStyle = 'rgba(70,74,80,0.85)';
    rr(g, x - 2, y - len * k, 4, len * 2 * k, 2); g.fill();
    g.fillStyle = 'rgba(120,124,130,0.25)'; rr(g, x - 2.5, y - len, 5, len * 2, 3); g.fill();
    circle(g, x, y, 3.2, C.brass, 1.5);
  }
  function gauge(g, x, y, r, needle) {
    circle(g, x, y, r, '#f4ead2', 1.5);
    g.strokeStyle = C.red; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(needle) * r * 0.8, y + Math.sin(needle) * r * 0.8); g.stroke();
  }


  // ---------- drawn enemy looks: the clockwork machines, and fallbacks while the sheets load ----------
  function skull(g, x, y, s) {
    g.fillStyle = '#f2ead6'; g.beginPath(); g.arc(x, y, 6 * s, 0, TAU); g.fill(); g.fillRect(x - 3.5 * s, y + 3 * s, 7 * s, 4 * s);
    g.fillStyle = C.out; g.beginPath(); g.arc(x - 2.2 * s, y, 1.6 * s, 0, TAU); g.arc(x + 2.2 * s, y, 1.6 * s, 0, TAU); g.fill();
  }
  function balloon(g, x, y, rx, ry, fill, patches) {
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); shape(g, fill, 2.5);
    g.save(); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.clip();
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x - rx, y + ry * 0.35, rx * 2, ry);
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1.2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(x + i * rx * 0.35, y, rx * 0.15, ry, 0, 0, TAU); g.stroke(); }
    if (patches) { g.fillStyle = 'rgba(120,80,50,0.45)'; g.fillRect(x - rx * 0.4, y - ry * 0.3, rx * 0.25, ry * 0.35); g.fillRect(x + rx * 0.2, y + ry * 0.05, rx * 0.2, ry * 0.3); }
    g.restore();
  }
  function ropes(g, pts) { g.strokeStyle = C.out; g.lineWidth = 1.2; for (const [a, b, c, d] of pts) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); } }
  function gun(g, x, y, len, recoil) { rr(g, x - len - 2 + recoil * 6, y - 4, len, 8, 3); shape(g, C.ironD, 1.8); rr(g, x - 6 + recoil * 6, y - 5, 6, 10, 2); shape(g, C.brass, 1.4); }
  function flag(g, x, y, t, color) {
    g.strokeStyle = C.out; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 28); g.stroke();
    g.fillStyle = color; g.beginPath(); g.moveTo(x, y - 28); for (let i = 0; i <= 6; i++) g.lineTo(x + 6 + i * 3, y - 28 + Math.sin(t * 6 + i) * 2 + 0); g.lineTo(x + 24, y - 16); for (let i = 6; i >= 0; i--) g.lineTo(x + 6 + i * 3, y - 16 + Math.sin(t * 6 + i) * 2); g.closePath(); g.fill(); g.stroke();
    skull(g, x + 14, y - 22, 0.55);
  }

  // Each look draws facing left (toward the player) around (0,0); returns its rough half-width.
  const ENEMY_LOOKS = {
    cutter(g, e, t) {
      ropes(g, [[-24, -30, -20, -6], [24, -30, 20, -6]]);
      balloon(g, 0, -46, 52, 22, '#c9a77a', true);
      skull(g, 0, -46, 1.4);
      g.beginPath(); g.moveTo(-44, -6); g.lineTo(40, -6); g.lineTo(32, 16); g.lineTo(-34, 16); g.closePath(); shape(g, C.wood, 2.5);
      g.fillStyle = C.woodD; g.fillRect(-36, 6, 70, 4);
      gun(g, -40, 2, 18, e.recoil);
      prop(g, 46, 4, 16, t);
      flag(g, 20, -6, t, '#2c2420');
      return 60;
    },
    skiff(g, e, t) {
      ropes(g, [[-14, -26, -12, -4], [14, -26, 12, -4]]);
      balloon(g, 0, -40, 40, 18, '#a99a7c', true);
      g.beginPath(); g.moveTo(-34, -4); g.lineTo(30, -4); g.lineTo(24, 12); g.lineTo(-28, 12); g.closePath(); shape(g, '#7d6a52', 2.5);
      g.strokeStyle = C.out; g.lineWidth = 3; g.beginPath(); g.moveTo(10, -4); g.lineTo(-6, -22); g.lineTo(-24, -18); g.stroke();
      gun(g, -32, 3, 14, e.recoil);
      prop(g, 36, 4, 13, t);
      return 46;
    },
    gunship(g, e, t) {
      ropes(g, [[-40, -36, -36, -8], [0, -30, 0, -8], [40, -36, 36, -8]]);
      balloon(g, -24, -54, 40, 20, '#9e9686');
      balloon(g, 28, -54, 40, 20, '#9e9686');
      panel(g, -60, -8, 118, 30, C.iron, C.ironD, 6);
      rivets(g, -54, 52, -3, 10, C.ironL);
      for (const x of [-40, -10, 20]) porthole(g, x, 8, 4, 1);
      gun(g, -58, 0, 22, e.recoil); gun(g, -58, 14, 18, e.recoil);
      prop(g, 64, 6, 18, t);
      flag(g, 40, -8, t, C.red);
      return 76;
    },
    bomber(g, e, t) {
      ropes(g, [[-30, -26, -24, -2], [30, -26, 24, -2]]);
      g.beginPath(); g.ellipse(0, -44, 82, 22, 0, 0, TAU); shape(g, '#7b8c74', 2.5);
      g.save(); g.beginPath(); g.ellipse(0, -44, 82, 22, 0, 0, TAU); g.clip(); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(-82, -36, 164, 20); g.restore();
      g.beginPath(); g.moveTo(74, -44); g.lineTo(96, -64); g.lineTo(90, -44); g.lineTo(96, -24); g.closePath(); shape(g, '#5c6b56', 2);
      panel(g, -34, -2, 64, 20, C.wood, C.woodD, 5);
      for (let i = 0; i < 4; i++) { rr(g, -26 + i * 14, 18, 8, 12, 4); shape(g, C.ironD, 1.5); }
      prop(g, 34, 6, 14, t);
      return 92;
    },
    sentinel(g, e, t) {
      for (const [x, y] of [[-46, -34], [46, -34], [-40, 34], [40, 34]]) { g.strokeStyle = C.out; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(x, y); g.stroke(); g.save(); g.translate(x, y); g.rotate(Math.PI / 2); prop(g, 0, 0, 14, t, 30); g.restore(); }
      circle(g, 0, 0, 34, C.brass, 3);
      g.save(); g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.clip(); g.fillStyle = C.brassD; g.fillRect(-34, 12, 68, 30); g.restore();
      g.save(); g.rotate(t * 0.6);
      g.beginPath(); for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; const r = i % 2 ? 18 : 22; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); shape(g, C.copper, 2);
      g.restore();
      circle(g, -6, -2, 9, '#2b1c12', 2);
      g.fillStyle = e.phase > 0 ? '#ff5533' : '#66e0ff'; g.beginPath(); g.arc(-6, -2, 5 + Math.sin(t * 4), 0, TAU); g.fill();
      gun(g, -30, 16, 16, e.recoil);
      return 52;
    },
    flagship(g, e, t) {
      ropes(g, [[-50, -50, -40, -10], [50, -50, 40, -10]]);
      balloon(g, 0, -76, 84, 32, '#b39168', true);
      skull(g, -10, -76, 2);
      g.strokeStyle = C.out; g.lineWidth = 3; g.beginPath(); g.moveTo(10, -10); g.lineTo(10, -46); g.stroke();
      g.beginPath(); g.moveTo(12, -44); g.quadraticCurveTo(40, -30, 12, -14); g.closePath(); shape(g, '#e9dfc6', 2);
      g.beginPath(); g.moveTo(-90, -12); g.lineTo(80, -12); g.lineTo(96, -26); g.lineTo(86, 6); g.lineTo(66, 26); g.lineTo(-70, 26); g.lineTo(-96, 2); g.closePath(); shape(g, C.wood, 3);
      g.fillStyle = C.woodD; g.fillRect(-80, 8, 150, 5);
      for (const x of [-60, -36, -12, 12, 36]) { rr(g, x, -4, 10, 9, 2); shape(g, C.out, 1); }
      gun(g, -86, 0, 26, e.recoil); gun(g, -80, 16, 22, e.recoil);
      prop(g, 92, 8, 22, t);
      flag(g, 60, -12, t, '#1d1612');
      return 110;
    },
    monitor(g, e, t) {
      ropes(g, [[-50, -30, -46, -8], [50, -30, 46, -8]]);
      balloon(g, -40, -42, 30, 14, C.iron);
      balloon(g, 40, -42, 30, 14, C.iron);
      g.beginPath(); g.moveTo(-90, -8); g.lineTo(84, -8); g.lineTo(76, 22); g.lineTo(-80, 22); g.closePath(); shape(g, C.ironD, 3);
      rivets(g, -84, 76, -2, 14, C.ironL); rivets(g, -78, 70, 16, 12, C.ironL);
      g.beginPath(); g.arc(-10, -8, 22, Math.PI, 0); shape(g, C.iron, 2.5);
      gun(g, -26, -16, 34, e.recoil); gun(g, -26, -8, 30, e.recoil);
      rr(g, 40, -34, 12, 26, 2); shape(g, C.iron); g.fillStyle = C.redD; g.fillRect(40, -34, 12, 5);
      prop(g, 88, 6, 18, t);
      return 100;
    },
    leviathan(g, e, t) {
      const ph = e.phase;
      ropes(g, [[-80, -50, -70, -14], [0, -46, 0, -14], [80, -50, 70, -14]]);
      g.beginPath(); g.ellipse(0, -76, 130, 40, 0, 0, TAU); shape(g, ph >= 2 ? '#4c3f3a' : '#5f6670', 3);
      // Armor plates fall away as it is beaten down.
      const plates = ph === 0 ? 7 : ph === 1 ? 4 : 2;
      for (let i = 0; i < plates; i++) { const x = -96 + i * 30; g.beginPath(); g.moveTo(x, -104); g.lineTo(x + 26, -104); g.lineTo(x + 30, -52); g.lineTo(x + 4, -52); g.closePath(); shape(g, i % 2 ? C.iron : C.ironL, 2); rivets(g, x + 6, x + 22, -96, 3, C.ironD); }
      g.beginPath(); g.moveTo(-150, -14); g.lineTo(130, -14); g.lineTo(150, -30); g.lineTo(140, 10); g.lineTo(110, 38); g.lineTo(-120, 38); g.lineTo(-158, 6); g.closePath(); shape(g, C.ironD, 3.5);
      rivets(g, -140, 120, -6, 18, C.ironL); rivets(g, -120, 100, 26, 14, C.ironL);
      for (const x of [-100, -40, 20]) { g.beginPath(); g.arc(x, -14, 16, Math.PI, 0); shape(g, C.iron, 2.5); gun(g, x - 10, -20, 30, e.recoil); }
      gun(g, -150, 8, 34, e.recoil); gun(g, -142, 24, 28, e.recoil);
      for (const x of [60, 90]) { rr(g, x, -46, 14, 32, 2); shape(g, C.iron); }
      if (ph >= 1) { g.fillStyle = `rgba(255,${ph >= 2 ? 60 : 160},40,${0.5 + Math.sin(t * 10) * 0.2})`; for (const [x, y] of [[-70, 10], [30, 20]]) { g.beginPath(); g.ellipse(x, y, 8, 12 + Math.sin(t * 14) * 3, 0, 0, TAU); g.fill(); } }
      if (ph >= 2) { g.fillStyle = `rgba(255,40,30,${0.4 + Math.sin(t * 8) * 0.3})`; g.beginPath(); g.arc(-150, -24, 6, 0, TAU); g.fill(); }
      prop(g, 158, 10, 28, t, ph >= 2 ? 34 : 20);
      return 170;
    },
    stormqueen(g, e, t) {
      const ph = e.phase;
      // Swirling cloud skirt.
      for (let i = 0; i < 9; i++) { const a = t * (0.8 + ph * 0.4) + i * 0.7; g.fillStyle = `rgba(${70 + i * 6},${80 + i * 5},${110 + i * 4},0.6)`; g.beginPath(); g.ellipse(Math.cos(a) * 70, 30 + Math.sin(a) * 10, 34, 14, 0, 0, TAU); g.fill(); }
      ropes(g, [[-50, -40, -40, -8], [50, -40, 40, -8]]);
      g.beginPath(); g.ellipse(0, -62, 110, 32, 0, 0, TAU); shape(g, '#2d3346', 3);
      g.save(); g.beginPath(); g.ellipse(0, -62, 110, 32, 0, 0, TAU); g.clip(); g.strokeStyle = '#5f6d9a'; g.lineWidth = 2; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 30, -96); g.quadraticCurveTo(i * 30 + 14, -62, i * 30, -28); g.stroke(); } g.restore();
      // Tesla spires multiply with each phase.
      const spires = 2 + ph;
      for (let i = 0; i < spires; i++) { const x = -60 + (120 * i) / Math.max(1, spires - 1); rr(g, x - 3, -118, 6, 26, 2); shape(g, C.copper, 1.5); circle(g, x, -122, 5, '#cfe8ff', 1.5); }
      g.strokeStyle = '#d6ecff'; g.lineWidth = 2; g.shadowColor = '#8fc8ff'; g.shadowBlur = 12;
      if (Math.sin(t * (6 + ph * 3)) > 0.2) { g.beginPath(); g.moveTo(-60, -122); for (let i = 1; i <= 8; i++) g.lineTo(-60 + i * 15, -122 + (Math.random() - 0.5) * 14); g.stroke(); }
      g.shadowBlur = 0;
      panel(g, -54, -10, 104, 28, '#3a3f55', '#262a3a', 8);
      g.fillStyle = ph >= 2 ? '#ff6ad5' : '#9fe0ff'; g.beginPath(); g.ellipse(-40, 4, 8 + Math.sin(t * 5) * 1.5, 5, 0, 0, TAU); g.fill();
      rr(g, -74, -2, 22, 8, 3); shape(g, C.copper, 1.5);
      prop(g, 58, 4, 18, t);
      return 130;
    },
    colossus(g, e, t) {
      const ph = e.phase;
      const wound = e.wound || 0;
      // Giant key on its back turns as it winds up.
      g.save(); g.translate(56, -40); g.rotate(t * (0.5 + wound * 0.25));
      rr(g, -4, -38, 8, 38, 2); shape(g, C.brassD, 2);
      g.beginPath(); g.ellipse(0, -46, 20, 11, 0, 0, TAU); shape(g, C.brass, 2.5); g.beginPath(); g.ellipse(0, -46, 9, 5, 0, 0, TAU); g.fillStyle = C.out; g.fill();
      g.restore();
      for (const [x, y] of [[-60, -70], [60, 30], [-70, 40]]) { g.save(); g.translate(x, y); prop(g, 0, 0, 18, t, 28); g.restore(); }
      // Torso.
      g.beginPath(); g.moveTo(-60, -60); g.lineTo(50, -60); g.lineTo(62, 30); g.lineTo(-70, 30); g.closePath(); shape(g, ph >= 2 ? '#a5562f' : C.copper, 3.5);
      rivets(g, -54, 46, -52, 10, C.brassL); rivets(g, -60, 54, 22, 11, C.brassL);
      // Face grille and eyes.
      rr(g, -50, -44, 40, 34, 6); shape(g, C.ironD, 2.5);
      for (let i = 0; i < 4; i++) { g.fillStyle = C.out; g.fillRect(-46, -36 + i * 7, 32, 3); }
      const eye = ph >= 2 ? '#ff3d2a' : ph >= 1 ? '#ffb02a' : '#ffe08a';
      for (const x of [-42, -22]) { g.fillStyle = eye; g.beginPath(); g.arc(x, -50, 5, 0, TAU); g.fill(); }
      // Gear chest that spins faster as it winds.
      g.save(); g.translate(10, -6); g.rotate(t * (0.6 + wound * 0.3));
      g.beginPath(); for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; const r = i % 2 ? 18 : 23; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); shape(g, C.brass, 2);
      g.restore(); circle(g, 10, -6, 6, C.out, 1);
      // Fists.
      for (const [x, y] of [[-86, 0], [-80, 36]]) { g.beginPath(); g.moveTo(-60, y - 10); g.lineTo(x + 10, y); g.lineWidth = 8; g.strokeStyle = C.ironD; g.stroke(); rr(g, x - 6 - e.recoil * 10, y - 9, 20, 18, 5); shape(g, C.iron, 2.5); }
      if (ph >= 1) { g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; g.beginPath(); g.arc(40 + k * 10, -64 - k * 40, 6 + k * 14, 0, TAU); g.fill(); } }
      return 110;
    },
  };

  // ---------- the player's ship ----------
  class PlayerShip {
    constructor() {
      this.mods = new Map();
      this.debris = [];
      this.smoke = [];
      this.sparks = [];
      this.core = { flash: 0 };
      this.hits = [];
      this.highlight = new Set();
      this.targets = new Map();
      this.inserts = [];
      this.x = 0; this.y = 0; this.P = 2;
      this.nStern = 0; this.nBow = 0;
      this.art = canvas(1, 1);
      this.envelopeTop = 90;
    }
    // Brings the visual model in line with the game. New modules drop in; missing ones are either
    // already falling (destroyed) or quietly removed (scrapped, detached).
    sync(game) {
      this.coreId = game.core.id;
      this.coreHp = game.core.hp; this.coreMax = game.maxHp(game.core);
      this.coreTokens = { ...game.core.tokens };
      const seen = new Set();
      for (const card of game.cards()) {
        const loc = game.locate(card.uid);
        seen.add(card.uid);
        let m = this.mods.get(card.uid);
        const at = slotXY(loc.row, loc.col);
        if (!m) {
          m = { uid: card.uid, id: card.id, x: at.x, y: at.y, install: this.ready ? 0 : 1, flash: 0, recoil: 0, smokeT: Math.random() };
          this.mods.set(card.uid, m);
        }
        Object.assign(m, { id: card.id, row: loc.row, col: loc.col, tx: at.x, ty: at.y, hp: card.hp, max: game.maxHp(card), tokens: { ...card.tokens }, reload: card.reload, front: game.isFront(loc) });
      }
      for (const uid of [...this.mods.keys()]) if (!seen.has(uid)) this.mods.delete(uid);
      this.nStern = game.hullCount('stern'); this.nBow = game.hullCount('bow');
      this.ready = true;
    }
    // A destroyed module tears off and tumbles away.
    breakOff(uid, violent = true) {
      const m = this.mods.get(uid);
      if (!m) return;
      this.mods.delete(uid);
      if (!violent) return;
      const dir = m.col < 0 ? -1 : m.col > 0 ? 1 : Math.random() < 0.5 ? -1 : 1;
      this.debris.push({ m: { ...m }, x: m.x, y: m.y, vx: dir * (40 + Math.random() * 40), vy: -60, r: 0, vr: dir * (2 + Math.random() * 3), life: 3 });
      for (let i = 0; i < 8; i++) this.debris.push({ bit: true, x: m.x, y: m.y, vx: (Math.random() - 0.5) * 140, vy: -40 - Math.random() * 100, life: 2.2, color: Math.random() < 0.5 ? C.brass : C.iron });
    }
    flash(uid) { if (uid === 'core') this.core.flash = 1; const m = this.mods.get(uid); if (m) m.flash = 1; }
    recoil(uid) { const m = this.mods.get(uid); if (m) m.recoil = 1; }
    // Art-pixel reach either side of the Core. includeGhost=false gives the real ship, so a preview
    // never re-centres or rescales it.
    extent(includeGhost = true) {
      const g = includeGhost ? this.ghost : null;
      const s = this.nStern + (g && g.pos.row === 0 && g.pos.col < 0 ? 1 : 0);
      const b = this.nBow + (g && g.pos.row === 0 && g.pos.col > 0 ? 1 : 0);
      return { left: (s ? -colX(-s) + CELL / 2 : CORE_CELL / 2) + STERN_X + 6, right: (b ? colX(b) + CELL / 2 : CORE_CELL / 2) + BOW_X + 4 };
    }
    width() { const e = this.extent(false); return e.left + e.right + 8; }
    // Reach above and below the deck line, in art pixels.
    bounds() { return { top: this.envelopeTop + 4, bottom: HULL_H + KEEL + 6 }; }
    // Screen position of a module (or the Core), for effects and arrows.
    pointOf(uid) {
      const P = this.P;
      if (uid === 'core') return { x: this.x, y: this.y + (HULL_H / 2) * P, r: (CORE_CELL / 2) * P };
      const m = this.mods.get(uid);
      if (!m) return null;
      return { x: this.x + (m.x + (m.shiftX || 0)) * P, y: this.y + m.y * P, r: (CELL / 2) * P };
    }
    update(dt) {
      const g = this.ghost;
      for (const m of this.mods.values()) {
        m.x += (m.tx - m.x) * Math.min(1, dt * 7);
        m.y += (m.ty - m.y) * Math.min(1, dt * 7);
        // Make room for a previewed hull insert: that column and everything outside it slide out.
        const room = g && g.pos.row === 0 && g.pos.insert && Math.sign(m.col) === Math.sign(g.pos.col) && Math.abs(m.col) >= Math.abs(g.pos.col);
        const want = room ? Math.sign(m.col) * CELL : 0;
        m.shiftX = (m.shiftX || 0) + (want - (m.shiftX || 0)) * Math.min(1, dt * 9);
        if (m.install < 1) {
          m.install = Math.min(1, m.install + dt * 2.2);
          if (m.install >= 1) { this.boltSparks(m); if (PlayerShip.onClank) PlayerShip.onClank(m); }
        }
        m.flash = Math.max(0, m.flash - dt * 4);
        m.recoil = Math.max(0, m.recoil - dt * 4);
        if (m.hp / m.max <= 0.34 || m.tokens.fire) {
          m.smokeT -= dt;
          if (m.smokeT <= 0) { m.smokeT = m.tokens.fire ? 0.12 : 0.3; this.smoke.push({ x: m.x + (Math.random() - 0.5) * 14, y: m.y - 10, vx: -8 - Math.random() * 12, vy: -16 - Math.random() * 12, r: 2, life: 1.6, max: 1.6, dark: !m.tokens.fire || Math.random() < 0.5 }); }
        }
      }
      if (this.coreHp / this.coreMax <= 0.34) {
        this.coreSmokeT = (this.coreSmokeT || 0) - dt;
        if (this.coreSmokeT <= 0) { this.coreSmokeT = 0.2; this.smoke.push({ x: (Math.random() - 0.5) * 16, y: 2, vx: -10, vy: -20, r: 2, life: 1.8, max: 1.8, dark: true }); }
      }
      // Steam from the funnel over the Core (when the bridge is empty).
      this.ventT = (this.ventT || 0) - dt;
      if (this.ventT <= 0) { this.ventT = 0.5 + Math.random() * 0.7; this.smoke.push({ x: -7, y: -14, vx: -8, vy: -18, r: 1.5, life: 1.3, max: 1.3, steam: true, funnel: true }); }
      this.core.flash = Math.max(0, this.core.flash - dt * 4);
      this.lunge = Math.max(0, (this.lunge || 0) - dt * 2.2);
      this.dodge = Math.max(0, (this.dodge || 0) - dt * 1.8);
      if (this.dying > 0) this.dying += dt;
      for (const p of this.smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 3; p.life -= dt; }
      this.smoke = this.smoke.filter((p) => p.life > 0);
      for (const d of this.debris) { d.vy += 260 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.r += (d.vr || 0) * dt; d.life -= dt; }
      this.debris = this.debris.filter((d) => d.life > 0);
      for (const s of this.sparks) { s.vy += 200 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
      this.sparks = this.sparks.filter((s) => s.life > 0);
    }
    boltSparks(m) {
      for (let i = 0; i < 12; i++) this.sparks.push({ x: m.x + (Math.random() - 0.5) * CELL, y: m.y + (m.row ? UPPER_H / 2 : HULL_H / 2), vx: (Math.random() - 0.5) * 100, vy: -Math.random() * 90, life: 0.5 + Math.random() * 0.3 });
    }
    // The box a module stands in: hull bays are smaller than the open upper deck.
    box(m) {
      const x = m.x + (m.shiftX || 0);
      return m.row ? { x, bottom: -2, w: CELL - 2, h: UPPER_H - 2 } : { x, bottom: HULL_H - 5, w: CELL - 6, h: HULL_H - 9 };
    }
    // Draws the ship with the deck line at the Core on (x, y), at P screen pixels per art pixel.
    draw(g, x, y, P, t, opts = {}) {
      if (this.lunge > 0) x += Math.sin((1 - this.lunge) * Math.PI) * 18 * P;
      if (this.dodge > 0) y -= Math.sin((1 - this.dodge) * Math.PI) * 14 * P;
      let fall = 0;
      if (this.dying > 0) { y += this.dying * this.dying * 160; x -= this.dying * 20; fall = this.dying * 0.35; }
      this.x = x; this.y = y; this.P = P;
      this.hits = [];
      const ext = this.extent();
      const L = -ext.left + 6, R = ext.right - BOW_X - 4;
      const look = CORE_LOOK[this.coreId] || CORE_LOOK.airship;
      const pal = HULLS[look.hull];
      // Size the art canvas: the balloons decide the top.
      const top = Math.ceil(this.envelopeTop) + 8, bottom = HULL_H + KEEL + 8;
      const W = Math.ceil(ext.left + ext.right + 16), Hh = top + bottom;
      const ox = Math.ceil(ext.left + 8), oy = top;
      if (this.art.width !== W || this.art.height !== Hh) { this.art.width = W; this.art.height = Hh; }
      const a = this.art.getContext('2d');
      a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, W, Hh);
      a.imageSmoothingEnabled = false;
      a.translate(ox, oy);
      const mods = [...this.mods.values()];
      // Balloons over the whole span, clear of the upper deck.
      const env = paintBalloons(a, L, R + BOW_X - 6, look.balloon, -UPPER_H - 8, t);
      this.envelopeTop = -env.top + 12;
      // An ensign on a staff at the stern end of the rail.
      px(a, L + 1, -24, 1, 18, INK);
      stand(a, 'flag_cross', L - 6, -14, 14, 12, { flip: true });
      paintRail(a, L + 2, R + 4, pal.trim);
      // Hull, bays and the Core.
      const bayXs = [0, ...mods.filter((m) => m.row === 0).map((m) => m.x + (m.shiftX || 0))];
      if (this.ghost && this.ghost.pos.row === 0) bayXs.push(colX(this.ghost.pos.col));
      paintHull(a, L, R, pal, bayXs, { core: 0 });
      // Rudder and a stern propeller, unless a Propeller module already drives the tail.
      px(a, L - 2, HULL_H + 2, 4, 9, pal.dark); px(a, L - 3, HULL_H + 2, 1, 9, INK);
      if (!mods.some((m) => m.id === 'propeller')) paintProp(a, L - 6, HULL_H / 2 + 2, 8, t);
      const low = this.coreHp / this.coreMax <= 0.34;
      paintCore(a, this.coreId, t, low);
      if (this.core.flash > 0) { a.globalAlpha = this.core.flash * 0.85; paintCore(a, this.coreId, t, low, '#ffffff'); a.globalAlpha = 1; }
      // A funnel over the Core when nothing stands on the bridge.
      const bridge = mods.some((m) => m.row === 1 && m.col === 0);
      if (!bridge) { px(a, -10, -12, 7, 12, INK); px(a, -9, -11, 5, 11, pal.dark); px(a, -9, -11, 5, 2, pal.trim); }
      // Modules: hull first, then the upper deck.
      for (const m of mods.sort((p, q) => p.row - q.row)) this.paintModule(a, m, t);
      if (this.ghost) this.paintGhost(a, t);
      // Smoke and bolt sparks.
      for (const p of this.smoke) {
        if (p.funnel && bridge) continue;
        const al = Math.min(1, p.life / p.max) * 0.6;
        const r = Math.max(1, Math.round(p.r));
        px(a, p.x - r, p.y - r, r * 2, r * 2, p.steam ? `rgba(255,255,255,${al})` : p.dark ? `rgba(40,34,30,${al})` : `rgba(255,140,60,${al})`);
      }
      for (const s of this.sparks) px(a, s.x, s.y, 1, 1, `rgba(255,211,106,${Math.min(1, s.life * 2)})`);
      // Onto the screen, crisp.
      g.save();
      if (fall) { g.translate(x, y); g.rotate(fall); g.translate(-x, -y); }
      blit(g, this.art, x - ox * P, y - oy * P, P);
      // Falling debris, at the same pixel scale.
      for (const d of this.debris) {
        if (d.bit) { g.fillStyle = d.color; g.globalAlpha = Math.min(1, d.life); g.fillRect(Math.round(x + d.x * P), Math.round(y + d.y * P), Math.ceil(P * 2), Math.ceil(P * 2)); g.globalAlpha = 1; continue; }
        const art = MODULE_ART[d.m.id];
        const c = art && pixelSprite(art, CELL - 4, UPPER_H - 2);
        if (!c) continue;
        g.save(); g.globalAlpha = Math.min(1, d.life); g.translate(x + d.x * P, y + d.y * P); g.rotate(d.r);
        g.imageSmoothingEnabled = false; g.drawImage(c, (-c.width / 2) * P, (-c.height / 2) * P, c.width * P, c.height * P);
        g.restore();
      }
      g.restore();
      this.drawOverlay(g, t, opts);
    }
    paintModule(a, m, t) {
      const b = this.box(m);
      const ease = 1 - Math.pow(1 - m.install, 3);
      const drop = Math.round((1 - ease) * -30);
      a.save();
      a.translate(0, drop);
      a.globalAlpha = Math.min(1, 0.2 + ease);
      if (m.row === 1) { px(a, b.x - b.w / 2 + 2, -2, b.w - 4, 2, INK); px(a, b.x - b.w / 2 + 3, -2, b.w - 6, 1, C.ironD); }
      paintModule(a, m, b.x, b.bottom, b.w, b.h, t);
      paintWear(a, m, b.x, b.bottom, b.w, b.h);
      if (m.flash > 0) { a.globalAlpha = m.flash * 0.9; paintModule(a, m, b.x, b.bottom, b.w, b.h, t, { tint: '#ffffff' }); }
      a.globalAlpha = 1;
      paintTokens(a, m.tokens, b.x, b.bottom - b.h, t);
      // Durability pips: under the bay for hull modules, over the module on the upper deck.
      const pw = Math.max(1, Math.min(3, Math.floor((b.w - 2) / m.max) - 1));
      const total = m.max * (pw + 1) - 1;
      const py = m.row ? b.bottom - b.h - 4 : HULL_H + 1;
      px(a, b.x - total / 2 - 1, py - 1, total + 2, 4, INK);
      for (let i = 0; i < m.max; i++) px(a, b.x - total / 2 + i * (pw + 1), py, pw, 2, i < m.hp ? (m.hp / m.max <= 0.34 ? '#f07b5e' : '#e9d29a') : '#3a2c22');
      a.restore();
    }
    // A see-through preview of a part about to be installed.
    paintGhost(a, t) {
      const gh = this.ghost;
      const at = slotXY(gh.pos.row, gh.pos.col);
      const m = { uid: 'ghost', id: gh.id, row: gh.pos.row, col: gh.pos.col, x: at.x, hp: 1, max: 1, tokens: {}, recoil: 0 };
      const b = this.box(m);
      a.save(); a.globalAlpha = 0.6 + Math.sin(t * 5) * 0.15;
      paintModule(a, m, b.x, b.bottom - 1, b.w, b.h, t);
      a.restore();
    }
    // Screen-resolution markers on top of the pixels: selection, targets, synergies, install bolts.
    drawOverlay(g, t, opts) {
      const P = this.P;
      const rect = (cx, cy, w, h) => [this.x + (cx - w / 2) * P, this.y + (cy - h / 2) * P, w * P, h * P];
      const cellRect = (m) => (m === 'core' ? rect(0, HULL_H / 2, CORE_CELL, HULL_H) : m.row ? rect(m.x + (m.shiftX || 0), -UPPER_H / 2 - 1, CELL, UPPER_H + 2) : rect(m.x + (m.shiftX || 0), HULL_H / 2, CELL, HULL_H));
      const all = [['core', 'core'], ...[...this.mods.values()].map((m) => [m.uid, m])];
      g.save();
      for (const [uid, m] of all) {
        const [rx, ry, rw, rh] = cellRect(m);
        this.hits.push({ uid, x: rx + rw / 2, y: ry + rh / 2, r: Math.min(rw, rh) * 0.62, rect: [rx, ry, rw, rh] });
        if (this.highlight.has(uid)) { g.strokeStyle = '#f0cf84'; g.lineWidth = 2.5; g.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4); }
        if (opts.synergy && opts.synergy.has(uid)) { g.strokeStyle = '#7ff0c0'; g.lineWidth = 2; g.setLineDash([5, 4]); g.strokeRect(rx - 3, ry - 3, rw + 6, rh + 6); g.setLineDash([]); }
        const dmg = this.targets.get(uid);
        if (dmg != null) this.drawTarget(g, rx, ry, rw, rh, t, dmg);
      }
      if (this.ghost) {
        const at = slotXY(this.ghost.pos.row, this.ghost.pos.col);
        const [rx, ry, rw, rh] = this.ghost.pos.row ? rect(at.x, at.y, CELL, UPPER_H + 2) : rect(at.x, HULL_H / 2, CELL, HULL_H);
        g.strokeStyle = '#f0cf84'; g.lineWidth = 2; g.setLineDash([6, 4]); g.lineDashOffset = -(t * 20) % 10; g.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4); g.setLineDash([]);
      }
      for (const ins of this.inserts) {
        const b = boltXY(ins);
        const bx = this.x + b.x * P, by = this.y + b.y * P;
        const r = Math.max(8, 5 * P) * (1 + Math.sin(t * 5) * 0.1);
        g.fillStyle = INK; g.fillRect(Math.round(bx - r - 1), Math.round(by - r - 1), Math.round(r * 2 + 2), Math.round(r * 2 + 2));
        g.fillStyle = ins.hover ? C.brassL : C.brass; g.fillRect(Math.round(bx - r), Math.round(by - r), Math.round(r * 2), Math.round(r * 2));
        g.fillStyle = INK; g.fillRect(Math.round(bx - r * 0.55), Math.round(by - r * 0.15), Math.round(r * 1.1), Math.max(2, Math.round(r * 0.3))); g.fillRect(Math.round(bx - r * 0.15), Math.round(by - r * 0.55), Math.max(2, Math.round(r * 0.3)), Math.round(r * 1.1));
        this.hits.push({ insert: ins, x: bx, y: by, r: r + 4 });
      }
      g.restore();
    }
    drawTarget(g, x, y, w, h, t, dmg) {
      const p = 3 + Math.sin(t * 6) * 2;
      const L = Math.min(w, h) * 0.3;
      g.strokeStyle = '#ff5b3a'; g.lineWidth = 2.5;
      const X0 = x - p, Y0 = y - p, X1 = x + w + p, Y1 = y + h + p;
      g.beginPath();
      g.moveTo(X0, Y0 + L); g.lineTo(X0, Y0); g.lineTo(X0 + L, Y0);
      g.moveTo(X1 - L, Y0); g.lineTo(X1, Y0); g.lineTo(X1, Y0 + L);
      g.moveTo(X1, Y1 - L); g.lineTo(X1, Y1); g.lineTo(X1 - L, Y1);
      g.moveTo(X0 + L, Y1); g.lineTo(X0, Y1); g.lineTo(X0, Y1 - L);
      g.stroke();
      if (dmg !== true) {
        const label = dmg > 0 ? `-${dmg}` : dmg === 0 ? '0' : String(dmg);
        g.font = '700 12px "IBM Plex Mono", monospace'; g.textAlign = 'center';
        g.lineWidth = 3; g.strokeStyle = INK; g.strokeText(label, x + w / 2, Y0 - 4); g.fillStyle = '#ffd0c4'; g.fillText(label, x + w / 2, Y0 - 4);
      }
    }
    hitTest(px0, py0) {
      let best = null;
      for (const h of this.hits) {
        const inside = h.rect ? px0 >= h.rect[0] && px0 <= h.rect[0] + h.rect[2] && py0 >= h.rect[1] && py0 <= h.rect[1] + h.rect[3] : false;
        const d = Math.hypot(px0 - h.x, py0 - h.y);
        // Install bolts win over the module under them.
        const score = h.insert ? (d <= h.r ? d - 1000 : Infinity) : inside ? d : d <= h.r ? d + 100 : Infinity;
        if (score < Infinity && (!best || score < best.score)) best = { ...h, d, score };
      }
      return best;
    }
  }

  // ---------- enemy ships (art pixels, drawn facing left toward the player) ----------
  // Pirate craft assembled from the same hulls and parts as your ship, mirrored to face you.
  // hull: palette; bays: { col: part sprite }; upper: { col: part sprite }.
  function assemble(a, spec, t, e) {
    const cols = [...Object.keys(spec.bays || {}), ...Object.keys(spec.upper || {})].map(Number);
    const nS = Math.max(0, ...cols.filter((c) => c < 0).map((c) => -c)), nB = Math.max(0, ...cols.filter((c) => c > 0));
    const L = (nS ? colX(-nS) - CELL / 2 : -CORE_CELL / 2) - STERN_X, R = nB ? colX(nB) + CELL / 2 : CORE_CELL / 2;
    a.save();
    a.scale(-1, 1); // bow to the left
    const env = paintBalloons(a, L - (spec.longBalloon || 0), R + BOW_X - 6 + (spec.longBalloon || 0), spec.balloon, -UPPER_H - 8, t);
    if (spec.flag) { px(a, L + 1, -24, 1, 18, INK); stand(a, spec.flag, L - 6, -14, 14, 12, { flip: true }); }
    const pal = HULLS[spec.hull];
    paintRail(a, L + 2, R + 4, pal.trim);
    paintHull(a, L, R, pal, [0, ...Object.keys(spec.bays || {}).map((c) => colX(Number(c)))], { core: 0 });
    paintProp(a, L - 6, HULL_H / 2 + 2, 8, t);
    paintCore(a, spec.core || 'battleship', t, false);
    const kick = Math.round((e.recoil || 0) * 3);
    for (const [c, name] of Object.entries(spec.bays || {})) stand(a, name, colX(Number(c)) - (WEAPON_ART.has(name) ? kick : 0), HULL_H - 5, CELL - 7, HULL_H - 10);
    for (const [c, name] of Object.entries(spec.upper || {})) {
      const x = colX(Number(c));
      px(a, x - CELL / 2 + 3, -2, CELL - 6, 2, INK);
      if (name === 'tesla') paintTesla(a, x, -2, UPPER_H - 2, t, { recoil: e.recoil });
      else stand(a, name, x - (WEAPON_ART.has(name) ? kick : 0), -2, CELL - 3, UPPER_H - 2);
    }
    if (spec.extra) spec.extra(a, L, R, t, e);
    a.restore();
    return { half: Math.max(-L, R + BOW_X) + 4, top: -env.top };
  }
  const WEAPON_ART = new Set(['gun_twin', 'gun_heavy', 'gun_steel', 'gun_copper', 'cannon_carriage', 'cannon_ornate', 'gatling_a', 'gatling_heavy', 'autogun_a', 'autogun_shield', 'rocket_rack', 'rockets_small']);
  const ASSEMBLED = {
    gunship: { hull: 'iron', balloon: 'stripes', flag: 'flag_jolly', bays: { '-1': 'chest_wood', 1: 'gun_twin', 2: 'cannon_carriage' }, upper: { 1: 'gun_heavy', '-1': 'autogun_a' } },
    skiff: { hull: 'wood', balloon: 'patched', flag: 'flag_jolly', core: 'airship', bays: { 1: 'cannon_carriage' }, upper: { '-1': 'crate_wood' } },
    bomber: {
      hull: 'trim', balloon: 'olive', longBalloon: 24, core: 'zeppelin', bays: { '-1': 'bombs', 1: 'rockets_small' }, upper: { 1: 'autogun_b' },
      extra(a, L, R) { for (let i = 0; i < 4; i++) { px(a, -14 + i * 8, HULL_H + KEEL + 1, 5, 7, INK); px(a, -13 + i * 8, HULL_H + KEEL + 2, 3, 5, C.ironD); } },
    },
    stormqueen: {
      hull: 'dark', balloon: 'storm', longBalloon: 16, flag: 'flag_blue', bays: { '-1': 'engine_ornate', 1: 'gauge', 2: 'gun_copper' }, upper: { 0: 'tesla', 1: 'tesla', '-1': 'tesla' },
      extra(a, L, R, t, e) {
        // A swirling skirt of storm cloud under the hull.
        for (let i = 0; i < 7; i++) {
          const k = t * (0.8 + e.phase * 0.4) + i * 0.9;
          stand(a, i % 2 ? 'cloud_small' : 'cloud_puff', Math.cos(k) * 46, HULL_H + KEEL + 8 + Math.sin(k) * 4, 34, 16, { tint: ['#3c4560', '#4b5574', '#5a6588'][i % 3] });
        }
        if (e.phase >= 1) paintTesla(a, colX(2), -2, UPPER_H + 4 * e.phase, t, { recoil: 1 });
      },
    },
  };
  // Full ships straight from the ship sheet: [sprite, max width, max height, bottom].
  const WHOLE = {
    cutter: ['ship_pirate', 112, 96, 34],
    monitor: ['ship_ironclad', 140, 96, 30],
    flagship: ['ship_galleon', 150, 136, 38],
    leviathan: ['ship_dreadnought', 190, 136, 40],
  };
  class EnemyShip {
    constructor(look) {
      this.look = look; this.flash = 0; this.recoil = 0; this.phase = 0; this.phaseFlash = 0; this.smoke = []; this.wound = 0;
      this.x = 0; this.y = 0; this.P = 2; this.halfW = 60; this.sinking = 0;
      this.art = canvas(1, 1);
      this.artW = { cutter: 120, monitor: 150, flagship: 160, leviathan: 200, gunship: 180, skiff: 140, bomber: 170, stormqueen: 200, sentinel: 90, colossus: 140 }[look] || 160;
      this.halfW = this.artW / 2;
    }
    update(dt) {
      this.flash = Math.max(0, this.flash - dt * 4);
      this.recoil = Math.max(0, this.recoil - dt * 3);
      this.lunge = Math.max(0, (this.lunge || 0) - dt * 2.2);
      this.phaseFlash = Math.max(0, this.phaseFlash - dt * 1.2);
      if (this.sinking > 0) this.sinking += dt;
      const frac = this.hpFrac ?? 1;
      this.smokeT = (this.smokeT || 0) - dt;
      if (frac < 0.5 && this.smokeT <= 0) { this.smokeT = frac < 0.25 ? 0.08 : 0.2; this.smoke.push({ x: (Math.random() - 0.5) * this.halfW, y: 0, vx: 12 + Math.random() * 12, vy: -18, r: 2, life: 1.6, max: 1.6, fire: frac < 0.25 && Math.random() < 0.4 }); }
      for (const p of this.smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 3; p.life -= dt; }
      this.smoke = this.smoke.filter((p) => p.life > 0);
    }
    paint(a, t) {
      const whole = WHOLE[this.look];
      if (whole) {
        const c = stand(a, whole[0], 0, whole[3], whole[1], whole[2]);
        if (!c) return 0;
        if (this.look === 'flagship') stand(a, 'flag_jolly', 12, -72, 14, 12);
        if (this.look === 'leviathan') {
          stand(a, this.phase >= 2 ? 'flag_red' : 'flag_star', 44, -60, 14, 12);
          for (const [x, y] of [[-24, 22], [16, 28], [40, 4]].slice(0, this.phase ? this.phase + 1 : 0)) {
            const f = Math.round(Math.sin(t * 12 + x) * 2);
            px(a, x - 3, y - 7 + f, 6, 8 - f, this.phase >= 2 ? '#ff4a2a' : '#ff9a3a'); px(a, x - 1, y - 3, 3, 4, '#ffd25e');
          }
        }
        return c.width / 2;
      }
      const spec = ASSEMBLED[this.look];
      if (spec) { if (!SPR().ready()) return 0; return assemble(a, spec, t, this).half; }
      // Clockwork machines keep their drawn shapes, shrunk onto the pixel grid.
      a.save(); a.scale(0.55, 0.55);
      const half = (ENEMY_LOOKS[this.look] || ENEMY_LOOKS.cutter)(a, this, t);
      a.restore();
      return half * 0.55;
    }
    // Draws the ship with its deck line at (x, y), at P screen pixels per art pixel.
    draw(g, x, y, P, t) {
      this.x = x; this.y = y; this.P = P;
      const W = this.artW + 40, H = 240, ox = W / 2, oy = 150;
      if (this.art.width !== W || this.art.height !== H) { this.art.width = W; this.art.height = H; }
      const a = this.art.getContext('2d');
      a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, W, H);
      a.imageSmoothingEnabled = false;
      a.translate(ox, oy);
      if (this.phaseFlash > 0) { a.fillStyle = `rgba(255,80,40,${this.phaseFlash * 0.35})`; a.beginPath(); a.arc(0, -20, this.halfW * 1.1, 0, TAU); a.fill(); }
      this.halfW = this.paint(a, t) || this.halfW;
      if (this.flash > 0) {
        a.globalCompositeOperation = 'source-atop';
        a.fillStyle = `rgba(255,255,255,${this.flash * 0.85})`; a.fillRect(-ox, -oy, W, H);
        a.globalCompositeOperation = 'source-over';
      }
      for (const p of this.smoke) { const r = Math.max(1, Math.round(p.r)); px(a, p.x - r, p.y - r, r * 2, r * 2, p.fire ? `rgba(255,130,50,${(p.life / p.max) * 0.7})` : `rgba(40,34,30,${(p.life / p.max) * 0.55})`); }
      const sink = this.sinking;
      g.save();
      if (this.lunge > 0) x -= Math.sin((1 - this.lunge) * Math.PI) * 18 * P;
      g.translate(x + sink * 30, y + sink * sink * 80);
      g.rotate(-sink * 0.4);
      g.globalAlpha = Math.max(0, 1 - sink * 0.35);
      blit(g, this.art, -ox * P, -oy * P, P);
      g.restore();
    }
    pointOf() { return { x: this.x, y: this.y - 6 * this.P, r: this.halfW * this.P }; }
    hitTest(x, y) { return Math.abs(x - this.x) < this.halfW * this.P && Math.abs(y - this.y + 10 * this.P) < this.halfW * this.P * 0.7; }
  }

  // A small still of a part as it looks on the ship, for offers: the pixel art at 3x.
  function portrait(id, w = 96, h = 76) {
    const c = canvas(w, h);
    c.className = 'part-portrait';
    c.setAttribute('aria-hidden', 'true');
    const art = canvas(w / 3, h / 3);
    const paint = (tries) => {
      const a = art.getContext('2d');
      a.clearRect(0, 0, art.width, art.height);
      const m = { uid: 'portrait-' + id, id, row: 1, col: 1, hp: 1, max: 1, tokens: {}, recoil: 0 };
      paintModule(a, m, art.width / 2, art.height - 3, CELL - 3, UPPER_H - 2, 0.6);
      const g = c.getContext('2d');
      g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false; g.drawImage(art, 0, 0, w, h);
      // The atlases may still be loading: repaint once they are.
      if (tries > 0 && !SPR().allReady()) setTimeout(() => paint(tries - 1), 300);
    };
    paint(12);
    return c;
  }

  window.CardshipsShipArt = { PlayerShip, EnemyShip, portrait, CELL, palette: C };
})();
