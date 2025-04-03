import { SwapManager } from '../src/SwapManager';

describe('SwapManager', () => {
  it('should be defined', async () => {
    const manager = new SwapManager();
    await manager.restoreSwaps();
  });
});
