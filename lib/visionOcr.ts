const VISION_TIMEOUT_MS = 15_000;

const OCR_PROMPT = [
  "You are a precise OCR engine. Transcribe ONLY the visible text in this image, exactly as it appears.",
  "Preserve rows, columns, and table structure using plain text and consistent spacing.",
  "Do not add commentary, descriptions, apologies, or corrections of any kind.",
  "If there is absolutely no readable text in the image, respond with exactly: NO_TEXT_DETECTED",
].join(" ");

const NO_TEXT_SENTINEL = "no_text_detected";

const PREFIXES_TO_STRIP = ["the text in the image is:", "visible text:", "extracted text:", "the image contains:"];

function cleanVisionText(raw: string): string {
  let text = raw.trim();
  const lower = text.toLowerCase();

  if (lower.includes(NO_TEXT_SENTINEL)) return "";

  for (const prefix of PREFIXES_TO_STRIP) {
    if (lower.startsWith(prefix)) {
      text = text.slice(prefix.length).trim();
      break;
    }
  }

  return text;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function callGeminiVision(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

  const result = await model.generateContent([{ text: OCR_PROMPT }, { inlineData: { data: base64, mimeType } }]);

  return cleanVisionText(result.response.text());
}

async function callGroqVision(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: "qwen/qwen3.6-27b",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: OCR_PROMPT },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      },
    ],
    temperature: 0,
  });

  return cleanVisionText(completion.choices[0]?.message?.content ?? "");
}

export async function extractTextFromImageWithVision(base64: string, mimeType: string): Promise<string> {
  try {
    const text = await withTimeout(callGeminiVision(base64, mimeType), VISION_TIMEOUT_MS, "gemini vision");
    console.log("[visionOcr] served by gemini");
    return text;
  } catch (geminiErr) {
    console.warn("[visionOcr] gemini vision failed, falling back to groq:", (geminiErr as Error).message);
    const text = await callGroqVision(base64, mimeType);
    console.log("[visionOcr] served by groq vision (fallback)");
    return text;
  }
}
