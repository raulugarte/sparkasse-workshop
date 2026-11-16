/*
 * Fullscreen view for content images (screenshots), as on the source site:
 * click an image in a main section to see it at full resolution on a dark overlay;
 * click beside the image or press Escape to close.
 */

// images that are not screenshots: icons, the code panel, navigation
const EXCLUDE = '.icon, .code-snippet, .left-navigation-wrapper, .right-rail, .next-button';

/**
 * Full-resolution URL of an image (drops the EDS optimization query string).
 * @param {HTMLImageElement} img image element
 * @returns {string}
 */
function fullSizeSrc(img) {
  const url = new URL(img.currentSrc || img.src, window.location.href);
  return `${url.origin}${url.pathname}`;
}

/**
 * Is this image a content screenshot that can be enlarged?
 * @param {Element} img candidate element
 * @returns {boolean}
 */
function isZoomable(img) {
  return img instanceof HTMLImageElement
    && !!img.closest('main .section')
    && !img.closest(EXCLUDE)
    && !img.closest('a');
}

export default function initImageLightbox() {
  const main = document.querySelector('main');
  if (!main || document.querySelector('.image-lightbox')) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'image-lightbox';
  dialog.setAttribute('aria-label', 'Enlarged image');
  const image = document.createElement('img');
  image.alt = '';
  dialog.append(image);
  document.body.append(dialog);

  const open = (img) => {
    image.src = fullSizeSrc(img);
    image.alt = img.alt || '';
    dialog.showModal();
    document.body.classList.add('image-lightbox-open');
  };
  const close = () => {
    if (dialog.open) dialog.close();
  };

  // mark zoomable images: pointer cursor + keyboard access
  const prepare = () => main.querySelectorAll('.section img').forEach((img) => {
    if (!isZoomable(img) || img.dataset.lightbox) return;
    img.dataset.lightbox = 'true';
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `Enlarge image${img.alt ? `: ${img.alt}` : ''}`);
  });
  prepare();

  main.addEventListener('click', (e) => {
    const img = e.target.closest('img');
    if (img && isZoomable(img)) open(img);
  });
  main.addEventListener('keydown', (e) => {
    const img = e.target.closest('img[data-lightbox]');
    if (img && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      open(img);
    }
  });
  // a click on the overlay (outside the image) closes; a click on the image does not
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  // Escape closes natively (dialog "cancel"); always restore page scrolling
  dialog.addEventListener('close', () => {
    document.body.classList.remove('image-lightbox-open');
    image.removeAttribute('src');
  });
}
