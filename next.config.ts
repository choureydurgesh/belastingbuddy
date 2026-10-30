import type { NextConfig } from "next";

// "export" turns the site into plain HTML/CSS/JS files in the "out" folder.
// Cloudflare Pages can host those files directly.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
