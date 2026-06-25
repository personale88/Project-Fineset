import { describe, expect, it } from "vitest";
import {
  downsampleTrendForChart,
  type TrendChartPoint,
} from "@/lib/utils/chart-layout";

function makeTrend(count: number): TrendChartPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    date: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
    visits: index + 1,
    revenue: (index + 1) * 1000,
  }));
}

describe("downsampleTrendForChart", () => {
  it("returns original data when under the point cap", () => {
    const data = makeTrend(30);
    expect(downsampleTrendForChart(data)).toEqual(data);
  });

  it("buckets long ranges to at most 60 points", () => {
    const data = makeTrend(300);
    const downsampled = downsampleTrendForChart(data);
    expect(downsampled.length).toBeLessThanOrEqual(60);
    expect(downsampled.length).toBeGreaterThan(1);
  });

  it("aggregates visits and revenue inside each bucket", () => {
    const data = makeTrend(120);
    const downsampled = downsampleTrendForChart(data, 12);
    const totalVisits = downsampled.reduce((sum, row) => sum + row.visits, 0);
    const totalRevenue = downsampled.reduce((sum, row) => sum + row.revenue, 0);
    expect(totalVisits).toBe(data.reduce((sum, row) => sum + row.visits, 0));
    expect(totalRevenue).toBe(data.reduce((sum, row) => sum + row.revenue, 0));
  });
});
