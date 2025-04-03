import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'
import { identify } from '@libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { createLibp2p } from 'libp2p'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { circuitRelayServer, circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { dcutr } from '@libp2p/dcutr'
import { PeerId } from "@libp2p/interface";

// creates the p2p node with circuit relay and gossipsub peer discovery support used in orderbook
export const createRelayNode = async (peerId?: PeerId, port: number = 0) => await createLibp2p({
  peerId,
  addresses: {
    listen: [`/ip4/0.0.0.0/tcp/${port}/ws`]
  },
  transports: [
    webSockets({
      filter: filters.all
    }),
    circuitRelayTransport({
      // make a reservation on any discovered relays - this will let other
      // peers use the relay to contact us
      discoverRelays: 1,
      reservationConcurrency: 5, // how many relays to attempt to reserve slots on at once
    }),
  ],
  peerDiscovery: [
    pubsubPeerDiscovery({
      interval: 1000,
    })
  ],
  connectionEncryption: [noise()],
  streamMuxers: [yamux({
    maxMessageSize: 1024 * 1024
  }), mplex()],
  services: {
    identify: identify(),
    relay: circuitRelayServer({
      reservations: {
        defaultDataLimit: 1024n * 1024n,
        defaultDurationLimit: 120 * 60 * 1000,
        maxReservations: Infinity
      },
    }),
    pubsub: gossipsub({
      allowPublishToZeroTopicPeers: true,
      runOnTransientConnection: true,
      unsubcribeBackoff: 1000,
      scoreParams: {
        retainScore: 5000,
      }
    }),
    dcutr: dcutr()
  },
  connectionManager: {
    minConnections: 0,
    inboundConnectionThreshold: 10,
  }
});
