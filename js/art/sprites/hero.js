// The hero: Shrey. Brown skin, black taper fade (short faded sides,
// fuller top), no glasses, black tee with a small teal </> mark, gray
// sweatpants, white sneakers, black backpack.
//
// Frames are composed from parts (head / torso / legs) so the animation
// stays consistent, then outlined. Authored at 14×22; the outline makes
// 16×24. All colours live in LEGEND: retune him there.

import { compileMap, outline, frame } from '../sprite.js';

export const LEGEND = {
  h: 'hair.0', H: 'hair.2',
  f: 'fade.0', F: 'fade.1',
  s: 'skin.2', S: 'skin.3', d: 'skin.1', m: 'skin.0',
  e: 'ink.0',
  k: 'shirt.1', K: 'shirt.2', j: 'shirt.0', g: 'teal.2',
  v: 'pack.0', b: 'pack.1', B: 'pack.2',
  p: 'pants.1', P: 'pants.2', q: 'pants.0',
  n: 'shoe.1', N: 'shoe.0',
};

const RIM = 'slate.3';
const BLANK = '..............';

// rounded, textured top; the sides fade from dark to skin around the ear
const HEAD = [
  '.....hhhhh....',
  '....hhHHHhhh..',
  '...hhHHhhHhhh.',
  '...fhhhhhhhhh.',
  '...ffFFsssSSs.',
  '...fFdsssseSs.',
  '...FFdssssssSs',
  '....Fsssssmsd.',
  '.....ddsssdd..',
];
const HEAD_BLINK = HEAD.map((r, i) => (i === 5 ? '...fFdssssdSs.' : r));
const HEAD_HURT = HEAD.map((r, i) => (i === 5 ? '...fFdssseeSs.' : i === 7 ? '....FsssssmmS.' : r));

const T_IDLE = [
  '...vbb.dsd....',
  '..vbbBkkKKkk..',
  '..vbbBkkKKgk..',
  '..vbbBkkKkkk..',
  '..vbbBkkdskk..',
  '...vbbjkkkkj..',
];
const T_FWD = [
  '...vbb.dsd....',
  '..vbbBkkkKKk..',
  '..vbbBkkkkKKd.',
  '..vbbBkkkgkss.',
  '..vbbBkkkkkk..',
  '...vbbjkkkkj..',
];
const T_BACK = [
  '...vbb.dsd....',
  '..vbbKKkkkkk..',
  '..vbKKkkkkgk..',
  '..vbsdkkkkkk..',
  '..vbbBkkkkkk..',
  '...vbbjkkkkj..',
];
const T_UP = [
  '...vbb.dsd.ss.',
  '..vbbBkkkKKd..',
  '..vbbBkkkKKk..',
  '..vbbBkkkkgk..',
  '..vbbBkkkkkk..',
  '...vbbjkkkkj..',
];

const L_STAND = [
  '.....qqpppP...',
  '.....qq.ppP...',
  '.....qq.ppP...',
  '.....qq.ppP...',
  '.....qq.ppp...',
  '....nnn.nnnn..',
  '....NNN.NNNN..',
];
const L_RUN1 = [
  '.....qqpppP...',
  '....qqq.pppP..',
  '...qqq...ppPp.',
  '..qqq.....pPp.',
  '..qq.......pp.',
  '.nnq.......nnn',
  '.NN........NNN',
];
const L_RUN2 = [
  '.....qqpppP...',
  '.....qqpppPP..',
  '.....qq..pPPp.',
  '.....qq...nnn.',
  '.....qq...NNN.',
  '....nnn.......',
  '....NNN.......',
];
const L_RUN3 = [
  '.....qqpppP...',
  '....pppPqqq...',
  '...pPp...qqq..',
  '..pPp.....qqq.',
  '..pp.......qq.',
  '.nnp.......NNN',
  '.NN........NNN',
];
const L_RUN4 = [
  '.....qqpppP...',
  '.....qqppPq...',
  '......qppPqq..',
  '.......ppPNN..',
  '.......ppP....',
  '......nnnn....',
  '......NNNN....',
];
const L_JUMP = [
  '.....qqpppP...',
  '....qqq.pppP..',
  '...qqq...ppPP.',
  '...nq.....ppn.',
  '...NN.....NNn.',
  BLANK,
  BLANK,
];
const L_FALL = [
  '.....qqpppP...',
  '....qqq.ppPP..',
  '....qq...ppP..',
  '...qq.....pP..',
  '...nn.....nn..',
  '...NN.....NNn.',
  BLANK,
];

const CROUCH = [
  BLANK, BLANK, BLANK, BLANK,
  ...HEAD,
  '...vbb.dsd....',
  '..vbbBkkKKkk..',
  '..vbbBkkKKgk..',
  '..vbbBkkdskk..',
  '....qqqpppP...',
  '...qqqpppPPp..',
  '...qq....pPp..',
  '...nnn...nnnn.',
  '...NNN...NNNN.',
];

// ─── poses for the website's scenes ──────────────────────────────────
// Built from the same parts. Arms that reach in front of him need room,
// so these frames are two columns wider on his facing side (the hitbox
// anchor is unchanged, so they line up with the frames above). Each arm
// is a patch of [row, col, pixels] over head + torso + legs.

const WIDE = 2;
const widen = (rs) => rs.map((r) => r + '.'.repeat(WIDE));
function patch(rs, marks) {
  const out = rs.slice();
  for (const [r, c, s] of marks) out[r] = out[r].slice(0, c) + s + out[r].slice(c + s.length);
  return out;
}
// a torso with the front hand hidden (the arm is patched in instead)
const T_ARM = T_IDLE.map((r, i) => (i === 4 ? '..vbbBkkKkkk..' : r));

// back view, for climbing: hair all round, the pack square in the middle
const HEAD_BACK = [
  '.....hhhhh....',
  '....hhHHHhhh..',
  '...hhHhhhHhh..',
  '...hhhhhhhhh..',
  '...fhhhhhhhf..',
  '...ffhhhhhff..',
  '..sfFFhhhFFfs.',
  '...FFFfffFFF..',
  '.....ddddd....',
];
const T_BACK_VIEW = [
  '..kkk.dsd.kkk.',
  '..kkvvvvvvkk..',
  '..kkvbbbBvkk..',
  '..kkvbBBBvkk..',
  '..kkvbbbBvkk..',
  '...jvvvvvvj...',
];
const L_CLIMB1 = [
  '....qqqpppP...',
  '....qqq.ppP...',
  '....qqq.ppP...',
  '....qqq.nnn...',
  '....qqq.NNN...',
  '...nnnn.......',
  '...NNNN.......',
];
const L_CLIMB2 = [
  '....qqqpppP...',
  '....qqq.ppP...',
  '....qqq.ppP...',
  '....nnn.ppP...',
  '....NNN.ppP...',
  '.......nnnn...',
  '.......NNNN...',
];
// seated: thighs forward, shins down to the floor
const L_SIT = [
  '.....qqpppppppP.',
  '.....qqqppppppP.',
  '............pP..',
  '............pP..',
  '............pP..',
  '...........nnnn.',
  '...........NNNN.',
];
// sliding: sat back on the slope, front leg out
const L_SLIDE = [
  '.....qqppppPPP..',
  '....qqqq...ppPP.',
  '...qqq.......nnn',
  '..nnn........NNN',
  '..NNN...........',
];

// [row, col, pixels]: rows 0–8 head, 9–14 torso, 15–21 legs
const ARM = {
  // raised beside his face, hand open; two positions make the wave
  wave1: [[9, 11, 'kk'], [8, 13, 'd'], [7, 14, 'd'], [6, 15, 'd'], [4, 14, 'ss'], [5, 14, 'ss']],
  wave2: [[9, 11, 'kk'], [8, 13, 'd'], [7, 14, 'd'], [6, 14, 'd'], [5, 14, 'd'], [3, 13, 'ss'], [4, 13, 'ss']],
  // straight out in front at shoulder height
  point: [[10, 12, 'kdds']],
  // forearms forward at desk height; the fingers move between frames
  type1: [[11, 11, 'k'], [12, 12, 'dd'], [13, 13, 'ss']],
  type2: [[11, 11, 'k'], [12, 12, 'dd'], [12, 14, 'ss']],
  // both hands in front of his chest, holding something
  hold: [[10, 11, 'kk'], [11, 12, 'dss'], [12, 12, 'dss']],
  // up over his head, as if to catch or lift something
  lift: [[9, 11, 'kk'], [8, 13, 'd'], [7, 14, 'd'], [6, 14, 'd'], [5, 14, 'd'], [4, 14, 'd'], [2, 13, 'ss'], [3, 13, 'ss']],
};
// climbing (back view): one hand up on a rung, then the other
const CLIMB1 = [[0, 1, 'ss'], [1, 1, 'ss'], [2, 1, 'd'], [3, 1, 'd'], [4, 1, 'd'], [5, 1, 'k'], [6, 1, 'k'], [7, 1, 'k'], [8, 1, 'k'], [10, 12, 'dss']];
const CLIMB2 = [[0, 12, 'ss'], [1, 12, 'ss'], [2, 12, 'd'], [3, 12, 'd'], [4, 12, 'd'], [5, 12, 'k'], [6, 13, 'k'], [7, 12, 'k'], [8, 12, 'k'], [10, 0, 'ssd']];

function build(rowsArr) {
  if (rowsArr.length !== 22) throw new Error('hero frame must be 22 rows, got ' + rowsArr.length);
  // hitbox is 10×20: its origin sits 3 px right and 3 px down from the canvas corner
  // ink outline, then a soft light rim: black shirt and hair stay readable on night scenes
  return frame(outline(outline(compileMap(rowsArr.join('\n'), LEGEND, 'hero'), 'ink.0'), RIM), 4, 4);
}

export function buildHero() {
  const f = (head, torso, legs) => build([...head, ...torso, ...legs]);
  // a wide pose: the standing body plus an arm patch, optionally other legs
  const arm = (marks, legs = L_STAND, head = HEAD) => {
    const legsW = legs[0].length > 14 ? legs : widen(legs);
    return build(patch([...widen(head), ...widen(T_ARM), ...legsW], marks));
  };
  const crouchLegs = (legs) => [BLANK, BLANK, BLANK, ...HEAD, ...T_FWD.slice(0, 5), ...legs].map((r) => r.padEnd(16, '.'));
  return {
    // website scenes (wider frames; same anchor)
    wave: [arm(ARM.wave1), arm(ARM.wave2)],
    point: [arm(ARM.point)],
    typing: [arm(ARM.type1), arm(ARM.type2)],
    hold: [arm(ARM.hold)],
    lift: [arm(ARM.lift)],
    sit: [arm([], L_SIT)],
    sitTyping: [arm(ARM.type1, L_SIT), arm(ARM.type2, L_SIT)],
    climb: [
      build(patch(widen([...HEAD_BACK, ...T_BACK_VIEW, ...L_CLIMB1]), CLIMB1)),
      build(patch(widen([...HEAD_BACK, ...T_BACK_VIEW, ...L_CLIMB2]), CLIMB2)),
    ],
    slide: [build(crouchLegs(L_SLIDE))],
    cheer: [build(patch(widen([...HEAD, ...T_ARM, ...L_STAND]), [...ARM.lift, [9, 2, 'k'], [8, 1, 'd'], [7, 0, 'd'], [5, 0, 's'], [6, 0, 'd']]))],

    // the game

    idle: [
      f(HEAD, T_IDLE, L_STAND),
      build([BLANK, ...HEAD, ...T_IDLE.slice(0, 5), ...L_STAND]),
    ],
    blink: [f(HEAD_BLINK, T_IDLE, L_STAND)],
    run: [
      f(HEAD, T_BACK, L_RUN1),
      f(HEAD, T_IDLE, L_RUN2),
      f(HEAD, T_FWD, L_RUN3),
      f(HEAD, T_IDLE, L_RUN4),
    ],
    jump: [f(HEAD, T_UP, L_JUMP)],
    fall: [f(HEAD, T_FWD, L_FALL)],
    skid: [f(HEAD, T_BACK, L_RUN1)],
    crouch: [build(CROUCH)],
    hurt: [f(HEAD_HURT, T_UP, L_FALL)],
    victory: [f(HEAD, T_UP, L_STAND)],
  };
}
