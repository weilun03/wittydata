import type OpenAI from "openai";
import { AI_MODEL, AI_PROVIDER, AiNotConfiguredError, aiClient, type AiProvider } from "@/lib/ai";
import { extractPdfText } from "@/lib/pdf";
import { buildExtractionUserPrompt, EXTRACTION_SYSTEM_PROMPT } from "@/modules/invoice-upload/prompt";
import { sanitizeExtractedInvoice, type ExtractedInvoiceData } from "@/modules/invoice-upload/types";

export interface ExtractionUsage {
  provider: AiProvider;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export class PdfTextExtractionError extends Error {
  constructor() {
    super("Could not read any text from this PDF.");
    this.name = "PdfTextExtractionError";
  }
}

export class AiExtractionRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiExtractionRequestError";
  }
}

// OpenRouter (and some upstream providers behind it) can return a 200 response
// whose body is `{ error: { message, code } }` instead of a real completion —
// e.g. when a free model's shared capacity is exhausted. The openai SDK only
// throws on non-2xx statuses, so this shape sails through as a "successful"
// response and would otherwise crash on `completion.choices[0]`.
function isErrorBody(value: unknown): value is { error: { message?: string; code?: unknown } } {
  return typeof value === "object" && value !== null && "error" in value;
}

// Some free/reasoning models (e.g. OpenRouter's nemotron-3-ultra:free) don't
// support response_format:json_object and/or wrap their answer in prose or a
// ```json fence despite the prompt saying not to. Pull the first {...} block out
// rather than trusting the whole message body to be raw JSON.
function extractJsonBlock(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) return fenceMatch[1];

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1);
  }
  return raw;
}

export async function extractInvoiceData(pdfBuffer: Buffer): Promise<{
  data: ExtractedInvoiceData;
  usage: ExtractionUsage;
}> {
  if (!aiClient || !AI_PROVIDER) {
    throw new AiNotConfiguredError();
  }

  const text = await extractPdfText(pdfBuffer);
  if (!text) {
    throw new PdfTextExtractionError();
  }

  type ExtractionParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    // OpenRouter-only extension, not part of the OpenAI SDK's param types.
    reasoning?: { enabled: boolean };
  };

  const params: ExtractionParams = {
    model: AI_MODEL,
    temperature: 0,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: buildExtractionUserPrompt(text) },
    ],
  };
  if (AI_PROVIDER === "openrouter") {
    // Reasoning models spend their completion budget "thinking" before ever
    // emitting JSON — not useful for a straight extraction task, so opt out
    // where the model allows it (silently ignored otherwise).
    params.reasoning = { enabled: false };
  }

  const completion = await aiClient.chat.completions.create(params);

  if (isErrorBody(completion)) {
    throw new AiExtractionRequestError(
      completion.error.message ?? "The AI provider returned an error.",
    );
  }

  const rawContent = completion.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonBlock(rawContent));
  } catch {
    parsed = {};
  }

  return {
    data: sanitizeExtractedInvoice(parsed),
    usage: {
      provider: AI_PROVIDER,
      model: AI_MODEL,
      promptTokens: completion.usage?.prompt_tokens ?? null,
      completionTokens: completion.usage?.completion_tokens ?? null,
      totalTokens: completion.usage?.total_tokens ?? null,
    },
  };
}
