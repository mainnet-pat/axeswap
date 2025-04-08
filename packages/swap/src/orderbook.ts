import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { dcutr } from '@libp2p/dcutr'
import { identify } from '@libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { createLibp2p, Libp2p } from 'libp2p'
import { gossipsub, GossipsubEvents } from '@chainsafe/libp2p-gossipsub'
import { fromString, toString } from 'uint8arrays'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { PeerId, PeerInfo, PubSub, SignedMessage, SubscriptionChangeData } from "@libp2p/interface";
import { binToBase58, generateRandomBytes } from '@bitauth/libauth'
import { bootstrap } from '@libp2p/bootstrap'
import { TypedEventEmitter } from '@libp2p/interface'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { multiaddr as toMultiaddr } from '@multiformats/multiaddr'
import JSON5 from "@mainnet-pat/json5-bigint";
import "@mainnet-pat/json5-bigint/lib/presets/extended"
import { ObservableEvents, Order, OrderAddedEvent, OrderbookEvents, OrderbookPayload, OrderExpiredEvent, OrderRemovedEvent, OrderSubmission, OrderTakenEvent, RawEvent } from './interfaces'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'

export const DEFAULT_TTL = 1000 * 5 * 60; // 5 minutes

export const createOrderbookNode = async (bootstrapMultiaddrs: string[], peerId?: PeerId) => {
  const node = await createLibp2p({
    peerId,
    transports: [
      webSockets({
        filter: filters.all
      }),
      circuitRelayTransport({
        // make a reservation on any discovered relays - this will let other
        // peers use the relay to contact us
        discoverRelays: 1,
        reservationConcurrency: 1 // how many relays to attempt to reserve slots on at once
      })
    ],
    connectionGater: {
      // debug-only, TODO: add env configuration
      denyDialMultiaddr: () => {
        // by default we refuse to dial local addresses from browsers since they
        // are usually sent by remote peers broadcasting undialable multiaddrs and
        // cause errors to appear in the console but in this example we are
        // explicitly connecting to a local node so allow all addresses
        return false
      }
    },
    peerDiscovery: [
      bootstrap({
        list: bootstrapMultiaddrs,
      }),
      pubsubPeerDiscovery({
        interval: 250,
      })
    ],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      pubsub: gossipsub({
        unsubcribeBackoff: 1000,
        scoreParams: {
          retainScore: 5000,
        },
        allowPublishToZeroTopicPeers: true,
        runOnTransientConnection: true,
        // emitSelf: true, // debug only
      }),
      dcutr: dcutr()
    },
  });

  await node.start();

  (bootstrapMultiaddrs ?? []).map(ma => node.dial(toMultiaddr(ma)));

  return node;
}

// Orderbook is an interactive p2p agent receiving the remote orders and posting its own orders
// For every trade pair there are two orderbooks for each trade direction.
export class Orderbook extends TypedEventEmitter<OrderbookEvents & ObservableEvents> {
  public orders: Record<string, Order> = {};

  public node!: Libp2p<{ pubsub: PubSub<GossipsubEvents>; }>;

  public timers: Record<string, NodeJS.Timeout> = {};
  public protocol: string;

  /// '/ATOMIC-SWAP/ORDERBOOK/rXMR:native-rBCH:native/0.4.1'
  constructor(public asset: string, public targetAsset: string, public version: string, public relayMultiaddrs: string[], public peerId?: PeerId) {
    super();
    this.protocol = `/ATOMIC-SWAP/ORDERBOOK/${asset}-${targetAsset}/${version}`;
  }

  public async init() {
    this.node = await createOrderbookNode(this.relayMultiaddrs, this.peerId);

    // wait for the node to be ready and get its multiaddr from circuit relay
    await new Promise<void>(resolve => {
      const interval = setInterval(() => {
        if (this.node.getMultiaddrs().length > 0) {
          clearInterval(interval);
          resolve();
        }
      }, 150);
    });

    this.node.services.pubsub.addEventListener('message', event => {
      const topic = event.detail.topic;
      if (topic !== this.protocol) {
        return;
      }

      const message = toString(event.detail.data)
      const payload: OrderbookPayload = JSON5.parse(message);

      if (payload.type === "add") {
        for (const order of payload.orders) {
          if (order.peerId !== (event.detail as SignedMessage).from.toString()) {
            return;
          }
          if (this.orders[order.id]) {
            // ignore existing orders
            continue;
          }
          this.handleAdd(order);
        }
      } else if (payload.type === "remove") {
        for (const id of payload.ids) {
          if (this.orders[id].peerId !== (event.detail as SignedMessage).from.toString()) {
            return;
          } else {
            this.handleRemove(id);
          }
        }
      } else if (payload.type === "replace") {
        for (const id of payload.ids) {
          if (this.orders[id].peerId !== (event.detail as SignedMessage).from.toString()) {
            return;
          }
        }
        for (const order of payload.orders) {
          if (order.peerId !== (event.detail as SignedMessage).from.toString()) {
            return;
          }
        }

        this.handleReplace(payload);
      } else if (payload.type === "take") {
        if (this.orders[payload.ids[0]]) {
          this.handleTake(payload.ids[0], (event.detail as SignedMessage).from.toString());
        } else {
          return;
        }
      } else if (payload.type === "list") {
        this.handleList();
      }

      this.safeDispatchEvent<RawEvent>('rawEvent', { detail: { payload } });
      this.safeDispatchEvent<ObservableEvents>('#update');
    });

    // request the orders from the network as soon as we are connected to at least one peer
    const discoveryHandler = async (event: CustomEvent<SubscriptionChangeData>) => {
      const subscription = event.detail.subscriptions.find(subscription => subscription.topic === this.protocol && subscription.subscribe === true);
      if (!subscription) {
        return;
      }
      console.log("peer:discovery", event.detail.peerId.toString(), event.detail.subscriptions[1]);

      const payload: OrderbookPayload = {
        type: "list",
        ids: [],
        orders: []
      }
      const result = await this.node.services.pubsub.publish(this.protocol, fromString(JSON5.stringify(payload)));
      if (result.recipients.length > 0) {
        console.log("peer:discovery", "requested orders from", result.recipients.map(peerId => peerId.toString()));
        this.safeDispatchEvent<ObservableEvents>('#update');
        this.node.services.pubsub.removeEventListener('subscription-change', discoveryHandler);
      }
    };
    this.node.services.pubsub.addEventListener('subscription-change', discoveryHandler);

    this.node.services.pubsub.subscribe(this.protocol);
  }

  public async stop() {
    await this.node.stop();
  }

  private handleAdd(order: Order) {
    this.safeDispatchEvent<OrderAddedEvent>('orderAdded', { detail: { order } });

    this.orders[order.id] = order;
    this.timers[order.id] = setTimeout(() => {
      this.handleRemove(order.id);
    }, order.expiresAt - Date.now());
  }

  private handleRemove(id: string) {
    this.safeDispatchEvent<OrderRemovedEvent>('orderRemoved', { detail: { order: this.orders[id] } });

    clearTimeout(this.timers[id]);
    delete this.timers[id];
    delete this.orders[id];
  }

  private handleTake(id: string, multiaddr: string) {
    this.safeDispatchEvent<OrderTakenEvent>('orderTaken', { detail: { order: this.orders[id], multiaddr } });

    clearTimeout(this.timers[id]);
    delete this.timers[id];
    delete this.orders[id];
  }

  private handleList() {
    const myOrders = Object.values(this.orders).filter(order => order.isMine);
    if (!myOrders.length) {
      return;
    }

    const payload: OrderbookPayload = {
      type: "add",
      ids: myOrders.map(order => order.id),
      orders: myOrders.map(order => ({
        id: order.id,
        amountA: order.amountA,
        amountB: order.amountB,
        agent: order.agent,
        expiresAt: order.expiresAt,
        peerId: order.peerId,
        transportPeerId: order.transportPeerId,
      }))
    }

    this.node.services.pubsub.publish(this.protocol, fromString(JSON5.stringify(payload)));
    this.safeDispatchEvent<ObservableEvents>('#update');
  }

  private handleReplace(payload: OrderbookPayload) {
    for (const id of payload.ids) {
      this.handleRemove(id);
    }

    for (const order of payload.orders) {
      this.handleAdd(order);
    }
  }

  private completeOrderData(order: OrderSubmission): Order {
    return {...order,
      id: order.id ?? binToBase58(generateRandomBytes(10)),
      agent: order.agent ?? "user",
      peerId: this.node.peerId.toString(),
      isMine: false,
    }
  }

  // `add` signals to the network that we are adding our orders
  public async add(order: OrderSubmission, awaitDelivery: boolean = true): Promise<string> {
    const fullOrder: Order = this.completeOrderData(order);

    const payload: OrderbookPayload = {
      type: "add",
      ids: [fullOrder.id],
      orders: [fullOrder]
    };

    const promise = this.node.services.pubsub.publish(this.protocol, fromString(JSON5.stringify(payload)));
    if (awaitDelivery) {
      await promise;
    }
    fullOrder.isMine = true;
    this.orders[fullOrder.id] = {
      ...fullOrder
    };

    clearTimeout(this.timers[fullOrder.id]);
    delete this.timers[fullOrder.id];
    this.timers[fullOrder.id] = setTimeout(async () => {
      if (fullOrder.isMine) {
        this.safeDispatchEvent<OrderExpiredEvent>('orderExpired', { detail: { order: fullOrder } });
      }

      clearTimeout(this.timers[fullOrder.id]);
      delete this.timers[fullOrder.id];
      delete this.orders[fullOrder.id];
    }, order.expiresAt - Date.now());

    this.safeDispatchEvent<ObservableEvents>('#update');
    return fullOrder.id;
  }

  // `readd` adds back an expired order but with a different id
  public async readd(order: OrderSubmission, awaitDelivery: boolean = true): Promise<string> {
    delete order.id;
    order.expiresAt = Date.now() + DEFAULT_TTL;
    return this.add(order, awaitDelivery);
  }

  // `remove` signals to the network that we are removing our orders
  public async remove(ids: string[], awaitDelivery: boolean = true, localOnly: boolean = false): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    if (!localOnly) {
      const payload: OrderbookPayload = {
        type: "remove",
        ids: ids,
        orders: []
      };

      const promise = this.node.services.pubsub.publish(this.protocol, fromString(JSON5.stringify(payload)));
      if (awaitDelivery) {
        await promise;
      }
    }

    for (const id of ids) {
      clearTimeout(this.timers[id]);
      delete this.timers[id];
      delete this.orders[id];
    }

    this.safeDispatchEvent<ObservableEvents>('#update');
  }

  // `replace` signals to the network that we are replacing our orders with new ones
  // this method must have ids and orders (not necessary overlapping - more to remove less to add, for example)
  public async replace(ids: string[], newOrders: OrderSubmission[], awaitDelivery: boolean = true): Promise<string[]> {
    const peerIds = await Promise.all(newOrders.map(async () => await createEd25519PeerId()));

    const payload: OrderbookPayload = {
      type: "replace",
      ids: ids,
      orders: newOrders.map((order, index) => {
        const completedOrder = this.completeOrderData(order);
        completedOrder.transportPeerId = peerIds[index].toString();
        return completedOrder;
      })
    };

    const response = this.node.services.pubsub.publish(this.protocol, fromString(JSON5.stringify(payload)));
    if (awaitDelivery) {
      await response;
    }
    for (const id of ids) {
      clearTimeout(this.timers[id]);
      delete this.timers[id];
      delete this.orders[id];
    }

    const result: string[] = [];
    for (const [index, order] of payload.orders.entries()) {
      this.orders[order.id] = {
        ...order,
        isMine: true,
      };

      this.timers[order.id] = setTimeout(() => {
        if (this.orders[order.id].isMine) {
          this.safeDispatchEvent<OrderExpiredEvent>('orderExpired', { detail: { order: this.orders[order.id] } });
        }

        clearTimeout(this.timers[order.id]);
        delete this.timers[order.id];
        delete this.orders[order.id];
      }, order.expiresAt - Date.now());

      result.push(order.id);
    }

    this.safeDispatchEvent<ObservableEvents>('#update');
    return result;
  }

  // will signal to the peer owning the order that we are taking it and they should initiate the swap with us
  // at this time our p2p transport should be initiated and ready to receive the swap messages
  // we do not want to instantiate the transport and swap in this method to keep the classes loosely coupled
  public async take(id: string, awaitDelivery: boolean = true): Promise<void> {
    if (!this.orders[id] || this.orders[id].isMine) {
      return;
    }

    const payload: OrderbookPayload = {
      type: "take",
      ids: [id],
      orders: []
    };

    const promise = this.node.services.pubsub.publish(this.protocol, fromString(JSON5.stringify(payload)));
    if (awaitDelivery) {
      await promise;
    }

    this.safeDispatchEvent<ObservableEvents>('#update');
  }
}
