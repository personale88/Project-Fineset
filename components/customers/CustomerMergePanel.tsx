"use client";

import { useState } from "react";
import { mergeCustomers } from "@/lib/api/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/useToast";

interface CustomerMergePanelProps {
  targetCustomerId: string;
  storeId?: string;
}

export function CustomerMergePanel({
  targetCustomerId,
  storeId,
}: CustomerMergePanelProps) {
  const [sourceId, setSourceId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleMerge() {
    if (!sourceId.trim()) return;
    setLoading(true);
    try {
      await mergeCustomers({
        sourceCustomerId: sourceId.trim(),
        targetCustomerId,
        storeId,
      });
      toast({ title: "Customers merged" });
      setSourceId("");
    } catch {
      toast({ title: "Could not merge customers" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-card border border-border p-4">
      <p className="text-sm font-medium text-text-primary">Merge duplicate customer</p>
      <p className="mt-1 text-xs text-text-muted">
        Enter the duplicate customer ID to merge into this profile. Visits and calls move to
        this customer.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={sourceId}
          onChange={(event) => setSourceId(event.target.value)}
          placeholder="Duplicate customer ID"
        />
        <Button type="button" disabled={loading || !sourceId.trim()} onClick={() => void handleMerge()}>
          Merge
        </Button>
      </div>
    </div>
  );
}
