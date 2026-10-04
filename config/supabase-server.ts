import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * Supabase client bound to the current request's session cookies.
 * Use this for auth calls (getUser, signOut, exchangeCodeForSession).
 * Use `supabaseAdmin` for database and storage access from server actions.
 */
export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a server component, where cookies are read-only.
          // The proxy refreshes the session, so this can be ignored.
        }
      },
    },
  });
};
