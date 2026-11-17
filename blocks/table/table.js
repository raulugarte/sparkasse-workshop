/**
 * Table block (block collection): every row of the block becomes a table row.
 * The first row is the header unless the "no header" option is set.
 * Options: striped, bordered, no header.
 * @param {Element} block the table block
 */
export default function decorate(block) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const hasHeader = !block.classList.contains('no-header');
  if (hasHeader) table.append(thead);
  table.append(tbody);

  [...block.children].forEach((child, i) => {
    const row = document.createElement('tr');
    const isHeader = hasHeader && i === 0;
    (isHeader ? thead : tbody).append(row);
    [...child.children].forEach((col) => {
      const cell = document.createElement(isHeader ? 'th' : 'td');
      if (isHeader) cell.setAttribute('scope', 'col');
      cell.append(...col.childNodes);
      row.append(cell);
    });
  });
  block.replaceChildren(table);
}
