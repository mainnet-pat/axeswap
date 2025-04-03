"use client";

import { Crumbs } from '@/components/Crumbs';
import { OrderbookView } from '@/components/Orderbook';
import { getAssetIcon, getAssetNameWithNetwork, getAssetShortName, OrderbookPairs, Orderbooks } from '@/lib/utils';
import { ArrowRightLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OrderbooksPage() {
  const router = useRouter();

  return <>
    <Crumbs value={[
      { href: "/orderbooks", title: "Orderbooks", collapsible: false },
    ]} />
    <div className='flex flex-col gap-4 items-center'>
      {OrderbookPairs.map(({ asset, targetAsset }) => (
        <div className='border-2 border-slate-200 rounded-md p-4 cursor-pointer' onClick={() => router.push(`/orderbooks/${asset}-${targetAsset}`)} key={`${asset}-${targetAsset}`}>
          <div className="flex flex-row gap-3 items-center">
            <div className="flex flex-col text-right w-[150px]">
              <div className="text-md">{getAssetNameWithNetwork(asset)}</div>
            </div>
            <div>
              <img width={32} height={32} src={getAssetIcon(asset)} alt={getAssetShortName(asset)} />
            </div>
            <ArrowRightLeft size={24} />
            <div>
              <img width={32} height={32} src={getAssetIcon(targetAsset)} alt={getAssetShortName(targetAsset)} />
            </div>
            <div className="flex flex-col text-left w-[150px]">
              <div className="text-md">{getAssetNameWithNetwork(targetAsset)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </>;
};
