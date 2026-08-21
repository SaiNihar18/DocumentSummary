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
    <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-center sm:p-8">
      <h2 className="text-base font-semibold text-red-800">{TITLE[kind]}</h2>
      <p className="text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="self-center rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}
