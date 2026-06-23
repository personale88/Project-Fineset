import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./vitest.integration.global-setup.ts"],
    setupFiles: ["./vitest.setup.ts", "./vitest.integration.setup.ts"],
    include: ["tests/integration/**/*.{test,spec}.{ts,tsx}"],
    fileParallelism: false,
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
