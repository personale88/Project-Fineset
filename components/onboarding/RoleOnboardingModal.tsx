"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsClient } from "@/hooks/useIsClient";

const STORAGE_KEY = "fineset-onboarding-seen";

interface RoleOnboardingModalProps {
  role: string;
  userName?: string;
}

const copyByRole: Record<string, { title: string; body: string }> = {
  STAFF: {
    title: "Welcome",
    body: "Log visits, work your call list, and record field sales from this portal.",
  },
  STORE_MANAGER: {
    title: "Welcome, store manager",
    body: "Log activity for your store and review performance from the store dashboard.",
  },
  BUSINESS_OWNER: {
    title: "Welcome, business owner",
    body: "Review portfolio performance, manage staff, and import data across your stores.",
  },
  MASTER_ADMIN: {
    title: "Welcome, admin",
    body: "Manage stores, users, and chain-wide analytics from the admin dashboard.",
  },
};

function readOnboardingOpen(role: string): boolean {
  if (typeof window === "undefined") return false;
  return !window.localStorage.getItem(`${STORAGE_KEY}:${role}`);
}

export function RoleOnboardingModal({ role, userName }: RoleOnboardingModalProps) {
  const isClient = useIsClient();
  const [open, setOpen] = useState(() => readOnboardingOpen(role));

  function dismiss() {
    window.localStorage.setItem(`${STORAGE_KEY}:${role}`, "1");
    setOpen(false);
  }

  const copy = copyByRole[role] ?? {
    title: "Welcome",
    body: "Use the dashboard to get started.",
  };
  const title =
    role === "STAFF" && userName?.trim()
      ? `Welcome, ${userName.trim()}`
      : copy.title;

  if (!isClient || !open) {
    return null;
  }

  return (
    <Dialog open onOpenChange={(next) => !next && dismiss()}>
      <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{copy.body}</DialogDescription>
          </DialogHeader>
        <Button type="button" onClick={dismiss}>
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
