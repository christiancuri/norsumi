import type { ItemKind } from "@norsumi/common";

import { Env } from "../../infra/env.js";
import { createLogger } from "../../infra/logger.js";
import {
  type CategoryDoc,
  loadCategories,
} from "../categories/categories.service.js";
import {
  type Analysis,
  AnalysisParseError,
  analysisJsonSchema,
  parseAnalysis,
} from "./analysis.schema.js";
import { AiError, type ChatMessage, chatJson } from "./openrouter.js";
import {
  buildSystemPrompt,
  imageUserText,
  type LinkPromptInput,
  linkUserText,
  noteUserText,
  type TreeNode,
} from "./prompt.js";

const log = createLogger("ai");

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

export function buildTree(categories: CategoryDoc[]): TreeNode[] {
  const roots = categories.filter((c) => !c.parentId);
  return roots.map((root) => ({
    id: root._id.toString(),
    name: root.name,
    emoji: root.emoji,
    description: root.description ?? null,
    children: categories
      .filter((c) => c.parentId?.toString() === root._id.toString())
      .map((child) => ({
        id: child._id.toString(),
        name: child.name,
        emoji: child.emoji,
        description: child.description ?? null,
        children: [],
      })),
  }));
}

/**
 * Tries the primary model, then once the fallback (with its own vendor
 * parameters) when the primary errors or returns unusable output.
 */
async function run(
  userId: string,
  kind: ItemKind,
  models: { primary: string; fallback?: string },
  user: ChatMessage["content"],
  includeText: boolean,
  label: string,
): Promise<AnalysisResult> {
  const tree = buildTree(await loadCategories(userId));
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(tree, kind) },
    { role: "user", content: user },
  ];
  const candidates = [models.primary];
  if (models.fallback && models.fallback !== models.primary) {
    candidates.push(models.fallback);
  }

  let cost = 0;
  let latencyMs = 0;
  let lastError: unknown;
  for (const [index, model] of candidates.entries()) {
    try {
      const result = await chatJson({
        model,
        label,
        messages,
        schemaName: "norsumi_item",
        schema: analysisJsonSchema({ includeText }),
        maxTokens: includeText ? 4000 : 1500,
      });
      cost += result.cost ?? 0;
      latencyMs += result.latencyMs;
      const analysis = parseAnalysis(result.content);
      return {
        analysis,
        usage: {
          model: result.model,
          fallbackUsed: index > 0,
          latencyMs,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          cost,
        },
      };
    } catch (error) {
      lastError = error;
      if (!(error instanceof AiError || error instanceof AnalysisParseError)) {
        throw error;
      }
      if (index < candidates.length - 1) {
        log.warn(
          { label, model, err: error.message },
          "Primary model failed, trying fallback",
        );
      }
    }
  }
  throw lastError;
}

export function analyzeImage(
  userId: string,
  kind: "screenshot" | "image",
  jpeg: Buffer,
  capturedAt: Date,
): Promise<AnalysisResult> {
  return run(
    userId,
    kind,
    { primary: Env.AI_VISION_MODEL, fallback: Env.AI_VISION_FALLBACK_MODEL },
    [
      { type: "text", text: imageUserText({ kind, capturedAt }) },
      {
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` },
      },
    ],
    true,
    kind,
  );
}

const textModels = () => ({
  primary: Env.AI_TEXT_MODEL,
  fallback: Env.AI_TEXT_FALLBACK_MODEL,
});

export function analyzeLink(
  userId: string,
  input: LinkPromptInput,
): Promise<AnalysisResult> {
  return run(userId, "link", textModels(), linkUserText(input), false, "link");
}

export function analyzeNote(
  userId: string,
  text: string,
  capturedAt: Date,
): Promise<AnalysisResult> {
  return run(
    userId,
    "note",
    textModels(),
    noteUserText(text, { kind: "note", capturedAt }),
    false,
    "note",
  );
}
