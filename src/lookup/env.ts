// Environment access for the Lookup infrastructure.
// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them for the browser.
// SUPABASE_SERVICE_ROLE_KEY is intentionally NOT read here — only src/lookup/supabase/service.ts reads it.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = supabaseUrl !== "" && supabaseAnonKey !== "";
