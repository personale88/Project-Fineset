import { useQuery } from "@tanstack/react-query";
import {
  fetchPortfolioGrowthKpis,
  type AdminPortfolioGrowthMetrics,
} from "@/lib/api/portfolio-growth";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

export function usePortfolioGrowthKpis() {
  return useQuery<AdminPortfolioGrowthMetrics>({
    queryKey: ["portfolio-growth-kpis"],
    queryFn: fetchPortfolioGrowthKpis,
    ...LIVE_QUERY_OPTIONS,
  });
}
