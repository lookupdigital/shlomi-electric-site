import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lookup/env";
import { ADMIN_AUTH_COOKIE, adminCookieOptions, withAdminLifetime } from "@/lookup/supabase/cookies";
import type { Database } from "@/lookup/supabase/database.types";

/** Anon-key client bound to the request's admin auth cookies. RLS applies to every query. */
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: { ...adminCookieOptions, name: ADMIN_AUTH_COOKIE },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, withAdminLifetime(options));
        } catch {
          // Server Components cannot set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
