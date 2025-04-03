import type { Meta, StoryObj } from '@storybook/react';

import { default as Settings } from './page';
import Providers from '@/app/providers';

const meta: Meta<typeof Settings> = {
  component: (props) => <div>
    <Settings {...props} />
  </div>,
  decorators: (Story) => <Providers><Story /></Providers>,
} satisfies Meta<typeof Settings>;

export default meta;
type Story = StoryObj<typeof Settings>;

export const Default: Story = {
  args: {

  },
};
