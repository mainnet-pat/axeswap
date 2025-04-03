import type { Meta, StoryObj } from '@storybook/react';

import { SwapStatus } from './SwapStatus';
import { Assets } from '@/lib/utils';
import JSON5 from "@mainnet-pat/json5-bigint";
import "@mainnet-pat/json5-bigint/lib/presets/extended";
import Providers from '@/app/providers';

const meta: Meta<typeof SwapStatus> = {
  component: SwapStatus,
  decorators: (Story) => <Providers><Story /></Providers>,
} satisfies Meta<typeof SwapStatus>;

export default meta;
type Story = StoryObj<typeof SwapStatus>;

export const Default: Story = {
  args: {
    swapId: "24cFkUNNiLjFiE",
  },
};
