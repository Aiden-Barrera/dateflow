import type { NextConfig } from "next";

function getAllowedDevOrigins(): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return [];
  }

  try {
    return [new URL(appUrl).host];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
};

export default nextConfig;
