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

  let timer = 0, dirty = false;
  function flush() {
    clearTimeout(timer);
    if (!dirty || fresh) return;
    dirty = false;
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* memory only */ }
  }
  function write() {
    if (fresh) return;                    // a ?fresh=1 run never touches the real save
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(flush, 400);
  }
  // closing the tab right after a level clear must not lose it
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  return {
    load() { return data; },
    store(next) { data = Object.assign({ v: VERSION }, next); write(); },
    reset() {
      data = null;
      try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    },
  };
}
