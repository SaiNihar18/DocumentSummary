"use client";

import { useReducer } from "react";
import type { AppAction, AppState, ErrorKind, SummaryLength } from "@/lib/types";
import UploadZone from "./UploadZone";
import LengthSelector from "./LengthSelector";
import ProgressSpinner from "./ProgressSpinner";
import ResultView from "./ResultView";
import ErrorBanner from "./ErrorBanner";
import ThemeToggle from "./ThemeToggle";

const MIN_WORDS_FOR_SUMMARY = 30;
const OCR_CONFIDENCE_THRESHOLD = 75;

const initialState: AppState = {
  status: "idle",
  file: null,
  length: "medium",
  extractedText: null,
  result: null,
  error: null,
  ocrProgress: null,
  verifyingWithAi: false,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "FILE_SELECTED":
      return { ...state, file: action.file, error: null, ocrProgress: null };
    case "FILE_REJECTED":
      return { ...initialState, length: state.length, status: "error", error: { kind: "bad-file", message: action.message } };
    case "EXTRACT_START":
      return { ...state, status: "extracting" };
    case "EXTRACT_PROGRESS":
      return { ...state, ocrProgress: action.pct };
    case "EXTRACT_VERIFY_START":
      return { ...state, verifyingWithAi: true };
    case "EXTRACT_SUCCESS":
      return { ...state, extractedText: action.text, verifyingWithAi: false };
    case "EXTRACT_FAILURE":
      return { ...state, status: "error", verifyingWithAi: false, error: { kind: "extraction-failed", message: action.message } };
    case "LENGTH_CHANGED":
      return { ...state, length: action.length };
    case "SUMMARIZE_START":
      return { ...state, status: "summarizing" };
    case "SUMMARIZE_SUCCESS":
      return { ...state, status: "result", result: action.result };
    case "SUMMARIZE_FAILURE":
      return { ...state, status: "error", error: { kind: action.kind, message: action.message } };
    case "RESET":
      return { ...initialState, length: state.length };
    default:
      return state;
  }
}

async function extractPdfViaApi(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.error ?? "Failed to extract text from PDF");
  }
  return body.text ?? "";
}

async function extractImageViaVisionApi(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/extract-image", { method: "POST", body: formData });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.error ?? "Failed to read text from the image");
  }
  return body.text ?? "";
}

export default function DocSumApp() {
  const [state, dispatch] = useReducer(reducer, initialState);

  async function handleSummarize(text: string, length: SummaryLength) {
    dispatch({ type: "SUMMARIZE_START" });
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, length }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const kind: ErrorKind = res.status === 502 ? "both-providers-failed" : "summarize-failed";
        dispatch({ type: "SUMMARIZE_FAILURE", kind, message: body.error ?? "Summarization failed." });
        return;
      }

      dispatch({ type: "SUMMARIZE_SUCCESS", result: body });
    } catch {
      dispatch({
        type: "SUMMARIZE_FAILURE",
        kind: "summarize-failed",
        message: "Network error while contacting the summarizer. Please try again.",
      });
    }
  }

  async function handleLengthChange(length: SummaryLength) {
    dispatch({ type: "LENGTH_CHANGED", length });
    if (state.status === "result" && state.extractedText) {
      await handleSummarize(state.extractedText, length);
    }
  }

  async function handleFileSelected(file: File) {
    dispatch({ type: "FILE_SELECTED", file });
    dispatch({ type: "EXTRACT_START" });

    try {
      let text: string;
      if (file.type === "application/pdf") {
        text = await extractPdfViaApi(file);
      } else {
        const { runOcr } = await import("@/lib/ocr");
        const ocrResult = await runOcr(file, (pct) => dispatch({ type: "EXTRACT_PROGRESS", pct }));
        text = ocrResult.text;

        if (ocrResult.confidence < OCR_CONFIDENCE_THRESHOLD) {
          dispatch({ type: "EXTRACT_VERIFY_START" });
          try {
            const visionText = await extractImageViaVisionApi(file);
            if (visionText.trim()) {
              text = visionText;
            }
          } catch {
            // Vision escalation failed (e.g. both providers down); fall back to the
            // lower-confidence Tesseract result rather than failing the whole upload.
          }
        }
      }

      if (!text.trim()) {
        dispatch({ type: "EXTRACT_FAILURE", message: "The document appears to be empty." });
        return;
      }

      dispatch({ type: "EXTRACT_SUCCESS", text });

      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < MIN_WORDS_FOR_SUMMARY) {
        dispatch({
          type: "SUMMARIZE_SUCCESS",
          result: { summary: text.trim(), keyPoints: [], provider: "none", truncated: false },
        });
        return;
      }

      await handleSummarize(text, state.length);
    } catch (e) {
      dispatch({ type: "EXTRACT_FAILURE", message: (e as Error).message || "Failed to extract text from the document." });
    }
  }

  const isBusy = state.status === "extracting" || state.status === "summarizing";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-16 print:min-h-0 print:p-0">
      <header className="relative text-center print:hidden">
        <div className="absolute right-0 top-0">
          <ThemeToggle />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 transition-colors duration-300 dark:text-slate-100 sm:text-4xl">
          DocSum
        </h1>
        <p className="mt-2 text-sm text-slate-500 transition-colors duration-300 dark:text-slate-400 sm:text-base">
          Upload a PDF or image and get an instant AI summary.
        </p>
      </header>

      {(state.status === "idle" || state.status === "extracting" || state.status === "summarizing") && (
        <div className="flex justify-center print:hidden">
          <LengthSelector value={state.length} onChange={handleLengthChange} disabled={isBusy} />
        </div>
      )}


      {state.status === "idle" && (
        <UploadZone
          onFileSelected={handleFileSelected}
          onFileRejected={(message) => dispatch({ type: "FILE_REJECTED", message })}
        />
      )}

      {state.status === "extracting" && (
        <ProgressSpinner
          label={
            state.file?.type === "application/pdf"
              ? "Extracting text from PDF…"
              : state.verifyingWithAi
                ? "Double-checking with AI…"
                : "Reading text from image…"
          }
          progressPct={state.file?.type === "application/pdf" || state.verifyingWithAi ? null : state.ocrProgress}
        />
      )}

      {state.status === "summarizing" && <ProgressSpinner label="Summarizing…" />}

      {state.status === "result" && state.result && (
        <ResultView
          result={state.result}
          length={state.length}
          onLengthChange={handleLengthChange}
          onStartOver={() => dispatch({ type: "RESET" })}
        />
      )}

      {state.status === "error" && state.error && (
        <ErrorBanner kind={state.error.kind} message={state.error.message} onRetry={() => dispatch({ type: "RESET" })} />
      )}
    </main>
  );
}
