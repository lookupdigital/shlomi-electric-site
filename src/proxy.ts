import { NextResponse, type NextRequest } from "next/server";
import { findRedirect, isPublishedSlug } from "@/lookup/proxy-data";
import { updateAdminSession } from "@/lookup/supabase/session";
import { siteConfig } from "@/site.config";

/** Static route that renders the site's 404 page (see src/app/(site)/lookup-post-not-found). */
const MISSING_POST_ROUTE = "/lookup-post-not-found";

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  // Optional host isolation: serve the admin only from NEXT_PUBLIC_ADMIN_HOST (e.g. admin.example.com).
  const adminHost = process.env.NEXT_PUBLIC_ADMIN_HOST;
  if (adminHost && isAdminPath && request.headers.get("host") !== adminHost) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, `https://${adminHost}`));
  }

  if (isAdminPath) return updateAdminSession(request);

  const redirect = await findRedirect(pathname);
  if (redirect) {
    const target = new URL(redirect.destination, request.url);
    if (redirect.destination.startsWith("/") && !target.search) target.search = search;
    return NextResponse.redirect(target, redirect.statusCode);
  }

  // Unknown blog slugs are answered from a static 404 page instead of rendering (and ISR-caching) a 404 per URL.
  const blogPrefix = `${siteConfig.routes.blog.path}/`;
  if (pathname.startsWith(blogPrefix)) {
    const slug = decodeSegment(pathname.slice(blogPrefix.length).replace(/\/+$/, ""));
    if (slug && !slug.includes("/") && (await isPublishedSlug(slug)) === false) {
      return NextResponse.rewrite(new URL(MISSING_POST_ROUTE, request.url), { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Admin: session refresh + optimistic login redirect (+ optional admin host isolation).
    "/admin/:path*",
    // Managed redirects and blog slug checks: every path except the core pages (siteConfig.routes.corePages —
    // a unit test keeps this list in sync), Next internals, API routes and files.
    "/((?!_next/|api/|admin/|admin$|images/|icons/|projects$|contact$|.*\\.[A-Za-z0-9]+$).+)",
  ],
};
