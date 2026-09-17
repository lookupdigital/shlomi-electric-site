import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lookup/env";
import { ADMIN_AUTH_COOKIE, adminCookieOptions, isSupabaseAuthCookie, withAdminLifetime } from "@/lookup/supabase/cookies";
import type { Database } from "@/lookup/supabase/database.types";

/**
 * Runs in proxy.ts for /admin: refreshes the session cookies, removes legacy JavaScript-readable auth cookies,
 * and sends signed-out visitors to the login page. This is an optimistic check only — every admin page and
 * Server Action re-verifies the user with Supabase Auth on the server.
 */
export async function updateAdminSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const legacyCookies = request.cookies.getAll().filter((cookie) => isSupabaseAuthCookie(cookie.name));
  const finalize = (result: NextResponse) => {
    for (const cookie of legacyCookies) result.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
    return result;
  };
  if (!isSupabaseConfigured) return finalize(response);

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: { ...adminCookieOptions, name: ADMIN_AUTH_COOKIE },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, withAdminLifetime(options));
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Refreshes an expired access token and verifies the JWT signature (locally with asymmetric signing keys).
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && request.nextUrl.pathname !== "/admin/login") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    return finalize(NextResponse.redirect(loginUrl));
  }
  return finalize(response);
}
