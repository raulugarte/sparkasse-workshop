import { decorateIcons } from '../../scripts/aem.js';
import { fetchLeftNavHtml, normalizePagePath } from '../../scripts/site-ui.js';

/**
 * Turns `<li>Label<ul>…</ul></li>` into a collapsible group with a toggle button.
 * @param {HTMLLIElement} li list item that contains a nested list
 * @param {number} index group index, used for ids
 */
function buildGroup(li, index) {
  const list = li.querySelector(':scope > ul');
  const labelNodes = [...li.childNodes].filter((n) => n !== list);
  const label = labelNodes.map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
  labelNodes.forEach((n) => n.remove());

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'left-navigation-group-toggle';
  button.setAttribute('aria-expanded', 'false');
  list.id = list.id || `left-navigation-group-${index}`;
  button.setAttribute('aria-controls', list.id);
  button.innerHTML = '<span class="icon icon-caret-right"></span>';
  button.append(document.createTextNode(label));

  li.classList.add('left-navigation-group');
  li.prepend(button);
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  });
}

/**
 * decorates the left navigation (site table of contents)
 * @param {Element} block the left-navigation block
 */
export default async function decorate(block) {
  const html = await fetchLeftNavHtml();
  if (!html) {
    block.closest('.left-navigation-wrapper')?.remove();
    return;
  }
  const doc = document.createElement('div');
  doc.innerHTML = html;
  const content = doc.querySelector(':scope > div') || doc;
  block.replaceChildren(...content.children);
  block.id = 'left-navigation';

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Topics');
  nav.append(...block.childNodes);
  block.append(nav);

  nav.querySelectorAll('li').forEach((li, i) => {
    if (li.querySelector(':scope > ul')) buildGroup(li, i);
  });
  decorateIcons(nav);

  // highlight the current page and open its group
  const current = normalizePagePath(window.location.pathname);
  const active = [...nav.querySelectorAll('a[href]')]
    .find((a) => normalizePagePath(new URL(a.href, window.location.href).pathname) === current);
  if (active) {
    active.classList.add('active');
    active.setAttribute('aria-current', 'page');
    const group = active.closest('.left-navigation-group');
    group?.querySelector(':scope > .left-navigation-group-toggle')?.setAttribute('aria-expanded', 'true');
    // keep the active entry visible inside the sidebar (desktop) or the drawer (mobile)
    // without scrolling the page itself
    const revealActive = () => {
      const scroller = [block, block.closest('.left-navigation-wrapper')]
        .find((el) => el && el.scrollHeight > el.clientHeight + 1);
      if (!scroller) return;
      const offset = active.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      scroller.scrollTop += offset - scroller.clientHeight / 2 + active.offsetHeight / 2;
    };
    requestAnimationFrame(revealActive);
    document.addEventListener('left-nav:opened', () => requestAnimationFrame(revealActive));
  }

  // on small screens the sidebar is a drawer opened from the header
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) document.dispatchEvent(new CustomEvent('left-nav:close'));
  });
}
