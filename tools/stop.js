// The stop test bench: one stop at a time, driven by the same runtime as
// the page (js/timeline/api.js), so what you see here is what the page
// draws. Serve the folder and open /tools/stop.html?stop=ornl.

import { loadStop, transitRuntime, defaultTransit, placeLabels, heroBox, IDLE_FPS } from '../js/timeline/api.js';
import { checkStop, guardText } from '../js/timeline/validate.js';
import { STOP_IDS } from '../js/timeline/stops/index.js';
import { SCENE_H, CORE_W, drawHero, frameOf } from '../js/timeline/kit.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const LANE_CSS = 120, CARD_GAP_CSS = 24;          // css/timeline.css, desktop

// where each stop's content lives in index.html (until it carries data-stop)
const LEGACY = { intro: 'header.resume__head', edulearn: '[data-fact="a-edulearn"]', contact: '#h-contact, #contact' };

const state = {
  id: STOP_IDS.includes(q.get('stop')) ? q.get('stop') : 'intro',
  w: +q.get('w') || 200, p: q.has('p') ? +q.get('p') : 0.35, s: 0.4, th: 180,
  gp: +q.get('gp') || 3, reduced: q.get('reduced') === '1', up: false, still: false, idle: false, side: 0,
  who: 'here', t: 0,
};
let rt = null, el = null, built = new Map(), tbuilt = new Map(), doc = null, idleTimer = 0, t0 = performance.now();

// ─── controls ─────────────────────────────────────────────────────────

for (const id of STOP_IDS) $('stop').append(new Option(id, id, false, id === state.id));
$('w').value = state.w; $('p').value = state.p; $('reduced').checked = state.reduced;
document.querySelector(`input[name="gp"][value="${state.gp}"]`).checked = true;

$('stop').addEventListener('change', () => { state.id = $('stop').value; load(); });
$('w').addEventListener('input', () => { state.w = +$('w').value; draw(); });
$('p').addEventListener('input', () => { state.p = +$('p').value; draw(); });
$('s').addEventListener('input', () => { state.s = +$('s').value; drawTransit(); });
$('th').addEventListener('input', () => { state.th = +$('th').value; drawTransit(); });
for (const r of document.querySelectorAll('input[name="gp"]')) r.addEventListener('change', () => { state.gp = +r.value; draw(); drawTransit(); });
for (const r of document.querySelectorAll('input[name="state"]')) r.addEventListener('change', () => { state.who = r.value; draw(); });
for (const r of document.querySelectorAll('input[name="side"]')) r.addEventListener('change', () => { state.side = +r.value; drawTransit(); });
for (const k of ['reduced', 'up', 'still', 'idle']) $(k).addEventListener('change', () => { state[k] = $(k).checked; draw(); drawTransit(); });
$('core').addEventListener('change', () => $('stage').classList.toggle('no-core', !$('core').checked));
$('check').addEventListener('click', runChecks);
$('play').addEventListener('click', play);

// one game pixel = a whole number of device pixels, as on the page
const scale = () => Math.max(1, Math.round(state.gp * (window.devicePixelRatio || 1)));
const cssPx = () => scale() / (window.devicePixelRatio || 1);

function sizeCanvas(c, w, h) {
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  c.style.width = (w * cssPx()) + 'px';
  c.style.height = (h * cssPx()) + 'px';
}

// the hero as the page's track element: drawn at his frame size, moved in CSS px
function placeHeroEl(canvas, hero, ox, oy) {
  if (!hero) { canvas.hidden = true; return; }
  const fr = hero.fr || frameOf(hero.pose, hero.frame, rt && rt.poses);
  const b = heroBox(fr, hero);
  sizeCanvas(canvas, fr.w, fr.h);
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, fr.w, fr.h);
  c.imageSmoothingEnabled = false;
  drawHero(c, fr, hero.x - b.x, hero.y - b.y, hero.facing);
  canvas.style.transform = `translate(${ox + b.x * cssPx()}px, ${oy + b.y * cssPx()}px)`;
  canvas.hidden = false;
}

// ─── the scene ────────────────────────────────────────────────────────

async function load() {
  history.replaceState(null, '', `?stop=${state.id}`);
  rt = await loadStop(state.id);
  built.clear(); tbuilt.clear();
  if (!doc) doc = new DOMParser().parseFromString(await (await fetch('../index.html')).text(), 'text/html');
  el = doc.querySelector(`[data-stop="${state.id}"]`) || doc.querySelector(LEGACY[state.id] || '#' + state.id);
  $('title').textContent = `${state.id}${rt.mod.placeholder ? ' (placeholder)' : ''} · facts: ${rt.facts.join(', ') || 'none'}`;
  $('transit-kind').textContent = rt.mod.transit ? 'this stop’s own transit' : 'the default connector (this stop has no transit)';
  draw(); drawTransit();
}

function draw() {
  if (!rt) return;
  const w = state.w - (state.w % 2), h = SCENE_H;
  $('w-out').value = w; $('p-out').value = state.p.toFixed(3);
  if (!built.has(w)) built.set(w, rt.build({ w, h, el }));
  const b = built.get(w);
  const canvas = $('scene');
  sizeCanvas(canvas, w, h);
  const ctx = guardText(canvas.getContext('2d'));
  const active = state.who === 'here';
  const p = active ? state.p : state.who === 'before' ? 0 : 1;
  const end = state.id === STOP_IDS[STOP_IDS.length - 1];          // the path ends here: no walk out
  const f = rt.frame({ p, active, reduced: state.reduced, t: state.idle ? state.t : 0, dir: state.up ? -1 : 1, still: state.still, end, w, h });
  let r;
  try { r = rt.render(ctx, b, f); } catch (err) { $('readout').textContent = 'draw threw: ' + err.message; console.error(err); return; }

  const k = cssPx();
  $('box').style.width = (w * k) + 'px';
  $('box').style.height = (h * k) + 'px';
  const core = $('corebox');
  core.style.left = (((w - CORE_W) / 2) * k) + 'px';
  core.style.width = (CORE_W * k) + 'px';
  placeLabels($('labels'), r.labels, k);
  const box = $('box').getBoundingClientRect(), stage = $('stage').getBoundingClientRect();
  placeHeroEl($('hero'), r.hero && !r.hero.inside ? r.hero : null, box.left - stage.left, box.top - stage.top);

  const hr = r.hero;
  $('readout').textContent =
    `phase ${f.phase}   p ${f.p.toFixed(3)}   act ${f.act.toFixed(3)}   hold ${f.hold.toFixed(3)}   walk ${f.walk.toFixed(3)}   t ${f.t}\n` +
    (hr ? `hero ${hr.pose}.${hr.frame} at (${hr.x.toFixed(1)}, ${hr.y.toFixed(1)}) facing ${hr.facing}  ${hr.inside ? 'drawn in the scene' : 'on the track layer (overhangs the scene)'}` : 'hero: not in this scene') +
    `\nscale: ${k} CSS px per game px (${scale()} device px), scene ${w}×${h}` + (r.labels.length ? `\nlabels: ${r.labels.map((l) => l.text).join(' · ')}` : '');

  // the idle loop: only in hold, only if the stop asks for it, never reduced
  clearTimeout(idleTimer);
  if (state.idle && rt.idle && f.phase === 'hold' && !state.reduced) {
    idleTimer = setTimeout(() => { state.t = Math.round(performance.now() - t0); draw(); }, 1000 / IDLE_FPS);
  }
}

// ─── the move to the next stop ────────────────────────────────────────

function drawTransit() {
  if (!rt) return;
  const tw = state.gp >= 3 ? 96 : 64, th = state.th - (state.th % 2);
  $('s-out').value = state.s.toFixed(3); $('th-out').value = th;
  const tr = transitRuntime(rt.mod.transit || defaultTransit);
  // as on the desktop page: the centre lane is 120 CSS px (20 game px each side)
  // and the card starts 24 CSS px beyond it; phones have no lane
  const side = state.side, lane = side ? LANE_CSS / 2 / 3 : 0;
  const key = `${tw}x${th}|${side}|${lane}`;
  if (!tbuilt.has(key)) tbuilt.set(key, tr.build({ w: tw, h: th, side, lane }));
  const b = tbuilt.get(key);
  const canvas = $('tcanvas');
  sizeCanvas(canvas, tw, th);
  const ctx = guardText(canvas.getContext('2d'));
  let hero;
  try { hero = tr.render(ctx, b, { s: state.s, dir: state.up ? -1 : 1, reduced: state.reduced, still: state.still }); } catch (err) { console.error(err); return; }
  const k = cssPx();
  $('tbox').style.width = (tw * k) + 'px';
  $('tbox').style.height = (th * k) + 'px';
  const box = $('tbox').getBoundingClientRect(), stage = $('tstage').getBoundingClientRect();
  placeHeroEl($('thero'), state.reduced ? null : hero, box.left - stage.left, box.top - stage.top);
  // the card over the side it sits on, from the lane's edge plus the gap
  const card = $('tcard');
  card.hidden = !side;
  if (side) {
    const edge = (tw / 2) * k + (LANE_CSS / 2 + CARD_GAP_CSS) * (k / 3);
    Object.assign(card.style, side > 0 ? { left: edge + 'px', right: '-40px' } : { left: '-40px', right: edge + 'px' });
  }
}

// ─── play and check ───────────────────────────────────────────────────

function play() {
  const T = 9000, start = performance.now();
  $('play').disabled = true;
  const tick = (now) => {
    const u = (now - start) / T;
    if (u >= 1) { state.p = 0; state.up = false; $('play').disabled = false; $('p').value = 0; draw(); return; }
    state.up = u > 0.5;
    state.p = u < 0.5 ? u * 2 : 2 - u * 2;
    state.s = state.p;
    $('p').value = state.p; $('s').value = state.s;
    draw(); drawTransit();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function runChecks() {
  const out = $('results');
  out.innerHTML = '';
  const r = checkStop(rt, { el });
  const li = (cls, text) => { const n = document.createElement('li'); n.className = cls; n.textContent = text; out.appendChild(n); };
  for (const m of r.problems) li('bad', m);
  for (const m of r.notes) li('note', m);
  if (!r.problems.length) li('good', `${state.id}: OK (widths 160 and 240, p 0–1, reduced on and off, no canvas text, deterministic${rt.mod.transit ? ', transit too' : ''})`);
  console.log(`[bench] ${state.id}: ${r.problems.length} problems, ${r.notes.length} notes`, r);
}

window.addEventListener('resize', () => { draw(); drawTransit(); });
window.__bench = { state, draw, drawTransit, runChecks, get rt() { return rt; } };
load();
