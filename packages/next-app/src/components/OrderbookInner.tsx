import { Orderbook } from "@xmr-bch-swap/swap/dist/src/orderbook";
import { State } from "@xmr-bch-swap/swap/dist/src/StateMachine/stateMachine";
import { ChangeEvent, useCallback, useEffect, useState } from "react";

import { Trash } from "lucide-react"
import { DollarSign } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "./ui/button";
import { useSwapManagerContext } from "@/providers/SwapManagerProvider";
import { AliceState, BobState, Config, Order, PeerIdToObject, validateBchAddress, validateXmrAddress } from "@xmr-bch-swap/swap";
import { PeerIdToRelayMultiaddrs, RelayMultiaddrs } from "@/lib/RelayMultiaddrs";
import { createEd25519PeerId } from "@libp2p/peer-id-factory";
import { Asset, findAssetById, getAssetDecimals, getAssetNetwork, getAssetShortName, getAssetTicker, GetPreviousBchReceivingAddress, GetPreviousBchRefundAddress, GetPreviousMoneroReceivingAddress, GetPreviousMoneroRefundAddress, SetPreviousBchReceivingAddress, SetPreviousBchRefundAddress, SetPreviousMoneroReceivingAddress, SetPreviousMoneroRefundAddress } from "@/lib/utils";
import usePrice from "@/hooks/usePrice";
import { useRouter } from "next/navigation";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

export function OrderbookInner ({orderbook, orders} : {orderbook: Orderbook, orders: Order[]}) {
  const router = useRouter();
  const {manager: swapManager} = useSwapManagerContext();

  // bchreg:qrt2ny4gxes8gwt2afquggld4m858l5yucqadxnjft
  const [targetReceivingAddress, setTargetReceivingAddress] = useState<string>("");
  // A1y9sbVt8nqhZAVm3me1U18rUVXcjeNKuBd1oE2cTs8biA9cozPMeyYLhe77nPv12JA3ejJN3qprmREriit2fi6tJDi99RR
  const [sourceRefundAddress, setSourceRefundAddress] = useState<string>("");

  const [targetReceivingAddressValidationError, setTargetReceivingAddressValidationError] = useState<string>();
  const [sourceRefundAddressValidationError, setSourceRefundAddressValidationError] = useState<string>();

  const priceA = usePrice(orderbook.asset);
  const priceB = usePrice(orderbook.targetAsset);

  // reverse order as we are the counterparty
  const firstAsset = findAssetById(orderbook.targetAsset);
  const secondAsset = findAssetById(orderbook.asset);

  const [defaultsLoaded, setDefaultsLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (!firstAsset || !secondAsset) {
      return;
    }

    if (!defaultsLoaded) {
      if (firstAsset?.assetId.includes("XMR")) {
        setTargetReceivingAddress(GetPreviousBchReceivingAddress(getAssetNetwork(firstAsset.assetId)));
        setSourceRefundAddress(GetPreviousMoneroRefundAddress(getAssetNetwork(secondAsset.assetId)));
      } else {
        setTargetReceivingAddress(GetPreviousMoneroReceivingAddress(getAssetNetwork(firstAsset.assetId)));
        setSourceRefundAddress(GetPreviousBchRefundAddress(getAssetNetwork(secondAsset.assetId)));
      }
      setDefaultsLoaded(true);
    }
  }, [firstAsset, secondAsset, defaultsLoaded, setTargetReceivingAddress, setSourceRefundAddress]);


  const cancelOrderClick = useCallback(async (order: Order) => {
    if (!swapManager) return;

    await swapManager?.removeSwapByOrderbookId(order.id);
    await orderbook.remove([order.id]);
  }, [swapManager, orderbook]);

  const validateTargetReceivingAddress = async (value: string, asset: Asset) => {
    if (!value) {
      return;
    }

    if (asset.assetId.includes("XMR")) {
      const validationError = await validateXmrAddress(value, getAssetNetwork(asset.assetId));
      setTargetReceivingAddressValidationError(validationError);
    } else {
      const validationError = validateBchAddress(value, getAssetNetwork(asset.assetId));
      setTargetReceivingAddressValidationError(validationError);
    }
  }

  const onTargetReceivingAddressChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    setTargetReceivingAddress(event.target.value);

    if (!event.target.value) {
      setTargetReceivingAddressValidationError("");
      return;
    }

    if (!secondAsset) {
      return;
    }

    validateTargetReceivingAddress(event.target.value, secondAsset);
  }, [secondAsset]);

  const validateSourceRefundAddress = async (value: string, asset: Asset) => {
    if (!value) {
      return;
    }

    if (asset.assetId.includes("XMR")) {
      const validationError = await validateXmrAddress(value, getAssetNetwork(asset.assetId));
      setSourceRefundAddressValidationError(validationError);
    } else {
      const validationError = validateBchAddress(value, getAssetNetwork(asset.assetId));
      setSourceRefundAddressValidationError(validationError);
    }
  };

  const onSourceRefundAddressChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    setSourceRefundAddress(event.target.value);

    if (!event.target.value) {
      setSourceRefundAddressValidationError("");
      return;
    }

    if (!firstAsset) {
      return;
    }

    validateSourceRefundAddress(event.target.value, firstAsset);
  }, [firstAsset]);

  const takeOrderClick = useCallback(async (order: Order) => {
    (async () => {
      if (!swapManager || !firstAsset || !secondAsset) {
        return;
      }

      if (firstAsset.assetId.includes("XMR")) {
        SetPreviousMoneroRefundAddress(getAssetNetwork(firstAsset.assetId), sourceRefundAddress);
        SetPreviousBchReceivingAddress(getAssetNetwork(secondAsset.assetId), targetReceivingAddress);
      } else {
        SetPreviousBchRefundAddress(getAssetNetwork(secondAsset.assetId), sourceRefundAddress);
        SetPreviousMoneroReceivingAddress(getAssetNetwork(firstAsset.assetId), targetReceivingAddress);
      }

      const peerId = await createEd25519PeerId();

      // swap pre-definition
      const state = {
        asset: orderbook.targetAsset,
        targetAsset: orderbook.asset,
        currentState: "exec",
        logs: [],
        transportPeerId: PeerIdToObject(peerId),
        orderbookId: "", // we set it right after
        swapId: "", // taker will get swapid from maker over transport
        version: orderbook.version,
        relayMultiaddrs: RelayMultiaddrs,
        targetMultiaddr: JSON.stringify(PeerIdToRelayMultiaddrs(order.transportPeerId)),
        timestamp: +new Date(),
      } as State;
      state.orderbookId = order.id;

      // swap definition completion
      const [firstAssetId, secondAssetId] = [orderbook.asset, orderbook.targetAsset].sort();
      const swapIdentifier = `${firstAssetId}-${secondAssetId}/${orderbook.version}`;
      const config = Config[swapIdentifier];
      let initialState: State;
      if (orderbook.targetAsset.includes("XMR")) {
        const xmrState: AliceState = {
          ...state,
          ...config,
          aBchReceivingAddress: targetReceivingAddress,
          aXmrRefundAddress: sourceRefundAddress,
          xmrSwapAmount: BigInt(order.amountB),
          bchSwapAmount: BigInt(order.amountA),
        }
        initialState = xmrState;
      } else {
        const bchState: BobState = {
          ...state,
          ...config,
          bXmrReceivingAddress: targetReceivingAddress,
          bBchRefundAddress: sourceRefundAddress,
          bchSwapAmount: BigInt(order.amountB),
          xmrSwapAmount: BigInt(order.amountA),
        }
        initialState = bchState;
      }

      await orderbook.remove([order.id], false, true);

      const handler = (event: CustomEvent<{ swapId: string }>) => {
        swapManager.removeEventListener("swapAdded", handler);
        const swapId = event.detail.swapId;
        router.push(`/swaps/${swapId}`);
      };
      swapManager.addEventListener("swapAdded", handler);

      swapManager.addSwap(initialState, true).catch(console.error);
    })();
  }, [swapManager, orderbook, sourceRefundAddress, targetReceivingAddress, firstAsset, secondAsset, router]);

  const getRatio = (order: Order) => {
    const amountA = Number(order.amountA) / 10**getAssetDecimals(orderbook.asset);
    const amountB = Number(order.amountB) / 10**getAssetDecimals(orderbook.targetAsset);
    return (amountA / amountB).toFixed(2);
  }

  const getPricedRatio = (order: Order, priceA: number, priceB: number) => {
    const amountA = Number(order.amountA) / 10**getAssetDecimals(orderbook.asset) * priceA;
    const amountB = Number(order.amountB) / 10**getAssetDecimals(orderbook.targetAsset) * priceB;
    const ratio = ((amountA / amountB) * 100);
    if (ratio < 100) {
      return (100 - ratio).toFixed(2);
    } else {
      return (100 - ratio).toFixed(2);
    }
  }

  return <div>
    <div className="mt-3">
      <Label className="text-xs" htmlFor="targetReceivingAddress">
        {firstAsset?.assetId.includes("XMR") ? "BCH" : "XMR"} receiving address
      </Label>
      <Input id="targetReceivingAddress" className="rounded-xl" placeholder={`${getAssetTicker(secondAsset!.assetId)} receiving address`} value={targetReceivingAddress} onChange={onTargetReceivingAddressChange} />

      {targetReceivingAddressValidationError && <div className="text-red-500 text-xs mt-1">{targetReceivingAddressValidationError}</div>}
      <Label className="text-xs mt-3" htmlFor="sourceRefundAddress">
        {firstAsset?.assetId.includes("XMR") ? "XMR" : "BCH"} refund address
      </Label>
      <Input id="sourceRefundAddress" className="rounded-xl" placeholder={`${getAssetTicker(firstAsset!.assetId)} refund address`} value={sourceRefundAddress} onChange={onSourceRefundAddressChange} />
      {sourceRefundAddressValidationError && <div className="text-red-500 text-xs mt-1">{sourceRefundAddressValidationError}</div>}

    </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[50px]">Maker</TableHead>
          <TableHead>Amt {getAssetShortName(orderbook.asset)}</TableHead>
          <TableHead>Amt {getAssetShortName(orderbook.targetAsset)}</TableHead>
          <TableHead>Ratio</TableHead>
          <TableHead className="text-right">%Δ</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>{order.peerId.split('/').at(-1)?.slice(0, 20)}...</TooltipTrigger>
                  <TooltipContent>
                    <p>{order.peerId}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
            <TableCell>{Number(order.amountA) / 10**getAssetDecimals(orderbook.asset)}</TableCell>
            <TableCell>{Number(order.amountB) / 10**getAssetDecimals(orderbook.targetAsset)}</TableCell>
            <TableCell>{getRatio(order)}</TableCell>
            <TableCell className="text-right">{priceA && priceB && getPricedRatio(order, priceA!, priceB!)}</TableCell>
            <TableCell className="text-right">
              {order.isMine ?
                <Button variant={"destructive"} size="icon" onClick={() => cancelOrderClick(order)}><Trash /></Button>
              :
                <Button
                  className="bg-green-400 hover:bg-green-500 disabled:bg-gray-500" variant={"default"} size="icon" onClick={() => takeOrderClick(order)}
                  disabled={!targetReceivingAddress || !sourceRefundAddress || Boolean(targetReceivingAddressValidationError) || Boolean(sourceRefundAddressValidationError)}>
                    <DollarSign />
                </Button>
              }
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    {orders.length === 0 && <div className="w-full flex flex-row items-center justify-center mt-5">
      <div className="font-medium text-xl text-muted-foreground">Orderbook is empty</div>
    </div>}
  </div>
}
