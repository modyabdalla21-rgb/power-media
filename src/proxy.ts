import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { isDashboardPreview, isSupabaseConfigured } from "@/lib/env";
import { updateSession } from "@/lib/supabase/proxy";

const LOCALE_COOKIE = "pm_locale";

function detectLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  const accept = request.headers.get("accept-language") ?? "";
  const preferred = accept
    .split(",")
    .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase());
  return (preferred.find((l) => isLocale(l)) as Locale | undefined) ?? defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];

  // 1. Ensure every page route is locale-prefixed.
  if (!isLocale(segment)) {
    const locale = detectLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, segment, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  // 2. Protect the dashboard.
  const isDashboard = pathname.startsWith(`/${segment}/dashboard`);
  if (!isDashboard) return response;

  if (!isSupabaseConfigured) {
    if (isDashboardPreview) return response;
    const url = request.nextUrl.clone();
    url.pathname = `/${segment}/login`;
    return NextResponse.redirect(url);
  }

  const { user } = await updateSession(request, response);
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${segment}/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Skip API routes, Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|brand|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\..*).*)"],
};

