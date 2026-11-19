import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "orange" | "neutral" | "success";
const tones: Record<Tone, string> = {
  blue: "border-blue/30 bg-blue/10 text-blue-300",
  orange: "border-orange/30 bg-orange/10 text-yellow",
  neutral: "border-line-strong bg-white/5 text-ink-muted",
  success: "border-blue/30 bg-blue/15 text-white",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
