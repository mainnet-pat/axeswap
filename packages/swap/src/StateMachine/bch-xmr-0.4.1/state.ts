import { DleqProof } from "../../dleq-tools";
import { State } from "../stateMachine";

export const MessageToSign = "BCH-XMR-0.4.1";

// this state is a handshake between parties and must match exactly for Alice and Bob
export interface SwapInitState {
  xmrRpc: string;
  xmrNetwork: string;
  bchRpc: string;
  bchNetwork: string;
  swapId: string;
  xmrSwapAmount: bigint;
  bchSwapAmount: bigint;
  miningFee: bigint;
  timelock1: number;
  timelock2: number;
}

export interface CommonState extends State, SwapInitState {
  aSigDecrypted: string;
  xmrLockSpendKey: string;
  bSpendMonero: string;
  bBitcoin: string;
  // initial required state
  xmrStartingHeight: number;

  aBchReceivingAddress: string;
  aXmrRefundAddress: string; // alice exclusive

  // state generated at init
  aViewMonero: string;
  aSpendMonero: string;
  aPubViewMonero: string;
  aPubSpendMonero: string;
  aBitcoin: string;
  aPubBitcoin: string;
  aSignedMessage: string;
  aProof: DleqProof;

  // Bob's initial state
  bViewMonero: string;
  bPubViewMonero: string;
  bPubSpendMonero: string;
  bPubBitcoin: string;
  bSignedMessage: string;
  bProof: DleqProof;
  bBchRefundAddress: string;

  bchSwapLockContractAddress: string;
  bchRefundContractAddress: string;

  xmrLockViewKey: string;
  xmrLockAddress: string;
  bchFundingTxId: string; // alice exclusive
  xmrRefundTxId: string; // alice exclusive
  bchSweepTxid: string; // alice exclusive

  // confirmations done
  bchLockConfirmations: number;
  xmrLockConfirmations: number;

  // our digests for Bob
  aDigest: string;
  aAdaptorSig: string;

  // Bob's digests for us
  bDigest: string;
  bAdaptorSig: string;
  bSigDecrypted: string;

  bXmrReceivingAddress: string; // bob exclusive
  bchRefundTxId: string; // bob exclusive
  xmrSweepTxid: string; // bob exclusive
}