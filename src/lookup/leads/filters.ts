// Lead list search and filters, shared by the admin list page and the CSV export route.

export const LEAD_STATUSES = ["new", "contacted", "closed", "spam"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type LeadFilters = {
  q: string;
  status: LeadStatus | "all";
  form: string;
  source: string;
  /** YYYY-MM-DD, inclusive (UTC). */
  from: string;
  /** YYYY-MM-DD, inclusive (UTC). */
  to: string;
  includeTest: boolean;
};

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function read(params: ParamSource, key: string): string {
  const value = params instanceof URLSearchParams ? params.get(key) : params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Removes characters with meaning in PostgREST filter syntax so user input stays a plain search term. */
export function sanitizeSearchTerm(value: string): string {
  return value
    .replace(/[%,()*\\:"'.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

export function parseLeadFilters(params: ParamSource): LeadFilters {
  const status = read(params, "status");
  const form = read(params, "form");
  return {
    q: sanitizeSearchTerm(read(params, "q")),
    status: isLeadStatus(status) ? status : "all",
    form: /^[a-z0-9_-]{1,60}$/.test(form) ? form : "",
    source: sanitizeSearchTerm(read(params, "source")),
    from: DATE.test(read(params, "from")) ? read(params, "from") : "",
    to: DATE.test(read(params, "to")) ? read(params, "to") : "",
    includeTest: read(params, "test") === "1",
  };
}

export function leadFiltersToQuery(filters: LeadFilters, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.form) params.set("form", filters.form);
  if (filters.source) params.set("source", filters.source);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.includeTest) params.set("test", "1");
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** The subset of the Supabase query builder used here. */
export type LeadFilterQuery<T> = {
  eq(column: string, value: string | boolean): T;
  gte(column: string, value: string): T;
  lt(column: string, value: string): T;
  ilike(column: string, pattern: string): T;
  or(filters: string): T;
};

function nextDay(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

export function applyLeadFilters<T extends LeadFilterQuery<T>>(query: T, filters: LeadFilters): T {
  let result = query;
  if (!filters.includeTest) result = result.eq("is_test", false);
  if (filters.status !== "all") result = result.eq("status", filters.status);
  if (filters.form) result = result.eq("form_name", filters.form);
  if (filters.source) result = result.ilike("utm_source", `%${filters.source}%`);
  if (filters.from) result = result.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) result = result.lt("created_at", `${nextDay(filters.to)}T00:00:00Z`);
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    result = result.or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`);
  }
  return result;
}
