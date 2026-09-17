import { getSiteSettings } from "@/lookup/settings";
import { siteIconUrl } from "@/lookup/settings-model";

// Browsers and crawlers also request /favicon.ico directly. There is deliberately no static favicon file in app/:
// Next.js would emit it ahead of the admin-configured icon and browsers would keep using it. This redirects to the
// favicon set in Admin → Site settings (or the logo when none is set).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const settings = await getSiteSettings();
  return Response.redirect(new URL(siteIconUrl(settings), request.url), 307);
}
