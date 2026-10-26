// Card illustrations painted in code, for parts that have no painted card art (the legendaries and
// the later areas' parts). Each is a vector emblem with ink outlines and highlights on a themed
// backdrop, rendered once to a canvas and cached as an image URL, sized like the painted cards.
(function () {
  const TAU = Math.PI * 2;
  const W = 240, H = 200;
  const INK = '#1d140e';
  // Backdrops by theme: [centre, edge, ray colour].
  const THEMES = {
    legendary: ['#6a4a14', '#140c05', 'rgba(255,214,120,0.16)'],
    brass: ['#5b4630', '#17110b', 'rgba(255,220,160,0.08)'],
    aurora: ['#1d5a5a', '#070d1c', 'rgba(140,255,220,0.12)'],
    blood: ['#5a1018', '#0b0305', 'rgba(255,90,80,0.12)'],
  };
  const cache = {};

  // ---------- drawing helpers ----------
  function path(g, pts, close = true) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (close) g.closePath(); }
  function shape(g, fill, draw, width = 3) { g.beginPath(); draw(); g.fillStyle = fill; g.fill(); g.lineWidth = width; g.strokeStyle = INK; g.stroke(); }
  function grad(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
  function rgrad(g, x, y, r, stops) { const gr = g.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
  function rivet(g, x, y, r = 3) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = '#e8c878'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x - r * 0.5, y - r * 0.6, r * 0.6, r * 0.5); }
  function glow(g, x, y, r, color) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgrad(g, x, y, r, [[0, color], [1, 'rgba(0,0,0,0)']]); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
  function bolt(g, pts, color = '#cfe9ff') {
    g.save(); g.lineJoin = 'round';
    g.strokeStyle = INK; g.lineWidth = 6; path(g, pts, false); g.stroke();
    g.strokeStyle = color; g.lineWidth = 3; g.shadowColor = color; g.shadowBlur = 10; path(g, pts, false); g.stroke();
    g.restore();
  }
  function sparkle(g, x, y, r, color = '#fff6d0') {
    g.save(); g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 8;
    path(g, [[x, y - r], [x + r * 0.25, y - r * 0.25], [x + r, y], [x + r * 0.25, y + r * 0.25], [x, y + r], [x - r * 0.25, y + r * 0.25], [x - r, y], [x - r * 0.25, y - r * 0.25]]);
    g.fill(); g.restore();
  }
  const BRASS = (g, y0, y1) => grad(g, 0, y0, 0, y1, [[0, '#f6d98a'], [0.45, '#c8923a'], [1, '#6e4614']]);
  const IRON = (g, y0, y1) => grad(g, 0, y0, 0, y1, [[0, '#c9d2d8'], [0.5, '#7a858f'], [1, '#353c44']]);

  // ---------- emblems ----------
  // Each painter draws its part centred in a 240 x 200 card.
  const PAINT = {
    // Leviathan Plating: a riveted kite shield of dark iron with a coiled sea-serpent in brass.
    leviplating: { theme: 'legendary', draw(g) {
      shape(g, IRON(g, 30, 180), () => path(g, [[120, 22], [190, 46], [182, 120], [120, 184], [58, 120], [50, 46]]), 4);
      shape(g, 'rgba(0,0,0,0.25)', () => path(g, [[120, 38], [176, 56], [170, 116], [120, 168], [70, 116], [64, 56]]), 2);
      g.save(); g.lineCap = 'round';
      g.strokeStyle = INK; g.lineWidth = 13; g.beginPath(); g.arc(120, 104, 34, 0.4, TAU - 0.3); g.stroke();
      g.strokeStyle = BRASS(g, 60, 140); g.lineWidth = 8; g.beginPath(); g.arc(120, 104, 34, 0.4, TAU - 0.3); g.stroke();
      g.restore();
      shape(g, BRASS(g, 70, 100), () => path(g, [[150, 86], [168, 74], [160, 94], [148, 98]]), 2.5);
      g.fillStyle = '#ff5a2a'; g.beginPath(); g.arc(158, 84, 2.5, 0, TAU); g.fill();
      for (const [x, y] of [[120, 32], [174, 54], [168, 118], [72, 118], [66, 54], [120, 170]]) rivet(g, x, y, 4);
    } },
    // Dreadnought Cannon: an enormous banded barrel on a brass carriage, muzzle glowing.
    dreadnought: { theme: 'legendary', draw(g) {
      g.save(); g.translate(120, 106); g.rotate(-0.22);
      shape(g, IRON(g, -30, 30), () => g.rect(-86, -24, 160, 48), 4);
      for (const x of [-60, -20, 20, 54]) shape(g, BRASS(g, -28, 28), () => g.rect(x, -28, 12, 56), 2.5);
      shape(g, IRON(g, -34, 34), () => g.rect(72, -32, 22, 64), 4);
      g.fillStyle = INK; g.beginPath(); g.ellipse(94, 0, 7, 22, 0, 0, TAU); g.fill();
      glow(g, 96, 0, 40, 'rgba(255,170,60,0.7)');
      shape(g, BRASS(g, -40, 0), () => { g.arc(-86, 0, 26, Math.PI / 2, Math.PI * 1.5); g.closePath(); }, 3);
      g.restore();
      shape(g, BRASS(g, 130, 180), () => path(g, [[60, 178], [92, 136], [158, 136], [184, 178]]), 4);
      for (const x of [86, 158]) { shape(g, '#4a3420', () => g.arc(x, 176, 16, 0, TAU), 3); rivet(g, x, 176, 5); }
    } },
    // Gale Engine: a brass turbine in a ring, wind streaming out of it.
    galeengine: { theme: 'legendary', draw(g) {
      g.save(); g.strokeStyle = 'rgba(200,235,255,0.75)'; g.lineWidth = 4; g.lineCap = 'round';
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(150, 70 + i * 22); g.bezierCurveTo(185, 60 + i * 22, 205, 90 + i * 22, 232, 74 + i * 22); g.stroke(); }
      g.restore();
      shape(g, BRASS(g, 30, 180), () => g.arc(104, 104, 74, 0, TAU), 4);
      shape(g, '#2a2018', () => g.arc(104, 104, 60, 0, TAU), 3);
      g.save(); g.translate(104, 104);
      for (let i = 0; i < 6; i++) { g.rotate(TAU / 6); shape(g, IRON(g, -10, 50), () => path(g, [[4, -6], [56, -16], [54, 8], [6, 8]]), 2.5); }
      g.restore();
      shape(g, BRASS(g, 90, 120), () => g.arc(104, 104, 14, 0, TAU), 3); rivet(g, 104, 104, 5);
      for (let i = 0; i < 8; i++) rivet(g, 104 + Math.cos((i * TAU) / 8) * 67, 104 + Math.sin((i * TAU) / 8) * 67, 3.5);
    } },
    // Storm Heart: a crackling heart of lightning in a caged glass globe.
    stormheart: { theme: 'legendary', draw(g) {
      shape(g, BRASS(g, 150, 190), () => path(g, [[70, 186], [84, 158], [156, 158], [170, 186]]), 4);
      g.fillStyle = rgrad(g, 120, 94, 70, [[0, 'rgba(150,210,255,0.55)'], [1, 'rgba(40,80,140,0.35)']]);
      g.beginPath(); g.arc(120, 94, 66, 0, TAU); g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
      glow(g, 120, 96, 60, 'rgba(120,200,255,0.6)');
      shape(g, '#7fd2ff', () => { g.moveTo(120, 124); g.bezierCurveTo(70, 92, 88, 52, 120, 76); g.bezierCurveTo(152, 52, 170, 92, 120, 124); }, 3);
      bolt(g, [[96, 40], [112, 76], [100, 84], [122, 120]]);
      bolt(g, [[150, 44], [136, 80], [148, 86], [128, 114]]);
      g.save(); g.strokeStyle = BRASS(g, 30, 160); g.lineWidth = 5;
      for (const a of [-0.9, -0.3, 0.3, 0.9]) { g.beginPath(); g.ellipse(120, 94, 66 * Math.abs(Math.sin(a + 1.6)), 66, 0, 0, TAU); g.stroke(); }
      g.restore();
      g.lineWidth = 4; g.strokeStyle = INK; g.beginPath(); g.arc(120, 94, 66, 0, TAU); g.stroke();
      shape(g, 'rgba(255,255,255,0.45)', () => g.ellipse(94, 64, 12, 6, -0.7, 0, TAU), 0);
    } },
    // Grand Mainspring: a coiled brass spring with a winding key.
    mainspring: { theme: 'legendary', draw(g) {
      shape(g, '#2a2018', () => g.arc(108, 104, 76, 0, TAU), 4);
      g.save(); g.lineCap = 'round';
      const spiral = (w, color) => { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); for (let a = 0; a < TAU * 3.4; a += 0.08) { const r = 8 + a * 3.2; const x = 108 + Math.cos(a) * r, y = 104 + Math.sin(a) * r; if (a) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); };
      spiral(10, INK); spiral(6, BRASS(g, 30, 180));
      g.restore();
      for (let i = 0; i < 12; i++) shape(g, BRASS(g, 20, 190), () => { const a = (i * TAU) / 12; g.arc(108 + Math.cos(a) * 80, 104 + Math.sin(a) * 80, 8, 0, TAU); }, 2.5);
      g.save(); g.translate(184, 46); g.rotate(0.7);
      shape(g, BRASS(g, -30, 30), () => g.rect(-6, -2, 12, 46), 3);
      shape(g, BRASS(g, -30, 0), () => { g.ellipse(-14, -10, 14, 10, 0, 0, TAU); }, 3);
      shape(g, BRASS(g, -30, 0), () => { g.ellipse(14, -10, 14, 10, 0, 0, TAU); }, 3);
      g.restore();
    } },
    // Titan's Fist: a riveted brass gauntlet, clenched, with pistons at the wrist.
    titanfist: { theme: 'legendary', draw(g) {
      shape(g, IRON(g, 120, 190), () => g.rect(86, 132, 68, 56), 4);
      for (const x of [94, 118, 142]) shape(g, BRASS(g, 140, 190), () => g.rect(x - 6, 140, 12, 46), 2.5);
      shape(g, BRASS(g, 30, 140), () => { g.moveTo(66, 136); g.lineTo(62, 70); g.quadraticCurveTo(64, 40, 96, 40); g.lineTo(168, 44); g.quadraticCurveTo(188, 48, 186, 74); g.lineTo(178, 136); g.closePath(); }, 4);
      g.lineWidth = 3; g.strokeStyle = INK;
      for (const x of [94, 120, 146]) { g.beginPath(); g.moveTo(x, 44); g.lineTo(x + 2, 96); g.stroke(); }
      shape(g, BRASS(g, 80, 130), () => { g.moveTo(62, 92); g.quadraticCurveTo(110, 82, 128, 104); g.quadraticCurveTo(108, 122, 66, 118); g.closePath(); }, 3);
      for (const [x, y] of [[80, 56], [108, 54], [134, 56], [162, 60], [80, 128], [170, 126]]) rivet(g, x, y, 4);
      glow(g, 124, 70, 50, 'rgba(255,200,90,0.25)');
    } },
    // Gas Grenadiers: a rack of gas canisters with green fumes curling off them.
    grenadiers: { theme: 'brass', draw(g) {
      g.save(); g.fillStyle = 'rgba(140,220,90,0.35)';
      for (const [x, y, r] of [[70, 50, 28], [110, 36, 24], [160, 44, 30], [190, 70, 20]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      g.restore();
      shape(g, '#5a4026', () => g.rect(40, 150, 160, 22), 4);
      for (let i = 0; i < 4; i++) {
        const x = 62 + i * 38;
        g.save(); g.translate(x, 150); g.rotate(-0.25);
        shape(g, grad(g, -14, 0, 14, 0, [[0, '#4e7a2c'], [0.5, '#9bd05a'], [1, '#3a5a20']]), () => g.rect(-14, -84, 28, 84), 3);
        shape(g, BRASS(g, -96, -80), () => g.rect(-15, -96, 30, 14), 3);
        shape(g, '#ffd24a', () => g.rect(-14, -50, 28, 8), 2);
        g.restore();
      }
    } },
  };

  // Paints a part's card illustration (cached) and returns an image URL, or null if none.
  function cardArt(id) {
    if (cache[id]) return cache[id];
    const p = PAINT[id];
    if (!p) return null;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const [mid, edge, ray] = THEMES[p.theme] || THEMES.brass;
    g.fillStyle = rgrad(g, W / 2, H / 2, W * 0.7, [[0, mid], [1, edge]]);
    g.fillRect(0, 0, W, H);
    // Rays behind the emblem, and a soft parchment grain.
    g.save(); g.translate(W / 2, H / 2); g.fillStyle = ray;
    for (let i = 0; i < 16; i++) { g.rotate(TAU / 16); g.beginPath(); g.moveTo(0, 0); g.lineTo(-12, -W); g.lineTo(12, -W); g.closePath(); g.fill(); }
    g.restore();
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,240,210,${Math.random() * 0.04})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    g.lineJoin = 'round';
    p.draw(g);
    if (p.theme === 'legendary') for (const [x, y, r] of [[28, 30, 7], [212, 40, 5], [200, 170, 6], [34, 160, 4]]) sparkle(g, x, y, r);
    g.fillStyle = rgrad(g, W / 2, H / 2, W * 0.75, [[0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
    g.fillRect(0, 0, W, H);
    cache[id] = c.toDataURL('image/png');
    return cache[id];
  }

  window.CardshipsArtGen = { cardArt, has: (id) => !!PAINT[id], PAINT, helpers: { path, shape, grad, rgrad, rivet, glow, bolt, sparkle, BRASS, IRON, INK } };
})();
