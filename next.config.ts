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

const discordInviteDestination = process.env.DISCORD_INVITE_URL as string;
const discordTeamDestination = process.env.DISCORD_TEAM_URL as string;
const virtualZoomJudgingDestination = process.env.VIRTUAL_ZOOM_JUDGING_URL as string;

const require = createRequire(import.meta.url);

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [require.resolve("remark-gfm")],
  },
});

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  experimental: {
    // Resume uploads go through a server action and may be up to 5 MB (MAX_FILE_SIZE).
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        // proxy.ts sets the Content-Security-Policy header, because it needs a new nonce per request.
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
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
