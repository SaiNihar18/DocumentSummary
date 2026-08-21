# DocSum

Upload a PDF, JPG, or PNG and get an AI-generated summary with key points in seconds.

## Features

- Drag-and-drop or click-to-browse file upload (PDF / JPG / PNG, 10MB max), with client-side validation
- PDF text extraction on the server (`pdf-parse`)
- Image OCR in the browser (`tesseract.js`) — no server round trip, no API key
- Summarization with a Gemini primary provider and an automatic Groq fallback
- Adjustable summary length (short / medium / long)
- Copy-to-clipboard, "Powered by Gemini/Groq" tag, and clear error states for every failure mode

## Tech Stack

Next.js 14 (App Router, TypeScript), Tailwind CSS, `pdf-parse`, `tesseract.js`, `@google/generative-ai` (Gemini `gemini-1.5-flash`), `groq-sdk` (`llama-3.3-70b-versatile`). Deployed on Vercel.

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Add API keys locally**

   Copy the example env file and fill in your own keys:

   ```bash
   cp .env.example .env.local
   ```

   - `GEMINI_API_KEY` — get one from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - `GROQ_API_KEY` — get one from [Groq Console](https://console.groq.com/keys)

   `.env.local` is gitignored and never committed.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Import this repository into Vercel.
2. In **Project Settings → Environment Variables**, add `GEMINI_API_KEY` and `GROQ_API_KEY` for both the Production and Preview environments.
3. Deploy. No build configuration changes are needed.

Note: the `/api/summarize` route sets `maxDuration = 30` to leave enough headroom for the 15-second Gemini timeout plus a Groq fallback round trip. Vercel's Hobby plan caps function duration at 10 seconds regardless of this setting — on Hobby, a slow Gemini response followed by a Groq fallback can occasionally time out. Upgrading to Pro (or higher) honors the 30-second setting.

## Architecture Overview

```
Upload (client)
  ├─ PDF  → POST /api/extract-pdf (server, pdf-parse) → extracted text
  └─ Image → tesseract.js OCR (client, in-browser)      → extracted text
                          │
                          ▼
              POST /api/summarize { text, length }
                          │
                          ▼
                    getSummary()
                 ┌──────────────┐
                 │ Gemini (15s) │──fails/timeout──┐
                 └──────────────┘                 ▼
                                              Groq (fallback)
                          │
                          ▼
        { summary, keyPoints, provider } → UI result view
```

The UI is a single client component (`DocSumApp`) driven by one `useReducer` state machine with five states: `idle → extracting → summarizing → result`, with `error` reachable from any step. Presentational components (`UploadZone`, `LengthSelector`, `ProgressSpinner`, `ResultView`, `ErrorBanner`) are stateless and controlled entirely by props.

## Why Gemini + Groq Fallback

Gemini Flash is the primary provider — cheap, fast, and good at following the structured JSON format we ask for. But any hosted API can throw, rate-limit, or hang, and a document summarizer that just shows an error the moment that happens isn't reliable enough to actually use. Groq's hosted Llama 3.3 70B is a fast, differently-rate-limited backup: if Gemini errors, returns a 429, or doesn't respond within 15 seconds, the app automatically retries the same request against Groq with an equivalent prompt, and tells the user which provider actually served the summary.

## Approach

The two extraction paths landed on opposite sides of the client/server boundary for a reason: `pdf-parse` depends on Node APIs, so it can only run server-side, while `tesseract.js` runs entirely in the browser via WebAssembly, which keeps OCR free, keyless, and off the server's compute budget. Summarization is centralized behind a single `getSummary()` function so the Gemini-then-Groq fallback, the 15-second timeout, and provider logging all live in one place — a route handler shouldn't need to know how the fallback works, just that it gets a result or an error back. Both providers are asked for strict JSON (via each SDK's native JSON mode) rather than parsed out of free-form prose, because prompt-engineered formatting is a much less reliable contract than a mode the API itself enforces; a regex-based fallback parser is kept as a last resort in case a response still doesn't come back clean. The upload UI is hand-rolled HTML5 drag-and-drop instead of a dependency, since the whole interaction is one drop zone and one file input — not enough surface area to justify a library. The biggest tradeoff is state management: a single `useReducer` in one top-level component keeps the five-stage flow (idle/extracting/summarizing/result/error) easy to reason about at the cost of that component knowing about every step, which is fine at this size but wouldn't scale to a more branching flow.

## Known Limitations

- **Vercel body size limit**: the app validates PDFs up to 10MB client-side, but Vercel's serverless functions cap request bodies at roughly 4.5MB. PDFs larger than that will fail to upload to `/api/extract-pdf` with a 413 even though local validation passed.
- **tesseract.js requires network access**: OCR fetches its worker, core, and language data from a CDN (jsDelivr) at runtime. A restrictive network (e.g. a corporate firewall) can block this and cause OCR to fail.
- **Scanned/image-only PDFs aren't supported**: `pdf-parse` only extracts embedded text layers; a PDF that's just a scanned image with no text layer will return no extractable text.
- **English-only OCR**: images are OCR'd with the English (`eng`) language pack only, no auto-detection or language selection.
- **No persistence**: summaries live only in the current browser session and aren't saved anywhere.
- **Hobby-plan timeout risk**: see the deployment note above — the Gemini timeout plus Groq fallback can exceed Vercel Hobby's 10-second function limit on a slow request.

## Environment Variables

| Variable | Required | Used by | Where to get it |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | `/api/summarize` (primary) | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `GROQ_API_KEY` | Yes | `/api/summarize` (fallback) | [Groq Console](https://console.groq.com/keys) |

Both are read server-side only and are never exposed to the client.
