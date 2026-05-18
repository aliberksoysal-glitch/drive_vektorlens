/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  reactStrictMode: true,
  /** DevTools segment explorer bazı ortamlarda RSC client manifest hatası üretebiliyor (SegmentViewNode). */
  devIndicators: false,
  experimental: {
    devtoolSegmentExplorer: false,
  },
  webpack: (config, { dev }) => {
    if (dev && config.watchOptions) {
      const prev = config.watchOptions.ignored;
      const extra = [
        /(^|[\\/])(pagefile\.sys|hiberfil\.sys|swapfile\.sys|DumpStack\.log\.tmp)([\\/]|$)/i,
        /(^|[\\/])System Volume Information([\\/]|$)/i,
      ];
      config.watchOptions.ignored = Array.isArray(prev)
        ? [...prev, ...extra]
        : prev != null
          ? [prev, ...extra]
          : extra;
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
