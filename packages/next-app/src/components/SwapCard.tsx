import { Input } from "./ui/input";

import { ChevronDown } from "lucide-react"

import { Asset, Assets, findAssetById, getAssetDecimals, getAssetNetwork, getAssetTicker, GetDefaultBchRpcEndpoint, GetDefaultMoneroRpcEndpoint, GetPreviousBchReceivingAddress, GetPreviousBchRefundAddress, GetPreviousMoneroReceivingAddress, GetPreviousMoneroRefundAddress, SetPreviousBchReceivingAddress, SetPreviousBchRefundAddress, SetPreviousMoneroReceivingAddress, SetPreviousMoneroRefundAddress } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { SwapAssetCard } from "./SwapAssetCard";
import { useSwapManagerContext } from "@/providers/SwapManagerProvider";
import { Orderbook, OrderSubmission, PeerIdToObject, State, Config, BobState, validateXmrAddress, validateBchAddress, DEFAULT_TTL } from "@xmr-bch-swap/swap";
import { RelayMultiaddrs } from "@/lib/RelayMultiaddrs";
import { Separator } from "./ui/separator";
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { binToBase58, generateRandomBytes } from '@bitauth/libauth';
import { AliceState } from "@xmr-bch-swap/swap/dist/src/StateMachine/bch-xmr-0.4.1/XmrBchStateMachine";
import { usePathname, useSearchParams } from "next/navigation";
import { RpcSelect } from "./RpcSelect";
import { useRouter } from "next/navigation";
import usePrice from "@/hooks/usePrice";
import { Label } from "@radix-ui/react-label";

const version = "0.4.1";

const PROD = process.env.NODE_ENV === "production";

export function SwapCard ({} : {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathName = usePathname();
  const initialAssetId = searchParams?.get("sell") || (PROD ? "BCH:native" : "rBCH:native");
  const secondInitialAssetId = searchParams?.get("buy") || (PROD ? "XMR:native" : "rXMR:native");
  const initialAsset = findAssetById(initialAssetId);
  const secondInitialAsset = findAssetById(secondInitialAssetId);

  const {manager: swapManager} = useSwapManagerContext();
  const [orderbook, setOrderBook] = useState<Orderbook | undefined>();
  const [optionsExpanded, setOptionsExpanded] = useState<boolean>(false);
  const [firstAsset, setFirstAsset] = useState<Asset | undefined>(initialAsset);
  const [secondAsset, setSecondAsset] = useState<Asset | undefined>(secondInitialAsset);
  const [firstAmount, setFirstAmount] = useState<string>("1");
  const [secondAmount, setSecondAmount] = useState<string>("1");
  const [firstAmountValidationError, setFirstAmountValidationError] = useState<string>();
  const [secondAmountValidationError, setSecondAmountValidationError] = useState<string>();

  const firstAssetPrice = usePrice(firstAsset?.assetId);
  const secondAssetPrice = usePrice(secondAsset?.assetId);

  const [bchRpc, setBchRpc] = useState<string>("");
  const [xmrRpc, setXmrRpc] = useState<string>("");

  const [customBchRpcs, setCustomBchRpcs] = useState<Record<string, string>>({});
  const [customXmrRpcs, setCustomXmrRpcs] = useState<Record<string, string>>({});

  // A1y9sbVt8nqhZAVm3me1U18rUVXcjeNKuBd1oE2cTs8biA9cozPMeyYLhe77nPv12JA3ejJN3qprmREriit2fi6tJDi99RR
  const [targetReceivingAddress, setTargetReceivingAddress] = useState<string>("");
  // bchreg:qrt2ny4gxes8gwt2afquggld4m858l5yucqadxnjft
  const [sourceRefundAddress, setSourceRefundAddress] = useState<string>("");

  const [targetReceivingAddressValidationError, setTargetReceivingAddressValidationError] = useState<string>();
  const [sourceRefundAddressValidationError, setSourceRefundAddressValidationError] = useState<string>();

  const [customReceivingAddresses, setCustomReceivingAddresses] = useState<Record<string, string>>({});
  const [customRefundAddresses, setCustomRefundAddresses] = useState<Record<string, string>>({});

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

  useEffect(() => {
    const bchAssetId = firstAsset?.assetId!.includes("BCH") ? firstAsset?.assetId! : secondAsset?.assetId!;
    const xmrAssetId = firstAsset?.assetId!.includes("XMR") ? firstAsset?.assetId! : secondAsset?.assetId!;

    setBchRpc(customBchRpcs[getAssetNetwork(bchAssetId)] ?? GetDefaultBchRpcEndpoint(getAssetNetwork(bchAssetId)));
    setXmrRpc(customXmrRpcs[getAssetNetwork(xmrAssetId)] ?? GetDefaultMoneroRpcEndpoint(getAssetNetwork(xmrAssetId)));
  }, [customBchRpcs, firstAsset, secondAsset, customXmrRpcs]);

  // useEffect(() => {
  //   const bchAssetId = firstAsset?.assetId!.includes("BCH") ? firstAsset?.assetId! : secondAsset?.assetId!;
  //   const xmrAssetId = firstAsset?.assetId!.includes("XMR") ? firstAsset?.assetId! : secondAsset?.assetId!;

  //   if (firstAsset!.assetId.includes("XMR")) {
  //     setTargetReceivingAddress(customReceivingAddresses[getAssetNetwork(xmrAssetId)] ?? targetReceivingAddress);
  //     setSourceRefundAddress(customRefundAddresses[getAssetNetwork(bchAssetId)] ?? sourceRefundAddress);
  //   } else {
  //     setTargetReceivingAddress(customReceivingAddresses[getAssetNetwork(bchAssetId)] ?? targetReceivingAddress);
  //     setSourceRefundAddress(customRefundAddresses[getAssetNetwork(xmrAssetId)] ?? sourceRefundAddress);
  //   }
  // }, [customReceivingAddresses, customRefundAddresses, firstAsset, secondAsset, sourceRefundAddress, targetReceivingAddress]);

  useEffect(() => {
    (async () => {
      if (swapManager && firstAsset && secondAsset) {
        const instance = await swapManager?.getOrderbook(firstAsset.assetId as any, secondAsset.assetId as any, version, RelayMultiaddrs, undefined);
        setOrderBook(instance);
      }
    })();
  }, [swapManager, firstAsset, secondAsset]);

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

  const onDeltaButtonClick = useCallback((delta: number, firstAmountOverride?: string) => {
    if (!firstAssetPrice || !secondAssetPrice || !firstAmount || !firstAsset || !secondAsset) {
      return;
    }

    const firstAssetCost = Number(firstAmountOverride ?? firstAmount) * firstAssetPrice;
    const secondAmount = Number((firstAssetCost / secondAssetPrice).toFixed(getAssetDecimals(secondAsset.assetId))) * (1 + delta / 100);

    setSecondAmount(secondAmount.toString());
  }, [firstAsset, firstAssetPrice, secondAsset, secondAssetPrice, firstAmount]);

  const onFirstAmountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);

    if (isNaN(value)) {
      return;
    }

    if (["", ".", "0", "0."].includes(event.target.value)) {
      // pass
    } else if (value < 1 / 1e8) {
      setFirstAmountValidationError("Value too low")
    } else {
      setFirstAmountValidationError("");
    }
    if (value === 0 || ["", ".", "0", "0."].includes(event.target.value)) {
      setFirstAmount(event.target.value);
    } else {
      setFirstAmount(event.target.value);
    }

    onDeltaButtonClick(0, event.target.value);
  }, [onDeltaButtonClick]);

  const onSecondAmountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);

    if (isNaN(value)) {
      return;
    }

    if (["", ".", "0", "0."].includes(event.target.value)) {
      // pass
    } else if (value < 1 / 1e8) {
      setSecondAmountValidationError("Value too low")
    } else {
      setSecondAmountValidationError("");
    }
    if (value === 0 || ["", ".", "0", "0."].includes(event.target.value)) {
      setSecondAmount(event.target.value);
    } else {
      setSecondAmount(event.target.value);
    }
  }, []);

  const setSellAsset = useCallback((asset?: Asset) => {
    setFirstAsset(asset);

    if (asset) {
      if (asset?.assetId.includes("XMR")) {
        const network = getAssetNetwork(asset.assetId);
        setSecondAsset(Assets[network].find((a) => !a.assetId.includes("XMR")));
      } else {
        const network = getAssetNetwork(asset.assetId);
        setSecondAsset(Assets[network].find((a) => a.assetId.includes("XMR")));
      }

      window.history.replaceState(null, document.title, `${pathName}?sell=${asset.assetId}&buy=${secondAsset?.assetId}`);
    }
  }, [pathName, secondAsset]);

  const setBuyAsset = useCallback((asset?: Asset) => {
    setSecondAsset(asset);
    if (asset) {
      if (asset?.assetId.includes("XMR")) {
        const network = getAssetNetwork(asset.assetId);
        setFirstAsset(Assets[network].find((a) => !a.assetId.includes("XMR")));
      } else {
        const network = getAssetNetwork(asset.assetId);
        setFirstAsset(Assets[network].find((a) => a.assetId.includes("XMR")));
      }

      window.history.replaceState(null, document.title, `${pathName}?sell=${firstAsset?.assetId}&buy=${asset.assetId}`);
    }
  }, [pathName, firstAsset]);

  useEffect(() => {
    validateSourceRefundAddress(sourceRefundAddress, firstAsset!);
  }, [firstAsset, sourceRefundAddress]);

  useEffect(() => {
    validateTargetReceivingAddress(targetReceivingAddress, secondAsset!);
  }, [secondAsset, targetReceivingAddress]);

  const chevronClick = useCallback(() => {
    setFirstAsset(secondAsset);
    setSecondAsset(firstAsset);

    setFirstAmount(secondAmount);
    setSecondAmount(firstAmount);

    window.history.replaceState(null, document.title, `${pathName}?sell=${secondAsset?.assetId}&buy=${firstAsset?.assetId}`);
  }, [firstAsset, secondAsset, firstAmount, secondAmount, pathName]);

  const placeOrderClick = useCallback(async () => {
    if (orderbook && firstAsset && secondAsset && swapManager) {
      if (firstAsset.assetId.includes("XMR")) {
        SetPreviousMoneroRefundAddress(getAssetNetwork(firstAsset.assetId), sourceRefundAddress);
        SetPreviousBchReceivingAddress(getAssetNetwork(secondAsset.assetId), targetReceivingAddress);
      } else {
        SetPreviousBchRefundAddress(getAssetNetwork(secondAsset.assetId), sourceRefundAddress);
        SetPreviousMoneroReceivingAddress(getAssetNetwork(firstAsset.assetId), targetReceivingAddress);
      }

      // transport initialization
      const peerId = await createEd25519PeerId();
      const swapId = binToBase58(generateRandomBytes(10));

      // swap pre-definition
      const state = {
        asset: firstAsset.assetId,
        targetAsset: secondAsset.assetId,
        currentState: "exec",
        logs: [],
        transportPeerId: PeerIdToObject(peerId),
        orderbookId: "", // we set it right after
        orderbookEntry: undefined as any,
        swapId: swapId,
        version: version,
        // transportMultiaddr: transport.getMultiaddr(),
        relayMultiaddrs: RelayMultiaddrs,
        timestamp: +new Date(),
      } as State;

      // order formation
      const order: OrderSubmission = {
        amountA: BigInt(Math.floor(firstAsset.assetId.includes("XMR") ? Number(firstAmount) * 1e12 : Number(firstAmount) * 1e8)),
        amountB: BigInt(Math.floor(secondAsset.assetId.includes("XMR") ? Number(secondAmount) * 1e12 : Number(secondAmount) * 1e8)),
        agent: "user",
        expiresAt: Date.now() + DEFAULT_TTL,
        transportPeerId: peerId.toString(),
      };

      const orderId = await orderbook.add(order);
      state.orderbookId = orderId;
      state.orderbookEntry = orderbook.orders[orderId];

      // swap definition completion
      const [firstAssetId, secondAssetId] = [firstAsset.assetId, secondAsset.assetId].sort();
      const swapIdentifier = `${firstAssetId}-${secondAssetId}/${version}`
      const config = Config[swapIdentifier];
      let initialState: State;
      if (firstAsset.assetId.includes("XMR")) {
        const xmrState: AliceState = {
          ...state,
          ...config,
          bchRpc: bchRpc,
          xmrRpc: xmrRpc,
          aBchReceivingAddress: targetReceivingAddress,
          aXmrRefundAddress: sourceRefundAddress,
          xmrSwapAmount: BigInt(order.amountA),
          bchSwapAmount: BigInt(order.amountB),
        }
        initialState = xmrState;
      } else {
        const bchState: BobState = {
          ...state,
          ...config,
          bchRpc: bchRpc,
          xmrRpc: xmrRpc,
          bXmrReceivingAddress: targetReceivingAddress,
          bBchRefundAddress: sourceRefundAddress,
          bchSwapAmount: BigInt(order.amountA),
          xmrSwapAmount: BigInt(order.amountB),
        }
        initialState = bchState;
      }

      console.log(initialState, config, swapIdentifier)
      await swapManager.addSwap(initialState, false);
      router.push(`/swaps/${swapId}`);
    }
  }, [firstAsset, secondAsset, orderbook, firstAmount, secondAmount, sourceRefundAddress, swapManager, targetReceivingAddress, router, bchRpc, xmrRpc]);

  const onBchRpcChange = useCallback((value: string) => {
    const assetId = firstAsset?.assetId!.includes("BCH") ? firstAsset?.assetId! : secondAsset?.assetId!;
    setCustomBchRpcs((prev) => ({...prev, [getAssetNetwork(assetId!)]: value}));
    setBchRpc(value);
  }, [firstAsset, secondAsset]);

  const onXmrRpcChange = useCallback((value: string) => {
    const assetId = firstAsset?.assetId!.includes("XMR") ? firstAsset?.assetId! : secondAsset?.assetId!;
    setCustomXmrRpcs((prev) => ({...prev, [getAssetNetwork(assetId!)]: value}));
    setXmrRpc(value);
  }, [firstAsset, secondAsset]);

  // const onReceivingAddressChange = useCallback((value: string) => {
  //   const assetId = firstAsset?.assetId!.includes("XMR") ? firstAsset?.assetId! : secondAsset?.assetId!;
  //   setCustomReceivingAddresses((prev) => ({...prev, [getAssetNetwork(assetId!)]: value}));
  //   setTargetReceivingAddress(value);
  // }, [firstAsset, secondAsset]);

  // const onRefundAddressChange = useCallback((value: string) => {
  //   const assetId = firstAsset?.assetId!.includes("BCH") ? firstAsset?.assetId! : secondAsset?.assetId!;
  //   setCustomRefundAddresses((prev) => ({...prev, [getAssetNetwork(assetId!)]: value}));
  //   setSourceRefundAddress(value);
  // }, [firstAsset, secondAsset]);

  return (<div className="w-[350px] relative mx-auto">
    <div className="flex flex-row w-[350px] justify-center absolute top-[110px]">
      <Button variant="outline" size="icon" className="" onClick={chevronClick}>
        <ChevronDown />
      </Button>
    </div>
    <SwapAssetCard cardTitle={"Sell"} asset={firstAsset} onAssetChange={(asset) => setSellAsset(asset)} value={firstAmount} onValueChange={onFirstAmountChange} />
    <SwapAssetCard cardTitle={"Buy"} asset={secondAsset} className="mt-1" onAssetChange={(asset) => setBuyAsset(asset)} value={secondAmount} onValueChange={onSecondAmountChange} showDeltas onDeltaButtonClick={onDeltaButtonClick} />
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
    <div className="relative my-3 flex flex-col items-center cursor-pointer select-none" onClick={() => setOptionsExpanded(!optionsExpanded)}>
      <Separator className="mt-1" />
      <div className="absolute top-[-9px] bg-white">{optionsExpanded ? "less options ↑" : "more options ↓"}</div>
    </div>
    {optionsExpanded && (
      <>
        <Label className="text-xs mt-3" htmlFor="bchRpc">
          BCH RPC
        </Label>
        <RpcSelect placeholder="BCH RPC" coin={"bch"} network={getAssetNetwork(firstAsset?.assetId!)} value={bchRpc} onValueChange={onBchRpcChange} />
        <Label className="text-xs mt-3" htmlFor="xmrRpc">
          XMR RPC
        </Label>
        <RpcSelect placeholder="XMR RPC" coin={"monero"} network={getAssetNetwork(secondAsset?.assetId!)} value={xmrRpc} onValueChange={onXmrRpcChange} />
      </>
    )}
    {firstAmountValidationError && <div className="text-red-500 text-xs mt-1">{firstAmountValidationError}</div>}
    {secondAmountValidationError && <div className="text-red-500 text-xs mt-1">{secondAmountValidationError}</div>}
    <Button
      onClick={placeOrderClick}
      disabled={Boolean(sourceRefundAddressValidationError?.length || targetReceivingAddressValidationError?.length || firstAmountValidationError?.length || secondAmountValidationError?.length ||
        !sourceRefundAddress?.length || !targetReceivingAddress?.length
      )}
      className="w-full mt-1 bg-slate-700 hover:bg-slate-600">
        Place order
    </Button>

    {/* {firstAsset?.assetId.startsWith("r") && <>
      <SendBch />
      <MineBlock />
    </>} */}
</div>)}