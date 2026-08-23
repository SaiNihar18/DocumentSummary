/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
    outputFileTracingIncludes: {
      "/api/extract-pdf": ["./node_modules/@napi-rs/canvas-linux-x64-gnu/**"],
    },
  },
};

module.exports = nextConfig;
