import { fetchSiteFragment } from '../../scripts/site-ui.js';

/**
 * Fetches the footer fragment of the current page's tutorial folder (e.g. /assets/footer for
 * pages under /assets/, /footer otherwise): /content first (local preview), then the site.
 * @returns {Promise<string|null>}
 */
async function fetchFooter() {
  const fragment = await fetchSiteFragment('footer');
  return fragment ? fragment.html : null;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const html = await fetchFooter();
  block.textContent = '';
  if (!html) return;

  const footer = document.createElement('div');
  footer.innerHTML = html;
  // each top-level fragment section becomes a footer row
  [...footer.children].forEach((section) => section.classList.add('footer-section'));
  block.append(...footer.children);
}
