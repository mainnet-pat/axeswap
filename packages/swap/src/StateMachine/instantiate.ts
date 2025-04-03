import { ObjectToPeerId, P2pTransport } from "../p2ptransport.js";
import { State, StateMachine, XMRAssets, BCHAssets } from "./stateMachine.js";

export const instantiateSwap = async (initialState: State): Promise<StateMachine> => {
  const asset = initialState.asset;
  const targetAsset = initialState.targetAsset;
  const version = initialState.version;

  if (XMRAssets.includes(asset) && BCHAssets.includes(targetAsset) || XMRAssets.includes(targetAsset) && BCHAssets.includes(asset)) {
    // assets could be in form tXMR:native or in future evm:1:0xabcd, so we need to normalize them
    const transportPeerId = initialState.transportPeerId ? await ObjectToPeerId(initialState.transportPeerId) : undefined;

    // let transportError = false;
    let stateMachine: StateMachine | undefined;

    const [firstAssetId, secondAssetId] = [asset, targetAsset].sort();
    const swapIdentifier = `${firstAssetId}-${secondAssetId}/${version}`

    const transport = new P2pTransport(`/ATOMIC-SWAP/${swapIdentifier}`, transportPeerId, initialState.relayMultiaddrs);
    if (initialState.swapId) {
      transport.swapId = initialState.swapId;
    }

    if (!["success", "abandoned"].includes(initialState.currentState)) {
      await transport.init();

      try {
        if (initialState.targetMultiaddr) {
          // console.log("Connecting to peer", JSON.parse(initialState.targetMultiaddr!));
          initialState.swapId = await transport.connect(JSON.parse(initialState.targetMultiaddr!));
          // console.log("Connected to peer", initialState.swapId);
        }
      } catch (e) {
        // console.trace(e);
        // transportError = true;
      }
    }

    if (asset.includes("BCH")) {
      const StateMachine = (await import("./bch-xmr-0.4.1/BchXmrStateMachine.js")).default;
      stateMachine = new StateMachine(initialState, transport);
    } else {
      const StateMachine = (await import("./bch-xmr-0.4.1/XmrBchStateMachine.js")).default;
      stateMachine = new StateMachine(initialState, transport);
    }

    // if (transportError) {
    //   stateMachine.failWithReason("Failed to connect to peer, they appear to be offline");
    // }

    stateMachine.persist();
    return stateMachine;
  }
  throw new Error("Invalid asset pair");
}