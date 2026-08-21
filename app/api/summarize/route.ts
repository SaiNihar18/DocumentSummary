import { getSummary, SummarizeError } from "@/lib/summarize";
import type { SummaryLength } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VALID_LENGTHS: SummaryLength[] = ["short", "medium", "long"];

export async function POST(req: Request) {
  let body: { text?: unknown; length?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text;
  const length = body.length;

  if (typeof text !== "string" || text.trim().length === 0) {
    return Response.json({ error: "No text provided to summarize" }, { status: 400 });
  }
  if (typeof length !== "string" || !VALID_LENGTHS.includes(length as SummaryLength)) {
    return Response.json({ error: "Invalid length parameter" }, { status: 400 });
  }

  try {
    const result = await getSummary(text, length as SummaryLength);
    return Response.json(result);
  } catch (err) {
    if (err instanceof SummarizeError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    console.error("[api/summarize] unexpected error:", err);
    return Response.json({ error: "Unexpected error while summarizing" }, { status: 500 });
  }
}
