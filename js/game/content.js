// The résumé in index.html is the single source of truth. This indexes
// every [data-fact] (plus skills and credits), clones nodes for cards,
// keeps the found markers in sync, and checks level coverage.

export function indexContent() {
  const facts = new Map();
  for (const el of document.querySelectorAll('[data-fact]')) {
    const id = el.dataset.fact;
    const kickerEl = el.closest('[data-kicker]');
    const nodeEl = el.closest('[data-node]');
    facts.set(id, {
      id, el,
      title: el.dataset.title || el.textContent.trim().slice(0, 40),
      kicker: el.dataset.kicker || (kickerEl && kickerEl.dataset.kicker) || '',
      node: nodeEl ? nodeEl.dataset.node : null,
    });
  }
  const skills = [...document.querySelectorAll('[data-skill]')].map((el) => ({
    name: el.textContent.trim(), category: el.closest('[data-fact]').dataset.fact, el,
  }));
  const credits = [...document.querySelectorAll('[data-credit]')].map((el) => el.textContent.trim());

  return {
    facts, skills, credits,
    total: facts.size,

    get(id) { return facts.get(id); },

    // a card body: the fact's own markup, ids stripped so they stay unique
    clone(id) {
      const f = facts.get(id);
      if (!f) return document.createTextNode('');
      const c = f.el.cloneNode(true);
      c.removeAttribute('id');
      c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      c.classList.remove('is-found');
      const wrap = document.createElement('div');
      if (c.tagName === 'LI') {
        const p = document.createElement('p');
        p.innerHTML = c.innerHTML;
        wrap.appendChild(p);
      } else {
        wrap.appendChild(c);
      }
      return wrap;
    },

    markFound(ids) {
      for (const id of ids) {
        const f = facts.get(id);
        if (f) f.el.classList.add('is-found');
      }
    },
    clearFound() { for (const f of facts.values()) f.el.classList.remove('is-found'); },

    nodeFacts(node) { return [...facts.values()].filter((f) => f.node === node).map((f) => f.id); },

    // which facts have no home in any level, and which level refs have no fact
    coverage(levels, levelFacts) {
      const homed = new Set();
      const dangling = [];
      for (const def of Object.values(levels)) {
        for (const id of levelFacts(def)) {
          if (facts.has(id)) homed.add(id); else dangling.push(def.id + ':' + id);
        }
      }
      const unhomed = [...facts.keys()].filter((id) => !homed.has(id));
      return { homed: homed.size, total: facts.size, unhomed, dangling, skills: skills.length, credits: credits.length };
    },
  };
}
