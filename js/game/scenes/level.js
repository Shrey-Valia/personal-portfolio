// A level: one or more rooms joined by ports. Handles the hero, objects,
// enemies, set pieces, checkpoints, death and respawn, and the goal.

import { TILE, H, FLAGS } from '../../config.js';
import { TileMap, SOLID } from '../../engine/tilemap.js';
import { createCamera } from '../../engine/camera.js';
import { overlaps, rng } from '../../engine/util.js';
import { KITS } from '../../art/tiles.js';
import { getBackground } from '../../art/backgrounds.js';
import { col } from '../../art/palette.js';
import { drawText } from '../../art/font.js';
import { Hero } from '../hero.js';
import { TUNING } from '../tuning.js';
import { InfoBlock, Bit, Checkpoint, Goal, Sign, Duck, Port, Floater, FactToken } from '../objects.js';
import { Walker, Hopper } from '../enemies.js';
import { SETPIECES } from '../setpieces.js';
import { levelFacts } from '../levels/index.js';

const TERRAIN_CHARS = new Set(['#', '=', '^', '<', '>', '.']);

export class LevelScene {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    this.camera = createCamera();
    this.hero = new Hero(game.art.hero);
    this.roomStates = {};
    this.timers = [];
    this.t = 0;
    this.freeze = 0;
    this.stats = { bits: 0, bugs: 0, start: performance.now() };
    this.factIds = levelFacts(def);
    this.factsAtStart = this.factIds.filter((id) => game.progress.hasFact(id)).length;
    this.deathsHere = 0;
    this.lastSafe = null;
    this.intro = 150;
  }

  get W() { return this.game.W; }
  get camX() { return this.camera.x; }

  enter(opts = {}) {
    const roomId = opts.room || this.def.start;
    this.loadRoom(roomId, null);
    this.checkpoint = { room: roomId, x: this.hero.x, y: this.hero.y };
    this.game.audio.music(this.def.music);
    this.game.ui.hud.setNode(this.def.title);
  }

  // ─── building a room ───────────────────────────────────────────

  loadRoom(roomId, portIndex) {
    const def = this.def;
    const R = def.rooms[roomId];
    this.roomId = roomId;
    this.room = R;
    this.state = this.roomStates[roomId] || (this.roomStates[roomId] = { used: new Set(), built: new Set(), bits: new Set() });

    const map = new TileMap(R.map, KITS[R.kit || def.kit]);
    this.map = map;
    this.platforms = [];
    this.objects = [];
    this.enemies = [];
    this.setpieces = [];
    this.ports = [];
    this.blocks = new Map();
    this.floaters = [];
    this.nearSignObj = null;
    this.spawnAt = { x: 3 * TILE, y: 10 * TILE - 4 };
    this.bg = getBackground(R.theme || def.theme, this.W);
    this.camera.mode = R.camera || 'follow';
    this.camera.shakeOn = !this.game.reduced;

    const n = { F: 0, S: 0, N: 0, P: 0 };
    const facts = R.facts || {};
    const hashes = rng(def.id.length * 977 + roomId.length);
    for (let x = 0; x < map.cols; x++) {
      for (let y = 0; y < map.rows; y++) {
        const ch = map.chars[y][x];
        if (TERRAIN_CHARS.has(ch)) continue;
        map.chars[y][x] = '.';
        const key = x + ',' + y;
        switch (ch) {
          case '@': this.spawnAt = { x: x * TILE + 3, y: (y + 1) * TILE - 20 }; break;
          case 'F': this.addBlock(new InfoBlock(x, y, facts.F[n.F++])); break;
          case 'K': this.addBlock(new InfoBlock(x, y, null, 'coffee')); break;
          case 'c':
            if (!this.state.bits.has(key)) { const b = new Bit(x * TILE, y * TILE); b.key = key; this.objects.push(b); }
            break;
          case 'C': this.objects.push(new Checkpoint(x, y, hex7(hashes))); break;
          case 'G': this.objects.push(new Goal(x, y, def.goal || 'DONE')); break;
          case 'S': this.objects.push(new Sign(x, y, facts.S[n.S++], true)); break;
          case 'N': this.objects.push(new Duck(x, y, R.duck[n.N++])); break;
          case 'P': {
            let depth = 1;
            while (y + depth < map.rows && map.chars[y + depth][x] !== '#') depth++;
            const port = new Port(x, y, depth, R.ports[n.P++], R.band);
            for (let dy = 0; dy < depth; dy++) { map.setFlag(x, y + dy, SOLID); map.setFlag(x + 1, y + dy, SOLID); }
            this.ports.push(port);
            break;
          }
          case 'e': this.enemies.push(new Walker(x, y, R.skin || def.skin || 'lab')); break;
          case 'h': this.enemies.push(new Hopper(x, y)); break;
          default: {
            const spec = R.marks && R.marks[ch];
            if (spec) {
              const Ctor = SETPIECES[spec.type];
              if (!Ctor) throw new Error('Unknown set piece ' + spec.type);
              this.setpieces.push(new Ctor(x, y, spec, this, roomId + ':' + key));
            } else if (FLAGS.debug) {
              console.warn('Unknown map char', ch, 'at', x, y, 'in', def.id + ':' + roomId);
            }
          }
        }
      }
    }
    map.prerender();
    for (const b of this.blocks.values()) b.init(this);

    const hero = this.hero;
    const coffee = hero.coffee;
    if (portIndex !== null && portIndex !== undefined && this.ports[portIndex]) {
      const p = this.ports[portIndex];
      hero.place(p.x + 11, p.y + 4);
      hero.setState('portOut');
      this.game.audio.play('portOut');
    } else {
      hero.place(this.spawnAt.x, this.spawnAt.y);
    }
    hero.coffee = coffee;
    this.camera.snap(hero, map, this.W, H);
    this.game.particles.clear();
  }

  addBlock(b) {
    this.blocks.set(b.tx + ',' + b.ty, b);
    this.map.setFlag(b.tx, b.ty, SOLID);
  }

  spawn(obj) { this.objects.push(obj); }

  // ─── per-step update ───────────────────────────────────────────

  update() {
    this.t++;
    if (this.intro > 0) this.intro--;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      if (--tm.n <= 0) { this.timers.splice(i, 1); tm.fn(); }
    }
    if (this.freeze > 0) { this.freeze--; return; }

    const hero = this.hero;
    for (const sp of this.setpieces) if (sp.update) sp.update(this);
    for (const p of this.platforms) if (p.prevX === undefined) { p.prevX = p.x; p.prevY = p.y; }
    for (const b of this.blocks.values()) b.update();

    if (this.nearSignObj) this.nearSignObj.near = false;
    this.nearSignObj = null;

    hero.update(this, this.game.input);
    if (hero.state === 'normal') this.collide();

    for (const o of this.objects) if (o.update) o.update(this);
    for (const e of this.enemies) if (e.alive) e.update(this);
    this.objects = this.objects.filter((o) => o.alive !== false);
    for (const f of this.floaters) f.update();
    this.floaters = this.floaters.filter((f) => f.alive);
    this.game.particles.update();

    if (hero.state !== 'dead') this.camera.update(hero, this.map, this.W, H);
    else { this.camera.prevX = this.camera.x; this.camera.prevY = this.camera.y; }   // hold still while the hero falls away

    // ambient sparkle while caffeinated
    if (hero.coffee && hero.state === 'normal' && (this.t % 40) === 0) {
      this.game.particles.one(hero.x + 2 + Math.random() * 6, hero.y + 4, 0, -0.3, col('white.1'), 22, 0, 1);
    }
  }

  collide() {
    const h = this.hero;
    for (const o of this.objects) {
      if (o.alive !== false && o.touch && overlaps(h, o)) o.touch(h, this);
    }
    for (const e of this.enemies) {
      if (!e.stompable() || !overlaps(h, e)) continue;
      const prevBottom = h.prevY + h.h;
      if (h.vy > 0 && prevBottom <= e.prevY + 6) {
        e.stomp(this);
        h.vy = this.game.input.held.jump ? TUNING.stompHeld : TUNING.stomp;
        h.jumped = true;
        h.y = e.y - h.h;
        this.freeze = 3;
        this.camera.shake(0.25);
      } else if (h.iframes === 0) {
        this.hurtHero(e.x + e.w / 2);
      }
    }
  }

  after(n, fn) { this.timers.push({ n, fn }); }

  // ─── interactions ──────────────────────────────────────────────

  sfx(name) { this.game.audio.play(name); }

  dust(x, y, n) {
    this.game.particles.burst(x, y - 1, n, [col('white.1'), col('white.0')], { speed: 0.9, up: 0.4, life: 14, grav: 0.02 });
  }

  onHeadHit(tx, ty) {
    const b = this.blocks.get(tx + ',' + ty);
    if (b) { b.hit(this); return; }
    this.sfx('bump');
  }

  bumpAbove(block) {
    for (const e of this.enemies) {
      if (!e.stompable()) continue;
      if (Math.abs(e.y + e.h - block.y) < 3 && e.x + e.w > block.x && e.x < block.x + TILE) e.knock(this);
    }
    for (const o of this.objects) {
      if (o instanceof Bit && Math.abs(o.y + o.h - block.y) < 10 && o.x + o.w > block.x && o.x < block.x + TILE) {
        o.alive = false; this.collectBit(o);
      }
    }
  }

  // a fact discovered in-game: token, sound, and its card
  discover(id, x, y, { immediate = false } = {}) {
    const g = this.game;
    const isNew = g.progress.addFact(id);
    if (isNew) {
      for (const sp of this.setpieces) if (sp.onFact) sp.onFact(id, this);
      g.factFound(id);
      if (x !== undefined && x !== null) {
        this.sfx('fact');
        this.objects.push(new FactToken(x, y));
        this.floaters.push(new Floater(x, y - 18, '+1 fact', '#6fd6c8', 44));
        this.freeze = 4;
        this.camera.shake(0.15);
        g.particles.burst(x, y, 10, [col('teal.3'), col('gold.3'), col('white.2')], { speed: 1.6, up: 1.2, life: 26 });
      }
      if (immediate) g.openCard(id);
      else this.after(24, () => g.openCard(id));
    } else if (!immediate) {
      const f = g.content.get(id);
      g.toast('Already logged: <b>' + (f ? f.title : id) + '</b>');
    } else {
      g.openCard(id);
    }
    return isNew;
  }

  nearSign(sign) {
    this.nearSignObj = sign;
    sign.near = true;
    if (sign.auto && !this.game.progress.hasFact(sign.fact)) this.discover(sign.fact, null, null, { immediate: true });
  }

  tryInteract() {
    if (this.nearSignObj) { this.discover(this.nearSignObj.fact, null, null, { immediate: true }); return true; }
    return false;
  }

  tryPort(hero) {
    for (const p of this.ports) {
      if (!p.standingOn(hero)) continue;
      hero.setState('portIn');
      hero.x = p.x + 11;
      hero.vx = 0;
      this.portFrom = p;
      this.sfx('portIn');
      return true;
    }
    return false;
  }

  portArrive() {
    const link = this.portFrom.link;
    this.hero.setState('frozen');
    if (link.to === '@map') { this.complete(); return; }
    this.game.transition(() => {
      this.loadRoom(link.to, link.exit);
      const p = this.ports[link.exit];
      this.checkpoint = { room: link.to, x: p.x + 11, y: p.y - 20 };      // every room exit counts as a checkpoint
    });
  }

  collectBit(bit) {
    if (bit.key) this.state.bits.add(bit.key);
    this.stats.bits++;
    const life = this.game.progress.addBits(1);
    this.sfx(life ? 'oneup' : 'bit');
    this.game.particles.burst(bit.x + 4, bit.y + 4, 5, [col('gold.3'), col('gold.2')], { speed: 1, up: 0.6, life: 14, grav: 0.05 });
    if (life) this.floaters.push(new Floater(bit.x + 4, bit.y - 6, '1-up!', '#90eaa8', 60));
    this.game.ui.hud.refresh(true);
  }

  drinkCoffee(x, y) {
    const h = this.hero;
    if (h.coffee) {
      this.game.progress.addBits(5);
      this.floaters.push(new Floater(x, y - 6, '+5 bits', '#ffd166'));
    } else {
      h.coffee = true;
      this.floaters.push(new Floater(x, y - 6, 'Caffeinated', '#e3e6ee'));
    }
    this.sfx('coffee');
    this.game.ui.hud.refresh(true);
  }

  bugFixed(x, y) {
    this.stats.bugs++;
    this.game.progress.stat('bugs');
    this.sfx('stomp');
    this.floaters.push(new Floater(x, y - 6, 'Bug fixed', '#90eaa8', 46));
    this.game.particles.burst(x, y + 4, 8, [col('magenta.3'), col('teal.3'), col('white.2')], { speed: 1.4, up: 1, life: 20 });
  }

  checkpointReached(cp) {
    this.checkpoint = { room: this.roomId, x: cp.x, y: cp.y + cp.h - 20 };
    this.deathsHere = 0;
    this.hero.coffee = true;
    this.sfx('checkpoint');
    this.floaters.push(new Floater(cp.x + 6, cp.y - 8, 'Committed ' + cp.hash, '#90eaa8', 80));
    this.game.ui.hud.refresh();
  }

  markSafe(hero) {
    if ((this.t & 15) === 0) this.lastSafe = { room: this.roomId, x: hero.x, y: hero.y };
  }

  // ─── damage, death, respawn ────────────────────────────────────

  invincible() { return FLAGS.god || this.game.progress.settings.assist || this.def.safe || this.room.safe; }

  hurtHero(fromX) {
    const h = this.hero;
    if (h.state !== 'normal' || h.iframes > 0 || this.invincible()) return;
    if (h.coffee) {
      h.coffee = false;
      h.hurt(fromX);
      this.sfx('hurt');
      this.camera.shake(0.4);
      this.floaters.push(new Floater(h.x + 5, h.y - 6, 'Shield gone', '#ff8f7f', 40));
      this.game.ui.hud.refresh();
    } else {
      this.killHero('hit');
    }
  }

  killHero(kind) {
    const h = this.hero;
    if (h.state === 'dead') return;
    if (kind === 'pit' && this.invincible() && this.lastSafe) {
      // assist: no life lost, back to the last safe ground
      h.place(this.lastSafe.x, this.lastSafe.y);
      h.iframes = 60;
      this.camera.snap(h, this.map, this.W, H);
      return;
    }
    h.die(kind);
    this.sfx('die');
    this.camera.shake(kind === 'pit' ? 0 : 0.5);
    this.game.progress.stat('deaths');
    this.deathsHere++;
    this.after(kind === 'pit' ? 60 : 110, () => this.afterDeath());
  }

  afterDeath() {
    const g = this.game;
    g.progress.lives--;
    g.ui.hud.refresh();
    if (g.progress.lives <= 0) { g.gameOver(this.def.node); return; }
    if (this.deathsHere === 3 && !g.progress.settings.assist) {
      g.toast('Stuck? Pause (P) and turn on <b>Assist mode</b>: no damage, no penalty.', 6000);
    }
    g.transition(() => this.respawn(), 'Reverting to last commit…');
  }

  respawn() {
    const cp = this.checkpoint;
    if (cp.room !== this.roomId) this.loadRoom(cp.room, null);
    for (const e of this.enemies) e.reset();
    const h = this.hero;
    h.place(cp.x, cp.y);
    h.coffee = true;
    h.iframes = 60;
    this.camera.snap(h, this.map, this.W, H);
    this.game.ui.hud.refresh();
  }

  reachGoal(goal) {
    const h = this.hero;
    h.setState('victory');
    h.vx *= 0.3;
    this.sfx('clear');
    this.game.audio.music(null);
    this.camera.shake(0.3);
    const P = this.game.particles;
    for (let i = 0; i < 4; i++) {
      this.after(i * 8, () => P.burst(goal.x + 16, goal.y, 18, [col('gold.3'), col('teal.3'), col('magenta.3'), col('green.3'), col('white.2')], { speed: 2.6, up: 2.4, life: 60, grav: 0.08 }));
    }
    this.after(120, () => this.complete());
  }

  complete() {
    const g = this.game;
    g.progress.clear(this.def.node);
    const found = this.factIds.filter((id) => g.progress.hasFact(id)).length;
    g.levelClear({
      node: this.def.node,
      title: this.def.title,
      facts: found, factsTotal: this.factIds.length,
      bits: this.stats.bits, bugs: this.stats.bugs,
      time: Math.round((performance.now() - this.stats.start) / 1000),
      quiet: !this.def.goal,
    });
  }

  // ─── render ────────────────────────────────────────────────────

  render(ctx, alpha) {
    const cam = this.camera.view(alpha);
    const W = this.W, t = this.t, A = this.game.art;
    this.bg.draw(ctx, cam.x, cam.y, t, this.game.reduced);

    if (this.room.ambient === 'beads' && !this.game.reduced) {
      for (let i = 0; i < 14; i++) {
        const x = ((i * 97 + t * (0.2 + (i % 3) * 0.1)) % (W + 40)) - 20;
        const y = 40 + ((i * 53) % 110) + Math.sin(t / 40 + i) * 6;
        ctx.fillStyle = col(i % 2 ? 'magenta.2' : 'teal.2');
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
    }

    for (const sp of this.setpieces) if (sp.back) sp.back(ctx, cam, t);
    this.map.draw(ctx, cam.x, cam.y, W, H, t);

    if (this.room.hints) {
      const touch = document.documentElement.classList.contains('touch-on');
      for (const hint of this.room.hints) {
        drawText(ctx, touch ? hint.touch : hint.keys, hint.tx * TILE - cam.x, hint.ty * TILE - cam.y, '#ffd166', { align: 'center', shadow: '#0b0d17', size: 8 });
      }
    }

    for (const sp of this.setpieces) if (sp.draw) sp.draw(ctx, cam, t);
    for (const b of this.blocks.values()) {
      if (b.x - cam.x > -TILE && b.x - cam.x < W) b.draw(ctx, cam, t, A);
    }
    for (const o of this.objects) if (o.draw && !(o instanceof Duck)) o.draw(ctx, cam, t, A, this);
    for (const e of this.enemies) if (e.alive) e.draw(ctx, cam, t, A, this, alpha);
    this.hero.draw(ctx, cam, alpha);
    for (const p of this.ports) p.draw(ctx, cam, t, A, this);
    for (const o of this.objects) if (o instanceof Duck) o.draw(ctx, cam, t, A, this);
    for (const f of this.floaters) f.draw(ctx, cam);
    this.game.particles.draw(ctx, cam.x, cam.y);

    // the level title card, SNES style
    if (this.intro > 0 && this.roomId === this.def.start) {
      const k = this.intro;
      if (k < 20 && (k & 2)) return;
      const y = 60;
      ctx.fillStyle = 'rgba(5,6,12,0.72)';
      ctx.fillRect(0, y - 10, W, 50);
      drawText(ctx, this.def.title, W / 2, y - 2, '#ffd166', { align: 'center', shadow: '#0b0d17', size: 18, weight: 700 });
      drawText(ctx, this.def.sub, W / 2, y + 22, '#6fd6c8', { align: 'center', size: 8 });
    }
  }
}

function hex7(r) {
  let s = '';
  for (let i = 0; i < 7; i++) s += '0123456789abcdef'[Math.floor(r() * 16)];
  return s;
}
