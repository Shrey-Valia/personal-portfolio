// The website's card extras, all built from the markup so nothing is typed
// twice. Everything added here is .page-only or aria-hidden, so the game's
// résumé dialog, print and screen readers see the résumé itself.
//
//   "More (n)"   a button per stop with li.is-more (they show without JS and in print)
//   chips        from [data-chip]: the element's text plus the attribute's suffix
//   snapshot     the intro's quick facts, from [data-snap]
//   contact      the end card: the open-to-work line and the links, copied
//   sides        which side of the centre lane each card sits on (desktop)
//   the bar      Shrey's head as the mark, the Jump menu, Résumé PDF

import { STD } from '../timeline/kit.js';
import { makeCanvas } from '../engine/util.js';

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function moreButtons(resume) {
  for (const stop of resume.querySelectorAll('.stop')) {
    const hidden = stop.querySelectorAll('li.is-more');
    if (!hidden.length) continue;
    const list = hidden[0].parentElement;
    if (!list.id) list.id = stop.id + '-list';
    const label = `More (${hidden.length})`;
    const b = el('button', 'stop__more page-only', label);
    b.type = 'button';
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', list.id);
    b.addEventListener('click', () => {
      const open = !stop.classList.contains('is-open');
      stop.classList.toggle('is-open', open);
      b.setAttribute('aria-expanded', String(open));
      b.textContent = open ? 'Less' : label;
    });
    list.after(b);
  }
}

function chips(resume) {
  for (const stop of resume.querySelectorAll('.stop')) {
    const marks = [...stop.querySelectorAll('[data-chip]')].filter((m) => m.dataset.chip !== 'inline');
    if (!marks.length) continue;
    const ul = el('ul', 'stop__chips page-only');
    ul.setAttribute('aria-hidden', 'true');            // a summary of the text above
    for (const m of marks) ul.appendChild(el('li', null, (m.textContent.trim() + ' ' + m.dataset.chip).trim()));
    const card = stop.querySelector('.stop__card') || stop;
    const more = card.querySelector('.stop__more');
    if (more) more.before(ul); else card.appendChild(ul);
  }
}

function snapshot(resume) {
  const head = $('top');
  const snaps = [...resume.querySelectorAll('[data-snap]')];
  if (!head || !snaps.length) return;
  const dl = el('dl', 'snapshot page-only');
  for (const s of snaps) {
    const row = el('div', 'snapshot__row');
    row.append(el('dt', null, s.dataset.snap), el('dd', null, s.textContent.trim()));
    dl.appendChild(row);
  }
  head.appendChild(dl);
}

function contactCard() {
  const card = document.querySelector('#contact .stop__card');
  if (!card) return;
  const open = document.querySelector('[data-fact="c-open"]');
  if (open) card.appendChild(el('p', 'contact__lead', open.textContent.trim()));
  const list = el('ul', 'contact__links');
  for (const a of document.querySelectorAll('#contact-links a')) {
    const li = el('li');
    li.appendChild(a.cloneNode(true));
    list.appendChild(li);
  }
  card.appendChild(list);
}

function skillsCount() {
  const h = document.querySelector('#skills .stop__card > h2');
  if (!h) return;
  const n = document.querySelectorAll('#skills [data-skill]').length;
  const areas = document.querySelectorAll('#skills .skillset').length;
  h.after(el('p', 'skills__count page-only', `${n} skills in ${areas} areas`));
}

// desktop: cards alternate either side of the centre lane, by stop order
function sides(resume) {
  [...resume.querySelectorAll('.stop:not(.stop--intro)')].forEach((s, i) => { s.dataset.side = i % 2 ? 'left' : 'right'; });
}

function bar() {
  const mark = $('pagebar-mark');
  if (mark && !mark.firstChild) {
    const [c, ctx] = makeCanvas(18, 15);                  // the head, with outline and rim
    ctx.drawImage(STD.idle[0].c, 0, 0, 18, 15, 0, 0, 18, 15);
    c.className = 'pagebar__head';
    mark.appendChild(c);
  }
  const jump = $('jump');
  if (jump) jump.addEventListener('click', (e) => { if (e.target.closest('a') && jump.hidePopover) jump.hidePopover(); });
  const print = () => { if (jump && jump.hidePopover && jump.matches(':popover-open')) jump.hidePopover(); window.print(); };
  for (const id of ['pagebar-pdf', 'jump-pdf']) { const b = $(id); if (b) b.addEventListener('click', print); }
}

export function decorate() {
  const resume = $('resume');
  moreButtons(resume);
  chips(resume);
  snapshot(resume);
  contactCard();
  skillsCount();
  sides(resume);
  bar();
}
