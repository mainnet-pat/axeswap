import type { Meta, StoryObj } from '@storybook/react';

import { QrCode } from './QrCode';
import { useState } from 'react';

const meta: Meta<typeof QrCode> = {
  component: QrCode,
} satisfies Meta<typeof QrCode>;

export default meta;
type Story = StoryObj<typeof QrCode>;

export const XMR: Story = {
  args: {
    address: "433CGJkA3gnh8JXCCB9ZbdVcGZsRPbWqEb72D5QFZomKKXV5i6jQfgjGwxXU9h64uHTAfVKCZDLMMdAhkS2UiYGX1UJuNhw",
    iconSrc: "/xmr.png",
    amount: "0.01",
  },
};

export const XMRTestnet: Story = {
  args: {
    address: "9waNBpGwmoqBon2t1vAMFX3GPu2BHNSzPeGjFowLeadaidLLWKW3NUYGs8KXRMZuLQMeMTtufVxWiJvnQUAr1KAtPGAojsj",
    iconSrc: "/xmr.png",
    amount: "0.01",
  },
};

export const BCH: Story = {
  args: {
    address: "bitcoincash:qqsxjha225lmnuedy6hzlgpwqn0fd77dfq73p60wwp",
    iconSrc: "/bch.svg",
    amount: "0.01",
  },
};

export const BCHTestnet: Story = {
  args: {
    address: "bchtest:qreff7clxjd28xzrjs8tk5g642sxwf8wdq4se6md3v",
    iconSrc: "/bch.svg",
    amount: "0.01",
  },
};