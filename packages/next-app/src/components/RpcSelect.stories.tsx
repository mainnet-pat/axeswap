import type { Meta, StoryObj } from '@storybook/react';

import { RpcSelect } from './RpcSelect';
import { useState } from 'react';

const meta: Meta<typeof RpcSelect> = {
  component: (props) => {
    const [value, onValueChange] = useState<string>("someValue");
    return <div className='w-[250px]'>
      <RpcSelect {...props} value={value} onValueChange={onValueChange}></RpcSelect>
    </div>
  },
} satisfies Meta<typeof RpcSelect>;

export default meta;
type Story = StoryObj<typeof RpcSelect>;

export const Default: Story = {
  args: {
    label: 'Default Monero RPC Endpoint:',
    network: 'mainnet',
    coin: 'monero',
  },
  argTypes: {
    network: {
      control: {
        type: 'radio',
      },
      options: ['mainnet', 'testnet'],
    },
    coin: {
      control: {
        type: 'radio',
      },
      options: ['monero', 'bch'],
    },
  }
};