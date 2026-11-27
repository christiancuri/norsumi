import { defineConfig } from "vitest/config";

// Unit tests only: nothing here touches MongoDB, S3 or OpenRouter.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
  },
});
