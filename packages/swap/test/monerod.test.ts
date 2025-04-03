import { createWalletFull, MoneroNetworkType, MoneroWalletKeys, connectToWalletRpc } from "monero-ts";
import { getRegtestFundingWallet, getHeight, mineBlocks, syncWallet } from "../src/monerod";
import { getRandomMoneroPrivKey } from "../src/dleq-tools";
import fs from "fs";

describe(`monerod`, () => {
  // test("wallet", async () => {
  //   // await fs.promises.writeFile("asdf", "asdf");
  //   // console.log(await (fs as any).readFile("asdf"));
  //   // return
  //   // const wallet = await getRegtestFundingWallet();
  //   // await wallet.sync();
  //   // console.log(await wallet.getPrimaryAddress());
  //   // getRandomMoneroPrivKey();

  //   let walletRpc = await connectToWalletRpc("http://localhost:18085");
  //   const walelt = await walletRpc.createWallet({
  //     path: "wallet4",
  //     password: "password",
  //   });
  //   console.log(await walelt.getBalance())

  // });

  test("mine", async () => {
    // const mainnetAddr = "462phZcgVSjBon2t1vAMFX3GPu2BHNSzPeGjFowLeadaidLLWKW3NUYGs8KXRMZuLQMeMTtufVxWiJvnQUAr1KAtPKTCJ4p";
    const testnetAddr = "9waNBpGwmoqBon2t1vAMFX3GPu2BHNSzPeGjFowLeadaidLLWKW3NUYGs8KXRMZuLQMeMTtufVxWiJvnQUAr1KAtPGAojsj";
    await mineBlocks(testnetAddr, 30);
  });
});
