import { getAssetAmount } from "@/lib/utils";
import { CommonState, getRegtestFundingWallet } from "@xmr-bch-swap/swap";
import { QrCode } from "../QrCode";
import { useCallback, useState } from "react";
import { Button } from "../ui/button";

export function FundXmrSwaplock({state} : {state: CommonState}) {
  const [sendDisabled, setSendDisabled] = useState(false);

  const sendXmr = useCallback(async () => {
    setSendDisabled(true);

    const moneroFundingWallet = await getRegtestFundingWallet();

    await moneroFundingWallet.sync();
    const tx = await moneroFundingWallet.createTx({
      accountIndex: 0,
      address: state.xmrLockAddress,
      amount: BigInt(state.xmrSwapAmount),
      relay: true,
    });
    console.log(tx.hash);

    setSendDisabled(false);
  }, [state]);

  return <div>
    <div className="break-all">Please deposit {getAssetAmount(state.xmrSwapAmount, "XMR:native")} XMR to {state.xmrLockAddress}</div>
    <QrCode address={state.xmrLockAddress} amount={getAssetAmount(state.xmrSwapAmount, "XMR:native").toString()} iconSrc="/xmr.png" />
    {state.asset.startsWith("r") && <div className="flex justify-center">
      <div className="flex flex-row gap-2 rounded-md border-2 border-gray-300 p-2 items-center w-[250px]">
        <div>Debug actions: </div>
        <Button onClick={sendXmr} disabled={sendDisabled}>
          Send XMR
        </Button>
      </div>
    </div>}
  </div>
}
