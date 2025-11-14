import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface Asset {
  assetId: string;
  ticker: string;
  name: string;
  icon: string;
}

export const Assets: Record<string, Asset[]> = {
  "mainnet": [
    {
      assetId: "BCH:native",
      ticker: "BCH",
      name: "Bitcoin Cash",
      icon: "/bch.svg",
    },
    {
      assetId: "XMR:native",
      ticker: "XMR",
      name: "Monero",
      icon: "/xmr.png",
    },
    // {
    //   assetId: "BCH:270fc70ef4d352ff454bcc218e42b20f246f0691af07af9a069608f14f031c48",
    //   ticker: "PUMP",
    //   name: "BCH PUMP Token",
    //   icon: "/pump.jpeg",
    // },
  ],
  "testnet": [
    {
      assetId: "tBCH:native",
      ticker: "tBCH",
      name: "Bitcoin Cash Testnet",
      icon: "/bch.svg",
    },
    {
      assetId: "tXMR:native",
      ticker: "tXMR",
      name: "Monero Testnet",
      icon: "/xmr.png",
    },
  ],
  "regtest": [
    {
      assetId: "rBCH:native",
      ticker: "rBCH",
      name: "Bitcoin Cash Regtest",
      icon: "/bch.svg",
    },
    {
      assetId: "rXMR:native",
      ticker: "rXMR",
      name: "Monero Regtest",
      icon: "/xmr.png",
    },
  ],
}

export const AssetMap = Object.fromEntries(Object.values(Assets).flat().map((asset) => [asset.assetId, asset]));

export const findAssetById = (assetId: string) => {
  for (const assets of Object.values(Assets)) {
    const asset = assets.find((asset) => asset.assetId === assetId);
    if (asset) {
      return asset;
    }
  }
}
export const Endpoints: Record<string, Record<string, string[]>> = {
  "mainnet": {
    "monero": ["https://xmr.salami.network", "https://xmr.bunkerlab.net", "https://dewitte.fiatfaucet.com", "https://xmr.bad.mn"],
    "bch": ["wss://electrum.imaginary.cash:50004"],
  },
  "testnet": {
    "monero": ["https://testnet.xmr.ditatompel.com"],
    "bch": ["wss://chipnet.bch.ninja:50004"],
  },
  "regtest": {
    "monero": ["http://localhost:28081"],
    "bch": ["ws://localhost:60003"],
  },
};

export const getAssetNetwork = (assetId: string) => {
  switch (assetId[0]) {
    case "r":
      return "regtest";
    case "t":
      return "testnet";
    default:
      return "mainnet";
  }
}

export const SetDefaultMoneroRpcEndpoint = (network: string, endpoint: string): void => {
  localStorage.setItem(`DefaultMoneroRpcEndpoint-${network}`, endpoint);
}

export const SetDefaultBchRpcEndpoint = (network: string, endpoint: string): void => {
  localStorage.setItem(`DefaultBchRpcEndpoint-${network}`, endpoint);
}

export const GetDefaultMoneroRpcEndpoint = (network: string): string => {
  return localStorage.getItem(`DefaultMoneroRpcEndpoint-${network}`) || Endpoints[network].monero[0];
}

export const GetDefaultBchRpcEndpoint = (network: string): string => {
  return localStorage.getItem(`DefaultBchRpcEndpoint-${network}`) || Endpoints[network].bch[0];
}

export const SetPreviousMoneroReceivingAddress = (network: string, address: string): void => {
  localStorage.setItem(`PreviousMoneroReceivingAddress-${network}`, address);
}

export const SetPreviousBchReceivingAddress = (network: string, address: string): void => {
  localStorage.setItem(`PreviousBchReceivingAddress-${network}`, address);
}

export const GetPreviousMoneroReceivingAddress = (network: string): string => {
  return localStorage.getItem(`PreviousMoneroReceivingAddress-${network}`) || "";
}

export const GetPreviousBchReceivingAddress = (network: string): string => {
  return localStorage.getItem(`PreviousBchReceivingAddress-${network}`) || "";
}

export const SetPreviousMoneroRefundAddress = (network: string, address: string): void => {
  localStorage.setItem(`PreviousMoneroRefundAddress-${network}`, address);
}

export const SetPreviousBchRefundAddress = (network: string, address: string): void => {
  localStorage.setItem(`PreviousBchRefundAddress-${network}`, address);
}

export const GetPreviousMoneroRefundAddress = (network: string): string => {
  return localStorage.getItem(`PreviousMoneroRefundAddress-${network}`) || "";
}

export const GetPreviousBchRefundAddress = (network: string): string => {
  return localStorage.getItem(`PreviousBchRefundAddress-${network}`) || "";
}

export const getAssetDecimals = (assetId: string) => {
  if (assetId.includes("BCH")) {
    return 8;
  } else if (assetId.includes("XMR")) {
    return 12;
  } else {
    return 0;
  }
}

export const getAssetTicker = (assetId: string) => {
  return assetId.split(":")[0];
}

export const getAssetShortName = (assetId: string) => {
  if (assetId.includes("BCH")) {
    return "BCH";
  } else if (assetId.includes("XMR")) {
    return "XMR";
  } else {
    return "Unknown";
  }
}

export const getAssetName = (assetId: string) => {
  if (assetId.includes("BCH")) {
    return "BitcoinCash";
  } else if (assetId.includes("XMR")) {
    return "Monero";
  } else {
    return "Unknown";
  }
}

export const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const getAssetNameWithNetwork = (assetId: string) => {
  const network = getAssetNetwork(assetId);
  return `${getAssetName(assetId)} ${capitalize(network)}`;
}

export const getAssetIcon = (assetId: string) => {
  const asset = findAssetById(assetId);
  return asset?.icon;
}

export const getAssetAmount = (amount: bigint, assetId: string) => {
  const decimals = getAssetDecimals(assetId);
  return Number((Number(amount) / 10 ** decimals).toFixed(decimals));
}

export const StateNames: Record<string, string> = {
  abandoned: "Abandoned",
  exec: "Waiting",
  checkConnectivity: "Check connectivity",
  init: "Initialization",
  awaitBobInfo: "Waiting for counterparty info",
  sendAliceInfo: "Sending swap info",
  awaitBchSwaplockConfirmations: "Waiting for BCH swaplock confirmations",
  prepareXmrSwaplock: "Preparing XMR swaplock",
  fundXmrSwaplock: "Waiting for you to fund XMR swaplock",
  awaitAdaptorSignature: "Waiting for adaptor signature",
  validateAdaptorSignature: "Validating adaptor signature",
  spendFromBchSwaplock: "Spending from BCH swaplock",
  success: "Success",
  awaitXmrRefundOrRecoverBch: "Waiting for XMR refund or BCH recovery",
  refundXmr: "Refunding XMR",
  sendBobInfo: "Sending swap info",
  awaitAliceInfo: "Waiting for counterparty info",
  prepareBchSwaplock: "Preparing BCH swaplock",
  awaitBchSwaplockDeposit: "Waiting for BCH swaplock deposit",
  fundBchSwaplock: "Waiting for you to deposit BCH to swaplock contract",
  awaitXmrSwaplockDeposit: "Waiting for XMR swaplock deposit",
  awaitXmrSwaplockConfirmations: "Waiting for XMR swaplock confirmations",
  sendAdaptorSignature: "Sending adaptor signature",
  awaitBchContractSpend: "Waiting for BCH contract spend",
  awaitRestXmrSwaplockConfirmations: "Waiting for remaining XMR swaplock confirmations",
  sendToXmrReceivingAddress: "Sending to XMR receiving address",
  initiateBchRefund: "Initiating BCH refund",
  bchRefundComplete: "Completing BCH refund",
  recoverXmrFromAliceMercy: "Recovering XMR from Alice's mercy",
}

export const Orderbooks = [
  { asset: 'BCH:native', targetAsset: 'XMR:native' },
  { asset: 'XMR:native', targetAsset: 'BCH:native' },
  { asset: 'tBCH:native', targetAsset: 'tXMR:native' },
  { asset: 'tXMR:native', targetAsset: 'tBCH:native' },
  { asset: 'rBCH:native', targetAsset: 'rXMR:native' },
  { asset: 'rXMR:native', targetAsset: 'rBCH:native' },
];

export const OrderbookPairs = [
  { asset: 'BCH:native', targetAsset: 'XMR:native' },
  { asset: 'tBCH:native', targetAsset: 'tXMR:native' },
  { asset: 'rBCH:native', targetAsset: 'rXMR:native' },
];