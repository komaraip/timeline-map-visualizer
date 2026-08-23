import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**"],
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    coverage: { reporter: ["text", "html"] },
  },
});
