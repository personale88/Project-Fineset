"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminDashboardNav } from "@/components/admin/AdminDashboardNav";
import { content } from "@/content/en";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/useToast";

export default function AdminSecurityPage() {
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  async function enrollMfa() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Fineset Admin",
      });
      if (error) throw error;
      setFactorId(data.id);
      toast({ title: "Scan the QR code in your authenticator app to finish setup." });
    } catch {
      toast({ title: "Could not start 2FA enrollment. Sign in with Supabase auth first." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminDashboardNav labels={content.admin.nav} />
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Security settings
        </h1>
        <p className="text-sm text-text-secondary">
          Enable two-factor authentication for your admin account via Supabase MFA.
        </p>
      </div>
      <div className="max-w-md space-y-3 rounded-card border border-border p-4">
        <p className="text-sm text-text-secondary">
          {factorId
            ? "Enrollment started — complete verification in your authenticator app."
            : "Protect admin access with a TOTP authenticator app."}
        </p>
        <Button type="button" disabled={loading || Boolean(factorId)} onClick={() => void enrollMfa()}>
          {loading ? "Starting…" : "Enable 2FA"}
        </Button>
      </div>
    </div>
  );
}
