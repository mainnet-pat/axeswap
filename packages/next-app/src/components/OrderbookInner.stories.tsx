import type { Meta, StoryObj } from '@storybook/react';

import { OrderbookInner } from './OrderbookInner';
import { Order, Orderbook, SwapManager } from '@xmr-bch-swap/swap';
import { RelayMultiaddrs } from '@/lib/RelayMultiaddrs';
import { createEd25519PeerId } from '@libp2p/peer-id-factory';
import Providers from '@/app/providers';

// (BigInt.prototype as any).toJSON = function () {
//   return this.toString();
// };

const meta: Meta<typeof OrderbookInner> = {
  component: OrderbookInner,
  decorators: (Story) => <Providers><Story /></Providers>,
} satisfies Meta<typeof OrderbookInner>;

export default meta;
type Story = StoryObj<typeof OrderbookInner>;

const peerId = await createEd25519PeerId();

export const Default: Story = {
  args: {
    orderbook: new Orderbook("rBCH:native", "rXMR:native", "0.4.1", RelayMultiaddrs, peerId),
    orders: [
      {
        agent: "user",
        amountA: 1e8,
        amountB: 1.43e12,
        expiresAt: 1740402388382,
        id: "93nd5CA2jBHkKQ",
        isMine: true,
        peerId: (await createEd25519PeerId()).toString(),
        transportPeerId: (await createEd25519PeerId()).toString(),
      },
      {
        agent: "user",
        amountA: 0.92e8,
        amountB: 1.4e12,
        expiresAt: 1740402390865,
        id: "ifqjtohZw12Bw",
        isMine: undefined,
        peerId: (await createEd25519PeerId()).toString(),
        transportPeerId: (await createEd25519PeerId()).toString(),
      }
    ] as unknown as Order[],
  },
};

export const Empty: Story = {
  args: {
    orders: [] as unknown as Order[],
  },
};