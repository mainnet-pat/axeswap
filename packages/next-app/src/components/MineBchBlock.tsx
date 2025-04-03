import { useCallback } from "react";
import { Button } from "./ui/button";
import { mineBchBlocks } from "@xmr-bch-swap/swap";

export function MineBchBlock ({} : {}) {
  const mine = useCallback(async () => {
    Promise.all([
      mineBchBlocks("bchreg:qrt2ny4gxes8gwt2afquggld4m858l5yucqadxnjft", 1),
    ]).then(() => {
      console.log("Mined 1 BCH block");
    }).catch((e) => {
      console.error(e);
    });
  }, []);

  return <div className="flex flex-col gap-1">
    <Button onClick={mine}>Mine 1 BCH block</Button>
  </div>
}
