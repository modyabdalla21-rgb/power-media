import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/**
 * Refreshes the Supabase session cookie on every matched request and returns
 * the authenticated user (or null). Used by src/proxy.ts.
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Verifies the JWT (locally with asymmetric keys) and refreshes an expired session.
  const { data, error } = await supabase.auth.getClaims();
  const user = !error && data?.claims?.sub ? { id: data.claims.sub } : null;
  return { user, response };
}
