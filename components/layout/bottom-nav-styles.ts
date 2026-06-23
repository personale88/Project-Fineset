import { cn } from "@/lib/utils";

export const bottomNavShellClassName =
  "fixed inset-x-0 bottom-0 z-30 border-t border-white/30 bg-surface-card/65 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.12)] backdrop-blur-2xl backdrop-saturate-150 sm:hidden";

export function bottomNavItemClass(active: boolean) {
  return cn(
    "flex w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium leading-none transition-colors duration-200",
    active ? "text-brand-gold" : "text-text-muted",
  );
}

export function bottomNavIconWrapClass(active: boolean) {
  return cn(
    "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
    active
      ? "bg-brand-gold/15 text-brand-gold shadow-[0_2px_8px_-2px_rgba(184,134,11,0.35)] ring-1 ring-brand-gold/25"
      : "text-text-secondary hover:bg-surface-secondary/70 active:scale-95",
  );
}

export function bottomNavIconClass(active: boolean) {
  return cn("h-[22px] w-[22px] transition-transform duration-200", active && "scale-105");
}

export function bottomNavIconStroke(active: boolean) {
  return active ? 2.35 : 1.85;
}
