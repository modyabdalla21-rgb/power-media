"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Notice } from "@/components/auth/auth-shell";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Completes auth for email links that return tokens in the URL fragment
 * (e.g. admin invites with the default email template). The fragment never
 * reaches the server, so the session is set here, in the browser.
 */
export function HashSessionHandler({ next, loginHref, t }: { next: string; loginHref: string; t: { linkError: string; backToSignIn: string; loading: string } }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    // Remove tokens from the address bar/history immediately.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    const complete = async () => {
      if (!access_token || !refresh_token) return setFailed(true);
      const { error } = await createSupabaseBrowserClient().auth.setSession({ access_token, refresh_token });
      if (error) setFailed(true);
      else window.location.replace(next);
    };
    void complete();
  }, [next]);

  if (failed) {
    return (
      <>
        <Notice tone="warn">{t.linkError}</Notice>
        <Link href={loginHref} className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-blue-300 hover:text-white">{t.backToSignIn}</Link>
      </>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm text-ink-muted" role="status">
      <Loader2 className="size-4 animate-spin text-blue-300" aria-hidden />
      {t.loading}
    </p>
  );
}
