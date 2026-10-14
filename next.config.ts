import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['sharp', 'mpg123-decoder'],
  // Allow the 16 MiB song plus multipart overhead through Next's bounded
  // proxy buffer. Each route still enforces its own smaller body/file limit.
  experimental: { proxyClientMaxBodySize: 17 * 1024 * 1024 },
};
export default config;
