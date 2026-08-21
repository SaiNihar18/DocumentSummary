import type { SummaryResult } from "@/lib/types";
import CopyButton from "./CopyButton";

interface ResultViewProps {
  result: SummaryResult;
  onStartOver: () => void;
}

const PROVIDER_LABEL: Record<SummaryResult["provider"], string> = {
  gemini: "Powered by Gemini",
  groq: "Powered by Groq",
};

export default function ResultView({ result, onStartOver }: ResultViewProps) {
  const copyText = [result.summary, "", "Key points:", ...result.keyPoints.map((p) => `- ${p}`)].join("\n");

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 transition-colors duration-300 dark:bg-slate-800 dark:text-slate-400">
          {PROVIDER_LABEL[result.provider]}
        </span>
        <CopyButton text={copyText} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400 transition-colors duration-300 dark:text-slate-500">Summary</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 transition-colors duration-300 dark:text-slate-200 sm:text-base">
          {result.summary}
        </p>
      </div>

      {result.keyPoints.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400 transition-colors duration-300 dark:text-slate-500">Key Points</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700 transition-colors duration-300 dark:text-slate-200 sm:text-base">
            {result.keyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onStartOver}
        className="self-start text-sm font-medium text-indigo-600 transition-colors duration-300 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        Summarize another document
      </button>
    </div>
  );
}
