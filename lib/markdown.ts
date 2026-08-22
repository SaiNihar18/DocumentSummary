export type SummaryBlock = { type: "paragraph"; text: string } | { type: "table"; headers: string[]; rows: string[][] };

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 1;
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c.trim()));
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

export function parseSummaryBlocks(text: string): SummaryBlock[] {
  const lines = text.split("\n");
  const blocks: SummaryBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    if (isTableRow(lines[i])) {
      const headers = splitRow(lines[i]);
      let bodyStart = i + 1;
      if (bodyStart < lines.length && isTableRow(lines[bodyStart]) && isSeparatorRow(splitRow(lines[bodyStart]))) {
        bodyStart += 1;
      }

      const rows: string[][] = [];
      let j = bodyStart;
      while (j < lines.length && isTableRow(lines[j])) {
        rows.push(splitRow(lines[j]));
        j += 1;
      }

      blocks.push({ type: "table", headers, rows });
      i = j;
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !isTableRow(lines[i])) {
      paraLines.push(lines[i]);
      i += 1;
    }

    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join("\n") });
    } else {
      i += 1;
    }
  }

  return blocks;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function blockToPlainText(block: SummaryBlock): string {
  if (block.type === "paragraph") return block.text;

  const widths = block.headers.map((h, i) => Math.max(h.length, ...block.rows.map((r) => (r[i] ?? "").length)));
  const padRow = (cells: string[]) => cells.map((c, i) => (c ?? "").padEnd(widths[i])).join("  ");
  const separator = widths.map((w) => "-".repeat(w)).join("  ");

  return [padRow(block.headers), separator, ...block.rows.map(padRow)].join("\n");
}

function blockToHtml(block: SummaryBlock): string {
  if (block.type === "paragraph") {
    return `<p>${escapeHtml(block.text).replace(/\n/g, "<br>")}</p>`;
  }

  const cellStyle = "border:1px solid #cbd5e1;padding:4px 10px;text-align:left;";
  const headerRow = `<tr>${block.headers.map((h) => `<th style="${cellStyle}background:#f1f5f9;">${escapeHtml(h)}</th>`).join("")}</tr>`;
  const bodyRows = block.rows
    .map((row) => `<tr>${row.map((cell) => `<td style="${cellStyle}">${escapeHtml(cell ?? "")}</td>`).join("")}</tr>`)
    .join("");

  return `<table style="border-collapse:collapse;margin:8px 0;">${headerRow}${bodyRows}</table>`;
}

export function formatSummaryForCopy(result: { summary: string; keyPoints: string[] }): { text: string; html: string } {
  const blocks = parseSummaryBlocks(result.summary);
  const textParts = blocks.map(blockToPlainText);
  const htmlParts = blocks.map(blockToHtml);

  if (result.keyPoints.length > 0) {
    textParts.push(["Key points:", ...result.keyPoints.map((p) => `- ${p}`)].join("\n"));
    htmlParts.push(
      `<p><strong>Key points:</strong></p><ul>${result.keyPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
    );
  }

  return { text: textParts.join("\n\n"), html: htmlParts.join("") };
}
