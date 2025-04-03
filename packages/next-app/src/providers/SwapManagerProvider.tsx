"use client";

import { SwapManager } from "@xmr-bch-swap/swap";
import { createContext, JSX, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import fs from "fs";

/**
 * Context
 */
export const SwapManagerContext = createContext<{update: number, manager: SwapManager | undefined}>({update: 0, manager: undefined});

/**
 * Provider
 */
export function SwapManagerContextProvider({
  children,
}: {
  children: ReactNode | ReactNode[];
}): JSX.Element {
  const [manager, setManager] = useState<SwapManager | undefined>(undefined);
  const [update, setUpdate] = useState(0);

  useEffect(() => {
    let manager: SwapManager | undefined = undefined;
    const listener = () => {
      setUpdate((prev) => prev + 1);
    };

    (async () => {
      manager = new SwapManager();
      (window as any).swapManager = manager;
      (window as any).parent.window.swapManager = manager;

      console.log((window as any).swapManager);

      manager.addEventListener("#update", listener);
      setManager(manager);

      // do not block exectution
      manager.restoreSwaps(true).catch(console.error);
    })();

    return () => {
      manager?.removeEventListener("#update", listener);
    }
  }, []);

  const value = useMemo(() => ({ update, manager: manager }), [update, manager]);

  return (
    <SwapManagerContext.Provider value={value}>
      {children}
    </SwapManagerContext.Provider>
  );
}

export function useSwapManagerContext() {
  const context = useContext(SwapManagerContext);
  return context;
}
