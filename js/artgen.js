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
