// Action-based input. Keyboard and touch both feed the same actions;
// the simulation reads them once per fixed step.
//
// A press shorter than one step still registers (latched), and an
// action can be "locked" until released, so closing a card with the
// jump key doesn't also make the hero hop.

// one key can drive several actions: ↑ is both "up" (map) and "jump" (levels)
const KEYMAP = {
  ArrowLeft: ['left'], KeyA: ['left'],
  ArrowRight: ['right'], KeyD: ['right'],
  ArrowUp: ['up', 'jump'], KeyW: ['up', 'jump'],
  ArrowDown: ['down'], KeyS: ['down'],
  Space: ['jump', 'confirm'], KeyZ: ['jump', 'confirm'], KeyK: ['jump'],
  ShiftLeft: ['run'], ShiftRight: ['run'], KeyX: ['run'], KeyJ: ['run'],
  Enter: ['confirm', 'interact'], KeyE: ['interact'],
};

// keys that act outside the simulation (they work while paused, too)
const META = {
  KeyR: 'resume', KeyM: 'map', KeyN: 'mute', KeyP: 'pause', Escape: 'pause',
};

const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'run', 'confirm', 'interact'];

export function createInput({ onMeta, onDevice }) {
  const raw = Object.create(null);
  const latch = Object.create(null);
  const locks = Object.create(null);
  const prev = Object.create(null);
  const held = Object.create(null);
  const pressed = Object.create(null);
  const released = Object.create(null);

  function down(a) { if (!raw[a]) latch[a] = true; raw[a] = true; }
  function up(a) { raw[a] = false; }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    onDevice('keys');
    const t = e.target;
    const typing = t instanceof HTMLElement && t.matches('input, textarea, select');
    if (typing) return;
    if (META[e.code] && !e.repeat) {
      if (onMeta(META[e.code], e)) { e.preventDefault(); return; }
    }
    const a = KEYMAP[e.code];
    if (!a) return;
    if (document.querySelector('dialog[open]')) return;          // dialogs own the keyboard
    const onControl = t instanceof HTMLElement && t.matches('button, a, [role="button"]');
    if (onControl && (e.code === 'Space' || e.code === 'Enter')) return;
    e.preventDefault();
    if (e.repeat) return;
    a.forEach(down);
  });

  window.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (a) a.forEach(up);
  });

  window.addEventListener('blur', clear);

  function clear() {
    for (const a of ACTIONS) { raw[a] = false; latch[a] = false; }
  }

  return {
    held, pressed, released,
    down, up, clear,

    beginStep() {
      for (const a of ACTIONS) {
        if (locks[a] && !raw[a] && !latch[a]) locks[a] = false;
        const h = !!raw[a] && !locks[a];
        pressed[a] = !!latch[a] && !locks[a];
        held[a] = h || pressed[a];
        released[a] = !!prev[a] && !h;
        prev[a] = h;
        latch[a] = false;
      }
    },

    // ignore an action until it has been let go
    lock(a) { locks[a] = true; latch[a] = false; },
    lockAll() { for (const a of ACTIONS) this.lock(a); },
  };
}

// ─── on-screen controls ──────────────────────────────────────

export function createTouch(root, input) {
  const owners = new Map();                // pointerId -> action

  function keyAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const k = el && el.closest && el.closest('[data-key]');
    return k && root.contains(k) ? k : null;
  }

  function set(id, el) {
    const prevEl = owners.get(id);
    if (prevEl === el) return;
    if (prevEl) { prevEl.dataset.key.split(' ').forEach(input.up); prevEl.classList.remove('is-down'); }
    if (el) { el.dataset.key.split(' ').forEach(input.down); el.classList.add('is-down'); owners.set(id, el); }
    else owners.delete(id);
  }

  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    e.preventDefault();
    try { root.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
    set(e.pointerId, keyAt(e.clientX, e.clientY));
  });
  root.addEventListener('pointermove', (e) => {
    if (!owners.has(e.pointerId) && e.pointerType === 'mouse') return;
    set(e.pointerId, keyAt(e.clientX, e.clientY));
  });
  const end = (e) => set(e.pointerId, null);
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    releaseAll() { for (const id of [...owners.keys()]) set(id, null); },
  };
}
