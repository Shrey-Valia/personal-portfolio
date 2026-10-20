// The game: owns scenes, pause reasons, transitions and the glue between
// the canvas and the DOM (HUD, cards, résumé, menus).

import { H, FLAGS } from '../config.js';
import { createLoop } from '../engine/loop.js';
import { drawText } from '../art/font.js';
import { OverworldScene } from './scenes/overworld.js';
import { LevelScene } from './scenes/level.js';
import { LEVELS } from './levels/index.js';
import { NODES } from './map.js';

export class Game {
  constructor(env) {
    Object.assign(this, env);       // display, input, audio, progress, content, art, particles, reduced
    this.paused = new Set();
    this.trans = null;
    this.autoRun = false;
    this.scene = null;
    this.fps = { n: 0, t: performance.now(), v: 0 };
    this.queued = [];
    this.loop = createLoop(() => this.update(), (a) => this.render(a), (err) => this.crash(err));
    // pointer cursor over clickable map nodes
    this.display.canvas.addEventListener('pointermove', (e) => {
      const s = this.scene;
      const p = this.display.toGame(e.clientX, e.clientY);
      this.display.canvas.style.cursor = s && s.hover && s.hover(p.x, p.y) ? 'pointer' : '';
    });
  }

  // a runtime error must never strand a visitor on a dead canvas:
  // put the plain résumé back, exactly like a failed boot
  crash(err) {
    console.error('[portfolio] the game stopped; showing the résumé instead.', err);
    const resume = document.getElementById('resume');
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
    if (resume && resume.parentElement !== document.body) document.body.appendChild(resume);
    document.documentElement.classList.remove('js', 'game-ready');
  }

  get W() { return this.display.W; }

  start() {
    this.scene = new OverworldScene(this, { attract: true });
    this.scene.enter({ node: this.progress.lastNode });
    this.loop.start();
    if (FLAGS.level && LEVELS[FLAGS.level]) {
      this.ui.title(false);
      this.progress.started = true;
      this.enterLevel(FLAGS.level, true);
    }
  }

  // ─── simulation ────────────────────────────────────────────────

  update() {
    if (this.paused.size) return;
    this.input.beginStep();
    this.autoRun = document.documentElement.classList.contains('touch-on');   // one thumb can't hold run + jump
    if (this.trans) {
      const tr = this.trans;
      tr.t++;
      if (tr.t === tr.dur) { tr.mid(); tr.mid = null; }
      if (tr.t >= tr.dur * 2 + (tr.hold || 0)) {
        this.trans = null;
        if (this.queued.length) { const [m, text] = this.queued.shift(); this.transition(m, text); }
      }
      if (tr.t < tr.dur * 2) return;
    }
    if (this.scene) this.scene.update();
  }

  render(alpha) {
    const ctx = this.display.ctx;
    const rs = this.display.rs || 1;
    ctx.setTransform(rs, 0, 0, rs, 0, 0);          // world drawn in game pixels
    ctx.W = this.W;                                 // game width, for code that lays out against the screen
    ctx.imageSmoothingEnabled = false;
    if (this.scene) this.scene.render(ctx, this.paused.size ? 1 : alpha);
    if (this.trans) {
      const tr = this.trans;
      const k = tr.t < tr.dur ? tr.t / tr.dur : Math.max(0, (tr.dur * 2 - tr.t) / tr.dur);
      ctx.fillStyle = `rgba(5, 6, 12, ${Math.min(1, k).toFixed(3)})`;
      ctx.fillRect(0, 0, this.W, H);
      if (tr.text && k > 0.75) drawText(ctx, tr.text, this.W / 2, H / 2 - 6, '#ffd166', { align: 'center', size: 10 });
    }
    if (FLAGS.debug) {
      const f = this.fps; f.n++;
      const now = performance.now();
      if (now - f.t > 500) { f.v = Math.round((f.n * 1000) / (now - f.t)); f.n = 0; f.t = now; }
      drawText(ctx, f.v + ' fps', 4, H - 11, '#90eaa8', { shadow: '#0b0d17', size: 6 });
    }
  }

  pause(reason) { this.paused.add(reason); }
  resume(reason) { this.paused.delete(reason); }

  // a request during a fade-out joins it; one during the fade-in waits its turn
  transition(mid, text) {
    if (this.trans) {
      if (this.trans.mid) { const prev = this.trans.mid; this.trans.mid = () => { prev(); mid(); }; }
      else this.queued.push([mid, text]);
      return;
    }
    this.trans = { t: 0, dur: this.reduced ? 10 : 16, mid, text, hold: text ? 30 : 0 };
  }

  focusStage() { document.getElementById('stage').focus({ preventScroll: true }); }

  // ─── scene flow ────────────────────────────────────────────────

  play() {
    this.ui.title(false);
    this.audio.unlock();
    if (!this.progress.started) {
      this.progress.started = true;
      this.enterLevel('home');
    } else {
      this.goMap(this.progress.lastNode);
    }
  }

  enterLevel(node, instant) {
    const def = LEVELS[node];
    if (!def) { this.openResume(node); return; }
    this.progress.lastNode = node;
    const go = () => {
      this.scene = new LevelScene(this, def);
      this.scene.enter();
      this.ui.hud.show(true);
      this.ui.hud.refresh();
      this.ui.touchLive(true);
      this.banner(null);
      this.ui.hud.announce('Entered ' + def.title);
    };
    if (instant) go(); else this.transition(go);
  }

  goMap(node, justCleared = null) {
    this.transition(() => {
      this.progress.lives = Math.max(this.progress.lives, 1);
      this.scene = new OverworldScene(this);
      this.scene.enter({ node: node || this.progress.lastNode, justCleared });
      this.ui.hud.show(true);
      this.ui.hud.refresh();
      this.ui.touchLive(false);
    });
  }

  leaveToMap() {
    const node = this.scene && this.scene.def ? this.scene.def.node : this.progress.lastNode;
    this.goMap(node);
  }

  levelClear(summary) {
    if (summary.quiet) { this.goMap(summary.node, summary.node); return; }
    this.ui.dialogs.openTally(summary, () => this.goMap(summary.node, summary.node));
  }

  gameOver(node) {
    this.progress.gameOver(node);
    this.audio.music(null);
    this.ui.dialogs.openGameOver(() => {
      this.progress.lives = 5;
      this.goMap(node);
    });
  }

  skipLevel() {
    const def = this.scene && this.scene.def;
    if (!def) return;
    this.progress.clear(def.node);
    this.toast(`Skipped <b>${def.title}</b>. Its facts are in the résumé (R).`, 4000);
    this.goMap(def.node, def.node);
  }

  // fast travel from the résumé: opens the node and enters its level
  warp(node) {
    this.ui.resume.close();
    this.ui.dialogs.closeAll();
    this.ui.title(false);
    this.progress.started = true;
    this.progress.warp(node);
    if (LEVELS[node]) this.enterLevel(node);
    else this.goMap(node);
  }

  resetProgress() {
    this.progress.reset();
    this.content.clearFound();
    this.ui.hud.refresh();
    this.scene = new OverworldScene(this, { attract: true });
    this.scene.enter({ node: 'home' });
    this.ui.hud.show(false);
    this.ui.touchLive(false);
    this.ui.title(true);
  }

  // ─── facts, cards, résumé ──────────────────────────────────────

  factFound(id) {
    this.content.markFound([id]);
    this.ui.hud.refresh(true);
    const f = this.content.get(id);
    this.ui.hud.announce('Fact found: ' + (f ? f.title : id));
  }

  openCard(id) { this.ui.dialogs.openCard(id); }

  openResume(node) {
    if (this.ui.resume.isOpen) { this.ui.resume.close(); return; }
    this.ui.dialogs.closeAll();
    this.ui.resume.open(node || (this.scene && this.scene.def && this.scene.def.node));
  }

  openPause(focus) {
    if (!(this.scene instanceof LevelScene)) return false;
    if (focus === 'map') { this.leaveToMap(); return true; }      // the Map button means the map
    this.ui.dialogs.openPause(focus);
    return true;
  }

  toggleMute() {
    const m = !this.audio.muted;
    this.audio.setMuted(m);
    this.progress.setting('muted', m);
    this.ui.hud.setMute(m);
    if (!m && this.scene) this.audio.music(this.scene instanceof LevelScene ? this.scene.def.music : (this.scene.attract ? null : 'map'));
  }

  banner(html, ms) { this.ui.hud.banner(html, ms); }
  toast(html, ms) { this.ui.hud.toast(html, ms); }

  nodeName(node) { return NODES[node] ? NODES[node].name : node; }
}
