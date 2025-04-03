import { getAssetAmount } from "@/lib/utils";
import { CommonState } from "@xmr-bch-swap/swap";
import { QrCode } from "../QrCode";
import { Button } from "../ui/button";
import { useCallback, useState } from "react";
import { RegTestWallet } from "mainnet-js";

export function FundBchSwaplock({state} : {state: CommonState}) {
  const [sendDisabled, setSendDisabled] = useState(false);

  const sendBch = useCallback(async () => {
    setSendDisabled(true);

    const FUNDING_ID = "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    const WalletType = RegTestWallet;

    const bchFundingWallet =  await WalletType.fromId(FUNDING_ID);
    const result = await bchFundingWallet.send({
      cashaddr: state.bchSwapLockContractAddress,
      value: Number(state.bchSwapAmount),
      unit: "sat"
    });
    console.log(result.txId);

    setSendDisabled(false);
  }, [state]);

  return <div>
    <div>Please deposit {getAssetAmount(state.bchSwapAmount, "BCH:native")} BCH to {state.bchSwapLockContractAddress}</div>
    <QrCode address={state.bchSwapLockContractAddress} amount={getAssetAmount(state.bchSwapAmount, "BCH:native").toString()} iconSrc="/bch.svg" />
    {state.asset.startsWith("r") && <div className="flex justify-center">
      <div className="flex flex-row gap-2 rounded-md border-2 border-gray-300 p-2 items-center w-[250px]">
        <div>Debug actions: </div>
        <Button onClick={sendBch} disabled={sendDisabled}>
          Send BCH
        </Button>
      </div>
    </div>}
  </div>
}
