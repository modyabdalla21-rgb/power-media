"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LimitInfo } from "@/components/client/upgrade-modal";
import type { Dictionary } from "@/i18n/dictionaries/en";

type ErrorCode = keyof Dictionary["dashboard"]["ai"]["errors"];

/**
 * Run a Brand hub AI tool once, on demand (never in the background).
 * Opens the upgrade modal on plan limits and refreshes the page on success.
 */
export function useAiRun(slug: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<{ code: ErrorCode; retryAfter?: number } | null>(null);
  const [limit, setLimit] = useState<LimitInfo | null>(null);

  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function run(inputs: Record<string, string>) {
    if (busy) return null;
    setBusy(true);
    setElapsed(0);
    setError(null);
    try {
      const res = await fetch(`/api/ai/${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inputs }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh();
        return data as Record<string, unknown>;
      }
      if (data.code === "planLimit") setLimit({ tier: data.tier ?? "free", quota: data.quota === "identity" ? "identity" : "ai", limit: Number(data.limit) || 0 });
      setError({ code: (data.code as ErrorCode) ?? (res.status === 504 ? "timeout" : "unknown"), retryAfter: data.retryAfter });
      return null;
    } catch {
      setError({ code: "network" });
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { run, busy, elapsed, error, limit, clearLimit: () => setLimit(null) };
}
