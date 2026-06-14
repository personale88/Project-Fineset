"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { PortfolioAlert } from "@/lib/services/portfolio-alerts";

export function usePortfolioAlerts() {
  return useQuery({
    queryKey: ["portfolio-alerts"],
    queryFn: () => apiFetch<{ data: PortfolioAlert[] }>("/api/analytics/store/portfolio/alerts"),
  });
}
