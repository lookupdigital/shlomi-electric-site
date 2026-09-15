type LeadAttribution = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  ttclid?: string | null;
  referrer?: string | null;
};

/** Human-readable source for the leads admin: UTMs first, then ad click IDs, then the referrer. */
export function leadSource(lead: LeadAttribution, directLabel: string): { source: string; campaign: string | null } {
  const campaign = lead.utm_campaign ?? null;
  if (lead.utm_source) return { source: [lead.utm_source, lead.utm_medium].filter(Boolean).join(" / "), campaign };
  if (lead.gclid || lead.gbraid || lead.wbraid) return { source: "Google Ads", campaign };
  if (lead.fbclid) return { source: "Meta", campaign };
  if (lead.ttclid) return { source: "TikTok", campaign };
  if (lead.referrer) {
    try {
      return { source: new URL(lead.referrer).hostname, campaign };
    } catch {
      // ignore malformed referrer
    }
  }
  return { source: directLabel, campaign };
}
