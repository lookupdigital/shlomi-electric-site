// Redirect rules: normalisation and validation (pure, shared by the admin and the proxy).

export type RedirectRule = { source_path: string; destination: string; status_code: number; active: boolean };

/** "/Old-Page/?x=1" stays case-sensitive but loses the query, hash and trailing slash; %-encoding is decoded. */
export function normalizePath(input: string): string {
  let path = input.trim().split(/[?#]/)[0] ?? "";
  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep the raw value when it is not valid percent-encoding.
  }
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path || "/";
}

export function isValidSourcePath(value: string): boolean {
  return /^\/[^\s]*$/.test(value.trim()) && !value.trim().startsWith("//") && value.trim().length <= 500;
}

export function isValidDestination(value: string): boolean {
  const destination = value.trim();
  if (destination.length === 0 || destination.length > 1000) return false;
  if (destination.startsWith("/")) return !destination.startsWith("//");
  try {
    const url = new URL(destination);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Returns the chain of paths that would loop if `candidate` were saved alongside the existing active rules,
 * or null when there is no loop. Absolute URLs leave the site and end the chain.
 */
export function findRedirectLoop(
  existing: Pick<RedirectRule, "source_path" | "destination">[],
  candidate: Pick<RedirectRule, "source_path" | "destination">,
): string[] | null {
  const map = new Map<string, string>();
  for (const rule of existing) map.set(normalizePath(rule.source_path), rule.destination);
  map.set(normalizePath(candidate.source_path), candidate.destination);

  const chain: string[] = [];
  let current = normalizePath(candidate.source_path);
  for (let step = 0; step <= map.size; step += 1) {
    if (chain.includes(current)) return [...chain, current];
    chain.push(current);
    const next = map.get(current);
    if (!next || !next.startsWith("/")) return null;
    current = normalizePath(next);
  }
  return [...chain, current];
}
