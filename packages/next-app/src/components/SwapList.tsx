import { SwapInfoBadge } from "@/components/SwapInfoBadge";
import { useSwapManagerContext } from "@/providers/SwapManagerProvider";
import { CommonState, StateMachine } from "@xmr-bch-swap/swap";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Crumbs } from "./Crumbs";

type Filter = "completedSwaps" | "waitingSwaps" | "failedSwaps" | "activeSwaps" | "abandonedSwaps" | "attendSwaps";
const FilterNames: Record<Filter, string> = {
  completedSwaps: "Completed",
  waitingSwaps: "Waiting",
  failedSwaps: "Failed",
  activeSwaps: "Active",
  abandonedSwaps: "Abandoned",
  attendSwaps: "Attention required",
};

export function SwapsList(filter: Filter) {
  const router = useRouter();
  const { manager, update } = useSwapManagerContext();
  const [swaps, setSwaps] = useState<StateMachine[]>();

  useEffect(() => {
    if (!manager) return;

    setSwaps(manager[filter]());
  }, [manager, manager?.swaps, update, filter]);

  return <>
    <Crumbs value={[
      { href: "/swaps", title: "Swaps", collapsible: false },
      { href: "/swaps/", title: FilterNames[filter], collapsible: false },
    ]} />
    <div className="flex flex-col items-center">
      {swaps?.map((swap) => <div key={swap.state.swapId} className="rounded-xl p-4 border-2 cursor-pointer" onClick={() => router.push(`/swaps/${swap.state.swapId}`)}><SwapInfoBadge state={swap.state as CommonState}/></div>)}
      {swaps && !swaps.length && <div className="text-lg text-gray-500">No swaps found</div>}
    </div>
  </>;
}
