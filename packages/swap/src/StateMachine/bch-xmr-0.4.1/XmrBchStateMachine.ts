import { getRandomMoneroPrivKey, getMoneroPubKey, toBitcoinPrivKey, getBitcoinPubKey, makeAdaptorSignature, verifyEncryptedSignature, addMoneroPubKeys, getMoneroAddress, addMoneroPrivKeys, recoverPrivateKey, decryptSignature, toMoneroPrivKey, getDleqProof, verifyDleqProof } from "../../dleq-tools";
import { binToHex, sha256 } from "mainnet-js";
import { getLockingBytecodeFromCashaddr, waitForBchConfirmations, getContractPair, waitForContractSpend, waitForXmrConfirmations, toDerSignature, toCompactSignature, checkBchConnectivity, checkXmrConnectivity } from "../../utils";
import { assertSuccess, decodeCashAddress, hexToBin, secp256k1, utf8ToBin } from "@bitauth/libauth";
import { StateMachine } from "../stateMachine";
import { createOrOpenWalletFromKeys } from "../../monerod";
import { Transport } from "../../transport";
import { CommonState, MessageToSign } from "./state";

export type AliceState = Omit<CommonState, "bXmrReceivingAddress">;

// aka Alice
export default class XmrBchStateMachine extends StateMachine {
  public PersistName = "XmrBchStateMachine";

  declare public state: AliceState;
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

  constructor(initialState: Partial<AliceState>, public transport: Transport) {
    super(initialState, transport);

    this.state.currentState = initialState.currentState ?? "exec";

    // validate initial state such as refund address, etc
    if (!initialState.xmrRpc) {
      this.failWithReason("xmrRpc is required");
    }
    if (!initialState.xmrNetwork) {
      this.failWithReason("xmrNetwork is required");
    }
    if (!initialState.bchRpc) {
      this.failWithReason("bchRpc is required");
    }
    if (!initialState.bchNetwork) {
      this.failWithReason("bchNetwork is required");
    }
    if (!initialState.xmrSwapAmount) {
      this.failWithReason("xmrSwapAmount is required");
    }
    if (!initialState.bchSwapAmount) {
      this.failWithReason("bchSwapAmount is required");
    }
    if (!initialState.aXmrRefundAddress) {
      this.failWithReason("aXmrRefundAddress is required");
    }
    if (!initialState.aBchReceivingAddress) {
      this.failWithReason("aBchReceivingAddress is required");
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
      return;
    }

    await this.dispatch(this.init);
  }

  // initializes the swap's one-time cryptographic keys and generates the proof
  public async init() {
    // quick check if we have already generated the keys and state was rewinded
    if (this.state.aViewMonero && this.state.aSpendMonero && this.state.aPubViewMonero && this.state.aPubSpendMonero && this.state.aBitcoin && this.state.aPubBitcoin && this.state.aSignedMessage && this.state.aProof) {
      await this.dispatch(this.awaitBobInfo);
      return;
    }

    // Alice generates her one-time monero private view and spend keys
    this.state.aViewMonero = getRandomMoneroPrivKey();
    this.state.aSpendMonero = getRandomMoneroPrivKey();

    // Alice gets her one-time monero public view and spend keys
    this.state.aPubViewMonero = getMoneroPubKey(this.state.aViewMonero);
    this.state.aPubSpendMonero = getMoneroPubKey(this.state.aSpendMonero);

    // Alice gets her one-time bitcoin private key from her monero private key
    this.state.aBitcoin = toBitcoinPrivKey(this.state.aSpendMonero);

    // Alice generates their one-time monero public keys
    this.state.aPubBitcoin = getBitcoinPubKey(this.state.aBitcoin);

    // Alice signs the pre-agreed message to prove he is in control of the private keys
    this.state.aSignedMessage = binToHex(assertSuccess(secp256k1.signMessageHashCompact(hexToBin(this.state.aBitcoin), sha256.hash(utf8ToBin(MessageToSign)))));

    // Alice generates her proof
    this.state.aProof = getDleqProof(this.state.aSpendMonero);

    await this.dispatch(this.awaitBobInfo);
  }

  // awaits Bob's info and updates state
  public async awaitBobInfo() {
    if (this.state.bViewMonero && this.state.bPubViewMonero && this.state.bPubSpendMonero && this.state.bPubBitcoin && this.state.bSignedMessage && this.state.bProof && this.state.bBchRefundAddress) {
      // pass, we do not want get the possibly overridden state
    } else {
      const BobState = await this.transport.await("BobInfo");

      this.state.bViewMonero = BobState.bViewMonero;
      this.state.bPubViewMonero = BobState.bPubViewMonero;
      this.state.bPubSpendMonero = BobState.bPubSpendMonero;
      this.state.bPubBitcoin = BobState.bPubBitcoin;
      this.state.bSignedMessage = BobState.bSignedMessage;
      this.state.bProof = BobState.bProof;
      this.state.bBchRefundAddress = BobState.bBchRefundAddress;

      if (this.state.miningFee != BobState.miningFee) {
        this.failWithReason("Mining fee mismatch");
      }

      if (this.state.timelock1 != BobState.timelock1) {
        this.failWithReason("Timelock1 mismatch");
      }

      if (this.state.timelock2 != BobState.timelock2) {
        this.failWithReason("Timelock2 mismatch");
      }

      if (this.state.bchSwapAmount != BobState.bchSwapAmount) {
        this.failWithReason("BCH swap amount mismatch");
      }

      if (this.state.xmrSwapAmount != BobState.xmrSwapAmount) {
        this.failWithReason("XMR swap amount mismatch");
      }
    }

    // verify Bob's signed message
    if (!secp256k1.verifySignatureCompact(hexToBin(this.state.bSignedMessage), hexToBin(this.state.bPubBitcoin), sha256.hash(utf8ToBin(MessageToSign)))) {
      this.failWithReason("Bob signed message is invalid");
    }

    // Alice receives Bob's PubKeys and verifies Bob's proof
    if (verifyDleqProof(this.state.bProof) == false) {
      this.failWithReason("Bob proof is invalid");
    }
    if (this.state.bPubSpendMonero !== this.state.bProof.moneroPubKey) {
      this.failWithReason("Bob monero public spend key does not match proof");
    }
    if (this.state.bPubBitcoin != this.state.bProof.bitcoinPubKey) {
      this.failWithReason("Bob bitcoin public key does not match proof");
    }

    // Alice saves Bob's refund BCH address
    const decoded = decodeCashAddress(this.state.bBchRefundAddress);
    if (typeof decoded === "string") {
      this.failWithReason("Bob refund BCH address is invalid");
    }

    this.state.aDigest = binToHex(sha256.hash(getLockingBytecodeFromCashaddr(this.state.bBchRefundAddress)));
    this.state.aAdaptorSig = makeAdaptorSignature(this.state.aBitcoin, this.state.bPubBitcoin, this.state.aDigest);

    await this.dispatch(this.sendAliceInfo);
  }

  // sends Alice's info to Bob
  public async sendAliceInfo() {
    await this.transport.send("AliceInfo", {
      aViewMonero: this.state.aViewMonero,
      aPubViewMonero: this.state.aPubViewMonero,
      aPubSpendMonero: this.state.aPubSpendMonero,
      aPubBitcoin: this.state.aPubBitcoin,
      aSignedMessage: this.state.aSignedMessage,
      aProof: this.state.aProof,
      aBchReceivingAddress: this.state.aBchReceivingAddress,
      miningFee: this.state.miningFee,
      timelock1: this.state.timelock1,
      timelock2: this.state.timelock2,
      bchSwapAmount: this.state.bchSwapAmount,
      xmrSwapAmount: this.state.xmrSwapAmount,
      aAdaptorSig: this.state.aAdaptorSig,
    });
    await this.dispatch(this.prepareBchSwaplock);
  }

  public async prepareBchSwaplock() {
    const { swapLockContract, refundContract } = await getContractPair(this.state, false);

    this.state.bchSwapLockContractAddress = swapLockContract.address;
    this.state.bchRefundContractAddress = refundContract.address;

    await this.dispatch(this.awaitBchSwaplockDeposit);
  }

  public async awaitBchSwaplockDeposit() {
    const { swapLockContract } = await getContractPair(this.state, false);
    const txId = await waitForBchConfirmations(swapLockContract.address, this.state.bchSwapAmount, 0, this.bchConfirmationsCallback, this.state.bchRpc);
    this.state.bchFundingTxId = txId;

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

    await this.dispatch(this.fundXmrSwaplock);
  }

  public async fundXmrSwaplock() {
    const xmrLockWallet = await createOrOpenWalletFromKeys({
      address: this.state.xmrLockAddress,
      path: "",
      privateViewKey: this.state.xmrLockViewKey,
      server: this.state.xmrRpc,
      restoreHeight: this.state.xmrStartingHeight,
      networkType: this.state.xmrNetwork as any,
    });

    this.log(`Waiting for ${this.state.xmrSwapAmount} XMR a.u. deposit to ${this.state.xmrLockAddress}`);

    await waitForXmrConfirmations(xmrLockWallet, this.state.xmrSwapAmount, 0);
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

    await this.dispatch(this.awaitAdaptorSignature);
  }

  public async awaitAdaptorSignature() {
    const bAdaptorSig = await this.transport.await("BobAdaptorSignature");
    this.state.bDigest = binToHex(sha256.hash(getLockingBytecodeFromCashaddr(this.state.aBchReceivingAddress)));
    this.state.bAdaptorSig = bAdaptorSig;

    await this.dispatch(this.validateAdaptorSignature);
  }

  public async validateAdaptorSignature() {
    // Alice receives Bob's encrypted adaptor signature and verifies the digest
    if (!verifyEncryptedSignature(this.state.bPubBitcoin, this.state.aPubBitcoin, this.state.bDigest, this.state.bAdaptorSig)) {
      this.failWithReason("Bob adaptor signature is invalid");
    }
    this.state.bSigDecrypted = decryptSignature(this.state.aBitcoin, this.state.bAdaptorSig);

    await this.dispatch(this.spendFromBchSwaplock);
  }

  public async spendFromBchSwaplock() {
    // Alice spends the contract to herself and reveals sig to Bob
    const derSig = await toDerSignature(this.state.bSigDecrypted);

    const { swapLockContract } = await getContractPair(this.state);
    if (await swapLockContract.getBalance()) {
      // Alice claims the BCH to her wallet
      const txDetails = await swapLockContract.functions.swap(derSig).to(this.state.aBchReceivingAddress, this.state.bchSwapAmount - this.state.miningFee).withoutChange().withAge(0).send();

      this.state.bchSweepTxid = txDetails.txid;
      this.log(`BCH sweep txId: ${this.state.bchSweepTxid}`);
    }
    await this.dispatch(this.success);
  }

  public async success() {

  }

  public async awaitXmrRefundOrRecoverBch() {
    const { swapLockContract, refundContract } = await getContractPair(this.state);

    // first check if swaplock contract was spent into refund path by Bob, otherwise we should do it ourselves
    const spent = (await swapLockContract.getUtxos()).length === 0;
    if (!spent) {
      await waitForBchConfirmations(swapLockContract.address, this.state.bchSwapAmount, this.state.timelock1, this.bchConfirmationsCallback, this.state.bchRpc);
      const height = await refundContract.provider.getBlockHeight();
      await swapLockContract.functions.refund().
        to(refundContract.address, this.state.bchSwapAmount - this.state.miningFee).
        withoutChange().withAge(this.state.timelock1).withTime(height).send();
    }

    // let us await either for Bob to spend the refund contract and reveal his decrypted signature
    // or wait for timelock2 to expire for us to take the recovery path and get BCH
    const balance = this.state.bchSwapAmount - this.state.miningFee;
    const sigOrTxId = await Promise.race([
      waitForContractSpend(refundContract.address, refundContract.bytecode, this.state.bchRpc),
      waitForBchConfirmations(refundContract.address, balance, this.state.timelock2, this.bchConfirmationsCallback, this.state.bchRpc),
    ]);

    if (sigOrTxId.length === 64) {
      // transaction id from waitForBchConfirmations
      await waitForBchConfirmations(refundContract.address, balance - this.state.miningFee, this.state.timelock2, this.bchConfirmationsCallback, this.state.bchRpc);
      const height = await refundContract.provider.getBlockHeight();
      const txDetails = await refundContract.functions.refund().
        to(this.state.aBchReceivingAddress, balance - this.state.miningFee).
        withoutChange().withAge(this.state.timelock2).withTime(height).send();

      this.state.bchSweepTxid = txDetails.txid;
      this.log(`BCH sweep txId: ${this.state.bchSweepTxid}`);

      await this.dispatch(this.success);
    } else {
      // signature from Bob's refund
      this.state.aSigDecrypted = sigOrTxId;
      this.state.bBitcoin = recoverPrivateKey(this.state.bPubBitcoin, this.state.aSigDecrypted, this.state.aAdaptorSig);
      this.state.bSpendMonero = toMoneroPrivKey(this.state.bBitcoin);
      this.state.xmrLockSpendKey = addMoneroPrivKeys(this.state.aSpendMonero, this.state.bSpendMonero)

      await this.dispatch(this.refundXmr);
    }
  }

  public async refundXmr() {
    const xmrLockWallet = await createOrOpenWalletFromKeys({
      address: this.state.xmrLockAddress,
      path: "",
      privateViewKey: this.state.xmrLockViewKey,
      privateSpendKey: this.state.xmrLockSpendKey,
      server: this.state.xmrRpc,
      restoreHeight: this.state.xmrStartingHeight,
      networkType: this.state.xmrNetwork as any,
    });
    await waitForXmrConfirmations(xmrLockWallet, this.state.xmrSwapAmount, 10, this.xmrConfirmationsCallback);

    const tx = await xmrLockWallet.sweepUnlocked({
      address: this.state.aXmrRefundAddress,
      relay: true,
    });
    await xmrLockWallet.close();
    this.state.xmrRefundTxId = tx[0].hash;
    this.log(`XMR refund txId: ${this.state.xmrRefundTxId}`);

    await this.dispatch(this.success);
  }
}
