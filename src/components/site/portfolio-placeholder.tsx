import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const backgrounds = [
  "from-blue/30 via-surface-2 to-surface-1",
  "from-orange/20 via-surface-2 to-surface-1",
  "from-blue/20 via-surface-3 to-surface-1",
];

/** Honest placeholder for portfolio slots until client-approved work is published. */
export function PortfolioPlaceholder({ category, label, body, variant = 0 }: { category: string; label: string; body: string; variant?: number }) {
  return (
    <div className="surface-card group overflow-hidden p-0">
      <div className={cn("relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br", backgrounds[variant % backgrounds.length])}>
        <div aria-hidden className="bg-grid absolute inset-0 opacity-60" />
        <ImageIcon className="relative size-8 text-white/25" aria-hidden />
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">{category}</p>
          <p className="mt-1 text-sm text-ink-muted">{body}</p>
        </div>
        <span className="shrink-0 rounded-full border border-line-strong px-2.5 py-1 text-[11px] text-ink-subtle">{label}</span>
      </div>
    </div>
  );
}
