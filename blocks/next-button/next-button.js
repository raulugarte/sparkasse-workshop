import { fetchLeftNavHtml, normalizePagePath } from '../../scripts/site-ui.js';

const DEFAULT_LABEL = 'Next Chapter';

/**
 * Finds the page that follows the current one in the left navigation order.
 * @returns {Promise<string|null>} href of the next page
 */
async function findNextHref() {
  const html = await fetchLeftNavHtml();
  if (!html) return null;
  const doc = document.createElement('div');
  doc.innerHTML = html;
  const hrefs = [...doc.querySelectorAll('li a[href]')].map((a) => a.getAttribute('href'));
  const current = normalizePagePath(window.location.pathname);
  const index = hrefs.findIndex((href) => {
    try {
      return normalizePagePath(new URL(href, window.location.href).pathname) === current;
    } catch (e) {
      return false;
    }
  });
  return index >= 0 && index < hrefs.length - 1 ? hrefs[index + 1] : null;
}

/**
 * Next-chapter button: links to the next page of the left navigation.
 * An authored label (if any) replaces the default "Next Chapter".
 * @param {Element} block the next-button block
 */
export default async function decorate(block) {
  const label = block.textContent.trim() || DEFAULT_LABEL;
  const href = await findNextHref();
  if (!href) {
    // last page (or page outside the navigation): no next chapter
    (block.closest('.next-button-wrapper') || block).remove();
    return;
  }
  const link = document.createElement('a');
  link.className = 'next-button-link';
  link.href = href;
  link.textContent = label;
  block.replaceChildren(link);
}
