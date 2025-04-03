"use client";

import { Crumbs } from '@/components/Crumbs';
import { OrderbookView } from '@/components/Orderbook';
import { Orderbooks } from '@/lib/utils';
import { useParams } from 'next/navigation';

export default function OrderbookPage() {
  const orderbookId = decodeURIComponent(useParams().pair as string ?? "");

  const orderbook = Orderbooks.find(({ asset, targetAsset }) => `${asset}-${targetAsset}` === orderbookId);
  if (!orderbook) {
    return <p>Orderbook not found</p>;
  }

  const orderbook2 = Orderbooks.find(({ asset, targetAsset }) => `${asset}-${targetAsset}` === `${orderbook.targetAsset}-${orderbook.asset}`)!;

  return <>
    <Crumbs value={[
      { href: "/orderbooks", title: "Orderbooks", collapsible: false },
      { href: `/orderbooks/${orderbookId}`, title: `${orderbookId}`, collapsible: false },
    ]} />
    <div className='flex flex-col gap-4 items-center'>
      {[orderbook, orderbook2].map((orderbook) => (
        <div className='border-2 border-slate-200 rounded-md p-4' key={`${orderbook.asset}-${orderbook.targetAsset}`}>
          <OrderbookView
            key={`${orderbook.asset}-${orderbook.targetAsset}`}
            asset={orderbook.asset}
            targetAsset={orderbook.targetAsset}
            version='0.4.1'
            open
          />
        </div>
      ))}
    </div>
  </>;
};
