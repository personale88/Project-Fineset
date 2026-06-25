import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_TILE_SIZE = 48;

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
}: {
  label: string;
  src: string;
  imageClassName?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative aspect-square h-12 w-12 overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm"
        title={label}
      >
        <Image
          src={src}
          alt={`${label} logo`}
          width={LOGO_TILE_SIZE}
          height={LOGO_TILE_SIZE}
          className={cn("h-full w-full object-contain", imageClassName)}
          unoptimized
        />
      </div>
      <span className="text-[10px] font-medium leading-none text-text-muted">{label}</span>
    </div>
  );
}

export function UpiAppLogosRow({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-wrap items-end justify-center gap-3 sm:gap-4", className)}
      aria-label="Supported UPI apps: UPI, PhonePe, Paytm, Google Pay, and CRED"
    >
      {UPI_APPS.map((app) => (
        <LogoTile key={app.label} {...app} />
      ))}
    </div>
  );
}
