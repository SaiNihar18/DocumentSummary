import type { SummaryResult } from "@/lib/types";

const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 20;
const CONTENT_WIDTH_MM = 210 - MARGIN_MM * 2;
const LINE_HEIGHT_MM = 5.5;

const PROVIDER_LABEL: Record<SummaryResult["provider"], string> = {
  gemini: "Powered by Gemini",
  groq: "Powered by Groq",
};

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u00A0\u200B\uFEFF]/g, " ")
    .replace(/[ \t]+/g, " ");
}

export async function downloadSummaryAsPdf(result: SummaryResult): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = MARGIN_MM;

  function ensureSpace(neededLines: number) {
    if (y + neededLines * LINE_HEIGHT_MM > PAGE_HEIGHT_MM - MARGIN_MM) {
      doc.addPage();
      y = MARGIN_MM;
    }
  }

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("DocSum Summary", MARGIN_MM, y);
  y += 6.5;

  // Provider Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(PROVIDER_LABEL[result.provider], MARGIN_MM, y);
  y += 9;

  // Summary Section Heading
  ensureSpace(2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Summary", MARGIN_MM, y);
  y += 6;

  // Summary Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85); // slate-700

  // Normalize summary paragraphs (merge soft line wraps into paragraphs)
  const paragraphs = normalizeText(result.summary)
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    const lines: string[] = doc.splitTextToSize(paragraph, CONTENT_WIDTH_MM);
    for (const line of lines) {
      ensureSpace(1);
      doc.text(line, MARGIN_MM, y);
      y += LINE_HEIGHT_MM;
    }
    y += 2; // small gap between paragraphs
  }

  // Key Points Section
  if (result.keyPoints && result.keyPoints.length > 0) {
    y += 3;
    ensureSpace(3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Key Points", MARGIN_MM, y);
    y += 6;

    const bulletIndent = 5;
    const bulletContentWidth = CONTENT_WIDTH_MM - bulletIndent;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);

    for (const rawPoint of result.keyPoints) {
      const cleanPoint = normalizeText(rawPoint)
        .replace(/^[•\-\*\s]+/, "")
        .replace(/\n/g, " ")
        .trim();

      if (!cleanPoint) continue;

      const lines: string[] = doc.splitTextToSize(cleanPoint, bulletContentWidth);
      ensureSpace(lines.length);

      // Draw a neat solid bullet circle
      doc.setFillColor(71, 85, 105);
      doc.circle(MARGIN_MM + 1.8, y - 1.1, 0.7, "F");

      for (let i = 0; i < lines.length; i++) {
        doc.text(lines[i], MARGIN_MM + bulletIndent, y);
        y += LINE_HEIGHT_MM;
      }
      y += 1.5; // slight spacing between list items
    }
  }

  doc.save("docsum-summary.pdf");
}

