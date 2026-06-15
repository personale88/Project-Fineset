import { content } from "@/content/en";
import { StaffCallList } from "@/components/staff/StaffCallList";
import { fetchInitialStaffCalls } from "@/lib/data/staff-calls";
import { parseStaffCallsSearchParams } from "@/lib/utils/staff-calls-url";

interface StaffCallsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StaffCallsPage({ searchParams }: StaffCallsPageProps) {
  const resolved = await searchParams;
  const urlFilters = parseStaffCallsSearchParams(resolved);
  const initial = await fetchInitialStaffCalls(urlFilters);

  return (
    <StaffCallList
      copy={content.staff}
      emptyMessage={content.empty.staffCalls}
      canAssign={false}
      initialCallsParams={urlFilters}
      initialData={initial?.data}
      initialParams={initial?.params}
    />
  );
}
