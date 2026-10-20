// Shrey, the player character: controller, states and animation.

import { TUNING as T } from './tuning.js';
import { moveBody, carryBody, touchesFlag, groundFlags } from '../engine/physics.js';
import { HAZARD, CONVEY_L, CONVEY_R, ONEWAY } from '../engine/tilemap.js';
import { approach, lerp } from '../engine/util.js';
import { drawFrame } from '../art/sprite.js';

export class Hero {
  constructor(frames) {
    this.A = frames;
    this.w = 10;
    this.h = 20;
    this.coffee = true;
    this.place(0, 0);
  }

  place(x, y) {
    this.x = this.prevX = x;
    this.y = this.prevY = y;
    this.vx = this.vy = 0;
    this.facing = 1;
    this.grounded = false;
    this.ground = null;
    this.state = 'normal';
    this.stateT = 0;
    this.coyote = this.buffer = 0;
    this.jumped = false;
    this.lock = 0;
    this.dropping = false;
    this.dropTimer = 0;
    this.squash = 0;
    this.runFrame = 0;
    this.animT = 0;
    this.idleT = 0;
    this.skidding = false;
    this.crouching = false;
    this.iframes = 0;
  }

  setState(s) { this.state = s; this.stateT = 0; }

  update(level, input) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.stateT++;
    if (this.iframes > 0) this.iframes--;
    if (this.squash > 0) this.squash--;

    switch (this.state) {
      case 'normal': this.control(level, input); break;
      case 'victory': this.coast(level); break;
      case 'dead':
        if (this.stateT > 30 && this.deathKind !== 'pit') {
          this.vy = Math.min(this.vy + 0.25, 5);
          this.y += this.vy;
        }
        break;
      case 'portIn':
        this.y += 0.75;
        if (this.stateT >= 32) level.portArrive();
        break;
      case 'portOut':
        this.y -= 0.75;
        if (this.stateT >= 32) { this.setState('normal'); this.vy = 0; }
        break;
      default: break;                                   // frozen in a cutscene
    }
    this.animate();
  }

  control(level, input) {
    const map = level.map;
    let dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
    if (this.lock > 0) { this.lock--; dir = 0; }
    const running = input.held.run || level.game.autoRun;
    const max = running ? T.run : T.walk;

    this.skidding = false;
    if (this.grounded) {
      if (dir) {
        if (this.vx * dir < 0) {
          this.vx = approach(this.vx, 0, T.skid);
          this.skidding = Math.abs(this.vx) > 0.5;
          if (this.skidding && (this.stateT & 3) === 0) level.dust(this.x + this.w / 2, this.y + this.h, 1);
        } else if (Math.abs(this.vx) > max) {
          this.vx = approach(this.vx, dir * max, T.decel);
        } else {
          this.vx = approach(this.vx, dir * max, running ? T.accRun : T.accWalk);
        }
        this.facing = dir;
      } else {
        this.vx = approach(this.vx, 0, T.decel);
      }
    } else if (dir) {
      if (Math.abs(this.vx) <= max || this.vx * dir < 0) this.vx = approach(this.vx, dir * max, T.airAcc);
      this.facing = dir;
    } else {
      this.vx = approach(this.vx, 0, T.airDecel);
    }

    this.crouching = this.grounded && input.held.down && Math.abs(this.vx) < 0.5;

    if (this.grounded && input.pressed.down && level.tryPort(this)) return;
    if (input.pressed.interact) level.tryInteract(this);

    this.coyote = this.grounded ? T.coyote : this.coyote - 1;
    this.buffer = input.pressed.jump ? T.buffer : this.buffer - 1;
    if (this.dropTimer > 0 && --this.dropTimer === 0) this.dropping = false;

    const onOneWay = this.grounded &&
      ((groundFlags(this, map) & ONEWAY) || (this.ground && this.ground.oneway !== false));
    if (this.buffer > 0 && this.grounded && input.held.down && onOneWay) {
      this.dropping = true; this.dropTimer = 12;               // down + jump: drop through
      this.buffer = 0; this.y += 1; this.grounded = false; this.ground = null;
    } else if (this.buffer > 0 && this.coyote > 0) {
      this.vy = -(T.jump + (running ? T.jumpRunBonus * Math.abs(this.vx) : 0));
      this.buffer = 0; this.coyote = 0; this.jumped = true;
      this.grounded = false; this.ground = null;
      level.sfx('jump');
      level.dust(this.x + this.w / 2, this.y + this.h, 3);
    }

    const held = input.held.jump;
    if (this.jumped && !held && this.vy < T.jumpCut) this.vy = T.jumpCut;
    let g = held && this.vy < 0 ? T.gHeld : T.gFall;
    if (this.jumped && held && Math.abs(this.vy) < 1) g *= T.apexHang;
    this.vy = Math.min(this.vy + g, T.maxFall);

    this.physics(level);
  }

  // movement shared by control and coasting (victory)
  physics(level) {
    const map = level.map;
    if (this.ground) {                                      // ride moving platforms, but never into walls
      const p = this.ground;
      if (carryBody(this, map, p.x - p.prevX, p.y - p.prevY)) {
        // squeezed against a ceiling: let the platform pass up through us
        this.ground = null; this.grounded = false;
        this.dropping = true; this.dropTimer = 10;
      }
    }
    let push = 0;
    if (this.grounded) {
      const gf = groundFlags(this, map);
      if (gf & CONVEY_R) push = T.conveyor; else if (gf & CONVEY_L) push = -T.conveyor;
    }
    const fall = this.vy;
    this.vx += push;
    const res = moveBody(this, map, level.platforms, { corner: T.corner });
    if (!res.wall) this.vx -= push;
    if (res.headHit) level.onHeadHit(res.headHit.tx, res.headHit.ty, this);
    if (res.landed) {
      this.jumped = false;
      if (fall > 3.4) { this.squash = 6; level.dust(this.x + this.w / 2, this.y + this.h, 4); }
    }
    if (this.state === 'normal') {
      if (touchesFlag(this, map, HAZARD, 3)) level.hurtHero(null);
      if (this.y > map.h + 24) level.killHero('pit');
      if (this.grounded && !this.ground) level.markSafe(this);
    }
  }

  coast(level) {
    this.vx = approach(this.vx, 0, T.decel);
    this.vy = Math.min(this.vy + T.gFall, T.maxFall);
    this.physics(level);
  }

  hurt(fromX) {
    this.iframes = T.iframes;
    this.lock = T.hurtLock;
    const dir = fromX === undefined ? -this.facing : (this.x + this.w / 2 < fromX ? -1 : 1);
    this.vx = dir * T.knockX;
    this.vy = T.knockY;
    this.grounded = false;
    this.ground = null;
  }

  die(kind) {
    this.setState('dead');
    this.deathKind = kind;
    this.vx = 0;
    this.vy = kind === 'pit' ? 0 : -5;
  }

  animate() {
    if (this.state !== 'normal') return;
    if (this.grounded && Math.abs(this.vx) > 0.15) {
      this.animT += Math.abs(this.vx);
      if (this.animT > 7) { this.animT -= 7; this.runFrame = (this.runFrame + 1) % 4; }
      this.idleT = 0;
    } else {
      this.idleT++;
    }
  }

  frame() {
    const A = this.A;
    if (this.state === 'dead') return A.hurt[0];
    if (this.state === 'portIn' || this.state === 'portOut') return A.crouch[0];
    if (this.state === 'victory') return this.grounded ? A.victory[0] : A.jump[0];
    if (this.iframes > T.iframes - 14) return A.hurt[0];
    if (!this.grounded) return this.vy < -0.5 ? A.jump[0] : A.fall[0];
    if (this.squash > 0 || this.crouching) return A.crouch[0];
    if (this.skidding) return A.skid[0];
    if (Math.abs(this.vx) > 0.15) return A.run[this.runFrame];
    const t = this.idleT % 200;
    if (t > 186 && t < 194) return A.blink[0];
    return A.idle[Math.floor(this.idleT / 32) % 2];
  }

  draw(ctx, cam, alpha) {
    if (this.state === 'normal' && this.iframes > 0 && (this.iframes >> 2) & 1) return;
    const x = lerp(this.prevX, this.x, alpha) - cam.x;
    const y = lerp(this.prevY, this.y, alpha) - cam.y;
    drawFrame(ctx, this.frame(), x, y, this.facing < 0, this.w);
  }
}
