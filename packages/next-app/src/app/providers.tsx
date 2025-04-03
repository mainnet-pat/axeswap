"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { SwapManagerContextProvider } from "@/providers/SwapManagerProvider";
import { PriceContextProvider } from "@/providers/PriceProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Suspense, useEffect } from "react";
import fs from "fs";
import JSON5 from "@mainnet-pat/json5-bigint";
import "@mainnet-pat/json5-bigint/lib/presets/extended"
import moneroTs from "monero-ts";

if (moneroTs.GenUtils.isBrowser()) {
  moneroTs.LibraryUtils.setWorkerLoader(() => new Worker(new URL("monero-ts/dist/monero.worker.js", import.meta.url)));
}

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (window as any).fs = fs;
    (window as any).parent.window.fs = fs;
    (window as any).JSON5 = JSON5;
    (window as any).parent.window.JSON5 = JSON5;

  }, []);

  return (<>
    <QueryClientProvider client={queryClient}>
      <PriceContextProvider>
        <Suspense>
          <SwapManagerContextProvider>
            <SidebarProvider>
              {children}
              <Toaster richColors />
            </SidebarProvider>
          </SwapManagerContextProvider>
        </Suspense>
      </PriceContextProvider>
    </QueryClientProvider>
  </>);
}