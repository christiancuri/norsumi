import { describe, expect, it, vi } from "vitest";

vi.mock("../../infra/env.js", () => ({ Env: { OPENROUTER_API_KEY: "test" } }));

const { modelParams } = await import("./openrouter.js");

describe("modelParams", () => {
  it("always enforces ZDR and no data collection, never temperature", () => {
    for (const model of [
      "openai/some-model",
      "anthropic/some-model",
      "deepseek/some-model",
    ]) {
      const params = modelParams(model);
      expect(params.provider).toMatchObject({
        zdr: true,
        data_collection: "deny",
        require_parameters: true,
      });
      expect(params).not.toHaveProperty("temperature");
    }
  });

  it("uses low reasoning effort for OpenAI", () => {
    expect(modelParams("openai/some-model").reasoning).toEqual({
      effort: "low",
    });
  });

  it("disables reasoning and restricts quantization for DeepSeek", () => {
    const params = modelParams("deepseek/some-model");
    expect(params.reasoning).toEqual({ enabled: false });
    expect(params.provider.quantizations).toEqual(["fp8", "bf16", "fp16"]);
  });

  it("sends no reasoning override for other vendors", () => {
    expect(modelParams("anthropic/some-model").reasoning).toBeUndefined();
  });
});
