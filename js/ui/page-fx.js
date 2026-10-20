// The game layer on top of the website, added after the page has painted
// and never in the way of reading: Shrey runs along a scroll-progress line
// under the bar, each section's >_ block pops into a check as it scrolls
// into view (with a bit), and the bar counts the facts read. Nothing here
// hides text; reduced motion keeps the counter and checks, without movement.

import { makeCanvas } from '../engine/util.js';

const $ = (id) => document.getElementById(id);

export function startFx({ game, badges, isOn }) {
  const A = game.art;
  const reduced = game.reduced;
  const resume = $('resume');

  // ─── Shrey on the progress line ────────────────────────────────────
  // one strip: idle, four run frames, victory (16×24 each)
  const frames = [A.hero.idle[0], ...A.hero.run, A.hero.victory[0]];
  const [strip, sctx] = makeCanvas(16 * frames.length, 24);
  frames.forEach((f, i) => sctx.drawImage(f.c, i * 16, 0));
  const track = document.createElement('div');
  track.className = 'progress';
  track.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('span');
  fill.className = 'progress__fill';
  const runner = document.createElement('span');
  runner.className = 'progress__runner';
  runner.style.backgroundImage = `url(${strip.toDataURL()})`;
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

  // ─── facts read ────────────────────────────────────────────────────
  const facts = [...resume.querySelectorAll('[data-fact]')];
  const seen = new Set();
  const counter = $('pagebar-facts');
  const [icon, ictx] = makeCanvas(16, 16);
  ictx.drawImage(A.items.info[0].c, 0, 0);
  icon.className = 'pagebar__facts-icon';
  const count = document.createElement('b');
  counter.append(icon, count, document.createTextNode(` / ${facts.length}`));
  counter.title = 'Facts read on this page';
  counter.setAttribute('aria-hidden', 'true');      // a flourish; the content is the page
  counter.hidden = false;
  function setCount(bump) {
    count.textContent = seen.size;
    counter.classList.toggle('is-all', seen.size === facts.length);
    if (bump && !reduced) {
      counter.classList.remove('is-bump');
      void counter.offsetWidth;
      counter.classList.add('is-bump');
    }
  }
  setCount(false);

  const factObs = new IntersectionObserver((list) => {
    if (!isOn()) return;
    let added = false;
    for (const e of list) {
      if (!e.isIntersecting || seen.has(e.target)) continue;
      seen.add(e.target);
      factObs.unobserve(e.target);
      added = true;
    }
    if (added) setCount(true);
  }, { threshold: 0.6 });
  facts.forEach((f) => factObs.observe(f));

  // ─── >_ blocks pop into checks ─────────────────────────────────────
  const popObs = new IntersectionObserver((list) => {
    if (!isOn()) return;
    for (const e of list) {
      if (!e.isIntersecting) continue;
      popObs.unobserve(e.target);
      pop(badges.get(e.target));
    }
  }, { threshold: 0.35 });
  for (const host of badges.keys()) popObs.observe(host);

  function pop(b) {
    if (!b) return;
    b.markUsed();
    b.classList.add('is-used');
    if (reduced) return;
    b.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }],
      { duration: 240, easing: 'ease-out' });
    const bit = A.items.bit[0].c.cloneNode();
    bit.getContext('2d').drawImage(A.items.bit[0].c, 0, 0);
    bit.className = 'info-bit';
    bit.setAttribute('aria-hidden', 'true');
    b.parentNode.appendChild(bit);
    bit.animate([
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(-26px)', opacity: 1, offset: 0.6 },
      { transform: 'translateY(-34px)', opacity: 0 },
    ], { duration: 650, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }).onfinish = () => bit.remove();
  }

  return { refresh: onScroll };
}
