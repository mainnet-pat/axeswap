import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { dcutr } from '@libp2p/dcutr'
import { identify } from '@libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { createLibp2p, Libp2p } from 'libp2p'
import { fromString, toString } from 'uint8arrays'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { multiaddr as toMultiaddr, Multiaddr } from '@multiformats/multiaddr'
import { Stream, PeerId, TypedEventEmitter } from "@libp2p/interface";
import { binToBase58, generateRandomBytes } from '@bitauth/libauth'
import { promises as fs } from 'fs';
import { lpStream } from 'it-length-prefixed-stream'
import { IPeerId, P2pTransportEvents as TransportEvents, Transport } from './transport'
import JSON5 from "@mainnet-pat/json5-bigint";
import "@mainnet-pat/json5-bigint/lib/presets/extended"
import * as PeerIdFactory from '@libp2p/peer-id-factory'
import { peerIdFromString } from '@libp2p/peer-id'
import { bootstrap } from '@libp2p/bootstrap'

export const PeerIdToObject = (peerId: PeerId): IPeerId => {
  return {
    id: peerId.toString(),
    privKey: peerId.privateKey != null ? toString(peerId.privateKey, 'base64pad') : "",
    pubKey: peerId.publicKey != null ? toString(peerId.publicKey, 'base64pad') : "",
  }
}

export const ObjectToPeerId = async (obj: IPeerId): Promise<PeerId> => {
  return await PeerIdFactory.createFromJSON(obj);
}

export const createNode = async (peerId?: PeerId, bootstrapMultiaddrs?: string[]) => {
  const config = {
    peerId,
    addresses: {
      listen: [] as string[]
    },
    peerDiscovery: [] as any[],
    transports: [
      webSockets({
        filter: filters.all
      }),
      circuitRelayTransport({
        // make a reservation on any discovered relays - this will let other
        // peers use the relay to contact us
        discoverRelays: 1,
        reservationConcurrency: 5 // how many relays to attempt to reserve slots on at once
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
    connectionEncryption: [noise()],
    streamMuxers: [yamux({
      maxMessageSize: 1024 * 1024
    })],
    services: {
      identify: identify(),
      dcutr: dcutr()
    },
  };

  if (bootstrapMultiaddrs?.length) {
    config.peerDiscovery.push(bootstrap({
      list: bootstrapMultiaddrs!
    }));
  } else {
    config.addresses.listen = ['/ip4/0.0.0.0/tcp/0/ws'];
  }

  const node = await createLibp2p(config);

  await node.start();
  (bootstrapMultiaddrs ?? []).map(ma => node.dial(toMultiaddr(ma)));

  return node;
}

interface TransportPayload {
  name: string,
  data: any
}

// Local transport uses a local state to "send" and "receive" messages
export class P2pTransport extends TypedEventEmitter<TransportEvents> implements Transport {
  private state: Record<string, any> = {};
  public node!: Libp2p;
  public swapId: string = "";
  public targetMultiaddr!: string | Multiaddr | Multiaddr[];
  public peerId?: PeerId;
  public bootstrapMultiaddrs?: string[];
  public connected: boolean = false;

  constructor(public protocol: string, peerId?: PeerId, bootstrapMultiaddrs?: string[]) {
    super();
    this.peerId = peerId;
    this.bootstrapMultiaddrs = bootstrapMultiaddrs;
  }

  public async persist() {
    await fs.mkdir(`data/${this.swapId}`, { recursive: true });
    await fs.writeFile(`data/${this.swapId}/${this.constructor.name}.json5`, JSON5.stringify(this.state, null, 2));
  }

  public async restore(): Promise<boolean> {
    try {
      this.state = JSON5.parse(await fs.readFile(`data/${this.swapId}/${this.constructor.name}.json5`, "utf-8"));
      return true;
    } catch {}
    return false;
  }

  public async init(): Promise<void> {
    if (this.node) {
      return;
    }

    this.node = await createNode(this.peerId, this.bootstrapMultiaddrs);
    if (this.node.peerId.toString() !== this.peerId?.toString()) {
      this.peerId = this.node.peerId;
    }

    this.node.handle(this.protocol, ({ stream }) => {
      Promise.resolve().then(async () => {
        const lp = lpStream(stream);

        // read the incoming request
        const request = await lp.read();

        const rawData = toString(request.subarray());
        const payload: TransportPayload = JSON5.parse(rawData);

        if (payload.name === "__ping__") {
          await lp.write(fromString(JSON5.stringify({
            name: "__pong__",
          } as TransportPayload)));

          return;
        } else if (payload.name === "__request__") {
          const queryName = payload.data as string;
          const data = this.state[queryName];

          await lp.write(fromString(JSON5.stringify({
            name: queryName,
            data
          } as TransportPayload)));

          return;
        } else if (payload.name === "__restore__") {
          if (!this.swapId || this.swapId === payload.data.swapId) {
            if (!this.swapId && !payload.data.swapId) {
              this.swapId = binToBase58(generateRandomBytes(10));
            } else {
              this.swapId = payload.data.swapId;
            }
          }

          // ACK
          this.targetMultiaddr = this.deserializeMultiaddr(payload.data.multiaddr);
          this.connected = true;
          await this.restore();
          this.safeDispatchEvent("onResume", {detail: {swapId: this.swapId, targetMultiaddr: payload.data.multiaddr}});

          await lp.write(fromString(JSON5.stringify({
            name: "__restore__",
            data: this.swapId,
          } as TransportPayload)));

          return;
        } else if (payload.name === "__fail__") {
          this.safeDispatchEvent("onFail", {detail: {reason: payload.data}});
          await lp.write(new Uint8Array());
          return;
        }

        await lp.write(new Uint8Array());
        this.state[payload.name] = payload.data;
        await this.persist();
      }).catch(err => {
        stream.abort(err)
      });
    }, { runOnTransientConnection: true });

    await new Promise<void>(resolve => {
      const interval = setInterval(() => {
        if (this.node.getMultiaddrs().length > 0) {
          clearInterval(interval);
          resolve();
        }
      }, 150);
    });
  }

  public getMultiaddrs(): Multiaddr[]  {
    return this.node.getMultiaddrs();
  }

  public async connect(multiaddr: string | string[] | Multiaddr | Multiaddr[], swapId?: string): Promise<string> {
    this.targetMultiaddr = this.serializeMultiaddr(multiaddr);
    if (swapId && !this.swapId) {
      this.swapId = swapId;
    }
    // else {
    //   console.log(this.constructor.name, "connect", 2, swapId, this.swapId);
    //   this.swapId = binToBase58(generateRandomBytes(10));
    // }

    // this.node.addEventListener('peer:disconnect', (event) => {
    //   if (event.detail.toString() === this.targetMultiaddr.split('')()) {
    //     this.connected = false;
    //     this.safeDispatchEvent("onDisconnect", {detail: {reason: "peer disconnected"}});
    //   }
    // });


    const theirSwapId = await this._send<string>("__restore__", {
      multiaddr: this.serializeMultiaddr(this.node.getMultiaddrs()),
      swapId: this.swapId
    }, true);

    if (theirSwapId === undefined) {
      throw new Error("Failed to connect to counterparty peer");
    }

    if (this.swapId && theirSwapId && (theirSwapId !== this.swapId)) {
      throw new Error(`SwapId mismatch. Theirs: ${theirSwapId}, ours: ${this.swapId}`);
    }

    this.swapId = theirSwapId;
    await this.restore();
    this.connected = true;

    return this.swapId;
  }

  private serializeMultiaddr(multiaddr: string | string[] | Multiaddr | Multiaddr[]): string {
    if (typeof multiaddr === "string") {
      return multiaddr;
    }

    if (Array.isArray(multiaddr)) {
      if (typeof multiaddr[0] === "string") {
        return multiaddr.join(",");
      }
      return multiaddr.map(m => m.toString()).join(",");
    }

    return multiaddr.toString();
  }

  private deserializeMultiaddr(multiaddr: string): Multiaddr | Multiaddr[] {
    if (multiaddr.includes(",")) {
      return multiaddr.split(",").map(m => toMultiaddr(m));
    }

    return toMultiaddr(multiaddr);
  }

  // sent data is also stored in the state for persistency
  // we should avoid reusing same names for sent and received data chunks
  private async _send<T>(name: string, data: any, readBack: boolean): Promise<T | undefined> {
    if (!this.connected && name !== "__restore__") {
      throw new Error("Transport not connected to counterparty peer");
    }
    try {
      let stream: Stream;
      if (typeof this.targetMultiaddr === "string") {
        if (this.targetMultiaddr.includes("/p2p/")) {
          // multiaddr string
          stream = await this.node.dialProtocol(this.deserializeMultiaddr(this.targetMultiaddr), this.protocol, { runOnTransientConnection: true });
        } else {
          // PeerId string
          stream = await this.node.dialProtocol(peerIdFromString(this.targetMultiaddr), this.protocol, { runOnTransientConnection: true });
        }
      } else {
        stream = await this.node.dialProtocol(this.targetMultiaddr, this.protocol, { runOnTransientConnection: true });
      }

      const lp = lpStream(stream)
      await lp.write(fromString(JSON5.stringify({
        name,
        data,
      } as TransportPayload)));

      if (readBack) {
        // read the response
        const response = await lp.read();
        const rawData = toString(response.subarray());
        if (rawData.length === 0) {
          return;
        }
        const payload: TransportPayload = JSON5.parse(rawData);
        return payload.data;
      } else {
        await lp.read();
      }

      if (!this.swapId || name === "__restore__" || name === "__request__") {
        return;
      }

      this.state[name] = data;
      await this.persist();
    } catch (e) {
      if (readBack) {
        throw e;
      }
    }
  }

  public async signalFailure(reason: string): Promise<void> {
    await this._send("__fail__", reason, false);
  }

  public async send(name: string, data: any): Promise<void> {
    return this._send(name, data, false);
  }

  public async await(name: string, timeoutMs: number | undefined = 100000): Promise<any> {
    // get cached value
    const result = await this.get(name);
    if (result) {
      return result;
    }

    while (true) {
      // request from peer
      const request = await this.request(name, timeoutMs);

      const result = request ?? await this.get(name);
      if (result !== undefined) {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public async get(name: string): Promise<any> {
    return this.state[name];
  }

  // if we lost the connection to the counterparty, we can request the data again
  public async request(name: string, timeoutMs?: number): Promise<any> {
    const got = await this.get(name);
    if (got) {
      return got;
    }

    const response = await this._send("__request__", name, true);
    if (response !== undefined) {
      this.state[name] = response;
    }
    return response;
  }

  public async ping(): Promise<void> {
    await this._send("__ping__", {}, true);
  }

  public async close(): Promise<void> {
    await this.node?.stop();
  }

  public getPeerId(): IPeerId {
    return PeerIdToObject(this.node.peerId);
  }

  public getMultiaddr(): string {
    return JSON.stringify(this.node.getMultiaddrs());
  }

  public getTargetMultiaddr(): string {
    return JSON.stringify(this.targetMultiaddr);
  }

  public getRelayMultiaddrs(): string[] {
    return this.bootstrapMultiaddrs ?? [];
  }
}
