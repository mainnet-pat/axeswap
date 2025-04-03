import type { Meta, StoryObj } from '@storybook/react';

import { SwapCard } from './SwapCard';
import { SendBch } from './SendBch';
import { MineBlock } from './MineBlock';
import Providers from '@/app/providers';

const meta: Meta<typeof SwapCard> = {
  component: (props) => <div>
    <SwapCard {...props} />
    {/* <SendBch />
    <MineBlock /> */}
  </div>,
  decorators: (Story) => <Providers><Story /></Providers>,
} satisfies Meta<typeof SwapCard>;

export default meta;
type Story = StoryObj<typeof SwapCard>;

export const Default: Story = {
  args: {
  },
};
