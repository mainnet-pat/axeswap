"use client"

import * as React from "react"
import {
  BookText,
  DownloadCloud,
  GalleryVerticalEnd,
  Github,
  Map,
  RefreshCcw,
  Send,
  Settings,
  SquareTerminal,
  Twitter,
  X,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useSwapManagerContext } from "@/providers/SwapManagerProvider"
import Link from "next/link"
import Image from "next/image"

const navData = {
  navMain: [
    {
      title: "Trade",
      url: "/swap",
      icon: RefreshCcw,
      isActive: true,
    },
    {
      title: "Orderbooks",
      url: "/orderbooks",
      icon: BookText,
      isActive: true,
    },
    {
      title: "Swaps",
      url: "/",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Waiting",
          url: "/swaps/waiting",
          badge: undefined as number | undefined,
        },
        {
          title: "Active",
          url: "/swaps/active",
          badgeCn: "bg-green-100",
          // badge: 2,
        },
        {
          title: "Attention required",
          url: "/swaps/attention",
          badgeCn: "bg-yellow-300",
          blinks: true,
          hideIfEmpty: true,
          // badge: 2,
        },
        {
          title: "Failed",
          url: "/swaps/failed",
          badgeCn: "bg-red-100",
          // badge: 3,
        },
        {
          title: "Completed",
          url: "/swaps/completed",
          // badge: 4,
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      isActive: true,
    },
    {
      title: "Roadmap",
      url: "/roadmap",
      icon: Map,
      isActive: true,
    },
    {
      title: "Docs",
      url: "/docs",
      icon: GalleryVerticalEnd,
      isActive: true,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [data, setData] = React.useState(navData);
  const { manager, update } = useSwapManagerContext();

  React.useEffect(() => {
    if (!manager) return;

    const failedSwaps = manager.failedSwaps().length;
    const waitingSwaps = manager.waitingSwaps().length;
    const attention = manager.attendSwaps().length;
    const activeSwaps = manager.activeSwaps().length;
    const completedSwaps = manager.completedSwaps().length;

    setData((prev) => {
      prev.navMain[2].items![0].badge = waitingSwaps || undefined;
      prev.navMain[2].items![1].badge = activeSwaps || undefined;
      prev.navMain[2].items![2].badge = attention || undefined;
      prev.navMain[2].items![3].badge = failedSwaps || undefined;
      prev.navMain[2].items![4].badge = completedSwaps || undefined;
      return { ...prev };
    });
  }, [manager, manager?.swaps, update]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Image src="/favicon.ico" width={32} height={32} alt="logo" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">AxeSwap</span>
                  <span className="">v0.4.1</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-row gap-4 pl-2">
          <Link href="https://github.com/mainnet-pat/axeswap" target="_blank" title="Github">
            <Github />
          </Link>
          <Link href="https://twitter.com/mainnet_pat" target="_blank" title="Twitter">
            <Twitter />
          </Link>
          <Link href="https://t.me/AxeSwap" target="_blank" title="Telegram">
            <Send />
          </Link>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
