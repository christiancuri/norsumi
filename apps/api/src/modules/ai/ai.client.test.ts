import { describe, expect, it } from "vitest";

import {
  AiError,
  createAiClient,
  embedText,
  generateAnalysis,
  toAiError,
} from "./ai.client.js";
import { AnalysisParseError } from "./analysis.schema.js";

/**
 * Real AI SDK + OpenRouter provider, with `fetch` intercepted: these tests
 * assert what actually goes over the wire, offline.
 */

interface Call {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

type Reply = { status?: number; json: unknown };

function fakeFetch(
  replies: Array<Reply | ((body: Record<string, unknown>) => Reply)>,
) {
  const calls: Call[] = [];
  let i = 0;
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<
      string,
      unknown
    >;
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    calls.push({ url: String(input), headers, body });
    const next = replies[Math.min(i++, replies.length - 1)];
    const reply = typeof next === "function" ? next(body) : (next as Reply);
    return new Response(JSON.stringify(reply.json), {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

const answer = {
  title: "Fastify — fast web framework for Node.js",
  summary: "A low-overhead web framework.",
  source: "github.com",
  categoryPath: [
    {
      id: null,
      name: "Web",
      emoji: "🌐",
      color: "sky",
      description: "Websites",
    },
    {
      id: null,
      name: "Programming",
      emoji: "💻",
      color: "blue",
      description: "Code",
    },
  ],
  tags: ["fastify", "node.js", "framework"],
  entities: [
    {
      type: "url",
      name: "Repo",
      value: null,
      url: "https://github.com/fastify/fastify",
    },
  ],
};

function completion(content: string, cost = 0.0005): Reply {
  return {
    json: {
      id: "gen-1",
      object: "chat.completion",
      created: 1,
      model: "vendor/served-model",
      provider: "SomeProvider",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: { role: "assistant", content },
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 20,
        total_tokens: 120,
        cost,
      },
    },
  };
}

const errorReply = (status: number): Reply => ({
  status,
  json: { error: { message: `upstream said ${status}`, code: status } },
});

const run = (
  fetch: typeof globalThis.fetch,
  primary: string,
  fallback?: string,
  extra = {},
) =>
  generateAnalysis(createAiClient({ apiKey: "test-key", fetch }), {
    models: { primary, fallback },
    system: "system prompt",
    user: "user prompt",
    includeText: false,
    label: "test",
    ...extra,
  });

describe("chat request body", () => {
  it("sends privacy routing, usage accounting, strict JSON schema and no temperature", async () => {
    const { fetch, calls } = fakeFetch([completion(JSON.stringify(answer))]);
    const result = await run(fetch, "openai/model-a");

    expect(calls).toHaveLength(1);
    const call = calls[0] as Call;
    expect(call.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(call.headers.authorization).toBe("Bearer test-key");
    expect(call.headers["http-referer"]).toBe("https://norsumi.com");
    expect(call.headers["x-title"]).toBe("norsumi");

    const body = call.body;
    expect(body.model).toBe("openai/model-a");
    expect(body.provider).toEqual({
      zdr: true,
      data_collection: "deny",
      require_parameters: true,
    });
    expect(body.usage).toEqual({ include: true });
    expect(body.reasoning).toEqual({ effort: "low" });
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("models");

    const format = body.response_format as {
      type: string;
      json_schema: {
        strict: boolean;
        name: string;
        schema: { additionalProperties: boolean; required: string[] };
      };
    };
    expect(format.type).toBe("json_schema");
    expect(format.json_schema.strict).toBe(true);
    expect(format.json_schema.name).toBe("norsumi_item");
    expect(format.json_schema.schema.additionalProperties).toBe(false);
    expect(format.json_schema.schema.required).toContain("categoryPath");

    expect(result.analysis.title).toBe(answer.title);
    expect(result.usage).toMatchObject({
      model: "vendor/served-model",
      fallbackUsed: false,
      promptTokens: 100,
      completionTokens: 20,
      cost: 0.0005,
    });
  });

  it("turns reasoning off and restricts quantization for deepseek", async () => {
    const { fetch, calls } = fakeFetch([completion(JSON.stringify(answer))]);
    await run(fetch, "deepseek/model-b");
    const body = (calls[0] as Call).body;
    expect(body.reasoning).toEqual({ enabled: false });
    expect(body.provider).toEqual({
      zdr: true,
      data_collection: "deny",
      require_parameters: true,
      quantizations: ["fp8", "bf16", "fp16"],
    });
  });

  it("sends no reasoning override for other vendors", async () => {
    const { fetch, calls } = fakeFetch([completion(JSON.stringify(answer))]);
    await run(fetch, "anthropic/model-c");
    expect((calls[0] as Call).body).not.toHaveProperty("reasoning");
  });

  it("sends images as a base64 JPEG data URL part", async () => {
    const { fetch, calls } = fakeFetch([
      completion(JSON.stringify({ ...answer, text: "hello" })),
    ]);
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    const result = await run(fetch, "openai/model-a", undefined, {
      includeText: true,
      user: [
        { type: "text", text: "describe" },
        { type: "file", data: jpeg, mediaType: "image/jpeg" },
      ],
    });
    const messages = (calls[0] as Call).body.messages as Array<{
      role: string;
      content: unknown;
    }>;
    const user = messages.find((m) => m.role === "user") as {
      content: Array<Record<string, unknown>>;
    };
    const image = user.content.find((p) => p.type === "image_url") as {
      image_url: { url: string };
    };
    expect(image.image_url.url).toBe(
      `data:image/jpeg;base64,${Buffer.from(jpeg).toString("base64")}`,
    );
    expect(result.analysis.text).toBe("hello");
  });
});

describe("primary → fallback", () => {
  it("uses the fallback, with its own settings, when the answer is off-schema", async () => {
    const { fetch, calls } = fakeFetch([
      completion("not json at all"),
      completion(JSON.stringify(answer), 0.0002),
    ]);
    const result = await run(fetch, "deepseek/model-b", "openai/model-a");
    expect(calls.map((c) => c.body.model)).toEqual([
      "deepseek/model-b",
      "openai/model-a",
    ]);
    expect((calls[1] as Call).body.reasoning).toEqual({ effort: "low" });
    expect((calls[1] as Call).body.provider).not.toHaveProperty(
      "quantizations",
    );
    expect(result.usage.fallbackUsed).toBe(true);
    expect(result.usage.cost).toBe(0.0002);
  });

  it("does not retry a 4xx on the same model before falling back", async () => {
    const { fetch, calls } = fakeFetch([
      errorReply(400),
      completion(JSON.stringify(answer)),
    ]);
    const result = await run(fetch, "openai/model-a", "anthropic/model-c");
    expect(calls.map((c) => c.body.model)).toEqual([
      "openai/model-a",
      "anthropic/model-c",
    ]);
    expect(result.usage.fallbackUsed).toBe(true);
  });

  it("gives up as a transient AiError when both models are rate-limited", async () => {
    const { fetch, calls } = fakeFetch([errorReply(429)]);
    const error = await run(fetch, "openai/model-a", "anthropic/model-c").catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).transient).toBe(true);
    expect((error as AiError).status).toBe(429);
    // One SDK retry per model, never more: 4 requests in total.
    expect(calls).toHaveLength(4);
  }, 20_000);

  it("reports schema failures of the only model as AnalysisParseError", async () => {
    const { fetch } = fakeFetch([completion(JSON.stringify({ title: "x" }))]);
    await expect(run(fetch, "openai/model-a")).rejects.toBeInstanceOf(
      AnalysisParseError,
    );
  });
});

describe("embeddings", () => {
  const embeddingReply = (dims: number): Reply => ({
    json: {
      object: "list",
      model: "vendor/embed",
      data: [
        {
          object: "embedding",
          index: 0,
          embedding: Array.from({ length: dims }, (_, i) => (i % 7) - 3),
        },
      ],
      usage: { prompt_tokens: 3, total_tokens: 3, cost: 3e-8 },
    },
  });

  it("requests 1024 dimensions with privacy routing and reports the cost", async () => {
    const { fetch, calls } = fakeFetch([embeddingReply(1024)]);
    const client = createAiClient({ apiKey: "k", fetch });
    const result = await embedText(client, {
      model: "vendor/embed",
      value: "hello",
      label: "t",
    });
    const call = calls[0] as Call;
    expect(call.url).toBe("https://openrouter.ai/api/v1/embeddings");
    expect(call.body).toMatchObject({
      model: "vendor/embed",
      input: ["hello"],
      dimensions: 1024,
      provider: {
        zdr: true,
        data_collection: "deny",
        require_parameters: true,
      },
    });
    expect(result.vector).toHaveLength(1024);
    expect(result.cost).toBe(3e-8);
  });

  it("truncates and renormalizes when the model ignores dimensions", async () => {
    const { fetch } = fakeFetch([embeddingReply(4096)]);
    const result = await embedText(createAiClient({ apiKey: "k", fetch }), {
      model: "vendor/embed",
      value: "hello",
      label: "t",
    });
    expect(result.vector).toHaveLength(1024);
    const norm = Math.sqrt(result.vector.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it("does not retry interactive embeddings when asked not to", async () => {
    const { fetch, calls } = fakeFetch([errorReply(503)]);
    const error = await embedText(createAiClient({ apiKey: "k", fetch }), {
      model: "vendor/embed",
      value: "q",
      label: "search",
      maxRetries: 0,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(AiError);
    expect(calls).toHaveLength(1);
  });
});

describe("toAiError", () => {
  it("treats timeouts as transient", () => {
    const timeout = new DOMException("timed out", "TimeoutError");
    const mapped = toAiError(timeout) as AiError;
    expect(mapped).toBeInstanceOf(AiError);
    expect(mapped.transient).toBe(true);
  });
});
