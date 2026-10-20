// Versioned progress in localStorage. Every access is guarded: private
// windows, blocked storage, quota and corrupt JSON all fall back to an
// in-memory object, so the game never depends on storage working.

const KEY = 'sv-portfolio-v1';
const VERSION = 1;

export function createSave(fresh) {
  let data = null;
  if (!fresh) {
    try {
      const raw = window.localStorage.getItem(KEY);
      const parsed = raw && JSON.parse(raw);
      if (parsed && parsed.v === VERSION) data = parsed;
    } catch (e) { data = null; }
  }

  let timer = 0;
  function write() {
    if (fresh) return;                    // a ?fresh=1 run never touches the real save
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* memory only */ }
    }, 400);
  }

  return {
    load() { return data; },
    store(next) { data = Object.assign({ v: VERSION }, next); write(); },
    reset() {
      data = null;
      try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    },
  };
}
