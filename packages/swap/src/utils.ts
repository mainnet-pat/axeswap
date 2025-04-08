import { AuthenticationInstruction, AuthenticationInstructionPush, LockingBytecodeType, addressContentsToLockingBytecode, bigIntToVmNumber, binToHex, binToUtf8, decodeAuthenticationInstructions, decodeCashAddress, decodeTransaction, hexToBin, secp256k1 } from "@bitauth/libauth";
import artifact from "../artifacts/swaplockV4.1.json";
import artifactCashtokens from "../artifacts/swaplockV4.1.cashtokens.json";
import { ConstructorArgument, Artifact, Contract, ContractOptions } from "cashscript";
import { getNetworkProvider, RegTestWallet, TestNetWallet, UtxoI, Wallet } from "mainnet-js";
import { ElectrumCluster, TransportScheme } from 'electrum-cash';
import { ElectrumNetworkProvider, Network } from 'cashscript';
import moneroTs, { MoneroWalletFull } from "monero-ts";
import { getHeight } from "./monerod";

export const getLockingBytecode = (pubkeyHash: Uint8Array) => {
  return Uint8Array.from([...hexToBin("76a914"), ...pubkeyHash, ...hexToBin("88ac")]);
}

export const getLockingBytecodeFromCashaddr = (cashaddr: string) => {
  const decoded = decodeCashAddress(cashaddr);
  if (typeof decoded === "string") {
    throw new Error("Invalid cashaddr");
  }
  return Uint8Array.from([...hexToBin("76a914"), ...decoded.payload, ...hexToBin("88ac")]);
}

export const getSwapLockArtifact = (parameters: Record<string, string | bigint>) => {
  const artifactCopy = {...artifact};
  Object.entries(parameters).forEach(([key, value]) => {
    artifactCopy.bytecode = artifactCopy.bytecode.replace(`<${key}>`, typeof value === "bigint" ?
     (value === 0n ? "00" : binToHex(bigIntToVmNumber(value)))
     : value);
  });

  return artifactCopy as unknown as Artifact;
};

export const getSwapLockArtifactCashtokens = (parameters: Record<string, string | bigint>) => {
  const artifactCopy = {...artifactCashtokens};
  Object.entries(parameters).forEach(([key, value]) => {
    artifactCopy.bytecode = artifactCopy.bytecode.replace(`<${key}>`, typeof value === "bigint" ?
     (value === 0n ? "00" : binToHex(bigIntToVmNumber(value)))
     : value);
  });

  return artifactCopy as unknown as Artifact;
};

/// This utility creates a normal cashscript contract but makes no use of function index
export const getSwapLockContract = (artifact: Artifact, constructorArgs: ConstructorArgument[], options?: any | undefined): Contract => {
  options = options || {};
  options.ignoreSelector = true;
  const contract = new Contract(artifact, constructorArgs, {...options, addressType: "p2sh32"} as ContractOptions);
  return contract;
}

// Checks connectivity to BCH network and returns a block height
export const checkBchConnectivity = async (electrumHost: string, network: string): Promise<number> => {
  const cluster = new ElectrumCluster("Swap", "1.5", 1, 1);
  const connectionParams = explodeUri(electrumHost);
  await cluster.addServer(...connectionParams, false);
  const provider = new ElectrumNetworkProvider(network as Network, cluster, false);
  const blockNumber = await provider.getBlockHeight();
  return blockNumber;
}

export const checkXmrConnectivity = async (xmrHost: string): Promise<number> => {
  return await getHeight(xmrHost);
}

export const explodeUri = (uri: string): [string, number, TransportScheme] => {
  const url = new URL(uri);
  return [url.hostname, Number(url.port), url.protocol.split(":")[0] as TransportScheme];
}

export const getContractPair = async (state: {
  bchRpc: string;
  bchNetwork: string;
  miningFee: bigint;
  aBchReceivingAddress: string;
  aPubBitcoin: string;
  timelock1: number;
  timelock2: number;
  bPubBitcoin: string;
  bBchRefundAddress: string;
}, connect: boolean = true): Promise<{
  refundContract: Contract;
  swapLockContract: Contract;
}> => {
    // Bob locks his BCH in a smart contract, which requires Alice to submit Bob's signature on the agreed digest
    const cluster = new ElectrumCluster("Swap", "1.5", 1, 1);
    const connectionParams = explodeUri(state.bchRpc);
    await cluster.addServer(...connectionParams, connect);
    const provider = new ElectrumNetworkProvider(state.bchNetwork as Network, cluster, !connect);

    const refundArtifact = getSwapLockArtifact({
      mining_fee: BigInt(state.miningFee),
      out_1: binToHex(getLockingBytecodeFromCashaddr(state.bBchRefundAddress)),
      public_key: state.aPubBitcoin,
      timelock: BigInt(state.timelock2),
      out_2: binToHex(getLockingBytecodeFromCashaddr(state.aBchReceivingAddress)),
    });
    const refundContract = getSwapLockContract(refundArtifact, [], { provider });
    const refundLockingBytecode = decodeCashAddress(refundContract.address);
    if (typeof refundLockingBytecode === "string") {
      throw refundLockingBytecode;
    }

    const artifact = getSwapLockArtifact({
      mining_fee: BigInt(state.miningFee),
      out_1: binToHex(getLockingBytecodeFromCashaddr(state.aBchReceivingAddress)),
      public_key: state.bPubBitcoin,
      timelock: BigInt(state.timelock1),
      out_2: binToHex(addressContentsToLockingBytecode({ payload: refundLockingBytecode.payload, type: LockingBytecodeType.p2sh32 })),
    });

    const swapLockContract = getSwapLockContract(artifact, [], { provider });

    return { refundContract, swapLockContract };
}

export const WalletTypeFromAddress = (address: string): typeof Wallet | typeof TestNetWallet | typeof RegTestWallet => {
  if (address.startsWith("bitcoincash:")) {
    return Wallet;
  } else if (address.startsWith("bchtest:")) {
    return TestNetWallet;
  } else if (address.startsWith("bchreg:")) {
    return RegTestWallet;
  } else {
    throw new Error("Unknown address format");
  }
}

// This utility waits for a transaction to have a certain number of confirmations
// and returns the txid
export const waitForBchConfirmations = async (address: string, totalAmount: bigint, requiredConfirmations: number, updateCallback?: (confirmations: number, requiredConfirmations: number) => void, bchRpc?: string): Promise<string> => {
  const WalletType = WalletTypeFromAddress(address);
  const wallet = await WalletType.watchOnly(address);
  if (bchRpc) {
    wallet.provider = getNetworkProvider(undefined, bchRpc, false) as any;
  }

  let seenConfirmations = -1;
  while (true) {
    const blockHeight = await wallet.provider!.getBlockHeight();
    const history = await wallet.provider!.getHistory(address);

    // getRawTransactionObject will get cached
    const transactions = await Promise.all(history.map(async (tx) => ({...await wallet.provider!.getRawTransactionObject(tx.tx_hash), height: tx.height})));
    if (transactions.length > 0 ) {
      const transaction = transactions.find((tx) =>
        tx.vout.filter(vout => vout.scriptPubKey.addresses[0] === address).reduce((prev, curr) => prev + curr.value * 1e8, 0) >= totalAmount
      );

      if (transaction) {
        const gotConfirmations = transaction.height <= 0 ? 0 : (Math.max(0, blockHeight - transaction.height) + 1);
        if (updateCallback) {
          if (seenConfirmations !== gotConfirmations) {
            seenConfirmations = gotConfirmations;
            updateCallback(gotConfirmations, requiredConfirmations);
          }
        }

        if (gotConfirmations >= requiredConfirmations || gotConfirmations >= 10) {
          return transaction.txid;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
};

// This utility waits for a contract to be spent and returns the extracted signature
export const waitForContractSpend = async (address: string, unlockingBytecode: string, bchRpc: string): Promise<string> => {
  const WalletType = WalletTypeFromAddress(address);
  const wallet = await WalletType.watchOnly(address);
  if (bchRpc) {
    wallet.provider = getNetworkProvider(undefined, bchRpc, false) as any;
  }

  const lookupSpendingTransaction = async (): Promise<string | undefined> => {
    const transactions = (await wallet.getRawHistory()).sort((a, b) =>
      a.height <= 0 || b.height <= 0 ? -1 : b.height - a.height
    );

    if (!transactions.length) {
      return;
    }

    const spendTransaction = await wallet.provider!.getRawTransaction(transactions[0].tx_hash);
    return matchSwaplockTransaction(spendTransaction, unlockingBytecode);
  }

  const sigCandidate = await lookupSpendingTransaction();
  if (sigCandidate) {
    return sigCandidate;
  }

  const sig: string = await new Promise((resolve, reject) => {
    const cancel = wallet.provider!.watchAddressStatus(wallet.address!, async (status) => {
      const sigCandidate = await lookupSpendingTransaction();
      if (sigCandidate) {
        await cancel();
        resolve(sigCandidate);
      }
    });
  });

  return sig;
}

/* This utility waits for a contract to be spent and returns the extracted signature
 * @param address - the address of the contract
 * @returns extracted VES signature or undefined if the contract is not matched
 */
export const matchSwaplockTransaction = (txHex: string, unlockingBytecode: string): string | undefined => {
  const transaction = decodeTransaction(hexToBin(txHex));
  if (typeof transaction === "string") {
    throw transaction;
  }

  if (transaction.inputs.length !== 1 && transaction.outputs.length !== 1) {
    return;
  }

  const inputBytecode = transaction.inputs[0].unlockingBytecode;
  const instructions = decodeAuthenticationInstructions(inputBytecode) as AuthenticationInstruction[];

  // do not allow any other instructions
  if (instructions.length !== 2) {
    return;
  }

  // exact v4.1 bytecode contract match
  const bytecode = (instructions[1] as AuthenticationInstructionPush)?.data;
  if (binToHex(bytecode) !== unlockingBytecode) {
    return;
  }

  const sigDer = (instructions[0] as AuthenticationInstructionPush)?.data;
  if (sigDer?.length < 70 || sigDer?.length > 73) {
    return;
  }

  const sigCompact = secp256k1.signatureDERToCompact(sigDer);
  if (typeof sigCompact === "string") {
    return;
  }

  return binToHex(sigCompact);
}

// waits for a certain amount of confirmations or until balance is unlocked
export const waitForXmrConfirmations = async (wallet: MoneroWalletFull, totalAmount: bigint, requiredConfirmations: number, updateCallback?: (confirmations: number, requiredConfirmations: number) => void): Promise<void> => {
  let seenConfirmations = -1;
  while (true) {
    await wallet.sync();
    const transactions = await wallet.getTxs();
    if (transactions.length > 0 ) {
      const transaction = transactions.find((tx) =>
        tx.incomingTransfers.reduce((prev, curr) => prev + curr.amount, 0n) >= totalAmount
      );

      const gotConfirmations = transaction?.numConfirmations ?? 0;
      if (updateCallback) {
        if (seenConfirmations !== gotConfirmations) {
          seenConfirmations = gotConfirmations;
          updateCallback(gotConfirmations, requiredConfirmations);
        }
      }

      if (gotConfirmations >= requiredConfirmations || gotConfirmations >= 10) {
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

export const withTimeout = async <T>(promise: Promise<T>, timeout: number = 5000): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout"));
    }, timeout);

    promise.then((val) => {
      clearTimeout(timer);
      resolve(val);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export const toDerSignature = async (compactSignature: string): Promise<string> => {
  const derSig = secp256k1.signatureCompactToDER(hexToBin(compactSignature));
  if (typeof derSig === "string") {
    throw derSig;
  }

  return binToHex(derSig);
}

export const toCompactSignature = async (derSignature: string): Promise<string> => {
  const compactSig = secp256k1.signatureDERToCompact(hexToBin(derSignature));
  if (typeof compactSig === "string") {
    throw compactSig;
  }

  return binToHex(compactSig);
}

export const extractPrivKeyFromAliceMercy = async (bobRefundAddress: string, bchRpc: string): Promise<string> => {
  const WalletType = WalletTypeFromAddress(bobRefundAddress);
  const wallet = await WalletType.watchOnly(bobRefundAddress);
  if (bchRpc) {
    wallet.provider = getNetworkProvider(undefined, bchRpc, false) as any;
  }

  let result = "";

  const utxos = (await wallet.getUtxos()).filter(utxo => utxo.satoshis === 546).sort((a, b) =>
    a.height! <= 0 || b.height! <= 0 ? -1 : b.height! - a.height!
  );
  const txSeen: Record<string, boolean> = {};
  for (const utxo of utxos) {
    if (txSeen[utxo.txid] === true) {
      continue;
    }
    const txHex = await wallet.provider!.getRawTransaction(utxo.txid);
    txSeen[utxo.txid] = true;

    const transaction = decodeTransaction(hexToBin(txHex));
    if (typeof transaction === "string") {
      continue;
    }

    if (transaction.outputs.length !== 2 && transaction.outputs[0].valueSatoshis !== 0n && transaction.outputs[1].valueSatoshis !== 546n) {
      continue;
    }

    const instructions = decodeAuthenticationInstructions(transaction.outputs[0].lockingBytecode) as AuthenticationInstructionPush[];
    if (instructions.length !== 3 && binToUtf8(instructions[1].data) !== "XBSW") {
      continue;
    }

    result = binToHex(instructions[2].data);
    break;
  }

  return result;
}

export const assetIdToNetwork = (assetId: string): string => {
  if (assetId.includes("XMR")) {
    if (["r", "t"].includes(assetId[0])) {
      return "testnet";
    }
    return "mainnet";
  } else {
    switch (assetId[0]) {
      case "t":
        return "chipnet";
      case "r":
        return "regtest";
      default:
        return "mainnet";
    }
  }
}

const networkPrefixMap = {
  bitcoincash: "mainnet",
  bchtest: "testnet",
  bchreg: "regtest",
};

export const validateBchAddress = (address: string, network: string): string | undefined => {
  // BCH Address
  const decoded = decodeCashAddress(address);
  if (typeof decoded === "string") {
    return "Invalid BCH address"
  }

  if (network !== networkPrefixMap[decoded.prefix as keyof typeof networkPrefixMap]) {
    return `Invalid ${network} BCH address`;
  }
}

export const validateXmrAddress = async (address: string, network: string): Promise<string | undefined> => {
  // XMR address
  const valid = await moneroTs.MoneroUtils.isValidAddress(address, network === "mainnet" ? moneroTs.MoneroNetworkType.MAINNET : moneroTs.MoneroNetworkType.TESTNET);
  if (!valid) {
    return `Invalid ${network} XMR address`;
  }
}

export const validateAddress = async (address: string, network: string): Promise<string | undefined> => {
  // BCH Address
  if (address.indexOf(":") > 0) {
    return validateBchAddress(address, network);
  }

  return validateXmrAddress(address, network);
}