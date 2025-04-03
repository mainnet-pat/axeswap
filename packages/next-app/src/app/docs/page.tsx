import { Crumbs } from "@/components/Crumbs";

export default function DocsPage() {
  return (
    <>
      <Crumbs value={[
        { href: "/docs", title: "Documentation", collapsible: false },
      ]} />
      <div className="flex flex-col items-center justify-center w-full h-full mx-auto max-w-[95%] md:max-w-[85%] pb-10">
        <div className="">
          <h1 className="text-3xl font-bold">Documentation</h1>
          <p className="mt-2">AxeSwap is a platform for decentralized orderbook trading.</p>
          <p className="mt-2">It allows users to swap Monero and Bitcoin Cash in a trustless manner.</p>
          <p className="mt-2">Atomic swaps are a special kind of coin exchange where coins are transferred to special addresses or contracts no 3rd party could have access to.</p>

          <h1 className="text-2xl font-bold mt-4">How it works</h1>
          <p className="mt-2">
            Swaps between Monero and BCH are possible using DLEQ proofs and adaptor signatures.
            These are needed to prove that the private keys on Monero's Ed25519 Elliptic Curve and Bitcoin's Secp256k1 are the same.
            On Monero side, funds are sent to a special address, private and public keys of which are the combination of the private keys of swap participants (Alice on the Monero and Bob on the Bitcoin Cash blockchains).
            To unlock these funds and get them in his possession, Bob needs Alice to leak her key to Bob.
            This happens when Alice spends a smart contract prepared for her on the Bitcoin Cash blockchain where Bob locks his BCH.
            To spend this contract, Alice needs to sign a message using her private key in a special way - producing an adaptor signature.
            This signature can be decrypted exclusively by Bob to reveal Alice's private key.
            Bob then gains the second part of the Monero swaplock private key and is able to sweep the XMR into his possession.
          </p>

          <h1 className="text-2xl font-bold mt-4">How to swap</h1>
          <p className="mt-2">
            There are two roles in every swap - maker and taker.
            Maker creates a limit order by specifying the amount of BCH and XMR he wants to swap.
            The order is then broadcast to a P2P network of peers listening to orderbook events.
            Taker observes the order and decides to take it if the price delta is acceptable for them.
            A negative price delta indicates that the taker is getting a better price than the market price.
            A positive price delta indicates that the taker is paying a premium for the swap.
            Price delta around 0% indicates the fair market price.
            Once the order is taken, the maker and taker are connected and can start the swap process.
            Both will be presented the swap status page where they can see the progress of the swap and take actions when requested.
            <br />
            <br />
            Typical swap duration is around 20-25 minutes (2 BCH blocks and 10 Monero blocks).
            <br />
            Both parties need to be online at 2 critical moments of message exchange via p2p network - these are right at the beginning of the swap and after 5 XMR confirmations.
          </p>

          <h1 className="text-2xl font-bold mt-4">Fees</h1>
          <p>
            There are no platform fees and no 3rd party in the swap process.
            <br />
            Network fees are paid by the participants of the swap.
          </p>

          <h1 className="text-2xl font-bold mt-4">How to test on testnets</h1>
          <p className="mt-2">
            To test the app on testnets you need to obtain some testnet coins.
            <br />
            You can use the <a className="text-blue-500" href="https://featherwallet.org">Feather Wallet</a> to create a testnet wallet and get the coins transferred there. Launch it with "--testnet" flag.
            <br />
            There are no testnet faucets for Monero, but you can ask for testnet coins in Matrix <a className="text-blue-500" href="https://matrix.to/#/#monero:monero.social">https://matrix.to/#/#monero:monero.social</a>.
            <br />
            <br />
            You can use the <a className="text-blue-500" href="https://electroncash.org">Electron Cash</a> to create a testnet wallet and get the coins transferred there. Launch it with "--chipnet" flag.
            <br />
            There is a BCH faucet to get some testnet coins <a className="text-blue-500" href="https://tbch.googol.cash">https://tbch.googol.cash</a>. Select "chipnet" testnet and click "Get coins".
          </p>

          <h1 className="text-2xl font-bold mt-4">How to test locally</h1>
          <p className="mt-2">
            To test the app locally you need to clone the repository and run the following commands:
          </p>
          <pre>git clone https://github.com/mainnet-pat/bch-xmr-swap.git</pre>
          <pre>cd bch-xmr-swap/packages/swap</pre>
          <pre>docker compose up -d</pre>
          <p>
            This will start the Monero and Bitcoin Cash nodes in regtest mode.
            <br />
            <br />
            After that you need to run the following commands in the root of the project:
          </p>
            <pre>cd packages/next-app</pre>
            <pre>yarn install</pre>
            <pre>yarn dev</pre>
          <p>
            <br />
            This will start the Next.js app in development mode.
            <br />
            After that you can open the app in your browser at <a className="text-blue-500" href="http://localhost:3000">http://localhost:3000</a>.
            <br /><br />
            In the app you can create a swap for a regtest pair.
            The swap status page will display debug tooling to fund the swaplocks and mine blocks to advance the swap process.
            <br />
            Do not initiate a swap in two different tabs for the maker and taker. Either use incognito mode or two different browsers.
          </p>
        </div>
      </div>
    </>
  );
}