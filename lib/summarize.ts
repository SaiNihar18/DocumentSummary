import type { Provider, SummaryLength, SummaryResult } from "@/lib/types";

const MAX_INPUT_CHARS = 30_000;
const PRIMARY_TIMEOUT_MS = 15_000;

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
    "Accuracy and structural formatting rules:",
    "- Accurately preserve all numbers, metrics, calculations, tabular data, formulas, names, and key facts.",
    "- If the document includes tables, matrices, multiplication tables, or structured comparisons, represent them as a Markdown table inside the \"summary\" string: a header row, a separator row of dashes (e.g. |---|---|), and one row per data row, using | to separate columns. Preserve exact values.",
    "- Ensure clear, readable formatting and do not omit critical numerical data.",
    "Respond ONLY with valid JSON matching exactly this shape, no markdown fences, no commentary:",
    '{"summary": "string", "keyPoints": ["string", "..."]}',
    "---DOCUMENT TEXT START---",
    text,
    "---DOCUMENT TEXT END---",
  ].join("\n\n");
}


function parseSummaryJson(raw: string, provider: Provider): Omit<SummaryResult, "truncated"> {
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

async function callGemini(text: string, length: SummaryLength): Promise<Omit<SummaryResult, "truncated">> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new SummarizeError("GEMINI_API_KEY is not configured");
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-lite-latest",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(buildPrompt(text, length));
  const raw = result.response.text();
  return parseSummaryJson(raw, "gemini");
}

async function callGroq(text: string, length: SummaryLength): Promise<Omit<SummaryResult, "truncated">> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new SummarizeError("GROQ_API_KEY is not configured");
  }

  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
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

  const wasTruncated = text.length > MAX_INPUT_CHARS;
  const truncatedText = text.slice(0, MAX_INPUT_CHARS);

  try {
    const result = await withTimeout(callGroq(truncatedText, length), PRIMARY_TIMEOUT_MS, "groq");
    console.log("[getSummary] served by groq");
    return { ...result, truncated: wasTruncated };
  } catch (groqErr) {
    console.warn("[getSummary] groq failed, falling back to gemini:", (groqErr as Error).message);

    try {
      const result = await callGemini(truncatedText, length);
      console.log("[getSummary] served by gemini (fallback)");
      return { ...result, truncated: wasTruncated };
    } catch (geminiErr) {
      console.error("[getSummary] both providers failed:", (geminiErr as Error).message);
      throw new SummarizeError("Both Groq and Gemini failed to summarize the document", {
        groqErr,
        geminiErr,
      });
    }
  }
}
