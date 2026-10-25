// Sprite atlases cut from the provided sheets by tools/build_sprites.py: ship parts, effects and
// steampunk parts. Frames are [x, y, w, h, atlas] (atlas 0 when omitted). Full ships face left,
// toward the player; the effects and steampunk parts face right.
(function () {
  const FRAMES = {
    ammo_box: [351,361,89,92,2],
    anchor_a: [880,640,30,42],
    anchor_b: [912,640,29,42],
    autogun_a: [660,144,104,99,2],
    autogun_b: [561,144,97,100,2],
    autogun_shield: [508,262,139,94,2],
    balloon_blue: [662,537,115,72],
    balloon_green: [779,537,115,71],
    balloon_net: [428,537,115,73],
    balloon_red: [545,537,115,72],
    balloon_stripe_blue: [566,298,116,124],
    balloon_stripe_red: [311,537,115,73],
    beacon_green: [891,144,76,97,2],
    beacon_steel: [0,262,69,97,2],
    bench: [40,705,41,33],
    blast_1: [699,0,151,119,1],
    blast_2: [425,0,133,125,1],
    blast_3: [560,0,137,124,1],
    blast_4: [0,0,145,133,1],
    boiler_cart: [0,0,149,142,2],
    boiler_gauges: [301,0,175,140,2],
    boiler_tank: [151,0,148,140,2],
    bolt: [368,705,12,29],
    bombs: [123,456,126,90,2],
    boom_1: [100,311,39,37,1],
    boom_2: [57,311,41,46,1],
    boom_3: [0,311,55,55,1],
    boom_4: [730,231,75,62,1],
    boom_5: [445,231,73,74,1],
    boom_6: [927,135,82,82,1],
    boom_7: [406,135,83,88,1],
    boom_8: [491,135,88,87,1],
    bullet: [0,368,183,14,1],
    bullet_long: [696,311,218,19,1],
    cabin_big: [97,640,56,56],
    cabin_small: [842,640,36,45],
    cannon_a: [125,705,41,30],
    cannon_b: [286,705,44,29],
    cannon_carriage: [485,548,169,79,2],
    cannon_ornate: [561,456,203,86,2],
    cart: [278,640,50,54],
    chest_ornate: [149,548,118,83,2],
    chest_wood: [766,456,111,86,2],
    cloud_big: [208,705,76,30],
    cloud_puff: [456,705,47,27],
    cloud_small: [134,741,43,17],
    coal_iron: [0,144,123,116,2],
    coal_wood: [125,144,123,115,2],
    compass: [71,262,87,97,2],
    compass_wheel: [799,144,90,98,2],
    crate_wood: [662,361,94,92,2],
    engine_box: [896,537,64,69],
    engine_ornate: [478,0,156,138,2],
    engine_small: [155,640,49,55],
    engine_turbine: [206,640,70,55],
    fin_a: [384,456,65,88,2],
    fin_b: [399,548,84,80,2],
    fin_c: [81,548,66,84,2],
    fireball: [872,231,146,57,1],
    flag_blue: [330,640,47,52],
    flag_cross: [473,640,46,50],
    flag_green: [425,640,46,50],
    flag_jolly: [567,640,46,49],
    flag_red: [379,640,44,50],
    flag_star: [521,640,44,49],
    flame_trail: [293,311,191,29,1],
    frame: [418,705,36,27],
    gate: [732,640,32,47],
    gatling_a: [260,635,136,65,2],
    gatling_b: [857,548,137,74,2],
    gatling_heavy: [208,361,141,92,2],
    gauge: [269,548,93,82,2],
    gears_a: [780,0,198,131,2],
    gears_b: [636,0,142,135,2],
    grapple: [848,298,71,118],
    gun_brass: [251,456,131,89,2],
    gun_copper: [792,262,156,93,2],
    gun_heavy: [758,361,188,91,2],
    gun_steel: [649,262,141,93,2],
    gun_twin: [160,262,144,96,2],
    harpoon: [0,741,122,20],
    hook: [721,705,31,22],
    hull_iron: [684,298,162,121],
    hull_trim: [0,537,153,101],
    hull_wood: [155,537,154,91],
    ladder: [962,537,20,68],
    lamp: [697,640,33,47],
    lever_a: [741,548,34,77,2],
    lever_b: [364,548,33,80,2],
    mast: [542,298,22,152],
    motor_a: [77,635,89,69,2],
    motor_b: [168,635,90,68,2],
    muzzle_trail: [141,311,150,35,1],
    net: [0,640,95,63],
    orb_blue: [663,231,65,64,1],
    orb_green: [807,231,63,58,1],
    panel_iron: [530,361,130,92,2],
    pipe: [179,741,43,16],
    plank: [505,705,42,26],
    plate_a: [0,361,101,93,2],
    plate_b: [103,361,103,93,2],
    pole: [124,741,8,18],
    prop_3a: [656,548,83,79,2],
    prop_3b: [0,635,75,73,2],
    prop_4: [777,548,78,77,2],
    prop_6: [0,548,79,85,2],
    prop_a: [615,640,36,47],
    prop_b: [653,640,42,47],
    rail: [168,705,38,30],
    ram_prow: [766,640,74,46],
    rigging: [389,298,105,166],
    ring_brass: [879,456,117,85,2],
    ring_steel: [451,456,108,87,2],
    rocket: [147,0,130,130,1],
    rocket_bundle: [306,262,103,95,2],
    rocket_flat: [486,311,208,27,1],
    rocket_rack: [0,456,121,90,2],
    rockets_small: [543,635,68,41,2],
    rudder: [442,361,86,92,2],
    sail_jib: [496,298,44,156],
    sail_square: [301,298,86,167],
    shell_a: [766,144,31,99,2],
    shell_b: [250,144,29,107,2],
    shell_c: [281,144,34,107,2],
    shell_d: [317,144,49,106,2],
    shell_e: [368,144,48,105,2],
    ship_dreadnought: [0,0,368,296],
    ship_galleon: [0,298,299,237],
    ship_ironclad: [674,0,337,245],
    ship_pirate: [370,0,302,253],
    smoke_black: [581,135,107,86,1],
    smoke_green: [0,135,94,94,1],
    smoke_grey: [813,135,112,84,1],
    smoke_light: [852,0,97,95,1],
    smoke_olive: [189,135,97,90,1],
    smoke_pink: [96,135,91,92,1],
    smoke_trail: [279,0,144,128,1],
    smoke_white: [288,135,116,89,1],
    spark_gold: [231,231,70,76,1],
    spark_green: [155,231,74,77,1],
    spark_orange: [589,231,72,73,1],
    spark_ring: [0,231,76,78,1],
    spark_star: [78,231,75,77,1],
    splash: [690,135,121,85,1],
    spyglass: [398,635,143,56,2],
    steam_puff: [549,705,38,25],
    torpedo: [418,144,141,103,2],
    trail_flame: [754,705,179,22],
    trail_smoke: [589,705,130,23],
    tube_a: [747,635,129,32,2],
    tube_b: [613,635,132,36,2],
    tube_mesh: [878,635,143,31,2],
    turret_a: [382,705,34,28],
    turret_b: [83,705,40,32],
    turret_c: [943,640,39,36],
    turret_d: [984,640,34,35],
    turret_e: [0,705,38,34],
    turret_f: [332,705,34,29],
    wheel: [411,262,95,95,2],
    zap_blue: [303,231,61,75,1],
    zap_white: [366,231,77,75,1],
    zap_yellow: [520,231,67,73,1],
  };
  const SHEETS = ['assets/art/ship-parts.png', 'assets/art/fx.png', 'assets/art/parts.png'].map((src) => {
    const im = new Image();
    im.decoding = 'async';
    im.src = src;
    return im;
  });
  const img = SHEETS[0];
  const loaded = (im) => im.complete && im.naturalWidth > 0;
  // With a name: whether that frame's atlas has loaded; without: the ship-parts atlas.
  const ready = (name) => loaded(name && FRAMES[name] ? SHEETS[FRAMES[name][4] || 0] : img);

  // Draws a frame centred on (x, y) at width w (height follows the aspect ratio unless h is given).
  // flip mirrors it horizontally.
  function draw(g, name, x, y, w, h = null, flip = false) {
    const f = FRAMES[name];
    if (!f || !ready(name)) return false;
    const hh = h == null ? (w * f[3]) / f[2] : h;
    g.save();
    g.translate(x, y);
    if (flip) g.scale(-1, 1);
    g.drawImage(SHEETS[f[4] || 0], f[0], f[1], f[2], f[3], -w / 2, -hh / 2, w, hh);
    g.restore();
    return true;
  }
  // Three-slice horizontal stretch: the end caps keep their shape and only the middle stretches,
  // so balloons and hulls can lengthen to fit the ship.
  function drawStretched(g, name, x, y, w, h, flip = false, cap = 0.3) {
    const f = FRAMES[name];
    if (!f || !ready(name)) return false;
    const [sx, sy, sw, sh] = f;
    const img = SHEETS[f[4] || 0];
    const cs = Math.floor(sw * cap);
    const cd = Math.min(w / 2, (cs * h) / sh);
    g.save();
    g.translate(x, y);
    if (flip) g.scale(-1, 1);
    const left = -w / 2, top = -h / 2;
    g.drawImage(img, sx, sy, cs, sh, left, top, cd, h);
    g.drawImage(img, sx + cs, sy, sw - 2 * cs, sh, left + cd - 0.5, top, w - 2 * cd + 1, h);
    g.drawImage(img, sx + sw - cs, sy, cs, sh, left + w - cd, top, cd, h);
    g.restore();
    return true;
  }
  const aspect = (name) => (FRAMES[name] ? FRAMES[name][3] / FRAMES[name][2] : 1);

  const allReady = () => SHEETS.every(loaded);

  window.CardshipsSprites = { FRAMES, draw, drawStretched, aspect, ready, allReady, image: img };
})();
