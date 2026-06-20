"use client";

import { useState } from "react";
import { content } from "@/content/en";
import { useIsClient } from "@/hooks/useIsClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RoleOnboardingModalProps {
  role: string;
  userName?: string;
}

const STORAGE_KEY = "fineset-onboarding-seen";

function readOnboardingOpen(role: string): boolean {
  if (typeof window === "undefined") return false;
  return !window.localStorage.getItem(`${STORAGE_KEY}:${role}`);
}

function managerOnboardingSteps(userName?: string) {
  const copy = content.store.managerShell.onboarding;
  return [
    {
      title:
        userName?.trim() ? `Welcome, ${userName.trim()}` : copy.step1Title,
      body: copy.step1Body,
    },
    { title: copy.step2Title, body: copy.step2Body },
    { title: copy.step3Title, body: copy.step3Body },
    { title: copy.step4Title, body: copy.step4Body },
  ];
}

export function RoleOnboardingModal({ role, userName }: RoleOnboardingModalProps) {
  const isClient = useIsClient();
  const [open, setOpen] = useState(() => readOnboardingOpen(role));
  const [step, setStep] = useState(0);

  function dismiss() {
    window.localStorage.setItem(`${STORAGE_KEY}:${role}`, "1");
    setOpen(false);
  }

  if (!isClient || !open) {
    return null;
  }

  if (role === "STAFF") {
    const steps = [
      { title: content.staff.onboarding.step1Title, body: content.staff.onboarding.step1Body },
      { title: content.staff.onboarding.step2Title, body: content.staff.onboarding.step2Body },
      { title: content.staff.onboarding.step3Title, body: content.staff.onboarding.step3Body },
    ];
    const current = steps[step];
    const title =
      step === 0 && userName?.trim()
        ? `Welcome, ${userName.trim()}`
        : current.title;

    return (
      <Dialog open onOpenChange={(next) => !next && dismiss()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{current.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <span className="text-xs text-text-muted">
              {step + 1} / {steps.length}
            </span>
            <div className="flex gap-2">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                  {content.common.previous}
                </Button>
              ) : null}
              {step < steps.length - 1 ? (
                <Button type="button" onClick={() => setStep((s) => s + 1)}>
                  {content.common.next}
                </Button>
              ) : (
                <Button type="button" onClick={dismiss}>
                  Got it
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (role === "STORE_MANAGER") {
    const steps = managerOnboardingSteps(userName);
    const current = steps[step]!;

    return (
      <Dialog open onOpenChange={(next) => !next && dismiss()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{current.title}</DialogTitle>
            <DialogDescription>{current.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <span className="text-xs text-text-muted">
              {step + 1} / {steps.length}
            </span>
            <div className="flex gap-2">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                  {content.common.previous}
                </Button>
              ) : null}
              {step < steps.length - 1 ? (
                <Button type="button" onClick={() => setStep((s) => s + 1)}>
                  {content.common.next}
                </Button>
              ) : (
                <Button type="button" onClick={dismiss}>
                  Got it
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const copyByRole: Record<string, { title: string; body: string }> = {
    BUSINESS_OWNER: {
      title: "Welcome, business owner",
      body: "Review portfolio performance, manage staff, and import data across your stores.",
    },
    MASTER_ADMIN: {
      title: "Welcome, admin",
      body: "Manage stores, users, and chain-wide analytics from the admin dashboard.",
    },
  };

  const copy = copyByRole[role] ?? {
    title: "Welcome",
    body: "Use the dashboard to get started.",
  };

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
