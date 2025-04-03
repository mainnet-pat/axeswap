import type { Meta, StoryObj } from '@storybook/react';

import { OrderbookView } from './Orderbook';
import { SwapManagerContextProvider } from "@/providers/SwapManagerProvider";
import { SendXmr } from './SendXmr';
import { MineBlock } from './MineBlock';
import { RelayMultiaddrs } from '@/lib/RelayMultiaddrs';
import Providers from '@/app/providers';

//👇 This default export determines where your story goes in the story list
const meta: Meta<typeof OrderbookView> = {
  component: (props) => <div>
    <OrderbookView {...props} />
    {/* <SendXmr />
    <MineBlock /> */}
  </div>,
  decorators: (Story) => <Providers><Story /></Providers>,
} satisfies Meta<typeof OrderbookView>;

export default meta;
type Story = StoryObj<typeof OrderbookView>;

export const Default: Story = {
  args: {
    asset: "rBCH:native",
    targetAsset: "rXMR:native",
    version: "0.4.1",
    relayMultiaddrs: RelayMultiaddrs,
    open: true,
  },
};