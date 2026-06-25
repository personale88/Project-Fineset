import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_TILE_SIZE = 48;
const LOGO_TILE_SIZE_COMPACT = 36;

const UPI_APPS = [
  { label: "UPI", src: "/images/upi-apps/upi.png" },
  { label: "PhonePe", src: "/images/upi-apps/phonepe.png" },
  { label: "Paytm", src: "/images/upi-apps/paytm.png" },
  { label: "GPay", src: "/images/upi-apps/gpay.png", imageClassName: "scale-[0.96]" },
  { label: "CRED", src: "/images/upi-apps/cred.png" },
] as const;

function LogoTile({
  label,
  src,
  imageClassName,
  compact = false,
}: {
  label: string;
  src: string;
  imageClassName?: string;
  compact?: boolean;
}) {
  const tileSize = compact ? LOGO_TILE_SIZE_COMPACT : LOGO_TILE_SIZE;

  return (
    <div className={cn("flex flex-col items-center", compact ? "gap-0.5" : "gap-1.5")}>
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-lg border border-border/80 bg-white shadow-sm",
          compact ? "h-9 w-9" : "h-12 w-12 rounded-xl",
        )}
        title={label}
      >
        <Image
          src={src}
          alt={`${label} logo`}
          width={tileSize}
          height={tileSize}
          className={cn("h-full w-full object-contain", imageClassName)}
          unoptimized
        />
      </div>
      <span
        className={cn(
          "font-medium leading-none text-text-muted",
          compact ? "sr-only" : "text-[10px]",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function UpiAppLogosRow({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-center",
        compact ? "gap-2" : "gap-3 sm:gap-4",
        className,
      )}
      aria-label="Supported UPI apps: UPI, PhonePe, Paytm, Google Pay, and CRED"
    >
      {UPI_APPS.map((app) => (
        <LogoTile key={app.label} {...app} compact={compact} />
      ))}
    </div>
  );
}
