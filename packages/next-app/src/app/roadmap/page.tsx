"use client";

import { Crumbs } from "@/components/Crumbs";
import { QrCode } from "@/components/QrCode";

export default function RoadmapPage() {
  return (
    <>
      <Crumbs value={[
        { href: "/roadmap", title: "Roadmap", collapsible: false },
      ]} />
      <div className="flex flex-col items-center justify-center w-full h-full mx-auto max-w-[95%] md:max-w-[85%] pb-10">
        <div className="">
          <h1 className="text-3xl font-bold">Roadmap</h1>
          <p className="mt-4">AxeSwap is a young app and has big potential to unveil. However, as it has no platform fees, the further development and maintenance depends on community contributions. Consider a donation to the addresses below.</p>
          <p className="mt-4">This is why currently the roadmap has no fixed dates and looks more like an itemized development plan. There are no strong priorities set to the items.</p>
          <p className="mt-2 pl-5">* Market-making bot to provide liquidity for the takers and farm the spread.</p>
          <p className="mt-2 pl-5">* Support for CashTokens-XMR swaps.</p>
          <p className="mt-2 pl-5">* Support for EVM swaps. ERC20 token swaps for EVM-BCH, EVM-CashTokens and EVM-XMR swaps.</p>
          <p className="mt-2 pl-5">* Support for BTC and its UTXO forks/spinoffs (LTC, DOGE) swaps.</p>
          <p className="mt-2 pl-5">* Continued maintenance of the app is one of the most important goals.</p>
        </div>

        <div className="flex flex-col md:flex-row w-full h-full mx-auto max-w-[95%] md:max-w-[85%] pb-10 gap-10 pt-10">
          <div className="flex flex-col items-center break-all">
            <QrCode address="bitcoincash:qqsxjha225lmnuedy6hzlgpwqn0fd77dfq73p60wwp" iconSrc="/bch.svg" amount="1" />
            <div className="text-sm">bitcoincash:qqsxjha225lmnuedy6hzlgpwqn0fd77dfq73p60wwp</div>
          </div>
          <div className="flex flex-col items-center break-all">
            <QrCode address="433CGJkA3gnh8JXCCB9ZbdVcGZsRPbWqEb72D5QFZomKKXV5i6jQfgjGwxXU9h64uHTAfVKCZDLMMdAhkS2UiYGX1UJuNhw" iconSrc="/xmr.png" amount="1" />
            <div className="text-sm">433CGJkA3gnh8JXCCB9ZbdVcGZsRPbWqEb72D5QFZomKKXV5i6jQfgjGwxXU9h64uHTAfVKCZDLMMdAhkS2UiYGX1UJuNhw</div>
          </div>
        </div>
      </div>
    </>
  );
}