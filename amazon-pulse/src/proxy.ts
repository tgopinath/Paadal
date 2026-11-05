import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth check: in production, requests without a session cookie go
 * to /login. The session itself is verified on the server (AuthGate in the
 * app layout and in route handlers); this only avoids rendering for
 * signed-out visitors.
 */
export function proxy(request: NextRequest) {
  if (process.env.APP_MODE !== "production") return NextResponse.next();
  if (request.cookies.has("pulse_session")) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except auth pages, Next internals, PWA files and static assets.
  matcher: ["/((?!login|signup|_next/|icons/|sw\\.js|offline\\.html|manifest\\.webmanifest|icon\\.svg|apple-icon\\.png|api/ingest).*)"],
};
