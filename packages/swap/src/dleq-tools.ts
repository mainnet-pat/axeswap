import { getDleqProof as _getDleqProof, verifyDleqProof as _verifyDleqProof, DleqProof as _DleqProof } from "dleq-tools";

export interface DleqProof {
  bitcoinPubKey: string;
  moneroPubKey: string;
  proof: string;
}

/* tslint:disable */
/* eslint-disable */
/**
* Generate a DLEQ proof
*
* Generate a DLEQ proof that a private key `moneroPrivateKey` on Ed25519 curve is the same as a private key on Secp256k1 curve
* # Arguments
* * `moneroPrivateKey` private key on Ed25519 curve
* # Returns
* * `dleqProof` DLEQ proof, containing the proof and the public keys on both curves
* @param {string} moneroPrivateKey
* @returns {DleqProof}
*/
export const getDleqProof = (privateKey: string): DleqProof => {
  const wasmProof = _getDleqProof(privateKey);
  return {
    bitcoinPubKey: wasmProof.bitcoinPubKey,
    moneroPubKey: wasmProof.moneroPubKey,
    proof: wasmProof.proof,
  };
}

/**
* Verify a DLEQ proof
*
* Verify that two public keys on different curves are derived from the same private key given `proof`
* # Arguments
* * `dleqProof` DLEQ proof, containing the proof and the public keys on both curves
* # Returns
* * `true` if the proof is valid, `false` otherwise
* @param {DleqProof} dleqProof
* @returns {boolean}
*/
export const verifyDleqProof = (proof: DleqProof): boolean => {
  const wasmProof = new _DleqProof(proof.proof, proof.bitcoinPubKey, proof.moneroPubKey);
  return _verifyDleqProof(wasmProof);
};

/**
* Generate a random monero private key
* # Returns
* * `moneroPrivKey` private key on Ed25519 curve
* @returns {string}
*/
export { getRandomMoneroPrivKey } from "dleq-tools";
/**
* Add two monero private keys
* # Returns
* * `moneroPrivKey` private key on Ed25519 curve
* @param {string} privKeyA
* @param {string} privKeyB
* @returns {string}
*/
export { addMoneroPrivKeys } from "dleq-tools";
/**
* Get the monero public key from a monero private key
* # Arguments
* * `moneroPrivKey` private key on Ed25519 curve
* # Returns
* * `moneroPubKey` public key corresponding to the private key on Ed25519 curve
* @param {string} moneroPrivKey
* @returns {string}
*/
export { getMoneroPubKey } from "dleq-tools";
/**
* Add two monero public keys
* # Returns
* * `moneroPubKey` public key corresponding to the sum of the two public keys on Ed25519 curve
* @param {string} pubKeyA
* @param {string} pubKeyB
* @returns {string}
*/
export { addMoneroPubKeys } from "dleq-tools";

import { getMoneroAddress as _getMoneroAddress } from "dleq-tools";
/**
* Create an standard address which is valid on the given network.
*
* # Arguments
* * `network` - The network to create the address for.
* * `pubKeySpend` - The public spend key.
* * `pubKeyView` - The public view key.
*
* # Returns
* * `Address` - The standard address.
* @param {string} network
* @param {string} pubKeySpend
* @param {string} pubKeyView
* @returns {string}
*/
export const getMoneroAddress = (network: string | "mainnet" | "testnet" | "stagenet", pubKeySpend: string, pubKeyView: string): string => {
  return _getMoneroAddress(network, pubKeySpend, pubKeyView);
}

/**
* Generate a random bitcoin private key
* # Returns
* * `bitcoinPrivKey` private key on Secp256k1 curve
* @returns {string}
*/
export { getRandomBitcoinPrivKey } from "dleq-tools";
/**
* Get the bitcoin public key from a bitcoin private key
* # Arguments
* * `bitcoinPrivKey` private key on Secp256k1 curve
* # Returns
* * `bitcoinPubKey` public key corresponding to the private key on Secp256k1 curve
* @param {string} bitcoinPrivKey
* @returns {string}
*/
export { getBitcoinPubKey } from "dleq-tools";
/**
* Convert a monero private key to a bitcoin private key
* # Arguments
* * `moneroPrivkey` private key on Ed25519 curve
* # Returns
* * `bitcoinPrivKey` private key on Secp256k1 curve
* @param {string} moneroPrivkey
* @returns {string}
*/
export { toBitcoinPrivKey } from "dleq-tools";
/**
* Convert a bitcoin private key to a monero private key
* # Arguments
* * `bitcoinPrivKey` private key on Secp256k1 curve
* # Returns
* * `moneroPrivKey` private key on Ed25519 curve
* @param {string} bitcoinPrivKey
* @returns {string}
*/
export { toMoneroPrivKey } from "dleq-tools";
/**
* Decrypt an adaptor signature.
* # Arguments
* * `privKey` private key of the verifier
* * `adaptorSignature` encrypted adaptor signature
* # Returns
* * `signature` decrypted signature which can be verified with `verifyEncryptedSignature`.
* `recoverPrivateKey` can be used to recover the private key from the signature.
* @param {string} privKey
* @param {string} adaptorSignature
* @returns {string}
*/
export { decryptSignature } from "dleq-tools";
/**
* Verify an adaptor signature.
* # Arguments
* * `verificationPubKey` public key of the verifier
* * `pubKey` public key of the signer who produced this signature for verifier
* * `digest` message digest
* * `adaptorSig` encrypted adaptor signature
* # Returns
* * `true` if the signature is valid, `false` otherwise
* @param {string} verificationPubKey
* @param {string} pubKey
* @param {string} digest
* @param {string} adaptorSig
* @returns {boolean}
*/
export { verifyEncryptedSignature } from "dleq-tools";
/**
* Recover the private key from an adaptor signature
*
* Recover the private key from an adaptor signature `adaptorSig` for a counterparty holding `pubKey` using `dataSig`.
* # Arguments
* * `pubKey` public key of the counterparty
* * `sig` signature decrypted from `adaptorSig` with `decryptSignature`
* * `adaptorSig` encrypted adaptor signature
* # Returns
* * `privKey` private key recovered from the adaptor or empty string if the `sig` and `adaptorSig` are not related
* @param {string} pubKey
* @param {string} sig
* @param {string} adaptorSig
* @returns {string}
*/
export { recoverPrivateKey } from "dleq-tools";
/**
* Create an encryted signature A.K.A. "adaptor signature"
*
* Create an adaptor signature of a message `digest` for a counterparty holding `pubKey` using signer's `privKey`.
*
* # Arguments
* * `privKey` private key of the signer
* * `pubKey` public key of the counterparty
* * `digest` message digest
*
* # Returns
* * `encsig` encrypted signature
* @param {string} privKey
* @param {string} pubKey
* @param {string} digest
* @returns {string}
*/
export { makeAdaptorSignature } from "dleq-tools";
/**
* Make an ECDSA DER signature
*
* Make an ECDSA DER signature of a message `digest` using signer's `privKey`.
* # Arguments
* * `privKey` private key of the signer
* * `digest` message digest
* # Returns
* * `sig` ECDSA DER signature
* @param {string} privKey
* @param {string} digest
* @returns {string}
*/
export { sign } from "dleq-tools";
