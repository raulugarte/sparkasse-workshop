/**
 * Code Snippet: a <pre><code> panel with a "Copy" button.
 * Mirrors the source site's rendering: a light Prism-style panel with
 * lightweight token coloring (same token rules the source applies) and a
 * copy-to-clipboard button. The code text is never altered; tokens are
 * wrapped in spans built from text nodes only.
 * Single-line snippets render as an inline code chip without a button,
 * as on the source.
 */

const STRING = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/.source;

/* Ordered token rules (same order/patterns as Prism's CSS grammar used by the source). */
const GRAMMAR = [
  ['comment', /\/\*[\s\S]*?\*\//],
  ['atrule', new RegExp(`@[\\w-](?:[^;{\\s"']|\\s+(?!\\s)|${STRING})*?(?:;|(?=\\s*\\{))`)],
  ['url', new RegExp(`\\burl\\((?:${STRING}|(?:[^\\\\\\r\\n()"']|\\\\[\\s\\S])*)\\)`, 'i')],
  ['selector', new RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|${STRING})*(?=\\s*\\{)`), true],
  ['string', new RegExp(STRING)],
  ['property', /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i, true],
  ['important', /!important\b/i],
  ['function', /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i, true],
  ['punctuation', /[(){};:,]/],
];

const MAX_HIGHLIGHT_LENGTH = 20000;

/**
 * Splits text into plain strings and { type, text } tokens.
 * @param {string} text
 * @returns {Array<string|{type: string, text: string}>}
 */
function tokenize(text) {
  let parts = [text];
  GRAMMAR.forEach(([type, pattern, lookbehind]) => {
    const next = [];
    parts.forEach((part) => {
      if (typeof part !== 'string') {
        next.push(part);
        return;
      }
      let rest = part;
      while (rest) {
        const m = pattern.exec(rest);
        if (!m) break;
        const skip = lookbehind && m[1] ? m[1].length : 0;
        const start = m.index + skip;
        const match = m[0].slice(skip);
        if (!match) break;
        if (start) next.push(rest.slice(0, start));
        next.push({ type, text: match });
        rest = rest.slice(start + match.length);
      }
      if (rest) next.push(rest);
    });
    parts = next;
  });
  return parts;
}

/**
 * Re-renders the code element with token spans; text content stays identical.
 * @param {HTMLElement} code
 */
function highlight(code) {
  const text = code.textContent;
  if (!text || text.length > MAX_HIGHLIGHT_LENGTH) return;
  const fragment = document.createDocumentFragment();
  tokenize(text).forEach((part) => {
    if (typeof part === 'string') {
      fragment.append(document.createTextNode(part));
    } else {
      const span = document.createElement('span');
      span.className = `token ${part.type}`;
      span.textContent = part.text;
      fragment.append(span);
    }
  });
  if (fragment.textContent === text) code.replaceChildren(fragment);
}

/**
 * Finds the authored <pre>, or builds one from plain cell text.
 * @param {Element} block
 * @returns {HTMLPreElement|null}
 */
function findOrBuildPre(block) {
  const pre = block.querySelector('pre');
  if (pre) {
    if (!pre.querySelector('code')) {
      const code = document.createElement('code');
      while (pre.firstChild) code.append(pre.firstChild);
      pre.append(code);
    }
    return pre;
  }
  // Defensive: authors pasted code as text/paragraphs instead of a code block.
  const cell = block.querySelector(':scope > div > div') || block;
  const paragraphs = [...cell.querySelectorAll('p')];
  const text = paragraphs.length
    ? paragraphs.map((p) => p.innerText ?? p.textContent).join('\n')
    : cell.textContent;
  if (!text.trim()) return null;
  const newPre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = text.replace(/^\n+|\s+$/g, '');
  newPre.append(code);
  return newPre;
}

/**
 * @param {HTMLElement} code
 * @returns {HTMLButtonElement}
 */
function buildCopyButton(code) {
  const text = code.textContent;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'code-snippet-copy';
  button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy code to clipboard');
  let timer;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied!';
      clearTimeout(timer);
      timer = setTimeout(() => {
        button.textContent = 'Copy';
      }, 3000);
    } catch {
      button.textContent = 'Copy';
    }
  });
  return button;
}

export default function decorate(block) {
  const pre = findOrBuildPre(block);
  if (!pre) {
    block.replaceChildren();
    return;
  }

  const code = pre.querySelector('code');
  const isSingleLine = !code.textContent.replace(/\n+$/, '').includes('\n');

  if (isSingleLine) {
    // Source renders single-line samples as an inline code chip (no pre, no button).
    block.classList.add('code-snippet-inline');
    const line = document.createElement('p');
    line.className = 'code-snippet-line';
    code.textContent = code.textContent.replace(/\n+$/, '');
    line.append(code);
    block.replaceChildren(line);
    highlight(code);
    return;
  }

  highlight(code);
  block.replaceChildren(buildCopyButton(code), pre);
}
