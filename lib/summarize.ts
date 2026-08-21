import type { Provider, SummaryLength, SummaryResult } from "@/lib/types";

const MAX_INPUT_CHARS = 30_000;
const GEMINI_TIMEOUT_MS = 15_000;

export class SummarizeError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "SummarizeError";
    this.cause = cause;
  }
}

function buildPrompt(text: string, length: SummaryLength): string {
  const lengthSpec: Record<SummaryLength, string> = {
    short: "Write a summary in 2-3 sentences and list exactly 3 key points.",
    medium: "Write a summary in 1-2 short paragraphs and list 4-6 key points.",
    long: "Write a summary in 3-4 paragraphs and list 6-10 key points.",
  };

  return [
    "You are a precise document summarization assistant.",
    lengthSpec[length],
    "Respond ONLY with valid JSON matching exactly this shape, no markdown fences, no commentary:",
    '{"summary": "string", "keyPoints": ["string", "..."]}',
    "---DOCUMENT TEXT START---",
    text,
    "---DOCUMENT TEXT END---",
  ].join("\n\n");
}

function parseSummaryJson(raw: string, provider: Provider): SummaryResult {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        // fall through to the validation error below
      }
    }
  }

  const candidate = parsed as { summary?: unknown; keyPoints?: unknown } | undefined;

  if (!candidate || typeof candidate.summary !== "string" || !Array.isArray(candidate.keyPoints)) {
    throw new SummarizeError(`${provider} returned malformed JSON`);
  }

  return {
    summary: candidate.summary,
    keyPoints: candidate.keyPoints.filter((p): p is string => typeof p === "string"),
    provider,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new SummarizeError(`${label} timed out after ${ms}ms`));
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

async function callGemini(text: string, length: SummaryLength): Promise<SummaryResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new SummarizeError("GEMINI_API_KEY is not configured");
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(buildPrompt(text, length));
  const raw = result.response.text();
  return parseSummaryJson(raw, "gemini");
}

async function callGroq(text: string, length: SummaryLength): Promise<SummaryResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new SummarizeError("GROQ_API_KEY is not configured");
  }

  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: buildPrompt(text, length) }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  return parseSummaryJson(raw, "groq");
}

export async function getSummary(text: string, length: SummaryLength): Promise<SummaryResult> {
  if (!text || text.trim().length === 0) {
    throw new SummarizeError("No text to summarize");
  }

  const truncated = text.slice(0, MAX_INPUT_CHARS);

  try {
    const result = await withTimeout(callGemini(truncated, length), GEMINI_TIMEOUT_MS, "gemini");
    console.log("[getSummary] served by gemini");
    return result;
  } catch (geminiErr) {
    console.warn("[getSummary] gemini failed, falling back to groq:", (geminiErr as Error).message);

    try {
      const result = await callGroq(truncated, length);
      console.log("[getSummary] served by groq (fallback)");
      return result;
    } catch (groqErr) {
      console.error("[getSummary] both providers failed:", (groqErr as Error).message);
      throw new SummarizeError("Both Gemini and Groq failed to summarize the document", {
        geminiErr,
        groqErr,
      });
    }
  }
}
