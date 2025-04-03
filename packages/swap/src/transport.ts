import { TypedEventEmitter, TypedEventTarget } from "@libp2p/interface";

export interface IPeerId {
  id: string;
  privKey: string;
  pubKey: string;
}

export interface P2pTransportEvents {
  onResume: CustomEvent<{swapId: string, targetMultiaddr: string}>; // other side requests we resume our state machine
  onFail: CustomEvent<{reason: string}>; // other side signals a failure
}

export interface Transport extends TypedEventTarget<P2pTransportEvents> {
  send(name: string, data: any): Promise<void>;
  get(name: string): Promise<any>;
  await(name: string, timeoutMs?: number): Promise<any>;
  request(name: string, timeoutMs?: number): Promise<any>;
  signalFailure(reason: string): Promise<void>;
  close(): Promise<void>;
  getPeerId(): IPeerId;
  getMultiaddr(): string;
  getTargetMultiaddr(): string;
  getRelayMultiaddrs(): string[];
}

// Local transport uses a local state to "send" and "receive" messages
export class LocalTransport extends TypedEventEmitter<P2pTransportEvents> implements Transport {
  private state: Record<string, any> = {};

  public async send(name: string, data: any): Promise<void> {
    this.state[name] = data;
  }

  public async await(name: string, timeoutMs?: number): Promise<any> {
    return await new Promise((resolve, reject) => {
      let timeout: NodeJS.Timeout;
      if (timeoutMs) {
        timeout = setTimeout(() => {
          clearInterval(interval);
          reject(new Error("Timeout"));
        }, timeoutMs);
      }

      const interval = setInterval(() => {
        if (this.state[name] !== undefined) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve(this.state[name]);
        }
      }, 100);
    });
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

    await this.send("__request__", name);
    return await this.await(name, timeoutMs);
  }

  public signalFailure(reason: string): Promise<void> {
    return Promise.resolve();
  }

  public async close(): Promise<void> {
  }

  public getPeerId(): IPeerId {
    return {
      id: "local",
      privKey: "local",
      pubKey: "local",
    };
  }

  public getMultiaddr(): string {
    return "local";
  }

  public getTargetMultiaddr(): string {
    return "local";
  }

  public getRelayMultiaddrs(): string[] {
    return ["local"];
  }
}
