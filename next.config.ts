import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // cacheComponents & partialPrefetching dimatikan: halaman admin membaca cookie
  // di server, dan mode itu menolak route dinamis kecuali dibungkus Suspense.

  // output standalone = hasil build jadi satu folder berisi server.js mandiri,
  // image Docker jadi kecil (tidak ikut menyalin node_modules penuh)
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
