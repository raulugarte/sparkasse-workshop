/*
 * Small helpers shared by the header and the left navigation:
 * icon text notation, fragment image paths and the light/dark theme.
 */

const THEME_KEY = 'theme';

/**
 * Turns literal `:name:` icon notation (as authored in Document Authoring) into
 * `<span class="icon icon-name">` so aem.js decorateIcons() can render it. DA already does this
 * conversion when it renders a page; locally the plain fragment still contains the raw text.
 * @param {Element} container element to scan
 */
export function convertIconNotation(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    if (/:[a-z0-9-]+:/.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode);
  }
  nodes.forEach((node) => {
    const parts = node.nodeValue.split(/(:[a-z0-9-]+:)/);
    const frag = document.createDocumentFragment();
    parts.forEach((part) => {
      const m = part.match(/^:([a-z0-9-]+):$/);
      if (m) {
        const span = document.createElement('span');
        span.className = `icon icon-${m[1]}`;
        frag.append(span);
      } else if (part) {
        frag.append(document.createTextNode(part));
      }
    });
    node.replaceWith(frag);
  });
}

/**
 * Resolves relative image references in a fetched fragment against the fragment URL,
 * so `images/logo.png` in /content/nav.plain.html works on every page path.
 * @param {Element} container fragment content
 * @param {string} baseUrl URL the fragment was fetched from
 */
export function resolveFragmentImages(container, baseUrl) {
  container.querySelectorAll('img[src], source[srcset]').forEach((el) => {
    const attr = el.hasAttribute('src') ? 'src' : 'srcset';
    const value = el.getAttribute(attr);
    if (!value || /^(https?:|data:|\/)/.test(value)) return;
    // keep the query string: EDS uses it for the optimized image renditions
    const url = new URL(value, baseUrl);
    el.setAttribute(attr, `${url.pathname}${url.search}`);
  });
}

/**
 * @returns {'light'|'dark'} the theme currently applied to the document
 */
export function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/**
 * Applies a theme and remembers the choice.
 * @param {'light'|'dark'} theme theme to apply
 */
export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    // storage unavailable: theme still applies for this page view
  }
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

/**
 * Applies the saved theme, or the system preference when nothing was saved.
 */
export function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (e) {
    // ignore
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
}

let leftNavRequest;

/**
 * Fetches the left navigation fragment once per page view: /content first (local preview),
 * then the site root (DA/EDS). Shared by the left navigation and the next-chapter button.
 * @returns {Promise<string|null>}
 */
export function fetchLeftNavHtml() {
  if (!leftNavRequest) {
    leftNavRequest = (async () => {
      let resp = await fetch('/content/left-nav.plain.html');
      if (!resp.ok) resp = await fetch('/left-nav.plain.html');
      return resp.ok ? resp.text() : null;
    })();
  }
  return leftNavRequest;
}

/**
 * Normalizes a page path for comparisons (the local preview serves pages under /content).
 * @param {string} path pathname
 * @returns {string}
 */
export function normalizePagePath(path) {
  return path
    .replace(/^\/content(?=\/)/, '')
    .replace(/\.(plain\.)?html$/, '')
    .replace(/\/index$/, '/')
    .replace(/(.)\/$/, '$1');
}
