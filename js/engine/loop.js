// Fixed 60 Hz simulation, rendered every animation frame with an
// interpolation alpha. Units everywhere are pixels and pixels per step.

export const STEP = 1000 / 60;

export function createLoop(update, render) {
  let last = 0, acc = 0, raf = 0, running = false;

  function frame(now) {
    if (!last) last = now;
    const dt = Math.min(now - last, 250);
    last = now;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n++ < 5) {
      update();
      acc -= STEP;
    }
    if (n >= 5) acc = 0;              // fell far behind: drop the backlog
    render(acc / STEP);
    raf = requestAnimationFrame(frame);
  }

  return {
    start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    get running() { return running; },
  };
}
