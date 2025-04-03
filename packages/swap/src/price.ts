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
