import { useId } from "react";
import { cn } from "@/lib/utils";

/** The POWER MEDIA bolt — two-tone Energy Yellow → Power Orange, as in the brand reference. */
export function BoltMark({ className, title }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 84" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB800" />
          <stop offset="1" stopColor="#FF9A00" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF9A00" />
          <stop offset="1" stopColor="#FF7900" />
        </linearGradient>
      </defs>
      {/* Lit (left) facet */}
      <path d="M46 2 L4 50 H29 L16 82 L31 50 H11 Z" fill={`url(#${id}-a)`} strokeLinejoin="round" />
      {/* Shaded (right) facet */}
      <path d="M46 2 L35 33 H60 L16 82 L29 50 H11 L36 33 Z" fill={`url(#${id}-b)`} />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span dir="ltr" className={cn("inline-flex items-center gap-2.5", className)}>
      <BoltMark className="h-9 w-auto drop-shadow-[0_0_14px_rgb(255_121_0/0.35)]" />
      {!compact && (
        <span className="flex flex-col font-sans text-[15px] leading-[0.95] font-extrabold tracking-tight text-blue" style={{ fontFamily: '"Plus Jakarta Sans Variable", sans-serif' }}>
          <span>POWER</span>
          <span>MEDIA</span>
        </span>
      )}
      {compact && <span className="sr-only">POWER MEDIA</span>}
    </span>
  );
}
