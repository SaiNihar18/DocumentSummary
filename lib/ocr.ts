export interface OcrResult {
  text: string;
  confidence: number;
}

export async function runOcr(file: File, onProgress?: (pct: number) => void): Promise<OcrResult> {
  const Tesseract = await import("tesseract.js");

  const worker = await Tesseract.createWorker("eng", undefined, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    // Sparse-text mode finds text wherever it appears instead of assuming a single
    // reading-order column, which reduces cross-column interleaving on scattered or
    // tabular layouts (e.g. side-by-side boxes) compared to Tesseract's default auto mode.
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT });

    const { data } = await worker.recognize(file);
    const text = data.text?.trim() ?? "";
    if (!text) {
      throw new Error("No text could be extracted from the image. Please upload an image with visible text.");
    }
    return { text, confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}

