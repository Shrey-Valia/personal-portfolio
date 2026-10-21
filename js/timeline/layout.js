// Scroll position → where Shrey is. Pure functions over the geometry the
// engine measures (docs/TIMELINE-ARCHITECTURE.md §2.4).
//
// Each stop gets a dwell window [a, b] in scroll position: the range over
// which its scene's centre moves from FROM down to TO of the band of the
// screen below the sticky bar ([top, vh]). Inside it,
// p = (y − a) / (b − a). Between windows he is on the connector to the
// next stop, at s = (y − b) / (a' − b). The intro's window starts at
// scroll 0 already in its hold phase (he's at his door on load); the
// last stop is where the path ends, so it runs only to the end of its hold
// and he stays there to the bottom of the page.

import { clamp } from '../engine/util.js';

export const FOCUS = { desktop: [0.8, 0.2], phone: [0.95, 0.05] };
const MIN_WALK = 40;             // px of scroll kept for every walk between stops
export const WALK_SHARE = 0.75;  // desktop: at least this much scroll per px he travels along a connector

// scenes: [{ cy }] scene centres in document px; walks: px of scroll each
// gap needs at least (index i: between stop i and i + 1). Returns [{ a, b }].
export function dwellWindows(scenes, { vh, top = 0, maxScroll, phone, introP, endP, walks = [] }) {
  const [from, to] = phone ? FOCUS.phone : FOCUS.desktop;
  const band = vh - top;
  const w = scenes.map((s) => ({ a: s.cy - (top + from * band), b: s.cy - (top + to * band) }));
  // neighbours that overlap meet at the midpoint, with room left for the walk
  for (let i = 1; i < w.length; i++) {
    const need = Math.max(MIN_WALK, walks[i - 1] || 0);
    if (w[i].a < w[i - 1].b + need) {
      const mid = (w[i].a + w[i - 1].b) / 2;
      w[i - 1].b = Math.max(w[i - 1].a + 1, mid - need / 2);
      w[i].a = Math.max(w[i - 1].b + 1, mid + need / 2);
    }
  }
  for (const x of w) { x.a = clamp(x.a, 0, maxScroll); x.b = clamp(x.b, x.a, maxScroll); }
  if (w.length) {
    w[0].a = 0;
    w[0].b = Math.max(1, w[0].b);
    w[0].p0 = introP;                                   // p at scroll 0
    // the path ends here: he finishes in the hold (endP) and stays, rather than walking out
    const last = w[w.length - 1];
    last.b = Math.max(last.a + 1, last.b);
    last.p1 = endP;
  }
  return w;
}

// { dwell: true, stop, p } or { dwell: false, gap, s }
export function sample(y, win) {
  const n = win.length;
  if (!n) return null;
  for (let i = 0; i < n; i++) {
    const { a, b } = win[i];
    if (y < a) {
      const prev = win[i - 1];
      return { dwell: false, gap: i - 1, s: clamp((y - prev.b) / Math.max(1, a - prev.b), 0, 1) };
    }
    if (y <= b) {
      const k = clamp((y - a) / Math.max(1, b - a), 0, 1);
      let p = i === 0 && win[0].p0 != null ? win[0].p0 + (1 - win[0].p0) * k : k;
      if (i === n - 1 && win[i].p1 != null) p = k * win[i].p1;
      return { dwell: true, stop: i, p };
    }
  }
  const end = win[n - 1].p1;
  return { dwell: true, stop: n - 1, p: end != null ? end : 1 };
}

// reduced motion: the stop whose scene centre is nearest the middle of the
// screen below the bar
export function current(y, scenes, vh, top = 0) {
  let best = 0, d = Infinity;
  scenes.forEach((s, i) => { const e = Math.abs(s.cy - (y + top + (vh - top) / 2)); if (e < d) { d = e; best = i; } });
  return best;
}

// the scroll position that puts stop i at p (for links and debug)
export function scrollFor(i, p, win) {
  const { a, b, p0 } = win[i];
  if (i === 0 && p0 != null) return p <= p0 ? 0 : a + ((p - p0) / (1 - p0)) * (b - a);
  return a + p * (b - a);
}
