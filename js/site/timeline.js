// The scroll timeline: in the website view the résumé becomes one path
// down the page, newest first. Each stop is a pixel scene with its card
// underneath; Shrey walks the path as you scroll, and inside a scene the
// stop's action runs with the scroll (scroll back up and it runs back).
//
// The DOM: mount() *moves* the résumé's own entries into <ol class=
// "timeline">, one <li> per stop, and unmount() puts every node back where
// it was, so the game's résumé dialog, print, no-JS and file:// all keep
// the plain grouped résumé. Nothing is cloned; every fact stays in the DOM.
//
// The canvas: one fixed overlay (aria-hidden, no pointer events) at device
// resolution. One art pixel is `rs` device pixels everywhere, so drawText's
// single global scale holds. Each scene draws into its own canvas (redrawn
// only when its p or t changes), which is copied into its box; the path
// and Shrey are drawn on top. Frames are drawn on scroll and resize, and
// while an on-screen scene asks for an idle loop; never otherwise.
//
// The hero sits where the path crosses the reading line, READ of the way
// down the viewport. Between stops his position is a pure function of the
// scroll position (deterministic, reversible). With reduced motion he
// snaps to the nearest stop and every scene holds its key pose.

import { FLAGS, motionQuery } from '../config.js';
import { STOPS, setHeroArt, drawHero, DESIGN_W, MAX_W } from './api.js';
import { MOVES } from './path.js';
import { setShimEnv, shimSelfTest } from './shim.js';
import { LEVELS } from '../game/levels/index.js';
import './stops/index.js';
import { setTextMetrics, drawText } from '../art/font.js';
import { col } from '../art/palette.js';
import { clamp, makeCanvas } from '../engine/util.js';

const READ = 0.4;          // the reading line, as a fraction of the viewport from the top
const HOLD = 160;          // ms after the last scroll event that he still counts as moving
const FLOOR = 18;          // default floor: this many art px above the box bottom
const INK = col('ink.0'), RIM = '#2c3570';

const $ = (id) => document.getElementById(id);
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function createTimeline({ game }) {
  const resume = $('resume');
  setHeroArt(game.art.hero);
  setShimEnv({ content: game.content, art: game.art });

  let on = false, ol = null, canvas = null, ctx = null, ro = null;
  let stops = [], segs = [], L = null;
  let dirty = true, raf = 0, loopTimer = 0, moveTimer = 0, t0 = 0;
  let lastY = 0, dir = 1, moving = false;
  let reduced = motionQuery.matches;
  let printY = null;
  let bare = false;          // drawNow({ bare: true }) skips the debug layer
  const moved = [];          // [node, marker]: where each moved node came from
  const undo = [];           // reverts for every class and attribute we set
  const perf = { ms: 0, frames: 0, paints: 0 };

  // ─── DOM: build and take down ────────────────────────────────────

  function move(node, into, before = null) {
    const mark = document.createComment(' timeline ');
    node.before(mark);
    into.insertBefore(node, before);
    moved.push([node, mark]);
  }
  function addClass(node, cls) {
    if (node.classList.contains(cls)) return;
    node.classList.add(cls);
    undo.push(() => node.classList.remove(cls));
  }
  function setAttr(node, k, v) {
    const had = node.getAttribute(k);
    node.setAttribute(k, v);
    undo.push(() => (had === null ? node.removeAttribute(k) : node.setAttribute(k, had)));
  }

  // the date beside the card: the stop's own `when`, else the card's dates
  function whenOf(def, card) {
    if (def.when !== undefined) return def.when;
    const meta = card.querySelector('.entry__meta');
    return meta ? meta.textContent.split(' · ').pop().trim() : '';
  }

  function buildStop(def, i) {
    const li = el('li', `stop stop--${def.id}`);
    li.dataset.stop = def.id;
    const stage = el('div', 'stop__stage');
    stage.setAttribute('aria-hidden', 'true');
    const scene = el('div', 'stop__scene');
    scene.style.aspectRatio = `${def.size[0]} / ${def.size[1]}`;
    stage.appendChild(scene);
    const card = el('div', 'stop__card');

    if (def.head) {                                  // a heading for a stop split out of an entry
      const hd = el('header', 'entry__head stop__head');
      hd.appendChild(el('h3', null, def.head.title));
      if (def.head.meta) hd.appendChild(el('p', 'entry__meta', def.head.meta));
      card.appendChild(hd);
    }
    const nodes = typeof def.node === 'function' ? [].concat(def.node(game) || []) : def.node ? [...resume.querySelectorAll(def.node)] : [];
    if (typeof def.node === 'string' && !nodes.length) console.error(`[timeline] stop "${def.id}": nothing in the résumé matches ${def.node}`);
    for (const n of nodes) {
      if (n.parentNode) move(n, card); else card.appendChild(n);
    }

    // the lead line goes first and shows; the rest waits behind "More"
    const list = card.querySelector('.entry__list');
    let more = 0;
    if (list && def.lead) {
      const lead = list.querySelector(`:scope > [data-fact="${def.lead}"]`);
      if (!lead) console.error(`[timeline] stop "${def.id}": no lead line "${def.lead}" in its list`);
      else if (lead !== list.firstElementChild) move(lead, list, list.firstElementChild);
      for (const item of list.children) {
        if (item === lead) addClass(item, 'is-lead');
        else { addClass(item, 'is-more'); more++; }
      }
    }
    if (def.chips.length) {
      const chips = el('ul', 'stop__chips');
      chips.setAttribute('aria-hidden', 'true');      // a summary of the lines above
      for (const c of def.chips) chips.appendChild(el('li', null, c));
      card.appendChild(chips);
    }
    if (more) {
      if (!list.id) setAttr(list, 'id', 'more-' + def.id);
      const label = `Show ${more} more`;
      const btn = el('button', 'stop__more', label);
      btn.type = 'button';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', list.id);
      btn.addEventListener('click', () => {
        const open = !card.classList.contains('is-open');
        card.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? 'Show less' : label;
      });
      card.appendChild(btn);
    }

    let lane = null;
    if (def.layout === 'intro' || def.layout === 'end') {   // bookends: the card beside the scene
      li.classList.add('stop--side', 'stop--' + def.layout);
      if (def.layout === 'intro') li.append(card, stage); else li.append(stage, card);
    } else {
      const body = el('div', 'stop__body');
      const when = el('p', 'stop__when');
      const date = whenOf(def, card);
      if (date) { const d = el('span', 'stop__date', date); d.setAttribute('aria-hidden', 'true'); when.appendChild(d); }
      if (def.kind) when.appendChild(el('span', 'stop__kind', def.kind));
      lane = el('span', 'stop__lane');
      lane.setAttribute('aria-hidden', 'true');
      body.append(when, lane, card);
      li.append(stage, body);
    }
    ol.appendChild(li);
    return { def, i, li, stage, scene, card, lane, c: null, cx: null, key: '', placed: null, gates: { in: null, out: null } };
  }

  function mount() {
    if (on) return;
    on = true;
    for (const def of STOPS) {
      if (def.build && !def.built) {
        def.built = true;
        try { def.build(game.art); } catch (err) { console.error(`[timeline] stop "${def.id}" failed to build`, err); }
      }
    }
    ol = el('ol', 'timeline');
    ol.setAttribute('aria-label', 'Timeline, newest first');
    resume.prepend(ol);
    stops = STOPS.map(buildStop);
    for (const sec of resume.querySelectorAll('.resume__section')) {
      if (!ol.contains(sec) && !sec.querySelector('[data-fact]')) addClass(sec, 'is-emptied');
    }
    addClass(resume, 'has-timeline');
    check();

    canvas = el('canvas', 'timeline-canvas');
    canvas.setAttribute('aria-hidden', 'true');
    ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);

    t0 = performance.now();
    lastY = window.scrollY;
    dirty = true;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisible);
    motionQuery.addEventListener('change', onMotion);
    if ('ResizeObserver' in window) { ro = new ResizeObserver(onResize); ro.observe(ol); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
    if (FLAGS.debug) window.__timeline = api;
    measure();                       // size the boxes now, so deep links land right
    schedule();
  }

  function unmount() {
    if (!on) return;
    on = false;
    cancelAnimationFrame(raf); raf = 0;
    clearTimeout(loopTimer); clearTimeout(moveTimer);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisible);
    motionQuery.removeEventListener('change', onMotion);
    if (ro) { ro.disconnect(); ro = null; }
    for (const [node, mark] of moved.reverse()) mark.replaceWith(node);
    moved.length = 0;
    for (const fn of undo.reverse()) fn();
    undo.length = 0;
    for (const S of stops) free(S);
    ol.remove(); canvas.remove();
    ol = canvas = ctx = null;
    stops = []; segs = []; L = null;
  }

  // every fact must sit on the timeline: anything left behind is hidden
  function check() {
    const left = [...resume.querySelectorAll('[data-fact]')].filter((n) => !ol.contains(n)).map((n) => n.dataset.fact);
    if (left.length) console.error('[timeline] facts left off the timeline (hidden in the website view):', left.join(', '));
    if (!FLAGS.debug) return;
    const owner = new Map();
    for (const S of stops) {
      for (const id of S.def.factIds) {
        const n = resume.querySelector(`[data-fact="${id}"]`);
        if (!n) console.error(`[timeline] stop "${S.def.id}" lists fact "${id}", which is not in the résumé`);
        else if (!S.card.contains(n)) console.error(`[timeline] stop "${S.def.id}" lists fact "${id}", but its card does not hold it`);
        if (owner.has(id)) console.error(`[timeline] fact "${id}" is listed by both "${owner.get(id)}" and "${S.def.id}"`);
        owner.set(id, S.def.id);
      }
    }
    const all = [...resume.querySelectorAll('[data-fact]')].map((n) => n.dataset.fact);
    const unlisted = all.filter((id) => !owner.has(id));
    if (unlisted.length) console.warn('[timeline] facts on the timeline that no stop lists in factIds:', unlisted.join(', '));
    console.log(`[timeline] ${stops.length} stops, ${all.length} facts on the timeline (${new Set(all).size} unique), ${left.length} left off`);
    if (!check.shim) {                  // once: every level set piece through the fake level
      check.shim = true;
      setTimeout(() => {
        const r = shimSelfTest(LEVELS);
        console.log(`[timeline] level shim: built and drew ${r.built} set pieces of ${r.types.length} types`);
        r.bad.forEach((b) => console.error('[timeline] level shim:', b));
      }, 0);
    }
  }

  // ─── layout ───────────────────────────────────────────────────────

  function measure() {
    dirty = false;
    const dpr = window.devicePixelRatio || 1;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    // one scale for every scene: about 2 CSS px per art px on desktop, 1 on phones
    const lo = Math.max(1, Math.ceil(dpr - 0.01)), hi = Math.max(lo, Math.floor(dpr * 2 + 0.01));
    const rs = clamp(Math.floor((Math.min(ol.clientWidth, 800) * dpr) / DESIGN_W), lo, hi);
    const k = dpr / rs;                                  // CSS px → art px

    // size each box to whole art pixels (read all, then write all, then read)
    const room = stops.map((S) => S.stage.clientWidth);
    stops.forEach((S, i) => {
      const maxW = Math.min(MAX_W, Math.round(S.def.size[0] * 1.25));
      S.w = clamp(Math.floor(room[i] * k), 1, maxW);
      S.h = S.def.size[1];
      const w = (S.w * rs) / dpr + 'px', h = (S.h * rs) / dpr + 'px';
      if (S.scene.style.width !== w) S.scene.style.width = w;
      if (S.scene.style.height !== h) S.scene.style.height = h;
    });
    const sx = window.scrollX, sy = window.scrollY;
    for (const S of stops) {
      const r = S.scene.getBoundingClientRect();
      S.x = r.left + sx; S.y = r.top + sy; S.cw = r.width; S.ch = r.height;
      if (S.lane) {
        const q = S.lane.getBoundingClientRect();
        S.laneX = q.left + sx + q.width / 2; S.laneHalf = q.width / 2;
      } else S.laneX = null;
      S.inX = S.outX = Math.round(S.w / 2);
    }

    // the path: each segment runs down the lane beside the card it passes
    segs = [];
    for (let i = 0; i + 1 < stops.length; i++) {
      const A = stops[i], B = stops[i + 1];
      const own = A.laneX != null ? A : B;
      const lane = own.laneX != null ? own.laneX : A.x + A.cw / 2;
      A.outX = clamp(Math.round((lane - A.x) * k), 10, A.w - 10);
      B.inX = clamp(Math.round((lane - B.x) * k), 10, B.w - 10);
      const move = MOVES[A.def.leave] ? A.def.leave : 'walk';
      const seg = {
        i, move, side: i % 2 ? -1 : 1,
        a: [A.x * k + A.outX, (A.y + A.ch) * k],
        b: [B.x * k + B.inX, B.y * k],
        amp: Math.max(0, (own.laneHalf || 24) * k - 11),
        top: A.y + A.ch, bottom: B.y,
      };
      seg.pts = MOVES[move].shape(seg);
      segs.push(seg);
    }
    stops.forEach((S, i) => {
      S.enters = S.def.enter && i > 0;
      S.exits = S.def.exit && i < stops.length - 1;
      S.gates = { in: S.enters ? S.inX : null, out: S.exits ? S.outX : null };
    });

    // the reading-line heights over which each scene's p runs 0 → 1
    const max = Math.max(0, document.documentElement.scrollHeight - vh);
    const yMin = READ * vh, yMax = max + READ * vh;
    for (const S of stops) {
      S.start = clamp(S.y, yMin, yMax);
      S.end = clamp(S.y + S.ch, yMin, yMax);
    }
    const last = stops[stops.length - 1];           // the last scene plays out to the very bottom
    if (!last.exits && yMax > last.start) last.end = yMax;

    const W = Math.round(vw * dpr), H = Math.round(vh * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    L = { dpr, rs, k, vw, vh, yMin, yMax };
    for (const S of stops) S.key = '';
  }

  // where the reading line is: inside stop i at p, or on segment i at s
  function locate(yr) {
    if (yr <= stops[0].start) return { stop: 0, p: 0 };
    for (let i = 0; i < stops.length; i++) {
      const S = stops[i];
      if (yr < S.start) {
        const A = stops[i - 1];
        return { seg: i - 1, s: clamp((yr - A.end) / Math.max(1, S.start - A.end), 0, 1) };
      }
      if (yr <= S.end) return { stop: i, p: S.end > S.start ? (yr - S.start) / (S.end - S.start) : 1 };
    }
    return { stop: stops.length - 1, p: 1 };
  }
  function nearest(yr) {
    let best = 0, d = Infinity;
    stops.forEach((S, i) => { const e = Math.abs(yr - (S.y + S.ch / 2)); if (e < d) { d = e; best = i; } });
    return { stop: best, p: stops[best].def.keyPose };
  }

  // ─── drawing ──────────────────────────────────────────────────────

  function free(S) {
    if (S.c) { S.c.width = S.c.height = 0; }
    S.c = S.cx = null; S.key = '';
  }

  function paint(S, p, t, here, how, key) {
    const { rs } = L;
    const W = S.w * rs, H = S.h * rs;
    if (!S.c) [S.c, S.cx] = makeCanvas(W, H);
    else if (S.c.width !== W || S.c.height !== H) { S.c.width = W; S.c.height = H; }
    const c = S.cx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    c.setTransform(rs, 0, 0, rs, 0, 0);          // the game's convention: draw in art px
    c.imageSmoothingEnabled = false;
    c.W = S.w;
    S.placed = null;
    const hero = here ? {
      in: [S.inX, 0], out: [S.outX, S.h], floor: S.h - FLOOR,
      enters: S.enters, exits: S.exits, dir: how.dir, moving: how.moving,
      place(pose, x, y, facing = 1) { S.placed = { pose, x, y, facing }; },
    } : null;
    try {
      S.def.draw(c, { p, t, hero, reduced, w: S.w, h: S.h, floor: S.h - FLOOR, path: S.gates });
    } catch (err) {
      if (!S.failed) console.error(`[timeline] stop "${S.def.id}" failed to draw`, err);
      S.failed = true;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = '#151d45';
      c.fillRect(0, 0, W, H);
    }
    S.key = key;
    perf.paints++;
  }

  // a pixel frame round each box, open where the path comes in and goes out
  function frame(c, S) {
    const w = S.w, h = S.h;
    const edge = (y, gate, color, inset) => {
      if (gate == null) { c.fillRect(-inset + 1, y, w + inset * 2 - 2, 1); return; }
      c.fillRect(-inset + 1, y, gate - 6 + inset - 1, 1);
      c.fillRect(gate + 6, y, w - gate - 6 + inset - 1, 1);
    };
    for (const [inset, color] of [[2, RIM], [1, INK]]) {
      c.fillStyle = color;
      edge(-inset, S.gates.in, color, inset);
      edge(h + inset - 1, S.gates.out, color, inset);
      c.fillRect(-inset, -inset + 1, 1, h + inset * 2 - 2);
      c.fillRect(w + inset - 1, -inset + 1, 1, h + inset * 2 - 2);
    }
  }

  function render(now) {
    if (raf) cancelAnimationFrame(raf);          // a direct call (drawNow) replaces the queued one
    raf = 0;
    if (!on) return;
    const r0 = performance.now();
    now = now || r0;
    if (dirty) measure();
    const { dpr, rs, vh } = L;
    setTextMetrics(rs, rs / dpr);                  // the game's display may have set its own
    const sy = window.scrollY, sDev = Math.round(sy * dpr);
    const yr = sy + READ * vh;
    const at = reduced ? nearest(yr) : locate(yr);
    const t = Math.floor((now - t0) / (1000 / 60));
    const how = { dir, moving: moving && !reduced };
    const top = sy - 80, bottom = sy + vh + 80;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // 1. the path between the boxes
    ctx.setTransform(rs, 0, 0, rs, 0, -sDev);
    for (const g of segs) if (g.bottom > top && g.top < bottom) MOVES[g.move].draw(ctx, g, t);

    // 2. the scenes: past ones finished, coming ones not started
    let rate = 0;
    for (const S of stops) {
      if (S.y + S.ch < top || S.y > bottom) {
        if (S.c && Math.abs(S.y - sy) > vh * 3) free(S);
        continue;
      }
      const here = at.stop === S.i;
      const past = at.stop != null ? S.i < at.stop : S.i <= at.seg;
      const p = reduced ? S.def.keyPose : here ? at.p : past ? 1 : 0;
      const fps = S.def.loop && !reduced ? (S.def.loop === true ? 30 : +S.def.loop) : 0;
      if (fps) rate = Math.max(rate, fps);
      const st = fps ? t : 0;
      const key = `${p.toFixed(4)}|${st}|${here ? how.dir + ',' + how.moving : '-'}|${S.w}x${S.h}@${rs}`;
      if (key !== S.key) paint(S, p, st, here, how, key);
      const bx = Math.round(S.x * dpr), by = Math.round(S.y * dpr) - sDev;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(S.c, bx, by);
      ctx.setTransform(rs, 0, 0, rs, bx, by);
      frame(ctx, S);
    }

    // 3. Shrey: placed by the scene he's in, or on the path
    if (at.stop != null) {
      const S = stops[at.stop], h = S.placed;
      if (h) {
        ctx.setTransform(rs, 0, 0, rs, Math.round(S.x * dpr), Math.round(S.y * dpr) - sDev);
        drawHero(ctx, h.pose, h.x, h.y, h.facing);
      }
    } else {
      const g = segs[at.seg];
      const h = MOVES[g.move].at(g, at.s, how);
      ctx.setTransform(rs, 0, 0, rs, 0, -sDev);
      drawHero(ctx, h.pose, h.x, h.y, h.facing);
    }

    perf.ms = performance.now() - r0;
    perf.frames++;
    if (FLAGS.debug && !bare) debugLayer(at, yr, sy);

    // idle loops: the fastest on-screen scene sets the pace
    clearTimeout(loopTimer);
    if (rate && !document.hidden) loopTimer = setTimeout(schedule, 1000 / rate);
  }

  // ?debug=1: the reading line, each box's id and p, the frame cost
  function debugLayer(at, yr, sy) {
    const { dpr, rs, vh } = L, k = dpr / rs;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ff4fd8';
    ctx.fillRect(0, Math.round(READ * vh * dpr), canvas.width, Math.max(1, Math.round(dpr)));
    for (const S of stops) {
      if (S.y + S.ch < sy || S.y > sy + vh) continue;
      const p = at.stop === S.i ? at.p : null;
      drawText(ctx, `${S.def.id}${p != null ? ' p=' + p.toFixed(2) : ''}`, S.x * k + 4, (S.y - sy) * k + 3, '#ff9de9', { shadow: '#0b0d17', size: 6 });
    }
    const where = at.stop != null ? `stop ${stops[at.stop].def.id} p=${at.p.toFixed(3)}` : `seg ${at.seg} (${segs[at.seg].move}) s=${at.s.toFixed(3)}`;
    drawText(ctx, `${where} · ${perf.ms.toFixed(2)} ms · ${perf.paints} paints`, 4, (READ * vh) * k + 2, '#ff9de9', { shadow: '#0b0d17', size: 6 });
  }

  // ─── events ───────────────────────────────────────────────────────

  function schedule() { if (on && !raf) raf = requestAnimationFrame(render); }
  function onScroll() {
    const y = window.scrollY;
    if (y !== lastY) {
      dir = y > lastY ? 1 : -1;
      lastY = y;
      moving = true;
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => { moving = false; schedule(); }, HOLD);
    }
    schedule();
  }
  function onResize() { dirty = true; schedule(); }
  function onVisible() { if (document.hidden) clearTimeout(loopTimer); else schedule(); }
  function onMotion(e) { reduced = e.matches; schedule(); }

  // print the plain résumé: take the timeline down, then put it back
  window.addEventListener('beforeprint', () => { if (on) { printY = window.scrollY; unmount(); } });
  window.addEventListener('afterprint', () => {
    if (printY === null) return;
    const y = printY;
    printY = null;
    mount();
    window.scrollTo({ top: y, behavior: 'instant' });
  });

  // ─── moving the page ──────────────────────────────────────────────

  function stopOf(node) {
    const li = node && node.closest && node.closest('li.stop');
    return li ? stops.find((S) => S.li === li) : null;
  }
  // scroll so the reading line sits in a stop's scene at p
  function scrollToStop(S, p = S.def.keyPose, smooth = false) {
    if (dirty) measure();
    const top = S.i === 0 && p <= 0 ? 0 : S.start + p * (S.end - S.start) - READ * L.vh;
    window.scrollTo({ top: Math.max(0, top), behavior: smooth && !reduced ? 'smooth' : 'instant' });
  }

  const api = {
    get on() { return on; },
    mount, unmount,
    // a deep link or bar link: show the stop holding this element
    reveal(node, smooth = false) {
      const S = stopOf(node);
      if (!S) return false;
      scrollToStop(S, S.i === 0 ? 0 : S.def.keyPose, smooth);
      return true;
    },
    // the game's place ids → stops (home is the intro, tree the skills…)
    revealNode(node, smooth = false) {
      const S = stops.find((x) => x.def.id === node || (x.def.places || []).includes(node));
      if (!S) return false;
      scrollToStop(S, S.i === 0 ? 0 : S.def.keyPose, smooth);
      return true;
    },
    // for stepping by hand: __timeline.goto('vincio', 0.5) in ?debug=1
    goto(id, p = 0.5) {
      const S = stops.find((x) => x.def.id === id);
      if (S) scrollToStop(S, p);
      return !!S;
    },
    state() {
      if (!L) return null;
      const yr = window.scrollY + READ * L.vh;
      return { ...(reduced ? nearest(yr) : locate(yr)), reduced, rs: L.rs, dpr: L.dpr, perf: { ...perf } };
    },
    layout: () => ({ L, stops: stops.map((S) => ({ id: S.def.id, x: S.x, y: S.y, w: S.w, h: S.h, cssW: S.cw, cssH: S.ch, start: S.start, end: S.end, inX: S.inX, outX: S.outX })), segs }),
    render: schedule,
    // try the reduced-motion version without changing the OS setting
    setReduced(v = true) { reduced = !!v; for (const S of stops) S.key = ''; schedule(); },
    // draw a frame right now (a hidden tab defers rAF and scroll events);
    // dir and moving fake the scroll direction and the run cycle
    drawNow(opts = {}) {
      onScroll();
      if (opts.dir) dir = opts.dir;
      if (opts.moving !== undefined) { moving = opts.moving; clearTimeout(moveTimer); }
      bare = !!opts.bare;
      render(performance.now());
      bare = false;
      return api.state();
    },
  };
  return api;
}
