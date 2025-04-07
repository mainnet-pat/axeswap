import { getAssetAmount, getAssetIcon, getAssetNameWithNetwork, getAssetShortName, StateNames } from "@/lib/utils";
import { AliceState, BobState, CommonState, State } from "@xmr-bch-swap/swap";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { act, use, useCallback, useEffect, useState } from "react";
import moment from "moment";
import { Issues } from "./issues/Issues";
import { Logs } from "./Logs";
import { SwapInfoBadge } from "./SwapInfoBadge";
import { Button } from "./ui/button";
import { useSwapManagerContext } from "@/providers/SwapManagerProvider";

export function SwapStatusCard({state} : {state: CommonState}) {
  const [actions, setActions] = useState<any[]>([]);
  const {manager} = useSwapManagerContext();

  const abandonSwap = useCallback(async () => {
    if (!manager) return;

    if (confirm("This will interrupt the swap and you/counterparty might lose funds. Are you sure?")) {
      await manager.abandonSwap(state.swapId);
    }
  }, [manager, state]);

  const initiateBchRefund = useCallback(async () => {
    if (!manager) return;

    manager.swaps[state.swapId].dispatch((manager.swaps[state.swapId] as any).initiateBchRefund).catch(console.error);
  }, [manager, state]);

  const initiateXmrRefund = useCallback(async () => {
    if (!manager) return;

    manager.swaps[state.swapId].dispatch((manager.swaps[state.swapId] as any).awaitXmrRefundOrRecoverBch).catch(console.error);
  }, [manager, state]);

  useEffect(() => {
    const actions: any[] = [];

    if ((state.asset.includes("BCH") && state.currentState === "awaitXmrSwaplockConfirmations") || state.currentState === "awaitXmrSwaplockDeposit") {
      actions.push(<Button onClick={initiateBchRefund}>Initiate BCH refund</Button>);
    }
    if (state.currentState === "awaitAdaptorSignature") {
      actions.push(<Button onClick={initiateXmrRefund}>Initiate XMR refund</Button>);
    }
    if (state.currentState !== "success" && state.currentState !== "abandoned") {
      actions.push(<Button variant={"destructive"} onClick={abandonSwap}>Abandon</Button>);
    }

    setActions(actions);
  }, [state, initiateBchRefund, initiateXmrRefund, abandonSwap]);

  return (
    <>
    <div className="flex flex-col gap-2 items-center">
      <SwapInfoBadge state={state} />

      {!state.error && !["success", "abandoned"].includes(state.currentState) && <LoaderCircle size={32} className="animate-spin" />}

      <div className="text-center">
        <div className="text-lg">Current status: {StateNames[state.currentState]}</div>
      </div>

      {state.error && <div className="text-center text-red-500">Error: {state.error}</div>}
      {<Issues state={state} />}
      {actions.length > 0 && <div className="flex flex-col gap-2">
        <div className="text-center text-lg">Actions</div>
        <div className="flex flex-row gap-2 items-center">
          {actions.map((action, index) => (
            <div key={index} className="flex-1">
              {action}
            </div>
          ))}
        </div>
      </div>}
      {state.logs.length > 0 && <div className="max-w-[300px] md:max-w-[420px] pb-10"><Logs logs={state.logs} /></div>}
    </div>
    </>)
}
