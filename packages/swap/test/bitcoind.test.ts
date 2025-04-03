import { mineBchBlocks } from "./bitcoind";

describe(`monerod`, () => {
  test("monerod", async () => {
    await mineBchBlocks("bchreg:qpttdv3qg2usm4nm7talhxhl05mlhms3ys43u76rn0", 10);
  });
});
