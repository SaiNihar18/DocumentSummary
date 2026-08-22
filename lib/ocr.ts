const MIN_CONFIDENCE = 45;
const MIN_WORD_LIKE_RATIO = 0.35;

function isLikelyGibberish(text: string, confidence: number): boolean {
  if (confidence < MIN_CONFIDENCE) return true;

  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const wordLikeCount = tokens.filter((token) => token.replace(/[^a-zA-Z]/g, "").length >= 3).length;
  return wordLikeCount / tokens.length < MIN_WORD_LIKE_RATIO;
}

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
  if (isLikelyGibberish(text, data.confidence)) {
    throw new Error("This image doesn't look like it contains readable text. Try a clearer photo of a document or sign.");
  }
  return text;
}
