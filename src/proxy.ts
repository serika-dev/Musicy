import { type NextRequest, NextResponse } from "next/server";

const NO_STORE =
  "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0, no-transform";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const accept = request.headers.get("accept") ?? "";
  const isAppRouteRequest =
    request.method === "GET" &&
    (accept.includes("text/html") ||
      accept.includes("text/x-component") ||
      request.headers.has("rsc") ||
      request.nextUrl.searchParams.has("_rsc")) &&
    !pathname.startsWith("/_next/") &&
    pathname !== "/sw.js";
  const isApiRequest = pathname.startsWith("/api/");

  if (isAppRouteRequest || isApiRequest) {
    response.headers.set("Cache-Control", NO_STORE);
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  }

  response.headers.set("X-Content-Type-Options", "nosniff");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon.png|manifest.json).*)",
  ],
};
