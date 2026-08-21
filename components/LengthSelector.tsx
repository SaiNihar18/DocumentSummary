"use client";

import type { SummaryLength } from "@/lib/types";

interface LengthSelectorProps {
  value: SummaryLength;
  onChange: (length: SummaryLength) => void;
  disabled?: boolean;
}

const OPTIONS: { value: SummaryLength; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

export default function LengthSelector({ value, onChange, disabled }: LengthSelectorProps) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Summary length">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            value === option.value
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
