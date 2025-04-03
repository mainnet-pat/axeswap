// let fetch = global.fetch;
// import { Wallet } from "mainnet-js";
// global.fetch = fetch;
// const alice = await Wallet.newRandom();

// console.log(binToHex(alice.privateKey!), binToHex(alice.publicKeyCompressed!));

const privkeyHex = "9ac541f8277d5208d18174ef250644b080a7cebf3feb423681d7b1fc2be2d87a"
const pubkeyHex = "02151f141aa73ee2073da862879cb5947ef9d90f71f771ceba9a3008aa1ed8cf39"

import { getRandomMoneroPrivKey, getDleqProof, 
  makeAdaptorSignature, recoverPrivateKey, decryptSignature, toBitcoinPrivKey
} from "dleq-tools";
import { Contract, MockNetworkProvider, randomUtxo } from "cashscript";
import { compileFile } from "cashc";
import { MoneroWalletKeys, MoneroNetworkType } from "monero-ts";
import { hexToBin, binToHex, encodePrivateKeyWif, sha256, instantiateSecp256k1 } from "@bitauth/libauth";

// let fetch = global.fetch;
let crypto = globalThis.crypto;
const { Wallet } = await import("mainnet-js");
globalThis.crypto = crypto;
// global.fetch = fetch;

// const alice = await Wallet.newRandom();
// const bob = await Wallet.newRandom();

const s_a = getRandomMoneroPrivKey();
const s_b = getRandomMoneroPrivKey();
const a = toBitcoinPrivKey(s_a);
const b = toBitcoinPrivKey(s_b);

// const { Wallet } = await import("mainnet-js");


const moneroAlice = await MoneroWalletKeys.createWallet({
  // path: "sample_wallet_full",
  // password: "supersecretpassword123",
  networkType: MoneroNetworkType.MAINNET,
  server: "http://localhost:18085",
}) as MoneroWalletKeys;

// console.log(await moneroAlice.getPublicViewKey());

await moneroAlice.getPrivateViewKey();


const getLockingBytecode = (pubkeyHash: Uint8Array) => {
  return Uint8Array.from([...hexToBin("76a914"), ...pubkeyHash, ...hexToBin("88ac")]);
}

// const alice = await Wallet.fromWIF(encodePrivateKeyWif(hexToBin(a), "mainnet"));
// const bob = await Wallet.fromWIF(encodePrivateKeyWif(hexToBin(b), "mainnet"));

const { bitcoinPubKey: S_a_bitcoin } = getDleqProof(s_a);
const { bitcoinPubKey: S_b_bitcoin } = getDleqProof(s_b);

const myWallet = await Wallet.fromWIF("KwwqqW7xSR5XdRAFuJdF6bitTF4p4Wvsfa89j1dnSnQ7d82yqSxU");

          const aliceLockingBytecode = getLockingBytecode(myWallet.publicKeyHash!);

          const encsig = makeAdaptorSignature(b, S_a_bitcoin, binToHex(sha256.hash(aliceLockingBytecode)));
          const sig = decryptSignature(a, encsig);
          // console.log(111, sig, decryptSignature(a, encsig));

          const recovered = recoverPrivateKey(S_b_bitcoin, sig, encsig);

          console.trace(111, recovered, b);



          // const refund_recovered = recover(S_b_bitcoin, sign(binToHex(alice.privateKey!), digest), makeAdaptorSignature(binToHex(alice.privateKey!), S_b_bitcoin, digest));

          // console.log(refund_recovered);


          // const aliceWallet = await Wallet.newRandom();
          // const bobWallet = await Wallet.newRandom();

          const artifact = compileFile("swaplock.cash");
          const provider = new MockNetworkProvider();
          // const provider = undefined;
          const contract = new Contract(artifact, [
            1000n,
            aliceLockingBytecode,
            S_b_bitcoin,
            100000n,
            aliceLockingBytecode,
          ], { provider });

          // await myWallet.sendMax(contract.address);
          provider.addUtxo(contract.address, randomUtxo({ satoshis: 100000n }));
          const balance = await contract.getBalance();

          const bobWallet = await Wallet.fromWIF(encodePrivateKeyWif(hexToBin(b), "mainnet"));
          console.log(binToHex(bobWallet.publicKeyCompressed!), S_b_bitcoin)

          const secp256k1 = await instantiateSecp256k1();
          const der = secp256k1.signMessageHashDER(hexToBin(b), sha256.hash(aliceLockingBytecode));
          if (typeof der === "string") {
            throw der;
          }


          // const bobsig = sign(b, binToHex(sha256.hash(aliceLockingBytecode)));
          // console.log(bobsig, der, secp256k1.signMessageHashDER(hexToBin(b), sha256.hash(aliceLockingBytecode)).length);

          console.log(secp256k1.verifySignatureDERLowS(der, hexToBin(S_b_bitcoin), sha256.hash(aliceLockingBytecode)));

          console.log(binToHex(der));
          const tx = await contract.functions.SwapOrForwardToRefund(der).to(myWallet.address!, balance - 1000n).withoutChange().withAge(0).build();
          console.log(tx);
          const result = await contract.functions.SwapOrForwardToRefund(der).to(myWallet.address!, balance - 1000n).withoutChange().withAge(0).send();

          console.log(result);

          process.exit(0);