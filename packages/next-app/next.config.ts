import type { NextConfig } from "next";
import path from "path";
// @ts-ignore-next-line
import FilterWarningsPlugin from "webpack-filter-warnings-plugin";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.experiments = { ...config.experiments, topLevelAwait: true }

    if (!isServer) {
      config.resolve.alias.fs = require.resolve("@mainnet-pat/indexeddb-fs");
      config.resolve.fallback.child_process = false;
    }

    config.plugins = [
      ...config.plugins,
      new FilterWarningsPlugin({
        exclude: [/Critical dependency/, /The generated code contains/],
      })
    ];

    return config;
  },
};

export default nextConfig;
