import { NextRequest, NextResponse } from "next/server";
import { countryToLang, UI_LANG_DETECT_COOKIE } from "@/lib/i18n";

/**
 * M2.3: IP-based language detection (zero cost, no third-party API).
 *
 * Runs on Vercel Edge before page requests:
 * - Reads the country header provided by Vercel (x-vercel-ip-country),
 *   falling back to Cloudflare's cf-ipcountry when proxied.
 * - Writes excelpilot_ui_lang_detect=<lang> as a plain cookie.
 *
 * The cookie is ONLY an IP-inferred candidate: the client resolution order
 * (localStorage -> navigator.language -> cookie -> zh) guarantees it never
 * overrides a manual choice or the browser language.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only page requests: skip API routes, Next internals and static assets.
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.\w+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const country = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");
  const candidate = countryToLang(country);

  const response = NextResponse.next();
  response.cookies.set(UI_LANG_DETECT_COOKIE, candidate, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};