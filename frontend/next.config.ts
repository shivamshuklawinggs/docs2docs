import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploy under /docks2doc subdirectory
  basePath: '/docks2doc',
  assetPrefix: '/docks2doc',
  
  // Ensure trailing slash handling works correctly
  trailingSlash: false,
  
  // Output configuration for standalone deployment
  output: 'standalone',
};

export default nextConfig;
