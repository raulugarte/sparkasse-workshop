import { decorateIcons } from '../../scripts/aem.js';
import {
  convertIconNotation, resolveFragmentImages, getTheme, setTheme, fetchSiteFragment,
} from '../../scripts/site-ui.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(width >= 900px)');

// nav fragment sections, in authored order
const SECTION_NAMES = ['brand', 'title', 'tools'];

/**
 * Fetches the nav fragment of the current page's tutorial folder (e.g. /assets/nav for pages
 * under /assets/, /nav otherwise): /content first (local preview), then the site (DA/EDS).
 * @returns {Promise<{html: string, url: string}|null>}
 */
function fetchNav() {
  return fetchSiteFragment('nav');
}

/**
 * Opens or closes the mobile menu (the left navigation drawer).
 * @param {Element} nav nav element
 * @param {boolean|null} forceExpanded optional state to force
 */
function toggleMenu(nav, forceExpanded = null) {
  const expanded = forceExpanded !== null ? forceExpanded : nav.getAttribute('aria-expanded') !== 'true';
  nav.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  const button = nav.querySelector('.nav-hamburger button');
  if (button) {
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    button.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
  }
  document.body.classList.toggle('left-nav-open', expanded && !isDesktop.matches);
  if (expanded && !isDesktop.matches) document.dispatchEvent(new CustomEvent('left-nav:opened'));
}

/**
 * Builds the light/dark theme toggle button.
 * @returns {HTMLDivElement}
 */
function buildThemeToggle() {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-theme-toggle';
  const button = document.createElement('button');
  button.type = 'button';
  const img = document.createElement('img');
  img.width = 22;
  img.height = 22;
  img.loading = 'lazy';
  button.append(img);
  wrapper.append(button);

  const render = () => {
    const dark = getTheme() === 'dark';
    img.src = `${window.hlx.codeBasePath}/icons/${dark ? 'sun' : 'moon'}.svg`;
    img.alt = '';
    button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
  };
  render();
  button.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
  document.addEventListener('themechange', render);
  return wrapper;
}

/**
 * Builds the hamburger button that opens the left navigation on small screens.
 * @param {Element} nav nav element
 * @returns {HTMLDivElement}
 */
function buildHamburger(nav) {
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-controls', 'left-navigation');
  button.innerHTML = '<span class="nav-hamburger-icon"></span>';
  button.addEventListener('click', () => toggleMenu(nav));
  hamburger.append(button);
  return hamburger;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNav();
  block.textContent = '';
  if (!fragment) return;

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Site');
  nav.innerHTML = fragment.html;
  resolveFragmentImages(nav, new URL(fragment.url, window.location.href).href);

  [...nav.children].forEach((section, i) => {
    const name = SECTION_NAMES[i];
    if (name) section.classList.add(`nav-${name}`);
  });

  // tools: icon links (e.g. help -> mailto) get an accessible name from their title
  const tools = nav.querySelector('.nav-tools') || nav.appendChild(document.createElement('div'));
  tools.classList.add('nav-tools');
  convertIconNotation(tools);
  tools.querySelectorAll('a').forEach((a) => {
    if (!a.textContent.trim() && a.title) a.setAttribute('aria-label', a.title);
    a.classList.remove('button');
    a.closest('p')?.classList.remove('button-wrapper');
  });
  // text links in the tools section (e.g. "Ask a Question" -> mailto) become the floating
  // contact button in the bottom-right corner, as on the source site
  const floating = [...tools.querySelectorAll('a')].filter((a) => a.textContent.trim());
  tools.prepend(buildThemeToggle());
  decorateIcons(tools);

  nav.prepend(buildHamburger(nav));
  nav.setAttribute('aria-expanded', 'false');
  toggleMenu(nav, false);

  // reset the mobile drawer when crossing the breakpoint
  isDesktop.addEventListener('change', () => toggleMenu(nav, false));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && nav.getAttribute('aria-expanded') === 'true') {
      toggleMenu(nav, false);
      nav.querySelector('.nav-hamburger button').focus();
    }
  });
  // the left navigation asks the header to close the drawer after a link is chosen
  document.addEventListener('left-nav:close', () => toggleMenu(nav, false));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  if (floating.length) {
    const contact = document.createElement('div');
    contact.className = 'nav-floating-contact';
    floating.forEach((a) => {
      const p = a.closest('p');
      contact.append(a);
      if (p && !p.textContent.trim() && !p.querySelector('img, .icon')) p.remove();
    });
    block.append(contact);
  }
}
