import { getRandomMoneroPrivKey, getMoneroPubKey, toBitcoinPrivKey, getBitcoinPubKey, makeAdaptorSignature, verifyEncryptedSignature, addMoneroPubKeys, getMoneroAddress, addMoneroPrivKeys, recoverPrivateKey, decryptSignature, toMoneroPrivKey, getDleqProof, verifyDleqProof } from "../../dleq-tools";
import { getLockingBytecodeFromCashaddr, waitForBchConfirmations, getContractPair, waitForContractSpend, waitForXmrConfirmations, toDerSignature, extractPrivKeyFromAliceMercy, checkBchConnectivity, checkXmrConnectivity } from "../../utils";
import { assertSuccess, binToHex, decodeCashAddress, hexToBin, secp256k1, sha256, utf8ToBin } from "@bitauth/libauth";
import { StateMachine } from "../stateMachine";
import { createOrOpenWalletFromKeys } from "../../monerod";
import { Transport } from "../../transport";
import { CommonState, MessageToSign } from "./state";

export type BobState = Omit<CommonState, "aXmrRefundAddress" | "bchFundingTxId">;

// Aka bob
export default class BchXmrStateMachine extends StateMachine {
  declare public state: BobState;

  private bchConfirmationsCallbackInner(confirmations: number, requiredConfirmations: number) {
    this.log(`BCH confirmations: ${confirmations}/${requiredConfirmations}`);
    this.state.bchLockConfirmations = confirmations;
    this.persist().then(() => {
      this.safeDispatchEvent("#update");
    });
  }

  private xmrConfirmationsCallbackInner(confirmations: number, requiredConfirmations: number) {
    this.log(`XMR confirmations: ${confirmations}/${requiredConfirmations}`);
    this.state.xmrLockConfirmations = confirmations;
    this.persist().then(() => {
      this.safeDispatchEvent("#update");
    });
  }

  bchConfirmationsCallback: (confirmations: number, requiredConfirmations: number) => void = this.bchConfirmationsCallbackInner.bind(this);
  xmrConfirmationsCallback: (confirmations: number, requiredConfirmations: number) => void = this.xmrConfirmationsCallbackInner.bind(this);

  constructor(initialState: Partial<BobState>, public transport: Transport) {
    super(initialState, transport);

    this.state.currentState = initialState.currentState ?? "exec";

    // validate initial state such as refund address, etc
    if (!initialState.xmrSwapAmount) {
      this.failWithReason("xmrSwapAmount is required");
    }
    if (!initialState.bchSwapAmount) {
      this.failWithReason("bchSwapAmount is required");
    }
    if (!initialState.bchNetwork) {
      this.failWithReason("bchNetwork is required");
    }
    if (!initialState.bXmrReceivingAddress) {
      this.failWithReason("bXmrReceivingAddress is required");
    }
    if (!initialState.bBchRefundAddress) {
      this.failWithReason("bBchRefundAddress is required");
    }
    if (!initialState.miningFee) {
      this.failWithReason("miningFee is required");
    }
    if (!initialState.miningFee) {
      this.failWithReason("miningFee is required");
    }
    if (!initialState.timelock1) {
      this.failWithReason("timelock1 is required");
    }
    if (!initialState.timelock2) {
      this.failWithReason("timelock2 is required");
    }
  }

  public setXmrRpc(xmrRpc: string) {
    this.state.xmrRpc = xmrRpc;
    this.safeDispatchEvent("#update");
  }

  public setBchRpc(bchRpc: string) {
    this.state.bchRpc = bchRpc;
    this.safeDispatchEvent("#update");
  }

  public setBchConfirmationsCallback(callback: (confirmations: number, requiredConfirmations: number) => void): void {
    this.bchConfirmationsCallback = (confirmations: number, requiredConfirmations: number) => {
      this.bchConfirmationsCallbackInner(confirmations, requiredConfirmations);
      callback(confirmations, requiredConfirmations);
    }
  }

  public setXmrConfirmationsCallback(callback: (confirmations: number, requiredConfirmations: number) => void): void {
    this.xmrConfirmationsCallback = (confirmations: number, requiredConfirmations: number) => {
      this.xmrConfirmationsCallbackInner(confirmations, requiredConfirmations);
      callback(confirmations, requiredConfirmations);
    }
  }

  public async exec() {
    await super.exec();
    await this.dispatch(this.checkConnectivity);
  }

  public async checkConnectivity() {
    try {
      const [_, xmrStartingHeight] = await Promise.all([
        Promise.race([
          checkBchConnectivity(this.state.bchRpc, this.state.bchNetwork),
          new Promise((_, reject) => setTimeout(reject, 5000)),
        ]).catch(() => {throw new Error(`BCH connectivity check: failed to connect to ${this.state.bchRpc}`);}),
        Promise.race([
          checkXmrConnectivity(this.state.xmrRpc),
          new Promise((_, reject) => setTimeout(reject, 5000)),
        ]).catch(() => {throw new Error(`XMR connectivity check: failed to connect to ${this.state.xmrRpc}`);}),
      ]) as [number, number];

      this.state.xmrStartingHeight ??= xmrStartingHeight;
    } catch (e: any) {
      this.failWithReason(e.message);
    }

    await this.dispatch(this.init);
  }

  // initializes the swap's one-time cryptographic keys and generates the proof
  public async init() {
    // quick check if we have already generated the keys and state was rewinded
    if (this.state.bViewMonero && this.state.bSpendMonero && this.state.bPubViewMonero && this.state.bPubSpendMonero && this.state.bBitcoin && this.state.bPubBitcoin && this.state.bSignedMessage && this.state.bProof) {
      await this.dispatch(this.sendBobInfo);
      return;
    }

    // Bob generates her one-time monero private view and spend keys
    this.state.bViewMonero = getRandomMoneroPrivKey();
    this.state.bSpendMonero = getRandomMoneroPrivKey();

    // Bob gets her one-time monero public view and spend keys
    this.state.bPubViewMonero = getMoneroPubKey(this.state.bViewMonero);
    this.state.bPubSpendMonero = getMoneroPubKey(this.state.bSpendMonero);

    // Bob gets her one-time bitcoin private key from her monero private key
    this.state.bBitcoin = toBitcoinPrivKey(this.state.bSpendMonero);

    // Bob generates their one-time monero public keys
    this.state.bPubBitcoin = getBitcoinPubKey(this.state.bBitcoin);

    // Bob signs the pre-agreed message to prove he is in control of the private keys
    this.state.bSignedMessage = binToHex(assertSuccess(secp256k1.signMessageHashCompact(hexToBin(this.state.bBitcoin), sha256.hash(utf8ToBin(MessageToSign)))));

    // Bob generates her proof
    this.state.bProof = getDleqProof(this.state.bSpendMonero);

    await this.dispatch(this.sendBobInfo);
  }

  // sends Bob's info to Alic
  public async sendBobInfo() {
    await this.transport.send("BobInfo", {
      bViewMonero: this.state.bViewMonero,
      bPubViewMonero: this.state.bPubViewMonero,
      bPubSpendMonero: this.state.bPubSpendMonero,
      bPubBitcoin: this.state.bPubBitcoin,
      bSignedMessage: this.state.bSignedMessage,
      bProof: this.state.bProof,
      bBchRefundAddress: this.state.bBchRefundAddress,
      miningFee: this.state.miningFee,
      timelock1: this.state.timelock1,
      timelock2: this.state.timelock2,
      bchSwapAmount: this.state.bchSwapAmount,
      xmrSwapAmount: this.state.xmrSwapAmount,
    });
    await this.dispatch(this.awaitAliceInfo);
  }

  // awaits Alices's info and updates state
  public async awaitAliceInfo() {
    if (this.state.aViewMonero && this.state.aPubViewMonero && this.state.aPubSpendMonero && this.state.aPubBitcoin && this.state.aSignedMessage && this.state.aProof && this.state.aBchReceivingAddress && this.state.aAdaptorSig && this.state.aDigest) {
      // pass, we do not want get the possibly overridden state
    } else {
      const AliceState = await this.transport.await("AliceInfo");

      this.state.aViewMonero = AliceState.aViewMonero;
      this.state.aPubViewMonero = AliceState.aPubViewMonero;
      this.state.aPubSpendMonero = AliceState.aPubSpendMonero;
      this.state.aPubBitcoin = AliceState.aPubBitcoin;
      this.state.aSignedMessage = AliceState.aSignedMessage;
      this.state.aProof = AliceState.aProof;
      this.state.aBchReceivingAddress = AliceState.aBchReceivingAddress;
      this.state.aAdaptorSig = AliceState.aAdaptorSig;
      this.state.aDigest = binToHex(sha256.hash(getLockingBytecodeFromCashaddr(this.state.bBchRefundAddress)));

      if (this.state.miningFee != AliceState.miningFee) {
        this.failWithReason("Mining fee spend mismatch");
      }

      if (this.state.miningFee != AliceState.miningFee) {
        this.failWithReason("Mining fee refund mismatch");
      }

      if (this.state.timelock1 != AliceState.timelock1) {
        this.failWithReason("Timelock1 mismatch");
      }

      if (this.state.timelock2 != AliceState.timelock2) {
        this.failWithReason("Timelock2 mismatch");
      }

      if (this.state.bchSwapAmount != AliceState.bchSwapAmount) {
        this.failWithReason("BCH swap amount mismatch");
      }

      if (this.state.xmrSwapAmount != AliceState.xmrSwapAmount) {
        this.failWithReason("XMR swap amount mismatch");
      }
    }

    // verify Bob's signed message
    if (!secp256k1.verifySignatureCompact(hexToBin(this.state.aSignedMessage), hexToBin(this.state.aPubBitcoin), sha256.hash(utf8ToBin(MessageToSign)))) {
      this.failWithReason("Alice signed message is invalid");
    }

    if (!verifyEncryptedSignature(this.state.aPubBitcoin, this.state.bPubBitcoin, this.state.aDigest, this.state.aAdaptorSig)) {
      this.failWithReason("Alice adaptor signature is invalid");
    }
    this.state.aSigDecrypted = decryptSignature(this.state.bBitcoin, this.state.aAdaptorSig);

    // Bob receives Alice's PubKeys and verifies Alices's proof
    if (verifyDleqProof(this.state.bProof) == false) {
      this.failWithReason("Alice proof is invalid");
    }
    if (this.state.bPubSpendMonero !== this.state.bProof.moneroPubKey) {
      this.failWithReason("Alice monero public spend key does not match proof");
    }
    if (this.state.bPubBitcoin != this.state.bProof.bitcoinPubKey) {
      this.failWithReason("Alice bitcoin public key does not match proof");
    }

    // Bob saves Alice's refund BCH address
    const decoded = decodeCashAddress(this.state.aBchReceivingAddress);
    if (typeof decoded === "string") {
      this.failWithReason("Alice refund BCH address is invalid");
    }

    this.state.bDigest = binToHex(sha256.hash(getLockingBytecodeFromCashaddr(this.state.aBchReceivingAddress)));
    this.state.bAdaptorSig = makeAdaptorSignature(this.state.bBitcoin, this.state.aPubBitcoin, this.state.bDigest);

    await this.dispatch(this.prepareBchSwaplock);
  }

  public async prepareBchSwaplock() {
    const { swapLockContract, refundContract } = await getContractPair(this.state, false);

    this.state.bchSwapLockContractAddress = swapLockContract.address;
    this.state.bchRefundContractAddress = refundContract.address;

    await this.dispatch(this.fundBchSwaplock);
  }

  public async fundBchSwaplock() {
    await new Promise<void>(async (resolve) => {
      const { swapLockContract } = await getContractPair(this.state, true);

      this.log(`Waiting for ${this.state.bchSwapAmount} BCH a.u. deposit to ${swapLockContract.address}`);

      while (true) {
        const contractBalance = await swapLockContract.getBalance();
        if (contractBalance > 0n) {
          resolve();
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    });
    await this.dispatch(this.awaitBchSwaplockConfirmations);
  }

  public async awaitBchSwaplockConfirmations() {
    const { swapLockContract } = await getContractPair(this.state, false);

    // we need to wait for only 1 confirmation here, not to confuse with the refund timelocks
    await waitForBchConfirmations(swapLockContract.address, this.state.bchSwapAmount, 1, this.bchConfirmationsCallback, this.state.bchRpc);

    await this.dispatch(this.prepareXmrSwaplock);
  }

  public async prepareXmrSwaplock() {
    // Alice sends her XMR to an address with Public view and spend keys A+B = Alice public view key + Bob public view key, from which she can not spend
    const pubKeyLockSpend = addMoneroPubKeys(this.state.aPubSpendMonero, this.state.bPubSpendMonero);
    const pubKeyLockView = addMoneroPubKeys(this.state.aPubViewMonero, this.state.bPubViewMonero);
    this.state.xmrLockAddress = getMoneroAddress(this.state.xmrNetwork, pubKeyLockSpend, pubKeyLockView);
    this.state.xmrLockViewKey = addMoneroPrivKeys(this.state.aViewMonero, this.state.bViewMonero);

    await this.dispatch(this.awaitXmrSwaplockDeposit);
  }

  public async awaitXmrSwaplockDeposit() {
    const xmrLockWallet = await createOrOpenWalletFromKeys({
      address: this.state.xmrLockAddress,
      path: "",
      privateViewKey: this.state.xmrLockViewKey,
      server: this.state.xmrRpc,
      restoreHeight: this.state.xmrStartingHeight,
      networkType: this.state.xmrNetwork as any,
    });

    await waitForXmrConfirmations(xmrLockWallet, this.state.xmrSwapAmount, 0, this.xmrConfirmationsCallback);
    await xmrLockWallet.close();

    await this.dispatch(this.awaitXmrSwaplockConfirmations);
  }

  public async awaitXmrSwaplockConfirmations() {
    const xmrLockWallet = await createOrOpenWalletFromKeys({
      address: this.state.xmrLockAddress,
      path: "",
      privateViewKey: this.state.xmrLockViewKey,
      server: this.state.xmrRpc,
      restoreHeight: this.state.xmrStartingHeight,
      networkType: this.state.xmrNetwork as any,
    });

    await waitForXmrConfirmations(xmrLockWallet, this.state.xmrSwapAmount, 5, this.xmrConfirmationsCallback);
    await xmrLockWallet.close();

    await this.dispatch(this.sendAdaptorSignature);
  }

  public async sendAdaptorSignature() {
    await this.transport.send("BobAdaptorSignature", this.state.bAdaptorSig);
    await this.dispatch(this.awaitBchContractSpend);
  }

  public async awaitBchContractSpend() {
    const { swapLockContract } = await getContractPair(this.state, false);
    this.state.bSigDecrypted = await waitForContractSpend(swapLockContract.address, swapLockContract.bytecode, this.state.bchRpc);
    this.state.aBitcoin = recoverPrivateKey(this.state.aPubBitcoin, this.state.bSigDecrypted, this.state.bAdaptorSig);
    this.state.aSpendMonero = toMoneroPrivKey(this.state.aBitcoin);
    // Bob receives Alice's PubKeys and verifies Alices's proof
    if (verifyDleqProof(this.state.bProof) == false) {
      this.failWithReason("Alice proof is invalid");
    }
    this.state.xmrLockSpendKey = addMoneroPrivKeys(this.state.aSpendMonero, this.state.bSpendMonero)
    await this.dispatch(this.awaitRestXmrSwaplockConfirmations);
  }

  public async awaitRestXmrSwaplockConfirmations() {
    const xmrLockWallet = await createOrOpenWalletFromKeys({
      address: this.state.xmrLockAddress,
      path: "",
      privateViewKey: this.state.xmrLockViewKey,
      server: this.state.xmrRpc,
      restoreHeight: this.state.xmrStartingHeight,
      networkType: this.state.xmrNetwork as any,
    });
    await waitForXmrConfirmations(xmrLockWallet, this.state.xmrSwapAmount, 10, this.xmrConfirmationsCallback);
    await xmrLockWallet.close();

    await this.dispatch(this.sendToXmrReceivingAddress);
  }

  public async sendToXmrReceivingAddress() {
    const xmrLockWallet = await createOrOpenWalletFromKeys({
      address: this.state.xmrLockAddress,
      path: "",
      privateViewKey: this.state.xmrLockViewKey,
      privateSpendKey: this.state.xmrLockSpendKey,
      server: this.state.xmrRpc,
      restoreHeight: this.state.xmrStartingHeight,
      networkType: this.state.xmrNetwork as any,
    });
    await xmrLockWallet.sync();

    const txs = await xmrLockWallet.sweepUnlocked({
      address: this.state.bXmrReceivingAddress,
      relay: true,
    });
    await xmrLockWallet.close();

    this.state.xmrSweepTxid = txs[0].hash;
    this.log(`XMR sweep txid: ${this.state.xmrSweepTxid}`);

    await this.dispatch(this.success);
  }

  public async success() {
  }

  public async initiateBchRefund() {
    const { swapLockContract, refundContract } = await getContractPair(this.state);
    await waitForBchConfirmations(swapLockContract.address, this.state.bchSwapAmount, this.state.timelock1, this.bchConfirmationsCallback, this.state.bchRpc);
    const height = await swapLockContract.provider.getBlockHeight();
    await swapLockContract.functions.refund().
      to(refundContract.address, BigInt(this.state.bchSwapAmount) - BigInt(this.state.miningFee)).
      withoutChange().withAge(this.state.timelock1).withTime(height).send();

    await this.dispatch(this.bchRefundComplete);
  }

  public async bchRefundComplete() {
    const { refundContract } = await getContractPair(this.state);
    const derSig = await toDerSignature(this.state.aSigDecrypted);
    const txDetails = await refundContract.functions.swap(derSig).
      to(this.state.bBchRefundAddress, BigInt(this.state.bchSwapAmount) - BigInt(this.state.miningFee) - BigInt(this.state.miningFee)).
      withoutChange().withAge(0).send();

    this.state.bchRefundTxId = txDetails.txid;
    this.log(`BCH refund txid: ${this.state.bchRefundTxId}`);

    await this.dispatch(this.success);
  }

  public async recoverXmrFromAliceMercy() {
    this.state.aBitcoin = await extractPrivKeyFromAliceMercy(this.state.bBchRefundAddress, this.state.bchRpc, );
    this.state.aSpendMonero = toMoneroPrivKey(this.state.aBitcoin);
    this.state.xmrLockSpendKey = addMoneroPrivKeys(this.state.aSpendMonero, this.state.bSpendMonero)

    await this.dispatch(this.awaitRestXmrSwaplockConfirmations);
  }
}
