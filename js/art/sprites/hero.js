// The hero: Shrey. Brown skin, black taper fade (short faded sides,
// fuller top), no glasses, black tee with a small teal </> mark, gray
// sweatpants, white sneakers, black backpack.
//
// Frames are composed from parts (head / torso / legs) so the animation
// stays consistent, then outlined twice (ink, then a light rim). Authored
// at 14×22; the outlines make 18×26. All colours live in LEGEND: retune
// him there. The parts and build() are exported so the website's pose
// pack (js/timeline/poses.js) composes from the same pieces.

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

export const RIM = 'slate.3';
export const BLANK = '..............';

// rounded, textured top; the sides fade from dark to skin around the ear
export const HEAD = [
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
export const HEAD_BLINK = HEAD.map((r, i) => (i === 5 ? '...fFdssssdSs.' : r));
export const HEAD_HURT = HEAD.map((r, i) => (i === 5 ? '...fFdssseeSs.' : i === 7 ? '....FsssssmmS.' : r));

export const T_IDLE = [
  '...vbb.dsd....',
  '..vbbBkkKKkk..',
  '..vbbBkkKKgk..',
  '..vbbBkkKkkk..',
  '..vbbBkkdskk..',
  '...vbbjkkkkj..',
];
export const T_FWD = [
  '...vbb.dsd....',
  '..vbbBkkkKKk..',
  '..vbbBkkkkKKd.',
  '..vbbBkkkgkss.',
  '..vbbBkkkkkk..',
  '...vbbjkkkkj..',
];
export const T_BACK = [
  '...vbb.dsd....',
  '..vbbKKkkkkk..',
  '..vbKKkkkkgk..',
  '..vbsdkkkkkk..',
  '..vbbBkkkkkk..',
  '...vbbjkkkkj..',
];
export const T_UP = [
  '...vbb.dsd.ss.',
  '..vbbBkkkKKd..',
  '..vbbBkkkKKk..',
  '..vbbBkkkkgk..',
  '..vbbBkkkkkk..',
  '...vbbjkkkkj..',
];

export const L_STAND = [
  '.....qqpppP...',
  '.....qq.ppP...',
  '.....qq.ppP...',
  '.....qq.ppP...',
  '.....qq.ppp...',
  '....nnn.nnnn..',
  '....NNN.NNNN..',
];
export const L_RUN1 = [
  '.....qqpppP...',
  '....qqq.pppP..',
  '...qqq...ppPp.',
  '..qqq.....pPp.',
  '..qq.......pp.',
  '.nnq.......nnn',
  '.NN........NNN',
];
export const L_RUN2 = [
  '.....qqpppP...',
  '.....qqpppPP..',
  '.....qq..pPPp.',
  '.....qq...nnn.',
  '.....qq...NNN.',
  '....nnn.......',
  '....NNN.......',
];
export const L_RUN3 = [
  '.....qqpppP...',
  '....pppPqqq...',
  '...pPp...qqq..',
  '..pPp.....qqq.',
  '..pp.......qq.',
  '.nnp.......NNN',
  '.NN........NNN',
];
export const L_RUN4 = [
  '.....qqpppP...',
  '.....qqppPq...',
  '......qppPqq..',
  '.......ppPNN..',
  '.......ppP....',
  '......nnnn....',
  '......NNNN....',
];
export const L_JUMP = [
  '.....qqpppP...',
  '....qqq.pppP..',
  '...qqq...ppPP.',
  '...nq.....ppn.',
  '...NN.....NNn.',
  BLANK,
  BLANK,
];
export const L_FALL = [
  '.....qqpppP...',
  '....qqq.ppPP..',
  '....qq...ppP..',
  '...qq.....pP..',
  '...nn.....nn..',
  '...NN.....NNn.',
  BLANK,
];

export const CROUCH = [
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

export function build(rowsArr) {
  if (rowsArr.length !== 22) throw new Error('hero frame must be 22 rows, got ' + rowsArr.length);
  // hitbox is 10×20: its origin sits 3 px right and 3 px down from the canvas corner
  // ink outline, then a soft light rim: black shirt and hair stay readable on night scenes
  return frame(outline(outline(compileMap(rowsArr.join('\n'), LEGEND, 'hero'), 'ink.0'), RIM), 4, 4);
}

export function buildHero() {
  const f = (head, torso, legs) => build([...head, ...torso, ...legs]);
  return {
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
