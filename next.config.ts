import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const pagesBasePath = process.env.GITHUB_ACTIONS === "true" && repositoryName
  ? `/${repositoryName}`
  : "";
const pagesAssetPrefix = process.env.GITHUB_ACTIONS === "true" && process.env.VITE_SITE_URL
  ? process.env.VITE_SITE_URL.replace(/\/$/, "")
  : pagesBasePath;

const nextConfig: NextConfig = {
  output: "export",
  assetPrefix: pagesAssetPrefix,
  images: { unoptimized: true },
};

export default nextConfig;
