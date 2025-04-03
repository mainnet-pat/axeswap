import { binToBase64, utf8ToBin } from "mainnet-js";

export const mineBchBlocks = async (address: string, blocks: number = 1): Promise<any> => {
  const response = await fetch("http://127.0.0.1:18443/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Basic " + binToBase64(utf8ToBin("alice:password")),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "0",
      method: "generatetoaddress",
      params: {
        "nblocks": blocks,
        "address": address,
      },
    }),
  });
  const json = await response.json();

  return json;
}
