import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Renamed from `middleware.ts` as of Next.js 16 — see node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "ndis_session";
const PUBLIC_PATHS = new Set(["/login"]);

// Optimistic check only: reads whether the session cookie is present, not whether
// it's still valid in the DB (that would be a slow data fetch, which Proxy isn't
// meant for). The real, authoritative check happens per-request via
// requirePermission()/getCurrentUser() in lib/rbac.ts and lib/session.ts.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(COOKIE_NAME);
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  if (!hasSessionCookie && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSessionCookie && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
