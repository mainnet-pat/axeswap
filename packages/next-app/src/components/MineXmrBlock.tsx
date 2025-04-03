import { useCallback } from "react";
import { Button } from "./ui/button";
import { mineXmrBlocks } from "@xmr-bch-swap/swap";

export function MineXmrBlock ({} : {}) {
  const mine = useCallback(async () => {
    Promise.all([
      mineXmrBlocks("A1y9sbVt8nqhZAVm3me1U18rUVXcjeNKuBd1oE2cTs8biA9cozPMeyYLhe77nPv12JA3ejJN3qprmREriit2fi6tJDi99RR", 1),
    ]).then(() => {
      console.log("Mined 1 XMR block");
    }).catch((e) => {
      console.error(e);
    });
  }, []);

  return <div className="flex flex-col gap-1">
    <Button onClick={mine}>Mine 1 XMR block</Button>
  </div>
}
