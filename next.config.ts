import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const pagesBasePath = process.env.GITHUB_ACTIONS === "true" && repositoryName
  ? `/${repositoryName}`
  : "";

const nextConfig: NextConfig = {
  output: "export",
  assetPrefix: pagesBasePath,
  images: { unoptimized: true },
};

export default nextConfig;
