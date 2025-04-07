import { promises as fs } from "fs";
import { ObjectToPeerId, P2pTransport, PeerIdToObject } from "./p2ptransport";
import { Asset, BCHAssets, State, StateMachine, XMRAssets } from "./StateMachine/stateMachine";
import JSON5 from "@mainnet-pat/json5-bigint";
import "@mainnet-pat/json5-bigint/lib/presets/extended";
import { Orderbook } from "./orderbook";
import { PeerId, TypedEventEmitter } from "@libp2p/interface";
import { ObservableEvents, SwapManagerEvents } from "./interfaces";
import { instantiateSwap } from "./StateMachine/instantiate";
import { createEd25519PeerId } from '@libp2p/peer-id-factory';

type Swap = StateMachine;

// TODO: add this to indexeddb-fs
fs.rmdir = (fs as any).removeDirectory;

export class SwapManager extends TypedEventEmitter<ObservableEvents & SwapManagerEvents> {
  public swaps: Record<string, Swap> = {};

  constructor() {
    super();
    this.swaps = {};
  }

  async restoreSwaps(start: boolean = true): Promise<void> {
    let dataFiles: string[] = [];
    try {
      dataFiles = await fs.readdir("data");
    } catch {
      await fs.mkdir("data", { recursive: true });
    }
    const swapIds = dataFiles.filter(f => !f.includes("funding"));

    for (const swapId of swapIds) {
      const swapFiles = await fs.readdir(`data/${swapId}`);
      const swapFile  = swapFiles.filter(f => f.includes("StateMachine"))[0];

      const state = JSON5.parse(await fs.readFile(`data/${swapId}/${swapFile}`, "utf-8")) as State;
      // const asset = state.asset;
      // const targetAsset = state.targetAsset;
      // const version = state.version;

      // if (XMRAssets.includes(asset) && BCHAssets.includes(targetAsset) || XMRAssets.includes(targetAsset) && BCHAssets.includes(asset)) {
      //   let [firstAsset, secondAsset] = [asset, targetAsset].sort();
      //   firstAsset = (["t","r"].includes(firstAsset[0]) ? firstAsset.slice(1) : firstAsset) as Asset;
      //   secondAsset = (["t","r"].includes(secondAsset[0]) ? secondAsset.slice(1) : secondAsset) as Asset;
      //   const transport = new P2pTransport(`/ATOMIC-SWAP/${firstAsset}-${secondAsset}/${version}`);
      //   // const path = `../src/StateMachine/${firstAsset}-${secondAsset}-${version}/${capitalize(firstAsset)}${capitalize(secondAsset)}StateMachine.js`;
      //   // const StateMachine = (await import(path)).default as StateMachine;
      //   const StateMachine = (await import("./StateMachine/bch-xmr-0.4.1/BchXmrStateMachine.js")).default;
      //   const swap = new StateMachine(state, transport);
      //   this.swaps[swapId] = swap;
      // }

      try {
        const swap = await instantiateSwap(state);
        swap.addEventListener("#update", () => this.safeDispatchEvent("#update"));
        this.swaps[swapId] = swap;
        if (start && !["success", "abandoned", "exec"].includes(swap.state.currentState)) {
          // do not block execution
          swap.resume().catch(console.error);
        }

        if (swap.state.currentState === "exec" && swap.state.orderbookEntry) {
          // add back to orderbook
          const orderbook = await this.getOrderbook(swap.state.asset, swap.state.targetAsset, swap.state.version, swap.state.relayMultiaddrs ?? []);
          await orderbook.add(swap.state.orderbookEntry);
        }

      } catch (e) {
        console.error("Failed to restore swap", e);
      }
    }

    this.safeDispatchEvent("#update");
  }

  async addSwap(initialState: State, start: boolean = true): Promise<void> {
    const swap = await instantiateSwap(initialState);
    this.safeDispatchEvent("swapAdded", { detail: { swapId: swap.state.swapId } });
    swap.addEventListener("#update", () => this.safeDispatchEvent("#update"));
    this.swaps[swap.state.swapId] = swap;
    if (start && !["success", "abandoned"].includes(swap.state.currentState)) {
      await swap.resume();
    }

    this.safeDispatchEvent("#update");
  }

  async removeSwap(swapId: string): Promise<void> {
    if (this.swaps[swapId]) {
      await this.swaps[swapId].transport.close();
      delete this.swaps[swapId];
      await fs.rmdir(`data/${swapId}`, { recursive: true });
      this.safeDispatchEvent("#update");
    }
  }

  public async abandonSwap(swapId: string): Promise<void> {
    if (this.swaps[swapId]) {
      await this.swaps[swapId].abandon();
      const orderbook = await this.getOrderbook(this.swaps[swapId].state.asset, this.swaps[swapId].state.targetAsset, this.swaps[swapId].state.version, this.swaps[swapId].state.relayMultiaddrs ?? [])
      await orderbook.remove([this.swaps[swapId].state.orderbookId]);
      this.safeDispatchEvent("#update");
    }
  }

  public completedSwaps = () => {
    return Object.values(this.swaps).filter(swap => swap.state.currentState === "success");
  }

  public waitingSwaps = () => {
    return Object.values(this.swaps).filter(swap => swap.state.currentState === "exec");
  }

  public failedSwaps = () => {
    return Object.values(this.swaps).filter(swap => swap.state.error !== undefined && swap.state.currentState !== "abandoned");
  }

  public activeSwaps = () => {
    return Object.values(this.swaps).filter(swap => !["success", "abandoned", "exec"].includes(swap.state.currentState) && !swap.state.error);
  }

  public abandonedSwaps = () => {
    return Object.values(this.swaps).filter(swap => swap.state.currentState === "abandoned");
  }

  public attendSwaps = () => {
    return Object.values(this.swaps).filter(swap => ["fundXmrSwaplock", "fundBchSwaplock"].includes(swap.state.currentState));
  }

  public pauseAll = async () => {
    await Promise.all(this.activeSwaps().map(swap => swap.pause()));
    this.safeDispatchEvent("#update");
  }

  public resumeAll = async () => {
    await Promise.all(this.activeSwaps().map(swap => swap.resume()));
    this.safeDispatchEvent("#update");
  }

  public pause = async (swapId: string) => {
    await this.swaps[swapId]?.pause();
    this.safeDispatchEvent("#update");
  }

  public resume = async (swapId: string) => {
    await this.swaps[swapId]?.resume();
    this.safeDispatchEvent("#update");
  }

  public removeSwapByOrderbookId = async (orderbookId: string) => {
    const swap = Object.values(this.swaps).find(swap => swap.state.orderbookId === orderbookId);
    await this.removeSwap(swap?.state.swapId ?? "");
  }

  /// orderbook section
  public orderbooks: Record<string, Orderbook> = {};

  async getOrderbook(asset: Asset, targetAsset: Asset, version: string, relayMultiaddrs: string[], peerId?: PeerId): Promise<Orderbook> {
    const swapPair = `${asset}-${targetAsset}/${version}`;
    if (!peerId) {
      await fs.mkdir("ob_pids", { recursive: true });
      const fileName = `ob_pids/${swapPair.replaceAll(":", "_").replaceAll("/", "_")}.json`
      try {
        // attempt to read from fs
        const peerIdFile = await fs.readFile(`${fileName}`, "utf-8");
        peerId = await ObjectToPeerId(JSON.parse(peerIdFile));
      } catch {
        // create a new peerId and write to fs
        peerId = await createEd25519PeerId();
        await fs.writeFile(`${fileName}`, JSON.stringify(PeerIdToObject(peerId), null, 2));
      }
    }


    if (!this.orderbooks[swapPair]) {
      const orderbook = new Orderbook(asset, targetAsset, version, relayMultiaddrs, peerId);
      orderbook.addEventListener("#update", () => {
        this.safeDispatchEvent("#update");
      });

      orderbook.addEventListener("orderExpired", async (event) => {
        // re-add the order back to the orderbook until we go offline
        const oldOrder = event.detail.order;
        const swap = Object.values(this.waitingSwaps()).find(swap => swap.state.orderbookId === oldOrder.id)!;
        const orderId = await orderbook.readd(oldOrder);
        swap.state.orderbookId = orderId;
        swap.state.orderbookEntry = orderbook.orders[orderId];
        await swap.persist();
        swap.safeDispatchEvent("#update");
      });

      this.orderbooks[swapPair] = orderbook;
      await orderbook.init();

      this.safeDispatchEvent("#update");
    }

    return this.orderbooks[swapPair];
  }
}