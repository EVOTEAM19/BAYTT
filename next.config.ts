import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/**',
      },
    ],
    // Permitir imágenes sin optimización en desarrollo
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
