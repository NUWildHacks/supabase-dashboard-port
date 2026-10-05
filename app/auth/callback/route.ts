import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/config/supabase-server";
import { LOGIN_CLOSED_ERROR, LOGIN_FAILED_ERROR, LOGIN_PATH } from "@/constants";
import { validateRedirectPath } from "@/lib";

import { checkUserCanLogin } from "../../login/_lib/check-user-can-login";

/**
 * OAuth callback for Google and GitHub sign-in.
 * Exchanges the one-time code for a session cookie, checks that the user may log in,
 * then sends them to the page they asked for (or back to the login page with an error).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirectTo = validateRedirectPath(searchParams.get("redirect"));

  const loginUrl = (error: string) => {
    const url = new URL(LOGIN_PATH, origin);
    url.searchParams.set("error", error);
    return url;
  };

  if (!code) {
    return NextResponse.redirect(loginUrl(LOGIN_FAILED_ERROR));
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("OAuth code exchange error:", error.message);
    return NextResponse.redirect(loginUrl(LOGIN_FAILED_ERROR));
  }

  const result = await checkUserCanLogin();
  if (!result.success) {
    await supabase.auth.signOut();
    return NextResponse.redirect(loginUrl(LOGIN_CLOSED_ERROR));
  }

  return NextResponse.redirect(new URL(redirectTo, origin));
}
