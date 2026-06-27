/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Externalize server-only dependencies to prevent bundling issues
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'cloakbrowser',
        'playwright',
        'playwright-core',
      ];
    } else {
      // For client bundles, mark these as external/ignore
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'cloakbrowser': false,
        'playwright': false,
        'playwright-core': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
