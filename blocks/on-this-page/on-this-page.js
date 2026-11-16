import { toClassName } from '../../scripts/aem.js';

const TITLE = 'ON THIS PAGE';
const LEVELS = { H2: 2, H3: 3, H4: 4 };

/**
 * Gives a heading a unique id (headings from Document Authoring usually have one already).
 * @param {HTMLElement} heading heading element
 * @returns {string} the id
 */
function ensureId(heading) {
  if (heading.id) return heading.id;
  const base = toClassName(heading.textContent.trim()) || 'section';
  let id = base;
  for (let i = 2; document.getElementById(id); i += 1) id = `${base}-${i}`;
  heading.id = id;
  return id;
}

/**
 * Builds a nested list of links from h2–h4 headings.
 * @param {HTMLElement[]} headings headings in document order
 * @returns {HTMLUListElement}
 */
function buildList(headings) {
  const root = document.createElement('ul');
  const stack = [{ level: 1, list: root }];
  headings.forEach((heading) => {
    const level = LEVELS[heading.tagName];
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
    let { list } = stack[stack.length - 1];
    if (stack[stack.length - 1].li) {
      // nested level: create the sub-list under the parent item on first use
      const parent = stack[stack.length - 1];
      if (!parent.sublist) {
        parent.sublist = document.createElement('ul');
        parent.li.append(parent.sublist);
      }
      list = parent.sublist;
    }
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${ensureId(heading)}`;
    a.dataset.tocTarget = heading.id;
    a.textContent = heading.textContent.trim();
    li.append(a);
    list.append(li);
    stack.push({ level, li });
  });
  return root;
}

/**
 * Distance from the viewport top under which a heading counts as "current"
 * (aligned with the top of the rail, as on the source site).
 * @param {Element} block the block
 * @returns {number}
 */
function headerOffset(block) {
  const rail = block.closest('.right-rail');
  const top = rail ? parseInt(getComputedStyle(rail).top, 10) : NaN;
  if (Number.isFinite(top) && top > 0) return top;
  const header = document.querySelector('header .nav-wrapper');
  return header ? Math.round(header.getBoundingClientRect().height) + 8 : 64;
}

/**
 * "On this page" table of contents with scroll spy.
 * @param {Element} block the on-this-page block
 */
export default async function decorate(block) {
  const main = block.closest('main') || document.querySelector('main');
  const headings = [...main.querySelectorAll('.section h2, .section h3, .section h4')];
  if (headings.length < 2) {
    (block.closest('.right-rail') || block).remove();
    document.body.classList.remove('has-right-rail');
    return;
  }

  const nav = document.createElement('nav');
  nav.className = 'on-this-page-nav';
  nav.setAttribute('aria-label', 'On this page');
  const title = document.createElement('p');
  title.className = 'on-this-page-title';
  title.textContent = TITLE;
  nav.append(title, buildList(headings));
  block.replaceChildren(nav);

  const links = [...nav.querySelectorAll('a[data-toc-target]')];
  const setActive = (id) => links.forEach((a) => {
    const active = a.dataset.tocTarget === id;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  });

  const updateFromScroll = () => {
    const doc = document.documentElement;
    if (window.scrollY <= 2) { setActive(headings[0].id); return; }
    if (doc.scrollHeight - Math.round(window.scrollY + window.innerHeight) <= 2) {
      setActive(headings[headings.length - 1].id);
      return;
    }
    const offset = headerOffset(block);
    let current = headings[0];
    headings.forEach((h) => {
      if (h.getBoundingClientRect().top - offset <= 24) current = h;
    });
    setActive(current.id);
  };

  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-toc-target]');
    if (!a) return;
    const target = document.getElementById(a.dataset.tocTarget);
    if (!target) return;
    e.preventDefault();
    const top = window.scrollY + target.getBoundingClientRect().top - headerOffset(block) - 8;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    window.history.replaceState(null, '', `#${target.id}`);
    setActive(target.id);
  });

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateFromScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', updateFromScroll);

  const hash = decodeURIComponent(window.location.hash.slice(1));
  if (hash && links.some((a) => a.dataset.tocTarget === hash)) setActive(hash);
  else updateFromScroll();
}
