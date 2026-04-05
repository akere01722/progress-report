const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const printTableToPdf = ({
  title,
  subtitle = "",
  columns = [],
  rows = [],
}) => {
  const popup = window.open("", "_blank", "width=1100,height=800");
  if (!popup) return false;

  const headerCells = columns
    .map((column) => `<th>${escapeHtml(column.label || "")}</th>`)
    .join("");
  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((column) => `<td>${escapeHtml(row[column.key])}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  popup.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title || "Results Export")}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #111827; }
          h1 { margin: 0; font-size: 24px; }
          p { margin: 8px 0 16px; color: #4b5563; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #eff6ff; color: #1e3a8a; font-weight: 700; }
          tr:nth-child(even) td { background: #f9fafb; }
          .meta { margin-top: 12px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title || "Results Export")}</h1>
        <p>${escapeHtml(subtitle)}</p>
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows || '<tr><td colspan="99">No records</td></tr>'}</tbody>
        </table>
        <p class="meta">Generated on ${escapeHtml(new Date().toLocaleString())}</p>
      </body>
    </html>
  `);

  popup.document.close();
  popup.focus();
  popup.print();
  return true;
};
