// Integer pixel scaling in device pixels. Height is fixed at H; width
// stretches between MIN_W and MAX_W so wide screens see more world.
//
// The canvas backing store is at device resolution (W·rs × H·rs) and the
// world is drawn through a whole-number transform, so pixel art stays
// crisp while text is drawn as real, smooth type at full resolution.

import { H, MIN_W, MAX_W } from '../config.js';
import { clamp } from './util.js';
import { setTextMetrics } from '../art/font.js';

const MAX_BACKING = 3200;     // cap the backing width on huge screens

export function createDisplay(canvas, stage, viewport, onChange) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const root = document.documentElement;
  const d = { canvas, ctx, W: MIN_W, H, scale: 1 };

  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const cs = getComputedStyle(stage);
    const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
    const padT = parseFloat(cs.paddingTop) || 0, padB = parseFloat(cs.paddingBottom) || 0;
    const availW = Math.max(1, stage.clientWidth - padL - padR);
    const availH = Math.max(1, stage.clientHeight - padT - padB);
    const aw = availW * dpr, ah = availH * dpr;

    let scale = Math.max(1, Math.floor(Math.min(aw / MIN_W, ah / H)));
    let W = clamp(Math.floor(aw / scale), MIN_W, MAX_W);
    W -= W % 2;

    // a screen smaller than one game pixel per device pixel: shrink to fit
    let cssW = (W * scale) / dpr, cssH = (H * scale) / dpr;
    if (cssW > availW || cssH > availH) {
      const k = Math.min(availW / cssW, availH / cssH);
      cssW *= k; cssH *= k;
    }

    const left = padL + Math.round(((availW - cssW) / 2) * dpr) / dpr;
    const top = padT + Math.round(((availH - cssH) / 2) * dpr) / dpr;

    const rs = Math.max(1, Math.min(scale, Math.floor(MAX_BACKING / W)));
    if (canvas.width !== W * rs || canvas.height !== H * rs) {
      canvas.width = W * rs;
      canvas.height = H * rs;
    }
    ctx.imageSmoothingEnabled = false;
    setTextMetrics(rs, cssW / W, dpr);

    viewport.style.setProperty('--vp-left', left + 'px');
    viewport.style.setProperty('--vp-top', top + 'px');
    viewport.style.setProperty('--vp-w', cssW + 'px');
    viewport.style.setProperty('--vp-h', cssH + 'px');
    root.style.setProperty('--px', (cssW / W) + 'px');

    const changed = d.W !== W || d.scale !== scale;
    d.W = W; d.scale = scale; d.rs = rs; d.cssW = cssW; d.cssH = cssH;
    onChange(d, changed);
  }

  let t = 0;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 60); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 60); });

  // convert a client point to internal game pixels
  d.toGame = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * d.W, y: ((clientY - r.top) / r.height) * H };
  };
  d.fit = fit;
  return d;
}
