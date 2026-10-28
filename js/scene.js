// The flight scene: a canvas that paints multi-layer parallax skies for each biome and keeps
// them scrolling, so the ship always feels airborne. Ships and effects are drawn by hooks
// (Scene.actors / Scene.fx) between the cloud banks and the foreground wisps.
(function () {
  const ART = {
    sunset: 'assets/art/sunset-sky-city.jpg',
    canyon: 'assets/art/canyon-foundry.jpg',
    deck: 'assets/art/sky-deck.jpg',
    engine: 'assets/art/engine-room.jpg',
    cloudsea: 'assets/art/cloud-sea-sunset.jpg',
    night: 'assets/art/night-fleet.jpg',
    stormMesa: 'assets/art/storm-mesa.jpg',
    canyonCity: 'assets/art/canyon-city.jpg',
    railYard: 'assets/art/rail-yard.jpg',
    skyClear: 'assets/art/skies/sky-clear.jpg',
    sunsetIsles: 'assets/art/skies/sky-sunset-isles.jpg',
    chimneys: 'assets/art/skies/sky-chimneys.jpg',
    smokeWrecks: 'assets/art/skies/sky-smoke-wrecks.jpg',
    nightCity: 'assets/art/skies/sky-night-city.jpg',
    pirateLair: 'assets/art/skies/sky-pirate-lair.jpg',
    derelicts: 'assets/art/skies/sky-derelicts.jpg',
    rift: 'assets/art/skies/sky-rift.jpg',
    port: 'assets/art/skies/sky-port.jpg',
    victory: 'assets/art/skies/sky-victory.jpg',
    auroraSky: 'assets/art/skies/sky-aurora.jpg',
    auroraSwirl: 'assets/art/skies/sky-aurora-swirl.jpg',
    auroraRift: 'assets/art/skies/sky-aurora-rift.jpg',
    auroraVortex: 'assets/art/skies/sky-aurora-vortex.jpg',
    archonSky: 'assets/art/skies/sky-archon.jpg',
    bloodFog: 'assets/art/skies/sky-blood-fog.jpg',
    bloodSpires: 'assets/art/skies/sky-blood-spires.jpg',
    eclipseSky: 'assets/art/skies/sky-eclipse.jpg',
    bloodMoon: 'assets/art/skies/sky-blood-moon.jpg',
    pirateDusk: 'assets/art/skies/sky-pirate-dusk.jpg',
    hangar: 'assets/art/workshop-hangar.jpg',
    hangarDocked: 'assets/art/workshop-hangar-docked.jpg',
    defeat: 'assets/art/skies/sky-defeat.jpg',
    auroraPort: 'assets/art/skies/sky-aurora-port.jpg',
    auroraTrader: 'assets/art/skies/sky-aurora-trader.jpg',
    auroraDock: 'assets/art/skies/sky-aurora-dock.jpg',
    auroraCalm: 'assets/art/skies/sky-aurora-calm.jpg',
    auroraNight: 'assets/art/skies/sky-aurora-night.jpg',
    auroraSpire: 'assets/art/skies/sky-aurora-spire.jpg',
    auroraMaelstrom: 'assets/art/skies/sky-aurora-maelstrom.jpg',
    archonKeep: 'assets/art/skies/sky-archon-keep.jpg',
    auroraDawn: 'assets/art/skies/sky-aurora-dawn.jpg',
    auroraSunrise: 'assets/art/skies/sky-aurora-sunrise.jpg',
    auroraGate: 'assets/art/skies/sky-aurora-gate.jpg',
    auroraWrecks: 'assets/art/skies/sky-aurora-wrecks.jpg',
    bloodPort: 'assets/art/skies/sky-blood-port.jpg',
    bloodTrader: 'assets/art/skies/sky-blood-trader.jpg',
    bloodDock: 'assets/art/skies/sky-blood-dock.jpg',
    bloodCalm: 'assets/art/skies/sky-blood-calm.jpg',
    bloodBeam: 'assets/art/skies/sky-blood-beam.jpg',
    sovereignKeep: 'assets/art/skies/sky-sovereign-keep.jpg',
    bloodEye: 'assets/art/skies/sky-blood-eye.jpg',
    bloodCathedral: 'assets/art/skies/sky-blood-cathedral.jpg',
    bloodWreck: 'assets/art/skies/sky-blood-wreck.jpg',
    bloodDawn: 'assets/art/skies/sky-blood-dawn.jpg',
  };
  const images = {};
  // Painted effect pieces from your aurora-and-blood sheet: ribbons for the Aurora Reaches, mist and
  // the eclipse ring for the Blood Moon.
  const FXART = {};
  for (const n of ['ribbon-1', 'ribbon-2', 'ribbon-wave', 'blood-mist-1', 'blood-mist-2', 'bolt-blue', 'bolt-violet']) { const im = new Image(); im.src = `assets/art/fx/${n}.png`; FXART[n] = im; }
  const fxReady = (n) => FXART[n] && FXART[n].complete && FXART[n].naturalWidth > 0;
  const GULLS = Array.from({ length: 8 }, (_, i) => { const im = new Image(); im.src = `assets/art/bits/gull${i}.png`; return im; });
  for (const [k, src] of Object.entries(ART)) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    images[k] = img;
  }

  // Each biome: sky gradient stops, layer colours, weather and which painted art (if any) forms the far layer.
  const BIOMES = {
    clear: { sky: ['#4f8fc4', '#8cc1e2', '#d8ecf3'], far: '#9ab7cc', farRock: '#8098ad', mid: '#6d86a0', cloud: ['#ffffff', '#e3edf3', '#b9cad8'], wisp: 'rgba(255,255,255,0.55)', weather: 'birds', art: 'skyClear', haze: 'rgba(255,255,255,0.06)', midKind: 'none' },
    storm: { sky: ['#1d2533', '#3a4659', '#5c6878'], far: '#2b3443', farRock: '#222a36', mid: '#384353', cloud: ['#77808e', '#5d6573', '#3f4653'], wisp: 'rgba(120,128,140,0.55)', weather: 'rain', art: 'stormMesa', haze: 'rgba(20,26,44,0.45)', lightning: true },
    smog: { sky: ['#5e4a38', '#8c7356', '#b59a76'], far: '#6d5944', farRock: '#5a4838', mid: '#4a3c30', cloud: ['#b7a58a', '#988670', '#6f604f'], wisp: 'rgba(120,105,85,0.5)', weather: 'soot', art: ['canyon', 'railYard', 'chimneys', 'smokeWrecks'], haze: 'rgba(120,96,70,0.35)', midKind: 'chimneys' },
    sunset: { sky: ['#2f2a55', '#c9605a', '#f4b46a'], far: '#7a4a5e', farRock: '#5e3a4c', mid: '#3d2638', cloud: ['#ffd9b0', '#f2a07e', '#b9677a'], wisp: 'rgba(255,214,170,0.45)', weather: 'motes', art: ['sunset', 'sunsetIsles'], haze: 'rgba(80,40,70,0.18)', midKind: 'airships' },
    dusk: { sky: ['#3a1c2c', '#9a3a32', '#e0704a'], far: '#6a2a2e', farRock: '#4e1e24', mid: '#3a1820', cloud: ['#ffb08a', '#d9705a', '#8e3e46'], wisp: 'rgba(255,170,140,0.42)', weather: 'motes', art: ['cloudsea', 'pirateDusk'], haze: 'rgba(70,20,30,0.16)', midKind: 'airships' },
    night: { sky: ['#070b1c', '#141d3a', '#26305a'], far: '#1a2240', farRock: '#121933', mid: '#0f1428', cloud: ['#59658a', '#3c4668', '#252c48'], wisp: 'rgba(110,125,170,0.4)', weather: 'motes', art: ['night', 'nightCity'], haze: 'rgba(8,12,30,0.22)', midKind: 'airships' },
    lair: { sky: ['#160c0e', '#3a1414', '#7a2a1c'], far: '#2a1214', farRock: '#1d0d0f', mid: '#2c1416', cloud: ['#6e4a48', '#4e3232', '#2e1c1e'], wisp: 'rgba(90,50,50,0.5)', weather: 'embers', art: ['canyonCity', 'pirateLair'], haze: 'rgba(90,20,14,0.3)', midKind: 'wrecks' },
    derelict: { sky: ['#3a1c2c', '#9a3a32', '#e0704a'], far: '#6a2a2e', farRock: '#4e1e24', mid: '#3a1820', cloud: ['#ffb08a', '#d9705a', '#8e3e46'], wisp: 'rgba(255,170,140,0.42)', weather: 'motes', art: 'derelicts', haze: 'rgba(40,20,20,0.12)', midKind: 'none' },
    rift: { sky: ['#160c2c', '#3a1d5c', '#6a3aa0'], far: '#2a1a48', farRock: '#1d1236', mid: '#170e2a', cloud: ['#8a6ac8', '#6a4aa8', '#3c2868'], wisp: 'rgba(170,130,240,0.4)', weather: 'motes', art: 'rift', haze: 'rgba(20,8,40,0.12)', midKind: 'none' },
    port: { sky: ['#2f2a55', '#c9605a', '#f4b46a'], far: '#7a4a5e', farRock: '#5e3a4c', mid: '#3d2638', cloud: ['#ffd9b0', '#f2a07e', '#b9677a'], wisp: 'rgba(255,214,170,0.45)', weather: 'motes', art: 'port', haze: 'rgba(80,40,70,0.1)', midKind: 'none' },
    // Area 2, the Aurora Reaches: auroras over crystal islands, runes and star-dust.
    aurora: { sky: ['#040a1c', '#0b2638', '#17465a'], far: '#2a6a7a', farRock: '#16384a', mid: '#123044', cloud: ['#bfeee8', '#7fc4cc', '#3e7a8e'], wisp: 'rgba(160,255,230,0.22)', weather: 'stardust', art: ['auroraSky', 'auroraSwirl', 'auroraCalm', 'auroraNight', 'auroraDawn', 'auroraSunrise'], midKind: 'runes', haze: 'rgba(10,30,50,0.12)', aurora: 0.55 , ribbons: true },
    auroraRift: { sky: ['#0a0620', '#24124a', '#3a2070'], far: '#3a2a6a', farRock: '#22184a', mid: '#1a1238', cloud: ['#d6c4ff', '#9a84e0', '#5a4a9e'], wisp: 'rgba(200,170,255,0.22)', weather: 'stardust', art: ['auroraRift', 'auroraSpire', 'auroraGate'], midKind: 'runes', haze: 'rgba(20,10,50,0.12)', aurora: 0.5 , ribbons: true },
    auroraDeep: { art: ['auroraVortex', 'auroraMaelstrom'], sky: ['#030616', '#101a40', '#2a1f5e'], far: '#3a3a8a', farRock: '#1c1c4a', mid: '#141238', cloud: ['#c8d8ff', '#8a96d8', '#4a4e90'], wisp: 'rgba(180,200,255,0.22)', weather: 'stardust', midKind: 'runes', haze: 'rgba(8,10,40,0.12)', aurora: 0.6 , ribbons: true },
    archon: { sky: ['#02040e', '#0a1430', '#1a2d55'], far: '#2a4a7a', farRock: '#142640', mid: '#0e1a30', cloud: ['#d0fff4', '#86d0d8', '#3e6e8e'], wisp: 'rgba(180,255,240,0.26)', weather: 'stardust', art: ['archonSky', 'archonKeep'], midKind: 'runes', haze: 'rgba(20,40,90,0.15)', aurora: 0.7 , ribbons: true },
    // Area 3, the Blood Moon: a vast red moon over gothic spires, wrecks, ash, bats and red fog.
    bloodmoon: { sky: ['#07020a', '#26060c', '#5c0f16'], far: '#1c0a10', farRock: '#120609', mid: '#1a080c', cloud: ['#7a3438', '#4e1e22', '#2a0e12'], wisp: 'rgba(150,20,30,0.28)', weather: 'ash', art: ['bloodMoon', 'bloodCalm'], midKind: 'none', haze: 'rgba(40,0,6,0.12)', fog: 0.6, bats: true , mist: true },
    bloodFog: { sky: ['#0a0306', '#300a10', '#6a1a1c'], far: '#2a0e12', farRock: '#16080a', mid: '#1e0a0e', cloud: ['#8a4044', '#5a2428', '#301216'], wisp: 'rgba(170,30,40,0.34)', weather: 'ash', art: ['bloodFog', 'bloodEye'], midKind: 'none', haze: 'rgba(40,0,6,0.12)', fog: 1.1, bats: true , mist: true },
    bloodSpires: { art: ['bloodSpires', 'bloodBeam', 'bloodCathedral'], sky: ['#050106', '#1e0408', '#4a0a10'], far: '#22080e', farRock: '#100406', mid: '#16060a', cloud: ['#6e2c30', '#44181c', '#240a0e'], wisp: 'rgba(130,16,26,0.3)', weather: 'ash', midKind: 'none', haze: 'rgba(40,0,6,0.12)', fog: 0.8, bats: true , mist: true },
    eclipse: { art: ['eclipseSky', 'sovereignKeep'], sky: ['#030003', '#1a0206', '#40060c'], far: '#1a060a', farRock: '#0c0204', mid: '#120408', cloud: ['#5e2026', '#3a1014', '#1e0608'], wisp: 'rgba(120,10,20,0.32)', weather: 'ash', midKind: 'none', haze: 'rgba(30,0,4,0.15)', fog: 0.9, bats: true , mist: true },
    // Docks, trade lanes and guild islands in the later areas (AREAS[].placeBiomes).
    auroraPort: { art: 'auroraPort', sky: ['#040a1c', '#0b2638', '#17465a'], far: '#2a6a7a', farRock: '#16384a', mid: '#123044', cloud: ['#bfeee8', '#7fc4cc', '#3e7a8e'], wisp: 'rgba(160,255,230,0.22)', weather: 'stardust', midKind: 'none', haze: 'rgba(10,30,50,0.1)', aurora: 0.4, ribbons: true },
    auroraTrade: { art: 'auroraTrader', sky: ['#040a1c', '#0b2638', '#17465a'], far: '#2a6a7a', farRock: '#16384a', mid: '#123044', cloud: ['#bfeee8', '#7fc4cc', '#3e7a8e'], wisp: 'rgba(160,255,230,0.22)', weather: 'stardust', midKind: 'none', haze: 'rgba(10,30,50,0.1)', aurora: 0.4, ribbons: true },
    auroraDock: { art: 'auroraDock', sky: ['#040a1c', '#0b2638', '#17465a'], far: '#2a6a7a', farRock: '#16384a', mid: '#123044', cloud: ['#bfeee8', '#7fc4cc', '#3e7a8e'], wisp: 'rgba(160,255,230,0.22)', weather: 'stardust', midKind: 'none', haze: 'rgba(10,30,50,0.1)', aurora: 0.4, ribbons: true },
    bloodPort: { art: 'bloodPort', sky: ['#07020a', '#26060c', '#5c0f16'], far: '#1c0a10', farRock: '#120609', mid: '#1a080c', cloud: ['#7a3438', '#4e1e22', '#2a0e12'], wisp: 'rgba(150,20,30,0.28)', weather: 'ash', midKind: 'none', haze: 'rgba(40,0,6,0.1)', fog: 0.5, bats: true, mist: true },
    bloodTrade: { art: 'bloodTrader', sky: ['#07020a', '#26060c', '#5c0f16'], far: '#1c0a10', farRock: '#120609', mid: '#1a080c', cloud: ['#7a3438', '#4e1e22', '#2a0e12'], wisp: 'rgba(150,20,30,0.28)', weather: 'ash', midKind: 'none', haze: 'rgba(40,0,6,0.1)', fog: 0.5, bats: true, mist: true },
    bloodDock: { art: 'bloodDock', sky: ['#07020a', '#26060c', '#5c0f16'], far: '#1c0a10', farRock: '#120609', mid: '#1a080c', cloud: ['#7a3438', '#4e1e22', '#2a0e12'], wisp: 'rgba(150,20,30,0.28)', weather: 'ash', midKind: 'none', haze: 'rgba(40,0,6,0.1)', fog: 0.5, bats: true, mist: true },
    victory: { still: 'victory', wisp: 'rgba(255,230,190,0.4)', weather: 'motes' },
    defeat: { still: 'defeat', wisp: 'rgba(120,60,50,0.4)', weather: 'embers' },
    // The final victory breaks the Blood Moon; a defeat shows the sky the ship fell in.
    victoryBlood: { still: 'bloodDawn', wisp: 'rgba(255,220,190,0.4)', weather: 'motes' },
    defeatAurora: { still: 'auroraWrecks', wisp: 'rgba(170,150,240,0.35)', weather: 'stardust' },
    defeatBlood: { still: 'bloodWreck', wisp: 'rgba(150,20,30,0.35)', weather: 'ash' },
    dock: { still: 'deck', wisp: 'rgba(255,255,255,0.4)', weather: 'steam' },
    skydock: { still: 'hangarDocked', wisp: 'rgba(255,240,220,0.3)', weather: 'steam' },
    workshop: { still: 'hangar', wisp: 'rgba(255,240,220,0.3)', weather: 'steam', glow: [0.5, 0.74] },
    interior: { still: 'engine', wisp: 'rgba(255,240,220,0.35)', weather: 'steam', glow: [0.405, 0.5] },
  };
  // Scroll speed of the cloud bank layer in px/s for each mode.
  const SPEED = { travel: 520, flight: 110, combat: 46, docked: 0, title: 70 };
  const FACTORS = { far: 0.06, mid: 0.2, cloudBack: 0.38, cloudFront: 0.62, wisp: 1.5 };

  const rand = (a, b) => a + Math.random() * (b - a);
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  // ---------- sprite painters (flat, outlined, three-tone) ----------
  function cloudSprite(w, h, tones) {
    const c = canvas(w, h);
    const g = c.getContext('2d');
    const puffs = [];
    const n = 5 + Math.floor(w / 40);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const r = h * (0.28 + Math.sin(t * Math.PI) * 0.22) * rand(0.85, 1.15);
      puffs.push({ x: w * (0.12 + t * 0.76) + rand(-6, 6), y: h * 0.62 - Math.sin(t * Math.PI) * h * 0.2 + rand(-4, 4), r });
    }
    const draw = (dy, scale, color) => {
      g.fillStyle = color;
      g.beginPath();
      for (const p of puffs) { g.moveTo(p.x + p.r * scale, p.y + dy); g.arc(p.x, p.y + dy, p.r * scale, 0, Math.PI * 2); }
      g.rect(w * 0.12, h * 0.62 + dy - 1, w * 0.76, h * 0.22 * scale);
      g.fill();
    };
    draw(h * 0.06, 1, tones[2]);
    draw(0, 0.97, tones[1]);
    g.save(); g.globalAlpha = 0.9; draw(-h * 0.05, 0.72, tones[0]); g.restore();
    return c;
  }
  function auroraRgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  // A bat silhouette with its wings at a flap angle (0..1).
  function drawBat(g, x, y, s, flap, color) {
    const up = (flap - 0.5) * 8 * s;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x - 6 * s, y - 2 * s - up, x - 12 * s, y - up);
    g.lineTo(x - 9 * s, y + 2 * s - up * 0.4); g.lineTo(x - 6 * s, y + 1 * s); g.lineTo(x - 3 * s, y + 3 * s);
    g.lineTo(x, y + 2 * s);
    g.lineTo(x + 3 * s, y + 3 * s); g.lineTo(x + 6 * s, y + 1 * s); g.lineTo(x + 9 * s, y + 2 * s - up * 0.4);
    g.lineTo(x + 12 * s, y - up);
    g.quadraticCurveTo(x + 6 * s, y - 2 * s - up, x, y);
    g.fill();
  }
  function airshipSilhouette(g, x, y, s, color) {
    g.fillStyle = color;
    g.beginPath(); g.ellipse(x, y, 40 * s, 13 * s, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x + 36 * s, y); g.lineTo(x + 50 * s, y - 9 * s); g.lineTo(x + 50 * s, y + 9 * s); g.fill();
    g.fillRect(x - 14 * s, y + 14 * s, 26 * s, 7 * s);
    g.fillRect(x - 10 * s, y + 10 * s, 2 * s, 5 * s); g.fillRect(x + 6 * s, y + 10 * s, 2 * s, 5 * s);
  }

  // ---------- one biome's layers ----------
  class BiomeLayers {
    constructor(name, w, h) {
      this.name = name;
      this.def = BIOMES[name];
      this.w = w; this.h = h;
      this.alpha = 1;
      this.flash = 0;
      this.nextBolt = rand(2, 6);
      this.bolt = null;
      this.build();
    }
    build() {
      const { w, h, def } = this;
      this.tileW = Math.max(1400, Math.ceil(w * 1.6));
      if (def.still) { this.particles = []; this.clouds = []; this.wisps = this.makeWisps(4); return; }
      // Sky gradient.
      this.sky = canvas(4, h);
      const sg = this.sky.getContext('2d');
      const grad = sg.createLinearGradient(0, 0, 0, h);
      def.sky.forEach((c, i) => grad.addColorStop(i / (def.sky.length - 1), c));
      sg.fillStyle = grad; sg.fillRect(0, 0, 4, h);
      // The far layer is always a painting (drawArt); every biome names one.
      // Mid layer.
      this.mid = canvas(this.tileW, h);
      const mg = this.mid.getContext('2d');
      const midKind = def.midKind || 'none';
      if (midKind === 'airships') for (let i = 0; i < 4; i++) airshipSilhouette(mg, rand(60, this.tileW - 60), rand(h * 0.15, h * 0.45), rand(0.35, 0.7), def.mid);
      if (midKind === 'runes') {
        // Faint rune circles hanging in the sky.
        this.runes = [];
        for (let i = 0; i < 5; i++) this.runes.push({ x: rand(0, this.tileW), y: rand(h * 0.12, h * 0.6), r: rand(16, 34), spin: rand(-0.4, 0.4), seed: Math.floor(rand(0, 99)) });
      }
      if (midKind === 'chimneys') {
        this.stacks = [];
        for (let i = 0; i < 6; i++) {
          const x = rand(0, this.tileW), sw = rand(14, 26), sh = rand(h * 0.25, h * 0.5);
          mg.fillStyle = def.mid; mg.fillRect(x, h - sh, sw, sh); mg.fillRect(x - 3, h - sh, sw + 6, 8);
          mg.fillStyle = 'rgba(255,170,80,0.5)'; mg.fillRect(x + sw * 0.3, h - sh * 0.6, sw * 0.4, 5);
          this.stacks.push({ x: x + sw / 2, y: h - sh });
        }
      }
      if (midKind === 'wrecks') {
        for (let i = 0; i < 4; i++) {
          const x = rand(0, this.tileW), y = rand(h * 0.2, h * 0.5);
          mg.save(); mg.translate(x, y); mg.rotate(rand(-0.5, 0.5));
          airshipSilhouette(mg, 0, 0, rand(0.5, 0.8), def.mid);
          mg.restore();
          mg.strokeStyle = def.mid; mg.lineWidth = 3; mg.beginPath(); mg.moveTo(x, 0); mg.lineTo(x + rand(-20, 20), y - 10); mg.stroke();
        }
      }
      // Cloud banks (two depths) and weather.
      this.clouds = [];
      // The aurora and blood skies are painted with their own clouds: only low front banks drift over them.
      const backs = def.ribbons || def.mist ? 0 : 4;
      for (let i = 0; i < backs + 3; i++) this.clouds.push(this.makeCloud(i < backs ? 'cloudBack' : 'cloudFront', rand(-80, w)));
      this.wisps = this.makeWisps(5);
      this.particles = [];
      // Drifting painted ribbons (aurora) or low banks of blood mist.
      this.ribbons = def.ribbons ? [0, 1, 2].map((i) => ({ n: ['ribbon-1', 'ribbon-2', 'ribbon-wave'][i], x: rand(-200, w), y: h * (0.04 + i * 0.12), k: rand(0.9, 1.3), v: rand(5, 12), a: rand(0.35, 0.55) })) : null;
      this.mists = def.mist ? [0, 1, 2].map((i) => ({ n: i % 2 ? 'blood-mist-2' : 'blood-mist-1', x: rand(-300, w), y: h * (0.66 + i * 0.1), k: rand(1, 1.5), v: rand(10, 22), a: rand(0.3, 0.5) })) : null;
    }
    drawPainted(g, list, add, speed) {
      g.save(); if (add) g.globalCompositeOperation = 'lighter';
      for (const r of list) {
        if (!fxReady(r.n)) continue;
        const im = FXART[r.n], w = im.naturalWidth * r.k * Math.min(1.4, this.h / 380), hh = im.naturalHeight * r.k * Math.min(1.4, this.h / 380);
        r.x -= (r.v + speed * 0.12) * (this.dtLast || 0);
        if (r.x < -w) r.x = this.w + rand(20, 300);
        g.globalAlpha = r.a * (0.85 + 0.15 * Math.sin((this.t || 0) * 0.6 + r.y));
        g.drawImage(im, r.x, r.y - hh / 2 + Math.sin((this.t || 0) * 0.3 + r.x * 0.01) * 6, w, hh);
      }
      g.restore();
    }
    ridge(g, base, amp, color, alpha) {
      g.save(); g.globalAlpha = alpha; g.fillStyle = color;
      g.beginPath(); g.moveTo(0, this.h);
      const steps = 24;
      const ys = [];
      for (let i = 0; i <= steps; i++) ys.push(base - Math.abs(Math.sin(i * 1.7 + rand(0, 1))) * amp * rand(0.4, 1));
      ys[steps] = ys[0]; // seamless
      for (let i = 0; i <= steps; i++) g.lineTo((i / steps) * this.tileW, ys[i]);
      g.lineTo(this.tileW, this.h); g.fill(); g.restore();
    }
    wrapDraw(g, sprite, x, y, alpha) {
      g.save(); g.globalAlpha = alpha;
      g.drawImage(sprite, x, y);
      if (x + sprite.width > this.tileW) g.drawImage(sprite, x - this.tileW, y);
      g.restore();
    }
    makeCloud(layer, x) {
      const def = this.def;
      const front = layer === 'cloudFront';
      // In open skies, the far bank mixes in the painted clouds from the sprite sheet, tinted to the light.
      const SP = window.CardshipsSprites;
      const TINT = { clear: null, sunset: 'rgba(255,170,120,0.35)', dusk: 'rgba(220,90,80,0.45)', night: 'rgba(20,28,70,0.62)' };
      if (!front && this.name in TINT && SP && SP.ready() && Math.random() < 0.6) {
        const name = ['cloud_big', 'cloud_puff', 'cloud_small'][Math.floor(Math.random() * 3)];
        const f = SP.FRAMES[name];
        const k = rand(1.6, 2.6) * Math.min(1.2, this.h / 320);
        const c = canvas(f[2] * k, f[3] * k);
        const cg = c.getContext('2d');
        cg.drawImage(SP.image, f[0], f[1], f[2], f[3], 0, 0, c.width, c.height);
        if (TINT[this.name]) { cg.globalCompositeOperation = 'source-atop'; cg.fillStyle = TINT[this.name]; cg.fillRect(0, 0, c.width, c.height); }
        return { layer, sprite: c, x, y: rand(this.h * 0.05, this.h * 0.5), alpha: 0.85 };
      }
      const cw = (front ? rand(130, 240) : rand(90, 200)) * Math.min(1.2, this.h / 320);
      const ch = cw * rand(0.32, 0.45);
      return { layer, sprite: cloudSprite(cw, ch, def.cloud), x, y: front ? rand(this.h * 0.88, this.h * 1.02) - ch * 0.3 : rand(this.h * 0.05, this.h * 0.5), alpha: front ? 0.82 : 0.6 };
    }
    makeWisps(n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const cw = rand(200, 380), ch = cw * 0.3;
        const tone = this.def.wisp;
        out.push({ sprite: cloudSprite(cw, ch, [tone, tone, tone]), x: rand(0, this.w * 2.5), y: rand(this.h * 0.35, this.h * 1.0) - ch / 2, alpha: rand(0.25, 0.45) });
      }
      return out;
    }
    update(dt, speed) {
      const def = this.def;
      for (const c of this.clouds) {
        c.x -= speed * FACTORS[c.layer] * dt + (def.still ? 0 : 4 * dt);
        if (c.x < -c.sprite.width) { Object.assign(c, this.makeCloud(c.layer, this.w + rand(10, 200))); }
      }
      for (const wsp of this.wisps) {
        wsp.x -= (speed * FACTORS.wisp + 12) * dt;
        if (wsp.x < -wsp.sprite.width) { wsp.x = this.w + rand(200, 900); wsp.y = rand(this.h * 0.35, this.h) - wsp.sprite.height / 2; }
      }
      // Weather particles.
      const P = this.particles;
      const want = { rain: 90, soot: 45, embers: 40, motes: 25, birds: 0, steam: 14, stardust: 70, ash: 60 }[def.weather] || 0;
      while (P.length < want) P.push(this.spawn(true));
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.x += (p.vx - speed * p.f) * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0 || p.x < -20 || p.y > this.h + 20 || p.y < -30) P[i] = this.spawn(false);
      }
      if (def.bats) {
        this.batT = (this.batT == null ? rand(2, 5) : this.batT) - dt;
        if (this.batT <= 0 && !this.batFlock) { this.batFlock = { x: this.w + 30, y: rand(this.h * 0.08, this.h * 0.35), n: Math.floor(rand(5, 11)), t: 0, seeds: Array.from({ length: 12 }, () => [rand(-40, 40), rand(-18, 18), rand(0, 6), rand(0.7, 1.2)]) }; this.batT = rand(7, 14); }
        if (this.batFlock) { this.batFlock.x -= (70 + speed * 0.3) * dt; this.batFlock.t += dt; if (this.batFlock.x < -120) this.batFlock = null; }
      }
      if (def.weather === 'birds') {
        this.birdT = (this.birdT || rand(3, 8)) - dt;
        if (this.birdT <= 0 && !this.flock) { this.flock = { x: this.w + 20, y: rand(this.h * 0.1, this.h * 0.4), n: Math.floor(rand(3, 7)), t: 0 }; this.birdT = rand(8, 16); }
        if (this.flock) { this.flock.x -= (40 + speed * 0.3) * dt; this.flock.t += dt; if (this.flock.x < -80) this.flock = null; }
      }
      if (def.lightning) {
        this.nextBolt -= dt;
        if (this.nextBolt <= 0) { this.flash = 1; this.bolt = this.makeBolt(); this.boltArt = null; this.nextBolt = rand(3, 8); }
        this.flash = Math.max(0, this.flash - dt * 2.2);
      }
      if (this.stacks) {
        this.smokeT = (this.smokeT || 0) - dt;
        if (this.smokeT <= 0) { this.smokeT = 0.25; }
      }
      this.t = (this.t || 0) + dt;
      this.dtLast = dt; this.speedLast = speed;
    }
    spawn(initial) {
      const { w, h } = this;
      const kind = this.def.weather;
      const p = { x: rand(0, w * 1.2), y: initial ? rand(0, h) : -10, vx: 0, vy: 0, life: 6, f: 0.8, kind };
      if (kind === 'rain') { p.vx = -160; p.vy = rand(520, 700); p.f = 0.3; p.len = rand(8, 16); }
      if (kind === 'soot') { p.vx = rand(-20, -5); p.vy = rand(8, 26); p.r = rand(0.8, 2.2); p.f = 0.5; p.life = rand(5, 10); }
      if (kind === 'embers') { p.y = initial ? rand(0, h) : h + 5; p.vx = rand(-30, 10); p.vy = rand(-50, -20); p.r = rand(1, 2.4); p.f = 0.4; p.life = rand(3, 7); }
      if (kind === 'motes') { p.vx = rand(-8, 8); p.vy = rand(-6, 6); p.r = rand(0.8, 1.8); p.f = 0.2; p.life = rand(4, 9); }
      if (kind === 'ash') { p.vx = rand(-26, -6); p.vy = rand(10, 30); p.r = rand(0.8, 2.4); p.f = 0.45; p.life = rand(5, 11); p.spin = rand(0, 6); }
      if (kind === 'stardust') { p.vx = rand(-10, 4); p.vy = rand(-8, 4); p.r = rand(0.6, 1.8); p.f = 0.25; p.life = rand(3, 8); p.max = p.life; p.hue = Math.floor(rand(0, 4)); }
      if (kind === 'steam') { p.x = rand(0, w); p.y = initial ? rand(0, h) : h + 20; p.vx = rand(-6, 6); p.vy = rand(-28, -14); p.r = rand(16, 34); p.f = 0; p.life = rand(4, 8); p.max = p.life; }
      return p;
    }
    makeBolt() {
      const pts = [];
      let x = rand(this.w * 0.1, this.w * 0.9), y = 0;
      while (y < this.h * 0.55) { pts.push([x, y]); x += rand(-22, 22); y += rand(12, 26); }
      return pts;
    }
    // Paints everything behind the ships.
    drawBack(g, offset) {
      const { w, h, def } = this;
      if (def.still) return this.drawStill(g);
      g.drawImage(this.sky, 0, 0, w, h);
      this.drawArt(g, offset * FACTORS.far);
      if (this.flash > 0 && this.bolt) {
        g.save();
        g.globalAlpha = this.flash * 0.45; g.fillStyle = '#dfe9ff'; g.fillRect(0, 0, w, h);
        g.globalAlpha = Math.min(1, this.flash * 1.6);
        // Your painted bolts from the weather sheet; the drawn bolt stands in until they load.
        const [bx, by] = this.bolt[0];
        const art = this.boltArt || (this.boltArt = Math.random() < 0.5 ? 'bolt-blue' : 'bolt-violet');
        if (fxReady(art)) {
          const im = FXART[art], bh = h * 0.55, bw = bh * im.naturalWidth / im.naturalHeight;
          g.globalCompositeOperation = 'lighter';
          g.drawImage(im, bx - bw / 2, by, bw, bh);
        } else {
          g.strokeStyle = '#f4f8ff'; g.lineWidth = 2.5; g.shadowColor = '#a9c4ff'; g.shadowBlur = 12;
          g.beginPath(); this.bolt.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
        }
        g.restore();
      }
      if (def.aurora) this.drawAurora(g);
      if (this.ribbons) this.drawPainted(g, this.ribbons, true, this.speedLast || 0);
      this.drawTile(g, this.mid, offset * FACTORS.mid);
      if (this.runes) this.drawRunes(g, offset * FACTORS.mid);
      if (this.stacks) this.drawSmokeStacks(g, offset * FACTORS.mid);
      if (this.flock) this.drawBirds(g);
      if (this.batFlock) for (let i = 0; i < this.batFlock.n; i++) { const [dx, dy, ph, k] = this.batFlock.seeds[i]; const f = this.batFlock; drawBat(g, f.x + dx, f.y + dy + Math.sin(f.t * 2 + ph) * 6, 1.1 * k, 0.5 + 0.5 * Math.sin(f.t * 14 + ph), 'rgba(10,2,4,0.85)'); }
      for (const c of this.clouds) if (c.layer === 'cloudBack') { g.globalAlpha = c.alpha; g.drawImage(c.sprite, c.x, c.y); }
      g.globalAlpha = 1;
    }
    // Clouds that pass between the ships and the camera.
    drawMidFront(g) {
      for (const c of this.clouds) if (c.layer === 'cloudFront') { g.globalAlpha = c.alpha; g.drawImage(c.sprite, c.x, c.y); }
      g.globalAlpha = 1;
    }
    drawFront(g) {
      for (const wsp of this.wisps) { g.globalAlpha = wsp.alpha; g.drawImage(wsp.sprite, wsp.x, wsp.y); }
      g.globalAlpha = 1;
      if (this.def.fog) this.drawFog(g);
      if (this.mists) this.drawPainted(g, this.mists, false, this.speedLast || 0);
      this.drawParticles(g);
      if (this.def.mist && Scene.eclipse && Scene.eclipse()) {
        g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(150,20,24,0.55)'; g.fillRect(0, 0, this.w, this.h); g.restore();
        const v = g.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.3, this.w / 2, this.h / 2, this.w * 0.75);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,0,0,0.6)');
        g.fillStyle = v; g.fillRect(0, 0, this.w, this.h);
      }
    }
    drawTile(g, tile, off) {
      const x = -(off % this.tileW);
      g.drawImage(tile, x, 0);
      if (x + this.tileW < this.w) g.drawImage(tile, x + this.tileW, 0);
    }
    // Painted art as a slow, mirrored, endlessly scrolling far layer.
    drawArt(g, off) {
      // A biome with several paintings picks one each time you fly into it.
      if (this.artKey == null) { const a = this.def.art; this.artKey = Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a; }
      const img = images[this.artKey];
      if (!img || !img.complete || !img.naturalWidth) return;
      if (!this.artTile || this.artTile.height !== this.h) {
        const scale = (this.h * 1.05) / img.naturalHeight;
        const iw = img.naturalWidth * scale;
        const t = canvas(iw * 2, this.h);
        const tg = t.getContext('2d');
        tg.drawImage(img, 0, this.h - img.naturalHeight * scale, iw, img.naturalHeight * scale);
        tg.save(); tg.translate(iw * 2, 0); tg.scale(-1, 1);
        tg.drawImage(img, 0, this.h - img.naturalHeight * scale, iw, img.naturalHeight * scale);
        tg.restore();
        tg.fillStyle = this.def.haze; tg.fillRect(0, 0, t.width, t.height);
        this.artTile = t;
      }
      const tw = this.artTile.width;
      const x = -(off % tw);
      g.drawImage(this.artTile, x, 0);
      if (x + tw < this.w) g.drawImage(this.artTile, x + tw, 0);
    }
    // Still painted scenes (Sky Dock, merchant's engine room) with a slow drift and moving steam.
    drawStill(g) {
      const img = images[this.def.still];
      const { w, h } = this;
      if (img && img.complete && img.naturalWidth) {
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * 1.08;
        const iw = img.naturalWidth * scale, ih = img.naturalHeight * scale;
        const t = this.t || 0;
        const x = (w - iw) / 2 + Math.sin(t * 0.05) * (iw - w) * 0.45;
        const y = (h - ih) / 2 + Math.cos(t * 0.04) * (ih - h) * 0.3;
        g.drawImage(img, x, y, iw, ih);
        if (this.def.glow) {
          const [gx, gy] = this.def.glow;
          const flick = 0.5 + Math.sin(t * 7) * 0.12 + Math.sin(t * 13.3) * 0.08;
          const rg = g.createRadialGradient(x + gx * iw, y + gy * ih, 0, x + gx * iw, y + gy * ih, ih * 0.22);
          rg.addColorStop(0, `rgba(255,190,90,${0.35 * flick})`); rg.addColorStop(1, 'rgba(255,190,90,0)');
          g.fillStyle = rg; g.fillRect(0, 0, w, h);
        }
      } else {
        g.fillStyle = '#2a2019'; g.fillRect(0, 0, w, h);
      }
    }
    // Aurora curtains: shimmering vertical light in slowly waving bands. In a fight they take the
    // colour of the turn's aurora (Scene.auroraColor); otherwise they drift through the palette.
    drawAurora(g) {
      const { w, h } = this;
      const t = this.t || 0;
      const forced = Scene.auroraColor ? Scene.auroraColor() : null;
      const palette = forced ? [forced, forced, '#ffe9a8'] : ['#5dffa8', '#4fd8ff', '#c08cff'];
      const strength = this.def.aurora;
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 3; b++) {
        const col = palette[(b + Math.floor(t / 9)) % palette.length];
        const base = h * (0.1 + b * 0.11), amp = h * 0.06, len = h * (0.18 + b * 0.04);
        for (let x = 0; x < w; x += 5) {
          const top = base + Math.sin(x * 0.005 + t * 0.25 + b * 2) * amp + Math.sin(x * 0.013 - t * 0.4) * amp * 0.4;
          const shimmer = 0.5 + 0.5 * Math.sin(x * 0.045 + t * (1.2 + b * 0.3) + b);
          const a = (0.05 + 0.09 * shimmer) * strength;
          const gr = g.createLinearGradient(0, top, 0, top + len);
          gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.25, auroraRgba(col, a)); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(x, top, 5, len);
        }
      }
      g.restore();
    }
    // Red fog drifting low across the scene.
    drawFog(g) {
      const { w, h } = this;
      const t = this.t || 0;
      const k = this.def.fog;
      for (let b = 0; b < 3; b++) {
        const y = h * (0.62 + b * 0.13) + Math.sin(t * 0.3 + b) * 8;
        const gr = g.createLinearGradient(0, y - 40, 0, y + 50);
        gr.addColorStop(0, 'rgba(160,20,30,0)'); gr.addColorStop(0.5, `rgba(160,20,30,${0.14 * k})`); gr.addColorStop(1, 'rgba(160,20,30,0)');
        g.fillStyle = gr; g.fillRect(0, y - 40, w, 90);
      }
    }
    drawRunes(g, off) {
      const t = this.t || 0;
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const r of this.runes) {
        let x = r.x - (off % this.tileW);
        if (x < -60) x += this.tileW;
        const a = 0.18 + 0.12 * Math.sin(t * 1.5 + r.seed);
        g.strokeStyle = `rgba(170,255,230,${a})`; g.lineWidth = 1.5;
        g.save(); g.translate(x, r.y); g.rotate(t * r.spin);
        g.beginPath(); g.arc(0, 0, r.r, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(0, 0, r.r * 0.7, 0, Math.PI * 2); g.stroke();
        for (let i = 0; i < 6; i++) { const ang = (i * Math.PI) / 3 + r.seed; g.beginPath(); g.moveTo(Math.cos(ang) * r.r * 0.7, Math.sin(ang) * r.r * 0.7); g.lineTo(Math.cos(ang + 1.3) * r.r * 0.3, Math.sin(ang + 1.3) * r.r * 0.3); g.stroke(); }
        g.restore();
      }
      g.restore();
    }
    drawSmokeStacks(g, off) {
      const t = this.t || 0;
      for (const s of this.stacks) {
        let x = s.x - (off % this.tileW);
        if (x < -60) x += this.tileW;
        for (let i = 0; i < 6; i++) {
          const k = ((t * 0.35 + i / 6) % 1);
          g.globalAlpha = (1 - k) * 0.45;
          g.fillStyle = '#4a3f36';
          g.beginPath(); g.arc(x - k * 60, s.y - k * 90, 8 + k * 26, 0, Math.PI * 2); g.fill();
        }
      }
      g.globalAlpha = 1;
    }
    // A flock of seagulls flapping across (painted frames; line birds until they load).
    drawBirds(g) {
      const f = this.flock;
      const ready = GULLS.every((im) => im.complete && im.naturalWidth);
      g.strokeStyle = 'rgba(40,50,70,0.7)'; g.lineWidth = 1.6;
      for (let i = 0; i < f.n; i++) {
        const bx = f.x + i * 22 + (i % 2) * 8, by = f.y + Math.abs(i - f.n / 2) * 8;
        if (ready) {
          const im = GULLS[Math.floor(f.t * 12 + i * 3) % GULLS.length];
          const w = 26 * (0.8 + ((i * 37) % 5) * 0.08);
          g.save(); g.translate(bx, by); g.scale(-1, 1); g.drawImage(im, -w / 2, -w / 2 * (im.naturalHeight / im.naturalWidth), w, w * (im.naturalHeight / im.naturalWidth)); g.restore();
          continue;
        }
        const flap = Math.sin(f.t * 10 + i) * 3;
        g.beginPath(); g.moveTo(bx - 6, by - flap); g.quadraticCurveTo(bx - 3, by - 3, bx, by); g.quadraticCurveTo(bx + 3, by - 3, bx + 6, by - flap); g.stroke();
      }
    }
    drawParticles(g) {
      const kind = this.def.weather;
      if (kind === 'rain') {
        g.strokeStyle = 'rgba(190,205,225,0.5)'; g.lineWidth = 1.2; g.beginPath();
        for (const p of this.particles) { g.moveTo(p.x, p.y); g.lineTo(p.x + p.len * 0.25, p.y - p.len); }
        g.stroke();
        return;
      }
      for (const p of this.particles) {
        if (kind === 'soot') { g.fillStyle = 'rgba(40,32,26,0.6)'; }
        else if (kind === 'embers') { g.fillStyle = `rgba(255,${120 + Math.floor(p.life * 15)},60,${Math.min(1, p.life / 2)})`; }
        else if (kind === 'motes') { g.fillStyle = 'rgba(255,230,180,0.6)'; }
        else if (kind === 'steam') { g.fillStyle = `rgba(255,248,236,${0.12 * Math.sin((p.life / p.max) * Math.PI)})`; }
        else if (kind === 'ash') { g.fillStyle = p.r > 1.8 ? 'rgba(200,190,185,0.55)' : 'rgba(150,60,60,0.6)'; g.fillRect(p.x, p.y, p.r * 1.6, p.r * 0.8); continue; }
        else if (kind === 'stardust') { const tw = Math.sin((p.life / p.max) * Math.PI) * (0.6 + 0.4 * Math.sin(p.life * 9)); g.fillStyle = ['rgba(180,255,230,', 'rgba(210,190,255,', 'rgba(255,240,190,', 'rgba(170,220,255,'][p.hue] + Math.max(0, tw) + ')'; }
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
      }
    }
  }

  // ---------- the scene ----------
  class Scene {
    constructor(el) {
      this.canvas = el;
      this.g = el.getContext('2d');
      this.biome = null;
      this.prev = null;
      this.mode = 'title';
      this.speed = SPEED.title;
      this.offset = 0;
      this.joltV = 0;
      this.shake = 0;
      this.timeScale = 1;
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resize();
      new ResizeObserver(() => this.resize()).observe(el);
      this.last = performance.now();
      const loop = (now) => { this.frame(now); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      if (w === this.w && h === this.h) return;
      this.w = w; this.h = h; this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
      if (this.biome) this.biome = new BiomeLayers(this.biome.name, w, h);
      this.prev = null;
    }
    setBiome(name) {
      if (window.CardshipsAudio && window.CardshipsAudio.setAmbience) window.CardshipsAudio.setAmbience(name);
      if (!BIOMES[name]) name = 'clear';
      if (this.biome && this.biome.name === name) return;
      this.prev = this.biome;
      this.biome = new BiomeLayers(name, this.w, this.h);
      this.biome.alpha = this.prev ? 0 : 1;
    }
    setMode(mode) { this.mode = mode; }
    // A sudden lurch, e.g. a Ram: the world snaps backwards and the camera shakes.
    jolt(power = 1) { this.joltV = -260 * power; this.kick(10 * power); }
    kick(amount) { this.shake = Math.min(32, Math.max(this.shake, amount)); } // capped: no hit shakes the view off its frame
    frame(now) {
      let dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (this.freezeUntil && now < this.freezeUntil) dt = 0;
      dt *= this.timeScale;
      const target = (SPEED[this.mode] ?? SPEED.flight) * (this.reduceMotion ? 0.3 : 1);
      this.speed += (target - this.speed) * Math.min(1, dt * 1.6);
      this.joltV *= Math.pow(0.02, dt);
      const v = this.speed + this.joltV;
      this.offset += v * dt;
      const g = this.g;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.clearRect(0, 0, this.w, this.h);
      if (!this.biome) return;
      this.biome.update(dt, v);
      if (this.prev) { this.prev.update(dt, v); this.biome.alpha = Math.min(1, this.biome.alpha + dt * 1.4); if (this.biome.alpha >= 1) this.prev = null; }
      const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
      this.shake = Math.max(0, this.shake - dt * 40);
      g.save();
      g.translate(sx, sy);
      // While a new biome fades in, the old one paints underneath.
      const layers = this.prev ? [this.prev, this.biome] : [this.biome];
      const each = (fn) => { for (const L of layers) this.withAlpha(L === this.biome ? this.biome.alpha : 1, sx, sy, (ctx) => fn(L, ctx)); };
      each((L, ctx) => L.drawBack(ctx, this.offset));
      const view = { w: this.w, h: this.h, dt, t: now / 1000, mode: this.mode, speed: v };
      if (Scene.actors) Scene.actors(g, view);
      each((L, ctx) => L.drawMidFront(ctx));
      if (Scene.fx) this.pixelPass(Scene.fx, view);
      each((L, ctx) => L.drawFront(ctx));
      if (Scene.overlay) Scene.overlay(g, view);
      g.restore();
    }
    // Effects are painted on a low-resolution layer and scaled up unsmoothed, so they share the
    // ships' pixel grid (Scene.pixelScale screen pixels per art pixel).
    pixelPass(fn, view) {
      const P = Scene.pixelScale ? Scene.pixelScale() : 1;
      if (!(P > 1)) return fn(this.g, view);
      const pw = Math.ceil(this.w / P) + 1, ph = Math.ceil(this.h / P) + 1;
      const c = this.px || (this.px = canvas(1, 1));
      if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
      const pg = c.getContext('2d');
      pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, pw, ph);
      pg.setTransform(1 / P, 0, 0, 1 / P, 0, 0);
      fn(pg, view);
      const g = this.g;
      g.save(); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, pw * P, ph * P); g.restore();
    }
    // Paints with the main context, or through an offscreen canvas at a fade alpha.
    withAlpha(a, sx, sy, fn) {
      if (a >= 1) return fn(this.g);
      const tmp = this.tmp || (this.tmp = canvas(1, 1));
      if (tmp.width !== this.canvas.width || tmp.height !== this.canvas.height) { tmp.width = this.canvas.width; tmp.height = this.canvas.height; }
      const tg = tmp.getContext('2d');
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, tmp.width, tmp.height);
      tg.setTransform(this.dpr, 0, 0, this.dpr, sx * this.dpr, sy * this.dpr);
      fn(tg);
      const real = this.g;
      real.save(); real.setTransform(1, 0, 0, 1, 0, 0); real.globalAlpha = a; real.drawImage(tmp, 0, 0); real.restore();
    }
  }
  Scene.actors = null;
  Scene.fx = null;
  Scene.overlay = null;
  Scene.pixelScale = null;
  Scene.eclipse = null; // () => whether the Crimson Sovereign's eclipse darkens the sky
  Scene.auroraColor = null; // () => the colour of the fight's aurora, if there is one
  Scene.BIOMES = BIOMES;
  Scene.images = images;

  window.CardshipsScene = Scene;
})();
