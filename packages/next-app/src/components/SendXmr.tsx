import { useCallback, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getRegtestFundingWallet } from "@xmr-bch-swap/swap";

export function SendXmr ({} : {}) {
  const [address, setAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const sendXmr = useCallback(async () => {
    const moneroFundingWallet = await getRegtestFundingWallet();

    await moneroFundingWallet.sync();
    const tx = await moneroFundingWallet.createTx({
      accountIndex: 0,
      address: address,
      amount: BigInt(amount),
      relay: true,
    });
    console.log(tx.hash);
  }, [address, amount]);

  return <div className="flex flex-col gap-1">
    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="address"/>
    <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="amount" />
    <Button onClick={sendXmr}>Send XMR</Button>
  </div>
}
