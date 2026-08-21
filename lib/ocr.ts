export async function runOcr(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const Tesseract = await import("tesseract.js");

  const { data } = await Tesseract.recognize(file, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const text = data.text?.trim() ?? "";
  if (!text) {
    throw new Error("No text could be extracted from the image");
  }
  return text;
}
