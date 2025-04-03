
import { getLockingBytecode, getSwapLockArtifact, getSwapLockArtifactCashtokens } from "../src/utils";
import { RegTestWallet } from "mainnet-js";
import { toBitcoinPrivKey, getBitcoinPubKey } from "dleq-tools";
import { binToHex } from "@bitauth/libauth";


describe(`SwaplockV4.1`, () => {
  test("SwaplockV4.1", async () => {
    // prepare Alice's BCH wallet
    const bchAlice = await RegTestWallet.fromWIF("cVN8F5uy3fnHbyxmA7VnsXZUqTjZLZJc6hEwQy7JDYtBPKpsxu6P");

    // prepare Alice's BCH wallet
    const bchBob = await RegTestWallet.fromWIF("cMpKjWabBLAJJrQ4VF2zvzvEvYoxrJCsehARXCVNi8zJ7TbrFQwS");

    const bSpendMonero = "6b50748bd8714d7e9b21097d45605346ab7fdb5553e7c90b8dc82864df1d840b";
    const bBitcoin = toBitcoinPrivKey(bSpendMonero);
    const bPubBitcoin = getBitcoinPubKey(bBitcoin);

    // replace placeholders in artifact
    const parameters = {
      mining_fee: 1000n,
      out_1: binToHex(getLockingBytecode(bchAlice.publicKeyHash!)),
      public_key: bPubBitcoin,
      timelock: 10n,
      out_2: binToHex(getLockingBytecode(bchBob.publicKeyHash!)),
    }
    const artifact = getSwapLockArtifact(parameters);

    expect(artifact.bytecode).toBe("OP_TXINPUTCOUNT OP_1 OP_NUMEQUALVERIFY OP_TXOUTPUTCOUNT OP_1 OP_NUMEQUALVERIFY e803 OP_0 OP_UTXOVALUE OP_0 OP_OUTPUTVALUE OP_SUB OP_NUMEQUALVERIFY OP_0 OP_INPUTSEQUENCENUMBER OP_NOTIF 76a914ffb62bdf8787cbc1942f7c8de3a52bc4c1d1137188ac OP_0 OP_OUTPUTBYTECODE OP_OVER OP_EQUALVERIFY 0207f66bacc4259e498aae9d110232362c503cf10cb02a8faf55b5d614ce040143 OP_CHECKDATASIG OP_ELSE 0a OP_CHECKSEQUENCEVERIFY OP_DROP 76a914bdb99e09843ded529588ccabfbd67a0fd96fc55488ac OP_0 OP_OUTPUTBYTECODE OP_EQUAL OP_ENDIF");
  });

  test("SwaplockV4.1 Cashtokens", async () => {
    // prepare Alice's BCH wallet
    const bchAlice = await RegTestWallet.fromWIF("cVN8F5uy3fnHbyxmA7VnsXZUqTjZLZJc6hEwQy7JDYtBPKpsxu6P");

    // prepare Alice's BCH wallet
    const bchBob = await RegTestWallet.fromWIF("cMpKjWabBLAJJrQ4VF2zvzvEvYoxrJCsehARXCVNi8zJ7TbrFQwS");

    const bSpendMonero = "6b50748bd8714d7e9b21097d45605346ab7fdb5553e7c90b8dc82864df1d840b";
    const bBitcoin = toBitcoinPrivKey(bSpendMonero);
    const bPubBitcoin = getBitcoinPubKey(bBitcoin);

    // replace placeholders in artifact
    const parameters = {
      mining_fee: 1000n,
      out_1: binToHex(getLockingBytecode(bchAlice.publicKeyHash!)),
      public_key: bPubBitcoin,
      timelock: 10n,
      out_2: binToHex(getLockingBytecode(bchBob.publicKeyHash!)),
    }
    const artifact = getSwapLockArtifactCashtokens(parameters);

    expect(artifact.bytecode).toBe("OP_TXINPUTCOUNT OP_1 OP_NUMEQUALVERIFY OP_TXOUTPUTCOUNT OP_1 OP_NUMEQUALVERIFY e803 OP_0 OP_UTXOVALUE OP_0 OP_OUTPUTVALUE OP_SUB OP_NUMEQUALVERIFY OP_0 OP_UTXOTOKENCATEGORY OP_0 OP_OUTPUTTOKENCATEGORY OP_EQUALVERIFY OP_0 OP_UTXOTOKENCOMMITMENT OP_0 OP_OUTPUTTOKENCOMMITMENT OP_EQUALVERIFY OP_0 OP_UTXOTOKENAMOUNT OP_0 OP_OUTPUTTOKENAMOUNT OP_NUMEQUALVERIFY OP_0 OP_INPUTSEQUENCENUMBER OP_NOTIF 76a914ffb62bdf8787cbc1942f7c8de3a52bc4c1d1137188ac OP_0 OP_OUTPUTBYTECODE OP_OVER OP_EQUALVERIFY 0207f66bacc4259e498aae9d110232362c503cf10cb02a8faf55b5d614ce040143 OP_CHECKDATASIG OP_ELSE 0a OP_CHECKSEQUENCEVERIFY OP_DROP 76a914bdb99e09843ded529588ccabfbd67a0fd96fc55488ac OP_0 OP_OUTPUTBYTECODE OP_EQUAL OP_ENDIF");
  });
});
