"use client";

import { Crumbs } from "@/components/Crumbs"
import { SwapCard } from "@/components/SwapCard"

export default function Page() {
  return (
    <>
      <Crumbs value={[
        { href: "/", title: "Swap", collapsible: false },
      ]} />
      <div className='w-auto'>
        <SwapCard />
      </div>
    </>
  )
}