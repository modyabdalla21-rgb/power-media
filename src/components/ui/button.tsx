import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "energy";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-300 ease-(--ease-out-expo) disabled:pointer-events-none disabled:opacity-50 rounded-(--radius-control)";

const variants: Record<Variant, string> = {
  primary:
    "bg-blue text-white shadow-[0_8px_30px_-8px_rgb(7_137_232/0.7)] hover:bg-blue-400 hover:shadow-[0_10px_40px_-6px_rgb(7_137_232/0.85)] active:bg-blue-600",
  secondary: "border border-line-strong bg-white/[0.03] text-white hover:border-blue/50 hover:bg-blue/10",
  ghost: "text-ink-muted hover:text-white hover:bg-white/5",
  energy:
    "bg-gradient-to-r from-yellow to-orange text-navy shadow-(--shadow-glow-orange) hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

type LinkButtonProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
