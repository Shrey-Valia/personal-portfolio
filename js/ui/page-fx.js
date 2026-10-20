// The game layer on top of the website, added after the page has painted
// and never in the way of reading: Shrey runs along a scroll-progress line
// under the bar, and each section's landmark pops up with the game's
// caption for that place as it scrolls into view. Text is never hidden;
// with reduced motion the landmarks are simply there and Shrey stands still.

import { makeCanvas } from '../engine/util.js';

const $ = (id) => document.getElementById(id);

export function startFx({ game, landmarks, isOn }) {
  const A = game.art;
  const reduced = game.reduced;

  // ─── Shrey on the progress line ────────────────────────────────────
  // one strip: idle, four run frames, victory, at the hero's real frame size
  const frames = [A.hero.idle[0], ...A.hero.run, A.hero.victory[0]];
  const fw = frames[0].w, fh = frames[0].h;
  const [strip, sctx] = makeCanvas(fw * frames.length, fh);
  frames.forEach((f, i) => sctx.drawImage(f.c, i * fw, 0));
  const track = document.createElement('div');
  track.className = 'progress is-top';
  track.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('span');
  fill.className = 'progress__fill';
  const runner = document.createElement('span');
  runner.className = 'progress__runner';
  runner.style.backgroundImage = `url(${strip.toDataURL()})`;
  track.style.setProperty('--fw', fw + 'px');
  track.style.setProperty('--fh', fh + 'px');
  track.append(fill, runner);
  $('pagebar').appendChild(track);

  let lastY = window.scrollY, stopTimer = 0, queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!isOn()) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      track.style.setProperty('--p', p.toFixed(4));
      track.classList.toggle('is-back', y < lastY);
      track.classList.toggle('is-done', p > 0.995);
      track.classList.toggle('is-top', p < 0.01);     // at the top the bar's mark is Shrey
      if (!reduced && y !== lastY) {
        track.classList.add('is-running');
        clearTimeout(stopTimer);
        stopTimer = setTimeout(() => track.classList.remove('is-running'), 160);
      }
      lastY = y;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  // ─── landmarks pop up as their sections arrive ─────────────────────
  if (!reduced && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((list) => {
      for (const e of list) {
        if (!e.isIntersecting || !isOn()) continue;
        obs.unobserve(e.target);
        e.target.classList.remove('is-waiting');
        e.target.classList.add('is-popped');
      }
    }, { threshold: 0.6 });
    for (const m of landmarks) {
      m.classList.add('is-waiting');
      obs.observe(m);
    }
  }

  return { refresh: onScroll };
}
