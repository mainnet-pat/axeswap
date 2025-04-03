import type { Meta, StoryObj } from '@storybook/react';

import { SendBch } from './SendBch';
import { SwapManagerContextProvider } from "@/providers/SwapManagerProvider";

const meta: Meta<typeof SendBch> = {
  component: SendBch,
  decorators: (Story) => <SwapManagerContextProvider><Story /></SwapManagerContextProvider>,
} satisfies Meta<typeof SendBch>;

export default meta;
type Story = StoryObj<typeof SendBch>;

export const Default: Story = {
  args: {
  },
};