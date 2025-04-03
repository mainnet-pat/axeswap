import type { Meta, StoryObj } from '@storybook/react';

import { SwapAssetCard } from './SwapAssetCard';
import { Assets } from '@/lib/utils';

const meta: Meta<typeof SwapAssetCard> = {
  component: SwapAssetCard,
} satisfies Meta<typeof SwapAssetCard>;

export default meta;
type Story = StoryObj<typeof SwapAssetCard>;

export const Default: Story = {
  args: {
    cardTitle: 'Sell',
    asset: Assets.mainnet[0],
  },
};
