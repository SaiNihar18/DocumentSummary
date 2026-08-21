interface ProgressSpinnerProps {
  label: string;
  progressPct?: number | null;
}

export default function ProgressSpinner({ label, progressPct }: ProgressSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"
        role="status"
        aria-label={label}
      />
      <p className="text-sm font-medium text-slate-600">
        {label}
        {typeof progressPct === "number" ? ` (${progressPct}%)` : ""}
      </p>
    </div>
  );
}
