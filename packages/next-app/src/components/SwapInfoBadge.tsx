import { getAssetAmount, getAssetNameWithNetwork, getAssetIcon, getAssetShortName } from "@/lib/utils";
import { CommonState } from "@xmr-bch-swap/swap";
import { ArrowRight } from "lucide-react";
import moment from "moment";

export function SwapInfoBadge({state} : {state: CommonState}) {
  const firstAmount = state.asset.includes("XMR") ? state.xmrSwapAmount : state.bchSwapAmount;
  const secondAmount = state.asset.includes("XMR") ? state.bchSwapAmount : state.xmrSwapAmount;

  return <>
    <div className="flex flex-row gap-3 items-center">
      <div className="flex flex-col text-right">
        <div className="text-sm">{getAssetAmount(firstAmount, state.asset)}</div>
        <div className="text-xs">{getAssetNameWithNetwork(state.asset)}</div>
      </div>
      <div>
        <img width={32} height={32} src={getAssetIcon(state.asset)} alt={getAssetShortName(state.asset)} />
      </div>
      <ArrowRight size={24} />
      <div>
        <img width={32} height={32} src={getAssetIcon(state.targetAsset)} alt={getAssetShortName(state.targetAsset)} />
      </div>
      <div className="flex flex-col text-left">
        <div className="text-sm">{getAssetAmount(secondAmount, state.targetAsset)}</div>
        <div className="text-xs">{getAssetNameWithNetwork(state.targetAsset)}</div>
      </div>
    </div>

    <div className="text-center">
      <div className="text-xs">Swap ID: {state.swapId}</div>
      <div className="text-xs" title={moment(state.timestamp).calendar()}>Date: {moment(state.timestamp).fromNow()}</div>
    </div>
  </>
}