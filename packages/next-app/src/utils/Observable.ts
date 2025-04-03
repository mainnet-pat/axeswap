import { TypedEventEmitter } from '@libp2p/interface'
import { ObservableEvents } from '@xmr-bch-swap/swap';

// Orderbook is an interactive p2p agent receiving the remote orders and posting its own orders
export class Observable extends TypedEventEmitter<ObservableEvents> {
  public value: number = 0;

  constructor() {
    super()
  }

  public sideEffect() {
    this.value += 1;
    this.safeDispatchEvent('#update', { detail: {} })
  }
}