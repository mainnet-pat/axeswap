import { MoneroNetworkType, MoneroWalletFull, MoneroWalletListener, createWalletFull, openWalletFull } from "monero-ts";

export const mineXmrBlocks = async (address: string, blocks: number = 1): Promise<any> => {
  const response = await fetch("http://localhost:28081/json_rpc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "0",
      method: "generateblocks",
      params: {
        "amount_of_blocks": blocks,
        "wallet_address": address,
        "starting_nonce": 0,
      },
    }),
  });
  const json = await response.json();

  return json;
}

export const getHeight = async (xmrHost: string = "http://localhost:28081"): Promise<number> => {
  const response = await fetch(`${xmrHost}/json_rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "0",
      method: "get_block_count",
    }),
  });
  const json = await response.json();

  return json.result.count;
}

export const getInfo = async (): Promise<any> => {
  const response = await fetch("http://localhost:28081/json_rpc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "0",
      method: "get_info",
      params: {
      },
    }),
  });
  const json = await response.json();

  return json;
}

export const syncWallet = async (wallet: MoneroWalletFull): Promise<MoneroWalletFull> => {
  const path = await wallet.getPath();
  const networkType = await wallet.getNetworkType();
  const uri = (await wallet.getDaemonConnection()).getUri();
  await wallet.save();
  await wallet.close();
  wallet = await openWalletFull({
    path: path,
    networkType: networkType,
    server: uri,
  }) as MoneroWalletFull;
  await wallet.sync();
  return wallet;
}

export const createOrOpenWallet = async ({
  seed,
  path,
  server,
  networkType,
  restoreHeight,
}: {
  seed?: string;
  path?: string;
  server: string;
  networkType: "mainnet" | "testnet" | "stagenet" | string;
  restoreHeight?: number,
}): Promise<MoneroWalletFull> => {
  let wallet: MoneroWalletFull;
  try {
    wallet = await createWalletFull({
      path: path || "",
      networkType: MoneroNetworkType.parse(networkType || "testnet"),
      server: server,
      seed: seed,
      restoreHeight: restoreHeight ?? (path && seed ? 150 : undefined),
      // fs: fs
    }) as MoneroWalletFull;
  } catch (e) {
    wallet = await openWalletFull({
      path: path || "",
      networkType: MoneroNetworkType.parse(networkType || "testnet"),
      server: server,
      // fs: fs,
    }) as MoneroWalletFull;
  }

  return wallet;
}

export const createOrOpenWalletFromKeys = async ({
  address,
  privateViewKey,
  privateSpendKey,
  path,
  server,
  networkType,
  restoreHeight,
}: {
  address: string,
  privateViewKey: string,
  privateSpendKey?: string,
  path?: string;
  server: string;
  networkType?: "mainnet" | "testnet" | "stagenet";
  restoreHeight?: number;
}): Promise<MoneroWalletFull> => {
  let wallet: MoneroWalletFull;
  try {
    wallet = await createWalletFull({
      primaryAddress: address,
      path: path || "",
      networkType: MoneroNetworkType.parse(networkType || "testnet"),
      server: server,
      privateViewKey: privateViewKey,
      privateSpendKey: privateSpendKey,
      restoreHeight: restoreHeight,
    }) as MoneroWalletFull;
  } catch (e) {
    wallet = await openWalletFull({
      path: path || "",
      networkType: MoneroNetworkType.parse(networkType || "testnet"),
      server: server,
    }) as MoneroWalletFull;
  }

  return wallet;
}

const FundingSeed = "silk mocked cucumber lettuce hope adrenalin aching lush roles fuel revamp baptism wrist long tender teardrop midst pastry pigment equip frying inbound pinched ravine frying";

export const getTestnetFundingWallet = async (config: {
  xmrRpc: string,
  xmrNetwork: string,
}): Promise<MoneroWalletFull> => {
  let fundingWallet: MoneroWalletFull = await createOrOpenWallet({
    seed: FundingSeed,
    path: `data/funding-live-${config.xmrNetwork}`,
    server: config.xmrRpc,
    networkType: config.xmrNetwork,
  });
  const syncedTo = await fundingWallet.getHeight();
  await fundingWallet.sync(new class extends MoneroWalletListener {
    async onSyncProgress(height: number, startHeight: number, endHeight: number, percentDone: number, message: string) {
      // feed a progress bar?
      if (height % 1000 === 0) {
        console.log("Syncing live testnet wallet", height, startHeight, endHeight, percentDone, message);
      }
    }
  }, syncedTo === 1 ? 2448935 : syncedTo);
  await fundingWallet.save();

  if (await fundingWallet.getUnlockedBalance() < BigInt(1e12)) {
    throw new Error("Funding wallet has insufficient balance");
  }

  return fundingWallet;
}


export const getRegtestFundingWallet = async (networkType: any = "testnet"): Promise<MoneroWalletFull> => {
  let fundingWallet: MoneroWalletFull = await createOrOpenWallet({
    seed: FundingSeed,
    path: `data/funding-${networkType}`,
    server: "http://localhost:28081",
    networkType
  });
  await fundingWallet.sync();

  if (await fundingWallet.getUnlockedBalance() === 0n && await fundingWallet.getNetworkType() === MoneroNetworkType.TESTNET) {
    await mineXmrBlocks(await fundingWallet.getPrimaryAddress(), 61);
    fundingWallet = await syncWallet(fundingWallet);
  }

  return fundingWallet;
}
