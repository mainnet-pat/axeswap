import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

interface KrakenResponse {
  error: any[];
  result: {
    [key: string]: {c: [string, string]; };
  };
}

export default function usePrice(assetId: string | undefined) {
  const currencyId = assetId?.includes("BCH") ? "BCHUSD" : "XMRUSD";

  const { data } = useQuery<number | undefined>({
    queryKey: ["price", currencyId ?? ""],
    queryFn: async () => {
      if (!currencyId) return undefined;

      const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${currencyId}`);
      const data = await response.json() as KrakenResponse;
      return Number(Object.values(data.result)[0].c[0]);
    },
    staleTime: 1000 * 30,
  });

  return useMemo(() => data, [data]);
}
