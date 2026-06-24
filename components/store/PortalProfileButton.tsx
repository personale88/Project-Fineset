"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { content } from "@/content/en";
import {
  businessOwnerProfilePath,
  storeManagerProfilePath,
} from "@/lib/utils/store-dashboard-url";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { portalHeaderActionButtonClass } from "@/components/layout/portal-header-button";

interface PortalProfileButtonProps {
  portalRole: "STORE_MANAGER" | "BUSINESS_OWNER";
}

export function PortalProfileButton({ portalRole }: PortalProfileButtonProps) {
  const pathname = usePathname();
  const copy =
    portalRole === "BUSINESS_OWNER"
      ? content.store.ownerShell.profile
      : content.store.managerShell.profile;
  const href =
    portalRole === "BUSINESS_OWNER"
      ? businessOwnerProfilePath()
      : storeManagerProfilePath();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn(portalHeaderActionButtonClass, isActive && "border-brand-gold/40 bg-brand-gold/5")}
    >
      <Link href={href} aria-current={isActive ? "page" : undefined}>
        <User className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{copy.headerLabel}</span>
      </Link>
    </Button>
  );
}
