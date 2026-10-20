// The HUD strip (DOM): lives, coffee, bits, facts, node name, and the
// always-visible RÉSUMÉ button. Counters only touch the DOM on change.

import { iconURL } from '../art/sprite.js';
import { makeCanvas } from '../engine/util.js';

export function createHud(game) {
  const $ = (id) => document.getElementById(id);
  const el = {
    root: $('hud'), lives: $('hud-lives'), coffee: $('hud-coffee'), bits: $('hud-bits'),
    facts: $('hud-facts'), node: $('hud-node'), mute: $('hud-mute'), muteLabel: $('hud-mute-label'),
    banner: $('node-banner'), toasts: $('toasts'), sr: $('sr-status'),
  };
  const last = {};

  // icons come from the same sprite art as the game
  const A = game.art;
  const [head, hctx] = makeCanvas(16, 13);
  hctx.drawImage(A.hero.idle[0].c, 0, 0, 16, 13, 0, 0, 16, 13);
  const icon = (cls, url) => document.querySelectorAll('.' + cls).forEach((n) => { n.style.backgroundImage = `url(${url})`; });
  icon('ico--head', iconURL(head));
  icon('ico--coffee', iconURL(A.items.coffee[0].c));
  icon('ico--bit', iconURL(A.items.bit[0].c));

  function set(key, node, value, bump) {
    if (last[key] === value) return;
    last[key] = value;
    node.textContent = value;
    if (bump) {
      const item = node.closest('.hud__item');
      item.classList.remove('is-bump');
      void item.offsetWidth;
      item.classList.add('is-bump');
    }
  }

  let bannerTimer = 0;

  return {
    show(on) { el.root.hidden = !on; },
    setNode(text) { set('node', el.node, text || ''); },

    refresh(bump = false) {
      const p = game.progress;
      set('lives', el.lives, String(p.lives), bump);
      set('bits', el.bits, String(p.bits).padStart(3, '0'), bump);
      set('facts', el.facts, p.facts.size + '/' + game.content.total, bump);
      const hero = game.scene && game.scene.hero;
      const coffee = !hero || hero.coffee;
      if (last.coffee !== coffee) { last.coffee = coffee; el.coffee.classList.toggle('is-empty', !coffee); }
    },

    setMute(muted) {
      el.mute.setAttribute('aria-pressed', muted ? 'false' : 'true');
      el.muteLabel.textContent = muted ? 'Sound off' : 'Sound on';
    },

    banner(html, ms) {
      clearTimeout(bannerTimer);
      if (!html) { el.banner.classList.remove('is-on'); return; }
      el.banner.innerHTML = html;
      el.banner.classList.add('is-on');
      if (ms) bannerTimer = setTimeout(() => el.banner.classList.remove('is-on'), ms);
    },

    toast(html, ms = 2800) {
      const t = document.createElement('div');
      t.className = 'toast';
      t.innerHTML = html;
      t.style.animationDelay = `0s, ${Math.max(0.5, ms / 1000 - 0.3)}s`;
      el.toasts.appendChild(t);
      while (el.toasts.children.length > 3) el.toasts.firstChild.remove();
      setTimeout(() => t.remove(), ms + 400);
    },

    announce(text) { el.sr.textContent = ''; setTimeout(() => { el.sr.textContent = text; }, 30); },
  };
}
