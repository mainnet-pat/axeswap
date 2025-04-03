import type { StorybookConfig } from "@storybook/nextjs";

import { join, dirname } from "path";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}
const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    // getAbsolutePath("@storybook/addon-onboarding"),
    getAbsolutePath("@storybook/addon-essentials"),
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-interactions"),
    // getAbsolutePath("@storybook/addon-queryparams"),
  ],
  framework: {
    name: getAbsolutePath("@storybook/nextjs"),
    options: {},
  },
  staticDirs: ["../public"],
  core: {
    disableTelemetry: true,
  },
  webpackFinal: async (config) => {
    config.experiments = { ...config.experiments, topLevelAwait: true }

    config.resolve!.alias!["fs"] = "@mainnet-pat/indexeddb-fs"
    config.resolve!.fallback!["child_process"] = false;

    config.resolve!.alias!["JSON"] = "@mainnet-pat/json5-bigint";

    // (globalThis as any).JSON = JSON5;
    // // (window as any).JSON = JSON5;
    // (global as any).JSON = JSON5;

    return config;
  }
};
export default config;
