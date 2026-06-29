import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { AutomationRunLogDto } from "@/lib/automation/types";

export const AUTOMATION_RUNS_QUERY_KEY = ["admin", "automation", "runs"] as const;

export const AUTOMATION_RUNS_PAGE_SIZE = 20;

export type AutomationRunsPage = {
  runs: AutomationRunLogDto[];
  total: number;
};

export function automationRunsQueryKey(page = 1) {
  return [...AUTOMATION_RUNS_QUERY_KEY, page] as const;
}

export function flattenAutomationRunPages(pages: AutomationRunsPage[]): AutomationRunLogDto[] {
  return pages.flatMap((page) => page.runs);
}

export function getAutomationRunHistoryNextPageParam(
  lastPage: AutomationRunsPage,
  allPages: AutomationRunsPage[],
): number | undefined {
  const loadedCount = allPages.reduce((count, page) => count + page.runs.length, 0);
  if (loadedCount >= lastPage.total) return undefined;
  return allPages.length + 1;
}

export function seedAutomationRunHistoryCache(
  queryClient: QueryClient,
  pages: AutomationRunsPage[],
): void {
  queryClient.setQueryData<InfiniteData<AutomationRunsPage>>(AUTOMATION_RUNS_QUERY_KEY, {
    pages,
    pageParams: pages.map((_, index) => index + 1),
  });

  const firstPage = pages[0];
  if (firstPage) {
    queryClient.setQueryData(automationRunsQueryKey(1), firstPage);
  }
}

function prependRunToPage(
  page: AutomationRunsPage,
  run: AutomationRunLogDto,
): AutomationRunsPage {
  if (page.runs.some((item) => item.id === run.id)) {
    return page;
  }

  return {
    runs: [run, ...page.runs],
    total: page.total + 1,
  };
}

export function prependAutomationRunToCache(
  queryClient: QueryClient,
  run: AutomationRunLogDto,
  page = 1,
): void {
  queryClient.setQueryData<InfiniteData<AutomationRunsPage>>(
    AUTOMATION_RUNS_QUERY_KEY,
    (current) => {
      if (!current?.pages.length) {
        return {
          pages: [{ runs: [run], total: 1 }],
          pageParams: [1],
        };
      }

      const [firstPage, ...restPages] = current.pages;
      const nextFirstPage = prependRunToPage(firstPage, run);
      if (nextFirstPage === firstPage) {
        return current;
      }

      return {
        pageParams: current.pageParams,
        pages: [nextFirstPage, ...restPages],
      };
    },
  );

  queryClient.setQueryData<AutomationRunsPage>(automationRunsQueryKey(page), (current) => {
    if (!current) {
      return { runs: [run], total: 1 };
    }

    return prependRunToPage(current, run);
  });
}
