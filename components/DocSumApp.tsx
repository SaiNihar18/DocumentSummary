"use client";

import { useReducer } from "react";
import type { AppAction, AppState } from "@/lib/types";
import UploadZone from "./UploadZone";
import LengthSelector from "./LengthSelector";

const initialState: AppState = {
  status: "idle",
  file: null,
  length: "medium",
  extractedText: null,
  result: null,
  error: null,
  ocrProgress: null,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "FILE_SELECTED":
      return { ...state, file: action.file, error: null };
    case "FILE_REJECTED":
      return { ...state, status: "error", error: { kind: "bad-file", message: action.message } };
    case "LENGTH_CHANGED":
      return { ...state, length: action.length };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export default function DocSumApp() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:py-16">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">DocSum</h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Upload a PDF or image and get an instant AI summary.
        </p>
      </header>

      <div className="flex justify-center">
        <LengthSelector value={state.length} onChange={(length) => dispatch({ type: "LENGTH_CHANGED", length })} />
      </div>

      <UploadZone
        onFileSelected={(file) => dispatch({ type: "FILE_SELECTED", file })}
        onFileRejected={(message) => dispatch({ type: "FILE_REJECTED", message })}
      />

      {state.error && (
        <p className="text-center text-sm text-red-600">{state.error.message}</p>
      )}
    </main>
  );
}
