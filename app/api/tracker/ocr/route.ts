import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyAuthToken } from "@/lib/jwt";

export const runtime = "nodejs";

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const GROQ_MODEL = process.env.RECEIPT_LLM_MODEL || "llama-3.1-70b-versatile";
const GROQ_RATE_LIMIT_MAX = 20;

const GROQ_TEXT_PROMPT =
  "You are a receipt parser. Extract expense data from the following receipt text and return ONLY a valid JSON object with these fields: amount (number), date (YYYY-MM-DD string), merchant (string), category (one of: Food, Groceries, Transport, Utilities, Shopping, Healthcare, Entertainment, Other), notes (string, brief description). If a field cannot be determined, use null. Return only the JSON object, no explanation, no markdown.\n\nReceipt text:\n{TEXT}";

const structuredExpenseSchema = z.object({
  amount: z.number().positive().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  merchant: z.string().min(1).nullable(),
  category: z
    .enum([
      "Food",
      "Groceries",
      "Transport",
      "Utilities",
      "Shopping",
      "Healthcare",
      "Entertainment",
      "Other",
    ])
    .nullable(),
  notes: z.string().nullable(),
});

type StructuredExpense = z.infer<typeof structuredExpenseSchema>;

type ModelName = "groq";
type ModelUsed = "tesseract+groq" | "pdfjs+groq";

type Counter = { count: number; resetAt: number };

const WINDOW_MS = 60_000;
const counters = new Map<string, Counter>();
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

// ── API key presence checks (logged once at startup) ──────────────────────────
if (!GROQ_API_KEY) console.warn("[OCR] GROQ_API_KEY is not set — OCR extraction will fail");
// ─────────────────────────────────────────────────────────────────────────────

class HttpStatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function makeRateKey(userId: string, model: ModelName) {
  return `${userId}:${model}`;
}

function consumeRateLimit(userId: string, model: ModelName, max: number): boolean {
  // Avoid unbounded growth in long-lived Node processes.
  const now = Date.now();
  for (const [key, counter] of counters) {
    if (now >= counter.resetAt) counters.delete(key);
  }

  const key = makeRateKey(userId, model);
  const current = counters.get(key);

  if (!current || now >= current.resetAt) {
    counters.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (current.count >= max) return false;

  current.count += 1;
  return true;
}

function parseJsonSafely(raw: string): StructuredExpense {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Unexpected AI response format");
  }

  const validation = structuredExpenseSchema.safeParse(parsed);
  if (!validation.success) {
    throw new Error("Unexpected AI response format");
  }
  return validation.data;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function getUserIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  try {
    const payload = await verifyAuthToken(token);
    const userId = payload.userId;
    return typeof userId === "string" && userId.trim() ? userId : null;
  } catch {
    return null;
  }
}

async function extractTextFromPdf(fileBuffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fileBuffer),
    disableWorker: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  } as any);
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter((value) => typeof value === "string" && value.trim())
      .join(" ");
    if (pageText.trim()) pages.push(pageText.trim());
  }

  const fullText = pages.join("\n").trim();
  if (!fullText) {
    throw new Error("No readable text found in PDF");
  }
  return fullText;
}

async function extractTextFromImage(fileBuffer: Buffer): Promise<{ text: string; confidence: number }> {
  const { default: Tesseract } = await import("tesseract.js");
  const result = await Tesseract.recognize(fileBuffer, "eng");
  const text = result.data.text?.trim() ?? "";
  const confidence = Number.isFinite(result.data.confidence) ? result.data.confidence : 0;

  if (!text) {
    throw new Error("Unable to read text from image");
  }

  return { text, confidence };
}

async function callGroqForJson(receiptText: string): Promise<StructuredExpense> {
  if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: GROQ_TEXT_PROMPT.replace("{TEXT}", receiptText),
        },
      ],
    }),
  });

  const json = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : `Groq request failed (${response.status})`;
    throw new HttpStatusError(response.status, message);
  }

  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Unexpected AI response format");
  }
  return parseJsonSafely(content);
}

function successResponse(data: StructuredExpense, modelUsed: ModelUsed) {
  return NextResponse.json(
    { success: true, data, modelUsed },
    { status: 200, headers: { "X-OCR-Model-Used": modelUsed } }
  );
}

export async function POST(request: Request) {
  const userId = await getUserIdFromCookie();
  if (!userId) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("File is required", 400);
    }

    if (!file.type) {
      return jsonError("Unsupported file type", 400);
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    if (!fileBuffer.length) {
      return jsonError("Uploaded file is empty", 400);
    }
    if (fileBuffer.length > MAX_UPLOAD_SIZE_BYTES) {
      return jsonError("File too large. Max size is 10MB.", 413);
    }

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      return jsonError("Unsupported file type", 400);
    }

    if (!GROQ_API_KEY) {
      return jsonError("OCR extraction service is not configured.", 503);
    }
    if (!consumeRateLimit(userId, "groq", GROQ_RATE_LIMIT_MAX)) {
      return jsonError("Too many OCR requests. Please wait a moment and try again.", 429);
    }

    if (isPdf) {
      const extractedText = await extractTextFromPdf(fileBuffer);
      try {
        const data = await callGroqForJson(extractedText);
        return successResponse(data, "pdfjs+groq");
      } catch (error) {
        console.error("[OCR] Groq PDF failed:", error instanceof Error ? error.message : error);
        if (error instanceof HttpStatusError && error.status === 429) {
          return jsonError("AI extraction unavailable right now. Please try again shortly.", 429);
        }
        const message = error instanceof Error ? error.message : "Failed to process PDF";
        return jsonError(message, error instanceof HttpStatusError ? error.status : 500);
      }
    }

    const { text: ocrText, confidence } = await extractTextFromImage(fileBuffer);
    if (confidence < 20) {
      return jsonError("Unable to extract readable text from image.", 422);
    }

    try {
      const data = await callGroqForJson(ocrText);
      return successResponse(data, "tesseract+groq");
    } catch (error) {
      console.error("[OCR] Groq image failed:", error instanceof Error ? error.message : error);
      if (error instanceof HttpStatusError && error.status === 429) {
        return jsonError("AI extraction unavailable right now. Please try again shortly.", 429);
      }
      const message = error instanceof Error ? error.message : "Failed to process receipt";
      return jsonError(message, error instanceof HttpStatusError ? error.status : 500);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process upload";
    return jsonError(message, 400);
  }
}