import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "start" | "center";
  as?: "h1" | "h2";
  className?: string;
};

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300", className)}>
      <span aria-hidden className="h-px w-6 bg-gradient-to-r from-yellow to-orange" />
      {children}
    </p>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, align = "start", as: Tag = "h2", className }: Props) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <Eyebrow className={cn(align === "center" && "justify-center")}>{eyebrow}</Eyebrow>}
      <Tag
        className={cn(
          "mt-4 font-bold tracking-tight text-balance text-white",
          Tag === "h1" ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]",
        )}
      >
        {title}
      </Tag>
      {subtitle && <p className="mt-5 text-base leading-relaxed text-pretty text-ink-muted sm:text-lg">{subtitle}</p>}
    </div>
  );
}
