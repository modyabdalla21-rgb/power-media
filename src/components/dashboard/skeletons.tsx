import { cn } from "@/lib/utils";

/** Lightweight CSS-only placeholders shown instantly while a dashboard route loads. */
const Bar = ({ className }: { className?: string }) => <div className={cn("animate-pulse rounded-lg bg-white/[0.05]", className)} />;

function Header() {
  return (
    <div className="space-y-3 border-b border-line pb-6">
      <Bar className="h-8 w-64 max-w-[70%]" />
      <Bar className="h-4 w-96 max-w-full" />
    </div>
  );
}

/** Generic page: header, stat row and two panels. */
export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <Header />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="surface-card h-24 animate-pulse" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="surface-card space-y-3 p-5 lg:col-span-3">
          {Array.from({ length: 5 }).map((_, i) => <Bar key={i} className="h-9" />)}
        </div>
        <div className="surface-card space-y-3 p-5 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => <Bar key={i} className="h-14" />)}
        </div>
      </div>
    </div>
  );
}

/** AI tool page: brief form + output panel. */
export function ToolSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <Header />
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="surface-card space-y-5 p-4 sm:p-6 xl:col-span-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Bar className="h-3.5 w-28" />
              <Bar className="h-11" />
            </div>
          ))}
          <Bar className="h-12 bg-orange/20" />
        </div>
        <div className="surface-card min-h-[22rem] p-4 sm:p-6 xl:col-span-3">
          <Bar className="h-4 w-32" />
          <div className="mt-6 space-y-3">
            {[92, 70, 84, 60].map((w) => <Bar key={w} className="h-3" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Brand hub: section chips, readiness + analysis, tasks. */
export function HubSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <Header />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => <Bar key={i} className="h-10 w-24 shrink-0 rounded-full" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="surface-card space-y-3 p-5 lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="size-20 shrink-0 animate-pulse rounded-full bg-white/[0.05]" />
            <div className="flex-1 space-y-2"><Bar className="h-4 w-32" /><Bar className="h-3" /></div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => <Bar key={i} className="h-8" />)}
        </div>
        <div className="surface-card space-y-3 p-5 lg:col-span-3">
          {Array.from({ length: 6 }).map((_, i) => <Bar key={i} className="h-10" />)}
        </div>
      </div>
    </div>
  );
}
