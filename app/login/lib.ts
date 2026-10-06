import type { Provider } from "@supabase/supabase-js";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/config/supabase-browser";
import { AUTH_CALLBACK_PATH } from "@/constants";
import { validateRedirectPath } from "@/lib/path.lib";

/**
 * Start an OAuth sign-in. The browser leaves the page for the provider, then returns to
 * the auth callback route, which creates the session and redirects to `?redirect=` (if valid).
 * Supabase links Google and GitHub identities that share a verified email automatically.
 *
 * @param provider - The OAuth provider ("google" or "github")
 * @param scopes - Optional space-separated provider scopes
 */
export const signInWithProvider = async (provider: Provider, scopes?: string) => {
  const supabase = createSupabaseBrowserClient();

  const searchParams = new URLSearchParams(window.location.search);
  const redirectTo = validateRedirectPath(searchParams.get("redirect"));

  const callbackUrl = new URL(AUTH_CALLBACK_PATH, window.location.origin);
  callbackUrl.searchParams.set("redirect", redirectTo);

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl.toString(), scopes },
  });

  if (error) {
    toast.error("Login failed", { description: error.message });
  }
};
