import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { isDashboardPreview, isSupabaseConfigured } from "@/lib/env";
import { updateSession } from "@/lib/supabase/proxy";

const LOCALE_COOKIE = "pm_locale";
/** Pages only for signed-out visitors. */
const GUEST_ONLY = ["/login", "/signup", "/forgot-password"];

function detectLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  const accept = request.headers.get("accept-language") ?? "";
  const preferred = accept.split(",").map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase());
  return (preferred.find((l) => isLocale(l)) as Locale | undefined) ?? defaultLocale;
}

/** Redirect while keeping any refreshed auth cookies. */
function redirectWith(response: NextResponse, request: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];

  // 1. Ensure every page route is locale-prefixed.
  if (!isLocale(segment)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${detectLocale(request)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request });
  response.cookies.set(LOCALE_COOKIE, segment, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  const rest = pathname.slice(segment.length + 1) || "/";
  const isDashboard = rest === "/dashboard" || rest.startsWith("/dashboard/");
  const isGuestOnly = GUEST_ONLY.includes(rest);
  const needsSession = isDashboard || isGuestOnly || rest === "/reset-password";
  if (!needsSession) return response;

  if (!isSupabaseConfigured) {
    if (isDashboard && !isDashboardPreview) return redirectWith(response, request, `/${segment}/login`);
    return response;
  }

  // 2. Refresh the session cookie and route by auth state.
  const { user } = await updateSession(request, response);
  if (isDashboard && !user) return redirectWith(response, request, `/${segment}/login`, { next: pathname });
  if (isGuestOnly && user) return redirectWith(response, request, `/${segment}/dashboard`);
  return response;
}

export const config = {
  // Skip API routes, the auth callback, Next internals and static files.
  matcher: ["/((?!api|auth/|_next/static|_next/image|brand|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\..*).*)"],
};
