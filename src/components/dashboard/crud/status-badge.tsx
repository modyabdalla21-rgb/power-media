import { cn } from "@/lib/utils";

const positive = new Set(["active", "paid", "done", "won", "published", "completed", "qualified", "admin"]);
const attention = new Set(["overdue", "urgent", "high", "paused", "on_hold", "lost", "churned", "new", "review"]);
const muted = new Set(["draft", "void", "cancelled", "todo", "low", "client"]);

/** Status pill — brand blue for positive, orange/yellow for attention. */
export function StatusBadge({ value, label }: { value: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        positive.has(value) && "border-blue/30 bg-blue/15 text-blue-300",
        attention.has(value) && "border-orange/30 bg-orange/10 text-yellow",
        muted.has(value) && "border-line-strong bg-white/5 text-ink-subtle",
        !positive.has(value) && !attention.has(value) && !muted.has(value) && "border-line-strong bg-white/5 text-ink-muted",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
