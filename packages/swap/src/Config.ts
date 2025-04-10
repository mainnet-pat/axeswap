// import { SwapInitState } from "./StateMachine/bch-xmr-0.4.1";

// keys are asset1:asset2/version where assets are sorted alphabetically
export const Config: Record<string, any> = {
  "BCH:native-XMR:native/0.4.1": {
    xmrRpc: "https://xmr.salami.network",
    bchRpc: "wss://bch.imaginary.cash:50004",
    xmrNetwork: "mainnet",
    bchNetwork: "mainnet",
    miningFee: BigInt(700),
    timelock1: 2,
    timelock2: 5,
    // asset: "XMR:native",
    // targetAsset: "BCH:native",
    version: "0.4.1",
  },
  "tBCH:native-tXMR:native/0.4.1": {
    xmrRpc: "https://testnet.xmr.ditatompel.com",
    bchRpc: "wss://chipnet.imaginary.cash:50004",
    xmrNetwork: "testnet",
    bchNetwork: "chipnet",
    miningFee: BigInt(700),
    timelock1: 2,
    timelock2: 5,
    // asset: "tXMR:native",
    // targetAsset: "tBCH:native",
    version: "0.4.1",
  },
  "rBCH:native-rXMR:native/0.4.1": {
    xmrRpc: "http://localhost:28081",
    bchRpc: "ws://localhost:60003",
    xmrNetwork: "testnet",
    bchNetwork: "regtest",
    miningFee: BigInt(700),
    timelock1: 2,
    timelock2: 5,
    // asset: "rXMR:native",
    // targetAsset: "rBCH:native",
    version: "0.4.1",
  },
}