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

  // Imported dynamically, and only here, so pdf-parse is never evaluated during
  // next build's route/page analysis.
  const { PDFParse, PasswordException } = await import("pdf-parse");
  // CanvasFactory must be passed explicitly in Node/serverless environments, or pdfjs-dist's
  // internal matrix math throws "DOMMatrix is not defined" (DOMMatrix is a browser-only global).
  const { CanvasFactory } = await import("pdf-parse/worker");
  const parser = new PDFParse({ data: buffer, CanvasFactory });

  try {
    // pageJoiner defaults to a "-- N of M --" marker between pages, which is non-empty
    // even for a blank/scanned PDF and would defeat the empty-text check below.
    const result = await parser.getText({ pageJoiner: "" });
    const text = result.text?.trim() ?? "";

    if (!text) {
      return Response.json(
        { error: "No extractable text found in PDF (it may be scanned or image-only)" },
        { status: 422 }
      );
    }

    return Response.json({ text });
  } catch (err) {
    if (err instanceof PasswordException) {
      return Response.json({ error: "This PDF is password-protected and can't be read" }, { status: 422 });
    }
    console.error("[extract-pdf] failed:", err);
    return Response.json({ error: "Failed to extract text from PDF" }, { status: 500 });
  } finally {
    await parser.destroy();
  }
}
