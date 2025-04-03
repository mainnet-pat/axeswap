import { createRelayNode } from "../src/relay.js";
import { Orderbook } from "../src/orderbook.js";
import { OrderSubmission } from "../src/interfaces.js";

describe("orderbook", () => {
  it("orderbook", async () => {
    const relayNode = await createRelayNode();
    await relayNode.start();

    const orderbook1 = new Orderbook("XMR", "BCH", "0.4.1", relayNode.getMultiaddrs().map(ma => ma.toString()));
    await orderbook1.init();

    const orderbook2 = new Orderbook("XMR", "BCH", "0.4.1", relayNode.getMultiaddrs().map(ma => ma.toString()));
    await orderbook2.init();

    let seenRawEvent = false;
    let seenAddEvent = false;
    let seenRemoveEvent = false;
    let seenTakenEvent = false;
    orderbook2.addEventListener("rawEvent", () => {
      seenRawEvent = true;
    });
    orderbook2.addEventListener("orderAdded", () => {
      seenAddEvent = true;
    });
    orderbook2.addEventListener("orderRemoved", () => {
      seenRemoveEvent = true;
    });
    orderbook1.addEventListener("orderTaken", ({detail: {multiaddr}}) => {
      expect(multiaddr).toBe(orderbook2.node.peerId.toString());
      seenTakenEvent = true;
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const order: OrderSubmission = {
      amountA: 1n,
      amountB: 1n,
      expiresAt: Date.now() + 3 * 1000
    };

    const orderId = await orderbook1.add(order);

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(orderbook2.orders[orderId]).toMatchObject(order);
    expect(orderbook1.orders[orderId]).toMatchObject(order);
    expect(orderbook1.orders[orderId].isMine).toBe(true);
    expect(orderbook2.orders[orderId].isMine).toBeFalsy();

    await orderbook2.remove([orderId]);
    expect(orderbook2.orders[orderId]).toMatchObject(order);
    expect(orderbook1.orders[orderId]).toMatchObject(order);

    await orderbook1.remove([orderId]);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(orderbook1.orders[orderId]).toBeUndefined();
    expect(orderbook2.orders[orderId]).toBeUndefined();

    const orderId2 = await orderbook1.add(order);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(orderbook2.orders[orderId2]).toMatchObject(order);
    expect(orderbook1.orders[orderId2]).toMatchObject(order);

    const ids = await orderbook1.replace([orderId2], [order, order]);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(orderbook2.orders[ids[1]]).toMatchObject(order);
    expect(orderbook1.orders[ids[1]]).toMatchObject(order);

    await new Promise(resolve => setTimeout(resolve, 3100));
    expect(orderbook2.orders[ids[1]]).toBeUndefined();
    expect(orderbook1.orders[ids[1]]).toBeUndefined();


    // taken event
    order.expiresAt = Date.now() + 3 * 1000;
    const id = await orderbook1.add(order);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(orderbook2.orders[id]).toMatchObject(order);
    expect(orderbook1.orders[id]).toMatchObject(order);
    await orderbook2.take(id);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(orderbook1.orders[id]).toBeUndefined();

    expect(seenRawEvent).toBe(true);
    expect(seenAddEvent).toBe(true);
    expect(seenRemoveEvent).toBe(true);
    expect(seenTakenEvent).toBe(true);

    await orderbook1.stop();
    await orderbook2.stop();
  });
});
