// Side-on 2D ship art. The player's ship is assembled from the installed modules: the Core is the
// central gondola, modules bolt on left (stern) and right (bow), and the gasbag envelope stretches
// to fit. Enemy ships are drawn per type, and bosses change shape between phases.
// Everything is flat, outlined canvas drawing in one brass-and-iron palette.
(function () {
  const C = {
    out: '#24170f', brass: '#d4a24c', brassD: '#9c7230', brassL: '#f0cf84', copper: '#c0693a', copperD: '#8a4526',
    iron: '#666b70', ironD: '#43474c', ironL: '#8d9399', wood: '#8a5a35', woodD: '#5e3b22', canvas: '#eadfc4', canvasD: '#c3b08b',
    glass: '#ffe7a6', red: '#b8402c', redD: '#7c2619', green: '#62ad74', teal: '#4f9a8f', blue: '#5d8fb8', violet: '#8c6bb5', soot: '#2c241f',
  };
  const SPR = () => window.CardshipsSprites;
  const M = 46; // module width (units)
  const H = 30; // hull band height
  const CORE_W = 70;
  const GAP = 4;
  const DECK_STEP = H + 14; // deck modules stack upward from the Core, leaving room for their pips
  // Where a slot sits relative to the Core: the stern runs back (left), the bow forward (right),
  // and the deck tower stacks up on top of the Core.
  function slotXY(side, idx) {
    if (side === 'deck') return { x: 0, y: -(H + 8) - idx * DECK_STEP };
    return { x: (side === 'stern' ? -1 : 1) * (CORE_W / 2 + GAP + M / 2 + idx * (M + GAP)), y: 0 };
  }
  // The point between slots where an install bolt goes (pos = index the new part would take).
  function boltXY(side, pos, end) {
    if (side === 'deck') return { x: 0, y: -(H / 2 + 4) - pos * DECK_STEP - (end ? DECK_STEP / 2 : 0) };
    const dir = side === 'stern' ? -1 : 1;
    return { x: dir * (CORE_W / 2 + GAP / 2 + pos * (M + GAP) + (end ? M / 2 : 0)), y: 0 };
  }
  const TAU = Math.PI * 2;

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

  // ---------- module art (local coords: box centred at 0,0; +x points outward) ----------
  const MODULES = {
    harpoon(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.wood, C.woodD);
      rivets(g, -M / 2 + 4, M / 2 - 4, -H / 2 + 5, 5);
      g.save(); g.translate(2, -H / 2 - 2); g.rotate(-0.12 - m.recoil * 0.2);
      rr(g, -10, -5, 26 - m.recoil * 6, 8, 3); shape(g, C.iron);
      g.beginPath(); g.moveTo(16 - m.recoil * 6, -7); g.lineTo(26 - m.recoil * 6, -1); g.lineTo(16 - m.recoil * 6, 5); g.closePath(); shape(g, C.ironL, 1.5);
      g.restore();
      circle(g, -10, -2, 6, C.brass); g.strokeStyle = C.brassD; g.lineWidth = 1.2; g.beginPath(); g.arc(-10, -2, 3.5, 0, TAU); g.stroke();
    },
    cannon(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.wood, C.woodD);
      rivets(g, -M / 2 + 4, M / 2 - 4, H / 2 - 4, 5);
      const k = m.recoil * 9;
      rr(g, -4 - k, -8, 34, 11, 4); shape(g, C.ironD);
      rr(g, 24 - k, -9.5, 7, 14, 2); shape(g, C.iron);
      rr(g, 4 - k, -9, 4, 13, 1); shape(g, C.brass, 1.2);
      circle(g, -8, 6, 6, C.wood); circle(g, -8, 6, 2, C.brass, 1);
    },
    mortar(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.iron, C.ironD);
      g.save(); g.translate(0, -H / 2); g.rotate(-0.55);
      rr(g, -7, -22 + m.recoil * 4, 14, 26, 3); shape(g, C.ironD);
      rr(g, -9, -24 + m.recoil * 4, 18, 6, 2); shape(g, C.brass);
      g.restore();
      rivets(g, -M / 2 + 4, M / 2 - 4, H / 2 - 5, 6);
    },
    flamethrower(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.iron, C.ironD);
      rr(g, -18, -H / 2 - 12, 16, 22, 7); shape(g, C.red); g.fillStyle = C.redD; g.fillRect(-16, -H / 2 + 2, 12, 3);
      rr(g, 0 - m.recoil * 4, -6, 26, 7, 3); shape(g, C.copper);
      g.beginPath(); g.moveTo(26 - m.recoil * 4, -8); g.lineTo(32 - m.recoil * 4, -10); g.lineTo(32 - m.recoil * 4, 3); g.lineTo(26 - m.recoil * 4, 1); g.closePath(); shape(g, C.copperD, 1.5);
      const f = 3 + Math.sin(t * 20) * 1.5;
      g.fillStyle = '#ffb347'; g.beginPath(); g.ellipse(35 - m.recoil * 4, -3.5, f, 2.5, 0, 0, TAU); g.fill();
    },
    gatling(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.iron, C.ironD);
      circle(g, -12, -H / 2 - 4, 8, C.green);
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(-15, -H / 2 - 9, 3, 6);
      const spin = t * (m.recoil > 0.05 ? 40 : 3);
      for (let i = 0; i < 3; i++) { const y = -4 + Math.sin(spin + (i * TAU) / 3) * 4; rr(g, 2, y - 2, 26, 4, 2); shape(g, i === 0 ? C.ironL : C.iron, 1.2); }
      circle(g, 2, -4, 6, C.brass);
    },
    grenadiers(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.wood, C.woodD);
      for (let i = 0; i < 3; i++) { rr(g, -16 + i * 11, -H / 2 - 12, 9, 14, 4); shape(g, i === 1 ? C.violet : '#7a9a6a', 1.5); rr(g, -14 + i * 11, -H / 2 - 15, 5, 4, 1); shape(g, C.iron, 1); }
      rr(g, 10 - m.recoil * 4, -2, 16, 6, 2); shape(g, C.iron);
    },
    sniper(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.wood, C.woodD);
      g.strokeStyle = C.out; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -H / 2); g.lineTo(-8, -H / 2 - 18); g.moveTo(8, -H / 2); g.lineTo(8, -H / 2 - 18); g.stroke();
      rr(g, -14, -H / 2 - 22, 28, 6, 2); shape(g, C.brass);
      rr(g, -4 - m.recoil * 4, -H / 2 - 30, 40, 4, 2); shape(g, C.ironD, 1.5);
      rr(g, 4 - m.recoil * 4, -H / 2 - 36, 12, 5, 2); shape(g, C.brass, 1.2);
      g.fillStyle = '#9fd8ff'; g.fillRect(14 - m.recoil * 4, -H / 2 - 35, 2, 3);
    },
    tesla(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.iron, C.ironD);
      rr(g, -5, -H / 2 - 26, 10, 26, 2); shape(g, C.ironD);
      for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(0, -H / 2 - 6 - i * 6, 10 - i, 3, 0, 0, TAU); shape(g, C.copper, 1.4); }
      circle(g, 0, -H / 2 - 30, 6, C.brassL);
      if (Math.sin(t * 9) > 0.3 || m.recoil > 0.1) {
        g.strokeStyle = '#bfe6ff'; g.lineWidth = 1.5; g.shadowColor = '#7fc8ff'; g.shadowBlur = 8;
        g.beginPath(); g.moveTo(0, -H / 2 - 30); for (let i = 1; i < 5; i++) g.lineTo((Math.random() - 0.5) * 18, -H / 2 - 30 - i * 4 + (Math.random() - 0.5) * 6); g.stroke();
        g.shadowBlur = 0;
      }
    },
    plating(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.iron, C.ironD);
      // Riveted brass plates layered on the outer face.
      g.beginPath(); g.moveTo(M / 2 - 14, -H / 2 - 5); g.lineTo(M / 2 + 4, -H / 2 + 1); g.lineTo(M / 2 + 4, H / 2 - 1); g.lineTo(M / 2 - 14, H / 2 + 5); g.closePath(); shape(g, C.brass);
      g.beginPath(); g.moveTo(M / 2 - 24, -H / 2 - 3); g.lineTo(M / 2 - 12, -H / 2 - 1); g.lineTo(M / 2 - 12, H / 2 + 1); g.lineTo(M / 2 - 24, H / 2 + 3); g.closePath(); shape(g, C.brassD);
      rivets(g, M / 2 - 10, M / 2 + 2, -H / 2 + 4, 2, C.out); rivets(g, M / 2 - 10, M / 2 + 2, H / 2 - 4, 2, C.out);
      rivets(g, -M / 2 + 4, M / 2 - 26, 0, 3);
    },
    bulwark(g, m, t) {
      panel(g, -M / 2, -H / 2 - 4, M, H + 8, C.ironD, '#2e3135');
      g.beginPath(); g.moveTo(M / 2 - 6, -H / 2 - 10); g.lineTo(M / 2 + 10, -4); g.lineTo(M / 2 + 10, 4); g.lineTo(M / 2 - 6, H / 2 + 10); g.closePath(); shape(g, C.iron);
      for (const y of [-H / 2 + 2, 0, H / 2 - 2]) rivets(g, -M / 2 + 5, M / 2 - 8, y, 4, C.ironL);
    },
    deflector(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.iron, C.ironD);
      g.save(); g.translate(M / 2 - 4, -2); g.rotate(m.braced ? 0 : Math.sin(t * 2) * 0.15 - 0.8);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(6, -20); g.quadraticCurveTo(14, 0, 6, 20); g.closePath(); shape(g, C.brass);
      g.restore();
      circle(g, M / 2 - 4, -2, 4, C.copper);
    },
    repair(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.teal, '#3a7469');
      g.strokeStyle = C.out; g.lineWidth = 3; g.beginPath(); g.moveTo(-10, -H / 2); g.lineTo(-10, -H / 2 - 18); g.lineTo(10, -H / 2 - 22); g.stroke();
      g.strokeStyle = C.brass; g.lineWidth = 2; g.beginPath(); g.moveTo(-10, -H / 2); g.lineTo(-10, -H / 2 - 18); g.lineTo(10, -H / 2 - 22); g.stroke();
      const sw = Math.sin(t * 1.5) * 3;
      g.strokeStyle = C.out; g.lineWidth = 1; g.beginPath(); g.moveTo(10, -H / 2 - 22); g.lineTo(10 + sw, -H / 2 - 10); g.stroke();
      g.beginPath(); g.arc(10 + sw, -H / 2 - 8, 3, 0, Math.PI); g.stroke();
      g.fillStyle = '#e8f6e8'; g.fillRect(-5, -4, 10, 3); g.fillRect(-1.5, -7.5, 3, 10);
    },
    quarters(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.wood, C.woodD);
      for (let i = 0; i < 3; i++) porthole(g, -14 + i * 14, -2, 4, (Math.sin(t * 0.7 + i * 2 + hash(m.uid) * 9) > -0.6) ? 1 : 0);
      rr(g, -M / 2 + 2, -H / 2 - 6, M - 4, 6, 2); shape(g, C.woodD, 1.5);
    },
    boiler(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.iron, C.ironD);
      g.beginPath(); g.ellipse(0, -H / 2 - 4, 16, 14, 0, 0, TAU); shape(g, C.copper);
      g.fillStyle = C.copperD; g.fillRect(-15, -H / 2 - 2, 30, 3);
      gauge(g, 0, -H / 2 - 6, 5, -1.6 + Math.sin(t * 3) * 0.4);
      rr(g, 9, -H / 2 - 24, 5, 10, 1); shape(g, C.iron, 1.5);
    },
    sprinkler(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.iron, C.ironD);
      rr(g, -16, -H / 2 - 16, 22, 18, 8); shape(g, C.blue);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-13, -H / 2 - 13, 3, 10);
      g.strokeStyle = C.out; g.lineWidth = 2.5; g.beginPath(); g.moveTo(6, -H / 2 - 8); g.lineTo(16, -H / 2 - 8); g.lineTo(16, -H / 2 + 2); g.stroke();
      g.strokeStyle = C.copper; g.lineWidth = 1.5; g.stroke();
    },
    scrubber(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.iron, C.ironD);
      circle(g, -4, -H / 2 - 6, 11, C.ironL);
      g.save(); g.translate(-4, -H / 2 - 6); g.rotate(t * 6);
      g.fillStyle = C.ironD; for (let i = 0; i < 4; i++) { g.rotate(TAU / 4); g.beginPath(); g.ellipse(0, -5, 2.5, 5, 0, 0, TAU); g.fill(); }
      g.restore();
      rr(g, 9, -H / 2 - 12, 8, 12, 2); shape(g, '#8fb3a0', 1.5);
    },
    telescope(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.wood, C.woodD);
      const ext = m.outer ? 1 : 0.35;
      g.save(); g.translate(-6, -H / 2 - 4); g.rotate(-0.35);
      rr(g, -6, -5, 16, 10, 3); shape(g, C.brassD);
      rr(g, 8, -4, 12 * ext + 4, 8, 2); shape(g, C.brass);
      rr(g, 10 + 12 * ext, -3, 10 * ext + 3, 6, 2); shape(g, C.brassL);
      g.restore();
      g.strokeStyle = C.out; g.lineWidth = 2; g.beginPath(); g.moveTo(-6, -H / 2 - 2); g.lineTo(-6, -H / 2); g.stroke();
    },
    gasbag(g, m, t) {
      rr(g, -M / 2 + 6, -H / 2 + 6, M - 12, H - 10, 4); shape(g, C.wood);
      const inflate = 0.85 + Math.sin(t * 1.3 + hash(m.uid) * 6) * 0.04;
      g.strokeStyle = C.out; g.lineWidth = 1; g.beginPath(); g.moveTo(-12, -H / 2 + 6); g.lineTo(-14, -H / 2 - 12); g.moveTo(12, -H / 2 + 6); g.lineTo(14, -H / 2 - 12); g.stroke();
      g.beginPath(); g.ellipse(0, -H / 2 - 26, 24 * inflate, 16 * inflate, 0, 0, TAU); shape(g, '#e7b7a2');
      g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, -H / 2 - 26, 12 * inflate, 16 * inflate, 0, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-8, -H / 2 - 32, 6, 4, -0.4, 0, TAU); g.fill();
    },
    propeller(g, m, t) {
      panel(g, -M / 2, -H / 2 + 4, M - 8, H - 8, C.iron, C.ironD);
      rr(g, M / 2 - 12, -4, 10, 8, 2); shape(g, C.brass);
      prop(g, M / 2 + 2, 0, 22, t, 26);
    },
    lightningrod(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.iron, C.ironD);
      g.strokeStyle = C.out; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -H / 2); g.lineTo(0, -H / 2 - 34); g.stroke();
      g.strokeStyle = C.copper; g.lineWidth = 2; g.stroke();
      for (const y of [-H / 2 - 14, -H / 2 - 26]) circle(g, 0, y, 3.5, C.copper, 1.5);
      circle(g, 0, -H / 2 - 36, 4.5, C.brassL, 1.5);
    },
    cargo(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.wood, C.woodD);
      for (const [x, y, w] of [[-16, -H / 2 - 10, 14], [-1, -H / 2 - 10, 12], [-10, -H / 2 - 20, 12]]) { rr(g, x, y, w, 10, 1); shape(g, '#b98c56', 1.5); g.strokeStyle = C.woodD; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + 10); g.stroke(); }
      g.strokeStyle = C.out; g.lineWidth = 1.5; g.strokeRect(-8, -6, 16, 12);
    },
    hatch(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.wood, C.woodD);
      g.save(); g.translate(-10, -H / 2); g.rotate(-0.9 - Math.sin(t) * 0.05);
      rr(g, 0, -3, 22, 5, 1); shape(g, C.brass, 1.5);
      g.restore();
      g.strokeStyle = C.out; g.lineWidth = 1.5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-14, -8 + i * 5); g.lineTo(-4, -8 + i * 5); g.stroke(); }
    },
    autoloader(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.iron, C.ironD);
      for (const [x, r, dir] of [[-12, 8, 1], [6, 6, -1]]) {
        g.save(); g.translate(x, -H / 2 - 2); g.rotate(t * 2 * dir);
        g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; const rr2 = i % 2 ? r : r + 2.5; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.closePath(); shape(g, C.brass, 1.2);
        g.restore();
      }
      for (let i = 0; i < 4; i++) { const x = -18 + ((t * 18 + i * 10) % 38); rr(g, x, 4, 5, 8, 2); shape(g, C.copper, 1); }
    },
    gyro(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.iron, C.ironD);
      g.save(); g.translate(0, -H / 2 - 10);
      g.strokeStyle = C.brass; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(0, 0, 13, 13 * Math.abs(Math.cos(t * 3)), 0, 0, TAU); g.stroke();
      g.beginPath(); g.ellipse(0, 0, 13 * Math.abs(Math.sin(t * 2.3)), 13, 0, 0, TAU); g.stroke();
      circle(g, 0, 0, 4, C.copper, 1.5);
      g.restore();
    },
    heart(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.copperD, '#5f2f1b');
      const beat = 1 + Math.max(0, Math.sin(t * 5)) * 0.15;
      g.save(); g.translate(0, -2); g.scale(beat, beat);
      g.beginPath(); g.moveTo(0, 8); g.bezierCurveTo(-14, -2, -8, -14, 0, -6); g.bezierCurveTo(8, -14, 14, -2, 0, 8); shape(g, C.red, 1.5);
      g.restore();
      g.fillStyle = `rgba(255,120,90,${0.25 + Math.max(0, Math.sin(t * 5)) * 0.3})`; g.beginPath(); g.arc(0, -2, 16, 0, TAU); g.fill();
    },
    overpressure(g, m, t) {
      panel(g, -M / 2, -H / 2, M, H, C.copper, C.copperD);
      gauge(g, -8, -H / 2 - 8, 8, -0.4 + Math.sin(t * 17) * 0.2);
      rr(g, 6, -H / 2 - 16, 8, 16, 2); shape(g, C.iron, 1.5);
      circle(g, 10, -H / 2 - 18, 4, Math.sin(t * 6) > 0 ? '#ff5a3c' : C.redD, 1.5);
    },
  };

  // Modules drawn with the provided sprites, over a small deck mount. Sprites face left in the sheet,
  // so they are flipped to face outward (+x).
  const mount = (g, fill = C.wood, dark = C.woodD) => panel(g, -M / 2, -2, M, H / 2 + 2, fill, dark, 3);
  const MODULE_SPRITES = {
    cannon(g, m) { mount(g); return SPR().draw(g, 'cannon_a', 6 - m.recoil * 8, -8, 42, null, true); },
    mortar(g, m) { mount(g, C.iron, C.ironD); return SPR().draw(g, 'turret_c', 0, -10 + m.recoil * 3, 36, null, true); },
    harpoon(g, m) { mount(g); SPR().draw(g, 'turret_e', -10, -8, 26, null, true); return SPR().draw(g, 'harpoon', 12 - m.recoil * 8, -12, 44, null, true); },
    boiler(g) { mount(g, C.iron, C.ironD); return SPR().draw(g, 'engine_small', 0, -14, 36); },
    overpressure(g) { mount(g, C.copper, C.copperD); return SPR().draw(g, 'engine_box', 0, -16, 36); },
    autoloader(g) { mount(g, C.iron, C.ironD); return SPR().draw(g, 'engine_turbine', 0, -10, 46, null, true); },
    quarters(g) { mount(g); return SPR().draw(g, 'cabin_small', 0, -14, 30); },
    cargo(g) { mount(g); return SPR().draw(g, 'cabin_big', 0, -14, 38); },
    gasbag(g, m, t) {
      mount(g);
      g.strokeStyle = C.out; g.lineWidth = 1; g.beginPath(); g.moveTo(-12, 0); g.lineTo(-14, -20); g.moveTo(12, 0); g.lineTo(14, -20); g.stroke();
      return SPR().draw(g, 'balloon_red', 0, -32 + Math.sin(t * 1.3 + hash(m.uid) * 6) * 1.5, 52);
    },
    propeller(g, m, t) {
      mount(g, C.iron, C.ironD);
      g.save(); g.translate(M / 2 + 2, 2); g.scale(0.35, 1); g.rotate(t * 18);
      const ok = SPR().draw(g, 'prop_a', 0, 0, 34);
      g.restore();
      return ok;
    },
  };

  // ---------- the player's ship ----------
  const CORE_BALLOON = { airship: 'balloon_green', battleship: 'balloon_stripe_red', zeppelin: 'balloon_blue', clockwork: 'balloon_net' };
  const CORE_HULL = { airship: 'hull_wood', battleship: 'hull_iron', zeppelin: 'hull_trim', clockwork: 'hull_trim' };
  const ENVELOPES = { airship: '#eadfc4', battleship: '#b8ab92', zeppelin: '#c9cfd4', clockwork: '#d49a63' };
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
      this.x = 0; this.y = 0; this.scale = 1;
    }
    // Brings the visual model in line with the game. New modules bolt on; missing ones are
    // either already falling (destroyed) or quietly removed (scrapped, detached).
    sync(game) {
      this.coreId = game.core.id;
      this.coreHp = game.core.hp; this.coreMax = game.maxHp(game.core);
      this.coreTokens = { ...game.core.tokens };
      const seen = new Set();
      for (const side of ['stern', 'deck', 'bow']) {
        game[side].forEach((card, idx) => {
          seen.add(card.uid);
          let m = this.mods.get(card.uid);
          if (!m) {
            m = { uid: card.uid, id: card.id, side, idx, x: null, install: this.ready ? 0 : 1, flash: 0, recoil: 0, smokeT: Math.random() };
            this.mods.set(card.uid, m);
          }
          m.side = side; m.idx = idx; m.hp = card.hp; m.max = game.maxHp(card); m.tokens = { ...card.tokens };
          m.outer = idx === game[side].length - 1; m.reload = card.reload;
          const at = slotXY(side, idx);
          m.tx = at.x; m.ty = at.y;
          if (m.x == null) { m.x = m.tx + (m.install < 1 && side !== 'deck' ? (side === 'stern' ? -40 : 40) : 0); m.y = m.ty; }
        });
      }
      for (const uid of [...this.mods.keys()]) if (!seen.has(uid)) this.mods.delete(uid);
      this.leftN = game.stern.length; this.rightN = game.bow.length; this.deckN = game.deck.length;
      this.ready = true;
    }
    // A destroyed module tears off and tumbles away.
    breakOff(uid, violent = true) {
      const m = this.mods.get(uid);
      if (!m) return;
      this.mods.delete(uid);
      if (!violent) return;
      const dir = m.side === 'stern' ? -1 : m.side === 'bow' ? 1 : Math.random() < 0.5 ? -1 : 1;
      this.debris.push({ m: { ...m }, x: m.x, y: m.y, vx: dir * (60 + Math.random() * 60), vy: -90, r: 0, vr: dir * (2 + Math.random() * 3), life: 3 });
      for (let i = 0; i < 10; i++) this.debris.push({ gear: true, x: m.x, y: m.y, vx: (Math.random() - 0.5) * 220, vy: -60 - Math.random() * 160, r: 0, vr: (Math.random() - 0.5) * 12, size: 3 + Math.random() * 5, life: 2.5, color: Math.random() < 0.5 ? C.brass : C.iron });
    }
    flash(uid) { if (uid === 'core') this.core.flash = 1; const m = this.mods.get(uid); if (m) m.flash = 1; }
    recoil(uid) { const m = this.mods.get(uid); if (m) m.recoil = 1; }
    // includeGhost=false gives the real ship, so a preview never re-centres or rescales it.
    extent(includeGhost = true) {
      const g = includeGhost ? this.ghost : null;
      const l = (this.leftN || 0) + (g && g.side === 'stern' ? 1 : 0), r = (this.rightN || 0) + (g && g.side === 'bow' ? 1 : 0);
      return { left: CORE_W / 2 + l * (M + GAP) + 10, right: CORE_W / 2 + r * (M + GAP) + 10 };
    }
    width() { const e = this.extent(false); return e.left + e.right + 50; }
    // Vertical reach above and below the Core (units), so layouts can fit the deck tower and envelope.
    bounds() { const d = this.deckN || 0; return { top: (this.envelopeTop || 150) + 12, bottom: 64 + d * 0 }; }
    // World position of a module (or the Core) in canvas pixels, for effects and arrows.
    pointOf(uid) {
      if (uid === 'core') return { x: this.x, y: this.y, r: CORE_W * this.scale * 0.5 };
      const m = this.mods.get(uid);
      if (!m) return null;
      return { x: this.x + (m.x + (m.shiftX || 0)) * this.scale * this.facing, y: this.y + (m.y + (m.shiftY || 0)) * this.scale, r: M * this.scale * 0.5 };
    }
    update(dt) {
      for (const m of this.mods.values()) {
        m.x += (m.tx - m.x) * Math.min(1, dt * 7);
        m.y += (m.ty - m.y) * Math.min(1, dt * 7);
        // Make room for a previewed install: modules at or beyond the slot slide outward.
        const g = this.ghost;
        const room = g && g.side === m.side && m.idx >= g.pos;
        const wantX = room && m.side !== 'deck' ? (m.side === 'stern' ? -1 : 1) * (M + GAP) : 0;
        const wantY = room && m.side === 'deck' ? -DECK_STEP : 0;
        m.shiftX = (m.shiftX || 0) + (wantX - (m.shiftX || 0)) * Math.min(1, dt * 9);
        m.shiftY = (m.shiftY || 0) + (wantY - (m.shiftY || 0)) * Math.min(1, dt * 9);
        if (m.install < 1) {
          m.install = Math.min(1, m.install + dt * 2.2);
          if (m.install >= 1) { this.boltSparks(m); if (PlayerShip.onClank) PlayerShip.onClank(m); }
        }
        m.flash = Math.max(0, m.flash - dt * 4);
        m.recoil = Math.max(0, m.recoil - dt * 4);
        if (m.hp / m.max <= 0.34 || m.tokens.fire) {
          m.smokeT -= dt;
          if (m.smokeT <= 0) { m.smokeT = m.tokens.fire ? 0.12 : 0.3; this.smoke.push({ x: m.x + (Math.random() - 0.5) * 20, y: m.y - H / 2, vx: -10 - Math.random() * 20, vy: -25 - Math.random() * 20, r: 3 + Math.random() * 3, life: 1.6, max: 1.6, dark: !m.tokens.fire || Math.random() < 0.5 }); }
        }
      }
      if (this.coreHp / this.coreMax <= 0.34) {
        this.coreSmokeT = (this.coreSmokeT || 0) - dt;
        if (this.coreSmokeT <= 0) { this.coreSmokeT = 0.2; this.smoke.push({ x: (Math.random() - 0.5) * 30, y: -H / 2, vx: -15, vy: -30, r: 4, life: 1.8, max: 1.8, dark: true }); }
      }
      // Steam puffs from the Core's vent.
      this.ventT = (this.ventT || 0) - dt;
      if (this.ventT <= 0) { this.ventT = 0.5 + Math.random() * 0.7; this.smoke.push({ x: -CORE_W * 0.18, y: -H / 2 - 12, vx: -12, vy: -26, r: 3, life: 1.3, max: 1.3, steam: true }); }
      this.core.flash = Math.max(0, this.core.flash - dt * 4);
      this.lunge = Math.max(0, (this.lunge || 0) - dt * 2.2);
      this.dodge = Math.max(0, (this.dodge || 0) - dt * 1.8);
      if (this.dying > 0) this.dying += dt;
      for (const p of this.smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 6; p.life -= dt; }
      this.smoke = this.smoke.filter((p) => p.life > 0);
      for (const d of this.debris) { d.vy += 380 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.r += d.vr * dt; d.life -= dt; }
      this.debris = this.debris.filter((d) => d.life > 0);
      for (const s of this.sparks) { s.vy += 300 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
      this.sparks = this.sparks.filter((s) => s.life > 0);
    }
    boltSparks(m) {
      for (let i = 0; i < 14; i++) this.sparks.push({ x: m.x + (m.side === 'stern' ? M / 2 : m.side === 'bow' ? -M / 2 : 0), y: m.y + (m.side === 'deck' ? H / 2 : (Math.random() - 0.5) * H), vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 140, life: 0.5 + Math.random() * 0.3 });
    }
    // Draws the ship with its Core at (x, y). facing 1 = bow to the right.
    draw(g, x, y, scale, t, opts = {}) {
      // Ram lunges forward, Evade hops up, defeat sends the hull tumbling down through the clouds.
      if (this.lunge > 0) x += Math.sin((1 - this.lunge) * Math.PI) * 46 * scale;
      if (this.dodge > 0) y -= Math.sin((1 - this.dodge) * Math.PI) * 34 * scale;
      let fall = 0;
      if (this.dying > 0) { y += this.dying * this.dying * 160; x -= this.dying * 20; fall = this.dying * 0.35; }
      this.x = x; this.y = y; this.scale = scale; this.facing = 1;
      this.hits = [];
      g.save();
      g.translate(x, y);
      if (fall) g.rotate(fall);
      g.scale(scale, scale);
      const tilt = Math.sin(t * 0.9) * 0.015;
      g.rotate(tilt);
      const ext = this.extent();
      // Envelope sized to the ship.
      const left = -ext.left, right = ext.right;
      const span = right - left;
      const ecx = (left + right) / 2;
      const spr = SPR();
      // Gasbags: longer ships fly more balloons side by side, each at its natural shape.
      const count = Math.max(1, Math.round(span / 150));
      const bw = Math.min(135, Math.max(105, span / count + (count > 1 ? 10 : 0)));
      const bh = bw * spr.aspect(CORE_BALLOON[this.coreId] || 'balloon_green');
      const ey = -H / 2 - 20 - bh / 2 - (this.deckN || 0) * 34;
      const step = count > 1 ? (span - bw * 0.7) / (count - 1) : 0;
      const xs = Array.from({ length: count }, (_, i) => (count > 1 ? left + bw * 0.35 + i * step : ecx));
      g.strokeStyle = 'rgba(36,23,15,0.85)'; g.lineWidth = 1.3;
      for (const x of xs) for (const dx of [-0.3, 0.3]) { g.beginPath(); g.moveTo(x + dx * bw, ey + bh * 0.3); g.lineTo(x + dx * bw * 0.8, 6); g.stroke(); }
      let drew = false;
      for (const x of xs) drew = spr.draw(g, CORE_BALLOON[this.coreId] || 'balloon_green', x, ey, bw, null, true) || drew;
      if (!drew) { const erx = Math.max(60, span * 0.44), ery = 26; g.beginPath(); g.ellipse(ecx, ey, erx, ery, 0, 0, TAU); shape(g, ENVELOPES[this.coreId] || C.canvas, 2.5); }
      spr.draw(g, 'flag_cross', xs[0] - bw / 2 - 4, ey - bh * 0.3, 26, null, true);
      this.envelopeTop = -ey + bh / 2;
      // The hull: a sprite stretched under every module, bow to the right.
      if (!spr.drawStretched(g, CORE_HULL[this.coreId] || 'hull_wood', (left + right) / 2, 30, span + 24, 66, true, 0.26)) {
        rr(g, left + 6, -3, span - 12, 6, 3); shape(g, C.brassD, 1.5);
      }
      // Stern propeller on the hindmost element, unless a Propeller module already sits there.
      const sternMod = [...this.mods.values()].find((m) => m.side === 'stern' && m.outer);
      if (!sternMod || sternMod.id !== 'propeller') prop(g, left - 4, 0, 18, t);
      // The deck tower's brass mast, from the Core up to the topmost deck module.
      const deckTop = [...this.mods.values()].filter((m) => m.side === 'deck').reduce((y, m) => Math.min(y, m.y), 0);
      if (deckTop < 0) { rr(g, -5, deckTop, 10, -deckTop - H / 2 + 2, 2); shape(g, C.brassD, 1.5); rivets(g, -1, 1, deckTop + 6, 1, C.brassL); }
      this.drawCore(g, t);
      for (const m of [...this.mods.values()].sort((a, b) => (a.side === 'deck') - (b.side === 'deck') || a.idx - b.idx)) this.drawModule(g, m, t, opts);
      if (this.ghost) this.drawGhost(g, t);
      // Insertion bolts for installing a part.
      if (this.inserts.length) {
        for (const ins of this.inserts) {
          const b = boltXY(ins.side, ins.pos, ins.end);
          const pulse = 1 + Math.sin(t * 5) * 0.12;
          g.save(); g.translate(b.x, b.y); g.scale(pulse, pulse);
          circle(g, 0, 0, 9, ins.hover ? C.brassL : C.brass, 2);
          g.fillStyle = C.out; g.fillRect(-5, -1.5, 10, 3); g.fillRect(-1.5, -5, 3, 10);
          g.restore();
          this.hits.push({ insert: ins, ...this.toWorld(b.x, b.y, 14) });
        }
      }
      // Smoke, sparks and falling debris.
      for (const p of this.smoke) {
        const a = Math.min(1, p.life / p.max) * (p.steam ? 0.5 : 0.55);
        g.fillStyle = p.steam ? `rgba(255,255,255,${a})` : p.dark ? `rgba(40,34,30,${a})` : `rgba(255,140,60,${a})`;
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill();
      }
      g.fillStyle = '#ffd36a';
      for (const s of this.sparks) { g.globalAlpha = Math.min(1, s.life * 2); g.fillRect(s.x, s.y, 2.2, 2.2); }
      g.globalAlpha = 1;
      for (const d of this.debris) {
        g.save(); g.translate(d.x, d.y); g.rotate(d.r); g.globalAlpha = Math.min(1, d.life);
        if (d.gear) { circle(g, 0, 0, d.size, d.color, 1); g.fillStyle = C.out; g.beginPath(); g.arc(0, 0, d.size * 0.35, 0, TAU); g.fill(); }
        else this.drawModuleBody(g, d.m, t, true);
        g.restore();
      }
      g.restore();
    }
    toWorld(lx, ly, r) { return { x: this.x + lx * this.scale, y: this.y + ly * this.scale, r: r * this.scale }; }
    drawCore(g, t) {
      const id = this.coreId;
      const w = CORE_W;
      if (id === 'battleship') {
        g.beginPath(); g.moveTo(-w / 2, -H / 2 - 4); g.lineTo(w / 2, -H / 2 - 4); g.lineTo(w / 2 + 6, H / 2 - 4); g.lineTo(w / 2 - 6, H / 2 + 8); g.lineTo(-w / 2 + 6, H / 2 + 8); g.lineTo(-w / 2 - 6, H / 2 - 4); g.closePath(); shape(g, C.ironD, 2.5);
        rr(g, -8, -H / 2 - 22, 12, 18, 2); shape(g, C.iron); rr(g, -10, -H / 2 - 24, 16, 5, 2); shape(g, C.redD, 1.5);
        rivets(g, -w / 2 + 2, w / 2 - 2, -H / 2 + 1, 8, C.ironL);
      } else if (id === 'zeppelin') {
        panel(g, -w / 2 + 6, -H / 2 + 2, w - 12, H - 6, C.ironL, C.iron, 10);
        g.fillStyle = C.ironD; g.fillRect(-14, H / 2 - 6, 28, 4);
      } else if (id === 'clockwork') {
        panel(g, -w / 2, -H / 2 - 2, w, H + 4, C.copper, C.copperD, 6);
        g.save(); g.translate(14, -4); g.rotate(t * 0.8);
        g.beginPath(); for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU; const r = i % 2 ? 10 : 13; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); shape(g, C.brass, 1.5);
        g.restore(); circle(g, 14, -4, 3, C.out, 1);
      } else {
        g.beginPath(); g.moveTo(-w / 2, -H / 2); g.lineTo(w / 2 + 8, -H / 2); g.quadraticCurveTo(w / 2 + 4, H / 2 + 4, w / 2 - 8, H / 2 + 4); g.lineTo(-w / 2 + 6, H / 2 + 4); g.quadraticCurveTo(-w / 2 - 4, 0, -w / 2, -H / 2); g.closePath(); shape(g, C.brass, 2.5);
        g.fillStyle = C.brassD; g.fillRect(-w / 2 + 2, H / 2 - 6, w, 4);
      }
      // Furnace window with a flickering glow, and a steam vent.
      const flick = 0.75 + Math.sin(t * 9) * 0.12 + Math.sin(t * 23) * 0.08;
      const low = this.coreHp / this.coreMax <= 0.34;
      rr(g, -w / 2 + 10, -6, 16, 12, 3); g.fillStyle = low ? `rgba(255,70,40,${flick})` : `rgba(255,170,60,${flick})`; g.fill(); g.lineWidth = 2; g.strokeStyle = C.out; g.stroke();
      g.fillStyle = `rgba(255,160,60,${0.18 * flick})`; g.beginPath(); g.arc(-w / 2 + 18, 0, 18, 0, TAU); g.fill();
      if (id !== 'clockwork') porthole(g, 12, -2, 5, 1);
      rr(g, -w * 0.18 - 3, -H / 2 - 12, 6, 12, 1); shape(g, C.iron, 1.5);
      if (low && Math.sin(t * 8) > 0) { circle(g, w / 2 - 8, -H / 2 - 6, 3.5, '#ff4a2a', 1.2); g.fillStyle = 'rgba(255,60,30,0.3)'; g.beginPath(); g.arc(w / 2 - 8, -H / 2 - 6, 10, 0, TAU); g.fill(); }
      this.drawTokens(g, 0, this.coreTokens || {}, t);
      if (this.core.flash > 0) { g.globalAlpha = this.core.flash * 0.8; rr(g, -w / 2 - 4, -H / 2 - 6, w + 8, H + 14, 6); g.fillStyle = '#fff'; g.fill(); g.globalAlpha = 1; }
      this.hits.push({ uid: 'core', ...this.toWorld(0, 0, w * 0.5) });
      const tgt = this.targets.get('core');
      if (tgt != null) this.drawTargetRing(g, 0, CORE_W * 0.55, t, tgt);
      if (this.highlight.has('core')) this.drawSelect(g, 0, CORE_W);
    }
    drawModuleBody(g, m, t, falling) {
      // Stern modules face backward; bow and deck modules face the enemy.
      const dir = m.side === 'stern' ? -1 : 1;
      g.save(); g.scale(dir, 1);
      const sprite = MODULE_SPRITES[m.id];
      if (!(sprite && SPR().ready() && sprite(g, m, t))) (MODULES[m.id] || MODULES.plating)(g, m, t);
      // Wear: dents below two thirds, cracks below one third.
      const frac = m.hp / m.max;
      if (frac <= 0.67 || falling) {
        const h0 = hash(m.uid);
        g.strokeStyle = 'rgba(30,20,14,0.75)'; g.lineWidth = 1.5;
        g.beginPath(); g.arc(-10 + h0 * 16, -4, 4, 0.3, 2.6); g.stroke();
        if (frac <= 0.34 || falling) { g.beginPath(); g.moveTo(-4 + h0 * 8, -H / 2 + 2); g.lineTo(-1, -4); g.lineTo(-6, 2); g.lineTo(-2, H / 2 - 3); g.stroke(); g.beginPath(); g.moveTo(8, -H / 2 + 3); g.lineTo(12, -2); g.lineTo(9, 4); g.stroke(); }
      }
      g.restore();
    }
    // A see-through preview of a part about to be installed.
    drawGhost(g, t) {
      const gh = this.ghost;
      const at = slotXY(gh.side, gh.pos);
      const m = { uid: 'ghost', id: gh.id, side: gh.side, idx: gh.pos, hp: 1, max: 1, tokens: {}, recoil: 0, outer: gh.outer };
      g.save(); g.translate(at.x, at.y - 4 + Math.sin(t * 3) * 2); g.globalAlpha = 0.55;
      this.drawModuleBody(g, m, t, false);
      g.globalAlpha = 1; g.strokeStyle = '#f0cf84'; g.lineWidth = 2; g.setLineDash([5, 4]);
      rr(g, -M / 2 - 4, -H / 2 - 6, M + 8, H + 12, 6); g.stroke(); g.setLineDash([]);
      g.restore();
    }
    drawModule(g, m, t, opts) {
      const ease = 1 - Math.pow(1 - m.install, 3);
      const drop = (1 - ease) * -70;
      g.save();
      g.translate(m.x + (m.shiftX || 0), m.y + (m.shiftY || 0) + drop);
      g.globalAlpha = Math.min(1, 0.2 + ease);
      this.drawModuleBody(g, m, t, false);
      this.drawTokens(g, 0, m.tokens, t);
      if (m.flash > 0) { g.globalAlpha = m.flash * 0.85; rr(g, -M / 2 - 3, -H / 2 - 4, M + 6, H + 8, 5); g.fillStyle = '#fff'; g.fill(); }
      g.globalAlpha = 1;
      // Durability pips under the module.
      const pw = Math.min(6, (M - 8) / m.max - 1);
      for (let i = 0; i < m.max; i++) { g.fillStyle = i < m.hp ? (m.hp / m.max <= 0.34 ? '#f07b5e' : '#e9d29a') : 'rgba(0,0,0,0.45)'; g.fillRect(-((pw + 1) * m.max) / 2 + i * (pw + 1), H / 2 + 5, pw, 3.5); }
      const tgt = this.targets.get(m.uid);
      if (tgt != null) this.drawTargetRing(g, 0, M * 0.55, t, tgt);
      if (this.highlight.has(m.uid)) this.drawSelect(g, 0, M);
      if (opts.synergy && opts.synergy.has(m.uid)) { g.strokeStyle = '#7ff0c0'; g.lineWidth = 2.5; g.setLineDash([5, 4]); rr(g, -M / 2 - 4, -H / 2 - 6, M + 8, H + 12, 6); g.stroke(); g.setLineDash([]); }
      g.restore();
      this.hits.push({ uid: m.uid, ...this.toWorld(m.x + (m.shiftX || 0), m.y + (m.shiftY || 0), M * 0.55) });
    }
    drawSelect(g, x, w) { g.strokeStyle = '#f0cf84'; g.lineWidth = 2.5; rr(g, x - w / 2 - 5, -H / 2 - 8, w + 10, H + 22, 7); g.stroke(); }
    drawTargetRing(g, x, r, t, dmg) {
      const p = 1 + Math.sin(t * 6) * 0.08;
      g.save(); g.translate(x, 0); g.scale(p, p);
      g.strokeStyle = '#ff5b3a'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
      for (let i = 0; i < 4; i++) { const a = (i * TAU) / 4; g.beginPath(); g.moveTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6)); g.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6)); g.stroke(); }
      g.restore();
      if (dmg !== true) {
        const label = dmg > 0 ? `-${dmg}` : dmg === 0 ? '0' : String(dmg);
        g.font = '700 12px "IBM Plex Mono", monospace'; g.textAlign = 'center';
        g.lineWidth = 3; g.strokeStyle = C.out; g.strokeText(label, x, -H / 2 - 12); g.fillStyle = '#ffd0c4'; g.fillText(label, x, -H / 2 - 12);
      }
    }
    // Token visuals are simple badges here; the effects layer adds flames, goo and gas clouds.
    drawTokens(g, x, tok, t) {
      if (!tok) return;
      if (tok.fire) { g.fillStyle = '#ff7a2f'; g.beginPath(); g.ellipse(x - 8, -H / 2 - 3, 4, 7 + Math.sin(t * 18) * 2, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd25e'; g.beginPath(); g.ellipse(x - 8, -H / 2, 2, 4, 0, 0, TAU); g.fill(); }
      if (tok.glue) { g.fillStyle = '#9fd05a'; g.fillRect(x - M / 2 + 4, -H / 2, M - 8, 3); const d = (t * 12) % 10; g.beginPath(); g.ellipse(x + 6, -H / 2 + 3 + d, 2, 3, 0, 0, TAU); g.fill(); }
      if (tok.gas) { g.fillStyle = 'rgba(170,140,220,0.5)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + Math.cos(t * 1.5 + i * 2) * 14, Math.sin(t * 1.5 + i * 2) * 8, 7, 0, TAU); g.fill(); } }
    }
    hitTest(px, py) {
      let best = null;
      for (const h of this.hits) { const d = Math.hypot(px - h.x, py - h.y); if (d <= h.r && (!best || d < best.d)) best = { ...h, d }; }
      return best;
    }
  }

  // ---------- enemies ----------
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

  // Enemy ships drawn with the provided sprite sheet. Full ships are used as they are; the rest are
  // assembled from its hulls, balloons, turrets and flags. Each returns its half-width, or 0 while
  // the sheet is still loading (the vector look is used then).
  function rigging(g, pts) { g.strokeStyle = 'rgba(36,23,15,0.85)'; g.lineWidth = 1.4; for (const [a, b, c, d] of pts) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); } }
  const SPRITE_LOOKS = {
    cutter(g) { return SPR().draw(g, 'ship_pirate', 0, -34, 150) ? 75 : 0; },
    monitor(g) { return SPR().draw(g, 'ship_ironclad', 0, -30, 210) ? 105 : 0; },
    flagship(g) {
      if (!SPR().draw(g, 'ship_galleon', 0, -44, 230)) return 0;
      SPR().draw(g, 'flag_jolly', 16, -150, 34);
      return 115;
    },
    leviathan(g, e, t) {
      if (!SPR().draw(g, 'ship_dreadnought', 0, -64, 350)) return 0;
      SPR().draw(g, e.phase >= 2 ? 'flag_red' : 'flag_star', 112, -196, 34);
      // It burns harder with each phase.
      if (e.phase >= 1) for (const [x, y] of [[-60, 20], [40, 30], [100, -20]].slice(0, e.phase + 1)) { g.fillStyle = `rgba(255,${e.phase >= 2 ? 70 : 150},40,${0.55 + Math.sin(t * 10 + x) * 0.2})`; g.beginPath(); g.ellipse(x, y, 9, 14 + Math.sin(t * 14 + x) * 3, 0, 0, TAU); g.fill(); }
      if (e.phase >= 2) { g.fillStyle = `rgba(255,40,30,${0.25 + Math.sin(t * 8) * 0.15})`; g.beginPath(); g.ellipse(0, 20, 170, 40, 0, 0, TAU); g.fill(); }
      return 175;
    },
    gunship(g, e) {
      if (!SPR().ready()) return 0;
      rigging(g, [[-40, -48, -38, -2], [0, -44, 0, -2], [40, -48, 38, -2]]);
      SPR().drawStretched(g, 'balloon_stripe_red', 0, -76, 170, 74);
      SPR().draw(g, 'hull_iron', 0, 18, 160);
      SPR().draw(g, 'turret_a', -34 - e.recoil * 4, -16, 34);
      SPR().draw(g, 'turret_e', 10 - e.recoil * 4, -16, 34);
      SPR().draw(g, 'flag_jolly', 60, -18, 30);
      return 85;
    },
    skiff(g, e) {
      if (!SPR().ready()) return 0;
      rigging(g, [[-24, -40, -22, -4], [24, -40, 22, -4]]);
      SPR().draw(g, 'balloon_net', 0, -60, 110);
      SPR().draw(g, 'hull_wood', 0, 12, 120);
      SPR().draw(g, 'cannon_b', -36 - e.recoil * 4, -6, 32);
      SPR().draw(g, 'flag_jolly', 42, -12, 26);
      return 60;
    },
    bomber(g, e) {
      if (!SPR().ready()) return 0;
      rigging(g, [[-40, -40, -30, 2], [40, -40, 30, 2]]);
      SPR().drawStretched(g, 'balloon_red', 0, -62, 220, 76);
      SPR().draw(g, 'hull_trim', 0, 18, 110);
      for (let i = 0; i < 4; i++) { rr(g, -24 + i * 14, 40, 8, 13, 4); shape(g, C.ironD, 1.5); }
      return 110;
    },
    stormqueen(g, e, t) {
      if (!SPR().ready()) return 0;
      const ph = e.phase;
      for (let i = 0; i < 9; i++) { const a = t * (0.8 + ph * 0.4) + i * 0.7; g.fillStyle = `rgba(${70 + i * 6},${80 + i * 5},${110 + i * 4},0.6)`; g.beginPath(); g.ellipse(Math.cos(a) * 70, 40 + Math.sin(a) * 10, 34, 14, 0, 0, TAU); g.fill(); }
      const spires = 2 + ph;
      for (let i = 0; i < spires; i++) { const x = -60 + (120 * i) / Math.max(1, spires - 1); rr(g, x - 3, -150, 6, 30, 2); shape(g, C.copper, 1.5); circle(g, x, -154, 5, '#cfe8ff', 1.5); }
      if (Math.sin(t * (6 + ph * 3)) > 0.2) { g.save(); g.strokeStyle = '#d6ecff'; g.lineWidth = 2; g.shadowColor = '#8fc8ff'; g.shadowBlur = 12; g.beginPath(); g.moveTo(-60, -154); for (let i = 1; i <= 8; i++) g.lineTo(-60 + i * 15, -154 + (Math.random() - 0.5) * 14); g.stroke(); g.restore(); }
      rigging(g, [[-50, -52, -40, -4], [50, -52, 40, -4]]);
      SPR().drawStretched(g, 'balloon_blue', 0, -84, 250, 104);
      SPR().draw(g, 'hull_iron', 0, 18, 150);
      SPR().draw(g, 'flag_blue', 62, -18, 30);
      g.fillStyle = ph >= 2 ? '#ff6ad5' : '#9fe0ff'; g.beginPath(); g.ellipse(-50, 10, 8 + Math.sin(t * 5) * 1.5, 5, 0, 0, TAU); g.fill();
      return 128;
    },
  };

  class EnemyShip {
    constructor(look) {
      this.look = look; this.flash = 0; this.recoil = 0; this.phase = 0; this.phaseFlash = 0; this.smoke = []; this.wound = 0;
      this.x = 0; this.y = 0; this.scale = 1; this.halfW = 60; this.sinking = 0;
    }
    update(dt) {
      this.flash = Math.max(0, this.flash - dt * 4);
      this.recoil = Math.max(0, this.recoil - dt * 3);
      this.lunge = Math.max(0, (this.lunge || 0) - dt * 2.2);
      this.phaseFlash = Math.max(0, this.phaseFlash - dt * 1.2);
      if (this.sinking > 0) this.sinking += dt;
      const frac = this.hpFrac ?? 1;
      this.smokeT = (this.smokeT || 0) - dt;
      if (frac < 0.5 && this.smokeT <= 0) { this.smokeT = frac < 0.25 ? 0.08 : 0.2; this.smoke.push({ x: (Math.random() - 0.5) * this.halfW, y: -10, vx: 20 + Math.random() * 20, vy: -30, r: 4, life: 1.6, max: 1.6, fire: frac < 0.25 && Math.random() < 0.4 }); }
      for (const p of this.smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 8; p.life -= dt; }
      this.smoke = this.smoke.filter((p) => p.life > 0);
    }
    // Drawn through an offscreen buffer so the hit flash whitens only the ship, not the sky.
    draw(g, x, y, scale, t) {
      this.x = x; this.y = y; this.scale = scale;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const half = Math.max(this.halfW, 60) * 1.7 * scale;
      const size = Math.ceil(half * 2 * dpr);
      const buf = this.buf || (this.buf = document.createElement('canvas'));
      if (buf.width !== size) { buf.width = size; buf.height = size; }
      const b = buf.getContext('2d');
      b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, size, size);
      b.setTransform(dpr * scale, 0, 0, dpr * scale, size / 2, size / 2);
      b.rotate(Math.sin(t * 0.8 + 1) * 0.02);
      if (this.phaseFlash > 0) { b.fillStyle = `rgba(255,80,40,${this.phaseFlash * 0.35})`; b.beginPath(); b.arc(0, -20, this.halfW * 1.3, 0, TAU); b.fill(); }
      const sprite = SPRITE_LOOKS[this.look];
      this.halfW = (sprite && sprite(b, this, t)) || (ENEMY_LOOKS[this.look] || ENEMY_LOOKS.cutter)(b, this, t);
      if (this.flash > 0) {
        b.globalCompositeOperation = 'source-atop';
        b.fillStyle = `rgba(255,255,255,${this.flash * 0.85})`; b.fillRect(-this.halfW * 2, -this.halfW * 2, this.halfW * 4, this.halfW * 4);
        b.globalCompositeOperation = 'source-over';
      }
      for (const p of this.smoke) { b.fillStyle = p.fire ? `rgba(255,130,50,${(p.life / p.max) * 0.7})` : `rgba(40,34,30,${(p.life / p.max) * 0.55})`; b.beginPath(); b.arc(p.x, p.y, p.r, 0, TAU); b.fill(); }
      const sink = this.sinking;
      g.save();
      if (this.lunge > 0) x -= Math.sin((1 - this.lunge) * Math.PI) * 46 * scale;
      g.translate(x + sink * 30, y + sink * sink * 80);
      g.rotate(-sink * 0.4);
      g.globalAlpha = Math.max(0, 1 - sink * 0.35);
      g.drawImage(buf, -size / dpr / 2, -size / dpr / 2, size / dpr, size / dpr);
      g.restore();
    }
    pointOf() { return { x: this.x, y: this.y - 20 * this.scale, r: this.halfW * this.scale }; }
    hitTest(px, py) { return Math.abs(px - this.x) < this.halfW * this.scale && Math.abs(py - this.y + 20 * this.scale) < this.halfW * this.scale * 0.8; }
  }

  window.CardshipsShipArt = { PlayerShip, EnemyShip, MODULE_W: M, CORE_W, HULL_H: H, palette: C, hasArt: (id) => !!MODULES[id] };
})();
