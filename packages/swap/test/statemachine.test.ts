import { StateMachine } from "../src/StateMachine/stateMachine";
import { LocalTransport } from "../src/transport";

describe(`statemachine`, () => {
  test("statemachine", async () => {
    const fooState = {
      asset: "XMR:native" as const,
      targetAsset: "BCH:native" as const,
      version: "0.4.1",
      relayMultiaddrs: [],
      orderbookId: "bar",
      swapId: "baz",
      currentState: "exec",
      logs: [],
    };
    const stateMachine = new StateMachine(fooState, new LocalTransport());
    expect(stateMachine.state.currentState).toEqual(fooState.currentState);
    try {
      stateMachine.failWithReason("Failed to connect to peer, they appear to be offline");
    } catch {}
    expect(stateMachine.state.error).not.toBeUndefined();
    expect(stateMachine.state.currentState).toEqual(fooState.currentState);

    await stateMachine.resume();
    expect(stateMachine.state.error).not.toBeUndefined();

    await stateMachine.resume(true);
    console.log(stateMachine.state);
    expect(stateMachine.state.error).toBeUndefined();
  });
});