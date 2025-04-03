"use client";

import usePrice from "@/hooks/usePrice";
import { createContext, JSX, ReactNode, useContext, useMemo } from "react";

/**
 * Context
 */
export const PriceContext = createContext<{bchPrice: number | undefined, xmrPrice: number | undefined}>({bchPrice: undefined, xmrPrice: undefined});

/**
 * Provider
 */
export function PriceContextProvider({
  children,
}: {
  children: ReactNode | ReactNode[];
}): JSX.Element {
  const bchPrice = usePrice("BCH");
  const xmrPrice = usePrice("XMR");

  const value = useMemo(() => ({ bchPrice, xmrPrice }), [bchPrice, xmrPrice]);

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrices() {
  const context = useContext(PriceContext);
  return context;
}
