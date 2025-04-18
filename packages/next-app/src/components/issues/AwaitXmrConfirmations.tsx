import { CommonState } from "@xmr-bch-swap/swap";
import { useEffect, useState } from "react";
import { MineXmrBlock } from "../MineXmrBlock";
import { useSwapManagerContext } from "@/providers/SwapManagerProvider";

export function AwaitXmrConfirmations({state, requiredConfirmations} : {state: CommonState, requiredConfirmations: number}) {
  const { update } = useSwapManagerContext();
  const [confirmations, setConfirmations] = useState<number>(0);
  useEffect(() => {
    setConfirmations(state.xmrLockConfirmations ?? 0);
  }, [state.xmrLockConfirmations, update]);

  return <div>
    <div>Got {confirmations} of {requiredConfirmations} XMR SwapLock confirmations</div>
    {state.asset.startsWith("r") && <div className="flex justify-center">
      <div className="flex flex-row gap-2 rounded-md border-2 border-gray-300 p-2 items-center w-[320px]">
        <div>Debug actions: </div>
        <MineXmrBlock />
      </div>
    </div>}
  </div>
}
