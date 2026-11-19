import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, interactive, ...props }: ComponentProps<"div"> & { interactive?: boolean }) {
  return <div className={cn("surface-card p-6", interactive && "ring-glow-hover", className)} {...props} />;
}
