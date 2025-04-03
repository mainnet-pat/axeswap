import { LocalTransport } from "../src/transport";

describe(`transport`, () => {
  test("transport", async () => {
    const transport = new LocalTransport();
    await expect(transport.await("test", 10)).rejects.toThrow("Timeout");

    let value = "";
    transport.await("test", 10000).then(val => value = val);
    await transport.send("test", "value");
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(value).toBe("value");
  });
})