import { describe, expect, it } from "vitest";
import { z } from "zod";
import { platformSettingsSchema } from "@/lib/platform/settings-schema";
import { mergePlatformSettings } from "@/lib/platform/merge-settings";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/default-settings";

describe("platformSettingsSchema", () => {
  it("accepts default settings", () => {
    const parsed = platformSettingsSchema.safeParse(DEFAULT_PLATFORM_SETTINGS);
    expect(parsed.success).toBe(true);
  });

  it("rejects tier limits that are not ascending", () => {
    const parsed = platformSettingsSchema.safeParse(
      mergePlatformSettings({
        billing: { tier1MaxStaff: 20, tier2MaxStaff: 10 },
      }),
    );
    expect(parsed.success).toBe(false);
  });
});
