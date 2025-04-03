import { RegTestWallet } from "mainnet-js";
import { matchSwaplockTransaction, waitForBchConfirmations } from "../src/utils";
import { mineBchBlocks } from "./bitcoind";

const FUNDING_ID="wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
const bchFundingWallet = await RegTestWallet.fromId(FUNDING_ID);

describe(`utils`, () => {
  test("waitForBchConfirmations 0", async () => {
    const wallet = await RegTestWallet.newRandom();
    let txId = "";

    waitForBchConfirmations(wallet.address!, 100n, 0).then(val => txId = val);
    expect(txId).toBe("");
    await bchFundingWallet.send([[wallet.address!, 0.1, "bch" ]]);

    await new Promise(resolve => setTimeout(resolve, 3000));
    expect(txId).not.toBe("");
  });

  test("waitForBchConfirmations 1", async () => {
    const wallet = await RegTestWallet.newRandom();
    let txId = "";

    waitForBchConfirmations(wallet.address!, 100n, 1).then(val => txId = val);
    expect(txId).toBe("");
    await bchFundingWallet.send([[wallet.address!, 0.1, "bch" ]]);
    mineBchBlocks(bchFundingWallet.address!, 1);

    await new Promise(resolve => setTimeout(resolve, 3000));
    expect(txId).not.toBe("");
  });

  test("waitForBchConfirmations 3", async () => {
    const wallet = await RegTestWallet.newRandom();
    let txId = "";
    let seenConfirmations = 0;

    waitForBchConfirmations(wallet.address!, 100n, 3, (confirmations) => seenConfirmations = confirmations).then(val => txId = val);
    expect(txId).toBe("");
    expect(seenConfirmations).toBe(0);
    await bchFundingWallet.send([[wallet.address!, 0.1, "bch" ]]);
    await mineBchBlocks(bchFundingWallet.address!, 1);
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(txId).toBe("");
    expect(seenConfirmations).toBe(1);
    await mineBchBlocks(bchFundingWallet.address!, 1);
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(txId).toBe("");
    expect(seenConfirmations).toBe(2);
    await mineBchBlocks(bchFundingWallet.address!, 1);
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(seenConfirmations).toBe(3);
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(txId).not.toBe("");
  });

  test('matchSwaplockTransaction', async () => {
    // contract spend transaction
    const transaction = "02000000017e0c0978e84ce0122e4d72d1a724e27ce0cbc8b8afa8e7755b4fde5b3153843a00000000c9473045022100f0e8eaddcdc66f6dce7dcf934d49640fd7494bf66344f2cb0f9838ca8d67e0e40220333612cd8dcfaf6b2b073cd53843e499e982b9c7cd419d3ef842fb70e714d6d74c7fc3519dc4519d02bc0200c600cc949d00cb641976a91449abacccb4d4df088483a9fa88555721bfbce73988ac00cd78882102cc20051a51e3fac9534c13f8ad346911f2fd2154c4ffd7a91a2fc763bd65bd82ba6755b27523aa206c44d12d8259882f53959b486a979aa1a91a1567c43168061f213a8a1090dfe78700cd87680000000001843f0f00000000001976a91449abacccb4d4df088483a9fa88555721bfbce73988acce010000";
    const sig = matchSwaplockTransaction(transaction, "c3519dc4519d02bc0200c600cc949d00cb641976a91449abacccb4d4df088483a9fa88555721bfbce73988ac00cd78882102cc20051a51e3fac9534c13f8ad346911f2fd2154c4ffd7a91a2fc763bd65bd82ba6755b27523aa206c44d12d8259882f53959b486a979aa1a91a1567c43168061f213a8a1090dfe78700cd8768");
    expect(sig?.length).toBeGreaterThan(0);
  });

  test('matchSwaplockTransaction', async () => {
    // p2pkh spend transaction
    const transaction = "02000000011442261483af88f5760ed2a018c7abc064611b1d7cc23a83f30f8ea7d7e7826f010000006a47304402202dbbbbbeb148233a7387d31a673343c04d38dfd4f5ed78aee1ac9b62c40b028a02202631448ad16056402de492c4575528855ec10e8df861375b0287582bed6a5467412103050dbf70868175bd87c7a398e60e51f3837d0e432bedb978e6488f402624f505ffffffff0214880108000000001976a9141805ae96adc0079f2b8cd485a659087054a9e99e88ac3990ab26000000001976a91466a415eaf3b0aa63f9c20de14d5d89b78cdaf27f88ac00000000";
    const sig = matchSwaplockTransaction(transaction, "03050dbf70868175bd87c7a398e60e51f3837d0e432bedb978e6488f402624f505");
    expect(sig?.length).toBe(undefined);
  });
});
