import type { ErrorKind } from "@/lib/types";

interface ErrorBannerProps {
  kind: ErrorKind;
  message: string;
  onRetry: () => void;
}

const TITLE: Record<ErrorKind, string> = {
  "bad-file": "That file can't be used",
  "extraction-failed": "Couldn't read the document",
  "empty-text": "No text found",
  "summarize-failed": "Summarization failed",
  "both-providers-failed": "Summarization is temporarily unavailable",
};

export default function ErrorBanner({ kind, message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-center transition-colors duration-300 dark:border-red-900/60 dark:bg-red-950/40 sm:p-8">
      <h2 className="text-base font-semibold text-red-800 transition-colors duration-300 dark:text-red-300">{TITLE[kind]}</h2>
      <p className="text-sm text-red-700 transition-colors duration-300 dark:text-red-300/90">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="self-center rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors duration-300 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
      >
        Try again
      </button>
    </div>
  );
}
