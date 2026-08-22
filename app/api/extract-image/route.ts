import { extractTextFromImageWithVision } from "@/lib/visionOcr";
import { MAX_FILE_SIZE_BYTES } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    return Response.json({ error: "File must be a JPG or PNG" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  try {
    const text = await extractTextFromImageWithVision(base64, file.type);
    if (!text) {
      return Response.json({ error: "No readable text detected in the image" }, { status: 422 });
    }
    return Response.json({ text });
  } catch (err) {
    console.error("[extract-image] failed:", err);
    return Response.json({ error: "Failed to read text from the image" }, { status: 500 });
  }
}
