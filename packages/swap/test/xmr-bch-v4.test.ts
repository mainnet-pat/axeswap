import { ElectrumCluster } from 'electrum-cash';
import { getRandomMoneroPrivKey, getDleqProof,
  makeAdaptorSignature, recoverPrivateKey, decryptSignature, toBitcoinPrivKey,
  getMoneroPubKey,
  getBitcoinPubKey,
  verifyDleqProof,
  getMoneroAddress,
  addMoneroPubKeys,
  addMoneroPrivKeys,
  toMoneroPrivKey
} from "dleq-tools";
import { Contract, Network, ElectrumNetworkProvider } from "cashscript";
import { compileFile } from "cashc";
import { MoneroWalletFull } from "monero-ts";
import { hexToBin, binToHex, sha256, decodeTransaction, decodeAuthenticationInstructions, AuthenticationInstruction, AuthenticationInstructionPush, secp256k1 } from "@bitauth/libauth";
import { createOrOpenWallet, createOrOpenWalletFromKeys, getRegtestFundingWallet, mineBlocks, syncWallet } from "../src/monerod";
import { RegTestWallet } from "mainnet-js";
import fs from "fs";
import { mineBchBlocks } from './bitcoind';
import { getLockingBytecode } from "../src/utils";

const FUNDING_ADDRESS="bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0"
const FUNDING_ID="wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"

const bchFundingWallet = await RegTestWallet.fromId(FUNDING_ID);
const moneroFundingWallet = await getRegtestFundingWallet();

beforeAll(async () => {
  await mineBlocks("48k1L1kd5fQiAAKNmVeyGzJtrTt8j1Qhr9tsMzgtdBbQYzZDQRn6yrv4YQ4561J3SDiek6yN1RweScNoAF9VHwavAGT8rCU", 20);
});

beforeEach(async () => {
  fs.readdirSync("data").forEach((file) => {
    if (file !== ".gitkieep" && !file.includes("funding")) {
      fs.rmSync(`data/${file}`);
    }
  });
});

// Alice has XMR, wants BCH.
// Bob has BCH, wants XMR.
describe.skip(`XMR-BCH Swap`, () => {
  test("happy path", async () => {
    // prepare Alice's Monero wallet
    let moneroAlice = await createOrOpenWallet({
      path: "data/alice",
      networkType: "testnet",
      server: "http://localhost:28081",
    }) as MoneroWalletFull;

    // fund Alice's Monero wallet
    await moneroFundingWallet.createTx({
      accountIndex: 0,
      address: await moneroAlice.getPrimaryAddress(),
      amount: BigInt(1e12),
      relay: true
    });

    // Make Alice's balance spendable by fast-forwarding 10 blocks
    await mineBlocks(await moneroFundingWallet.getPrimaryAddress(), 10);
    moneroAlice = await syncWallet(moneroAlice);
    expect(await moneroAlice.getBalance()).toBe(BigInt(1e12));

    // prepare Bob's Monero wallet
    let moneroBob = await createOrOpenWallet({
      path: "data/bob",
      networkType: "testnet",
      server: "http://localhost:28081",
    }) as MoneroWalletFull;

    // prepare Alice's BCH wallet
    const bchAlice = await RegTestWallet.newRandom();

    // prepare Bob's BCH wallet
    const bchBob = await RegTestWallet.newRandom();
    await bchFundingWallet.send([[bchBob.cashaddr!, 1e8, "sat"]]);
    expect(await bchBob.getBalance("sat")).toBe(1e8);

    // Alice and Bob generate their one-time monero private view and spend keys
    const aViewMonero = getRandomMoneroPrivKey();
    const bViewMonero = getRandomMoneroPrivKey();
    const aSpendMonero = getRandomMoneroPrivKey();
    const bSpendMonero = getRandomMoneroPrivKey();

    // Alice and Bob get their one-time monero public view and spend keys
    const aPubViewMonero = getMoneroPubKey(aViewMonero);
    const bPubViewMonero = getMoneroPubKey(bViewMonero);
    const aPubSpendMonero = getMoneroPubKey(aSpendMonero);
    const bPubSpendMonero = getMoneroPubKey(bSpendMonero);

    // Alice and Bob get their one-time bitcoin private keys from their monero private keys
    const aBitcoin = toBitcoinPrivKey(aSpendMonero);
    const bBitcoin = toBitcoinPrivKey(bSpendMonero);

    // Alice and Bob generate their one-time monero public keys
    const aPubBitcoin = getBitcoinPubKey(aBitcoin);
    const bPubBitcoin = getBitcoinPubKey(bBitcoin);

    // Alice generates her proof
    const aProof = getDleqProof(aSpendMonero);

    // Bob receives Alice's PubKeys and verifies Alice's proof
    expect(verifyDleqProof(aProof)).toBe(true);
    expect(aPubSpendMonero).toBe(aProof.moneroPubKey);
    expect(aPubBitcoin).toBe(aProof.bitcoinPubKey);

    // Bob generates his proof
    const bProof = getDleqProof(bSpendMonero);

    // Alice receives Bob's PubKeys and verifies Bob's proof
    expect(verifyDleqProof(bProof)).toBe(true);
    expect(bPubSpendMonero).toBe(bProof.moneroPubKey);
    expect(bPubBitcoin).toBe(bProof.bitcoinPubKey);

    // Alice and Bob will work with the same message digest
    const digest = binToHex(sha256.hash(getLockingBytecode(bchAlice.publicKeyHash!)));

    // https://gitlab.com/0353F40E/cross-chain-swap-ves/-/blob/dfc96dbad839d2021b8910af85e66f0c775427c6/contracts/v4-XMR/swaplock.cash#
    // Bob locks his BCH in a smart contract, which requires Alice to submit Bob's signature on the agreed digest
    const artifact = compileFile("../contracts/swaplockV4.cash");
    const cluster = new ElectrumCluster("Swap", "1.5", 1, 1);
    await cluster.addServer('localhost', 60003, "ws", false);
    const swapLockContract = new Contract(artifact, [
      1000n,
      getLockingBytecode(bchAlice.publicKeyHash!),
      bPubBitcoin,
      10n,
      getLockingBytecode(bchBob.publicKeyHash!),
    ], { provider: new ElectrumNetworkProvider(Network.REGTEST, cluster) });
    const { txId } =  await bchBob.send([[swapLockContract.address, 1e7, "sat"]]);

    // Alice observes the contract creation transaction
    const fundingTx = await bchAlice.provider!.getRawTransaction(txId!, true);
    expect(fundingTx).toBeDefined();
    // TODO: Alice recreates the contract and validates that the contract address matches the expected address

    // Alice sends her XMR to an address with Public view and spend keys A+B = Alice public view key + Bob public view key, from which she can not spend
    const pubKeyLockSpend = addMoneroPubKeys(aPubSpendMonero, bPubSpendMonero);
    const pubKeyLockView = addMoneroPubKeys(aPubViewMonero, bPubViewMonero);
    const xmrLockAddress = getMoneroAddress("testnet", pubKeyLockSpend, pubKeyLockView);

    const xmrLockWallet = await createOrOpenWalletFromKeys({
      address: xmrLockAddress,
      path: "data/xmrlock",
      privateViewKey: addMoneroPrivKeys(aViewMonero, bViewMonero),
      networkType: "testnet",
      server: "http://localhost:28081",
    });

    const xmrLockTx = await moneroAlice.createTx({
      accountIndex: 0,
      address: xmrLockAddress,
      amount: BigInt(8e11),
      relay: true,
    });
    moneroAlice = await syncWallet(moneroAlice);

    // Alice creates the payment proof and sends it to Bob
    const lockTxKey = await moneroAlice.getTxKey(xmrLockTx.hash);

    // Bob verifies that the XMR has been locked
    const check = await moneroBob.checkTxKey(xmrLockTx.hash, lockTxKey, xmrLockAddress);
    expect(check.getNumConfirmations()).toBe(0);


    // Bob creates an encrypted adaptor signature and transmits it to Alice
    const encsig = makeAdaptorSignature(bBitcoin, aPubBitcoin, digest);

    // Alice decrypts the adaptor signature
    const sig = decryptSignature(aBitcoin, encsig);

    // Alice spends the contract to herself and reveals sig to Bob
    const derSig = secp256k1.signatureCompactToDER(hexToBin(sig));
    if (typeof derSig === "string") {
      throw derSig;
    }

    // Alice claims the BCH to her wallet
    await swapLockContract.functions.SwapOrForwardToRefund(derSig).to(bchAlice.cashaddr!, BigInt(1e7 - 1000)).withoutChange().withAge(0).send();

    // Bob observes Alice's transaction
    const aliceBchWatchWallet = await RegTestWallet.watchOnly(bchAlice.cashaddr!);
    const aliceTransactions = await aliceBchWatchWallet.getRawHistory();
    const aliceSwaplockSpendTx = await aliceBchWatchWallet.provider!.getRawTransaction(aliceTransactions[0].tx_hash);
    const transaction = decodeTransaction(hexToBin(aliceSwaplockSpendTx));
    if (typeof transaction === "string") {
      throw transaction;
    }

    const inputBytecode = transaction.inputs[0].unlockingBytecode;
    const instructions = decodeAuthenticationInstructions(inputBytecode) as AuthenticationInstruction[];

    const aliceSigDer = (instructions[0] as AuthenticationInstructionPush)?.data;
    if (aliceSigDer?.length < 70 || aliceSigDer?.length > 73) {
      throw "Wrong tx";
    }

    const aliceSigCompact = secp256k1.signatureDERToCompact(aliceSigDer);
    if (typeof aliceSigCompact === "string") {
      throw aliceSigCompact;
    }

    // Bob observes the transaction, extracts the signature and recovers the Alice's private key
    const recovered = recoverPrivateKey(aPubBitcoin, binToHex(aliceSigCompact), encsig);
    expect(recovered).toBe(aBitcoin);
    const aSpendMoneroRecovered = toMoneroPrivKey(recovered);

    mineBlocks(await moneroFundingWallet.getPrimaryAddress(), 10);
    moneroBob = await syncWallet(moneroBob);

    const finalCheck = await moneroBob.checkTxKey(xmrLockTx.hash, lockTxKey, xmrLockAddress);
    expect(finalCheck.getNumConfirmations()).toBe(10);

    // Bob waits for the XMR to become spendable after 10 confirmations
    await xmrLockWallet.sync();
    expect(await xmrLockWallet.getBalance()).toBe(BigInt(8e11));

    // Bob reconstructs the Monero wallet with all keys
    const xmrLockSpendWallet = await createOrOpenWalletFromKeys({
      address: xmrLockAddress,
      path: "data/xmrlockspend",
      privateViewKey: addMoneroPrivKeys(aViewMonero, bViewMonero),
      privateSpendKey: addMoneroPrivKeys(aSpendMoneroRecovered, bSpendMonero),
      networkType: "testnet",
      server: "http://localhost:28081",
    });
    await xmrLockSpendWallet.sync();

    // Bob spends the XMR to himself
    await xmrLockSpendWallet.sweepUnlocked({
      address: await moneroBob.getPrimaryAddress(),
      relay: true,
    });
    await moneroBob.sync();

    expect(await moneroBob.getBalance()).toBe(BigInt(7.98e11));
  });

  test("refund path, Alice does not attend the trade", async () => {
    // prepare Alice's BCH wallet
    const bchAlice = await RegTestWallet.newRandom();

    // prepare Bob's BCH wallet
    const bchBob = await RegTestWallet.newRandom();
    await bchFundingWallet.send([[bchBob.cashaddr!, 1e8, "sat"]]);
    expect(await bchBob.getBalance("sat")).toBe(1e8);

    // https://gitlab.com/0353F40E/cross-chain-swap-ves/-/blob/dfc96dbad839d2021b8910af85e66f0c775427c6/contracts/v4-XMR/swaplock.cash#
    // Bob locks his BCH in a smart contract, which requires Alice to submit Bob's signature on the agreed digest
    const artifact = compileFile("../contracts/swaplockV4.cash");
    const cluster = new ElectrumCluster("Swap", "1.5", 1, 1);
    await cluster.addServer('localhost', 60003, "ws", false);
    const swapLockContract = new Contract(artifact, [
      1000n,
      getLockingBytecode(bchAlice.publicKeyHash!),
      bchBob.publicKeyCompressed!,
      10n,
      getLockingBytecode(bchBob.publicKeyHash!),
    ], { provider: new ElectrumNetworkProvider(Network.REGTEST, cluster) });
    await bchBob.send([[swapLockContract.address, 1e7, "sat"]]);

    // Alice goes missing, bob waits for 10 blocks
    await mineBchBlocks(bchFundingWallet.cashaddr!, 10);

    const bchHeight = await bchBob.provider!.getBlockHeight();

    const balanceBefore = await bchBob.getBalance("sat") as number;

    // Bob reclaims the BCH to his wallet
    await swapLockContract.functions.SwapOrForwardToRefund("").to(bchBob.cashaddr!, BigInt(1e7 - 1000)).withoutChange().withAge(10).withTime(bchHeight).send();

    const balanceAfter = await bchBob.getBalance("sat") as number;
    expect(balanceAfter).toBe(balanceBefore + 1e7 - 1000);
  });
});
