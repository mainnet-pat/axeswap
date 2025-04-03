"use client";

import { Crumbs } from '@/components/Crumbs';
import { SwapStatus } from '@/components/SwapStatus';
import { useParams } from 'next/navigation';

export default function SettingsPage() {
  const swapId = useParams().swapId as string;
  return <>
    <Crumbs value={[
      { href: "/swaps", title: "Swaps", collapsible: false },
      { href: `/swaps/${swapId}`, title: swapId ?? "", collapsible: false },
    ]} />
    <SwapStatus swapId={swapId} />
  </>;
};
