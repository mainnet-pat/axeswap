import type { Meta, StoryObj } from '@storybook/react';

import { SendXmr } from './SendXmr';
import { SwapManagerContextProvider } from "@/providers/SwapManagerProvider";

const meta: Meta<typeof SendXmr> = {
  component: SendXmr,
  decorators: (Story) => <SwapManagerContextProvider><Story /></SwapManagerContextProvider>,
} satisfies Meta<typeof SendXmr>;

export default meta;
type Story = StoryObj<typeof SendXmr>;

export const Default: Story = {
  args: {
  },
};