import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Core config
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
 
  distDir: '.next',
  // Image config
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' }
    ],
  },

  // Updated for Next.js 15
  serverExternalPackages: [
    'firebase-admin',
    'genkit',
    '@genkit-ai/core',
    'handlebars'
  ],

  // Webpack config
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      handlebars: 'handlebars/dist/cjs/handlebars.js'
    };
    return config;
  }
};

export default nextConfig;