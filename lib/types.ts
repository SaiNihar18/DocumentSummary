export type SummaryLength = "short" | "medium" | "long";

export type Provider = "gemini" | "groq" | "none";

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  improvementSuggestions: string[];
  provider: Provider;
  truncated: boolean;
}

export type AppStatus = "idle" | "extracting" | "summarizing" | "result" | "error";

export type ErrorKind =
  | "bad-file"
  | "extraction-failed"
  | "empty-text"
  | "summarize-failed"
  | "both-providers-failed";

export interface AppState {
  status: AppStatus;
  file: File | null;
  length: SummaryLength;
  extractedText: string | null;
  result: SummaryResult | null;
  error: { kind: ErrorKind; message: string } | null;
  ocrProgress: number | null;
  verifyingWithAi: boolean;
}

export type AppAction =
  | { type: "FILE_SELECTED"; file: File }
  | { type: "FILE_REJECTED"; message: string }
  | { type: "EXTRACT_START" }
  | { type: "EXTRACT_PROGRESS"; pct: number }
  | { type: "EXTRACT_VERIFY_START" }
  | { type: "EXTRACT_SUCCESS"; text: string }
  | { type: "EXTRACT_FAILURE"; message: string }
  | { type: "LENGTH_CHANGED"; length: SummaryLength }
  | { type: "SUMMARIZE_START" }
  | { type: "SUMMARIZE_SUCCESS"; result: SummaryResult }
  | { type: "SUMMARIZE_FAILURE"; kind: ErrorKind; message: string }
  | { type: "RESET" };
