import { NextResponse, type NextRequest } from "next/server";
import { findRedirect } from "@/lookup/redirects-runtime";
import { updateAdminSession } from "@/lookup/supabase/session";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return updateAdminSession(request);
  }

  const redirect = await findRedirect(pathname);
  if (!redirect) return NextResponse.next();

  const target = new URL(redirect.destination, request.url);
  if (redirect.destination.startsWith("/") && !target.search) target.search = search;
  return NextResponse.redirect(target, redirect.statusCode);
}

export const config = {
  matcher: [
    // Admin: session refresh + optimistic login redirect.
    "/admin/:path*",
    // Managed redirects: every path except the core static pages, Next internals, API routes and files.
    // Keeping "/", "/projects" and "/contact" out of the proxy means the main pages get no extra latency.
    "/((?!_next/|api/|admin/|admin$|images/|icons/|projects$|contact$|.*\\.[A-Za-z0-9]+$).+)",
  ],
};
