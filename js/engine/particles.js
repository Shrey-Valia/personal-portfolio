// Pooled square particles. No allocation in the hot loop.

const MAX = 320;

export function createParticles() {
  const x = new Float32Array(MAX), y = new Float32Array(MAX);
  const vx = new Float32Array(MAX), vy = new Float32Array(MAX);
  const life = new Int16Array(MAX), max = new Int16Array(MAX);
  const grav = new Float32Array(MAX), size = new Uint8Array(MAX);
  const color = new Array(MAX).fill('#fff');
  let budget = 1;                       // reduced motion lowers this
  let next = 0;

  function spawn(px, py, pvx, pvy, c, l, g = 0.15, s = 1) {
    for (let k = 0; k < MAX; k++) {
      const i = (next + k) % MAX;
      if (life[i] <= 0) {
        x[i] = px; y[i] = py; vx[i] = pvx; vy[i] = pvy;
        color[i] = c; life[i] = max[i] = l; grav[i] = g; size[i] = s;
        next = (i + 1) % MAX;
        return;
      }
    }
  }

  return {
    setBudget(b) { budget = b; },

    burst(px, py, n, colors, { speed = 2, up = 1.5, life: l = 30, grav: g = 0.15, size: s = 1 } = {}) {
      const count = Math.max(1, Math.round(n * budget));
      for (let k = 0; k < count; k++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.6);
        spawn(px, py, Math.cos(a) * v, Math.sin(a) * v - up, colors[k % colors.length],
          l + ((Math.random() * l * 0.5) | 0), g, s);
      }
    },

    one(px, py, pvx, pvy, c, l, g, s) { if (Math.random() < budget) spawn(px, py, pvx, pvy, c, l, g, s); },

    update() {
      for (let i = 0; i < MAX; i++) {
        if (life[i] <= 0) continue;
        vy[i] += grav[i];
        x[i] += vx[i];
        y[i] += vy[i];
        life[i]--;
      }
    },

    clear() { life.fill(0); },

    draw(ctx, camX, camY) {
      for (let i = 0; i < MAX; i++) {
        if (life[i] <= 0) continue;
        // blink out in the last few frames instead of fading (keeps the palette crisp)
        if (life[i] < 6 && (life[i] & 1)) continue;
        ctx.fillStyle = color[i];
        ctx.fillRect(Math.round(x[i] - camX), Math.round(y[i] - camY), size[i], size[i]);
      }
    },
  };
}
