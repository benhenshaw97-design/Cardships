// Sprite atlas cut from the provided ship-parts sheet (assets/art/ship-parts.png).
// Frames are [x, y, w, h] in the atlas. Full ships face left, toward the player.
(function () {
  const FRAMES = {
    anchor_a: [880,640,30,42],
    anchor_b: [912,640,29,42],
    balloon_blue: [662,537,115,72],
    balloon_green: [779,537,115,71],
    balloon_net: [428,537,115,73],
    balloon_red: [545,537,115,72],
    balloon_stripe_blue: [566,298,116,124],
    balloon_stripe_red: [311,537,115,73],
    bench: [40,705,41,33],
    bolt: [368,705,12,29],
    cabin_big: [97,640,56,56],
    cabin_small: [842,640,36,45],
    cannon_a: [125,705,41,30],
    cannon_b: [286,705,44,29],
    cart: [278,640,50,54],
    cloud_big: [208,705,76,30],
    cloud_puff: [456,705,47,27],
    cloud_small: [134,741,43,17],
    engine_box: [896,537,64,69],
    engine_small: [155,640,49,55],
    engine_turbine: [206,640,70,55],
    flag_blue: [330,640,47,52],
    flag_cross: [473,640,46,50],
    flag_green: [425,640,46,50],
    flag_jolly: [567,640,46,49],
    flag_red: [379,640,44,50],
    flag_star: [521,640,44,49],
    frame: [418,705,36,27],
    gate: [732,640,32,47],
    grapple: [848,298,71,118],
    harpoon: [0,741,122,20],
    hook: [721,705,31,22],
    hull_iron: [684,298,162,121],
    hull_trim: [0,537,153,101],
    hull_wood: [155,537,154,91],
    ladder: [962,537,20,68],
    lamp: [697,640,33,47],
    mast: [542,298,22,152],
    net: [0,640,95,63],
    pipe: [179,741,43,16],
    plank: [505,705,42,26],
    pole: [124,741,8,18],
    prop_a: [615,640,36,47],
    prop_b: [653,640,42,47],
    rail: [168,705,38,30],
    ram_prow: [766,640,74,46],
    rigging: [389,298,105,166],
    sail_jib: [496,298,44,156],
    sail_square: [301,298,86,167],
    ship_dreadnought: [0,0,368,296],
    ship_galleon: [0,298,299,237],
    ship_ironclad: [674,0,337,245],
    ship_pirate: [370,0,302,253],
    steam_puff: [549,705,38,25],
    trail_flame: [754,705,179,22],
    trail_smoke: [589,705,130,23],
    turret_a: [382,705,34,28],
    turret_b: [83,705,40,32],
    turret_c: [943,640,39,36],
    turret_d: [984,640,34,35],
    turret_e: [0,705,38,34],
    turret_f: [332,705,34,29],
  };
  const img = new Image();
  img.decoding = 'async';
  img.src = 'assets/art/ship-parts.png';
  const ready = () => img.complete && img.naturalWidth > 0;

  // Draws a frame centred on (x, y) at width w (height follows the aspect ratio unless h is given).
  // flip mirrors it horizontally.
  function draw(g, name, x, y, w, h = null, flip = false) {
    const f = FRAMES[name];
    if (!f || !ready()) return false;
    const hh = h == null ? (w * f[3]) / f[2] : h;
    g.save();
    g.translate(x, y);
    if (flip) g.scale(-1, 1);
    g.drawImage(img, f[0], f[1], f[2], f[3], -w / 2, -hh / 2, w, hh);
    g.restore();
    return true;
  }
  // Three-slice horizontal stretch: the end caps keep their shape and only the middle stretches,
  // so balloons and hulls can lengthen to fit the ship.
  function drawStretched(g, name, x, y, w, h, flip = false, cap = 0.3) {
    const f = FRAMES[name];
    if (!f || !ready()) return false;
    const [sx, sy, sw, sh] = f;
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

  window.CardshipsSprites = { FRAMES, draw, drawStretched, aspect, ready, image: img };
})();
