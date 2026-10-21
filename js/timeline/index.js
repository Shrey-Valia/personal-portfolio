// The scroll timeline engine (docs/TIMELINE-ARCHITECTURE.md §2).
//
// Layers, back to front, all inside <main>:
//   scene canvases   one per stop, in its .stop__scene box (page flow)
//   .tl-track        absolute over <main>: a connector canvas per gap, and
//                    .tl-hero, the travelling hero, moved by transform
//   .stop__card      the text, above the track
// Scenes and connectors scroll natively with the page, so they never drift
// from their cards during a momentum fling; only the hero is moved by us,
// in page coordinates.
//
// Every canvas is backed at game-pixel size and scaled up whole by CSS:
// scale = max(1, round(--gp × dpr)) device px per game px, one scale for
// the page. Frames are drawn only when the scroll position, the layout or
// an idle loop (≤ 8 fps, hold phase, active stop only) changes something.
//
// createTimeline({ root, debug }) → { start, stop, relayout, reveal, revealNode }

import { loadStop, runtime, transitRuntime, defaultTransit, placeLabels, heroBox, IDLE_FPS, SPLIT } from './api.js';
import { placeholder } from './stops/_placeholder.js';
import { LIST } from './stops/index.js';
import { SCENE_H, MIN_W, MAX_W, frameOf, drawHero } from './kit.js';
import { dwellWindows, sample, current, scrollFor } from './layout.js';
import { guardText, checkPage, hashCanvas } from './validate.js';
import { clamp, makeCanvas } from '../engine/util.js';

const STILL_MS = 200;            // after this long without scrolling he stops walking
const MARGIN = 0.75;             // draw scenes this many screens beyond the viewport

function el(tag, cls) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

export function createTimeline({ root, debug = false }) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motion.matches;
  let on = false, inited = false, dirty = true, raf = 0, idleTimer = 0, stillTimer = 0;
  let lastY = 0, dir = 1, still = true, t0 = performance.now();
  let G = null;                  // the measured geometry
  let track = null, heroEl = null, heroCtx = null, heroKey = '', vhProbe = null, ro = null;
  const perf = { ms: 0, frames: 0, paints: 0 };

  // one record per [data-stop] element, in page order
  const stops = [...root.querySelectorAll('[data-stop]')].map((node, i) => {
    const entry = LIST.find((s) => s.id === node.dataset.stop);
    return {
      i, id: node.dataset.stop, node, box: node.querySelector('.stop__scene'),
      rt: runtime(placeholder(node.dataset.stop, entry ? entry.facts : [])),
      built: null, key: '', last: null, canvas: null, ctx: null, labels: null,
    };
  });
  const gaps = stops.slice(1).map((s, i) => ({ i, canvas: null, ctx: null, tr: null, built: null, key: '' }));

  // ─── DOM ─────────────────────────────────────────────────────────

  function init() {
    inited = true;
    for (const s of stops) {
      if (!s.box) continue;
      s.canvas = el('canvas', 'tl-canvas tl-scene');
      s.ctx = s.canvas.getContext('2d');
      if (debug) guardText(s.ctx);
      s.labels = el('div', 'tl-labels');
      s.labels.setAttribute('aria-hidden', 'true');
      s.box.append(s.canvas, s.labels);
    }
    track = el('div', 'tl-track');
    track.setAttribute('aria-hidden', 'true');
    for (const g of gaps) {
      g.canvas = el('canvas', 'tl-canvas tl-gap');
      g.ctx = g.canvas.getContext('2d');
      if (debug) guardText(g.ctx);
      track.appendChild(g.canvas);
    }
    heroEl = el('canvas', 'tl-canvas tl-hero');
    heroEl.hidden = true;
    heroCtx = heroEl.getContext('2d');
    track.appendChild(heroEl);
    root.appendChild(track);
    vhProbe = el('div', 'tl-vh');
    vhProbe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(vhProbe);
    // the intro first, the rest after the first frame
    swapIn(stops[0]);
    requestAnimationFrame(() => stops.slice(1).forEach(swapIn));
  }

  async function swapIn(s) {
    const rt = await loadStop(s.id);
    s.rt = rt; s.built = null; s.key = '';           // the stop's own module, even if it's still a placeholder
    const g = gaps[s.i];
    if (g) { g.tr = null; g.key = ''; }
    dirty = true;
    schedule();
    s.loaded = true;
    if (debug && stops.every((x) => x.loaded)) report();
  }

  // ─── layout ──────────────────────────────────────────────────────

  function measure() {
    dirty = false;
    const cs = getComputedStyle(document.documentElement);
    const gp = parseFloat(cs.getPropertyValue('--gp')) || 3;
    const lanePx = parseFloat(cs.getPropertyValue('--lane')) || 0;
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.max(1, Math.round(gp * dpr));
    const k = scale / dpr;                                       // CSS px per game px
    const vw = document.documentElement.clientWidth;
    const vh = vhProbe.offsetHeight || window.innerHeight;
    const phone = gp < 2.5;

    // 1. read every box's width, then 2. size the canvases, then 3. read positions
    const room = stops.map((s) => (s.box ? s.box.clientWidth : 0));
    stops.forEach((s, i) => {
      if (!s.canvas) return;
      let w = clamp(Math.floor(room[i] / k), MIN_W, MAX_W);
      w -= w % 2;
      if (!s.built || s.built.w !== w) {
        try { s.built = s.rt.build({ w, h: SCENE_H, el: s.node }); }
        catch (err) { fail(s, err); s.built = s.rt.build({ w, h: SCENE_H, el: s.node }); }
        s.key = '';
      }
      if (s.canvas.width !== w || s.canvas.height !== SCENE_H) { s.canvas.width = w; s.canvas.height = SCENE_H; s.key = ''; }
      const cw = w * k, ch = SCENE_H * k;
      const ml = Math.round(((room[i] - cw) / 2) * dpr) / dpr;
      s.canvas.style.width = cw + 'px';
      s.canvas.style.height = ch + 'px';
      s.canvas.style.marginLeft = ml + 'px';
      Object.assign(s.labels.style, { left: ml + 'px', width: cw + 'px', height: ch + 'px' });
      s.box.style.height = ch + 'px';                          // CSS reserves 100 × --gp; the real scale may round
    });
    const mr = root.getBoundingClientRect();
    const ox = mr.left, oy = mr.top, sy = window.scrollY;
    const mainTop = oy + sy;
    for (const s of stops) {
      if (!s.canvas) continue;
      const r = s.canvas.getBoundingClientRect();
      s.x = r.left - ox; s.y = r.top - oy;                     // in <main>'s coordinates
      s.cy = r.top + sy + r.height / 2;                          // scene centre, document px
      const card = s.node.querySelector('.stop__card');
      s.card = card ? card.getBoundingClientRect() : null;
      s.centre = r.left - ox + r.width / 2;
    }

    // the connectors: from each exit down the lane to the next entrance
    const tw = phone ? 64 : 96;
    gaps.forEach((g, i) => {
      const A = stops[i], B = stops[i + 1];
      const ra = A.built.route, rb = B.built.route;
      const top = A.y + SCENE_H * k, bottom = B.y;
      const th = Math.max(2, Math.round((bottom - top) / k));
      const cx = (A.centre + B.centre) / 2;
      const left = Math.round((cx - (tw * k) / 2) * dpr) / dpr;
      const from = [Math.round((A.x + ra.exit[0] * k - left) / k), 0];
      const to = [Math.round((B.x + rb.enter[0] * k - left) / k), th];
      let side = 0;
      if (A.card && !phone && gp >= 3) {
        const cc = A.card.left - ox + A.card.width / 2;
        side = cc > cx + 4 ? 1 : cc < cx - 4 ? -1 : 0;
      }
      const lane = Math.max(0, Math.round(lanePx / 2 / k));
      const tr = transitRuntime(A.rt.mod.transit || defaultTransit);
      if (!g.tr || g.tr.tr !== tr.tr || !g.built || g.built.w !== tw || g.built.h !== th || g.built.side !== side) {
        g.tr = tr;
        try { g.built = tr.build({ w: tw, h: th, from, to, side, lane }); }
        catch (err) {
          console.error(`[timeline] stop "${A.id}" transit failed to build; using the default.`, err);
          g.tr = transitRuntime(defaultTransit);
          g.built = g.tr.build({ w: tw, h: th, from, to, side, lane });
        }
        g.built.side = side;
        g.key = '';
      }
      if (g.canvas.width !== tw || g.canvas.height !== th) { g.canvas.width = tw; g.canvas.height = th; g.key = ''; }
      g.canvas.style.width = tw * k + 'px';
      g.canvas.style.height = th * k + 'px';
      g.canvas.style.transform = `translate(${left}px, ${top}px)`;
      g.left = left; g.top = top; g.docTop = mainTop + top;
    });

    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    const first = stops[0] ? stops[0].rt.split : SPLIT, last = stops.length ? stops[stops.length - 1].rt.split : SPLIT;
    const win = dwellWindows(stops.map((s) => ({ cy: s.cy })), { vh, maxScroll, phone, introP: (first[1] + first[2]) / 2, endP: last[2] });
    G = { gp, dpr, scale, k, vw, vh, phone, win, maxScroll };
  }

  function fail(s, err) {
    console.error(`[timeline] stop "${s.id}" failed; using its placeholder.`, err);
    const entry = LIST.find((x) => x.id === s.id);
    s.rt = runtime(placeholder(s.id, entry ? entry.facts : []));
    s.built = null; s.key = '';
  }

  // ─── drawing ─────────────────────────────────────────────────────

  function showHero(hero, ox, oy) {
    if (!hero) { if (!heroEl.hidden) heroEl.hidden = true; return; }
    const { k } = G;
    const fr = hero.fr || frameOf(hero.pose, hero.frame, hero.local);
    const key = `${hero.pose}.${hero.frame}.${hero.facing}.${fr.w}`;
    const b = heroBox(fr, hero);
    if (key !== heroKey) {
      heroKey = key;
      if (heroEl.width !== fr.w || heroEl.height !== fr.h) { heroEl.width = fr.w; heroEl.height = fr.h; }
      heroEl.style.width = fr.w * k + 'px';
      heroEl.style.height = fr.h * k + 'px';
      heroCtx.clearRect(0, 0, fr.w, fr.h);
      heroCtx.imageSmoothingEnabled = false;
      drawHero(heroCtx, fr, hero.x - b.x, hero.y - b.y, hero.facing);
    }
    const x = Math.round((ox + b.x * k) * G.dpr) / G.dpr, y = Math.round((oy + b.y * k) * G.dpr) / G.dpr;
    heroEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (heroEl.hidden) heroEl.hidden = false;
  }

  function render(now) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (!on) return;
    const r0 = performance.now();
    now = now || r0;
    if (dirty) measure();
    const { k, vh, win } = G;
    const y = window.scrollY;
    const cur = reduced ? current(y, stops, vh) : -1;
    const at = reduced ? { dwell: true, stop: cur, p: 1 } : sample(y, win);
    const t = Math.round(now - t0);
    const lo = y - vh * MARGIN, hi = y + vh * (1 + MARGIN);
    let hero = null, heroAt = null, idle = false;

    // the scenes: the active one follows the scroll; the rest are before or after
    for (const s of stops) {
      if (!s.canvas) continue;
      const docTop = s.cy - (SCENE_H * k) / 2;
      if (docTop + SCENE_H * k < lo || docTop > hi) continue;
      const active = at.dwell && at.stop === s.i;
      const past = at.dwell ? s.i < at.stop : s.i <= at.gap;
      const p = active ? at.p : past ? 1 : 0;
      const f = s.rt.frame({ p, active, reduced, t, dir, still, end: s.i === stops.length - 1, w: s.built.w, h: SCENE_H });
      const key = `${f.phase}|${f.p.toFixed(4)}|${f.t}|${active ? dir + '' + still : ''}|${reduced}|${s.built.w}`;
      if (key !== s.key) {
        let r;
        try { r = s.rt.render(s.ctx, s.built, f); } catch (err) { fail(s, err); dirty = true; schedule(); continue; }
        s.key = key; s.last = r; perf.paints++;
        placeLabels(s.labels, r.labels, k);
      }
      if (active && s.last.hero) {
        hero = s.last.hero; heroAt = s;
        if (f.phase === 'hold' && s.rt.idle && !reduced) idle = true;
      }
    }

    // the connectors: the one he's on shows his progress, the rest are passed or ahead
    gaps.forEach((g, i) => {
      if (g.docTop + g.built.h * k < lo || g.docTop > hi) return;
      const here = !at.dwell && at.gap === i;
      const s = here ? at.s : (at.dwell ? i < at.stop : i < at.gap) ? 1 : 0;
      const key = `${s.toFixed(4)}|${here ? dir + '' + still : ''}|${reduced}`;
      if (key === g.key) return;
      let h;
      try { h = g.tr.render(g.ctx, g.built, { s, dir, reduced, still, here: here && !reduced }); }
      catch (err) { console.error('[timeline] transit failed; using the default.', err); g.tr = transitRuntime(defaultTransit); g.built = g.tr.build({ w: g.built.w, h: g.built.h, from: g.built.from, to: g.built.to }); g.key = ''; return; }
      g.key = key; g.hero = here ? h : null;
    });

    // Shrey: in a scene (drawn there unless he overhangs it) or on a connector
    if (hero) {
      if (hero.inside) showHero(null);
      else showHero({ ...hero, local: heroAt.rt.poses }, heroAt.x, heroAt.y);
    } else if (!at.dwell && !reduced && gaps[at.gap] && gaps[at.gap].hero) {
      const g = gaps[at.gap];
      showHero(g.hero, g.left, g.top);
    } else showHero(null);

    perf.ms = performance.now() - r0;
    perf.frames++;
    clearTimeout(idleTimer);
    if (idle && !document.hidden) idleTimer = setTimeout(schedule, 1000 / IDLE_FPS);
  }

  // ─── events ──────────────────────────────────────────────────────

  function schedule() { if (on && !raf) raf = requestAnimationFrame(render); }
  function onScroll() {
    const y = window.scrollY;
    if (y !== lastY) { dir = y > lastY ? 1 : -1; lastY = y; }
    still = false;
    clearTimeout(stillTimer);
    stillTimer = setTimeout(() => { still = true; schedule(); }, STILL_MS);
    schedule();
  }
  let lastW = 0, lastH = 0;
  function onResize() {
    const w = document.documentElement.clientWidth, h = vhProbe ? vhProbe.offsetHeight : window.innerHeight;
    // the iOS address bar changes the height by less than this: ignore it
    if (w !== lastW || Math.abs(h - lastH) > 150) { lastW = w; lastH = h; dirty = true; }
    schedule();
  }
  function onLayout() { dirty = true; schedule(); }
  function onVisible() { if (document.hidden) clearTimeout(idleTimer); else schedule(); }
  function setMotion(v) { reduced = v; for (const s of stops) s.key = ''; for (const g of gaps) g.key = ''; schedule(); }
  function onMotion() { setMotion(motion.matches); }

  // ─── debug ───────────────────────────────────────────────────────

  async function report() {
    const rts = stops.map((s) => s.rt);
    const r = checkPage(document, rts);
    r.problems.forEach((m) => console.error('[timeline] check:', m));
    r.notes.forEach((m) => console.warn('[timeline] note:', m));
    if (!r.problems.length) console.log(`[timeline] timeline check: ${r.stops} stops OK, ${r.facts}/${r.total} facts, 0 duplicates, determinism OK`);
  }

  // ─── the API ─────────────────────────────────────────────────────

  function toStop(s, smooth) {
    if (dirty || !G) measure();
    const split = s.rt.split || SPLIT;
    const p = s.i === 0 ? 0 : (split[1] + split[2]) / 2;
    const top = s.i === 0 ? 0 : scrollFor(s.i, p, G.win);
    window.scrollTo({ top: Math.max(0, Math.round(top)), behavior: smooth && !reduced ? 'smooth' : 'instant' });
  }

  const api = {
    get on() { return on; },
    start() {
      if (on) return;
      on = true;
      if (!inited) init();
      dirty = true;
      lastY = window.scrollY;
      lastW = document.documentElement.clientWidth; lastH = vhProbe.offsetHeight;
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize, { passive: true });
      document.addEventListener('visibilitychange', onVisible);
      motion.addEventListener('change', onMotion);
      if ('ResizeObserver' in window) { ro = new ResizeObserver(onLayout); ro.observe(root); }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(onLayout);
      measure();
      schedule();
      if (debug) window.__tl = api;
    },
    stop() {
      if (!on) return;
      on = false;
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(idleTimer); clearTimeout(stillTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisible);
      motion.removeEventListener('change', onMotion);
      if (ro) { ro.disconnect(); ro = null; }
    },
    relayout() { dirty = true; schedule(); },
    // a link to something on a stop: show that stop with its result held
    reveal(node, smooth = false) {
      const s = stops.find((x) => x.node === node || x.node.contains(node));
      if (!s) return false;
      toStop(s, smooth);
      return true;
    },
    revealNode(node, smooth = false) {
      const s = stops.find((x) => x.id === node || x.node.dataset.node === node);
      if (!s) return false;
      toStop(s, smooth);
      return true;
    },
    // debug: ?debug=1 exposes __tl
    goto(id, p = 0.5) { const s = stops.find((x) => x.id === id); if (!s) return false; if (dirty || !G) measure(); window.scrollTo({ top: Math.round(scrollFor(s.i, p, G.win)), behavior: 'instant' }); return true; },
    drawNow(opts = {}) { if (opts.dir) dir = opts.dir; if (opts.still !== undefined) still = opts.still; render(performance.now()); return api.state(); },
    state() {
      if (!G) return null;
      const y = window.scrollY;
      return { ...(reduced ? { dwell: true, stop: current(y, stops, G.vh) } : sample(y, G.win)), y, reduced, gp: G.gp, scale: G.scale, perf: { ...perf } };
    },
    // what's on screen right now: the visible canvases and where he is
    hash() {
      const seen = (c) => { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };
      const parts = [];
      for (const s of stops) if (s.canvas && seen(s.canvas)) parts.push(s.id + hashCanvas(s.ctx, s.canvas.width, s.canvas.height));
      for (const g of gaps) if (seen(g.canvas)) parts.push('g' + g.i + hashCanvas(g.ctx, g.canvas.width, g.canvas.height));
      if (!heroEl.hidden) parts.push(heroEl.style.transform + heroKey);
      return parts.join('|');
    },
    layout: () => ({ G, stops: stops.map((s) => ({ id: s.id, x: s.x, y: s.y, cy: s.cy, w: s.built && s.built.w, win: G && G.win[s.i] })), gaps: gaps.map((g) => ({ top: g.top, left: g.left, w: g.built && g.built.w, h: g.built && g.built.h, side: g.built && g.built.side })) }),
    setReduced(v = true) { setMotion(!!v); },
  };
  return api;
}
