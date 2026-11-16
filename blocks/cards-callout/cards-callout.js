/**
 * Cards Callout: inline note / tip callout box.
 * Each row is one callout. The first paragraph is an optional header
 * (icon + bold label, e.g. ":note: **NOTE**"); everything else is body.
 * Options (block classes): note, tip. Unknown tokens are ignored.
 */

/**
 * Returns true when the element holds only icons and/or a single <strong> label.
 * @param {Element} el
 * @returns {boolean}
 */
function isHeaderElement(el) {
  if (!el) return false;
  const strongs = el.querySelectorAll(':scope > strong, :scope > b');
  if (strongs.length !== 1 || !strongs[0].textContent.trim()) return false;
  return [...el.childNodes].every((node) => {
    if (node.nodeType === Node.TEXT_NODE) return !node.textContent.trim();
    if (node.nodeType !== Node.ELEMENT_NODE) return true;
    return node.matches('strong, b, span.icon, br');
  });
}

/* icons that may be authored as a literal ":name:" token (DA renders these as span.icon) */
const ICON_TOKENS = ['note', 'bulb'];

/**
 * Converts a leading literal ":note:" / ":bulb:" text token into an icon span,
 * so local previews render the same as DA. Skipped when a real icon already exists.
 * @param {Element} el the header candidate (first paragraph of a callout)
 */
function expandIconToken(el) {
  if (!el || el.querySelector('span.icon')) return;
  const textNode = [...el.childNodes].find(
    (n) => n.nodeType !== Node.TEXT_NODE || n.textContent.trim(),
  );
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
  const match = textNode.textContent.match(/^\s*:([a-z0-9-]+):\s*/);
  if (!match || !ICON_TOKENS.includes(match[1])) return;

  const name = match[1];
  const span = document.createElement('span');
  span.className = `icon icon-${name}`;
  const img = document.createElement('img');
  img.dataset.iconName = name;
  img.src = `${window.hlx?.codeBasePath ?? ''}/icons/${name}.svg`;
  img.alt = '';
  img.loading = 'lazy';
  span.append(img);

  textNode.textContent = textNode.textContent.slice(match[0].length);
  textNode.before(span);
  if (!textNode.textContent) textNode.remove();
}

/**
 * Wraps loose inline content of a cell into a paragraph so the cell only holds blocks.
 * @param {Element} cell
 */
function normalizeCell(cell) {
  const blockTags = /^(P|DIV|UL|OL|PRE|H[1-6]|BLOCKQUOTE|TABLE|PICTURE)$/;
  const hasLoose = [...cell.childNodes].some(
    (n) => (n.nodeType === Node.TEXT_NODE && n.textContent.trim())
      || (n.nodeType === Node.ELEMENT_NODE && !blockTags.test(n.tagName)),
  );
  if (!hasLoose) return;
  const p = document.createElement('p');
  while (cell.firstChild) p.append(cell.firstChild);
  cell.append(p);
}

/**
 * When a paragraph starts with "icon **LABEL**<br>body", split it into header + body.
 * @param {Element} first
 * @returns {Element|null} the header paragraph, or null
 */
function splitHeaderAtBreak(first) {
  const br = first.querySelector(':scope > br');
  if (!br) return null;
  const header = document.createElement('p');
  while (first.firstChild && first.firstChild !== br) header.append(first.firstChild);
  if (!isHeaderElement(header)) {
    // not a header: restore original order
    first.prepend(...header.childNodes);
    return null;
  }
  br.remove();
  if (!first.textContent.trim() && !first.querySelector('img, picture, a')) first.remove();
  return header;
}

/**
 * Collects the content nodes of a row (all cells, normalized).
 * @param {Element} row
 * @returns {Element[]}
 */
function rowContent(row) {
  const cells = [...row.children];
  if (!cells.length) {
    const wrap = document.createElement('div');
    while (row.firstChild) wrap.append(row.firstChild);
    cells.push(wrap);
  }
  return cells.flatMap((cell) => {
    normalizeCell(cell);
    return [...cell.children];
  });
}

function buildCallout(nodes) {
  const li = document.createElement('li');
  li.className = 'cards-callout-card';
  const body = document.createElement('div');
  body.className = 'cards-callout-body';

  let headerEl = null;
  const [first] = nodes;
  if (first && isHeaderElement(first)) {
    headerEl = first;
    nodes.shift();
  } else if (first && first.tagName === 'P') {
    headerEl = splitHeaderAtBreak(first);
    if (headerEl && !first.parentNode) nodes.shift();
  }

  if (headerEl) {
    const header = document.createElement('div');
    header.className = 'cards-callout-header';
    const icon = headerEl.querySelector('span.icon');
    if (icon) {
      icon.classList.add('cards-callout-icon');
      header.append(icon);
    }
    const label = headerEl.querySelector('strong, b');
    if (label) {
      const p = document.createElement('p');
      p.className = 'cards-callout-label';
      p.append(label);
      header.append(p);
    }
    li.append(header);
  }

  body.append(...nodes);
  if (body.children.length || body.textContent.trim()) li.append(body);
  return li;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  let pendingHeader = null;

  [...block.children].forEach((row) => {
    const nodes = rowContent(row);
    if (!nodes.length) return;
    expandIconToken(nodes[0]);

    // A header-only row (unmerged 2-row source) belongs to the next row's callout.
    if (nodes.length === 1 && isHeaderElement(nodes[0])) {
      if (pendingHeader) ul.append(buildCallout([pendingHeader]));
      [pendingHeader] = nodes;
      return;
    }
    if (pendingHeader) {
      nodes.unshift(pendingHeader);
      pendingHeader = null;
    }
    ul.append(buildCallout(nodes));
  });

  if (pendingHeader) ul.append(buildCallout([pendingHeader]));
  block.replaceChildren(ul);
}
