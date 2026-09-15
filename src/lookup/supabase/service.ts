import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lookup/env";

/**
 * Privileged client using SUPABASE_SERVICE_ROLE_KEY. It bypasses RLS, so it is used ONLY to insert
 * public lead submissions. The `server-only` import makes any client-side import fail the build.
 */
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service client is not configured");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
