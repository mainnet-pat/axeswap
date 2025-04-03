import { createRelayNode } from "../src/relay";
import { createNode, ObjectToPeerId, P2pTransport, PeerIdToObject } from "../src/p2ptransport";
import { createEd25519PeerId } from "@libp2p/peer-id-factory";
import { Orderbook } from "../src/orderbook";

class AliceP2pTransport extends P2pTransport {}
class BobP2pTranstport extends P2pTransport {}
class CharlieP2pTranstport extends P2pTransport {}

describe("p2p", () => {
  test("PeerId serialization", async () => {
    const node = await createNode();

    const peerId = PeerIdToObject(node.peerId);

    const otherNode = await createNode(await ObjectToPeerId(peerId));

    expect(node.peerId.toString()).toEqual(otherNode.peerId.toString());

    expect(node.peerId.toString()).toEqual(peerId.id);
  });

  test("both parties connect to each other", async () => {
    // not initialized
    {
      const relay = await createRelayNode();
      await relay.start();
  
      const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relay.getMultiaddrs().map(ma => ma.toString()));
      await alice.init();

      const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relay.getMultiaddrs().map(ma => ma.toString()));
      await bob.init();

      const swapId = await alice.connect(bob.getMultiaddrs());
      const swapId2 = await bob.connect(alice.getMultiaddrs());
      expect(swapId).toEqual(swapId2);
    }

    // initialized by maker
    {
      const relay = await createRelayNode();
      await relay.start();
  
      const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relay.getMultiaddrs().map(ma => ma.toString()));
      await alice.init();

      const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relay.getMultiaddrs().map(ma => ma.toString()));
      bob.swapId = "test";
      await bob.init();

      const swapId = await alice.connect(bob.getMultiaddrs());
      const swapId2 = await bob.connect(alice.getMultiaddrs());
      expect(swapId).toEqual(swapId2);
      expect(swapId).toEqual("test");
    }

    // initialized by taker
    {
      const relay = await createRelayNode();
      await relay.start();
  
      const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relay.getMultiaddrs().map(ma => ma.toString()));
      alice.swapId = "test";
      await alice.init();

      const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relay.getMultiaddrs().map(ma => ma.toString()));
      bob.swapId = "test2";
      await bob.init();

      await expect(alice.connect(bob.getMultiaddrs())).rejects.toThrow("SwapId mismatch");
    }

    // initialized by both, restoring session
    {
      const relay = await createRelayNode();
      await relay.start();

      const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relay.getMultiaddrs().map(ma => ma.toString()));
      alice.swapId = "test";
      await alice.init();

      const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relay.getMultiaddrs().map(ma => ma.toString()));
      bob.swapId = "test";
      await bob.init();

      const swapId = await alice.connect(bob.getMultiaddrs());
      const swapId2 = await bob.connect(alice.getMultiaddrs());
      expect(swapId).toEqual(swapId2);
      expect(swapId).toEqual("test");
    }
  });

  test("p2p relayed session, 1 relay", async () => {
    const relay = await createRelayNode();
    await relay.start();

    const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relay.getMultiaddrs().map(ma => ma.toString()));
    await alice.init();
    console.log("alice", alice.swapId)

    const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relay.getMultiaddrs().map(ma => ma.toString()));
    await bob.init();
    console.log("bob", bob.swapId)
    const swapId = await alice.connect(bob.getMultiaddrs());
    console.log(swapId, alice.swapId, bob.swapId)

    await alice.send("Bob", {
      hello: "world"
    });

    expect(await bob.await("Bob")).toMatchObject({
      hello: "world"
    });

    await alice.send("Bob2", {
      hello: "world"
    });

    expect(await bob.await("Bob2")).toMatchObject({
      hello: "world"
    });
  });

  test("p2p relayed session, N relays", async () => {
    const relays = await Promise.all([createRelayNode(), createRelayNode(), createRelayNode()]);
    await Promise.all(relays.map(relay => relay.start()));
    const relayMultiaddrs = relays.map(relay => relay.getMultiaddrs().map(ma => ma.toString())).flat();

    const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relayMultiaddrs);
    await alice.init();

    const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relayMultiaddrs);
    await bob.init();
    expect(JSON.stringify(alice.getMultiaddrs())).not.toEqual(JSON.stringify(bob.getMultiaddrs()));

    const swapId = await alice.connect(bob.getMultiaddrs());

    await alice.send("Bob", {
      hello: "world"
    });

    expect(await bob.await("Bob")).toMatchObject({
      hello: "world"
    });

    await alice.send("Bob2", {
      hello: "world"
    });

    expect(await bob.await("Bob2")).toMatchObject({
      hello: "world"
    });
  });

  test("p2p new session", async () => {
    const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await alice.init();
    const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await bob.init();
    const swapId = await alice.connect(bob.getMultiaddrs());

    await alice.send("Bob", {
      hello: "world"
    });

    expect(await bob.await("Bob")).toMatchObject({
      hello: "world"
    });

    await alice.send("Bob2", {
      hello: "world"
    });

    expect(await bob.await("Bob2")).toMatchObject({
      hello: "world"
    });
  });

  test("p2p bob first", async () => {
    const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await alice.init();
    const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await bob.init();
    const swapId = await alice.connect(bob.getMultiaddrs());

    await bob.send("Bob", {
      hello: "world"
    });
    expect(await alice.await("Bob")).toMatchObject({
      hello: "world"
    });
    await bob.send("Bob2", {
      hello: "world"
    });

    expect(await alice.await("Bob2")).toMatchObject({
      hello: "world"
    });
  });

  test("p2p restore session", async () => {
    const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await alice.init();
    const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await bob.init();
    const swapId = "test";
    await alice.connect(bob.getMultiaddrs(), swapId);

    await alice.send("Bob", {
      hello: "world"
    });

    expect(await bob.await("Bob")).toMatchObject({
      hello: "world"
    });

    await bob.close();
    const charlie = new CharlieP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await charlie.init();
    await charlie.connect(alice.getMultiaddrs(), swapId);
    expect(await charlie.await("Bob")).toMatchObject({
      hello: "world"
    });
  });

  test("p2p interrupted session", async () => {
    const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await alice.init();
    const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await bob.init();
    const swapId = "test";
    await alice.connect(bob.getMultiaddrs(), swapId);
    await bob.close();

    alice.send("Bob", {
      hello: "world"
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const charlie = new CharlieP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await charlie.init();
    await charlie.connect(alice.getMultiaddrs(), swapId);

    expect(await charlie.get("Bob")).toBeUndefined();
    expect(await charlie.request("Bob")).toMatchObject({
      hello: "world"
    });

    expect(await charlie.get("Bob")).toMatchObject({
      hello: "world"
    });
  });

  test("p2p new connection won't redefine session", async () => {
    const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await alice.init();
    const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await bob.init();
    const swapId = "test";
    await alice.connect(bob.getMultiaddrs(), swapId);
    await bob.close();

    await alice.send("Bob", {
      hello: "world"
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const charlie = new CharlieP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await charlie.init();
    await charlie.connect(alice.getMultiaddrs(), "some other swap id");

    expect(alice.swapId).toBe(swapId);
    expect(charlie.swapId).toBe("some other swap id");
    expect(await charlie.get("Bob")).toBeUndefined();
    expect(await charlie.request("Bob")).toMatchObject({
      hello: "world"
    });
  });

  test("1 alice 2 bobs, same swapId", async () => {
    const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await alice.init();
    const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await bob.init();
    const swapId = await alice.connect(bob.getMultiaddrs());

    const bob2 = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1", bob.peerId);
    await bob2.init();
    await bob2.connect(alice.getMultiaddrs(), swapId);

    await alice.send("Bob", {
      hello: "world"
    });

    expect(await bob.await("Bob")).toMatchObject({
      hello: "world"
    });

    expect(await bob2.await("Bob")).toMatchObject({
      hello: "world"
    });

    await bob2.send("Bob2", {
      hello: "world"
    });

    expect(await alice.await("Bob2")).toMatchObject({
      hello: "world"
    });

    expect(await bob.await("Bob2")).toMatchObject({
      hello: "world"
    });
  });

  test("1 alice 2 bobs, same swapId", async () => {
    const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await alice.init();
    const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await bob.init();
    const swapId = await alice.connect(bob.getMultiaddrs());

    const bob2 = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1", bob.peerId);
    await bob2.init();
    await bob2.connect(alice.getMultiaddrs(), swapId);

    await alice.send("Bob", {
      hello: "world"
    });

    expect(await bob.await("Bob")).toMatchObject({
      hello: "world"
    });

    expect(await bob2.await("Bob")).toMatchObject({
      hello: "world"
    });

    await bob2.send("Bob2", {
      hello: "world"
    });

    expect(await alice.await("Bob2")).toMatchObject({
      hello: "world"
    });

    expect(await bob.await("Bob2")).toMatchObject({
      hello: "world"
    });
  });

  test("reject 3rd party", async () => {
    const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await alice.init();
    const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1");
    await bob.init();
    const swapId = await alice.connect(bob.getMultiaddrs());

    const charlie = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1", bob.peerId);
    await charlie.init();
    await charlie.connect(alice.getMultiaddrs());
  });

  test("p2p relayed session, N relays, only peerids", async () => {
    const relays = await Promise.all([createRelayNode(), createRelayNode(), createRelayNode()]);
    await Promise.all(relays.map(relay => relay.start()));
    const relayMultiaddrs = relays.map(relay => relay.getMultiaddrs().map(ma => ma.toString())).flat();

    const alice = new AliceP2pTransport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relayMultiaddrs);
    await alice.init();

    const bob = new BobP2pTranstport("/ATOMIC-SWAP/XMR-BCH/0.4.1", undefined, relayMultiaddrs);
    await bob.init();
    expect(JSON.stringify(alice.getMultiaddrs())).not.toEqual(JSON.stringify(bob.getMultiaddrs()));

    const swapId = await alice.connect(bob.peerId!.toString());

    await alice.send("Bob", {
      hello: "world"
    });

    expect(await bob.await("Bob")).toMatchObject({
      hello: "world"
    });

    await alice.send("Bob2", {
      hello: "world"
    });

    expect(await bob.await("Bob2")).toMatchObject({
      hello: "world"
    });
  });
})