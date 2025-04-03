import { useCallback, useState } from "react";
import { TestNetWallet, RegTestWallet } from "mainnet-js";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const testnet = false;

export function SendBch ({} : {}) {
  const [address, setAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const sendBch = useCallback(async () => {
    const FUNDING_ID = testnet ? "wif:testnet:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6" : "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
    const WalletType = testnet ? TestNetWallet : RegTestWallet;

    const bchFundingWallet =  await WalletType.fromId(FUNDING_ID);
    const result = await bchFundingWallet.send({
      cashaddr: address,
      value: Number(amount),
      unit: "sat"
    });
    console.log(result.txId);
  }, [address, amount]);

  return <div className="flex flex-col gap-1">
    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="address"/>
    <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="amount" />
    <Button onClick={sendBch}>Send BCH</Button>
  </div>
}
