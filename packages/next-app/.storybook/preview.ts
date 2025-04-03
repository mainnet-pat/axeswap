import type { Preview } from "@storybook/react";
import '../src/app/globals.css';

// (BigInt.prototype as any).toJSON = function () {
//   return this.toString();
// };

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
  },
};

export default preview;
