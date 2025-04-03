import type { Meta, StoryObj } from '@storybook/react';

import { SwapManagerContextProvider } from "@/providers/SwapManagerProvider";
import Providers from '@/app/providers';
import { Toaster } from 'sonner';
import { AppSidebar } from './app-sidebar';
import { Skeleton } from './ui/skeleton';
import { Crumbs } from './Crumbs';

const Component = function () {
  return <Providers>
  <AppSidebar />
    <main className="w-full h-full">
      <Crumbs value={[
        { href: "/", title: "Home", collapsible: false },
      ]} />
      <Skeleton className="h-[250px] w-[250px] rounded-xl" />
    </main>
    <Toaster />
</Providers>
}

const meta: Meta<typeof Component> = {
  component: Component,
  decorators: (Story) => <SwapManagerContextProvider><Story /></SwapManagerContextProvider>,
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {
  args: {
  },
};