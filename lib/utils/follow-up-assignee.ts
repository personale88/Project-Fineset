/** Who should own a follow-up after a call outcome is recorded. */
export function resolveFollowUpAssignee(params: {
  storeScope?: boolean;
  recordOwnerStaffId: string;
  callerStaffId: string;
  existingAssignedStaffId?: string | null;
}): string {
  if (!params.storeScope) return params.callerStaffId;
  if (params.existingAssignedStaffId) return params.existingAssignedStaffId;
  return params.recordOwnerStaffId;
}
