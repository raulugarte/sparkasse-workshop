/**
 * Image block: a screenshot shown at the width the author chose as block option,
 * e.g. "Image (width-30percent)". Without option the image uses the full content width.
 * @param {Element} block the image block
 */
export default function decorate(block) {
  const picture = block.querySelector('picture');
  const img = block.querySelector('img');
  if (!picture && !img) {
    block.remove();
    return;
  }
  block.replaceChildren(picture || img);
}
