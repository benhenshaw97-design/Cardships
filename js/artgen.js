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
  const CRYSTAL = (g, y0, y1) => grad(g, 0, y0, 0, y1, [[0, '#e8fff8'], [0.4, '#8ff0d8'], [1, '#2a8a8a']]);
  const VIOLET = (g, y0, y1) => grad(g, 0, y0, 0, y1, [[0, '#f0e0ff'], [0.45, '#b48cff'], [1, '#4a2a8a']]);
  // A glowing rune circle.
  function rune(g, x, y, r, color = '#9fffe8') {
    g.save(); g.strokeStyle = color; g.lineWidth = 2.5; g.shadowColor = color; g.shadowBlur = 10;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    g.beginPath(); g.arc(x, y, r * 0.7, 0, TAU); g.stroke();
    for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7); g.lineTo(x + Math.cos(a + 1.2) * r * 0.25, y + Math.sin(a + 1.2) * r * 0.25); g.stroke(); }
    g.restore();
  }
  const BLOOD = (g, y0, y1) => grad(g, 0, y0, 0, y1, [[0, '#ff8a80'], [0.45, '#c0182a'], [1, '#4a0008']]);
  const BONE = (g, y0, y1) => grad(g, 0, y0, 0, y1, [[0, '#fff4dc'], [0.5, '#d8c8a0'], [1, '#7a6a4a']]);
  const SILVER = (g, y0, y1) => grad(g, 0, y0, 0, y1, [[0, '#e8e8f0'], [0.5, '#9a9aa8'], [1, '#3a3a48']]);
  // A drop of blood.
  function drop(g, x, y, r) { shape(g, BLOOD(g, y - r * 2, y + r), () => { g.moveTo(x, y - r * 2); g.bezierCurveTo(x + r * 0.6, y - r, x + r, y - r * 0.2, x + r, y + r * 0.2); g.arc(x, y + r * 0.2, r, 0, Math.PI); g.bezierCurveTo(x - r, y - r * 0.2, x - r * 0.6, y - r, x, y - r * 2); }, 2.5); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(x - r * 0.35, y, r * 0.18, r * 0.35, -0.3, 0, TAU); g.fill(); }
  // A big red moon with craters.
  function moon(g, x, y, r) { glow(g, x, y, r * 2.2, 'rgba(255,50,40,0.45)'); shape(g, rgrad(g, x - r * 0.3, y - r * 0.3, r * 1.3, [[0, '#ff9a7a'], [0.55, '#d0282a'], [1, '#6a0810']]), () => g.arc(x, y, r, 0, TAU), 3); g.fillStyle = 'rgba(90,0,10,0.3)'; for (const [cx, cy, cr] of [[-0.3, -0.1, 0.2], [0.25, 0.25, 0.13], [0.1, -0.45, 0.1]]) { g.beginPath(); g.arc(x + cx * r, y + cy * r, cr * r, 0, TAU); g.fill(); } }
  // A bat silhouette.
  function bat(g, x, y, s, col = '#120408') { g.fillStyle = col; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - 6 * s, y - 3 * s, x - 13 * s, y - 2 * s); g.lineTo(x - 10 * s, y + 2 * s); g.lineTo(x - 7 * s, y + 1 * s); g.lineTo(x - 4 * s, y + 4 * s); g.lineTo(x, y + 3 * s); g.lineTo(x + 4 * s, y + 4 * s); g.lineTo(x + 7 * s, y + 1 * s); g.lineTo(x + 10 * s, y + 2 * s); g.lineTo(x + 13 * s, y - 2 * s); g.quadraticCurveTo(x + 6 * s, y - 3 * s, x, y); g.fill(); }
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

  // ---------- Area 2: the Aurora Reaches ----------
  Object.assign(PAINT, {
    // Rune Cannon: a brass barrel ringed with glowing rune circles.
    runecannon: { theme: 'aurora', draw(g) {
      g.save(); g.translate(118, 104); g.rotate(-0.35);
      shape(g, BRASS(g, -26, 26), () => g.rect(-80, -20, 150, 40), 4);
      shape(g, BRASS(g, -30, 30), () => g.rect(64, -26, 18, 52), 3);
      g.restore();
      rune(g, 74, 122, 22); rune(g, 128, 104, 26); rune(g, 182, 84, 20, '#c9a2ff');
      shape(g, '#3a2a1a', () => path(g, [[52, 182], [80, 136], [150, 136], [176, 182]]), 4);
      glow(g, 196, 74, 46, 'rgba(140,255,220,0.6)');
    } },
    // Crystal Ward: a faceted crystal shield.
    crystalward: { theme: 'aurora', draw(g) {
      glow(g, 120, 100, 90, 'rgba(120,255,220,0.35)');
      shape(g, CRYSTAL(g, 20, 180), () => path(g, [[120, 18], [186, 60], [176, 134], [120, 184], [64, 134], [54, 60]]), 4);
      g.lineWidth = 2; g.strokeStyle = 'rgba(29,20,14,0.6)';
      for (const [a, b] of [[[120, 18], [120, 184]], [[54, 60], [176, 134]], [[186, 60], [64, 134]]]) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
      shape(g, 'rgba(255,255,255,0.4)', () => path(g, [[120, 26], [176, 62], [120, 90]]), 0);
      for (const [x, y, r] of [[60, 40, 6], [190, 150, 5], [40, 150, 4]]) sparkle(g, x, y, r, '#c8fff0');
    } },
    // Star Sail: a billowing sail of starlight on a brass spar.
    starsail: { theme: 'aurora', draw(g) {
      shape(g, BRASS(g, 20, 190), () => g.rect(64, 20, 10, 168), 3);
      shape(g, grad(g, 70, 30, 200, 170, [[0, '#2a2a6a'], [1, '#6a4ab0']]), () => { g.moveTo(74, 28); g.quadraticCurveTo(220, 60, 200, 150); g.lineTo(74, 160); g.closePath(); }, 4);
      for (let i = 0; i < 18; i++) sparkle(g, 90 + Math.random() * 100, 50 + Math.random() * 100, 2 + Math.random() * 4, i % 3 ? '#fff6d0' : '#9fffe8');
      g.strokeStyle = BRASS(g, 20, 190); g.lineWidth = 3; g.beginPath(); g.moveTo(74, 160); g.lineTo(200, 150); g.stroke();
    } },
    // Mana Lens: a great lens on a brass stand, focusing a beam.
    manalens: { theme: 'aurora', draw(g) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = grad(g, 120, 90, 240, 90, [[0, 'rgba(160,255,230,0.7)'], [1, 'rgba(160,255,230,0)']]);
      path(g, [[130, 80], [240, 50], [240, 130], [130, 100]]); g.fill(); g.restore();
      shape(g, BRASS(g, 140, 190), () => path(g, [[80, 186], [96, 150], [140, 150], [156, 186]]), 4);
      shape(g, BRASS(g, 100, 160), () => g.rect(112, 120, 12, 34), 3);
      shape(g, BRASS(g, 20, 160), () => g.ellipse(118, 90, 46, 66, 0, 0, TAU), 4);
      g.fillStyle = rgrad(g, 118, 90, 46, [[0, 'rgba(230,255,250,0.9)'], [0.6, 'rgba(120,230,220,0.6)'], [1, 'rgba(60,140,160,0.8)']]);
      g.beginPath(); g.ellipse(118, 90, 34, 54, 0, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      shape(g, 'rgba(255,255,255,0.6)', () => g.ellipse(104, 66, 8, 14, -0.4, 0, TAU), 0);
    } },
    // Prism Array: a crystal prism splitting a beam into three coloured rays.
    prism: { theme: 'aurora', draw(g) {
      g.save(); g.lineCap = 'round'; g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(255,255,240,0.9)'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 120); g.lineTo(100, 108); g.stroke();
      for (const [col, y] of [['#ff6a6a', 60], ['#6aff9a', 100], ['#6aa8ff', 140]]) { g.strokeStyle = col; g.lineWidth = 7; g.beginPath(); g.moveTo(140, 104); g.lineTo(240, y); g.stroke(); }
      g.restore();
      shape(g, grad(g, 80, 40, 160, 170, [[0, 'rgba(240,255,255,0.95)'], [1, 'rgba(120,200,220,0.7)']]), () => path(g, [[120, 30], [176, 160], [64, 160]]), 4);
      shape(g, 'rgba(255,255,255,0.5)', () => path(g, [[120, 44], [140, 120], [104, 120]]), 0);
      shape(g, BRASS(g, 160, 190), () => g.rect(52, 160, 136, 18), 3);
    } },
    // Aurora Crown: a gold crown set with emerald, teal and violet gems, lit by auroras.
    auroracrown: { theme: 'legendary', draw(g) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const [col, y] of [['rgba(93,255,168,0.25)', 40], ['rgba(79,216,255,0.22)', 58], ['rgba(192,140,255,0.22)', 76]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y - 30, 160, y + 30, 240, y - 10); g.lineTo(240, y + 18); g.bezierCurveTo(160, y + 48, 80, y - 12, 0, y + 18); g.fill(); }
      g.restore();
      shape(g, BRASS(g, 70, 170), () => path(g, [[50, 168], [44, 92], [84, 126], [120, 76], [156, 126], [196, 92], [190, 168]]), 4);
      shape(g, BRASS(g, 150, 180), () => g.rect(48, 150, 144, 22), 3);
      for (const [x, y, c] of [[44, 92, '#5dffa8'], [120, 76, '#4fd8ff'], [196, 92, '#c08cff'], [84, 160, '#5dffa8'], [120, 160, '#4fd8ff'], [156, 160, '#c08cff']]) { shape(g, c, () => g.arc(x, y, 9, 0, TAU), 2.5); glow(g, x, y, 22, c + '88'); }
    } },
    // Archon's Lance: a spear of living light.
    archonlance: { theme: 'legendary', draw(g) {
      g.save(); g.translate(120, 104); g.rotate(-0.6);
      glow(g, 0, 0, 90, 'rgba(160,255,230,0.35)');
      shape(g, CRYSTAL(g, -14, 14), () => path(g, [[-100, -6], [60, -8], [104, 0], [60, 8], [-100, 6]]), 3);
      shape(g, BRASS(g, -20, 20), () => g.rect(-20, -14, 16, 28), 3);
      shape(g, VIOLET(g, -30, 30), () => path(g, [[60, -8], [80, -26], [104, 0], [80, 26], [60, 8]]), 3);
      g.restore();
      for (const [x, y, r] of [[60, 160, 6], [190, 40, 7], [170, 160, 4]]) sparkle(g, x, y, r, '#c8fff0');
    } },
    // ---------- Area 3: the Blood Moon ----------
    // Blood Harpoon: a barbed silver harpoon trailing a blood line into a drop.
    bloodharpoon: { theme: 'blood', draw(g) {
      moon(g, 186, 52, 26);
      g.save(); g.translate(112, 112); g.rotate(-0.55);
      shape(g, '#5a3a24', () => g.rect(-96, -6, 130, 12), 3);
      shape(g, SILVER(g, -24, 24), () => path(g, [[30, -14], [92, 0], [30, 14], [42, 0]]), 3);
      shape(g, SILVER(g, -20, 0), () => path(g, [[46, -6], [58, -22], [62, -4]]), 2.5);
      shape(g, SILVER(g, 0, 20), () => path(g, [[46, 6], [58, 22], [62, 4]]), 2.5);
      g.restore();
      g.strokeStyle = '#a0101c'; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 168); g.bezierCurveTo(60, 120, 30, 110, 50, 70); g.stroke();
      drop(g, 62, 168, 12); drop(g, 168, 158, 8);
    } },
    // Thorned Hull: a dark iron plate bristling with bloody thorns.
    thornhull: { theme: 'blood', draw(g) {
      shape(g, IRON(g, 30, 170), () => path(g, [[60, 40], [180, 40], [192, 100], [180, 162], [60, 162], [48, 100]]), 4);
      for (const [x, y, a] of [[60, 40, -2.3], [180, 40, -0.8], [192, 100, 0], [180, 162, 0.8], [60, 162, 2.3], [48, 100, 3.14], [120, 40, -1.57], [120, 162, 1.57]]) {
        shape(g, SILVER(g, y - 20, y + 20), () => path(g, [[x + Math.cos(a - 0.35) * 8, y + Math.sin(a - 0.35) * 8], [x + Math.cos(a) * 34, y + Math.sin(a) * 34], [x + Math.cos(a + 0.35) * 8, y + Math.sin(a + 0.35) * 8]]), 2.5);
        g.fillStyle = '#c0182a'; g.beginPath(); g.arc(x + Math.cos(a) * 26, y + Math.sin(a) * 26, 3, 0, TAU); g.fill();
      }
      for (const [x, y] of [[80, 60], [160, 60], [80, 142], [160, 142]]) rivet(g, x, y, 4);
      shape(g, BLOOD(g, 80, 120), () => g.arc(120, 100, 18, 0, TAU), 3);
    } },
    // Sanguine Engine: a brass boiler with a glass heart full of blood, venting red steam.
    sanguine: { theme: 'blood', draw(g) {
      glow(g, 120, 110, 80, 'rgba(255,40,40,0.3)');
      shape(g, BRASS(g, 50, 176), () => g.roundRect(64, 60, 112, 116, 18), 4);
      shape(g, 'rgba(255,220,220,0.25)', () => g.arc(120, 112, 34, 0, TAU), 3);
      g.save(); g.beginPath(); g.arc(120, 112, 31, 0, TAU); g.clip(); g.fillStyle = BLOOD(g, 100, 150); g.fillRect(86, 106, 70, 40); g.restore();
      for (const [x, y] of [[74, 70], [166, 70], [74, 166], [166, 166]]) rivet(g, x, y, 4);
      shape(g, IRON(g, 30, 60), () => g.rect(104, 30, 32, 30), 3);
      for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(220,60,70,${0.5 - i * 0.1})`; g.beginPath(); g.arc(120 + i * 12, 22 - i * 6, 10 + i * 4, 0, TAU); g.fill(); }
    } },
    // Crimson Altar: a black altar under a red moon, a dagger and a pooling chalice.
    crimsonaltar: { theme: 'blood', draw(g) {
      moon(g, 120, 52, 36);
      shape(g, '#1e1014', () => path(g, [[50, 176], [64, 120], [176, 120], [190, 176]]), 4);
      shape(g, '#2e1a20', () => g.rect(56, 108, 128, 16), 3);
      g.fillStyle = BLOOD(g, 108, 180); g.beginPath(); g.moveTo(90, 120); g.quadraticCurveTo(96, 150, 88, 176); g.lineTo(100, 176); g.quadraticCurveTo(106, 150, 100, 120); g.fill();
      g.save(); g.translate(150, 96); g.rotate(0.5);
      shape(g, SILVER(g, -40, 0), () => path(g, [[-4, -50], [4, -50], [3, 0], [-3, 0]]), 2.5);
      shape(g, BRASS(g, -2, 6), () => g.rect(-12, 0, 24, 6), 2); shape(g, '#3a1a10', () => g.rect(-3, 6, 6, 16), 2);
      g.restore();
    } },
    // Moon Mortar: a squat silver mortar aimed at a swollen red moon.
    moonmortar: { theme: 'blood', draw(g) {
      moon(g, 170, 56, 34);
      g.save(); g.translate(96, 136); g.rotate(-0.7);
      shape(g, SILVER(g, -30, 30), () => g.roundRect(-26, -30, 80, 60, 10), 4);
      shape(g, '#1a0a0c', () => g.ellipse(56, 0, 8, 26, 0, 0, TAU), 3);
      g.restore();
      shape(g, IRON(g, 150, 184), () => path(g, [[50, 184], [70, 150], [130, 150], [148, 184]]), 4);
      for (const [x, y] of [[140, 88], [124, 104]]) drop(g, x, y, 5);
    } },
    // Sovereign's Chalice: a tall silver-and-gold chalice brimming with blood.
    chalice: { theme: 'legendary', draw(g) {
      glow(g, 120, 70, 90, 'rgba(255,40,40,0.4)');
      shape(g, BRASS(g, 30, 110), () => { g.moveTo(66, 40); g.lineTo(174, 40); g.quadraticCurveTo(170, 110, 120, 116); g.quadraticCurveTo(70, 110, 66, 40); }, 4);
      shape(g, BLOOD(g, 34, 56), () => g.ellipse(120, 42, 52, 10, 0, 0, TAU), 3);
      shape(g, SILVER(g, 116, 160), () => path(g, [[112, 114], [128, 114], [124, 160], [116, 160]]), 3);
      shape(g, BRASS(g, 156, 180), () => g.ellipse(120, 168, 40, 10, 0, 0, TAU), 3);
      g.fillStyle = BLOOD(g, 46, 100); g.beginPath(); g.moveTo(150, 46); g.quadraticCurveTo(160, 70, 152, 96); g.lineTo(158, 96); g.quadraticCurveTo(166, 70, 156, 46); g.fill();
      for (const x of [86, 120, 154]) { shape(g, '#c0182a', () => g.arc(x, 76, 6, 0, TAU), 2); }
    } },
    // Eclipse Blade: a black sword ringed by an eclipsed moon's corona.
    eclipseblade: { theme: 'legendary', draw(g) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,60,40,0.9)'; g.lineWidth = 6; g.shadowColor = '#ff2a20'; g.shadowBlur = 20; g.beginPath(); g.arc(120, 96, 52, 0, TAU); g.stroke(); g.restore();
      shape(g, '#0a0204', () => g.arc(120, 96, 48, 0, TAU), 3);
      g.save(); g.translate(120, 100); g.rotate(-0.78);
      shape(g, grad(g, -10, 0, 10, 0, [[0, '#2a2a34'], [0.5, '#8a8a9a'], [1, '#1a1a22']]), () => path(g, [[-7, 40], [-7, -78], [0, -96], [7, -78], [7, 40]]), 3);
      g.strokeStyle = '#ff3040'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -80); g.lineTo(0, 34); g.stroke();
      shape(g, BRASS(g, 36, 48), () => g.rect(-28, 38, 56, 10), 3);
      shape(g, '#3a1a10', () => g.rect(-6, 48, 12, 34), 3);
      shape(g, BLOOD(g, 80, 96), () => g.arc(0, 88, 8, 0, TAU), 3);
      g.restore();
    } },
  });

  // ---------- map icons and event banners for the later areas' places ----------
  // Round painted icons in a brass ring, like the painted map icons.
  const ICONS = {
    shrine: { sky: ['#0b2a3a', '#041020'], draw(g) {
      for (const [c, y] of [['rgba(93,255,168,0.5)', 22], ['rgba(192,140,255,0.45)', 32]]) { g.fillStyle = c; g.beginPath(); g.moveTo(10, y); g.bezierCurveTo(40, y - 12, 60, y + 12, 86, y - 4); g.lineTo(86, y + 6); g.bezierCurveTo(60, y + 22, 40, y, 10, y + 10); g.fill(); }
      shape(g, '#2a3a4a', () => path(g, [[20, 78], [76, 78], [68, 66], [28, 66]]), 2);
      shape(g, CRYSTAL(g, 36, 66), () => path(g, [[48, 30], [58, 66], [38, 66]]), 2); glow(g, 48, 48, 26, 'rgba(140,255,220,0.5)');
    } },
    spire: { sky: ['#1a1240', '#060418'], draw(g) {
      shape(g, '#3a3050', () => path(g, [[40, 84], [44, 34], [48, 18], [52, 34], [56, 84]]), 2);
      rune(g, 48, 40, 12, '#c9a2ff'); rune(g, 28, 58, 7); rune(g, 70, 62, 8);
    } },
    starchart: { sky: ['#0a1a3a', '#030812'], draw(g) {
      shape(g, '#e8dcb8', () => path(g, [[18, 70], [48, 60], [78, 70], [78, 42], [48, 32], [18, 42]]), 2);
      g.strokeStyle = '#5a4a3a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(48, 32); g.lineTo(48, 60); g.stroke();
      for (const [x, y] of [[28, 46], [36, 54], [60, 44], [68, 56], [54, 50]]) sparkle(g, x, y, 3, '#3a6ad8');
      for (const [x, y] of [[20, 20], [74, 16], [50, 14]]) sparkle(g, x, y, 4);
    } },
    bloodaltar: { sky: ['#4a0a10', '#120204'], draw(g) {
      moon(g, 48, 30, 16);
      shape(g, '#1e1014', () => path(g, [[20, 82], [28, 58], [68, 58], [76, 82]]), 2);
      shape(g, '#2e1a20', () => g.rect(22, 52, 52, 8), 2);
      g.fillStyle = '#c0182a'; g.beginPath(); g.moveTo(40, 58); g.quadraticCurveTo(44, 70, 40, 82); g.lineTo(46, 82); g.quadraticCurveTo(48, 70, 46, 58); g.fill();
    } },
    crypt: { sky: ['#2a0a12', '#080204'], draw(g) {
      shape(g, '#2a2228', () => path(g, [[16, 84], [16, 48], [30, 36], [30, 24], [34, 14], [38, 24], [38, 36], [60, 36], [80, 50], [80, 84]]), 2);
      g.fillStyle = 'rgba(255,60,50,0.7)'; for (const x of [44, 56, 68]) { g.beginPath(); g.moveTo(x, 62); g.lineTo(x, 54); g.lineTo(x + 3, 50); g.lineTo(x + 6, 54); g.lineTo(x + 6, 62); g.fill(); }
      shape(g, '#100608', () => path(g, [[22, 84], [22, 66], [28, 60], [34, 66], [34, 84]]), 2);
      bat(g, 64, 22, 1.3); bat(g, 76, 30, 0.9);
    } },
    moonwell: { sky: ['#3a0810', '#0a0204'], draw(g) {
      moon(g, 48, 26, 13);
      shape(g, SILVER(g, 56, 82), () => g.ellipse(48, 68, 30, 12, 0, 0, TAU), 2);
      shape(g, '#0a0610', () => g.ellipse(48, 66, 24, 8, 0, 0, TAU), 2);
      g.fillStyle = 'rgba(255,80,60,0.75)'; g.beginPath(); g.ellipse(48, 66, 8, 3, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,90,70,0.25)'; g.beginPath(); g.moveTo(42, 34); g.lineTo(54, 34); g.lineTo(60, 64); g.lineTo(36, 64); g.fill();
    } },
  };
  function nodeIcon(id) {
    const key = 'icon:' + id;
    if (cache[key]) return cache[key];
    const p = ICONS[id];
    if (!p) return null;
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d');
    g.save(); g.beginPath(); g.arc(48, 48, 40, 0, TAU); g.clip();
    g.fillStyle = rgrad(g, 48, 40, 50, [[0, p.sky[0]], [1, p.sky[1]]]); g.fillRect(0, 0, 96, 96);
    g.lineJoin = 'round'; p.draw(g);
    g.restore();
    g.lineWidth = 7; g.strokeStyle = BRASS(g, 8, 88); g.beginPath(); g.arc(48, 48, 42, 0, TAU); g.stroke();
    g.lineWidth = 2; g.strokeStyle = INK; g.beginPath(); g.arc(48, 48, 45.5, 0, TAU); g.stroke(); g.beginPath(); g.arc(48, 48, 38.5, 0, TAU); g.stroke();
    for (let i = 0; i < 8; i++) rivet(g, 48 + Math.cos((i * TAU) / 8) * 42, 48 + Math.sin((i * TAU) / 8) * 42, 2.5);
    cache[key] = c.toDataURL('image/png');
    return cache[key];
  }
  // Wide painted banners heading the later areas' places.
  const BANNERS = {
    shrine: { sky: ['#03101e', '#0c3040'], draw(g, w, h) {
      auroraBands(g, w, h, ['rgba(93,255,168,', 'rgba(79,216,255,', 'rgba(192,140,255,']);
      island(g, w * 0.5, h * 0.86, 150, '#1c2a3a');
      shape(g, '#2a3a4a', () => path(g, [[w * 0.5 - 60, h * 0.78], [w * 0.5 + 60, h * 0.78], [w * 0.5 + 44, h * 0.66], [w * 0.5 - 44, h * 0.66]]), 3);
      shape(g, CRYSTAL(g, h * 0.2, h * 0.66), () => path(g, [[w * 0.5, h * 0.18], [w * 0.5 + 20, h * 0.66], [w * 0.5 - 20, h * 0.66]]), 3);
      glow(g, w * 0.5, h * 0.45, 120, 'rgba(140,255,220,0.35)');
    } },
    spire: { sky: ['#080418', '#2a1a50'], draw(g, w, h) {
      auroraBands(g, w, h, ['rgba(192,140,255,', 'rgba(140,120,255,', 'rgba(93,255,168,']);
      island(g, w * 0.5, h * 0.9, 120, '#1a1430');
      shape(g, '#3a3050', () => path(g, [[w * 0.5 - 26, h * 0.86], [w * 0.5 - 14, h * 0.2], [w * 0.5, h * 0.04], [w * 0.5 + 14, h * 0.2], [w * 0.5 + 26, h * 0.86]]), 3);
      for (const [x, y, r, c] of [[0.5, 0.26, 22, '#c9a2ff'], [0.36, 0.42, 14, '#9fffe8'], [0.64, 0.5, 16, '#9fffe8'], [0.28, 0.7, 10, '#c9a2ff'], [0.72, 0.3, 11, '#c9a2ff']]) rune(g, w * x, h * y, r, c);
    } },
    starchart: { sky: ['#020610', '#0c1a40'], draw(g, w, h) {
      for (let i = 0; i < 140; i++) sparkle(g, Math.random() * w, Math.random() * h * 0.7, Math.random() * 2.5 + 0.5, i % 5 ? '#fff6d0' : '#9fe8ff');
      g.strokeStyle = 'rgba(160,200,255,0.4)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(w * 0.2, h * 0.2); g.lineTo(w * 0.32, h * 0.3); g.lineTo(w * 0.45, h * 0.18); g.lineTo(w * 0.6, h * 0.28); g.stroke();
      island(g, w * 0.55, h * 0.92, 170, '#1a2030');
      g.save(); g.translate(w * 0.55, h * 0.7); g.rotate(-0.5);
      shape(g, BRASS(g, -12, 12), () => g.rect(-10, -10, 120, 20), 3);
      shape(g, BRASS(g, -16, 16), () => g.rect(104, -15, 22, 30), 3);
      g.restore();
      shape(g, BRASS(g, h * 0.7, h * 0.86), () => path(g, [[w * 0.53, h * 0.72], [w * 0.47, h * 0.86], [w * 0.5, h * 0.86], [w * 0.55, h * 0.74], [w * 0.6, h * 0.86], [w * 0.63, h * 0.86]]), 2);
    } },
  };
  // The Blood Moon's places: a red moon over gothic silhouettes and fog.
  function bloodSky(g, w, h, mx = 0.72) {
    moon(g, w * mx, h * 0.34, h * 0.26);
    for (let i = 0; i < 6; i++) bat(g, w * (0.2 + Math.random() * 0.6), h * (0.12 + Math.random() * 0.3), 1 + Math.random());
    for (let b = 0; b < 2; b++) { const y = h * (0.78 + b * 0.1); const gr = grad(g, 0, y - 30, 0, y + 30, [[0, 'rgba(160,20,30,0)'], [0.5, 'rgba(160,20,30,0.35)'], [1, 'rgba(160,20,30,0)']]); g.fillStyle = gr; g.fillRect(0, y - 30, w, 60); }
  }
  BANNERS.bloodaltar = { sky: ['#0a0204', '#3a0810'], draw(g, w, h) {
    bloodSky(g, w, h, 0.5);
    island(g, w * 0.5, h * 0.92, 160, '#160a0c');
    shape(g, '#1e1014', () => path(g, [[w * 0.5 - 90, h * 0.86], [w * 0.5 - 70, h * 0.6], [w * 0.5 + 70, h * 0.6], [w * 0.5 + 90, h * 0.86]]), 3);
    shape(g, '#2e1a20', () => g.rect(w * 0.5 - 84, h * 0.55, 168, 16), 3);
    g.fillStyle = BLOOD(g, h * 0.6, h * 0.9); g.beginPath(); g.moveTo(w * 0.5 - 30, h * 0.62); g.quadraticCurveTo(w * 0.5 - 20, h * 0.75, w * 0.5 - 34, h * 0.88); g.lineTo(w * 0.5 - 14, h * 0.88); g.quadraticCurveTo(w * 0.5 - 6, h * 0.75, w * 0.5 - 12, h * 0.62); g.fill();
  } };
  BANNERS.crypt = { sky: ['#050103', '#2a060c'], draw(g, w, h) {
    bloodSky(g, w, h, 0.2);
    island(g, w * 0.58, h * 0.95, 200, '#120809');
    shape(g, '#221a20', () => path(g, [[w * 0.38, h * 0.88], [w * 0.38, h * 0.5], [w * 0.44, h * 0.38], [w * 0.44, h * 0.14], [w * 0.46, h * 0.02], [w * 0.48, h * 0.14], [w * 0.48, h * 0.38], [w * 0.7, h * 0.38], [w * 0.78, h * 0.52], [w * 0.78, h * 0.88]]), 3);
    g.fillStyle = 'rgba(255,60,50,0.7)';
    for (let i = 0; i < 5; i++) { const x = w * (0.52 + i * 0.05); g.beginPath(); g.moveTo(x, h * 0.66); g.lineTo(x, h * 0.54); g.lineTo(x + 6, h * 0.48); g.lineTo(x + 12, h * 0.54); g.lineTo(x + 12, h * 0.66); g.fill(); }
    g.save(); g.translate(w * 0.28, h * 0.62); g.rotate(-0.3); shape(g, '#1a1418', () => g.rect(-80, -10, 130, 26), 3); g.restore();
  } };
  BANNERS.moonwell = { sky: ['#0a0204', '#2a060a'], draw(g, w, h) {
    moon(g, w * 0.5, h * 0.3, h * 0.24);
    g.fillStyle = 'rgba(255,90,70,0.18)'; g.beginPath(); g.moveTo(w * 0.46, h * 0.5); g.lineTo(w * 0.54, h * 0.5); g.lineTo(w * 0.62, h * 0.78); g.lineTo(w * 0.38, h * 0.78); g.fill();
    island(g, w * 0.5, h * 0.95, 180, '#140a0c');
    shape(g, SILVER(g, h * 0.7, h * 0.88), () => g.ellipse(w * 0.5, h * 0.8, 110, 22, 0, 0, TAU), 3);
    shape(g, '#0a0610', () => g.ellipse(w * 0.5, h * 0.79, 96, 16, 0, 0, TAU), 3);
    g.fillStyle = 'rgba(255,70,60,0.8)'; g.beginPath(); g.ellipse(w * 0.5, h * 0.79, 30, 6, 0, 0, TAU); g.fill();
  } };
  function auroraBands(g, w, h, cols) {
    g.save(); g.globalCompositeOperation = 'lighter';
    cols.forEach((c, b) => {
      for (let x = 0; x < w; x += 4) {
        const top = h * (0.06 + b * 0.1) + Math.sin(x * 0.01 + b * 2) * h * 0.06;
        const a = 0.12 + 0.12 * Math.sin(x * 0.05 + b);
        const gr = g.createLinearGradient(0, top, 0, top + h * 0.32);
        gr.addColorStop(0, c + '0)'); gr.addColorStop(0.3, c + a + ')'); gr.addColorStop(1, c + '0)');
        g.fillStyle = gr; g.fillRect(x, top, 4, h * 0.32);
      }
    });
    g.restore();
  }
  function island(g, x, y, r, col) {
    shape(g, col, () => { g.moveTo(x - r, y - r * 0.18); g.quadraticCurveTo(x, y - r * 0.32, x + r, y - r * 0.18); g.quadraticCurveTo(x + r * 0.4, y + r * 0.5, x, y + r * 0.7); g.quadraticCurveTo(x - r * 0.4, y + r * 0.5, x - r, y - r * 0.18); }, 3);
  }
  function banner(id) {
    const key = 'banner:' + id;
    if (cache[key]) return cache[key];
    const p = BANNERS[id];
    if (!p) return null;
    const w = 760, h = 220;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = grad(g, 0, 0, 0, h, [[0, p.sky[0]], [1, p.sky[1]]]); g.fillRect(0, 0, w, h);
    g.lineJoin = 'round'; p.draw(g, w, h);
    g.fillStyle = grad(g, 0, h * 0.6, 0, h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]); g.fillRect(0, 0, w, h);
    cache[key] = c.toDataURL('image/jpeg', 0.86);
    return cache[key];
  }

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

  window.CardshipsArtGen = {
    cardArt, has: (id) => !!PAINT[id], PAINT,
    nodeIcon, hasIcon: (id) => !!ICONS[id], ICONS,
    banner, hasBanner: (id) => !!BANNERS[id], BANNERS,
    helpers: { path, shape, grad, rgrad, rivet, glow, bolt, sparkle, rune, auroraBands, island, BRASS, IRON, CRYSTAL, VIOLET, INK },
  };
})();
