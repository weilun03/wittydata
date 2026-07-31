import OpenAI from "openai";

export type AiProvider = "openai" | "openrouter";

const openAiKey = process.env.OPENAI_API_KEY || null;
const openRouterKey = process.env.OPENROUTER_API_KEY || null;

// OpenAI is preferred when both are configured; otherwise fall back to OpenRouter.
export const AI_PROVIDER: AiProvider | null = openAiKey ? "openai" : openRouterKey ? "openrouter" : null;

export const AI_MODEL =
  process.env.AI_MODEL || (AI_PROVIDER === "openrouter" ? "openai/gpt-4o-mini" : "gpt-4o-mini");

export const aiClient: OpenAI | null =
  AI_PROVIDER === "openai"
    ? new OpenAI({ apiKey: openAiKey! })
    : AI_PROVIDER === "openrouter"
      ? new OpenAI({ apiKey: openRouterKey!, baseURL: "https://openrouter.ai/api/v1" })
      : null;

export class AiNotConfiguredError extends Error {
  constructor() {
    super("No AI provider configured. Set OPENAI_API_KEY or OPENROUTER_API_KEY.");
    this.name = "AiNotConfiguredError";
  }
}
