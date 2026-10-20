// A thin scroll-progress line under the website's bar, teal to gold.
// (Shrey himself now walks the timeline's path: js/site/timeline.js.)

const $ = (id) => document.getElementById(id);

export function startFx({ isOn }) {
  const track = document.createElement('div');
  track.className = 'progress';
  track.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('span');
  fill.className = 'progress__fill';
  track.appendChild(fill);
  $('pagebar').appendChild(track);

  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!isOn()) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      track.style.setProperty('--p', p.toFixed(4));
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  return { refresh: onScroll };
}
