// Master palette. Every colour is quantized to 5 bits per channel, the
// SNES colour depth, so everything shares one 16-bit look. Ramps run
// dark → light; light always comes from the top left.

export function snes(hex) {
  const n = parseInt(hex.slice(1), 16);
  const q = (v) => Math.min(248, Math.round(v / 8) * 8);
  const r = q((n >> 16) & 255), g = q((n >> 8) & 255), b = q(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

const RAW = {
  ink:     ['#0b0d17'],
  // the hero: warm brown skin, black taper fade, black tee, gray sweats, black pack
  skin:    ['#5a321f', '#7c4729', '#a0653d', '#c0845a'],
  hair:    ['#0f0b0b', '#1f1715', '#382823'],
  fade:    ['#3a2a24', '#5a4034'],
  shirt:   ['#121218', '#20212b', '#343645'],
  pants:   ['#474a56', '#686c7a', '#9196a5'],
  pack:    ['#0a0a0f', '#1a1b23', '#2f313d'],
  shoe:    ['#8f95a3', '#dfe3ea', '#ffffff'],

  teal:    ['#0e3b43', '#156f73', '#21a3a0', '#6fd6c8'],
  cyan:    ['#12456a', '#1f7fb0', '#3cc0e8', '#a8ecff'],
  gold:    ['#6e420e', '#c27a18', '#f2b233', '#ffe08a'],
  indigo:  ['#191b44', '#2c3570', '#3e4fa3', '#7088e0'],
  slate:   ['#1c202c', '#2e3345', '#474e66', '#727b96'],
  steel:   ['#161b28', '#252e42', '#38455f', '#566685', '#8597bb'],
  magenta: ['#43103b', '#86206b', '#d03a9c', '#ff86d0'],
  green:   ['#0e3a27', '#1d6b43', '#35b779', '#90eaa8'],
  red:     ['#480e13', '#8f1d24', '#e0393f', '#ff8f7f'],
  orange:  ['#5c2508', '#b2470f', '#f07a1f', '#ffc06a'],
  white:   ['#b9c0cf', '#e3e6ee', '#fbf8f1'],
  duck:    ['#a8650a', '#f2b233', '#ffd84d', '#fff3a8'],
  wood:    ['#3d2414', '#6b3f22', '#9a6234', '#c58c52'],
  grass:   ['#16391f', '#2a6a31', '#46a043', '#8fd16a'],
};

export const RAMPS = {};
for (const k in RAW) RAMPS[k] = RAW[k].map(snes);

// 'skin.2' → '#a06038'; plain hex passes through (quantized)
export function col(ref) {
  if (!ref) return null;
  if (ref[0] === '#') return snes(ref);
  const [k, i] = ref.split('.');
  const ramp = RAMPS[k];
  if (!ramp) throw new Error('Unknown ramp ' + ref);
  return ramp[Math.min(ramp.length - 1, +(i || 0))];
}
