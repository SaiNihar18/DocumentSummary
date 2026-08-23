import { formatSummaryForCopy } from "@/lib/markdown";
import type { SummaryLength, SummaryResult } from "@/lib/types";
import CopyButton from "./CopyButton";
import DownloadPdfButton from "./DownloadPdfButton";
import LengthSelector from "./LengthSelector";
import SummaryContent from "./SummaryContent";

interface ResultViewProps {
  result: SummaryResult;
  length: SummaryLength;
  onLengthChange: (length: SummaryLength) => void;
  onStartOver: () => void;
}

const PROVIDER_LABEL: Record<SummaryResult["provider"], string> = {
  gemini: "Powered by Gemini",
  groq: "Powered by Groq",
  none: "Shown as extracted (too short to summarize)",
};

export default function ResultView({ result, length, onLengthChange, onStartOver }: ResultViewProps) {
  const { text: copyText, html: copyHtml } = formatSummaryForCopy(result);

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900 sm:p-8 print:!border-none print:!bg-white print:p-0 print:!shadow-none">
      {/* Print-only Document Title */}
      <div className="hidden pb-3 border-b border-slate-300 print:block">
        <h1 className="text-2xl font-bold text-slate-900">DocSum Summary</h1>
        <p className="text-xs text-slate-500">{PROVIDER_LABEL[result.provider]}</p>
      </div>

      {/* Screen Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 transition-colors duration-300 dark:bg-slate-800 dark:text-slate-400">
          {PROVIDER_LABEL[result.provider]}
        </span>
        <div className="flex items-center gap-2">
          <CopyButton text={copyText} html={copyHtml} />
          <DownloadPdfButton />
        </div>
      </div>

      {result.truncated && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 transition-colors duration-300 dark:bg-amber-950/40 dark:text-amber-300 print:hidden">
          This document was long, so only the first ~30,000 characters were used to generate this summary.
        </p>
      )}

      <div>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors duration-300 dark:text-slate-400 print:text-xs print:font-bold print:!text-slate-900">
          Summary
        </h2>
        <SummaryContent text={result.summary} />
      </div>

      {result.keyPoints.length > 0 && (
        <div className="print:mt-3">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors duration-300 dark:text-slate-400 print:text-xs print:font-bold print:!text-slate-900">
            Key Points
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm font-medium leading-relaxed text-slate-800 transition-colors duration-300 dark:text-slate-100 sm:text-base sm:leading-relaxed print:space-y-2 print:text-sm print:font-medium print:leading-relaxed print:!text-slate-900">
            {result.keyPoints.map((point, i) => (
              <li key={i} className="print:break-inside-avoid">
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.improvementSuggestions.length > 0 && (
        <div className="print:mt-3 print:break-inside-avoid">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors duration-300 dark:text-slate-400 print:text-xs print:font-bold print:!text-slate-900">
            Improvement Suggestions
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm font-medium leading-relaxed text-slate-800 transition-colors duration-300 dark:text-slate-100 sm:text-base sm:leading-relaxed print:space-y-2 print:text-sm print:font-medium print:leading-relaxed print:!text-slate-900">
            {result.improvementSuggestions.map((suggestion, i) => (
              <li key={i} className="print:break-inside-avoid">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Screen Footer Actions */}
      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 transition-colors duration-300 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-xs font-medium text-slate-400 transition-colors duration-300 dark:text-slate-500">
            Regenerate as
          </span>
          <LengthSelector value={length} onChange={onLengthChange} />
        </div>
        <button
          type="button"
          onClick={onStartOver}
          className="self-start text-sm font-medium text-indigo-600 transition-colors duration-300 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 sm:self-end"
        >
          Summarize another document
        </button>
      </div>
    </div>
  );
}

