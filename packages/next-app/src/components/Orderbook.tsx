import { Orderbook } from "@xmr-bch-swap/swap";
import { Asset } from "@xmr-bch-swap/swap";
import { PeerId } from "@libp2p/interface";
import { useEffect, useState } from "react";
import { useSwapManagerContext } from "@/providers/SwapManagerProvider";
import { OrderbookInner } from "./OrderbookInner";
import { RelayMultiaddrs } from "@/lib/RelayMultiaddrs";
import { getAssetNameWithNetwork, getAssetIcon, getAssetShortName } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { SendXmr } from "./SendXmr";
import { MineBlock } from "./MineBlock";

export function OrderbookView ({asset, targetAsset, version, relayMultiaddrs = RelayMultiaddrs, open} : {asset: string, targetAsset: string, version: string, relayMultiaddrs?: string[], open?: boolean}) {
  const {manager: swapManager} = useSwapManagerContext();
  const [orderbook, setOrderBook] = useState<Orderbook | undefined>();
  const orders = Object.values(orderbook?.orders ?? {});
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    setIsOpen(Boolean(open));
  }, [open])

  useEffect(() => {
    (async () => {
      if (swapManager) {
        const instance = await swapManager?.getOrderbook(asset as Asset, targetAsset as Asset, version, relayMultiaddrs);
        setOrderBook(instance);
        (window as any).parent.window.orderbook = instance; // debug
      }
    })();
  }, [swapManager, asset, relayMultiaddrs, targetAsset, version]);

  return <div>
    {orderbook ? (<div className="flex flex-col items-center">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex flex-row gap-3 items-center justify-center">
            <div className="flex flex-col text-right w-[150px]">
              <div className="text-md">{getAssetNameWithNetwork(orderbook.asset)}</div>
            </div>
            <div>
              <img width={32} height={32} src={getAssetIcon(orderbook.asset)} alt={getAssetShortName(orderbook.asset)} />
            </div>
            <ArrowRight size={24} />
            <div>
              <img width={32} height={32} src={getAssetIcon(orderbook.targetAsset)} alt={getAssetShortName(orderbook.targetAsset)} />
            </div>
            <div className="flex flex-col text-left w-[150px]">
              <div className="text-md">{getAssetNameWithNetwork(orderbook.targetAsset)}</div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {orders?.length ? <div>
            <OrderbookInner orderbook={orderbook} orders={orders}/>
            {/* {orderbook.asset.startsWith("r") && <>
              <SendXmr />
              <MineBlock />
            </>} */}
          </div> : <p className="text-center w-full mt-2">No orders</p>}
        </CollapsibleContent>
      </Collapsible>
    </div>) : <p className="text-center">Loading...</p>}
  </div>
}
