/**
 * Build the Content-Security-Policy header. Inline scripts run only with this request's nonce,
 * so injected inline scripts are blocked; the app's own script files load from 'self'.
 * proxy.ts creates a new nonce for every request.
 */
export const buildContentSecurityPolicy = (nonce: string) => {
  // Use the strict policy unless the environment is explicitly a development one, so a missing
  // APP_ENV never relaxes production.
  const isDev = process.env.APP_ENV === "development" || process.env.NODE_ENV === "development";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseWsUrl = supabaseUrl.replace(/^http/, "ws");

  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' ${isDev ? "'unsafe-eval' https://vercel.live" : ""};
    style-src 'self' ${isDev ? "https://vercel.live" : ""} 'unsafe-inline';
    img-src 'self' ${isDev ? "https://vercel.live https://vercel.com" : ""} blob: data:;
    font-src 'self' ${isDev ? "https://vercel.live https://assets.vercel.com" : ""} data:;
    connect-src 'self' ${isDev ? "https://vercel.live wss://ws-us3.pusher.com" : ""} ${supabaseUrl} ${supabaseWsUrl};
    frame-src 'self' ${isDev ? "https://vercel.live" : ""};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${isDev ? "" : "upgrade-insecure-requests;"}
  `
    .replace(/\s{2,}/g, " ")
    .trim();
};

export const NONCE_HEADER = "x-nonce";
