/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize server-only dependencies
      if (!config.externals) config.externals = [];
      const externals = Array.isArray(config.externals) ? config.externals : [config.externals];
      config.externals = [
        ...externals,
        'cloakbrowser',
        'playwright',
        'playwright-core',
        'chromium-bidi',
      ];
    } else {
      // For client bundles, ignore server-only packages
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'cloakbrowser': false,
        'playwright': false,
        'playwright-core': false,
        'chromium-bidi': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
