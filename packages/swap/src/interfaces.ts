import { P2pTransport } from "./p2ptransport";
import { StateMachine } from "./StateMachine/stateMachine";

export interface ObservableEvents {
  '#update': any;
}

export interface SwapManagerEvents {
  'swapAdded': CustomEvent<{ swapId: string }>;
}

export interface OrderSubmission {
  id?: string;
  amountA: bigint;
  amountB: bigint;
  agent?: "user" | "mm_bot" | string;
  expiresAt: number;
  transportPeerId: string;
  // swap: StateMachine;
}

export interface Order extends Omit<OrderSubmission, "swap"> {
  id: string;
  amountA: bigint;
  amountB: bigint;
  agent: "user" | "mm_bot" | string;
  expiresAt: number;
  peerId: string;
  transportPeerId: string;
  isMine?: boolean;
  // transport?: P2pTransport;
  // swap?: StateMachine;
}

export type OrderbookAction = "add" | "remove" | "replace" | "take" | "list";

/*
  Add must have ids and orders
  Remove must have ids
  Replace must have ids and orders (not necessary overlapping - more to remove less to add, for example)
*/
export interface OrderbookPayload {
  type: OrderbookAction;
  ids: string[];
  orders: Order[];
}

export interface RawEvent {
  payload: OrderbookPayload;
}

export interface OrderAddedEvent {
  order: Order;
}

export interface OrderRemovedEvent {
  order: Order;
}

export interface OrderTakenEvent {
  order: Order;
  multiaddr: string;
}

export interface OrderExpiredEvent {
  order: Order;
}

export interface OrderbookEvents {
  'rawEvent': CustomEvent<RawEvent>
  'orderAdded': CustomEvent<OrderAddedEvent>
  'orderRemoved': CustomEvent<OrderRemovedEvent>
  'orderTaken': CustomEvent<OrderTakenEvent>
  'orderExpired': CustomEvent<OrderExpiredEvent>
}
