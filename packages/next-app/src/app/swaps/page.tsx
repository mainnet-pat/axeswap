"use client";

import { Crumbs } from '@/components/Crumbs';
import { useParams } from 'next/navigation';

export default function SettingsPage() {
  return <>
    <Crumbs value={[
      { href: "/swaps", title: "Swaps", collapsible: false },
    ]} />
    <div>
      All swaps
    </div>
  </>;
};
