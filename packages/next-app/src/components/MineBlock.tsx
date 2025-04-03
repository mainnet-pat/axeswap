import { useCallback } from "react";
import { Button } from "./ui/button";
import { mineBchBlocks, mineXmrBlocks } from "@xmr-bch-swap/swap";

export function MineBlock ({} : {}) {
  const mine = useCallback(async () => {
    Promise.all([
      mineBchBlocks("bchreg:qrt2ny4gxes8gwt2afquggld4m858l5yucqadxnjft", 1),
      mineXmrBlocks("A1y9sbVt8nqhZAVm3me1U18rUVXcjeNKuBd1oE2cTs8biA9cozPMeyYLhe77nPv12JA3ejJN3qprmREriit2fi6tJDi99RR", 1),
    ]).then(() => {
      console.log("Mined 1 XMR and 1 BCH block");
    }).catch((e) => {
      console.error(e);
    });
  }, []);

  return <div className="flex flex-col gap-1">
    <Button onClick={mine}>Mine 1 XMR and 1 BCH block</Button>
  </div>
}
