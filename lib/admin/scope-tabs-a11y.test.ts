import { describe, expect, it, vi } from "vitest";
import { handleScopeTabListKeyDown } from "@/lib/admin/scope-tabs-a11y";

describe("handleScopeTabListKeyDown", () => {
  it("moves to the next scope on ArrowRight", () => {
    const onChange = vi.fn();
    const event = {
      key: "ArrowRight",
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLElement>;

    handleScopeTabListKeyDown(
      event,
      ["general", "billing", "security"] as const,
      "general",
      "settings",
      "mobile",
      onChange,
      "horizontal",
    );

    expect(onChange).toHaveBeenCalledWith("billing");
    expect(event.preventDefault).toHaveBeenCalled();
  });
});
