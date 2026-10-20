// The overworld: walk the island between nodes, enter levels. Arrows pick
// the road that best matches the direction; tapping a node walks there.

import { NODES, EDGES, edgeOpen, reachable, route, lockReason } from '../map.js';
import { LEVELS, levelFacts } from '../levels/index.js';
import { drawPath, drawBeam, islandDist, HORIZON } from '../../art/mapart.js';
import { drawText, textWidth, lineHeight } from '../../art/font.js';
import { drawFrame } from '../../art/sprite.js';
import { col } from '../../art/palette.js';
import { disc, ring, pill } from '../../art/draw.js';

const SPEED = 2;

export class OverworldScene {
  constructor(game, { attract = false } = {}) {
    this.game = game;
    this.attract = attract;
    this.t = 0;
    this.node = 'home';
    this.walk = null;          // { steps, i, d, pts, lens }
    this.queue = [];
    this.facing = 1;
    this.reveal = new Map();   // edge -> progress 0..1
  }

  get ox() { return Math.round((this.game.W - 480) / 2); }

  enter({ node = 'home', justCleared = null } = {}) {
    this.node = node;
    const p = NODES[node];
    this.x = p.x; this.y = p.y;
    this.walk = null;
    this.queue = [];
    if (justCleared) {
      for (const e of EDGES) {
        if (e.needs && e.needs.includes(justCleared) && edgeOpen(e, this.game.progress.cleared)) {
          this.reveal.set(e, 0);
          this.game.audio.play('build');
        }
      }
    }
    if (!this.attract) {
      this.game.audio.music('map');
      this.game.ui.hud.setNode('Shrey Island');
      this.banner();
    }
  }

  isLevel(node) { return !!LEVELS[node]; }

  factCounts(node) {
    const def = LEVELS[node];
    const ids = def ? levelFacts(def) : this.game.content.nodeFacts(node);
    const found = ids.filter((id) => this.game.progress.hasFact(id)).length;
    return { found, total: ids.length };
  }

  banner() {
    const n = NODES[this.node];
    const { found, total } = this.factCounts(this.node);
    const facts = total ? ` · Facts ${found}/${total}` : '';
    const touch = document.documentElement.classList.contains('touch-on');
    const action = this.isLevel(this.node)
      ? `<em>▶ ${touch ? 'Tap again' : 'Space'} to enter</em>`
      : `<em>Level in progress · ${touch ? 'tap' : 'Space'} to read it</em>`;
    this.game.banner(`<b>${n.name}</b> · ${n.sub}${facts} · ${action}`);
  }

  // ─── input ─────────────────────────────────────────────────────

  update() {
    this.t++;
    for (const [e, k] of this.reveal) {
      const nk = k + (this.game.reduced ? 1 : 1 / 50);
      if (nk >= 1) this.reveal.delete(e); else this.reveal.set(e, nk);
    }
    if (this.attract) return;
    const input = this.game.input;

    if (this.walk) { this.advance(); return; }
    if (this.queue.length) { this.startStep(this.queue.shift()); return; }

    if (input.pressed.confirm) { this.enterNode(); return; }
    const dx = (input.pressed.right ? 1 : 0) - (input.pressed.left ? 1 : 0);
    const dy = (input.pressed.down ? 1 : 0) - (input.pressed.up ? 1 : 0);
    if (dx || dy) this.tryDirection(dx, dy);
  }

  tryDirection(dx, dy) {
    const m = Math.hypot(dx, dy);
    let best = null, bestDot = 0.45;
    for (const e of EDGES) {
      if (e.a !== this.node && e.b !== this.node) continue;
      const forward = e.a === this.node;
      const pts = forward ? e.pts : [...e.pts].reverse();
      const vx = pts[1][0] - pts[0][0], vy = pts[1][1] - pts[0][1];
      const dot = (vx * dx + vy * dy) / (Math.hypot(vx, vy) * m);
      if (dot > bestDot) { bestDot = dot; best = { edge: e, forward }; }
    }
    if (!best) return;
    if (!edgeOpen(best.edge, this.game.progress.cleared, this.game.progress.warped)) {
      this.game.audio.play('lock');
      this.game.banner(`<b>Locked</b> · clear ${lockReason(best.edge)} first · <em>or fast-travel from the résumé (R)</em>`);
      return;
    }
    this.startStep(best);
  }

  startStep(step) {
    const pts = step.forward ? step.edge.pts : [...step.edge.pts].reverse();
    const lens = [];
    for (let i = 1; i < pts.length; i++) lens.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.walk = { pts, lens, i: 0, d: 0, to: step.forward ? step.edge.b : step.edge.a };
    this.game.banner(null);
    this.game.audio.play('tick');
  }

  advance() {
    const w = this.walk;
    w.d += SPEED;
    while (w.i < w.lens.length && w.d >= w.lens[w.i]) { w.d -= w.lens[w.i]; w.i++; }
    if (w.i >= w.lens.length) {
      this.node = w.to;
      this.x = NODES[w.to].x; this.y = NODES[w.to].y;
      this.walk = null;
      this.game.progress.lastNode = this.node;
      if (!this.queue.length) this.banner();
      return;
    }
    const [x0, y0] = w.pts[w.i], [x1, y1] = w.pts[w.i + 1];
    const k = w.d / w.lens[w.i];
    this.x = x0 + (x1 - x0) * k;
    this.y = y0 + (y1 - y0) * k;
    if (Math.abs(x1 - x0) > 1) this.facing = x1 > x0 ? 1 : -1;
  }

  enterNode() {
    if (this.walk) return;
    if (this.isLevel(this.node)) this.game.enterLevel(this.node);
    else this.game.openResume(this.node);
  }

  // tap/click a node: walk there over open roads, or enter if already there
  pointer(gx, gy) {
    if (this.attract) return;
    const x = gx - this.ox;
    let hit = null;
    for (const [id, n] of Object.entries(NODES)) {
      if (Math.abs(n.x - x) < 16 && gy > n.y - 30 && gy < n.y + 14) hit = id;
    }
    if (!hit) return;
    if (hit === this.node && !this.walk) { this.enterNode(); return; }
    const steps = route(this.walk ? this.walk.to : this.node, hit, this.game.progress.cleared, this.game.progress.warped);
    if (!steps) {
      this.game.audio.play('lock');
      this.game.banner(`<b>${NODES[hit].name}</b> · locked · <em>fast-travel from the résumé (R)</em>`);
      return;
    }
    this.queue = steps;
  }

  // ─── render ────────────────────────────────────────────────────

  render(ctx) {
    const g = this.game, t = this.t, ox = this.ox;
    ctx.fillStyle = col('#1e5ba3');
    ctx.fillRect(0, 0, g.W, 216);
    ctx.drawImage(g.art.mapBase, ox, 0);

    // ocean glints, drifting
    if (!g.reduced) {
      for (let i = 0; i < 40; i++) {
        const x = ((i * 61 + (t >> 2) * (1 + (i % 2))) % 520) - 20 + ox;
        const y = 100 + ((i * 37) % 110);
        const cx = x - ox;
        if (cx < 0 || cx > 480 || y < HORIZON + 4 || islandDist(cx, y) < 1.2) continue;
        if ((i + (t >> 4)) % 3) { ctx.fillStyle = col('#7fc0f0'); ctx.fillRect(x, y, 3, 1); }
      }
    }

    const P = g.progress;
    const open = reachable(P.cleared, P.warped);
    for (const e of EDGES) {
      const isOpen = edgeOpen(e, P.cleared, P.warped);
      const rv = this.reveal.has(e) ? this.reveal.get(e) : 1;
      if (e.beam) drawBeam(ctx, e.pts, ox, isOpen && rv >= 1, t);
      else {
        drawPath(ctx, e.pts, ox, 'locked', t);
        if (isOpen) drawPath(ctx, e.pts, ox, 'open', t, rv);
      }
    }

    for (const [id, n] of Object.entries(NODES)) {
      const x = n.x + ox, y = n.y;
      const cleared = P.cleared.has(id);
      const reach = open.has(id);
      // node pad
      disc(ctx, x, y, 5, 'ink.0');
      if (cleared) { disc(ctx, x, y, 4, 'gold.2'); drawText(ctx, '✓', x, y - 4, '#0b0d17', { align: 'center', size: 7, weight: 700 }); }
      else if (reach) {
        disc(ctx, x, y, 4, this.isLevel(id) ? 'red.2' : 'slate.3');
        if (((t >> 4) & 1) && this.isLevel(id)) ring(ctx, x, y, 7, 'gold.3');
      } else { disc(ctx, x, y, 4, 'slate.1'); ctx.fillStyle = col('slate.3'); ctx.fillRect(x - 1, y - 2, 3, 4); }

      // label + fact pips
      const ly = n.y > 100 ? y + 8 : y + 14;
      const lw = Math.ceil(textWidth(n.name, 7)) + 8, lh = lineHeight(7) + 1;
      pill(ctx, Math.round(x - lw / 2), ly - 1, lw, lh, 'rgba(11,13,23,0.78)', null, 3);
      drawText(ctx, n.name, x, ly, reach ? '#f5f1e6' : '#9aa5c2', { align: 'center', size: 7 });
      const { found, total } = this.factCounts(id);
      for (let i = 0; i < total; i++) {
        ctx.fillStyle = col('ink.0'); ctx.fillRect(x - total * 2 + i * 4 - 1, ly + lh + 1, 4, 4);
        ctx.fillStyle = i < found ? col('gold.3') : col('slate.2');
        ctx.fillRect(x - total * 2 + i * 4, ly + lh + 2, 2, 2);
      }
    }

    // the hero
    const moving = !!this.walk;
    const A = g.art.hero;
    const fr = moving ? A.run[(t >> 3) & 3] : A.idle[(t >> 5) & 1];
    drawFrame(ctx, fr, Math.round(this.x + ox - 5), Math.round(this.y - 20), this.facing < 0, 10);

    if (!this.attract && !moving) {
      const bob = (t >> 4) & 1;
      drawText(ctx, '▼', this.x + ox, this.y - 37 - bob, '#ffd166', { align: 'center', shadow: '#0b0d17', size: 9 });
    }
  }
}
