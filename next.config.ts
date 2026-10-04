import { createRequire } from "module";

import createMDX from "@next/mdx";
import type { NextConfig } from "next";

import {
  JUDGE_REGISTRATION_PATH,
  WILDHACKS_HOME,
  TECH_ROOM_FINDER_PATH,
  JUDGING_GUIDE_PATH,
  DISCORD_INVITE_PATH,
  DISCORD_TEAM_PATH,
  DEVPOST_PATH,
  VIRTUAL_ZOOM_JUDGING_PATH,
} from "./constants/routes.constants";

const isDev = process.env.APP_ENV !== "production";
const discordInviteDestination = process.env.DISCORD_INVITE_URL as string;
const discordTeamDestination = process.env.DISCORD_TEAM_URL as string;
const virtualZoomJudgingDestination = process.env.VIRTUAL_ZOOM_JUDGING_URL as string;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWsUrl = supabaseUrl.replace(/^http/, "ws");

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} ${isDev ? "https://vercel.live" : ""};
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

const require = createRequire(import.meta.url);

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [require.resolve("remark-gfm")],
  },
});

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: WILDHACKS_HOME,
        destination: "https://www.wildhacks.net",
        basePath: false,
        permanent: false,
      },
      {
        source: JUDGE_REGISTRATION_PATH,
        destination:
          "https://docs.google.com/forms/d/e/1FAIpQLScyJ4OXjGQOlXSNj-nAZzdcXA1eQWc1URs2fsVpe2dahjlzXw/viewform?usp=dialog",
        basePath: false,
        permanent: false,
      },
      {
        source: TECH_ROOM_FINDER_PATH,
        destination: "https://www.mccormick.northwestern.edu/contact/tech-room-finder.html",
        basePath: false,
        permanent: false,
      },
      {
        source: JUDGING_GUIDE_PATH,
        destination: "https://guide.wildhacks.net/judging-and-awards/how-judging-works/",
        basePath: false,
        permanent: false,
      },
      {
        source: DISCORD_INVITE_PATH,
        destination: discordInviteDestination,
        basePath: false,
        permanent: false,
      },
      {
        source: DISCORD_TEAM_PATH,
        destination: discordTeamDestination,
        basePath: false,
        permanent: false,
      },
      {
        source: DEVPOST_PATH,
        destination: "https://wildhacks-2026.devpost.com/",
        basePath: false,
        permanent: false,
      },
      {
        source: VIRTUAL_ZOOM_JUDGING_PATH,
        destination: virtualZoomJudgingDestination,
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default withMDX(nextConfig);
