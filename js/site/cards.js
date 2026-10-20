// Card content the résumé doesn't have as one block: the closing contact
// card. Built from the résumé (the open-to-work line and the contact
// links), never typed twice; the facts themselves stay in the intro.

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function contactCard() {
  const resume = document.getElementById('resume');
  const wrap = el('div', 'contact-card');
  const h2 = el('h2', 'contact-card__title', 'Get in touch');
  h2.id = 'h-contact';
  wrap.appendChild(h2);
  const open = resume.querySelector('[data-fact="c-open"]');
  if (open) wrap.appendChild(el('p', 'contactend__lead', open.textContent.trim()));
  const list = el('ul', 'contactend__links');
  for (const a of resume.querySelectorAll('#contact a')) {
    const li = el('li');
    li.appendChild(a.cloneNode(true));
    list.appendChild(li);
  }
  wrap.appendChild(list);
  return wrap;
}
