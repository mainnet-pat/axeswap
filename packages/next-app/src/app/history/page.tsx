"use client";

import { Crumbs } from '@/components/Crumbs';
import { History } from '@/components/History';

export default function HistoryPage() {
  return <>
    <Crumbs value={[
      { href: "/history", title: "Swap History", collapsible: false },
    ]} />
    <History />
  </>;
};
