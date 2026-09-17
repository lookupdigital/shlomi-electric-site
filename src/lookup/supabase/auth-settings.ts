import "server-only";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lookup/env";

/** true when public sign-up is disabled in Supabase Auth; null when it cannot be determined. Cached 5 minutes. */
export async function isPublicSignupDisabled(): Promise<boolean | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey },
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    const settings = (await response.json()) as { disable_signup?: boolean };
    return settings.disable_signup === true;
  } catch {
    return null;
  }
}
