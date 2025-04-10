import { binToNumberInt32LE, hexToBin } from "@bitauth/libauth";

const timeout = 30000;
const Cache: { [key: string]: {timestamp: number; response: any} } = {};

export const cachedFetch = async<T>(url: string): Promise<T> => {
  if (Cache[url] && Cache[url].timestamp + timeout > Date.now()) {
    return Cache[url].response as T;
  }

  const response = await fetch(url);
  const data = await response.json() as T;
  Cache[url] = {timestamp: Date.now(), response: data};
  return data;
}

export const getHistoricalPrices = async (asset: string): Promise<any> => {
  const currency = asset.includes("XMR") ? "monero" : "bitcoin-cash";

  const data = await cachedFetch<any>(`https://api.coincap.io/v2/assets/${currency}/history?interval=h1&limit=100`);
  return data.data;
}

export const getCurrentPrice = async (assetId: string): Promise<number> => {
  const currency = assetId.includes("XMR") ? "monero" : "bitcoin-cash";

  const data = await cachedFetch<{data: {priceUsd: number}}>(`https://api.coincap.io/v2/assets/${currency}`);
  return data.data.priceUsd;
}

export const getBchHistoricalPriceFromOracle = async (timestamp: number): Promise<number | undefined> => {
  try {
    const publicKey = '02d09db08af1ff4e8453919cc866a4be427d7bfe18f2c05e5444c196fcf6fd2818';
    const startTimestamp = timestamp - 60;
    const endTimestamp = timestamp;
    const response = await fetch(`https://oracles.generalprotocols.com/api/v1/oracleMessages?publicKey=${publicKey}&count=10&minMessageTimestamp=${startTimestamp}&maxMessageTimestamp=${endTimestamp}`, {
      cache: "force-cache"
    });
    const data = await response.json() as {oracleMessages: {message: string}[]};

    const priceMessage = data.oracleMessages.find((message) => message.message.length === 32)!;
    const price = binToNumberInt32LE(hexToBin(priceMessage.message.slice(24)));

    return price / 100;
  } catch {};
}