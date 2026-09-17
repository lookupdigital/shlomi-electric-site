import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lookup/env";
import type { Database } from "@/lookup/supabase/database.types";

/**
 * Privileged client using SUPABASE_SERVICE_ROLE_KEY. It bypasses RLS, so it is used ONLY for the public lead
 * pipeline (insert, rate limiting, notification state). `server-only` makes any client-side import fail the build.
 */
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service client is not configured");
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
