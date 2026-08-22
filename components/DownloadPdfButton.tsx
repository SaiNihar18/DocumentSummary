"use client";

import { useState } from "react";
import type { SummaryResult } from "@/lib/types";

interface DownloadPdfButtonProps {
  result: SummaryResult;
}

export default function DownloadPdfButton({ result }: DownloadPdfButtonProps) {
  const [generating, setGenerating] = useState(false);

  async function handleDownload() {
    setGenerating(true);
    try {
      const { downloadSummaryAsPdf } = await import("@/lib/pdf");
      await downloadSummaryAsPdf(result);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={generating}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors duration-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {generating ? "Preparing…" : "Download PDF"}
    </button>
  );
}
