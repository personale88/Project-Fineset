// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalyticsScopeCreditsBar } from "@/components/admin/analytics/AnalyticsScopeCreditsBar";
import { content } from "@/content/en";

const copy = content.admin.analytics.credits;

describe("AnalyticsScopeCreditsBar", () => {
  it("opens recharge when the credits chip is clicked", async () => {
    const user = userEvent.setup();
    const onRecharge = vi.fn();

    render(
      <AnalyticsScopeCreditsBar
        copy={copy}
        balanceCredits={42}
        lowBalanceThreshold={5}
        onRecharge={onRecharge}
        layout="inline"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /42 AI credits left\. Manage credits/i }),
    );

    expect(onRecharge).toHaveBeenCalledTimes(1);
  });
});
