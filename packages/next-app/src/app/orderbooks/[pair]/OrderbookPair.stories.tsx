import type { Meta, StoryObj } from '@storybook/react';

import { default as OrderbookPage } from './page';
import Providers from '@/app/providers';

const meta: Meta<typeof OrderbookPage> = {
  component: (props) => <div>
    <OrderbookPage {...props} />
  </div>,
  decorators: (Story) => <Providers><Story /></Providers>,
} satisfies Meta<typeof OrderbookPage>;

export default meta;
type Story = StoryObj<typeof OrderbookPage>;

export const Default: Story = {
  parameters: {
    nextjs: {
      router: {
        pathname: '/orderbooks/[pair]',
        asPath: '/orderbooks/rBCH:native-rXMR:native',
        query: {
          pair: 'rBCH:native-rXMR:native',
        },
      },
    },
  },
  args: {

  },
};
