import { content } from "@/content/en";
import { FollowUpList } from "@/components/staff/FollowUpList";
import { parseFollowUpFilter } from "@/lib/utils/follow-ups-url";

interface StaffFollowUpsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StaffFollowUpsPage({ searchParams }: StaffFollowUpsPageProps) {
  const resolved = await searchParams;

  return (
    <FollowUpList filter={parseFollowUpFilter(resolved.filter)} />
  );
}
