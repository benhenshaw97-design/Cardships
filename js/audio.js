// Music and sound. The provided tracks are assigned to scenes ("cues") with their own start
// section, filter and rate; scene changes crossfade, tracks loop seamlessly by crossfading two
// players, the boss fight steps up a section per phase, and low hull health filters the music.
// Sound effects are synthesised with WebAudio unless a file is registered for that name.
(function () {
  const TRACKS = {
    roam: { src: 'assets/music/pirate-battle-1', loopEnd: 186.5 },   // ~83 BPM, wide dynamics
    battle: { src: 'assets/music/pirate-battle-2', loopEnd: 233.0 }, // ~99 BPM, steady and loud
    boss: { src: 'assets/music/pirate-battle-3', loopEnd: 194.2 },   // ~123 BPM, breakdown then climax
    battle4: { src: 'assets/music/pirate-battle-4', loopEnd: 142.8 },
    battle5: { src: 'assets/music/pirate-battle-5', loopEnd: 140.6 },
    spoils: { src: 'assets/music/victory-at-sea', loopEnd: 134.1 },
    fanfare: { src: 'assets/music/victors-trumpet-call', loopEnd: 162.8 },
    lament: { src: 'assets/music/pirate-defeat', loopEnd: 156.1 },
    menu: { src: 'assets/music/main-menu-scene', loopEnd: 137.0 },
    demon: { src: 'assets/music/arcade-demon-riff', loopEnd: 100.9 },
    // The Aurora Reaches: chiptune spells and a fairy's wand.
    fairy: { src: 'assets/music/aurora-fairy-wand', loopEnd: 128.3 },
    spell1: { src: 'assets/music/aurora-spell-1', loopEnd: 133.2 },
    spell2: { src: 'assets/music/aurora-spell-2', loopEnd: 206.9 },
    spell3: { src: 'assets/music/aurora-spell-3', loopEnd: 150.8 },
    // The Blood Moon: hauntology and ghost battles.
    haunt: { src: 'assets/music/blood-hauntology', loopEnd: 192.5 },
    haunt2: { src: 'assets/music/blood-hauntology-2', loopEnd: 133.2 },
    haunting: { src: 'assets/music/blood-haunting', loopEnd: 142.8 },
    ghost1: { src: 'assets/music/blood-ghost-battle-1', loopEnd: 115.0 },
    ghost2: { src: 'assets/music/blood-ghost-battle-2', loopEnd: 128.2 },
  };
  // cutoff: low-pass filter in Hz (20000 = open). rate < 1 slows and lowers the track.
  // A list of tracks takes turns: each new fight plays the next one.
  const CUES = {
    title: { track: 'menu', start: 0, gain: 0.7, cutoff: 2600 },
    map: { track: 'roam', start: 8, gain: 0.8, cutoff: 20000 },
    dock: { track: 'roam', start: 48, gain: 0.6, cutoff: 900 },
    combat: { track: ['battle', 'battle4', 'battle5'], start: 0, gain: 0.85, cutoff: 20000 },
    hazard: { track: 'boss', start: 79, gain: 0.75, cutoff: 2600 },
    boss: { track: 'boss', start: 0, gain: 0.8, cutoff: 3200 },
    spoils: { track: 'spoils', start: 0, gain: 0.8, cutoff: 20000 },
    victory: { track: 'fanfare', start: 0, gain: 0.9, cutoff: 20000 },
    defeat: { track: 'lament', start: 0, gain: 0.8, cutoff: 20000 },
    // Area 2, the Aurora Reaches: the fairy's wand over the map, the square-wave spells in fights,
    // and the longest spell for the Archon, opening up phase by phase.
    map2: { track: 'fairy', start: 0, gain: 0.8, cutoff: 20000 },
    dock2: { track: 'fairy', start: 40, gain: 0.6, cutoff: 1100 },
    combat2: { track: ['spell1', 'spell3'], start: 0, gain: 0.85, cutoff: 20000 },
    boss2: { track: 'spell2', start: 0, gain: 0.85, cutoff: 5000, steps: 'archon' },
    // Area 3, the Blood Moon: hauntology on the map, the ghost battles in fights, and the second
    // ghost battle for the Sovereign, muffled under the eclipse.
    map3: { track: 'haunt', start: 0, gain: 0.8, cutoff: 20000 },
    dock3: { track: 'haunting', start: 0, gain: 0.6, cutoff: 1200 },
    combat3: { track: ['ghost1', 'haunt2'], start: 0, gain: 0.85, cutoff: 20000 },
    boss3: { track: 'ghost2', start: 0, gain: 0.88, cutoff: 4000, steps: 'sovereign' },
  };
  // Each boss phase jumps to a hotter section of the boss track and opens the filter.
  const BOSS_STEPS = [{ start: 0, cutoff: 3200, gain: 0.8 }, { start: 100, cutoff: 9000, gain: 0.88 }, { start: 168, cutoff: 20000, gain: 0.95 }];
  const STEPS = {
    boss: BOSS_STEPS,
    archon: [{ start: 0, cutoff: 5000, gain: 0.85 }, { start: 70, cutoff: 12000, gain: 0.9 }, { start: 140, cutoff: 20000, gain: 0.96 }],
    // The eclipse (phase 3) closes the filter right down: the music goes dark with the screen.
    sovereign: [{ start: 0, cutoff: 4000, gain: 0.88 }, { start: 40, cutoff: 20000, gain: 0.95 }, { start: 80, cutoff: 900, gain: 1 }],
  };
  const FADE = 1.2;

  // Real sound files (name → url) replace the synthesised versions (tools/build_audio.py makes them).
  const SFX_FILES = {};
  for (const n of ['cannon', 'explode', 'bigHit', 'flame', 'spell', 'splat', 'whoosh']) SFX_FILES[n] = `assets/audio/sfx/${n}.mp3`;
  // How loud each recording plays against the synthesised sounds.
  const SFX_GAIN = { cannon: 0.45, explode: 0.6, bigHit: 0.55, flame: 0.5, spell: 0.45, splat: 0.5, whoosh: 0.4 };
  // Ambience beds looping quietly under each sky (name → level), by biome.
  const AMBIENCE = { rain: 0.32, wind: 0.22, birds: 0.18, voices: 0.12, bloodstorm: 0.26, roomtone: 0.3 };
  const BIOME_AMBIENCE = {
    clear: 'birds', storm: 'rain', smog: 'wind', sunset: 'wind', dusk: 'wind', night: 'wind', lair: 'wind', derelict: 'wind', rift: 'voices', port: 'birds',
    aurora: 'voices', auroraRift: 'voices', auroraDeep: 'voices', archon: 'voices', auroraPort: 'wind', auroraTrade: 'wind', auroraDock: 'wind',
    bloodmoon: 'bloodstorm', bloodFog: 'bloodstorm', bloodSpires: 'bloodstorm', eclipse: 'bloodstorm', bloodPort: 'roomtone', bloodTrade: 'roomtone', bloodDock: 'roomtone',
    victory: 'birds', victoryBlood: 'wind', defeat: 'roomtone', defeatAurora: 'roomtone', defeatBlood: 'roomtone',
  };

  const prefs = () => (window.CardshipsFX ? window.CardshipsFX.prefs : { music: 0.6, sfx: 0.8, mute: false });
  const fileMode = location.protocol === 'file:'; // WebAudio can't read media elements from file://

  let ctx = null, master = null, musicBus = null, musicFilter = null, sfxBus = null, ambBus = null, noiseBuf = null;
  let current = null; // { cue, players, step }
  let wanted = null;
  let tension = false;
  let turn = 0; // which of a cue's tracks plays next
  const sampleCache = {};

  function ext() {
    const a = document.createElement('audio');
    return a.canPlayType('audio/mp4; codecs="mp4a.40.2"') ? '.aac.mp4' : '.opus.m4a';
  }
  const EXT = ext();

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.connect(ctx.destination);
      musicFilter = ctx.createBiquadFilter();
      musicFilter.type = 'lowpass';
      musicFilter.frequency.value = 20000;
      musicBus = ctx.createGain();
      musicFilter.connect(musicBus);
      musicBus.connect(master);
      sfxBus = ctx.createGain();
      sfxBus.connect(master);
      ambBus = ctx.createGain();
      ambBus.connect(sfxBus);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    applyPrefs(prefs());
    if (wanted) setScene(wanted.name, true);
    if (ambWanted) { const n = ambWanted; ambWanted = null; setAmbience(n); }
    if (ctx) for (const n of Object.keys(SFX_FILES)) loadSample(n); // ready before the first shot
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((t) => window.addEventListener(t, unlock, { passive: true }));

  function applyPrefs(p) {
    const vol = p.mute ? 0 : 1;
    if (master) master.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
    if (musicBus) musicBus.gain.setTargetAtTime(p.music * (tension ? 0.72 : 1), ctx.currentTime, 0.1);
    if (sfxBus) sfxBus.gain.setTargetAtTime(p.sfx, ctx.currentTime, 0.05);
    if (fileMode && current) for (const pl of current.players) pl.el.volume = elementVolume(pl);
  }
  function elementVolume(pl) {
    const p = prefs();
    if (p.mute) return 0;
    const muffle = current && current.cutoff < 2000 ? 0.7 : 1;
    return Math.max(0, Math.min(1, pl.level * p.music * muffle * (tension ? 0.72 : 1)));
  }

  // ---------- music players ----------
  // A player is an <audio> element with its own gain; two per cue let loops crossfade into themselves.
  function makePlayer(trackId, start, rate) {
    const el = new Audio(TRACKS[trackId].src + EXT);
    el.preload = 'auto';
    el.playbackRate = rate || 1;
    el.preservesPitch = false;
    el.mozPreservesPitch = false;
    el.webkitPreservesPitch = false;
    const pl = { el, trackId, level: 0, gain: null };
    if (!fileMode && ctx) {
      try { const src = ctx.createMediaElementSource(el); pl.gain = ctx.createGain(); pl.gain.gain.value = 0; src.connect(pl.gain); pl.gain.connect(musicFilter); } catch (e) { pl.gain = null; }
    }
    const begin = () => { try { el.currentTime = start; } catch (e) { /* not seekable yet */ } el.play().catch(() => {}); };
    if (el.readyState >= 1) begin(); else el.addEventListener('loadedmetadata', begin, { once: true });
    return pl;
  }
  function fade(pl, to, secs) {
    pl.target = to;
    if (pl.gain) {
      const g = pl.gain.gain;
      g.cancelScheduledValues(ctx.currentTime);
      g.setValueAtTime(g.value, ctx.currentTime);
      g.linearRampToValueAtTime(to, ctx.currentTime + secs);
      pl.level = to;
    } else {
      const from = pl.level, t0 = performance.now();
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / (secs * 1000));
        pl.level = from + (to - from) * k;
        pl.el.volume = elementVolume(pl);
        if (k < 1) requestAnimationFrame(tick);
      };
      tick();
    }
    if (to === 0) setTimeout(() => { if (pl.target === 0) { pl.el.pause(); pl.el.removeAttribute('src'); pl.el.load(); } }, secs * 1000 + 100);
  }
  function setFilter(cutoff, secs = FADE) {
    if (current) current.cutoff = cutoff;
    if (!musicFilter) return;
    const f = musicFilter.frequency;
    f.cancelScheduledValues(ctx.currentTime);
    f.setValueAtTime(f.value, ctx.currentTime);
    f.exponentialRampToValueAtTime(Math.max(80, tension ? Math.min(cutoff, 1800) : cutoff), ctx.currentTime + secs);
  }

  // Switches music to a scene's cue. Scenes sharing a track keep playing instead of restarting.
  function setScene(name, force = false) {
    wanted = { name };
    const cue = CUES[name];
    if (!cue || !ctx) return;
    if (!force && current && current.cue === name) return;
    const track = Array.isArray(cue.track) ? cue.track[turn++ % cue.track.length] : cue.track;
    const sameTrack = current && current.trackId === track && !cue.rate && !(current.rate) && name !== 'victory' && name !== 'defeat';
    if (sameTrack) {
      current.cue = name;
      fade(current.players[current.players.length - 1], cue.gain, FADE);
      setFilter(cue.cutoff);
      return;
    }
    if (current) for (const pl of current.players) fade(pl, 0, FADE);
    const pl = makePlayer(track, cue.start, cue.rate);
    current = { cue: name, trackId: track, players: [pl], step: 0, rate: cue.rate, cutoff: cue.cutoff };
    fade(pl, cue.gain, FADE);
    setFilter(cue.cutoff);
  }
  // Jumps the boss track to a hotter section, crossfading into it.
  // The current boss cue's phase steps (each area's boss has its own).
  const stepsFor = (cueName) => STEPS[(CUES[cueName] && CUES[cueName].steps) || 'boss'];
  function bossPhase(index) {
    if (!current || !String(current.cue).startsWith('boss') || !ctx) return;
    const steps = stepsFor(current.cue);
    const step = steps[Math.min(index, steps.length - 1)];
    if (current.step === index) return;
    current.step = index;
    for (const pl of current.players) fade(pl, 0, 0.6);
    const pl = makePlayer(current.trackId, step.start, current.rate);
    current.players = [pl];
    fade(pl, step.gain, 0.6);
    setFilter(step.cutoff, 0.8);
  }
  // Low hull: duck and muffle the music a little.
  function setTension(on) {
    if (on === tension) return;
    tension = on;
    applyPrefs(prefs());
    if (current) setFilter(current.cutoff, 0.8);
  }
  function sting(kind) { setScene(kind); }
  // Seamless loops: shortly before a track's end, start a second player at the top and crossfade.
  setInterval(() => {
    if (!current) return;
    const pl = current.players[current.players.length - 1];
    if (!pl || pl.looping) return;
    const end = TRACKS[pl.trackId].loopEnd;
    if (pl.el.currentTime > end - FADE - 0.3) {
      pl.looping = true;
      const cue = CUES[current.cue] || { gain: 0.8 };
      const next = makePlayer(pl.trackId, 0.35, pl.el.playbackRate);
      current.players = [next];
      fade(pl, 0, FADE);
      fade(next, String(current.cue).startsWith('boss') ? stepsFor(current.cue)[current.step].gain : cue.gain, FADE);
    }
  }, 200);

  // ---------- sound effects ----------
  function env(node, t, a, peak, d) {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function noise(t, dur, type, freq, peak, q = 1, sweepTo = null) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); env(g, t, 0.005, peak, dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  function tone(t, dur, type, freq, peak, toFreq = null, attack = 0.004) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    const g = ctx.createGain(); env(g, t, attack, peak, dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  const metal = (t, base, peak, dur) => { for (const m of [1, 1.51, 2.27, 3.1]) tone(t, dur / m, 'triangle', base * m, peak / m); };
  const SYNTH = {
    cannon: (t, o) => { noise(t, 0.35, 'lowpass', o && o.enemy ? 600 : 900, 0.9, 0.7, 120); tone(t, 0.3, 'sine', 110, 0.8, 38); },
    bigHit: (t) => { noise(t, 0.5, 'lowpass', 1400, 1, 0.7, 160); tone(t, 0.45, 'sine', 90, 0.9, 30); metal(t + 0.01, 180, 0.15, 0.4); },
    hit: (t) => { noise(t, 0.12, 'bandpass', 1800, 0.6, 1.2); metal(t, 420, 0.12, 0.18); },
    clang: (t) => metal(t, 523, 0.25, 0.6),
    clank: (t) => { metal(t, 196, 0.22, 0.25); noise(t, 0.05, 'highpass', 3000, 0.25); },
    explode: (t) => { noise(t, 1.1, 'lowpass', 2200, 1, 0.6, 90); tone(t, 0.8, 'sine', 70, 1, 25); },
    flame: (t) => noise(t, 0.45, 'bandpass', 900, 0.5, 0.8, 1600),
    crackle: (t) => { for (let i = 0; i < 9; i++) noise(t + Math.random() * 0.4, 0.02, 'highpass', 2500, 0.35); },
    zap: (t) => { tone(t, 0.18, 'sawtooth', 1400, 0.3, 200); noise(t, 0.15, 'highpass', 4000, 0.3); },
    gatling: (t) => { for (let i = 0; i < 7; i++) { noise(t + i * 0.045, 0.04, 'bandpass', 1500, 0.5, 1.5); } },
    harpoon: (t) => { noise(t, 0.25, 'bandpass', 600, 0.5, 1, 2400); for (let i = 0; i < 5; i++) metal(t + 0.05 + i * 0.03, 900 + Math.random() * 300, 0.04, 0.05); },
    whoosh: (t) => noise(t, 0.4, 'bandpass', 350, 0.5, 1.2, 2200),
    whistle: (t) => tone(t, 0.6, 'sine', 1500, 0.15, 380, 0.05),
    dice: (t) => { for (let i = 0; i < 5; i++) { const k = t + i * 0.07 + Math.random() * 0.03; noise(k, 0.025, 'bandpass', 2200 + Math.random() * 800, 0.4, 3); tone(k, 0.03, 'triangle', 900 + Math.random() * 300, 0.06); } },
    ratchet: (t) => { for (let i = 0; i < 6; i++) { noise(t + i * 0.05, 0.02, 'highpass', 3500, 0.35); } metal(t + 0.3, 660, 0.06, 0.2); },
    hiss: (t) => noise(t, 0.5, 'highpass', 3000, 0.35),
    splat: (t) => { noise(t, 0.15, 'lowpass', 500, 0.5); tone(t, 0.12, 'sine', 220, 0.3, 90); },
    coins: (t) => { for (let i = 0; i < 6; i++) metal(t + i * 0.05, 1300 + Math.random() * 600, 0.07, 0.25); },
    alarm: (t) => { for (let i = 0; i < 3; i++) { tone(t + i * 0.32, 0.15, 'square', 880, 0.12); tone(t + i * 0.32 + 0.16, 0.15, 'square', 660, 0.12); } },
    ram: (t) => { tone(t, 0.6, 'sine', 60, 1, 22); noise(t, 0.7, 'lowpass', 1600, 1, 0.5, 120); metal(t + 0.02, 140, 0.3, 0.7); },
    ui: (t) => tone(t, 0.05, 'triangle', 1200, 0.08),
    spell: (t) => { tone(t, 0.3, 'sine', 600, 0.25, 1400); noise(t, 0.3, 'bandpass', 1200, 0.25, 1, 3000); },
  };
  function loadSample(name) {
    if (sampleCache[name] !== undefined) return sampleCache[name];
    sampleCache[name] = null;
    fetch(SFX_FILES[name]).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((buf) => { sampleCache[name] = buf; }).catch(() => {});
    return null;
  }
  // Plays a named sound effect: a registered file if one is loaded, otherwise the synthesised one.
  let lastSfx = {};
  function sfx(name, opts) {
    if (!ctx || prefs().mute) return;
    const now = ctx.currentTime;
    if (lastSfx[name] && now - lastSfx[name] < 0.04) return; // don't stack identical sounds
    lastSfx[name] = now;
    if (SFX_FILES[name]) {
      const buf = loadSample(name);
      if (buf) {
        const s = ctx.createBufferSource(), g = ctx.createGain();
        s.buffer = buf; s.playbackRate.value = 0.94 + Math.random() * 0.12; // a little variety on repeats
        g.gain.value = (SFX_GAIN[name] || 0.5) * (opts && opts.enemy ? 0.85 : 1);
        s.connect(g); g.connect(sfxBus); s.start();
        return;
      }
    }
    const f = SYNTH[name];
    if (f) f(now + 0.005, opts);
  }
  function registerSfx(name, url) { SFX_FILES[name] = url; delete sampleCache[name]; }

  // Ambience: one bed loops under the current sky and cross-fades when the sky changes.
  const ambCache = {};
  let amb = null, ambWanted = null; // amb: { name, src, gain }
  function loadBed(name) {
    if (!ambCache[name]) ambCache[name] = fetch(`assets/audio/ambience/${name}.mp3`).then((r) => r.arrayBuffer()).then((b) => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no))).catch(() => null);
    return ambCache[name];
  }
  function setAmbience(biome) {
    const name = BIOME_AMBIENCE[biome] || null;
    if (!ctx) { ambWanted = biome; return; }
    if ((amb ? amb.name : null) === name) return;
    if (amb) { const old = amb; old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5); setTimeout(() => { try { old.src.stop(); } catch (e) { /* already stopped */ } }, 3000); }
    amb = null;
    if (!name) return;
    const mine = { name, src: null, gain: ctx.createGain() };
    mine.gain.gain.value = 0;
    mine.gain.connect(ambBus);
    amb = mine;
    loadBed(name).then((buf) => {
      if (!buf || amb !== mine) return;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(mine.gain);
      src.start(0, Math.random() * buf.duration);
      mine.src = src;
      mine.gain.gain.setTargetAtTime(AMBIENCE[name], ctx.currentTime, 0.8);
    });
  }

  window.CardshipsAudio = { setScene, setAmbience, bossPhase, setTension, sting, sfx, registerSfx, applyPrefs, unlock, CUES };
})();
