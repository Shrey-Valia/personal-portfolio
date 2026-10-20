// Side-scroller camera: horizontal dead zone with lookahead, SMW-style
// vertical snap (re-targets when the hero lands at a new height or nears
// an edge), clamped to room bounds, with trauma-based shake.

import { clamp, lerp } from './util.js';

export function createCamera() {
  const cam = {
    x: 0, y: 0, prevX: 0, prevY: 0,
    look: 0, targetY: 0, trauma: 0, shakeX: 0, shakeY: 0,
    mode: 'follow',                    // 'follow' | 'vertical' | 'fixed'
    shakeOn: true,
  };

  cam.snap = function (hero, room, W, H) {
    cam.look = 0;
    cam.x = clamp(hero.x + hero.w / 2 - W * 0.45, 0, Math.max(0, room.w - W));
    cam.targetY = cam.y = clamp(hero.y + hero.h - H * 0.74, 0, Math.max(0, room.h - H));
    if (cam.mode === 'fixed') cam.update(hero, room, W, H);
    cam.prevX = cam.x; cam.prevY = cam.y;
  };

  cam.update = function (hero, room, W, H) {
    cam.prevX = cam.x; cam.prevY = cam.y;
    if (cam.mode === 'fixed') {
      // one-screen rooms: centre the room, follow only if it's wider than the view
      if (room.w <= W) cam.x = Math.round((room.w - W) / 2);
      else {
        // centred on the room; nudged only to keep the hero 40 px from an edge
        let x = (room.w - W) / 2;
        if (hero.x - x < 40) x = hero.x - 40;
        if (hero.x + hero.w - x > W - 40) x = hero.x + hero.w - W + 40;
        cam.x = Math.round(clamp(x, 0, room.w - W));
      }
      cam.y = room.h <= H ? Math.round((room.h - H) / 2) : room.h - H;
    } else {
      // lookahead eases toward the facing direction while moving
      const want = Math.abs(hero.vx) > 0.3 ? hero.facing * 40 : cam.look * 0.98;
      cam.look = lerp(cam.look, want, 0.04);
      const cx = hero.x + hero.w / 2 + cam.look;
      const lo = cam.x + W * 0.40, hi = cam.x + W * 0.55;
      let tx = cam.x;
      if (cx < lo) tx = cam.x - (lo - cx);
      else if (cx > hi) tx = cam.x + (cx - hi);
      cam.x = lerp(cam.x, tx, 0.35);
      cam.x = clamp(cam.x, 0, Math.max(0, room.w - W));

      const feet = hero.y + hero.h;
      if (cam.mode === 'vertical') {
        cam.targetY = feet - H * 0.6;
      } else if (hero.grounded) {
        cam.targetY = feet - H * 0.74;
      } else if (feet < cam.y + H * 0.3 || feet > cam.y + H * 0.86) {
        cam.targetY = feet - H * 0.6;
      }
      cam.targetY = clamp(cam.targetY, 0, Math.max(0, room.h - H));
      cam.y = lerp(cam.y, cam.targetY, hero.grounded ? 0.1 : 0.16);
    }

    if (cam.trauma > 0) {
      cam.trauma = Math.max(0, cam.trauma - 0.04);
      const s = cam.shakeOn ? cam.trauma * cam.trauma * 4 : 0;
      cam.shakeX = Math.round((Math.random() * 2 - 1) * s);
      cam.shakeY = Math.round((Math.random() * 2 - 1) * s);
    } else {
      cam.shakeX = cam.shakeY = 0;
    }
  };

  cam.shake = function (amount) { cam.trauma = Math.min(1, cam.trauma + amount); };

  // integer camera position for this render frame
  cam.view = function (alpha) {
    return {
      x: Math.round(lerp(cam.prevX, cam.x, alpha)) + cam.shakeX,
      y: Math.round(lerp(cam.prevY, cam.y, alpha)) + cam.shakeY,
    };
  };

  return cam;
}
