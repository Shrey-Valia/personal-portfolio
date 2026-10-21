// Checks for stops, run by tools/stop.html and by the page under ?debug=1.
//
// checkStop(rt, { el })  one stop: shape, route rules, build/draw at widths
//                        160 and 240 for p = 0, 0.1 … 1 with reduced motion
//                        on and off, no canvas text, labels within limits,
//                        determinism (p 0.37 → 0.9 → 0.37 draws the same)
// checkPage(root, rts)   the page: the [data-stop] elements match the stop
//                        list one-to-one and in order, every fact is claimed
//                        once and sits inside its stop's element
//
// Both return { problems: [...], notes: [...] }; problems are bugs.

import { SCENE_H, MIN_W, MAX_W } from './kit.js';
import { transitRuntime } from './api.js';
import { LIST } from './stops/index.js';

// scratch canvases the checks read back from
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.__scratch = true;
  return [c, ctx];
}

// any text drawn on a guarded canvas throws, so it shows up as a problem
export function guardText(ctx) {
  if (ctx.__guarded) return ctx;
  for (const k of ['fillText', 'strokeText']) {
    ctx[k] = () => { throw new Error('canvas text: scenes may not draw text; use labels() for HTML labels'); };
  }
  ctx.__guarded = true;
  return ctx;
}

// hash a canvas's pixels (read back through a scratch canvas, so the
// source keeps its fast path)
let scratch = null;
export function hashCanvas(ctx, w, h) {
  let d;
  if (!ctx.__scratch) {
    if (!scratch) scratch = makeCanvas(1, 1);
    const [c, x] = scratch;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    x.clearRect(0, 0, w, h);
    x.drawImage(ctx.canvas, 0, 0);
    d = x.getImageData(0, 0, w, h).data;
  } else d = ctx.getImageData(0, 0, w, h).data;
  let x = 2166136261;
  for (let i = 0; i < d.length; i++) { x ^= d[i]; x = Math.imul(x, 16777619); }
  return (x >>> 0).toString(16);
}

const P = Array.from({ length: 11 }, (_, i) => i / 10);
const near = (x, c) => Math.abs(x - c) <= 8;

function routeProblems(r, w, h) {
  const out = [];
  const pts = [r.enter, ...r.via, r.act, ...r.leave, r.exit];
  if (r.enter[1] !== 0) out.push(`route.enter must be on the top edge (y 0), got y ${r.enter[1]}`);
  if (r.exit[1] !== h) out.push(`route.exit must be on the bottom edge (y ${h}), got y ${r.exit[1]}`);
  if (!near(r.enter[0], w / 2)) out.push(`route.enter must be within 8 px of the centre (${w / 2}), got x ${r.enter[0]}`);
  if (!near(r.exit[0], w / 2)) out.push(`route.exit must be within 8 px of the centre (${w / 2}), got x ${r.exit[0]}`);
  for (const [x, y] of pts) if (x < 0 || x > w || y < 0 || y > h) { out.push(`route point [${x}, ${y}] is outside the ${w}×${h} scene`); break; }
  return out;
}

export function checkStop(rt, { el = null, widths = [MIN_W, MAX_W] } = {}) {
  const problems = [], notes = [];
  const id = rt.id;
  const say = (m) => problems.push(`${id}: ${m}`);
  const entry = LIST.find((s) => s.id === id);
  if (!entry) say('not in js/timeline/stops/index.js');
  else if (JSON.stringify([...rt.facts].sort()) !== JSON.stringify([...entry.facts].sort())) say(`facts ${JSON.stringify(rt.facts)} differ from the stop list's ${JSON.stringify(entry.facts)}`);
  try { if (rt.mod.poses) rt.poses; } catch (err) { say('poses() threw: ' + err.message); }

  const h = SCENE_H;
  for (const w of widths) {
    let built;
    try { built = rt.build({ w, h, el }); } catch (err) { say(`build at w ${w} threw: ${err.message}`); continue; }
    routeProblems(built.route, w, h).forEach((m) => say(`w ${w}: ${m}`));
    const [, ctx] = makeCanvas(w, h);
    guardText(ctx);
    const states = [{ active: false, p: 0 }, { active: false, p: 1 }];
    for (const reduced of [false, true]) for (const p of P) states.push({ p, reduced, active: true });
    for (const s of states) {
      try {
        const f = rt.frame({ ...s, w, h, t: 0 });
        const r = rt.render(ctx, built, f);
        const shown = r.labels.filter((l) => l && l.text);
        if (shown.length > 2) notes.push(`${id}: ${shown.length} labels at p ${s.p} (at most 2)`);
        for (const l of shown) if (l.text.trim().split(/\s+/).length > 4) notes.push(`${id}: label "${l.text}" is over 4 words`);
      } catch (err) {
        say(`w ${w} p ${s.p}${s.reduced ? ' reduced' : ''}${s.active ? '' : ' (inactive)'}: ${err.message}`);
        break;
      }
    }
  }

  // determinism: the same p draws the same pixels, whatever came before
  try {
    const w = 200, built = rt.build({ w, h, el });
    const [, ctx] = makeCanvas(w, h);
    const at = (p) => {
      const f = rt.frame({ p, w, h, active: true, t: 0 });
      const r = rt.render(ctx, built, f);
      return hashCanvas(ctx, w, h) + JSON.stringify(r.hero && [r.hero.pose, r.hero.frame, r.hero.x, r.hero.y, r.hero.facing]) + JSON.stringify(r.labels);
    };
    const a = at(0.37); at(0.9); at(0.05);
    if (at(0.37) !== a) say('not deterministic: p 0.37 drew differently after visiting p 0.9 (keep no state between draws)');
  } catch (err) { say('determinism check threw: ' + err.message); }

  if (rt.mod.transit) {
    try {
      const tr = transitRuntime(rt.mod.transit);
      for (const [w, th] of [[64, 120], [96, 220]]) {
        const tb = tr.build({ w, h: th });
        const [, ctx] = makeCanvas(w, th);
        guardText(ctx);
        for (const s of P) tr.render(ctx, tb, { s, dir: 1, reduced: false });
        tr.render(ctx, tb, { s: 0.5, dir: 1, reduced: true });
        const at = (s) => { const hh = tr.render(ctx, tb, { s, dir: 1, reduced: false }); return hashCanvas(ctx, w, th) + JSON.stringify(hh); };
        const a = at(0.37); at(0.9);
        if (at(0.37) !== a) say(`transit not deterministic at ${w}×${th}`);
      }
    } catch (err) { say('transit: ' + err.message); }
  }
  return { problems, notes };
}

// the page against the stop list and the résumé's facts
export function checkPage(root, rts) {
  const problems = [], notes = [];
  const els = [...root.querySelectorAll('[data-stop]')];
  const ids = els.map((e) => e.dataset.stop);
  const want = LIST.map((s) => s.id);
  if (JSON.stringify(ids) !== JSON.stringify(want)) problems.push(`page stops ${ids.join(', ')} don't match the stop list ${want.join(', ')}`);
  const facts = [...root.querySelectorAll('[data-fact]')];
  const all = facts.map((n) => n.dataset.fact);
  if (new Set(all).size !== all.length) problems.push('duplicate data-fact ids in the page');
  const claimed = new Map();
  for (const s of LIST) {
    const el = root.querySelector(`[data-stop="${s.id}"]`);
    for (const f of s.facts) {
      if (claimed.has(f)) problems.push(`fact ${f} is claimed by both ${claimed.get(f)} and ${s.id}`);
      claimed.set(f, s.id);
      const n = root.querySelector(`[data-fact="${f}"]`);
      if (!n) problems.push(`${s.id} claims ${f}, which isn't in the page`);
      else if (el && !el.contains(n)) problems.push(`${s.id} claims ${f}, but it sits outside that stop`);
    }
  }
  const unclaimed = all.filter((f) => !claimed.has(f));
  if (unclaimed.length) problems.push('facts no stop claims: ' + unclaimed.join(', '));
  for (const rt of rts || []) {
    const r = checkStop(rt, { el: root.querySelector(`[data-stop="${rt.id}"]`) });
    problems.push(...r.problems); notes.push(...r.notes);
  }
  return { problems, notes, stops: ids.length, facts: claimed.size, total: all.length };
}
