import { Env } from "../../infra/env.js";
import { createLogger } from "../../infra/logger.js";
import { EMBEDDING_DIMS, fitDimensions } from "../items/vector.js";

/**
 * Minimal OpenRouter client over fetch. Every request enforces Zero Data
 * Retention and no training on our data. Payload contents are never logged:
 * only model, latency, token counts and cost.
 */

const BASE_URL = "https://openrouter.ai/api/v1";
const log = createLogger("openrouter");

const PROVIDER_PREFS = {
  zdr: true,
  data_collection: "deny",
  require_parameters: true,
} as const;

export class AiError extends Error {
  constructor(
    message: string,
    /** Worth retrying later (rate limit, 5xx, network, timeout). */
    public readonly transient: boolean,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

function headers(): Record<string, string> {
  return {
    authorization: `Bearer ${Env.OPENROUTER_API_KEY}`,
    "content-type": "application/json",
    "HTTP-Referer": "https://norsumi.com",
    "X-Title": "norsumi",
  };
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function post<T>(
  path: string,
  body: unknown,
  timeoutMs: number,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    throw new AiError(
      timeout ? "AI request timed out" : "AI provider unreachable",
      true,
    );
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AiError(
      `AI provider returned ${res.status}`,
      isTransientStatus(res.status),
      res.status,
    );
  }
  const apiError = (json as { error?: { message?: string; code?: number } })
    .error;
  if (!res.ok || apiError) {
    const status = apiError?.code ?? res.status;
    // Provider error messages describe the failure, not our payload.
    const message = (apiError?.message ?? `HTTP ${res.status}`).slice(0, 200);
    throw new AiError(
      `AI provider error: ${message}`,
      isTransientStatus(status),
      status,
    );
  }
  return json as T;
}

export type ChatContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export interface ChatMessage {
  role: "system" | "user";
  content: ChatContent;
}

export interface ChatResult {
  content: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  cost: number | null;
}

interface ChatResponse {
  model?: string;
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string | null };
    error?: { message?: string; code?: number };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
}

/**
 * Per-vendor request parameters (learned from benchmarks):
 * - no `temperature`: with require_parameters some vendors have no endpoint;
 * - openai/*: low reasoning effort;
 * - deepseek/*: reasoning off, and only full/8-bit precision endpoints
 *   (fp4-quantized endpoints produced garbage).
 */
export function modelParams(model: string): {
  reasoning?: Record<string, unknown>;
  provider: Record<string, unknown>;
} {
  const vendor = model.split("/")[0]?.toLowerCase() ?? "";
  if (vendor === "openai") {
    return { reasoning: { effort: "low" }, provider: { ...PROVIDER_PREFS } };
  }
  if (vendor === "deepseek") {
    return {
      reasoning: { enabled: false },
      provider: { ...PROVIDER_PREFS, quantizations: ["fp8", "bf16", "fp16"] },
    };
  }
  return { provider: { ...PROVIDER_PREFS } };
}

/** One structured-output completion against a single model. */
export async function chatJson(options: {
  model: string;
  messages: ChatMessage[];
  schemaName: string;
  schema: unknown;
  maxTokens?: number;
  timeoutMs?: number;
  label: string;
}): Promise<ChatResult> {
  const started = Date.now();
  const res = await post<ChatResponse>(
    "/chat/completions",
    {
      model: options.model,
      messages: options.messages,
      ...modelParams(options.model),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: options.schemaName,
          strict: true,
          schema: options.schema,
        },
      },
      max_tokens: options.maxTokens ?? 4000,
      usage: { include: true },
    },
    options.timeoutMs ?? 120_000,
  );
  const latencyMs = Date.now() - started;
  const choice = res.choices?.[0];
  if (choice?.error) {
    const status = choice.error.code ?? 502;
    throw new AiError(
      `AI provider error: ${(choice.error.message ?? "unknown").slice(0, 200)}`,
      isTransientStatus(status),
      status,
    );
  }
  const content = choice?.message?.content;
  if (!content) throw new AiError("AI returned an empty response", true);

  const result: ChatResult = {
    content,
    model: res.model ?? options.model,
    latencyMs,
    promptTokens: res.usage?.prompt_tokens ?? 0,
    completionTokens: res.usage?.completion_tokens ?? 0,
    cost: res.usage?.cost ?? null,
  };
  log.info(
    {
      label: options.label,
      model: result.model,
      latencyMs,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      cost: result.cost,
      finish: choice?.finish_reason,
    },
    "AI completion",
  );
  return result;
}

interface EmbeddingResponse {
  model?: string;
  data?: Array<{ embedding?: number[] }>;
  usage?: { prompt_tokens?: number; cost?: number };
}

export interface EmbeddingResult {
  vector: number[];
  cost: number | null;
}

export async function embed(
  input: string,
  label: string,
  timeoutMs = 30_000,
): Promise<EmbeddingResult> {
  const started = Date.now();
  const res = await post<EmbeddingResponse>(
    "/embeddings",
    {
      model: Env.AI_EMBEDDING_MODEL,
      input,
      // Matryoshka models return this size; others are truncated below.
      dimensions: EMBEDDING_DIMS,
      provider: PROVIDER_PREFS,
    },
    timeoutMs,
  );
  const raw = res.data?.[0]?.embedding;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new AiError("AI returned no embedding", true);
  }
  const vector = fitDimensions(raw);
  log.debug(
    {
      label,
      model: res.model,
      latencyMs: Date.now() - started,
      dims: raw.length,
      tokens: res.usage?.prompt_tokens,
      cost: res.usage?.cost,
    },
    "AI embedding",
  );
  return { vector, cost: res.usage?.cost ?? null };
}
