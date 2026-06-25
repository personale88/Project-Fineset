import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const chartFallback = () => <Skeleton className="h-64 w-full rounded-card" />;

export const SalesLineChart = dynamic(
  () => import("./SalesLineChart").then((mod) => mod.SalesLineChart),
  { ssr: false, loading: chartFallback },
);
