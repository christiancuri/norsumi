import type { ItemKind } from "@norsumi/common";
import type { ModelMessage } from "ai";

import { Env } from "../../infra/env.js";
import {
  CategoriesService,
  type CategoryDoc,
} from "../categories/categories.service.js";
import {
  type AiClient,
  type AnalysisResult,
  createAiClient,
  type EmbeddingResult,
  embedText,
  generateAnalysis,
} from "./ai.client.js";
import {
  buildSystemPrompt,
  imageUserText,
  type LinkPromptInput,
  linkUserText,
  noteUserText,
  type TreeNode,
} from "./prompt.js";

export type { AiUsage, AnalysisResult, EmbeddingResult } from "./ai.client.js";

let client: AiClient | null = null;
const getClient = (): AiClient =>
  (client ??= createAiClient({ apiKey: Env.OPENROUTER_API_KEY }));

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

async function analyze(
  userId: string,
  kind: ItemKind,
  models: { primary: string; fallback?: string },
  user: ModelMessage["content"],
  includeText: boolean,
): Promise<AnalysisResult> {
  const tree = buildTree(await CategoriesService.loadCategories(userId));
  return generateAnalysis(getClient(), {
    models,
    system: buildSystemPrompt(tree, kind),
    user,
    includeText,
    label: kind,
  });
}

const textModels = () => ({
  primary: Env.AI_TEXT_MODEL,
  fallback: Env.AI_TEXT_FALLBACK_MODEL,
});

/** Screenshot/photo: downscaled JPEG as an image part, plus the OCR text. */
export function analyzeImage(
  userId: string,
  kind: "screenshot" | "image",
  jpeg: Buffer,
  capturedAt: Date,
): Promise<AnalysisResult> {
  return analyze(
    userId,
    kind,
    { primary: Env.AI_VISION_MODEL, fallback: Env.AI_VISION_FALLBACK_MODEL },
    [
      { type: "text", text: imageUserText({ kind, capturedAt }) },
      { type: "file", data: new Uint8Array(jpeg), mediaType: "image/jpeg" },
    ],
    true,
  );
}

export function analyzeLink(
  userId: string,
  input: LinkPromptInput,
): Promise<AnalysisResult> {
  return analyze(userId, "link", textModels(), linkUserText(input), false);
}

export function analyzeNote(
  userId: string,
  text: string,
  capturedAt: Date,
): Promise<AnalysisResult> {
  return analyze(
    userId,
    "note",
    textModels(),
    noteUserText(text, { kind: "note", capturedAt }),
    false,
  );
}

/** Semantic-search vector for an item or a query. */
export function embed(
  value: string,
  label: string,
  options: { timeoutMs?: number; maxRetries?: number } = {},
): Promise<EmbeddingResult> {
  return embedText(getClient(), {
    model: Env.AI_EMBEDDING_MODEL,
    value,
    label,
    ...options,
  });
}

export * as AiService from "./ai.service.js";
