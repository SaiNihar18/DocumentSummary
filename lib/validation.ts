export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export type ValidationResult = { valid: true } | { valid: false; reason: string };

export function validateFile(file: File): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { valid: false, reason: "Only PDF, JPG, and PNG files are supported." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: "File must be 10MB or smaller." };
  }
  return { valid: true };
}
