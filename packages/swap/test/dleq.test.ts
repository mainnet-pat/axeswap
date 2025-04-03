import { DleqProof } from "../src/dleq-tools";
import { DleqProof as _DleqProof } from "dleq-tools";

describe(`dleq`, () => {
  test("dleq can not be destructured", async () => {
    const instance = new _DleqProof("","","");
    const {...object} = instance;
    expect(object.bitcoinPubKey).toBe(undefined);
  });

  test("dleq won't stringify", async () => {
    const instance = new _DleqProof("","","");
    const string = JSON.stringify(instance);
    expect(string).toContain("__wbg_ptr");
  });

  test("dleq will stringify and parse", async () => {
    const instance: DleqProof = {
      "proof": "a",
      "bitcoinPubKey": "b",
      "moneroPubKey": "c",
    };
    const string = JSON.stringify(instance, null, 2);
    expect(string).toEqual(`{
  \"proof\": \"a\",
  \"bitcoinPubKey\": \"b\",
  \"moneroPubKey\": \"c\"
}`);

    const parsed = JSON.parse(string);
    expect(parsed.proof).toBe("a");
    expect(parsed.bitcoinPubKey).toBe("b");
    expect(parsed.moneroPubKey).toBe("c");
  });
});