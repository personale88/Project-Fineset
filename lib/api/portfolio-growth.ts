import { apiFetch } from "@/lib/api/client";
import type { AdminPortfolioGrowthMetrics } from "@/lib/services/admin-portfolio-growth";

export type { AdminPortfolioGrowthMetrics };

export async function fetchPortfolioGrowthKpis(): Promise<AdminPortfolioGrowthMetrics> {
  return apiFetch<AdminPortfolioGrowthMetrics>("/api/admin/portfolio/growth-kpis");
}
