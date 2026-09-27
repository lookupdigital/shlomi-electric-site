// Identity of a Pages & SEO form. Pure (no React) so the reset rule is unit-tested.

/**
 * The form's fields are uncontrolled (defaultValue), so a reset that deletes the page_seo row would otherwise leave
 * the old values in the open form, where a later Save would write them back. A successful reset redirects with
 * `reset=<path>&at=<nonce>`; only that page's form gets a new key and remounts from the defaults (fields, previews,
 * states and the unsaved-changes baseline). Saving never changes the key, so its confirmation message stays.
 */
export function pageSeoFormKey(path: string, params: { reset?: string | string[]; at?: string | string[] }): string {
  return params.reset === path && typeof params.at === "string" ? `${path}#reset-${params.at}` : path;
}

export function resetRedirect(path: string, nonce: number | string): string {
  return `/admin/pages?reset=${encodeURIComponent(path)}&at=${encodeURIComponent(String(nonce))}`;
}
