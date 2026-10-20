// Fixed 60 Hz simulation, rendered every animation frame with an
// interpolation alpha. Units everywhere are pixels and pixels per step.

export const STEP = 1000 / 60;

export function createLoop(update, render, onError) {
  let last = 0, acc = 0, raf = 0, running = false;

  function frame(now) {
    if (!last) last = now;
    const dt = Math.min(now - last, 250);
    last = now;
    acc += dt;
    let n = 0;
    try {
      while (acc >= STEP && n++ < 5) {
        update();
        acc -= STEP;
      }
      if (n >= 5) acc = 0;            // fell far behind: drop the backlog
      render(acc / STEP);
    } catch (err) {
      running = false;                // never leave a frozen canvas spinning
      if (onError) onError(err); else throw err;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  return {
    start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    get running() { return running; },
  };
}
