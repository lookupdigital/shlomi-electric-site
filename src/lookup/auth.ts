import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lookup/env";
import { createSessionClient } from "@/lookup/supabase/server";

type SessionClient = Awaited<ReturnType<typeof createSessionClient>>;

export type AdminContext =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "forbidden"; user: User }
  | { status: "admin"; user: User; supabase: SessionClient };

/**
 * Verifies the session with Supabase Auth (getUser) and checks the admin_users allowlist.
 * Wrapped in React cache(): the layout, the page and helpers share ONE verification per request.
 */
export const getAdminContext = cache(async (): Promise<AdminContext> => {
  // Admin pages are always rendered per request — never prerendered or cached.
  await connection();
  if (!isSupabaseConfigured) return { status: "unconfigured" };
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "anonymous" };

  const { data } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!data) return { status: "forbidden", user };
  return { status: "admin", user, supabase };
});

/** Server-side gate for every admin page and Server Action. Hidden UI is never the security boundary. */
export async function requireAdmin() {
  const context = await getAdminContext();
  if (context.status === "admin") return context;
  // The login page explains each state: not configured, signed out, or signed in without admin rights.
  redirect("/admin/login");
}
