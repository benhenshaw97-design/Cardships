// The sky map: a horizontally scrolling route through the clouds with parallax layers,
// node icons by encounter type, and a little airship that flies between nodes.
(function () {
  const D = window.CardshipsData;

  const ICONS = {
    patrol: 'M4 18 L14 8 M7 6 L18 17 M3 15 l3 3 M15 5 l3 3 M12 18 a2 2 0 1 0 0.1 0 M6 4 a2 2 0 1 0 0.1 0',
    lair: 'M12 3 C6.5 3 4 7 4 10.5 C4 13 5.3 14.6 7 15.4 V19 H17 V15.4 C18.7 14.6 20 13 20 10.5 C20 7 17.5 3 12 3 Z M9 10 a1.6 1.6 0 1 0 0.1 0 M15 10 a1.6 1.6 0 1 0 0.1 0 M10 16 V19 M14 16 V19',
    storm: 'M6 11 a4 4 0 0 1 4-4 a5 5 0 0 1 9 2 a3 3 0 0 1 0 6 H7 a3 3 0 0 1 -1 -4 Z M12 15 L10 19 H13 L11 23',
    smog: 'M5 21 V11 H8 V21 M10 21 V8 H13 V21 M4 7 a3 2 0 0 1 6 0 a3 2 0 0 1 6 0 a3 2 0 0 1 4 3 H4 Z',
    trader: 'M3 10 C3 6 8 4 12 4 C16 4 21 6 21 10 C21 14 16 16 12 16 C8 16 3 14 3 10 Z M9 16 V19 H15 V16 M12 7 V13 M10 8.5 H13.5 a1.5 1.5 0 0 1 0 3 H10',
    beacon: 'M12 3 V8 M8 8 H16 L15 20 H9 Z M5 5 L7 7 M19 5 L17 7 M4 11 H6 M18 11 H20 M12 12 V16',
    guild: 'M3 14 C6 12 18 12 21 14 L17 20 H7 Z M12 12 V4 M12 4 L17 6 L12 8',
    hangar: 'M3 20 V10 L12 4 L21 10 V20 M7 20 V13 H17 V20 M9 16 H15',
    derelict: 'M3 14 L21 12 L18 18 H6 Z M8 13 L10 5 L12 13 M14 12 L18 7 M5 20 l2 -1 M17 20 l2 -1',
    rift: 'M12 3 C9 7 15 9 12 12 C9 15 15 17 12 21 M6 8 l2 1 M16 6 l2 -1 M5 15 l2 -1 M17 17 l2 1',
    boss: 'M3 18 L5 7 L9.5 12 L12 5 L14.5 12 L19 7 L21 18 Z M3 21 H21',
    unknown: 'M9 9 a3 3 0 1 1 4 2.8 C12.4 12.1 12 12.6 12 13.5 V15 M12 18.5 a0.6 0.6 0 1 0 0.1 0',
    cloud: 'M5 16 a4 4 0 0 1 2-7.5 a5.5 5.5 0 0 1 10 1.5 a3.5 3.5 0 0 1 1 6 Z',
  };
  const BIOME_SKY = { clear: '#6fa8cf', smog: '#8a7a62', sunset: '#d98a52', dusk: '#b04a3a', night: '#26305a', storm: '#3e4a5e', lair: '#5a2a26' };

  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }
  // The painted icons (assets/art/icons) for map nodes; the line icons stay for the legend and as fallbacks.
  const ART_ICONS = new Set(['patrol', 'lair', 'storm', 'smog', 'trader', 'beacon', 'guild', 'hangar', 'derelict', 'rift', 'boss', 'unknown', 'cloud']);
  function artIcon(name) {
    if (!ART_ICONS.has(name)) return icon(name);
    const img = document.createElement('img');
    img.className = 'node-art';
    img.src = `assets/art/icons/${name}.png`;
    img.alt = '';
    img.draggable = false;
    return img;
  }
  function icon(name, size = 22) {
    const s = svgEl('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': 'true', class: 'node-icon' });
    s.append(svgEl('path', { d: ICONS[name] || ICONS.unknown, fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    return s;
  }
  // A side-on toy airship for the map marker.
  function shipIcon() {
    const s = svgEl('svg', { viewBox: '0 0 64 44', width: 58, height: 40, class: 'map-ship-svg', 'aria-hidden': 'true' });
    s.append(
      svgEl('ellipse', { cx: 32, cy: 14, rx: 24, ry: 11, fill: '#e9dcc0', stroke: '#2b1c12', 'stroke-width': 2 }),
      svgEl('path', { d: 'M12 14 H52 M20 6 C24 10 24 18 20 22 M44 6 C40 10 40 18 44 22', stroke: '#b59c74', 'stroke-width': 1.5, fill: 'none' }),
      svgEl('path', { d: 'M22 25 L20 30 M42 25 L44 30', stroke: '#2b1c12', 'stroke-width': 1.5 }),
      svgEl('rect', { x: 18, y: 29, width: 28, height: 9, rx: 3, fill: '#c8913f', stroke: '#2b1c12', 'stroke-width': 2 }),
      svgEl('circle', { cx: 26, cy: 33.5, r: 2, fill: '#ffe6a8', stroke: '#2b1c12', 'stroke-width': 1 }),
      svgEl('circle', { cx: 34, cy: 33.5, r: 2, fill: '#ffe6a8', stroke: '#2b1c12', 'stroke-width': 1 }),
      svgEl('g', { class: 'map-prop' }),
    );
    const prop = s.lastChild;
    prop.append(svgEl('rect', { x: 9, y: 27, width: 3, height: 14, rx: 1.5, fill: '#5b5f63' }));
    s.append(svgEl('rect', { x: 12, y: 32, width: 7, height: 3, fill: '#5b5f63' }));
    return s;
  }

  // Deterministic scatter so the scenery stays put between renders.
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function sceneryLayer(cls, count, width, height, r, make) {
    const layer = document.createElement('div');
    layer.className = `sky-layer ${cls}`;
    layer.style.width = width + 'px';
    for (let i = 0; i < count; i++) layer.append(make(r, i, width, height));
    return layer;
  }
  function cloud(r, i, width, height, scale, opacity) {
    const c = document.createElement('div');
    c.className = 'map-cloud';
    const w = (90 + r() * 150) * scale;
    c.style.cssText = `left:${r() * width}px; top:${r() * height * 0.9}px; width:${w}px; height:${w * 0.42}px; opacity:${opacity}; animation-duration:${30 + r() * 40}s; animation-delay:${-r() * 30}s`;
    return c;
  }
  function island(r, i, width, height) {
    const el = document.createElement('div');
    el.className = 'map-island';
    const w = 50 + r() * 90;
    el.style.cssText = `left:${(i + r()) * (width / 9)}px; top:${height * (0.15 + r() * 0.65)}px; width:${w}px; height:${w * 0.55}px`;
    return el;
  }

  /**
   * Renders the map. opts: { selected, onSelect(id), onTravel(id, done) }
   */
  function render(game, opts) {
    const map = game.map;
    const mobile = window.matchMedia('(max-width: 640px)').matches;
    const colW = mobile ? 92 : 118;
    const H = mobile ? 280 : 340;
    const pad = 56;
    const cols = Math.max(...map.nodes.map((n) => n.col));
    const width = pad * 2 + cols * colW;
    const pos = (n) => ({ x: pad + n.col * colW, y: 26 + n.y * (H - 52) });

    const wrap = document.createElement('div');
    wrap.className = 'skymap';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Sky map');
    const inner = document.createElement('div');
    inner.className = 'skymap-inner';
    inner.style.width = width + 'px';
    inner.style.height = H + 'px';
    // The sky shifts through the biome bands from left to right.
    const stops = [];
    for (let c = 1; c <= cols; c++) stops.push(`${BIOME_SKY[D.BIOME_BANDS.find((b) => c <= b.upTo).biome]} ${(((pad + c * colW) / width) * 100).toFixed(1)}%`);
    // The painted sky chart sits under a tint of each band's colour.
    const tint = document.createElement('div');
    tint.className = 'map-tint';
    tint.style.background = `linear-gradient(90deg, ${BIOME_SKY.clear} 0%, ${stops.join(', ')})`;
    inner.append(tint);

    const r = rng(game.seed);
    const far = sceneryLayer('far', 11, width, H, r, island);
    const mid = sceneryLayer('mid', 16, width, H, r, (rr, i, w, h) => cloud(rr, i, w, h, 1, 0.55));
    const near = sceneryLayer('near', 9, width, H, r, (rr, i, w, h) => cloud(rr, i, w, h, 1.5, 0.35));
    inner.append(far, mid);

    const svg = svgEl('svg', { class: 'map-edges', width, height: H, viewBox: `0 0 ${width} ${H}` });
    const cur = game.currentNode();
    const reachable = new Set(cur.edges);
    for (const n of map.nodes) {
      for (const id of n.edges) {
        const m = game.node(id);
        const a = pos(n), b = pos(m);
        const travelled = map.visited.includes(n.id) && map.visited.includes(m.id) && map.visited.indexOf(m.id) === map.visited.indexOf(n.id) + 1;
        const open = n.id === cur.id;
        const mx = (a.x + b.x) / 2;
        svg.append(svgEl('path', { d: `M${a.x} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`, class: `edge ${travelled ? 'travelled' : open ? 'open' : 'future'}` }));
      }
    }
    inner.append(svg);

    for (const n of map.nodes) {
      if (n.enc === 'start') continue;
      const p = pos(n);
      const known = game.nodeKnown(n);
      const isBoss = n.enc === 'boss';
      const enc = D.ENCOUNTERS[n.enc];
      const kind = isBoss ? 'Boss' : enc.kind;
      const label = isBoss ? D.ENEMIES[n.enemy].name.replace('The ', '') : known ? enc.name : n.cloud && n.col - cur.col <= game.sight() ? 'Cloud cover' : 'Uncharted';
      const btn = document.createElement('button');
      btn.className = ['map-node', known ? `k-${kind.replace(' ', '')}` : 'unknown', reachable.has(n.id) ? 'reachable' : '', map.visited.includes(n.id) ? 'visited' : '', n.id === cur.id ? 'current' : '', opts.selected === n.id ? 'selected' : '', isBoss ? 'boss' : ''].join(' ');
      btn.style.left = p.x + 'px';
      btn.style.top = p.y + 'px';
      btn.setAttribute('aria-label', `${label}, column ${n.col}${reachable.has(n.id) ? ', reachable' : ''}`);
      btn.append(artIcon(isBoss ? 'boss' : known ? n.enc : n.cloud ? 'cloud' : 'unknown'));
      const tag = document.createElement('span');
      tag.className = 'map-label';
      tag.textContent = label;
      btn.append(tag);
      btn.addEventListener('click', () => opts.onSelect(n.id));
      inner.append(btn);
    }

    const ship = document.createElement('div');
    ship.className = 'map-ship';
    const cp = pos(cur);
    ship.style.transform = `translate(${cp.x}px, ${cp.y}px)`;
    // The marker is your own ship from the fleet sheet, bow to the right (vector fallback until it loads).
    const look = window.CardshipsShipArt && game.core && window.CardshipsShipArt.playerSprite(game);
    const F = look && window.CardshipsSprites && window.CardshipsSprites.FRAMES[look.name];
    if (F) {
      const k = 64 / F[2];
      const bobber = document.createElement('div');
      bobber.className = 'map-ship-sprite';
      const icon = document.createElement('div');
      icon.style.cssText = `width:${F[2] * k}px;height:${F[3] * k}px;background:url(${window.CardshipsSprites.sources[F[4] || 0]}) -${F[0] * k}px -${F[1] * k}px / ${1024 * k}px auto no-repeat;image-rendering:pixelated;${look.flip ? 'transform:scaleX(-1)' : ''}`;
      bobber.append(icon);
      ship.append(bobber);
    } else ship.append(shipIcon());
    inner.append(ship);
    inner.append(near);
    wrap.append(inner);

    // Parallax: far scenery drifts slower than the route, near wisps faster.
    const apply = () => {
      const x = wrap.scrollLeft;
      far.style.transform = `translateX(${x * 0.65}px)`;
      mid.style.transform = `translateX(${x * 0.3}px)`;
      near.style.transform = `translateX(${-x * 0.35}px)`;
    };
    let ticking = false;
    wrap.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; apply(); }); } }, { passive: true });
    requestAnimationFrame(() => {
      wrap.scrollLeft = Math.max(0, cp.x - (mobile ? 70 : 160));
      apply();
    });

    // Fly the marker along the route, then hand over to the encounter.
    wrap.flyTo = (id, done) => {
      const t = pos(game.node(id));
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      ship.classList.add('flying');
      ship.style.transition = reduce ? 'none' : 'transform 0.9s cubic-bezier(.45,.05,.35,1)';
      wrap.scrollTo({ left: Math.max(0, t.x - (mobile ? 70 : 160)), behavior: reduce ? 'auto' : 'smooth' });
      requestAnimationFrame(() => { ship.style.transform = `translate(${t.x}px, ${t.y}px)`; });
      setTimeout(done, reduce ? 0 : 950);
    };
    // The chart's brass frame stays put while the route scrolls beneath it.
    const shell = document.createElement('div');
    shell.className = 'skymap-shell';
    const frame = document.createElement('div');
    frame.className = 'map-frame';
    shell.append(wrap, frame);
    shell.flyTo = wrap.flyTo;
    return shell;
  }

  window.CardshipsSkyMap = { render, icon };
})();
