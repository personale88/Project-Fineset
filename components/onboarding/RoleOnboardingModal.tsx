"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "fineset-onboarding-seen";

interface RoleOnboardingModalProps {
  role: string;
}

const copyByRole: Record<string, { title: string; body: string }> = {
  STAFF: {
    title: "Welcome, floor staff",
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

export function RoleOnboardingModal({ role }: RoleOnboardingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const key = `${STORAGE_KEY}:${role}`;
    if (!window.localStorage.getItem(key)) {
      setOpen(true);
    }
  }, [role]);

  function dismiss() {
    window.localStorage.setItem(`${STORAGE_KEY}:${role}`, "1");
    setOpen(false);
  }

  const copy = copyByRole[role] ?? {
    title: "Welcome",
    body: "Use the dashboard to get started.",
  };

  if (!mounted || !open) {
    return null;
  }

  return (
    <Dialog open onOpenChange={(next) => !next && dismiss()}>
      <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.body}</DialogDescription>
          </DialogHeader>
        <Button type="button" onClick={dismiss}>
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
