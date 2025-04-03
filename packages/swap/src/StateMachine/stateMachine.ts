import { promises as fs } from 'fs';
import { Transport } from "../transport";
import JSON5 from "@mainnet-pat/json5-bigint";
import "@mainnet-pat/json5-bigint/lib/presets/extended";
import { IPeerId } from '../transport';
// import { OrderbookManager } from '../OrderbookManager';
import { ObjectToPeerId } from '../p2ptransport';
import { TypedEventEmitter } from '@libp2p/interface';
import { ObservableEvents, Order } from '../interfaces';

export type XMRAsset = "XMR:native" | "tXMR:native" | "rXMR:native";
export const XMRAssets = ["XMR:native", "tXMR:native", "rXMR:native"]

export type BCHAsset = "BCH:native" | "tBCH:native" | "rBCH:native";
export const BCHAssets = ["BCH:native", "tBCH:native", "rBCH:native"];

export type Asset = XMRAsset | BCHAsset;

export interface State {
  timestamp: number;
  asset: Asset;
  targetAsset: Asset;
  version: string;
  logs: string[];
  swapId: string;
  currentState: string;
  error?: string;
  transportMultiaddr?: string;
  targetMultiaddr?: string;
  transportPeerId: IPeerId;
  relayMultiaddrs?: string[];
  orderbookId: string;
  orderbookEntry?: Order;
}

interface Loggable {
  log(...args: any[]): void;
  debug(...args: any[]): void;
  error(...args: any[]): void;
  trace(...args: any[]): void;
}

const stringify = (arg: any) => typeof arg === "object" ? JSON5.stringify(arg) : arg.toString();

export class StateLoggerWithEvents extends TypedEventEmitter<ObservableEvents> implements Loggable {
  public logger?: Console

  constructor() {
    super();
    this.state.logs = [];
    this.logger = console;
  }

  public state: State = {} as State;

  log(...args: any[]): void {
    this.state.logs.push(Date.now().toString() + [" log:", ...args].map(stringify).join(" "));
    this.logger?.log(...args);
  }
  debug(...args: any[]): void {
    this.state.logs.push(Date.now().toString() + [" debug:", ...args].map(stringify).join(" "));
    this.logger?.debug(...args);
  }
  error(...args: any[]): void {
    this.state.logs.push(Date.now().toString() + [" error:", ...args].map(stringify).join(" "));
    this.logger?.error(...args);
  }
  trace(...args: any[]): void {
    this.state.logs.push(Date.now().toString() + [" trace:", ...args].map(stringify).join(" "));
    this.logger?.trace(...args);
  }
}

export class StateMachine extends StateLoggerWithEvents {
  public declare state: State;
  public next?: Function = undefined as any;
  public paused = false;
  public breakpoints: string[] = [];
  public broadcastChannel!: BroadcastChannel;

  constructor(initialState: Partial<State>, public transport: Transport) {
    super();

    transport.addEventListener('onResume', async (event: CustomEvent<{swapId: string, targetMultiaddr: string}>) => {
      this.state.swapId = event.detail.swapId;
      this.state.targetMultiaddr = JSON.stringify(event.detail.targetMultiaddr);
      await this.persist();
      this.resume().catch(this.error);
      this.safeDispatchEvent("#update");
    });

    if (!initialState.transportPeerId) {
      initialState.transportPeerId = transport.getPeerId();
      initialState.transportMultiaddr = transport.getMultiaddr();
      initialState.targetMultiaddr = transport.getTargetMultiaddr();
      initialState.relayMultiaddrs = transport.getRelayMultiaddrs();
    }

    // validate initial state such as refund address, etc
    // if (!initialState.swapId) {
    //   this.failWithReason("swapId is required");
    // }
    if (!initialState.asset) {
      this.failWithReason("asset is required");
    }
    if (!initialState.targetAsset) {
      this.failWithReason("targetAsset is required");
    }
    if (!initialState.version) {
      this.failWithReason("version is required");
    }

    // set up the broadcast channel to notify other tabs to pause or get notified from them
    // if (typeof window !== "undefined") {
    //   this.broadcastChannel = new BroadcastChannel(`swap-${initialState.asset}-${initialState.targetAsset}-${initialState.swapId}`);
    //   this.broadcastChannel.onmessage = () => {
    //     this.forcePause();
    //     this.safeDispatchEvent("#update");
    //   };

    //   window.onfocus = () => {
    //     this.broadcastChannel.postMessage('forcePause');
    //     this.resume();
    //     this.safeDispatchEvent("#update");
    //   }
    //   document.onvisibilitychange = () => {
    //     if (document.visibilityState === "visible") {
    //       this.broadcastChannel.postMessage('forcePause');
    //       this.resume();
    //       this.safeDispatchEvent("#update");
    //     }
    //   };
    // }

    this.state = {...this.state, ...initialState} as State;
  }

  public addBreakpoint(methodName: string) {
    this.breakpoints.push(methodName);
    this.safeDispatchEvent("#update");
  }

  public async persist()  {
    await fs.mkdir(`data/${this.state.swapId}`, { recursive: true });
    await fs.writeFile(`data/${this.state.swapId}/${this.constructor.name}.json5`, JSON5.stringify(this.state, null, 2));
  }

  public async restore() {
    try {
      this.state = JSON5.parse(await fs.readFile(`data/${this.state.swapId}/${this.constructor.name}.json5`, "utf-8"));
      this.safeDispatchEvent("#update");
    } catch {}
  }

  // First method to be called
  public async exec() {
    // if (this.state.orderbookId) {
    //   const orderbook = await OrderbookManager.getOrderbook(this.state.asset, this.state.targetAsset, this.state.version, this.state.relayMultiaddrs ?? [], this.state.peerId ? await ObjectToPeerId(this.state.peerId) : undefined);
    //   await orderbook.remove([this.state.orderbookId]);
    // }
  }

  public async abandon() {
    this.state.currentState = "abandoned";
    await this.persist();
    this.log(this.state.swapId, this.constructor.name, "abandoning...");
    this.safeDispatchEvent("#update");
    await this.transport.close();
  }

  public async dispatch(func: Function, ...payload: any[]): Promise<any> {
    const methodName = func.name;
    this.state.currentState = methodName;
    await this.persist();

    // update before further processing
    this.safeDispatchEvent("#update");

    this.next = async () => {
      this.log(this.state.swapId, this.constructor.name, "dispatching", methodName);
      await (this as any)[methodName](...payload);
    };

    if (this.paused) {
      return;
    }

    if (!this.breakpoints.includes(methodName)) {
      await this.next();
    } else {
      this.log(this.state.swapId, this.constructor.name, "halting before dispatching", methodName);
    }

    await this.persist();

    // update after processing
    this.safeDispatchEvent("#update");
  }

  // pause the execution of the state machine
  public async pause() {
    this.paused = true;
    this.safeDispatchEvent("#update");
  }

  // force pause the execution of the state machine so that it will reload the state after resume
  public async forcePause() {
    this.paused = true;
    this.next = undefined as any;
    this.safeDispatchEvent("#update");
  }

  public async resume(force: boolean = false) {
    if (this.state.error && !force) {
      return;
    }

    this.state.error = undefined;
    this.paused = false;

    if (this.next) {
      await this.persist();
      await this.next();
    } else {
      this.log(this.state.swapId, this.constructor.name, "restoring...");
      await this.restore();

      const currentState = this.state.currentState || "exec";
      if (!["success", "abandoned"].includes(currentState)) {
        this.log(this.state.swapId, this.constructor.name, "dispatching", currentState);
        await (this as any)[currentState]();
      }
    }
    this.safeDispatchEvent("#update");
  }

  public failWithReason(reason: string) {
    this.log(this.state.swapId, this.constructor.name, "failing with reason:", reason);
    this.state.error = reason;
    this.persist(); // async
    this.safeDispatchEvent("#update");
    this.transport.signalFailure(reason);
    throw new Error(reason);
  }
}
