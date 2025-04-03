import type { Metadata } from "next";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner"
import Providers from "./providers";

export const metadata: Metadata = {
  title: "AxeSwap",
  description: "Atomic Cross-Chain Exchange",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="">
        <Providers>
          <AppSidebar />
            <main className="w-full h-full">
              {children}
            </main>
            <Toaster />
        </Providers>
      </body>
    </html>
  );
}
