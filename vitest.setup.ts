import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

process.env.SKIP_ENV_VALIDATION = "true";
process.env.ENCRYPTION_KEY = "a".repeat(64);

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  };
});

vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return {
    ...actual,
    unstable_cache: <T>(fn: T) => fn,
    revalidateTag: vi.fn(),
  };
});
