// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { content } from "@/content/en";
import { StaffWorkQueue } from "@/components/staff/StaffWorkQueue";
import type { StaffWorkQueueResponse } from "@/types/staff-work-queue";

const dueTodayFollowUp = {
  id: "follow-due-today",
  customerName: "Due Today Customer",
  customerPhone: "+91 90000 00001",
  reason: "Price follow-up",
  followUpDate: "2026-06-28",
  callOutcome: null,
  status: "OPEN" as const,
  assignedStaffId: "staff-1",
  assignedStaffName: "Staff One",
  visitId: "visit-1",
  fieldSaleId: null,
};

const storeWorkQueueResponse: StaffWorkQueueResponse = {
  items: [
    {
      id: "task-overdue",
      priority: 1,
      reason: "overdue_task",
      customerName: "Overdue Customer",
      subtitle: "Overdue follow-up",
      storeId: "store-1",
      storeName: "Store Alpha",
      assignedStaffName: "Staff One",
      followUp: {
        ...dueTodayFollowUp,
        id: "follow-overdue",
        customerName: "Overdue Customer",
        followUpDate: "2026-06-20",
        callOutcome: null,
      },
      call: null,
    },
    {
      id: "task-due-today",
      priority: 2,
      reason: "due_today_task",
      customerName: dueTodayFollowUp.customerName,
      subtitle: dueTodayFollowUp.reason,
      storeId: "store-1",
      storeName: "Store Alpha",
      assignedStaffName: dueTodayFollowUp.assignedStaffName,
      followUp: dueTodayFollowUp,
      call: null,
    },
  ],
  total: 60,
  categoryTotals: {
    overdue_task: 40,
    due_today_task: 20,
  },
  storeSummaries: [{ storeId: "store-1", storeName: "Store Alpha", total: 60 }],
};

const server = setupServer(
  http.get("/api/dashboard/store-work-queue", () => HttpResponse.json(storeWorkQueueResponse)),
);

beforeAll(() => server.listen());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

function renderStoreWorkQueue() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <StaffWorkQueue
        dataSource="store"
        workQueueStoreId={null}
        workQueuePeriod="today"
        readOnly
        showStoreContext
        title={content.store.ownerDashboard.workQueue.title}
      />
    </QueryClientProvider>,
  );
}

describe("StaffWorkQueue accordion", () => {
  it("opens the Due today section and shows preview items", async () => {
    const user = userEvent.setup();
    renderStoreWorkQueue();

    await waitFor(() => {
      expect(screen.getByTestId("work-queue-section-due_today_task")).toBeInTheDocument();
    });

    const dueTodaySection = screen.getByTestId("work-queue-section-due_today_task");
    const trigger = within(dueTodaySection).getByTestId("work-queue-section-due_today_task-trigger");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("work-queue-section-due_today_task-panel")).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = within(dueTodaySection).getByTestId("work-queue-section-due_today_task-panel");
    expect(panel).toBeVisible();
    expect(within(panel).getByText("Due Today Customer")).toBeVisible();
  });

  it("keeps the Due today section open after toggling twice", async () => {
    const user = userEvent.setup();
    renderStoreWorkQueue();

    await waitFor(() => {
      expect(screen.getByTestId("work-queue-section-due_today_task-trigger")).toBeInTheDocument();
    });

    const trigger = screen.getByTestId("work-queue-section-due_today_task-trigger");

    await user.click(trigger);
    await user.click(trigger);
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("work-queue-section-due_today_task-panel")).toBeVisible();
    expect(screen.getByText("Due Today Customer")).toBeVisible();
  });

  it("shows a full-list fallback when preview items are missing for a category", async () => {
    server.use(
      http.get("/api/dashboard/store-work-queue", () =>
        HttpResponse.json({
          ...storeWorkQueueResponse,
          items: storeWorkQueueResponse.items.filter((item) => item.reason !== "due_today_task"),
        }),
      ),
    );

    const user = userEvent.setup();
    renderStoreWorkQueue();

    await waitFor(() => {
      expect(screen.getByTestId("work-queue-section-due_today_task-trigger")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("work-queue-section-due_today_task-trigger"));

    const panel = screen.getByTestId("work-queue-section-due_today_task-panel");
    expect(within(panel).getByText(/review all 20 items/i)).toBeVisible();
    expect(within(panel).getByRole("link", { name: content.staff.workQueue.sectionViewList })).toBeVisible();
  });
});
