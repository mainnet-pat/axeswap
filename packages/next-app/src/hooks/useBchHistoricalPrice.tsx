import { useEffect, useMemo, useState } from "react";
import { getBchHistoricalPriceFromOracle } from "@xmr-bch-swap/swap";

export default function useBchHistoricalPrice(timestamp: number) {
  const [price, setPrice] = useState<number>();

  useEffect(() => {
    getBchHistoricalPriceFromOracle(timestamp).then((price) => {
      setPrice(price);
    });
  }, [timestamp]);

  return useMemo(() => price, [timestamp, price]);
}
