import { OpReturnData, RegTestWallet, SendRequest, TestNetWallet } from "mainnet-js";
import { getContractPair } from "../../src/utils";
import { hexToBin } from "@bitauth/libauth";
import { createOrOpenWallet, createOrOpenWalletFromKeys, getRegtestFundingWallet, getTestnetFundingWallet, mineXmrBlocks as mineXmrBlocks } from "../../src/monerod";
import fs from "fs";
import { LocalTransport } from "../../src/transport";
import XmrBchStateMachine from "../../src/StateMachine/bch-xmr-0.4.1/XmrBchStateMachine";
import BchXmrStateMachine from "../../src/StateMachine/bch-xmr-0.4.1/BchXmrStateMachine";
import { mineBchBlocks } from "../../src/bitcoind";
import { Mutex } from "async-mutex";
import { SwapInitState } from "../../src/StateMachine/bch-xmr-0.4.1/state";
import { BchXmrP2pTransport } from "../../src/StateMachine/bch-xmr-0.4.1/BchXmrP2pTransport";
import { XmrBchP2pTransport } from "../../src/StateMachine/bch-xmr-0.4.1/XmrBchP2pTransport";
import { createRelayNode } from "../../src/relay";

const SwapBaseSetupRegtest: SwapInitState = {
  xmrRpc: "http://localhost:28081",
  xmrNetwork: "testnet",
  bchRpc: "ws://localhost:60003",
  bchNetwork: "regtest",
  swapId: "test",
  xmrSwapAmount: BigInt(1e10),
  bchSwapAmount: BigInt(1e6),
  miningFee: BigInt(700),
  timelock1: 2,
  timelock2: 5,
};

const SwapBaseSetupTestnet: SwapInitState = {
  xmrRpc: "http://testnet.community.rino.io:28081",
  xmrNetwork: "testnet",
  bchRpc: "wss://chipnet.imaginary.cash:50004",
  bchNetwork: "chipnet",
  swapId: "chipnet",
  xmrSwapAmount: BigInt(1e10),
  bchSwapAmount: BigInt(1e6),
  miningFee: BigInt(700),
  timelock1: 2,
  timelock2: 5,
};


// switch here to run tests on regtest or testnet
const testnet = !!process.env.TESTNET;

const SwapBaseSetup: SwapInitState = testnet ? SwapBaseSetupTestnet : SwapBaseSetupRegtest;
const FUNDING_ID = testnet ? "wif:testnet:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6" : "wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6"
const WalletType = testnet ? TestNetWallet : RegTestWallet;

const bchFundingWallet =  await WalletType.fromId(FUNDING_ID);
let moneroFundingWallet = testnet ? await getTestnetFundingWallet(SwapBaseSetup) : await getRegtestFundingWallet();

const mineIfRegtest = async (callback: Function) => {
  let bchInterval!: NodeJS.Timeout;
  let xmrInterval!: NodeJS.Timeout;

  if (!testnet) {
    const moneroBlockTime = 2000;

    bchInterval = setInterval(async () => Promise.all([
      mineBchBlocks(bchFundingWallet.address!, 1),
    ]), 2*moneroBlockTime);

    xmrInterval = setInterval(async () => Promise.all([
      mineXmrBlocks(await moneroFundingWallet.getPrimaryAddress(), 1)
    ]), moneroBlockTime);
  }

  await callback();

  if (!testnet) {
    clearInterval(bchInterval);
    clearInterval(xmrInterval);
  }
}

beforeAll(async () => {
  // await mineXmrBlocks("48k1L1kd5fQiAAKNmVeyGzJtrTt8j1Qhr9tsMzgtdBbQYzZDQRn6yrv4YQ4561J3SDiek6yN1RweScNoAF9VHwavAGT8rCU", 20);
});

beforeEach(async () => {
  fs.readdirSync("data").forEach((file) => {
    if (file !== ".gitkieep" && !file.includes("funding") && !file.includes("wallet-rpc") && !file.includes("test")) {
      fs.rmSync(`data/${file}`, { recursive: true });
    }
  });
});

class XmrBchStateMachineTest extends XmrBchStateMachine {
  public bchConfirmationsCallback = (confirmations: number, requiredConfirmations: number) => {
    console.log(`Alice received ${confirmations}/${requiredConfirmations} BCH confirmations`);
  };
  public xmrConfirmationsCallback = (confirmations: number, requiredConfirmations: number) => {
    console.log(`Alice received ${confirmations}/${requiredConfirmations} XMR confirmations`);
  };

  public async fundXmrSwaplock() {
    await moneroFundingWallet.sync();
    const xmrLockWallet = await createOrOpenWalletFromKeys({
      address: this.state.xmrLockAddress,
      path: "",
      privateViewKey: this.state.xmrLockViewKey,
      server: this.state.xmrRpc,
      restoreHeight: this.state.xmrStartingHeight,
    });
    await xmrLockWallet.sync();

    await mutex.runExclusive(async () => {
      const balance = await xmrLockWallet.getBalance();
      if (balance === 0n) {
        await moneroFundingWallet.createTx({
          accountIndex: 0,
          address: this.state.xmrLockAddress,
          amount: BigInt(this.state.xmrSwapAmount),
          relay: true,
        });
      }
    });
    await this.dispatch(this.awaitAdaptorSignature);
  }
}

const mutex = new Mutex();

class BchXmrStateMachineTest extends BchXmrStateMachine {
  public bchConfirmationsCallback = (confirmations: number, requiredConfirmations: number) => {
    console.log(`Bob received ${confirmations}/${requiredConfirmations} BCH confirmations`);
  };
  public xmrConfirmationsCallback = (confirmations: number, requiredConfirmations: number) => {
    console.log(`Bob received ${confirmations}/${requiredConfirmations} XMR confirmations`);
  };

  public async fundBchSwaplock() {
    const { swapLockContract } = await getContractPair(this.state, true);
    await mutex.runExclusive(async () => {
      const contractBalance = await swapLockContract.getBalance();
      if (contractBalance === 0n) {
        await bchFundingWallet.send([[swapLockContract.address, Number(this.state.bchSwapAmount), "sat"]]);
      }
    });
    await this.dispatch(this.prepareXmrSwaplock);
  }
}

describe("Alice", () => {
  test("happy path", async () => {
    const aliceReceivingWallet = await WalletType.newRandom();
    const bobRefundWallet = await WalletType.newRandom();
    const bobReceivingWallet = await createOrOpenWallet({
      server: SwapBaseSetup.xmrRpc,
      networkType: SwapBaseSetup.xmrNetwork,
    });

    const transport = new LocalTransport();

    const fsmAlice = new XmrBchStateMachineTest({...SwapBaseSetup,
      asset: "rXMR:native",
      targetAsset: "rBCH:native",
      version: "0.4.1",
      aBchReceivingAddress: aliceReceivingWallet.cashaddr!,
      aXmrRefundAddress: await moneroFundingWallet.getPrimaryAddress(),
    }, transport);

    const fsmBob = new BchXmrStateMachineTest({...SwapBaseSetup,
      asset: "rBCH:native",
      targetAsset: "rXMR:native",
      version: "0.4.1",
      bXmrReceivingAddress: await bobReceivingWallet.getPrimaryAddress(),
      bBchRefundAddress: bobRefundWallet.cashaddr!,
    }, transport);

    await mineIfRegtest(() => Promise.all([fsmAlice.exec(), fsmBob.exec()]));

    expect(BigInt(await aliceReceivingWallet.getBalance("sat") as number)).toBe(SwapBaseSetup.bchSwapAmount-SwapBaseSetup.miningFee);
    await bobReceivingWallet.sync();
    expect(await bobReceivingWallet.getBalance()).toBeGreaterThan(SwapBaseSetup.xmrSwapAmount/10n);
  }, testnet ? 60 * 60 * 1000 : undefined);

  test("bob refunds after alice do not send xmr to swaplock (refund-spend)", async () => {
    const aliceReceivingWallet = await WalletType.newRandom();
    const bobRefundWallet = await WalletType.newRandom();
    const bobReceivingWallet = await createOrOpenWallet({
      server: SwapBaseSetup.xmrRpc,
      networkType: SwapBaseSetup.xmrNetwork,
    });
    const aliceRefundWallet = await createOrOpenWallet({
      server: SwapBaseSetup.xmrRpc,
      networkType: SwapBaseSetup.xmrNetwork,
    });

    const transport = new LocalTransport();

    const fsmAlice = new XmrBchStateMachineTest({...SwapBaseSetup,
      asset: "rXMR:native",
      targetAsset: "rBCH:native",
      version: "0.4.1",
      aBchReceivingAddress: aliceReceivingWallet.cashaddr!,
      aXmrRefundAddress: await aliceRefundWallet.getPrimaryAddress(),
    }, transport);

    const fsmBob = new BchXmrStateMachineTest({...SwapBaseSetup,
      asset: "rBCH:native",
      targetAsset: "rXMR:native",
      version: "0.4.1",
      bXmrReceivingAddress: await bobReceivingWallet.getPrimaryAddress(),
      bBchRefundAddress: bobRefundWallet.cashaddr!,
    }, transport);

    fsmAlice.addBreakpoint("awaitAdaptorSignature");
    fsmBob.addBreakpoint("awaitXmrSwaplockConfirmations");

    await mineIfRegtest(async() => {
      await Promise.all([fsmAlice.exec(), fsmBob.exec()]);
      await fsmBob.initiateBchRefund();
    });

    expect(BigInt(await bobRefundWallet.getBalance("sat") as number)).toBe(SwapBaseSetup.bchSwapAmount-SwapBaseSetup.miningFee-SwapBaseSetup.miningFee);

    await mineIfRegtest(async() => {
      await fsmAlice.awaitXmrRefundOrRecoverBch();
    });

    await aliceRefundWallet.sync();
    expect(await aliceRefundWallet.getBalance()).toBeGreaterThanOrEqual(SwapBaseSetup.xmrSwapAmount*80n/100n);
  }, testnet ? 60 * 60 * 1000 : undefined);

  test("alice recovers bch after bob goes missing (refund-refund)", async () => {
    const aliceReceivingWallet = await WalletType.newRandom();
    const bobRefundWallet = await WalletType.newRandom();
    let bobReceivingWallet = await createOrOpenWallet({
      server: SwapBaseSetup.xmrRpc,
      networkType: SwapBaseSetup.xmrNetwork,
    });

    const transport = new LocalTransport();

    const fsmAlice = new XmrBchStateMachineTest({...SwapBaseSetup,
      asset: "rXMR:native",
      targetAsset: "rBCH:native",
      version: "0.4.1",
      aBchReceivingAddress: aliceReceivingWallet.cashaddr!,
      aXmrRefundAddress: await moneroFundingWallet.getPrimaryAddress(),
    }, transport);

    const fsmBob = new BchXmrStateMachineTest({...SwapBaseSetup,
      asset: "rBCH:native",
      targetAsset: "rXMR:native",
      version: "0.4.1",
      bXmrReceivingAddress: await bobReceivingWallet.getPrimaryAddress(),
      bBchRefundAddress: bobRefundWallet.cashaddr!,
    }, transport);

    fsmAlice.addBreakpoint("fundXmrSwaplock");
    fsmBob.addBreakpoint("awaitXmrSwaplockConfirmations");

    await mineIfRegtest(async() => {
      await Promise.all([fsmAlice.exec(), fsmBob.exec()]);
      await fsmAlice.awaitXmrRefundOrRecoverBch();
    });

    expect(BigInt(await aliceReceivingWallet.getBalance("sat") as number)).toBe(SwapBaseSetup.bchSwapAmount-SwapBaseSetup.miningFee-SwapBaseSetup.miningFee);
    await bobReceivingWallet.sync();
    expect(await bobReceivingWallet.getBalance()).toBe(0n);
  }, testnet ? 60 * 60 * 1000 : undefined);

  test("alice recovers bch after bob fails to send his adaptor signature, shows bob mercy", async () => {
    const aliceReceivingWallet = await WalletType.newRandom();
    const bobRefundWallet = await WalletType.newRandom();
    let bobReceivingWallet = await createOrOpenWallet({
      server: SwapBaseSetup.xmrRpc,
      networkType: SwapBaseSetup.xmrNetwork,
    });

    const transport = new LocalTransport();

    const fsmAlice = new XmrBchStateMachineTest({...SwapBaseSetup,
      asset: "rXMR:native",
      targetAsset: "rBCH:native",
      version: "0.4.1",
      aBchReceivingAddress: aliceReceivingWallet.cashaddr!,
      aXmrRefundAddress: await moneroFundingWallet.getPrimaryAddress(),
    }, transport);

    const fsmBob = new BchXmrStateMachineTest({...SwapBaseSetup,
      asset: "rBCH:native",
      targetAsset: "rXMR:native",
      version: "0.4.1",
      bXmrReceivingAddress: await bobReceivingWallet.getPrimaryAddress(),
      bBchRefundAddress: bobRefundWallet.cashaddr!,
    }, transport);

    fsmAlice.addBreakpoint("fundXmrSwaplock");
    fsmBob.addBreakpoint("awaitXmrSwaplockConfirmations");

    await mineIfRegtest(async() => {
      await Promise.all([fsmAlice.exec(), fsmBob.exec()]);
      await fsmAlice.awaitXmrRefundOrRecoverBch();

      expect(BigInt(await aliceReceivingWallet.getBalance("sat") as number)).toBe(SwapBaseSetup.bchSwapAmount-SwapBaseSetup.miningFee-SwapBaseSetup.miningFee);

      // alice shows mercy to bob and publishes an op_return with decrypted signature
      await aliceReceivingWallet.send([
        OpReturnData.fromArray(["XBSW", hexToBin(fsmAlice.state.aBitcoin)]),
        new SendRequest({
          cashaddr: fsmAlice.state.bBchRefundAddress,
          value: 546,
          unit: "sat"
        })]
      );

      // alice funds xmr swaplock
      await moneroFundingWallet.createTx({
        accountIndex: 0,
        address: fsmAlice.state.xmrLockAddress,
        amount: BigInt(fsmAlice.state.xmrSwapAmount),
        relay: true,
      });

      expect(BigInt(await aliceReceivingWallet.getBalance("sat") as number)).toBeGreaterThan(SwapBaseSetup.bchSwapAmount-SwapBaseSetup.miningFee-SwapBaseSetup.miningFee-1000n);
      await fsmBob.recoverXmrFromAliceMercy();
    });

    await bobReceivingWallet.sync();
    expect(await bobReceivingWallet.getBalance()).toBeGreaterThan(SwapBaseSetup.xmrSwapAmount/10n);
  }, testnet ? 60 * 60 * 1000 : undefined);

  test("p2p transport", async () => {
    const aliceReceivingWallet = await WalletType.newRandom();
    const bobRefundWallet = await WalletType.newRandom();
    const bobReceivingWallet = await createOrOpenWallet({
      server: SwapBaseSetup.xmrRpc,
      networkType: SwapBaseSetup.xmrNetwork,
    });
    const aliceTransport = new XmrBchP2pTransport("/ATOMIC-SWAP/BCH-XMR/0.4.1");
    await aliceTransport.init();
    const bobTransport = new BchXmrP2pTransport("/ATOMIC-SWAP/BCH-XMR/0.4.1");
    await bobTransport.init();
    const swapId = await aliceTransport.connect(bobTransport.getMultiaddrs());

    const fsmAlice = new XmrBchStateMachineTest({...SwapBaseSetup,
      asset: "rXMR:native",
      targetAsset: "rBCH:native",
      version: "0.4.1",
      swapId,
      aBchReceivingAddress: aliceReceivingWallet.cashaddr!,
      aXmrRefundAddress: await moneroFundingWallet.getPrimaryAddress(),
    }, aliceTransport);

    const fsmBob = new BchXmrStateMachineTest({...SwapBaseSetup,
      asset: "rBCH:native",
      targetAsset: "rXMR:native",
      version: "0.4.1",
      swapId,
      bXmrReceivingAddress: await bobReceivingWallet.getPrimaryAddress(),
      bBchRefundAddress: bobRefundWallet.cashaddr!,
    }, bobTransport);

    await mineIfRegtest(() => Promise.all([fsmAlice.exec(), fsmBob.exec()]));

    expect(BigInt(await aliceReceivingWallet.getBalance("sat") as number)).toBe(SwapBaseSetup.bchSwapAmount-SwapBaseSetup.miningFee);
    await bobReceivingWallet.sync();
    expect(await bobReceivingWallet.getBalance()).toBeGreaterThan(SwapBaseSetup.xmrSwapAmount/10n);
  }, testnet ? 60 * 60 * 1000 : undefined);

  test("p2p transport relayed", async () => {
    const relay = await createRelayNode();

    const aliceReceivingWallet = await WalletType.newRandom();
    const bobRefundWallet = await WalletType.newRandom();
    const bobReceivingWallet = await createOrOpenWallet({
      server: SwapBaseSetup.xmrRpc,
      networkType: SwapBaseSetup.xmrNetwork,
    });
    const aliceTransport = new XmrBchP2pTransport("/ATOMIC-SWAP/BCH-XMR/0.4.1", undefined, relay.getMultiaddrs().map(ma => ma.toString()));
    await aliceTransport.init();
    const bobTransport = new BchXmrP2pTransport("/ATOMIC-SWAP/BCH-XMR/0.4.1", undefined, relay.getMultiaddrs().map(ma => ma.toString()));
    await bobTransport.init();
    const swapId = await aliceTransport.connect(bobTransport.getMultiaddrs());

    const fsmAlice = new XmrBchStateMachineTest({...SwapBaseSetup,
      asset: "rXMR:native",
      targetAsset: "rBCH:native",
      version: "0.4.1",
      swapId,
      aBchReceivingAddress: aliceReceivingWallet.cashaddr!,
      aXmrRefundAddress: await moneroFundingWallet.getPrimaryAddress(),
    }, aliceTransport);

    const fsmBob = new BchXmrStateMachineTest({...SwapBaseSetup,
      asset: "rBCH:native",
      targetAsset: "rXMR:native",
      version: "0.4.1",
      swapId,
      bXmrReceivingAddress: await bobReceivingWallet.getPrimaryAddress(),
      bBchRefundAddress: bobRefundWallet.cashaddr!,
    }, bobTransport);

    await mineIfRegtest(() => Promise.all([fsmAlice.exec(), fsmBob.exec()]));

    expect(BigInt(await aliceReceivingWallet.getBalance("sat") as number)).toBe(SwapBaseSetup.bchSwapAmount-SwapBaseSetup.miningFee);
    await bobReceivingWallet.sync();
    expect(await bobReceivingWallet.getBalance()).toBeGreaterThan(SwapBaseSetup.xmrSwapAmount/10n);
  }, testnet ? 60 * 60 * 1000 : undefined);

  test("parallel execution of two workflows", async () => {
    const happyPath = async () => {
      const aliceReceivingWallet = await WalletType.newRandom();
      const bobRefundWallet = await WalletType.newRandom();
      const bobReceivingWallet = await createOrOpenWallet({
        server: SwapBaseSetup.xmrRpc,
        networkType: SwapBaseSetup.xmrNetwork,
      });
      const aliceTransport = new XmrBchP2pTransport("/ATOMIC-SWAP/BCH-XMR/0.4.1");
      await aliceTransport.init();
      const bobTransport = new BchXmrP2pTransport("/ATOMIC-SWAP/BCH-XMR/0.4.1");
      await bobTransport.init();
      const swapId = await aliceTransport.connect(bobTransport.getMultiaddrs());

      const fsmAlice = new XmrBchStateMachineTest({...SwapBaseSetup,
        asset: "rXMR:native",
        targetAsset: "rBCH:native",
        version: "0.4.1",
        swapId,
        aBchReceivingAddress: aliceReceivingWallet.cashaddr!,
        aXmrRefundAddress: await moneroFundingWallet.getPrimaryAddress(),
      }, aliceTransport);

      const fsmBob = new BchXmrStateMachineTest({...SwapBaseSetup,
        asset: "rBCH:native",
        targetAsset: "rXMR:native",
        version: "0.4.1",
        swapId,
        bXmrReceivingAddress: await bobReceivingWallet.getPrimaryAddress(),
        bBchRefundAddress: bobRefundWallet.cashaddr!,
      }, bobTransport);

      await mineIfRegtest(() => Promise.all([fsmAlice.exec(), fsmBob.exec()]));

      expect(BigInt(await aliceReceivingWallet.getBalance("sat") as number)).toBe(SwapBaseSetup.bchSwapAmount-SwapBaseSetup.miningFee);
      await bobReceivingWallet.sync();
      expect(await bobReceivingWallet.getBalance()).toBeGreaterThan(SwapBaseSetup.xmrSwapAmount/10n);
    };

    await Promise.all([happyPath(), happyPath()]);
  }, testnet ? 60 * 60 * 1000 : undefined);

  test("pausing and resuming", async () => {
    const aliceReceivingWallet = await WalletType.newRandom();
    const bobRefundWallet = await WalletType.newRandom();
    const bobReceivingWallet = await createOrOpenWallet({
      server: SwapBaseSetup.xmrRpc,
      networkType: SwapBaseSetup.xmrNetwork,
    });

    const transport = new LocalTransport();

    const fsmAlice = new XmrBchStateMachineTest({...SwapBaseSetup,
      asset: "rXMR:native",
      targetAsset: "rBCH:native",
      version: "0.4.1",
      aBchReceivingAddress: aliceReceivingWallet.cashaddr!,
      aXmrRefundAddress: await moneroFundingWallet.getPrimaryAddress(),
    }, transport);

    const fsmBob = new BchXmrStateMachineTest({...SwapBaseSetup,
      asset: "rBCH:native",
      targetAsset: "rXMR:native",
      version: "0.4.1",
      bXmrReceivingAddress: await bobReceivingWallet.getPrimaryAddress(),
      bBchRefundAddress: bobRefundWallet.cashaddr!,
    }, transport);

    setTimeout(() => {
      console.log("pausing")
      fsmAlice.pause();
    }, 2000);

    setTimeout(() => {
      console.log("resuming")
      fsmAlice.resume();
    }, 6000);

    await mineIfRegtest(() => Promise.all([fsmAlice.exec(), fsmBob.exec()]));

    expect(BigInt(await aliceReceivingWallet.getBalance("sat") as number)).toBe(SwapBaseSetup.bchSwapAmount-SwapBaseSetup.miningFee);
    await bobReceivingWallet.sync();
    expect(await bobReceivingWallet.getBalance()).toBeGreaterThan(SwapBaseSetup.xmrSwapAmount/10n);
  }, testnet ? 60 * 60 * 1000 : undefined);

  test("breaking and restoring", async () => {
    let swapId;

    const aliceReceivingWallet = await WalletType.newRandom();
    const bobRefundWallet = await WalletType.newRandom();
    const bobReceivingWallet = await createOrOpenWallet({
      server: SwapBaseSetup.xmrRpc,
      networkType: SwapBaseSetup.xmrNetwork,
    });

    {
      const aliceTransport = new XmrBchP2pTransport("/ATOMIC-SWAP/BCH-XMR/0.4.1");
      await aliceTransport.init();
      const bobTransport = new BchXmrP2pTransport("/ATOMIC-SWAP/BCH-XMR/0.4.1");
      await bobTransport.init();
      swapId = await aliceTransport.connect(bobTransport.getMultiaddrs());

      const fsmAlice = new XmrBchStateMachineTest({...SwapBaseSetup,
        asset: "rXMR:native",
        targetAsset: "rBCH:native",
        version: "0.4.1",
        swapId,
        aBchReceivingAddress: aliceReceivingWallet.cashaddr!,
        aXmrRefundAddress: await moneroFundingWallet.getPrimaryAddress(),
      }, aliceTransport);

      const fsmBob = new BchXmrStateMachineTest({...SwapBaseSetup,
        asset: "rBCH:native",
        targetAsset: "rXMR:native",
        version: "0.4.1",
        swapId,
        bXmrReceivingAddress: await bobReceivingWallet.getPrimaryAddress(),
        bBchRefundAddress: bobRefundWallet.cashaddr!,
      }, bobTransport);

      fsmAlice.addBreakpoint("fundXmrSwaplock");
      fsmBob.addBreakpoint("awaitXmrSwaplockConfirmations");

      await mineIfRegtest(async() => {
        await Promise.all([fsmAlice.exec(), fsmBob.exec()]);
      });
    }

    {
      const aliceTransport = new XmrBchP2pTransport("/ATOMIC-SWAP/BCH-XMR/0.4.1");
      await aliceTransport.init();
      const bobTransport = new BchXmrP2pTransport("/ATOMIC-SWAP/BCH-XMR/0.4.1");
      await bobTransport.init();
      await aliceTransport.connect(bobTransport.getMultiaddrs(), swapId);

      const fsmAlice = new XmrBchStateMachineTest({...SwapBaseSetup,
        asset: "rXMR:native",
        targetAsset: "rBCH:native",
        version: "0.4.1",
        swapId,
        aBchReceivingAddress: aliceReceivingWallet.cashaddr!,
        aXmrRefundAddress: await moneroFundingWallet.getPrimaryAddress(),
      }, aliceTransport);
      await fsmAlice.restore();

      const fsmBob = new BchXmrStateMachineTest({...SwapBaseSetup,
        asset: "rBCH:native",
        targetAsset: "rXMR:native",
        version: "0.4.1",
        swapId,
        bXmrReceivingAddress: await bobReceivingWallet.getPrimaryAddress(),
        bBchRefundAddress: bobRefundWallet.cashaddr!,
      }, bobTransport);
      await fsmBob.restore();

      await mineIfRegtest(async() => {
        await fsmBob.initiateBchRefund();
      });

      expect(BigInt(await bobRefundWallet.getBalance("sat") as number)).toBe(SwapBaseSetup.bchSwapAmount-SwapBaseSetup.miningFee-SwapBaseSetup.miningFee);
    }
  }, testnet ? 60 * 60 * 1000 : undefined);
});
