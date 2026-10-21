// The shared pose pack for the website (STD), composed from the hero's
// own parts in js/art/sprites/hero.js so every frame matches the game.
//
// A pose frame is the game's frame object ({ c, f, w, h, ox, oy }) plus
// `hand`: where his front hand is, as [dx, dy] from the point between his
// feet, facing right. kit.handAt() mirrors it for facing left.
//
// compose() takes head / torso / legs as part names from hero.js or as
// custom rows written with hero.js's LEGEND (head 9 rows, torso 6, legs 7,
// 14 wide), plus patches of [row, col, pixels] over the whole 22-row
// frame (rows 0–8 head, 9–14 torso, 15–21 legs). Anything past column 13
// widens the frame to 16 on his facing side; the anchor doesn't move.

import * as P from '../art/sprites/hero.js';

const W = 14, WIDE = 16;

function part(v, rows, what) {
  const r = typeof v === 'string' ? P[v] : v;
  if (!Array.isArray(r) || r.length !== rows) throw new Error(`[timeline] pose ${what} must be ${rows} rows (got ${v})`);
  return r;
}

// [row, col] in the authored grid → [dx, dy] from his feet, facing right
export const handFrom = (row, col) => [col - 7, row - 22];

export function compose({ head = 'HEAD', torso = 'T_IDLE', legs = 'L_STAND', rows = null, patch = [], hand = null } = {}) {
  let r = rows ? rows.slice() : [...part(head, 9, 'head'), ...part(torso, 6, 'torso'), ...part(legs, 7, 'legs')];
  if (r.length !== 22) throw new Error('[timeline] a pose is 22 rows, got ' + r.length);
  const wide = r.some((x) => x.length > W) || patch.some(([, c, s]) => c + s.length > W);
  r = r.map((x) => x.padEnd(wide ? WIDE : W, '.'));
  for (const [row, c, s] of patch) r[row] = r[row].slice(0, c) + s + r[row].slice(c + s.length);
  const fr = P.build(r);
  fr.hand = hand ? handFrom(hand[0], hand[1]) : handFrom(13, 9);
  return fr;
}

// the standing torso with its hanging hand removed, for poses that patch an arm in
const T_ARM = P.T_IDLE.map((r, i) => (i === 4 ? '..vbbBkkKkkk..' : r));
// mouth open, for speak
const HEAD_TALK = P.HEAD.map((r, i) => (i === 7 ? '....Fssssseмd.'.replace('м', 'm') : r));
// sat back on a slope, front leg out (5 rows: the head drops 3 rows)
const L_SLIDE = [
  '.....qqppppPPP..',
  '....qqqq...ppPP.',
  '...qqq.......nnn',
  '..nnn........NNN',
  '..NNN...........',
];

// arm patches; `hand` is the authored [row, col] of the hand
const ARM = {
  wave1: { patch: [[9, 11, 'kk'], [8, 13, 'd'], [7, 14, 'd'], [6, 15, 'd'], [4, 14, 'ss'], [5, 14, 'ss']], hand: [4, 15] },
  wave2: { patch: [[9, 11, 'kk'], [8, 13, 'd'], [7, 14, 'd'], [6, 14, 'd'], [5, 14, 'd'], [3, 13, 'ss'], [4, 13, 'ss']], hand: [3, 14] },
  point: { patch: [[10, 12, 'kdds']], hand: [10, 15] },
  type1: { patch: [[11, 11, 'k'], [12, 12, 'dd'], [13, 13, 'ss']], hand: [13, 14] },
  type2: { patch: [[11, 11, 'k'], [12, 12, 'dd'], [12, 14, 'ss']], hand: [12, 15] },
  carry: { patch: [[10, 11, 'kk'], [11, 12, 'dss'], [12, 12, 'dss']], hand: [11, 14] },
  lift: { patch: [[9, 11, 'kk'], [8, 13, 'd'], [7, 14, 'd'], [6, 14, 'd'], [5, 14, 'd'], [4, 14, 'd'], [2, 13, 'ss'], [3, 13, 'ss']], hand: [2, 14] },
  cross: { patch: [[12, 7, 'dsssd']], hand: [12, 11] },
  chest: { patch: [[10, 9, 'ds']], hand: [10, 10] },
};

export function buildStd() {
  const g = P.buildHero();               // the game's own frames
  const at = (fr, row, col) => { fr.hand = handFrom(row, col); return fr; };
  const arm = (a, more = {}) => compose({ torso: T_ARM, patch: a.patch, hand: a.hand, ...more });
  const slide = compose({ rows: [P.BLANK, P.BLANK, P.BLANK, ...P.HEAD, ...P.T_FWD.slice(0, 5), ...L_SLIDE], hand: [14, 12] });

  return {
    // the game's
    idle: g.idle.map((f) => at(f, 13, 9)),
    blink: g.blink.map((f) => at(f, 13, 9)),
    run: g.run.map((f) => at(f, 12, 11)),
    jump: g.jump.map((f) => at(f, 9, 12)),
    fall: g.fall.map((f) => at(f, 11, 12)),
    skid: g.skid.map((f) => at(f, 12, 4)),
    crouch: g.crouch.map((f) => at(f, 16, 9)),
    hurt: g.hurt.map((f) => at(f, 9, 12)),
    victory: g.victory.map((f) => at(f, 9, 12)),
    lookDown: [at(g.idle[1], 14, 9)],           // the head dipped a row
    // the website's
    slide: [slide],
    wave: [arm(ARM.wave1), arm(ARM.wave2)],
    point: [arm(ARM.point)],
    type: [arm(ARM.type1), arm(ARM.type2)],
    carry: [arm(ARM.carry)],
    lift: [arm(ARM.lift)],
    crossArms: [arm(ARM.cross)],
    speak: [arm(ARM.chest, { head: HEAD_TALK }), arm(ARM.chest)],
    climb: [compose({ torso: 'T_UP', legs: 'L_RUN2', hand: [9, 12] }), compose({ torso: 'T_FWD', legs: 'L_RUN4', hand: [11, 12] })],
    // hands above his head, so a cable clears his hair
    hang: [arm(ARM.lift, { legs: 'L_FALL' })],
    hangOne: [arm(ARM.lift)],
  };
}
