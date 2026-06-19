"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HubLink {
  href: string;
  title: string;
  description: string;
}

interface ManagerWorkHubProps {
  title: string;
  subtitle: string;
  links: HubLink[];
}

export function ManagerWorkHub({ title, subtitle, links }: ManagerWorkHubProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">{title}</h1>
        <p className="text-text-secondary">{subtitle}</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="group block h-full">
              <Card className="h-full transition-shadow hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-brand-gold">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{link.title}</CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-text-muted group-hover:text-brand-gold" aria-hidden />
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
