// Player progress: facts found, skills collected, levels cleared, bits, settings.
// Lives are per session and never saved, so every visit starts with 5.

export function createProgress(save) {
  const d = save.load() || {};
  const s = {
    facts: new Set(d.facts || []),
    skills: new Set(d.skills || []),        // skill names from [data-skill]
    cleared: new Set(d.cleared || []),
    warped: new Set(d.warped || []),
    bits: d.bits || 0,
    lastNode: d.lastNode || 'home',
    started: !!d.started,
    settings: Object.assign({ muted: true, assist: false }, d.settings || {}),
    stats: Object.assign({ bugs: 0, deaths: 0 }, d.stats || {}),
    gameOvers: Object.assign({}, d.gameOvers || {}),
  };

  const p = {
    lives: 5,
    get facts() { return s.facts; },
    get skills() { return s.skills; },
    get cleared() { return s.cleared; },
    get warped() { return s.warped; },
    get bits() { return s.bits; },
    get settings() { return s.settings; },
    get stats() { return s.stats; },
    get lastNode() { return s.lastNode; },
    set lastNode(n) { s.lastNode = n; persist(); },
    get started() { return s.started; },
    set started(v) { s.started = v; persist(); },

    hasFact(id) { return s.facts.has(id); },
    addFact(id) {
      if (s.facts.has(id)) return false;
      s.facts.add(id);
      persist();
      return true;
    },

    hasSkill(name) { return s.skills.has(name); },
    addSkill(name) {
      if (s.skills.has(name)) return false;
      s.skills.add(name);
      persist();
      return true;
    },

    // returns true when 100 bits roll over into an extra life
    addBits(n) {
      s.bits += n;
      let life = false;
      while (s.bits >= 100) { s.bits -= 100; p.lives = Math.min(9, p.lives + 1); life = true; }
      persist();
      return life;
    },

    clear(node) { s.cleared.add(node); persist(); },
    warp(node) { s.warped.add(node); persist(); },
    gameOver(node) { s.gameOvers[node] = (s.gameOvers[node] || 0) + 1; persist(); return s.gameOvers[node]; },
    gameOvers(node) { return s.gameOvers[node] || 0; },
    setting(k, v) { s.settings[k] = v; persist(); },
    stat(k, n = 1) { s.stats[k] = (s.stats[k] || 0) + n; persist(); },

    reset() {
      save.reset();
      s.facts.clear(); s.skills.clear(); s.cleared.clear(); s.warped.clear();
      s.bits = 0; s.lastNode = 'home'; s.started = false;
      s.stats = { bugs: 0, deaths: 0 }; s.gameOvers = {};
      p.lives = 5;
    },
  };

  function persist() {
    save.store({
      facts: [...s.facts], skills: [...s.skills], cleared: [...s.cleared], warped: [...s.warped],
      bits: s.bits, lastNode: s.lastNode, started: s.started,
      settings: s.settings, stats: s.stats, gameOvers: s.gameOvers,
    });
  }

  return p;
}
