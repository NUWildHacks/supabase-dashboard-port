import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { LOGIN_PATH, PROTECTED_ROUTES } from "@/constants";
import { buildContentSecurityPolicy, NONCE_HEADER } from "@/lib/csp.lib";
import { validateRedirectPath } from "@/lib/path.lib";

/**
 * Refreshes the Supabase session cookie on every request and redirects signed-out users
 * away from protected routes. This is a fast check of the signed JWT only; full verification
 * against the Supabase Auth server happens later in verifySession().
 * It also sets the Content-Security-Policy header with a new script nonce for every request.
 */
export async function proxy(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);

  // Next.js reads the nonce from the request's CSP header and adds it to its own scripts.
  const nextResponse = () => {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(NONCE_HEADER, nonce);
    requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
    return NextResponse.next({ request: { headers: requestHeaders } });
  };

  let response = nextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = nextResponse();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Do not run code between createServerClient and getClaims(): getClaims() refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const currentPath = req.nextUrl.pathname;
  const isProtectedRoute = (PROTECTED_ROUTES as readonly string[]).includes(currentPath);

  if (isProtectedRoute && !isSignedIn) {
    const loginUrl = new URL(LOGIN_PATH, req.url);
    const redirectPath = validateRedirectPath(req.nextUrl.pathname);
    loginUrl.searchParams.set("redirect", redirectPath);

    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    redirectResponse.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return redirectResponse;
  }

  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
