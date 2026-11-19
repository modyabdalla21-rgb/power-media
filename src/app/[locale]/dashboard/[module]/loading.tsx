export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
      <div className="h-10 w-80 max-w-full animate-pulse rounded-xl bg-white/[0.03]" />
      <div className="surface-card space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-white/[0.04]" />)}
      </div>
    </div>
  );
}
