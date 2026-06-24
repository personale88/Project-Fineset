"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { clearVisitDraft } from "@/components/forms/VisitForm/useVisitDraft";

export function usePortalSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      clearVisitDraft();
      queryClient.clear();
      await fetch("/api/auth/signout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } catch {
      setIsSigningOut(false);
    }
  }

  return { signOut, isSigningOut };
}
