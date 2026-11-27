import {
  createOpenRouter,
  type OpenRouterChatSettings,
  type OpenRouterEmbeddingSettings,
} from "@openrouter/ai-sdk-provider";
import {
  APICallError,
  embed,
  generateText,
  type ModelMessage,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  RetryError,
  TypeValidationError,
} from "ai";

import { createLogger } from "../../infra/logger.js";
import { EMBEDDING_DIMS, fitDimensions } from "../items/vector.js";
import {
  type Analysis,
  AnalysisParseError,
  analysisSchema,
  imageAnalysisSchema,
  normalizeAnalysis,
  type RawAnalysis,
} from "./analysis.schema.js";

/**
 * OpenRouter through the AI SDK. No env access here (tests build a client
 * with a mocked `fetch`); `ai.service.ts` wires the real one.
 *
 * Retry budget, so failures never fan out: the SDK retries a retryable HTTP
 * error once per model, then the fallback model gets one try, then the
 * worker's own backoff (3 attempts over minutes) takes over.
 */

const log = createLogger("ai");

const MAX_SDK_RETRIES = 1;
const COMPLETION_TIMEOUT_MS = 120_000;
const EMBEDDING_TIMEOUT_MS = 30_000;

/** Zero Data Retention and no training on our data, on every request. */
export const PRIVACY_ROUTING = {
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

export interface AiClientOptions {
  apiKey: string;
  /** Injected in tests to inspect request bodies offline. */
  fetch?: typeof globalThis.fetch;
}

export type AiClient = ReturnType<typeof createAiClient>;

/**
 * Per-vendor model settings (learned from benchmarks): never a temperature
 * (with require_parameters some vendors then have no endpoint); openai/*
 * reason with low effort; deepseek/* reason off and only on full or 8-bit
 * precision endpoints (fp4 endpoints produced garbage).
 */
export function chatSettings(modelId: string): OpenRouterChatSettings {
  const vendor = modelId.split("/")[0]?.toLowerCase() ?? "";
  const base: OpenRouterChatSettings = {
    provider: { ...PRIVACY_ROUTING },
    usage: { include: true },
    structuredOutputs: { strict: true },
  };
  if (vendor === "openai") return { ...base, reasoning: { effort: "low" } };
  if (vendor === "deepseek") {
    return {
      ...base,
      // OpenRouter's "reasoning off" (the provider's type insists on an
      // effort or budget, which would turn reasoning back on).
      reasoning: { enabled: false } as OpenRouterChatSettings["reasoning"],
      provider: { ...PRIVACY_ROUTING, quantizations: ["fp8", "bf16", "fp16"] },
    };
  }
  return base;
}

export function embeddingSettings(): OpenRouterEmbeddingSettings {
  return {
    provider: { ...PRIVACY_ROUTING },
    // Matryoshka models return this size; others are truncated + renormalized.
    extraBody: { dimensions: EMBEDDING_DIMS },
  };
}

export function createAiClient(options: AiClientOptions) {
  const openrouter = createOpenRouter({
    apiKey: options.apiKey,
    headers: { "HTTP-Referer": "https://norsumi.com", "X-Title": "norsumi" },
    ...(options.fetch && { fetch: options.fetch }),
  });
  return {
    chat: (modelId: string) => openrouter.chat(modelId, chatSettings(modelId)),
    embedding: (modelId: string) =>
      openrouter.textEmbeddingModel(modelId, embeddingSettings()),
  };
}

/** Maps SDK/provider errors onto the worker's transient/permanent split. */
export function toAiError(error: unknown): Error {
  if (error instanceof AiError || error instanceof AnalysisParseError) {
    return error;
  }
  if (RetryError.isInstance(error)) return toAiError(error.lastError);
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    const transient =
      error.isRetryable ||
      status === undefined ||
      status === 408 ||
      status === 429 ||
      status >= 500;
    // Provider messages describe the failure, never our payload.
    return new AiError(
      `AI provider error${status ? ` ${status}` : ""}: ${error.message.slice(0, 200)}`,
      transient,
      status,
    );
  }
  if (
    NoObjectGeneratedError.isInstance(error) ||
    NoOutputGeneratedError.isInstance(error) ||
    TypeValidationError.isInstance(error)
  ) {
    return new AnalysisParseError("Model output does not match the schema");
  }
  if (error instanceof Error && /Timeout|Abort/.test(error.name)) {
    return new AiError("AI request timed out", true);
  }
  return new AiError(
    `AI request failed: ${error instanceof Error ? error.name : "unknown"}`,
    true,
  );
}

/** Internal processing metadata stored on the item (never in the API). */
export interface AiUsage {
  model: string;
  fallbackUsed: boolean;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  /** USD, summed over every attempt that reported a cost. */
  cost: number;
}

export interface AnalysisResult {
  analysis: Analysis;
  usage: AiUsage;
}

function costOf(metadata: unknown): number {
  const cost = (metadata as { openrouter?: { usage?: { cost?: unknown } } })
    ?.openrouter?.usage?.cost;
  return typeof cost === "number" ? cost : 0;
}

/**
 * One structured completion: the primary model, then once the fallback
 * (each with its own vendor settings) when the primary errors or returns
 * output that does not match the schema.
 */
export async function generateAnalysis(
  client: AiClient,
  options: {
    models: { primary: string; fallback?: string };
    system: string;
    user: ModelMessage["content"];
    includeText: boolean;
    label: string;
    timeoutMs?: number;
  },
): Promise<AnalysisResult> {
  const candidates = [options.models.primary];
  if (
    options.models.fallback &&
    options.models.fallback !== options.models.primary
  ) {
    candidates.push(options.models.fallback);
  }
  const schema = options.includeText ? imageAnalysisSchema : analysisSchema;

  let cost = 0;
  let latencyMs = 0;
  let lastError: Error = new AiError("No AI model configured", false);
  for (const [index, modelId] of candidates.entries()) {
    const started = Date.now();
    try {
      const result = await generateText({
        model: client.chat(modelId),
        system: options.system,
        messages: [{ role: "user", content: options.user } as ModelMessage],
        output: Output.object({ schema, name: "norsumi_item" }),
        maxOutputTokens: options.includeText ? 4000 : 1500,
        maxRetries: MAX_SDK_RETRIES,
        abortSignal: AbortSignal.timeout(
          options.timeoutMs ?? COMPLETION_TIMEOUT_MS,
        ),
      });
      const attemptMs = Date.now() - started;
      latencyMs += attemptMs;
      cost += costOf(result.providerMetadata);
      const usage: AiUsage = {
        model: result.response.modelId ?? modelId,
        fallbackUsed: index > 0,
        latencyMs,
        promptTokens: result.usage.inputTokens ?? 0,
        completionTokens: result.usage.outputTokens ?? 0,
        cost,
      };
      log.info(
        {
          label: options.label,
          model: usage.model,
          latencyMs: attemptMs,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          cost: costOf(result.providerMetadata),
          finish: result.finishReason,
        },
        "AI completion",
      );
      return {
        analysis: normalizeAnalysis(result.output as RawAnalysis),
        usage,
      };
    } catch (error) {
      latencyMs += Date.now() - started;
      lastError = toAiError(error);
      if (index < candidates.length - 1) {
        log.warn(
          { label: options.label, model: modelId, err: lastError.message },
          "Primary model failed, trying fallback",
        );
      }
    }
  }
  throw lastError;
}

export interface EmbeddingResult {
  vector: number[];
  cost: number | null;
}

/** One embedding, fitted to EMBEDDING_DIMS (L2-normalized when truncated). */
export async function embedText(
  client: AiClient,
  options: {
    model: string;
    value: string;
    label: string;
    timeoutMs?: number;
    maxRetries?: number;
  },
): Promise<EmbeddingResult> {
  const started = Date.now();
  try {
    const result = await embed({
      model: client.embedding(options.model),
      value: options.value,
      maxRetries: options.maxRetries ?? MAX_SDK_RETRIES,
      abortSignal: AbortSignal.timeout(
        options.timeoutMs ?? EMBEDDING_TIMEOUT_MS,
      ),
    });
    if (result.embedding.length === 0) {
      throw new AiError("AI returned no embedding", true);
    }
    const cost = costOf(result.providerMetadata);
    log.debug(
      {
        label: options.label,
        latencyMs: Date.now() - started,
        dims: result.embedding.length,
        cost,
      },
      "AI embedding",
    );
    return { vector: fitDimensions(result.embedding), cost };
  } catch (error) {
    throw toAiError(error);
  }
}
