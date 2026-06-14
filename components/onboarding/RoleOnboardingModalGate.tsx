"use client";

import dynamic from "next/dynamic";

const RoleOnboardingModal = dynamic(
  () =>
    import("@/components/onboarding/RoleOnboardingModal").then(
      (mod) => mod.RoleOnboardingModal,
    ),
  { ssr: false },
);

interface RoleOnboardingModalGateProps {
  role: string;
  userName?: string;
}

export function RoleOnboardingModalGate({ role, userName }: RoleOnboardingModalGateProps) {
  return <RoleOnboardingModal role={role} userName={userName} />;
}
