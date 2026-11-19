import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isLocale, type Locale } from "@/i18n/config";
import { safeNextPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Auth callback for email links (sign-up confirmation, password recovery,
 * team invites, magic links). Supports the PKCE `?code=` flow, the
 * `?token_hash=&type=` flow (recommended email templates) and, via
 * /[locale]/auth-complete, tokens delivered in the URL fragment.
 *
 * Add `<your-site>/auth/callback` to Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next");

  const fromNext = rawNext?.split("/")[1];
  const cookieLocale = request.cookies.get("pm_locale")?.value;
  const locale: Locale = isLocale(fromNext) ? fromNext : isLocale(cookieLocale) ? cookieLocale : "en";

  // Recovery and invite links must land on the set-password page.
  const fallback = type === "recovery" || type === "invite" ? "/reset-password" : "/dashboard";
  const next = safeNextPath(rawNext, locale, fallback);
  const fail = new URL(`/${locale}/login?error=link`, request.url);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(fail);

  // Provider-reported failure (e.g. expired link).
  if (searchParams.get("error") || searchParams.get("error_code")) return NextResponse.redirect(fail);

  // No code/token in the query: tokens may be in the URL #fragment (implicit
  // flow, e.g. admin invites). Fragments survive redirects, so hand off to
  // the client page that can read them.
  if (!code && !(tokenHash && type)) {
    return NextResponse.redirect(new URL(`/${locale}/auth-complete?next=${encodeURIComponent(next)}`, request.url));
  }

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }
  return NextResponse.redirect(ok ? new URL(next, request.url) : fail);
}
