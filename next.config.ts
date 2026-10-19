import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "image.mux.com" },
      { protocol: "https", hostname: "**.cloudflarestream.com" },
    ],
  },
};

export default nextConfig;
