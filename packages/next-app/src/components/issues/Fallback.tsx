import { CommonState } from "@xmr-bch-swap/swap";

export function Fallback({state} : {state: CommonState}) {
  return state.error ? <div>Error encountered: {state.currentState} - {state.error}</div> : <></>
}
