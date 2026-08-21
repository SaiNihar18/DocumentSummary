import { MAX_FILE_SIZE_BYTES } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return Response.json({ error: "File must be a PDF" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    // Imported dynamically, and only here, so pdf-parse is never evaluated during
    // next build's route/page analysis (its module load path is known to misbehave
    // when eagerly statically imported).
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    const text = data.text?.trim() ?? "";

    if (!text) {
      return Response.json(
        { error: "No extractable text found in PDF (it may be scanned or image-only)" },
        { status: 422 }
      );
    }

    return Response.json({ text });
  } catch (err) {
    console.error("[extract-pdf] failed:", err);
    return Response.json({ error: "Failed to extract text from PDF" }, { status: 500 });
  }
}
