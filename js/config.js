// Global constants and URL flags.

export const TILE = 16;
export const H = 216;          // internal height, fixed
export const MIN_W = 384;      // internal width range; wide screens get more world, not letterboxing
export const MAX_W = 480;

const q = new URLSearchParams(location.search);

export const FLAGS = {
  debug: q.has('debug'),
  level: q.get('level'),       // ?level=ornl jumps straight into a level
  room: q.get('room'),
  fresh: q.has('fresh'),       // ignore saved progress
  god: q.has('god'),           // no damage, no pit deaths
};

export const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
