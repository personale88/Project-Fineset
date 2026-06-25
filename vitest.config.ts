import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e", "tests/integration/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "lib/auth/routes.ts",
        "lib/auth/resolve-personal-scope.ts",
        "lib/auth/resolve-effective-role.ts",
        "lib/auth/generate-password.ts",
        "lib/auth/dev-auth-bypass.ts",
      ],
      thresholds: {
        lines: 95,
        functions: 90,
        branches: 80,
        statements: 95,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
