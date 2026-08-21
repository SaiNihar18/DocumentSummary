"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { validateFile } from "@/lib/validation";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  onFileRejected: (reason: string) => void;
  disabled?: boolean;
}

export default function UploadZone({ onFileSelected, onFileRejected, disabled }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined | null) {
    if (!file) return;
    const result = validateFile(file);
    if (!result.valid) {
      onFileRejected(result.reason);
      return;
    }
    onFileSelected(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragActive(false);
    if (disabled) return;
    handleFile(e.dataTransfer.files?.[0]);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled) return;
    setIsDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragActive(false);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          inputRef.current?.click();
        }
      }}
      aria-disabled={disabled}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors duration-300 sm:p-16 ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
          : isDragActive
            ? "cursor-pointer border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
            : "cursor-pointer border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-slate-800"
      }`}
    >
      <Image
        src="/images/cloud-upload-folder.png"
        alt=""
        width={96}
        height={96}
        className={`h-20 w-20 sm:h-24 sm:w-24 ${disabled ? "opacity-40 grayscale" : ""}`}
        priority
      />
      <p className="text-sm font-medium sm:text-base">
        Drag &amp; drop a PDF, JPG, or PNG here, or click to browse
      </p>
      <p className="text-xs text-slate-400 transition-colors duration-300 dark:text-slate-500">Max file size 10MB</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
