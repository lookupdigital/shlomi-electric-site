import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lookup/env";
import type { Database } from "@/lookup/supabase/database.types";

/** Cookie-less anon client for public, cacheable reads. Every table it can reach is protected by RLS. */
export function createPublicClient() {
  if (!isSupabaseConfigured) return null;
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
