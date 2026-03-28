import type { NextConfig } from "next";

const nextConfig: any = {
  /* config options here */
  experimental: {},
  // Allowed Dev Origins for HMR over local network (as per dev log suggestion)
  allowedDevOrigins: ['192.168.0.106']
};

export default nextConfig;
