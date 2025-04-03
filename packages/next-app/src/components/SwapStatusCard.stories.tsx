import type { Meta, StoryObj } from '@storybook/react';

import { SwapStatusCard } from './SwapStatusCard';
import { Assets } from '@/lib/utils';
import JSON5 from "@mainnet-pat/json5-bigint";
import "@mainnet-pat/json5-bigint/lib/presets/extended";

const meta: Meta<typeof SwapStatusCard> = {
  component: SwapStatusCard,
} satisfies Meta<typeof SwapStatusCard>;

export default meta;
type Story = StoryObj<typeof SwapStatusCard>;

export const Exec: Story = {
  args: {
    state: JSON5.parse(`{
      "logs": [],
      "timestamp": 1742575817142,
      "transportPeerId": {
        "id": "12D3KooWNqCfVxfGVt3LmXAE6FHVLE8J14W5jCbwMphByb7b1aGR",
        "privKey": "CAESQJbOJgSNvfl6LZpZO4ZYzTbCrOjU2cTlkyxX2W3360o2wV7Dr/89wYKYiZ+yth6+xgYwUps3cdUvGinK+zp+SYI=",
        "pubKey": "CAESIMFew6//PcGCmImfsrYevsYGMFKbN3HVLxopyvs6fkmC",
      },
      "relayMultiaddrs": [
        "/ip4/127.0.0.1/tcp/58675/ws/p2p/12D3KooWKVhVirExHuEdUUSznChsUB4ytY96MRJbjyT624nCGUuS",
        "/ip4/192.168.0.15/tcp/58675/ws/p2p/12D3KooWKVhVirExHuEdUUSznChsUB4ytY96MRJbjyT624nCGUuS",
        "/ip4/192.168.64.1/tcp/58675/ws/p2p/12D3KooWKVhVirExHuEdUUSznChsUB4ytY96MRJbjyT624nCGUuS",
        "/ip4/10.6.0.2/tcp/58675/ws/p2p/12D3KooWKVhVirExHuEdUUSznChsUB4ytY96MRJbjyT624nCGUuS",
      ],
      "xmrRpc": "http://localhost:28081",
      "xmrNetwork": "testnet",
      "bchRpc": "ws://localhost:60003",
      "bchNetwork": "regtest",
      "swapId": "EWsRBy2Q4C7Gf6",
      "xmrSwapAmount": 10000000000n,
      "bchSwapAmount": 1000000n,
      "miningFee": 700n,
      "timelock1": 5,
      "timelock2": 2,
      "asset": "rXMR:native",
      "targetAsset": "rBCH:native",
      "version": "0.4.1",
      "aBchReceivingAddress": "bchreg:qqa0p6edtpa4wfpdc0yfjuw6lqf6py8c3clxwxl0ya",
      "aXmrRefundAddress": "A1y9sbVt8nqhZAVm3me1U18rUVXcjeNKuBd1oE2cTs8biA9cozPMeyYLhe77nPv12JA3ejJN3qprmREriit2fi6tJDi99RR",
      "currentState": "checkConnectivity",
    }`)
  },
};

export const Error: Story = {
  args: {
    state: JSON5.parse(`{
      "logs": [],
      "timestamp": 1742575817142,
      "transportPeerId": {
        "id": "12D3KooWNqCfVxfGVt3LmXAE6FHVLE8J14W5jCbwMphByb7b1aGR",
        "privKey": "CAESQJbOJgSNvfl6LZpZO4ZYzTbCrOjU2cTlkyxX2W3360o2wV7Dr/89wYKYiZ+yth6+xgYwUps3cdUvGinK+zp+SYI=",
        "pubKey": "CAESIMFew6//PcGCmImfsrYevsYGMFKbN3HVLxopyvs6fkmC",
      },
      "relayMultiaddrs": [
        "/ip4/127.0.0.1/tcp/58675/ws/p2p/12D3KooWKVhVirExHuEdUUSznChsUB4ytY96MRJbjyT624nCGUuS",
        "/ip4/192.168.0.15/tcp/58675/ws/p2p/12D3KooWKVhVirExHuEdUUSznChsUB4ytY96MRJbjyT624nCGUuS",
        "/ip4/192.168.64.1/tcp/58675/ws/p2p/12D3KooWKVhVirExHuEdUUSznChsUB4ytY96MRJbjyT624nCGUuS",
        "/ip4/10.6.0.2/tcp/58675/ws/p2p/12D3KooWKVhVirExHuEdUUSznChsUB4ytY96MRJbjyT624nCGUuS",
      ],
      "xmrRpc": "http://localhost:28081",
      "xmrNetwork": "testnet",
      "bchRpc": "ws://localhost:60003",
      "bchNetwork": "regtest",
      "swapId": "EWsRBy2Q4C7Gf6",
      "xmrSwapAmount": 10000000000n,
      "bchSwapAmount": 1000000n,
      "miningFee": 700n,
      "timelock1": 5,
      "timelock2": 2,
      "asset": "rXMR:native",
      "targetAsset": "rBCH:native",
      "version": "0.4.1",
      "aBchReceivingAddress": "bchreg:qqa0p6edtpa4wfpdc0yfjuw6lqf6py8c3clxwxl0ya",
      "aXmrRefundAddress": "A1y9sbVt8nqhZAVm3me1U18rUVXcjeNKuBd1oE2cTs8biA9cozPMeyYLhe77nPv12JA3ejJN3qprmREriit2fi6tJDi99RR",
      "currentState": "checkConnectivity",
      "error": "Could not connect to BCH RPC"
    }`)
  },
};
