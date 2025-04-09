import type { Meta, StoryObj } from '@storybook/react';

import { History } from '../components/History';
import Providers from '@/app/providers';

const meta: Meta<typeof History> = {
  component: (props) => <div>
    <History {...props} />
  </div>,
  decorators: (Story) => <Providers><Story /></Providers>,
} satisfies Meta<typeof History>;

export default meta;
type Story = StoryObj<typeof History>;

export const Foo: Story = {
  args: {
    historyItems: [{
      amountBch: 400000,
      txId: "2c20ce380206917918e5f775b25ee7ea2de55db6b8974eb15fdfa80ba8cc19b4",
      timestamp: 0,
    },
    {
      amountBch: 400000,
      txId: "2c20ce380206917918e5f775b25ee7ea2de55db6b8974eb15fdfa80ba8cc19b4",
      timestamp: 1744027216,
    },
    {
      amountBch: 364424,
      txId: "535f0b6a95c498578854e56b9d197742362991cf12081288a63a853b84b87b5e",
      timestamp: 1744118823,
    },
    {
      amountBch: 330000,
      txId: "edc318858a4128f05c94aa8af8018d7ac3a57d8afe0f247d29e46ab2d7283d71",
      timestamp: 1743666151,
    }],
  },
};

export const Fetched: Story = {
  args: {
  },
};
