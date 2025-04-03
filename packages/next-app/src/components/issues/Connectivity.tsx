import { checkBchConnectivity, checkXmrConnectivity, CommonState } from "@xmr-bch-swap/swap";
import { RpcSelect } from "../RpcSelect";
import { useCallback, useEffect, useState } from "react";
import { Asset, AssetMap, Assets, getAssetNetwork, getAssetTicker, SetDefaultBchRpcEndpoint, SetDefaultMoneroRpcEndpoint } from "@/lib/utils";
import { Label } from "@radix-ui/react-label";
import { useSwapManagerContext } from "@/providers/SwapManagerProvider";
import { RefreshCw } from "lucide-react";
import { Button } from "../ui/button";

export function Connectivity({state} : {state: CommonState}) {
  const { manager } = useSwapManagerContext();
  const [rpc, setRpc] = useState<string>();
  const [asset, setAsset] = useState<Asset>();
  const [network, setNetwork] = useState<string>();
  const [validationError, setValidationError] = useState<string>();

  useEffect(() => {
    if (state.error?.includes("XMR")) {
      setRpc(state.xmrRpc);
      setAsset(AssetMap[state.asset.includes("XMR") ? state.asset : state.targetAsset]);
    } else {
      setAsset(AssetMap[state.asset.includes("XMR") ? state.targetAsset : state.asset]);
      setRpc(state.bchRpc);
    }

    setNetwork(getAssetNetwork(state.asset));
  }, [state, state.error]);

  const onRpcChange = useCallback(async (rpc: string) => {
    if (!manager || !asset) {
      return;
    }

    setValidationError("");
    setRpc(rpc);

    if (state.error?.includes("XMR")) {
      try {
        await checkXmrConnectivity(rpc);
        SetDefaultMoneroRpcEndpoint(getAssetNetwork(asset.assetId), rpc);
        (manager.swaps[state.swapId].state as any).xmrRpc = rpc;
        manager.swaps[state.swapId].state.error = undefined;
        await manager.swaps[state.swapId].persist();
        manager.swaps[state.swapId].resume().catch(console.error);
      } catch {
        setValidationError("Could not connect to selected RPC, try another one");
      }
    } else {
      try {
        await checkBchConnectivity(rpc, state.bchNetwork);
        SetDefaultBchRpcEndpoint(getAssetNetwork(asset.assetId), rpc);
        (manager.swaps[state.swapId].state as any).bchRpc = rpc;
        manager.swaps[state.swapId].state.error = undefined;
        await manager.swaps[state.swapId].persist();
        manager.swaps[state.swapId].resume().catch(console.error);
      } catch {
        setValidationError("Could not connect to selected RPC, try another one");
      }
    }
  }, [state, manager, asset]);

  return state.error && <div>
    <div>There was an issue connecting to an RPC</div>
    {asset && <Label className="text-sm">Select different {getAssetTicker(asset?.assetId)} RPC</Label>}
    <div className="flex flex-row gap-2 items-center">
      {network && asset && <RpcSelect placeholder={`${getAssetTicker(asset.assetId)} RPC`} coin={state.error?.includes("XMR") ? "monero" : "bch"} network={network} value={rpc} onValueChange={onRpcChange} />}
      <Button variant={"outline"} onClick={() => onRpcChange(rpc ?? "")}>
        <RefreshCw />
      </Button>
    </div>
    {validationError && <div className="text-red-500 text-sm">{validationError}</div>}
  </div>
}