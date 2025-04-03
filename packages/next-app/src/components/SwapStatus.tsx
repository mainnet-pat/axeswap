import { CommonState } from "@xmr-bch-swap/swap";
import { useEffect, useState } from "react";
import { useSwapManagerContext } from "@/providers/SwapManagerProvider";
import { SwapStatusCard } from "./SwapStatusCard";

export function SwapStatus ({swapId} : {swapId: string}) {
  const { manager, update } = useSwapManagerContext();
  const [state, setState] = useState<CommonState>();
  const currentState = manager?.swaps?.[swapId]?.state?.currentState;

  useEffect(() => {

    (async () => {
      if (!manager) return;

      const swap = manager.swaps[swapId];
      if (swap) {
        setState(swap.state as CommonState);
      }
    })();
  }, [manager, currentState, swapId]);

  return manager && !state ? <p>Swap not found</p> : (state && <SwapStatusCard state={state} key={update} />);
}
